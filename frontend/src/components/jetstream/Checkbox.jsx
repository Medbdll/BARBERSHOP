import React from 'react';

export default function Checkbox({ className = '', id, checked, onChange, disabled = false, ...props }) {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={`rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600 transition ${className}`}
      {...props}
    />
  );
}

