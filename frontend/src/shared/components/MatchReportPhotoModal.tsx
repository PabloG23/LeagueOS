import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    ZoomIn, 
    ZoomOut, 
    RotateCw, 
    RotateCcw, 
    ExternalLink, 
    Loader2, 
    FileText, 
    AlertCircle
} from 'lucide-react';
import { leagueApi, Match } from '@/shared/api/league-api';

interface MatchReportPhotoModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId?: string;
    match: Match | null;
}

// In-memory cache for report photo signed URLs (50 min TTL)
const photoCache = new Map<string, { url: string; expiresAt: number }>();

export const MatchReportPhotoModal: React.FC<MatchReportPhotoModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    match,
}) => {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);

    // Reset view controls on open or match change
    useEffect(() => {
        if (!isOpen || !match) {
            setPhotoUrl(null);
            setLoading(true);
            setError(null);
            setZoom(1);
            setRotation(0);
            return;
        }

        setZoom(1);
        setRotation(0);
        setError(null);

        const matchId = match.id;
        const now = Date.now();

        // 1. Check in-memory cache first
        const cached = photoCache.get(matchId);
        if (cached && cached.expiresAt > now) {
            setPhotoUrl(cached.url);
            setLoading(false);
            return;
        }

        // 2. Fetch signed URL on demand
        if (!tenantId) {
            setError('No se pudo identificar la liga.');
            setLoading(false);
            return;
        }

        setLoading(true);
        leagueApi.getPublicMatchReportPhotoUrl(tenantId, matchId)
            .then(res => {
                const signedUrl = res.data?.signedUrl;
                if (signedUrl) {
                    photoCache.set(matchId, {
                        url: signedUrl,
                        expiresAt: now + 50 * 60 * 1000 // 50 mins
                    });
                    setPhotoUrl(signedUrl);
                } else {
                    setError('La cédula de este partido no está disponible en este momento.');
                }
            })
            .catch(err => {
                console.error('Error fetching match report photo:', err);
                setError('Error al cargar la foto de la cédula. Intenta de nuevo más tarde.');
            })
            .finally(() => {
                setLoading(false);
            });

    }, [isOpen, match, tenantId]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !match) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);

    const homeName = match.homeTeam?.name || 'Equipo Local';
    const awayName = match.awayTeam?.name || 'Equipo Visitante';
    const isFinished = match.status === 'FINISHED';
    const formattedDate = match.matchDate 
        ? new Date(match.matchDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Fecha por definir';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="fixed inset-0" onClick={onClose} />

            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-white/10 shadow-2xl rounded-3xl overflow-hidden z-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/90 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                                    Cédula Arbitral Oficial
                                </h3>
                                {match.matchday && (
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                        Jornada {match.matchday}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium truncate mt-0.5 flex items-center gap-1.5">
                                <span className="font-semibold text-slate-200">{homeName}</span>
                                {isFinished && (
                                    <span className="font-mono text-emerald-400 font-bold">
                                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                                    </span>
                                )}
                                {!isFinished && <span className="text-slate-500">vs</span>}
                                <span className="font-semibold text-slate-200">{awayName}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-[11px] text-slate-400">{formattedDate}</span>
                            </p>
                        </div>
                    </div>

                    {/* Toolbar Controls */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-950/60 p-1.5 rounded-2xl border border-white/5">
                        <button
                            onClick={handleZoomIn}
                            title="Acercar (+)"
                            disabled={loading || !photoUrl}
                            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleZoomOut}
                            title="Alejar (-)"
                            disabled={loading || !photoUrl}
                            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleRotate}
                            title="Rotar 90°"
                            disabled={loading || !photoUrl}
                            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>
                        {(zoom !== 1 || rotation !== 0) && (
                            <button
                                onClick={handleReset}
                                title="Restablecer vista"
                                className="p-2 rounded-xl text-amber-400 hover:bg-amber-400/10 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        <div className="w-px h-5 bg-white/10 mx-1" />
                        {photoUrl && (
                            <a
                                href={photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir en pestaña nueva"
                                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            title="Cerrar (Esc)"
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Photo View Canvas */}
                <div className="relative flex-1 min-h-[380px] max-h-[72vh] overflow-auto flex items-center justify-center p-4 sm:p-6 bg-slate-950 select-none">
                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-400 py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                            <span className="text-xs font-semibold tracking-wide">Cargando foto de la cédula...</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center gap-3 text-center max-w-md p-6 bg-red-950/20 border border-red-500/20 rounded-2xl">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                            <p className="text-sm font-semibold text-red-200">{error}</p>
                        </div>
                    )}

                    {photoUrl && !loading && !error && (
                        <div 
                            className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            }}
                        >
                            <img
                                src={photoUrl}
                                alt={`Cédula arbitral ${homeName} vs ${awayName}`}
                                className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-2xl border border-white/5"
                                draggable={false}
                            />
                        </div>
                    )}
                </div>

                {/* Footer Info Bar */}
                <div className="p-3.5 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Documento avalado por el cuerpo arbitral de la liga</span>
                    </div>
                    {photoUrl && (
                        <span className="text-[11px] text-slate-500">
                            Usa los controles de la barra superior para hacer zoom o rotar la cédula
                        </span>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
