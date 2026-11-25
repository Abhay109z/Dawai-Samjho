import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { CabinetItem, JanAushadhiStore, Medicine } from '../src/types.ts';
import { MEDICINES_DB } from './data/medicines.ts';
import { JAN_AUSHADHI_STORES } from './data/stores.ts';
import {
  CabinetItemModel,
  MedicineModel,
  StoreModel,
  UserModel,
  type StoredUserRecord,
} from './models.ts';
import { isMongoConnected } from './mongo.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CABINET_FILE = path.join(DATA_DIR, 'cabinet.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Isolated in-memory cabinet sessions for Guest users (kept ephemeral & private per guest session)
const guestCabinets = new Map<string, CabinetItem[]>();

function addDaysISO(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

export function createInitialCabinetSeed(ownerId: string): CabinetItem[] {
  return [
    {
      id: `cab-${ownerId.slice(-6)}-1`,
      ownerId,
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
      id: `cab-${ownerId.slice(-6)}-2`,
      ownerId,
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
      id: `cab-${ownerId.slice(-6)}-3`,
      ownerId,
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
      id: `cab-${ownerId.slice(-6)}-4`,
      ownerId,
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

function readLocalJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(filePath: string, data: T): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- User Repository ---

export async function findUserByEmail(email: string): Promise<StoredUserRecord | null> {
  const normalized = email.toLowerCase().trim();
  if (isMongoConnected()) {
    return UserModel.findOne({ email: normalized }, { _id: 0 }).lean<StoredUserRecord | null>();
  }
  const users = readLocalJson<StoredUserRecord[]>(USERS_FILE, []);
  return users.find((u) => u.email === normalized) ?? null;
}

export async function createUserRecord(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<StoredUserRecord> {
  const record: StoredUserRecord = {
    id: `usr-${crypto.randomBytes(8).toString('hex')}`,
    name: input.name,
    email: input.email.toLowerCase().trim(),
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
  };

  if (isMongoConnected()) {
    await UserModel.create(record);
    // Seed starter cabinet items for the newly registered user
    const starter = createInitialCabinetSeed(record.id);
    await CabinetItemModel.insertMany(starter, { ordered: false }).catch(() => {});
    return record;
  }

  const users = readLocalJson<StoredUserRecord[]>(USERS_FILE, []);
  users.push(record);
  writeLocalJson(USERS_FILE, users);

  const allCabinets = readLocalJson<CabinetItem[]>(CABINET_FILE, []);
  allCabinets.push(...createInitialCabinetSeed(record.id));
  writeLocalJson(CABINET_FILE, allCabinets);
  return record;
}

// --- Catalog Repositories ---

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

// --- Owner-Scoped Digital Medicine Cabinet Repository ---

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

function getOrSeedGuestCabinet(guestId: string): CabinetItem[] {
  let list = guestCabinets.get(guestId);
  if (!list) {
    // Cap in-memory guest sessions to prevent unbounded growth
    if (guestCabinets.size > 200) {
      const oldestKey = guestCabinets.keys().next().value;
      if (oldestKey) guestCabinets.delete(oldestKey);
    }
    list = createInitialCabinetSeed(guestId);
    guestCabinets.set(guestId, list);
  }
  return list;
}

export async function listCabinetItems(ownerId: string, isGuest: boolean): Promise<CabinetItem[]> {
  let rawItems: CabinetItem[];

  if (isGuest) {
    rawItems = getOrSeedGuestCabinet(ownerId);
  } else if (isMongoConnected()) {
    rawItems = await CabinetItemModel.find({ ownerId }, { _id: 0 }).lean<CabinetItem[]>();
  } else {
    const all = readLocalJson<CabinetItem[]>(CABINET_FILE, []);
    rawItems = all.filter((item) => item.ownerId === ownerId);
  }

  return rawItems
    .map(enrichCabinetItem)
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
}

export async function addCabinetItem(
  ownerId: string,
  isGuest: boolean,
  input: Omit<CabinetItem, 'id' | 'ownerId' | 'addedAt' | 'status' | 'daysRemaining'>
): Promise<CabinetItem> {
  const newItem: CabinetItem = {
    ...input,
    id: `cab-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    ownerId,
    addedAt: new Date().toISOString().slice(0, 10),
  };

  if (isGuest) {
    const list = getOrSeedGuestCabinet(ownerId);
    list.push(newItem);
    return enrichCabinetItem(newItem);
  }

  if (isMongoConnected()) {
    await CabinetItemModel.create(newItem);
    return enrichCabinetItem(newItem);
  }

  const all = readLocalJson<CabinetItem[]>(CABINET_FILE, []);
  all.push(newItem);
  writeLocalJson(CABINET_FILE, all);
  return enrichCabinetItem(newItem);
}

export async function updateCabinetItem(
  ownerId: string,
  isGuest: boolean,
  id: string,
  patch: Partial<Omit<CabinetItem, 'id' | 'ownerId' | 'addedAt'>>
): Promise<CabinetItem | null> {
  if (isGuest) {
    const list = getOrSeedGuestCabinet(ownerId);
    const idx = list.findIndex((item) => item.id === id && item.ownerId === ownerId);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    return enrichCabinetItem(list[idx]);
  }

  if (isMongoConnected()) {
    const updated = await CabinetItemModel.findOneAndUpdate(
      { id, ownerId },
      { $set: patch },
      { new: true, projection: { _id: 0 } }
    ).lean<CabinetItem | null>();
    return updated ? enrichCabinetItem(updated) : null;
  }

  const all = readLocalJson<CabinetItem[]>(CABINET_FILE, []);
  const idx = all.findIndex((item) => item.id === id && item.ownerId === ownerId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  writeLocalJson(CABINET_FILE, all);
  return enrichCabinetItem(all[idx]);
}

export async function deleteCabinetItem(
  ownerId: string,
  isGuest: boolean,
  id: string
): Promise<boolean> {
  if (isGuest) {
    const list = getOrSeedGuestCabinet(ownerId);
    const idx = list.findIndex((item) => item.id === id && item.ownerId === ownerId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }

  if (isMongoConnected()) {
    const res = await CabinetItemModel.deleteOne({ id, ownerId });
    return res.deletedCount > 0;
  }

  const all = readLocalJson<CabinetItem[]>(CABINET_FILE, []);
  const next = all.filter((item) => !(item.id === id && item.ownerId === ownerId));
  if (next.length === all.length) return false;
  writeLocalJson(CABINET_FILE, next);
  return true;
}
