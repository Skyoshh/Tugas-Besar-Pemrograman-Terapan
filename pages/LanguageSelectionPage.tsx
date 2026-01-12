
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Language } from '../types';

const UKFlag = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-full h-full object-cover">
        <clipPath id="uk-a"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
        <clipPath id="uk-b"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
        <g clipPath="url(#uk-a)">
            <path d="M0,0 v30 h60 v-30 z" fill="#00247d"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-b)" stroke="#cf142b" strokeWidth="4"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" strokeWidth="6"/>
        </g>
    </svg>
);

const ChinaFlag = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className="w-full h-full object-cover">
        <rect width="900" height="600" fill="#de2910"/>
        <g fill="#ffde00">
            <path transform="translate(150 150) scale(90)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(300 90) scale(30) rotate(23.4)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(360 150) scale(30) rotate(45)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(360 210) scale(30) rotate(66.6)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
            <path transform="translate(300 270) scale(30) rotate(88.2)" d="M0-1 .588.809-.951-.309H.951L-.588.809z"/>
        </g>
    </svg>
);

const LanguageCard: React.FC<{
  image: React.ReactNode;
  name: string;
  description: string;
  onClick: () => void;
}> = ({ image, name, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full max-w-sm p-6 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:border-green-500 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center"
  >
    <div className="w-full h-40 mb-4 rounded-xl overflow-hidden border">
      {image}
    </div>
    <h3 className="text-2xl font-bold text-gray-800 mb-2">{name}</h3>
    <p className="text-gray-600">{description}</p>
  </button>
);

const LanguageSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectLanguage } = useUser();

  const handleSelect = async (language: Language) => {
    await selectLanguage(language);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-800">Pilih Bahasa yang Ingin Kamu Pelajari</h1>
        <p className="mt-2 text-lg text-gray-600">Mulai petualangan belajarmu sekarang!</p>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <LanguageCard
          image={UKFlag}
          name="Bahasa Inggris"
          description="Bahasa global untuk komunikasi, bisnis, dan hiburan."
          onClick={() => handleSelect(Language.ENGLISH)}
        />
        <LanguageCard
          image={ChinaFlag}
          name="Bahasa Mandarin"
          description="Bahasa dengan penutur terbanyak dan gerbang menuju budaya timur."
          onClick={() => handleSelect(Language.MANDARIN)}
        />
      </div>
    </div>
  );
};

export default LanguageSelectionPage;