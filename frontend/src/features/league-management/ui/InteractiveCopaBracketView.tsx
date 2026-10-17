import { useState, useEffect, useRef } from 'react';
import {
    Calendar,
    FileText,
    Printer,
    Trophy,
    Crown,
    ChevronDown,
    CheckCircle2,
    ArrowLeftRight,
    MapPin,
    Clock,
    Zap,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    Maximize2,
    RotateCcw
} from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { leagueApi, Match } from '@/shared/api/league-api';
import { PlayoffTie } from './PlayoffsBracketView';

export interface UIMatch extends Match {
    home: string;
    away: string;
}

interface InteractiveCopaBracketViewProps {
    tenantId: string;
    seasonId: string;
    matches?: UIMatch[];
    onOpenWizard?: (m: UIMatch) => void;
    onOpenQuickScore?: (m: UIMatch) => void;
    onOpenEditSchedule?: (m: UIMatch) => void;
    onDownloadSheet?: (m: UIMatch) => void;
    onOpenCardsModal?: (m: UIMatch) => void;
    onDownloadReportPhoto?: (m: UIMatch) => void;
    downloadingMatchId?: string | null;
    downloadingReportPhotoId?: string | null;
    onRefreshBracket?: () => void;
    refreshTrigger?: number;
    readonly?: boolean;
}

