import { ReactNode } from 'react';
import { Users, LayoutDashboard, Database, Repeat, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';

interface LayoutProps {
    children: ReactNode;
}

export const AdminDashboardLayout = ({ children }: LayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { settings } = useTenantSettings();

    // Extract current league slug from URL or default to 'ligaMexiquense'
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/');
    // Assuming format /:leagueSlug/admin/...
    // If path starts with /admin, default to ligaMexiquense (via redirect in App.tsx)
    const leagueSlug = pathParts[1] === 'admin' ? 'ligaMexiquense' : pathParts[1];

    const menuItems = [
        { path: `/${leagueSlug}/admin/seasons`, icon: LayoutDashboard, label: 'Torneos' },
        { path: `/${leagueSlug}/admin/teams`, icon: Users, label: 'Equipos' },
        { path: `/${leagueSlug}/admin/matches`, icon: Database, label: 'Resultados' },
        { path: `/${leagueSlug}/admin/transfers`, icon: Repeat, label: 'Transferencias', hidden: !settings.allowTransfers },
    ].filter(item => !item.hidden);

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
                fixed md:relative inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-200 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="h-20 flex items-center justify-center border-b border-white/10">
                    <img
                        src={settings.logoUrl}
                        alt={settings.name}
                        className="h-12 w-12 object-contain"
                    />
                </div>

                <nav className="p-4 space-y-2 flex-grow overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-sidebar-foreground/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="mt-auto p-4 border-t border-white/10">
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = `/${leagueSlug}`;
                        }}
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
                            <p className="text-sm font-medium text-slate-900">Administrador</p>
                            <p className="text-xs text-slate-500">{settings.name}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                            <span className="font-bold text-blue-700">AD</span>
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
