
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MatchdayCarousel } from './MatchdayCarousel';
import { StandingsTable, TeamStanding } from './StandingsTable';
import { StatsWidget } from './StatsWidget';
import { TopDefenseWidget } from './TopDefenseWidget';
import { TopScorersWidget } from './TopScorersWidget';
import { TopRedCardsWidget } from './TopRedCardsWidget';
import { Shield, Trophy } from 'lucide-react';
import { LeadershipSection } from './LeadershipSection';
import { GlobalFooter } from './GlobalFooter';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { DisciplineWidget } from './DisciplineWidget';




import { leagueApi } from '@/shared/api/league-api';

export const LeagueDashboard = () => {
    const { settings } = useTenantSettings();
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const isSanLucas = settings?.tenantId === '22222222-2222-2222-2222-222222222222';

    const [finalStandingsData, setStandingsData] = useState<TeamStanding[] | Record<string, TeamStanding[]>>([]);

    useEffect(() => {
        const fetchStandings = async () => {
            if (!settings?.tenantId) return;
            try {
                const { data: teams } = await leagueApi.getTeams(settings.tenantId);
                const baseStandings: TeamStanding[] = teams.map((t, idx) => ({
                    id: t.id,
                    rank: idx + 1,
                    team: t.name,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
                    points: 0,
                    form: []
                }));
                // Real Standings calc needs backend endpoint, defaulting to 0s
                if (settings.tenantId === '22222222-2222-2222-2222-222222222222') {
                    // San Lucas Grouping
                    const grouped: Record<string, TeamStanding[]> = {
                        "Primera Fuerza": [],
                        "Segunda Fuerza": [],
                        "Tercera Fuerza": [],
                    };
                    baseStandings.forEach(t => {
                        if (t.team.includes('1ra')) grouped["Primera Fuerza"].push(t);
                        else if (t.team.includes('2da')) grouped["Segunda Fuerza"].push(t);
                        else if (t.team.includes('3ra')) grouped["Tercera Fuerza"].push(t);
                        else grouped["Primera Fuerza"].push(t); // fallback
                    });

                    // Re-rank 1 to N inside each division
                    Object.values(grouped).forEach(group => {
                        group.forEach((t, idx) => t.rank = idx + 1);
                    });

                    setStandingsData(grouped);
                } else {
                    setStandingsData(baseStandings);
                }
            } catch (error) {
                console.error("Error fetching teams for standings", error);
            }
        };
        fetchStandings();
    }, [settings?.tenantId]);

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

    // Mock Red Cards for TopRedCardsWidget (Top 10)
    const mockRedCards = [
        { id: '101', name: 'Oscar García', team: 'Manguitos', teamId: '3', redCards: 4, rank: 1 },
        { id: '102', name: 'Roberto Díaz', team: 'Lagartos', teamId: '4', redCards: 3, rank: 2 },
        { id: '103', name: 'Eduardo Ruiz', team: 'Wolves', teamId: '1', redCards: 3, rank: 3 },
        { id: '104', name: 'Mario Gómez', team: 'San Felipe', teamId: '2', redCards: 2, rank: 4 },
        { id: '105', name: 'Hugo Silva', team: 'Halcones', teamId: '5', redCards: 2, rank: 5 },
        { id: '106', name: 'Daniel Castro', team: 'Papitos', teamId: '6', redCards: 2, rank: 6 },
        { id: '107', name: 'Andrés Reyes', team: 'Perla', teamId: '7', redCards: 1, rank: 7 },
        { id: '108', name: 'Javier Morales', team: 'SNTE', teamId: '8', redCards: 1, rank: 8 },
        { id: '109', name: 'Fernando Cruz', team: 'Independencia', teamId: '9', redCards: 1, rank: 9 },
        { id: '110', name: 'Héctor Vega', team: 'D. Corona', teamId: '10', redCards: 1, rank: 10 },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar />

            <section>
                <MatchdayCarousel />
            </section>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content - Standings (9 cols) */}
                    <div className="lg:col-span-9">
                        <StandingsTable data={finalStandingsData} />
                    </div>

                    {/* Sidebar Widgets (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        {isSanLucas ? (
                            <TopRedCardsWidget players={mockRedCards} />
                        ) : (
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
                    <div className="col-span-full">
                        <LeadershipSection />
                    </div>
                </div>
            </div>

            <GlobalFooter />
        </div>
    );
};
