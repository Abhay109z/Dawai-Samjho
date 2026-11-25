import React, { useEffect, useState } from 'react';
import {
  PackagePlus,
  Search,
  ShieldAlert,
  Square,
  Volume2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { Language, Medicine } from '../types';
import { getText } from '../i18n';

interface MedicinesViewProps {
  lang: Language;
  medicines: Medicine[];
  selectedMedicineId: string | null;
  onSelectMedicine: (id: string) => void;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  onAddToCabinet: (medicine: Medicine) => void;
  onAddToInteractionCheck: (medicine: Medicine) => void;
}

const CATEGORIES: Array<{ key: string; en: string; hi: string }> = [
  { key: 'all', en: 'All', hi: 'सभी' },
  { key: 'fever_pain', en: 'Fever & Pain', hi: 'बुखार व दर्द' },
  { key: 'antibiotic', en: 'Antibiotics', hi: 'एंटीबायोटिक' },
  { key: 'acidity_gi', en: 'Acidity & Gas', hi: 'एसिडिटी व गैस' },
  { key: 'blood_pressure', en: 'Blood Pressure', hi: 'बीपी' },
  { key: 'diabetes', en: 'Diabetes', hi: 'डायबिटीज' },
  { key: 'allergy_cold', en: 'Allergy & Cold', hi: 'एलर्जी' },
  { key: 'heart_blood', en: 'Heart', hi: 'हृदय' },
  { key: 'thyroid_cholesterol', en: 'Thyroid & Lipid', hi: 'थायरॉइड' },
  { key: 'vitamins_calcium', en: 'Vitamins', hi: 'विटामिन' },
];

export function MedicinesView({
  lang,
  medicines,
  selectedMedicineId,
  onSelectMedicine,
  isSpeaking,
  onSpeak,
  onStopSpeak,
  onAddToCabinet,
  onAddToInteractionCheck,
}: MedicinesViewProps) {
  const t = getText(lang);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [filtered, setFiltered] = useState<Medicine[]>(medicines);
  const [matchMode, setMatchMode] = useState<'direct' | 'fuzzy' | null>(null);
  const [sameSaltPeers, setSameSaltPeers] = useState<Medicine[]>([]);

  // Query backend fuzzy search API on search/category change
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (category !== 'all') params.set('category', category);
        const resp = await fetch(`/api/medicines?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await resp.json();
        setFiltered(data.medicines ?? []);
        setMatchMode(data.matchMode ?? null);
      } catch {
        // Ignore aborted requests
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category]);

  const activeMedicine =
    filtered.find((m) => m.id === selectedMedicineId) ??
    medicines.find((m) => m.id === selectedMedicineId) ??
    filtered[0] ??
    null;

  useEffect(() => {
    if (!activeMedicine) {
      setSameSaltPeers([]);
      return;
    }
    fetch(`/api/medicines/${activeMedicine.id}`)
      .then((r) => r.json())
      .then((data) => setSameSaltPeers(data.sameSaltPeers ?? []))
      .catch(() => setSameSaltPeers([]));
  }, [activeMedicine?.id]);

  const buildNarration = (med: Medicine) => {
    const saving = (med.brandedPriceINR - med.genericPriceINR).toFixed(0);
    const pct = Math.round(((med.brandedPriceINR - med.genericPriceINR) / med.brandedPriceINR) * 100);
    if (lang === 'hi') {
      return `${med.brandName}। सक्रिय तत्व: ${med.salts
        .map((s) => `${s.name} ${s.strength}`)
        .join(', ')}। ${med.summary.hi} उपयोग: ${med.uses.hi.join(', ')}। कैसे लें: ${
        med.howToTake.hi
      } सावधानियाँ: ${med.precautions.hi.join(' ')} ब्रांडेड कीमत ${
        med.brandedPriceINR
      } रुपये और जन औषधि जेनेरिक कीमत ${med.genericPriceINR} रुपये है, यानी लगभग ${saving} रुपये या ${pct} प्रतिशत की बचत।`;
    }
    return `${med.brandName}. Active ingredients: ${med.salts
      .map((s) => `${s.name} ${s.strength}`)
      .join(', ')}. ${med.summary.en} Uses: ${med.uses.en.join(', ')}. How to take: ${
      med.howToTake.en
    } Key precautions: ${med.precautions.en.join(' ')} Branded price is ${
      med.brandedPriceINR
    } rupees versus Jan Aushadhi generic price ${med.genericPriceINR} rupees, saving ${saving} rupees or ${pct} percent.`;
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#DCE5D8] pb-6 space-y-4">
        <div className="max-w-3xl space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#122119]">
            {t.medicines.title}
          </h1>
          <p className="text-sm sm:text-base text-[#4A5D52]">{t.medicines.subtitle}</p>
        </div>

        {/* Search + Category Segmented Filter */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-[#5A6E63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.medicines.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  category === cat.key
                    ? 'bg-[#14532D] text-[#FEF08A]'
                    : 'bg-[#F2F6EE] text-[#2F4337] hover:bg-[#E7EFE1]'
                }`}
              >
                {cat[lang]}
              </button>
            ))}
          </div>

          {matchMode === 'fuzzy' && query.trim() && (
            <p className="text-xs font-medium text-[#15803D]">
              {lang === 'hi'
                ? `"${query}" के लिए Levenshtein फज़ी मिलान दिखाए जा रहे हैं`
                : `Showing Levenshtein fuzzy matches for "${query}"`}
            </p>
          )}
        </div>
      </div>

      {/* Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 bg-white border border-[#DCE5D8] rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#5A6E63]">{t.medicines.noResults}</div>
          ) : (
            <div className="divide-y divide-[#E4EBE0] max-h-[760px] overflow-y-auto">
              {filtered.map((med) => {
                const isSelected = activeMedicine?.id === med.id;
                const savingsPct = Math.round(
                  ((med.brandedPriceINR - med.genericPriceINR) / med.brandedPriceINR) * 100
                );
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => onSelectMedicine(med.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors flex items-start justify-between gap-4 ${
                      isSelected ? 'bg-[#FEFCE8]' : 'hover:bg-[#F7FAF5]'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isSelected ? 'text-[#14532D]' : 'text-[#122119]'
                        }`}
                      >
                        {med.brandName}
                      </p>
                      <p className="text-xs text-[#4A5D52] truncate">
                        {med.salts.map((s) => `${s.name} ${s.strength}`).join(' + ')}
                      </p>
                      <p className="text-xs text-[#6B7E72]">
                        {med.category[lang]} · {med.packSize[lang]}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-xs text-[#7D8F84] line-through font-mono tabular-nums">
                        ₹{med.brandedPriceINR.toFixed(0)}
                      </p>
                      <p className="text-sm font-bold text-[#15803D] font-mono tabular-nums">
                        ₹{med.genericPriceINR.toFixed(0)}
                      </p>
                      <p className="text-[11px] font-semibold text-[#854D0E] font-mono tabular-nums">
                        -{savingsPct}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-7 bg-white border border-[#DCE5D8] rounded-xl p-6 sm:p-7 space-y-6">
          {!activeMedicine ? (
            <div className="py-12 text-center text-sm text-slate-500">
              {t.medicines.noResults}
            </div>
          ) : (
            <>
              {/* Title + Voice Readout */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{activeMedicine.category[lang]}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeMedicine.prescriptionRequired
                        ? t.medicines.prescriptionReq
                        : t.medicines.otc}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeMedicine.schedule}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{activeMedicine.brandName}</h2>
                  <p className="text-sm text-slate-600">
                    {activeMedicine.manufacturer} · {activeMedicine.packSize[lang]}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSpeaking ? (
                    <button
                      type="button"
                      onClick={onStopSpeak}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      {t.medicines.stopListening}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSpeak(buildNarration(activeMedicine))}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                    >
                      <Volume2 className="w-4 h-4" />
                      {t.medicines.listenFull}
                    </button>
                  )}
                </div>
              </div>

              {/* Plain-language Summary */}
              <p className="text-sm sm:text-base text-[#1F3127] leading-relaxed">
                {activeMedicine.summary[lang]}
              </p>

              {/* Generic vs Branded Price Comparison Table */}
              <div className="border border-[#DCE5D8] rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#DCE5D8] bg-[#F7FAF5]">
                  <div className="p-4">
                    <p className="text-xs text-[#5A6E63]">{t.medicines.brandedPrice}</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[#122119] mt-1">
                      ₹{activeMedicine.brandedPriceINR.toFixed(2)}
                    </p>
                    <p className="text-xs text-[#5A6E63] mt-0.5 truncate">
                      {activeMedicine.brandName} ({activeMedicine.packSize[lang]})
                    </p>
                  </div>

                  <div className="p-4 bg-[#ECFDF3]">
                    <p className="text-xs font-semibold text-[#15803D]">{t.medicines.genericPrice}</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[#15803D] mt-1">
                      ₹{activeMedicine.genericPriceINR.toFixed(2)}
                    </p>
                    <p className="text-xs text-[#3F5147] mt-0.5 font-mono">
                      {t.medicines.kendraCode}: {activeMedicine.janAushadhiCode}
                    </p>
                  </div>

                  <div className="p-4 bg-[#FEFCE8]">
                    <p className="text-xs font-semibold text-[#854D0E]">{t.medicines.youSave}</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-[#854D0E] mt-1">
                      ₹{(activeMedicine.brandedPriceINR - activeMedicine.genericPriceINR).toFixed(2)}
                    </p>
                    <p className="text-xs font-semibold text-[#15803D] font-mono tabular-nums mt-0.5">
                      {Math.round(
                        ((activeMedicine.brandedPriceINR - activeMedicine.genericPriceINR) /
                          activeMedicine.brandedPriceINR) *
                          100
                      )}
                      % {lang === 'hi' ? 'कम कीमत' : 'lower price'}
                    </p>
                  </div>
                </div>

                {/* Visual Proportional Bar */}
                <div className="px-4 py-3.5 bg-white border-t border-[#DCE5D8] space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[#4A5D52]">
                      <span className="truncate pr-2">{activeMedicine.brandName}</span>
                      <span className="font-mono tabular-nums shrink-0">
                        ₹{activeMedicine.brandedPriceINR.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#F2F6EE] rounded-full overflow-hidden">
                      <div className="h-full bg-[#EAB308] rounded-full w-full" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-[#15803D]">
                      <span className="truncate pr-2">{activeMedicine.genericName}</span>
                      <span className="font-mono tabular-nums shrink-0">
                        ₹{activeMedicine.genericPriceINR.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#F2F6EE] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#15803D] rounded-full"
                        style={{
                          width: `${Math.max(
                            8,
                            Math.round(
                              (activeMedicine.genericPriceINR / activeMedicine.brandedPriceINR) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5A6E63] pt-1">{t.medicines.priceNote}</p>
                </div>
              </div>

              {/* Active Salts */}
              <div className="space-y-2 pt-2 border-t border-[#DCE5D8]">
                <h3 className="text-xs font-semibold text-[#5A6E63]">{t.medicines.sameSaltTitle}</h3>
                <div className="divide-y divide-[#E8EFE4] border border-[#DCE5D8] rounded-lg">
                  {activeMedicine.salts.map((salt, idx) => (
                    <div
                      key={`${salt.normalizedKey}-${idx}`}
                      className="px-4 py-2.5 flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-[#122119]">{salt.name}</span>
                      <span className="font-mono tabular-nums text-[#4A5D52]">{salt.strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uses & How to Take */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#DCE5D8]">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#122119]">{t.medicines.usesTitle}</h3>
                  <ul className="space-y-1.5 text-sm text-[#2F4337] list-disc pl-5">
                    {activeMedicine.uses[lang].map((use, idx) => (
                      <li key={idx}>{use}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#122119]">
                    {t.medicines.howToTakeTitle}
                  </h3>
                  <p className="text-sm text-[#2F4337] leading-relaxed">
                    {activeMedicine.howToTake[lang]}
                  </p>
                </div>
              </div>

              {/* Side Effects & Precautions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-[#DCE5D8]">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#122119] flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#15803D]" />
                    {t.medicines.sideEffectsTitle}
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#2F4337] list-disc pl-5">
                    {activeMedicine.sideEffects[lang].map((se, idx) => (
                      <li key={idx}>{se}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#854D0E] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#CA8A04]" />
                    {t.medicines.precautionsTitle}
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#2F4337] list-disc pl-5">
                    {activeMedicine.precautions[lang].map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Same-Salt Branded Peers */}
              {sameSaltPeers.length > 0 && (
                <div className="pt-4 border-t border-[#DCE5D8] space-y-2">
                  <h3 className="text-xs font-semibold text-[#5A6E63]">
                    {t.medicines.sameSaltPeers}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sameSaltPeers.map((peer) => (
                      <button
                        key={peer.id}
                        type="button"
                        onClick={() => onSelectMedicine(peer.id)}
                        className="px-3 py-2 text-xs font-medium rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] hover:bg-[#FEF9C3] text-[#122119] transition-colors whitespace-nowrap shrink-0"
                      >
                        {peer.brandName} ·{' '}
                        <span className="font-mono tabular-nums">₹{peer.brandedPriceINR}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Row */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#DCE5D8]">
                <button
                  type="button"
                  onClick={() => onAddToInteractionCheck(activeMedicine)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] text-[#122119] hover:bg-[#FEF9C3] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <ShieldAlert className="w-4 h-4 text-[#854D0E]" />
                  {t.medicines.addToChecker}
                </button>
                <button
                  type="button"
                  onClick={() => onAddToCabinet(activeMedicine)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <PackagePlus className="w-4 h-4" />
                  {t.medicines.saveToCabinet}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
