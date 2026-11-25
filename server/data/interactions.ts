import type {
  DrugInteractionRule,
  DuplicateSaltAlert,
  InteractionCheckResult,
  InteractionMatch,
  Medicine,
  OcrMatchCandidate,
} from '../../src/types.ts';

export const INTERACTION_RULES: DrugInteractionRule[] = [
  {
    id: 'aspirin-ibuprofen',
    saltA: 'aspirin',
    saltB: 'ibuprofen',
    severity: 'high',
    title: {
      en: 'Bleeding Risk & Reduced Heart Protection',
      hi: 'रक्तस्राव का खतरा और हृदय सुरक्षा में कमी',
    },
    explanation: {
      en: 'Ibuprofen (an NSAID) can block the blood-thinning heart protection of low-dose Aspirin and together they significantly raise the risk of stomach ulcers and bleeding.',
      hi: 'इबुप्रोफेन (NSAID) कम खुराक वाली एस्पिरिन के हृदय-सुरक्षा प्रभाव को कम कर सकता है और दोनों को साथ लेने से पेट में अल्सर तथा रक्तस्राव का खतरा काफी बढ़ जाता है।',
    },
    recommendation: {
      en: 'Avoid combining these medicines. Ask your doctor about a safer pain relief alternative.',
      hi: 'इन दोनों दवाओं को साथ न लें। सुरक्षित दर्द निवारक विकल्प के लिए अपने डॉक्टर से पूछें।',
    },
  },
  {
    id: 'aspirin-diclofenac',
    saltA: 'aspirin',
    saltB: 'diclofenac',
    severity: 'high',
    title: {
      en: 'High Risk of Stomach Ulcers & Bleeding',
      hi: 'पेट के अल्सर और रक्तस्राव का उच्च खतरा',
    },
    explanation: {
      en: 'Taking Diclofenac together with Aspirin irritates the stomach lining and increases gastrointestinal bleeding risk.',
      hi: 'एस्पिरिन के साथ डिक्लोफेनाक लेने से पेट की परत को नुकसान और पेट में रक्तस्राव का खतरा बढ़ जाता है।',
    },
    recommendation: {
      en: 'Consult your cardiologist or physician before taking Diclofenac while on Ecosprin/Aspirin.',
      hi: 'इकोस्प्रिन/एस्पिरिन लेते समय डिक्लोफेनाक लेने से पहले डॉक्टर से अवश्य परामर्श करें।',
    },
  },
  {
    id: 'ibuprofen-diclofenac',
    saltA: 'ibuprofen',
    saltB: 'diclofenac',
    severity: 'high',
    title: {
      en: 'Duplicate NSAID Class — Stomach & Kidney Danger',
      hi: 'दोहरी दर्द निवारक (NSAID) — पेट और किडनी को खतरा',
    },
    explanation: {
      en: 'Both Ibuprofen and Diclofenac belong to the NSAID painkiller class. Combining them doubles the risk of stomach bleeding, acidity, and kidney injury without extra benefit.',
      hi: 'इबुप्रोफेन और डिक्लोफेनाक दोनों NSAID दर्द निवारक हैं। इन्हें साथ लेने से बिना किसी अतिरिक्त लाभ के पेट में रक्तस्राव और किडनी को नुकसान का खतरा दोगुना हो जाता है।',
    },
    recommendation: {
      en: 'Do not take two NSAID painkillers together. Use only one as directed by a doctor.',
      hi: 'दो NSAID दर्द निवारक एक साथ कभी न लें। डॉक्टर के निर्देशानुसार केवल एक ही लें।',
    },
  },
  {
    id: 'ibuprofen-mefenamic',
    saltA: 'ibuprofen',
    saltB: 'mefenamic_acid',
    severity: 'high',
    title: {
      en: 'Combined NSAID Irritation Risk',
      hi: 'दोहरी NSAID से पेट में जलन और रक्तस्राव का खतरा',
    },
    explanation: {
      en: 'Both Mefenamic Acid and Ibuprofen are NSAIDs. Taking them together increases stomach lining damage and kidney strain.',
      hi: 'मेफेनैमिक एसिड और इबुप्रोफेन दोनों NSAID वर्ग की दवाएं हैं। इन्हें एक साथ लेने से पेट और किडनी पर अधिक दबाव पड़ता है।',
    },
    recommendation: {
      en: 'Use only one anti-inflammatory pain reliever at a time.',
      hi: 'एक समय में केवल एक ही सूजन-रोधी दर्द निवारक का उपयोग करें।',
    },
  },
  {
    id: 'diclofenac-mefenamic',
    saltA: 'diclofenac',
    saltB: 'mefenamic_acid',
    severity: 'high',
    title: {
      en: 'Duplicate NSAID Painkillers',
      hi: 'दोहरी NSAID दर्द निवारक दवाएं',
    },
    explanation: {
      en: 'Combining Diclofenac and Mefenamic Acid raises the risk of severe gastritis, ulcers, and kidney stress.',
      hi: 'डिक्लोफेनाक और मेफेनैमिक एसिड को साथ लेने से गंभीर गैस्ट्राइटिस, अल्सर और किडनी पर दुष्प्रभाव का खतरा बढ़ता है।',
    },
    recommendation: {
      en: 'Avoid taking both together; consult your doctor.',
      hi: 'दोनों को एक साथ लेने से बचें और डॉक्टर से सलाह लें।',
    },
  },
  {
    id: 'telmisartan-ibuprofen',
    saltA: 'telmisartan',
    saltB: 'ibuprofen',
    severity: 'high',
    title: {
      en: 'Reduced Blood Pressure Control & Kidney Stress',
      hi: 'बीपी नियंत्रण में कमी और किडनी पर दबाव',
    },
    explanation: {
      en: 'Ibuprofen can blunt the blood pressure-lowering effect of Telmisartan and reduce blood flow to the kidneys, especially in elderly or dehydrated patients.',
      hi: 'इबुप्रोफेन, टेलमिसार्टन के बीपी कम करने के असर को घटा सकता है और विशेषकर बुजुर्गों में किडनी में रक्त प्रवाह को प्रभावित कर सकता है।',
    },
    recommendation: {
      en: 'Avoid frequent Ibuprofen use. Monitor blood pressure closely or ask your doctor for a kidney-safe pain reliever.',
      hi: 'इबुप्रोफेन का नियमित सेवन न करें। बीपी की जांच करते रहें और सुरक्षित विकल्प के लिए डॉक्टर से पूछें।',
    },
  },
  {
    id: 'telmisartan-diclofenac',
    saltA: 'telmisartan',
    saltB: 'diclofenac',
    severity: 'high',
    title: {
      en: 'Kidney Function Warning & Higher Blood Pressure',
      hi: 'किडनी सुरक्षा चेतावनी और बीपी बढ़ने का खतरा',
    },
    explanation: {
      en: 'Diclofenac reduces the effectiveness of Telmisartan and increases the risk of acute kidney strain and high potassium levels.',
      hi: 'डिक्लोफेनाक, टेलमिसार्टन के असर को कम करता है और किडनी पर दबाव तथा पोटैशियम बढ़ने का खतरा पैदा करता है।',
    },
    recommendation: {
      en: 'Consult your doctor before combining BP medications with Diclofenac.',
      hi: 'बीपी की दवा के साथ डिक्लोफेनाक लेने से पहले डॉक्टर की सलाह अवश्य लें।',
    },
  },
  {
    id: 'azithromycin-antacid',
    saltA: 'azithromycin',
    saltB: 'antacid_mineral',
    severity: 'moderate',
    title: {
      en: 'Reduced Antibiotic Absorption',
      hi: 'एंटीबायोटिक के असर में कमी',
    },
    explanation: {
      en: 'Aluminium and Magnesium in antacids (like Digene) bind to Azithromycin in the stomach and reduce how much antibiotic enters your bloodstream.',
      hi: 'एंटासिड (जैसे डाइजीन) में मौजूद एल्यूमिनियम और मैग्नीशियम एज़िथ्रोमाइसिन के अवशोषण को कम कर देते हैं, जिससे संक्रमण ठीक होने में देरी हो सकती है।',
    },
    recommendation: {
      en: 'Maintain at least a 2-hour gap between taking Azithromycin and any antacid.',
      hi: 'एज़िथ्रोमाइसिन और एंटासिड के बीच कम से कम 2 घंटे का अंतर रखें।',
    },
  },
  {
    id: 'levothyroxine-calcium',
    saltA: 'levothyroxine',
    saltB: 'calcium',
    severity: 'high',
    title: {
      en: 'Calcium Blocks Thyroid Hormone Absorption',
      hi: 'कैल्शियम थायरॉइड दवा का अवशोषण रोकता है',
    },
    explanation: {
      en: 'Taking Calcium (Shelcal) close to Levothyroxine (Thyronorm) prevents the thyroid medicine from absorbing properly, causing TSH levels to rise.',
      hi: 'थायरॉइड की गोली (Thyronorm) के पास कैल्शियम (Shelcal) लेने से थायरॉइड की दवा शरीर में ठीक से अवशोषित नहीं हो पाती।',
    },
    recommendation: {
      en: 'Take Thyroid tablet early morning on an empty stomach, and take Calcium at least 4 hours later (e.g., after lunch or dinner).',
      hi: 'थायरॉइड की दवा सुबह खाली पेट लें और कैल्शियम कम से कम 4 घंटे बाद (दोपहर या रात के खाने के बाद) लें।',
    },
  },
  {
    id: 'levothyroxine-antacid',
    saltA: 'levothyroxine',
    saltB: 'antacid_mineral',
    severity: 'moderate',
    title: {
      en: 'Antacids Lower Thyroid Medicine Effectiveness',
      hi: 'एंटासिड थायरॉइड दवा के असर को कम करते हैं',
    },
    explanation: {
      en: 'Mineral antacids bind with Levothyroxine in the digestive tract and reduce its absorption.',
      hi: 'मिनरल एंटासिड पाचन तंत्र में लेवोथायरोक्सिन के साथ जुड़कर उसके असर को कम कर देते हैं।',
    },
    recommendation: {
      en: 'Separate Thyroid medication and Antacids by at least 4 hours.',
      hi: 'थायरॉइड की दवा और एंटासिड के बीच कम से कम 4 घंटे का अंतर रखें।',
    },
  },
  {
    id: 'levothyroxine-pantoprazole',
    saltA: 'levothyroxine',
    saltB: 'pantoprazole',
    severity: 'moderate',
    title: {
      en: 'Timing Conflict — Empty Stomach Absorption',
      hi: 'खाली पेट दवा लेने के समय का टकराव',
    },
    explanation: {
      en: 'Acid reducers like Pantoprazole can slightly lower stomach acid needed for optimal Levothyroxine absorption if taken at the exact same minute.',
      hi: 'पैंटोप्राज़ोल पेट के एसिड को कम करता है, जिससे एक ही समय लेने पर थायरॉइड की दवा का अवशोषण थोड़ा कम हो सकता है।',
    },
    recommendation: {
      en: 'Take Levothyroxine first upon waking, wait 30–60 minutes, or space Pantoprazole before another meal as advised by your doctor.',
      hi: 'सुबह सबसे पहले थायरॉइड की दवा लें और पैंटोप्राज़ोल के समय के लिए डॉक्टर की सलाह के अनुसार अंतर रखें।',
    },
  },
  {
    id: 'pantoprazole-omeprazole',
    saltA: 'pantoprazole',
    saltB: 'omeprazole',
    severity: 'moderate',
    title: {
      en: 'Duplicate Acid-Reducer Class (Two PPIs)',
      hi: 'एक ही वर्ग की दो एसिडिटी दवाएं (दोहरी PPI)',
    },
    explanation: {
      en: 'Both Pantoprazole and Omeprazole are Proton Pump Inhibitors that perform the exact same function. Taking both together is unnecessary and raises side-effect risk.',
      hi: 'पैंटोप्राज़ोल और ओमेप्राज़ोल दोनों एक ही प्रकार की एसिड कम करने वाली दवाएं हैं। दोनों को साथ लेने की आवश्यकता नहीं होती।',
    },
    recommendation: {
      en: 'Use only one acid-suppressing medicine as prescribed.',
      hi: 'डॉक्टर द्वारा बताई गई केवल एक ही एसिडिटी दवा का उपयोग करें।',
    },
  },
  {
    id: 'levocetirizine-cetirizine',
    saltA: 'levocetirizine',
    saltB: 'cetirizine',
    severity: 'moderate',
    title: {
      en: 'Overlapping Antihistamines — Excess Drowsiness',
      hi: 'समान एलर्जी दवाएं — अधिक नींद और सुस्ती का खतरा',
    },
    explanation: {
      en: 'Levocetirizine is the active isomer of Cetirizine. Combining them acts like a double dose and causes pronounced drowsiness, dry mouth, and dizziness.',
      hi: 'लेवोसेटिरिज़िन, सेटिरिज़िन का ही सक्रिय रूप है। दोनों को साथ लेना दोहरी खुराक जैसा होता है जिससे तेज नींद, सुस्ती और चक्कर आ सकते हैं।',
    },
    recommendation: {
      en: 'Do not take Cetirizine (Okacet) and Montair LC together.',
      hi: 'Okacet और Montair LC को एक साथ न लें।',
    },
  },
  {
    id: 'fexofenadine-antacid',
    saltA: 'fexofenadine',
    saltB: 'antacid_mineral',
    severity: 'moderate',
    title: {
      en: 'Antacid Reduces Allergy Medicine Effect',
      hi: 'एंटासिड एलर्जी की दवा का असर कम करता है',
    },
    explanation: {
      en: 'Aluminium/Magnesium antacids significantly decrease the absorption of Fexofenadine (Allegra).',
      hi: 'एल्यूमिनियम/मैग्नीशियम युक्त एंटासिड फेक्सोफेनाडाइन (Allegra) के अवशोषण को काफी कम कर देते हैं।',
    },
    recommendation: {
      en: 'Wait at least 2 hours between taking Allegra and Digene.',
      hi: 'Allegra और Digene के बीच कम से कम 2 घंटे का अंतर रखें।',
    },
  },
  {
    id: 'aspirin-mefenamic',
    saltA: 'aspirin',
    saltB: 'mefenamic_acid',
    severity: 'high',
    title: {
      en: 'Increased Gastrointestinal Bleeding Risk',
      hi: 'पेट में रक्तस्राव का बढ़ा हुआ खतरा',
    },
    explanation: {
      en: 'Combining Mefenamic Acid with Aspirin increases stomach irritation and bleeding risk.',
      hi: 'एस्पिरिन के साथ मेफेनैमिक एसिड लेने से पेट में जलन और रक्तस्राव का खतरा बढ़ जाता है।',
    },
    recommendation: {
      en: 'Avoid combining without medical supervision.',
      hi: 'डॉक्टर की सलाह के बिना इन दोनों को साथ न लें।',
    },
  },
];

