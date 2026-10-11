import { useState, useEffect, useMemo } from 'react';
import { 
    X, RefreshCw, CheckCircle, AlertCircle, Calendar, Users, 
    Swords, Loader2, Check, ArrowRight 
} from 'lucide-react';
import { leagueApi, Season, MatchPreviewDTO } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import { MatchdayPreviewCard } from './MatchdayPreviewCard';

interface RoundRobinPreviewModalProps {
    tenantId: string;
    seasonId: string;
    initialPreviews?: MatchPreviewDTO[];
    siblingSeasons?: Season[];
    onClose: () => void;
    onConfirmed: (savedSeasonIds?: string[]) => void;
}

interface FuerzaData {
    season: Season;
    catName: string;
    teamCount: number;
    previews: MatchPreviewDTO[];
    matchdayMap: Map<number, MatchPreviewDTO[]>;
    matchdays: number[];
    isLoading: boolean;
    isConfirming: boolean;
    isSaved: boolean;
    hasCalendar: boolean;
    error: string | null;
}

const buildMatchdayMap = (matches: MatchPreviewDTO[]): Map<number, MatchPreviewDTO[]> => {
    return matches.reduce<Map<number, MatchPreviewDTO[]>>((map, m) => {
        const list = map.get(m.matchday) ?? [];
        list.push(m);
        map.set(m.matchday, list);
        return map;
    }, new Map());
};

