import React, { useState, useEffect, useRef } from 'react';
import { TrainingFormat, BeatGenre, SpectatorState, AppStep } from '../types';
import { TopicGenerator } from './TopicGenerator';
import { SlotMachine } from './SlotMachine';
import { TournamentBracket } from './TournamentBracket'; // In case we want to show it? Maybe later.
import { Crown, User, Swords, Play, Trophy, Timer, Zap, Skull, Award, List, MessageCircle } from 'lucide-react';
import { useFirebaseSync } from '../hooks/useFirebaseSync';

const MODE_TRANSLATIONS: Record<string, string> = {
    themes: 'TEMÁTICAS',
    free: 'SANGRE',
    terminations: 'TERMINACIONES',
    characters: 'PERSONAJES',
    questions: 'PREGUNTAS'
};

const ENTRADAS_RULES: Record<string, string> = {
    [TrainingFormat.FOUR_BY_FOUR]: "5 Entradas por MC",
    [TrainingFormat.EIGHT_BY_EIGHT]: "3 Entradas por MC",
    [TrainingFormat.TWO_BY_TWO]: "10 Entradas por MC",
    [TrainingFormat.MINUTE]: "5 Entradas por MC",
    [TrainingFormat.KICK_BACK]: "5 Entradas por MC",
    [TrainingFormat.CALL_FRIEND]: "6 Entradas por MC"
};

interface SpectatorViewProps {
    viewerName?: string;
}

