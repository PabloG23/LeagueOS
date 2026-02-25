
import { User, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface TopScorer {
    id: string;
    name: string;
    team: string;
    teamId?: string; // Optional for now to avoid breaking other usages if any
    goals: number;
    rank: number;
    image?: string;
}

interface TopScorersWidgetProps {
    scorers: TopScorer[];
}

export const TopScorersWidget = ({ scorers }: TopScorersWidgetProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const leader = scorers[0];
    const runnersUp = scorers.slice(1);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaMexiquense'}/team/${teamId || '1'}`;
    };

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col bg-white overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-6 border-b bg-slate-50/50">
                <h3 className="tracking-tight text-lg font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Goleo Individual
                </h3>
            </div>

            <div className="p-0 flex-1 flex flex-col">
                {/* Hero Leader Section */}
                {leader && (
                    <div className="relative bg-gradient-to-br from-sidebar via-sidebar/90 to-sidebar text-sidebar-foreground p-6 text-center">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur border-4 border-white/20 flex items-center justify-center mb-3 shadow-xl">
                                <User className="w-10 h-10 text-white" />
                            </div>

                            <div className="inline-flex items-center gap-1 bg-yellow-400/20 backdrop-blur px-3 py-1 rounded-full border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-2">
                                #1 Líder de Goleo
                            </div>

                            <h4 className="text-xl font-bold tracking-tight mb-1">{leader.name}</h4>
                            <Link to={getTeamLink(leader.teamId)} className="text-white/70 text-sm font-medium mb-3 hover:text-white hover:underline transition-colors block">
                                {leader.team}
                            </Link>

                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm">
                                {leader.goals}
                                <span className="text-base font-medium text-white/50 ml-1 align-baseline">Goles</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Runners Up List */}
                <div className="p-4 space-y-1 bg-white flex-1">
                    {runnersUp.map((scorer) => (
                        <div key={scorer.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-slate-400 w-4 group-hover:text-primary transition-colors">
                                    {scorer.rank}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight group-hover:text-slate-900">
                                        {scorer.name}
                                    </p>
                                    <Link to={getTeamLink(scorer.teamId)} className="text-xs text-slate-500 group-hover:text-primary hover:underline block">
                                        {scorer.team}
                                    </Link>
                                </div>
                            </div>
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                {scorer.goals}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
