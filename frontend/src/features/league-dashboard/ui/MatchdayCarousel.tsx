import { useEffect, useState } from 'react';
import { Calendar, ChevronRight, MapPin, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { leagueApi, Match, Season } from '@/shared/api/league-api';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { MatchReportPhotoModal } from '@/shared/components/MatchReportPhotoModal';

interface MatchdayCarouselProps {
    activeSeasons: Season[];
    upcomingMatches: Match[];
    onViewAll?: () => void;
}

export const MatchdayCarousel = ({ activeSeasons, upcomingMatches, onViewAll }: MatchdayCarouselProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [selectedMatchForReport, setSelectedMatchForReport] = useState<Match | null>(null);

    useEffect(() => {
        if (activeSeasons.length > 0 && !activeTabId) {
            setActiveTabId(activeSeasons[0].id);
        }
    }, [activeSeasons, activeTabId]);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaNuestroDeporte'}/team/${teamId || '1'}`;
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
        tickerTitle = `Últimos resultados Jornada ${currentMatchday} - ${cleanSeasonName}`;
        tickerIconColor = "text-emerald-400";
    }

    const formatMatchDateTime = (dateStr?: string) => {
        if (!dateStr) return 'Horario por definir';
        try {
            const d = new Date(dateStr);
            const dayName = d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '').toUpperCase();
            const dayNum = d.getDate();
            const monthName = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '').toUpperCase();
            const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
            return `${dayName} ${dayNum} ${monthName}, ${time}`;
        } catch {
            return dateStr;
        }
    };

    // Calculate duration so linear velocity (px/sec) is EXACTLY 48 px/s
    const matchCardWidthWithGap = 306; // 290px width + 16px gap
    const matchHalfTrackWidth = matches.length * matchCardWidthWithGap;
    const matchAnimationDuration = Math.max(20, Math.round(matchHalfTrackWidth / 48));

    return (
        <section className={`w-full border-b border-white/10 transition-colors duration-500 py-8 ${settings.matchTickerBackgroundClass}`}>
            {/* Header & Tabs centered */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
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

                {/* Ticker Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${settings.matchTickerTextClass}`}>
                        <Calendar className={`w-4 h-4 ${tickerIconColor}`} />
                        {tickerTitle}
                    </div>
                </div>
            </div>

            {/* Match Grid Container - Marquee (100% full screen width edge-to-edge) */}
            <div className="w-full overflow-hidden flex items-center py-4 group">
                <div 
                    className="flex w-max animate-marquee group-hover:[animation-play-state:paused] gap-4 pl-4"
                    style={{ animationDuration: `${matchAnimationDuration}s` }}
                >
                    {[...matches, ...matches].map((match, idx) => (
                        <div
                            key={`${match.id}-${idx}`}
                            className={`w-[290px] min-w-[290px] min-h-[115px] flex flex-col justify-center ${settings.matchCardBackgroundClass || 'bg-card'} backdrop-blur-md rounded-2xl p-4 gap-3 border border-red-700/40 hover:border-red-500/80 transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-red-900/20 hover:-translate-y-0.5`}
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-1 gap-2">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                                        {formatMatchDateTime(match.matchDate)}
                                    </span>
                                    {match.location && (
                                        match.field?.locationUrl ? (
                                            <a
                                                href={match.field.locationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 transition-colors tracking-wider truncate flex items-center gap-1 hover:underline cursor-pointer w-max max-w-full mt-0.5"
                                                title={`Ver ubicación de ${match.location} en Google Maps`}
                                            >
                                                <MapPin className="w-2.5 h-2.5 shrink-0 text-blue-400" />
                                                <span className="truncate">{match.location}</span>
                                            </a>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate flex items-center gap-1 mt-0.5" title={match.location}>
                                                <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-500" />
                                                <span className="truncate">{match.location}</span>
                                            </span>
                                        )
                                    )}
                                </div>

                                {/* Photo Report Badge / Button */}
                                {(match.hasReportPhoto || match.reportPhotoUrl) && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedMatchForReport(match);
                                        }}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all shrink-0 hover:scale-105 active:scale-95 shadow-xs"
                                        title="Ver foto de la cédula arbitral oficial"
                                    >
                                        <FileText className="w-3 h-3" />
                                        <span>Cédula</span>
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {/* Home Team */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            <TeamLogo 
                                                teamName={match.homeTeam?.name || match.homeTeamId} 
                                                logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl} 
                                                fallbackClass="text-[10px] font-bold text-white"
                                            />
                                        </div>
                                        <Link to={getTeamLink(match.homeTeam?.id || match.homeTeamId)} className={`text-sm font-medium hover:text-primary hover:underline ${match.status !== 'SCHEDULED' && (match.homeScore || 0) > (match.awayScore || 0) ? 'text-white' : 'text-slate-400'}`}>
                                            {match.homeTeam?.name || 'Local'}
                                        </Link>
                                    </div>
                                    <span className="font-black text-2xl text-white">{match.homeScore ?? '-'}</span>
                                </div>

                                {/* Away Team */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            <TeamLogo 
                                                teamName={match.awayTeam?.name || match.awayTeamId} 
                                                logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl} 
                                                fallbackClass="text-[10px] font-bold text-white"
                                            />
                                        </div>
                                        <Link to={getTeamLink(match.awayTeam?.id || match.awayTeamId)} className={`text-sm font-medium hover:text-primary hover:underline ${match.status !== 'SCHEDULED' && (match.awayScore || 0) > (match.homeScore || 0) ? 'text-white' : 'text-slate-400'}`}>
                                            {match.awayTeam?.name || 'Visitante'}
                                        </Link>
                                    </div>
                                    <span className="font-black text-2xl text-white">{match.awayScore ?? '-'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* View Full Schedule Button - Centered below grid */}
            <div className="mt-4 flex justify-center max-w-[1400px] mx-auto px-4">
                <button onClick={onViewAll} className="flex items-center gap-2 px-6 py-2 rounded-full border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">
                    Ver Calendario Completo
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Singleton Match Report Photo Modal */}
            <MatchReportPhotoModal
                isOpen={!!selectedMatchForReport}
                onClose={() => setSelectedMatchForReport(null)}
                tenantId={settings.tenantId}
                match={selectedMatchForReport}
            />
        </section>
    );
};
