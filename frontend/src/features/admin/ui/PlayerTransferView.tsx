import { Search, ArrowRight, UserCheck } from 'lucide-react';

export const PlayerTransferView = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900">Transferencias de Jugadores</h1>
                <p className="text-slate-500 mt-2">Busca un jugador y muévelo a otro equipo.</p>
            </div>

            {/* Step 1: Search */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">Buscar Jugador (Nombre)</label>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                    <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="Ej. Juan Pérez..."
                    />
                </div>
            </div>

            {/* Step 2: Result & Action (Mock State: Found) */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                        <UserCheck className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Juan Pérez</h3>
                    </div>
                    <div className="ml-auto px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                        ACTIVO
                    </div>
                </div>

                <div className="p-8 grid md:grid-cols-3 gap-8 items-center">
                    {/* Current Team */}
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">Equipo Actual</p>
                        <div className="flex flex-col items-center p-4 bg-red-50 rounded-xl border border-red-100">
                            <img src="https://api.dicebear.com/7.x/identicon/svg?seed=Wolves" alt="Wolves" className="w-16 h-16 mb-2" />
                            <span className="font-bold text-slate-900">Wolves</span>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                        <ArrowRight className="w-8 h-8 text-slate-300" />
                    </div>

                    {/* Target Team */}
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wide">Transferir A</p>
                        <select className="w-full p-4 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option>Seleccionar Equipo...</option>
                            <option>San Felipe</option>
                            <option>Halcones FC</option>
                            <option>Manguitos</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all">
                        Confirmar Transferencia
                    </button>
                </div>
            </div>
        </div>
    );
};
