export type Language = 'en' | 'hi';

export interface BilingualText {
  en: string;
  hi: string;
}

export interface BilingualList {
  en: string[];
  hi: string[];
}

export interface SaltIngredient {
  name: string;
  strength: string;
  normalizedKey: string;
}

export interface Medicine {
  id: string;
  brandName: string;
  aliases: string[];
  manufacturer: string;
  packSize: BilingualText;
  categoryKey:
    | 'fever_pain'
    | 'antibiotic'
    | 'acidity_gi'
    | 'diabetes'
    | 'blood_pressure'
    | 'heart_blood'
    | 'allergy_cold'
    | 'vitamins_calcium'
    | 'thyroid_cholesterol';
  category: BilingualText;
  salts: SaltIngredient[];
  brandedPriceINR: number;
  genericName: string;
  genericManufacturer: string;
  genericPriceINR: number;
  janAushadhiCode: string;
  schedule: 'OTC' | 'Schedule H' | 'Schedule H1';
  prescriptionRequired: boolean;
  summary: BilingualText;
  uses: BilingualList;
  howToTake: BilingualText;
  sideEffects: BilingualList;
  precautions: BilingualList;
}

export interface DrugInteractionRule {
  id: string;
  saltA: string;
  saltB: string;
  severity: 'high' | 'moderate';
  title: BilingualText;
  explanation: BilingualText;
  recommendation: BilingualText;
}

export interface DuplicateSaltAlert {
  normalizedKey: string;
  saltName: string;
  medicines: Array<{
    id: string;
    brandName: string;
    strength: string;
  }>;
  warning: BilingualText;
}

export interface InteractionMatch {
  rule: DrugInteractionRule;
  medicineA: { id: string; brandName: string };
  medicineB: { id: string; brandName: string };
}

export interface InteractionCheckResult {
  checkedMedicines: Array<{
    id: string;
    brandName: string;
    salts: SaltIngredient[];
  }>;
  duplicateSalts: DuplicateSaltAlert[];
  interactions: InteractionMatch[];
  riskLevel: 'safe' | 'moderate' | 'high';
}

export interface JanAushadhiStore {
  id: string;
  kendraCode: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  openSunday: boolean;
  distanceKm?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  role: 'user' | 'guest';
}

export interface CabinetItem {
  id: string;
  ownerId?: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  salts: string[];
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: string;
  forWhom: string;
  dosageNote: string;
  addedAt: string;
  status?: 'expired' | 'expiring_soon' | 'safe';
  daysRemaining?: number;
}

export interface OcrMatchCandidate {
  medicine: Medicine;
  score: number; // 0 to 100
  matchedOn: string;
  levenshteinDistance: number;
}

export interface OcrMatchResponse {
  extractedText: string;
  cleanedTokens: string[];
  detectedExpiry?: string;
  matches: OcrMatchCandidate[];
}

export interface AiVisionAnalysis {
  detectedName: string;
  saltsText: string;
  strength: string;
  expiryDate: string | null;
  matchedMedicine: Medicine | null;
  matchScore: number;
  aiSummary?: {
    summary: BilingualText;
    uses: BilingualList;
    howToTake: BilingualText;
    precautions: BilingualList;
    estimatedGenericSavingNote: BilingualText;
  };
}
