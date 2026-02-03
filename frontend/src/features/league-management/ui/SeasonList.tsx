import { useEffect, useState } from 'react';
import { leagueApi, Season } from '@/shared/api/league-api';

interface SeasonListProps {
    tenantId: string;
}

export const SeasonList = ({ tenantId }: SeasonListProps) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        leagueApi.getSeasons(tenantId)
            .then(res => setSeasons(res.data))
            .catch(err => console.error('Failed to fetch seasons', err))
            .finally(() => setLoading(false));
    }, [tenantId]);

    if (loading) return <div>Loading seasons...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Seasons</h2>
                <button className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium">
                    New Season
                </button>
            </div>

            <div className="grid gap-4">
                {seasons.length === 0 ? (
                    <p className="text-muted-foreground italic">No seasons found for this league.</p>
                ) : (
                    seasons.map(season => (
                        <div key={season.id} className="p-4 bg-card border rounded-lg shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-lg">{season.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${season.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {season.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
