import mongoose, { Schema } from 'mongoose';
import type { CabinetItem, JanAushadhiStore, Medicine } from '../src/types.ts';

mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

const UserSchema = new Schema<StoredUserRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { collection: 'users', versionKey: false }
);

const BilingualTextSchema = new Schema(
  {
    en: { type: String, required: true },
    hi: { type: String, required: true },
  },
  { _id: false }
);

const BilingualListSchema = new Schema(
  {
    en: { type: [String], required: true },
    hi: { type: [String], required: true },
  },
  { _id: false }
);

const SaltIngredientSchema = new Schema(
  {
    name: { type: String, required: true },
    strength: { type: String, required: true },
    normalizedKey: { type: String, required: true, index: true },
  },
  { _id: false }
);

const MedicineSchema = new Schema<Medicine>(
  {
    id: { type: String, required: true, unique: true, index: true },
    brandName: { type: String, required: true },
    aliases: { type: [String], default: [] },
    manufacturer: { type: String, required: true },
    packSize: { type: BilingualTextSchema, required: true },
    categoryKey: { type: String, required: true, index: true },
    category: { type: BilingualTextSchema, required: true },
    salts: { type: [SaltIngredientSchema], required: true },
    brandedPriceINR: { type: Number, required: true },
    genericName: { type: String, required: true },
    genericManufacturer: { type: String, required: true },
    genericPriceINR: { type: Number, required: true },
    janAushadhiCode: { type: String, required: true },
    schedule: { type: String, enum: ['OTC', 'Schedule H', 'Schedule H1'], required: true },
    prescriptionRequired: { type: Boolean, required: true },
    summary: { type: BilingualTextSchema, required: true },
    uses: { type: BilingualListSchema, required: true },
    howToTake: { type: BilingualTextSchema, required: true },
    sideEffects: { type: BilingualListSchema, required: true },
    precautions: { type: BilingualListSchema, required: true },
  },
  { collection: 'medicines', versionKey: false }
);

const StoreSchema = new Schema<JanAushadhiStore>(
  {
    id: { type: String, required: true, unique: true, index: true },
    kendraCode: { type: String, required: true, index: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    pincode: { type: String, required: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    phone: { type: String, required: true },
    hours: { type: String, required: true },
    openSunday: { type: Boolean, default: true },
  },
  { collection: 'jan_aushadhi_stores', versionKey: false }
);

const CabinetItemSchema = new Schema<CabinetItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    medicineId: { type: String, required: false },
    name: { type: String, required: true },
    genericName: { type: String, required: false },
    salts: { type: [String], default: [] },
    batchNumber: { type: String, default: 'N/A' },
    expiryDate: { type: String, required: true },
    quantity: { type: String, default: '1 Strip' },
    forWhom: { type: String, default: 'Self' },
    dosageNote: { type: String, default: '' },
    addedAt: { type: String, required: true },
  },
  { collection: 'cabinet_items', versionKey: false }
);

export const UserModel =
  (mongoose.models.User as mongoose.Model<StoredUserRecord>) ||
  mongoose.model<StoredUserRecord>('User', UserSchema);

export const MedicineModel =
  (mongoose.models.Medicine as mongoose.Model<Medicine>) ||
  mongoose.model<Medicine>('Medicine', MedicineSchema);

export const StoreModel =
  (mongoose.models.JanAushadhiStore as mongoose.Model<JanAushadhiStore>) ||
  mongoose.model<JanAushadhiStore>('JanAushadhiStore', StoreSchema);

export const CabinetItemModel =
  (mongoose.models.CabinetItem as mongoose.Model<CabinetItem>) ||
  mongoose.model<CabinetItem>('CabinetItem', CabinetItemSchema);
