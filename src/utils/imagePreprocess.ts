/**
 * Applies grayscale luminance conversion and contrast stretching via HTML5 Canvas
 * to improve Tesseract.js OCR readability on medicine strips (Chapter 4.5 methodology).
 */
export async function preprocessMedicineImage(
  sourceDataUrl: string,
  options: { grayscale: boolean; contrast: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Contrast factor formula: [-100..100] mapped to standard adjustment
      const c = options.contrast;
      const factor = (259 * (c + 255)) / (255 * (259 - c));

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        if (options.grayscale) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = lum;
          g = lum;
          b = lum;
        }

        if (c !== 0) {
          r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    img.src = sourceDataUrl;
  });
}

export interface SampleStripPreset {
  id: string;
  label: string;
  brandLine: string;
  saltLine: string;
  companyLine: string;
  batchLine: string;
  expiryLine: string;
  foilTint: string;
  accentColor: string;
}

export const SAMPLE_STRIPS: SampleStripPreset[] = [
  {
    id: 'sample-dolo',
    label: 'Dolo 650 Strip',
    brandLine: 'DOLO-650',
    saltLine: 'Paracetamol Tablets IP 650 mg',
    companyLine: 'MICRO LABS LIMITED',
    batchLine: 'B.No. DL2608A   MRP Rs.33.76 / 15 Tabs',
    expiryLine: 'MFG 04/2026   EXP 03/2029',
    foilTint: '#ECEFF3',
    accentColor: '#1E3A8A',
  },
  {
    id: 'sample-augmentin',
    label: 'Augmentin 625 Duo',
    brandLine: 'AUGMENTIN 625 DUO',
    saltLine: 'Amoxycillin 500mg & Potassium Clavulanate 125mg',
    companyLine: 'GlaxoSmithKline Pharmaceuticals',
    batchLine: 'B.No. AG9914   SCHEDULE H1 DRUG',
    expiryLine: 'MFG 01/2026   EXP 12/2027',
    foilTint: '#F4F3EE',
    accentColor: '#9A3412',
  },
  {
    id: 'sample-pand',
    label: 'Pan-D Capsule Strip',
    brandLine: 'PAN-D CAPSULES',
    saltLine: 'Pantoprazole 40mg & Domperidone 30mg SR',
    companyLine: 'ALKEM LABORATORIES LTD',
    batchLine: 'B.No. PD4412   MRP Rs.214.00 / 15 Caps',
    expiryLine: 'MFG 06/2026   EXP 05/2028',
    foilTint: '#EFF3F2',
    accentColor: '#15803D',
  },
];

/**
 * Generates a realistic, high-contrast synthetic medicine blister strip foil PNG
 * so users on desktop can immediately test real Tesseract.js OCR and fuzzy matching.
 */
export function renderSampleStripImage(preset: SampleStripPreset): string {
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Foil metallic background
  const grad = ctx.createLinearGradient(0, 0, 760, 360);
  grad.addColorStop(0, preset.foilTint);
  grad.addColorStop(0.5, '#FFFFFF');
  grad.addColorStop(1, '#DFE4EA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 760, 360);

  // Subtle foil blister grid embossing
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(18, 18, 724, 324);

  // Top color band typical of Indian blister packs
  ctx.fillStyle = preset.accentColor;
  ctx.fillRect(18, 18, 724, 24);

  // Rx symbol & header
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 22px "Public Sans", Arial, sans-serif';
  ctx.fillText('Rx', 44, 86);

  // Brand name (large high-contrast OCR target)
  ctx.fillStyle = preset.accentColor;
  ctx.font = '800 50px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(preset.brandLine, 92, 102);

  // Salt composition
  ctx.fillStyle = '#0F172A';
  ctx.font = '600 24px Arial, sans-serif';
  ctx.fillText(preset.saltLine, 44, 152);

  // Divider line
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.moveTo(44, 182);
  ctx.lineTo(716, 182);
  ctx.stroke();

  // Manufacturer & batch
  ctx.fillStyle = '#334155';
  ctx.font = '600 20px Arial, sans-serif';
  ctx.fillText(preset.companyLine, 44, 222);

  ctx.fillStyle = '#1E293B';
  ctx.font = '500 21px "IBM Plex Mono", monospace';
  ctx.fillText(preset.batchLine, 44, 266);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 24px "IBM Plex Mono", monospace';
  ctx.fillText(preset.expiryLine, 44, 310);

  return canvas.toDataURL('image/png');
}
