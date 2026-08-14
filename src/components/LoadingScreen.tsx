import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-[#16449B] p-4">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-[#16449B] border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#16449B]">
          CBSE Maths Portal
        </h2>
        <p className="text-sm font-semibold text-[#16449B]/80 mt-2">
          Loading portal...
        </p>
      </div>
    </div>
  );
}
