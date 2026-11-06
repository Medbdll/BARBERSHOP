import React, { useState } from 'react';
import LuxuryInput from './LuxuryInput';
import GoogleAuthButton from './GoogleAuthButton';
import { UserIcon, MailIcon, PhoneIcon, LockIcon } from './AuthIcons';
import { useAuth } from '../../context/useAuth';

export default function LuxuryRegisterForm({ onSwitchToLogin, onSuccess }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [terms, setTerms] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!terms) {
      setErrors(['Veuillez accepter les conditions générales du salon.']);
      return;
    }

    if (password !== passwordConfirmation) {
      setErrors(['Les mots de passe ne correspondent pas.']);
      return;
    }

    setProcessing(true);
    setErrors(null);

    try {
      const res = await register({
        name,
        email,
        phone,
        password,
        password_confirmation: passwordConfirmation,
      });
      if (onSuccess) {
        onSuccess(res.user);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      if (err.response?.data?.errors) {
        const errorMsgs = [];
        Object.values(err.response.data.errors).forEach((item) => {
          if (Array.isArray(item)) errorMsgs.push(...item);
          else if (typeof item === 'string') errorMsgs.push(item);
        });
        setErrors(errorMsgs);
      } else if (err.response?.data?.message) {
        setErrors([err.response.data.message]);
      } else {
        setErrors(['Une erreur est survenue lors de l’inscription.']);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>Inscription Client</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Nouveau Membre
          </span>
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Renseignez vos coordonnées pour des réservations prioritaires et rappels SMS.
        </p>
      </div>

      {/* Errors alert */}
      {errors && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-1">
          <div className="font-semibold text-red-400 flex items-center gap-1.5">
            <span>⚠️</span> Erreur lors de l’inscription
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-red-300">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Google OAuth Button */}
      <GoogleAuthButton text="S’inscrire avec Google" />

      {/* Luxury Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-gray-800"></div>
        <span className="absolute px-3 bg-[#111827] text-xs font-medium uppercase tracking-wider text-gray-500">
          ou avec vos coordonnées
        </span>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <LuxuryInput
          id="reg_name"
          label="Nom complet"
          type="text"
          icon={UserIcon}
          required
          autoComplete="name"
          placeholder="ex. Alexandre Dubois"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <LuxuryInput
          id="reg_email"
          label="Adresse e-mail"
          type="email"
          icon={MailIcon}
          required
          autoComplete="email"
          placeholder="votre.email@domaine.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <LuxuryInput
          id="reg_phone"
          label="Numéro de téléphone"
          type="tel"
          icon={PhoneIcon}
          badge="Rappels SMS"
          placeholder="+33 6 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LuxuryInput
            id="reg_password"
            label="Mot de passe"
            type="password"
            icon={LockIcon}
            required
            autoComplete="new-password"
            placeholder="Min. 8 car."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <LuxuryInput
            id="reg_password_confirmation"
            label="Confirmation"
            type="password"
            icon={LockIcon}
            required
            autoComplete="new-password"
            placeholder="Répétez"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
        </div>

        {/* Terms and conditions */}
        <div className="pt-1">
          <label htmlFor="reg_terms" className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              id="reg_terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 rounded bg-gray-950/80 border-gray-700 text-amber-600 focus:ring-amber-500/30 w-4 h-4 accent-amber-600 cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-gray-400 leading-snug">
              J'accepte les{' '}
              <span className="text-amber-400 underline hover:text-amber-300">
                conditions générales de service
              </span>{' '}
              et la réception des confirmations de rendez-vous par SMS.
            </span>
          </label>
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
              <span>Création du compte...</span>
            </>
          ) : (
            <>
              <span>Créer mon compte client</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Login link */}
      {onSwitchToLogin && (
        <div className="pt-1 text-center text-xs text-gray-400">
          Vous possédez déjà un compte ?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer transition-colors"
          >
            Se connecter
          </button>
        </div>
      )}
    </div>
  );
}

