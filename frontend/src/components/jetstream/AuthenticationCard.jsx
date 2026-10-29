import React from 'react';

export default function AuthenticationCard({ logo, children }) {
  return (
    <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
      <div className="mb-2">
        {logo}
      </div>

      <div className="w-full sm:max-w-md mt-6 px-6 py-6 bg-white shadow-md overflow-hidden sm:rounded-lg border border-gray-200/80">
        {children}
      </div>
    </div>
  );
}

