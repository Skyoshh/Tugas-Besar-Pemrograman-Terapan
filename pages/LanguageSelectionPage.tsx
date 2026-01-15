
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Language } from '../types';
import { UKFlag, ChinaFlag } from '../components/Flags';

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
          image={<UKFlag className="w-full h-full object-cover" />}
          name="Bahasa Inggris"
          description="Bahasa global untuk komunikasi, bisnis, dan hiburan."
          onClick={() => handleSelect(Language.ENGLISH)}
        />
        <LanguageCard
          image={<ChinaFlag className="w-full h-full object-cover" />}
          name="Bahasa Mandarin"
          description="Bahasa dengan penutur terbanyak dan gerbang menuju budaya timur."
          onClick={() => handleSelect(Language.MANDARIN)}
        />
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
