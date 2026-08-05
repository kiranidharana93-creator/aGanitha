import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-800 p-4">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700">
          CBSE Maths Portal
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Loading portal...
        </p>
      </div>
    </div>
  );
}
