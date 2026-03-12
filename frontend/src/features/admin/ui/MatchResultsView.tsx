import { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Search, FileText, Calendar } from 'lucide-react';
import { MatchReportWizard } from './MatchReportWizard';
import { EditMatchScheduleModal } from './EditMatchScheduleModal';
import { Match, Player, Season, leagueApi, Team } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';

// UI Helper to match the design logic
interface UIMatch extends Match {
    home: string;
    homeLogo: string;
    away: string;
    awayLogo: string;
}

const MatchRow = ({ match, onOpenWizard, onOpenEditSchedule }: { match: UIMatch, onOpenWizard: (m: UIMatch) => void, onOpenEditSchedule: (m: UIMatch) => void }) => {
    const isFinished = match.status === 'FINISHED';

    return (
        <div className="hover:bg-slate-50 transition-colors duration-200">
            <div className="p-4 flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    <span className="font-semibold text-slate-900 hidden sm:block">{match.home}</span>
                    <img src={match.homeLogo} alt={match.home} className="w-10 h-10 object-cover rounded-full bg-slate-50 border border-slate-100" />
                </div>

                {/* Status / Action Area */}
                <div className="flex flex-col items-center gap-1 px-6 w-48 text-center">
                    {isFinished ? (
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-slate-900">{match.homeScore}</span>
                            <span className="text-slate-400 font-bold">-</span>
                            <span className="text-2xl font-bold text-slate-900">{match.awayScore}</span>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                            Por Jugar
                        </span>
                    )}
                    <div className="flex flex-col mt-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                            {match.matchDate ? new Date(match.matchDate).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Horario por definir'}
                        </span>
                        {match.location && (
                            <span className="text-[10px] text-slate-400 font-medium truncate w-full" title={match.location}>📍 {match.location}</span>
                        )}
                    </div>
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-start gap-4">
                    <img src={match.awayLogo} alt={match.away} className="w-10 h-10 object-cover rounded-full bg-slate-50 border border-slate-100" />
                    <span className="font-semibold text-slate-900 hidden sm:block">{match.away}</span>
                </div>

            {/* Action Button */}
            <div className="pl-4 border-l border-slate-100 ml-4 flex gap-2">
                <button
                    onClick={() => onOpenEditSchedule(match)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                >
                    <Calendar className="w-4 h-4" />
                    Editar Horario
                </button>
                <button
                    onClick={() => onOpenWizard(match)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${isFinished ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'}`}
                >
                    <FileText className="w-4 h-4" />
                    {isFinished ? 'Editar Cédula' : 'Cédula Digital'}
                </button>
            </div>
        </div>
    </div>
);
};

export const MatchResultsView = () => {
    const { settings } = useTenantSettings();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [matches, setMatches] = useState<UIMatch[]>([]);
    const [matchdays, setMatchdays] = useState<number[]>([]);
    const [selectedMatchday, setSelectedMatchday] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    const [selectedMatch, setSelectedMatch] = useState<UIMatch | null>(null);
    const [selectedEditMatch, setSelectedEditMatch] = useState<UIMatch | null>(null);
    const [homeRoster, setHomeRoster] = useState<Player[]>([]);
    const [awayRoster, setAwayRoster] = useState<Player[]>([]);
    const [loadingRosters, setLoadingRosters] = useState(false);

    useEffect(() => {
        if (!settings?.tenantId) return;
        leagueApi.getSeasons(settings.tenantId)
            .then(res => {
                setSeasons(res.data);
                if (res.data.length > 0) {
                    setSelectedSeasonId(res.data[0].id);
                }
            })
            .catch(err => console.error("Error loading seasons", err));
    }, [settings?.tenantId]);

    const loadMatches = async () => {
        if (!settings?.tenantId || !selectedSeasonId) return;
        setIsLoading(true);
        try {
            const res = await leagueApi.getSeasonMatches(settings.tenantId, selectedSeasonId);
            const fetchedMatches = res.data;
            const uiMatches: UIMatch[] = fetchedMatches.map(m => ({
                ...m,
                home: m.homeTeam?.name || 'Local',
                homeLogo: m.homeTeam?.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.homeTeam?.name}`,
                away: m.awayTeam?.name || 'Visitante',
                awayLogo: m.awayTeam?.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.awayTeam?.name}`,
            }));

            const mDays = Array.from(new Set(uiMatches.map(m => m.matchday || 1))).sort((a, b) => a - b);
            setMatchdays(mDays);

            // Si el selectedMatchday actual no está en la nueva lista, seleccionar el menor
            if (mDays.length > 0 && !mDays.includes(Number(selectedMatchday))) {
                setSelectedMatchday(mDays[0]);
            } else if (mDays.length === 0) {
                setSelectedMatchday('');
            }

            setMatches(uiMatches);
        } catch (error) {
            console.error("Error loading matches:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMatches();
    }, [settings?.tenantId, selectedSeasonId]);

    const handleWizardSuccess = () => {
        loadMatches();
        setSelectedMatch(null);
    };

    const handleOpenWizard = async (m: UIMatch) => {
        if (!settings?.tenantId) return;
        setLoadingRosters(true);
        try {
            const homeId = m.homeTeam?.id || m.homeTeamId;
            const awayId = m.awayTeam?.id || m.awayTeamId;

            if (!homeId || !awayId) {
                console.error("Missing team IDs in match object", m);
                throw new Error("Missing team IDs");
            }

            const [homeRes, awayRes] = await Promise.all([
                leagueApi.getTeamPlayers(settings.tenantId, homeId),
                leagueApi.getTeamPlayers(settings.tenantId, awayId),
            ]);
            setHomeRoster(homeRes.data);
            setAwayRoster(awayRes.data);
            setSelectedMatch(m);
        } catch (e) {
            console.error("Error fetching rosters", e);
            showToast("No se pudo cargar la plantilla.", "error");
        } finally {
            setLoadingRosters(false);
        }
    };

    const displayedMatches = matches.filter(m => (m.matchday || 1) === selectedMatchday);

    return (
        <div className="space-y-6 relative h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Resultados de Partidos</h1>
                    <p className="text-slate-500">Gestión de Cédulas Digitales y Marcadores.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Season Selector */}
                    <select
                        value={selectedSeasonId}
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                        className="w-full sm:w-auto bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        {seasons.length === 0 && <option value="">Sin Torneos</option>}
                        {seasons.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>

                    {/* Matchday Selector */}
                    <select
                        value={selectedMatchday}
                        onChange={(e) => setSelectedMatchday(Number(e.target.value))}
                        disabled={matchdays.length === 0}
                        className="w-full sm:w-auto bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        {matchdays.length === 0 && <option value="">Sin Jornadas</option>}
                        {matchdays.map(md => (
                            <option key={md} value={md}>Jornada {md}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-500 text-sm flex justify-between">
                    <span>Partidos Programados</span>
                    <span className="text-slate-400 font-normal">
                        {selectedMatchday ? `Jornada ${selectedMatchday}` : 'Seleccione una jornada'}
                    </span>
                </div>
                <div className="divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Cargando partidos...</div>
                    ) : displayedMatches.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            No hay partidos programados en esta jornada.
                        </div>
                    ) : (
                        displayedMatches.map((match) => (
                            <MatchRow key={match.id} match={match} onOpenWizard={handleOpenWizard} onOpenEditSchedule={setSelectedEditMatch} />
                        ))
                    )}
                </div>
            </div>

            {selectedMatch && (
                <MatchReportWizard
                    match={selectedMatch}
                    homeRoster={homeRoster}
                    awayRoster={awayRoster}
                    homeTeamName={selectedMatch.home}
                    awayTeamName={selectedMatch.away}
                    onClose={() => setSelectedMatch(null)}
                    onSuccess={handleWizardSuccess}
                />
            )}

            {loadingRosters && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <span className="bg-white p-4 rounded-xl shadow-lg font-bold text-slate-700 animate-pulse">Cargando plantillas...</span>
                </div>
            )}
            {selectedEditMatch && (
                <EditMatchScheduleModal
                    match={selectedEditMatch}
                    isOpen={!!selectedEditMatch}
                    onClose={() => setSelectedEditMatch(null)}
                    onMatchUpdated={handleWizardSuccess}
                />
            )}
        </div>
    );
};
