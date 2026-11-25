import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ScanLine,
  ShieldCheck,
  Store,
  User,
  UserRound,
} from 'lucide-react';
import type { AuthUser, Language } from '../types';
import { getText } from '../i18n';

interface AuthViewProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onAuthenticated: (token: string, user: AuthUser) => void;
  canReturn?: boolean;
  onReturn?: () => void;
}

export function AuthView({
  lang,
  onChangeLang,
  onAuthenticated,
  canReturn = false,
  onReturn,
}: AuthViewProps) {
  const t = getText(lang);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (mode === 'register' && trimmedName.length < 2) {
      setError(
        lang === 'hi'
          ? 'कृपया अपना पूरा नाम (कम से कम 2 अक्षर) लिखें।'
          : 'Please enter your full name (at least 2 characters).'
      );
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(
        lang === 'hi' ? 'कृपया सही ईमेल पता दर्ज करें।' : 'Please enter a valid email address.'
      );
      return;
    }

    if (password.length < 8) {
      setError(
        lang === 'hi'
          ? 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।'
          : 'Password must be at least 8 characters long.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? { name: trimmedName, email: trimmedEmail, password }
          : { email: trimmedEmail, password };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok || !data.token || !data.user) {
        throw new Error(
          data.error ||
            (lang === 'hi'
              ? 'साइन इन नहीं हो सका। कृपया जानकारी जांचें।'
              : 'Authentication failed. Please check your details.')
        );
      }
      onAuthenticated(data.token as string, data.user as AuthUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      const resp = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (!resp.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Could not start guest session.');
      }
      onAuthenticated(data.token as string, data.user as AuthUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login unavailable right now.');
    } finally {
      setGuestLoading(false);
    }
  };

  const busy = submitting || guestLoading;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBF7] text-[#122119]">
      {/* Top Bar — Deep Forest Green matching primary app shell */}
      <header className="bg-[#14532D] border-b border-[#166534]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
              {t.brand}
            </span>
            {canReturn && onReturn && (
              <button
                type="button"
                onClick={onReturn}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FEF08A] hover:text-white transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.auth.backToApp}
              </button>
            )}
          </div>

          {/* Bilingual Toggle */}
          <div className="inline-flex p-0.5 bg-[#0F3F22] border border-[#1E6B3C] rounded-md">
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-[#FACC15] text-[#122119]'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('hi')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                lang === 'hi'
                  ? 'bg-[#FACC15] text-[#122119]'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </header>

      {/* Main Auth Grid */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-[1040px] w-full grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#DCE5D8] rounded-2xl overflow-hidden shadow-sm">
          {/* Left Editorial Panel — Deep Forest Green with Warm Yellow Accents */}
          <div className="lg:col-span-5 bg-[#14532D] text-white p-8 sm:p-10 flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-[#FEF08A]">{t.hero.kicker}</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-white">
                {t.hero.title}
              </h1>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                {t.auth.welcomeSubtitle}
              </p>
            </div>

            <div className="space-y-5 border-t border-white/15 pt-6">
              <div className="flex items-start gap-3">
                <ScanLine className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">{t.auth.feature1Title}</p>
                  <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                    {t.auth.feature1Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">{t.auth.feature2Title}</p>
                  <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                    {t.auth.feature2Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#FACC15] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">{t.auth.feature3Title}</p>
                  <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                    {t.auth.feature3Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 p-8 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE5D8] pb-5">
              <div>
                <h2 className="text-xl font-bold text-[#122119]">{t.auth.welcomeTitle}</h2>
              </div>

              {/* Mode Switcher */}
              <div
                className="inline-flex p-1 bg-[#F2F6EE] border border-[#DCE5D8] rounded-lg self-start shrink-0"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  {t.auth.signInTab}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-[#15803D] text-white'
                      : 'text-[#3F5147] hover:text-[#122119]'
                  }`}
                >
                  {t.auth.registerTab}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-name"
                    className="text-xs font-semibold text-[#24382C] block"
                  >
                    {t.auth.nameLabel}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#5A6E63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email"
                  className="text-xs font-semibold text-[#24382C] block"
                >
                  {t.auth.emailLabel}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#5A6E63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-password"
                  className="text-xs font-semibold text-[#24382C] block"
                >
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5A6E63] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-[#CED9C9] rounded-lg focus:border-[#15803D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6E63] hover:text-[#122119] p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold rounded-lg bg-[#15803D] text-white hover:bg-[#166534] disabled:opacity-60 transition-colors min-h-[46px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {mode === 'register' ? t.auth.creatingAccount : t.auth.signingIn}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'register' ? t.auth.createAccountBtn : t.auth.signInBtn}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#DCE5D8]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium text-[#5A6E63]">
                  {t.auth.orDivider}
                </span>
              </div>
            </div>

            {/* Guest Login Section */}
            <div className="bg-[#FEFCE8] border border-[#E7E2B8] rounded-xl p-4 space-y-3">
              <button
                type="button"
                disabled={busy}
                onClick={handleGuestLogin}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold rounded-lg bg-[#FACC15] text-[#122119] hover:bg-[#EAB308] disabled:opacity-60 transition-colors min-h-[46px]"
              >
                {guestLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.auth.guestLoading}</span>
                  </>
                ) : (
                  <>
                    <UserRound className="w-4 h-4" />
                    <span>{t.auth.guestBtn}</span>
                  </>
                )}
              </button>
              <p className="text-xs text-[#4A5D52] leading-relaxed">{t.auth.guestHint}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#DCE5D8] bg-white">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-[#4A5D52] leading-relaxed">{t.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
