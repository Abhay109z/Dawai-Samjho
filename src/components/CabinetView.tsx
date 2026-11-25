import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type { CabinetItem, Language, Medicine } from '../types';
import { getText } from '../i18n';

interface CabinetViewProps {
  lang: Language;
  medicines: Medicine[];
  items: CabinetItem[];
  onRefresh: () => Promise<void>;
  prefillMedicine: { medicine: Medicine; expiryDate?: string } | null;
  onClearPrefill: () => void;
  onCheckCabinetSafety: () => void;
}

export function CabinetView({
  lang,
  medicines,
  items,
  onRefresh,
  prefillMedicine,
  onClearPrefill,
  onCheckCabinetSafety,
}: CabinetViewProps) {
  const t = getText(lang);
  const [filter, setFilter] = useState<'all' | 'expiring_soon' | 'expired' | 'safe'>('all');
  const [showForm, setShowForm] = useState(false);

  const [selectedMedId, setSelectedMedId] = useState('');
  const [name, setName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('1 Strip');
  const [forWhom, setForWhom] = useState('Family');
  const [dosageNote, setDosageNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillMedicine) {
      setShowForm(true);
      setSelectedMedId(prefillMedicine.medicine.id);
      setName(prefillMedicine.medicine.brandName);
      setQuantity(prefillMedicine.medicine.packSize[lang]);
      setDosageNote(prefillMedicine.medicine.howToTake[lang].slice(0, 120));
      if (prefillMedicine.expiryDate) {
        setExpiryDate(prefillMedicine.expiryDate);
      } else {
        const nextYear = new Date();
        nextYear.setMonth(nextYear.getMonth() + 12);
        setExpiryDate(nextYear.toISOString().slice(0, 10));
      }
      onClearPrefill();
    }
  }, [prefillMedicine, lang, onClearPrefill]);

  const handleSelectFromDb = (medId: string) => {
    setSelectedMedId(medId);
    const med = medicines.find((m) => m.id === medId);
    if (med) {
      setName(med.brandName);
      setQuantity(med.packSize[lang]);
      if (!dosageNote) setDosageNote(med.howToTake[lang].slice(0, 120));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !expiryDate) {
      setFormError(
        lang === 'hi'
          ? 'कृपया दवा का नाम और एक्सपायरी तारीख दोनों भरें।'
          : 'Please enter both the medicine name and expiry date.'
      );
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch('/api/cabinet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: selectedMedId || undefined,
          name: name.trim(),
          batchNumber: batchNumber.trim() || 'N/A',
          expiryDate,
          quantity: quantity.trim() || '1 Strip',
          forWhom: forWhom.trim() || 'Self',
          dosageNote: dosageNote.trim(),
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || 'Could not save medicine');
      }
      setSelectedMedId('');
      setName('');
      setBatchNumber('');
      setExpiryDate('');
      setQuantity('1 Strip');
      setForWhom('Family');
      setDosageNote('');
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/cabinet/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch {
      // Ignore error
    }
  };

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const expiringCount = items.filter((i) => i.status === 'expiring_soon').length;
  const safeCount = items.filter((i) => i.status === 'safe').length;

  const visibleItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DCE5D8] pb-6">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#122119]">
            {t.cabinet.title}
          </h1>
          <p className="text-sm sm:text-base text-[#4A5D52]">{t.cabinet.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onCheckCabinetSafety}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
          >
            <ShieldAlert className="w-4 h-4 text-[#14532D]" />
            {t.cabinet.checkCabinetSafety}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? t.cabinet.cancel : t.cabinet.addMedicineBtn}
          </button>
        </div>
      </div>

      {/* 4-column Summary KPI Strip (single elevation, hairline divided, tabular numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#DCE5D8] rounded-xl overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#DCE5D8]">
        <div className="p-5">
          <p className="text-xs font-medium text-[#5A6E63]">{t.cabinet.totalMeds}</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#122119] mt-1">
            {items.length}
          </p>
        </div>
        <div className="p-5 bg-[#ECFDF3]/60">
          <p className="text-xs font-semibold text-[#15803D]">{t.cabinet.safeCount}</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#15803D] mt-1">
            {safeCount}
          </p>
        </div>
        <div className="p-5 bg-[#FEFCE8]">
          <p className="text-xs font-semibold text-[#854D0E]">{t.cabinet.expiringSoon}</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-[#A16207] mt-1">
            {expiringCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[#5A6E63]">{t.cabinet.expiredCount}</p>
          <p className="text-3xl font-bold font-mono tabular-nums text-red-600 mt-1">
            {expiredCount}
          </p>
        </div>
      </div>

      {/* Add Medicine Form Drawer */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#DCE5D8] rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#DCE5D8] pb-3">
            <h2 className="text-base font-bold text-[#122119]">{t.cabinet.formTitle}</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[#5A6E63] hover:text-[#122119]"
              aria-label="Close form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t.cabinet.selectFromDb}
              </label>
              <select
                value={selectedMedId}
                onChange={(e) => handleSelectFromDb(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              >
                <option value="">
                  {lang === 'hi' ? '-- मैन्युअल नाम लिखें --' : '-- Or type custom name --'}
                </option>
                {medicines.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.brandName} ({med.salts.map((s) => s.name).join(' + ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t.cabinet.customName} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Dolo 650"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t.cabinet.expiryDate} *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t.cabinet.batchNumber}
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g., DL26A418"
                className="w-full px-3 py-2.5 text-sm font-mono bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t.cabinet.quantity}
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 10 Tablets"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {t.cabinet.forWhom}
              </label>
              <input
                type="text"
                value={forWhom}
                onChange={(e) => setForWhom(e.target.value)}
                placeholder="e.g., Father, Mother, Self"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              {t.cabinet.dosageNote}
            </label>
            <input
              type="text"
              value={dosageNote}
              onChange={(e) => setDosageNote(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'जैसे: सुबह नाश्ते के बाद 1 गोली'
                  : 'e.g., 1 tablet after breakfast daily'
              }
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              {t.cabinet.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] disabled:opacity-60"
            >
              {saving ? '...' : t.cabinet.saveRecord}
            </button>
          </div>
        </form>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {(
          [
            { key: 'all', label: `${t.cabinet.filterAll} (${items.length})` },
            { key: 'expiring_soon', label: `${t.cabinet.filterExpiring} (${expiringCount})` },
            { key: 'expired', label: `${t.cabinet.filterExpired} (${expiredCount})` },
            { key: 'safe', label: `${t.cabinet.filterSafe} (${safeCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filter === tab.key
                ? 'bg-[#14532D] text-[#FEF08A]'
                : 'bg-[#F2F6EE] text-[#2F4337] hover:bg-[#E7EFE1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cabinet Records Table */}
      <div className="bg-white border border-[#DCE5D8] rounded-xl overflow-hidden">
        {visibleItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-[#4A5D52]">{t.cabinet.emptyCabinet}</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534]"
            >
              <Plus className="w-4 h-4" />
              {t.cabinet.addMedicineBtn}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5D8] bg-[#F7FAF5] text-xs font-semibold text-[#4A5D52]">
                  <th className="py-3.5 px-5">{t.cabinet.customName}</th>
                  <th className="py-3.5 px-4">{t.cabinet.forWhom}</th>
                  <th className="py-3.5 px-4">{t.cabinet.quantity}</th>
                  <th className="py-3.5 px-4">{t.cabinet.expiryDate}</th>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'स्थिति' : 'Status'}</th>
                  <th className="py-3.5 px-5 text-right">{lang === 'hi' ? 'क्रिया' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {visibleItems.map((item) => {
                  const isExpired = item.status === 'expired';
                  const isExpiring = item.status === 'expiring_soon';
                  const days = item.daysRemaining ?? 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        {item.salts.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.salts.join(' + ')}</p>
                        )}
                        {item.dosageNote && (
                          <p className="text-xs text-slate-600 mt-1">{item.dosageNote}</p>
                        )}
                        {isExpired && (
                          <p className="text-xs text-red-700 font-medium mt-1">
                            {t.cabinet.disposeAdvice}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                        <p>{item.forWhom}</p>
                        <p className="text-xs font-mono text-slate-400">Batch: {item.batchNumber}</p>
                      </td>
                      <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                        {item.quantity}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-slate-900 whitespace-nowrap">
                        {item.expiryDate}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            isExpired
                              ? 'text-red-700'
                              : isExpiring
                              ? 'text-amber-700'
                              : 'text-[#15803D]'
                          }`}
                        >
                          {isExpired ? (
                            <AlertOctagon className="w-4 h-4 shrink-0" />
                          ) : isExpiring ? (
                            <Clock className="w-4 h-4 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          )}
                          <span>
                            {isExpired
                              ? `${t.cabinet.expiredTag} (${Math.abs(days)} ${t.cabinet.daysAgo})`
                              : isExpiring
                              ? `${t.cabinet.expiringTag} (${days} ${t.cabinet.daysLeft})`
                              : `${t.cabinet.safeTag} (${days} ${t.cabinet.daysLeft})`}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t.cabinet.delete}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
