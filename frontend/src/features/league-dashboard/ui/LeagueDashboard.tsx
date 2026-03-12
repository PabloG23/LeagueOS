
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MatchdayCarousel } from './MatchdayCarousel';
import { StandingsTable, TeamStanding } from './StandingsTable';
import { StatsWidget } from './StatsWidget';
import { TopDefenseWidget } from './TopDefenseWidget';
import { TopScorersWidget } from './TopScorersWidget';
import { DisciplineDashboardWidget } from './DisciplineDashboardWidget';
import { Shield, Trophy } from 'lucide-react';
import { LeadershipSection } from './LeadershipSection';
import { GlobalFooter } from './GlobalFooter';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { DisciplineWidget } from './DisciplineWidget';
import { FullCalendarModal } from './FullCalendarModal';
import { PublicPlayoffsView } from './PublicPlayoffsView';
import { leagueApi, Season, Match } from '@/shared/api/league-api';

export const LeagueDashboard = () => {
    const { settings } = useTenantSettings();
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const isSanLucas = settings?.tenantId === '22222222-2222-2222-2222-222222222222';

    const [finalStandingsData, setStandingsData] = useState<TeamStanding[] | Record<string, TeamStanding[]>>([]);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'regular' | 'playoffs'>('regular');
    const [activeSeason, setActiveSeason] = useState<Season | null>(null);
    const [allActiveSeasons, setAllActiveSeasons] = useState<Season[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [loadingUpcoming, setLoadingUpcoming] = useState(true);

    const [generalRedCards, setGeneralRedCards] = useState<any[]>([]);
    const [matchdayRedCards, setMatchdayRedCards] = useState<any[]>([]);
    const [teamRedCards, setTeamRedCards] = useState<any[]>([]);

    useEffect(() => {
        if (!settings?.tenantId) return;
        leagueApi.getSeasons(settings.tenantId)
            .then(res => {
                const active = res.data.find(s => s.status === 'ACTIVE' || s.status === 'COMPLETED');
                const actives = res.data.filter(s => s.status === 'ACTIVE' || s.status === 'COMPLETED');
                if (active) setActiveSeason(active);
                setAllActiveSeasons(actives);
            })
            .catch(console.error);
            
        leagueApi.getUpcomingMatches(settings.tenantId)
            .then(res => setUpcomingMatches(res.data))
            .catch(err => console.error("Error fetching upcoming matches", err))
            .finally(() => setLoadingUpcoming(false));
    }, [settings?.tenantId]);

    useEffect(() => {
        const fetchStandings = async () => {
            if (!settings?.tenantId || allActiveSeasons.length === 0) return;
            try {
                if (settings.tenantId === '22222222-2222-2222-2222-222222222222' || true) {
                    // Dynamic grouping for all tenants
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
                } else {
                    // Legacy fallback
                    const { data: teams } = await leagueApi.getTeams(settings.tenantId as string);
                    const baseStandings: TeamStanding[] = teams.map((t, idx) => ({
                        id: t.id,
                        rank: idx + 1,
                        team: t.name,
                        played: 0, won: 0, drawn: 0, lost: 0,
                        goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
                        points: 0,
                        form: []
                    }));
                    setStandingsData(baseStandings);
                }
            } catch (error) {
                console.error("Error fetching standings", error);
            }
        };
        fetchStandings();
    }, [settings?.tenantId, allActiveSeasons]);

    useEffect(() => {
        if (!settings?.tenantId || !isSanLucas) return;

        const fetchDisciplineStats = async (tenantId: string) => {
            try {
                const [generalRes, matchdayRes, teamRes] = await Promise.all([
                    leagueApi.getGeneralRedCards(tenantId),
                    leagueApi.getMatchdayRedCards(tenantId),
                    leagueApi.getTeamRedCards(tenantId)
                ]);

                setGeneralRedCards(generalRes.data || []);
                setMatchdayRedCards(matchdayRes.data || []);
                setTeamRedCards(teamRes.data || []);
            } catch (error) {
                console.error("Error fetching discipline stats", error);
            }
        };

        fetchDisciplineStats(settings.tenantId);
    }, [settings?.tenantId, isSanLucas]);

    const flatStandings = Array.isArray(finalStandingsData)
        ? finalStandingsData
        : Object.values(finalStandingsData).flat();

    const topOffenseData = flatStandings.slice(0, 5).map(t => ({ team: t.team, goals: t.goalsFor }));
    const topDefenseData = flatStandings.slice(0, 5).map(t => ({ team: t.team, goalsAgainst: t.goalsAgainst }));

    // Mock Scorers for TopScorersWidget
    const mockScorers = [
        { id: '1', name: 'Juan Pérez', team: 'Wolves', teamId: '1', goals: 15, rank: 1 },
        { id: '2', name: 'Carlos López', team: 'San Felipe', teamId: '2', goals: 12, rank: 2 },
        { id: '3', name: 'Pedro Sánchez', team: 'Halcones', teamId: '5', goals: 10, rank: 3 },
        { id: '4', name: 'Miguel Torres', team: 'Lagartos', teamId: '4', goals: 9, rank: 4 },
        { id: '5', name: 'Luis Hernández', team: 'Papitos', teamId: '6', goals: 8, rank: 5 },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar />
            {/* Dynamic Carousels for all active seasons */}
            <div className="w-full bg-slate-50 relative z-10 w-full overflow-hidden">
                {loadingUpcoming ? (
                    <section className={`${settings?.matchTickerBackgroundClass || 'bg-slate-900'} py-6 border-b border-white/10`}><div className="text-center text-white">Cargando próximas jornadas...</div></section>
                ) : allActiveSeasons.length === 0 ? (
                    <section className={`${settings?.matchTickerBackgroundClass || 'bg-slate-900'} py-6 border-b border-white/10`}><div className="text-center text-white font-medium">No hay torneos activos.</div></section>
                ) : (
                    <MatchdayCarousel
                        activeSeasons={allActiveSeasons}
                        upcomingMatches={upcomingMatches}
                        onViewAll={() => setIsCalendarModalOpen(true)}
                    />
                )}
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content (9 cols) */}
                    <div className="lg:col-span-9 flex flex-col gap-6">
                        {/* Tab Switcher */}
                        {activeSeason && (
                            <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit">
                                <button
                                    onClick={() => setActiveTab('regular')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'regular' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Fase Regular
                                </button>
                                <button
                                    onClick={() => setActiveTab('playoffs')}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'playoffs' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Trophy className="w-4 h-4" />
                                    Liguilla
                                </button>
                            </div>
                        )}

                        {activeTab === 'regular' ? (
                            <StandingsTable data={finalStandingsData} />
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-xl font-black text-slate-800 mb-6">Fase Final del Torneo</h3>
                                {activeSeason ? (
                                    <PublicPlayoffsView tenantId={settings?.tenantId || ''} seasonId={activeSeason.id} />
                                ) : (
                                    <div className="text-center text-slate-500 py-12">Torneo no disponible</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Widgets (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        {/* Only Scorers widget in sidebar if San Lucas, or default for others */}
                        {!isSanLucas && (
                            <TopScorersWidget scorers={mockScorers} />
                        )}

                        {/* Feature Flag: Offense/Defense Widgets */}
                        {settings?.showOffenseDefenseWidgets && (
                            <>
                                <StatsWidget data={topOffenseData} />
                                <TopDefenseWidget data={topDefenseData} />
                            </>
                        )}

                        {/* Feature Flag: Discipline Widget */}
                        {settings?.showDisciplineWidget && (
                            <DisciplineWidget />
                        )}

                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 pt-8 border-t border-slate-200">
                    {/* Full width panel - Moved from sidebar */}
                    {isSanLucas && (
                        <div className="col-span-full">
                            <DisciplineDashboardWidget
                                generalPlayers={generalRedCards}
                                matchdayPlayers={matchdayRedCards}
                                teams={teamRedCards}
                            />
                        </div>
                    )}

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
