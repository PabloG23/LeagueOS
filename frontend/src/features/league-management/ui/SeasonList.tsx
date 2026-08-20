import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leagueApi, Season } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import { Trash2, AlertTriangle, X, Trophy, Plus, Sparkles, Layers, Check, Calendar, ArrowRight } from 'lucide-react';

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
    const currentLeague = leagueSlug || 'ligaNuestroDeporte';

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

    const getDefaultDates = () => {
        const now = new Date();
        const start = now.toISOString().split('T')[0];
        const future = new Date(now.setMonth(now.getMonth() + 6));
        const end = future.toISOString().split('T')[0];
        return { start, end };
    };

    const handleOpenCreate = () => {
        const { start, end } = getDefaultDates();
        setNewSeasonData({
            baseName: '',
            startDate: start,
            endDate: end,
            divisions: []
        });
        setIsCreating(true);
    };

    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSeasonData.baseName.trim()) {
            showToast("Por favor, ingresa el nombre del torneo.", "error");
            return;
        }
        if (!newSeasonData.startDate) {
            showToast("Por favor, selecciona una fecha de inicio.", "error");
            return;
        }
        if (!newSeasonData.endDate) {
            showToast("Por favor, selecciona una fecha de término.", "error");
            return;
        }

        try {
            const divisionsToCreate = newSeasonData.divisions.length > 0 ? newSeasonData.divisions : ['Única'];

            const promises = divisionsToCreate.map(div =>
                leagueApi.createSeason(tenantId, {
                    name: divisionsToCreate.length === 1 && div === 'Única'
                        ? newSeasonData.baseName.trim()
                        : `${newSeasonData.baseName.trim()} - ${div}`,
                    startDate: newSeasonData.startDate,
                    endDate: newSeasonData.endDate,
                    status: 'DRAFT',
                    currentMatchday: 1
                })
            );

            await Promise.all(promises);
            setIsCreating(false);
            const { start, end } = getDefaultDates();
            setNewSeasonData({ baseName: '', startDate: start, endDate: end, divisions: [] });
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-sm">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900">Torneos y Temporadas</h2>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestiona las temporadas, categorías y calendarios de competencia de la liga.
                    </p>
                </div>
                {!isCreating && megaSeasons.length > 0 && (
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Torneo</span>
                    </button>
                )}
            </div>

            {/* Create Season Form Card */}
            {isCreating && (
                <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                    {/* Decorative subtle background glow */}
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between pb-4 mb-6 border-b border-slate-800">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                                    <Sparkles className="w-3.5 h-3.5" /> Alta de Competición
                                </span>
                                <h3 className="text-xl font-bold text-white tracking-tight">Crear Nuevo Torneo</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Configura los parámetros iniciales de la temporada y sus divisiones.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                title="Cerrar formulario"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSeason} noValidate className="space-y-6">
                            {/* Torneo Name */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                    Nombre del Torneo <span className="text-blue-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all shadow-inner"
                                    placeholder="Ej. Torneo Apertura 2026 / Liga Dominical"
                                    value={newSeasonData.baseName}
                                    onChange={e => setNewSeasonData({ ...newSeasonData, baseName: e.target.value })}
                                />
                            </div>

                            {/* Categorías / Divisiones */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                        Categorías / Divisiones <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                                    </label>
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                                        {newSeasonData.divisions.length === 0 ? 'Creará categoría "Única"' : `${newSeasonData.divisions.length} seleccionada(s)`}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {DIVISIONS.map(div => {
                                        const isSelected = newSeasonData.divisions.includes(div);
                                        return (
                                            <button
                                                key={div}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setNewSeasonData({ ...newSeasonData, divisions: newSeasonData.divisions.filter(d => d !== div) });
                                                    } else {
                                                        setNewSeasonData({ ...newSeasonData, divisions: [...newSeasonData.divisions, div] });
                                                    }
                                                }}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${isSelected
                                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm shadow-blue-500/20 ring-1 ring-blue-500/50'
                                                    : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white'
                                                }`}
                                            >
                                                <span>{div}</span>
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${isSelected
                                                    ? 'bg-blue-600 border-blue-400 text-white'
                                                    : 'border-slate-600 bg-slate-800'
                                                }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                                    Si seleccionas múltiples divisiones, se creará un torneo independiente para cada categoría (ej. <em>{newSeasonData.baseName || 'Torneo'} - 1ra Fuerza</em>).
                                </p>
                            </div>

                            {/* Dates Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                        Fecha de Inicio <span className="text-blue-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        style={{ colorScheme: 'dark' }}
                                        className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all shadow-inner"
                                        value={newSeasonData.startDate}
                                        onChange={e => setNewSeasonData({ ...newSeasonData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                        Fecha de Término <span className="text-blue-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        style={{ colorScheme: 'dark' }}
                                        className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all shadow-inner"
                                        value={newSeasonData.endDate}
                                        onChange={e => setNewSeasonData({ ...newSeasonData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
                                >
                                    <span>Guardar Torneo</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Seasons List */}
            <div className="grid gap-4">
                {megaSeasons.length === 0 && !isCreating ? (
                    <div className="text-center py-16 px-4 bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 mx-auto mb-4">
                            <Trophy className="w-8 h-8 stroke-[1.5]" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">No hay torneos registrados</h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                            Comienza dando de alta la primera temporada o torneo para tu liga deportiva.
                        </p>
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Crear Primer Torneo</span>
                        </button>
                    </div>
                ) : (
                    megaSeasons.map(mega => (
                        <div
                            key={mega.baseName}
                            onClick={() => navigate(`/${currentLeague}/admin/seasons/${mega.representativeId}`)}
                            className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm cursor-pointer hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                        {mega.baseName}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        {new Date(mega.startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(mega.endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {mega.seasons.map(season => {
                                            const parts = season.name.split(' - ');
                                            const categoryName = parts.length > 1 ? parts[1] : 'Única';

                                            if (categoryName === 'Única') return null;

                                            return (
                                                <span key={season.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                                    <Layers className="w-3 h-3 text-slate-500" />
                                                    {categoryName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        {mega.status === 'DRAFT' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">EN BORRADOR</span>}
                                        {mega.status === 'REGISTRATION_CLOSED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">REGISTROS CERRADOS</span>}
                                        {mega.status === 'ACTIVE' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ring-4 ring-emerald-50/50">EN CURSO</span>}
                                        {mega.status === 'COMPLETED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">CONCLUIDO</span>}

                                        {mega.status === 'DRAFT' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSeasonToDelete({ baseName: mega.baseName, subSeasons: mega.seasons });
                                                }}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all ml-1"
                                                title={`Eliminar torneo en borrador`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium mt-1">
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
