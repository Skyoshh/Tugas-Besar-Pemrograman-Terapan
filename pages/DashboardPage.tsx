
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

const DashboardPage: React.FC = () => {
  const { user, isLoading } = useUser();

  if (isLoading) return <div className="p-8 text-center">Memuat Pengguna...</div>;
  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-green-50">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Jalur Belajar</h1>
        <p className="text-gray-600 bg-white inline-block px-4 py-1 rounded-full text-sm font-semibold shadow-sm border border-gray-200">
          🇬🇧 Bahasa Inggris
        </p>
      </div>

      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <p className="text-gray-700 text-center">
          Materi :
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-semibold text-gray-800">Materi 1: Pengenalan</span>
            <button className="px-3 py-1 text-sm font-bold rounded-lg bg-gray-200 text-gray-600 cursor-default">
              Lihat
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-semibold text-gray-800">Materi 2: Kosakata Dasar</span>
            <button className="px-3 py-1 text-sm font-bold rounded-lg bg-gray-200 text-gray-600 cursor-default">
              Lihat
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-semibold text-gray-800">Materi 3: Latihan</span>
            <button className="px-3 py-1 text-sm font-bold rounded-lg bg-gray-200 text-gray-600 cursor-default">
              Lihat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
