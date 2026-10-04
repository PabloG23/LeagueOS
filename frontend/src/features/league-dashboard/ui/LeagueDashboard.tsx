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

export const LeagueDashboard = () => {
    const { settings } = useTenantSettings();
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const isMetepec = settings?.themeClass === 'theme-metepec' || settings?.tenantId === 'e39a6b17-5646-452d-929c-ca9a8dc4e44d';

    const [finalStandingsData, setStandingsData] = useState<TeamStanding[] | Record<string, TeamStanding[]>>([]);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [activeSeason, setActiveSeason] = useState<Season | null>(null);
    const [allActiveSeasons, setAllActiveSeasons] = useState<Season[]>([]);
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
                const active = res.data.find(s => s.status === 'ACTIVE' || s.status === 'COMPLETED');
                const actives = res.data.filter(s => s.status === 'ACTIVE' || s.status === 'COMPLETED');
                if (active) {
                    setActiveSeason(active);
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

        // Fetch yellow cards leaderboard (Metepec only)
        if (settings?.themeClass === 'theme-metepec' || settings?.tenantId === 'e39a6b17-5646-452d-929c-ca9a8dc4e44d') {
            leagueApi.getTopYellowCards(settings.tenantId)
                .then(res => setYellowCardsData(res.data || []))
                .catch(err => console.error("Error fetching yellow cards", err))
                .finally(() => setLoadingYellowCards(false));
        }
    }, [settings?.tenantId, settings?.themeClass]);

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
                        const { data: standings } = await leagueApi.getSeasonStandings(season.id, settings.tenantId as string);
                        
                        // Use the short name of the season for the tab
                        const shortName = season.name.includes(' - ') ? season.name.split(' - ')[1] : season.name;
                        grouped[shortName] = standings;
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

                {/* Main Grid: Standings (9 cols) + Goleo Individual (3 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-9 flex flex-col gap-8">
                        <div className="space-y-4">
                            <StandingsTable data={finalStandingsData} />
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <TopScorersWidget scorers={topScorers} loading={loadingScorers} />
                        {isMetepec && defenseData.length > 0 && (
                            <TopDefenseWidget data={defenseData} />
                        )}
                        {isMetepec && (
                            <TopYellowCardsWidget data={yellowCardsData} loading={loadingYellowCards} />
                        )}
                    </div>
                </div>

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

