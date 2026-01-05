import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';

import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';

const App: React.FC = () => {
  return (
    <UserProvider>
      <HashRouter>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </main>
      </HashRouter>
    </UserProvider>
  );
};

export default App;
