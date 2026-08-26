import { Plus, Users, Search, Power, Edit2, AlertTriangle, X, Shield, Upload, Archive, CheckCircle2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AddTeamModal } from './AddTeamModal';
import { MassUploadTeamModal } from './MassUploadTeamModal';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { leagueApi, Team } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import { SecureImage } from '@/features/team-management/ui/SecureImage';

interface ExtendedTeam extends Team {
    playersCount?: number;
}

export const TeamsView = () => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const currentLeague = leagueSlug || 'ligaNuestroDeporte';
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMassUploadModalOpen, setIsMassUploadModalOpen] = useState(false);
    const [teamToEdit, setTeamToEdit] = useState<ExtendedTeam | null>(null);
    const { settings } = useTenantSettings();
    const [teams, setTeams] = useState<ExtendedTeam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();
    const [teamToToggle, setTeamToToggle] = useState<ExtendedTeam | null>(null);
    const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);

    const fetchTeams = async (isInitial = false) => {
        if (!settings?.tenantId) return;
        if (isInitial) setIsLoading(true);
        try {
            const response = await leagueApi.getTeams(settings.tenantId);
            setTeams(response.data
                .map(t => ({
                    ...t,
                    playersCount: t.activePlayersCount ?? 0
                }))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
            );
        } catch (error) {
            console.error('Error fetching teams:', error);
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams(true);
    }, [settings?.tenantId]);

    const handleSaveTeam = async (teamData: { name: string; representative?: { firstName: string; lastName: string; phone?: string }; logoUrl: string; logoFile?: File }) => {
        if (!settings?.tenantId) return;
        try {
            if (teamToEdit) {
                let currentLogoUrl = teamData.logoUrl;
                if (teamData.logoFile) {
                    const uploadRes = await leagueApi.uploadTeamLogo(settings.tenantId, teamToEdit.id, teamData.logoFile);
                    currentLogoUrl = uploadRes.data?.logoUrl || currentLogoUrl;
                }
                await leagueApi.updateTeam(settings.tenantId, teamToEdit.id, {
                    name: teamData.name,
                    logoUrl: currentLogoUrl,
                    representative: teamData.representative,
                });
                showToast("Equipo actualizado exitosamente.", "success");
            } else {
                const createdRes = await leagueApi.createTeam(settings.tenantId, {
                    name: teamData.name,
                    logoUrl: teamData.logoUrl,
                    representative: teamData.representative,
                    tenantId: settings.tenantId
                } as any);

                if (teamData.logoFile && createdRes.data?.id) {
                    await leagueApi.uploadTeamLogo(settings.tenantId, createdRes.data.id, teamData.logoFile);
                }
                showToast("Equipo registrado exitosamente.", "success");
            }
            setIsAddModalOpen(false);
            setTeamToEdit(null);
            await fetchTeams(false);
        } catch (error: any) {
            console.error('Error saving team:', error);
            const status = error.response?.status;
            let errorMessage = 'Error al guardar el equipo.';
            if (status === 413) {
                errorMessage = 'La imagen es demasiado pesada (máx. 20MB). Por favor selecciona un archivo más ligero.';
            } else {
                const data = error.response?.data;
                if (typeof data === 'string' && data.trim()) {
                    errorMessage = data;
                } else if (data && typeof data === 'object') {
                    errorMessage = data.message || data.error || data.detail || errorMessage;
                } else if (error.message) {
                    errorMessage = error.message;
                }
            }
            showToast(errorMessage, 'error');
        }
    };

    const handleBulkSaveTeams = async (teamsToSave: { name: string; logoUrl: string; representative?: { firstName: string; lastName: string; phone?: string } }[]) => {
        if (!settings?.tenantId) return;
        let createdCount = 0;
        const failedTeams: { name: string; reason: string }[] = [];
        let lastErrorMsg = '';

        for (const team of teamsToSave) {
            try {
                await leagueApi.createTeam(settings.tenantId, {
                    ...team,
                    tenantId: settings.tenantId,
                } as any);
                createdCount++;
            } catch (err: any) {
                console.error(`Error saving team ${team.name}:`, err);
                const status = err.response?.status;
                let reason = 'Error desconocido';
                if (status === 401 || status === 403) {
                    reason = 'Sesión expirada o sin permisos en esta liga (inicia sesión nuevamente).';
                } else if (err.response?.data) {
                    const data = err.response.data;
                    reason = typeof data === 'string' ? data : (data.message || data.error || JSON.stringify(data));
                } else if (err.message) {
                    reason = err.message;
                }
                lastErrorMsg = reason;
                failedTeams.push({ name: team.name, reason });
            }
        }

        await fetchTeams(false);

        if (failedTeams.length === 0) {
            showToast(`${createdCount} equipos registrados exitosamente.`, 'success');
        } else if (createdCount > 0) {
            showToast(`${createdCount} equipos registrados. No se pudieron registrar: ${failedTeams.map(f => f.name).join(', ')}`, 'info');
        } else {
            throw new Error(`No se pudo registrar ningún equipo. Causa: ${lastErrorMsg}`);
        }
    };

    const handleEditClick = (e: React.MouseEvent, team: ExtendedTeam) => {
        e.preventDefault();
        e.stopPropagation();
        setTeamToEdit(team);
        setIsAddModalOpen(true);
    };

    const handleToggleStatusClick = (e: React.MouseEvent, team: ExtendedTeam) => {
        e.preventDefault();
        e.stopPropagation();
        setTeamToToggle(team);
        setIsToggleModalOpen(true);
    };

    const confirmToggleStatus = async () => {
        if (!settings?.tenantId || !teamToToggle) return;
        const isCurrentlyActive = (teamToToggle as any).isActive ?? (teamToToggle as any).active ?? true;
        try {
            if (isCurrentlyActive) {
                await leagueApi.deleteTeam(settings.tenantId, teamToToggle.id);
                showToast(`Equipo "${teamToToggle.name}" desactivado.`, 'success');
            } else {
                await leagueApi.activateTeam(settings.tenantId, teamToToggle.id);
                showToast(`Equipo "${teamToToggle.name}" reactivado exitosamente.`, 'success');
            }
            await fetchTeams(false);
        } catch (error) {
            console.error('Error toggling team status:', error);
            showToast(isCurrentlyActive ? 'Error al desactivar el equipo.' : 'Error al reactivar el equipo.', 'error');
        } finally {
            setIsToggleModalOpen(false);
            setTeamToToggle(null);
        }
    };

    const [searchQuery, setSearchQuery] = useState('');

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.representative?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.representative?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeTeams = filteredTeams.filter(t => (t as any).isActive ?? (t as any).active ?? true);
    const inactiveTeams = filteredTeams.filter(t => !((t as any).isActive ?? (t as any).active ?? true));

    return (
        <div className="space-y-8">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h1 className="text-2xl font-bold text-slate-900">Directorio General de Equipos</h1>
                        <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                            <Shield className="w-3.5 h-3.5" />
                            {activeTeams.length} {activeTeams.length === 1 ? 'Activo' : 'Activos'}
                        </span>
                        {inactiveTeams.length > 0 && (
                            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                                <Power className="w-3 h-3 text-slate-400" />
                                {inactiveTeams.length} {inactiveTeams.length === 1 ? 'Inactivo' : 'Inactivos'}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm">Catálogo global de equipos registrados en la liga.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsMassUploadModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg shadow-sm transition-all font-medium whitespace-nowrap flex-1 sm:flex-initial text-sm"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Carga Masiva</span>
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors font-medium whitespace-nowrap flex-1 sm:flex-initial text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar Equipo</span>
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
                <div className="relative w-full">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de equipo o representante..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 text-sm"
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
                <div className="space-y-12">
                    {/* SECTION 1: ACTIVE TEAMS */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <h2 className="text-lg font-bold text-slate-900">Equipos Activos ({activeTeams.length})</h2>
                            </div>
                        </div>

                        {activeTeams.length === 0 ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
                                No hay equipos activos disponibles.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {activeTeams.map((team) => {
                                    const count = team.playersCount ?? 0;
                                    return (
                                        <Link
                                            key={team.id}
                                            to={`/${currentLeague}/admin/teams/${team.id}`}
                                            className="block group"
                                        >
                                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden">
                                                {/* Top Meta Bar */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 transition-colors">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        Activo
                                                    </span>

                                                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleEditClick(e, team)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Editar equipo y escudo"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleToggleStatusClick(e, team)}
                                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                            title="Desactivar equipo"
                                                        >
                                                            <Power className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Hero Shield / Logo */}
                                                <div className="flex flex-col items-center text-center my-4">
                                                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 border border-slate-800 p-3.5 shadow-xl group-hover:shadow-2xl group-hover:scale-105 group-hover:border-blue-500/40 ring-4 ring-slate-100 group-hover:ring-blue-100/80 transition-all duration-300 flex items-center justify-center overflow-hidden mb-3.5 relative">
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none" />
                                                        <SecureImage
                                                            srcKey={team.signedLogoUrl || team.logoUrl}
                                                            fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`}
                                                            alt={team.name}
                                                            className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105 relative z-10"
                                                        />
                                                    </div>
                                                    <h3 className="font-black text-xl text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 tracking-tight">
                                                        {team.name}
                                                    </h3>
                                                </div>

                                                {/* Team Details */}
                                                <div className="mt-2 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 font-medium">Representante:</span>
                                                        <span className="font-bold text-slate-800 truncate max-w-[140px]">
                                                            {team.representative?.firstName ? `${team.representative.firstName} ${team.representative.lastName || ''}`.trim() : 'Sin asignar'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 font-medium">Jugadores:</span>
                                                        <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50/80 border border-blue-100 px-2.5 py-1 rounded-lg">
                                                            <Users className="w-3.5 h-3.5" />
                                                            {count} {count === 1 ? 'registrado' : 'registrados'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: INACTIVE TEAMS */}
                    {inactiveTeams.length > 0 && (
                        <div className="pt-8 border-t-2 border-dashed border-slate-200 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                                        <Archive className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                            Equipos Inactivos
                                            <span className="bg-slate-200/70 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                                {inactiveTeams.length}
                                            </span>
                                        </h2>
                                        <p className="text-xs text-slate-400">Equipos en pausa o dados de baja. Conservan su historial y pueden reactivarse.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {inactiveTeams.map((team) => {
                                    const count = team.playersCount ?? 0;
                                    return (
                                        <div
                                            key={team.id}
                                            className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between h-full relative group"
                                        >
                                            <div>
                                                {/* Top Meta Bar */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/60 text-slate-600 border border-slate-300/60">
                                                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                        Inactivo
                                                    </span>

                                                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleEditClick(e, team)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
                                                            title="Editar equipo y escudo"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Hero Shield / Logo (Grayscale with full-color on hover) */}
                                                <div className="flex flex-col items-center text-center my-4">
                                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 border border-slate-800 p-3 shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center justify-center overflow-hidden mb-3 relative">
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08)_0%,_transparent_70%)] pointer-events-none" />
                                                        <SecureImage
                                                            srcKey={team.signedLogoUrl || team.logoUrl}
                                                            fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`}
                                                            alt={team.name}
                                                            className="w-full h-full object-contain filter grayscale contrast-90 group-hover:grayscale-0 group-hover:contrast-100 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-all duration-300 relative z-10"
                                                        />
                                                    </div>
                                                    <h3 className="font-bold text-lg text-slate-600 group-hover:text-slate-900 transition-colors line-clamp-1 tracking-tight">
                                                        {team.name}
                                                    </h3>
                                                </div>

                                                {/* Details */}
                                                <div className="mt-2 pt-3 border-t border-slate-200/60 space-y-2 text-xs text-slate-500">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 font-medium">Representante:</span>
                                                        <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                                                            {team.representative?.firstName ? `${team.representative.firstName} ${team.representative.lastName || ''}`.trim() : 'Sin asignar'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 font-medium">Historial:</span>
                                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-200/60 border border-slate-300/40 px-2 py-0.5 rounded-lg">
                                                            <Users className="w-3 h-3" />
                                                            {count} {count === 1 ? 'jugador' : 'jugadores'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reactivate Button CTA */}
                                            <div className="mt-4 pt-3 border-t border-slate-200/60">
                                                <button
                                                    onClick={(e) => handleToggleStatusClick(e, team)}
                                                    className="w-full py-2 px-3 bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 hover:border-emerald-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                                >
                                                    <Power className="w-3.5 h-3.5" />
                                                    <span>Reactivar Equipo</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <AddTeamModal
                key={teamToEdit?.id || 'new-team'}
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setTeamToEdit(null);
                }}
                onSave={handleSaveTeam}
                teamToEdit={teamToEdit || undefined}
                existingTeams={teams.map(t => ({ id: t.id, name: t.name }))}
            />

            <MassUploadTeamModal
                isOpen={isMassUploadModalOpen}
                onClose={() => setIsMassUploadModalOpen(false)}
                onSave={handleBulkSaveTeams}
                existingTeamNames={teams.map(t => t.name)}
            />

            {/* Toggle Status Confirmation Modal (Deactivate or Reactivate) */}
            {isToggleModalOpen && teamToToggle && (() => {
                const isCurrentlyActive = (teamToToggle as any).isActive ?? (teamToToggle as any).active ?? true;
                return (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    {isCurrentlyActive ? (
                                        <>
                                            <Power className="w-5 h-5 text-amber-500" />
                                            Desactivar Equipo
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            Reactivar Equipo
                                        </>
                                    )}
                                </h3>
                                <button
                                    onClick={() => setIsToggleModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                {isCurrentlyActive ? (
                                    <>
                                        <p className="text-slate-600 mb-3">
                                            ¿Estás seguro de que deseas desactivar al equipo <strong className="text-slate-900">{teamToToggle.name}</strong>?
                                        </p>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            El equipo pasará a la sección de inactivos y no estará disponible para inscripción a nuevos torneos, pero se conservará intacto todo su historial.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-slate-600 mb-3">
                                            ¿Deseas reactivar al equipo <strong className="text-slate-900">{teamToToggle.name}</strong>?
                                        </p>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            El equipo volverá a estar activo en el directorio principal y listo para inscribirse en torneos y competencias.
                                        </p>
                                    </>
                                )}
                            </div>
                            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    onClick={() => setIsToggleModalOpen(false)}
                                    className="px-4 py-2 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmToggleStatus}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 text-sm text-white ${
                                        isCurrentlyActive
                                            ? 'bg-amber-600 hover:bg-amber-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                >
                                    <Power className="w-4 h-4" />
                                    <span>{isCurrentlyActive ? 'Sí, desactivar' : 'Sí, reactivar equipo'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
