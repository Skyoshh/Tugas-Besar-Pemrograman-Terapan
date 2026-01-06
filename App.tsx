import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { UserProvider } from './context/UserContext';

import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import Header from './components/Header';

const AppContent: React.FC = () => {
    const location = useLocation();
    const noHeaderPaths = ['/', '/auth'];
    const showHeader = !noHeaderPaths.includes(location.pathname) && !location.pathname.startsWith('/lesson/');

    return (
        <>
            {showHeader && <Header />}
            <main>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
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
