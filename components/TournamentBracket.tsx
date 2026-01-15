import React, { useState } from 'react';
import { Trophy, Users, ChevronRight, RotateCcw, Medal, Swords } from 'lucide-react';

interface Match {
  id: string;
  p1: string | null;
  p2: string | null;
  winner: string | null;
  nextMatchId: string | null;
  position: 'p1' | 'p2' | null; // Does the winner go to p1 or p2 of next match?
}

export const TournamentBracket: React.FC = () => {
  const [stage, setStage] = useState<'setup' | 'bracket'>('setup');
  const [size, setSize] = useState<4 | 8 | 16>(8);
  const [participants, setParticipants] = useState<string[]>(Array(16).fill(''));
  const [matches, setMatches] = useState<Match[]>([]);

  // Setup Helpers
  const handleSizeSelect = (s: 4 | 8 | 16) => {
    setSize(s);
    setParticipants(Array(s).fill(''));
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...participants];
    newNames[index] = name;
    setParticipants(newNames);
  };

  const generateBracket = () => {
    // Fill empty names with defaults
    const finalNames = participants.slice(0, size).map((n, i) => n.trim() || `MC ${i + 1}`);
    
    const newMatches: Match[] = [];
    let matchCount = 0;
    
    // Calculate total rounds needed (Log2 of size)
    // 4 -> 2 rounds, 8 -> 3 rounds, 16 -> 4 rounds
    const totalRounds = Math.log2(size);
    let currentRoundSize = size / 2;
    let roundStartIndex = 0;

    // Generate structure
    for (let r = 0; r < totalRounds; r++) {
      for (let i = 0; i < currentRoundSize; i++) {
         const isFirstRound = r === 0;
         const matchId = `${r}-${i}`;
         
         // Calculate next match logic
         const nextRoundIndex = Math.floor(i / 2);
         const nextMatchId = r < totalRounds - 1 ? `${r + 1}-${nextRoundIndex}` : null;
         const nextPosition = r < totalRounds - 1 ? (i % 2 === 0 ? 'p1' : 'p2') : null;

         newMatches.push({
             id: matchId,
             p1: isFirstRound ? finalNames[i * 2] : null,
             p2: isFirstRound ? finalNames[i * 2 + 1] : null,
             winner: null,
             nextMatchId: nextMatchId,
             position: nextPosition
         });
         matchCount++;
      }
      roundStartIndex += currentRoundSize;
      currentRoundSize /= 2;
    }

    setMatches(newMatches);
    setStage('bracket');
  };

  const advanceWinner = (matchId: string, winnerName: string) => {
    setMatches(prevMatches => {
        const newMatches = [...prevMatches];
        const currentMatchIndex = newMatches.findIndex(m => m.id === matchId);
        if (currentMatchIndex === -1) return prevMatches;

        // Set winner
        newMatches[currentMatchIndex].winner = winnerName;

        // Propagate to next match
        const nextId = newMatches[currentMatchIndex].nextMatchId;
        const nextPos = newMatches[currentMatchIndex].position;

        if (nextId && nextPos) {
            const nextMatchIndex = newMatches.findIndex(m => m.id === nextId);
            if (nextMatchIndex !== -1) {
                // Reset winner of next match if we are changing the previous round
                newMatches[nextMatchIndex].winner = null; 
                // Set name
                if (nextPos === 'p1') newMatches[nextMatchIndex].p1 = winnerName;
                else newMatches[nextMatchIndex].p2 = winnerName;
            }
        }

        return newMatches;
    });
  };

  const resetTournament = () => {
    setStage('setup');
    setMatches([]);
  };

  // Render Logic
  const renderRound = (roundIndex: number, roundMatchCount: number) => {
    const roundMatches = matches.filter(m => m.id.startsWith(`${roundIndex}-`));
    
    return (
        // Changed: Removed gap-4, added h-full and w-64 for alignment consistency
        <div key={roundIndex} className="flex flex-col h-full w-64 shrink-0 relative">
             <div className="text-center bg-purple-900/40 rounded-t-lg border-b border-purple-500/30 py-2 mb-2 absolute -top-12 left-0 right-0 h-10">
                 <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                     {roundMatchCount === 1 ? 'GRAN FINAL' : roundMatchCount === 2 ? 'SEMIFINAL' : roundMatchCount === 4 ? 'CUARTOS' : 'OCTAVOS'}
                 </span>
             </div>
             
             {/* Container with justify-around distributes matches perfectly evenly */}
             <div className="flex flex-col justify-around h-full w-full">
                {roundMatches.map((match) => (
                    <div key={match.id} className="relative bg-black/40 border border-purple-700/50 rounded-lg p-2 flex flex-col gap-2 shadow-lg mx-2 z-10">
                        {/* Connector Lines */}
                        {match.nextMatchId && (
                            <div className={`absolute top-1/2 -right-12 w-12 h-0.5 bg-purple-600/50 z-0`}></div>
                        )}
                        {/* Vertical Connectors for visual polish (Optional but nice) */}
                        {match.nextMatchId && (
                            <div className={`absolute top-1/2 -right-12 w-0.5 bg-purple-600/50 z-0 h-full origin-top ${parseInt(match.id.split('-')[1]) % 2 === 0 ? 'translate-y-0 scale-y-100' : '-translate-y-full scale-y-100'} hidden`}>
                                {/* Vertical lines are complex in flexbox without SVG, skipping for now to rely on centered alignment */}
                            </div>
                        )}

                        {/* Player 1 */}
                        <button 
                            onClick={() => match.p1 && advanceWinner(match.id, match.p1)}
                            className={`p-2 rounded text-left transition-all text-sm font-bold truncate relative z-10 ${
                                match.winner === match.p1 
                                ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                                : match.p1 
                                    ? 'bg-purple-900/20 text-gray-300 hover:bg-purple-800 hover:text-white border border-transparent hover:border-purple-500' 
                                    : 'bg-black/20 text-gray-700 pointer-events-none'
                            }`}
                        >
                            {match.p1 || '-'}
                        </button>
                        
                        <div className="text-[10px] text-center text-gray-600 font-urban">VS</div>

                        {/* Player 2 */}
                        <button 
                            onClick={() => match.p2 && advanceWinner(match.id, match.p2)}
                            className={`p-2 rounded text-left transition-all text-sm font-bold truncate relative z-10 ${
                                match.winner === match.p2 
                                ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                                : match.p2 
                                    ? 'bg-purple-900/20 text-gray-300 hover:bg-purple-800 hover:text-white border border-transparent hover:border-purple-500' 
                                    : 'bg-black/20 text-gray-700 pointer-events-none'
                            }`}
                        >
                            {match.p2 || '-'}
                        </button>
                    </div>
                ))}
             </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
        {/* Header - Moved Reset button to LEFT side to avoid close button conflict */}
        <div className="p-6 border-b border-purple-800 flex items-center gap-6 bg-purple-950/50 flex-shrink-0 z-20 relative">
            <div className="flex items-center gap-3">
                <Trophy className="text-yellow-400" />
                <h2 className="text-2xl font-urban text-white tracking-widest uppercase">Modo Torneo</h2>
            </div>
            {stage === 'bracket' && (
                <button 
                    onClick={resetTournament} 
                    className="text-xs md:text-sm text-red-400 hover:text-white hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/30 transition-all flex items-center gap-2"
                >
                    <RotateCcw size={14} /> REINICIAR
                </button>
            )}
        </div>

        <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[#130722]">
            
            {/* STAGE 1: SETUP */}
            {stage === 'setup' && (
                <div className="max-w-2xl mx-auto flex flex-col items-center">
                    <h3 className="text-purple-300 mb-6 uppercase tracking-widest font-bold">Selecciona Participantes</h3>
                    
                    <div className="flex gap-4 mb-8">
                        {[4, 8, 16].map((s) => (
                            <button
                                key={s}
                                onClick={() => handleSizeSelect(s as 4 | 8 | 16)}
                                className={`w-16 h-16 rounded-xl font-black text-xl flex flex-col items-center justify-center border-2 transition-all ${
                                    size === s 
                                    ? 'bg-purple-600 border-green-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-110' 
                                    : 'bg-black/40 border-purple-800 text-gray-500 hover:border-purple-500 hover:text-purple-300'
                                }`}
                            >
                                <Users size={18} />
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
                        {participants.slice(0, size).map((name, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-gray-500 font-urban w-6 text-right">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => handleNameChange(idx, e.target.value)}
                                    placeholder={`Participante ${idx + 1}`}
                                    className="flex-1 bg-black/40 border border-purple-700/50 rounded-lg px-4 py-3 text-white focus:border-green-400 focus:outline-none placeholder-purple-900"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={generateBracket}
                        className="w-full max-w-sm py-4 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl font-black uppercase tracking-widest text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                    >
                        <Swords size={20} />
                        GENERAR LLAVES
                    </button>
                </div>
            )}

            {/* STAGE 2: BRACKET */}
            {stage === 'bracket' && (
                <div className="flex gap-12 min-w-max h-full items-stretch pt-16 pb-10 px-8">
                    {Array.from({ length: Math.log2(size) }).map((_, idx) => {
                        const count = size / Math.pow(2, idx + 1); // Matches in this round
                        return renderRound(idx, count);
                    })}
                    
                    {/* Champion Slot */}
                    <div className="flex flex-col h-full w-64 shrink-0 relative">
                        <div className="text-center bg-yellow-600/20 rounded-t-lg border-b border-yellow-500/30 py-2 mb-2 absolute -top-12 left-0 right-0 h-10">
                             <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">CAMPEÓN</span>
                        </div>
                        <div className="flex flex-col justify-center h-full w-full">
                            <div className="bg-gradient-to-b from-yellow-900/40 to-black border-2 border-yellow-500 rounded-xl p-6 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.2)] h-40 mx-2">
                                <Medal size={40} className="text-yellow-400 mb-2" />
                                <span className="text-2xl font-black font-urban text-white uppercase text-center break-words w-full">
                                    {matches[matches.length - 1].winner || "?"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};