/**
 * Computes Levenshtein edit distance for OCR spelling tolerance & fuzzy search.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const prev = new Array<number>(s2.length + 1);
  const curr = new Array<number>(s2.length + 1);

  for (let j = 0; j <= s2.length; j++) prev[j] = j;

  for (let i = 1; i <= s1.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= s2.length; j++) prev[j] = curr[j];
  }
  return prev[s2.length];
}

function similarityScore(query: string, target: string): { score: number; dist: number } {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = target.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q || !t) return { score: 0, dist: 99 };

  if (q === t) return { score: 100, dist: 0 };
  if (t.includes(q) && q.length >= 3) {
    const ratio = q.length / t.length;
    return { score: Math.min(98, Math.round(78 + ratio * 20)), dist: 0 };
  }
  if (q.includes(t) && t.length >= 4) {
    return { score: 94, dist: 0 };
  }

  const dist = levenshteinDistance(q, t);
  const maxLen = Math.max(q.length, t.length);
  const score = Math.max(0, Math.round((1 - dist / maxLen) * 100));
  return { score, dist };
}

/**
 * Matches raw OCR text or user search query against the medicine database using
 * sliding windows + Levenshtein distance fuzzy matching.
 */
export function fuzzyMatchMedicines(rawInput: string, medicines: Medicine[]): OcrMatchCandidate[] {
  const cleaned = rawInput
    .replace(/[^a-zA-Z0-9\-\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const tokens = cleaned
    .split(/\s+/)
    .filter((tok) => tok.length >= 3 && !/^(tab|tabs|tablet|tablets|cap|caps|capsule|ip|usp|mg|mcg|exp|mfg|mrp|batch|lot|strip|ltd|pvt|india|pharma|for|the|and|with|store|keep|out)$/i.test(tok));

  // Build candidate n-grams (1-gram, 2-gram, 3-gram) plus full cleaned string
  const phrases = new Set<string>();
  phrases.add(cleaned);
  for (let i = 0; i < tokens.length; i++) {
    phrases.add(tokens[i]);
    if (i + 1 < tokens.length) phrases.add(`${tokens[i]} ${tokens[i + 1]}`);
    if (i + 2 < tokens.length) phrases.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }

  const results: OcrMatchCandidate[] = [];

  for (const med of medicines) {
    const searchableTargets: Array<{ label: string; text: string; weight: number }> = [
      { label: med.brandName, text: med.brandName, weight: 1.0 },
      ...med.aliases.map((a) => ({ label: a, text: a, weight: 0.98 })),
      ...med.salts.map((s) => ({ label: s.name, text: s.name.split('(')[0].trim(), weight: 0.92 })),
      { label: med.genericName, text: med.genericName, weight: 0.85 },
    ];

    let bestScore = 0;
    let bestMatchLabel = med.brandName;
    let bestDist = 99;

    for (const phrase of phrases) {
      for (const target of searchableTargets) {
        const { score, dist } = similarityScore(phrase, target.text);
        const weighted = Math.round(score * target.weight);
        if (weighted > bestScore) {
          bestScore = weighted;
          bestMatchLabel = target.label;
          bestDist = dist;
        }
      }
    }

    if (bestScore >= 52) {
      results.push({
        medicine: med,
        score: bestScore,
        matchedOn: bestMatchLabel,
        levenshteinDistance: bestDist,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

/**
 * Extracts a potential expiry date (MM/YYYY or MMM YYYY) from OCR text if present.
 */
export function extractExpiryFromOcr(text: string): string | undefined {
  const upper = text.toUpperCase();
  const expMatch = upper.match(
    /(?:EXP(?:IRY)?\.?\s*[:\-]?\s*)(0?[1-9]|1[0-2]|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\s/\-\.]+(20\d{2}|\d{2})/
  );
  if (!expMatch) return undefined;

  const monthMap: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  };
  const rawMonth = expMatch[1];
  const month = monthMap[rawMonth] ?? rawMonth.padStart(2, '0');
  const rawYear = expMatch[2];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-28`;
}

/**
 * Evaluates duplicate active salts and pairwise drug-drug interactions across selected medicines.
 */
export function evaluateInteractions(selectedMedicines: Medicine[]): InteractionCheckResult {
  const saltBuckets = new Map<
    string,
    { saltName: string; medicines: Array<{ id: string; brandName: string; strength: string }> }
  >();

  for (const med of selectedMedicines) {
    for (const salt of med.salts) {
      const existing = saltBuckets.get(salt.normalizedKey);
      if (existing) {
        if (!existing.medicines.some((m) => m.id === med.id)) {
          existing.medicines.push({
            id: med.id,
            brandName: med.brandName,
            strength: salt.strength,
          });
        }
      } else {
        saltBuckets.set(salt.normalizedKey, {
          saltName: salt.name,
          medicines: [{ id: med.id, brandName: med.brandName, strength: salt.strength }],
        });
      }
    }
  }

  const duplicateSalts: DuplicateSaltAlert[] = [];
  for (const [normalizedKey, bucket] of saltBuckets.entries()) {
    if (bucket.medicines.length >= 2) {
      const names = bucket.medicines.map((m) => `${m.brandName} (${m.strength})`).join(' + ');
      duplicateSalts.push({
        normalizedKey,
        saltName: bucket.saltName,
        medicines: bucket.medicines,
        warning: {
          en: `Duplicate active ingredient detected: ${bucket.saltName} is present in ${names}. Taking multiple brands with the same salt can lead to accidental overdose and organ toxicity.`,
          hi: `दोहरा सक्रिय तत्व (Duplicate Salt) पाया गया: ${bucket.saltName} इन दवाओं में मौजूद है — ${names}। एक ही सॉल्ट वाली दो दवाएं साथ लेने से ओवरडोज़ और शरीर के अंगों को नुकसान का खतरा हो सकता है।`,
        },
      });
    }
  }

  const interactions: InteractionMatch[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < selectedMedicines.length; i++) {
    for (let j = i + 1; j < selectedMedicines.length; j++) {
      const medA = selectedMedicines[i];
      const medB = selectedMedicines[j];
      const keysA = new Set(medA.salts.map((s) => s.normalizedKey));
      const keysB = new Set(medB.salts.map((s) => s.normalizedKey));

      for (const rule of INTERACTION_RULES) {
        const matchDirect = keysA.has(rule.saltA) && keysB.has(rule.saltB);
        const matchReverse = keysA.has(rule.saltB) && keysB.has(rule.saltA);

        if (matchDirect || matchReverse) {
          const pairKey = `${rule.id}:${[medA.id, medB.id].sort().join('|')}`;
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            interactions.push({
              rule,
              medicineA: { id: medA.id, brandName: medA.brandName },
              medicineB: { id: medB.id, brandName: medB.brandName },
            });
          }
        }
      }
    }
  }

  // Sort high severity first
  interactions.sort((a, b) => (a.rule.severity === 'high' ? -1 : 1) - (b.rule.severity === 'high' ? -1 : 1));

  const hasHigh =
    duplicateSalts.length > 0 || interactions.some((item) => item.rule.severity === 'high');
  const hasModerate = interactions.some((item) => item.rule.severity === 'moderate');

  return {
    checkedMedicines: selectedMedicines.map((m) => ({
      id: m.id,
      brandName: m.brandName,
      salts: m.salts,
    })),
    duplicateSalts,
    interactions,
    riskLevel: hasHigh ? 'high' : hasModerate ? 'moderate' : 'safe',
  };
}
