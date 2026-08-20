import { X, RefreshCw, CheckCircle, AlertCircle, Calendar, Users, Swords, Loader2 } from 'lucide-react';
import { useFixtureGenerator } from '../model/use-fixture-generator';
import { MatchdayPreviewCard } from './MatchdayPreviewCard';

interface RoundRobinPreviewModalProps {
    tenantId: string;
    seasonId: string;
    initialPreviews: import('../api/fixture-generator.api').MatchPreviewDTO[];
    onClose: () => void;
    onConfirmed: () => void;
}

export const RoundRobinPreviewModal = ({
    tenantId,
    seasonId,
    initialPreviews,
    onClose,
    onConfirmed,
}: RoundRobinPreviewModalProps) => {
    const {
        previews,
        matchdays,
        matchdayMap,
        isLoadingPreview,
        isConfirming,
        error,
        fetchPreview,
        confirmFixtures,
    } = useFixtureGenerator(tenantId, seasonId, onConfirmed);

    // Use initialPreviews if we haven't fetched yet (i.e. previews is empty)
    const activePreviews = previews.length > 0 ? previews : initialPreviews;

    // Compute summary stats — O(1) from pre-built structures
    const activeMatchdayMap = previews.length > 0
        ? matchdayMap
        : initialPreviews.reduce<Map<number, typeof initialPreviews>>((map, m) => {
            const list = map.get(m.matchday) ?? [];
            list.push(m);
            map.set(m.matchday, list);
            return map;
        }, new Map());

    const activeMatchdays = Array.from(activeMatchdayMap.keys()).sort((a, b) => a - b);

    // Unique teams count — O(n) via Set
    const teamCount = new Set(activePreviews.flatMap(m => [m.homeTeamId, m.awayTeamId])).size;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">

                {/* ── Header ── */}
                <div className="relative flex items-start justify-between gap-4 px-8 py-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white shrink-0">
                    {/* Decorative orbs */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-20 w-32 h-32 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                                <Swords className="w-4 h-4" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight">Vista Previa — Round Robin</h2>
                        </div>
                        <p className="text-indigo-200 text-sm">
                            Revisa el calendario generado. Puedes regenerar para obtener un orden diferente.
                        </p>

                        {/* Stats pills */}
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-200" />
                                <span className="text-xs font-bold">{activeMatchdays.length} Jornadas</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                                <Users className="w-3.5 h-3.5 text-indigo-200" />
                                <span className="text-xs font-bold">{teamCount} Equipos</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                                <Swords className="w-3.5 h-3.5 text-indigo-200" />
                                <span className="text-xs font-bold">{activePreviews.length} Partidos</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="relative z-10 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0 mt-0.5"
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Error Banner ── */}
                {error && (
                    <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-800 text-sm">Error</p>
                            <p className="text-red-700 text-sm mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                {/* ── Body — Scrollable list of matchday cards ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    {isLoadingPreview ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-sm font-semibold">Generando nueva combinación...</p>
                        </div>
                    ) : (
                        activeMatchdays.map(day => (
                            <MatchdayPreviewCard
                                key={day}
                                matchday={day}
                                matches={activeMatchdayMap.get(day) ?? []}
                            />
                        ))
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
                    <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                        Todas las fechas quedan como <strong>"Por definir"</strong>. Podrás editarlas después partido a partido.
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Regenerate */}
                        <button
                            onClick={fetchPreview}
                            disabled={isLoadingPreview || isConfirming}
                            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                            Regenerar
                        </button>

                        {/* Confirm */}
                        <button
                            onClick={confirmFixtures}
                            disabled={isConfirming || isLoadingPreview || activePreviews.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isConfirming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            {isConfirming ? 'Guardando...' : 'Confirmar y Guardar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
