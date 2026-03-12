import { useEffect, useState, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { leagueApi, Match } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { Link, useParams } from 'react-router-dom';

interface FullCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FullCalendarModal = ({ isOpen, onClose }: FullCalendarModalProps) => {
    const { settings } = useTenantSettings();
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMatchday, setActiveMatchday] = useState<number>(1);

    useEffect(() => {
        if (!isOpen || !settings?.tenantId) return;

        setLoading(true);
        leagueApi.getAllMatches(settings.tenantId)
            .then(res => {
                const fetchedMatches = res.data;
                setMatches(fetchedMatches);
            })
            .catch(err => console.error("Error fetching full calendar", err))
            .finally(() => setLoading(false));

    }, [isOpen, settings?.tenantId]);

    // Handle escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaMexiquense'}/team/${teamId || '1'}`;
    };

    // Extract unique seasons
    const availableSeasons = useMemo(() => {
        const seasonMap = new Map<string, string>();
        matches.forEach(m => {
            const id = m.seasonId || m.season?.id;
            if (id) {
                seasonMap.set(id, m.season?.name || 'Categoría');
            }
        });
        return Array.from(seasonMap.entries()).map(([id, name]) => ({ id, name }));
    }, [matches]);

    const [activeSeasonId, setActiveSeasonId] = useState<string>('');

    // Set default season on load
    useEffect(() => {
        if (availableSeasons.length > 0 && !activeSeasonId) {
            setActiveSeasonId(availableSeasons[0].id);
        }
    }, [availableSeasons, activeSeasonId]);

    const seasonMatches = useMemo(() => {
        if (!activeSeasonId) return [];
        return matches.filter(m => (m.seasonId === activeSeasonId) || (m.season?.id === activeSeasonId));
    }, [matches, activeSeasonId]);

    // Calculate available matchdays for the tabs based on selected season
    const matchdays = useMemo(() => {
        const uniqueMatchdays = new Set(seasonMatches.map(m => m.matchday || 1));
        return Array.from(uniqueMatchdays).sort((a, b) => a - b);
    }, [seasonMatches]);

    // Update active matchday when season changes
    useEffect(() => {
        if (seasonMatches.length > 0) {
            const latest = Math.max(...seasonMatches.map(m => m.matchday || 1));
            setActiveMatchday(latest);
        }
    }, [activeSeasonId, seasonMatches.length]);

    const activeMatches = useMemo(() => {
        return seasonMatches.filter(m => (m.matchday || 1) === activeMatchday);
    }, [seasonMatches, activeMatchday]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">

            <div className="bg-slate-900 border border-white/10 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 object-contain mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings?.matchTickerBackgroundClass || 'bg-blue-600'}`}>
                            <CalendarIcon className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Calendario de la Temporada
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 overflow-hidden bg-slate-950/50">

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[300px]">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p>Cargando partidos...</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                            <p>No hay partidos registrados en esta temporada.</p>
                        </div>
                    ) : (
                        <>
                            {/* Season Tabs - Only show if > 1 */}
                            {availableSeasons.length > 1 && (
                                <div className="w-full overflow-x-auto scrollbar-hide bg-slate-900 border-b border-white/5 z-20">
                                    <div className="flex p-3 gap-3 min-w-max">
                                        {availableSeasons.map((season) => {
                                            const shortName = season.name.includes(' - ') ? season.name.split(' - ')[1] : season.name;
                                            return (
                                                <button
                                                    key={season.id}
                                                    onClick={() => setActiveSeasonId(season.id)}
                                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeSeasonId === season.id
                                                        ? 'bg-slate-800 text-white shadow-inner border border-white/10'
                                                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                                                        }`}
                                                >
                                                    {shortName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Matchday Tabs */}
                            <div className="w-full overflow-x-auto scrollbar-hide border-b border-white/5 bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                                <div className="flex p-3 gap-2 min-w-max px-4">
                                    {matchdays.map((day) => (
                                        <button
                                            key={day}
                                            onClick={() => setActiveMatchday(day)}
                                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeMatchday === day
                                                ? `${settings?.matchTickerBackgroundClass || 'bg-blue-600'} text-white shadow-md ring-1 ring-white/20`
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                                }`}
                                        >
                                            Jornada {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Match List for Selected Matchday */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                                {activeMatches.length === 0 ? (
                                    <p className="text-center text-slate-500 py-10">No hay partidos para la Jornada {activeMatchday}.</p>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {activeMatches.map(match => {
                                            const isFinished = match.status === 'FINISHED';
                                            const homeScoreBold = (match.homeScore || 0) > (match.awayScore || 0) ? 'font-black text-white' : 'font-medium text-slate-300';
                                            const awayScoreBold = (match.awayScore || 0) > (match.homeScore || 0) ? 'font-black text-white' : 'font-medium text-slate-300';

                                            return (
                                                <div key={match.id} className="bg-slate-900 border border-white/5 rounded-xl p-4 flex flex-col hover:border-white/20 transition-colors group">

                                                    {/* Status Badge */}
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex flex-col">
                                                            <p className="font-medium text-slate-300 capitalize text-sm">
                                                                {match.matchDate
                                                                    ? new Date(match.matchDate).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                    : 'Horario por definir'
                                                                }
                                                            </p>
                                                            {match.location && (
                                                                <span className="text-xs text-slate-500 font-medium mt-0.5">📍 {match.location}</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${match.status === 'FINISHED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            'bg-slate-800 text-slate-400'
                                                            }`}>
                                                            {match.status === 'FINISHED' ? 'Finalizado' :
                                                                match.status === 'CANCELLED' ? 'Cancelado' :
                                                                    'Por Jugar'}
                                                        </span>
                                                    </div>

                                                    {/* Teams and Scores */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs text-slate-300 relative overflow-hidden group-hover:bg-white/10 transition-colors">
                                                                    {match.homeTeam?.logoUrl ? (
                                                                        <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        match.homeTeam?.name?.substring(0, 2).toUpperCase() || 'LO'
                                                                    )}
                                                                </div>
                                                                <Link to={getTeamLink(match.homeTeamId)} className={`hover:underline hover:text-blue-400 ${homeScoreBold}`}>
                                                                    {match.homeTeam?.name || 'Local'}
                                                                </Link>
                                                            </div>
                                                            <div className={`text-xl ${isFinished ? homeScoreBold : 'text-slate-600'}`}>
                                                                {isFinished ? (match.homeScore ?? '-') : '-'}
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs text-slate-300 relative overflow-hidden group-hover:bg-white/10 transition-colors">
                                                                    {match.awayTeam?.logoUrl ? (
                                                                        <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        match.awayTeam?.name?.substring(0, 2).toUpperCase() || 'VI'
                                                                    )}
                                                                </div>
                                                                <Link to={getTeamLink(match.awayTeamId)} className={`hover:underline hover:text-blue-400 ${awayScoreBold}`}>
                                                                    {match.awayTeam?.name || 'Visitante'}
                                                                </Link>
                                                            </div>
                                                            <div className={`text-xl ${isFinished ? awayScoreBold : 'text-slate-600'}`}>
                                                                {isFinished ? (match.awayScore ?? '-') : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
