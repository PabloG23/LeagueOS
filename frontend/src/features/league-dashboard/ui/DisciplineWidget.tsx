import { Shield, TrendingDown } from 'lucide-react';

interface TeamDiscipline {
    rank: number;
    team: string;
    logoUrl?: string; // Optional if we generate it
    redCards: number;
}

// Mock Data
const MOCK_DISCIPLINE_DATA: TeamDiscipline[] = [
    { rank: 1, team: 'Carniceros', redCards: 8 },
    { rank: 2, team: 'Leñadores', redCards: 6 },
    { rank: 3, team: 'Atletico', redCards: 4 },
    { rank: 4, team: 'Panteón FC', redCards: 3 },
    { rank: 5, team: 'Cantera', redCards: 3 },
];

export const DisciplineWidget = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="bg-red-100 text-red-600 p-1 rounded">
                    <Shield className="w-5 h-5 fill-red-600" />
                </span>
                Tabla de Disciplina
            </h3>

            <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                    <span>Equipo</span>
                    <span>Tarjetas Rojas</span>
                </div>

                {MOCK_DISCIPLINE_DATA.map((item) => (
                    <div key={item.rank} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-slate-400 w-4">{item.rank}.</span>
                            <img
                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${item.team}`}
                                alt={item.team}
                                className="w-8 h-8 bg-slate-100 rounded-full p-0.5"
                            />
                            <span className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{item.team}</span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                            <span>{item.redCards}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <button className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1 w-full transition-colors">
                    Ver reporte completo
                    <TrendingDown className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
