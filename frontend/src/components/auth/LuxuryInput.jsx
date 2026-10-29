import React, { useState } from 'react';

export default function LuxuryInput({
  id,
  label,
  type = 'text',
  icon: Icon,
  badge,
  hasError = false,
  errorText,
  value,
  onChange,
  required = false,
  placeholder = '',
  autoComplete,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-wider text-gray-300"
        >
          {label} {required && <span className="text-amber-500">*</span>}
        </label>
        {badge && (
          <span className="text-[11px] text-amber-500/90 font-medium tracking-normal">
            {badge}
          </span>
        )}
      </div>

      <div className="relative rounded-xl shadow-inner group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-amber-500 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full bg-gray-950/60 text-gray-100 placeholder-gray-500 text-sm rounded-xl border ${
            hasError
              ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-800 focus:border-amber-500/80 focus:ring-amber-500/25'
          } ${Icon ? 'pl-10' : 'pl-3.5'} ${
            isPassword ? 'pr-11' : 'pr-3.5'
          } py-3 focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-amber-400 focus:outline-none transition-colors cursor-pointer"
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {hasError && errorText && (
        <p className="text-xs text-red-400 mt-1 pl-1">{errorText}</p>
      )}
    </div>
  );
}

