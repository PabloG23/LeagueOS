import { useState } from 'react';
import { Save, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Search, FileText } from 'lucide-react';
import { MatchReportWizard } from './MatchReportWizard';
import { Match, Player } from '@/shared/api/league-api';

// --- Mock Data for Demo ---
// In real app, these would come from API based on match.homeTeamId/awayTeamId
const MOCK_ROSTERS: Record<string, Player[]> = {
    'Wolves': [
        { id: '101', firstName: 'Raúl', lastName: 'Jiménez', teamId: 'Wolves' },
        { id: '102', firstName: 'Pedro', lastName: 'Neto', teamId: 'Wolves' },
        { id: '103', firstName: 'Adama', lastName: 'Traoré', teamId: 'Wolves' },
        { id: '104', firstName: 'Ruben', lastName: 'Neves', teamId: 'Wolves' },
        { id: '105', firstName: 'Conor', lastName: 'Coady', teamId: 'Wolves' }
    ],
    'San Felipe': [
        { id: '201', firstName: 'Luis', lastName: 'Montes', teamId: 'San Felipe' },
        { id: '202', firstName: 'Carlos', lastName: 'Peña', teamId: 'San Felipe' },
        { id: '203', firstName: 'José Juan', lastName: 'Vázquez', teamId: 'San Felipe' },
        { id: '204', firstName: 'Ignacio', lastName: 'González', teamId: 'San Felipe' },
        { id: '205', firstName: 'William', lastName: 'Yarbrough', teamId: 'San Felipe' }
    ],
    'Halcones FC': [
        { id: '301', firstName: 'Cuauhtémoc', lastName: 'Blanco', teamId: 'Halcones FC' },
        { id: '302', firstName: 'Salvador', lastName: 'Cabañas', teamId: 'Halcones FC' }
    ],
    'Manguitos': [
        { id: '401', firstName: 'Jorge', lastName: 'Campos', teamId: 'Manguitos' }
    ]
};

const INITIAL_MATCHES: Match[] = [
    { id: '1', seasonId: 's1', homeTeamId: 't1', awayTeamId: 't2', matchDate: '2026-02-10', homeScore: 2, awayScore: 1, status: 'FINISHED' },
    // Enriched for UI
] as any[];

// UI Helper to match the design (augmenting the API Match type with UI props for the demo)
interface UIMatch extends Match {
    home: string;
    homeLogo: string;
    away: string;
    awayLogo: string;
}

const DEMO_MATCHES: UIMatch[] = [
    {
        id: '1', seasonId: 's1', homeTeamId: 'Wolves', awayTeamId: 'San Felipe', matchDate: '2026-02-10',
        homeScore: 2, awayScore: 1, status: 'FINISHED',
        home: 'Wolves', homeLogo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Wolves',
        away: 'San Felipe', awayLogo: 'https://api.dicebear.com/7.x/identicon/svg?seed=SanFelipe'
    },
    {
        id: '2', seasonId: 's1', homeTeamId: 'Halcones FC', awayTeamId: 'Manguitos', matchDate: '2026-02-10',
        homeScore: undefined, awayScore: undefined, status: 'SCHEDULED',
        home: 'Halcones FC', homeLogo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Halcones',
        away: 'Manguitos', awayLogo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Manguitos'
    },
];

const MatchRow = ({ match, onOpenWizard }: { match: UIMatch, onOpenWizard: (m: UIMatch) => void }) => {
    const isFinished = match.status === 'FINISHED';

    return (
        <div className="hover:bg-slate-50 transition-colors duration-200">
            <div className="p-4 flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    <span className="font-semibold text-slate-900 hidden sm:block">{match.home}</span>
                    <img src={match.homeLogo} alt={match.home} className="w-10 h-10" />
                </div>

                {/* Status / Action Area */}
                <div className="flex flex-col items-center gap-2 px-6 w-40">
                    {isFinished ? (
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-slate-900">{match.homeScore}</span>
                            <span className="text-slate-400 font-bold">-</span>
                            <span className="text-2xl font-bold text-slate-900">{match.awayScore}</span>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                            Por Jugar
                        </span>
                    )}
                </div>

                {/* Away Team */}
                <div className="flex-1 flex items-center justify-start gap-4">
                    <img src={match.awayLogo} alt={match.away} className="w-10 h-10" />
                    <span className="font-semibold text-slate-900 hidden sm:block">{match.away}</span>
                </div>

                {/* Action Button */}
                <div className="pl-4 border-l border-slate-100 ml-4">
                    <button
                        onClick={() => onOpenWizard(match)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${isFinished ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20'}`}
                    >
                        <FileText className="w-4 h-4" />
                        {isFinished ? 'Editar Cédula' : 'Cédula Digital'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MatchResultsView = () => {
    const [matches, setMatches] = useState<UIMatch[]>(DEMO_MATCHES);
    const [selectedMatch, setSelectedMatch] = useState<UIMatch | null>(null);

    const handleWizardSuccess = () => {
        // In real app, fetch matches again.
        // For demo, just close and maybe update local state to "FINISHED"
        if (selectedMatch) {
            setMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, status: 'FINISHED', homeScore: 0, awayScore: 0 } : m)); // Hacky update for visual feedback
        }
        setSelectedMatch(null);
    };

    return (
        <div className="space-y-6 relative h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Resultados de Partidos</h1>
                    <p className="text-slate-500">Gestión de Cédulas Digitales y Marcadores.</p>
                </div>
                <div className="w-48">
                    <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                        <option>Jornada 1</option>
                        <option>Jornada 2</option>
                        <option>Jornada 3</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-medium text-slate-500 text-sm flex justify-between">
                    <span>Partidos Programados</span>
                    <span className="text-slate-400 font-normal">Jornada 1 - 10 Feb 2026</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {matches.map((match) => (
                        <MatchRow key={match.id} match={match} onOpenWizard={setSelectedMatch} />
                    ))}
                </div>
            </div>

            {selectedMatch && (
                <MatchReportWizard
                    match={selectedMatch}
                    homeRoster={MOCK_ROSTERS[selectedMatch.home] || []}
                    awayRoster={MOCK_ROSTERS[selectedMatch.away] || []}
                    homeTeamName={selectedMatch.home}
                    awayTeamName={selectedMatch.away}
                    onClose={() => setSelectedMatch(null)}
                    onSuccess={handleWizardSuccess}
                />
            )}
        </div>
    );
};
