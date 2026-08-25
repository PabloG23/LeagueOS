import { useState, useEffect } from 'react';
import { Save, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Search, FileText, Calendar, Shield, Printer, Loader2, ArrowLeftRight } from 'lucide-react';
import { MatchReportWizard } from './MatchReportWizard';
import { EditMatchScheduleModal } from './EditMatchScheduleModal';
import { Match, Player, Season, leagueApi, Team } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import {
    generateRefereeMatchSheetPDF,
    generateMatchdaySubstitutionCardsPDF,
    SubstitutionCardsModal,
} from '@/features/match-report';
import { TeamLogo } from '@/shared/components/TeamLogo';

// UI Helper to match the design logic
interface UIMatch extends Match {
    home: string;
    away: string;
}

const MatchRow = ({
    match,
    onOpenWizard,
    onOpenEditSchedule,
    onDownloadSheet,
    onOpenCardsModal,
    isDownloadingSheet,
}: {
    match: UIMatch;
    onOpenWizard: (m: UIMatch) => void;
    onOpenEditSchedule: (m: UIMatch) => void;
    onDownloadSheet: (m: UIMatch) => void;
    onOpenCardsModal: (m: UIMatch) => void;
    isDownloadingSheet?: boolean;
}) => {
    const isFinished = match.status === 'FINISHED';

    return (
        <div className="hover:bg-slate-50/80 transition-colors duration-200">
            <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Match Teams & Info */}
                <div className="flex-1 flex items-center justify-between w-full min-w-0">
                    {/* Home Team */}
                    <div className="flex-1 flex items-center justify-end gap-3.5 min-w-0">
                        <span className="font-bold text-slate-800 text-sm sm:text-base truncate text-right">{match.home}</span>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden text-indigo-600 shadow-xs shrink-0">
                            <TeamLogo
                                teamName={match.home}
                                logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl}
                                fallbackClass="text-xs font-bold text-indigo-600"
                            />
                        </div>
                    </div>

                    {/* Status / Score Area */}
                    <div className="flex flex-col items-center gap-1 px-4 sm:px-6 w-44 sm:w-48 text-center shrink-0">
                        {isFinished ? (
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-slate-900">{match.homeScore}</span>
                                <span className="text-slate-300 font-light">-</span>
                                <span className="text-2xl font-black text-slate-900">{match.awayScore}</span>
                            </div>
                        ) : (
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-full">
                                Por Jugar
                            </span>
                        )}
                        <div className="flex flex-col mt-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                                {match.matchDate ? new Date(match.matchDate).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Horario por definir'}
                            </span>
                            {match.location && (
                                match.field?.locationUrl ? (
                                    <a
                                        href={match.field.locationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-bold truncate w-full flex items-center justify-center gap-1 hover:underline cursor-pointer"
                                        title={`Ver ubicación de ${match.location} en Google Maps`}
                                    >
                                        <span>📍 {match.location}</span>
                                    </a>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-medium truncate w-full" title={match.location}>📍 {match.location}</span>
                                )
                            )}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex items-center justify-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden text-purple-600 shadow-xs shrink-0">
                            <TeamLogo
                                teamName={match.away}
                                logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl}
                                fallbackClass="text-xs font-bold text-purple-600"
                            />
                        </div>
                        <span className="font-bold text-slate-800 text-sm sm:text-base truncate text-left">{match.away}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="md:pl-4 md:border-l md:border-slate-100 flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
                    <button
                        onClick={() => onOpenEditSchedule(match)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                        title="Definir o cambiar fecha, hora y cancha"
                    >
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>Horario</span>
                    </button>

                    <button
                        onClick={() => onDownloadSheet(match)}
                        disabled={isDownloadingSheet}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm disabled:opacity-50"
                        title="Descargar Cédula Arbitral Oficial en PDF para imprimir"
                    >
                        {isDownloadingSheet ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                            <Printer className="w-4 h-4 text-slate-600" />
                        )}
                        <span>Cédula PDF</span>
                    </button>

                    <button
                        onClick={() => onOpenCardsModal(match)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                        title="Descargar Tarjetas de Cambio en PDF para este partido"
                    >
                        <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                        <span>Tarjetas PDF</span>
                    </button>

                    <button
                        onClick={() => onOpenWizard(match)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                            isFinished
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>{isFinished ? 'Editar Cédula' : 'Cédula Digital'}</span>
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
    const [selectedCardsMatch, setSelectedCardsMatch] = useState<UIMatch | null>(null);
    const [downloadingMatchId, setDownloadingMatchId] = useState<string | null>(null);
    const [isPublishingMatchday, setIsPublishingMatchday] = useState(false);
    const [isDownloadingMatchdayCards, setIsDownloadingMatchdayCards] = useState(false);
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
                away: m.awayTeam?.name || 'Visitante',
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

    const handleDownloadRefereeSheet = async (m: UIMatch) => {
        if (!settings?.tenantId) return;
        setDownloadingMatchId(m.id);
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

            const currentSeason = seasons.find(s => s.id === selectedSeasonId);

            await generateRefereeMatchSheetPDF({
                match: m,
                homeTeamName: m.home,
                awayTeamName: m.away,
                homeRoster: homeRes.data || [],
                awayRoster: awayRes.data || [],
                seasonName: currentSeason?.name,
                leagueName: settings.name,
                leagueLogoUrl: settings.logoUrl,
            });

            showToast("Cédula PDF generada y descargada con éxito.", "success");
        } catch (err) {
            console.error("Error generating match sheet PDF:", err);
            showToast("Error al generar la cédula en PDF.", "error");
        } finally {
            setDownloadingMatchId(null);
        }
    };

    const handleDownloadMatchdayCards = async () => {
        if (!selectedMatchday || displayedMatches.length === 0 || !settings?.tenantId) return;
        setIsDownloadingMatchdayCards(true);
        try {
            const currentSeason = seasons.find(s => s.id === selectedSeasonId);
            await generateMatchdaySubstitutionCardsPDF({
                matches: displayedMatches,
                matchday: Number(selectedMatchday),
                seasonName: currentSeason?.name,
                leagueName: settings.name,
                leagueLogoUrl: settings.logoUrl,
            });
            showToast(`Tarjetas de cambio de la Jornada ${selectedMatchday} descargadas con éxito.`, "success");
        } catch (err) {
            console.error("Error generating matchday substitution cards:", err);
            showToast("Error al generar las tarjetas de cambio de la jornada.", "error");
        } finally {
            setIsDownloadingMatchdayCards(false);
        }
    };

    const handlePublishMatchday = async () => {
        if (!selectedSeasonId || !selectedMatchday || !settings?.tenantId) return;
        setIsPublishingMatchday(true);
        try {
            await leagueApi.updateCurrentMatchday(settings.tenantId, selectedSeasonId, Number(selectedMatchday));
            
            // Refetch seasons to update the currentMatchday in the seasons list
            const res = await leagueApi.getSeasons(settings.tenantId);
            setSeasons(res.data);
            
            showToast(`La Jornada ${selectedMatchday} ahora es pública en el inicio`, 'success');
        } catch (error) {
            console.error('Error publishing matchday', error);
            showToast('Error al publicar la jornada', 'error');
        } finally {
            setIsPublishingMatchday(false);
        }
    };

    const displayedMatches = matches.filter(m => (m.matchday || 1) === selectedMatchday);

    return (
        <div className="space-y-6 relative h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Resultados de Partidos</h1>
                    <p className="text-slate-500">Gestión de Cédulas Digitales, Impresión y Marcadores.</p>
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
                        {matchdays.map(md => {
                            const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
                            const isCurrent = selectedSeason?.currentMatchday === md;
                            return (
                                <option key={md} value={md}>
                                    Jornada {md} {isCurrent ? '(Pública)' : ''}
                                </option>
                            );
                        })}
                    </select>

                    {/* Batch Download Matchday Cards Button */}
                    <button
                        onClick={handleDownloadMatchdayCards}
                        disabled={displayedMatches.length === 0 || isDownloadingMatchdayCards}
                        className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg font-medium text-sm transition-colors shadow-xs disabled:opacity-50"
                        title="Descargar todas las tarjetas de cambio de los partidos de esta jornada en un solo PDF"
                    >
                        {isDownloadingMatchdayCards ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="hidden sm:inline">Tarjetas Jornada</span>
                    </button>

                    <button
                        onClick={handlePublishMatchday}
                        disabled={!selectedMatchday || isPublishingMatchday || seasons.find(s => s.id === selectedSeasonId)?.currentMatchday === selectedMatchday}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {isPublishingMatchday ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Publicar como Actual
                    </button>
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
                            <MatchRow
                                key={match.id}
                                match={match}
                                onOpenWizard={handleOpenWizard}
                                onOpenEditSchedule={setSelectedEditMatch}
                                onDownloadSheet={handleDownloadRefereeSheet}
                                onOpenCardsModal={setSelectedCardsMatch}
                                isDownloadingSheet={downloadingMatchId === match.id}
                            />
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

            {selectedCardsMatch && (
                <SubstitutionCardsModal
                    match={selectedCardsMatch}
                    isOpen={!!selectedCardsMatch}
                    onClose={() => setSelectedCardsMatch(null)}
                    leagueLogoUrl={settings?.logoUrl}
                    leagueName={settings?.name}
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
