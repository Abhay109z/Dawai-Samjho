import type { Language } from '../types';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export function speakText(
  text: string,
  lang: Language,
  rate: number = 0.95,
  onStart?: () => void,
  onEnd?: () => void
): boolean {
  if (!isSpeechSupported() || !text.trim()) return false;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const targetLang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  utterance.lang = targetLang;
  utterance.rate = rate;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const exactVoice = voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase());
  const familyVoice = voices.find((v) =>
    v.lang.toLowerCase().startsWith(lang === 'hi' ? 'hi' : 'en')
  );
  if (exactVoice || familyVoice) {
    utterance.voice = exactVoice ?? familyVoice ?? null;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
  return true;
}
