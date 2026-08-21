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

    // Extract current league slug from URL or default to 'ligaNuestroDeporte'
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/');
    // Assuming format /:leagueSlug/admin/...
    // If path starts with /admin, default to ligaNuestroDeporte (via redirect in App.tsx)
    const leagueSlug = pathParts[1] === 'admin' ? 'ligaNuestroDeporte' : pathParts[1];

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
                fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-200 ease-in-out shrink-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Brand / Logo Header */}
                <div className="p-5 flex flex-col items-center justify-center border-b border-white/10 bg-black/10 gap-2 shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 p-2 shadow-inner flex items-center justify-center backdrop-blur-sm group hover:scale-105 transition-all">
                        <img
                            src={settings.logoUrl}
                            alt={settings.name}
                            className="w-full h-full object-contain drop-shadow-md"
                        />
                    </div>
                    <div className="text-center w-full px-2">
                        <h2 className="text-sm font-bold text-white tracking-wide truncate">{settings.name}</h2>
                        <span className="text-[11px] font-medium text-emerald-400/90 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Panel de Control
                        </span>
                    </div>
                </div>

                {/* Navigation Menu (Scrollable if lots of items) */}
                <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto min-h-0">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${location.pathname === item.path
                                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-semibold'
                                : 'text-sidebar-foreground/75 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Sticky Logout Footer */}
                <div className="p-4 border-t border-white/10 bg-sidebar shrink-0 sticky bottom-0 z-10 shadow-lg">
                    <button
                        onClick={() => {
                            localStorage.clear();
                            const isNuestroDeporte = leagueSlug?.toLowerCase().includes('nuestrodeporte') || settings?.tenantId === '11111111-1111-1111-1111-111111111111';
                            if (isNuestroDeporte) {
                                window.location.href = 'https://www.nuestrodeporte.com/';
                            } else {
                                window.location.href = `/${leagueSlug}`;
                            }
                        }}
                        className="flex items-center justify-center gap-3 w-full px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all font-semibold text-sm group shadow-sm"
                    >
                        <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        <span>Cerrar Sesión</span>
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
