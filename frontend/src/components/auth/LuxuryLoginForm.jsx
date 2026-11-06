import React, { useState } from 'react';
import LuxuryInput from './LuxuryInput';
import GoogleAuthButton from './GoogleAuthButton';
import { MailIcon, LockIcon } from './AuthIcons';
import { useAuth } from '../../context/useAuth';

export default function LuxuryLoginForm({
  onSwitchToRegister,
  onSwitchToForgotPassword,
  onSuccess,
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          <span>Connexion VIP</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Espace Client
          </span>
        </h2>
        <p className="mt-1.5 text-sm text-gray-400">
          Entrez vos identifiants pour gérer vos rituels et réservations.
        </p>
      </div>

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
      <GoogleAuthButton text="Continuer avec Google" />

      {/* Luxury Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-gray-800"></div>
        <span className="absolute px-3 bg-[#111827] text-xs font-medium uppercase tracking-wider text-gray-500">
          ou avec votre email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <LuxuryInput
          id="login_email"
          label="Adresse e-mail"
          type="email"
          icon={MailIcon}
          required
          autoComplete="email"
          placeholder="votre.email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <LuxuryInput
          id="login_password"
          label="Mot de passe"
          type="password"
          icon={LockIcon}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
            <span className="text-gray-300">Se souvenir de moi</span>
          </label>

          {onSwitchToForgotPassword && (
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="font-medium text-amber-500 hover:text-amber-400 hover:underline transition-colors cursor-pointer"
            >
              Mot de passe oublié ?
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
              <span>Connexion en cours...</span>
            </>
          ) : (
            <>
              <span>Se connecter</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Register link */}
      {onSwitchToRegister && (
        <div className="pt-2 text-center text-xs text-gray-400">
          Nouveau parmi nos clients ?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition-colors"
          >
            Créer un compte client
          </button>
        </div>
      )}
    </div>
  );
}

