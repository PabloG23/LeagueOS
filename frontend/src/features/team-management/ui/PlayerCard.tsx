import { Edit2, Trash2, Power } from 'lucide-react';
import { SecureImage } from './SecureImage';

export interface Player {
    id: string;
    name: string;
    photoUrl: string;
    isActive: boolean;
    status?: string;
    jerseyNumber?: number;
    curp?: string;
    birthDate?: string;
    suspendedUntilMatchday?: number;
    stats?: {
        yellowCards?: number;
        redCards?: number;
        suspendedUntilMatchday?: number;
    };
}

interface PlayerCardProps {
    player: Player;
    onToggleStatus?: (id: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    requireJerseyNumbers?: boolean;
}

export const PlayerCard = ({ player, onToggleStatus, requireJerseyNumbers }: PlayerCardProps) => {

    const isPending = player.status === 'PENDING_VERIFICATION';
    
    return (
        <div className={`
            relative p-4 rounded-xl border transition-all duration-300 group h-full flex flex-col
            ${isPending 
                ? 'bg-amber-50 border-amber-300 shadow-md ring-1 ring-amber-500/20'
                : player.isActive
                    ? 'bg-white border-green-500 shadow-md shadow-green-100/50 ring-1 ring-green-500/20'
                    : 'bg-slate-50 border-slate-200 grayscale opacity-75 hover:grayscale-0 hover:opacity-100 hover:shadow-md'
            }
        `}>

            {/* Action Menu (Removed for Players) */}

            <div className="flex flex-col items-center text-center h-full w-full flex-1">
                {/* Avatar with Status Indicator Ring */}
                <div className="relative mb-4">
                    <SecureImage
                        srcKey={player.photoUrl}
                        fallbackSrc={`https://api.dicebear.com/7.x/initials/svg?seed=${player.name}`}
                        alt={player.name}
                        className={`
                            w-28 h-28 rounded-full object-cover border-4 transition-colors
                            ${isPending ? 'border-amber-200' : player.isActive ? 'border-green-100' : 'border-slate-200'}
                        `}
                    />
                    <div className={`
                        absolute bottom-1 right-2 w-6 h-6 rounded-full border-4 border-white
                        ${isPending ? 'bg-amber-500' : player.isActive ? 'bg-green-500' : 'bg-slate-400'}
                    `} />

                    {/* Jersey Number Badge on Avatar */}
                    {player.jerseyNumber != null && (
                        <div className={`
                            absolute -top-1.5 -right-1.5 flex items-center justify-center
                            min-w-7 h-7 px-1.5 bg-slate-900 text-white font-black text-xs rounded-full 
                            shadow-md border-2 border-white
                            ${!player.isActive ? 'grayscale opacity-75' : ''}
                        `} title={`Dorsal #${player.jerseyNumber}`}>
                            #{player.jerseyNumber}
                        </div>
                    )}
                </div>

                {/* Player Info */}
                <h3 
                    className="font-bold text-slate-900 line-clamp-2 leading-tight text-sm w-full px-2 mb-1" 
                    title={player.name}
                >
                    {player.name}
                </h3>

                {/* Optional dorsal subtitle badge if desired */}
                {player.jerseyNumber != null && (
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Dorsal #{player.jerseyNumber}
                    </span>
                )}

                {/* Disciplinary Cards */}
                {(player.stats && ((player.stats.yellowCards || 0) > 0 || (player.stats.redCards || 0) > 0)) && (
                    <div className="flex items-center justify-center gap-3 mb-4 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {Boolean(player.stats.yellowCards && player.stats.yellowCards > 0) && (
                            <div className="flex items-center gap-1.5" title={`${player.stats.yellowCards} Tarjetas Amarillas`}>
                                <div className="w-2.5 h-3.5 bg-yellow-400 rounded-[2px] shadow-sm border border-yellow-500/50" />
                                <span className="text-xs font-bold text-slate-700">{player.stats.yellowCards}</span>
                            </div>
                        )}
                        {Boolean(player.stats.redCards && player.stats.redCards > 0) && (
                            <div className="flex items-center gap-1.5" title={`${player.stats.redCards} Tarjetas Rojas`}>
                                <div className="w-2.5 h-3.5 bg-red-500 rounded-[2px] shadow-sm border border-red-600/50" />
                                <span className="text-xs font-bold text-slate-700">{player.stats.redCards}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Status Toggle or Badge */}
                {isPending ? (
                    <span className="mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium w-full justify-center bg-amber-100 text-amber-700">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        Pendiente Verificar
                    </span>
                ) : onToggleStatus ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleStatus(player.id); }}
                        className={`
                            mt-auto flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors w-full justify-center
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
                        mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium w-full justify-center
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
