import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, 
    Shield, 
    Trophy, 
    Loader2, 
    CheckCircle2, 
    Calendar, 
    FileCheck2, 
    Flame, 
    ChevronRight,
    Sparkles,
    AlertTriangle
} from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { leagueApi, PlayerMatchAttendanceDTO } from '@/shared/api/league-api';

interface Player {
    id: string;
    name: string;
    photoUrl?: string;
    isActive?: boolean;
    jerseyNumber?: number | string;
    curp?: string;
    birthDate?: string;
    stats?: {
        matchesPlayed?: number;
        goals?: number;
        yellowCards?: number;
        redCards?: number;
        suspendedUntilMatchday?: number;
        playedMatches?: PlayerMatchAttendanceDTO[];
    };
    teamName?: string;
    teamLogo?: string;
    suspendedUntilMatchday?: number;
}

interface PlayerProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player | null;
    currentMatchday?: number; // Needed to check suspension status
}

/**
 * Resuelve la URL de medios aprovechando la capa de caché del sistema (/api/media/proxy),
 * evitando llamadas innecesarias a Cloudflare R2 y obteniendo Cache-Control HTTP nativo.
 */
const resolveMediaUrl = (url?: string): string | undefined => {
    if (!url || !url.trim()) return undefined;
    const clean = url.trim();

    // Si viene una presigned URL local/dummy hacia R2, extraemos la clave de almacenamiento limpia
    if (clean.includes('dummy-account-id') || clean.includes('dummy-access-key')) {
        const match = clean.match(/cloudflarestorage\.com\/[^/]+\/(.+?)(\?|$)/);
        if (match && match[1]) {
            return leagueApi.getProxyUrl(decodeURIComponent(match[1]));
        }
        return undefined;
    }

    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
        return clean;
    }
    return leagueApi.getProxyUrl(clean);
};

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ 
    isOpen, 
    onClose, 
    player, 
    currentMatchday = 1 
}) => {
    const { settings } = useTenantSettings();

    if (!isOpen || !player) return null;

    const [isFetching, setIsFetching] = useState(false);
    const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);
    const [photoError, setPhotoError] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const [stats, setStats] = useState({
        matchesPlayed: player.stats?.matchesPlayed ?? 0,
        goals: player.stats?.goals ?? 0,
        yellowCards: player.stats?.yellowCards ?? 0,
        redCards: player.stats?.redCards ?? 0,
        suspendedUntilMatchday: (player.stats?.suspendedUntilMatchday ?? player.suspendedUntilMatchday ?? null) as number | null,
        playedMatches: (player.stats?.playedMatches ?? []) as PlayerMatchAttendanceDTO[]
    });

    useEffect(() => {
        setPhotoError(false);
        setLogoError(false);
    }, [player?.id, player?.photoUrl]);

    useEffect(() => {
        if (!isOpen || !player?.id || !settings?.tenantId) return;

        // Si ya cuenta con las jornadas auditadas inyectadas por el padre, no volvemos a consultar
        const hasDetailedMatches = Array.isArray(player.stats?.playedMatches) && player.stats!.playedMatches.length > 0;
        if (hasDetailedMatches) {
            setStats({
                matchesPlayed: player.stats!.matchesPlayed ?? player.stats!.playedMatches!.length,
                goals: player.stats!.goals ?? 0,
                yellowCards: player.stats!.yellowCards ?? 0,
                redCards: player.stats!.redCards ?? 0,
                suspendedUntilMatchday: player.stats!.suspendedUntilMatchday ?? player.suspendedUntilMatchday ?? null,
                playedMatches: player.stats!.playedMatches!
            });
            if (player.stats!.playedMatches!.length > 0) {
                setSelectedMatchday(player.stats!.playedMatches![player.stats!.playedMatches!.length - 1].matchday ?? 1);
            }
            return;
        }

        // Consultar estadísticas completas con bitácora de cédulas desde el backend
        let isCancelled = false;
        const loadStats = async () => {
            setIsFetching(true);
            try {
                const response = await leagueApi.getPlayerStats(player.id, settings.tenantId as string);
                if (isCancelled) return;
                
                const data = response.data;
                const matches = data.playedMatches || [];
                
                setStats({
                    matchesPlayed: data.matchesPlayed ?? matches.length,
                    goals: data.goals ?? 0,
                    yellowCards: data.yellowCards ?? 0,
                    redCards: data.redCards ?? 0,
                    suspendedUntilMatchday: player.stats?.suspendedUntilMatchday ?? player.suspendedUntilMatchday ?? data.suspendedUntilMatchday ?? null,
                    playedMatches: matches
                });

                if (matches.length > 0) {
                    // Seleccionar por defecto la jornada más reciente jugada
                    setSelectedMatchday(matches[matches.length - 1].matchday ?? 1);
                } else {
                    setSelectedMatchday(null);
                }
            } catch (error) {
                console.error("Failed to load player stats with match attendance", error);
                if (isCancelled) return;
                setStats({
                    matchesPlayed: player.stats?.matchesPlayed ?? 0,
                    goals: player.stats?.goals ?? 0,
                    yellowCards: player.stats?.yellowCards ?? 0,
                    redCards: player.stats?.redCards ?? 0,
                    suspendedUntilMatchday: player.stats?.suspendedUntilMatchday ?? player.suspendedUntilMatchday ?? null,
                    playedMatches: []
                });
            } finally {
                if (!isCancelled) setIsFetching(false);
            }
        };

        loadStats();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, player?.id, settings?.tenantId]);

    // Complejidad temporal O(M) y espacial O(M) para mapear jornadas
    const sortedPlayedMatches = useMemo(() => {
        return [...stats.playedMatches].sort((a, b) => (a.matchday ?? 0) - (b.matchday ?? 0));
    }, [stats.playedMatches]);

    const activeMatchDetail = useMemo(() => {
        if (!selectedMatchday) return sortedPlayedMatches[sortedPlayedMatches.length - 1] || null;
        return sortedPlayedMatches.find(m => m.matchday === selectedMatchday) || null;
    }, [selectedMatchday, sortedPlayedMatches]);

    // Suspensiones
    const isSuspended = stats.suspendedUntilMatchday !== null && stats.suspendedUntilMatchday >= currentMatchday;

    // Elegibilidad Liguilla
    const minMatches = settings?.minMatchesForPlayoffs || 0;
    const actualMatchesCount = stats.matchesPlayed ?? sortedPlayedMatches.length;
    const isEligible = minMatches === 0 || actualMatchesCount >= minMatches;
    const progressPercent = minMatches > 0 ? Math.min(100, (actualMatchesCount / minMatches) * 100) : 100;
    const missingMatches = Math.max(0, minMatches - actualMatchesCount);

    const calculateAge = (birthDateString?: string) => {
        if (!birthDateString) return null;
        const today = new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    const age = calculateAge(player.birthDate);

    // Resolución de imágenes con caché HTTP
    const playerPhotoSrc = !photoError ? resolveMediaUrl(player.photoUrl) : undefined;
    const fallbackPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(player.name)}&backgroundColor=0284c7,1e40af,312e81`;
    const teamLogoSrc = !logoError ? resolveMediaUrl(player.teamLogo) : undefined;

    return (
        <div 
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón de Cierre Táctil */}
                <button
                    onClick={onClose}
                    aria-label="Cerrar ficha de jugador"
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-slate-950/60 hover:bg-slate-950/90 text-slate-300 hover:text-white rounded-full z-20 flex items-center justify-center backdrop-blur-md border border-white/10 transition-transform active:scale-90"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* =========================================================================
                    HERO HEADER REDISEÑADO: Escudo, Dorsal estilizado y Foto Retrato
                   ========================================================================= */}
                <div className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 pt-5 sm:pt-6 px-4 sm:px-6 pb-4 border-b border-white/10 shrink-0">
                    {/* Dorsal Gigante en marca de agua */}
                    {player.jerseyNumber != null && player.jerseyNumber !== '' && (
                        <div className="absolute right-4 top-1 text-8xl sm:text-9xl font-black text-white/[0.04] select-none pointer-events-none font-mono">
                            {player.jerseyNumber}
                        </div>
                    )}

                    {/* Fila Superior: Escudo y Nombre del Equipo */}
                    <div className="flex items-center gap-2.5 mb-3.5 pr-10">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 p-1 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                            {teamLogoSrc ? (
                                <img
                                    src={teamLogoSrc}
                                    alt={player.teamName || 'Equipo'}
                                    onError={() => setLogoError(true)}
                                    className="w-full h-full object-contain drop-shadow"
                                    loading="lazy"
                                />
                            ) : (
                                <Shield className="w-4 h-4 text-blue-300" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-300 block truncate">
                                {settings?.name || 'Liga Nuestro Deporte'}
                            </span>
                            <h3 className="text-xs sm:text-sm font-extrabold text-white truncate tracking-wide">
                                {player.teamName || 'Equipo sin asignar'}
                            </h3>
                        </div>
                    </div>

                    {/* Fila Principal: Foto Retrato + Nombre y Datos Clave */}
                    <div className="flex items-center gap-3.5 sm:gap-4">
                        {/* Frame de Foto Retrato (Mayor protagonismo facial, 0 distorsión) */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-slate-800 border-2 border-white/20 shadow-xl overflow-hidden ring-4 ring-blue-500/20">
                                <img
                                    src={playerPhotoSrc || fallbackPhoto}
                                    alt={player.name}
                                    onError={() => setPhotoError(true)}
                                    className="w-full h-full object-cover object-top transition-transform duration-300 hover:scale-105"
                                    loading="eager"
                                />
                            </div>

                            {/* Badge flotante de Dorsal */}
                            {player.jerseyNumber != null && player.jerseyNumber !== '' && (
                                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded-lg border-2 border-slate-900 shadow-md">
                                    #{player.jerseyNumber}
                                </div>
                            )}
                        </div>

                        {/* Información del Jugador */}
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-xl font-black text-white leading-snug tracking-tight line-clamp-2">
                                {player.name}
                            </h2>

                            {/* Metadatos en formato píldora */}
                            {age !== null && (
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-[11px] sm:text-xs text-slate-300">
                                    <span className="bg-white/10 px-2 py-0.5 rounded-md font-medium backdrop-blur-sm border border-white/5">
                                        {age} años
                                    </span>
                                </div>
                            )}

                            {/* Badge de Estatus de Juego */}
                            <div className="mt-2.5">
                                {isSuspended ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] sm:text-xs font-bold border border-rose-500/30">
                                        <Shield className="w-3.5 h-3.5 text-rose-400" />
                                        SUSPENDIDO (Hasta J-{stats.suspendedUntilMatchday})
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] sm:text-xs font-bold border border-emerald-500/30 shadow-sm">
                                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                        ELEGIBLE
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    CUERPO SCROLLEABLE (Optimizado para Celular y Desktop)
                   ========================================================================= */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 bg-slate-900/90 text-slate-100">
                    {/* Grilla de Métricas Principales (KPIs) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                                Rendimiento en Torneo
                            </span>
                            {isFetching && (
                                <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Actualizando...
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 text-center transition-colors hover:border-slate-600">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Juegos</span>
                                <span className="text-lg sm:text-2xl font-black text-white font-mono">{actualMatchesCount}</span>
                            </div>
                            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-2.5 text-center transition-colors hover:border-blue-700/60">
                                <span className="text-[10px] font-bold text-blue-300 uppercase block tracking-wider">Goles</span>
                                <span className="text-lg sm:text-2xl font-black text-blue-400 font-mono">{stats.goals ?? 0}</span>
                            </div>
                            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 text-center transition-colors hover:border-amber-700/60">
                                <span className="text-[10px] font-bold text-amber-300 uppercase block tracking-wider">Amarillas</span>
                                <span className="text-lg sm:text-2xl font-black text-amber-400 font-mono">{stats.yellowCards ?? 0}</span>
                            </div>
                            <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-2.5 text-center transition-colors hover:border-rose-700/60">
                                <span className="text-[10px] font-bold text-rose-300 uppercase block tracking-wider">Rojas</span>
                                <span className="text-lg sm:text-2xl font-black text-rose-400 font-mono">{stats.redCards ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* =========================================================================
                        MÓDULO DE TRANSPARENCIA: JORNADAS DISPUTADAS EN CÉDULA
                       ========================================================================= */}
                    <div className="bg-slate-950/70 rounded-2xl p-3.5 sm:p-4 border border-blue-900/30 shadow-lg relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                                    Transparencia: Jornadas Jugadas
                                </h4>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                            Registro auditable de partidos donde el jugador fue registrado oficialmente por el árbitro en la cédula:
                        </p>

                        {/* Lista Directa de Partidos Jugados */}
                        {sortedPlayedMatches.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                                {sortedPlayedMatches.map((m) => (
                                    <div 
                                        key={m.matchId || `j-${m.matchday}`}
                                        className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-xs flex flex-col gap-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-blue-950/80 border border-blue-500/30 p-0.5 flex items-center justify-center shrink-0 shadow-inner">
                                                    {m.opponentLogo && !m.opponentLogo.includes('dicebear.com/7.x/identicon') ? (
                                                        <img 
                                                            src={resolveMediaUrl(m.opponentLogo)} 
                                                            alt={m.opponentName} 
                                                            className="w-full h-full object-contain" 
                                                        />
                                                    ) : (
                                                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-white text-xs truncate">
                                                    vs {m.opponentName || 'Rival'}
                                                </span>
                                            </div>

                                            <span className="text-[10px] text-blue-300 font-bold bg-blue-950/60 border border-blue-800/40 px-2.5 py-0.5 rounded-md font-mono">
                                                Jornada {m.matchday}
                                            </span>
                                        </div>

                                        {/* Aportación en ese partido */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                                            <div className="flex items-center gap-2">
                                                {m.goals > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-blue-400 font-bold bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/40">
                                                        <Flame className="w-3 h-3 text-amber-400" />
                                                        {m.goals} {m.goals === 1 ? 'Gol' : 'Goles'}
                                                    </span>
                                                )}
                                                {m.yellowCards > 0 && (
                                                    <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40">
                                                        🟨 {m.yellowCards}
                                                    </span>
                                                )}
                                                {m.redCards > 0 && (
                                                    <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/40">
                                                        🟥 {m.redCards}
                                                    </span>
                                                )}
                                                {m.goals === 0 && m.yellowCards === 0 && m.redCards === 0 && (
                                                    <span className="text-slate-400">Participación sin amonestaciones</span>
                                                )}
                                            </div>

                                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                                <CheckCircle2 className="w-3 h-3" /> Registrado en Cédula
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-4 text-center text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                                <AlertTriangle className="w-5 h-5 mx-auto text-amber-500/70 mb-1" />
                                Sin jornadas registradas en cédula para este torneo.
                            </div>
                        )}
                    </div>

                    {/* =========================================================================
                        ELEGIBILIDAD PARA LIGUILLA AUDITADA
                       ========================================================================= */}
                    {minMatches > 0 && (
                        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-left">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-400" />
                                    Elegibilidad para Liguilla
                                </h4>
                                {isEligible ? (
                                    <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                        <Sparkles className="w-3 h-3" /> CUMPLE REGLA
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 border border-amber-700/60 px-2.5 py-0.5 rounded-lg">
                                        FALTAN {missingMatches} {missingMatches === 1 ? 'JUEGO' : 'JUEGOS'}
                                    </span>
                                )}
                            </div>

                            {/* Barra de Progreso */}
                            <div className="w-full bg-slate-800/90 rounded-full h-2.5 mb-2 overflow-hidden border border-slate-700/40">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-700 ${
                                        isEligible ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30' : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            <div className="flex justify-between items-center text-[11px] text-slate-400">
                                <span>
                                    <strong className="text-white font-mono">{actualMatchesCount}</strong> partidos en cédula
                                </span>
                                <span>Mínimo requerido: <strong className="text-white font-mono">{minMatches}</strong></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default PlayerProfileModal;