export const RoundRobinPreviewModal = ({
    tenantId,
    seasonId,
    initialPreviews,
    siblingSeasons,
    onClose,
    onConfirmed,
}: RoundRobinPreviewModalProps) => {
    const { showToast } = useToast();

    // Determine the list of all fuerzas for this tournament
    const fuerzas: Season[] = useMemo(() => {
        if (siblingSeasons && siblingSeasons.length > 1) {
            return siblingSeasons;
        }
        return [{ id: seasonId, name: 'Torneo' } as Season];
    }, [siblingSeasons, seasonId]);

    // Active fuerza tab: defaults to the current seasonId
    const [selectedTab, setSelectedTab] = useState<string>(seasonId);
    const [fuerzasMap, setFuerzasMap] = useState<Record<string, FuerzaData>>({});
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Initial load for all fuerzas
    useEffect(() => {
        let isMounted = true;
        setIsInitialLoading(true);

        const loadAll = async () => {
            const nextMap: Record<string, FuerzaData> = {};

            await Promise.all(
                fuerzas.map(async (f) => {
                    const parts = f.name.split(' - ');
                    const catName = parts.length > 1 ? parts[1] : (fuerzas.length === 1 ? 'General' : f.name);

                    let teamCount = 0;
                    let hasCalendar = false;
                    let previews: MatchPreviewDTO[] = [];
                    let error: string | null = null;

                    try {
                        const [teamsRes, matchesRes] = await Promise.all([
                            leagueApi.getEnrolledTeams(tenantId, f.id),
                            leagueApi.getSeasonMatches(tenantId, f.id).catch(() => ({ data: [] }))
                        ]);

                        teamCount = teamsRes.data.length;
                        hasCalendar = (matchesRes.data && matchesRes.data.length > 0) || false;

                        if (teamCount >= 2) {
                            if (f.id === seasonId && initialPreviews && initialPreviews.length > 0) {
                                previews = initialPreviews;
                            } else {
                                const prevRes = await leagueApi.previewRoundRobinFixtures(tenantId, f.id);
                                previews = prevRes.data;
                            }
                        }
                    } catch (err: any) {
                        console.error(`Error loading preview for ${f.name}`, err);
                        error = err.response?.data?.error || "Error al generar vista previa.";
                    }

                    const matchdayMap = buildMatchdayMap(previews);
                    const matchdays = Array.from(matchdayMap.keys()).sort((a, b) => a - b);

                    nextMap[f.id] = {
                        season: f,
                        catName,
                        teamCount,
                        previews,
                        matchdayMap,
                        matchdays,
                        isLoading: false,
                        isConfirming: false,
                        isSaved: false,
                        hasCalendar,
                        error,
                    };
                })
            );

            if (isMounted) {
                setFuerzasMap(nextMap);
                setIsInitialLoading(false);
            }
        };

        loadAll();

        return () => {
            isMounted = false;
        };
    }, [tenantId, seasonId, fuerzas, initialPreviews]);

    // Regenerate preview for the selected fuerza
    const handleRegenerate = async (fId: string) => {
        setFuerzasMap(prev => ({
            ...prev,
            [fId]: { ...prev[fId], isLoading: true, error: null }
        }));
        try {
            const res = await leagueApi.previewRoundRobinFixtures(tenantId, fId);
            const map = buildMatchdayMap(res.data);
            setFuerzasMap(prev => ({
                ...prev,
                [fId]: {
                    ...prev[fId],
                    previews: res.data,
                    matchdayMap: map,
                    matchdays: Array.from(map.keys()).sort((a, b) => a - b),
                    isLoading: false,
                }
            }));
            const catName = fuerzasMap[fId]?.catName || 'la fuerza';
            showToast(`Vista previa de ${catName} recalculada.`, "info");
        } catch (err: any) {
            const msg = err.response?.data?.error || "Error al regenerar vista previa.";
            setFuerzasMap(prev => ({
                ...prev,
                [fId]: {
                    ...prev[fId],
                    isLoading: false,
                    error: msg
                }
            }));
            showToast(msg, "error");
        }
    };

    // Save calendar for the selected fuerza
    const handleConfirm = async (fId: string) => {
        const fData = fuerzasMap[fId];
        if (!fData || fData.teamCount < 2) return;

        setFuerzasMap(prev => ({
            ...prev,
            [fId]: { ...prev[fId], isConfirming: true, error: null }
        }));

        try {
            await leagueApi.generateRoundRobinFixtures(tenantId, fId);
            const nextMap: Record<string, FuerzaData> = {
                ...fuerzasMap,
                [fId]: {
                    ...fuerzasMap[fId],
                    isConfirming: false,
                    isSaved: true,
                    hasCalendar: true,
                }
            };
            setFuerzasMap(nextMap);
            onConfirmed([fId]);

            // Check if there are other pending fuerzas with >= 2 teams
            const remainingPending = fuerzas.filter(f => {
                const d = nextMap[f.id];
                return d && d.teamCount >= 2 && !d.isSaved && !d.hasCalendar;
            });

            if (remainingPending.length > 0) {
                const nextCat = remainingPending[0].name.split(' - ')[1] || remainingPending[0].name;
                showToast(`¡Calendario de ${fData.catName} guardado! Continuando con ${nextCat}...`, "success");
                setSelectedTab(remainingPending[0].id);
            } else {
                showToast(`¡Excelente! Todos los calendarios del torneo han sido guardados.`, "success");
                onClose();
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || "Error al guardar el calendario.";
            setFuerzasMap(prev => ({
                ...prev,
                [fId]: {
                    ...prev[fId],
                    isConfirming: false,
                    error: msg
                }
            }));
            showToast(msg, "error");
        }
    };

    const allEligibleDone = useMemo(() => {
        if (fuerzas.length === 0) return false;
        return fuerzas.every(f => {
            const d = fuerzasMap[f.id];
            if (!d) return false;
            if (d.teamCount < 2) return true;
            return d.isSaved || d.hasCalendar;
        });
    }, [fuerzas, fuerzasMap]);

    const nextPendingFuerza = useMemo(() => {
        return fuerzas.find(f => {
            const d = fuerzasMap[f.id];
            return d && d.teamCount >= 2 && !d.isSaved && !d.hasCalendar;
        });
    }, [fuerzas, fuerzasMap]);

    const activeFuerza = fuerzasMap[selectedTab];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">

                {/* ── Header ── */}
                <div className="relative flex flex-col gap-3 px-8 pt-6 pb-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white shrink-0">
                    <div className="flex items-start justify-between gap-4 relative z-10">
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                                    <Swords className="w-4 h-4" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight">Vista Previa — Round Robin</h2>
                            </div>
                            <p className="text-indigo-200 text-xs sm:text-sm">
                                Revisa el calendario generado. Puedes regenerar para obtener un orden diferente.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
                            aria-label="Cerrar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Fuerza Selector Tabs (only shown when tournament has multiple divisiones) */}
                    {fuerzas.length > 1 && (
                        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 mt-1 scrollbar-none">
                            {fuerzas.map(f => {
                                const d = fuerzasMap[f.id];
                                const parts = f.name.split(' - ');
                                const catName = parts.length > 1 ? parts[1] : f.name;
                                const isDone = d && (d.hasCalendar || d.isSaved);
                                const isSelected = selectedTab === f.id;

                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => setSelectedTab(f.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                                            isSelected
                                                ? 'bg-white text-slate-900 shadow-md font-black'
                                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                        }`}
                                    >
                                        <span>{catName}</span>
                                        {isDone && <CheckCircle className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-emerald-300'}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Stats display — simple, subtle typographic row (no redundant capsule pills) */}
                    {activeFuerza && !isInitialLoading && (
                        <div className="relative z-10 flex items-center gap-3 text-xs font-medium text-indigo-200/90 mt-1">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-300/80" />
                                {activeFuerza.matchdays.length} Jornadas
                            </span>
                            <span className="text-indigo-300/40">•</span>
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-indigo-300/80" />
                                {activeFuerza.teamCount} Equipos
                            </span>
                            <span className="text-indigo-300/40">•</span>
                            <span className="flex items-center gap-1.5">
                                <Swords className="w-3.5 h-3.5 text-indigo-300/80" />
                                {activeFuerza.previews.length} Partidos
                            </span>
                            {activeFuerza.hasCalendar && (
                                <>
                                    <span className="text-indigo-300/40">•</span>
                                    <span className="text-emerald-300 font-bold flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Calendario activo
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/50 space-y-3 custom-scrollbar">
                    {isInitialLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-sm font-semibold">Cargando jornadas...</p>
                        </div>
                    ) : activeFuerza ? (
                        activeFuerza.isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-sm font-semibold">Generando nueva combinación...</p>
                            </div>
                        ) : activeFuerza.teamCount < 2 ? (
                            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center my-6">
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-800 text-base mb-1">Equipos Insuficientes</h4>
                                <p className="text-slate-500 text-xs max-w-sm">
                                    Esta fuerza ({activeFuerza.catName}) solo cuenta con {activeFuerza.teamCount} equipo(s). Se requieren al menos 2 equipos inscritos para generar el rol de juegos.
                                </p>
                            </div>
                        ) : (
                            activeFuerza.matchdays.map(day => (
                                <MatchdayPreviewCard
                                    key={day}
                                    matchday={day}
                                    matches={activeFuerza.matchdayMap.get(day) ?? []}
                                />
                            ))
                        )
                    ) : null}
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
                    <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                        Todas las fechas quedan como <strong>"Por definir"</strong>. Podrás editarlas después partido a partido.
                    </p>

                    {activeFuerza && (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => handleRegenerate(activeFuerza.season.id)}
                                disabled={activeFuerza.isLoading || activeFuerza.isConfirming || activeFuerza.teamCount < 2}
                                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${activeFuerza.isLoading ? 'animate-spin' : ''}`} />
                                Regenerar
                            </button>

                            {activeFuerza.isSaved || activeFuerza.hasCalendar ? (
                                allEligibleDone ? (
                                    <button
                                        onClick={() => {
                                            onConfirmed([activeFuerza.season.id]);
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/25 transition-all"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Finalizar y Ver Calendario
                                    </button>
                                ) : nextPendingFuerza ? (
                                    <button
                                        onClick={() => setSelectedTab(nextPendingFuerza.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/25 transition-all"
                                    >
                                        Configurar {nextPendingFuerza.name.split(' - ')[1] || nextPendingFuerza.name}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            onConfirmed([activeFuerza.season.id]);
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Cerrar Vista Previa
                                    </button>
                                )
                            ) : (
                                <button
                                    onClick={() => handleConfirm(activeFuerza.season.id)}
                                    disabled={activeFuerza.isConfirming || activeFuerza.isLoading || activeFuerza.teamCount < 2}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {activeFuerza.isConfirming ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    {activeFuerza.isConfirming 
                                        ? 'Guardando...' 
                                        : `Confirmar y Guardar ${activeFuerza.catName}`}
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
