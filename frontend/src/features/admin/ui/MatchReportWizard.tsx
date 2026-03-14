import { useState, useMemo, useEffect } from 'react';
import { X, Shirt, Square, Save, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { leagueApi, Match, Player } from '@/shared/api/league-api';

const SoccerBall = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 17l-4.24-2.47l1.62-4.94l5.24 0l1.62 4.94Z" />
        <path d="M12 17l0 5" />
        <path d="M7.76 14.53l-4.32 2.5" />
        <path d="M9.38 9.59l-5.18 -1.68" />
        <path d="M14.62 9.59l5.18 -1.68" />
        <path d="M16.24 14.53l4.32 2.5" />
        <path d="M12 7l0 -5" />
    </svg>
);

import { useToast } from '@/shared/components/ui/ToastContext';

interface MatchReportWizardProps {
    match: Match;
    homeRoster: Player[]; // Passed in or fetched
    awayRoster: Player[]; // Passed in or fetched
    homeTeamName?: string;
    awayTeamName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface PlayerStats {
    played: boolean;
    goals: number;
    yellowCards: number;
    redCard: boolean;
    suspensionMatchdays?: number;
    notes?: string;
}

export const MatchReportWizard = ({ match, homeRoster, awayRoster, homeTeamName, awayTeamName, onClose, onSuccess }: MatchReportWizardProps) => {
    const { settings } = useTenantSettings();
    const [step, setStep] = useState(1);
    const [events, setEvents] = useState<Record<string, PlayerStats>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [homeSearch, setHomeSearch] = useState('');
    const [awaySearch, setAwaySearch] = useState('');
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [isDoubleForfeit, setIsDoubleForfeit] = useState(false); // New State
    const { showToast } = useToast();

    useEffect(() => {
        const fetchEvents = async () => {
            if (!settings?.tenantId || match.status === 'SCHEDULED' && match.homeScore == null) return;
            try {
                setIsLoadingEvents(true);
                const res = await leagueApi.getMatchReport(settings.tenantId, match.id);
                const fetchedEvents = res.data;

                const newEvents: Record<string, PlayerStats> = {};

                fetchedEvents.forEach((ev: any) => {
                    const playerId = ev.player?.id;
                    if (!playerId) return;

                    if (ev.eventType === 'DOUBLE_FORFEIT') {
                        setIsDoubleForfeit(true);
                        return;
                    }

                    if (!newEvents[playerId]) {
                        newEvents[playerId] = { played: false, goals: 0, yellowCards: 0, redCard: false };
                    }

                    if (ev.eventType === 'APPEARANCE') {
                        newEvents[playerId].played = true;
                    } else if (ev.eventType === 'GOAL') {
                        newEvents[playerId].goals += 1;
                        newEvents[playerId].played = true;
                    } else if (ev.eventType === 'YELLOW_CARD') {
                        newEvents[playerId].yellowCards += 1;
                        newEvents[playerId].played = true;
                    } else if (ev.eventType === 'RED_CARD') {
                        newEvents[playerId].redCard = true;
                        newEvents[playerId].played = true;
                        newEvents[playerId].suspensionMatchdays = ev.suspensionMatchdays;
                        newEvents[playerId].notes = ev.notes;
                    }
                });
                setEvents(newEvents);
            } catch (error) {
                console.error("Failed to fetch existing match report", error);
            } finally {
                setIsLoadingEvents(false);
            }
        };
        fetchEvents();
    }, [match.id, settings?.tenantId, match.status]);

    // Helper to get stats safely
    const getStats = (playerId: string) => events[playerId] || { played: false, goals: 0, yellowCards: 0, redCard: false };

    const updateStats = (playerId: string, updates: Partial<PlayerStats>) => {
        setEvents(prev => {
            const current = prev[playerId] || { played: false, goals: 0, yellowCards: 0, redCard: false };
            const updated = { ...current, ...updates };

            // Auto-check "Played" if any activity recorded
            if (updated.goals > 0 || updated.yellowCards > 0 || updated.redCard) {
                updated.played = true;
            }

            return { ...prev, [playerId]: updated };
        });
    };

    const redCardPlayers = useMemo(() => {
        const allPlayers = [...homeRoster, ...awayRoster];
        return allPlayers.filter(p => events[p.id]?.redCard);
    }, [homeRoster, awayRoster, events]);

    const handleNext = () => {
        if (step === 1) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step === 1) {
            onClose();
        } else {
            setStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const payload: any[] = []; // MatchEventDTO shape

        Object.entries(events).forEach(([playerId, stats]) => {
            const isHome = homeRoster.some(p => p.id === playerId);
            const isAway = awayRoster.some(p => p.id === playerId);
            const player = isHome ? homeRoster.find(p => p.id === playerId) : awayRoster.find(p => p.id === playerId);

            if (!player || !stats.played) return; // Only send events for played players

            const teamId = isHome ? (match.homeTeam?.id || match.homeTeamId) : (match.awayTeam?.id || match.awayTeamId);

            if (stats.played) {
                payload.push({ player: { id: playerId }, team: { id: teamId }, eventType: 'APPEARANCE' });
            }

            for (let i = 0; i < stats.goals; i++) {
                payload.push({ player: { id: playerId }, team: { id: teamId }, eventType: 'GOAL' });
            }

            for (let i = 0; i < stats.yellowCards; i++) {
                payload.push({ player: { id: playerId }, team: { id: teamId }, eventType: 'YELLOW_CARD' });
            }

            if (stats.redCard) {
                payload.push({
                    player: { id: playerId },
                    team: { id: teamId },
                    eventType: 'RED_CARD',
                    suspensionMatchdays: stats.suspensionMatchdays || 1,
                    notes: stats.notes
                });
            }
        });

        if (isDoubleForfeit) {
            // Include a dummy team, backend only checks eventType
            const dummyTeamId = match.homeTeam?.id || match.homeTeamId;
            payload.push({
                team: { id: dummyTeamId },
                eventType: 'DOUBLE_FORFEIT'
            });
        }

        try {
            if (!settings?.tenantId) throw new Error("Missing tenant");
            await leagueApi.submitMatchReport(settings.tenantId, match.id, payload);
            showToast("Cédula guardada exitosamente.", "success");
            onSuccess();
        } catch (error) {
            console.error("Failed to submit report", error);
            showToast("Error al guardar la cédula.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculations for Summary
    const calculatedHomeScore = Object.entries(events)
        .filter(([pid, s]) => s.goals > 0 && homeRoster.some(p => p.id === pid))
        .reduce((acc, [_, s]) => acc + s.goals, 0);

    const calculatedAwayScore = Object.entries(events)
        .filter(([pid, s]) => s.goals > 0 && awayRoster.some(p => p.id === pid))
        .reduce((acc, [_, s]) => acc + s.goals, 0);


    // --- RENDER STEPS ---

    const renderRosterGrid = (roster: Player[], teamName: string, searchQuery: string, setSearchQuery: (q: string) => void) => {
        const filteredRoster = roster.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
                {/* Header */}
                <div className="px-6 py-4 sticky top-0 z-10 bg-[#22c55e] border-b border-[#16a34a] flex flex-col gap-3">
                    <h3 className="font-bold text-lg text-black">{teamName}</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar jugador..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border-0 bg-white/90 focus:bg-white text-sm text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-green-700 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3 overflow-y-auto">
                    {filteredRoster.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm font-medium">No se encontraron jugadores</div>
                    ) : (
                        filteredRoster.map(player => {
                            const stats = getStats(player.id);
                            return (
                                <div key={player.id} className={`flex flex-col rounded-xl border transition-all duration-200 relative overflow-hidden ${stats.played ? 'bg-white border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}`}>
                                    <div className="flex items-center gap-3 p-3 w-full">
                                        {/* Played Toggle */}
                                        <button
                                            onClick={() => updateStats(player.id, { played: !stats.played })}
                                            className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0
                                    ${stats.played
                                                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-2'
                                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
                                `}
                                            title={stats.played ? "Jugó" : "No jugó"}
                                        >
                                            <Shirt className="w-5 h-5" />
                                        </button>
                                        {/* Player Info */}
                                        <div className="flex-1 min-w-0 mr-2 py-1">
                                            <div className="flex items-start gap-3">
                                                {settings?.requireJerseyNumbers && (
                                                    <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-md shadow-sm border text-xs font-black shrink-0 transition-colors ${stats.played ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'}`} title="Dorsal">
                                                        {player.jerseyNumber || '-'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-sm sm:text-base leading-snug whitespace-normal break-words ${stats.played ? 'text-slate-900' : 'text-slate-500'}`}>
                                                        {player.firstName} {player.lastName}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                        {stats.played ? 'En Cancha' : 'Sin Actividad'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Group */}
                                        <div className={`flex items-center gap-2 sm:gap-4 transition-opacity duration-200 ${stats.played ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>

                                            {/* Goals Counter */}
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                                    <div className="px-1.5 text-slate-400">
                                                        <SoccerBall className="w-3.5 h-3.5" />
                                                    </div>
                                                    <button
                                                        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600 font-bold active:scale-95 transition-transform text-sm"
                                                        onClick={() => updateStats(player.id, { goals: Math.max(0, stats.goals - 1) })}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-8 text-center font-bold text-base text-slate-800 tabular-nums">
                                                        {stats.goals}
                                                    </span>
                                                    <button
                                                        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600 font-bold active:scale-95 transition-transform text-sm"
                                                        onClick={() => updateStats(player.id, { goals: stats.goals + 1 })}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Goles</span>
                                            </div>

                                            {/* Divider */}
                                            <div className="hidden sm:block w-px h-8 bg-slate-200"></div>

                                            {/* Cards */}
                                            <div className="flex items-center gap-2">
                                                {/* Yellow Card */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <button
                                                        onClick={() => updateStats(player.id, { yellowCards: (stats.yellowCards + 1) % 3 })}
                                                        className={`
                                                w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all active:scale-95 shadow-sm
                                                ${stats.yellowCards > 0
                                                                ? 'bg-yellow-100 border-yellow-400 text-yellow-600'
                                                                : 'bg-white border-slate-200 text-slate-300 hover:border-yellow-200 hover:text-yellow-400'}
                                            `}
                                                    >
                                                        <div className="relative">
                                                            <Square className="w-4 h-4 fill-current" />
                                                            {stats.yellowCards > 1 && (
                                                                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold shadow-sm">
                                                                    2
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ama</span>
                                                </div>

                                                {/* Red Card */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <button
                                                        onClick={() => updateStats(player.id, { redCard: !stats.redCard })}
                                                        className={`
                                                w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all active:scale-95 shadow-sm
                                                ${stats.redCard
                                                                ? 'bg-red-100 border-red-500 text-red-600'
                                                                : 'bg-white border-slate-200 text-slate-300 hover:border-red-200 hover:text-red-400'}
                                            `}
                                                    >
                                                        <Square className="w-4 h-4 fill-current" />
                                                    </button>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Roja</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Red Card Expanded Panel */}
                                    {stats.redCard && (
                                        <div className="bg-red-50/80 border-t border-red-100 p-3 pt-4 px-4 pb-4 w-full animate-in slide-in-from-top-4 fade-in duration-300">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold text-red-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                        Causal de Expulsión <span className="text-[9px] bg-white border border-red-200 text-red-700 px-1.5 py-0.5 rounded uppercase">(Opcional)</span>
                                                    </label>
                                                    <textarea
                                                        className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow placeholder:text-slate-400 font-medium whitespace-pre-wrap"
                                                        placeholder="Describe el motivo (ej. Conducta violenta, Insultos al árbitro...)"
                                                        rows={2}
                                                        value={stats.notes || ''}
                                                        onChange={(e) => updateStats(player.id, { notes: e.target.value })}
                                                    />
                                                </div>
                                                <div className="w-full sm:w-auto shrink-0 flex flex-col justify-start">
                                                    <label className="text-xs font-bold text-red-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                        Partidos Suspendido
                                                    </label>
                                                    <div className="flex bg-white border border-red-200 rounded-lg p-1 items-center justify-between w-[120px] mt-0.5 shadow-sm">
                                                        <button
                                                            onClick={() => updateStats(player.id, { suspensionMatchdays: Math.max(1, (stats.suspensionMatchdays || 1) - 1) })}
                                                            className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-md text-red-600 font-bold hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm cursor-pointer border border-red-100"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="font-black text-slate-800 text-sm flex-1 text-center">{stats.suspensionMatchdays || 1}</span>
                                                        <button
                                                            onClick={() => updateStats(player.id, { suspensionMatchdays: (stats.suspensionMatchdays || 1) + 1 })}
                                                            className="w-8 h-8 flex items-center justify-center bg-red-50 rounded-md text-red-600 font-bold hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm cursor-pointer border border-red-100"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Cédula Digital
                            <span className="text-sm font-bold text-green-700 px-3 py-0.5 bg-green-100 rounded-full border border-green-200">
                                Paso {step} de 2
                            </span>
                        </h2>
                        <p className="text-sm text-slate-500">
                            {step === 1 && "Registra asistencia, goles y tarjetas."}
                            {step === 2 && "Confirma los eventos del partido."}
                        </p>
                    </div >
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X className="w-6 h-6" />
                    </button>
                </div >

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-slate-50/50 relative">
                    {isLoadingEvents && (
                        <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="flex flex-col gap-6 pb-20 min-h-0 h-full">
                            {/* Double Forfeit Toggle */}
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                                <div>
                                    <h4 className="font-bold text-red-900 text-sm">Situación Extraordinaria: Ambos Equipos Pierden</h4>
                                    <p className="text-xs text-red-700 mt-1">
                                        Activar en caso de incidentes (ej. riña). Puedes usar esta vista para añadir expulsiones o notas. Ambos equipos registrarán una derrota y 0 puntos al finalizar.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isDoubleForfeit}
                                        onChange={(e) => setIsDoubleForfeit(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                                {renderRosterGrid(homeRoster, homeTeamName || "Local", homeSearch, setHomeSearch)}
                                {renderRosterGrid(awayRoster, awayTeamName || "Visitante", awaySearch, setAwaySearch)}
                            </div>
                        </div>
                    )}

                    {
                        step === 2 && (
                            <div className="max-w-5xl mx-auto space-y-8">
                                {/* Scoreboard Header */}
                                <div className="bg-white rounded-2xl p-6 border shadow-sm text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Marcador Final</h3>
                                    <div className="flex items-center justify-center gap-12">
                                        <div className="text-right">
                                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{homeTeamName || "Local"}</h2>
                                        </div>
                                        <div className="flex items-center gap-6 bg-slate-50 px-8 py-2 rounded-xl border border-slate-100">
                                            <span className="text-5xl font-black text-slate-900">{calculatedHomeScore}</span>
                                            <span className="text-2xl text-slate-300 font-light">-</span>
                                            <span className="text-5xl font-black text-slate-900">{calculatedAwayScore}</span>
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{awayTeamName || "Visitante"}</h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Team Summaries Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Home Team Column */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-700 mx-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            Resumen {homeTeamName || "Local"}
                                        </h4>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="divide-y divide-slate-100">
                                                {homeRoster
                                                    .filter(p => getStats(p.id).played)
                                                    .map(p => {
                                                        const s = getStats(p.id);
                                                        return (
                                                            <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                                <div className="flex items-start gap-3 min-w-0 flex-1 pr-4">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
                                                                        {p.firstName[0]}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                                        <div className="flex items-start gap-2">
                                                                            {settings?.requireJerseyNumbers && (
                                                                                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-white shrink-0 shadow-sm" title="Dorsal">
                                                                                    {p.jerseyNumber || '-'}
                                                                                </span>
                                                                            )}
                                                                            <span className="font-bold text-slate-900 text-sm whitespace-normal break-words leading-tight">{p.firstName} {p.lastName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    {/* Goals */}
                                                                    {s.goals > 0 && Array.from({ length: s.goals }).map((_, i) => (
                                                                        <div key={`goal-${i}`} title="Gol">
                                                                            <SoccerBall className="w-3.5 h-3.5 text-slate-700 fill-slate-700/20" />
                                                                        </div>
                                                                    ))}

                                                                    {/* Cards */}
                                                                    {s.yellowCards > 0 && Array.from({ length: s.yellowCards }).map((_, i) => (
                                                                        <div key={`yellow-${i}`} title="Amarilla" className="w-3.5 h-4 bg-yellow-400 rounded-sm border border-yellow-500/50 shadow-sm" />
                                                                    ))}
                                                                    {s.redCard && (
                                                                        <div title="Roja" className="w-3.5 h-4 bg-red-500 rounded-sm border border-red-600/50 shadow-sm" />
                                                                    )}

                                                                    {/* Played indicator if nothing else */}
                                                                    {s.goals === 0 && s.yellowCards === 0 && !s.redCard && (
                                                                        <div title="Jugó" className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                {homeRoster.filter(p => getStats(p.id).played).length === 0 && (
                                                    <div className="p-8 text-center text-slate-400 text-sm italic">
                                                        Sin actividad registrada
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Away Team Column */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-700 mx-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                            Resumen {awayTeamName || "Visitante"}
                                        </h4>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="divide-y divide-slate-100">
                                                {awayRoster
                                                    .filter(p => getStats(p.id).played)
                                                    .map(p => {
                                                        const s = getStats(p.id);
                                                        return (
                                                            <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                                <div className="flex items-start gap-3 min-w-0 flex-1 pr-4">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
                                                                        {p.firstName[0]}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                                        <div className="flex items-start gap-2">
                                                                            {settings?.requireJerseyNumbers && (
                                                                                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-white shrink-0 shadow-sm" title="Dorsal">
                                                                                    {p.jerseyNumber || '-'}
                                                                                </span>
                                                                            )}
                                                                            <span className="font-bold text-slate-900 text-sm whitespace-normal break-words leading-tight">{p.firstName} {p.lastName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    {/* Goals */}
                                                                    {s.goals > 0 && Array.from({ length: s.goals }).map((_, i) => (
                                                                        <div key={`goal-${i}`} title="Gol">
                                                                            <SoccerBall className="w-3.5 h-3.5 text-slate-700 fill-slate-700/20" />
                                                                        </div>
                                                                    ))}

                                                                    {/* Cards */}
                                                                    {s.yellowCards > 0 && Array.from({ length: s.yellowCards }).map((_, i) => (
                                                                        <div key={`yellow-${i}`} title="Amarilla" className="w-3.5 h-4 bg-yellow-400 rounded-sm border border-yellow-500/50 shadow-sm" />
                                                                    ))}
                                                                    {s.redCard && (
                                                                        <div title="Roja" className="w-3.5 h-4 bg-red-500 rounded-sm border border-red-600/50 shadow-sm" />
                                                                    )}

                                                                    {/* Played indicator if nothing else */}
                                                                    {s.goals === 0 && s.yellowCards === 0 && !s.redCard && (
                                                                        <div title="Jugó" className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                {awayRoster.filter(p => getStats(p.id).played).length === 0 && (
                                                    <div className="p-8 text-center text-slate-400 text-sm italic">
                                                        Sin actividad registrada
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >

                {/* Footer Actions */}
                < div className="p-4 border-t bg-white flex justify-between items-center" >
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Atrás
                    </button>

                    {
                        step < 2 ? (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Siguiente
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                            >
                                {isSubmitting ? 'Guardando...' : 'Confirmar Cédula'}
                                <Save className="w-4 h-4" />
                            </button>
                        )
                    }
                </div >
            </div >
        </div >
    );
};
