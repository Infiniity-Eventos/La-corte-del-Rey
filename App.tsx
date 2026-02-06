

import React, { useState, useEffect, useRef } from 'react';
import { TopicGenerator } from './components/TopicGenerator';
import { SlotMachine } from './components/SlotMachine';
import { SpectatorView } from './components/SpectatorView';
import { TournamentBracket } from './components/TournamentBracket';
import { AccessScreen } from './components/AccessScreen'; // New Import
import { UserManagementModal } from './components/UserManagementModal';

import { BeatPlayer } from './components/BeatPlayer';
import { ComodinSelector } from './components/ComodinSelector'; // New Import
import { Info, Image as ImageIcon, RotateCcw, Youtube, Play, ExternalLink, User, Crown, Trophy, Zap, Swords, BookOpen, X, List, Scale, Timer, Star, Award, Newspaper, Settings, Users, Download, LogOut } from 'lucide-react';

import { TrainingFormat, TrainingMode, BeatGenre, ALL_TRAINING_MODES, AppStep, LeagueParticipant } from './types';
import { generateTopics, generateTerminations, generateCharacterBattles, generateQuestions } from './services/geminiService';
import { fetchLatestNews } from './services/newsService';
import { ROLES } from './data/roles';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { getAllUsers, User as UserType } from './services/userService'; // New Import

// Updated steps: replaced format/mode/beat with 'slots'
// AppStep moved to types.ts

const MODE_TRANSLATIONS: Record<string, string> = {
    themes: 'TEMÁTICAS',
    free: 'SANGRE',
    terminations: 'TERMINACIONES',
    characters: 'PERSONAJES',
    questions: 'PREGUNTAS',
    role_play: 'JUEGO DE ROLES',
    structure_easy: 'ESTRUCTURA EASY',
    structure_hard: 'ESTRUCTURA HARD',
    structure_duplas: 'ESTRUCTURA DUPLAS',
    news: 'NOTICIAS'
};

const ENTRADAS_RULES: Record<string, string> = {
    [TrainingFormat.FOUR_BY_FOUR]: "5 Entradas por MC",
    [TrainingFormat.EIGHT_BY_EIGHT]: "3 Entradas por MC",
    [TrainingFormat.TWO_BY_TWO]: "10 Entradas por MC",
    [TrainingFormat.MINUTE]: "5 Entradas por MC",
    [TrainingFormat.KICK_BACK]: "5 Entradas por MC"
};

