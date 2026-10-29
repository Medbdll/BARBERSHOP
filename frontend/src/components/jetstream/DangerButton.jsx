import React from 'react';

export default function DangerButton({
  type = 'button',
  className = '',
  disabled = false,
  processing = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || processing}
      className={`inline-flex items-center justify-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition ease-in-out duration-150 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

