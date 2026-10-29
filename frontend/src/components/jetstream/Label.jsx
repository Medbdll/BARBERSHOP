import React from 'react';

export default function Label({ htmlFor, value, children, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block font-medium text-sm text-gray-700 text-left ${className}`}
    >
      {value || children}
    </label>
  );
}

