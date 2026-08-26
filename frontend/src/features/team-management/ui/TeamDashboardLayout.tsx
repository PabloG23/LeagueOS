import { ReactNode, useState, useEffect } from 'react';
import { Users, LogOut, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { leagueApi } from '@/shared/api/league-api';

interface TeamDashboardLayoutProps {
    children: ReactNode;
}

export const TeamDashboardLayout = ({ children }: TeamDashboardLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { settings } = useTenantSettings();

    // Extract current league slug from URL
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/');
    const leagueSlug = pathParts[1] || 'ligaNuestroDeporte';

    const [userProfile, setUserProfile] = useState(() => {
        const storedName = localStorage.getItem('name');
        const storedUsername = localStorage.getItem('username');
        const storedTeamName = localStorage.getItem('teamName');
        const displayName = storedName || (storedUsername ? `@${storedUsername}` : 'Representante');
        const teamSubtitle = storedTeamName ? `Rep. ${storedTeamName}` : 'Representante de Equipo';
        
        // Initials
        const cleanName = displayName.replace('@', '').trim();
        const words = cleanName.split(/\s+/);
        const initials = words.length >= 2 
            ? `${words[0][0]}${words[1][0]}`.toUpperCase()
            : (cleanName.substring(0, 2).toUpperCase() || 'RE');

        return { displayName, teamSubtitle, initials };
    });

    useEffect(() => {
        const storedTeamId = localStorage.getItem('teamId');
        if (settings?.tenantId && storedTeamId && !localStorage.getItem('teamName')) {
            leagueApi.getTeams(settings.tenantId).then(({ data: teams }) => {
                const myTeam = teams.find(t => t.id === storedTeamId);
                if (myTeam) {
                    localStorage.setItem('teamName', myTeam.name);
                    const repName = myTeam.representative?.firstName
                        ? `${myTeam.representative.firstName} ${myTeam.representative.lastName || ''}`.trim()
                        : null;
                    if (repName && !localStorage.getItem('name')) {
                        localStorage.setItem('name', repName);
                    }
                    const finalName = localStorage.getItem('name') || repName || localStorage.getItem('username') || 'Representante';
                    const cleanName = finalName.replace('@', '').trim();
                    const words = cleanName.split(/\s+/);
                    const initials = words.length >= 2 
                        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
                        : (cleanName.substring(0, 2).toUpperCase() || 'RE');

                    setUserProfile({
                        displayName: finalName,
                        teamSubtitle: `Rep. ${myTeam.name}`,
                        initials
                    });
                }
            }).catch(console.error);
        }
    }, [settings?.tenantId]);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = `/${leagueSlug}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:relative inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 ease-in-out flex flex-col md:h-screen h-full
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="h-20 flex items-center justify-center border-b border-white/10">
                    <img
                        src={settings?.logoUrl || '/nuestro_deporte_logo.png'}
                        alt={settings?.name || 'Liga'}
                        className="h-12 w-12 object-contain"
                    />
                </div>

                <nav className="p-4 space-y-2">
                    <Link to={`/${leagueSlug}/team-dashboard`} className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-colors">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">Mi Plantilla</span>
                    </Link>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-white/10 rounded-lg transition-colors text-left"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
                    <button
                        className="md:hidden p-2 text-slate-600"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 leading-tight">{userProfile.displayName}</p>
                            <p className="text-xs font-semibold text-slate-500">{userProfile.teamSubtitle}</p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-200/80 shadow-2xs">
                            <span className="font-black text-xs text-blue-700">{userProfile.initials}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
