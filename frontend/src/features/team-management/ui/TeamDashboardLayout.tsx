import { ReactNode, useState, useEffect } from 'react';
import { Users, LogOut, Menu, X } from 'lucide-react';
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
        sessionStorage.clear();
        window.location.replace(`/${leagueSlug}/login`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen h-[100dvh] bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-200 ease-in-out shrink-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="h-20 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src={settings?.logoUrl || '/nuestro_deporte_logo.png'}
                            alt={settings?.name || 'Liga'}
                            className="h-10 w-10 object-contain shrink-0"
                        />
                        <div className="min-w-0 truncate">
                            <span className="text-sm font-bold text-white block truncate">{settings?.name || 'Liga'}</span>
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">Panel de Equipo</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="md:hidden text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto min-h-0">
                    <Link
                        to={`/${leagueSlug}/team-dashboard`}
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-sm hover:opacity-90 transition-colors font-medium text-sm"
                    >
                        <Users className="w-5 h-5 shrink-0" />
                        <span>Mi Plantilla</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/10 bg-sidebar shrink-0 sticky bottom-0 z-10 shadow-lg">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-white/10 rounded-lg transition-colors text-left font-medium text-sm group"
                    >
                        <LogOut className="w-5 h-5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0 max-w-full">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
                    <button
                        className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label="Abrir menú"
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
