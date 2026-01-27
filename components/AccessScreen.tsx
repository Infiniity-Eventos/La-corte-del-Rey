import React, { useState } from 'react';
import { Shield, Users, ArrowRight, Lock, User } from 'lucide-react';

interface AccessScreenProps {
    onAdminLogin: () => void;
    onSpectatorLogin: (name: string) => void;
}

export const AccessScreen: React.FC<AccessScreenProps> = ({ onAdminLogin, onSpectatorLogin }) => {
    const [mode, setMode] = useState<'selection' | 'admin' | 'spectator'>('selection');
    const [password, setPassword] = useState('');
    const [spectatorName, setSpectatorName] = useState('');
    const [error, setError] = useState('');

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'Zeven2323') {
            onAdminLogin();
        } else {
            setError('Contraseña incorrecta');
        }
    };

    const handleSpectatorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (spectatorName.trim().length > 0) {
            onSpectatorLogin(spectatorName.trim());
        } else {
            setError('Ingresa un nombre para continuar');
        }
    };

    return (
        <div className="min-h-screen bg-[#0d001a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black/40 backdrop-blur-md rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden relative">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

                <div className="p-8">
                    <h1 className="text-3xl font-black font-urban text-white text-center mb-8 tracking-wider">
                        LA CORTE DEL REY
                    </h1>

                    {mode === 'selection' && (
                        <div className="flex flex-col gap-6">
                            <button
                                onClick={() => { setMode('spectator'); setError(''); }}
                                className="group relative p-8 bg-gradient-to-br from-cyan-900/40 to-black border border-cyan-500/30 rounded-2xl hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all flex items-center gap-6 text-left w-full transform hover:scale-[1.02]"
                            >
                                <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:bg-cyan-500/20 transition-colors">
                                    <Users className="text-cyan-400 group-hover:scale-110 transition-transform" size={40} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-black text-2xl uppercase tracking-wider">Modo Espectador</h3>
                                    <p className="text-gray-300 text-sm mt-1">Ver batallas y votar en vivo</p>
                                </div>
                                <ArrowRight className="text-gray-500 group-hover:text-cyan-400 transition-colors" size={28} />
                            </button>

                            <div className="flex justify-center">
                                <button
                                    onClick={() => { setMode('admin'); setError(''); }}
                                    className="group flex items-center justify-center gap-2 text-gray-600 hover:text-purple-400 transition-colors py-3 px-6 rounded-lg hover:bg-white/5"
                                >
                                    <Shield size={16} className="group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Acceso Administrador</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'admin' && (
                        <form onSubmit={handleAdminSubmit} className="flex flex-col gap-6 animate-fadeIn">
                            <div className="text-center">
                                <div className="inline-block p-3 bg-purple-500/10 rounded-full mb-3">
                                    <Lock size={24} className="text-purple-400" />
                                </div>
                                <h3 className="text-white font-bold text-xl uppercase">Acceso Admin</h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    placeholder="••••••••"
                                    autoFocus
                                />
                                {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl uppercase tracking-widest transition-colors shadow-lg shadow-purple-900/20"
                            >
                                Entrar
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('selection'); setError(''); setPassword(''); }}
                                className="text-gray-500 text-xs hover:text-white transition-colors uppercase tracking-widest"
                            >
                                Volver
                            </button>
                        </form>
                    )}

                    {mode === 'spectator' && (
                        <form onSubmit={handleSpectatorSubmit} className="flex flex-col gap-6 animate-fadeIn">
                            <div className="text-center">
                                <div className="inline-block p-3 bg-cyan-500/10 rounded-full mb-3">
                                    <User size={24} className="text-cyan-400" />
                                </div>
                                <h3 className="text-white font-bold text-xl uppercase">Unirse como Espectador</h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">TU A.K.A</label>
                                <input
                                    type="text"
                                    value={spectatorName}
                                    onChange={(e) => setSpectatorName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    placeholder=""
                                    autoFocus
                                />
                                {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl uppercase tracking-widest transition-colors shadow-lg shadow-cyan-900/20"
                            >
                                Continuar
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('selection'); setError(''); setSpectatorName(''); }}
                                className="text-gray-500 text-xs hover:text-white transition-colors uppercase tracking-widest"
                            >
                                Volver
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
