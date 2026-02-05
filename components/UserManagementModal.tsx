import React, { useEffect, useState } from 'react';
import { X, Check, UserX, RefreshCw, Users, Lock, Eye, EyeOff } from 'lucide-react';
import { getPendingUsers, getAllUsers, approveUser, rejectUser, User } from '../services/userService';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const fetchData = async () => {
        setIsLoading(true);
        if (activeTab === 'pending') {
            const data = await getPendingUsers();
            setUsers(data);
        } else {
            const data = await getAllUsers();
            // Sort: Pending first, then Approved, then Rejected
            const sorted = data.sort((a, b) => {
                const statusOrder = { pending: 1, approved: 2, rejected: 3 };
                return statusOrder[a.status] - statusOrder[b.status];
            });
            setUsers(sorted);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, activeTab]);

    const handleApprove = async (username: string) => {
        const success = await approveUser(username);
        if (success) {
            fetchData(); // Refresh list
        }
    };

    const handleReject = async (username: string) => {
        if (confirm(`¿Estás seguro de rechazar/eliminar a ${username}?`)) {
            const success = await rejectUser(username);
            if (success) {
                fetchData(); // Refresh list
            }
        }
    };

    const togglePassword = (username: string) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(username)) {
                newSet.delete(username);
            } else {
                newSet.add(username);
            }
            return newSet;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1a0b2e] border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-purple-500/20 flex justify-between items-center bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-2 rounded-lg">
                            <Users size={24} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Gestión de Usuarios</h2>
                            <p className="text-xs text-gray-400">Administra el acceso de espectadores</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'pending'
                                ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-500'
                                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                            }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'all'
                                ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-500'
                                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                            }`}
                    >
                        Todos los Usuarios
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {users.length} Usuario{users.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={fetchData}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors p-2 hover:bg-cyan-900/20 rounded-lg"
                            title="Recargar lista"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {isLoading && users.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Cargando usuarios...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                <Users size={32} className="text-gray-600" />
                            </div>
                            <p className="text-gray-400 font-medium">No hay usuarios para mostrar</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div
                                    key={user.username}
                                    className={`bg-black/40 border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${user.status === 'pending' ? 'border-yellow-500/30' :
                                            user.status === 'approved' ? 'border-green-500/30' : 'border-red-500/30'
                                        }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-white text-lg">{user.username}</h3>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                                    user.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                                                        'bg-red-500/20 text-red-300'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </div>

                                        {/* PASSWORD DISPLAY */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <Lock size={12} className="text-gray-500" />
                                            <span className="text-xs text-gray-400 font-mono">
                                                {visiblePasswords.has(user.username) ? user.password : '••••••••'}
                                            </span>
                                            <button
                                                onClick={() => togglePassword(user.username)}
                                                className="text-gray-600 hover:text-gray-300 transition-colors ml-1"
                                                title={visiblePasswords.has(user.username) ? "Ocultar" : "Ver Contraseña"}
                                            >
                                                {visiblePasswords.has(user.username) ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                        </div>

                                        <p className="text-[10px] text-gray-600 mt-1">
                                            Creado: {new Date(user.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <button
                                            onClick={() => handleReject(user.username)}
                                            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Eliminar / Rechazar"
                                        >
                                            <UserX size={20} />
                                        </button>
                                        {user.status !== 'approved' && (
                                            <button
                                                onClick={() => handleApprove(user.username)}
                                                className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20"
                                                title="Aprobar"
                                            >
                                                <Check size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
