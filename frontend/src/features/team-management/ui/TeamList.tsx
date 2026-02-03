import { useEffect, useState } from 'react';
import { leagueApi, Team } from '@/shared/api/league-api';

interface TeamListProps {
    tenantId: string;
}

export const TeamList = ({ tenantId }: TeamListProps) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        leagueApi.getTeams(tenantId)
            .then(res => setTeams(res.data))
            .catch(err => console.error('Failed to fetch teams', err))
            .finally(() => setLoading(false));
    }, [tenantId]);

    if (loading) return <div>Loading teams...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Teams</h2>
                <button className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium">
                    New Team
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.length === 0 ? (
                    <p className="text-muted-foreground italic">No teams registered yet.</p>
                ) : (
                    teams.map(team => (
                        <div key={team.id} className="p-4 bg-card border rounded-lg shadow-sm flex items-center space-x-4">
                            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-xl font-bold text-primary">
                                {team.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold">{team.name}</h3>
                                <p className="text-xs text-muted-foreground">ID: {team.id.substring(0, 8)}...</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
