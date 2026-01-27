
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Minimize2, Maximize2, Play, Pause, Volume2, Music, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { searchYouTubeVideos } from '../services/youtubeService';

interface BeatPlayerProps {
    initialQuery?: string;
    isOpen: boolean;
    onClose: () => void;
    autoPlay?: boolean;
    onVideoSelect?: () => void;
}

interface Video {
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
}

export const BeatPlayer: React.FC<BeatPlayerProps> = ({ initialQuery, isOpen, onClose, autoPlay = false, onVideoSelect }) => {
    const [query, setQuery] = useState('');
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [playerReady, setPlayerReady] = useState(false); // Can't easily track iframe state without api, but we can assume

    // New State for Pagination and Block
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [blockedIds, setBlockedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('blocked_beats') || '[]');
        } catch {
            return [];
        }
    });

    // Effect to perform search when opened with new query
    useEffect(() => {
        if (initialQuery && isOpen) {
            if (initialQuery !== query) {
                setQuery(initialQuery);
                setSelectedVideo(null); // Reset selection on new battle/query
                handleSearch(initialQuery);
                setIsMinimized(false);
            }
        }
    }, [initialQuery, isOpen]);

    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (searchQuery: string, pageToken?: string) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const results = await searchYouTubeVideos(searchQuery, pageToken);

            const mappedVideos = results.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channel: item.snippet.channelTitle
            }));

            // Filter out blocked videos
            const filteredVideos = mappedVideos.filter(v => !blockedIds.includes(v.id));

            setVideos(filteredVideos);
            setNextPageToken(results.nextPageToken);

            if (filteredVideos.length === 0 && results.items.length === 0) {
                // No results found (not an error, handled in render)
            }

        } catch (error) {
            console.error("Search failed", error);
            setError("No se pudieron cargar los beats. Es posible que se haya alcanzado el límite diario de la API de YouTube. Intenta de nuevo más tarde.");
        } finally {
            setLoading(false);
        }
    };

    const blockVideo = (video: Video) => {
        const newBlocked = [...blockedIds, video.id];
        setBlockedIds(newBlocked);
        localStorage.setItem('blocked_beats', JSON.stringify(newBlocked));

        // Remove from current list
        setVideos(prev => prev.filter(v => v.id !== video.id));

        // If it was playing, stop it
        if (selectedVideo?.id === video.id) {
            setSelectedVideo(null);
        }
    };

    const handleRefresh = () => {
        if (nextPageToken) {
            handleSearch(query, nextPageToken);
        } else {
            handleSearch(query); // Fallback to fresh search if no token
        }
    };

    const selectVideo = (video: Video) => {
        setSelectedVideo(video);
        if (onVideoSelect) onVideoSelect();
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed z-[9999] transition-all duration-300 ease-in-out shadow-2xl border border-purple-500/50 overflow-hidden
        ${isMinimized
                    ? 'bottom-4 right-4 w-80 h-24 rounded-xl bg-black/90 backdrop-blur-md'
                    : 'bottom-0 right-0 w-full md:w-[450px] h-[80vh] md:h-full md:rounded-l-2xl bg-[#0f0518] rounded-t-2xl md:rounded-tr-none'
                }
      `}
        >
            {/* HEADER */}
            <div className="flex items-center justify-between p-3 bg-purple-900/40 border-b border-purple-500/30 cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Music size={18} className="text-green-400 shrink-0" />
                    <span className="font-bold text-white text-sm truncate">
                        {selectedVideo ? selectedVideo.title : 'Busca un Beat...'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="p-1 hover:bg-purple-700/50 rounded"
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-1 hover:bg-red-500/50 rounded text-red-300"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* CONTENT (Hidden when minimized) */}
            {!isMinimized && (
                <div className="flex flex-col h-[calc(100%-50px)]">

                    {/* PLAYER AREA */}
                    <div className="w-full aspect-video bg-black shrink-0 relative transition-all">
                        {selectedVideo ? (
                            <>
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&playsinline=1`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0"
                                ></iframe>

                                {/* BLOCK / KEEP CONTROLS OVERLAY */}
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); blockVideo(selectedVideo); }}
                                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                                        title="No me sirve (Bloquear y saltar)"
                                    >
                                        <X size={12} /> BLOQUEAR
                                    </button>
                                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 opacity-80" title="Beat Seleccionado">
                                        <Volume2 size={12} /> SONANDO
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2 bg-gradient-to-br from-purple-900/10 to-transparent">
                                <div className="animate-pulse bg-purple-900/20 p-4 rounded-full">
                                    <Play size={32} />
                                </div>
                                <span className="text-xs uppercase tracking-widest">Selecciona un beat</span>
                            </div>
                        )}
                    </div>

                    {/* SEARCH BAR */}
                    <div className="p-4 flex gap-2 border-b border-gray-800">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                            placeholder="Buscar Free, Trap, Boom Bap..."
                            className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                        />
                        <button
                            onClick={() => handleSearch(query)}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg"
                            disabled={loading}
                        >
                            {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <Search size={20} />}
                        </button>
                    </div>

                    {/* REFRESH BAR */}
                    <div className="px-4 pb-2 pt-1 flex justify-between items-center bg-gray-900/30 border-b border-gray-800/50">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Resultados</span>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#a855f7] hover:text-[#d8b4fe] transition-colors disabled:opacity-50"
                        >
                            <ExternalLink size={10} className="rotate-0 md:rotate-180" /> {/* Simulating refresh icon with generic link for now or just text */}
                            Refrescar Lista
                        </button>
                    </div>

                    {/* RESULTS LIST */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {videos.map(video => (
                            <div
                                key={video.id}
                                className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-all ${selectedVideo?.id === video.id ? 'bg-purple-900/40 border border-purple-500/50' : 'hover:bg-gray-800/50 border border-transparent'}`}
                            >
                                <div
                                    className="w-24 h-16 bg-gray-800 rounded overflow-hidden shrink-0 relative group"
                                    onClick={() => selectVideo(video)}
                                >
                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={20} className="text-white fill-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4
                                        className={`text-sm font-bold truncate ${selectedVideo?.id === video.id ? 'text-green-400' : 'text-gray-200'} cursor-pointer`}
                                        onClick={() => selectVideo(video)}
                                    >
                                        {video.title}
                                    </h4>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-gray-500 truncate">{video.channel}</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); blockVideo(video); }}
                                            className="text-gray-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-900/20 rounded transition-all"
                                            title="Bloquear este beat"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {error ? (
                            <div className="text-center text-red-400 text-sm mt-10 px-4">
                                <p className="font-bold mb-1">¡Ups!</p>
                                {error}
                            </div>
                        ) : videos.length === 0 && !loading && (
                            <div className="text-center text-gray-500 text-sm mt-10">
                                {initialQuery ? 'No se encontraron resultados.' : 'Busca un estilo para empezar.'}
                            </div>
                        )}

                        {videos.length > 0 && (
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="w-full py-2 text-xs font-bold text-gray-500 hover:text-purple-400 uppercase tracking-widest border border-dashed border-gray-700 hover:border-purple-500/50 rounded-lg mt-2 transition-all"
                            >
                                {loading ? 'Cargando...' : 'Cargar Más Resultados'}
                            </button>
                        )}
                    </div>

                    <div className="p-2 text-center text-[10px] text-gray-600 bg-black/20">
                        Powered by YouTube Data API
                    </div>
                </div>
            )}

            {/* MINIMIZED VIEW CONTENT */}
            {isMinimized && selectedVideo && (
                <div className="absolute bottom-2 left-3 right-12 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gray-800 overflow-hidden shrink-0">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&controls=0&mute=1`}
                            title="Mini thumb"
                            className="pointer-events-none hidden"
                        />
                        <img src={selectedVideo.thumbnail} className="w-full h-full object-cover opacity-60" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-[150px]">{selectedVideo.title}</div>
                        <div className="text-[10px] text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Reproduciendo
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
