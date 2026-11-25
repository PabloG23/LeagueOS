import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MatchdayCarousel } from './MatchdayCarousel';
import { StandingsTable, TeamStanding } from './StandingsTable';
import { TopScorersWidget } from './TopScorersWidget';
import { TopDefenseWidget } from './TopDefenseWidget';
import { TopYellowCardsWidget } from './TopYellowCardsWidget';
import { LeadershipSection } from './LeadershipSection';
import { GlobalFooter } from './GlobalFooter';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { FullCalendarModal } from './FullCalendarModal';
import { SponsorsCarousel } from './SponsorsCarousel';
import { leagueApi, Season, Match, PlayerScorerDTO, PlayerYellowCardsDTO } from '@/shared/api/league-api';
import { PublicPlayoffsView } from './PublicPlayoffsView';

export const LeagueDashboard = () => {
    const { settings } = useTenantSettings();
    const { leagueSlug } = useParams<{ leagueSlug: string }>();

    const [finalStandingsData, setStandingsData] = useState<TeamStanding[] | Record<string, TeamStanding[]>>([]);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [activeSeason, setActiveSeason] = useState<Season | null>(null);
    const [allActiveSeasons, setAllActiveSeasons] = useState<Season[]>([]);
    const [playoffSeasons, setPlayoffSeasons] = useState<Season[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [loadingUpcoming, setLoadingUpcoming] = useState(true);

    const [topScorers, setTopScorers] = useState<PlayerScorerDTO[]>([]);
    const [loadingScorers, setLoadingScorers] = useState(true);
    const [yellowCardsData, setYellowCardsData] = useState<PlayerYellowCardsDTO[]>([]);
    const [loadingYellowCards, setLoadingYellowCards] = useState(true);

    useEffect(() => {
        if (!settings?.tenantId) return;
        leagueApi.getSeasons(settings.tenantId)
            .then(res => {
                const actives = res.data
                    .filter(s => s.status === 'ACTIVE' || s.status === 'COMPLETED')
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                if (actives.length > 0) {
                    setActiveSeason(actives[0]);
                }
                setAllActiveSeasons(actives);
            })
            .catch(console.error);
            
        leagueApi.getUpcomingMatches(settings.tenantId)
            .then(res => setUpcomingMatches(res.data))
            .catch(err => console.error("Error fetching upcoming matches", err))
            .finally(() => setLoadingUpcoming(false));

        // Fetch top scorers from database
        leagueApi.getTopScorers(settings.tenantId)
            .then(res => {
                setTopScorers(res.data || []);
            })
            .catch(err => {
                console.error("Error fetching top scorers", err);
            })
            .finally(() => setLoadingScorers(false));

        // Fetch yellow cards leaderboard when enabled by tenant
        if (settings?.tenantId && settings?.enableAccumulatedYellowSuspensions) {
            leagueApi.getTopYellowCards(settings.tenantId)
                .then(res => setYellowCardsData(res.data || []))
                .catch(err => console.error("Error fetching yellow cards", err))
                .finally(() => setLoadingYellowCards(false));
        }
    }, [settings?.tenantId, settings?.enableAccumulatedYellowSuspensions]);

    useEffect(() => {
        if (!settings?.tenantId || !settings.showPublicPlayoffs) {
            setPlayoffSeasons([]);
            return;
        }
        Promise.all(allActiveSeasons
            .filter(season => season.tournamentType !== 'COPA')
            .map(async season => {
                const { data } = await leagueApi.getPlayoffBracket(settings.tenantId as string, season.id);
                return data.length > 0 ? season : null;
            }))
            .then(results => setPlayoffSeasons(results.filter((season): season is Season => season !== null)))
            .catch(error => {
                console.error('Error fetching public playoffs', error);
                setPlayoffSeasons([]);
            });
    }, [settings?.tenantId, settings?.showPublicPlayoffs, allActiveSeasons]);

    const defenseData = useMemo(() => {
        const standingsList = Array.isArray(finalStandingsData)
            ? finalStandingsData
            : Object.values(finalStandingsData).flat();
        return standingsList.map(s => ({
            team: s.team,
            goalsAgainst: s.goalsAgainst
        }));
    }, [finalStandingsData]);

    useEffect(() => {
        const fetchStandings = async () => {
            if (!settings?.tenantId || allActiveSeasons.length === 0) return;
            try {
                // Dynamic grouping for all active seasons
                const grouped: Record<string, TeamStanding[]> = {};
                
                for (const season of allActiveSeasons) {
                    try {
                        const shortName = season.name.includes(' - ') ? season.name.split(' - ')[1] : season.name;
                        if (season.tournamentType === 'COPA') {
                            grouped[shortName] = [];
                        } else {
                            const { data: standings } = await leagueApi.getSeasonStandings(season.id, settings.tenantId as string);
                            grouped[shortName] = standings;
                        }
                    } catch (err) {
                        console.error(`Error fetching standings for season ${season.name}`, err);
                    }
                }
                
                setStandingsData(grouped);
            } catch (error) {
                console.error("Error fetching standings", error);
            }
        };
        fetchStandings();
    }, [settings?.tenantId, allActiveSeasons]);

    const playoffsSection = settings?.showPublicPlayoffs && settings.tenantId && playoffSeasons.length > 0 && (
        <>
            {playoffSeasons.map(season => (
                <section key={season.id} className="space-y-5">
                    <div className="text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-500">Fase final</p>
                        <h2 className="text-2xl font-black text-white">Liguilla · {season.name}</h2>
                    </div>
                    <PublicPlayoffsView tenantId={settings.tenantId as string} seasonId={season.id} />
                </section>
            ))}
        </>
    );

    const standingsSection = (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-9 flex flex-col gap-8">
                <div className="space-y-4">
                    <StandingsTable data={finalStandingsData} seasons={allActiveSeasons} />
                </div>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-6 self-start">
                <TopScorersWidget scorers={topScorers} loading={loadingScorers} />
                {settings?.showOffenseDefenseWidgets && defenseData.length > 0 && (
                    <TopDefenseWidget data={defenseData} />
                )}
                {settings?.enableAccumulatedYellowSuspensions && (
                    <TopYellowCardsWidget data={yellowCardsData} loading={loadingYellowCards} />
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background font-sans text-foreground transition-colors duration-300">
            <Navbar />
            
            {/* Premier League Style Sponsors Carousel (Top of Page) */}
            <div className="w-full relative z-20 overflow-hidden">
                <SponsorsCarousel />
            </div>

            {/* Dynamic Matchday Carousels */}
            <div className="w-full relative z-10 overflow-hidden">
                {loadingUpcoming ? (
                    <section className={`${settings?.matchTickerBackgroundClass || 'bg-sidebar'} py-6 border-b border-white/10`}>
                        <div className="text-center text-white">Cargando próximas jornadas...</div>
                    </section>
                ) : allActiveSeasons.length === 0 ? (
                    <section className={`${settings?.matchTickerBackgroundClass || 'bg-slate-900'} py-6 border-b border-white/10`}>
                        <div className="text-center text-white font-medium">No hay torneos activos.</div>
                    </section>
                ) : (
                    <MatchdayCarousel
                        activeSeasons={allActiveSeasons}
                        upcomingMatches={upcomingMatches}
                        onViewAll={() => setIsCalendarModalOpen(true)}
                    />
                )}
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {playoffSeasons.length > 0 ? (
                    <>
                        {playoffsSection}
                        {standingsSection}
                    </>
                ) : (
                    <>
                        {standingsSection}
                        {playoffsSection}
                    </>
                )}

                {/* Leadership Section */}
                <div className="grid grid-cols-1 gap-8 pt-4 border-t border-white/20">
                    <div className="col-span-full">
                        <LeadershipSection />
                    </div>
                </div>
            </div>

            <GlobalFooter />
            <FullCalendarModal isOpen={isCalendarModalOpen} onClose={() => setIsCalendarModalOpen(false)} />
        </div>
    );
};

