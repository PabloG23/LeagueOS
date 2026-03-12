
import { useEffect, useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { leagueApi, Match, Season } from '@/shared/api/league-api';

interface MatchdayCarouselProps {
    activeSeasons: Season[];
    upcomingMatches: Match[];
    onViewAll?: () => void;
}

export const MatchdayCarousel = ({ activeSeasons, upcomingMatches, onViewAll }: MatchdayCarouselProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();
    const [activeTabId, setActiveTabId] = useState<string>('');

    useEffect(() => {
        if (activeSeasons.length > 0 && !activeTabId) {
            setActiveTabId(activeSeasons[0].id);
        }
    }, [activeSeasons, activeTabId]);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaMexiquense'}/team/${teamId || '1'}`;
    };

    if (!settings || activeSeasons.length === 0) {
        return null;
    }

    const currentSeason = activeSeasons.find(s => s.id === activeTabId) || activeSeasons[0];
    const seasonName = currentSeason?.name || '';
    const cleanSeasonName = seasonName.includes(' - ') ? seasonName.split(' - ')[1] : seasonName;

    const matches = upcomingMatches.filter(m => (m.seasonId === activeTabId) || (m.season?.id === activeTabId));

    if (!matches || matches.length === 0) {
        return (
            <section className={`${settings.matchTickerBackgroundClass} py-6 border-b border-white/10`}>
                 {/* Tabs Nav */}
                 {activeSeasons.length > 1 && (
                    <div className="container mx-auto px-4 mb-6 flex justify-center">
                        <div className="flex bg-black/20 p-1.5 rounded-full overflow-x-auto scrollbar-none max-w-full">
                            {activeSeasons.map((season) => {
                                const shortName = season.name.includes(' - ') ? season.name.split(' - ')[1] : season.name;
                                const isActive = activeTabId === season.id;
                                return (
                                    <button
                                        key={season.id}
                                        onClick={() => setActiveTabId(season.id)}
                                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                                            isActive 
                                                ? 'bg-white text-slate-900 shadow-md' 
                                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {shortName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="text-center text-white font-medium mt-4">No hay partidos programados próximamente para {cleanSeasonName}.</div>
            </section>
        );
    }

    const currentMatchday = matches[0]?.matchday || 1;

    // Dynamic Title Logic
    const allFinished = matches.every(m => m.status === 'FINISHED');
    const anyInProgress = matches.some(m => m.status === 'IN_PROGRESS');

    let tickerTitle = `Próxima Jornada ${currentMatchday} - ${cleanSeasonName}`;
    let tickerIconColor = "text-white";

    if (anyInProgress) {
        tickerTitle = `Jornada ${currentMatchday} - ${cleanSeasonName}`;
        tickerIconColor = "text-red-500 animate-pulse";
    } else if (allFinished) {
        tickerTitle = `Resultados Jornada ${currentMatchday} - ${cleanSeasonName}`;
        tickerIconColor = "text-emerald-400";
    }

    return (
        <section className={`w-full border-b border-white/10 transition-colors duration-500 py-8 ${settings.matchTickerBackgroundClass}`}>
            <div className="container mx-auto px-4">
                
                {/* Tabs Nav */}
                {activeSeasons.length > 1 && (
                    <div className="flex justify-center mb-8">
                        <div className="flex bg-black/20 p-1.5 rounded-full overflow-x-auto scrollbar-none max-w-full shadow-inner border border-white/5">
                            {activeSeasons.map((season) => {
                                const shortName = season.name.includes(' - ') ? season.name.split(' - ')[1] : season.name;
                                const isActive = activeTabId === season.id;
                                return (
                                    <button
                                        key={season.id}
                                        onClick={() => setActiveTabId(season.id)}
                                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
                                            isActive 
                                                ? 'bg-white text-slate-900 shadow-lg scale-105' 
                                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {shortName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex justify-center items-center gap-4 mb-6">
                    <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${settings.matchTickerTextClass}`}>
                        <Calendar className={`w-4 h-4 ${tickerIconColor}`} />
                        {tickerTitle}
                    </div>
                </div>

                {/* Match Grid Container */}
                <div className="flex flex-wrap justify-center gap-4 pb-4">
                    {matches.map((match) => (
                        <div
                            key={match.id}
                            className={`w-full sm:w-[260px] min-h-[110px] flex flex-col justify-center ${settings.matchCardBackgroundClass} rounded-lg p-4 gap-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group shadow-sm hover:shadow-md hover:-translate-y-0.5`}
                        >
                            <div className="flex flex-col pb-2 border-b border-white/10 mb-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {match.matchDate 
                                        ? new Date(match.matchDate).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                                        : 'Horario por definir'}
                                </span>
                                {match.location && (
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate" title={match.location}>
                                        📍 {match.location}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {/* Home Team */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                                            {match.homeTeam?.name?.substring(0, 2) || match.homeTeamId.substring(0, 2)}
                                        </div>
                                        <Link to={getTeamLink(match.homeTeam?.id || match.homeTeamId)} className={`text-sm font-medium hover:text-primary hover:underline ${match.status !== 'SCHEDULED' && (match.homeScore || 0) > (match.awayScore || 0) ? 'text-white' : 'text-slate-400'}`}>
                                            {match.homeTeam?.name || 'Local'}
                                        </Link>
                                    </div>
                                    <span className="font-bold text-lg text-white">{match.homeScore ?? '-'}</span>
                                </div>

                                {/* Away Team */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                                            {match.awayTeam?.name?.substring(0, 2) || match.awayTeamId.substring(0, 2)}
                                        </div>
                                        <Link to={getTeamLink(match.awayTeam?.id || match.awayTeamId)} className={`text-sm font-medium hover:text-primary hover:underline ${match.status !== 'SCHEDULED' && (match.awayScore || 0) > (match.homeScore || 0) ? 'text-white' : 'text-slate-400'}`}>
                                            {match.awayTeam?.name || 'Visitante'}
                                        </Link>
                                    </div>
                                    <span className="font-bold text-lg text-white">{match.awayScore ?? '-'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View Full Schedule Button - Centered below grid */}
                <div className="mt-4 flex justify-center">
                    <button onClick={onViewAll} className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">
                        Ver Calendario Completo
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </section>
    );
};
