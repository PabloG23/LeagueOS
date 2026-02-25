import { useState, useEffect } from 'react';
import { Plus, Search, ArrowLeft } from 'lucide-react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { TeamDashboardLayout } from './TeamDashboardLayout';
import { AdminDashboardLayout } from '../../admin/ui/AdminDashboardLayout';
import { PlayerCard, Player } from './PlayerCard';
import { AddPlayerModal } from './AddPlayerModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { Navbar } from '../../league-dashboard/ui/Navbar';
import { GlobalFooter } from '../../league-dashboard/ui/GlobalFooter';
import { TeamStanding } from '../../league-dashboard/ui/StandingsTable';
import { TeamOverviewWidget } from './TeamOverviewWidget';
import { leagueApi } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';

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
    const [selectedPlayer, setSelectedPlayer] = useState<ExtendedPlayer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamName, setTeamName] = useState('Cargando...');
    const [teamRep, setTeamRep] = useState<{ name: string, phone: string | null, photoUrl?: string | null }>({ name: 'Sin Asignar', phone: null });

    // Layout Selection
    const Layout = isAdminMode ? AdminDashboardLayout : (isTeamRepMode ? TeamDashboardLayout : PublicTeamLayout);

    const [isLoading, setIsLoading] = useState(false);
    const { settings } = useTenantSettings();

    // Fetch real data
    useEffect(() => {
        const fetchRoster = async () => {
            if (!settings?.tenantId) return;
            setIsLoading(true);
            try {
                // Fetch all teams to find the team name
                const { data: allTeams } = await leagueApi.getTeams(settings.tenantId);

                let targetTeamId = teamId;
                if (!targetTeamId && isTeamRepMode) {
                    // For demo, if teamRepMode without ID, pick the first team or a specific one from DB
                    const myTeam = allTeams.find(t => t.name.includes("Halcones")) || allTeams[0];
                    if (myTeam) targetTeamId = myTeam.id;
                }

                if (targetTeamId) {
                    const team = allTeams.find(t => t.id === targetTeamId);
                    setTeamName(team?.name || 'Equipo Desconocido');
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
                        photoUrl: p.profilePhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.firstName}${p.lastName}`,
                        isActive: p.status === 'ACTIVE'
                    })));
                }
            } catch (error) {
                console.error("Failed to load roster:", error);
                setTeamName("Error al cargar equipo");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoster();
    }, [teamId, isTeamRepMode, settings?.tenantId]);


    const maxActivePlayers = 26;
    const activePlayersCount = players.filter(p => p.isActive).length;
    const inactivePlayersCount = players.length - activePlayersCount;

    const handleToggleStatus = (id: string) => {
        if (isPublicMode) return; // Guard

        setPlayers(prev => prev.map(player => {
            if (player.id === id) {
                if (!player.isActive && activePlayersCount >= maxActivePlayers) {
                    alert('¡Límite de jugadores activos alcanzado!');
                    return player;
                }
                return { ...player, isActive: !player.isActive };
            }
            return player;
        }));
    };

    const handleDelete = (id: string) => {
        if (isPublicMode) return; // Guard
        if (confirm('¿Estás seguro de eliminar este jugador?')) {
            setPlayers(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleAddPlayer = (newPlayer: { name: string; photoUrl: string }) => {
        setPlayers(prev => [
            ...prev,
            { id: Date.now().toString(), ...newPlayer, isActive: true } // Default active
        ]);
        setIsAddModalOpen(false);
    };

    // Derived state
    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Permissions
    const canEdit = !isPublicMode;

    return (
        <Layout>
            <div className="w-full">
                {isAdminMode && (
                    <div className="mb-6">
                        <Link to="/admin/teams" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
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

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <img
                            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${teamName}`}
                            alt="Escudo Equipo"
                            className="w-24 h-24 object-contain bg-slate-100 rounded-lg p-2 border border-slate-200"
                        />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{teamName}</h1>
                            <p className="text-slate-500">
                                {isAdminMode ? 'Gestión de Plantilla (Admin)' : isTeamRepMode ? 'Mi Plantilla' : 'Plantilla Oficial'}
                            </p>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
                        >
                            <Plus className="w-5 h-5" />
                            Agregar Jugador
                        </button>
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
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                        />
                    </div>
                </div>

                {/* Players Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlayers.map(player => (
                        <div key={player.id} className="cursor-pointer" onClick={() => isPublicMode && setSelectedPlayer({ ...player, teamName })}>
                            <PlayerCard
                                player={player}
                                onToggleStatus={canEdit ? handleToggleStatus : undefined}
                                onDelete={canEdit ? handleDelete : undefined}
                                onEdit={canEdit ? () => { } : undefined}
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

                {/* Add Player (Admin/Rep) */}
                {canEdit && (
                    <AddPlayerModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSave={handleAddPlayer}
                    />
                )}

                {/* View Player (Public/All) */}
                <PlayerProfileModal
                    isOpen={!!selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                    player={selectedPlayer as any}
                />
            </div>
        </Layout>
    );
};

