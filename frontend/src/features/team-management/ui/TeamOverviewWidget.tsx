import { User, Phone } from 'lucide-react';

export interface TeamRepresentative {
    name: string;
    phone?: string | null;
    photoUrl?: string | null;
}

interface TeamOverviewWidgetProps {
    activeCount: number;
    inactiveCount: number;
    maxCount: number;
    representative?: TeamRepresentative;
}

export const TeamOverviewWidget = ({ activeCount, inactiveCount, maxCount, representative }: TeamOverviewWidgetProps) => {
    const isFull = activeCount >= maxCount;

    // Fallback if no rep is provided
    const rep = representative || {
        name: 'Sin Asignar',
        phone: '---',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Resumen del Equipo</h3>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">

                {/* Left Side: Roster Stats */}
                <div className="flex items-center gap-8 flex-1">
                    {/* Active Players */}
                    <div className="flex flex-col">
                        <span className={`text-5xl font-bold ${isFull ? 'text-red-600' : 'text-slate-900'}`}>
                            {activeCount}
                        </span>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-1">Activos</span>
                    </div>

                    {/* Divider */}
                    <div className="h-16 w-px bg-slate-200"></div>

                    {/* Inactive Players */}
                    <div className="flex flex-col">
                        <span className="text-5xl font-bold text-slate-300">
                            {inactiveCount}
                        </span>
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-1">Inactivos</span>
                    </div>
                </div>

                {/* Vertical Divider for Desktop */}
                <div className="hidden md:block h-16 w-px bg-slate-200"></div>

                {/* Right Side: Representative Info */}
                <div className="flex flex-col flex-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Representante</span>

                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {rep.photoUrl ? (
                                <img src={rep.photoUrl} alt={rep.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>

                        {/* Info & Actions */}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate text-base">
                                {rep.name}
                            </p>

                            <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                                {rep.phone && rep.phone !== '---' ? (
                                    <a
                                        href={`https://wa.me/${rep.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 hover:text-green-600 transition-colors font-medium"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>{rep.phone}</span>
                                    </a>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>No registrado</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Max Limit Info Overlay (positioned logically) */}
                <div className="hidden lg:flex flex-col items-end justify-center pl-8 border-l border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Límite</p>
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="text-xl font-bold text-slate-600">{maxCount}</span>
                    </div>
                </div>

            </div>

            {/* Error Message for Full Roster */}
            {isFull && (
                <div className="mt-6 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="font-medium">Has alcanzado el límite de jugadores activos.</span>
                </div>
            )}
        </div>
    );
};
