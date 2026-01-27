
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateTopics, generateTopicImage, generateTerminations, generateCharacterBattles, generateQuestions } from '../services/geminiService';
import { RefreshCw, Zap, Image as ImageIcon, Dice5, Skull, Hash, Swords, MessageCircleQuestion, Sparkles, Newspaper } from 'lucide-react';
import { TrainingMode } from '../types';

interface TopicGeneratorProps {
    mode: TrainingMode;
    initialTopic?: string | null;
    initialImage?: string | null;
    initialPool?: string[];
    spectator?: boolean;
    onGenerate?: (topic: string) => void;
}

export const TopicGenerator: React.FC<TopicGeneratorProps> = ({ mode, initialTopic, initialImage, initialPool, spectator = false, onGenerate }) => {
    const [topics, setTopics] = useState<string[]>(initialPool || []);
    const [displayTopic, setDisplayTopic] = useState<string>("¡Listo!");
    const [currentImage, setCurrentImage] = useState<string | null>(null);

    const [isRolling, setIsRolling] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);

    const rouletteRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load initial content if provided
    useEffect(() => {
        if (initialTopic) setDisplayTopic(initialTopic);
        if (initialImage) setCurrentImage(initialImage);

        // Check loading state. For themes and characters, we might want an image.
        if ((mode === 'themes' || mode === 'characters') && !initialImage && !currentImage) {
            // If we have a topic but no image in these modes, try to generate one or just wait for user interaction
            if (!initialImage && !initialTopic) handleLaunch();
        }
    }, [initialTopic, initialImage, mode]);

    const fetchTopics = useCallback(async () => {
        setLoading(true);
        let newTopics: string[] = [];

        if (mode === 'terminations') {
            newTopics = await generateTerminations(40);
        } else if (mode === 'characters') {
            newTopics = await generateCharacterBattles(20);
        } else if (mode === 'questions') {
            newTopics = await generateQuestions(20);
        } else {
            // Themes use standard topics
            newTopics = await generateTopics(40);
        }

        setTopics(newTopics);
        setLoading(false);
        return newTopics;
    }, [mode]);

    // Initial fetch for internal topic pool
    useEffect(() => {
        if ((mode === 'themes' || mode === 'terminations' || mode === 'characters' || mode === 'questions') && topics.length === 0) {
            fetchTopics();
        }
    }, [mode, topics.length, fetchTopics]);

    const handleLaunch = async () => {
        if (mode === 'free') return;

        let pool = topics;
        if (pool.length === 0) {
            pool = await fetchTopics();
        }

        if (mode === 'themes' || mode === 'terminations' || mode === 'questions' || mode === 'characters' || mode === 'role_play' || mode === 'structure_easy' || mode === 'structure_hard' || mode === 'structure_duplas' || mode === 'news') {
            // Themes now uses roulette for the WORD, then generates image
            startRoulette(pool);
        }
    };

    const generateRandomImageForTopic = async (topic: string) => {
        setGeneratingImage(true);
        setCurrentImage(null); // Clear previous image while generating new one

        const img = await generateTopicImage(topic);
        setCurrentImage(img);
        setGeneratingImage(false);
    };

    const startRoulette = useCallback((pool: string[]) => {
        setIsRolling(true);
        // Keep current image if in themes mode until new one arrives? 
        // Or clear it to focus on the word? Let's clear it for dramatic effect.
        if (mode === 'themes') setCurrentImage(null);

        let duration = 0;
        const maxDuration = 800;
        const interval = 50;

        rouletteRef.current = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * pool.length);
            setDisplayTopic(pool[randomIndex]);

            duration += interval;
            if (duration >= maxDuration) {
                if (rouletteRef.current) clearInterval(rouletteRef.current);
                setIsRolling(false);

                let finalIndex = Math.floor(Math.random() * pool.length);

                // Prevent exact repetition if pool is larger than 1
                if (pool.length > 1 && pool[finalIndex] === displayTopic) {
                    finalIndex = (finalIndex + 1) % pool.length;
                }

                const finalTopic = pool[finalIndex];
                setDisplayTopic(finalTopic);

                // If mode is Themes or Characters, we generate an image AFTER the word is picked
                // Removed image generation as per request
                if (mode === 'themes' || mode === 'characters') {
                    // generateRandomImageForTopic(finalTopic);
                }

                // Notify Parent
                if (onGenerate) {
                    onGenerate(finalTopic);
                }
            }
        }, interval);

    }, [mode]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (rouletteRef.current) clearInterval(rouletteRef.current);
        };
    }, []);

    return (
        <div className="bg-purple-950/50 p-6 rounded-2xl border-2 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] h-full flex flex-col relative overflow-hidden animate-fadeIn w-full max-w-2xl mx-auto">

            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[50px] pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-urban text-green-400 tracking-wider">GENERADOR</h2>
                    <div className="px-3 py-1 bg-purple-900/50 rounded-full border border-purple-600/50">
                        <span className="text-xs uppercase font-bold text-purple-300">
                            MODO: {mode === 'themes' ? 'TEMÁTICAS' : mode === 'terminations' ? 'TERMINACIONES' : mode === 'characters' ? 'PERSONAJES' : mode === 'questions' ? 'PREGUNTAS' : 'LIBRE / SANGRE'}
                        </span>
                    </div>
                </div>
                <Zap className={`text-yellow-400 w-6 h-6 ${isRolling || generatingImage ? 'animate-bounce' : 'animate-pulse'}`} />
            </div>

            {/* Display Area */}
            <div className={`flex-1 min-h-[350px] flex items-center bg-black/60 rounded-xl border-4 mb-6 relative overflow-hidden group transition-all duration-100 ${isRolling || generatingImage ? 'border-yellow-400 border-double shadow-[0_0_40px_rgba(250,204,21,0.4)] glitch-border' : mode === 'free' ? 'border-red-600 border-dashed' : 'border-purple-700 border-dashed'} ${mode === 'characters' && !isRolling ? 'justify-center md:justify-end pb-0 md:pb-0' : 'justify-center'}`}>

                {/* Electric Background Effect */}
                {(isRolling || generatingImage) && (
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-noise"></div>
                )}

                {/* BACKGROUND IMAGE LAYER REMOVED */}{/* TEXT CONTENT LAYER */}
                <div className={`relative z-10 w-full px-4 flex flex-col items-center h-full ${mode === 'characters' && !isRolling ? 'justify-center' : 'justify-center'}`}>
                    {loading && topics.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                            <p className="text-green-500 text-xs uppercase tracking-widest">Cargando...</p>
                        </div>
                    ) : (
                        <>
                            {mode === 'free' ? (
                                <div className="text-center animate-pulse">
                                    <Skull size={100} className="text-red-600 mx-auto mb-4 opacity-80" />
                                    <h1 className="text-5xl md:text-7xl font-black font-urban text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                                        SANGRE
                                    </h1>
                                    <p className="text-red-300 tracking-widest uppercase mt-2">Modo Libre</p>
                                </div>
                            ) : mode === 'role_play' && !isRolling ? (
                                <div className="flex flex-col items-center justify-center text-center w-full relative animate-fadeIn px-2">

                                    {/* Floating Badge */}
                                    <div className="mb-6 px-6 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full border border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.5)] transform -rotate-1">
                                        <p className="text-white font-black tracking-[0.3em] text-[10px] md:text-xs uppercase flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                            TU MISIÓN
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        </p>
                                    </div>

                                    {/* Main Role Title - Huge & Glowing */}
                                    <h1 className="text-4xl md:text-6xl font-black font-urban text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)] mb-8 uppercase leading-tight break-words max-w-full px-4">
                                        {displayTopic.split('|')[0]}
                                    </h1>

                                    {/* Description Box - Glassmorphism Card */}
                                    <div className="relative max-w-lg mx-auto group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                                        <div className="relative px-8 py-6 bg-black/60 ring-1 ring-gray-900/5 rounded-2xl leading-none flex items-center justify-center border border-white/10 backdrop-blur-sm">
                                            <p className="text-lg md:text-2xl text-purple-100 font-urban tracking-wide italic leading-relaxed">
                                                "{displayTopic.split('|')[1] || ''}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (mode === 'structure_easy' || mode === 'structure_hard' || mode === 'structure_duplas') && !isRolling ? (
                                <div className="flex flex-col items-center justify-center text-center w-full relative animate-fadeIn px-4">

                                    {/* Floating Badge */}
                                    <div className={`mb-8 px-8 py-1 bg-gradient-to-r rounded-full border shadow-[0_0_20px_rgba(37,99,235,0.5)] transform rotate-1 ${mode === 'structure_duplas' ? 'from-purple-600 to-pink-600 border-purple-400' : 'from-blue-600 to-cyan-600 border-blue-400'}`}>
                                        <p className="text-white font-black tracking-[0.3em] text-xs uppercase flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                            {mode === 'structure_hard' ? 'NI VEL DIOS' : mode === 'structure_duplas' ? 'MODO DUPLAS' : 'PATRÓN 4x4'}
                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        </p>
                                    </div>

                                    {/* Structure Pattern - Bars Layout */}
                                    <div className="relative flex gap-4 md:gap-8 justify-center items-end mt-4">
                                        {/* Background Glow */}
                                        <div className={`absolute -inset-10 bg-gradient-to-r opacity-50 blur-2xl rounded-full pointer-events-none ${mode === 'structure_duplas' ? 'from-purple-500/20 to-pink-600/20' : 'from-cyan-500/20 to-blue-600/20'}`}></div>

                                        {displayTopic.split(' ').map((bar, index) => {
                                            let displayBar = bar;
                                            if (mode === 'structure_duplas') {
                                                displayBar = bar === 'A' ? 'P1' : 'P2';
                                            }

                                            return (
                                                <div key={index} className="flex flex-col items-center gap-2 group">
                                                    <span className={`text-[10px] md:text-xs font-bold tracking-widest uppercase opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap ${mode === 'structure_duplas' ? 'text-pink-400' : 'text-cyan-500'}`}>
                                                        {mode === 'structure_duplas' ? `LÍNEA ${index + 1}` : `BARRA ${index + 1}`}
                                                    </span>
                                                    <div className={`w-16 h-20 md:w-24 md:h-32 bg-black/40 border rounded-xl flex items-center justify-center relative overflow-hidden transition-colors shadow-[0_0_15px_rgba(6,182,212,0.1)] 
                                                        ${mode === 'structure_duplas' ? 'border-pink-500/30 group-hover:border-pink-400' : 'border-cyan-500/30 group-hover:border-cyan-400'}
                                                        ${displayBar === 'P2' ? 'animate-electric-surge' : ''}
                                                    `}>
                                                        <div className={`absolute inset-0 bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity ${mode === 'structure_duplas' ? 'from-pink-900/40' : 'from-cyan-900/40'}`}></div>

                                                        {/* Electric Effect for P2 */}
                                                        {displayBar === 'P2' && (
                                                            <>
                                                                <div className="absolute inset-0 bg-purple-500/20 z-0 animate-pulse-fast"></div>
                                                                <Zap className="absolute top-1 right-1 text-purple-300 w-3 h-3 md:w-4 md:h-4 opacity-0 animate-flash-icon" />
                                                            </>
                                                        )}

                                                        <span className={`${displayBar.length > 2 ? 'text-2xl md:text-4xl' : displayBar.length > 1 ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'} font-mono font-black text-white ${mode === 'structure_duplas' ? 'drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]' : 'drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]'} relative z-10`}>
                                                            {displayBar}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <p className={`font-medium tracking-[0.5em] text-sm uppercase mt-4 ${mode === 'structure_duplas' ? 'text-pink-400/60' : 'text-cyan-400/60'}`}>
                                        {mode === 'structure_hard' ? 'MODO HARDCORE' : mode === 'structure_duplas' ? 'COOPERATIVO' : 'MODO CLÁSICO'}
                                    </p>
                                </div>
                            ) : mode === 'news' && !isRolling ? (
                                <div className="flex flex-col items-center justify-center text-center w-full h-full relative animate-fadeIn px-6 py-4">

                                    {/* News Badge - Relative flow to avoid overlap */}
                                    <div className="mb-4 md:mb-8">
                                        <div className="inline-block px-4 py-1 bg-gradient-to-r from-red-700 to-red-600 rounded-sm shadow-[0_4px_15px_rgba(220,38,38,0.4)] border border-red-500/50">
                                            <p className="text-white font-black tracking-[0.2em] text-[10px] md:text-xs uppercase flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]"></span>
                                                NOTICIAS DE ACTUALIDAD
                                            </p>
                                        </div>
                                    </div>

                                    {/* Main News Title - Clean & Centered */}
                                    <div className="w-full flex-1 flex flex-col items-center justify-center">
                                        <div className="w-full max-w-3xl bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-2xl">
                                            <h1 className="text-2xl md:text-4xl font-bold font-sans text-white leading-snug break-words drop-shadow-xl mb-4 text-balance">
                                                {(() => {
                                                    try {
                                                        const newsItem = JSON.parse(displayTopic);
                                                        return `"${newsItem.title}"`;
                                                    } catch (e) {
                                                        return displayTopic;
                                                    }
                                                })()}
                                            </h1>

                                            {/* Source */}
                                            {(() => {
                                                try {
                                                    const newsItem = JSON.parse(displayTopic);
                                                    return (
                                                        <div className="mt-4 pt-4 border-t border-white/10 w-full flex justify-center">
                                                            <div className="inline-flex items-center gap-2 text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest">
                                                                <Newspaper size={14} className="text-red-500" />
                                                                <span>{newsItem.source}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                } catch (e) { return null; }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center w-full relative">

                                    {/* Decorative Elements for Epic Feel */}
                                    {(mode === 'characters' || mode === 'themes') && !isRolling && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 opacity-30">
                                            <div className={`w-64 h-64 rounded-full blur-[80px] ${mode === 'characters' ? 'bg-red-600' : 'bg-green-600'}`}></div>
                                        </div>
                                    )}

                                    {/* Subtitle for Characters (Top of text) */}
                                    {mode === 'characters' && !isRolling && (
                                        <div className="mb-6 bg-gradient-to-r from-red-600 to-red-900 px-6 py-1 transform -skew-x-12 shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-400">
                                            <p className="text-white font-black italic tracking-[0.3em] text-sm uppercase transform skew-x-12 flex items-center gap-2">
                                                <Swords size={16} /> DUELO A MUERTE
                                            </p>
                                        </div>
                                    )}

                                    {/* Subtitle for Themes */}
                                    {mode === 'themes' && !isRolling && (
                                        <div className="mb-6 bg-gradient-to-r from-green-600 to-emerald-900 px-6 py-1 transform -skew-x-12 shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-green-400">
                                            <p className="text-white font-black italic tracking-[0.3em] text-sm uppercase transform skew-x-12">TEMÁTICA</p>
                                        </div>
                                    )}

                                    {/* Main Text Display */}
                                    <h1 className={`font-black text-center text-white break-words max-w-full ${isRolling ? 'animate-glitch' : 'transition-transform duration-200'} ${mode === 'terminations' ? 'tracking-widest' : ''}
                                ${mode === 'questions'
                                            ? 'text-3xl md:text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,1)]'
                                            : mode === 'characters'
                                                ? 'text-4xl md:text-6xl font-urban text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_25px_rgba(220,38,38,0.6)] tracking-wide uppercase py-4'
                                                : mode === 'themes'
                                                    ? 'text-5xl md:text-8xl font-urban text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] tracking-wider'
                                                    : 'text-5xl md:text-7xl drop-shadow-[0_4px_8px_rgba(0,0,0,1)] scale-105'}
                            `}>
                                        {mode === 'questions' ? `¿${displayTopic.replace(/[¿?]/g, '')}?` : displayTopic.split('|')[0].toUpperCase()}
                                    </h1>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4 mt-auto relative z-10">
                {!spectator && mode !== 'free' && (
                    <button
                        onClick={handleLaunch}
                        disabled={isRolling || loading}
                        className={`w-full py-6 rounded-xl font-black text-2xl tracking-tighter uppercase transition-all shadow-xl transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden ${isRolling
                            ? 'bg-gray-800 text-gray-500 border-b-4 border-gray-950 cursor-wait'
                            : 'bg-gradient-to-r from-blue-600 to-red-600 text-white border-b-8 border-purple-900 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]'
                            }`}
                    >
                        {isRolling ? (
                            <span className="animate-pulse">SELECCIONANDO...</span>
                        ) : (
                            <>
                                {mode === 'terminations' ? <Hash size={32} /> : mode === 'characters' ? <Swords size={32} /> : mode === 'questions' ? <MessageCircleQuestion size={32} /> : mode === 'news' ? <Newspaper size={32} /> : <Sparkles size={32} />}
                                {mode === 'themes' ? 'NUEVA TEMÁTICA' : mode === 'terminations' ? 'OTRA TERMINACIÓN' : mode === 'characters' ? 'NUEVO DUELO' : mode === 'questions' ? 'OTRA PREGUNTA' : mode === 'role_play' ? 'NUEVOS ROLES' : mode === 'news' ? 'OTRA NOTICIA' : (mode === 'structure_easy' || mode === 'structure_hard' || mode === 'structure_duplas') ? 'OTRO PATRÓN' : 'OTRO CONCEPTO'}
                            </>
                        )}
                    </button>
                )}

            </div>


            <style>{`
        @keyframes electric-surge {
            0%, 90% { box-shadow: 0 0 15px rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.3); }
            92% { box-shadow: 0 0 30px rgba(168,85,247,0.8), inset 0 0 20px rgba(168,85,247,0.4); border-color: rgba(168,85,247,1); filter: brightness(1.3); }
            94% { box-shadow: 0 0 15px rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.3); filter: brightness(1); }
            96% { box-shadow: 0 0 40px rgba(168,85,247,0.9), inset 0 0 30px rgba(168,85,247,0.5); border-color: rgba(255,255,255,0.9); filter: brightness(1.5); }
            100% { box-shadow: 0 0 15px rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.3); }
        }
        @keyframes flash-icon {
            0%, 90% { opacity: 0; transform: scale(0.8) rotate(0deg); }
            92% { opacity: 1; transform: scale(1.2) rotate(10deg); color: #fff; }
            96% { opacity: 1; transform: scale(1.4) rotate(-10deg); color: #e879f9; }
            100% { opacity: 0; transform: scale(0.8) rotate(0deg); }
        }
        .animate-electric-surge {
            animation: electric-surge 4s infinite linear;
        }
        .animate-flash-icon {
            animation: flash-icon 4s infinite linear;
        }
        .animate-pulse-fast {
             animation: pulse 0.15s infinite;
        }
        @keyframes glitch {
          0% { transform: translate(0); text-shadow: -2px 2px red; }
          25% { transform: translate(-2px, 2px); text-shadow: 2px -2px blue; }
          50% { transform: translate(2px, -2px); text-shadow: -2px 2px yellow; }
          75% { transform: translate(-2px, -2px); text-shadow: 2px 2px green; }
          100% { transform: translate(0); text-shadow: -2px 2px red; }
        }
        .animate-glitch {
          animation: glitch 0.1s infinite;
        }
        .bg-noise {
            background-image: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 1px,
                #fff 1px,
                #fff 2px
            );
            background-size: 100% 4px;
            animation: noise 0.5s infinite linear;
        }
        @keyframes noise {
            0% { background-position: 0 0; }
            100% { background-position: 0 100%; }
        }
      `}</style>
        </div >
    );
};
