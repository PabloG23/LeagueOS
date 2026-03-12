import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leagueApi, Season } from '@/shared/api/league-api';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastContext';

interface SeasonListProps {
    tenantId: string;
}

export const SeasonList = ({ tenantId }: SeasonListProps) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [seasonToDelete, setSeasonToDelete] = useState<{ baseName: string, subSeasons: Season[] } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newSeasonData, setNewSeasonData] = useState<{ baseName: string, startDate: string, endDate: string, divisions: string[] }>({
        baseName: '', startDate: '', endDate: '', divisions: []
    });
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { showToast } = useToast();

    const DIVISIONS = ['1ra Fuerza', '2da Fuerza', '3ra Fuerza'];
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
            const divisionsToCreate = newSeasonData.divisions.length > 0 ? newSeasonData.divisions : ['Única'];

            const promises = divisionsToCreate.map(div =>
                leagueApi.createSeason(tenantId, {
                    name: divisionsToCreate.length === 1 && div === 'Única'
                        ? newSeasonData.baseName
                        : `${newSeasonData.baseName} - ${div}`,
                    startDate: newSeasonData.startDate,
                    endDate: newSeasonData.endDate,
                    status: 'DRAFT',
                    currentMatchday: 1
                })
            );

            await Promise.all(promises);
            setIsCreating(false);
            setNewSeasonData({ baseName: '', startDate: '', endDate: '', divisions: [] });
            loadSeasons();
            showToast("Torneo creado exitosamente.", "success");
        } catch (error) {
            console.error("Error creating season", error);
            showToast("No se pudo crear el torneo. Revisa los datos.", "error");
        }
    };

    const handleDeleteSeason = async () => {
        if (!tenantId || !seasonToDelete) return;
        setIsDeleting(true);
        try {
            const promises = seasonToDelete.subSeasons.map(s => leagueApi.deleteSeason(tenantId, s.id));
            await Promise.all(promises);
            setSeasonToDelete(null);
            loadSeasons();
            showToast("Torneo eliminado definitivamente.", "success");
        } catch (error) {
            console.error("Error deleting season", error);
            showToast("No se pudo eliminar el torneo por completo.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const megaSeasons = useMemo(() => {
        const groups: Record<string, Season[]> = {};
        seasons.forEach(season => {
            const parts = season.name.split(' - ');
            const baseName = parts[0];
            if (!groups[baseName]) groups[baseName] = [];
            groups[baseName].push(season);
        });

        return Object.entries(groups).map(([baseName, groupedSeasons]) => ({
            baseName,
            seasons: [...groupedSeasons].sort((a, b) => a.name.localeCompare(b.name)),
            representativeId: groupedSeasons[0].id,
            startDate: groupedSeasons[0].startDate,
            endDate: groupedSeasons[0].endDate,
            status: groupedSeasons.some(s => s.status === 'ACTIVE') ? 'ACTIVE' : groupedSeasons[0].status
        }));
    }, [seasons]);

    if (loading) return <div>Cargando torneos...</div>;

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
                                value={newSeasonData.baseName}
                                onChange={e => setNewSeasonData({ ...newSeasonData, baseName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Categorías / Divisiones (Opcional)</label>
                            <div className="flex flex-wrap gap-2">
                                {DIVISIONS.map(div => (
                                    <label key={div} className="flex items-center gap-2 bg-slate-50 border px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="rounded text-primary focus:ring-primary"
                                            checked={newSeasonData.divisions.includes(div)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setNewSeasonData({ ...newSeasonData, divisions: [...newSeasonData.divisions, div] });
                                                } else {
                                                    setNewSeasonData({ ...newSeasonData, divisions: newSeasonData.divisions.filter(d => d !== div) });
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-medium text-slate-700">{div}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Si no seleccionas ninguna, se creará un solo torneo de categoría "Única".
                            </p>
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
                {megaSeasons.length === 0 && !isCreating ? (
                    <p className="text-muted-foreground italic">No se encontraron torneos para esta liga.</p>
                ) : (
                    megaSeasons.map(mega => (
                        <div
                            key={mega.baseName}
                            onClick={() => navigate(`/${currentLeague}/admin/seasons/${mega.representativeId}`)}
                            className="p-5 bg-card border border-slate-200 rounded-xl shadow-sm cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900 group-hover:text-primary transition-colors">
                                        {mega.baseName}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {new Date(mega.startDate).toLocaleDateString()} - {new Date(mega.endDate).toLocaleDateString()}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {mega.seasons.map(season => {
                                            const parts = season.name.split(' - ');
                                            const categoryName = parts.length > 1 ? parts[1] : 'Única';

                                            // Hide the "Única" redundant badge
                                            if (categoryName === 'Única') return null;

                                            return (
                                                <span key={season.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {categoryName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        {mega.status === 'DRAFT' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">EN BORRADOR</span>}
                                        {mega.status === 'REGISTRATION_CLOSED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">REGISTROS CERRADOS</span>}
                                        {mega.status === 'ACTIVE' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 ring-4 ring-green-50">EN CURSO</span>}
                                        {mega.status === 'COMPLETED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">CONCLUIDO</span>}

                                        {mega.status === 'DRAFT' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSeasonToDelete({ baseName: mega.baseName, subSeasons: mega.seasons });
                                                }}
                                                className="text-red-500 hover:text-white hover:bg-red-500 p-1.5 rounded-md transition-all ml-1"
                                                title={`Eliminar torneo en borrador`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium mt-2">
                                        {mega.seasons.length} {mega.seasons.length === 1 ? 'Categoría' : 'Categorías'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Custom Confirmation Modal for Deleting Season */}
            {seasonToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-0 flex justify-between items-start">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <button
                                onClick={() => setSeasonToDelete(null)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                disabled={isDeleting}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                ¿Eliminar Torneo?
                            </h3>
                            <p className="text-slate-500 mb-6 leading-relaxed">
                                Estás a punto de eliminar definitivamente el torneo <strong className="text-slate-800">{seasonToDelete.baseName}</strong>. Esta acción no se puede deshacer.
                            </p>

                            <div className="flex gap-3 justify-end mt-8">
                                <button
                                    onClick={() => setSeasonToDelete(null)}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteSeason}
                                    disabled={isDeleting}
                                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Eliminando...</>
                                    ) : (
                                        'Sí, eliminar torneo'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
