import React, { useCallback, useEffect, useState } from 'react';
import { Square, Volume2, X } from 'lucide-react';
import type { CabinetItem, Language, Medicine } from './types';
import { getText } from './i18n';
import { speakText, stopSpeaking } from './utils/speech';
import { ScannerView } from './components/ScannerView';
import { MedicinesView } from './components/MedicinesView';
import { InteractionsView } from './components/InteractionsView';
import { StoresView } from './components/StoresView';
import { CabinetView } from './components/CabinetView';

type ActiveTab = 'scanner' | 'medicines' | 'interactions' | 'stores' | 'cabinet';

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [largeText, setLargeText] = useState(false);
  const [slowVoice, setSlowVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>('dolo-650');
  const [interactionIds, setInteractionIds] = useState<string[]>(['dolo-650', 'combiflam']);
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([]);
  const [prefillCabinet, setPrefillCabinet] = useState<{
    medicine: Medicine;
    expiryDate?: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const t = getText(lang);

  useEffect(() => {
    document.documentElement.classList.toggle('text-large', largeText);
  }, [largeText]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3200);
  }, []);

  const fetchCabinet = useCallback(async () => {
    try {
      const resp = await fetch('/api/cabinet');
      if (resp.ok) {
        const data = await resp.json();
        setCabinetItems(data.items ?? []);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  useEffect(() => {
    fetch('/api/medicines')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.medicines)) {
          setMedicines(data.medicines);
        }
      })
      .catch(() => {});

    fetchCabinet();
  }, [fetchCabinet]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleSpeak = useCallback(
    (text: string) => {
      const rate = slowVoice ? 0.8 : 0.98;
      const started = speakText(
        text,
        lang,
        rate,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false)
      );
      if (!started) {
        showToast(
          lang === 'hi'
            ? 'इस ब्राउज़र में वॉइस रीडआउट उपलब्ध नहीं है।'
            : 'Voice readout is not supported in this browser.'
        );
      }
    },
    [lang, slowVoice, showToast]
  );

  const handleStopSpeak = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  const handleOpenMedicine = (med: Medicine) => {
    setSelectedMedicineId(med.id);
    setActiveTab('medicines');
  };

  const handleAddToCabinet = (med: Medicine, detectedExpiry?: string) => {
    setPrefillCabinet({ medicine: med, expiryDate: detectedExpiry });
    setActiveTab('cabinet');
  };

  const handleAddToInteractionCheck = (med: Medicine) => {
    setInteractionIds((prev) => (prev.includes(med.id) ? prev : [...prev, med.id]));
    setActiveTab('interactions');
    showToast(
      lang === 'hi'
        ? `${med.brandName} को सुरक्षा जांच में जोड़ा गया`
        : `Added ${med.brandName} to Safety Check`
    );
  };

  const handleCheckCabinetSafety = () => {
    const activeIds = Array.from(
      new Set(
        cabinetItems
          .filter((item) => item.status !== 'expired' && item.medicineId)
          .map((item) => item.medicineId as string)
      )
    );
    if (activeIds.length >= 2) {
      setInteractionIds(activeIds);
    }
    setActiveTab('interactions');
  };

  const navItems: Array<{ key: ActiveTab; label: string }> = [
    { key: 'scanner', label: t.nav.scanner },
    { key: 'medicines', label: t.nav.medicines },
    { key: 'interactions', label: t.nav.interactions },
    { key: 'stores', label: t.nav.stores },
    { key: 'cabinet', label: t.nav.cabinet },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBF7] text-[#122119]">
      {/* Strict 3-Zone Top Bar Contract — Deep Forest Green with Warm Yellow Accent */}
      <header className="sticky top-0 z-30 bg-[#14532D] border-b border-[#166534]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.brand}
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    active
                      ? 'text-[#FEF08A] border-[#FACC15] font-semibold'
                      : 'text-emerald-50/90 border-transparent hover:text-white hover:border-[#FACC15]/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
          >
            {t.scanCta}
          </button>
        </div>
      </header>

      {/* Non-sticky Workspace Accessibility Bar — Soft Butter Yellow Surface */}
      <div className="bg-[#FEFCE8] border-b border-[#E7E2B8]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Mobile Navigation Scroll Row */}
          <nav
            aria-label="Mobile navigation"
            className="flex md:hidden items-center gap-1.5 overflow-x-auto w-full pb-1.5 border-b border-[#E7E2B8]"
          >
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                  activeTab === item.key
                    ? 'bg-[#14532D] text-[#FEF08A]'
                    : 'bg-white text-[#122119] border border-[#DDE5DA]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Language Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[#4A5D52] font-medium whitespace-nowrap">
                {t.toolbar.languageLabel}
              </span>
              <div className="inline-flex p-0.5 bg-white border border-[#DCE3D5] rounded-md">
                <button
                  type="button"
                  onClick={() => {
                    handleStopSpeak();
                    setLang('en');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    lang === 'en'
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStopSpeak();
                    setLang('hi');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    lang === 'hi'
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            {/* Text Size Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[#4A5D52] font-medium whitespace-nowrap">
                {t.toolbar.textSize}
              </span>
              <div className="inline-flex p-0.5 bg-white border border-[#DCE3D5] rounded-md">
                <button
                  type="button"
                  onClick={() => setLargeText(false)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    !largeText
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  {t.toolbar.standard}
                </button>
                <button
                  type="button"
                  onClick={() => setLargeText(true)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    largeText
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  {t.toolbar.large}
                </button>
              </div>
            </div>

            {/* Voice Speed Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[#4A5D52] font-medium whitespace-nowrap">
                {t.toolbar.voiceSpeed}
              </span>
              <div className="inline-flex p-0.5 bg-white border border-[#DCE3D5] rounded-md">
                <button
                  type="button"
                  onClick={() => setSlowVoice(false)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    !slowVoice
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  {t.toolbar.normal}
                </button>
                <button
                  type="button"
                  onClick={() => setSlowVoice(true)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    slowVoice
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  {t.toolbar.slow}
                </button>
              </div>
            </div>
          </div>

          {isSpeaking && (
            <button
              type="button"
              onClick={handleStopSpeak}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Square className="w-3 h-3 fill-current" />
              {t.toolbar.stopVoice}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {activeTab === 'scanner' && (
          <ScannerView
            lang={lang}
            onSpeak={handleSpeak}
            onOpenMedicine={handleOpenMedicine}
            onAddToCabinet={handleAddToCabinet}
            onAddToInteractionCheck={handleAddToInteractionCheck}
          />
        )}

        {activeTab === 'medicines' && (
          <MedicinesView
            lang={lang}
            medicines={medicines}
            selectedMedicineId={selectedMedicineId}
            onSelectMedicine={setSelectedMedicineId}
            isSpeaking={isSpeaking}
            onSpeak={handleSpeak}
            onStopSpeak={handleStopSpeak}
            onAddToCabinet={(med) => handleAddToCabinet(med)}
            onAddToInteractionCheck={handleAddToInteractionCheck}
          />
        )}

        {activeTab === 'interactions' && (
          <InteractionsView
            lang={lang}
            medicines={medicines}
            selectedIds={interactionIds}
            onChangeSelectedIds={setInteractionIds}
            cabinetItems={cabinetItems}
            onSpeak={handleSpeak}
          />
        )}

        {activeTab === 'stores' && <StoresView lang={lang} />}

        {activeTab === 'cabinet' && (
          <CabinetView
            lang={lang}
            medicines={medicines}
            items={cabinetItems}
            onRefresh={fetchCabinet}
            prefillMedicine={prefillCabinet}
            onClearPrefill={() => setPrefillCabinet(null)}
            onCheckCabinetSafety={handleCheckCabinetSafety}
          />
        )}
      </main>

      {/* Quiet Footer with Medical Disclaimer & Quick Actions */}
      <footer className="border-t border-[#DCE5D8] bg-white mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
          <p className="text-xs text-[#4A5D52] leading-relaxed">{t.disclaimer}</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#6B7E72]">
            <p>
              © {new Date().getFullYear()} DawaiSamjho ·{' '}
              {lang === 'hi'
                ? 'सुलभ और सुरक्षित दवा जानकारी मंच'
                : 'Accessible Pharmaceutical Information Platform'}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleSpeak(t.disclaimer)}
                className="inline-flex items-center gap-1 text-[#15803D] hover:text-[#14532D] font-medium transition-colors whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {lang === 'hi' ? 'अस्वीकरण सुनें' : 'Listen Disclaimer'}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Subtle Notification Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-[#14532D] text-white border border-[#FACC15]/50 text-xs font-medium px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-[#FEF08A] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
