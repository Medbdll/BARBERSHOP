import React from 'react';

export default function ValidationErrors({ errors, className = '' }) {
  if (!errors) return null;

  // Flatten errors whether string, array, or Laravel validation object { field: [msg] }
  let errorList = [];
  if (typeof errors === 'string') {
    errorList = [errors];
  } else if (Array.isArray(errors)) {
    errorList = errors;
  } else if (typeof errors === 'object') {
    Object.values(errors).forEach((item) => {
      if (Array.isArray(item)) {
        errorList.push(...item);
      } else if (typeof item === 'string') {
        errorList.push(item);
      }
    });
  }

  if (errorList.length === 0) return null;

  return (
    <div className={`p-4 rounded-md bg-red-50 border border-red-200 ${className}`}>
      <div className="font-semibold text-sm text-red-600">
        Whoops! Something went wrong.
      </div>

      <ul className="mt-2 list-disc list-inside text-xs text-red-600 space-y-1">
        {errorList.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

