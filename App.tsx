import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { UserProvider } from './context/UserContext';

import HomePage from './pages/HomePage';
import LanguageSelectionPage from './pages/LanguageSelectionPage';
import DashboardPage from './pages/DashboardPage';
import LessonPage from './pages/LessonPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import Header from './components/Header';

const AppContent: React.FC = () => {
    const location = useLocation();
    const noHeaderPaths = ['/', '/select-language', '/auth'];
    const showHeader = !noHeaderPaths.includes(location.pathname) && !location.pathname.startsWith('/lesson/');

    return (
        <>
            {showHeader && <Header />}
            <main>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/select-language" element={<LanguageSelectionPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/lesson/:lessonId" element={<LessonPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Routes>
            </main>
        </>
    );
};


const App: React.FC = () => {
  return (
    <UserProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </UserProvider>
  );
};

export default App;