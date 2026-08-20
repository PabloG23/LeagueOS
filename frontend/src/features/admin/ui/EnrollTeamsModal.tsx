import { useState, useEffect, useMemo } from 'react';
import { X, Search, Shield, Check, CheckSquare, Square, UserPlus, Sparkles, Filter } from 'lucide-react';
import { leagueApi, Team } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';

interface EnrollTeamsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    seasonId: string;
    alreadyEnrolledTeamIds: string[];
    onSaved: () => void;
}

export const EnrollTeamsModal = ({
    isOpen,
    onClose,
    tenantId,
    seasonId,
    alreadyEnrolledTeamIds,
    onSaved
}: EnrollTeamsModalProps) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setSearch('');
        leagueApi.getTeams(tenantId)
            .then(res => {
                const availableTeams = res.data
                    .filter(t => !alreadyEnrolledTeamIds.includes(t.id) && t.isActive !== false)
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
                setTeams(availableTeams);
                setSelectedIds(new Set());
            })
            .catch(err => {
                console.error("Error fetching teams for enrollment:", err);
                showToast("Error al cargar el catálogo de equipos.", "error");
            })
            .finally(() => setLoading(false));
    }, [isOpen, tenantId, alreadyEnrolledTeamIds]);

    const filteredTeams = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return teams;
        return teams.filter(t => t.name.toLowerCase().includes(query));
    }, [teams, search]);

    if (!isOpen) return null;

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredTeams.length && filteredTeams.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTeams.map(t => t.id)));
        }
    };

    const handleSave = async () => {
        if (selectedIds.size === 0) return;
        setSaving(true);
        try {
            await leagueApi.enrollTeamsToSeason(tenantId, seasonId, Array.from(selectedIds));
            onSaved();
            onClose();
            showToast(`Se han inscrito ${selectedIds.size} equipo(s) al torneo con éxito.`, "success");
        } catch (error: any) {
            console.error(error);
            showToast(error.response?.data?.message || "Error al inscribir los equipos.", "error");
        } finally {
            setSaving(false);
        }
    };

    const allFilteredSelected = filteredTeams.length > 0 && filteredTeams.every(t => selectedIds.has(t.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
                onClick={onClose} 
            />

            {/* Modal Box */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-7 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                            <UserPlus className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">
                                Inscribir Equipos al Torneo
                            </h2>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">
                                Selecciona los equipos del catálogo que competirán en esta temporada
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter & Selection Bar */}
                <div className="px-7 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre de equipo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 bg-white text-sm text-slate-800 font-medium placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            disabled={filteredTeams.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                            {allFilteredSelected ? (
                                <>
                                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                    Deseleccionar Todos
                                </>
                            ) : (
                                <>
                                    <Square className="w-3.5 h-3.5 text-slate-400" />
                                    Seleccionar Todos ({filteredTeams.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Team Selection List */}
                <div className="p-7 flex-1 overflow-y-auto bg-slate-100/60 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-slate-500">Cargando catálogo de equipos...</p>
                        </div>
                    ) : filteredTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                            <div className="w-14 h-14 bg-slate-200/80 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
                                <Filter className="w-7 h-7" />
                            </div>
                            <h4 className="text-base font-bold text-slate-700">
                                {teams.length === 0 ? 'No hay equipos disponibles' : 'No se encontraron coincidencias'}
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm mt-1">
                                {teams.length === 0
                                    ? 'Todos los equipos activos ya se encuentran inscritos en este torneo.'
                                    : `No hay ningún equipo disponible que coincida con "${search}".`}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredTeams.map((team) => {
                                const isSelected = selectedIds.has(team.id);
                                return (
                                    <div
                                        key={team.id}
                                        onClick={() => toggleSelection(team.id)}
                                        className={`group relative p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center gap-3.5 select-none ${
                                            isSelected
                                                ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                                                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-xs'
                                        }`}
                                    >
                                        {/* Styled Checkbox */}
                                        <div
                                            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white'
                                                    : 'border-2 border-slate-300 bg-white group-hover:border-blue-400'
                                            }`}
                                        >
                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>

                                        {/* Generic Team Shield Icon */}
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-xs ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 border border-slate-200/80 text-slate-500 group-hover:bg-blue-100/60 group-hover:text-blue-600'
                                            }`}
                                        >
                                            <Shield className="w-5 h-5" />
                                        </div>

                                        {/* Team Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4
                                                className={`text-sm font-bold truncate transition-colors ${
                                                    isSelected ? 'text-blue-950' : 'text-slate-800'
                                                }`}
                                            >
                                                {team.name}
                                            </h4>
                                            <span className="text-[11px] font-medium text-slate-400">
                                                {team.representative?.firstName ? `Rep: ${team.representative.firstName} ${team.representative.lastName || ''}`.trim() : 'Equipo de la liga'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xs font-semibold text-slate-500 text-center sm:text-left">
                        {selectedIds.size > 0 ? (
                            <span className="text-blue-600 font-bold">
                                {selectedIds.size} {selectedIds.size === 1 ? 'equipo seleccionado' : 'equipos seleccionados'}
                            </span>
                        ) : (
                            <span>Selecciona uno o más equipos para inscribirlos</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || selectedIds.size === 0}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Inscribiendo...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 text-blue-200" />
                                    Inscribir {selectedIds.size > 0 ? `${selectedIds.size} Equipos` : 'Equipos'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
