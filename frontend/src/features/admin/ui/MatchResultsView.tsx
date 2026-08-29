import { useState, useEffect, useRef } from 'react';
import { Save, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Search, FileText, Calendar, Shield, Printer, Loader2, ArrowLeftRight, ImageDown, ShieldCheck, FileDown, Camera, ExternalLink, Trophy } from 'lucide-react';
import { MatchReportWizard } from './MatchReportWizard';
import { EditMatchScheduleModal } from './EditMatchScheduleModal';
import { QuickScoreModal } from './QuickScoreModal';
import { Match, Player, Season, leagueApi, Team } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import {
    generateRefereeMatchSheetPDF,
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
    onOpenQuickScore,
    onOpenEditSchedule,
    onDownloadSheet,
    onOpenCardsModal,
    onDownloadReportPhoto,
    isDownloadingSheet,
    isDownloadingReportPhoto,
    isLast,
}: {
    match: UIMatch;
    onOpenWizard: (m: UIMatch) => void;
    onOpenQuickScore: (m: UIMatch) => void;
    onOpenEditSchedule: (m: UIMatch) => void;
    onDownloadSheet: (m: UIMatch) => void;
    onOpenCardsModal: (m: UIMatch) => void;
    onDownloadReportPhoto?: (m: UIMatch) => void;
    isDownloadingSheet?: boolean;
    isDownloadingReportPhoto?: boolean;
    isLast?: boolean;
}) => {
    const isFinished = match.status === 'FINISHED';
    const hasPhotoReport = Boolean(match.reportPhotoUrl || match.hasReportPhoto);
    const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
    const pdfMenuRef = useRef<HTMLDivElement>(null);

    // Close PDF dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pdfMenuRef.current && !pdfMenuRef.current.contains(event.target as Node)) {
                setIsPdfMenuOpen(false);
            }
        };
        if (isPdfMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPdfMenuOpen]);

    const formattedDate = match.matchDate
        ? new Date(match.matchDate).toLocaleDateString('es-MX', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'Horario por definir';

    return (
        <div className="p-4 hover:bg-slate-50/90 transition-all duration-200 border-b border-slate-100 last:border-b-0">
            {/* Desktop & Tablet Layout (md and up) */}
            <div className="hidden md:flex items-center justify-between gap-4">
                {/* Left Side: Teams & Score */}
                <div className="flex items-center justify-between flex-1 min-w-0 pr-4">
                    {/* Home Team */}
                    <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                        <span className="font-extrabold text-slate-800 text-sm lg:text-base text-right break-words leading-tight">
                            {match.home}
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden text-indigo-600 shadow-xs shrink-0">
                            <TeamLogo
                                teamName={match.home}
                                logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl}
                                fallbackClass="text-xs font-bold text-indigo-600"
                            />
                        </div>
                    </div>

                    {/* Center: Score / Status & Meta */}
                    <div className="flex flex-col items-center gap-1 px-4 w-44 lg:w-52 text-center shrink-0">
                        {isFinished ? (
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-slate-900 font-mono">{match.homeScore}</span>
                                <span className="text-slate-300 font-light">-</span>
                                <span className="text-2xl font-black text-slate-900 font-mono">{match.awayScore}</span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider bg-slate-100 px-3 py-0.5 rounded-full">
                                Por Jugar
                            </span>
                        )}

                        <div className="flex flex-col items-center space-y-0.5 mt-0.5 w-full">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate max-w-full">
                                {formattedDate}
                            </span>
                            {match.location && (
                                match.field?.locationUrl ? (
                                    <a
                                        href={match.field.locationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-bold truncate max-w-full flex items-center justify-center gap-0.5 hover:underline"
                                        title={`Ver ubicación de ${match.location}`}
                                    >
                                        <span>📍 {match.location}</span>
                                    </a>
                                ) : (
                                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-full" title={match.location}>
                                        📍 {match.location}
                                    </span>
                                )
                            )}
                            {match.referee && (
                                <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-full inline-flex items-center justify-center gap-1 mt-0.5" title="Árbitro asignado">
                                    <ShieldCheck className="w-3 h-3 text-indigo-600 shrink-0" />
                                    <span className="truncate max-w-[110px]">{match.referee.name}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex items-center justify-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden text-purple-600 shadow-xs shrink-0">
                            <TeamLogo
                                teamName={match.away}
                                logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl}
                                fallbackClass="text-xs font-bold text-purple-600"
                            />
                        </div>
                        <span className="font-extrabold text-slate-800 text-sm lg:text-base text-left break-words leading-tight">
                            {match.away}
                        </span>
                    </div>
                </div>

                {/* Right Side: Consolidated Action Buttons */}
                <div className="flex items-center gap-2 pl-4 border-l border-slate-200/80 shrink-0">
                    {/* 1. Schedule Button */}
                    <button
                        onClick={() => onOpenEditSchedule(match)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-colors"
                        title="Definir fecha, hora, cancha y árbitro"
                    >
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Horario</span>
                    </button>

                    {/* 2. Quick Score Button (Direct Score / No players needed) */}
                    <button
                        onClick={() => onOpenQuickScore(match)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/80 shadow-2xs transition-colors"
                        title="Capturar marcador directo sin requerir jugadores (ideal para jornadas de gracia)"
                    >
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span>Marcador Rápido</span>
                    </button>

                    {/* 3. Photo Report Button (If referee uploaded it) */}
                    {hasPhotoReport && onDownloadReportPhoto && (
                        <button
                            onClick={() => onDownloadReportPhoto(match)}
                            disabled={isDownloadingReportPhoto}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition-colors disabled:opacity-50"
                            title="Descargar o ver foto de la cédula subida por el árbitro"
                        >
                            {isDownloadingReportPhoto ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                                <ImageDown className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>Foto Cédula</span>
                        </button>
                    )}

                    {/* 4. PDFs Dropdown Menu (Cédula PDF + Tarjetas PDF) */}
                    <div className="relative" ref={pdfMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsPdfMenuOpen(!isPdfMenuOpen)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                isPdfMenuOpen
                                    ? 'bg-slate-100 border-slate-300 text-slate-900'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                            }`}
                            title="Descargar documentos en PDF"
                        >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>PDFs</span>
                            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isPdfMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
                        </button>

                        {/* Dropdown Popover (Opens upwards if isLast, downwards otherwise) */}
                        {isPdfMenuOpen && (
                            <div className={`absolute right-0 z-50 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                                isLast ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                            }`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPdfMenuOpen(false);
                                        onDownloadSheet(match);
                                    }}
                                    disabled={isDownloadingSheet}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left transition-colors disabled:opacity-50"
                                >
                                    {isDownloadingSheet ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    ) : (
                                        <Printer className="w-4 h-4 text-slate-500" />
                                    )}
                                    <div className="flex flex-col">
                                        <span>Cédula Arbitral PDF</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Para imprimir oficial</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPdfMenuOpen(false);
                                        onOpenCardsModal(match);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left transition-colors"
                                >
                                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                                    <div className="flex flex-col">
                                        <span>Tarjetas de Cambio</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Formato de sustitución</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 5. Main Action: Digital Sheet */}
                    <button
                        onClick={() => onOpenWizard(match)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                            isFinished
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isFinished ? 'Editar Cédula' : 'Cédula Digital'}</span>
                    </button>
                </div>
            </div>

            {/* Mobile Layout (< md) */}
            <div className="md:hidden space-y-3.5">
                {/* Meta Top Bar */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-700 truncate">{formattedDate}</span>
                    {match.referee && (
                        <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            <span className="truncate max-w-[100px]">{match.referee.name}</span>
                        </span>
                    )}
                </div>

                {/* Matchup Center */}
                <div className="flex items-center justify-between gap-3 px-1">
                    {/* Home */}
                    <div className="flex-1 flex flex-col items-center text-center gap-1.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden text-indigo-600 shadow-xs">
                            <TeamLogo
                                teamName={match.home}
                                logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl}
                                fallbackClass="text-sm font-bold text-indigo-600"
                            />
                        </div>
                        <span className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight break-words">
                            {match.home}
                        </span>
                    </div>

                    {/* VS / Score */}
                    <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                        {isFinished ? (
                            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-xl">
                                <span className="text-xl font-black text-slate-900 font-mono">{match.homeScore}</span>
                                <span className="text-slate-400 font-light">-</span>
                                <span className="text-xl font-black text-slate-900 font-mono">{match.awayScore}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">
                                VS
                            </span>
                        )}
                        {match.location && (
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[110px]">
                                📍 {match.location}
                            </span>
                        )}
                    </div>

                    {/* Away */}
                    <div className="flex-1 flex flex-col items-center text-center gap-1.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden text-purple-600 shadow-xs">
                            <TeamLogo
                                teamName={match.away}
                                logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl}
                                fallbackClass="text-sm font-bold text-purple-600"
                            />
                        </div>
                        <span className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight break-words">
                            {match.away}
                        </span>
                    </div>
                </div>

                {/* Photo Report Notification Banner (Mobile) */}
                {hasPhotoReport && onDownloadReportPhoto && (
                    <button
                        onClick={() => onDownloadReportPhoto(match)}
                        disabled={isDownloadingReportPhoto}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs shadow-2xs hover:bg-emerald-100 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <ImageDown className="w-4 h-4 text-emerald-600" />
                            <span>El árbitro subió la cédula física</span>
                        </div>
                        <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-md">
                            Ver Foto ↗
                        </span>
                    </button>
                )}

                {/* Mobile Action Buttons Grid */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                        onClick={() => onOpenEditSchedule(match)}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                    >
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Horario</span>
                    </button>

                    <button
                        onClick={() => onOpenQuickScore(match)}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 shadow-2xs"
                        title="Marcador Rápido"
                    >
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span>Marcador</span>
                    </button>

                    <button
                        onClick={() => onDownloadSheet(match)}
                        disabled={isDownloadingSheet}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs disabled:opacity-50"
                    >
                        {isDownloadingSheet ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>PDF</span>
                    </button>

                    <button
                        onClick={() => onOpenWizard(match)}
                        className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-bold shadow-sm ${
                            isFinished
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isFinished ? 'Editar' : 'Cédula'}</span>
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
    const [selectedQuickScoreMatch, setSelectedQuickScoreMatch] = useState<UIMatch | null>(null);
    const [selectedEditMatch, setSelectedEditMatch] = useState<UIMatch | null>(null);
    const [selectedCardsMatch, setSelectedCardsMatch] = useState<UIMatch | null>(null);
    const [downloadingMatchId, setDownloadingMatchId] = useState<string | null>(null);
    const [downloadingReportPhotoId, setDownloadingReportPhotoId] = useState<string | null>(null);
    const [isPublishingMatchday, setIsPublishingMatchday] = useState(false);
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
            if (!selectedMatchday || !mDays.includes(Number(selectedMatchday))) {
                setSelectedMatchday(mDays[0] || 1);
            }

            setMatches(uiMatches);
        } catch (err) {
            console.error("Error loading matches", err);
            showToast("Error al cargar los partidos.", "error");
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
        setSelectedQuickScoreMatch(null);
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
                leagueApi.getTeamPlayers(settings.tenantId, homeId).catch(() => ({ data: [] })),
                leagueApi.getTeamPlayers(settings.tenantId, awayId).catch(() => ({ data: [] })),
            ]);
            setHomeRoster(homeRes.data || []);
            setAwayRoster(awayRes.data || []);
            setSelectedMatch(m);
        } catch (e) {
            console.error("Error fetching rosters", e);
            setHomeRoster([]);
            setAwayRoster([]);
            setSelectedMatch(m);
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
                leagueApi.getTeamPlayers(settings.tenantId, homeId).catch(() => ({ data: [] })),
                leagueApi.getTeamPlayers(settings.tenantId, awayId).catch(() => ({ data: [] })),
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
                refereeName: m.referee?.name,
            });

            showToast("Cédula PDF generada y descargada con éxito.", "success");
        } catch (err) {
            console.error("Error generating match sheet PDF:", err);
            showToast("Error al generar la cédula en PDF.", "error");
        } finally {
            setDownloadingMatchId(null);
        }
    };

    const handleDownloadReportPhoto = async (m: UIMatch) => {
        if (!settings?.tenantId) return;
        setDownloadingReportPhotoId(m.id);
        try {
            const res = await leagueApi.getMatchReportDownloadUrl(settings.tenantId, m.id);
            if (res.data?.signedUrl) {
                window.open(res.data.signedUrl, '_blank');
            } else {
                showToast("No se encontró la imagen de la cédula.", "error");
            }
        } catch (err) {
            console.error("Error downloading match report photo:", err);
            showToast("Error al obtener la foto de la cédula.", "error");
        } finally {
            setDownloadingReportPhotoId(null);
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-500 text-sm flex justify-between rounded-t-2xl">
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
                        displayedMatches.map((match, index) => (
                            <MatchRow
                                key={match.id}
                                match={match}
                                onOpenWizard={handleOpenWizard}
                                onOpenQuickScore={setSelectedQuickScoreMatch}
                                onOpenEditSchedule={setSelectedEditMatch}
                                onDownloadSheet={handleDownloadRefereeSheet}
                                onOpenCardsModal={setSelectedCardsMatch}
                                onDownloadReportPhoto={handleDownloadReportPhoto}
                                isDownloadingSheet={downloadingMatchId === match.id}
                                isDownloadingReportPhoto={downloadingReportPhotoId === match.id}
                                isLast={index >= displayedMatches.length - 2 || displayedMatches.length <= 2}
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

            {selectedQuickScoreMatch && (
                <QuickScoreModal
                    match={selectedQuickScoreMatch}
                    onClose={() => setSelectedQuickScoreMatch(null)}
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
