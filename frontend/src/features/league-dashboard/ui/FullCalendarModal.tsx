import { useEffect, useState, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Loader2, MapPin, Clock, FileText } from 'lucide-react';
import { leagueApi, Match } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { MatchReportPhotoModal } from '@/shared/components/MatchReportPhotoModal';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

interface FullCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FullCalendarModal = ({ isOpen, onClose }: FullCalendarModalProps) => {
    const { settings } = useTenantSettings();
    const isMetepec = settings?.themeClass === 'theme-metepec' || settings?.tenantId === 'e39a6b17-5646-452d-929c-ca9a8dc4e44d';
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMatchday, setActiveMatchday] = useState<number>(1);
    const [selectedMatchForReport, setSelectedMatchForReport] = useState<Match | null>(null);

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
        if (!teamId) return undefined;
        return `/${leagueSlug || 'ligaNuestroDeporte'}/team/${teamId}`;
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
        return Array.from(seasonMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
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

    // Update active matchday when season changes (default to first matchday)
    useEffect(() => {
        if (seasonMatches.length > 0) {
            const earliest = Math.min(...seasonMatches.map(m => m.matchday || 1));
            setActiveMatchday(earliest || 1);
        }
    }, [activeSeasonId, seasonMatches.length]);

    const activeMatches = useMemo(() => {
        return seasonMatches.filter(m => (m.matchday || 1) === activeMatchday);
    }, [seasonMatches, activeMatchday]);

    if (!isOpen) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4",
            isMetepec ? "bg-black/85 backdrop-blur-md" : "bg-slate-900/80"
        )}>

            <div className={cn(
                "shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 object-contain mx-auto border",
                isMetepec
                    ? "bg-[#0E1210] border-[#93C572]/25 shadow-black/90 ring-1 ring-[#93C572]/15"
                    : "bg-slate-900 border-white/10"
            )}>
                {/* Header */}
                <div className={cn(
                    "flex items-center justify-between p-6 border-b",
                    isMetepec
                        ? "bg-[#0B0F0D] border-[#93C572]/20"
                        : "bg-slate-900/50 border-white/10"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            isMetepec
                                ? "bg-[#93C572]/15 border border-[#93C572]/30 text-[#93C572]"
                                : (settings?.matchTickerBackgroundClass || 'bg-blue-600')
                        )}>
                            <CalendarIcon className={cn("w-5 h-5", isMetepec ? "text-[#93C572]" : "text-white")} />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Calendario de la Temporada
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-2 rounded-full transition-colors",
                            isMetepec
                                ? "text-slate-400 hover:text-[#93C572] hover:bg-[#93C572]/10"
                                : "text-slate-400 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className={cn(
                    "flex flex-col flex-1 overflow-hidden",
                    isMetepec ? "bg-[#080B09]" : "bg-slate-950/50"
                )}>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 min-h-[300px]">
                            <Loader2 className={cn("w-8 h-8 animate-spin", isMetepec ? "text-[#93C572]" : "text-blue-500")} />
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
                                <div className={cn(
                                    "w-full overflow-x-auto scrollbar-hide border-b z-20 shrink-0",
                                    isMetepec
                                        ? "bg-[#0E1210] border-[#93C572]/15"
                                        : "border-white/5 bg-slate-900"
                                )}>
                                    <div className="flex items-center py-4 px-4 gap-3 min-w-max">
                                        {availableSeasons.map((season) => {
                                            const shortName = season.name.includes(' - ') ? season.name.split(' - ')[1] : season.name;
                                            return (
                                                <button
                                                    key={season.id}
                                                    onClick={() => setActiveSeasonId(season.id)}
                                                    className={cn(
                                                        "px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                                                        activeSeasonId === season.id
                                                            ? isMetepec
                                                                ? "bg-[#1C261F] text-[#93C572] border border-[#93C572]/40 shadow-sm"
                                                                : "bg-slate-800 text-white shadow-md ring-1 ring-white/20"
                                                            : isMetepec
                                                                ? "bg-transparent text-slate-400 hover:text-[#93C572] hover:bg-[#93C572]/10"
                                                                : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                                    )}
                                                >
                                                    {shortName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Matchday Tabs */}
                            <div className={cn(
                                "w-full overflow-x-auto scrollbar-hide border-b sticky top-0 z-10 shadow-sm snap-x snap-mandatory shrink-0 backdrop-blur-md",
                                isMetepec
                                    ? "bg-[#0B0E0C]/90 border-[#93C572]/15"
                                    : "border-white/5 bg-slate-900/80"
                            )}>
                                <div className="flex items-center py-4 px-4 gap-2 min-w-max">
                                    {matchdays.map((day) => {
                                        const isActive = activeMatchday === day;
                                        return (
                                            <button
                                                key={day}
                                                ref={isActive ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) : null}
                                                onClick={() => setActiveMatchday(day)}
                                                className={cn(
                                                    "snap-center px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap",
                                                    isActive
                                                        ? isMetepec
                                                            ? "bg-[#93C572] text-[#0E1210] font-black shadow-lg shadow-[#93C572]/25 ring-4 ring-[#93C572]/25"
                                                            : "bg-white text-slate-900 shadow-lg ring-4 ring-white/10"
                                                        : isMetepec
                                                            ? "text-slate-400 hover:text-[#93C572] hover:bg-[#93C572]/10"
                                                            : "text-slate-400 hover:text-white hover:bg-white/10"
                                                )}
                                            >
                                                Jornada {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Match List for Selected Matchday */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                                {activeMatches.length === 0 ? (
                                    <p className={cn("text-center py-10", isMetepec ? "text-slate-400" : "text-slate-500")}>
                                        No hay partidos para la Jornada {activeMatchday}.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {activeMatches.map(match => {
                                            const isFinished = match.status === 'FINISHED';
                                            const isDraw = isFinished && match.homeScore !== null && match.homeScore !== undefined && match.homeScore === match.awayScore;
                                            const penaltyWinnerId = match.penaltyWinnerTeamId || (match as any).penaltyWinnerTeam?.id;
                                            const hasShootout = isDraw && (
                                                (match.homePenaltyScore !== null && match.homePenaltyScore !== undefined) ||
                                                penaltyWinnerId != null
                                            );
                                            const homeWon = isFinished && (
                                                (match.homeScore || 0) > (match.awayScore || 0) ||
                                                (hasShootout && penaltyWinnerId === (match.homeTeam?.id || match.homeTeamId))
                                            );
                                            const awayWon = isFinished && (
                                                (match.awayScore || 0) > (match.homeScore || 0) ||
                                                (hasShootout && penaltyWinnerId === (match.awayTeam?.id || match.awayTeamId))
                                            );

                                            return (
                                                <div
                                                    key={match.id}
                                                    className={cn(
                                                        "rounded-2xl p-4 flex flex-col gap-4 transition-all group backdrop-blur-sm border",
                                                        isMetepec
                                                            ? "bg-[#1C261F] border-[#93C572]/25 hover:border-[#93C572]/70 hover:shadow-lg hover:shadow-[#93C572]/10"
                                                            : "bg-slate-800/40 border-white/10 hover:bg-slate-800/80 hover:border-white/20"
                                                    )}
                                                >

                                                    {/* Status Badge & Location */}
                                                    <div className={cn(
                                                        "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2 pb-3 border-b",
                                                        isMetepec ? "border-[#93C572]/15" : "border-white/5"
                                                    )}>
                                                        {/* Match Info (Date & Location) */}
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                                                                <Clock className={cn("w-3.5 h-3.5", isMetepec ? "text-[#93C572]" : "text-slate-500")} />
                                                                <span className={cn("capitalize", isMetepec ? "text-slate-200" : "text-slate-300")}>
                                                                    {match.matchDate
                                                                        ? new Date(match.matchDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                                        : 'Horario por definir'}
                                                                </span>
                                                            </div>
                                                            {match.location && (
                                                                match.field?.locationUrl ? (
                                                                    <a
                                                                        href={match.field.locationUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className={cn(
                                                                            "flex items-center gap-1.5 text-[11px] font-bold transition-colors hover:underline cursor-pointer",
                                                                            isMetepec ? "text-[#93C572] hover:text-[#93C572]/80" : "text-blue-400 hover:text-blue-300"
                                                                        )}
                                                                        title="Ver ubicación en Google Maps"
                                                                    >
                                                                        <MapPin className={cn("w-3 h-3", isMetepec ? "text-[#93C572]" : "text-blue-400")} />
                                                                        <span className="truncate max-w-[200px] sm:max-w-[250px] uppercase tracking-wider">{match.location}</span>
                                                                    </a>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                                                        <MapPin className={cn("w-3 h-3", isMetepec ? "text-[#93C572]" : "text-slate-500")} />
                                                                        <span className="truncate max-w-[200px] sm:max-w-[250px] uppercase tracking-wider">{match.location}</span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>

                                                        {/* Status and Action Buttons */}
                                                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                                            {/* Foto Cédula Button if available */}
                                                            {(match.hasReportPhoto || match.reportPhotoUrl) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSelectedMatchForReport(match);
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105 active:scale-95 shadow-xs border",
                                                                        isMetepec
                                                                            ? "bg-[#93C572]/15 hover:bg-[#93C572]/25 text-[#93C572] border-[#93C572]/30"
                                                                            : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30"
                                                                    )}
                                                                    title="Ver foto de la cédula arbitral oficial del partido"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                    <span>Foto Cédula</span>
                                                                </button>
                                                            )}

                                                            {/* Status Badge */}
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-md uppercase tracking-wider text-[10px] font-bold shadow-sm",
                                                                isFinished
                                                                    ? isMetepec
                                                                        ? "bg-[#93C572]/15 text-[#93C572] ring-1 ring-[#93C572]/30"
                                                                        : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                                                                    : match.status === 'CANCELLED'
                                                                        ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                                                                        : isMetepec
                                                                            ? "bg-[#0E1210] text-[#93C572] ring-1 ring-[#93C572]/30"
                                                                            : "bg-slate-700/50 text-slate-300 ring-1 ring-white/10"
                                                            )}>
                                                                {isFinished ? 'Finalizado' : match.status === 'CANCELLED' ? 'Cancelado' : 'Por Jugar'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Teams and Scores Horizontal Layout */}
                                                    <div className="flex items-start justify-between w-full pt-2">
                                                        {/* Home Team */}
                                                        <div className="flex flex-col items-center gap-3 w-[30%]">
                                                            <div className={cn(
                                                                "w-14 h-14 rounded-full flex items-center justify-center font-bold text-base relative overflow-hidden transition-colors shadow-inner ring-1",
                                                                isMetepec
                                                                    ? "bg-[#0E1210] text-slate-200 ring-[#93C572]/25 group-hover:bg-[#0A0D0B]"
                                                                    : "bg-slate-800 text-slate-300 ring-white/10 group-hover:bg-slate-700"
                                                            )}>
                                                                <TeamLogo 
                                                                    teamName={match.homeTeam?.name || 'Local'} 
                                                                    logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl} 
                                                                    fallbackClass={cn("text-sm font-bold", isMetepec ? "text-[#93C572]" : "text-slate-300")}
                                                                />
                                                            </div>
                                                            <Link
                                                                to={getTeamLink(match.homeTeam?.id || match.homeTeamId) || '#'}
                                                                className={cn(
                                                                    "text-xs text-center leading-tight line-clamp-3 transition-colors",
                                                                    isMetepec ? "hover:text-[#93C572]" : "hover:text-blue-400",
                                                                    homeWon ? "font-black text-white" : "font-semibold text-slate-400"
                                                                )}
                                                            >
                                                                {match.homeTeam?.name || 'Local'}
                                                            </Link>
                                                        </div>

                                                        {/* Score */}
                                                        <div className="flex flex-col items-center justify-center w-[40%] mt-2">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <span className={`text-3xl sm:text-4xl ${homeWon ? 'font-black text-white' : (isFinished && awayWon ? 'font-bold text-slate-400' : 'font-bold text-slate-200')}`}>
                                                                    {isFinished ? (match.homeScore ?? '-') : '-'}
                                                                </span>
                                                                <span className={cn("font-bold text-xl", isMetepec ? "text-[#93C572]/40" : "text-slate-600")}>-</span>
                                                                <span className={`text-3xl sm:text-4xl ${awayWon ? 'font-black text-white' : (isFinished && homeWon ? 'font-bold text-slate-400' : 'font-bold text-slate-200')}`}>
                                                                    {isFinished ? (match.awayScore ?? '-') : '-'}
                                                                </span>
                                                            </div>
                                                            {hasShootout && (
                                                                <div className="mt-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase shadow-xs whitespace-nowrap text-center">
                                                                    {match.homePenaltyScore !== null && match.homePenaltyScore !== undefined && match.awayPenaltyScore !== null && match.awayPenaltyScore !== undefined
                                                                        ? `(${match.homePenaltyScore}) PEN (${match.awayPenaltyScore})`
                                                                        : 'Ganó en penales'}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Away Team */}
                                                        <div className="flex flex-col items-center gap-3 w-[30%]">
                                                            <div className={cn(
                                                                "w-14 h-14 rounded-full flex items-center justify-center font-bold text-base relative overflow-hidden transition-colors shadow-inner ring-1",
                                                                isMetepec
                                                                    ? "bg-[#0E1210] text-slate-200 ring-[#93C572]/25 group-hover:bg-[#0A0D0B]"
                                                                    : "bg-slate-800 text-slate-300 ring-white/10 group-hover:bg-slate-700"
                                                            )}>
                                                                <TeamLogo 
                                                                    teamName={match.awayTeam?.name || 'Visitante'} 
                                                                    logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl} 
                                                                    fallbackClass={cn("text-sm font-bold", isMetepec ? "text-[#93C572]" : "text-slate-300")}
                                                                />
                                                            </div>
                                                            <Link
                                                                to={getTeamLink(match.awayTeam?.id || match.awayTeamId) || '#'}
                                                                className={cn(
                                                                    "text-xs text-center leading-tight line-clamp-3 transition-colors",
                                                                    isMetepec ? "hover:text-[#93C572]" : "hover:text-blue-400",
                                                                    awayWon ? "font-black text-white" : "font-semibold text-slate-400"
                                                                )}
                                                            >
                                                                {match.awayTeam?.name || 'Visitante'}
                                                            </Link>
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

            {/* Singleton Match Report Photo Modal */}
            <MatchReportPhotoModal
                isOpen={!!selectedMatchForReport}
                onClose={() => setSelectedMatchForReport(null)}
                tenantId={settings?.tenantId}
                match={selectedMatchForReport}
            />
        </div>
    );
};
