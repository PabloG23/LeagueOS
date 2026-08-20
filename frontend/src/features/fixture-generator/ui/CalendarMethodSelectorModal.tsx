import { useState } from 'react';
import { X, FileSpreadsheet, Shuffle, ChevronRight, Loader2, AlertCircle, Zap } from 'lucide-react';
import { leagueApi } from '../api/fixture-generator.api';
import type { MatchPreviewDTO } from '../api/fixture-generator.api';
import { RoundRobinPreviewModal } from './RoundRobinPreviewModal';

interface CalendarMethodSelectorModalProps {
    tenantId: string;
    seasonId: string;
    onSelectExcel: () => void;
    onClose: () => void;
    onConfirmed: () => void;
}

type ModalState = 'selecting' | 'loading-preview' | 'preview';

export const CalendarMethodSelectorModal = ({
    tenantId,
    seasonId,
    onSelectExcel,
    onClose,
    onConfirmed,
}: CalendarMethodSelectorModalProps) => {
    const [state, setState] = useState<ModalState>('selecting');
    const [previews, setPreviews] = useState<MatchPreviewDTO[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSelectRoundRobin = async () => {
        setState('loading-preview');
        setError(null);
        try {
            const res = await leagueApi.previewRoundRobinFixtures(tenantId, seasonId);
            setPreviews(res.data);
            setState('preview');
        } catch (err: any) {
            const msg = err.response?.data?.error ?? 'No se pudo generar la vista previa. Verifica que haya al menos 2 equipos aprobados.';
            setError(msg);
            setState('selecting');
        }
    };

    // If in preview state, render the full preview modal instead
    if (state === 'preview') {
        return (
            <RoundRobinPreviewModal
                tenantId={tenantId}
                seasonId={seasonId}
                initialPreviews={previews}
                onClose={onClose}
                onConfirmed={onConfirmed}
            />
        );
    }

    const isLoading = state === 'loading-preview';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="relative px-8 pt-8 pb-6">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4 text-slate-600" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Generar Calendario</h2>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Elige cómo quieres crear el calendario de enfrentamientos para este torneo.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-8 mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Options */}
                <div className="px-8 pb-8 grid grid-cols-1 gap-3">
                    {/* ── Option 1: Excel Upload ── */}
                    <button
                        onClick={onSelectExcel}
                        disabled={isLoading}
                        className="group relative flex items-center gap-5 p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center shrink-0 transition-colors duration-200">
                            <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-base leading-tight mb-1">Carga Masiva Excel</p>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Importa tu rol de juegos directamente desde la plantilla Excel de la liga.
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>

                    {/* ── Option 2: Round Robin ── */}
                    <button
                        onClick={handleSelectRoundRobin}
                        disabled={isLoading}
                        className="group relative flex items-center gap-5 p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                        {/* Subtle gradient background on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-purple-50/0 group-hover:from-indigo-50/80 group-hover:to-purple-50/80 transition-all duration-300 pointer-events-none" />

                        <div className="relative w-14 h-14 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center shrink-0 transition-colors duration-200">
                            {isLoading ? (
                                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                            ) : (
                                <Shuffle className="w-7 h-7 text-indigo-600" />
                            )}
                        </div>
                        <div className="relative flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-base leading-tight mb-1">Round Robin Aleatorio</p>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {isLoading
                                    ? 'Generando vista previa...'
                                    : 'Genera automáticamente todas las jornadas con vista previa antes de guardar.'}
                            </p>
                        </div>
                        {!isLoading && (
                            <ChevronRight className="relative w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
