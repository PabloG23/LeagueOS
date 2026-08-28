import { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft, Upload, Printer, Loader2, AlertCircle } from 'lucide-react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { TeamDashboardLayout } from './TeamDashboardLayout';
import { AdminDashboardLayout } from '../../admin/ui/AdminDashboardLayout';
import { PlayerCard, Player } from './PlayerCard';
import { AddPlayerModal } from './AddPlayerModal';
import { MassUploadPlayerModal } from './MassUploadPlayerModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { Navbar } from '../../league-dashboard/ui/Navbar';
import { GlobalFooter } from '../../league-dashboard/ui/GlobalFooter';
import { TeamStanding } from '../../league-dashboard/ui/StandingsTable';
import { TeamOverviewWidget } from './TeamOverviewWidget';
import { SecureImage } from './SecureImage';
import { leagueApi } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';

// Local type extending the base Player to include dashboard-specific info
type ExtendedPlayer = Player & {
    teamName?: string;
    stats?: {
        matchesPlayed?: number;
        goals?: number;
        yellowCards?: number;
        redCards?: number;
        suspendedUntilMatchday?: number;
    };
};

// Public Layout Component
const PublicTeamLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            {children}
        </main>
        <GlobalFooter />
    </div>
);

export const RosterDashboard = () => {
    const { teamId } = useParams();
    const location = useLocation();

    // Mode Detection
    const isAdminMode = location.pathname.includes('/admin/');
    const isTeamRepMode = location.pathname.includes('/team-dashboard');
    const isPublicMode = !isAdminMode && !isTeamRepMode;

    const [players, setPlayers] = useState<Player[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMassUploadModalOpen, setIsMassUploadModalOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<ExtendedPlayer | null>(null);
    const [verifyingPlayer, setVerifyingPlayer] = useState<Player | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamName, setTeamName] = useState('Cargando...');
    const [teamLogo, setTeamLogo] = useState<string | undefined>(undefined);
    const [teamRep, setTeamRep] = useState<{ name: string, phone: string | null, photoUrl?: string | null }>({ name: 'Sin Asignar', phone: null });
    const [resolvedTeamId, setResolvedTeamId] = useState<string | undefined>(teamId || (isTeamRepMode ? localStorage.getItem('teamId') || undefined : undefined));
    const { showToast, showConfirm } = useToast();
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleDownloadCredentials = async () => {
        const targetId = resolvedTeamId || teamId || localStorage.getItem('teamId');
        if (!settings?.tenantId || !targetId) return;
        try {
            setIsGeneratingPdf(true);
            const { data: rawPlayers } = await leagueApi.getTeamPlayers(settings.tenantId, targetId);

            if (!rawPlayers || rawPlayers.length === 0) {
                showToast('El equipo no tiene jugadores registrados para generar credenciales', 'warning');
                return;
            }
            
            const { generateCredentialsPdf } = await import('../lib/generateCredentialsPdf');
            
            await generateCredentialsPdf({
                team: { id: targetId, name: teamName, logoUrl: teamLogo } as any,
                players: rawPlayers,
                leagueLogoUrl: settings.logoUrl
            });
            showToast('Credenciales generadas con éxito', 'success');
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            showToast(error.message || 'Ocurrió un error al generar las credenciales', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // Layout Selection
    const Layout = isAdminMode ? AdminDashboardLayout : (isTeamRepMode ? TeamDashboardLayout : PublicTeamLayout);

    const [isLoading, setIsLoading] = useState(false);
    const { settings } = useTenantSettings();

    const fetchRoster = async (showLoading = true) => {
        if (!settings?.tenantId) return;
        if (showLoading) setIsLoading(true);
        try {
            // Fetch all teams to find the team name
            const { data: allTeams } = await leagueApi.getTeams(settings.tenantId);

            let targetTeamId = teamId;
            if (!targetTeamId && isTeamRepMode) {
                const storedTeamId = localStorage.getItem('teamId');
                if (storedTeamId) {
                    targetTeamId = storedTeamId;
                }
            }

            if (targetTeamId) {
                setResolvedTeamId(targetTeamId);
                const team = allTeams.find(t => t.id === targetTeamId);
                if (team && isTeamRepMode) {
                    localStorage.setItem('teamName', team.name);
                    localStorage.setItem('teamId', targetTeamId);
                }
                setTeamName(team?.name || 'Equipo Desconocido');
                setTeamLogo(team?.signedLogoUrl || team?.logoUrl);
                if (team && team.representative) {
                    const { firstName, lastName, phone, profilePhotoUrl } = team.representative;
                    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Sin Asignar';
                    setTeamRep({
                        name: fullName,
                        phone: phone || null,
                        photoUrl: profilePhotoUrl || null
                    });
                } else if (team) {
                    setTeamRep({ name: 'Sin Asignar', phone: null });
                }

                // Fetch actual players
                const { data: fetchedPlayers } = await leagueApi.getTeamPlayers(settings.tenantId, targetTeamId);
                setPlayers(fetchedPlayers.map((p: any) => ({
                    id: p.id,
                    name: `${p.firstName} ${p.lastName}`,
                    photoUrl: p.profilePhotoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${p.firstName} ${p.lastName}`,
                    isActive: p.status === 'ACTIVE',
                    status: p.status,
                    jerseyNumber: p.jerseyNumber,
                    curp: p.curp,
                    birthDate: p.birthDate,
                    suspendedUntilMatchday: p.suspendedUntilMatchday,
                    stats: {
                        suspendedUntilMatchday: p.suspendedUntilMatchday
                    }
                })));
            } else {
                setResolvedTeamId(undefined);
                setTeamName(isTeamRepMode ? 'Sin Equipo Asignado' : 'Equipo Desconocido');
                setTeamRep({ name: 'Sin Asignar', phone: null });
                setPlayers([]);
            }
        } catch (error) {
            console.error("Error fetching roster data:", error);
            showToast("Error al cargar la plantilla", "error");
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    // Fetch real data on mount / param changes
    useEffect(() => {
        fetchRoster(true);
    }, [teamId, isTeamRepMode, settings?.tenantId]);


    const isSanLucas = settings?.tenantId === '22222222-2222-2222-2222-222222222222';
    const maxActivePlayers = isSanLucas ? 25 : 30;
    const activePlayersCount = players.filter(p => p.isActive).length;
    const inactivePlayersCount = players.length - activePlayersCount;

    const handleToggleStatus = async (id: string) => {
        if (isPublicMode) return; // Guard

        const player = players.find(p => p.id === id);
        if (!player) return;

        if (!player.isActive && activePlayersCount >= maxActivePlayers) {
            showToast('¡Límite de jugadores activos alcanzado!', 'error');
            return;
        }

        try {
            if (!settings?.tenantId) return;
            if (player.isActive) {
                await leagueApi.deactivatePlayer(settings.tenantId, id);
                showToast('Jugador dado de baja (Inactivo).', 'success');
            } else {
                await leagueApi.activatePlayer(settings.tenantId, id);
                showToast('Jugador dado de alta (Activo).', 'success');
            }
            // Temporarily update local state to reflect UI changes quickly before reloading or re-fetching
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || 'Error al cambiar estado del jugador.';
            showToast(errorMsg, 'error');
        }
    };

    const handleDelete = (id: string) => {
        if (isPublicMode) return; // Guard
        showConfirm('¿Estás seguro de eliminar este jugador?', () => {
            setPlayers(prev => prev.filter(p => p.id !== id));
            showToast('Jugador eliminado.', 'success');
        }, "Sí, eliminar", "Cancelar");
    };

    const handleAddPlayer = async (newPlayer: { name: string; photoUrl: string, jerseyNumber?: number }) => {
        const targetId = teamId || localStorage.getItem('teamId');
        if (!settings?.tenantId || !targetId) return;

        if (activePlayersCount >= maxActivePlayers) {
            showToast(`¡Límite de jugadores alcanzado! Máximo ${maxActivePlayers} activos.`, 'error');
            return;
        }

        try {
            await leagueApi.registerPlayer(settings.tenantId, {
                teamId: targetId,
                firstName: newPlayer.name.split(' ')[0],
                lastName: newPlayer.name.split(' ').slice(1).join(' '),
                profilePhotoUrl: newPlayer.photoUrl,
                jerseyNumber: newPlayer.jerseyNumber
            });
            showToast('Jugador agregado exitosamente.', 'success');
            setIsAddModalOpen(false);
            await fetchRoster(false);
        } catch (e: any) {
            showToast(e.response?.data?.message || 'Error al agregar jugador', 'error');
        }
    };

    const handleSaveMassUpload = async (parsedPlayers: any[]) => {
        const targetId = teamId || localStorage.getItem('teamId');
        if (!settings?.tenantId || !targetId) return;

        if (activePlayersCount + parsedPlayers.length > maxActivePlayers) {
            const errorMsg = `No se pueden registrar ${parsedPlayers.length} jugadores. El equipo tiene ${activePlayersCount} activos y el límite es ${maxActivePlayers}.`;
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }

        try {
            await leagueApi.batchCreatePlayers(settings.tenantId, targetId, parsedPlayers);
            const count = parsedPlayers.length;
            showToast(`${count} ${count === 1 ? 'jugador importado' : 'jugadores importados'} exitosamente.`, 'success');
            setIsMassUploadModalOpen(false);
            await fetchRoster(false);
        } catch (e: any) {
            const errorMsg = e.response?.data?.message || 'Error al guardar lote de jugadores';
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }
    };

    // Derived state
    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Permissions
    const canEdit = !isPublicMode && (!isTeamRepMode || !!resolvedTeamId);

    return (
        <Layout>
            <div className="w-full">
                {isAdminMode && (
                    <div className="mb-6">
                        <Link to={`/${location.pathname.split('/')[1]}/admin/teams`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Volver a Equipos</span>
                        </Link>
                    </div>
                )}

                {isPublicMode && (
                    <div className="mb-6">
                        <Link to={`/${location.pathname.split('/')[1]}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Volver a Tabla General</span>
                        </Link>
                    </div>
                )}

                {isTeamRepMode && !resolvedTeamId && !isLoading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4 text-amber-900 shadow-sm">
                        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-base text-amber-900">No tienes un equipo asignado</h3>
                            <p className="text-sm text-amber-700 mt-1">
                                Tu cuenta de usuario no tiene un equipo vinculado en la plataforma. Por favor comunícate con el administrador de la liga para que enlace tu equipo a tu cuenta.
                            </p>
                        </div>
                    </div>
                )}

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-950 border border-slate-800 p-3 shadow-xl ring-4 ring-slate-100 flex items-center justify-center overflow-hidden shrink-0 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none" />
                            <SecureImage
                                srcKey={teamLogo}
                                fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(teamName)}`}
                                alt={teamName}
                                className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] relative z-10"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{teamName}</h1>
                            <p className="text-sm font-semibold text-slate-500 mt-0.5">
                                {isAdminMode ? 'Gestión de Plantilla (Admin)' : isTeamRepMode ? 'Mi Plantilla' : 'Plantilla Oficial'}
                            </p>
                        </div>
                    </div>
                    {canEdit && (
                        <div className="flex items-center flex-wrap justify-end gap-3">
                            {isAdminMode && (
                                <button
                                    onClick={handleDownloadCredentials}
                                    disabled={isGeneratingPdf}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{isGeneratingPdf ? 'Generando...' : 'Descargar Credenciales'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (activePlayersCount >= maxActivePlayers) {
                                        showToast(`El equipo ya alcanzó el límite máximo de ${maxActivePlayers} jugadores activos. Debes dar de baja a un jugador antes de importar más.`, 'error');
                                        return;
                                    }
                                    setIsMassUploadModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium rounded-lg transition-all"
                            >
                                <Upload className="w-4 h-4" />
                                <span className="hidden sm:inline">Carga Masiva</span>
                            </button>
                            <button
                                onClick={() => {
                                    if (activePlayersCount >= maxActivePlayers) {
                                        showToast(`El equipo ya alcanzó el límite máximo de ${maxActivePlayers} jugadores activos. Debes dar de baja a un jugador antes de registrar otro.`, 'error');
                                        return;
                                    }
                                    setIsAddModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
                            >
                                <Plus className="w-5 h-5" />
                                Agregar Jugador
                            </button>
                        </div>
                    )}
                </div>

                {/* Combined Overview Widget */}
                {/* Integrates both Roster Stats and Rep Info */}
                <TeamOverviewWidget
                    activeCount={activePlayersCount}
                    inactiveCount={inactivePlayersCount}
                    maxCount={maxActivePlayers}
                    representative={teamRep}
                />

                {/* Filters & Search */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 text-slate-900 font-medium placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                        />
                    </div>
                </div>

                {/* Players Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlayers.map(player => (
                        <div key={player.id} className="cursor-pointer" onClick={() => {
                            if (player.status === 'PENDING_VERIFICATION' && canEdit) {
                                setVerifyingPlayer(player);
                                setIsAddModalOpen(true);
                            } else if (player.status !== 'PENDING_VERIFICATION') {
                                setSelectedPlayer({ ...player, teamName });
                            }
                        }}>
                            <PlayerCard
                                player={player}
                                onToggleStatus={canEdit && player.status !== 'PENDING_VERIFICATION' ? handleToggleStatus : undefined}
                                requireJerseyNumbers={settings?.requireJerseyNumbers}
                            />
                        </div>
                    ))}

                    {/* Empty State */}
                    {filteredPlayers.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                            No se encontraron jugadores.
                        </div>
                    )}
                </div>

                {/* Add/Verify Player (Admin/Rep) */}
                {canEdit && (
                    <>
                        <AddPlayerModal
                            isOpen={isAddModalOpen}
                            onClose={() => {
                                setIsAddModalOpen(false);
                                setVerifyingPlayer(null);
                            }}
                            onSuccess={() => fetchRoster(false)}
                            teamId={resolvedTeamId || teamId}
                            tenantId={settings?.tenantId}
                            requireJerseyNumbers={settings?.requireJerseyNumbers}
                            existingPlayer={verifyingPlayer}
                        />
                        <MassUploadPlayerModal
                            isOpen={isMassUploadModalOpen}
                            onClose={() => setIsMassUploadModalOpen(false)}
                            onSave={handleSaveMassUpload}
                            requireJerseyNumbers={settings?.requireJerseyNumbers}
                        />
                    </>
                )}

                {/* View Player (Public/All) */}
                <PlayerProfileModal
                    isOpen={!!selectedPlayer && selectedPlayer.status !== 'PENDING_VERIFICATION'}
                    onClose={() => setSelectedPlayer(null)}
                    player={selectedPlayer as any}
                />
            </div>
        </Layout>
    );
};