export const SpectatorView: React.FC<SpectatorViewProps> = ({ viewerName }) => {
    // Generate a persistent random ID for this spectator if no name provided
    const [randomId] = useState(() => Math.floor(Math.random() * 10000));
    const effectiveName = viewerName || `Espectador #${randomId} `;

    // FIREBASE HOOK
    const { gameState, castVote, animationTrigger } = useFirebaseSync(true, effectiveName);

    // Local Visual State (Masking gameState for animations)
    const [isFlickering, setIsFlickering] = useState(false);
    const [glitchImageOverride, setGlitchImageOverride] = useState<string | null>(null);

    // Voting Interaction State
    const [hasVoted, setHasVoted] = useState(false);

    // Local League Table State
    const [localShowTable, setLocalShowTable] = useState(false);

    // WhatsApp Tooltip State
    const [showWhatsappTooltip, setShowWhatsappTooltip] = useState(false);

    useEffect(() => {
        // Show tooltip every 20 seconds for 6 seconds
        const interval = setInterval(() => {
            setShowWhatsappTooltip(true);
            setTimeout(() => setShowWhatsappTooltip(false), 6000);
        }, 20000);

        // Initial show after 3 seconds
        setTimeout(() => {
            setShowWhatsappTooltip(true);
            setTimeout(() => setShowWhatsappTooltip(false), 6000);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    // Audio Refs
    const laughAudioRef = useRef<HTMLAudioElement | null>(null);

    // Reset hasVoted when battle changes (winner reset or rivals change)
    useEffect(() => {
        if (gameState) {
            // Logic to reset vote if a new battle starts
            if ((gameState.step === 'names' || gameState.step === 'slots') && hasVoted) {
                setHasVoted(false);
            }
        }
    }, [gameState?.rivalA, gameState?.rivalB, gameState?.step, hasVoted]);

    // ANIMATION TRIGGER EFFECT (Visuals Only)
    useEffect(() => {
        if (animationTrigger && animationTrigger.type === 'WIN_ANIMATION_TRIGGER') {
            const { winner, loserImage } = animationTrigger.payload;
            const finalPath = loserImage;

            // 1. Start Glitch
            setIsFlickering(true);
            setGlitchImageOverride(finalPath); // Start visible

            // 3. Strobe Effect Sequence
            let flickerCount = 0;
            const totalFlickers = 8;
            const flickerSpeed = 50;

            const interval = setInterval(() => {
                flickerCount++;
                if (flickerCount % 2 !== 0) {
                    setGlitchImageOverride(null); // Hide
                } else {
                    setGlitchImageOverride(finalPath); // Show
                }

                if (flickerCount >= totalFlickers) {
                    clearInterval(interval);
                    setIsFlickering(false);
                    setGlitchImageOverride(null); // Stop overriding
                }
            }, flickerSpeed);

            // SAFETY
            setTimeout(() => {
                setIsFlickering(false);
                setGlitchImageOverride(null);
            }, 600); // Slightly longer than math to be safe
        }
    }, [animationTrigger]);


    // Derived values
    if (!gameState) {
        return (
            <div className="min-h-screen bg-[#0d001a] flex flex-col items-center justify-center text-purple-500 animate-pulse">
                <Crown size={64} className="mb-4" />
                <h2 className="text-xl font-urban tracking-widest uppercase">Conectando con el Trono...</h2>
            </div>
        );
    }

    // Derived values
    const {
        step, rivalA, rivalB, winner, selectedFormat, selectedMode, selectedGenre,
        preGeneratedTopic, preGeneratedImage, preGeneratedPool, countdown, isReplica,
        loserImage: remoteLoserImage, showWinnerScreen, votingBg, currentSlotValues, spinAttempts,
        league, showLeagueTable
    } = gameState;

    // Use override if flickering, otherwise remote
    const loserImage = isFlickering ? glitchImageOverride : remoteLoserImage;

    // Audio Refs (Optional: if we want sound in spectator too, but maybe better to keep silent or sync?
    // User requested "solo visual" initially ("se vaya viendo decisions"). 
    // Usually spectator screen might have sound if it's the main projection.
    // Let's implement sound logic similar to App.tsx but maybe muted by default or let user enable it?
    // For now, let's Stick to VISUALS as requested "mas no se pueda elegir nada solo visual".
    // I will skip audio implementation to avoid double audio if testing on same machine,
    // unless user explicitly asked for it. "solo visual" implies visual focus.

    return (
        <div className={`min-h-screen bg-gradient-to-b text-white p-4 md:p-6 lg:p-8 overflow-x-hidden relative flex flex-col ${isReplica && step === 'slots' ? 'from-red-950 to-black' : 'from-[#1a0b2e] to-[#0d001a]'} `}>

            {/* BACKGROUND ANIMATION LAYERS (Keep consistent with App.tsx) */}

            {/* COUNTDOWN OVERLAY */}
            {countdown && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fadeInFast">
                    <h1 className="text-6xl sm:text-8xl md:text-[10rem] lg:text-[15rem] font-black font-urban text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-pink-500 to-indigo-600 drop-shadow-[0_10px_20px_rgba(168,85,247,0.5)] animate-scale-up tracking-tighter text-center break-words max-w-full px-4">
                        {countdown}
                    </h1>
                </div>
            )}

            {/* HEADER (Simplified) */}
            {step !== 'voting' && step !== 'arena' && (
                <header className="text-center py-4 relative mb-4 flex flex-col items-center">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] blur-[100px] -z-10 rounded-full pointer-events-none ${isReplica ? 'bg-red-600/20' : 'bg-purple-600/10'} `}></div>
                    <div className="relative mb-2 animate-float">
                        <Crown size={48} className={`${isReplica ? 'text-red-500' : 'text-yellow-400'} drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]`} fill={isReplica ? "rgba(220,38,38,0.2)" : "rgba(250,204,21,0.2)"} />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-urban font-black tracking-tighter transform -rotate-2 relative z-10 animate-shine-text drop-shadow-xl">
                        LA CORTE DEL REY
                    </h1>
                    {/* SPECTATOR BADGE */}
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.5em] text-purple-400/50">Modo Espectador</div>
                </header>
            )}

            <main className={`flex-1 flex flex-col justify-center animate-fadeIn relative min-h-0 ${step === 'voting' ? 'p-0' : ''} ${step === 'arena' ? 'justify-start md:justify-center' : ''} `}>

                {/* STEP 0: NAMES */}
                {step === 'names' && (
                    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center flex-1 min-h-[50vh]">
                        <h2 className="text-2xl md:text-3xl font-urban text-white mb-8 text-center drop-shadow-lg tracking-widest uppercase animate-pulse px-4">
                            PRÓXIMA BATALLA
                        </h2>
                        <div className="flex flex-col md:flex-row w-full gap-8 md:gap-4 items-center justify-center mb-10 relative">
                            {/* Rival A */}
                            <div className="w-full max-w-xs md:max-w-sm relative group z-10">
                                <div className="absolute inset-0 bg-purple-600/20 rounded-2xl blur-xl transition-all"></div>
                                <div className="relative bg-black/80 border-2 border-purple-500 p-6 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] text-center">
                                    <div className="flex justify-center mb-4 text-purple-400"><User size={48} /></div>
                                    <div className="text-3xl font-black font-urban text-white uppercase tracking-wider">{rivalA || "MC MORADO"}</div>
                                </div>
                            </div>
                            {/* VS */}
                            <div className="relative z-20 md:-mx-6 my-[-10px] md:my-0 flex-shrink-0">
                                <div className="w-16 h-16 bg-black border-2 border-purple-500 rotate-45 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                    <span className="-rotate-45 text-2xl font-black text-white italic">VS</span>
                                </div>
                            </div>
                            {/* Rival B */}
                            <div className="w-full max-w-xs md:max-w-sm relative group z-10">
                                <div className="absolute inset-0 bg-blue-600/20 rounded-2xl blur-xl transition-all"></div>
                                <div className="relative bg-black/80 border-2 border-blue-500 p-6 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] text-center">
                                    <div className="flex justify-center mb-4 text-blue-400"><User size={48} /></div>
                                    <div className="text-3xl font-black font-urban text-white uppercase tracking-wider">{rivalB || "MC AZUL"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 1: SLOTS (Shared Visuals) */}
                {step === 'slots' && (
                    <div className="w-full h-full flex flex-col justify-start items-center p-0 md:p-4 overflow-hidden animate-fadeIn mt-4 md:mt-0">
                        <div className="scale-[0.6] md:scale-90 origin-top">
                            <SlotMachine
                                onComplete={() => { }} // No handling needed in spectator
                                isReplica={isReplica}
                                spectator={true}
                                forcedValues={currentSlotValues}
                                attempts={spinAttempts}
                                rivalA={rivalA}
                                rivalB={rivalB}
                            />
                        </div>
                    </div>
                )}

                {/* STEP 2: SUMMARY */}
                {step === 'summary' && (
                    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center animate-fadeIn">
                        <h2 className="text-4xl font-urban text-white mb-8 text-center drop-shadow-lg">BATALLA DEFINIDA</h2>
                        <div className="w-full bg-purple-900/20 border border-purple-600/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                            <h3 className="text-purple-300 uppercase text-xs font-bold tracking-widest mb-4">Configuración</h3>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-black/40 p-3 rounded-lg">
                                    <p className="text-xs text-gray-400">Formato</p>
                                    <p className="font-bold text-lg text-green-400">{selectedFormat}</p>
                                </div>
                                <div className="bg-black/40 p-3 rounded-lg">
                                    <p className="text-xs text-gray-400">Estímulo</p>
                                    <p className="font-bold text-lg text-pink-400">{selectedMode ? (MODE_TRANSLATIONS[selectedMode] || selectedMode) : ''}</p>
                                </div>
                                <div className="col-span-2 bg-black/40 p-3 rounded-lg border border-purple-500/30">
                                    <p className="text-xs text-gray-400">Beat Style</p>
                                    <p className="font-bold text-xl text-yellow-400">{selectedGenre}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-center text-xl font-bold animate-pulse text-purple-200">
                            ESPERANDO INICIO...
                        </div>
                    </div>
                )}

                {/* STEP 3: ARENA */}
                {step === 'arena' && (
                    <div className="w-full h-full flex flex-col md:flex-row items-center md:items-stretch justify-center gap-4 md:gap-6 animate-fadeIn">
                        {/* LEFT: Rival A */}
                        <div className="w-full md:w-1/4 flex md:flex-col justify-between md:justify-center items-center order-2 md:order-1 gap-2 bg-purple-900/10 border border-purple-500/20 rounded-xl p-2 md:p-4">
                            <div className="flex flex-col items-center">
                                <User size={32} className="text-purple-500 mb-1" />
                                <h2 className="text-2xl md:text-4xl font-black font-urban text-purple-400 text-center uppercase leading-none break-words">
                                    {rivalA || "MC MORADO"}
                                </h2>
                            </div>
                        </div>

                        {/* MIDDLE */}
                        <div className="w-full md:w-1/2 flex flex-col gap-4 order-1 md:order-2 h-full justify-center">
                            {/* Info Header */}
                            <div className="bg-black/60 border-l-4 border-yellow-500 rounded-r-lg p-3 flex justify-between items-center shadow-lg">
                                <div className="flex flex-col">
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Formato</span>
                                    <span className="text-yellow-400 font-urban text-lg leading-none">{selectedFormat}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                                    <Timer size={16} className="text-yellow-400" />
                                    <span className="text-white font-bold uppercase text-sm tracking-wide">
                                        {selectedFormat ? ENTRADAS_RULES[selectedFormat] : "5 Entradas"}
                                    </span>
                                </div>
                            </div>

                            {/* Topic Generator Display Only */}
                            <TopicGenerator
                                mode={selectedMode || 'themes'}
                                initialTopic={preGeneratedTopic}
                                initialImage={preGeneratedImage}
                                initialPool={preGeneratedPool}
                                spectator={true}
                            // We might need to ensure this component doesn't have interactive buttons in read-only mode, 
                            // but it seems to handle `initialTopic` well.
                            // If it has a "Generate" button, it might show up.
                            // Let's check TopicGenerator if it's purely display or interactive.
                            // Assuming typical usage, the Controller App generates and passes title/image.
                            />
                        </div>

                        {/* RIGHT: Rival B */}
                        <div className="w-full md:w-1/4 flex md:flex-col justify-between md:justify-center items-center order-3 md:order-3 gap-2 bg-blue-900/10 border border-blue-500/20 rounded-xl p-2 md:p-4">
                            <div className="flex flex-col items-center">
                                <User size={32} className="text-blue-500 mb-1" />
                                <h2 className="text-2xl md:text-4xl font-black font-urban text-blue-400 text-center uppercase leading-none break-words">
                                    {rivalB || "MC AZUL"}
                                </h2>
                            </div>
                        </div>
                    </div>
                )}



            </main>

            {/* STEP 4: VOTING (RESPONSIVE SPLIT) */}
            {step === 'voting' && (
                <div className={`fixed inset-0 z-[200] flex flex-col md:flex-row bg-black animate-fadeIn`}>

                    {/* --- MOBILE LAYOUT (VERTICAL SPLIT) --- */}
                    <div className="md:hidden flex flex-col w-full h-full relative">
                        {/* TOP HALF: RIVAL A (PURPLE) */}
                        <div
                            onClick={() => !hasVoted && castVote('A', rivalA || 'MC AZUL', rivalB || 'MC ROJO') && setHasVoted(true)}
                            className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center border-b-2 border-white/20 transition-all active:scale-[0.98] ${hasVoted ? 'grayscale opacity-50' : 'cursor-pointer'}`}
                        >
                            {/* Bg Image with Purple Tint */}
                            <div className="absolute inset-0 bg-purple-900 z-0"></div>
                            {loserImage && <img src={loserImage} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />}
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-600/50 to-black/50 z-10"></div>

                            {/* Content */}
                            <div className="relative z-20 text-center p-4">
                                <Crown className="w-12 h-12 text-purple-300 mx-auto mb-2 drop-shadow-lg" />
                                <h2 className="text-4xl font-black font-urban text-white uppercase tracking-wider drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] leading-none mb-2">
                                    {rivalA || 'BUFÓN MORADO'}
                                </h2>
                                <span className="inline-block bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                    Votar A
                                </span>
                            </div>
                        </div>

                        {/* CENTER AREA: VS BADGE + REPLICA BUTTON */}
                        {/* CENTER AREA: REPLICA BUTTON (REPLACES VS) */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasVoted) return;
                                    setHasVoted(true);
                                    castVote('Replica', rivalA || 'MC AZUL', rivalB || 'MC ROJO');
                                }}
                                className="w-16 h-16 md:w-20 md:h-20 bg-gray-900 border-4 border-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.5)] active:scale-95 transition-all hover:bg-gray-800 hover:scale-110"
                            >
                                <span className="font-black text-[10px] md:text-sm text-white uppercase tracking-widest text-center leading-none">
                                    VOTAR<br />RÉPLICA
                                </span>
                            </button>
                        </div>

                        {/* BOTTOM HALF: RIVAL B (BLUE) */}
                        <div
                            onClick={() => !hasVoted && castVote('B', rivalA || 'MC AZUL', rivalB || 'MC ROJO') && setHasVoted(true)}
                            className={`flex-1 relative overflow-hidden flex flex-col items-center justify-center border-t-2 border-white/20 transition-all active:scale-[0.98] ${hasVoted ? 'grayscale opacity-50' : 'cursor-pointer'}`}
                        >
                            {/* Bg Image with Blue Tint */}
                            <div className="absolute inset-0 bg-blue-900 z-0"></div>
                            {loserImage && <img src={loserImage} className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/50 to-black/50 z-10"></div>

                            {/* Content */}
                            <div className="relative z-20 text-center p-4">
                                <span className="inline-block bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg mb-2">
                                    Votar B
                                </span>
                                <h2 className="text-4xl font-black font-urban text-white uppercase tracking-wider drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] leading-none mb-2">
                                    {rivalB || 'BUFÓN AZUL'}
                                </h2>
                                <Crown className="w-12 h-12 text-blue-300 mx-auto drop-shadow-lg" />
                            </div>
                        </div>



                        {/* VOTED OVERLAY */}
                        {hasVoted && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20">
                                    <div className="text-4xl mb-2">✅</div>
                                    <h3 className="text-2xl font-black font-urban text-white uppercase">Voto Enviado</h3>
                                    <p className="text-gray-300 text-xs mt-2">Esperando resultados...</p>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* --- DESKTOP LAYOUT (ORIGINAL BOXED) --- */}
                    <div className="hidden md:flex fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl aspect-square max-h-[85vh] overflow-hidden bg-black rounded-3xl border-4 border-purple-500/30 shadow-2xl">
                        {/* Background */}
                        <div className="absolute inset-0 z-0">
                            <img
                                src={loserImage || "/vs-bg-final.jpg"}
                                alt="Voting Background"
                                className={`w-full h-full object-cover object-center ${isFlickering ? 'animate-glitch duration-0' : 'transition-all duration-500'} `}
                            />
                            <div className="absolute inset-0 bg-black/20"></div>

                            {/* Loser Filter */}
                            {winner && !showWinnerScreen && (
                                <div
                                    className="absolute inset-0 z-10 pointer-events-none"
                                    style={{
                                        clipPath: winner === 'A'
                                            ? 'polygon(95% 0, 100% 0, 100% 100%, 5% 100%)' // B Lost
                                            : 'polygon(0 0, 95% 0, 5% 100%, 0% 100%)'     // A Lost
                                    }}
                                >
                                    <div className="w-full h-full bg-black/70 backdrop-grayscale animate-fade-to-gray opacity-100"></div>
                                </div>
                            )}

                            {/* INTERACTIVE VOTING ZONES (Spectator) */}
                            {!winner && !hasVoted && (
                                <>
                                    {/* ZONE A: Click to Vote A (Left Half) */}
                                    <div
                                        onClick={() => {
                                            if (hasVoted) return;
                                            setHasVoted(true);
                                            castVote('A', rivalA || 'MC AZUL', rivalB || 'MC ROJO');
                                        }}
                                        className="absolute top-0 left-0 w-1/2 h-full z-40 cursor-pointer group hover:bg-white/5 transition-all duration-300"
                                    >
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-purple-600 blur-3xl transition-opacity duration-300"></div>
                                    </div>

                                    {/* ZONE B: Click to Vote B (Right Half) */}
                                    <div
                                        onClick={() => {
                                            if (hasVoted) return;
                                            setHasVoted(true);
                                            castVote('B', rivalA || 'MC AZUL', rivalB || 'MC ROJO');
                                        }}
                                        className="absolute top-0 right-0 w-1/2 h-full z-40 cursor-pointer group hover:bg-white/5 transition-all duration-300"
                                    >
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-30 bg-cyan-600 blur-3xl transition-opacity duration-300"></div>
                                    </div>

                                    {/* ZONE REPLICA: Central Bottom Button */}
                                    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50 w-full flex justify-center pointer-events-none">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent clicking zones below
                                                if (hasVoted) return;
                                                setHasVoted(true);
                                                castVote('Replica', rivalA || 'MC AZUL', rivalB || 'MC ROJO');
                                            }}
                                            className="pointer-events-auto bg-gray-800/80 border-2 border-white/30 hover:bg-gray-700 text-white font-black uppercase tracking-widest px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all animate-pulse"
                                        >
                                            VOTAR RÉPLICA
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* VOTED FEEDBACK */}
                            {!winner && hasVoted && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20 animate-bounce-slow">
                                        <span className="text-white font-bold uppercase tracking-widest text-xl">¡Voto Registrado!</span>
                                    </div>
                                </div>
                            )}

                            {/* CENTRAL VOTING PANEL (Spectator - Restored) */}
                            {!winner && (
                                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl pointer-events-auto flex flex-col items-center gap-6 mt-0">
                                        <h3 className="text-white font-urban uppercase tracking-widest text-xl animate-pulse">Panel de Votación</h3>
                                        <div className="flex items-center gap-8 md:gap-16">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-6xl font-black font-urban text-white element-text-stroke-purple">?</div>
                                                <span className="text-xs text-purple-400 font-bold tracking-widest">VOTOS</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2"><span className="text-gray-400 font-bold">VS</span></div>
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-6xl font-black font-urban text-white element-text-stroke-cyan">?</div>
                                                <span className="text-xs text-cyan-400 font-bold tracking-widest">VOTOS</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest opacity-60">
                                            Escanea el QR o haz clic en tu favorito
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* RIVAL NAMES OVERLAY (DESKTOP ONLY) - Hide on early steps */}
            {step === 'voting' && (
                <>
                    <div className="hidden md:block absolute top-[10%] left-[8%] z-30 pointer-events-none transform -rotate-3 max-w-[40%]">
                        <h2 className="text-7xl font-black font-urban text-white uppercase leading-[0.9] element-text-stroke-purple animate-epic-pulse-purple break-words">
                            {rivalA}
                        </h2>
                        {!winner && (
                            <div className="mt-2 text-white font-bold tracking-[0.3em] uppercase opacity-90 text-lg animate-pulse shadow-black drop-shadow-md">
                                ¡VOTA AQUÍ!
                            </div>
                        )}
                    </div>
                    <div className="hidden md:block absolute bottom-[10%] right-[8%] z-30 pointer-events-none transform -rotate-3 text-right max-w-[40%] flex flex-col items-end">
                        <h2 className="text-7xl font-black font-urban text-white uppercase leading-[0.9] element-text-stroke-cyan animate-epic-pulse-cyan break-words">
                            {rivalB}
                        </h2>
                        {!winner && (
                            <div className="mt-2 text-white font-bold tracking-[0.3em] uppercase opacity-90 text-lg animate-pulse shadow-black drop-shadow-md">
                                ¡VOTA AQUÍ!
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* WINNER SCREEN */}
            {showWinnerScreen && winner && (
                <div className={`fixed inset-0 z-[100] flex items-center justify-center animate-fadeIn bg-black/80 backdrop-blur-sm`}>
                    <div className={`relative w-[90%] max-w-sm md:max-w-lg bg-[#1a0b2e] border-4 rounded-3xl p-4 md:p-8 flex flex-col items-center shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-scale-up z-20 overflow-hidden ${winner === 'A' ? 'border-fuchsia-500 shadow-[0_0_50px_rgba(192,38,211,0.5)]' : 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.5)]'} `}>
                        {/* Winner Badge */}
                        <div className="mb-4 md:mb-6 relative">
                            <div className={`absolute inset-0 blur-[40px] ${winner === 'A' ? 'bg-fuchsia-500' : 'bg-cyan-500'} `}></div>
                            <Crown size={50} className={`relative z-10 md:w-20 md:h-20 ${winner === 'A' ? 'text-fuchsia-100' : 'text-cyan-100'} `} fill="currentColor" />
                        </div>

                        <h3 className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-2 text-center">GANADOR INDISCUTIBLE</h3>

                        <h2 className={`text-4xl md:text-6xl font-black font-urban text-center uppercase leading-none mb-4 md:mb-6 break-words w-full ${winner === 'A' ? 'text-fuchsia-400 drop-shadow-[0_0_15px_rgba(192,38,211,0.8)]' : 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]'} `}>
                            {winner === 'A' ? rivalA : rivalB}
                        </h2>
                    </div>

                    {/* TRUMPETS & CANNON CONFETTI LAYER */}
                    <div className="absolute inset-0 overflow-visible pointer-events-none z-[80]">
                        {/* LEFT TRUMPET */}
                        <div className="absolute top-[65%] left-2 md:left-10 transform -translate-y-1/2 -rotate-12">
                            <div className="text-6xl md:text-9xl filter drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] relative animate-trumpet-beat">
                                🎺
                                <div className="absolute top-2 right-2 w-1 h-1">
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <div
                                            key={`confetti - l - ${i} `}
                                            className="absolute w-2 h-2 md:w-3 md:h-3 rounded-sm animate-fountain-flow"
                                            style={{
                                                backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#ec4899'][i % 5],
                                                left: 0, top: 0,
                                                '--tx': `${50 + Math.random() * 200} px`,
                                                '--ty': `${-100 - Math.random() * 200} px`,
                                                '--r': `${Math.random() * 720} deg`,
                                                animationDuration: `${1 + Math.random() * 1.5} s`,
                                                animationDelay: `${Math.random() * 0.5} s`
                                            } as React.CSSProperties}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT TRUMPET (Flipped) */}
                        <div className="absolute top-[65%] right-2 md:right-10 transform -translate-y-1/2 rotate-12 scale-x-[-1]">
                            <div className="text-6xl md:text-9xl filter drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] relative animate-trumpet-beat">
                                🎺
                                <div className="absolute top-2 right-2 w-1 h-1">
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <div
                                            key={`confetti - r - ${i} `}
                                            className="absolute w-2 h-2 md:w-3 md:h-3 rounded-sm animate-fountain-flow"
                                            style={{
                                                backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#ec4899'][i % 5],
                                                left: 0, top: 0,
                                                '--tx': `${50 + Math.random() * 200} px`,
                                                '--ty': `${-100 - Math.random() * 200} px`,
                                                '--r': `${Math.random() * 720} deg`,
                                                animationDuration: `${1 + Math.random() * 1.5} s`,
                                                animationDelay: `${Math.random() * 0.5} s`
                                            } as React.CSSProperties}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Styles Injection */}
            <style>{`
@keyframes glitch-anim {
    0% { filter: contrast(120%) saturate(120%) hue-rotate(0deg); clip-path: inset(0 0 0 0); transform: translate(0); }
    20% { filter: contrast(200%) saturate(0%) hue-rotate(90deg) invert(10%); clip-path: inset(10% 0 30% 0); transform: translate(-5px, 2px); }
    40% { filter: contrast(150%) saturate(200%) hue-rotate(-90deg); clip-path: inset(50% 0 10% 0); transform: translate(5px, -2px); }
    60% { filter: contrast(200%) saturate(0%) invert(20%); clip-path: inset(20% 0 60% 0); transform: translate(-5px, 0); }
    80% { filter: contrast(150%) saturate(150%); clip-path: inset(0 0 0 0); transform: translate(0); }
    100% { filter: contrast(120%) saturate(120%); clip-path: inset(0 0 0 0); transform: translate(0); }
}
.animate-glitch {
    animation: glitch-anim 0.2s infinite linear;
}

.element-text-stroke-purple {
    -webkit-text-stroke: 2px #a855f7;
    paint-order: stroke fill;
}
.element-text-stroke-cyan {
    -webkit-text-stroke: 2px #06b6d4;
    paint-order: stroke fill;
}
@keyframes epic-pulse-purple {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.6)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.4)); transform: scale(1) translate(0, 0); }
    50% { filter: drop-shadow(0 0 25px rgba(168, 85, 247, 1)) drop-shadow(0 0 50px rgba(168, 85, 247, 0.6)); transform: scale(1.05) translate(-2px, -2px); opacity: 0.9; }
}
@keyframes epic-pulse-cyan {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.6)) drop-shadow(0 0 20px rgba(6, 182, 212, 0.4)); transform: scale(1) translate(0, 0); }
    50% { filter: drop-shadow(0 0 25px rgba(6, 182, 212, 1)) drop-shadow(0 0 50px rgba(6, 182, 212, 0.6)); transform: scale(1.05) translate(2px, 2px); opacity: 0.9; }
}
.animate-epic-pulse-purple { animation: epic-pulse-purple 3s ease-in-out infinite; }
.animate-epic-pulse-cyan { animation: epic-pulse-cyan 3s ease-in-out infinite reverse; }

@keyframes fade-to-gray {
    from { opacity: 0; backdrop-filter: grayscale(0%); }
    to { opacity: 1; backdrop-filter: grayscale(100%); }
}
.animate-fade-to-gray {
    animation: fade-to-gray 3s forwards;
    animation-delay: 2.5s;
}
@keyframes scale-up {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes confetti-fall {
    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
.animate-confetti-fall {
    animation-name: confetti-fall;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
}

@keyframes trumpet-beat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}
.animate-trumpet-beat {
    animation: trumpet-beat 0.6s infinite ease-in-out;
}

@keyframes fountain-flow {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)); opacity: 0; }
}
.animate-fountain-flow {
    animation: fountain-flow 1s ease-out infinite;
}

@keyframes float-trumpet {
    0%, 100% { transform: translateY(0) rotate(-10deg) scale(1); }
    50% { transform: translateY(-20px) rotate(10deg) scale(1.1); }
}
.animate-float-trumpet {
    animation: float-trumpet 3s ease-in-out infinite;
}
.animate-scale-up {
    animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
@keyframes bounce-slow {
    0%, 100% { transform: translateY(-5px); }
    50% { transform: translateY(5px); }
}
.animate-bounce-slow {
    animation: bounce-slow 3s infinite ease-in-out;
}
`}</style>
            {/* FLOATING BUTTONS (SPECTATOR) */}
            <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-3">
                {/* WHATSAPP BUTTON WITH TOOLTIP */}
                <div className="relative group">
                    {(showWhatsappTooltip) && (
                        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-black px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.5)] whitespace-nowrap font-black uppercase text-xs tracking-wider animate-bounce-horizontal flex items-center z-50">
                            ¡ÚNETE AL GRUPO!
                            <div className="absolute top-1/2 -right-2 -translate-y-1/2 border-8 border-transparent border-l-white"></div>
                        </div>
                    )}
                    <a
                        href="https://chat.whatsapp.com/IHGEd8MfriO2O52UFAHRUk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600/80 border border-green-400/50 hover:bg-green-500 rounded-full p-4 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-110 flex items-center justify-center animate-bounce-slow relative z-40"
                        title="Unirse al Grupo de WhatsApp"
                    >
                        <MessageCircle size={24} fill="currentColor" />
                    </a>
                </div>

                {/* LEAGUE TABLE BUTTON */}
                {league?.isLeagueMode && !showLeagueTable && !localShowTable && (
                    <button
                        onClick={() => setLocalShowTable(true)}
                        className="bg-black/60 border border-yellow-500/50 hover:bg-yellow-900/30 rounded-full p-4 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all hover:scale-110"
                        title="Ver Tabla de Liga"
                    >
                        <List size={24} />
                    </button>
                )}
            </div>

            {/* LEAGUE TABLE OVERLAY (SPECTATOR) */}
            {
                (showLeagueTable || localShowTable) && league && (
                    <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
                        <button
                            onClick={() => setLocalShowTable(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white"
                        >
                            ✖
                        </button>
                        <div className="bg-[#1a0b2e] w-full max-w-4xl max-h-[90vh] rounded-2xl border-2 border-yellow-600 shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden flex flex-col relative">
                            <div className="p-6 border-b border-purple-800 flex justify-between items-center bg-purple-950/50">
                                <div className="flex items-center gap-3">
                                    <Award className="text-yellow-400" size={32} />
                                    <h2 className="text-2xl font-urban text-white tracking-widest uppercase">POSICIONES DE LA LIGA</h2>
                                </div>
                            </div>
                            <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                                <table className="w-full text-left">
                                    <thead className="bg-purple-900/40 text-purple-200 uppercase text-xs tracking-widest sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="p-4">Pos</th>
                                            <th className="p-4">MC</th>
                                            <th className="p-4 text-center">Batallas</th>
                                            <th className="p-4 text-right">Puntos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-200">
                                        {[...league.participants].sort((a, b) => b.points - a.points || b.battles - a.battles).map((p, idx) => (
                                            <tr key={p.id} className={`border-b border-purple-800/30 ${!p.active ? 'opacity-50 grayscale' : ''} `}>
                                                <td className="p-4 font-bold text-gray-500">#{idx + 1}</td>
                                                <td className="p-4 font-black text-lg uppercase flex items-center gap-2">
                                                    {idx === 0 && <Crown size={16} className="text-yellow-400" fill="currentColor" />}
                                                    {p.name}
                                                    {!p.active && <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-800 ml-2">COMPLETADO</span>}
                                                </td>
                                                <td className="p-4 text-center font-mono text-blue-300">{p.battles} / {league.maxBattlesPerPerson}</td>
                                                <td className="p-4 text-right font-black text-xl text-yellow-400">{p.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
