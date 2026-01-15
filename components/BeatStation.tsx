import React from 'react';
import { BeatGenre } from '../types';
import { Music, PlayCircle, Shuffle } from 'lucide-react';

interface BeatStationProps {
  onSelect: (genre: BeatGenre) => void;
}

export const BeatStation: React.FC<BeatStationProps> = ({ onSelect }) => {

  const handleRandom = () => {
      const genres = Object.values(BeatGenre);
      const randomGenre = genres[Math.floor(Math.random() * genres.length)];
      onSelect(randomGenre);
  };

  return (
    <div className="bg-purple-950/50 p-4 md:p-6 rounded-2xl border-2 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] h-full flex flex-col justify-between relative overflow-hidden animate-fadeIn">
      
      {/* Background Decor */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none"></div>

      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="text-xl md:text-2xl font-urban text-green-400 tracking-wider">SELECCIONA TU BEAT</h2>
            <Music className="text-purple-400 w-6 h-6" />
        </div>

        <p className="text-purple-300/60 text-sm mb-4 hidden md:block">Elige el estilo para tu entrenamiento:</p>

        {/* Genre Selector Grid */}
        <div className="bg-black/40 p-2 md:p-4 rounded-xl border border-purple-700/50 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto">
                {Object.values(BeatGenre).map((genre) => (
                <button
                    key={genre}
                    onClick={() => onSelect(genre)}
                    className="group relative p-4 md:p-6 rounded-xl border border-purple-800 bg-purple-900/20 hover:bg-purple-600/40 hover:border-green-400 transition-all text-left overflow-hidden active:scale-95 flex items-center justify-between h-20 md:h-24 shrink-0"
                >
                    <span className="font-bold text-base md:text-lg uppercase tracking-wider text-gray-200 group-hover:text-white relative z-10">{genre}</span>
                    <PlayCircle size={28} className="text-purple-400 group-hover:text-green-400 transition-colors relative z-10 opacity-50 group-hover:opacity-100 shrink-0" />
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out"></div>
                </button>
                ))}
                
                {/* Random Button */}
                <button
                    onClick={handleRandom}
                    className="group relative p-4 md:p-6 rounded-xl border-2 border-dashed border-purple-500/50 bg-black/40 hover:bg-purple-900/40 hover:border-green-400 transition-all text-left overflow-hidden active:scale-95 flex items-center justify-between h-20 md:h-24 shrink-0 sm:col-span-2"
                >
                    <span className="font-bold text-base md:text-lg uppercase tracking-wider text-green-400 group-hover:text-white relative z-10 flex items-center gap-2">
                        <Shuffle size={20} /> ALEATORIO
                    </span>
                    <div className="text-purple-500/50 font-urban text-3xl md:text-4xl opacity-50">?</div>
                </button>
            </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(168,85,247,0.3);
            border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(168,85,247,0.5);
        }
      `}</style>
    </div>
  );
};