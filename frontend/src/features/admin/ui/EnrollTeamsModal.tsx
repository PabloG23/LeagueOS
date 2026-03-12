import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
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

export const EnrollTeamsModal = ({ isOpen, onClose, tenantId, seasonId, alreadyEnrolledTeamIds, onSaved }: EnrollTeamsModalProps) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        leagueApi.getTeams(tenantId)
            .then(res => {
                const availableTeams = res.data.filter(t => !alreadyEnrolledTeamIds.includes(t.id));
                setTeams(availableTeams);
                setSelectedIds(new Set());
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [isOpen, tenantId, alreadyEnrolledTeamIds]);

    if (!isOpen) return null;

    const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSave = async () => {
        if (selectedIds.size === 0) return;
        setSaving(true);
        try {
            await leagueApi.enrollTeamsToSeason(tenantId, seasonId, Array.from(selectedIds));
            onSaved();
            onClose();
            showToast(`Inscritos ${selectedIds.size} equipos correctamente.`, "success");
        } catch (error) {
            console.error(error);
            showToast("Error al inscribir equipos.", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Inscribir Equipos al Torneo</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo de equipos..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
                    {loading ? (
                        <div className="text-center text-slate-500 py-8">Cargando catálogo...</div>
                    ) : filteredTeams.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            No hay más equipos disponibles para inscribir.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredTeams.map(team => (
                                <div
                                    key={team.id}
                                    onClick={() => toggleSelection(team.id)}
                                    className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer transition-all ${selectedIds.has(team.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-white hover:border-slate-300'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(team.id)}
                                        readOnly
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <div className="flex-1 flex gap-3 items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">
                                            {team.logoUrl ? (
                                                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-bold text-slate-500">{team.name.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-slate-900 line-clamp-1">{team.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || selectedIds.size === 0}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Inscribiendo...' : `Inscribir ${selectedIds.size} equipos`}
                    </button>
                </div>
            </div>
        </div>
    );
};
