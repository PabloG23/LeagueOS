
import { useEffect, useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { leagueApi, Match } from '@/shared/api/league-api';

export const MatchdayCarousel = () => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!settings?.tenantId) return;
        leagueApi.getUpcomingMatches(settings.tenantId)
            .then(res => setMatches(res.data))
            .catch(err => console.error("Error fetching upcoming matches", err))
            .finally(() => setLoading(false));
    }, [settings?.tenantId]);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaMexiquense'}/team/${teamId || '1'}`;
    };

    if (loading) {
        return <section className={`${settings.matchTickerBackgroundClass} py-6 border-b border-white/10`}><div className="text-center text-white">Cargando próxima jornada...</div></section>;
    }

    if (matches.length === 0) {
        return (
            <section className={`${settings.matchTickerBackgroundClass} py-6 border-b border-white/10`}>
                <div className="text-center text-white font-medium">No hay partidos programados próximamente.</div>
            </section>
        );
    }

    const currentMatchday = matches[0]?.matchday || 1;

    return (
        <section className={`${settings.matchTickerBackgroundClass} text-sidebar-foreground py-6 border-b border-white/10 transition-colors duration-500`}>
            <div className="w-full">
                <div className="container mx-auto px-4 flex justify-center items-center gap-4 mb-4">
                    <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${settings.matchTickerTextClass}`}>
                        <Calendar className="w-4 h-4" />
                        Jornada {currentMatchday}
                    </div>
                </div>

                {/* Horizontal Scroll Container */}
                <div className="flex justify-center overflow-x-auto gap-4 pb-4 px-4 snap-x scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {matches.map((match) => (
                        <div
                            key={match.id}
                            className={`snap-start shrink-0 w-[240px] ${settings.matchCardBackgroundClass} rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group`}
                        >

                            <div className="space-y-2">
                                {/* Home Team */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                            {match.homeTeam?.name?.substring(0, 2) || match.homeTeamId.substring(0, 2)}
                                        </div>
                                        <Link to={getTeamLink(match.homeTeam?.id || match.homeTeamId)} className={`text-sm font-medium hover:text-primary hover:underline ${match.status !== 'SCHEDULED' && (match.homeScore || 0) > (match.awayScore || 0) ? 'text-white' : 'text-slate-400'}`}>
                                            {match.homeTeam?.name || 'Local'}
                                        </Link>
                                    </div>
                                    <span className="font-bold text-lg">{match.homeScore ?? '-'}</span>
                                </div>

                                {/* Away Team */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                            {match.awayTeam?.name?.substring(0, 2) || match.awayTeamId.substring(0, 2)}
                                        </div>
                                        <Link to={getTeamLink(match.awayTeam?.id || match.awayTeamId)} className={`text-sm font-medium hover:text-primary hover:underline ${match.status !== 'SCHEDULED' && (match.awayScore || 0) > (match.homeScore || 0) ? 'text-white' : 'text-slate-400'}`}>
                                            {match.awayTeam?.name || 'Visitante'}
                                        </Link>
                                    </div>
                                    <span className="font-bold text-lg">{match.awayScore ?? '-'}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* View Full Schedule Button */}
                    <div className="snap-start shrink-0 w-[100px] flex items-center justify-center">
                        <button className="flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-colors">
                            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium">Ver todo</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
