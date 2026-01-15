
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Language, DBTopic, DBVocabulary, DBExercise } from '../types';
import { SpeakerWaveIcon, CheckCircleIcon, XCircleIcon } from '../components/icons';
import { databaseService } from '../services/database';
import ProgressBar from '../components/ProgressBar';

enum LessonStep {
  VOCABULARY,
  QUIZ,
  COMPLETE,
}

const shuffleArray = (array: any[]) => {
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

interface MatchItem {
    id: string; 
    text: string;
    side: 'left' | 'right';
}

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
    const [isDraggingOverTarget, setIsDraggingOverTarget] = useState(false); // Visual feedback

    const [matchLeftItems, setMatchLeftItems] = useState<MatchItem[]>([]);
    const [matchRightItems, setMatchRightItems] = useState<MatchItem[]>([]);
    const [matchSelected, setMatchSelected] = useState<MatchItem | null>(null); // Currently selected item
    const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // List of matched IDs
    const [matchErrorPair, setMatchErrorPair] = useState<{left: MatchItem, right: MatchItem} | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [itemPositions, setItemPositions] = useState<Record<string, { x: number, y: number }>>({});

    useEffect(() => {
        const fetchLesson = async () => {
            if (!lessonId || !user?.learning_language) return;
            setLoading(true);
            try {
                const allTopics = await databaseService.getTopicsByLanguage(user.learning_language);
                const topic = allTopics.find(t => t.id === lessonId);
                setCurrentTopic(topic || null);

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

    const currentQuestion = lessonData?.exercises[currentQuizIndex];
    
    const calculatePositions = useCallback(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const positions: Record<string, { x: number, y: number }> = {};

        itemsRef.current.forEach((node, key) => {
            if (node) {
                const rect = node.getBoundingClientRect();
                const isLeft = key.startsWith('left-');
                
                positions[key] = {
                    x: isLeft 
                        ? rect.right - containerRect.left 
                        : rect.left - containerRect.left,
                    y: (rect.top - containerRect.top) + (rect.height / 2)
                };
            }
        });
        setItemPositions(positions);
    }, [matchLeftItems, matchRightItems]); 
    useEffect(() => {
        window.addEventListener('resize', calculatePositions);
        const timer = setTimeout(calculatePositions, 100);
        return () => {
            window.removeEventListener('resize', calculatePositions);
            clearTimeout(timer);
        };
    }, [calculatePositions, step]);

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

            if (currentQuestion.tipe_latihan === 'matching-pairs') {
                itemsRef.current.clear();
                setMatchedPairs([]);
                setMatchSelected(null);
                setMatchErrorPair(null);
                
                const lefts: MatchItem[] = [];
                const rights: MatchItem[] = [];
                
                currentQuestion.opsi_jawaban.forEach((pairStr, idx) => {
                    const [leftTxt, rightTxt] = pairStr.split('|');
                    const pairId = idx.toString();
                    if (leftTxt && rightTxt) {
                        lefts.push({ id: pairId, text: leftTxt.trim(), side: 'left' });
                        rights.push({ id: pairId, text: rightTxt.trim(), side: 'right' });
                    }
                });

                setMatchLeftItems(shuffleArray(lefts));
                setMatchRightItems(shuffleArray(rights));
                
            }
        }

    }, [currentQuestion]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (containerRef.current && matchSelected) {
            const rect = containerRef.current.getBoundingClientRect();
            setCursorPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

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
            isAnswerCorrect = userAnswer.trim().toLowerCase() === currentQuestion.jawaban_benar.trim().toLowerCase();
        } else if (currentQuestion.tipe_latihan === 'matching-pairs') {
            // Logic: Correct if all pairs are matched
            const totalPairs = currentQuestion.opsi_jawaban.length;
            isAnswerCorrect = matchedPairs.length === totalPairs;
        } else {
            if (selectedAnswer === null) return;
            isAnswerCorrect = selectedAnswer.trim().toLowerCase() === currentQuestion.jawaban_benar.toLowerCase();
        }
        
        setIsCorrect(isAnswerCorrect);
        
        const newCorrectCount = isAnswerCorrect ? correctAnswers + 1 : correctAnswers;
        if(isAnswerCorrect) setCorrectAnswers(prev => prev + 1);

        setTimeout(() => {
            setIsCorrect(null);
            setSelectedAnswer(null);
            if (lessonData && currentQuizIndex < lessonData.exercises.length - 1) {
                setCurrentQuizIndex(prev => prev + 1);
            } else {
                const totalQuestions = lessonData.exercises.length;
                const finalScore = totalQuestions > 0 
                    ? Math.round((newCorrectCount / totalQuestions) * 100) 
                    : 100;

                completeLesson(currentTopic.id, currentTopic.xp_reward, finalScore);
                setStep(LessonStep.COMPLETE);
            }
        }, 1500);
    };

    const handleWordMove = (wordObj: {id: number, text: string}, from: 'available' | 'selected') => {
        if (isCorrect !== null) return; 

        if (from === 'available') {
            setDragAvailableWords(prev => prev.filter(w => w.id !== wordObj.id));
            setDragSelectedWords(prev => [...prev, wordObj]);
        } else {
            setDragSelectedWords(prev => prev.filter(w => w.id !== wordObj.id));
            setDragAvailableWords(prev => [...prev, wordObj]);
        }
    };

    const handleDragStart = (e: React.DragEvent, word: {id: number, text: string}, from: 'available' | 'selected') => {
        if (isCorrect !== null) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('application/json', JSON.stringify({ word, from }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetZone: 'available' | 'selected') => {
        e.preventDefault(); 
        if (targetZone === 'selected') setIsDraggingOverTarget(true);
    };

    const handleDragLeave = (targetZone: 'available' | 'selected') => {
        if (targetZone === 'selected') setIsDraggingOverTarget(false);
    };

    const handleDrop = (e: React.DragEvent, targetZone: 'available' | 'selected') => {
        e.preventDefault();
        setIsDraggingOverTarget(false);
        const data = e.dataTransfer.getData('application/json');
        
        if (!data) return;

        try {
            const { word, from } = JSON.parse(data);
            if (from === targetZone) return; 
            handleWordMove(word, from);
        } catch (err) {
            console.error("Drop error", err);
        }
    };


    const handleMatchClick = (item: MatchItem) => {
        if (isCorrect !== null) return; 
        if (matchedPairs.includes(item.id)) return; 
        if (matchErrorPair) {
            setMatchErrorPair(null); 
            setMatchSelected(item);
            return;
        }

        if (containerRef.current) {
            const key = `${item.side}-${item.id}`;
            const pos = itemPositions[key];
            if (pos) setCursorPos(pos);
        }

        if (!matchSelected) {
            setMatchSelected(item);
        } else {
            if (matchSelected.side === item.side) {
                setMatchSelected(item);
            } else {
                if (matchSelected.id === item.id) {
                    setMatchedPairs(prev => [...prev, item.id]);
                    setMatchSelected(null);
                } else {
                    setMatchErrorPair({ left: matchSelected, right: item });
                    setMatchSelected(null);
                    setTimeout(() => {
                        setMatchErrorPair(null);
                    }, 800);
                }
            }
        }
    };

    const handleForceComplete = () => {
        if (currentTopic) {
            completeLesson(currentTopic.id, currentTopic.xp_reward, 100);
            setStep(LessonStep.COMPLETE);
        }
    };

    const renderLines = () => {
        if (currentQuestion?.tipe_latihan !== 'matching-pairs') return null;

        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                {matchedPairs.map(id => {
                    const start = itemPositions[`left-${id}`];
                    const end = itemPositions[`right-${id}`];
                    if (!start || !end) return null;
                    
                    return (
                        <path 
                            key={`match-${id}`}
                            d={`M ${start.x} ${start.y} C ${start.x + 50} ${start.y}, ${end.x - 50} ${end.y}, ${end.x} ${end.y}`}
                            fill="none"
                            stroke="#16a34a" 
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    );
                })}

                {matchErrorPair && (
                    <path 
                        d={( () => {
                            const lKey = `left-${matchErrorPair.left.side === 'left' ? matchErrorPair.left.id : matchErrorPair.right.id}`;
                            const rKey = `right-${matchErrorPair.right.side === 'right' ? matchErrorPair.right.id : matchErrorPair.left.id}`;
                            const start = itemPositions[lKey];
                            const end = itemPositions[rKey];
                            if(!start || !end) return '';
                            return `M ${start.x} ${start.y} C ${start.x + 50} ${start.y}, ${end.x - 50} ${end.y}, ${end.x} ${end.y}`;
                        })()}
                        fill="none"
                        stroke="#dc2626" 
                        strokeWidth="4"
                        strokeDasharray="5,5"
                        strokeLinecap="round"
                    />
                )}

                {matchSelected && (
                    <path 
                        d={( () => {
                            const key = `${matchSelected.side}-${matchSelected.id}`;
                            const start = itemPositions[key];
                            if (!start) return '';
                            
                            const isLeftStart = matchSelected.side === 'left';
                            const cp1x = isLeftStart ? start.x + 50 : start.x - 50;
                            const cp2x = isLeftStart ? cursorPos.x - 50 : cursorPos.x + 50;

                            return `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp2x} ${cursorPos.y}, ${cursorPos.x} ${cursorPos.y}`;
                        })()}
                        fill="none"
                        stroke="#3b82f6" 
                        strokeWidth="4"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                    />
                )}
            </svg>
        );
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
                    <div className="w-full max-w-3xl flex flex-col items-center">
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">{currentQuestion.pertanyaan}</h2>
                        
                        {/* --- RENDER LOGIC BERDASARKAN TIPE LATIHAN --- */}
                        
                        {currentQuestion.tipe_latihan === 'multiple-choice' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
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
                            <div className="w-full max-w-lg">
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
                            </div>
                        )}

                        {currentQuestion.tipe_latihan === 'drag-and-drop' && (
                            <div className="space-y-8 w-full max-w-2xl select-none">
                                {/* Area Jawaban (Drop Zone) */}
                                <div 
                                    onDragOver={(e) => handleDragOver(e, 'selected')}
                                    onDragLeave={() => handleDragLeave('selected')}
                                    onDrop={(e) => handleDrop(e, 'selected')}
                                    className={`min-h-[100px] p-4 border-2 rounded-2xl flex flex-wrap gap-2 items-center justify-center transition-all duration-300
                                        ${isDraggingOverTarget ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 scale-[1.02]' : 'border-gray-200 bg-gray-50'}
                                    `}
                                >
                                    {dragSelectedWords.length === 0 && !isDraggingOverTarget && (
                                        <span className="text-gray-400 text-sm pointer-events-none">Seret kata ke sini untuk menyusun kalimat</span>
                                    )}
                                    {dragSelectedWords.map((word) => (
                                        <button
                                            key={word.id}
                                            draggable={isCorrect === null}
                                            onDragStart={(e) => handleDragStart(e, word, 'selected')}
                                            onClick={() => handleWordMove(word, 'selected')}
                                            disabled={isCorrect !== null}
                                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl shadow-sm text-gray-800 font-bold hover:bg-red-50 hover:border-red-200 transition-all animate-fade-in cursor-move active:cursor-grabbing"
                                        >
                                            {word.text}
                                        </button>
                                    ))}
                                </div>

                                <div 
                                    onDragOver={(e) => handleDragOver(e, 'available')}
                                    onDrop={(e) => handleDrop(e, 'available')}
                                    className="flex flex-wrap gap-3 justify-center p-4 rounded-xl border border-transparent min-h-[80px]"
                                >
                                    {dragAvailableWords.map((word) => (
                                        <button
                                            key={word.id}
                                            draggable={isCorrect === null}
                                            onDragStart={(e) => handleDragStart(e, word, 'available')}
                                            onClick={() => handleWordMove(word, 'available')}
                                            disabled={isCorrect !== null}
                                            className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl shadow-[0_2px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px] text-gray-800 font-bold hover:bg-gray-50 transition-all cursor-move active:cursor-grabbing"
                                        >
                                            {word.text}
                                        </button>
                                    ))}
                                    {dragAvailableWords.length === 0 && (
                                         <div className="text-gray-300 text-sm font-bold pointer-events-none self-center">Kosong</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentQuestion.tipe_latihan === 'matching-pairs' && (
                            <div 
                                className="relative w-full max-w-4xl p-4 sm:p-8 bg-white/50 rounded-2xl border border-gray-100 shadow-inner"
                                ref={containerRef}
                                onMouseMove={handleMouseMove}
                            >
                                {renderLines()}
                                
                                {/* Changed z-10 to z-30 to ensure buttons are above lines and clickable */}
                                <div className="grid grid-cols-2 gap-12 sm:gap-24 relative z-30">
                                    <div className="space-y-6">
                                        {matchLeftItems.map((item) => {
                                            const isMatched = matchedPairs.includes(item.id);
                                            const isSelected = matchSelected?.text === item.text;
                                            const isError = matchErrorPair?.left.text === item.text;

                                            return (
                                                <div key={`left-${item.id}`} className="relative flex items-center justify-end">
                                                    <button
                                                        ref={(el) => { if(el) itemsRef.current.set(`left-${item.id}`, el); }}
                                                        onClick={() => handleMatchClick(item)}
                                                        disabled={isMatched || isCorrect !== null}
                                                        className={`w-full p-4 border-2 rounded-xl font-bold text-gray-800 transition-all duration-200 text-right pr-6
                                                            ${isMatched ? 'border-green-500 bg-green-50 text-green-700' : 'bg-white border-gray-300 hover:bg-gray-50'}
                                                            ${isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : ''}
                                                            ${isError ? '!bg-red-100 !border-red-500 animate-pulse' : ''}
                                                            shadow-[0_2px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px]
                                                        `}
                                                    >
                                                        {item.text}
                                                    </button>
                                                    {/* Anchor Dot */}
                                                    <div className={`absolute -right-3 w-6 h-6 rounded-full border-4 bg-white z-20 transition-colors
                                                        ${isMatched ? 'border-green-500' : isSelected ? 'border-blue-500' : 'border-gray-300'}
                                                    `}></div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="space-y-6">
                                        {matchRightItems.map((item) => {
                                            const isMatched = matchedPairs.includes(item.id);
                                            const isSelected = matchSelected?.text === item.text;
                                            const isError = matchErrorPair?.right.text === item.text;

                                            return (
                                                 <div key={`right-${item.id}`} className="relative flex items-center justify-start">
                                                    {/* Anchor Dot */}
                                                    <div className={`absolute -left-3 w-6 h-6 rounded-full border-4 bg-white z-20 transition-colors
                                                        ${isMatched ? 'border-green-500' : isSelected ? 'border-blue-500' : 'border-gray-300'}
                                                    `}></div>
                                                    
                                                    <button
                                                        ref={(el) => { if(el) itemsRef.current.set(`right-${item.id}`, el); }}
                                                        onClick={() => handleMatchClick(item)}
                                                        disabled={isMatched || isCorrect !== null}
                                                        className={`w-full p-4 border-2 rounded-xl font-bold text-gray-800 transition-all duration-200 text-left pl-6
                                                            ${isMatched ? 'border-green-500 bg-green-50 text-green-700' : 'bg-white border-gray-300 hover:bg-gray-50'}
                                                            ${isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200' : ''}
                                                            ${isError ? '!bg-red-100 !border-red-500 animate-pulse' : ''}
                                                            shadow-[0_2px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px]
                                                        `}
                                                    >
                                                        {item.text}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleCheckAnswer} 
                            disabled={
                                (currentQuestion.tipe_latihan === 'drag-and-drop' && dragSelectedWords.length === 0) ||
                                (currentQuestion.tipe_latihan === 'matching-pairs' && matchedPairs.length !== currentQuestion.opsi_jawaban.length) ||
                                (currentQuestion.tipe_latihan === 'multiple-choice' && !selectedAnswer) || 
                                (currentQuestion.tipe_latihan === 'fill-in-the-blank' && !selectedAnswer) ||
                                isCorrect !== null
                            } 
                            className="mt-8 w-full max-w-md bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
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
            <div className="w-full max-w-4xl mx-auto p-4">
               <ProgressBar percentage={progressPercentage} height="h-4" />
            </div>
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                {renderContent()}
            </div>
            {isCorrect !== null && (
                <div className={`fixed bottom-0 left-0 right-0 p-6 text-white text-xl font-bold flex items-center gap-4 animate-slide-up ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                    {isCorrect ? <CheckCircleIcon className="w-8 h-8"/> : <XCircleIcon className="w-8 h-8"/>}
                    <div>
                        <p>{isCorrect ? 'Jawaban Benar!' : 'Jawaban Salah'}</p>
                        {!isCorrect && currentQuestion?.tipe_latihan !== 'matching-pairs' && <p className="text-sm font-normal opacity-90">Jawaban yang benar: {currentQuestion?.jawaban_benar}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonPage;
