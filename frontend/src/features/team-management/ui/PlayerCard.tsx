import { Edit2, Trash2, Power } from 'lucide-react';

export interface Player {
    id: string;
    name: string;
    photoUrl: string;
    isActive: boolean;
    stats?: {
        yellowCards: number;
        redCards: number;
    };
}

interface PlayerCardProps {
    player: Player;
    onToggleStatus?: (id: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
}

export const PlayerCard = ({ player, onToggleStatus, onDelete, onEdit }: PlayerCardProps) => {
    const showActions = !!onEdit || !!onDelete;

    return (
        <div className={`
            relative p-4 rounded-xl border transition-all duration-300 group
            ${player.isActive
                ? 'bg-white border-green-500 shadow-md shadow-green-100/50 ring-1 ring-green-500/20'
                : 'bg-slate-50 border-slate-200 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 hover:shadow-md'
            }
        `}>

            {/* Action Menu (Visible on Hover if actions exist) */}
            {showActions && (
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(player.id); }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(player.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            <div className="flex flex-col items-center text-center">
                {/* Avatar with Status Indicator Ring */}
                <div className="relative mb-3">
                    <img
                        src={player.photoUrl}
                        alt={player.name}
                        className={`
                            w-20 h-20 rounded-full object-cover border-4 transition-colors
                            ${player.isActive ? 'border-green-100' : 'border-slate-200'}
                        `}
                    />
                    <div className={`
                        absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white
                        ${player.isActive ? 'bg-green-500' : 'bg-slate-400'}
                    `} />
                </div>

                {/* Player Info */}
                <h3 className={`font-bold text-slate-900 truncate w-full px-2 ${(player.stats?.yellowCards || player.stats?.redCards) ? 'mb-2' : 'mb-4'}`}>{player.name}</h3>

                {/* Disciplinary Cards */}
                {(player.stats && (player.stats.yellowCards > 0 || player.stats.redCards > 0)) && (
                    <div className="flex items-center justify-center gap-3 mb-4 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {player.stats.yellowCards > 0 && (
                            <div className="flex items-center gap-1.5" title={`${player.stats.yellowCards} Tarjetas Amarillas`}>
                                <div className="w-2.5 h-3.5 bg-yellow-400 rounded-[2px] shadow-sm border border-yellow-500/50" />
                                <span className="text-xs font-bold text-slate-700">{player.stats.yellowCards}</span>
                            </div>
                        )}
                        {player.stats.redCards > 0 && (
                            <div className="flex items-center gap-1.5" title={`${player.stats.redCards} Tarjetas Rojas`}>
                                <div className="w-2.5 h-3.5 bg-red-500 rounded-[2px] shadow-sm border border-red-600/50" />
                                <span className="text-xs font-bold text-slate-700">{player.stats.redCards}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Status Toggle or Badge */}
                {onToggleStatus ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleStatus(player.id); }}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors w-full justify-center
                            ${player.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }
                        `}
                    >
                        <Power className="w-4 h-4" />
                        {player.isActive ? 'Activo' : 'Inactivo'}
                    </button>
                ) : (
                    <span className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium w-full justify-center
                        ${player.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-200 text-slate-600'
                        }
                    `}>
                        <div className={`w-2 h-2 rounded-full ${player.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {player.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                )}
            </div>
        </div>
    );
};
