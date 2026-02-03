import { useEffect, useState } from 'react';
import { leagueApi, Match } from '@/shared/api/league-api';

interface MatchListProps {
    tenantId: string;
    seasonId?: string;
}

export const MatchList = ({ tenantId, seasonId }: MatchListProps) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (seasonId) {
            leagueApi.getSeasonMatches(tenantId, seasonId)
                .then(res => setMatches(res.data))
                .catch(err => console.error('Failed to fetch matches', err))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [tenantId, seasonId]);

    if (!seasonId) return null;
    if (loading) return <div>Loading matches...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Matches</h2>
                <button className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium">
                    Schedule Match
                </button>
            </div>

            <div className="space-y-3">
                {matches.length === 0 ? (
                    <p className="text-muted-foreground italic">No matches scheduled for this season.</p>
                ) : (
                    matches.map(match => (
                        <div key={match.id} className="p-4 bg-card border rounded-lg shadow-sm grid grid-cols-3 items-center text-center">
                            <div className="font-semibold text-right">Team A</div>
                            <div className="bg-secondary mx-4 py-1 rounded text-sm font-bold">
                                {match.status === 'FINISHED' ? `${match.homeScore} - ${match.awayScore}` : 'VS'}
                            </div>
                            <div className="font-semibold text-left">Team B</div>
                            <div className="col-span-3 text-xs text-muted-foreground mt-2">
                                {new Date(match.matchDate).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