export const InteractiveCopaBracketView = ({
    tenantId,
    seasonId,
    matches,
    onOpenWizard,
    onOpenQuickScore,
    onOpenEditSchedule,
    onDownloadSheet,
    onOpenCardsModal,
    onDownloadReportPhoto,
    downloadingMatchId,
    downloadingReportPhotoId,
    onRefreshBracket,
    refreshTrigger = 0,
    readonly = false
}: InteractiveCopaBracketViewProps) => {
    const [ties, setTies] = useState<PlayoffTie[]>([]);
    const [internalMatches, setInternalMatches] = useState<UIMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [openPdfDropdownTieId, setOpenPdfDropdownTieId] = useState<string | null>(null);

    // Zoom and Navigation state
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [activeRoundKey, setActiveRoundKey] = useState<string>('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const roundRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const effectiveMatches = (matches && matches.length > 0) ? matches : internalMatches;

    const loadTies = async () => {
        setLoading(true);
        try {
            const needMatches = !matches || matches.length === 0;
            const [bracketRes, matchesRes] = await Promise.all([
                leagueApi.getPlayoffBracket(tenantId, seasonId),
                needMatches ? leagueApi.getSeasonMatches(tenantId, seasonId) : Promise.resolve({ data: [] } as any)
            ]);
            setTies(Array.isArray(bracketRes?.data) ? bracketRes.data : []);
            if (needMatches && Array.isArray(matchesRes?.data)) {
                setInternalMatches(matchesRes.data.map((m: any) => ({
                    ...m,
                    home: m.homeTeam?.name || 'Local',
                    away: m.awayTeam?.name || 'Visitante'
                })));
            }
        } catch (error) {
            console.error("Error loading bracket ties:", error);
            setTies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTies();
    }, [tenantId, seasonId, refreshTrigger]);

    // Close PDF dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.pdf-dropdown-container')) {
                setOpenPdfDropdownTieId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const safeTies = Array.isArray(ties) ? ties : [];

    const roundsConfig: { key: string; label: string; shortLabel: string; icon: any }[] = [
        { key: 'ROUND_OF_32', label: '16vos de Final', shortLabel: '16vos', icon: <Zap className="w-3.5 h-3.5 text-[#5c8a3c]" /> },
        { key: 'ROUND_OF_16', label: 'Octavos de Final', shortLabel: 'Octavos', icon: <Zap className="w-3.5 h-3.5 text-[#5c8a3c]" /> },
        { key: 'QUARTER_FINALS', label: 'Cuartos de Final', shortLabel: 'Cuartos', icon: <Zap className="w-3.5 h-3.5 text-[#5c8a3c]" /> },
        { key: 'SEMI_FINALS', label: 'Semifinales', shortLabel: 'Semis', icon: <Zap className="w-3.5 h-3.5 text-[#5c8a3c]" /> },
        { key: 'FINAL', label: 'Gran Final', shortLabel: 'Final', icon: <Trophy className="w-3.5 h-3.5 text-amber-500" /> }
    ];

    const roundsMap: Record<string, PlayoffTie[]> = {
        'ROUND_OF_32': safeTies.filter(t => t?.round === 'ROUND_OF_32'),
        'ROUND_OF_16': safeTies.filter(t => t?.round === 'ROUND_OF_16'),
        'QUARTER_FINALS': safeTies.filter(t => t?.round === 'QUARTER_FINALS'),
        'SEMI_FINALS': safeTies.filter(t => t?.round === 'SEMI_FINALS'),
        'FINAL': safeTies.filter(t => t?.round === 'FINAL')
    };

    const activeRounds = roundsConfig.filter(r => (roundsMap[r.key]?.length || 0) > 0);

    // Default active round to first available round
    useEffect(() => {
        if (activeRounds.length > 0 && !activeRoundKey) {
            setActiveRoundKey(activeRounds[0].key);
        }
    }, [activeRounds.length]);

    const scrollToRound = (roundKey: string) => {
        setActiveRoundKey(roundKey);
        const targetEl = roundRefs.current[roundKey];
        if (targetEl && scrollContainerRef.current) {
            targetEl.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'start'
            });
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(1.2, +(prev + 0.1).toFixed(2)));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(0.65, +(prev - 0.1).toFixed(2)));
    const handleResetZoom = () => setZoomLevel(1);
    const handleFitScreen = () => {
        // Fits 4-5 rounds cleanly into standard viewport
        const count = activeRounds.length;
        if (count >= 5) setZoomLevel(0.75);
        else if (count >= 4) setZoomLevel(0.85);
        else setZoomLevel(1);
    };

    const formatMatchDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            const isoStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
            const date = new Date(isoStr);
            return date.toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className="p-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 min-h-[420px]">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-bold uppercase tracking-wider text-xs">Cargando llaves de eliminación...</p>
            </div>
        );
    }

    if (safeTies.length === 0) {
        return (
            <div className="border border-slate-200 rounded-2xl p-16 text-center text-slate-500 bg-white shadow-xs flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
                    <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Aún no hay llaves de copa generadas</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                    Genera las llaves desde la vista general del torneo para comenzar a capturar resultados y ver la progresión de los equipos.
                </p>
            </div>
        );
    }

    // Tie Card Component (Ultra-compact & high-density UX)
    const TieMatchCard = ({ tie, roundIndex }: { tie: PlayoffTie; roundIndex: number }) => {
        const tieMatch = effectiveMatches.find(m => m?.playoffTie?.id === tie?.id || (m as any)?.playoffTieId === tie?.id);

        const homeTeam = tie.homeSeedTeam;
        const awayTeam = tie.awaySeedTeam;

        const homeWinner = Boolean(tie?.advancingTeam?.id && homeTeam?.id && tie.advancingTeam.id === homeTeam.id);
        const awayWinner = Boolean(tie?.advancingTeam?.id && awayTeam?.id && tie.advancingTeam.id === awayTeam.id);

        const isFinished = tieMatch?.status === 'FINISHED' || Boolean(tie?.advancingTeam);
        const isPdfMenuOpen = openPdfDropdownTieId === tie.id;

        const penaltyWinnerId = tieMatch?.penaltyWinnerTeamId || (tieMatch as any)?.penaltyWinnerTeam?.id;
        const hasShootout = isFinished && Boolean(
            (tieMatch?.homePenaltyScore !== null && tieMatch?.homePenaltyScore !== undefined) ||
            penaltyWinnerId != null
        );

        const uiMatch: UIMatch | null = tieMatch ? {
            ...tieMatch,
            home: homeTeam?.name || tieMatch.homeTeam?.name || 'Local',
            away: awayTeam?.name || tieMatch.awayTeam?.name || 'Visitante',
            homeTeam: homeTeam || tieMatch.homeTeam,
            awayTeam: awayTeam || tieMatch.awayTeam,
        } : null;

        const bothTeamsAssigned = Boolean(homeTeam?.id && awayTeam?.id);
        const canEditScore = !readonly && Boolean(onOpenQuickScore);
        const canShowAdminFooter = !readonly && Boolean(onOpenWizard);

        return (
            <div data-tie-id={tie.id} className="relative flex flex-col items-center w-full group">
                <div className={`w-[215px] sm:w-[225px] rounded-xl border transition-all duration-200 overflow-hidden shadow-xs relative bg-white z-10 ${
                    isFinished
                        ? 'border-emerald-200/90 shadow-emerald-500/5'
                        : bothTeamsAssigned
                            ? 'border-slate-200 hover:border-emerald-500 hover:shadow-md'
                            : 'border-dashed border-slate-300 bg-slate-50/60'
                }`}>
                    {/* Header Bar: Status & Schedule */}
                    <div className="px-2.5 py-1 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <div className="flex items-center gap-1 truncate max-w-[125px]">
                            {tieMatch?.matchDate ? (
                                <span className="flex items-center gap-1 text-slate-700 truncate" title={tieMatch.matchDate}>
                                    <Clock className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                    <span className="truncate">{formatMatchDate(tieMatch.matchDate)}</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-slate-400 italic">
                                    <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>Por definir</span>
                                </span>
                            )}
                        </div>

                        {/* Status Badge */}
                        {isFinished ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Fin
                            </span>
                        ) : bothTeamsAssigned ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Pendiente
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-slate-200/60 text-slate-500">
                                Espera
                            </span>
                        )}
                    </div>

                    {/* Venue / Location if assigned */}
                    {tieMatch?.location && (
                        <div className="px-2 py-0.5 bg-indigo-50/40 border-b border-indigo-100/40 flex items-center gap-1 text-[9px] font-medium text-indigo-700 truncate">
                            <MapPin className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{tieMatch.location}</span>
                        </div>
                    )}

                    {/* Teams Matchup Body */}
                    <div className="divide-y divide-slate-100">
                        {/* Home Team Row */}
                        <div className={`px-2 py-1.5 flex items-center justify-between gap-1.5 transition-colors ${
                            homeWinner ? 'bg-amber-50/80 border-l-3 border-l-amber-500 font-bold' : ''
                        }`}>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                    {homeTeam?.name ? (
                                        <TeamLogo
                                            teamName={homeTeam.name}
                                            logoUrl={homeTeam.signedLogoUrl || homeTeam.logoUrl}
                                            fallbackClass="text-[9px] font-bold text-slate-700"
                                        />
                                    ) : (
                                        <span className="text-[9px] text-slate-400 font-mono">?</span>
                                    )}
                                </div>
                                <span className={`text-[11px] truncate leading-tight ${
                                    homeWinner
                                        ? 'text-slate-900 font-black'
                                        : homeTeam?.name ? 'text-slate-700 font-bold' : 'text-slate-400 italic'
                                }`} title={homeTeam?.name || 'Esperando rival...'}>
                                    {homeTeam?.name || 'Esperando rival...'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {homeWinner && (
                                    <span className="inline-flex items-center text-[9px] font-black text-amber-700 bg-amber-100/80 border border-amber-300 px-1 py-0.2 rounded" title="Avanza de ronda">
                                        <Crown className="w-2 h-2 text-amber-600 mr-0.5" />
                                        G
                                    </span>
                                )}
                                {hasShootout && (
                                    <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                        P:{tieMatch?.homePenaltyScore ?? '-'}
                                    </span>
                                )}
                                <span
                                    onClick={() => canEditScore && uiMatch && onOpenQuickScore!(uiMatch)}
                                    className={`w-6 h-6 flex items-center justify-center rounded font-mono text-xs font-extrabold ${
                                        canEditScore ? 'cursor-pointer transition-transform hover:scale-105' : 'cursor-default'
                                    } ${
                                        homeWinner
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : isFinished
                                                ? 'bg-slate-100 text-slate-600'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                                    }`}
                                    title={canEditScore ? "Clic para captura rápida de marcador" : undefined}
                                >
                                    {tieMatch?.homeScore !== null && tieMatch?.homeScore !== undefined ? tieMatch.homeScore : '-'}
                                </span>
                            </div>
                        </div>

                        {/* Away Team Row */}
                        <div className={`px-2 py-1.5 flex items-center justify-between gap-1.5 transition-colors ${
                            awayWinner ? 'bg-amber-50/80 border-l-3 border-l-amber-500 font-bold' : ''
                        }`}>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                    {awayTeam?.name ? (
                                        <TeamLogo
                                            teamName={awayTeam.name}
                                            logoUrl={awayTeam.signedLogoUrl || awayTeam.logoUrl}
                                            fallbackClass="text-[9px] font-bold text-slate-700"
                                        />
                                    ) : (
                                        <span className="text-[9px] text-slate-400 font-mono">?</span>
                                    )}
                                </div>
                                <span className={`text-[11px] truncate leading-tight ${
                                    awayWinner
                                        ? 'text-slate-900 font-black'
                                        : awayTeam?.name ? 'text-slate-700 font-bold' : 'text-slate-400 italic'
                                }`} title={awayTeam?.name || 'Esperando rival...'}>
                                    {awayTeam?.name || 'Esperando rival...'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {awayWinner && (
                                    <span className="inline-flex items-center text-[9px] font-black text-amber-700 bg-amber-100/80 border border-amber-300 px-1 py-0.2 rounded" title="Avanza de ronda">
                                        <Crown className="w-2 h-2 text-amber-600 mr-0.5" />
                                        G
                                    </span>
                                )}
                                {hasShootout && (
                                    <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                        P:{tieMatch?.awayPenaltyScore ?? '-'}
                                    </span>
                                )}
                                <span
                                    onClick={() => canEditScore && uiMatch && onOpenQuickScore!(uiMatch)}
                                    className={`w-6 h-6 flex items-center justify-center rounded font-mono text-xs font-extrabold ${
                                        canEditScore ? 'cursor-pointer transition-transform hover:scale-105' : 'cursor-default'
                                    } ${
                                        awayWinner
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : isFinished
                                                ? 'bg-slate-100 text-slate-600'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                                    }`}
                                    title={canEditScore ? "Clic para captura rápida de marcador" : undefined}
                                >
                                    {tieMatch?.awayScore !== null && tieMatch?.awayScore !== undefined ? tieMatch.awayScore : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions Toolbar (Admin only - Compact) */}
                    {canShowAdminFooter && (
                        <div className="px-2 py-1 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                            {uiMatch && bothTeamsAssigned ? (
                                <>
                                    {/* 1. Horario */}
                                    {onOpenEditSchedule && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenEditSchedule(uiMatch)}
                                            className="flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                                            title="Definir fecha, hora, cancha y árbitro"
                                        >
                                            <Calendar className="w-2.5 h-2.5 text-slate-500" />
                                            <span>Horario</span>
                                        </button>
                                    )}

                                    {/* 2. PDFs Dropdown */}
                                    <div className="relative pdf-dropdown-container">
                                        <button
                                            type="button"
                                            onClick={() => setOpenPdfDropdownTieId(isPdfMenuOpen ? null : tie.id)}
                                            className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[10px] font-bold border transition-colors shadow-2xs ${
                                                isPdfMenuOpen
                                                    ? 'bg-slate-200 border-slate-300 text-slate-900'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                            }`}
                                            title="Descargar cédulas e impresos"
                                        >
                                            <Printer className="w-2.5 h-2.5 text-slate-500" />
                                            <span>PDFs</span>
                                            <ChevronDown className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isPdfMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
                                        </button>

                                        {isPdfMenuOpen && (
                                            <div className="absolute left-0 bottom-full mb-1.5 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                                {onDownloadSheet && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenPdfDropdownTieId(null);
                                                            onDownloadSheet(uiMatch);
                                                        }}
                                                        disabled={downloadingMatchId === uiMatch.id}
                                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left transition-colors"
                                                    >
                                                        <Printer className="w-3 h-3 text-slate-500" />
                                                        <span>Cédula Arbitral Oficial</span>
                                                    </button>
                                                )}

                                                {onOpenCardsModal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenPdfDropdownTieId(null);
                                                            onOpenCardsModal(uiMatch);
                                                        }}
                                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 text-left transition-colors"
                                                    >
                                                        <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                                                        <span>Tarjetas de Cambio</span>
                                                    </button>
                                                )}

                                                {onDownloadReportPhoto && (uiMatch.reportPhotoUrl || (uiMatch as any).hasReportPhoto) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenPdfDropdownTieId(null);
                                                            onDownloadReportPhoto(uiMatch);
                                                        }}
                                                        disabled={downloadingReportPhotoId === uiMatch.id}
                                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 text-left transition-colors border-t border-slate-100"
                                                    >
                                                        <ExternalLink className="w-3 h-3 text-indigo-600" />
                                                        <span>Ver Foto de Cédula</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Cédula Digital */}
                                    <button
                                        type="button"
                                        onClick={() => onOpenWizard && onOpenWizard(uiMatch)}
                                        className={`flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-bold shadow-2xs transition-all active:scale-95 ${
                                            isFinished
                                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                                        }`}
                                    >
                                        <FileText className="w-2.5 h-2.5" />
                                        <span>{isFinished ? 'Editar' : 'Cédula'}</span>
                                    </button>
                                </>
                            ) : (
                                <div className="w-full py-0.5 text-center text-[10px] font-medium text-slate-400 italic">
                                    Esperando cruce previo
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Column Component: Distributes ties evenly and renders clean tournament tree lines
    const BracketRoundColumn = ({
        title,
        roundKey,
        tiesList,
        icon,
        roundIndex
    }: {
        title: string;
        roundKey: string;
        tiesList: PlayoffTie[];
        icon: any;
        roundIndex: number;
    }) => {
        const colRef = useRef<HTMLDivElement>(null);
        const [centers, setCenters] = useState<number[]>([]);

        const isLastRound = roundKey === 'FINAL';
        const showConnectors = !isLastRound;

        useEffect(() => {
            const calculateCenters = () => {
                if (!colRef.current) return;
                const cardEls = Array.from(colRef.current.querySelectorAll('.tie-card-wrapper')) as HTMLElement[];
                const colRect = colRef.current.getBoundingClientRect();
                const newCenters = cardEls.map(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.top - colRect.top + rect.height / 2;
                });
                setCenters(newCenters);
            };

            calculateCenters();
            const ro = new ResizeObserver(calculateCenters);
            if (colRef.current) ro.observe(colRef.current);
            window.addEventListener('resize', calculateCenters);
            const timer = setTimeout(calculateCenters, 60);

            return () => {
                clearTimeout(timer);
                ro.disconnect();
                window.removeEventListener('resize', calculateCenters);
            };
        }, [tiesList.length, zoomLevel]);

        const pairs: { top: PlayoffTie; bottom?: PlayoffTie }[] = [];
        for (let i = 0; i < tiesList.length; i += 2) {
            pairs.push({
                top: tiesList[i],
                bottom: tiesList[i + 1]
            });
        }

        // Gap between columns is 32px (gap-8)
        const W = 32;
        const xMid = 16;
        const r = 6;

        return (
            <div
                ref={el => { roundRefs.current[roundKey] = el; }}
                key={roundKey}
                className="flex flex-col relative z-10 w-[215px] sm:w-[225px] shrink-0 snap-start"
            >
                {/* Round Header Bar */}
                <div className="font-extrabold text-center text-slate-800 mb-4 uppercase text-[11px] tracking-wider h-9 flex items-center justify-center gap-1.5 bg-white/95 backdrop-blur-xs border border-[#93C572]/40 rounded-xl shadow-2xs px-2.5 shrink-0">
                    {icon}
                    <span className="truncate">{title}</span>
                </div>

                {/* Ties List */}
                <div ref={colRef} className="flex flex-col justify-around flex-1 relative items-center py-2">
                    {tiesList.map((tie) => (
                        <div key={tie.id} className="tie-card-wrapper w-full flex justify-center py-2.5">
                            <TieMatchCard tie={tie} roundIndex={roundIndex} />
                        </div>
                    ))}

                    {/* SVG Connector Tree Forks to Next Round */}
                    {showConnectors && centers.length >= 2 && (
                        <svg
                            className="absolute -right-8 top-0 h-full w-8 pointer-events-none overflow-visible z-0"
                            style={{ width: `${W}px` }}
                        >
                            {pairs.map((pair, pIdx) => {
                                const yTop = centers[2 * pIdx];
                                const yBottom = centers[2 * pIdx + 1];
                                if (yTop === undefined || yBottom === undefined) return null;
                                const yMid = (yTop + yBottom) / 2;

                                const topMatch = effectiveMatches.find(m => m?.playoffTie?.id === pair.top?.id || (m as any)?.playoffTieId === pair.top?.id);
                                const bottomMatch = pair.bottom ? effectiveMatches.find(m => m?.playoffTie?.id === pair.bottom?.id || (m as any)?.playoffTieId === pair.bottom?.id) : null;

                                const topFinished = topMatch?.status === 'FINISHED' || Boolean(pair.top?.advancingTeam);
                                const bottomFinished = bottomMatch?.status === 'FINISHED' || Boolean(pair.bottom?.advancingTeam);
                                const stemActive = topFinished || bottomFinished;

                                // Clean, continuous bracket fork paths with clamped radius
                                const effectiveR = Math.min(r, Math.max(2, (yBottom - yTop) / 4));
                                const topBranch = `M 0,${yTop} H ${xMid - effectiveR} Q ${xMid},${yTop} ${xMid},${yTop + effectiveR} V ${yMid - effectiveR} Q ${xMid},${yMid} ${xMid + effectiveR},${yMid}`;
                                const bottomBranch = `M 0,${yBottom} H ${xMid - effectiveR} Q ${xMid},${yBottom} ${xMid},${yBottom - effectiveR} V ${yMid + effectiveR} Q ${xMid},${yMid} ${xMid + effectiveR},${yMid}`;
                                const stem = `M ${xMid + effectiveR},${yMid} H ${W}`;

                                return (
                                    <g key={pair.top.id}>
                                        {/* Top Branch */}
                                        <path
                                            d={topBranch}
                                            fill="none"
                                            stroke={topFinished ? '#2563eb' : '#94a3b8'}
                                            strokeWidth={topFinished ? 2.5 : 1.75}
                                            strokeLinecap="round"
                                            className="transition-colors duration-300"
                                        />

                                        {/* Bottom Branch */}
                                        <path
                                            d={bottomBranch}
                                            fill="none"
                                            stroke={bottomFinished ? '#2563eb' : '#94a3b8'}
                                            strokeWidth={bottomFinished ? 2.5 : 1.75}
                                            strokeLinecap="round"
                                            className="transition-colors duration-300"
                                        />

                                        {/* Horizontal Stem into Next Round Card */}
                                        <path
                                            d={stem}
                                            fill="none"
                                            stroke={stemActive ? '#2563eb' : '#94a3b8'}
                                            strokeWidth={stemActive ? 2.5 : 1.75}
                                            strokeLinecap="round"
                                            className="transition-colors duration-300"
                                        />
                                    </g>
                                );
                            })}
                        </svg>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full space-y-3">
            {/* Control Bar: Mobile Round Quick-Pills + Desktop Zoom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                {/* Mobile / Compact Quick-Jump Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline-flex">
                        Rondas:
                    </span>
                    {activeRounds.map(r => {
                        const isActive = activeRoundKey === r.key;
                        return (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => scrollToRound(r.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                                    isActive
                                        ? 'bg-[#5c8a3c] text-white shadow-xs'
                                        : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200'
                                }`}
                            >
                                {r.icon}
                                <span>{r.shortLabel}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Desktop Zoom & Fit Controls */}
                <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs text-slate-600">
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.65}
                        className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Reducir zoom"
                    >
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleResetZoom}
                        className="px-2 py-0.5 text-[11px] font-mono font-bold hover:bg-slate-100 rounded-lg transition-colors"
                        title="Restablecer tamaño original (100%)"
                    >
                        {Math.round(zoomLevel * 100)}%
                    </button>
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 1.2}
                        className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Aumentar zoom"
                    >
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
                    <button
                        type="button"
                        onClick={handleFitScreen}
                        className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
                        title="Ajustar árbol para ver todas las llaves en pantalla"
                    >
                        <Maximize2 className="w-3 h-3 text-slate-500" />
                        <span>Ajustar</span>
                    </button>
                </div>
            </div>

            {/* Panoramic Bracket Scroll Container with Liga Metepec Pistache Theme */}
            <div className="bg-[#93C572]/15 rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-[#93C572]/30 shadow-inner overflow-hidden relative min-h-[420px]">
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#93C572]/40"
                >
                    <div
                        className="w-max flex gap-8 pl-1 sm:pl-2 relative items-stretch transition-transform duration-200 origin-top-left"
                        style={{
                            transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
                            transformOrigin: 'top left'
                        }}
                    >
                        {roundsConfig.map((r, idx) => {
                            const list = roundsMap[r.key] || [];
                            if (list.length === 0) return null;
                            return (
                                <BracketRoundColumn
                                    key={r.key}
                                    title={r.label}
                                    roundKey={r.key}
                                    tiesList={list}
                                    icon={r.icon}
                                    roundIndex={idx}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

