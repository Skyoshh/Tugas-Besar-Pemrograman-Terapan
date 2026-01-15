
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { DBTopic, DBUserProgress, TopicLevel } from '../types';
import { CheckCircleIcon, StarIcon } from '../components/icons';
import { UKFlag, ChinaFlag } from '../components/Flags';
import { databaseService } from '../services/database';
import ProgressBar from '../components/ProgressBar';

const VERTICAL_SPACING = 140; 
const NODE_OFFSET_TOP = 48;   

const LessonNode: React.FC<{ lesson: DBTopic; isCompleted: boolean; isUnlocked: boolean; index: number }> = ({ lesson, isCompleted, isUnlocked, index }) => {
  const getPositionStyle = (i: number) => {
    const cycle = i % 4;
    let left = '50%'; 
    if (cycle === 1) left = '25%'; 
    if (cycle === 3) left = '75%'; 
    
    return { left, top: `${i * VERTICAL_SPACING}px` };
  };

  const style = getPositionStyle(index);

  const content = (
    <div 
      className={`absolute -translate-x-1/2 flex flex-col items-center text-center w-32 transition-all duration-500 z-10`}
      style={style}
    >
        <div className={`relative w-24 h-24 flex items-center justify-center rounded-full border-b-8 active:border-b-0 active:translate-y-2 transition-all duration-200 shadow-lg bg-white
          ${isCompleted ? 'bg-green-500 border-green-700' : ''}
          ${isUnlocked && !isCompleted ? 'bg-green-500 border-green-700 animate-bounce-slow' : ''}
          ${!isUnlocked ? 'bg-gray-200 border-gray-300' : ''}
        `}>
          <div className="text-4xl drop-shadow-md select-none">{lesson.icon}</div>
          
          {isCompleted && (
             <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 border-2 border-white shadow-sm">
                <CheckCircleIcon className="w-6 h-6 text-white" />
             </div>
          )}
        </div>
        
        <div className="mt-3 bg-white/90 backdrop-blur px-3 py-1 rounded-xl shadow-sm border border-gray-100">
           <p className={`font-bold text-sm ${isUnlocked ? 'text-gray-800' : 'text-gray-400'}`}>{lesson.judul_topik}</p>
        </div>
        
        {isUnlocked && (
           <div className="mt-1 flex items-center bg-yellow-100 px-2 py-0.5 rounded-full text-yellow-700 text-xs font-bold border border-yellow-200">
              <StarIcon className="w-3 h-3 mr-1"/>
              <span>{lesson.xp_reward} XP</span>
           </div>
        )}
    </div>
  );

  if (!isUnlocked) {
    return <div className="cursor-not-allowed opacity-80 grayscale">{content}</div>;
  }

  return (
    <Link to={`/lesson/${lesson.id}`} className="hover:scale-105 transition-transform">
      {content}
    </Link>
  );
};

