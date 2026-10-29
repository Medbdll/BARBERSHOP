import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { type = 'text', className = '', hasError = false, disabled = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={`border ${
        hasError
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
      } rounded-md shadow-sm px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 transition duration-150 ease-in-out w-full disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
});

export default Input;

