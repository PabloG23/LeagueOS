import { User, AlertTriangle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface TopRedCardPlayer {
    id: string;
    name: string;
    team: string;
    teamId?: string;
    redCards: number;
    rank: number;
    image?: string;
}

interface TopRedCardsWidgetProps {
    players: TopRedCardPlayer[];
}

export const TopRedCardsWidget = ({ players }: TopRedCardsWidgetProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const leader = players[0];
    const runnersUp = players.slice(1, 10); // Show up to 10 total

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaMexiquense'}/team/${teamId || '1'}`;
    };

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col bg-white overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-6 border-b bg-red-50/50">
                <h3 className="tracking-tight text-lg font-semibold flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Jugadores con Tarjetas Rojas
                </h3>
            </div>

            <div className="p-0 flex-1 flex flex-col">
                {/* Hero Leader Section */}
                {leader && (
                    <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-red-700 text-white p-6 text-center">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertTriangle className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur border-4 border-white/20 flex items-center justify-center mb-3 shadow-xl">
                                <User className="w-10 h-10 text-white" />
                            </div>

                            <div className="inline-flex items-center gap-1 bg-red-900/40 backdrop-blur px-3 py-1 rounded-full border border-red-400/30 text-red-100 text-xs font-bold uppercase tracking-wider mb-2">
                                #1 Más Expulsiones
                            </div>

                            <h4 className="text-xl font-bold tracking-tight mb-1">{leader.name}</h4>
                            <Link to={getTeamLink(leader.teamId)} className="text-white/70 text-sm font-medium mb-3 hover:text-white hover:underline transition-colors block">
                                {leader.team}
                            </Link>

                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm flex items-baseline justify-center">
                                {leader.redCards}
                                <div className="w-4 h-6 bg-red-500 rounded-sm ml-2 border border-red-700 shadow-sm transform -rotate-6"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Runners Up List */}
                <div className="p-4 space-y-1 bg-white flex-1">
                    {runnersUp.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-slate-400 w-4 group-hover:text-red-500 transition-colors">
                                    {player.rank}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight group-hover:text-slate-900">
                                        {player.name}
                                    </p>
                                    <Link to={getTeamLink(player.teamId)} className="text-xs text-slate-500 group-hover:text-red-500 hover:underline block">
                                        {player.team}
                                    </Link>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-slate-900 bg-red-50 px-2 py-1 rounded text-xs group-hover:bg-red-100 transition-colors">
                                {player.redCards}
                                <div className="w-2 h-3 bg-red-500 rounded-sm ml-1 border border-red-700 opacity-80"></div>
                            </div>
                        </div>
                    ))}
                    {runnersUp.length === 0 && !leader && (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            Sin tarjetas rojas registradas
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
