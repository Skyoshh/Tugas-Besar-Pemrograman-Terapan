import React from 'react';
import { MASCOT_SVG } from '../constants';

const HomePage: React.FC = () => {
  const handleStart = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 text-center px-4">
      <div className="max-w-2xl">
        <div className="w-48 h-48 mx-auto mb-8" dangerouslySetInnerHTML={{ __html: MASCOT_SVG }} />
        
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800">
          Bahasa Buddy
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600">
          Belajar bahasa Inggris dengan cara yang menyenangkan
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105"
          >
            Mulai Belajar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
