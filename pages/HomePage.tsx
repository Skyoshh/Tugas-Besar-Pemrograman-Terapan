import React from 'react';
import { Link } from 'react-router-dom';
import { MASCOT_SVG } from '../constants';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 text-center px-4">
      <div className="max-w-2xl">
        <div className="w-48 h-48 mx-auto mb-8" dangerouslySetInnerHTML={{ __html: MASCOT_SVG }} />
        
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800">
          Belajar Bahasa Inggris dan Mandarin dengan Cara Seru!
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600">
          Bergabunglah dengan jutaan pelajar di seluruh dunia dan mulailah petualangan bahasamu bersama Bahasa Buddy.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/auth?mode=register"
            className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-transform transform hover:scale-105"
          >
            Mulai Belajar
          </Link>
          <Link
            to="/auth?mode=login"
            className="w-full sm:w-auto px-8 py-4 bg-white text-green-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 transition-transform transform hover:scale-105 border-2 border-gray-200"
          >
            Saya Sudah Punya Akun
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;