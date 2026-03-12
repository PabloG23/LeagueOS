import { useState, useEffect } from 'react';
import { Trophy, Trash2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastContext';
import { leagueApi } from '@/shared/api/league-api';
// Assuming PlayoffTie is defined in league-api.ts, we'll need to add it there.
// For now, let's use any or define a local interface.
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
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { showToast } = useToast();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await leagueApi.deletePlayoffs(tenantId, seasonId);
            setTies([]);
            setShowDeleteConfirm(false);
            showToast("Fase final eliminada correctamente.", "success");
        } catch (error) {
            console.error(error);
            showToast("Error al borrar la liguilla", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const loadBracket = () => {
        setLoading(true);
        leagueApi.getPlayoffBracket(tenantId, seasonId)
            .then(res => setTies(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadBracket();
    }, [tenantId, seasonId, refreshTrigger]);

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando llaves...</div>;

    if (ties.length === 0) {
        return (
            <div className="border border-dashed rounded-xl p-12 text-center text-slate-500 bg-slate-50 flex flex-col items-center">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Aún no hay liguilla generada</h3>
                {!readonly && <p>Haz clic en "Generar Liguilla" para comenzar la fase final del torneo.</p>}
            </div>
        );
    }

    // Group ties by round
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
        <div className={`p-2 border-b last:border-0 flex items-center gap-2 ${isWinner ? 'font-bold text-slate-900 bg-purple-50' : 'text-slate-600'}`}>
            <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0 border">
                {team?.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" /> : <span className="text-[10px] flex items-center justify-center h-full text-slate-400 font-bold">{team?.name?.substring(0, 2) || '?'}</span>}
            </div>
            <span className="truncate flex-1 text-sm">{team?.name || 'Por definir'}</span>
        </div>
    );

    const TieCard = ({ tie }: { tie: PlayoffTie }) => {
        const homeWinner = tie.advancingTeam?.id === tie.homeSeedTeam?.id;
        const awayWinner = tie.advancingTeam?.id === tie.awaySeedTeam?.id;

        return (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm w-48 shrink-0 overflow-hidden hover:border-purple-400 transition-colors relative z-10 my-4 cursor-pointer">
                <TeamCard team={tie.homeSeedTeam} isWinner={homeWinner} />
                <TeamCard team={tie.awaySeedTeam} isWinner={awayWinner} />
            </div>
        );
    };

    return (
        <div className="relative">
            {!readonly && (
                <div className="flex justify-end mb-4 px-4">
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Borrar Liguilla
                    </button>
                </div>
            )}

            <div className="overflow-x-auto pb-8">
                <div className="flex gap-8 min-w-max px-4">

                    {hasRoundOf16 && (
                        <div className="flex flex-col">
                            <h4 className="font-bold text-center text-slate-500 mb-6 uppercase text-sm tracking-wider h-8 flex items-center justify-center">Octavos</h4>
                            <div className="flex flex-col justify-around flex-1">
                                {roundsMap['ROUND_OF_16'].map(tie => <TieCard key={tie.id} tie={tie} />)}
                            </div>
                        </div>
                    )}

                    {hasQuarters && (
                        <div className="flex flex-col">
                            <h4 className="font-bold text-center text-slate-500 mb-6 uppercase text-sm tracking-wider h-8 flex items-center justify-center">Cuartos</h4>
                            <div className="flex flex-col justify-around flex-1">
                                {roundsMap['QUARTER_FINALS'].map(tie => <TieCard key={tie.id} tie={tie} />)}
                            </div>
                        </div>
                    )}

                    {hasSemis && (
                        <div className="flex flex-col">
                            <h4 className="font-bold text-center text-slate-500 mb-6 uppercase text-sm tracking-wider h-8 flex items-center justify-center">Semifinal</h4>
                            <div className="flex flex-col justify-around flex-1">
                                {roundsMap['SEMI_FINALS'].map(tie => <TieCard key={tie.id} tie={tie} />)}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col">
                        <h4 className="font-bold text-center text-slate-500 mb-6 uppercase text-sm tracking-wider h-8 flex items-center justify-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            Final
                        </h4>
                        <div className="flex flex-col justify-around flex-1">
                            {roundsMap['FINAL'].map(tie => <TieCard key={tie.id} tie={tie} />)}
                        </div>
                    </div>

                </div>

                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 pb-0 flex justify-between items-start">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 mb-4">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                    disabled={isDeleting}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="px-6 pb-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">
                                    ¿Borrar toda la Liguilla?
                                </h3>
                                <p className="text-slate-500 mb-6 leading-relaxed">
                                    Seleccionaste borrar la fase final. Esto eliminará todos los partidos y llaves generadas para esta temporada, permitiéndote generar una nueva liguilla desde cero.
                                </p>

                                <div className="flex gap-3 justify-end mt-8">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isDeleting}
                                        className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Borrando...</>
                                        ) : (
                                            'Borrar Liguilla'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
