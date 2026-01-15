
import React, { useState, useEffect, useRef } from 'react';
import { TrainingFormat, TrainingMode, BeatGenre, ALL_TRAINING_MODES } from '../types';
import { Dices, Grid, Type, Music, Zap, Lock, RefreshCw, CheckCircle, Skull } from 'lucide-react';

interface SlotMachineProps {
  onComplete: (format: TrainingFormat, mode: TrainingMode, genre: BeatGenre) => void;
  onSpinFinish?: (values: { format: TrainingFormat, mode: TrainingMode, genre: BeatGenre }) => void;
  onSpinStart?: () => void;
  forcedValues?: { format: TrainingFormat, mode: TrainingMode, genre: BeatGenre } | null;
  isReplica?: boolean;
  spectator?: boolean;
  attempts?: number;
  setAttempts?: React.Dispatch<React.SetStateAction<number>>;
}

const MODE_TRANSLATIONS: Record<string, string> = {
  themes: 'TEMÁTICAS',
  free: 'SANGRE',
  terminations: 'TERMINACIONES',
  characters: 'PERSONAJES',
  questions: 'PREGUNTAS'
};

export const SlotMachine: React.FC<SlotMachineProps> = ({
  onComplete,
  onSpinFinish,
  onSpinStart,
  forcedValues,
  isReplica = false,
  spectator = false,
  attempts: externalAttempts,
  setAttempts: setExternalAttempts
}) => {
  const [spinning, setSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [values, setValues] = useState<{
    format: TrainingFormat;
    mode: TrainingMode;
    genre: BeatGenre;
  }>({
    format: TrainingFormat.FOUR_BY_FOUR,
    mode: 'themes',
    genre: BeatGenre.BOOM_BAP
  });

  const [hasStarted, setHasStarted] = useState(false);
  const [locked, setLocked] = useState<[boolean, boolean, boolean]>([false, false, false]);

  // Internal state fallback if not controlled (though we plan to control it)
  const [internalAttempts, setInternalAttempts] = useState(isReplica ? 1 : 3);

  const attempts = externalAttempts !== undefined ? externalAttempts : internalAttempts;
  const setAttempts = setExternalAttempts || setInternalAttempts;

  const [roundFinished, setRoundFinished] = useState(false);

  const intervals = useRef<[(ReturnType<typeof setInterval> | null), (ReturnType<typeof setInterval> | null), (ReturnType<typeof setInterval> | null)]>([null, null, null]);

  // Data Pools
  const formats = Object.values(TrainingFormat);
  const modes = ALL_TRAINING_MODES;
  const genres = Object.values(BeatGenre);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      intervals.current.forEach(i => {
        if (i) clearInterval(i);
      });
    };
  }, []);

  // Spectator Mode: Infinite Spin (Only if no forced values yet)
  useEffect(() => {
    if (spectator) {
      if (forcedValues) {
        // Verify intervals are cleared if we have values
        intervals.current.forEach(i => { if (i) clearInterval(i); });
        return;
      }

      // Force start state
      setHasStarted(true);
      setSpinning([true, true, true]);
      setLocked([false, false, false]);

      // Start intervals
      const spin = (colIndex: number, pool: any[], key: 'format' | 'mode' | 'genre') => {
        if (intervals.current[colIndex]) clearInterval(intervals.current[colIndex]!);
        intervals.current[colIndex] = setInterval(() => {
          const randomItem = pool[Math.floor(Math.random() * pool.length)];
          setValues(prev => ({ ...prev, [key]: randomItem }));
        }, 80);
      };

      spin(0, formats, 'format');
      spin(1, modes, 'mode');
      spin(2, genres, 'genre');
    }
  }, [spectator, forcedValues]); // Re-run if forcedValues changes

  // Reset logic when replica mode changes
  useEffect(() => {
    if (isReplica && !spectator) {
      setAttempts(1);
      setHasStarted(false);
      setRoundFinished(false);
      setLocked([false, false, false]);
    }
  }, [isReplica, spectator]);

  const spinColumn = (colIndex: number, pool: any[], key: 'format' | 'mode' | 'genre') => {
    if (intervals.current[colIndex]) clearInterval(intervals.current[colIndex]!);

    intervals.current[colIndex] = setInterval(() => {
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      setValues(prev => ({ ...prev, [key]: randomItem }));
    }, 80); // Speed of text change
  };

  const handleSpin = () => {
    if (spectator) return;
    if (spinning.some(s => s) || attempts <= 0) return;

    if (onSpinStart) onSpinStart();

    if (!hasStarted) setHasStarted(true);

    // Consume attempt
    setAttempts(prev => prev - 1);
    setRoundFinished(false);

    setSpinning([true, true, true]);
    setLocked([false, false, false]);

    // Start all spinning visuals
    spinColumn(0, formats, 'format');
    spinColumn(1, modes, 'mode');
    spinColumn(2, genres, 'genre');

    // Stop Sequence

    // Stop Column 1 (Format) after 1.5s
    setTimeout(() => {
      if (intervals.current[0]) clearInterval(intervals.current[0]!);

      // If Replica, FORCE 4x4. Else, keep the random value or pick a final random one.
      setValues(prev => ({
        ...prev,
        format: isReplica ? TrainingFormat.FOUR_BY_FOUR : prev.format
      }));

      setSpinning(prev => [false, prev[1], prev[2]]);
      setLocked(prev => [true, false, false]);
    }, 1500);

    // Stop Column 2 (Mode) after 3.0s
    setTimeout(() => {
      if (intervals.current[1]) clearInterval(intervals.current[1]!);

      // If Replica, FORCE SANGRE (free).
      setValues(prev => ({
        ...prev,
        mode: isReplica ? 'free' : prev.mode
      }));

      setSpinning(prev => [false, false, prev[2]]);
      setLocked(prev => [true, true, false]);
    }, 3000);

    // Stop Column 3 (Genre) after 4.5s
    setTimeout(() => {
      if (intervals.current[2]) clearInterval(intervals.current[2]!);

      // If Replica, FORCE BOOM BAP.
      setValues(prev => ({
        ...prev,
        genre: isReplica ? BeatGenre.BOOM_BAP : prev.genre
      }));

      setSpinning(prev => [false, false, false]);
      setLocked(prev => [true, true, true]);

      setRoundFinished(true);

    }, 4500);
  };

  const handleConfirm = () => {
    if (spectator) return;
    onComplete(values.format, values.mode, values.genre);
  };

  // Report spin finish cleanly when round finishes
  useEffect(() => {
    if (roundFinished && onSpinFinish && !spectator) {
      onSpinFinish(values);
    }
  }, [roundFinished, spectator]);

  // Sync forced values if provided (Spectator Mode)
  useEffect(() => {
    if (forcedValues && spectator) {
      setValues(forcedValues);
      setHasStarted(true);
      setRoundFinished(true);
      setLocked([true, true, true]);
      setSpinning([false, false, false]);
    }
  }, [forcedValues, spectator]);

  const renderContent = (content: string, isLocked: boolean, isSpinning: boolean) => {
    // In spectator mode, we always want to show content if started
    if (!hasStarted && !isSpinning && !spectator) {
      return (
        <span className="text-6xl md:text-7xl font-black font-urban text-purple-500/30 animate-pulse">?</span>
      );
    }

    // Translate mode if it's a mode string
    let displayContent = content;
    if (Object.keys(MODE_TRANSLATIONS).includes(content)) {
      displayContent = MODE_TRANSLATIONS[content];
    }

    return (
      <span className={`text-3xl md:text-4xl font-black font-urban text-center px-4 uppercase animate-fadeInFast ${isReplica ? 'text-red-500' : 'text-white'}`}>
        {displayContent}
      </span>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      <div className="flex flex-col items-center mb-8 px-4 text-center">
        {isReplica ? (
          <div className="animate-pulse flex flex-col items-center">
            <Skull size={64} className="text-red-500 mb-2" />
            <h2 className="text-4xl md:text-5xl font-black font-urban text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] tracking-widest uppercase mb-2">
              ¡RÉPLICA!
            </h2>
            <p className="text-red-200 font-bold tracking-widest uppercase text-sm md:text-lg border-b-2 border-red-600 pb-1">
              EL QUE PIERDA PERDERÁ LA CABEZA
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-urban text-white text-center drop-shadow-lg tracking-widest uppercase animate-pulse mb-2">
              LA RULETA DEL DESTINO
            </h2>

            {/* Lives Counter (Only in normal mode) */}
            <div className="flex items-center gap-2 bg-purple-900/40 px-4 py-2 rounded-full border border-purple-500/30">
              <span className="text-sm uppercase tracking-widest text-purple-300">Intentos Restantes:</span>
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${i < attempts
                      ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
                      : 'bg-gray-700'
                      }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-10 px-4">

        {/* SLOT 1: FORMAT */}
        <div className={`relative h-64 bg-black/60 rounded-2xl border-4 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${locked[0] && hasStarted ? (isReplica ? 'border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]') : spinning[0] ? 'border-yellow-500 border-dashed' : isReplica ? 'border-red-900' : 'border-purple-800'}`}>
          <div className={`absolute top-0 left-0 right-0 text-center py-1 z-10 ${isReplica ? 'bg-red-900/80' : 'bg-purple-900/80'}`}>
            <span className={`text-xs font-bold uppercase tracking-widest ${isReplica ? 'text-red-200' : 'text-purple-200'}`}>Tirada 1: Formato</span>
          </div>

          <div className={`transition-all duration-100 flex flex-col items-center gap-4 ${spinning[0] ? 'blur-[2px] scale-110 opacity-80' : 'scale-100 opacity-100'}`}>
            <Grid size={48} className={locked[0] && hasStarted ? (isReplica ? 'text-red-500' : 'text-green-400') : (isReplica ? 'text-red-800' : 'text-purple-500')} />
            {renderContent(values.format, locked[0], spinning[0])}
          </div>
          {locked[0] && hasStarted && <div className={`absolute bottom-4 right-4 animate-bounce ${isReplica ? 'text-red-500' : 'text-green-500'}`}><Lock size={20} /></div>}
        </div>

        {/* SLOT 2: MODE */}
        <div className={`relative h-64 bg-black/60 rounded-2xl border-4 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${locked[1] && hasStarted ? (isReplica ? 'border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]') : spinning[1] ? 'border-yellow-500 border-dashed' : isReplica ? 'border-red-900' : 'border-purple-800'}`}>
          <div className={`absolute top-0 left-0 right-0 text-center py-1 z-10 ${isReplica ? 'bg-red-900/80' : 'bg-pink-900/80'}`}>
            <span className={`text-xs font-bold uppercase tracking-widest ${isReplica ? 'text-red-200' : 'text-pink-200'}`}>Tirada 2: Estímulo</span>
          </div>

          <div className={`transition-all duration-100 flex flex-col items-center gap-4 ${spinning[1] ? 'blur-[2px] scale-110 opacity-80' : 'scale-100 opacity-100'}`}>
            <Type size={48} className={locked[1] && hasStarted ? (isReplica ? 'text-red-500' : 'text-pink-400') : (isReplica ? 'text-red-800' : 'text-purple-500')} />
            {renderContent(values.mode, locked[1], spinning[1])}
          </div>
          {locked[1] && hasStarted && <div className={`absolute bottom-4 right-4 animate-bounce ${isReplica ? 'text-red-500' : 'text-pink-500'}`}><Lock size={20} /></div>}
        </div>

        {/* SLOT 3: BEAT */}
        <div className={`relative h-64 bg-black/60 rounded-2xl border-4 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${locked[2] && hasStarted ? (isReplica ? 'border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]') : spinning[2] ? 'border-yellow-500 border-dashed' : isReplica ? 'border-red-900' : 'border-purple-800'}`}>
          <div className={`absolute top-0 left-0 right-0 text-center py-1 z-10 ${isReplica ? 'bg-red-900/80' : 'bg-blue-900/80'}`}>
            <span className={`text-xs font-bold uppercase tracking-widest ${isReplica ? 'text-red-200' : 'text-blue-200'}`}>Tirada 3: Beat</span>
          </div>

          <div className={`transition-all duration-100 flex flex-col items-center gap-4 ${spinning[2] ? 'blur-[2px] scale-110 opacity-80' : 'scale-100 opacity-100'}`}>
            <Music size={48} className={locked[2] && hasStarted ? (isReplica ? 'text-red-500' : 'text-blue-400') : (isReplica ? 'text-red-800' : 'text-purple-500')} />
            {renderContent(values.genre, locked[2], spinning[2])}
          </div>
          {locked[2] && hasStarted && <div className={`absolute bottom-4 right-4 animate-bounce ${isReplica ? 'text-red-500' : 'text-blue-500'}`}><Lock size={20} /></div>}
        </div>
      </div>

      {/* ACTION BUTTONS AREA */}
      {!spectator && (
        <div className="w-full max-w-lg flex flex-col gap-4 px-4">

          {/* Main Spin Button */}
          {!roundFinished && attempts > 0 && (
            <button
              onClick={handleSpin}
              disabled={spinning.some(s => s)}
              className={`w-full py-8 rounded-xl font-black text-3xl tracking-tighter uppercase transition-all shadow-xl transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden ${spinning.some(s => s)
                ? 'bg-gray-800 text-gray-500 border-b-8 border-gray-950 cursor-wait'
                : isReplica
                  ? 'bg-gradient-to-r from-red-600 to-red-900 text-white border-b-8 border-red-950 shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:shadow-[0_0_60px_rgba(220,38,38,0.6)] hover:scale-105'
                  : 'bg-gradient-to-r from-yellow-600 to-red-600 text-white border-b-8 border-red-900 shadow-[0_0_40px_rgba(234,179,8,0.4)] hover:shadow-[0_0_60px_rgba(234,179,8,0.6)] hover:scale-105'
                }`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
              <Dices size={40} className={spinning.some(s => s) ? 'animate-spin' : ''} />
              {spinning.some(s => s) ? 'GIRANDO...' : isReplica ? '¡MUERTE SÚBITA!' : `GIRAR (${attempts})`}
            </button>
          )}

          {/* Decision Buttons (Only shown when round is finished) */}
          {roundFinished && (
            <div className="flex flex-col gap-3 animate-fadeIn">
              <button
                onClick={handleConfirm}
                className={`w-full py-6 rounded-xl font-black text-2xl tracking-tighter uppercase transition-all shadow-xl transform active:scale-95 flex items-center justify-center gap-3 border-b-8 hover:scale-105 ${isReplica
                  ? 'bg-red-600 border-red-900 shadow-[0_0_40px_rgba(220,38,38,0.4)] text-white'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-900 shadow-[0_0_40px_rgba(34,197,94,0.4)] text-white'
                  }`}
              >
                {isReplica ? <Skull size={32} /> : <CheckCircle size={32} />}
                {isReplica ? 'ACEPTAR DESTINO' : 'CONFIRMAR SELECCIÓN'}
              </button>

              {attempts > 0 && !isReplica && (
                <button
                  onClick={handleSpin}
                  className="w-full py-4 rounded-xl font-bold text-xl uppercase transition-all bg-purple-900/50 hover:bg-purple-800 text-purple-200 border-2 border-purple-500/30 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  NO ME GUSTA, GIRAR DE NUEVO ({attempts} restantes)
                </button>
              )}
            </div>
          )}

          {/* Out of attempts message */}
          {!roundFinished && attempts === 0 && !spinning.some(s => s) && (
            <div className="text-center text-red-400 font-bold uppercase tracking-widest animate-pulse">
              ¡Sin más intentos!
            </div>
          )}

        </div>
      )}

    </div>
  );
};
