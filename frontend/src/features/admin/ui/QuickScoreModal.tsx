import { useState } from 'react';
import { X, Save, Trophy, Info, AlertTriangle } from 'lucide-react';
import { Match, leagueApi } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { cn } from '@/shared/lib/utils';

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

    const homeTeamId = match.homeTeamId || match.homeTeam?.id;
    const awayTeamId = match.awayTeamId || match.awayTeam?.id;

    const [homePenaltyScore, setHomePenaltyScore] = useState<number | ''>(match.homePenaltyScore ?? '');
    const [awayPenaltyScore, setAwayPenaltyScore] = useState<number | ''>(match.awayPenaltyScore ?? '');
    const [penaltyWinnerTeamId, setPenaltyWinnerTeamId] = useState<string | null>(
        match.penaltyWinnerTeamId || (match as any).penaltyWinnerTeam?.id || null
    );

    const isTie = Number(homeScore) === Number(awayScore) && !isDoubleForfeit;
    const showShootoutOption = Boolean(settings?.enableShootoutExtraPoint && isTie);

    const handleHomePenaltyChange = (val: number | '') => {
        setHomePenaltyScore(val);
        if (typeof val === 'number' && typeof awayPenaltyScore === 'number') {
            if (val > awayPenaltyScore && homeTeamId) setPenaltyWinnerTeamId(homeTeamId);
            else if (awayPenaltyScore > val && awayTeamId) setPenaltyWinnerTeamId(awayTeamId);
        }
    };

    const handleAwayPenaltyChange = (val: number | '') => {
        setAwayPenaltyScore(val);
        if (typeof val === 'number' && typeof homePenaltyScore === 'number') {
            if (homePenaltyScore > val && homeTeamId) setPenaltyWinnerTeamId(homeTeamId);
            else if (val > homePenaltyScore && awayTeamId) setPenaltyWinnerTeamId(awayTeamId);
        }
    };

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
                isDoubleForfeit,
                showShootoutOption && typeof homePenaltyScore === 'number' ? homePenaltyScore : null,
                showShootoutOption && typeof awayPenaltyScore === 'number' ? awayPenaltyScore : null,
                showShootoutOption ? penaltyWinnerTeamId : null
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 sm:p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
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
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
                    {/* Notice Banner */}
                    <div className="bg-blue-50/80 border border-blue-100/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-blue-900 shadow-2xs">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <p className="font-bold text-blue-950">Actualización sin jugadores requeridos</p>
                            <p className="text-blue-800 text-[11px] sm:text-xs leading-relaxed">
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

                    {/* Shootout / Extra Point Section */}
                    {showShootoutOption && (
                        <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                                    Punto Extra por Penales
                                </h4>
                            </div>

                            <p className="text-[11px] text-amber-800 leading-tight">
                                Indica qué equipo ganó la tanda de penales para sumarle <strong>+1 punto extra</strong> en la tabla de posiciones.
                            </p>

                            {/* Penalty Score Inputs & Winner Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => homeTeamId && setPenaltyWinnerTeamId(homeTeamId)}
                                    className={cn(
                                        "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer",
                                        penaltyWinnerTeamId === homeTeamId
                                            ? "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/20"
                                            : "bg-white border-amber-200/70 text-slate-700 hover:bg-amber-100/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-black text-sm truncate max-w-[140px]">{homeTeamName}</span>
                                        {penaltyWinnerTeamId === homeTeamId && (
                                            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-md text-white whitespace-nowrap">
                                                +1 PT
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-[11px] uppercase font-bold tracking-wider opacity-85">Goles Penales:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={homePenaltyScore}
                                            onChange={(e) => handleHomePenaltyChange(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                            className={cn(
                                                "w-14 h-8 px-2 text-center font-black text-sm rounded-lg border outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                penaltyWinnerTeamId === homeTeamId
                                                    ? "bg-white text-slate-900 border-white"
                                                    : "bg-amber-50/50 border-amber-200 text-slate-900"
                                            )}
                                        />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => awayTeamId && setPenaltyWinnerTeamId(awayTeamId)}
                                    className={cn(
                                        "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer",
                                        penaltyWinnerTeamId === awayTeamId
                                            ? "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/20"
                                            : "bg-white border-amber-200/70 text-slate-700 hover:bg-amber-100/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-black text-sm truncate max-w-[140px]">{awayTeamName}</span>
                                        {penaltyWinnerTeamId === awayTeamId && (
                                            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-md text-white whitespace-nowrap">
                                                +1 PT
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-[11px] uppercase font-bold tracking-wider opacity-85">Goles Penales:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={awayPenaltyScore}
                                            onChange={(e) => handleAwayPenaltyChange(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                            className={cn(
                                                "w-14 h-8 px-2 text-center font-black text-sm rounded-lg border outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                penaltyWinnerTeamId === awayTeamId
                                                    ? "bg-white text-slate-900 border-white"
                                                    : "bg-amber-50/50 border-amber-200 text-slate-900"
                                            )}
                                        />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

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
                <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
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
