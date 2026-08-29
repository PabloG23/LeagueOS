import { useState } from 'react';
import { X, Save, Trophy, Info, AlertTriangle } from 'lucide-react';
import { Match, leagueApi } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface QuickScoreModalProps {
    match: Match & { home?: string; away?: string };
    onClose: () => void;
    onSuccess: () => void;
}

export const QuickScoreModal = ({ match, onClose, onSuccess }: QuickScoreModalProps) => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const [homeScore, setHomeScore] = useState<number>(match.homeScore ?? 0);
    const [awayScore, setAwayScore] = useState<number>(match.awayScore ?? 0);
    const [isDoubleForfeit, setIsDoubleForfeit] = useState<boolean>(match.isDoubleForfeit ?? false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const homeTeamName = match.home || match.homeTeam?.name || 'Local';
    const awayTeamName = match.away || match.awayTeam?.name || 'Visitante';

    const handleSave = async () => {
        if (!settings?.tenantId) return;
        setIsSubmitting(true);
        try {
            await leagueApi.updateMatchScore(
                settings.tenantId,
                match.id,
                Number(homeScore) || 0,
                Number(awayScore) || 0,
                isDoubleForfeit
            );
            showToast('Marcador actualizado exitosamente.', 'success');
            onSuccess();
        } catch (error) {
            console.error('Failed to update match score', error);
            showToast('Error al actualizar el marcador.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">Captura Rápida de Marcador</h2>
                            <p className="text-[11px] text-slate-400 font-medium">Jornada {match.matchday || 1}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Notice Banner */}
                    <div className="bg-blue-50/80 border border-blue-100/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-blue-950">Actualización sin jugadores requeridos</p>
                            <p className="text-blue-800 leading-relaxed">
                                Este marcador actualiza la <strong>tabla de posiciones</strong> (puntos, DG, GF, GC) de inmediato. Cuando los equipos registren a sus jugadores, podrás usar <strong>"Editar Cédula"</strong> para asignar los anotadores y alimentar la tabla de goleo.
                            </p>
                        </div>
                    </div>

                    {/* Matchup Scoreboard */}
                    <div className="grid grid-cols-5 items-center gap-3 bg-slate-50 p-5 rounded-3xl border border-slate-200/80">
                        {/* Home Team */}
                        <div className="col-span-2 flex flex-col items-center text-center gap-2">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                                <TeamLogo
                                    teamName={homeTeamName}
                                    logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl}
                                    fallbackClass="text-base font-black text-indigo-600"
                                />
                            </div>
                            <span className="font-black text-slate-900 text-xs sm:text-sm line-clamp-2 leading-tight">
                                {homeTeamName}
                            </span>
                            
                            {/* Counter */}
                            <div className="flex items-center gap-1.5 mt-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setHomeScore(prev => Math.max(0, prev - 1))}
                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black text-sm flex items-center justify-center transition-all"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    value={homeScore}
                                    onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-12 text-center font-black text-xl text-slate-900 border-none outline-none bg-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setHomeScore(prev => prev + 1)}
                                    className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-sm flex items-center justify-center transition-all shadow-xs"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* VS Center */}
                        <div className="col-span-1 flex flex-col items-center justify-center">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                                VS
                            </span>
                        </div>

                        {/* Away Team */}
                        <div className="col-span-2 flex flex-col items-center text-center gap-2">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                                <TeamLogo
                                    teamName={awayTeamName}
                                    logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl}
                                    fallbackClass="text-base font-black text-purple-600"
                                />
                            </div>
                            <span className="font-black text-slate-900 text-xs sm:text-sm line-clamp-2 leading-tight">
                                {awayTeamName}
                            </span>

                            {/* Counter */}
                            <div className="flex items-center gap-1.5 mt-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setAwayScore(prev => Math.max(0, prev - 1))}
                                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black text-sm flex items-center justify-center transition-all"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    value={awayScore}
                                    onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-12 text-center font-black text-xl text-slate-900 border-none outline-none bg-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setAwayScore(prev => prev + 1)}
                                    className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-sm flex items-center justify-center transition-all shadow-xs"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Double Forfeit Toggle */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 px-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <div className="text-left">
                                <p className="text-xs font-black text-amber-950">Doble Forfeit (Ambos pierden)</p>
                                <p className="text-[11px] text-amber-800">Marca derrota y 0 puntos a los dos equipos.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isDoubleForfeit}
                                onChange={(e) => setIsDoubleForfeit(e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <span>Guardando...</span>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Guardar Marcador</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
