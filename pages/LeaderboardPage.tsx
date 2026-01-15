
import React, { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { databaseService } from '../services/database';
import { DBUser, Language } from '../types';
import { TrophyIcon } from '../components/icons';
import { UKFlag, ChinaFlag } from '../components/Flags';
import { Navigate } from 'react-router-dom';

const LeaderboardPage: React.FC = () => {
  const { user } = useUser();
  const [leaderboard, setLeaderboard] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await databaseService.getLeaderboard(50);
        setLeaderboard(data);
      } catch (error) {
        console.error("Gagal memuat papan peringkat", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (!user) return <Navigate to="/auth" />;
  if (!user.learning_language) return <Navigate to="/select-language" />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-200">
                <TrophyIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-800">Papan Peringkat</h1>
            <p className="text-gray-600 mt-2">Lihat siapa yang paling rajin belajar minggu ini!</p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-2xl shadow-sm border border-gray-100"></div>
             ))}
          </div>
        ) : (
          <div className="space-y-3">
             {leaderboard.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.id === user.id;
                
                let rankStyle = "bg-white text-gray-500 font-bold text-lg";
                let borderStyle = "border-gray-100";
                
                if (rank === 1) {
                    rankStyle = "bg-yellow-100 text-yellow-700 font-extrabold text-xl";
                    borderStyle = "border-yellow-300 ring-2 ring-yellow-100";
                } else if (rank === 2) {
                    rankStyle = "bg-gray-100 text-gray-700 font-extrabold text-xl";
                    borderStyle = "border-gray-300 ring-2 ring-gray-100";
                } else if (rank === 3) {
                    rankStyle = "bg-orange-100 text-orange-800 font-extrabold text-xl";
                    borderStyle = "border-orange-300 ring-2 ring-orange-100";
                }

                if (isCurrentUser) {
                    borderStyle += " !border-green-500 !ring-2 !ring-green-100 bg-green-50";
                }

                return (
                    <div 
                        key={player.id} 
                        className={`flex items-center p-4 rounded-2xl shadow-sm border-2 transition-transform hover:scale-[1.01] ${borderStyle} ${isCurrentUser ? 'bg-green-50' : 'bg-white'}`}
                    >
                        <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full mr-4 ${rankStyle}`}>
                            {rank}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 border border-blue-200">
                                    {player.nama_lengkap.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className={`truncate font-bold ${isCurrentUser ? 'text-green-800' : 'text-gray-800'}`}>
                                        {player.nama_lengkap} {isCurrentUser && '(Anda)'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            🔥 {player.daily_streak} Hari
                                        </span>
                                        {player.learning_language && (
                                            <span className="opacity-70 px-1.5 py-0.5 bg-gray-100 rounded flex items-center gap-1">
                                                {player.learning_language === Language.ENGLISH ? <UKFlag className="w-3.5 h-2.5 rounded-[1px] object-cover" /> : <ChinaFlag className="w-3.5 h-2.5 rounded-[1px] object-cover" />}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-right pl-4">
                            <span className="block text-xl font-extrabold text-green-600">{player.total_xp}</span>
                            <span className="text-xs font-bold text-gray-400">XP</span>
                        </div>
                    </div>
                );
             })}

             <div className="text-center py-6 text-gray-400 text-sm">
                 Menampilkan 50 pembelajar teratas
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
