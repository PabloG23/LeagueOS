import { Plus, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { AddTeamModal } from './AddTeamModal';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { leagueApi, Team } from '@/shared/api/league-api';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';

interface ExtendedTeam extends Team {
    playersCount?: number;
}

export const TeamsView = () => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const currentLeague = leagueSlug || 'ligaMexiquense';
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { settings } = useTenantSettings();
    const [teams, setTeams] = useState<ExtendedTeam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        const fetchTeams = async () => {
            if (!settings?.tenantId) return;
            try {
                const response = await leagueApi.getTeams(settings.tenantId);
                // Assume each team has ~15 players for now since the API doesn't return count yet
                setTeams(response.data.map(t => ({ ...t, playersCount: 15 })));
            } catch (error) {
                console.error('Error fetching teams:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeams();
    }, [settings?.tenantId]);

    const groupedTeams = useMemo(() => {
        const groups: Record<string, ExtendedTeam[]> = {};
        teams.forEach(t => {
            let div = 'General';
            if (t.name.includes('1ra')) div = 'Primera Fuerza';
            else if (t.name.includes('2da')) div = 'Segunda Fuerza';
            else if (t.name.includes('3ra')) div = 'Tercera Fuerza';

            if (!groups[div]) groups[div] = [];
            groups[div].push(t);
        });
        return groups;
    }, [teams]);

    const divisions = Object.keys(groupedTeams);
    const primaryColorClass = settings?.matchTickerBackgroundClass || 'bg-blue-600';

    useEffect(() => {
        if (divisions.length > 0 && !divisions.includes(activeTab)) {
            setActiveTab(divisions[0]);
        }
    }, [divisions, activeTab]);

    const displayTeams = groupedTeams[activeTab] || [];

    const handleSaveTeam = (newTeam: any) => {
        console.log('Nuevo equipo registrado:', newTeam);
        // Aquí iría la llamada a la API POST /api/public/teams/register
        alert('Equipo registrado exitosamente (Simulación)');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Equipos</h1>
                    <p className="text-slate-500">Administra los equipos de la liga.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors font-medium"
                >
                    <Plus className="w-5 h-5" />
                    <span>Registrar Equipo</span>
                </button>
            </div>

            {isLoading ? (
                <div className="py-20 text-center text-slate-500 font-medium">Cargando equipos...</div>
            ) : teams.length === 0 ? (
                <div className="py-20 text-center text-slate-500 font-medium">No hay equipos registrados.</div>
            ) : (
                <div className="space-y-6">
                    {/* Tabs / Division Filter */}
                    {divisions.length > 1 && (
                        <div className="flex border-b border-slate-200 px-2 overflow-x-auto scrollbar-hide">
                            <div className="flex space-x-8 min-w-max">
                                {divisions.map(division => {
                                    const isActive = activeTab === division;
                                    return (
                                        <button
                                            key={division}
                                            onClick={() => setActiveTab(division)}
                                            className={cn(
                                                "py-4 px-2 text-sm font-bold relative transition-colors duration-200 ease-out whitespace-nowrap outline-none",
                                                isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            {division}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="adminTeamsTabUnderline"
                                                    className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full", primaryColorClass)}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Team Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {displayTeams.map((team) => (
                            <Link
                                key={team.id}
                                to={`/${currentLeague}/admin/teams/${team.id}`}
                                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-lg hover:shadow-green-500/20 hover:border-green-500 transition-all cursor-pointer group"
                            >
                                <img src={team.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${team.name}`} alt={team.name} className="w-20 h-20 mb-4 rounded-full bg-slate-50 p-2 group-hover:scale-105 transition-transform" />
                                <h3 className="font-bold text-lg text-slate-900 mb-1">{team.name}</h3>
                                <div className="flex items-center gap-1 text-slate-500 text-sm bg-slate-100 px-3 py-1 rounded-full">
                                    <Users className="w-3 h-3" />
                                    <span>{team.playersCount} Jugadores</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <AddTeamModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveTeam}
            />
        </div>
    );
};