const LevelSection: React.FC<{
    level: string;
    topics: DBTopic[];
    completedLessonIds: string[];
    isPreviousLevelCompleted: boolean;
}> = ({ level, topics, completedLessonIds, isPreviousLevelCompleted }) => {
    
    const generatePath = () => {
        if (topics.length === 0) return "";
        
        let currentX = 100;
        let currentY = NODE_OFFSET_TOP; 

        let path = `M ${currentX} ${currentY} `;

        topics.forEach((_, i) => {
            if (i === topics.length - 1) return; 
            const nextIndex = i + 1;
            
            const cycle = nextIndex % 4;
            let nextX = 100;
            if (cycle === 1) nextX = 50;  
            if (cycle === 3) nextX = 150; 
            
            const nextY = (nextIndex * VERTICAL_SPACING) + NODE_OFFSET_TOP;

            const c1x = currentX;
            const c1y = currentY + (VERTICAL_SPACING / 2);

            const c2x = nextX;
            const c2y = nextY - (VERTICAL_SPACING / 2);

            path += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${nextX} ${nextY} `;
            
            currentX = nextX;
            currentY = nextY;
        });

        return path;
    };

    const pathD = generatePath();
    const containerHeight = (topics.length * VERTICAL_SPACING) + 40;

    const headerColors: Record<string, string> = {
        'Beginner': 'bg-green-100 text-green-800 border-green-200',
        'Intermediate': 'bg-blue-100 text-blue-800 border-blue-200',
        'Advanced': 'bg-purple-100 text-purple-800 border-purple-200'
    };

    return (
        <div className="mb-8">
            <div className={`py-4 px-6 mb-8 rounded-xl border-2 text-center shadow-sm ${headerColors[level] || 'bg-gray-100'}`}>
                <h2 className="text-xl font-extrabold uppercase tracking-wider">{level}</h2>
            </div>

            <div className="relative w-full max-w-md mx-auto" style={{ height: `${containerHeight}px` }}>
                <svg 
                    className="absolute top-0 left-0 w-full h-full z-0 overflow-visible"
                    viewBox={`0 0 200 ${containerHeight}`} 
                    preserveAspectRatio="none" 
                >
                    <path d={pathD} stroke="#e5e7eb" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={pathD} stroke="#fbbf24" strokeWidth="0" fill="none" strokeLinecap="round" strokeDasharray="10 10" />
                </svg>

                {topics.map((lesson, index) => {
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    
                    let isUnlocked = false;

                    if (index === 0) {
                        isUnlocked = isPreviousLevelCompleted;
                    } else {
                        isUnlocked = completedLessonIds.includes(topics[index-1]?.id);
                    }

                    if (isCompleted) {
                        isUnlocked = true;
                    }

                    return (
                        <LessonNode 
                            key={lesson.id} 
                            lesson={lesson} 
                            isCompleted={isCompleted} 
                            isUnlocked={isUnlocked} 
                            index={index} 
                        />
                    );
                })}
            </div>
        </div>
    );
}

const DashboardPage: React.FC = () => {
  const { user, isLoading } = useUser();
  const [topics, setTopics] = useState<DBTopic[]>([]);
  const [progress, setProgress] = useState<DBUserProgress[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const { learning_language } = user || {};

  const fetchData = useCallback(async () => {
        if (learning_language && user?.id) {
            setLoadingData(true);
            try {
                const [fetchedTopics, fetchedProgress] = await Promise.all([
                    databaseService.getTopicsByLanguage(learning_language),
                    databaseService.getUserProgress(user.id)
                ]);
                setTopics(fetchedTopics);
                setProgress(fetchedProgress);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoadingData(false);
            }
        }
  }, [learning_language, user?.id]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
       fetchData();
    }
  }, [fetchData, user]);

  useEffect(() => {
    const onFocus = () => {
        if (user && user.role !== 'admin') {
            fetchData();
        }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData, user]);

  if (isLoading) return <div className="p-8 text-center">Memuat Pengguna...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  if (user.role === 'admin') {
      return <Navigate to="/admin" />;
  }

  if (!learning_language) {
    return <Navigate to="/select-language" />;
  }

  if (loadingData && topics.length === 0) return <div className="p-8 text-center">Menyiapkan kurikulum...</div>;

  const completedLessonIds = progress.map(p => p.topik_id);
  const completedCount = progress.filter(p => p.status === 'completed').length;
  const totalTopics = topics.length;
  const coursePercentage = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;

  const levels: TopicLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  
  const normalizeLevel = (l: string): string => {
      if (!l) return 'Beginner';
      return l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
  };

  const isLevelCompleted = (levelName: string) => {
      const levelTopics = topics.filter(t => normalizeLevel(t.level || 'Beginner') === levelName);
      if (levelTopics.length === 0) return true; 
      return levelTopics.every(t => completedLessonIds.includes(t.id));
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-green-50">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Jalur Belajar</h1>
        <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm border border-gray-200 text-gray-700">
           {user.learning_language === 'ENGLISH' 
             ? <><UKFlag className="w-5 h-3.5 rounded-[1px] object-cover" /> <span>Bahasa Inggris</span></> 
             : <><ChinaFlag className="w-5 h-3.5 rounded-[1px] object-cover" /> <span>Bahasa Mandarin</span></>
           }
        </div>
      </div>

      <div className="max-w-md mx-auto mb-12">
        <ProgressBar percentage={coursePercentage} showLabel height="h-6" />
      </div>

      <div className="max-w-md mx-auto">
        {levels.map((level, idx) => {
            const levelTopics = topics
                .filter(t => normalizeLevel(t.level || 'Beginner') === level)
                .sort((a, b) => a.urutan - b.urutan);

            if (levelTopics.length === 0) return null;

            let isPrevDone = true;
            if (idx > 0) {
                for (let k = 0; k < idx; k++) {
                    if (!isLevelCompleted(levels[k])) {
                        isPrevDone = false;
                        break;
                    }
                }
            }

            return (
                <LevelSection 
                    key={level}
                    level={level}
                    topics={levelTopics}
                    completedLessonIds={completedLessonIds}
                    isPreviousLevelCompleted={isPrevDone}
                />
            );
        })}
        
        {topics.length === 0 && !loadingData && (
             <div className="text-center py-12 text-gray-500">
                 Belum ada topik tersedia untuk bahasa ini.
             </div>
        )}
      </div>
      
      <div className="h-24"></div> 
    </div>
  );
};

export default DashboardPage;
