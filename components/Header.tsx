
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Language } from '../types';
import { TrophyIcon } from './icons';
import { UKFlag, ChinaFlag } from './Flags';

const Header: React.FC = () => {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const getFlag = (lang: Language | null) => {
    if (lang === Language.ENGLISH) return <UKFlag className="w-6 h-4 rounded-sm shadow-sm object-cover" />;
    if (lang === Language.MANDARIN) return <ChinaFlag className="w-6 h-4 rounded-sm shadow-sm object-cover" />;
    return <span className="text-lg">🏳️</span>;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const logoLink = user?.role === 'admin' ? '/admin' : '/';
  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <NavLink to={logoLink} className="flex items-center space-x-2 text-2xl font-extrabold text-green-600">
              <span>🐼</span>
              <h1>Bahasa Buddy</h1>
            </NavLink>
             <div className="hidden md:flex items-center space-x-4 pl-4">
              
              

              {!isAdmin && (
                <>
                    <NavLink to="/dashboard" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                        Belajar
                    </NavLink>
                    <NavLink to="/leaderboard" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <TrophyIcon className="w-4 h-4" />
                        Peringkat
                    </NavLink>
                </>
              )}
              
              <NavLink to="/profile" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {isAdmin ? 'Akun Admin' : 'Profil'}
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-bold border border-gray-200 ${isActive ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                    Admin Panel
                </NavLink>
              )}
              
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
          
          
          {user && user.learning_language && !isAdmin && (
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
                 {getFlag(user.learning_language)}
               </div>
             </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
