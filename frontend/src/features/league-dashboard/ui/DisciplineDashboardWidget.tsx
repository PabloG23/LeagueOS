import { useState } from 'react';
import { User, AlertTriangle, Shield, Flag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

interface DisciplinePlayer {
    id: string;
    name: string;
    team: string;
    teamId?: string;
    redCards: number;
    rank: number;
    notes?: string;
}

interface DisciplineTeam {
    id: string;
    name: string;
    redCards: number;
    rank: number;
}

interface DisciplineDashboardWidgetProps {
    generalPlayers: DisciplinePlayer[];
    matchdayPlayers: DisciplinePlayer[];
    teams: DisciplineTeam[];
}

type TabType = 'general' | 'matchday' | 'teams';

export const DisciplineDashboardWidget = ({ generalPlayers, matchdayPlayers, teams }: DisciplineDashboardWidgetProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const [activeTab, setActiveTab] = useState<TabType>('general');

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaMexiquense'}/team/${teamId || '1'}`;
    };

    const renderPlayerList = (players: DisciplinePlayer[], title: string, subtitle: string) => {
        const leader = players[0];
        const runnersUp = players.slice(1, 5);

        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                {/* Hero Leader Section */}
                {leader && (
                    <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-red-700 text-white p-6 text-center shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertTriangle className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border-4 border-white/20 flex items-center justify-center mb-3 shadow-xl">
                                <User className="w-8 h-8 text-white" />
                            </div>

                            <div className="inline-flex items-center gap-1 bg-red-900/40 backdrop-blur px-3 py-1 rounded-full border border-red-400/30 text-red-100 text-xs font-bold uppercase tracking-wider mb-2">
                                {title}
                            </div>

                            <h4 className="text-xl font-bold tracking-tight mb-0">{leader.name}</h4>
                            <Link to={getTeamLink(leader.teamId)} className="text-white/80 text-xs font-medium mb-3 hover:text-white hover:underline transition-colors block">
                                {leader.team}
                            </Link>

                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm flex items-baseline justify-center">
                                {leader.redCards}
                                <div className="w-3 h-5 bg-red-500 rounded-sm ml-2 border border-red-700 shadow-sm transform -rotate-6"></div>
                            </div>
                            <div className="text-[10px] text-white/60 font-medium uppercase tracking-widest mt-1 mb-2">{subtitle}</div>
                            {activeTab === 'matchday' && leader.notes && (
                                <div className="mt-2 text-xs text-white/90 italic bg-black/20 px-3 py-1.5 rounded-lg max-w-[80%] line-clamp-2">
                                    "{leader.notes}"
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Runners Up List */}
                <div className="p-3 space-y-1 bg-white">
                    {runnersUp.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-slate-400 w-4 group-hover:text-red-500 transition-colors">
                                    {player.rank}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight group-hover:text-slate-900">
                                        {player.name}
                                    </p>
                                    <Link to={getTeamLink(player.teamId)} className="text-[11px] text-slate-500 group-hover:text-red-500 hover:underline block leading-none mt-0.5">
                                        {player.team}
                                    </Link>
                                    {activeTab === 'matchday' && player.notes && (
                                        <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1 border-l-2 border-red-200 pl-1">
                                            "{player.notes}"
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-slate-900 bg-red-50 px-2 py-1 rounded text-xs group-hover:bg-red-100 transition-colors">
                                {player.redCards}
                                <div className="w-2 h-3 bg-red-500 rounded-sm ml-1 border border-red-700 opacity-80"></div>
                            </div>
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            Sin tarjetas rojas registradas
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTeamList = (teamsList: DisciplineTeam[]) => {
        const leader = teamsList[0];
        const runnersUp = teamsList.slice(1, 5);

        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                {/* Hero Leader Section (Team) */}
                {leader && (
                    <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-red-700 text-white p-6 text-center shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Shield className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border-4 border-white/20 flex items-center justify-center mb-3 shadow-xl">
                                <Shield className="w-8 h-8 text-white" />
                            </div>

                            <div className="inline-flex items-center gap-1 bg-red-900/40 backdrop-blur px-3 py-1 rounded-full border border-red-400/30 text-red-100 text-xs font-bold uppercase tracking-wider mb-2">
                                #1 Equipo Indisciplinado
                            </div>

                            <Link to={getTeamLink(leader.id)} className="text-2xl font-bold tracking-tight mb-2 hover:text-white/90 transition-colors">
                                {leader.name}
                            </Link>

                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm flex items-baseline justify-center">
                                {leader.redCards}
                                <div className="w-3 h-5 bg-red-500 rounded-sm ml-2 border border-red-700 shadow-sm transform -rotate-6"></div>
                            </div>
                            <div className="text-[10px] text-white/60 font-medium uppercase tracking-widest mt-1">Acumuladas en Torneo</div>
                        </div>
                    </div>
                )}

                {/* Runners Up List (Teams) */}
                <div className="p-3 space-y-1 bg-white">
                    {runnersUp.map((team) => (
                        <div key={team.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold text-slate-400 w-4 group-hover:text-red-500 transition-colors">
                                    {team.rank}
                                </span>
                                <div>
                                    <Link to={getTeamLink(team.id)} className="text-sm font-semibold text-slate-700 leading-tight group-hover:text-slate-900 hover:underline">
                                        {team.name}
                                    </Link>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 font-bold text-slate-900 bg-red-50 px-2 py-1 rounded text-xs group-hover:bg-red-100 transition-colors">
                                {team.redCards}
                                <div className="w-2 h-3 bg-red-500 rounded-sm ml-1 border border-red-700 opacity-80"></div>
                            </div>
                        </div>
                    ))}
                    {teamsList.length === 0 && (
                        <div className="py-8 text-center text-slate-500 text-sm">
                            Sin tarjetas rojas registradas
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMatchdayGrid = (players: DisciplinePlayer[]) => {
        return (
            <div className="p-5 bg-slate-50/80 h-full">
                <div className="mb-4 flex flex-col items-center text-center">
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Expulsados Recientes ({players.length})</h4>
                    <p className="text-xs font-semibold text-slate-500">Registrados en la última jornada</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {players.map((player) => (
                        <div key={player.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-3.5 flex flex-col h-full border border-red-100/60 overflow-hidden relative group">
                            {/* Accent line top */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-red-600 opacity-80" />

                            <div className="flex justify-between items-start mb-3 pt-1">
                                <div className="flex gap-2.5 items-center min-w-0 pr-2">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 shrink-0 border border-slate-200">
                                        {player.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h5 className="font-bold text-[13px] text-slate-800 leading-tight truncate" title={player.name}>{player.name}</h5>
                                        <Link to={getTeamLink(player.teamId)} className="text-[10px] text-slate-500 hover:text-red-600 transition-colors uppercase font-semibold tracking-wider truncate block mt-0.5" title={player.team}>
                                            {player.team}
                                        </Link>
                                    </div>
                                </div>
                                <div title="Tarjeta Roja" className="w-3.5 h-4 bg-red-500 rounded flex-shrink-0 border border-red-600/50 shadow-sm mt-0.5 relative overflow-hidden" >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                </div>
                            </div>

                            {player.notes && (
                                <div className="mt-auto pt-2.5 border-t border-slate-100/80">
                                    <div className="bg-red-50/50 rounded-lg p-2 border border-red-100/50">
                                        <p className="text-[10px] text-slate-600 font-medium italic leading-snug break-words">
                                            <span className="text-red-400 font-serif text-lg leading-none mr-0.5 inline-block transform translate-y-1">"</span>
                                            {player.notes}
                                            <span className="text-red-400 font-serif text-lg leading-none ml-0.5 inline-block transform translate-y-1">"</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-slate-100 shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                <Shield className="w-6 h-6 text-slate-300" />
                            </div>
                            <span className="text-slate-500 font-medium text-sm">Nadie fue expulsado en la última jornada</span>
                            <span className="text-slate-400 text-xs mt-1">¡Buen comportamiento de todos los equipos!</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="flex flex-col p-5 pb-4 border-b bg-red-50/30 shrink-0">
                <div className="flex items-start gap-3 mb-4">
                    <div className="mt-1">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="tracking-tight text-lg font-bold text-slate-800 leading-tight">
                            Panel de Disciplina
                        </h3>
                        <span className="text-sm font-medium text-slate-500">
                            (Tarjetas Rojas)
                        </span>
                    </div>
                </div>

                <div className="flex bg-slate-100/80 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'general' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Top Jugadores (Torneo Completo)"
                    >
                        <User className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Todo el Torneo</span>
                        <span className="sm:hidden">Gen</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('matchday')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'matchday' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Top Jugadores (Última Jornada)"
                    >
                        <Flag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Última Jornada</span>
                        <span className="sm:hidden">Jor</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'teams' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Top Equipos (Torneo Completo)"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Por Equipos</span>
                        <span className="sm:hidden">Eq</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col bg-slate-50/30">
                {activeTab === 'general' && renderPlayerList(generalPlayers, '#1 Más Expulsiones', 'Acumuladas en Torneo')}
                {activeTab === 'matchday' && renderMatchdayGrid(matchdayPlayers)}
                {activeTab === 'teams' && renderTeamList(teams)}
            </div>
        </div>
    );
};
