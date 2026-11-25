import fs from 'fs';
import path from 'path';
import type { CabinetItem, JanAushadhiStore, Medicine } from '../src/types.ts';
import { MEDICINES_DB } from './data/medicines.ts';
import { JAN_AUSHADHI_STORES } from './data/stores.ts';
import { CabinetItemModel, MedicineModel, StoreModel } from './models.ts';
import { isMongoConnected } from './mongo.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CABINET_FILE = path.join(DATA_DIR, 'cabinet.json');

function addDaysISO(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

export function createInitialCabinetSeed(): CabinetItem[] {
  return [
    {
      id: 'cab-1',
      medicineId: 'dolo-650',
      name: 'Dolo 650',
      genericName: 'Paracetamol Tablets IP 650 mg',
      salts: ['Paracetamol (Acetaminophen) 650 mg'],
      batchNumber: 'DL26A418',
      expiryDate: addDaysISO(240),
      quantity: '12 Tablets left',
      forWhom: 'Family First-Aid',
      dosageNote: '1 tablet after food for fever (max 3-4/day)',
      addedAt: addDaysISO(-14),
    },
    {
      id: 'cab-2',
      medicineId: 'telma-40',
      name: 'Telma 40',
      genericName: 'Telmisartan Tablets IP 40 mg',
      salts: ['Telmisartan 40 mg'],
      batchNumber: 'TM9024K',
      expiryDate: addDaysISO(19),
      quantity: '8 Tablets left',
      forWhom: 'Father (BP Daily)',
      dosageNote: '1 tablet every morning at 8 AM',
      addedAt: addDaysISO(-45),
    },
    {
      id: 'cab-3',
      medicineId: 'glycomet-gp-1',
      name: 'Glycomet-GP 1',
      genericName: 'Glimepiride 1 mg + Metformin 500 mg SR',
      salts: ['Glimepiride 1 mg', 'Metformin (SR) 500 mg'],
      batchNumber: 'GM4410B',
      expiryDate: addDaysISO(142),
      quantity: '15 Tablets left',
      forWhom: 'Mother (Diabetes)',
      dosageNote: '1 tablet before breakfast daily',
      addedAt: addDaysISO(-20),
    },
    {
      id: 'cab-4',
      medicineId: 'combiflam',
      name: 'Combiflam',
      genericName: 'Ibuprofen 400 mg + Paracetamol 325 mg',
      salts: ['Ibuprofen 400 mg', 'Paracetamol 325 mg'],
      batchNumber: 'CF1190X',
      expiryDate: addDaysISO(-18),
      quantity: '6 Tablets left',
      forWhom: 'Family First-Aid',
      dosageNote: 'For severe body ache — expired, dispose safely',
      addedAt: addDaysISO(-210),
    },
  ];
}

function ensureLocalCabinetStore(): CabinetItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CABINET_FILE)) {
      const seed = createInitialCabinetSeed();
      fs.writeFileSync(CABINET_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(CABINET_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as CabinetItem[];
    return Array.isArray(parsed) ? parsed : createInitialCabinetSeed();
  } catch {
    return createInitialCabinetSeed();
  }
}

function saveLocalCabinetStore(items: CabinetItem[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CABINET_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function enrichCabinetItem(item: CabinetItem): CabinetItem {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(`${item.expiryDate}T00:00:00`);
  const diffMs = exp.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: 'expired' | 'expiring_soon' | 'safe' = 'safe';
  if (daysRemaining < 0) {
    status = 'expired';
  } else if (daysRemaining <= 30) {
    status = 'expiring_soon';
  }

  return {
    ...item,
    daysRemaining,
    status,
  };
}

export async function getAllMedicines(): Promise<Medicine[]> {
  if (isMongoConnected()) {
    const docs = await MedicineModel.find({}, { _id: 0 }).lean<Medicine[]>();
    if (docs.length > 0) return docs;
  }
  return MEDICINES_DB;
}

export async function getMedicineById(id: string): Promise<Medicine | null> {
  if (isMongoConnected()) {
    const doc = await MedicineModel.findOne({ id }, { _id: 0 }).lean<Medicine | null>();
    if (doc) return doc;
  }
  return MEDICINES_DB.find((m) => m.id === id) ?? null;
}

export async function getAllStores(): Promise<JanAushadhiStore[]> {
  if (isMongoConnected()) {
    const docs = await StoreModel.find({}, { _id: 0 }).lean<JanAushadhiStore[]>();
    if (docs.length > 0) return docs;
  }
  return JAN_AUSHADHI_STORES;
}

export async function listCabinetItems(): Promise<CabinetItem[]> {
  let rawItems: CabinetItem[];
  if (isMongoConnected()) {
    rawItems = await CabinetItemModel.find({}, { _id: 0 }).lean<CabinetItem[]>();
  } else {
    rawItems = ensureLocalCabinetStore();
  }
  return rawItems
    .map(enrichCabinetItem)
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
}

export async function addCabinetItem(
  input: Omit<CabinetItem, 'id' | 'addedAt' | 'status' | 'daysRemaining'>
): Promise<CabinetItem> {
  const newItem: CabinetItem = {
    ...input,
    id: `cab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString().slice(0, 10),
  };

  if (isMongoConnected()) {
    await CabinetItemModel.create(newItem);
    return enrichCabinetItem(newItem);
  }

  const items = ensureLocalCabinetStore();
  items.push(newItem);
  saveLocalCabinetStore(items);
  return enrichCabinetItem(newItem);
}

export async function updateCabinetItem(
  id: string,
  patch: Partial<Omit<CabinetItem, 'id' | 'addedAt'>>
): Promise<CabinetItem | null> {
  if (isMongoConnected()) {
    const updated = await CabinetItemModel.findOneAndUpdate(
      { id },
      { $set: patch },
      { new: true, projection: { _id: 0 } }
    ).lean<CabinetItem | null>();
    return updated ? enrichCabinetItem(updated) : null;
  }

  const items = ensureLocalCabinetStore();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  saveLocalCabinetStore(items);
  return enrichCabinetItem(items[idx]);
}

export async function deleteCabinetItem(id: string): Promise<boolean> {
  if (isMongoConnected()) {
    const res = await CabinetItemModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  const items = ensureLocalCabinetStore();
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  saveLocalCabinetStore(next);
  return true;
}
