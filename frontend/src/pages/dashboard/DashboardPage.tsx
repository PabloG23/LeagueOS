import { useState } from 'react';
import { SeasonList } from '@/features/league-management/ui/SeasonList';
import { TeamList } from '@/features/team-management/ui/TeamList';
import { MatchList } from '@/features/match-scheduler/ui/MatchList';

export const DashboardPage = () => {
    const [activeTab, setActiveTab] = useState<'seasons' | 'teams' | 'matches'>('seasons');

    const [activeTenant] = useState({
        id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
        name: 'Premier Soccer League',
        sport: 'SOCCER'
    });

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mini Sidebar */}
            <aside className="w-64 bg-primary text-primary-foreground p-6 hidden md:block">
                <h1 className="text-2xl font-bold mb-8">League<span className="text-accent">OS</span></h1>
                <nav className="space-y-4">
                    <button
                        onClick={() => setActiveTab('seasons')}
                        className={`w-full text-left font-medium transition-opacity ${activeTab === 'seasons' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    >
                        Seasons & Standings
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`w-full text-left font-medium transition-opacity ${activeTab === 'teams' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    >
                        Teams
                    </button>
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`w-full text-left font-medium transition-opacity ${activeTab === 'matches' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    >
                        Match Scheduler
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <header className="mb-8 border-b pb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">{activeTenant.name}</h1>
                        <p className="text-muted-foreground">{activeTenant.sport} MANAGEMENT</p>
                    </div>
                </header>

                <section className="max-w-4xl">
                    {activeTab === 'seasons' && <SeasonList tenantId={activeTenant.id} />}
                    {activeTab === 'teams' && <TeamList tenantId={activeTenant.id} />}
                    {activeTab === 'matches' && <MatchList tenantId={activeTenant.id} seasonId="optional-season-id" />}
                </section>
            </main>
        </div>
    );
};
