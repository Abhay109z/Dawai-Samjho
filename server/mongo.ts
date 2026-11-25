import mongoose from 'mongoose';
import { MEDICINES_DB } from './data/medicines.ts';
import { JAN_AUSHADHI_STORES } from './data/stores.ts';
import { CabinetItemModel, MedicineModel, StoreModel } from './models.ts';
import { createInitialCabinetSeed } from './db.ts';

let mongoReady = false;

export function isMongoConnected(): boolean {
  return mongoReady && mongoose.connection.readyState === 1;
}

/**
 * Connects to MongoDB Atlas using process.env.MONGODB_URI and seeds collections
 * on first run if empty. Never logs connection strings or credentials.
 */
export async function connectMongoAtlas(): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || uri.includes('<db_username>') || uri.includes('<db_password>')) {
    console.log('MONGODB_URI not configured in environment; using local storage fallback.');
    mongoReady = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME?.trim() || 'dawaisamjho',
      serverSelectionTimeoutMS: 8000,
    });
    mongoReady = true;
    console.log('Connected to MongoDB Atlas (database: dawaisamjho).');

    await seedIfEmpty();
    return true;
  } catch (err) {
    mongoReady = false;
    const msg = err instanceof Error ? err.message : 'Unknown connection error';
    console.error('MongoDB Atlas connection failed; falling back to local storage:', msg);
    return false;
  }
}

async function seedIfEmpty(): Promise<void> {
  try {
    const [medCount, storeCount, cabCount] = await Promise.all([
      MedicineModel.countDocuments(),
      StoreModel.countDocuments(),
      CabinetItemModel.countDocuments(),
    ]);

    if (medCount === 0) {
      await MedicineModel.insertMany(MEDICINES_DB, { ordered: false });
      console.log(`Seeded ${MEDICINES_DB.length} medicines into MongoDB Atlas.`);
    }

    if (storeCount === 0) {
      await StoreModel.insertMany(JAN_AUSHADHI_STORES, { ordered: false });
      console.log(`Seeded ${JAN_AUSHADHI_STORES.length} Jan Aushadhi Kendras into MongoDB Atlas.`);
    }

    if (cabCount === 0) {
      const seed = createInitialCabinetSeed();
      await CabinetItemModel.insertMany(seed, { ordered: false });
      console.log(`Seeded ${seed.length} sample cabinet items into MongoDB Atlas.`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Seed warning';
    console.warn('MongoDB Atlas initial seed check skipped or partial:', msg);
  }
}
