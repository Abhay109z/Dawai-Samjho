import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  FolderSync,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import type {
  CabinetItem,
  InteractionCheckResult,
  Language,
  Medicine,
} from '../types';
import { getText } from '../i18n';

interface InteractionsViewProps {
  lang: Language;
  medicines: Medicine[];
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  cabinetItems: CabinetItem[];
  onSpeak: (text: string) => void;
}

export function InteractionsView({
  lang,
  medicines,
  selectedIds,
  onChangeSelectedIds,
  cabinetItems,
  onSpeak,
}: InteractionsViewProps) {
  const t = getText(lang);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedMeds = selectedIds
    .map((id) => medicines.find((m) => m.id === id))
    .filter((m): m is Medicine => Boolean(m));

  const availableMatches = medicines.filter((m) => {
    if (selectedIds.includes(m.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.brandName.toLowerCase().includes(q) ||
      m.salts.some((s) => s.name.toLowerCase().includes(q)) ||
      m.genericName.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (selectedIds.length < 2) {
      setResult(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/interactions/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineIds: selectedIds }),
    })
      .then(async (resp) => {
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Interaction check failed');
        if (!cancelled) setResult(data as InteractionCheckResult);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Check failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedIds]);

  const addMedicine = (id: string) => {
    if (!selectedIds.includes(id)) {
      onChangeSelectedIds([...selectedIds, id]);
    }
    setSearch('');
  };

  const removeMedicine = (id: string) => {
    onChangeSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const loadFromCabinet = () => {
    const activeIds = cabinetItems
      .filter((item) => item.status !== 'expired' && item.medicineId)
      .map((item) => item.medicineId as string);
    const unique = Array.from(new Set(activeIds));
    if (unique.length >= 2) {
      onChangeSelectedIds(unique);
    } else {
      setError(
        lang === 'hi'
          ? 'आपके दवा बॉक्स में जांच के लिए कम से कम 2 सक्रिय दवाइयाँ होनी चाहिए।'
          : 'Your cabinet needs at least 2 active (non-expired) catalog medicines to run a cabinet safety check.'
      );
    }
  };

  const speakReport = () => {
    if (!result) return;
    if (result.riskLevel === 'safe') {
      onSpeak(t.interactions.safeMessage);
      return;
    }
    const parts: string[] = [];
    if (result.duplicateSalts.length > 0) {
      parts.push(result.duplicateSalts.map((d) => d.warning[lang]).join(' '));
    }
    if (result.interactions.length > 0) {
      parts.push(
        result.interactions
          .map(
            (item) =>
              `${item.medicineA.brandName} and ${item.medicineB.brandName}: ${item.rule.title[lang]}. ${item.rule.explanation[lang]} ${item.rule.recommendation[lang]}`
          )
          .join(' ')
      );
    }
    onSpeak(parts.join(' '));
  };

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-[#DCE5D8] pb-6">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#122119]">
            {t.interactions.title}
          </h1>
          <p className="text-sm sm:text-base text-[#4A5D52]">{t.interactions.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadFromCabinet}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <FolderSync className="w-4 h-4 text-[#14532D]" />
            {t.interactions.loadFromCabinet}
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeSelectedIds([])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg text-[#4A5D52] hover:text-[#122119] hover:bg-[#F2F6EE] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.interactions.clearAll}
            </button>
          )}
        </div>
      </div>

      {/* Main 2-column Interaction Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Medicine Selection */}
        <div className="lg:col-span-5 bg-white border border-[#DCE5D8] rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#4A5D52] block">
              {t.interactions.selectedCount}:{' '}
              <span className="font-mono tabular-nums text-[#122119]">{selectedMeds.length}</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#5A6E63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.interactions.selectPlaceholder}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              />
            </div>
          </div>

          {/* Search Suggestions Dropdown / List */}
          {search.trim().length > 0 && (
            <div className="border border-[#DCE5D8] rounded-lg divide-y divide-[#E8EFE4] max-h-52 overflow-y-auto">
              {availableMatches.length === 0 ? (
                <p className="p-3 text-xs text-[#5A6E63]">
                  {lang === 'hi' ? 'कोई और दवा नहीं मिली' : 'No matching medicines available'}
                </p>
              ) : (
                availableMatches.slice(0, 8).map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => addMedicine(med.id)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#F7FAF5] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#122119] truncate">
                        {med.brandName}
                      </p>
                      <p className="text-xs text-[#4A5D52] truncate">
                        {med.salts.map((s) => `${s.name} ${s.strength}`).join(' + ')}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-[#15803D] shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected Medicines List */}
          {selectedMeds.length > 0 ? (
            <div className="divide-y divide-[#DCE5D8] border border-[#DCE5D8] rounded-lg overflow-hidden">
              {selectedMeds.map((med) => (
                <div
                  key={med.id}
                  className="px-4 py-3 flex items-start justify-between gap-3 bg-[#F7FAF5]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#122119]">{med.brandName}</p>
                    <p className="text-xs text-[#4A5D52] mt-0.5">
                      {med.salts.map((s) => `${s.name} ${s.strength}`).join(' + ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMedicine(med.id)}
                    aria-label={`Remove ${med.brandName}`}
                    className="p-1.5 text-[#5A6E63] hover:text-red-600 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5A6E63] py-4">{t.interactions.needTwo}</p>
          )}

          {/* Quick Clinical Scenarios */}
          <div className="pt-4 border-t border-[#DCE5D8] space-y-2.5">
            <p className="text-xs font-medium text-[#5A6E63]">{t.interactions.quickPresets}</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => onChangeSelectedIds(['dolo-650', 'combiflam'])}
                className="text-left px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] hover:bg-[#FEF9C3] hover:border-[#EAB308] text-[#122119] transition-colors"
              >
                {t.interactions.preset1}
              </button>
              <button
                type="button"
                onClick={() => onChangeSelectedIds(['ecosprin-75', 'combiflam'])}
                className="text-left px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] hover:bg-[#FEF9C3] hover:border-[#EAB308] text-[#122119] transition-colors"
              >
                {t.interactions.preset2}
              </button>
              <button
                type="button"
                onClick={() => onChangeSelectedIds(['thyronorm-50', 'shelcal-500'])}
                className="text-left px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] hover:bg-[#FEF9C3] hover:border-[#EAB308] text-[#122119] transition-colors"
              >
                {t.interactions.preset3}
              </button>
              <button
                type="button"
                onClick={() => onChangeSelectedIds(['telma-40', 'voveran-sr-100'])}
                className="text-left px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] hover:bg-[#FEF9C3] hover:border-[#EAB308] text-[#122119] transition-colors"
              >
                {t.interactions.preset4}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Safety Report */}
        <div className="lg:col-span-7 bg-white border border-[#DCE5D8] rounded-xl p-6 space-y-6">
          {error && (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-4">
              {error}
            </p>
          )}

          {loading && (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-7 h-7 text-[#15803D] animate-spin mx-auto" />
              <p className="text-sm text-[#4A5D52]">{t.interactions.checking}</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="py-14 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-[#15803D]/40 mx-auto" />
              <h2 className="text-base font-semibold text-[#122119]">
                {lang === 'hi' ? 'सुरक्षा रिपोर्ट तैयार करने के लिए तैयार' : 'Ready to run salt & interaction check'}
              </h2>
              <p className="text-sm text-[#5A6E63] max-w-md mx-auto">
                {t.interactions.needTwo}
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              {/* Overall Risk Banner — explicit icon + text label, no color-only signaling, no thick left border */}
              <div
                className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  result.riskLevel === 'high'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : result.riskLevel === 'moderate'
                    ? 'bg-[#FEFCE8] border-[#EAB308] text-[#854D0E]'
                    : 'bg-[#ECFDF3] border-[#86EFAC] text-[#14532D]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.riskLevel === 'high' ? (
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  ) : result.riskLevel === 'moderate' ? (
                    <AlertTriangle className="w-5 h-5 text-[#CA8A04] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-bold">
                      {result.riskLevel === 'high'
                        ? t.interactions.statusHigh
                        : result.riskLevel === 'moderate'
                        ? t.interactions.statusModerate
                        : t.interactions.statusSafe}
                    </p>
                    <p className="text-xs opacity-85 mt-0.5">
                      {result.checkedMedicines.map((m) => m.brandName).join(' · ')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={speakReport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#DCE5D8] text-[#122119] hover:bg-[#F7FAF5] transition-colors whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-4 h-4 text-[#15803D]" />
                  {t.interactions.listenReport}
                </button>
              </div>

              {/* Duplicate Active Ingredients Section */}
              {result.duplicateSalts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                    {t.interactions.duplicateSection} ({result.duplicateSalts.length})
                  </h3>
                  <div className="divide-y divide-red-100 border border-red-200 rounded-lg overflow-hidden">
                    {result.duplicateSalts.map((dup) => (
                      <div key={dup.normalizedKey} className="p-4 bg-white space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{dup.saltName}</p>
                          <p className="text-xs font-mono text-red-700 font-semibold">
                            {dup.medicines
                              .map((m) => `${m.brandName} (${m.strength})`)
                              .join(' + ')}
                          </p>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {dup.warning[lang]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pairwise Drug-Drug Interactions */}
              {result.interactions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {t.interactions.interactionSection} ({result.interactions.length})
                  </h3>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                    {result.interactions.map((item, idx) => {
                      const isHigh = item.rule.severity === 'high';
                      return (
                        <div key={`${item.rule.id}-${idx}`} className="p-4 bg-white space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {item.medicineA.brandName} + {item.medicineB.brandName}
                            </p>
                            <span
                              className={`text-xs font-semibold inline-flex items-center gap-1 ${
                                isHigh ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              {isHigh ? (
                                <AlertOctagon className="w-3.5 h-3.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              )}
                              {isHigh
                                ? lang === 'hi'
                                  ? 'उच्च जोखिम'
                                  : 'High Risk'
                                : lang === 'hi'
                                ? 'मध्यम सावधानी'
                                : 'Moderate Caution'}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            {item.rule.title[lang]}
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {item.rule.explanation[lang]}
                          </p>
                          <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                            <span className="font-semibold">{t.interactions.recommendation}: </span>
                            {item.rule.recommendation[lang]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Safe Combination Message */}
              {result.riskLevel === 'safe' && (
                <p className="text-sm text-slate-700 leading-relaxed">
                  {t.interactions.safeMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
