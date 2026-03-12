import { Plus, Users, Search, Trash2, Edit2, AlertTriangle, X, Shield } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AddTeamModal } from './AddTeamModal';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { leagueApi, Team } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';

interface ExtendedTeam extends Team {
    playersCount?: number;
}

export const TeamsView = () => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const currentLeague = leagueSlug || 'ligaMexiquense';
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [teamToEdit, setTeamToEdit] = useState<ExtendedTeam | null>(null);
    const { settings } = useTenantSettings();
    const [teams, setTeams] = useState<ExtendedTeam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();
    const [teamToDelete, setTeamToDelete] = useState<ExtendedTeam | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchTeams = async () => {
        if (!settings?.tenantId) return;
        setIsLoading(true);
        try {
            const response = await leagueApi.getTeams(settings.tenantId);
            // Players count might not be provided by API right now
            setTeams(response.data.map(t => ({ ...t, playersCount: 15 })));
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [settings?.tenantId]);

    const handleSaveTeam = async (teamData: any) => {
        if (!settings?.tenantId) return;
        try {
            if (teamToEdit) {
                await leagueApi.updateTeam(settings.tenantId, teamToEdit.id, {
                    ...teamData,
                });
                showToast("Equipo actualizado exitosamente.", "success");
            } else {
                await leagueApi.createTeam(settings.tenantId, {
                    ...teamData,
                    tenantId: settings.tenantId
                });
                showToast("Equipo registrado exitosamente.", "success");
            }
            await fetchTeams();
            setIsAddModalOpen(false);
            setTeamToEdit(null);
        } catch (error: any) {
            console.error('Error saving team:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || 'Error al guardar el equipo.';
            showToast(typeof errorMessage === 'string' ? errorMessage : 'Error al guardar el equipo.', 'error');
        }
    };

    const handleEditClick = (e: React.MouseEvent, team: ExtendedTeam) => {
        e.preventDefault();
        e.stopPropagation();
        setTeamToEdit(team);
        setIsAddModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, team: ExtendedTeam) => {
        e.preventDefault();
        e.stopPropagation();
        setTeamToDelete(team);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!settings?.tenantId || !teamToDelete) return;
        try {
            await leagueApi.deleteTeam(settings.tenantId, teamToDelete.id);
            await fetchTeams();
            showToast('Equipo eliminado correctamente.', 'success');
        } catch (error) {
            console.error('Error deleting team:', error);
            showToast('Error al eliminar el equipo.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setTeamToDelete(null);
        }
    };

    const [searchQuery, setSearchQuery] = useState('');

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.representative?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.representative?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-slate-900">Directorio General de Equipos</h1>
                        <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                            <Shield className="w-3.5 h-3.5" />
                            {teams.length} Equipos Activos
                        </span>
                    </div>
                    <p className="text-slate-500">Catálogo global de equipos de la liga.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors font-medium whitespace-nowrap w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    <span>Registrar Equipo</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
                <div className="relative w-full">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar en el catálogo de equipos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 text-center text-slate-500 font-medium">Cargando equipos...</div>
            ) : teams.length === 0 ? (
                <div className="py-20 text-center text-slate-500 font-medium">No hay equipos registrados en el directorio.</div>
            ) : filteredTeams.length === 0 ? (
                <div className="py-20 text-center text-slate-500 font-medium">
                    No se encontraron equipos que coincidan con "{searchQuery}"
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredTeams.map((team) => (
                            <Link
                                key={team.id}
                                to={`/${currentLeague}/admin/teams/${team.id}`}
                                className="relative bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-lg hover:shadow-green-500/20 hover:border-green-500 transition-all cursor-pointer group"
                            >
                                <img src={team.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${team.name}`} alt={team.name} className="w-20 h-20 mb-4 rounded-full bg-slate-50 p-2 group-hover:scale-105 transition-transform object-cover" />
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{team.name}</h3>
                                {team.representative?.firstName && (
                                    <p className="text-sm text-slate-500 mb-1">{team.representative.firstName} {team.representative.lastName || ''}</p>
                                )}
                                <div className="flex items-center gap-1 text-slate-500 text-sm bg-slate-100 px-3 py-1 rounded-full mt-2">
                                    <Users className="w-3 h-3" />
                                    <span>{team.playersCount} Jugadores</span>
                                </div>
                                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEditClick(e, team)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar equipo"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, team)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar equipo"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <AddTeamModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setTeamToEdit(null);
                }}
                onSave={handleSaveTeam}
                teamToEdit={teamToEdit || undefined}
                existingTeams={teams.map(t => ({ id: t.id, name: t.name }))}
            />

            {isDeleteModalOpen && teamToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Confirmar Eliminación
                            </h3>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-4">
                                ¿Estás seguro de que deseas dar de baja al equipo <span className="font-bold text-slate-900">{teamToDelete.name}</span>?
                            </p>
                            <p className="text-sm text-slate-500">
                                Esta acción lo ocultará del directorio, pero conservará su historial de partidos pasados.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
