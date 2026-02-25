import { X, Shield, Trophy } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';

interface Player {
    id: string;
    name: string;
    photoUrl: string;
    isActive: boolean;
    // Mock stats for demo
    stats?: {
        matchesPlayed: number;
        goals: number;
        yellowCards: number;
        redCards: number;
        suspendedUntilMatchday?: number;
    };
    teamName?: string;
    teamLogo?: string;
}

interface PlayerProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: Player | null;
    currentMatchday?: number; // Needed to check suspension status
}

export const PlayerProfileModal = ({ isOpen, onClose, player, currentMatchday = 1 }: PlayerProfileModalProps) => {
    const { settings } = useTenantSettings();

    if (!isOpen || !player) return null;

    // Use mock stats if not present
    const stats = player.stats || {
        matchesPlayed: Math.floor(Math.random() * 10) + 1,
        goals: Math.floor(Math.random() * 5),
        yellowCards: Math.floor(Math.random() * 3),
        redCards: 0,
        suspendedUntilMatchday: null
    };

    // Suspension Logic
    const isSuspended = stats.suspendedUntilMatchday && stats.suspendedUntilMatchday > currentMatchday;

    // Playoff Eligibility Logic
    const minMatches = settings?.minMatchesForPlayoffs || 0;
    const isEligible = minMatches === 0 || stats.matchesPlayed >= minMatches;
    const progressPercent = minMatches > 0 ? Math.min(100, (stats.matchesPlayed / minMatches) * 100) : 100;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full z-10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header / Banner */}
                <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-900 relative">
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md p-1">
                            <img
                                src={player.photoUrl}
                                alt={player.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-14 pb-8 px-6 text-center">
                    <h2 className="text-2xl font-bold text-slate-900">{player.name}</h2>
                    <p className="text-slate-500 font-medium mb-4">{player.teamName || 'Equipo'}</p>

                    {/* Status Badge */}
                    <div className="flex justify-center mb-6">
                        {isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-100 text-red-700 font-bold text-sm shadow-sm border border-red-200">
                                <Shield className="w-4 h-4" />
                                SUSPENDIDO (Hasta J-{stats.suspendedUntilMatchday})
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-100 text-green-700 font-bold text-sm shadow-sm border border-green-200">
                                <Shield className="w-4 h-4" />
                                ELEGIBLE
                            </span>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 mb-8">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase">Juegos</div>
                            <div className="text-xl font-black text-slate-700">{stats.matchesPlayed}</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase">Goles</div>
                            <div className="text-xl font-black text-slate-700">{stats.goals}</div>
                        </div>
                        <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                            <div className="text-xs text-yellow-600/70 font-bold uppercase">Amarillas</div>
                            <div className="text-xl font-black text-yellow-600">{stats.yellowCards}</div>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                            <div className="text-xs text-red-600/70 font-bold uppercase">Rojas</div>
                            <div className="text-xl font-black text-red-600">{stats.redCards}</div>
                        </div>
                    </div>

                    {/* Playoff Eligibility (Feature Flagged Logic) */}
                    {minMatches > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    Elegibilidad para Liguilla
                                </h4>
                                {isEligible ? (
                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">CUMPLE</span>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">PENDIENTE</span>
                                )}
                            </div>

                            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${isEligible ? 'bg-green-500' : 'bg-blue-600'}`}
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>{stats.matchesPlayed} jugados</span>
                                <span>Requeridos: {minMatches}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
