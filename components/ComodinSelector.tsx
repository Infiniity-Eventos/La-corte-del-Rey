import React, { useState, useEffect } from 'react';
import { LeagueParticipant } from '../types';
import { Crown, Zap } from 'lucide-react';

interface ComodinSelectorProps {
    isOpen: boolean;
    pool: LeagueParticipant[];
    pendingPlayer: LeagueParticipant | null;
    onSelect: (opponent: LeagueParticipant) => void;
    onClose: () => void;
}

export const ComodinSelector: React.FC<ComodinSelectorProps> = ({ isOpen, pool, pendingPlayer, onSelect, onClose }) => {
    const [spinning, setSpinning] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<LeagueParticipant | null>(null);

    useEffect(() => {
        if (isOpen && !spinning && !selected) {
            handleSpin();
        }
    }, [isOpen]);

    const handleSpin = () => {
        setSpinning(true);
        let spins = 0;
        const maxSpins = 30; // 30 ticks
        const baseSpeed = 50;

        const spinInterval = () => {
            // Speed curve: fast then slow
            const speed = spins < 20 ? baseSpeed : baseSpeed + ((spins - 20) * 20);

            setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % pool.length);
                spins++;

                if (spins < maxSpins) {
                    spinInterval();
                } else {
                    // FINISH
                    setSpinning(false);
                    // Select visually the current one (randomness comes from 'maxSpins' logic or pre-selection)
                    // For fairness, let's pre-select a random winner from the filtered pool (pool provided is already candidates)
                    // BUT visually we just land on one. 
                    // To ensure the visual matches the logic, we should pick the winner beforehand or track the index.
                    // Simplified: Just stop on the current index.

                    // Actually, let's PICK a random winner from the pool first, then ensure animation stops there.
                    // But 'pool' here is small? Maybe.
                    // Let's just use the final index as the winner for visual coherence.

                    const winnerIndex = (currentIndex + 1) % pool.length; // Just taking the next for logic flow
                    const winner = pool[winnerIndex]; // Wait, React state update is async.

                    // Better approach: Pick winner, animate TO it.
                    // Since it's a "Sorted by points" pool, we might want to prioritize lowest points *logically* before passing to this component?
                    // The user said "sorteo visual". So it should look random among the valid candidates.
                    // Assume 'pool' passed here is VALID candidates (0 points, then 1 point, etc).
                    // So any of them is fine.

                    const finalWinner = pool[Math.floor(Math.random() * pool.length)];
                    setSelected(finalWinner);

                    setTimeout(() => {
                        onSelect(finalWinner);
                    }, 2000); // Wait 2s to show off
                }
            }, speed);
        };

        spinInterval();
    };

    if (!isOpen) return null;

    // Filter/Sort pool to prioritize lowest points if logic wasn't fully handled outside? 
    // No, logic is "passed candidates". The component just visualizes.

    const currentItem = selected || pool[currentIndex];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-lg bg-[#1a0b2e] border-4 border-yellow-500 rounded-3xl p-8 flex flex-col items-center relative shadow-[0_0_100px_rgba(234,179,8,0.2)]">

                {/* Header */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(234,179,8,0.5)] flex items-center gap-2">
                    <Zap size={16} fill="black" />
                    COMODÍN ACTIVADO
                    <Zap size={16} fill="black" />
                </div>

                <div className="mt-8 text-center space-y-2 mb-8">
                    <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Jugador en Espera</h2>
                    <h1 className="text-4xl font-black font-urban text-white uppercase text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                        {pendingPlayer?.name}
                    </h1>
                </div>

                <div className="w-full h-1 bg-white/10 mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-500/50 w-1/2 animate-loading-bar"></div>
                </div>

                <div className="text-center space-y-4 w-full">
                    <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs">Buscando Oponente...</h2>

                    <div className={`w-full py-8 bg-black/50 border-2 rounded-xl flex items-center justify-center transition-all duration-100 ${spinning ? 'border-gray-700' : 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] scale-105'}`}>
                        {currentItem ? (
                            <div className="flex flex-col items-center animate-fadeInFast">
                                <span className={`text-4xl md:text-5xl font-black font-urban uppercase ${spinning ? 'text-gray-500 blur-[1px]' : 'text-yellow-400'}`}>
                                    {currentItem.name}
                                </span>
                                <div className="flex gap-4 mt-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                    <span>PTS: {currentItem.points}</span>
                                    <span>BAT: {currentItem.battles}</span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-600">...</span>
                        )}
                    </div>
                </div>

                {selected && (
                    <div className="mt-8 animate-bounce-slow">
                        <span className="text-green-400 font-bold uppercase tracking-widest text-sm">¡BATALLA CONFIRMADA!</span>
                    </div>
                )}
            </div>
        </div>
    );
};