const App: React.FC = () => {
    const [authStep, setAuthStep] = useState<'login' | 'app'>('login');
    const [viewerName, setViewerName] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Add this state

    const handleLogin = (user: UserType) => {
        setIsAuthenticated(true);
        // Any other login logic
    };

    const handleLogout = () => {
        if (window.confirm("¿Estás seguro de que deseas cerrar sesión?")) {
            setIsAuthenticated(false);
            setAuthStep('login');
        }
    };

    // Check for Spectator Mode Route
    const [isSpectator, setIsSpectator] = useState(() => window.location.pathname === '/modoespectador');

    useEffect(() => {
        // Handle navigation if needed provided we aren't using a router
        if (window.location.pathname === '/modoespectador') {
            setIsSpectator(true);
        }
    }, []);

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const [step, setStep] = useState<AppStep>('names'); // Start at names
    const [rivalA, setRivalA] = useState('BUFÓN MORADO');
    const [rivalB, setRivalB] = useState('BUFÓN AZUL');
    const [winner, setWinner] = useState<'A' | 'B' | null>(null);
    const [showWinnerScreen, setShowWinnerScreen] = useState(false);

    // Replica (Tie) State
    const [isReplica, setIsReplica] = useState(false);

    const [selectedFormat, setSelectedFormat] = useState<TrainingFormat | null>(null);
    const [selectedMode, setSelectedMode] = useState<TrainingMode>('themes');
    const [selectedGenre, setSelectedGenre] = useState<BeatGenre | null>(null);
    // Editor Mode State
    const [isEditorMode, setIsEditorMode] = useState(false);

    const [countdown, setCountdown] = useState<string | null>(null);

    // Transition State
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Pre-generated Content State
    const [preGeneratedTopic, setPreGeneratedTopic] = useState<string | null>(null);
    const [preGeneratedPool, setPreGeneratedPool] = useState<string[]>([]);
    const [isPreGenerating, setIsPreGenerating] = useState(false);

    // Slot Machine Temp State (for Spectator Sync)
    const [tempSlotValues, setTempSlotValues] = useState<{ format: TrainingFormat, mode: TrainingMode, genre: BeatGenre } | null>(null);

    // Audio Ref for Fade Control
    const laughAudioRef = useRef<HTMLAudioElement | null>(null);

    // Info Modal State
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showTournamentModal, setShowTournamentModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);

    // Loser Image State
    const [loserImage, setLoserImage] = useState<string | null>(null);
    const [isFlickering, setIsFlickering] = useState(false);
    const [pulseRed, setPulseRed] = useState(false);

    // Voting Counts
    const [votesA, setVotesA] = useState(0);
    const [votesB, setVotesB] = useState(0);
    const [votesReplica, setVotesReplica] = useState(0);

    // Voted Users Set for UI
    const [votedUsers, setVotedUsers] = useState<Set<string>>(new Set());
    const [voteHistory, setVoteHistory] = useState<any[]>([]);
    const [attempts, setAttempts] = useState(3);

    // Voted Users Ref to track unique votes per battle (Synchronous Source of Truth)
    const votedUsersRef = useRef<Set<string>>(new Set());

    // --- LEAGUE MODE STATE ---
    const [isLeagueMode, setIsLeagueMode] = useState(false);
    // REMOVED DUPLICATE LEAGUE STATE DECLARATIONS HERE
    const [showLeagueTable, setShowLeagueTable] = useState(false);

    // Roulette State
    const [isRouletteSpinning, setIsRouletteSpinning] = useState(false);
    const [rouletteNames, setRouletteNames] = useState<{ A: string, B: string }>({ A: '?', B: '?' });
    const [rouletteWinner, setRouletteWinner] = useState<{ A: string, B: string } | null>(null);

    // Beat Player State
    const [isBeatPlayerOpen, setIsBeatPlayerOpen] = useState(false);
    const [isBeatSelected, setIsBeatSelected] = useState(false);

    // --- LEAGUE WILDCARD STATE ---
    const [showWildcard, setShowWildcard] = useState(false);
    const [wildcardPool, setWildcardPool] = useState<LeagueParticipant[]>([]);
    const [wildcardPending, setWildcardPending] = useState<LeagueParticipant | null>(null);
    const [currentWildcardOpponent, setCurrentWildcardOpponent] = useState<string | null>(null); // Track who is the wildcard

    // Persist League Data
    // League State
    const [leagueParticipants, setLeagueParticipants] = useState<LeagueParticipant[]>(() => {
        const saved = localStorage.getItem('league_participants');
        return saved ? JSON.parse(saved) : [];
    });
    const [maxBattlesPerPerson, setMaxBattlesPerPerson] = useState(() => {
        const saved = localStorage.getItem('league_max_battles');
        return saved ? parseInt(saved) : 4;
    });
    const [newParticipantName, setNewParticipantName] = useState('');
    const [availableUsers, setAvailableUsers] = useState<UserType[]>([]); // New state for registered users

    // Fetch users for League Mode
    useEffect(() => {
        const fetchLeagueUsers = async () => {
            const users = await getAllUsers();
            // Filter only approved users
            setAvailableUsers(users.filter(u => u.status === 'approved'));
        };

        fetchLeagueUsers();
    }, []);

    // Persist League Data
    useEffect(() => {
        localStorage.setItem('league_participants', JSON.stringify(leagueParticipants));
    }, [leagueParticipants]);

    useEffect(() => {
        localStorage.setItem('league_max_battles', maxBattlesPerPerson.toString());
    }, [maxBattlesPerPerson]);


    // LEAGUE LOGIC: Add Participant
    const addParticipant = () => {
        if (!newParticipantName.trim()) return;

        // VALIDATION: Check if user is in availableUsers
        const userExists = availableUsers.some(u => u.username.toLowerCase() === newParticipantName.trim().toLowerCase());

        if (!userExists) {
            alert("Solo se pueden agregar usuarios registrados y aprobados. Verifica que el usuario exista en la lista.");
            return;
        }

        const nameUpper = newParticipantName.trim().toUpperCase();

        if (leagueParticipants.some(p => p.name === nameUpper)) {
            alert("Este participante ya está en la liga");
            return;
        }

        setLeagueParticipants(prev => [
            ...prev,
            {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: nameUpper,
                points: 0,
                battles: 0,
                active: true
            }
        ]);
        setNewParticipantName('');
    };

    // LEAGUE LOGIC: Remove Participant
    const removeParticipant = (id: string) => {
        setLeagueParticipants(prev => prev.filter(p => p.id !== id));
    };

    // LEAGUE LOGIC: Update Points & Battles
    const updateLeagueStats = (winnerName: string, loserName: string, isTieBreaker: boolean) => {
        setLeagueParticipants(prev => prev.map(p => {
            // CHECK IF THIS PLAYER IS THE WILDCARD OPPONENT
            const isWildcard = (p.name === currentWildcardOpponent);

            if (p.name === winnerName) {
                const pointsToAdd = isTieBreaker ? 2 : 3;

                // If Wildcard: Increment POINTS but NOT BATTLES
                if (isWildcard) {
                    return {
                        ...p,
                        points: p.points + pointsToAdd
                        // battles and active status remain unchanged
                    };
                }

                const newBattles = p.battles + 1;
                return {
                    ...p,
                    points: p.points + pointsToAdd,
                    battles: newBattles,
                    active: isLeagueMode ? (newBattles < maxBattlesPerPerson) : p.active
                };
            }
            if (p.name === loserName) {
                const pointsToAdd = isTieBreaker ? 1 : 0;

                // If Wildcard: Increment POINTS (if any) but NOT BATTLES
                if (isWildcard) {
                    return {
                        ...p,
                        points: p.points + pointsToAdd
                        // battles and active status remain unchanged
                    };
                }

                const newBattles = p.battles + 1;
                return {
                    ...p,
                    points: p.points + pointsToAdd,
                    battles: newBattles,
                    active: isLeagueMode ? (newBattles < maxBattlesPerPerson) : p.active
                };
            }
            return p;
        }));
    };

    // LEAGUE LOGIC: Start Battle (Standard or Wildcard)
    const handleStartLeagueBattle = () => {
        const active = leagueParticipants.filter(p => p.active);

        // Allow if at least 2 active OR 1 active (who needs a wildcard from inactives)
        // If only 1 active, we check if there are ANY other participants (even inactive) to serve as wildcard.
        if (active.length < 2) {
            const canTriggerWildcard = active.length === 1 && leagueParticipants.length > 1;

            if (!canTriggerWildcard) {
                alert("Necesitas al menos 2 participantes para iniciar, o 1 activo y otros disponibles para comodín.");
                return;
            }
        }

        // 1. FAIRNESS LOGIC: Filter by Minimum Battles Played
        // If we are here with only 1 active, minBattles will be theirs.
        const minBattles = Math.min(...active.map(p => p.battles));
        const candidates = active.filter(p => p.battles === minBattles);

        // SCENARIO A: Standard Pair available in current round
        if (candidates.length >= 2) {
            // Random Pair from Candidates
            const shuffled = [...candidates];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            startRouletteSequence(shuffled[0].name, shuffled[1].name, candidates);
        }
        // SCENARIO B: Odd one out (Needs Comodín from upper rounds)
        else if (candidates.length === 1) {
            const pending = candidates[0];

            // Pool: Everyone else who has played more (active players excluding pending)
            // Basically anyone who is NOT the pending player is a valid wildcard candidate (including inactive players who finished)
            const opponentsPool = leagueParticipants.filter(p => p.id !== pending.id);

            if (opponentsPool.length === 0) {
                alert("Error: No hay nadie disponible para ser comodín.");
                return;
            }

            // Logic: Prioritize those with Lowest Points
            const minPoints = Math.min(...opponentsPool.map(p => p.points));
            const bestOpponents = opponentsPool.filter(p => p.points === minPoints);

            // Trigger Visual Sorteo
            setWildcardPending(pending);
            setWildcardPool(bestOpponents);
            setShowWildcard(true);
        }
    };

    const startRouletteSequence = (nameA: string, nameB: string, animationPool: LeagueParticipant[]) => {
        setIsRouletteSpinning(true);
        setRouletteWinner(null);

        // Roulette Animation
        let spins = 0;
        const maxSpins = 20;
        const interval = setInterval(() => {
            // Visual noise: pick random names from the pool for effect
            const randomA = animationPool[Math.floor(Math.random() * animationPool.length)].name;
            const randomB = animationPool[Math.floor(Math.random() * animationPool.length)].name;
            setRouletteNames({ A: randomA, B: randomB });
            spins++;

            if (spins >= maxSpins) {
                clearInterval(interval);
                setRouletteNames({ A: nameA, B: nameB }); // Land on result
                setRouletteWinner({ A: nameA, B: nameB });

                // Auto-advance
                setTimeout(() => {
                    setRivalA(nameA);
                    setRivalB(nameB);
                    setIsRouletteSpinning(false);
                    setRouletteWinner(null);
                    handleNamesSubmit(nameA, nameB);
                }, 2000);
            }
        }, 100);
    };

    const handleWildcardSelect = (opponent: LeagueParticipant) => {
        if (!wildcardPending) return;

        setShowWildcard(false);
        // Start battle directly (or with short roulette logic if preferred, but direct is smoother after the raffle)
        // Let's use the roulette sequence but with length 1 to just "show" them, or just set them.
        // Actually, just setting them is fine, the hype was the Comodin Selector.

        setRivalA(wildcardPending.name);
        setRivalB(opponent.name);
        setCurrentWildcardOpponent(opponent.name); // MARK AS WILDCARD
        handleNamesSubmit(wildcardPending.name, opponent.name);

        // Reset
        setTimeout(() => {
            setWildcardPending(null);
            setWildcardPool([]);
        }, 500);
    };

    // FIREBASE SYNC HOOK
    const { updateGameState, triggerAnimation, voteData, resetVotes } = useFirebaseSync(isSpectator);

    // Sync remote votes to local state (Source of Truth is now Firebase)
    useEffect(() => {
        if (isSpectator) return;
        setVotesA(voteData.votesA);
        setVotesB(voteData.votesB);
        setVotesReplica(voteData.votesReplica);
        setVoteHistory(voteData.history);
        setVotedUsers(new Set(voteData.votedUsers));
    }, [voteData, isSpectator]);

    // BROADCAST STATE TO SPECTATOR (VIA FIREBASE)
    useEffect(() => {
        if (isSpectator) return; // Spectator doesn't broadcast
        if (authStep !== 'app') return; // Don't broadcast until logged in!

        // Define payload generator to reuse
        const getPayload = (): import('./types').SpectatorState => ({
            step, rivalA, rivalB, winner,
            selectedFormat, selectedMode, selectedGenre,
            preGeneratedTopic, preGeneratedImage: null, // Removed
            preGeneratedPool,
            countdown, isReplica, loserImage, showWinnerScreen,
            votingBg: null, // Removed
            currentSlotValues: tempSlotValues,
            spinAttempts: attempts,
            league: { maxBattlesPerPerson, participants: leagueParticipants, isLeagueMode },
            showLeagueTable
        });

        // Broadcast on change
        if (!isFlickering) {
            updateGameState(getPayload());
        }
    }, [isSpectator, authStep, step, rivalA, rivalB, winner, selectedFormat, selectedMode, selectedGenre, preGeneratedTopic, preGeneratedPool, countdown, isReplica, loserImage, showWinnerScreen, tempSlotValues, attempts, isFlickering, updateGameState, maxBattlesPerPerson, leagueParticipants, isLeagueMode, showLeagueTable]);

    // Safety: Ensure transition doesn't get stuck
    useEffect(() => {
        if (isTransitioning) {
            const timer = setTimeout(() => {
                setIsTransitioning(false);
            }, 2000); // Force off after 2s max
            return () => clearTimeout(timer);
        }
    }, [isTransitioning]);

    // Centralized Navigation with Lightning Effect
    const changeStepWithTransition = (nextStep: AppStep) => {
        setIsTransitioning(true);

        // Change content MID-ANIMATION (while screen is flashed white) to hide the swap
        setTimeout(() => {
            setStep(nextStep);
        }, 350);

        // Remove overlay after animation completes
        setTimeout(() => {
            setIsTransitioning(false);
        }, 850);
    };

    const handleNamesSubmit = (leagueA?: any, leagueB?: string) => {
        // If coming from League (passed explicitly), use those names safely
        if (typeof leagueA === 'string' && typeof leagueB === 'string') {
            setRivalA(leagueA); // Ensure State is force updated
            setRivalB(leagueB);
        } else {
            // Normal manual flow logic: Only set defaults if state is truly empty
            if (!rivalA) setRivalA("BUFÓN MORADO");
            if (!rivalB) setRivalB("BUFÓN AZUL");
        }
        setAttempts(3); // Reset attempts when starting new

        // Reset Votes for new battle
        resetVotes();
        setVotesA(0);
        setVotesB(0);
        setVotesReplica(0);
        setVotedUsers(new Set());
        votedUsersRef.current = new Set();
        setVoteHistory([]);

        changeStepWithTransition('slots');
    };

    const handleRouletteComplete = (format: TrainingFormat, mode: TrainingMode, genre: BeatGenre) => {
        setSelectedFormat(format);
        setSelectedMode(mode);
        setSelectedGenre(genre);
        // Wait a tiny bit to see the result then move
        setTimeout(() => {
            changeStepWithTransition('summary');
        }, 500);
    };

    // Pre-generate content when entering Summary step
    useEffect(() => {
        if (step === 'summary') {
            const prepareContent = async () => {
                setIsPreGenerating(true);
                setPreGeneratedTopic(null);
                setPreGeneratedPool([]);

                if (selectedMode === 'role_play') {
                    // Pick random roles for the pool
                    const shuffled = [...ROLES].sort(() => 0.5 - Math.random());
                    // Format: "ROLE|DESCRIPTION"
                    const formattedPool = shuffled.slice(0, 40).map(r => `${r.title}|${r.description}`);
                    setPreGeneratedPool(formattedPool);
                    setPreGeneratedTopic(formattedPool[0]);
                    setIsPreGenerating(false);
                    return;
                }

                if (selectedMode === 'structure_easy') {
                    const patterns = ['A A B A', 'A B A B', 'A B B A', 'A A B B'];
                    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
                    setPreGeneratedPool(patterns);
                    setPreGeneratedTopic(randomPattern);
                    setIsPreGenerating(false);
                    return;
                }

                if (selectedMode === 'structure_hard') {
                    const patterns = ['A A BBB A', 'AB AB AB AB'];
                    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
                    setPreGeneratedPool(patterns);
                    setPreGeneratedTopic(randomPattern);
                    setIsPreGenerating(false);
                    return;
                }

                if (selectedMode === 'structure_duplas') {
                    const patterns = ['A B A A', 'A B B A', 'A A B A', 'B B A A'];
                    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
                    setPreGeneratedPool(patterns);
                    setPreGeneratedTopic(randomPattern);
                    setIsPreGenerating(false);
                    return;
                }

                if (selectedMode === 'themes') {
                    // Generate topics, pick one
                    const topics = await generateTopics(40);
                    setPreGeneratedPool(topics);
                    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
                    setPreGeneratedTopic(randomTopic);

                } else if (selectedMode === 'terminations') {
                    const terms = await generateTerminations(40);
                    setPreGeneratedPool(terms); // Save full list
                    const randomTerm = terms[Math.floor(Math.random() * terms.length)];
                    setPreGeneratedTopic(randomTerm);

                } else if (selectedMode === 'questions') {
                    const questions = await generateQuestions(20);
                    setPreGeneratedPool(questions);
                    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
                    setPreGeneratedTopic(randomQuestion);

                } else if (selectedMode === 'characters') {
                    const battles = await generateCharacterBattles(20);
                    setPreGeneratedPool(battles);
                    const randomBattle = battles[Math.floor(Math.random() * battles.length)];
                    setPreGeneratedTopic(randomBattle);

                } else if (selectedMode === 'news') {
                    const news = await fetchLatestNews(20);
                    // Store full news items as stringified JSON in the pool to pass them cleanly
                    // Format: "TITLE|SOURCE|DESCRIPTION" (Simplified for basic pool usage, or JSON)
                    // Let's use JSON string for safety
                    const formattedNews = news.map(n => JSON.stringify(n));
                    setPreGeneratedPool(formattedNews);
                    if (formattedNews.length > 0) {
                        // Pick a random news item initially so it's not always the same one
                        const randomIndex = Math.floor(Math.random() * formattedNews.length);
                        setPreGeneratedTopic(formattedNews[randomIndex]);
                    } else {
                        setPreGeneratedTopic(JSON.stringify({ title: "No hay noticias recientes", source: "System" }));
                    }
                }
                setIsPreGenerating(false);
            };
            prepareContent();

            // Auto open beat player
            if (selectedGenre) {
                setIsBeatPlayerOpen(true);
                setIsBeatSelected(false); // Reset selection on new spin
            }
        }
    }, [step, selectedMode, selectedGenre]);

    // --- RENDER ACCESS SCREEN IF NOT AUTHENTICATED ---
    if (!isAuthenticated && !isSpectator) {
        return (
            <>
                <AccessScreen
                    onAdminLogin={() => handleLogin({ username: 'Admin', status: 'approved', createdAt: Date.now() })}
                    onSpectatorLogin={(name) => {
                        setViewerName(name);
                        setIsSpectator(true);
                    }}
                />
                {deferredPrompt && (
                    <div className="fixed bottom-6 right-6 z-[9999] animate-bounce">
                        <button
                            onClick={handleInstallClick}
                            className="bg-green-600/90 backdrop-blur-md border border-green-500 hover:bg-green-500 hover:scale-105 text-white p-4 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all flex items-center gap-2 font-bold uppercase tracking-wider"
                            title="Instalar Aplicación"
                        >
                            <Download size={24} />
                            <span className="hidden md:inline">Instalar App</span>
                        </button>
                    </div>
                )}
            </>
        );
    }

    const resetApp = () => {
        setStep('names');
        setSelectedFormat(null);
        setSelectedGenre(null);
        setPreGeneratedTopic(null);
        setPreGeneratedPool([]);
        setTempSlotValues(null); // Clear temp values
        setWinner(null);
        setShowWinnerScreen(false);
        setRivalA('');
        setRivalB('');
        setCurrentWildcardOpponent(null); // Reset flag

        if (laughAudioRef.current) {
            laughAudioRef.current.pause();
            laughAudioRef.current.currentTime = 0;
        }
        setLoserImage(null);
        setIsReplica(false);
        setPulseRed(false);
        // Reset votes
        setVotesA(0);
        setVotesB(0);
        setVotesReplica(0);
        setVotedUsers(new Set()); // Reset unique voters
        votedUsersRef.current = new Set(); // Reset Ref also
        setVoteHistory([]); // Clear visual history
    };

    const openYoutubeBeat = () => {
        if (!selectedGenre) return;
        setIsBeatPlayerOpen(true);
    };

    const handleStartBattle = () => {
        triggerCountdown();
    };

    const handleFinishBattle = () => {
        setIsBeatPlayerOpen(false); // Stop Beat
        changeStepWithTransition('voting');
    };

    const handleVote = (vote: 'A' | 'B') => {
        setWinner(vote);
        setIsFlickering(true);

        // Play Glitch Axe Sound (Seek to 2nd chop at ~1.5s to be safe and catch the impact at 2s)
        const axeSound = new Audio('/sounds/glitch-axe.mp3');
        axeSound.currentTime = 1.35; // Fine tuned to skip first chop (~1s) but catch the swing of the second
        axeSound.volume = 0.8;
        axeSound.play().catch(e => console.error("Audio play failed", e));

        // LEAGUE UPDATE LOGIC
        if (isLeagueMode) {
            // Determine names. rivalA/rivalB should be consistent
            let winnerName = '';
            let loserName = '';
            if (vote === 'A') {
                winnerName = rivalA;
                loserName = rivalB;
            } else {
                winnerName = rivalB;
                loserName = rivalA;
            }

            // Only update if we haven't already shown winner (prevent double points if click multiple times)
            if (!showWinnerScreen && !winner) {
                updateLeagueStats(winnerName, loserName, isReplica);
            }
        }

        // Select Random Loser Image Pool
        let pool: string[] = [];
        if (vote === 'A') {
            // A wins, B Loses (AZUL)
            pool = ['AZUL PIERDE 1.png', 'AZUL PIERDE 2.png', 'AZUL PIERDE 3.png'];
        } else {
            // B wins, A Loses (MORADO)
            pool = ['MORADO PIERDE 1.png', 'MORADO PIERDE 2.png', 'MORADO PIERDE 3.png'];
        }

        // Select Final Loser Image
        const randomImg = pool[Math.floor(Math.random() * pool.length)];
        const finalPath = `/loser-images/${encodeURIComponent(randomImg)}`;

        // BROADCAST TRIGGER for Spectator Synchronization
        triggerAnimation('WIN_ANIMATION_TRIGGER', { winner: vote, loserImage: finalPath });
        setLoserImage(finalPath); // Start with Loser

        let flickerCount = 0;
        const totalFlickers = 8; // More glitch duration (8 * 50ms = 400ms + overhead)
        const flickerSpeed = 50; // Ultra fast strobe

        const interval = setInterval(() => {
            // Toggle Logic
            flickerCount++;

            if (flickerCount % 2 !== 0) {
                setLoserImage(null);
            } else if (flickerCount >= totalFlickers) {
                clearInterval(interval);
                setIsFlickering(false); // Stop flickering

                // Set FINAL image
                // Set FINAL image
                setLoserImage(finalPath);

                // Play Evil Laugh with Fade In/Out
                if (laughAudioRef.current) {
                    laughAudioRef.current.pause();
                    laughAudioRef.current.currentTime = 0;
                }
                const audio = new Audio('/sounds/evil-laugh.mp3');
                laughAudioRef.current = audio;
                audio.volume = 0;
                audio.play().catch(e => console.error("Laugh audio fail", e));

                // Fade In (0 -> 1 over 1.5s)
                let vol = 0;
                const fadeIn = setInterval(() => {
                    vol = Math.min(1, vol + 0.1);
                    if (laughAudioRef.current) laughAudioRef.current.volume = vol;
                    if (vol >= 1) clearInterval(fadeIn);
                }, 150);

                // Schedule Fade Out (Start at 2.5s, go 1 -> 0 over 1.5s)
                setTimeout(() => {
                    const fadeOut = setInterval(() => {
                        if (laughAudioRef.current) {
                            laughAudioRef.current.volume = Math.max(0, laughAudioRef.current.volume - 0.1);
                            if (laughAudioRef.current.volume <= 0) clearInterval(fadeOut);
                        } else {
                            clearInterval(fadeOut);
                        }
                    }, 150);
                }, 2500);

                // Trigger Red Pulse Border
                setPulseRed(true);
            }
        }, flickerSpeed);

        // Wait for execution animation to finish before showing the winner screen
        // Total time reduced slightly as requested
        setTimeout(() => {
            if (laughAudioRef.current) {
                laughAudioRef.current.pause();
                laughAudioRef.current.currentTime = 0;
            }
            setShowWinnerScreen(true);

            // Play Victory Trumpet (Seek to 0.5s where sound likely starts)
            const trumpet = new Audio('/sounds/victory-trumpet.mp3');
            trumpet.currentTime = 0.5;
            trumpet.play().catch(e => console.error("Trumpet play failed", e));
        }, 4500);
    };

    const handleReplica = () => {
        setIsReplica(true);
        // RESET VOTES FOR REPLICA
        resetVotes();
        setVotesA(0);
        setVotesB(0);
        setVotedUsers(new Set()); // Allow re-voting
        votedUsersRef.current = new Set(); // Reset Ref for Replica
        setVoteHistory([]); // Clear visual history

        // Logic for Random Replica is now handled in SlotMachine.tsx via isReplica prop
        // It will force 4x4 and Random Mode (Step 289 request)
        changeStepWithTransition('slots');
    };

    const triggerCountdown = () => {
        if (countdown) return;

        let count = 3;
        setCountdown(count.toString());

        // Faster countdown (400ms instead of 600ms)
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count.toString());
            } else if (count === 0) {
                setCountdown("¡TIEMPO!");
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setCountdown(null);
                    setStep('arena'); // Switch to Arena AFTER countdown
                }, 400);
            }
        }, 400);
    };

    // Determine background to use (Generated or Fallback)
    const bgToUse = "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=1920&auto=format&fit=crop";

    // --- CONDITIONAL RENDERING (Placed at end to respect Hooks Rule) ---

    // 1. Login Screen
    if (authStep === 'login') {
        return (
            <AccessScreen
                onAdminLogin={() => {
                    setIsSpectator(false);
                    setAuthStep('app');
                }}
                onSpectatorLogin={(name) => {
                    setIsSpectator(true);
                    setViewerName(name);
                    setAuthStep('app');
                }}
            />
        );
    }

    // 2. Spectator View
    if (isSpectator) {
        return <SpectatorView viewerName={viewerName} />;
    }

    // 3. Main App (Admin)
    return (
        <div className={`min-h-screen bg-gradient-to-b text-white p-4 md:p-6 lg:p-8 overflow-x-hidden relative flex flex-col ${isReplica && step === 'slots' ? 'from-red-950 to-black' : 'from-[#1a0b2e] to-[#0d001a]'}`}>

            {/* QR CODE - PERMANENT IN ADMIN VIEW */}
            <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none opacity-80 mix-blend-screen">
                <img
                    src="/qr_scan_me.png"
                    alt="Scan QR"
                    className="w-32 md:w-48 transition-all hover:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)] rounded-lg bg-white p-2"
                />
            </div>

            {/* --- TOP RIGHT BUTTONS --- */}
            <div className={`fixed top-4 right-4 z-[90] flex items-center gap-2 transition-all duration-300 ${isBeatPlayerOpen ? 'translate-x-[-340px] md:translate-x-[-460px]' : ''}`}>
                {/* VOLVER BUTTON - Only show in Slots */}
                {step === 'slots' && !isReplica && (
                    <button
                        onClick={() => changeStepWithTransition('names')}
                        className="bg-black/40 backdrop-blur-md border border-purple-500/50 hover:bg-purple-900/50 hover:border-purple-400 text-white p-3 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all transform hover:scale-105"
                        title="Volver"
                    >
                        <RotateCcw size={24} className="-rotate-90" />
                    </button>
                )}
                {/* TOURNAMENT BUTTON */}
                <button
                    onClick={() => setShowTournamentModal(true)}
                    className="bg-black/40 backdrop-blur-md border border-yellow-500/50 hover:bg-yellow-900/50 hover:border-yellow-400 text-yellow-200 p-3 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all transform hover:scale-105"
                    title="Modo Torneo"
                >
                    <Trophy size={24} />
                </button >

                {/* MANUAL/INFO BUTTON */}
                <button
                    onClick={() => setShowInfoModal(true)}
                    className="bg-black/40 backdrop-blur-md border border-purple-500/50 hover:bg-purple-900/50 hover:border-green-400 text-purple-200 p-3 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all transform hover:scale-105"
                    title="Ver opciones disponibles"
                >
                    <List size={24} />
                </button>

                {/* EDITOR MODE TOGGLE */}
                {step === 'slots' && (
                    <button
                        onClick={() => setIsEditorMode(!isEditorMode)}
                        className={`bg-black/40 backdrop-blur-md border ${isEditorMode ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-gray-600 text-gray-400'} p-3 rounded-full shadow-lg transition-all transform hover:scale-105`}
                        title="Modo Editor (Pruebas)"
                    >
                        <Settings size={24} />
                    </button>
                )}

                {/* USER MANAGEMENT BUTTON - Admin Only */}
                {!isSpectator && (
                    <button
                        onClick={() => setShowUserModal(true)}
                        className="bg-black/40 backdrop-blur-md border border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-400 text-cyan-200 p-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all transform hover:scale-105"
                        title="Administrar Usuarios"
                    >
                        <Users size={24} />
                    </button>
                )}

                {/* LOGOUT BUTTON - Visible for everyone logged in */}
                {(isAuthenticated || isSpectator) && (
                    <button
                        onClick={handleLogout}
                        className="bg-black/40 backdrop-blur-md border border-red-500/50 hover:bg-red-900/50 hover:border-red-400 text-red-200 p-3 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all transform hover:scale-105"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={24} />
                    </button>
                )}

                {/* PWA INSTALL BUTTON */}
                {deferredPrompt && (
                    <button
                        onClick={handleInstallClick}
                        className="bg-green-600/80 backdrop-blur-md border border-green-500 hover:bg-green-500 hover:scale-105 text-white p-3 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all animate-bounce"
                        title="Instalar Aplicación"
                    >
                        <Download size={24} />
                    </button>
                )}
            </div >



            {/* LEAGUE ROULETTE OVERLAY */}
            {
                isRouletteSpinning && (
                    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fadeIn">
                        <h2 className="text-4xl md:text-5xl font-urban text-yellow-400 mb-12 tracking-widest uppercase animate-pulse drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                            SELECCIONANDO RIVALES...
                        </h2>

                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-20">
                            {/* CARD A (Purple - Was Blue) */}
                            <div className={`w-64 h-80 border-4 ${rouletteWinner ? 'border-purple-500 bg-purple-900/20 shadow-[0_0_50px_rgba(168,85,247,0.5)] scale-110' : 'border-gray-700 bg-gray-900/50'} rounded-3xl flex flex-col items-center justify-center p-6 transition-all duration-300 relative overflow-hidden`}>
                                <div className="text-6xl mb-4 opacity-50"><User size={64} /></div>
                                <div className={`text-3xl font-black text-center uppercase tracking-wider ${rouletteWinner ? 'text-purple-300' : 'text-gray-500'}`}>
                                    {rouletteNames.A}
                                </div>
                                {rouletteWinner && <div className="absolute inset-0 border-4 border-purple-400 animate-ping rounded-3xl"></div>}
                            </div>

                            {/* VS */}
                            <div className="w-20 h-20 bg-black border-2 border-purple-500 rotate-45 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-spin-slow">
                                <span className="-rotate-45 text-3xl font-black text-white italic">VS</span>
                            </div>

                            {/* CARD B (Blue - Was Red) */}
                            <div className={`w-64 h-80 border-4 ${rouletteWinner ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_50px_rgba(59,130,246,0.5)] scale-110' : 'border-gray-700 bg-gray-900/50'} rounded-3xl flex flex-col items-center justify-center p-6 transition-all duration-300 relative overflow-hidden`}>
                                <div className="text-6xl mb-4 opacity-50"><User size={64} /></div>
                                <div className={`text-3xl font-black text-center uppercase tracking-wider ${rouletteWinner ? 'text-blue-300' : 'text-gray-500'}`}>
                                    {rouletteNames.B}
                                </div>
                                {rouletteWinner && <div className="absolute inset-0 border-4 border-blue-400 animate-ping rounded-3xl"></div>}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* LEAGUE TABLE FLOATING BUTTON */}
            {
                isLeagueMode && !showLeagueTable && (
                    <div className="fixed bottom-4 right-4 z-[90]">
                        <button
                            onClick={() => setShowLeagueTable(true)}
                            className="bg-purple-900/90 backdrop-blur-md border md:border-2 border-purple-500 hover:bg-purple-800 text-white p-3 md:p-4 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                            <Award size={24} className="text-yellow-400" />
                            <span className="hidden md:block font-bold uppercase text-xs tracking-widest">Tabla Liga</span>
                        </button>
                    </div>
                )
            }

            {/* LEAGUE TABLE OVERLAY */}
            {
                showLeagueTable && (
                    <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-[#1a0b2e] w-full max-w-4xl max-h-[90vh] rounded-2xl border-2 border-yellow-600 shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden flex flex-col relative">
                            <div className="p-6 border-b border-purple-800 flex justify-between items-center bg-purple-950/50">
                                <div className="flex items-center gap-3">
                                    <Award className="text-yellow-400" size={32} />
                                    <h2 className="text-2xl font-urban text-white tracking-widest uppercase">POSICIONES DE LA LIGA</h2>
                                </div>
                                <button onClick={() => setShowLeagueTable(false)} className="text-gray-400 hover:text-white"><X size={28} /></button>
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
                                        {[...leagueParticipants].sort((a, b) => b.points - a.points || b.battles - a.battles).map((p, idx) => (
                                            <tr key={p.id} className={`border-b border-purple-800/30 hover:bg-purple-800/20 transition-colors ${!p.active ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="p-4 font-bold text-gray-500">#{idx + 1}</td>
                                                <td className="p-4 font-black text-lg uppercase flex items-center gap-2">
                                                    {idx === 0 && <Crown size={16} className="text-yellow-400" fill="currentColor" />}
                                                    {p.name}
                                                    {!p.active && <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-800 ml-2">COMPLETADO</span>}
                                                </td>
                                                <td className="p-4 text-center font-mono text-blue-300">{p.battles} / {maxBattlesPerPerson}</td>
                                                <td className="p-4 text-right font-black text-xl text-yellow-400">{p.points}</td>
                                            </tr>
                                        ))}
                                        {leagueParticipants.length === 0 && (
                                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">Aún no hay participantes inscritos.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* TOURNAMENT MODAL - Persisted using 'hidden' class to prevent unmount and state loss */}
            <div className={`fixed inset-0 z-[160] bg-black/95 backdrop-blur-lg items-center justify-center p-4 animate-fadeIn ${showTournamentModal ? 'flex' : 'hidden'}`}>
                <div className="bg-[#1a0b2e] w-full max-w-6xl h-[90vh] rounded-2xl border-2 border-yellow-600 shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden flex flex-col relative">
                    <div className="absolute top-4 right-4 z-50">
                        <button
                            onClick={() => setShowTournamentModal(false)}
                            className="text-gray-400 hover:text-white hover:bg-red-500/20 p-2 rounded-full transition-colors"
                        >
                            <X size={28} />
                        </button>
                    </div>
                    <TournamentBracket />
                </div>
            </div>

            {/* INFO MODAL OVERLAY */}
            {
                showInfoModal && (
                    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-[#1a0b2e] w-full max-w-4xl max-h-[90vh] rounded-2xl border-2 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.5)] overflow-hidden flex flex-col relative">

                            {/* Modal Header */}
                            <div className="p-6 border-b border-purple-800 flex justify-between items-center bg-purple-950/50">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="text-green-400" />
                                    <h2 className="text-2xl font-urban text-white tracking-widest uppercase">Manual de Juego</h2>
                                </div>
                                <button
                                    onClick={() => setShowInfoModal(false)}
                                    className="text-gray-400 hover:text-white hover:bg-red-500/20 p-2 rounded-full transition-colors"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* Column 1: Formats */}
                                <div className="space-y-4">
                                    <h3 className="text-purple-300 font-bold uppercase tracking-widest border-b border-purple-700 pb-2">Formatos</h3>
                                    <div className="space-y-2">
                                        {Object.values(TrainingFormat).map((fmt) => (
                                            <div key={fmt} className="bg-purple-900/20 p-3 rounded-lg border border-purple-800/50 text-gray-200 text-sm font-bold flex justify-between">
                                                <span>{fmt}</span>
                                                <span className="text-purple-400 text-xs">{ENTRADAS_RULES[fmt]?.replace(' Entradas por MC', 'e')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Column 2: Stimuli */}
                                <div className="space-y-4">
                                    <h3 className="text-pink-300 font-bold uppercase tracking-widest border-b border-pink-700 pb-2">Estímulos</h3>
                                    <div className="space-y-2">
                                        {ALL_TRAINING_MODES.map((mode) => (
                                            <div key={mode} className="bg-pink-900/20 p-3 rounded-lg border border-pink-800/50 text-gray-200 text-sm font-bold capitalize">
                                                {MODE_TRANSLATIONS[mode] || mode}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Column 3: Beats */}
                                <div className="space-y-4">
                                    <h3 className="text-blue-300 font-bold uppercase tracking-widest border-b border-blue-700 pb-2">Estilos de Beat</h3>
                                    <div className="space-y-2">
                                        {Object.values(BeatGenre).map((beat) => (
                                            <div key={beat} className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/50 text-gray-200 text-sm font-bold">
                                                {beat}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div className="p-4 bg-purple-950/30 text-center text-xs text-gray-500 border-t border-purple-800">
                                Todas las opciones tienen la misma probabilidad en la Ruleta del Destino.
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Transition Overlay (Lightning Effect) */}
            {
                isTransitioning && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
                        {/* Flash Background - Full Opacity to hide transition */}
                        <div className="absolute inset-0 bg-white animate-flash-storm mix-blend-overlay"></div>
                        <div className={`absolute inset-0 animate-flash-storm ${isReplica ? 'bg-red-600' : 'bg-purple-600'}`}></div>

                        {/* Lightning Icon */}
                        <div className="relative z-10 animate-strike">
                            <Zap size={250} className={`${isReplica ? 'text-red-500' : 'text-purple-500'} drop-shadow-[0_0_80px_currentColor]`} fill="currentColor" />
                        </div>
                    </div>
                )
            }

            {/* Countdown Overlay (Main Battle) */}
            {
                countdown && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fadeInFast">
                        <h1 className="text-6xl sm:text-8xl md:text-[10rem] lg:text-[15rem] font-black font-urban text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-pink-500 to-indigo-600 drop-shadow-[0_10px_20px_rgba(168,85,247,0.5)] animate-scale-up tracking-tighter text-center break-words max-w-full px-4">
                            {countdown}
                        </h1>
                    </div>
                )
            }

            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">

                {/* Header - Hide during voting AND Arena to clean up UI */}
                {step !== 'voting' && step !== 'arena' && (
                    <header className="text-center py-2 relative mb-0 flex flex-col items-center">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] blur-[100px] -z-10 rounded-full pointer-events-none ${isReplica ? 'bg-red-600/20' : 'bg-purple-600/10'}`}></div>

                        {/* Crown Logo */}
                        <div className="relative mb-2 animate-float">
                            <Crown size={48} className={`${isReplica ? 'text-red-500' : 'text-yellow-400'} drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]`} fill={isReplica ? "rgba(220,38,38,0.2)" : "rgba(250,204,21,0.2)"} />
                        </div>

                        <h1 className="text-4xl md:text-6xl font-urban font-black tracking-widest relative z-10 drop-shadow-[0_0_25px_rgba(168,85,247,0.5)] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 animate-pulse">
                            LA CORTE DEL REY
                        </h1>

                        {/* Simple Breadcrumb (Hidden on Names Step) */}
                        {step !== 'names' && step !== 'slots' && selectedFormat && (
                            <div className="inline-block mt-2 bg-purple-900/80 border border-purple-500 rounded-full px-4 py-1">
                                <p className="text-xs uppercase tracking-widest text-purple-200 font-bold">
                                    {selectedFormat}
                                    {selectedMode && ` • ${MODE_TRANSLATIONS[selectedMode]}`}
                                    {selectedGenre && ` • ${selectedGenre}`}
                                </p>
                            </div>
                        )}
                    </header>
                )}

                {/* Main Content Area */}
                <main className={`flex-1 flex flex-col justify-center animate-fadeIn relative min-h-0 ${step === 'voting' ? 'p-0' : ''} ${step === 'arena' ? 'justify-start md:justify-center' : ''}`}>

                    {/* STEP 0: NAMES INPUT / LEAGUE DASHBOARD */}
                    {step === 'names' && (
                        <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center flex-1 min-h-[50vh] p-4">

                            {/* MODE TOGGLE */}
                            <div className="flex items-center gap-4 mb-8 bg-black/40 p-2 rounded-full border border-purple-500/30">
                                <button
                                    onClick={() => { setIsLeagueMode(false); }}
                                    className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${!isLeagueMode ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Modo Clásico
                                </button>
                                <button
                                    onClick={() => { setIsLeagueMode(true); }}
                                    className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${isLeagueMode ? 'bg-yellow-600 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Modo Liga
                                </button>
                            </div>

                            {!isLeagueMode ? (
                                <>
                                    <h2 className="text-2xl md:text-3xl font-urban text-white mb-8 text-center drop-shadow-lg tracking-widest uppercase animate-pulse px-4">
                                        ¿QUIÉNES BATALLAN HOY?
                                    </h2>

                                    <div className="flex flex-col md:flex-row w-full gap-8 md:gap-4 items-center justify-center mb-10 relative">
                                        {/* Rival A - Purple (Was Blue) */}
                                        <div className="w-full max-w-xs md:max-w-sm relative group z-10">
                                            <div className="absolute inset-0 bg-purple-600/20 rounded-2xl blur-xl group-hover:bg-purple-500/40 transition-all"></div>
                                            <div className="relative bg-black/80 border-2 border-purple-500 p-6 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                                <div className="flex items-center gap-2 mb-2 text-purple-400 font-urban text-xl">
                                                    <User size={24} />
                                                    <span>BUFÓN MORADO</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={rivalA}
                                                    onChange={(e) => setRivalA(e.target.value)}
                                                    placeholder="MC 1"
                                                    className="w-full bg-transparent border-b-2 border-purple-800 focus:border-purple-400 outline-none text-2xl font-bold text-white py-2 placeholder-purple-900/50 uppercase tracking-wide text-center"
                                                />
                                            </div>
                                        </div>

                                        {/* VS BADGE */}
                                        <div className="relative z-20 md:-mx-6 my-[-10px] md:my-0 flex-shrink-0">
                                            <div className="w-16 h-16 bg-black border-2 border-purple-500 rotate-45 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                                <span className="-rotate-45 text-2xl font-black text-white italic">VS</span>
                                            </div>
                                        </div>

                                        {/* Rival B - Blue (Was Red) */}
                                        <div className="w-full max-w-xs md:max-w-sm relative group z-10">
                                            <div className="absolute inset-0 bg-blue-600/20 rounded-2xl blur-xl group-hover:bg-blue-500/40 transition-all"></div>
                                            <div className="relative bg-black/80 border-2 border-blue-500 p-6 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                                <div className="flex items-center gap-2 mb-2 text-blue-400 font-urban text-xl justify-end">
                                                    <span>BUFÓN AZUL</span>
                                                    <User size={24} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={rivalB}
                                                    onChange={(e) => setRivalB(e.target.value)}
                                                    placeholder="MC 2"
                                                    className="w-full bg-transparent border-b-2 border-blue-800 focus:border-blue-400 outline-none text-2xl font-bold text-white py-2 placeholder-blue-900/50 uppercase tracking-wide text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleNamesSubmit}
                                        className="group relative px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-black text-2xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(168,85,247,0.4)] overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                                        <span className="relative z-10 flex items-center gap-3">
                                            <Swords size={28} />
                                            CONTINUAR
                                        </span>
                                    </button>
                                </>
                            ) : (
                                /* --- LEAGUE DASHBOARD --- */
                                <div className="w-full flex flex-col items-center animate-fadeIn">
                                    <h2 className="text-3xl font-urban text-yellow-400 mb-2 text-center drop-shadow-lg tracking-widest uppercase">
                                        GESTIÓN DE LIGA
                                    </h2>
                                    <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">

                                        {/* LEFT: PARTICIPANTS LIST */}
                                        <div className="lg:col-span-2 bg-[#120520]/80 border border-purple-500/30 rounded-2xl p-6 h-[500px] flex flex-col">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-purple-300 font-bold uppercase text-xs tracking-widest">Participantes ({leagueParticipants.length})</h3>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={maxBattlesPerPerson}
                                                        onChange={(e) => setMaxBattlesPerPerson(parseInt(e.target.value) || 1)}
                                                        className="w-12 bg-black/50 border border-purple-600 text-center text-white rounded text-xs p-1"
                                                        title="Batallas por persona"
                                                    />
                                                    <span className="text-[10px] text-gray-500 uppercase self-center">Batallas/Persona</span>
                                                </div>
                                            </div>

                                            {/* ADD INPUT */}
                                            <div className="flex gap-2 mb-4">
                                                <input
                                                    type="text"
                                                    list="approved-users" // Connect to datalist
                                                    value={newParticipantName}
                                                    onChange={(e) => setNewParticipantName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                                                    placeholder="Nuevo Participante..."
                                                    className="flex-1 bg-black/40 border border-purple-600 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:border-yellow-500 outline-none uppercase"
                                                />
                                                <datalist id="approved-users">
                                                    {availableUsers.map(u => (
                                                        <option key={u.username} value={u.username} />
                                                    ))}
                                                </datalist>

                                                <button
                                                    onClick={addParticipant}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold uppercase text-xs tracking-widest"
                                                >
                                                    Agregar
                                                </button>
                                            </div>

                                            {/* LIST */}
                                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                                {leagueParticipants.length === 0 ? (
                                                    <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
                                                        Agrega MCs para comenzar la liga...
                                                    </div>
                                                ) : (
                                                    leagueParticipants.map(p => (
                                                        <div key={p.id} className={`flex items-center justify-between bg-purple-900/10 border ${p.active ? 'border-purple-500/20' : 'border-red-900/30 bg-red-900/5'} p-3 rounded-lg group hover:bg-purple-900/20 transition-colors`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${p.active ? 'bg-purple-800 text-purple-200' : 'bg-gray-800 text-gray-500'}`}>
                                                                    {p.name.substring(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <p className={`font-bold uppercase ${p.active ? 'text-white' : 'text-gray-500 line-through'}`}>{p.name}</p>
                                                                    <p className="text-[10px] text-gray-400 flex gap-2">
                                                                        <span>PTS: {p.points}</span>
                                                                        <span>BAT: {p.battles}/{maxBattlesPerPerson}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => removeParticipant(p.id)}
                                                                className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* RIGHT: ACTION PANEL */}
                                        <div className="flex flex-col gap-4">
                                            <div className="bg-yellow-900/10 border border-yellow-600/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 flex-1">
                                                <Trophy size={48} className="text-yellow-500 animate-float" />
                                                <div>
                                                    <h3 className="text-yellow-200 font-bold uppercase tracking-widest text-lg">Próxima Batalla</h3>
                                                    <p className="text-xs text-yellow-500/70 mt-1">Sorteo aleatorio entre {leagueParticipants.filter(p => p.active).length} participantes disponibles.</p>
                                                </div>

                                                <button
                                                    onClick={handleStartLeagueBattle}
                                                    disabled={leagueParticipants.filter(p => p.active).length === 0 || (leagueParticipants.filter(p => p.active).length === 1 && leagueParticipants.length === 1)}
                                                    className={`w-full py-6 mt-4 rounded-xl font-black text-2xl uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${(leagueParticipants.filter(p => p.active).length === 0 || (leagueParticipants.filter(p => p.active).length === 1 && leagueParticipants.length === 1)) ? 'bg-gray-800' : 'bg-[#eab308] hover:scale-[1.02] active:scale-[0.98]'}`}
                                                >

                                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 animate-shine opacity-90 group-hover:opacity-100"></div>
                                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>

                                                    <span className="relative z-10 flex items-center gap-3 drop-shadow-md text-black">
                                                        <Trophy size={28} className="animate-bounce-slow" strokeWidth={2.5} />
                                                        SORTEAR & BATALLAR
                                                    </span>
                                                    <span className="relative z-10 text-[10px] bg-black/20 px-3 py-1 rounded-full text-black/80 font-bold uppercase tracking-[0.2em]">
                                                        Generar Enfrentamiento
                                                    </span>
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => setShowLeagueTable(true)}
                                                className="bg-black/40 border border-purple-500/50 hover:bg-purple-900/30 rounded-xl p-4 text-purple-300 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                            >
                                                <List size={16} />
                                                Ver Tabla Completa
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 1 (NEW): ROULETTE / SLOTS */}
                    {step === 'slots' && (
                        <div className="w-full flex flex-col justify-center items-center flex-1 min-h-[60vh] py-0 gap-8 relative">


                            {/* EDITOR MODE PANEL */}
                            {isEditorMode && step === 'slots' && (
                                <div className="absolute top-20 right-4 z-50 bg-black/90 border border-green-500/50 p-6 rounded-2xl shadow-2xl backdrop-blur-xl w-80 animate-fadeIn text-left">
                                    <div className="flex items-center gap-2 mb-4 text-green-400 border-b border-green-500/30 pb-2">
                                        <Settings size={20} />
                                        <h3 className="font-bold uppercase tracking-wider text-sm">Panel de Control</h3>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Format Selector */}
                                        <div>
                                            <label className="text-gray-400 text-xs font-bold uppercase block mb-1">Formato</label>
                                            <select
                                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm focus:border-green-500 outline-none transition-colors"
                                                onChange={(e) => {
                                                    const val = e.target.value as TrainingFormat;
                                                    setTempSlotValues(prev => ({
                                                        format: val,
                                                        mode: prev?.mode || 'themes',
                                                        genre: prev?.genre || BeatGenre.BOOM_BAP
                                                    }));
                                                }}
                                                value={tempSlotValues?.format || ''}
                                            >
                                                <option value="">Seleccionar Formato...</option>
                                                {Object.values(TrainingFormat).map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Mode Selector */}
                                        <div>
                                            <label className="text-gray-400 text-xs font-bold uppercase block mb-1">Estímulo</label>
                                            <select
                                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm focus:border-green-500 outline-none transition-colors"
                                                onChange={(e) => {
                                                    const val = e.target.value as TrainingMode;
                                                    setTempSlotValues(prev => ({
                                                        mode: val,
                                                        format: prev?.format || TrainingFormat.FOUR_BY_FOUR,
                                                        genre: prev?.genre || BeatGenre.BOOM_BAP
                                                    }));
                                                }}
                                                value={tempSlotValues?.mode || ''}
                                            >
                                                <option value="">Seleccionar Estímulo...</option>
                                                {ALL_TRAINING_MODES.map(m => (
                                                    <option key={m} value={m}>{MODE_TRANSLATIONS[m]}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Genre Selector */}
                                        <div>
                                            <label className="text-gray-400 text-xs font-bold uppercase block mb-1">Beat Genre</label>
                                            <select
                                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2 text-sm focus:border-green-500 outline-none transition-colors"
                                                onChange={(e) => {
                                                    const val = e.target.value as BeatGenre;
                                                    setTempSlotValues(prev => ({
                                                        genre: val,
                                                        format: prev?.format || TrainingFormat.FOUR_BY_FOUR,
                                                        mode: prev?.mode || 'themes'
                                                    }));
                                                }}
                                                value={tempSlotValues?.genre || ''}
                                            >
                                                <option value="">Seleccionar Género...</option>
                                                {Object.values(BeatGenre).map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (tempSlotValues?.format && tempSlotValues?.mode && tempSlotValues?.genre) {
                                                    handleRouletteComplete(tempSlotValues.format, tempSlotValues.mode, tempSlotValues.genre);
                                                    setIsEditorMode(false);
                                                } else {
                                                    alert("Por favor selecciona todos los campos");
                                                }
                                            }}
                                            className="w-full mt-2 py-3 bg-green-600 hover:bg-green-500 text-black font-black uppercase rounded-lg shadow-lg hover:shadow-green-500/20 transition-all active:scale-95"
                                        >
                                            FORZAR PROBAR
                                        </button>
                                    </div>
                                </div>
                            )}

                            <SlotMachine
                                isReplica={isReplica}
                                spectator={false}
                                attempts={attempts}
                                setAttempts={setAttempts}
                                rivalA={rivalA}
                                rivalB={rivalB}
                                onSpinStart={() => {
                                    // Play Spin Sound
                                    const audio = new Audio('/sounds/spin.mp3');
                                    audio.volume = 0.5;
                                    audio.play().catch(() => { });
                                }}
                                onSpinFinish={(val) => {
                                    // Play Ding Sound
                                    const audio = new Audio('/sounds/ding.mp3');
                                    audio.volume = 0.6;
                                    audio.play().catch(() => { });
                                }}
                                onComplete={handleRouletteComplete}
                            />
                        </div>
                    )}

                    {/* STEP 2: PRE-BATTLE SUMMARY */}
                    {step === 'summary' && (
                        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center animate-fadeIn">
                            <h2 className="text-4xl font-urban text-white mb-8 text-center drop-shadow-lg">¿LISTO PARA LA BATALLA?</h2>

                            {/* RIVAL VS RIVAL DISPLAY FOR SUMMARY */}
                            {(rivalA || rivalB) && (
                                <div className="flex items-center gap-6 text-3xl md:text-5xl font-black font-urban text-white mb-8 animate-fadeIn">
                                    <span className="text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">{rivalA || 'BUFÓN MORADO'}</span>
                                    <span className="text-gray-400 text-2xl flex flex-col items-center">
                                        <span className="text-sm tracking-widest uppercase">VS</span>
                                    </span>
                                    <span className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">{rivalB || 'BUFÓN AZUL'}</span>
                                </div>
                            )}

                            <div className="w-full bg-purple-900/20 border border-purple-600/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                                <h3 className="text-purple-300 uppercase text-xs font-bold tracking-widest mb-4">Resumen</h3>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-black/40 p-3 rounded-lg">
                                        <p className="text-xs text-gray-400">Formato</p>
                                        <p className="font-bold text-lg text-green-400">{selectedFormat}</p>
                                    </div>
                                    <div className="bg-black/40 p-3 rounded-lg">
                                        <p className="text-xs text-gray-400">Estímulo</p>
                                        <p className="font-bold text-lg text-pink-400">{MODE_TRANSLATIONS[selectedMode] || selectedMode}</p>
                                    </div>
                                    <div className="col-span-2 bg-black/40 p-3 rounded-lg border border-purple-500/30">
                                        <p className="text-xs text-gray-400">Beat Style</p>
                                        <p className="font-bold text-xl text-yellow-400">{selectedGenre}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full">
                                {/* 1. Open Beat */}


                                {/* 2. Start Battle */}
                                <button
                                    onClick={handleStartBattle}
                                    disabled={isPreGenerating}
                                    className={`w-full py-8 mt-4 rounded-xl font-black text-3xl font-urban tracking-wider flex items-center justify-center gap-3 transition-all transform active:scale-95 ${isPreGenerating
                                        ? 'bg-gray-800 text-gray-500 border-2 border-gray-700 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] border-b-8 border-purple-900 hover:scale-[1.02]'
                                        }`}
                                >
                                    {isPreGenerating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-500"></div>
                                            {selectedMode === 'themes' ? 'BUSCANDO TEMÁTICA...' : selectedMode === 'terminations' ? 'BUSCANDO RIMAS...' : selectedMode === 'characters' ? 'PREPARANDO DUELO...' : selectedMode === 'questions' ? 'PENSANDO PREGUNTA...' : selectedMode === 'role_play' ? 'ASIGNANDO ROLES...' : selectedMode === 'structure_easy' || selectedMode === 'structure_hard' ? 'GENERANDO ESTRUCTURA...' : 'BUSCANDO CONCEPTOS...'}
                                        </>
                                    ) : (
                                        <>
                                            <Play size={32} fill="white" />
                                            {!isBeatSelected ? 'INICIAR SIN BEAT' : '¡INICIAR BATALLA!'}
                                        </>
                                    )}
                                </button>
                            </div>

                            {!isReplica && (
                                <button
                                    onClick={() => changeStepWithTransition('slots')}
                                    className="mt-6 text-purple-400 hover:text-white underline text-sm"
                                >
                                    Tirar Ruleta de Nuevo
                                </button>
                            )}
                        </div>
                    )}

                    {/* STEP 5: ARENA (RE-DESIGNED LAYOUT) */}
                    {step === 'arena' && (
                        <div className="w-full h-full flex flex-col md:flex-row items-center md:items-stretch justify-center gap-4 md:gap-6 animate-fadeIn">

                            {/* LEFT COLUMN: RIVAL A (Purple - Was Blue) */}
                            <div className="w-full md:w-1/4 flex md:flex-col justify-between md:justify-center items-center order-2 md:order-1 gap-2 bg-purple-900/10 border border-purple-500/20 rounded-xl p-2 md:p-4">
                                <div className="flex flex-col items-center">
                                    <User size={32} className="text-purple-500 mb-1" />
                                    <h2 className="text-xl md:text-3xl font-black font-urban text-purple-400 text-center uppercase leading-tight break-words max-w-[150px] md:max-w-xs">
                                        {rivalA || "BUFÓN MORADO"}
                                    </h2>
                                </div>
                                <div className="hidden md:block w-1 h-16 bg-purple-500/50 rounded-full my-4"></div>
                                <div className="text-xs text-purple-300 font-bold uppercase tracking-widest rotate-0 md:-rotate-90 whitespace-nowrap">RIVAL 1</div>
                            </div>

                            {/* MIDDLE COLUMN: GENERATOR + CONTROLS */}
                            <div className="w-full md:w-1/2 flex flex-col gap-4 order-1 md:order-2 h-full justify-center">

                                {/* Battle Info Header */}
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

                                <TopicGenerator
                                    mode={selectedMode || 'themes'}
                                    initialTopic={preGeneratedTopic}
                                    initialImage={null}
                                    initialPool={preGeneratedPool}
                                    onGenerate={(newTopic) => {
                                        setPreGeneratedTopic(newTopic);
                                        // Update Firebase State immediately
                                        // The useEffect for broadcast listener should pick this up because preGeneratedTopic is a dependency
                                    }}
                                />

                                {/* CONTROLS (Directly under the box) */}
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    <button
                                        onClick={handleFinishBattle}
                                        className="w-full py-4 rounded-xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] border-b-4 border-purple-900 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105 active:scale-95"
                                    >
                                        <Trophy size={24} />
                                        TERMINAR BATALLA
                                    </button>

                                    <button
                                        onClick={resetApp}
                                        className="text-purple-500 hover:text-white transition-colors flex items-center justify-center gap-2 text-xs uppercase font-bold tracking-widest opacity-60 hover:opacity-100 py-2"
                                    >
                                        <RotateCcw size={14} />
                                        Terminar
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: RIVAL B (Blue - Was Red) */}
                            <div className="w-full md:w-1/4 flex md:flex-col justify-between md:justify-center items-center order-3 md:order-3 gap-2 bg-blue-900/10 border border-blue-500/20 rounded-xl p-2 md:p-4">
                                <div className="flex flex-col items-center">
                                    <User size={32} className="text-blue-500 mb-1" />
                                    <h2 className="text-xl md:text-3xl font-black font-urban text-blue-400 text-center uppercase leading-tight break-words max-w-[150px] md:max-w-xs">
                                        {rivalB || "BUFÓN AZUL"}
                                    </h2>
                                </div>
                                <div className="hidden md:block w-1 h-16 bg-blue-500/50 rounded-full my-4"></div>
                                <div className="text-xs text-blue-300 font-bold uppercase tracking-widest rotate-0 md:rotate-90 whitespace-nowrap">RIVAL 2</div>
                            </div>

                        </div>
                    )}





                    {/* STEP 6: VOTING (NEON JESTER EDITION - BOXED FOR ADMIN) */}
                    {step === 'voting' && (
                        <div className={`relative w-full max-w-4xl aspect-square max-h-[85vh] flex overflow-hidden bg-black rounded-3xl border-4 border-purple-500/30 shadow-2xl animate-fadeIn ${pulseRed ? 'animate-pulse-red-border' : ''} mx-auto my-auto`}>

                            {/* MAIN BACKGROUND IMAGE */}
                            <div className="absolute inset-0 z-0">
                                <img
                                    src={loserImage || "/vs-bg-final.jpg"}
                                    alt="Voting Background"
                                    className={`w-full h-full object-cover object-center ${isFlickering ? 'animate-glitch duration-0' : 'transition-all duration-500'}`}
                                />
                                <div className="absolute inset-0 bg-black/20"></div>

                                {/* LOSER GRAYSCALE TRANSITION OVERLAY */}
                                {winner && !showWinnerScreen && (
                                    <div
                                        className="absolute inset-0 z-10 pointer-events-none"
                                        style={{
                                            clipPath: winner === 'A'
                                                ? 'polygon(95% 0, 100% 0, 100% 100%, 5% 100%)' // B Lost (Right)
                                                : 'polygon(0 0, 95% 0, 5% 100%, 0% 100%)'     // A Lost (Left)
                                        }}
                                    >
                                        <div className="w-full h-full bg-black/70 backdrop-grayscale animate-fade-to-gray opacity-0"></div>
                                    </div>
                                )}
                            </div>

                            {/* CENTRAL VOTING DASHBOARD (Admin Only) */}
                            {!winner && (
                                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl pointer-events-auto flex flex-col items-center gap-6 mt-0">
                                        <h3 className="text-white font-urban uppercase tracking-widest text-xl animate-pulse">Panel de Votación</h3>
                                        <div className="flex items-center gap-8 md:gap-16">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-6xl font-black font-urban text-white element-text-stroke-purple">{votesA}</div>
                                                <span className="text-xs text-purple-400 font-bold tracking-widest">VOTOS</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2"><span className="text-gray-400 font-bold">VS</span></div>
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-6xl font-black font-urban text-white element-text-stroke-blue">{votesB}</div>
                                                <span className="text-xs text-blue-400 font-bold tracking-widest">VOTOS</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center -mt-4 mb-4">
                                            <div className="text-4xl font-black font-urban text-white text-shadow-sm">{votesReplica}</div>
                                            <span className="text-[10px] text-gray-300 font-bold tracking-widest uppercase">RÉPLICA</span>
                                        </div>
                                        <div className="flex gap-4 w-full">
                                            <button
                                                onClick={() => {
                                                    // Determine winner considering Replica votes
                                                    if (votesA > votesB && votesA > votesReplica) {
                                                        handleVote('A');
                                                    } else if (votesB > votesA && votesB > votesReplica) {
                                                        handleVote('B');
                                                    } else {
                                                        // If Replica wins or there's a tie
                                                        handleReplica();
                                                    }
                                                }}
                                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-black uppercase tracking-widest text-shadow-sm shadow-lg hover:scale-105 transition-transform"
                                            >
                                                TERMINAR Y REVELAR
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-1 w-full max-h-[60px] overflow-y-auto items-center">
                                            {voteHistory.length > 0 ? (
                                                voteHistory.map((v, i) => {
                                                    let text = '';
                                                    if (typeof v === 'string') {
                                                        text = v;
                                                    } else {
                                                        const voteTarget = v.vote === 'A'
                                                            ? (v.rivalA || rivalA || 'MC AZUL')
                                                            : v.vote === 'B'
                                                                ? (v.rivalB || rivalB || 'MC ROJO')
                                                                : 'RÉPLICA';
                                                        text = `${v.user} votó por ${voteTarget}`;
                                                    }
                                                    return (
                                                        <span key={i} className={`text-[10px] uppercase font-bold tracking-widest ${i === 0 ? 'text-blue-400 animate-pulse' : 'text-gray-500'}`}>
                                                            {text}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest opacity-60">
                                                    Esperando votos de la audiencia...
                                                </span>
                                            )}

                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RIVAL NAMES OVERLAY (Restored inside Boxed Layout) */}
                            <div className="absolute top-[10%] left-[5%] z-30 pointer-events-none transform -rotate-3 max-w-[40%]">
                                <h2 className="text-3xl md:text-5xl font-black font-urban text-white uppercase leading-[0.9] element-text-stroke-purple animate-epic-pulse-purple break-words">
                                    {rivalA}
                                </h2>
                            </div>
                            <div className="absolute bottom-[10%] right-[5%] z-30 pointer-events-none transform -rotate-3 text-right max-w-[40%] flex flex-col items-end">
                                <h2 className="text-3xl md:text-5xl font-black font-urban text-white uppercase leading-[0.9] element-text-stroke-blue animate-epic-pulse-blue break-words">
                                    {rivalB}
                                </h2>
                            </div>

                            {/* Text Stroke & Animation Styles Injection */}
                            <style>{`
                                .element-text-stroke-purple { -webkit-text-stroke: 2px #a855f7; paint-order: stroke fill; }
                                .element-text-stroke-blue { -webkit-text-stroke: 2px #3b82f6; paint-order: stroke fill; }
                                @keyframes epic-pulse-purple {
                                    0%, 100% { filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.6)); transform: scale(1); }
                                    50% { filter: drop-shadow(0 0 25px rgba(168, 85, 247, 1)); transform: scale(1.05); opacity: 0.9; }
                                }
                                @keyframes epic-pulse-blue {
                                    0%, 100% { filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.6)); transform: scale(1); }
                                    50% { filter: drop-shadow(0 0 25px rgba(59, 130, 246, 1)); transform: scale(1.05); opacity: 0.9; }
                                }
                                .animate-epic-pulse-purple { animation: epic-pulse-purple 3s ease-in-out infinite; }
                                .animate-epic-pulse-blue { animation: epic-pulse-blue 3s ease-in-out infinite reverse; }
                                @keyframes fade-to-gray { from { opacity: 0; backdrop-filter: grayscale(0%); } to { opacity: 1; backdrop-filter: grayscale(100%); } }
                                .animate-fade-to-gray { animation: fade-to-gray 3s forwards; animation-delay: 2.5s; }
                                @keyframes glitch-anim {
                                  0% { filter: contrast(120%) saturate(120%) hue-rotate(0deg); clip-path: inset(0 0 0 0); transform: translate(0); }
                                  20% { filter: contrast(200%) saturate(0%) hue-rotate(90deg) invert(10%); clip-path: inset(10% 0 30% 0); transform: translate(-5px, 2px); }
                                  40% { filter: contrast(150%) saturate(200%) hue-rotate(-90deg); clip-path: inset(50% 0 10% 0); transform: translate(5px, -2px); }
                                  60% { filter: contrast(200%) saturate(0%) invert(20%); clip-path: inset(20% 0 60% 0); transform: translate(-5px, 0); }
                                  80% { filter: contrast(150%) saturate(150%); clip-path: inset(0 0 0 0); transform: translate(0); }
                                  100% { filter: contrast(120%) saturate(120%); clip-path: inset(0 0 0 0); transform: translate(0); }
                                }
                                .animate-glitch { animation: glitch-anim 0.2s infinite linear; }
                                @keyframes pulse-red-border { 0%, 100% { box-shadow: inset 0 0 20px rgba(139, 0, 0, 0); } 50% { box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.8); } }
                                .animate-pulse-red-border { animation: pulse-red-border 1.5s infinite ease-in-out; z-index: 100; pointer-events: none; }
                                @keyframes confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
                                .animate-confetti-fall { animation-name: confetti-fall; animation-timing-function: linear; animation-iteration-count: infinite; }
                                @keyframes trumpet-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                                .animate-trumpet-beat { animation: trumpet-beat 0.6s infinite ease-in-out; }
                                @keyframes fountain-flow { 0% { transform: translate(0, 0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)); opacity: 0; } }
                                .animate-fountain-flow { animation: fountain-flow 1s ease-out infinite; }
                                @keyframes float-trumpet { 0%, 100% { transform: translateY(0) rotate(-10deg) scale(1); } 50% { transform: translateY(-20px) rotate(10deg) scale(1.1); } }
                                .animate-float-trumpet { animation: float-trumpet 3s ease-in-out infinite; }
                                @media (max-width: 768px) { .element-text-stroke-purple, .element-text-stroke-cyan { -webkit-text-stroke: 1px; } }
                            `}</style>

                            {/* REDESIGNED WINNER OVERLAY (CARD STYLE) - Updated Colors */}
                            {showWinnerScreen && winner && (
                                <div className={`absolute inset-0 z-[60] flex items-center justify-center animate-fadeIn bg-black/80 backdrop-blur-sm`}>

                                    {/* WINNER CARD */}
                                    <div className={`relative w-[90%] max-w-sm md:max-w-lg bg-[#1a0b2e] border-4 rounded-3xl p-4 md:p-8 flex flex-col items-center shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-scale-up z-20 overflow-hidden ${winner === 'A' ? 'border-fuchsia-500 shadow-[0_0_50px_rgba(192,38,211,0.5)]' : 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.5)]'}`}>
                                        <div className="mb-4 md:mb-6 relative">
                                            <div className={`absolute inset-0 blur-[40px] ${winner === 'A' ? 'bg-fuchsia-500' : 'bg-cyan-500'}`}></div>
                                            <Crown size={50} className={`relative z-10 md:w-20 md:h-20 ${winner === 'A' ? 'text-fuchsia-100' : 'text-cyan-100'}`} fill="currentColor" />
                                        </div>
                                        <h3 className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-2 text-center">GANADOR INDISCUTIBLE</h3>
                                        <h2 className={`text-4xl md:text-6xl font-black font-urban text-center uppercase leading-none mb-6 break-words w-full ${winner === 'A' ? 'text-fuchsia-400 drop-shadow-[0_0_15px_rgba(192,38,211,0.8)]' : 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]'}`}>
                                            {winner === 'A' ? rivalA : rivalB}
                                        </h2>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                resetApp();
                                            }}
                                            className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[#1a0b2e] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer relative z-[100] pointer-events-auto ${winner === 'A' ? 'bg-fuchsia-500 hover:bg-fuchsia-400' : 'bg-cyan-500 hover:bg-cyan-400'}`}
                                        >
                                            <RotateCcw size={18} />
                                            NUEVA BATALLA
                                        </button>
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
                                                            key={`confetti-l-${i}`}
                                                            className="absolute w-2 h-2 md:w-3 md:h-3 rounded-sm animate-fountain-flow"
                                                            style={{
                                                                backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#ec4899'][i % 5],
                                                                left: 0, top: 0,
                                                                '--tx': `${50 + Math.random() * 200}px`,
                                                                '--ty': `${-100 - Math.random() * 200}px`,
                                                                '--r': `${Math.random() * 720}deg`,
                                                                animationDuration: `${1 + Math.random() * 1.5}s`,
                                                                animationDelay: `${Math.random() * 0.5}s`
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
                                                            key={`confetti-r-${i}`}
                                                            className="absolute w-2 h-2 md:w-3 md:h-3 rounded-sm animate-fountain-flow"
                                                            style={{
                                                                backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#ec4899'][i % 5],
                                                                left: 0, top: 0,
                                                                '--tx': `${50 + Math.random() * 200}px`,
                                                                '--ty': `${-100 - Math.random() * 200}px`,
                                                                '--r': `${Math.random() * 720}deg`,
                                                                animationDuration: `${1 + Math.random() * 1.5}s`,
                                                                animationDelay: `${Math.random() * 0.5}s`
                                                            } as React.CSSProperties}
                                                        ></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main >

                {/* Footer - Hide in Voting */}
                {
                    step !== 'voting' && (
                        <footer className="text-center text-purple-500/60 text-xs py-8 flex flex-col items-center gap-2 mt-auto">
                            <div className="flex items-center gap-2 bg-purple-950/30 px-4 py-2 rounded-full border border-purple-900/50">
                                <Info size={12} />
                                <p>Potenciado por Google Gemini 2.5 Flash & Flash Image</p>
                            </div>
                            <p>© 2026 La Corte del Rey. Diseñado para improvisadores.</p>
                        </footer>
                    )
                }
            </div >

            {/* COMODIN SELECTOR OVERLAY */}
            <ComodinSelector
                isOpen={showWildcard}
                pool={wildcardPool}
                pendingPlayer={wildcardPending}
                onSelect={handleWildcardSelect}
                onClose={() => setShowWildcard(false)}
            />

            {/* Persistent Beat Player */}
            <BeatPlayer
                isOpen={isBeatPlayerOpen}
                onClose={() => setIsBeatPlayerOpen(false)}
                initialQuery={selectedGenre === BeatGenre.ELECTRO ? 'Electrobeat instrumental' : selectedGenre ? `${selectedGenre} instrumental freestyle` : ''}
                onVideoSelect={() => setIsBeatSelected(true)}
            />






            <style>{`
        /* ANIMATED SHINE TEXT - BLUE TO RED with MOVING WHITE SHINE */
        .animate-shine-text {
            background: linear-gradient(
                110deg,
                #2563eb 0%,   /* Blue */
                #2563eb 40%,  /* Blue */
                #ffffff 50%,  /* Shine */
                #dc2626 60%,  /* Red */
                #dc2626 100%  /* Red */
            );
            background-size: 200% auto;
            color: transparent;
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 4s linear infinite;
        }

        @keyframes shine {
            to {
                background-position: 200% center;
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes fadeInFast {
            animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        @keyframes scale-up {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
            animation: scale-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes flash-storm {
            0% { opacity: 0; }
            20% { opacity: 1; } /* SOLID OPACITY AT PEAK */
            40% { opacity: 1; } /* HOLD OPACITY */
            100% { opacity: 0; }
        }
        .animate-flash-storm {
            animation: flash-storm 0.8s ease-out forwards;
        }
        @keyframes strike {
            0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
            20% { opacity: 1; transform: scale(1.2) rotate(5deg); }
            40% { transform: scale(1) rotate(0deg); }
            100% { transform: scale(1.5) rotate(10deg); opacity: 0; }
        }
        .animate-strike {
            animation: strike 0.6s ease-out forwards;
        }
        @keyframes execution {
            0% { transform: translateY(0); opacity: 1; filter: grayscale(100%); }
            15% { transform: translate(5px, 0) rotate(1deg); filter: grayscale(100%) brightness(1.5); } /* Flash shock */
            30% { transform: translate(-5px, 0) rotate(-1deg); filter: grayscale(100%) brightness(0.8) sepia(1) hue-rotate(-50deg) saturate(3); } /* Turn Red/Bleed */
            40% { transform: translateY(10px) scale(0.98); } /* Anticipate drop */
            100% { transform: translateY(200%) rotate(5deg); opacity: 0; filter: grayscale(100%) brightness(0); } /* Drop to abyss */
        }
        .animate-execution {
            animation: execution 2.5s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
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
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #a855f7;
            border-radius: 4px;
        }
      `}</style>

            <UserManagementModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} />
        </div >
    );
};

export default App;
