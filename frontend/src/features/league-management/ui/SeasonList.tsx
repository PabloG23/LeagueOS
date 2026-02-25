import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leagueApi, Season } from '@/shared/api/league-api';

interface SeasonListProps {
    tenantId: string;
}

export const SeasonList = ({ tenantId }: SeasonListProps) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [newSeasonData, setNewSeasonData] = useState({ name: '', startDate: '', endDate: '' });
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const currentLeague = leagueSlug || 'ligaMexiquense';

    useEffect(() => {
        loadSeasons();
    }, [tenantId]);

    const loadSeasons = () => {
        setLoading(true);
        leagueApi.getSeasons(tenantId)
            .then(res => setSeasons(res.data))
            .catch(err => console.error('Failed to fetch seasons', err))
            .finally(() => setLoading(false));
    };

    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await leagueApi.createSeason(tenantId, {
                name: newSeasonData.name,
                startDate: newSeasonData.startDate,
                endDate: newSeasonData.endDate,
                status: 'DRAFT',
                currentMatchday: 1
            });
            setIsCreating(false);
            setNewSeasonData({ name: '', startDate: '', endDate: '' });
            loadSeasons();
        } catch (error) {
            console.error("Error creating season", error);
            alert("No se pudo crear el torneo. Revisa los datos.");
        }
    };

    if (loading) return <div>Loading seasons...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-primary">Torneos</h2>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium">
                        Nuevo Torneo
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-card border p-6 rounded-lg shadow-sm mb-6">
                    <h3 className="font-bold text-lg mb-4">Crear Nuevo Torneo</h3>
                    <form onSubmit={handleCreateSeason} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre del Torneo</label>
                            <input
                                required type="text"
                                className="w-full border rounded p-2"
                                placeholder="Ej. Apertura 2027"
                                value={newSeasonData.name}
                                onChange={e => setNewSeasonData({ ...newSeasonData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                                <input
                                    required type="date"
                                    className="w-full border rounded p-2"
                                    value={newSeasonData.startDate}
                                    onChange={e => setNewSeasonData({ ...newSeasonData, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de Fin</label>
                                <input
                                    required type="date"
                                    className="w-full border rounded p-2"
                                    value={newSeasonData.endDate}
                                    onChange={e => setNewSeasonData({ ...newSeasonData, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {seasons.length === 0 ? (
                    <p className="text-muted-foreground italic">No seasons found for this league.</p>
                ) : (
                    seasons.map(season => (
                        <div
                            key={season.id}
                            onClick={() => navigate(`/${currentLeague}/admin/seasons/${season.id}`)}
                            className="p-4 bg-card border rounded-lg shadow-sm flex items-center justify-between cursor-pointer hover:border-primary transition-colors"
                        >
                            <div>
                                <h3 className="font-semibold text-lg">{season.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex gap-2 items-center">
                                {season.status === 'DRAFT' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">EN BORRADOR</span>}
                                {season.status === 'REGISTRATION_CLOSED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">REGISTROS CERRADOS</span>}
                                {season.status === 'ACTIVE' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">EN CURSO</span>}
                                {season.status === 'COMPLETED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">CONCLUIDO</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
