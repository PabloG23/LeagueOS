import { Shield, Clock } from 'lucide-react';
import type { MatchPreviewDTO } from '../api/fixture-generator.api';

interface MatchdayPreviewCardProps {
    matchday: number;
    matches: MatchPreviewDTO[];
}

export const MatchdayPreviewCard = ({ matchday, matches }: MatchdayPreviewCardProps) => {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                        {matchday}
                    </span>
                    <span className="text-sm font-bold text-slate-700 tracking-tight">Jornada {matchday}</span>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-100">
                    {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
                </span>
            </div>

            {/* Match rows */}
            <div className="divide-y divide-slate-50">
                {matches.map((match, idx) => (
                    <div
                        key={idx}
                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                    >
                        {/* Home team */}
                        <div className="flex items-center gap-2.5 justify-end">
                            <span className="text-sm font-semibold text-slate-700 text-right leading-tight">
                                {match.homeTeamName}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-indigo-400" />
                            </div>
                        </div>

                        {/* VS badge */}
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full tracking-widest">
                                VS
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <Clock className="w-2.5 h-2.5" />
                                Por definir
                            </div>
                        </div>

                        {/* Away team */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-sm font-semibold text-slate-700 leading-tight">
                                {match.awayTeamName}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
