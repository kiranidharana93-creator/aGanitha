import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-[#0052CC] p-4">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#0052CC] border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#0052CC]">
          CBSE Maths Portal
        </h2>
        <p className="text-sm font-semibold text-[#0052CC]/80 mt-2">
          Loading portal...
        </p>
      </div>
    </div>
  );
}
