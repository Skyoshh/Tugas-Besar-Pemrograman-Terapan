
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { DBUser, Language } from '../types';
import { databaseService } from '../services/database';

interface UserContextType {
  user: DBUser | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  selectLanguage: (language: Language) => Promise<void>;
  completeLesson: (lessonId: string, xp: number, score: number) => Promise<void>;
  resetProgress: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DBUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initSession = async () => {
      await databaseService.init(); 
      const email = window.localStorage.getItem('userEmail');
      if (email) {
        const dbUser = await databaseService.getUserByEmail(email);
        if (dbUser) setUser(dbUser);
      }
      setIsLoading(false);
    };
    initSession();
  }, []);

  const clearError = () => setError(null);

  const refreshUser = async () => {
    if (user?.email) {
      const updated = await databaseService.getUserByEmail(user.email);
      if (updated) setUser(updated);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const dbUser = await databaseService.loginUser(email, password);
      setUser(dbUser);
      window.localStorage.setItem('userEmail', email);
      setIsLoading(false);
      return true;
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Gagal masuk");
      setIsLoading(false);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
        const dbUser = await databaseService.registerUser(name, email, password);
        setUser(dbUser);
        window.localStorage.setItem('userEmail', email);
        setIsLoading(false);
        return true;
    } catch (e: any) {
        console.error(e);
        setError(e.message || "Gagal mendaftar");
        setIsLoading(false);
        return false;
    }
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem('userEmail');
  };

  const selectLanguage = async (language: Language) => {
    if (user && user.id) {
        await databaseService.updateUserLanguage(user.id, language);
        await refreshUser();
    }
  };
  
  const resetProgress = async () => {
    if(user && user.id && user.learning_language) {
        await databaseService.resetUserProgress(user.id, user.learning_language);
        await refreshUser();
    }
  };

  const completeLesson = async (lessonId: string, xp: number, score: number) => {
    if (!user || !user.id) return;
    await databaseService.saveLessonProgress(user.id, lessonId, score);
    await databaseService.updateUserStats(user.id, xp);
    await refreshUser();
  };

  return (
    <UserContext.Provider value={{ user, isLoading, error, refreshUser, selectLanguage, completeLesson, resetProgress, login, register, logout, clearError }}>
      {children}
    </UserContext.Provider>
  );
};