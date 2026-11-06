import React, { useState } from 'react';
import LuxuryInput from './LuxuryInput';
import { MailIcon } from './AuthIcons';
import { forgotPassword } from '../../api/barberApi';

export default function LuxuryForgotPasswordForm({ onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    setStatus(null);

    try {
      const res = await forgotPassword({ email });
      setStatus(res.message || 'Un lien de réinitialisation vous a été envoyé par e-mail.');
    } catch (err) {
      console.error('Password reset failed:', err);
      if (err.response?.data?.errors?.email) {
        setError(err.response.data.errors.email[0]);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Impossible d’envoyer le lien. Veuillez vérifier votre adresse e-mail.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Mot de passe oublié</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Sécurité
          </span>
        </h2>
        <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
          Indiquez votre adresse e-mail associée à votre compte. Nous vous enverrons un lien d'accès pour définir un nouveau mot de passe.
        </p>
      </div>

      {status && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
          <span className="text-emerald-400 text-base">✓</span>
          <div className="font-medium">{status}</div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
          <span className="text-red-400">⚠️</span>
          <div className="font-medium">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <LuxuryInput
          id="reset_email"
          label="Adresse e-mail du compte"
          type="email"
          icon={MailIcon}
          required
          autoComplete="email"
          placeholder="votre.email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="submit"
          disabled={processing}
          className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wider text-gray-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {processing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gray-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Envoi du lien...</span>
            </>
          ) : (
            <span>Envoyer le lien de réinitialisation</span>
          )}
        </button>
      </form>

      {onSwitchToLogin && (
        <div className="pt-2 text-center text-xs text-gray-400">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <span>←</span>
            <span>Retour à la connexion</span>
          </button>
        </div>
      )}
    </div>
  );
}

