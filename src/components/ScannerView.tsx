import React, { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import {
  Camera,
  CheckCircle2,
  FileImage,
  Loader2,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Upload,
  Volume2,
  X,
  ArrowRight,
  PackagePlus,
} from 'lucide-react';
import type {
  AiVisionAnalysis,
  Language,
  Medicine,
  OcrMatchResponse,
} from '../types';
import { getText } from '../i18n';
import {
  preprocessMedicineImage,
  renderSampleStripImage,
  SAMPLE_STRIPS,
  type SampleStripPreset,
} from '../utils/imagePreprocess';

interface ScannerViewProps {
  lang: Language;
  onSpeak: (text: string) => void;
  onOpenMedicine: (medicine: Medicine) => void;
  onAddToCabinet: (medicine: Medicine, detectedExpiry?: string) => void;
  onAddToInteractionCheck: (medicine: Medicine) => void;
}

export function ScannerView({
  lang,
  onSpeak,
  onOpenMedicine,
  onAddToCabinet,
  onAddToInteractionCheck,
}: ScannerViewProps) {
  const t = getText(lang);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [engine, setEngine] = useState<'tesseract' | 'gemini'>('tesseract');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [grayscale, setGrayscale] = useState(true);
  const [contrast, setContrast] = useState(35);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  const [ocrResult, setOcrResult] = useState<OcrMatchResponse | null>(null);
  const [aiResult, setAiResult] = useState<AiVisionAnalysis | null>(null);

  useEffect(() => {
    let active = true;
    if (!originalImage) {
      setProcessedImage(null);
      return;
    }
    preprocessMedicineImage(originalImage, { grayscale, contrast })
      .then((res) => {
        if (active) setProcessedImage(res);
      })
      .catch(() => {
        if (active) setProcessedImage(originalImage);
      });
    return () => {
      active = false;
    };
  }, [originalImage, grayscale, contrast]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError(
        lang === 'hi'
          ? 'कैमरा अनुमति नहीं मिली या डिवाइस में कैमरा उपलब्ध नहीं है। कृपया फोटो अपलोड करें।'
          : 'Camera permission was denied or no camera is available. Please upload a strip image instead.'
      );
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setOriginalImage(dataUrl);
    setOcrResult(null);
    setAiResult(null);
    setScanError(null);
    stopCamera();
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScanError(
        lang === 'hi' ? 'कृपया केवल इमेज फ़ाइल (JPG/PNG) चुनें।' : 'Please choose a valid image file (JPG, PNG, WebP).'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(String(reader.result));
      setOcrResult(null);
      setAiResult(null);
      setScanError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (preset: SampleStripPreset) => {
    const imgData = renderSampleStripImage(preset);
    setOriginalImage(imgData);
    setOcrResult(null);
    setAiResult(null);
    setScanError(null);
  };

  const runScan = async () => {
    if (!originalImage) return;
    setIsScanning(true);
    setScanError(null);
    setOcrResult(null);
    setAiResult(null);
    setScanProgress(10);

    try {
      if (engine === 'tesseract') {
        const inputImg = processedImage || originalImage;
        setScanStage(
          lang === 'hi' ? 'Tesseract.js OCR इंजन लोड हो रहा है...' : 'Initializing Tesseract.js OCR engine...'
        );
        const worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setScanProgress(Math.max(20, Math.round((m.progress || 0) * 85)));
              setScanStage(t.scanner.scanning);
            }
          },
        });
        const {
          data: { text },
        } = await worker.recognize(inputImg);
        await worker.terminate();

        setScanProgress(92);
        setScanStage(
          lang === 'hi'
            ? 'Levenshtein फज़ी मैचिंग से दवा खोजी जा रही है...'
            : 'Running Levenshtein fuzzy match against medicine catalog...'
        );

        const cleanText = text.trim();
        if (!cleanText) {
          setScanError(
            lang === 'hi'
              ? 'फोटो से स्पष्ट टेक्स्ट नहीं पढ़ा जा सका। कॉन्ट्रास्ट बढ़ाएं या AI विज़न OCR आज़माएं।'
              : 'Could not extract readable text from this image. Try adjusting contrast or switching to AI Vision OCR.'
          );
          return;
        }

        const resp = await fetch('/api/ocr/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Failed to match medicine');
        }
        setOcrResult(data as OcrMatchResponse);
        setScanProgress(100);
      } else {
        setScanStage(t.scanner.aiScanning);
        setScanProgress(45);
        const resp = await fetch('/api/ocr/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: originalImage,
            mimeType: 'image/png',
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'AI Vision analysis failed');
        }
        setAiResult(data as AiVisionAnalysis);
        setScanProgress(100);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const buildSpeakableMedicineSummary = (med: Medicine) => {
    const savingsPct = Math.round(
      ((med.brandedPriceINR - med.genericPriceINR) / med.brandedPriceINR) * 100
    );
    if (lang === 'hi') {
      return `${med.brandName}। सक्रिय तत्व: ${med.salts
        .map((s) => `${s.name} ${s.strength}`)
        .join(', ')}। उपयोग: ${med.summary.hi} कैसे लें: ${med.howToTake.hi} ब्रांडेड कीमत ${
        med.brandedPriceINR
      } रुपये है, जबकि जन औषधि जेनेरिक लगभग ${med.genericPriceINR} रुपये में उपलब्ध है, जिससे लगभग ${savingsPct} प्रतिशत की बचत हो सकती है।`;
    }
    return `${med.brandName}. Active ingredients: ${med.salts
      .map((s) => `${s.name} ${s.strength}`)
      .join(', ')}. ${med.summary.en} How to take: ${med.howToTake.en} Branded price is ${
      med.brandedPriceINR
    } rupees, while Jan Aushadhi generic is approximately ${med.genericPriceINR} rupees, saving about ${savingsPct} percent.`;
  };

  const topMedicine =
    ocrResult?.matches[0]?.medicine ?? aiResult?.matchedMedicine ?? null;
  const detectedExpiry = ocrResult?.detectedExpiry ?? aiResult?.expiryDate ?? undefined;

  return (
    <section className="space-y-8">
      {/* Header row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-[#DCE5D8] pb-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#15803D]">{t.hero.kicker}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#122119]">
            {t.scanner.title}
          </h1>
          <p className="text-sm sm:text-base text-[#4A5D52] leading-relaxed">
            {t.scanner.subtitle}
          </p>
        </div>

        {/* Engine Segmented Control */}
        <div
          className="inline-flex p-1 bg-[#F2F6EE] border border-[#DCE5D8] rounded-lg self-start shrink-0"
          role="group"
          aria-label="OCR Engine"
        >
          <button
            type="button"
            onClick={() => setEngine('tesseract')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              engine === 'tesseract'
                ? 'bg-[#15803D] text-white'
                : 'text-[#3F5147] hover:text-[#122119]'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            {t.scanner.engineTesseract}
          </button>
          <button
            type="button"
            onClick={() => setEngine('gemini')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              engine === 'gemini'
                ? 'bg-[#FACC15] text-[#122119]'
                : 'text-[#3F5147] hover:text-[#122119]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t.scanner.engineGemini}
          </button>
        </div>
      </div>

      {/* Main 2-column Scanner Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Capture & Preprocessing Panel */}
        <div className="lg:col-span-6 bg-white border border-[#DCE5D8] rounded-xl p-6 space-y-6">
          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
            >
              <Upload className="w-4 h-4" />
              {t.scanner.uploadPhoto}
            </button>
            <button
              type="button"
              onClick={cameraOpen ? stopCamera : openCamera}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-[#D4DFD0] bg-[#FEFCE8] text-[#122119] hover:bg-[#FEF9C3] transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
            >
              <Camera className="w-4 h-4 text-[#15803D]" />
              {cameraOpen ? t.scanner.closeCamera : t.scanner.useCamera}
            </button>
            {originalImage && (
              <button
                type="button"
                onClick={() => {
                  setOriginalImage(null);
                  setProcessedImage(null);
                  setOcrResult(null);
                  setAiResult(null);
                  setScanError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 ml-auto whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                {lang === 'hi' ? 'साफ़ करें' : 'Clear'}
              </button>
            )}
          </div>

          {cameraError && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              {cameraError}
            </p>
          )}

          {/* Live Camera Viewport */}
          {cameraOpen && (
            <div className="space-y-3 border border-slate-200 rounded-lg overflow-hidden bg-slate-950 p-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover rounded-md bg-black"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white whitespace-nowrap shrink-0"
                >
                  {t.scanner.closeCamera}
                </button>
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="px-4 py-2 text-xs font-bold rounded-md bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] whitespace-nowrap shrink-0"
                >
                  {t.scanner.capturePhoto}
                </button>
              </div>
            </div>
          )}

          {/* Dropzone or Dual Preview */}
          {!originalImage && !cameraOpen ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileChange(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#C7D6C2] hover:border-[#15803D] rounded-xl p-10 text-center cursor-pointer transition-colors bg-[#F7FAF5]"
            >
              <FileImage className="w-10 h-10 text-[#15803D]/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#122119]">{t.scanner.emptyDropTitle}</p>
              <p className="text-xs text-[#5A6E63] mt-1">{t.scanner.emptyDropHint}</p>
            </div>
          ) : (
            originalImage && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#5A6E63]">{t.scanner.originalPreview}</p>
                    <div className="aspect-[16/9] bg-[#F4F7F2] border border-[#DCE5D8] rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={originalImage}
                        alt="Original medicine strip"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[#5A6E63]">{t.scanner.processedPreview}</p>
                    <div className="aspect-[16/9] bg-[#F4F7F2] border border-[#DCE5D8] rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={processedImage || originalImage}
                        alt="Preprocessed medicine strip for OCR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Preprocessing controls */}
                <div className="pt-4 border-t border-[#DCE5D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="inline-flex items-center gap-2.5 text-sm font-medium text-[#24382C] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grayscale}
                      onChange={(e) => setGrayscale(e.target.checked)}
                      className="w-4 h-4 accent-[#15803D] rounded"
                    />
                    {t.scanner.grayscaleContrast}
                  </label>
                  <div className="flex items-center gap-3 text-xs text-[#4A5D52]">
                    <span className="whitespace-nowrap">{t.scanner.contrastLevel}</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-28 accent-[#15803D]"
                    />
                    <span className="font-mono tabular-nums w-8 text-right">+{contrast}</span>
                  </div>
                </div>

                {/* Primary Scan Action */}
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={runScan}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] disabled:opacity-60 transition-colors min-h-[46px]"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {scanStage} ({scanProgress}%)
                      </span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      <span>{t.scanner.runScan}</span>
                    </>
                  )}
                </button>

                {isScanning && (
                  <div className="w-full h-1.5 bg-[#ECF3E8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#15803D] transition-all duration-200"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )
          )}

          {/* Built-in Sample Strips */}
          <div className="pt-4 border-t border-[#DCE5D8] space-y-2.5">
            <p className="text-xs font-medium text-[#5A6E63]">{t.scanner.sampleStripsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_STRIPS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectSample(preset)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-[#DCE5D8] bg-[#FEFCE8] hover:bg-[#FEF9C3] hover:border-[#EAB308] text-[#122119] transition-colors whitespace-nowrap shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Identification Result Panel */}
        <div className="lg:col-span-6 bg-white border border-[#DCE5D8] rounded-xl p-6 space-y-6">
          {scanError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{scanError}</span>
            </div>
          )}

          {!ocrResult && !aiResult && !isScanning && !scanError && (
            <div className="py-12 text-center space-y-3">
              <ScanLine className="w-9 h-9 text-slate-300 mx-auto" />
              <h2 className="text-base font-semibold text-slate-900">
                {lang === 'hi' ? 'परिणाम यहाँ दिखाई देगा' : 'Identification results appear here'}
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                {lang === 'hi'
                  ? 'बाईं ओर से कोई सैंपल दवा स्ट्रिप चुनें या अपनी दवा की फोटो अपलोड कर "दवा पहचानें" पर क्लिक करें।'
                  : 'Select a sample medicine strip on the left or upload your own strip photo, then click Identify Medicine to run OCR and fuzzy matching.'}
              </p>
            </div>
          )}

          {isScanning && (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#15803D] animate-spin mx-auto" />
              <p className="text-sm font-medium text-[#122119]">{scanStage}</p>
              <p className="text-xs font-mono tabular-nums text-[#5A6E63]">{scanProgress}%</p>
            </div>
          )}

          {/* Top Matched Medicine from Local Database */}
          {topMedicine && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A6E63]">
                    <span className="inline-flex items-center gap-1 text-[#15803D] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t.scanner.matchConfidence}:{' '}
                      <span className="font-mono tabular-nums">
                        {ocrResult?.matches[0]?.score ?? aiResult?.matchScore}%
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{topMedicine.category[lang]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{topMedicine.schedule}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#122119]">{topMedicine.brandName}</h2>
                  <p className="text-sm text-[#4A5D52]">
                    {topMedicine.manufacturer} · {topMedicine.packSize[lang]}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSpeak(buildSpeakableMedicineSummary(topMedicine))}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#15803D] text-[#15803D] hover:bg-[#F2F8F1] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <Volume2 className="w-4 h-4" />
                  {t.scanner.listenResult}
                </button>
              </div>

              {/* Active Salts */}
              <div className="pt-4 border-t border-[#DCE5D8] space-y-1.5">
                <p className="text-xs font-medium text-[#5A6E63]">{t.medicines.sameSaltTitle}</p>
                <p className="text-sm font-semibold text-[#122119]">
                  {topMedicine.salts.map((s) => `${s.name} (${s.strength})`).join(' + ')}
                </p>
                {detectedExpiry && (
                  <p className="text-xs text-[#4A5D52] pt-1">
                    {t.scanner.detectedExpiry}:{' '}
                    <span className="font-mono tabular-nums font-semibold text-[#122119]">
                      {detectedExpiry}
                    </span>
                  </p>
                )}
              </div>

              {/* Simplified Explanation */}
              <div className="space-y-2">
                <p className="text-sm text-[#1F3127] leading-relaxed">
                  {topMedicine.summary[lang]}
                </p>
                <p className="text-xs text-[#4A5D52] leading-relaxed">
                  <span className="font-semibold text-[#122119]">
                    {t.medicines.howToTakeTitle}:{' '}
                  </span>
                  {topMedicine.howToTake[lang]}
                </p>
              </div>

              {/* Generic vs Branded Price Strip */}
              <div className="grid grid-cols-3 divide-x divide-[#DCE5D8] border border-[#DCE5D8] rounded-lg overflow-hidden bg-[#F7FAF5]">
                <div className="p-3.5">
                  <p className="text-xs text-[#5A6E63]">{t.medicines.brandedPrice}</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-[#122119] mt-0.5">
                    ₹{topMedicine.brandedPriceINR.toFixed(2)}
                  </p>
                </div>
                <div className="p-3.5 bg-[#ECFDF3]">
                  <p className="text-xs font-medium text-[#15803D]">{t.medicines.genericPrice}</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-[#15803D] mt-0.5">
                    ₹{topMedicine.genericPriceINR.toFixed(2)}
                  </p>
                </div>
                <div className="p-3.5 bg-[#FEFCE8]">
                  <p className="text-xs font-medium text-[#854D0E]">{t.medicines.youSave}</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-[#854D0E] mt-0.5">
                    {Math.round(
                      ((topMedicine.brandedPriceINR - topMedicine.genericPriceINR) /
                        topMedicine.brandedPriceINR) *
                        100
                    )}
                    %
                  </p>
                </div>
              </div>

              {/* Next Actions */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenMedicine(topMedicine)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
                >
                  {t.scanner.openDetails}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onAddToCabinet(topMedicine, detectedExpiry)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] transition-colors whitespace-nowrap shrink-0"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  {t.scanner.addToCabinet}
                </button>
                <button
                  type="button"
                  onClick={() => onAddToInteractionCheck(topMedicine)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg border border-[#DCE5D8] bg-white text-[#122119] hover:bg-[#F7FAF5] transition-colors whitespace-nowrap shrink-0"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#854D0E]" />
                  {t.scanner.checkSafety}
                </button>
              </div>
            </div>
          )}

          {/* AI Vision Summary when medicine is NOT in our local catalog */}
          {aiResult && !topMedicine && aiResult.aiSummary && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#15803D]">AI Vision Identification</p>
                  <h2 className="text-xl font-bold text-[#122119] mt-0.5">
                    {aiResult.detectedName} {aiResult.strength}
                  </h2>
                  <p className="text-sm text-[#4A5D52] mt-0.5">{aiResult.saltsText}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSpeak(
                      `${aiResult.detectedName}. ${aiResult.aiSummary?.summary[lang] ?? ''} ${
                        aiResult.aiSummary?.howToTake[lang] ?? ''
                      }`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#15803D] text-[#15803D] hover:bg-[#F2F8F1] whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                  {t.scanner.listenResult}
                </button>
              </div>
              <p className="text-sm text-[#1F3127] leading-relaxed">
                {aiResult.aiSummary.summary[lang]}
              </p>
              <div className="pt-3 border-t border-[#DCE5D8] space-y-2 text-sm text-[#3F5147]">
                <p>
                  <span className="font-semibold text-[#122119]">
                    {t.medicines.howToTakeTitle}:{' '}
                  </span>
                  {aiResult.aiSummary.howToTake[lang]}
                </p>
                <p className="text-xs text-[#15803D] font-medium">
                  {aiResult.aiSummary.estimatedGenericSavingNote[lang]}
                </p>
              </div>
            </div>
          )}

          {/* No Match Fallback */}
          {ocrResult && ocrResult.matches.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-4">
                {t.scanner.noMatch}
              </p>
            </div>
          )}

          {/* Secondary Fuzzy Candidates & Raw OCR Text */}
          {ocrResult && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              {ocrResult.matches.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    {lang === 'hi' ? 'अन्य संभावित मिलान' : 'Other fuzzy match candidates'}
                  </p>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {ocrResult.matches.slice(1, 4).map((cand) => (
                      <button
                        key={cand.medicine.id}
                        type="button"
                        onClick={() => onOpenMedicine(cand.medicine)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <span className="text-sm font-semibold text-slate-900">
                            {cand.medicine.brandName}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            {cand.medicine.salts.map((s) => s.name).join(' + ')}
                          </span>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          {cand.score}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500">{t.scanner.extractedRaw}</p>
                <pre className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {ocrResult.extractedText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
