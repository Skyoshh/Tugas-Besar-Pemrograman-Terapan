
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Language } from '../types';

const Header: React.FC = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const getFlag = (lang: Language | null) => {
    if (lang === Language.ENGLISH) return '🇬🇧';
    if (lang === Language.MANDARIN) return '🇨🇳';
    return '🏳️';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <NavLink to="/" className="flex items-center space-x-2 text-2xl font-extrabold text-green-600">
              <span>🐼</span>
              <h1>Bahasa Buddy</h1>
            </NavLink>
             <div className="hidden md:flex items-center space-x-4 pl-4">
              <NavLink to="/dashboard" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>Belajar</NavLink>
              <NavLink to="/profile" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>Profil</NavLink>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
          {user && user.learning_language && (
             <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-1 text-orange-500 font-bold">
                 <span>🔥</span>
                 <span>{user.daily_streak}</span>
               </div>
               <div className="flex items-center space-x-1 text-blue-500 font-bold">
                 <span>💎</span>
                 <span>{user.total_xp} XP</span>
               </div>
                <div className="flex items-center space-x-2">
                 <span>{getFlag(user.learning_language)}</span>
               </div>
               {}
             </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;