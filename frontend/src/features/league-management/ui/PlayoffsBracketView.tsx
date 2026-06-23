import { useState, useEffect } from 'react';
import { Trophy, Trash2, AlertTriangle, X, Zap, Crown } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastContext';
import { leagueApi } from '@/shared/api/league-api';

export interface PlayoffTie {
    id: string;
    round: 'FINAL' | 'SEMI_FINALS' | 'QUARTER_FINALS' | 'ROUND_OF_16';
    homeSeedTeam: any;
    awaySeedTeam: any;
    advancingTeam: any;
    nextTieId: string | null;
}

interface PlayoffsBracketViewProps {
    tenantId: string;
    seasonId: string;
    refreshTrigger?: number;
    readonly?: boolean;
}

export const PlayoffsBracketView = ({ tenantId, seasonId, refreshTrigger = 0, readonly = false }: PlayoffsBracketViewProps) => {
    const [ties, setTies] = useState<PlayoffTie[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { showToast } = useToast();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await leagueApi.deletePlayoffs(tenantId, seasonId);
            setTies([]);
            setMatches([]);
            setShowDeleteConfirm(false);
            showToast("Fase final eliminada correctamente.", "success");
        } catch (error) {
            console.error(error);
            showToast("Error al borrar la liguilla", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const loadBracket = async () => {
        setLoading(true);
        try {
            const [bracketRes, matchesRes] = await Promise.all([
                leagueApi.getPlayoffBracket(tenantId, seasonId),
                leagueApi.getSeasonMatches(tenantId, seasonId)
            ]);
            setTies(bracketRes.data);
            setMatches(matchesRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBracket();
    }, [tenantId, seasonId, refreshTrigger]);

    const formatMatchDate = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
            const isoStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
            const date = new Date(isoStr);
            return date.toLocaleDateString('es-MX', {
                month: 'short',
                day: 'numeric'
            }) + ' - ' + date.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).toLowerCase();
        } catch (e) {
            return dateStr;
        }
    };

    if (loading) return (
        <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-950 rounded-3xl min-h-[400px]">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
            <p className="text-cyan-400 font-bold uppercase tracking-widest text-sm animate-pulse">Cargando llaves...</p>
        </div>
    );

    if (ties.length === 0) {
        return (
            <div className="border border-slate-800 rounded-3xl p-16 text-center text-slate-400 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="relative z-10 w-20 h-20 bg-slate-800/80 text-cyan-500 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)] transform -rotate-3 hover:rotate-0 transition-transform">
                    <Trophy className="w-10 h-10" />
                </div>
                <h3 className="relative z-10 text-2xl font-black text-white mb-3 tracking-wide drop-shadow-md uppercase">Aún no hay liguilla generada</h3>
                {!readonly && <p className="relative z-10 text-slate-500 max-w-md mx-auto">Haz clic en el botón superior para realizar el sorteo y comenzar la fase final del torneo con toda la emoción.</p>}
            </div>
        );
    }

    const roundsMap = {
        'ROUND_OF_16': ties.filter(t => t.round === 'ROUND_OF_16'),
        'QUARTER_FINALS': ties.filter(t => t.round === 'QUARTER_FINALS'),
        'SEMI_FINALS': ties.filter(t => t.round === 'SEMI_FINALS'),
        'FINAL': ties.filter(t => t.round === 'FINAL')
    };

    const hasRoundOf16 = roundsMap['ROUND_OF_16'].length > 0;
    const hasQuarters = roundsMap['QUARTER_FINALS'].length > 0;
    const hasSemis = roundsMap['SEMI_FINALS'].length > 0;
    const TeamCard = ({ team, isWinner }: { team: any, isWinner: boolean }) => (
        <div className={`p-3 border-b border-white/5 last:border-0 flex items-center gap-3 transition-all duration-300 ${isWinner ? 'bg-gradient-to-r from-amber-950/40 to-transparent border-l-4 border-l-amber-500' : 'opacity-70 grayscale hover:opacity-100 hover:grayscale-0'}`}>
            <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 border-2 ${isWinner ? 'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'border-white/10'}`}>
                {team?.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" /> : <span className={`text-[9px] flex items-center justify-center h-full font-black ${isWinner ? 'text-amber-400' : 'text-slate-400'}`}>{team?.name?.substring(0, 2) || '?'}</span>}
            </div>
            <span className={`truncate flex-1 text-sm font-bold tracking-wide ${isWinner ? 'text-amber-100 drop-shadow-[0_0_2px_rgba(245,158,11,0.3)]' : 'text-slate-300'}`}>{team?.name || 'Por definir'}</span>
            {isWinner && <Crown className="w-4 h-4 text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)] shrink-0" />}
        </div>
    );

    const TieCard = ({ tie, roundIndex }: { tie: PlayoffTie, roundIndex: number }) => {
        const homeWinner = tie.advancingTeam?.id === tie.homeSeedTeam?.id;
        const awayWinner = tie.advancingTeam?.id === tie.awaySeedTeam?.id;
        const isFinal = tie.round === 'FINAL';

        // Find the match for this tie
        const tieMatch = matches.find(m => m.playoffTie?.id === tie.id);

        return (
            <div className="relative flex items-center w-full justify-center group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: `${roundIndex * 0.2}s` }}>
                
                {/* Left Connector In */}
                {roundIndex > 0 && (
                    <div className="absolute -left-8 top-1/2 h-[2px] bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.5)] bracket-line" style={{ animationDelay: `${roundIndex * 0.4}s` }}></div>
                )}
                
                <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 rounded-xl w-56 shrink-0 overflow-hidden hover:border-amber-400/80 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-300 relative z-10 my-4 cursor-pointer transform group-hover:scale-105">
                    <TeamCard team={tie.homeSeedTeam} isWinner={homeWinner} />
                    <TeamCard team={tie.awaySeedTeam} isWinner={awayWinner} />
                    
                    {tieMatch && tieMatch.status === 'SCHEDULED' && (tieMatch.matchDate || tieMatch.location) && (
                        <div className="bg-slate-950/80 border-t border-white/5 px-3 py-2 flex flex-col gap-0.5 text-[10px] text-slate-400 font-bold tracking-wide">
                            {tieMatch.location && <span className="truncate flex items-center gap-1">📍 {tieMatch.location}</span>}
                            {tieMatch.matchDate && <span className="flex items-center gap-1">🕒 {formatMatchDate(tieMatch.matchDate)}</span>}
                        </div>
                    )}
                    
                    {/* Inner highlight */}
                    <div className="absolute inset-0 border border-white/5 rounded-xl pointer-events-none"></div>
                </div>

                {!isFinal && (
                    <div className="absolute -right-8 top-1/2 h-[2px] bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.5)] bracket-line" style={{ animationDelay: `${roundIndex * 0.4 + 0.2}s` }}></div>
                )}
            </div>
        );
    };

    const renderColumn = (title: string, tiesList: PlayoffTie[], icon: any, roundIndex: number, isLast: boolean = false) => {
        if (tiesList.length === 0) return null;

        return (
            <div className={`flex flex-col relative z-10 w-64 shrink-0 ${isLast ? 'mr-12 md:mr-24' : ''}`}>
                <h4 className="font-black text-center text-slate-300 mb-8 uppercase text-xs tracking-[0.25em] h-10 flex items-center justify-center gap-2 bg-gradient-to-b from-[#121c33] to-[#0d1527] rounded-lg border border-[#23355f] shadow-inner px-4 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both" style={{ animationDelay: `${roundIndex * 0.2}s` }}>
                    {icon}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-100 to-amber-400">{title}</span>
                </h4>
                <div className="flex flex-col justify-around flex-1 relative items-center">
                    {roundIndex > 0 && <div className="absolute left-[-2rem] top-1/4 bottom-1/4 w-[2px] bg-slate-800/50 -z-10 rounded-full hidden"></div>}
                    
                    {tiesList.map(tie => <TieCard key={tie.id} tie={tie} roundIndex={roundIndex} />)}
                </div>
            </div>
        );
    };

    return (
        <div className="relative bg-[#0b1120] rounded-3xl p-6 md:p-10 border border-slate-800/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
            <style>{`
                @keyframes drawLine {
                    from { width: 0; opacity: 0; }
                    to { width: 2rem; opacity: 1; }
                }
                .bracket-line {
                    animation: drawLine 0.6s ease-out forwards;
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none"></div>

            {!readonly && (
                <div className="flex justify-end mb-8 relative z-20">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-red-400 bg-red-950/40 border border-red-900/50 hover:bg-red-900/60 hover:text-red-300 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] rounded-lg transition-all duration-300"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reiniciar Liguilla
                    </button>
                </div>
            )}

            <div className="overflow-x-auto pb-4 hide-scrollbar">
                <div className="w-max flex gap-16 pl-4 pt-4 relative">
                    
                    {renderColumn('Octavos', roundsMap['ROUND_OF_16'], <Zap className="w-4 h-4 text-amber-500" />, 0)}
                    {renderColumn('Cuartos', roundsMap['QUARTER_FINALS'], <Zap className="w-4 h-4 text-amber-500" />, hasRoundOf16 ? 1 : 0)}
                    {renderColumn('Semifinal', roundsMap['SEMI_FINALS'], <Zap className="w-4 h-4 text-amber-500" />, hasRoundOf16 ? 2 : 1)}
                    {renderColumn('Gran Final', roundsMap['FINAL'], <Trophy className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />, hasRoundOf16 ? 3 : 2, true)}

                </div>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 pb-0 flex justify-between items-start">
                            <div className="w-14 h-14 rounded-2xl bg-red-950/50 border border-red-900/50 flex items-center justify-center shrink-0 mb-6 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="text-slate-500 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"
                                disabled={isDeleting}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 pb-8">
                            <h3 className="text-2xl font-black text-white mb-3 tracking-wide">
                                ¿Reiniciar Torneo?
                            </h3>
                            <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                                Estás a punto de borrar la fase final. Esto eliminará todos los partidos y llaves actuales, permitiéndote generar un nuevo sorteo desde cero.
                            </p>

                            <div className="flex gap-4 justify-end">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Procesando...</>
                                    ) : (
                                        'Confirmar Reseteo'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

