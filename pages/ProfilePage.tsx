
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../hooks/useUser';
import { Language, DBUserProgress } from '../types';
import { Navigate, Link } from 'react-router-dom';
import { databaseService } from '../services/database';
import { UKFlag, ChinaFlag } from '../components/Flags';

const ProfilePage: React.FC = () => {
    const { user, resetProgress, selectLanguage, logout } = useUser();
    const [completedCount, setCompletedCount] = useState(0);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    useEffect(() => {
        if(user && user.id) {
            databaseService.getUserProgress(user.id).then((res) => {
                setCompletedCount(res.length);
            });
        }
    }, [user]);

    if (!user) return <Navigate to="/auth" />;

    if (!user.learning_language) {
        return <Navigate to="/select-language" />;
    }

    const languageName = user.learning_language === Language.ENGLISH ? 'Bahasa Inggris' : 'Bahasa Mandarin';
    const FlagIcon = user.learning_language === Language.ENGLISH ? UKFlag : ChinaFlag;

    const handleConfirmReset = async () => {
        await resetProgress();
        setCompletedCount(0);
        setIsResetModalOpen(false);
    };

    return (
        <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-4 mb-8">
                <div className="w-24 h-24 bg-green-200 rounded-full flex items-center justify-center text-5xl">
                    <span>🐼</span>
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800">{user.nama_lengkap}</h1>
                    <p className="text-gray-500">Member</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border mb-8">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Statistik Belajar</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-3xl font-bold text-blue-600">{user.total_xp}</p>
                        <p className="text-sm text-blue-800 font-semibold">Total XP</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                        <p className="text-3xl font-bold text-orange-600">{user.daily_streak}</p>
                        <p className="text-sm text-orange-800 font-semibold">Streak Hari</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-3xl font-bold text-green-600">{completedCount}</p>
                        <p className="text-sm text-green-800 font-semibold">Pelajaran Selesai</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Pengaturan Kursus</h2>
                 <div className="space-y-4">
                    <p className="font-semibold text-gray-700">Kursus Aktif:</p>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                             <div className="w-8 h-5 rounded overflow-hidden shadow-sm border border-gray-100">
                                <FlagIcon className="w-full h-full object-cover" />
                             </div>
                             <span className="text-lg font-bold text-gray-800">{languageName}</span>
                        </div>
                         <Link to="/select-language" className="text-blue-600 hover:underline font-semibold">Ganti</Link>
                    </div>
                    
                    <p className="font-semibold pt-4 text-gray-700">Pengaturan Akun:</p>
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="w-full text-left px-4 py-3 bg-red-50 text-red-700 font-bold rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Atur Ulang Kemajuan ({languageName})
                    </button>

                    <button
                        onClick={logout}
                        className="w-full text-left px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors mt-4"
                    >
                        Keluar
                    </button>
                 </div>
            </div>
            {isResetModalOpen && createPortal(
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Atur Ulang Kemajuan?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Apakah Anda yakin ingin mengatur ulang kemajuan untuk <span className="font-bold text-gray-800">{languageName}</span>?
                                <br />
                                <span className="text-red-500 text-xs">Tindakan ini tidak dapat diurungkan.</span>
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleConfirmReset}
                                    className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-md transition-colors"
                                >
                                    Ya, Atur Ulang
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ProfilePage;
