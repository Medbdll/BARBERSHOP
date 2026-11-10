import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LuxuryInput from './LuxuryInput';
import GoogleAuthButton from './GoogleAuthButton';
import { MailIcon, LockIcon } from './AuthIcons';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/LanguageContext';

export default function LuxuryLoginForm({
  onSwitchToRegister,
  onSwitchToForgotPassword,
  onSuccess,
}) {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const { t, isRtl } = useLanguage();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sessionExpired) clearSessionExpired();
    setProcessing(true);
    setError(null);

    try {
      const res = await login({ email, password, remember });
      if (onSuccess) {
        onSuccess(res.user);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.errors?.email) {
        setError(err.response.data.errors.email[0]);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Identifiants invalides ou problème de connexion au serveur.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>{t.auth.login.title}</span>
        </h2>
        <p className="mt-1.5 text-sm text-gray-400">
          {t.auth.login.subtitle}
        </p>
      </div>

      {/* Session Expired Notice (30 min inactivity) */}
      {sessionExpired && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5 shadow-lg shadow-amber-950/30 animate-fadeIn">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 font-medium leading-relaxed">
            {t.auth.login.sessionExpired}
          </div>
          <button
            type="button"
            onClick={clearSessionExpired}
            className="text-amber-400/80 hover:text-amber-200 p-0.5 rounded transition-colors text-xs font-bold leading-none cursor-pointer"
            title={t.common.close}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Google OAuth Button */}
      <GoogleAuthButton text={t.auth.login.googleBtn} onError={(msg) => setError(msg)} />

      {/* Luxury Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-gray-800"></div>
        <span className="absolute px-3 bg-[#111827] text-xs font-medium uppercase tracking-wider text-gray-500">
          {t.auth.login.emailLabel}
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <LuxuryInput
          id="login_email"
          label={t.auth.login.emailLabel}
          type="email"
          icon={MailIcon}
          required
          autoComplete="email"
          placeholder={t.auth.login.emailPlaceholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (sessionExpired) clearSessionExpired();
          }}
        />

        <LuxuryInput
          id="login_password"
          label={t.auth.login.passwordLabel}
          type="password"
          icon={LockIcon}
          required
          autoComplete="current-password"
          placeholder={t.auth.login.passwordPlaceholder}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (sessionExpired) clearSessionExpired();
          }}
        />

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label htmlFor="login_remember" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="login_remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded bg-gray-950/80 border-gray-700 text-amber-600 focus:ring-amber-500/30 w-4 h-4 accent-amber-600 cursor-pointer"
            />
            <span className="text-gray-300">{t.auth.login.rememberMe}</span>
          </label>

          {onSwitchToForgotPassword && (
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="font-medium text-amber-500 hover:text-amber-400 hover:underline transition-colors cursor-pointer"
            >
              {t.auth.login.forgotPassword}
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={processing}
          className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {processing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gray-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>{t.auth.login.submittingBtn}</span>
            </>
          ) : (
            <>
              <span>{t.auth.login.submitBtn}</span>
              <span className={`transition-transform duration-200 ${isRtl ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                {isRtl ? '←' : '→'}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Register link */}
      {onSwitchToRegister && (
        <div className="pt-2 text-center text-xs text-gray-400">
          {t.auth.login.noAccount}{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition-colors"
          >
            {t.auth.login.registerLink}
          </button>
        </div>
      )}
    </div>
  );
}

