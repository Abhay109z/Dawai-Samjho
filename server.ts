import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  evaluateInteractions,
  extractExpiryFromOcr,
  fuzzyMatchMedicines,
} from './server/data/interactions.ts';
import { haversineDistanceKm } from './server/data/stores.ts';
import {
  addCabinetItem,
  deleteCabinetItem,
  getAllMedicines,
  getAllStores,
  getMedicineById,
  listCabinetItems,
  updateCabinetItem,
} from './server/db.ts';
import { connectMongoAtlas } from './server/mongo.ts';
import type { AiVisionAnalysis, CabinetItem, Medicine } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asSafeString(val: unknown, maxLen = 240): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  await connectMongoAtlas();

  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // 1. Medicines catalog & fuzzy search
  app.get('/api/medicines', async (req, res) => {
    try {
      const q = asSafeString(req.query.q, 120);
      const category = asSafeString(req.query.category, 40);

      let pool: Medicine[] = await getAllMedicines();
      if (category && category !== 'all') {
        pool = pool.filter((m) => m.categoryKey === category);
      }

      if (!q) {
        res.json({ medicines: pool, total: pool.length });
        return;
      }

      const qLower = q.toLowerCase();
      const directMatches = pool.filter(
        (m) =>
          m.brandName.toLowerCase().includes(qLower) ||
          m.genericName.toLowerCase().includes(qLower) ||
          m.aliases.some((a) => a.toLowerCase().includes(qLower)) ||
          m.salts.some((s) => s.name.toLowerCase().includes(qLower)) ||
          m.category.en.toLowerCase().includes(qLower) ||
          m.category.hi.includes(q) ||
          m.uses.en.some((u) => u.toLowerCase().includes(qLower))
      );

      if (directMatches.length > 0) {
        res.json({ medicines: directMatches, total: directMatches.length, matchMode: 'direct' });
        return;
      }

      const fuzzy = fuzzyMatchMedicines(q, pool).map((c) => c.medicine);
      res.json({ medicines: fuzzy, total: fuzzy.length, matchMode: 'fuzzy' });
    } catch (err) {
      console.error('Error fetching medicines:', err);
      res.status(500).json({ error: 'Unable to load medicines.' });
    }
  });

  // 2. Medicine detail + same-salt peer alternatives
  app.get('/api/medicines/:id', async (req, res) => {
    try {
      const id = asSafeString(req.params.id, 64);
      if (!SAFE_ID_PATTERN.test(id)) {
        res.status(400).json({ error: 'Invalid medicine identifier.' });
        return;
      }

      const med = await getMedicineById(id);
      if (!med) {
        res.status(404).json({ error: 'Medicine not found' });
        return;
      }
      const allMeds = await getAllMedicines();
      const saltKeys = new Set(med.salts.map((s) => s.normalizedKey));
      const sameSaltPeers = allMeds.filter(
        (other) =>
          other.id !== med.id && other.salts.some((s) => saltKeys.has(s.normalizedKey))
      );
      res.json({ medicine: med, sameSaltPeers });
    } catch (err) {
      console.error('Error fetching medicine detail:', err);
      res.status(500).json({ error: 'Unable to fetch medicine details.' });
    }
  });

  // 3. OCR Text Levenshtein Fuzzy Matching endpoint
  app.post('/api/ocr/match', async (req, res) => {
    try {
      const text = asSafeString(req.body?.text, 4000);
      if (!text) {
        res.status(400).json({ error: 'No extracted OCR text provided.' });
        return;
      }
      const cleanedTokens = text
        .replace(/[^a-zA-Z0-9\-\s/]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 2)
        .slice(0, 40);

      const allMeds = await getAllMedicines();
      const matches = fuzzyMatchMedicines(text, allMeds);
      const detectedExpiry = extractExpiryFromOcr(text);

      res.json({
        extractedText: text,
        cleanedTokens,
        detectedExpiry,
        matches,
      });
    } catch (err) {
      console.error('OCR matching error:', err);
      res.status(500).json({ error: 'Unable to match extracted OCR text.' });
    }
  });

  // 4. Server-side Gemini Vision OCR enhancement
  app.post('/api/ocr/analyze-image', async (req, res) => {
    const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
    const rawMime = asSafeString(req.body?.mimeType, 40);
    const mimeType = /^image\/(png|jpeg|jpg|webp)$/.test(rawMime) ? rawMime : 'image/png';

    if (!imageBase64) {
      res.status(400).json({ error: 'Image payload is required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'AI Vision OCR is currently unavailable because GEMINI_API_KEY is not configured. Please use On-Device Tesseract OCR instead.',
      });
      return;
    }

    try {
      const strippedBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: strippedBase64,
              },
            },
            {
              text: 'Read this Indian medicine strip or packaging image carefully. Extract the brand/medicine name, active pharmaceutical salts, dosage strength, and expiry date (in YYYY-MM-DD format if visible, otherwise null). Also provide a concise, plain-language patient guide in both English and Hindi (Devanagari) suitable for elderly patients, including uses, how to take, key precautions, and a note about asking a pharmacist for a Jan Aushadhi generic equivalent.',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedName: { type: Type.STRING },
              saltsText: { type: Type.STRING },
              strength: { type: Type.STRING },
              expiryDate: { type: Type.STRING, nullable: true },
              summaryEn: { type: Type.STRING },
              summaryHi: { type: Type.STRING },
              usesEn: { type: Type.ARRAY, items: { type: Type.STRING } },
              usesHi: { type: Type.ARRAY, items: { type: Type.STRING } },
              howToTakeEn: { type: Type.STRING },
              howToTakeHi: { type: Type.STRING },
              precautionsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
              precautionsHi: { type: Type.ARRAY, items: { type: Type.STRING } },
              genericNoteEn: { type: Type.STRING },
              genericNoteHi: { type: Type.STRING },
            },
            required: [
              'detectedName',
              'saltsText',
              'strength',
              'summaryEn',
              'summaryHi',
              'usesEn',
              'usesHi',
              'howToTakeEn',
              'howToTakeHi',
              'precautionsEn',
              'precautionsHi',
              'genericNoteEn',
              'genericNoteHi',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const searchSeed = `${parsed.detectedName ?? ''} ${parsed.saltsText ?? ''}`.trim();
      const allMeds = await getAllMedicines();
      const candidates = fuzzyMatchMedicines(searchSeed, allMeds);
      const topMatch = candidates[0] && candidates[0].score >= 60 ? candidates[0] : null;

      const result: AiVisionAnalysis = {
        detectedName: parsed.detectedName || 'Unidentified Medicine',
        saltsText: parsed.saltsText || '',
        strength: parsed.strength || '',
        expiryDate: parsed.expiryDate || null,
        matchedMedicine: topMatch ? topMatch.medicine : null,
        matchScore: topMatch ? topMatch.score : 0,
        aiSummary: {
          summary: { en: parsed.summaryEn || '', hi: parsed.summaryHi || '' },
          uses: { en: parsed.usesEn || [], hi: parsed.usesHi || [] },
          howToTake: { en: parsed.howToTakeEn || '', hi: parsed.howToTakeHi || '' },
          precautions: { en: parsed.precautionsEn || [], hi: parsed.precautionsHi || [] },
          estimatedGenericSavingNote: {
            en: parsed.genericNoteEn || '',
            hi: parsed.genericNoteHi || '',
          },
        },
      };

      res.json(result);
    } catch (err) {
      console.error('Gemini Vision OCR failed:', err);
      res.status(500).json({
        error:
          'Unable to analyze medicine strip with AI Vision right now. Try On-Device OCR or search manually.',
      });
    }
  });

  // 5. Duplicate Active Salt & Drug Interaction Checker
  app.post('/api/interactions/check', async (req, res) => {
    try {
      const rawIds = Array.isArray(req.body?.medicineIds) ? req.body.medicineIds : [];
      const uniqueIds = Array.from(
        new Set(
          rawIds
            .filter((item: unknown): item is string => typeof item === 'string' && SAFE_ID_PATTERN.test(item))
            .slice(0, 25)
        )
      );

      const allMeds = await getAllMedicines();
      const selected = uniqueIds
        .map((id) => allMeds.find((m) => m.id === id))
        .filter((m): m is Medicine => Boolean(m));

      if (selected.length < 2) {
        res.status(400).json({
          error: 'Please select at least 2 medicines to run a duplicate salt and interaction check.',
        });
        return;
      }

      const report = evaluateInteractions(selected);
      res.json(report);
    } catch (err) {
      console.error('Interaction check error:', err);
      res.status(500).json({ error: 'Unable to check interactions.' });
    }
  });

  // 6. Jan Aushadhi Store Locator
  app.get('/api/stores', async (req, res) => {
    try {
      const q = asSafeString(req.query.q, 100).toLowerCase();
      const stateFilter = asSafeString(req.query.state, 60).toLowerCase();
      const lat = typeof req.query.lat === 'string' ? Number(req.query.lat) : null;
      const lng = typeof req.query.lng === 'string' ? Number(req.query.lng) : null;
      const validCoords =
        lat !== null &&
        lng !== null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180;

      const allStores = await getAllStores();
      let stores = allStores.map((store) => ({
        ...store,
        distanceKm: validCoords
          ? haversineDistanceKm(lat as number, lng as number, store.lat, store.lng)
          : undefined,
      }));

      if (stateFilter && stateFilter !== 'all') {
        stores = stores.filter((s) => s.state.toLowerCase() === stateFilter);
      }

      if (q) {
        stores = stores.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q) ||
            s.state.toLowerCase().includes(q) ||
            s.pincode.includes(q) ||
            s.address.toLowerCase().includes(q) ||
            s.kendraCode.toLowerCase().includes(q)
        );
      }

      if (validCoords) {
        stores.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
      }

      const states = Array.from(new Set(allStores.map((s) => s.state))).sort();
      res.json({ stores, states, total: stores.length });
    } catch (err) {
      console.error('Error fetching stores:', err);
      res.status(500).json({ error: 'Unable to load Jan Aushadhi Kendras.' });
    }
  });

  // 7. Digital Medicine Cabinet & Expiry Tracker CRUD (strictly validated against NoSQL injection)
  app.get('/api/cabinet', async (_req, res) => {
    try {
      const items = await listCabinetItems();
      const expired = items.filter((i) => i.status === 'expired').length;
      const expiringSoon = items.filter((i) => i.status === 'expiring_soon').length;
      const safe = items.filter((i) => i.status === 'safe').length;
      res.json({
        items,
        summary: { total: items.length, expired, expiringSoon, safe },
      });
    } catch (err) {
      console.error('Error listing cabinet:', err);
      res.status(500).json({ error: 'Unable to load medicine cabinet.' });
    }
  });

  app.post('/api/cabinet', async (req, res) => {
    try {
      const name = asSafeString(req.body?.name, 140);
      const expiryDate = asSafeString(req.body?.expiryDate, 20);
      const medicineIdRaw = asSafeString(req.body?.medicineId, 64);
      const medicineId = SAFE_ID_PATTERN.test(medicineIdRaw) ? medicineIdRaw : undefined;

      if (!name || !ISO_DATE_PATTERN.test(expiryDate)) {
        res.status(400).json({
          error: 'Valid medicine name and expiry date (YYYY-MM-DD) are required.',
        });
        return;
      }

      const matched = medicineId ? await getMedicineById(medicineId) : null;
      const customSalts = Array.isArray(req.body?.salts)
        ? req.body.salts
            .filter((s: unknown): s is string => typeof s === 'string')
            .map((s: string) => s.trim().slice(0, 120))
            .filter(Boolean)
            .slice(0, 10)
        : null;

      const created = await addCabinetItem({
        medicineId: matched?.id,
        name,
        genericName: asSafeString(req.body?.genericName, 160) || matched?.genericName,
        salts:
          customSalts ??
          (matched ? matched.salts.map((s) => `${s.name} ${s.strength}`) : []),
        batchNumber: asSafeString(req.body?.batchNumber, 60) || 'N/A',
        expiryDate,
        quantity: asSafeString(req.body?.quantity, 60) || '1 Strip',
        forWhom: asSafeString(req.body?.forWhom, 60) || 'Self',
        dosageNote: asSafeString(req.body?.dosageNote, 240),
      });
      res.status(201).json({ item: created });
    } catch (err) {
      console.error('Error creating cabinet record:', err);
      res.status(500).json({ error: 'Unable to save medicine record.' });
    }
  });

  app.patch('/api/cabinet/:id', async (req, res) => {
    try {
      const id = asSafeString(req.params.id, 64);
      if (!SAFE_ID_PATTERN.test(id)) {
        res.status(400).json({ error: 'Invalid record identifier.' });
        return;
      }

      const patch: Partial<Omit<CabinetItem, 'id' | 'addedAt'>> = {};
      if (typeof req.body?.name === 'string' && req.body.name.trim()) {
        patch.name = asSafeString(req.body.name, 140);
      }
      if (typeof req.body?.expiryDate === 'string' && ISO_DATE_PATTERN.test(req.body.expiryDate.trim())) {
        patch.expiryDate = req.body.expiryDate.trim();
      }
      if (typeof req.body?.batchNumber === 'string') {
        patch.batchNumber = asSafeString(req.body.batchNumber, 60);
      }
      if (typeof req.body?.quantity === 'string') {
        patch.quantity = asSafeString(req.body.quantity, 60);
      }
      if (typeof req.body?.forWhom === 'string') {
        patch.forWhom = asSafeString(req.body.forWhom, 60);
      }
      if (typeof req.body?.dosageNote === 'string') {
        patch.dosageNote = asSafeString(req.body.dosageNote, 240);
      }

      const updated = await updateCabinetItem(id, patch);
      if (!updated) {
        res.status(404).json({ error: 'Cabinet record not found.' });
        return;
      }
      res.json({ item: updated });
    } catch (err) {
      console.error('Error updating cabinet record:', err);
      res.status(500).json({ error: 'Unable to update cabinet record.' });
    }
  });

  app.delete('/api/cabinet/:id', async (req, res) => {
    try {
      const id = asSafeString(req.params.id, 64);
      if (!SAFE_ID_PATTERN.test(id)) {
        res.status(400).json({ error: 'Invalid record identifier.' });
        return;
      }

      const ok = await deleteCabinetItem(id);
      if (!ok) {
        res.status(404).json({ error: 'Cabinet record not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('Error deleting cabinet record:', err);
      res.status(500).json({ error: 'Unable to delete cabinet record.' });
    }
  });

  // Frontend serving (Vite dev middleware in dev, dist/ in production)
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DawaiSamjho server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
