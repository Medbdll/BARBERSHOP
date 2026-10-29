import React from 'react';

export default function ActionMessage({ message, type = 'success', className = '' }) {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={`p-3.5 rounded-md text-sm font-medium border ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        <span>{isSuccess ? '✓' : 'ℹ'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

