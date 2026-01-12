
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Language, DBTopic, DBVocabulary, DBExercise } from '../types';
import { SpeakerWaveIcon, CheckCircleIcon, XCircleIcon } from '../components/icons';
import { databaseService } from '../services/database';

enum LessonStep {
  VOCABULARY,
  QUIZ,
  COMPLETE,
}

const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const VocabCard: React.FC<{ vocab: DBVocabulary, targetLang: Language, onPronounce: (text: string, langCode: string) => void }> = ({ vocab, targetLang, onPronounce }) => {
    const isEnglish = targetLang === Language.ENGLISH;
    const langCode = isEnglish ? 'en-US' : 'zh-CN';
    const textToPronounce = vocab.target_word;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-center">
            <p className="text-gray-500 text-lg">{vocab.indonesian}</p>
            <p className="text-3xl font-bold my-2 text-green-600">{vocab.target_word}</p>
            {!isEnglish && vocab.pinyin && <p className="text-gray-500">{vocab.pinyin}</p>}
            <button onClick={() => onPronounce(textToPronounce, langCode)} className="mt-4 text-blue-500 hover:text-blue-700">
                <SpeakerWaveIcon className="w-8 h-8 mx-auto" />
            </button>
        </div>
    );
};

const LessonPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const { user, completeLesson } = useUser();
    
    const [lessonData, setLessonData] = useState<{vocab: DBVocabulary[], exercises: DBExercise[]} | null>(null);
    const [currentTopic, setCurrentTopic] = useState<DBTopic | null>(null);
    const [loading, setLoading] = useState(true);

    const [step, setStep] = useState<LessonStep>(LessonStep.VOCABULARY);
    const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [correctAnswers, setCorrectAnswers] = useState(0);

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    const [dragAvailableWords, setDragAvailableWords] = useState<{id: number, text: string}[]>([]);
    const [dragSelectedWords, setDragSelectedWords] = useState<{id: number, text: string}[]>([]);

    useEffect(() => {
        const fetchLesson = async () => {
            if (!lessonId || !user?.learning_language) return;
            setLoading(true);
            try {
                // Fetch topic detail to get XP reward
                const allTopics = await databaseService.getTopicsByLanguage(user.learning_language);
                const topic = allTopics.find(t => t.id === lessonId);
                setCurrentTopic(topic || null);

                // Fetch lesson content
                const data = await databaseService.getLessonData(lessonId);
                setLessonData(data);
            } catch (error) {
                console.error("Failed to load lesson", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLesson();
    }, [lessonId, user?.learning_language]);

    const handlePronounce = useCallback((text: string, langCode: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        window.speechSynthesis.speak(utterance);
    }, []);

    const handleStartQuiz = () => {
        if (lessonData && lessonData.exercises.length === 0 && currentTopic) {
             completeLesson(currentTopic.id, currentTopic.xp_reward, 100);
             setStep(LessonStep.COMPLETE);
             return;
        }
        setStep(LessonStep.QUIZ);
    }

    // Reset state saat berganti soal
    const currentQuestion = lessonData?.exercises[currentQuizIndex];
    useEffect(() => {
        if (currentQuestion) {
            setSelectedAnswer(null);
            setIsCorrect(null);
            
            if (currentQuestion.tipe_latihan === 'drag-and-drop') {
                const words = shuffleArray([...currentQuestion.opsi_jawaban]).map((word, idx) => ({
                    id: idx,
                    text: word
                }));
                setDragAvailableWords(words);
                setDragSelectedWords([]);
            }
        }
    }, [currentQuestion]);

    const handleNextVocab = () => {
        if (lessonData && currentVocabIndex < lessonData.vocab.length - 1) {
            setCurrentVocabIndex(prev => prev + 1);
        } else {
            handleStartQuiz();
        }
    };
    

    const handleCheckAnswer = () => {
        if (!currentQuestion || !currentTopic) return;
        
        let isAnswerCorrect = false;

        if (currentQuestion.tipe_latihan === 'drag-and-drop') {
            const userAnswer = dragSelectedWords.map(w => w.text).join(' ');
            // Normalisasi spasi dan case
            isAnswerCorrect = userAnswer.trim().toLowerCase() === currentQuestion.jawaban_benar.trim().toLowerCase();
        } else {
            if (selectedAnswer === null) return;
            isAnswerCorrect = selectedAnswer.trim().toLowerCase() === currentQuestion.jawaban_benar.toLowerCase();
        }
        
        // Simpan state lokal untuk UI
        setIsCorrect(isAnswerCorrect);
        
        // Hitung jumlah benar yang BARU (karena state correctAnswers belum update di siklus ini)
        const newCorrectCount = isAnswerCorrect ? correctAnswers + 1 : correctAnswers;

        if(isAnswerCorrect) setCorrectAnswers(prev => prev + 1);

        setTimeout(() => {
            setIsCorrect(null);
            setSelectedAnswer(null);
            if (lessonData && currentQuizIndex < lessonData.exercises.length - 1) {
                setCurrentQuizIndex(prev => prev + 1);
            } else {
                // Kuis Selesai
                const totalQuestions = lessonData.exercises.length;
                // Hitung Skor (0 - 100)
                const finalScore = totalQuestions > 0 
                    ? Math.round((newCorrectCount / totalQuestions) * 100) 
                    : 100;

                completeLesson(currentTopic.id, currentTopic.xp_reward, finalScore);
                setStep(LessonStep.COMPLETE);
            }
        }, 1500);
    };

    const handleWordClick = (wordObj: {id: number, text: string}, from: 'available' | 'selected') => {
        if (isCorrect !== null) return;

        if (from === 'available') {
            setDragAvailableWords(prev => prev.filter(w => w.id !== wordObj.id));
            setDragSelectedWords(prev => [...prev, wordObj]);
        } else {
            setDragSelectedWords(prev => prev.filter(w => w.id !== wordObj.id));
            setDragAvailableWords(prev => [...prev, wordObj]);
        }
    };

    const handleForceComplete = () => {
        if (currentTopic) {
            completeLesson(currentTopic.id, currentTopic.xp_reward, 100);
            setStep(LessonStep.COMPLETE);
        }
    };

    if (!user) return <Navigate to="/auth" />;
    if (!user.learning_language) return <Navigate to="/select-language" />;
    if (loading) return <div className="text-center p-8">Memuat Materi...</div>;
    if (!lessonData || !currentTopic) return <div className="text-center p-8">Pelajaran tidak ditemukan.</div>;

    const progressPercentage = step === LessonStep.VOCABULARY 
      ? (currentVocabIndex / (lessonData.vocab.length || 1)) * 50
      : step === LessonStep.QUIZ
      ? 50 + (currentQuizIndex / (lessonData.exercises.length || 1)) * 50
      : step === LessonStep.COMPLETE
      ? 100
      : 50;


    const renderContent = () => {
        switch (step) {
            case LessonStep.VOCABULARY:
                if (lessonData.vocab.length === 0) return (
                    <div className="text-center">
                        <p className="text-gray-800 font-bold mb-4">Tidak ada kosakata untuk topik ini.</p> 
                        <button onClick={handleStartQuiz} className="text-blue-600 underline">Lanjut ke Kuis/Latihan</button>
                    </div>
                );
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Kosakata Baru</h2>
                        <VocabCard vocab={lessonData.vocab[currentVocabIndex]} targetLang={user.learning_language!} onPronounce={handlePronounce}/>
                        <button onClick={handleNextVocab} className="mt-8 w-full max-w-md bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-green-700 transition-colors">
                            Lanjut
                        </button>
                    </>
                );

            case LessonStep.QUIZ:
                if (lessonData.exercises.length === 0) {
                    return (
                        <div className="text-center max-w-md p-6 bg-white rounded-2xl shadow-sm border">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Latihan Kosong</h3>
                            <p className="text-gray-600 mb-6">
                                Belum ada soal latihan yang tersedia untuk topik ini di database.
                            </p>
                            <button 
                                onClick={handleForceComplete}
                                className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-green-700 transition-colors"
                            >
                                Selesaikan Topik ({currentTopic?.xp_reward} XP)
                            </button>
                        </div>
                    );
                }

                if (!currentQuestion) return <div className="text-gray-800 font-bold">Terjadi kesalahan memuat soal.</div>;
                
                return (
                    <div className="w-full max-w-2xl">
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{currentQuestion.pertanyaan}</h2>
                        
                        {}
                        
                        {currentQuestion.tipe_latihan === 'multiple-choice' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.opsi_jawaban.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => setSelectedAnswer(option)}
                                        disabled={isCorrect !== null}
                                        className={`p-4 border-2 rounded-xl text-lg font-semibold text-gray-800 transition-all duration-200
                                            ${selectedAnswer === option ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}
                                            ${isCorrect !== null && option === currentQuestion.jawaban_benar ? '!bg-green-100 !border-green-500' : ''}
                                            ${isCorrect === false && selectedAnswer === option ? '!bg-red-100 !border-red-500' : ''}
                                        `}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}

                        {(currentQuestion.tipe_latihan === 'fill-in-the-blank') && (
                            <input
                                type="text"
                                value={selectedAnswer || ''}
                                onChange={(e) => setSelectedAnswer(e.target.value)}
                                disabled={isCorrect !== null}
                                placeholder="Ketik jawabanmu..."
                                className={`w-full p-4 border-2 rounded-xl text-lg
                                    ${isCorrect === true ? 'border-green-500 bg-green-50' : ''}
                                    ${isCorrect === false ? 'border-red-500 bg-red-50' : 'border-gray-300'}
                                `}
                            />
                        )}

                        {currentQuestion.tipe_latihan === 'drag-and-drop' && (
                            <div className="space-y-8">
                                {}
                                <div className="min-h-[80px] p-2 border-b-2 border-gray-200 flex flex-wrap gap-2 items-center justify-center transition-colors">
                                    {dragSelectedWords.length === 0 && (
                                        <span className="text-gray-400 text-sm select-none">Ketuk kata untuk menyusun kalimat</span>
                                    )}
                                    {dragSelectedWords.map((word) => (
                                        <button
                                            key={word.id}
                                            onClick={() => handleWordClick(word, 'selected')}
                                            disabled={isCorrect !== null}
                                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl shadow-sm text-gray-800 font-bold hover:bg-red-50 hover:border-red-200 transition-all animate-fade-in"
                                        >
                                            {word.text}
                                        </button>
                                    ))}
                                </div>

                                {}
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {dragAvailableWords.map((word) => (
                                        <button
                                            key={word.id}
                                            onClick={() => handleWordClick(word, 'available')}
                                            disabled={isCorrect !== null}
                                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl shadow-[0_2px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px] text-gray-800 font-bold hover:bg-gray-50 transition-all"
                                        >
                                            {word.text}
                                        </button>
                                    ))}
                                    {}
                                    {dragAvailableWords.length === 0 && (
                                         <div className="h-10 w-full"></div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleCheckAnswer} 
                            disabled={
                                (currentQuestion.tipe_latihan === 'drag-and-drop' && dragSelectedWords.length === 0) ||
                                (currentQuestion.tipe_latihan !== 'drag-and-drop' && !selectedAnswer) || 
                                isCorrect !== null
                            } 
                            className="mt-8 w-full bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                        >
                            Periksa
                        </button>
                    </div>
                );
            case LessonStep.COMPLETE:
                return (
                     <div className="text-center">
                        <CheckCircleIcon className="w-24 h-24 text-green-500 mx-auto mb-4"/>
                        <h2 className="text-3xl font-extrabold text-gray-800">Pelajaran Selesai!</h2>
                        <p className="text-xl text-gray-600 mt-2">Kamu mendapatkan {currentTopic?.xp_reward} XP!</p>
                        <p className="text-lg mt-1 font-bold text-gray-700">Skor: {lessonData.exercises.length > 0 ? Math.round((correctAnswers / lessonData.exercises.length) * 100) : 100}%</p>
                        <p className="text-gray-500 mt-1">Benar: {correctAnswers} / {lessonData.exercises.length}</p>
                        <button onClick={() => navigate('/dashboard')} className="mt-8 bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                            Kembali ke Dashboard
                        </button>
                    </div>
                );
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="w-full p-4">
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                {renderContent()}
            </div>
            {isCorrect !== null && (
                <div className={`fixed bottom-0 left-0 right-0 p-6 text-white text-xl font-bold flex items-center gap-4 animate-slide-up ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                    {isCorrect ? <CheckCircleIcon className="w-8 h-8"/> : <XCircleIcon className="w-8 h-8"/>}
                    <div>
                        <p>{isCorrect ? 'Jawaban Benar!' : 'Jawaban Salah'}</p>
                        {!isCorrect && <p className="text-sm font-normal opacity-90">Jawaban yang benar: {currentQuestion?.jawaban_benar}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPage;
