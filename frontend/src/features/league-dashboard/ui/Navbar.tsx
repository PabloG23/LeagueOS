import { Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useTenantSettings } from '../../tenant/context/TenantSettingsContext';
import { cn } from '@/shared/lib/utils';

export const Navbar = () => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings.themeClass === 'theme-nuestro-deporte' || settings.tenantId === '11111111-1111-1111-1111-111111111111';

    return (
        <nav className={cn(
            "w-full sticky top-0 z-50 transition-all duration-300 shadow-md backdrop-blur-md",
            isNuestroDeporte
                ? "bg-[#060B1A]/95 border-b border-blue-500/20 text-white"
                : "bg-white/95 border-b border-slate-200 text-slate-900"
        )}>
            {/* Ambient Top/Bottom accent line for Nuestro Deporte */}
            {isNuestroDeporte && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_12px_rgba(0,87,255,0.8)]" />
            )}

            <div className="container mx-auto px-4 py-3 md:py-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Brand */}
                <div className="flex items-center gap-4 group text-left">
                    <div className="relative shrink-0">
                        {isNuestroDeporte ? (
                            <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                        ) : (
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        )}
                        <img
                            src={settings.logoUrl}
                            alt={settings.name}
                            className={cn(
                                "h-14 md:h-16 w-auto object-contain relative z-10 drop-shadow-md transition-transform duration-300 group-hover:scale-105 rounded-md",
                                isNuestroDeporte ? "border border-blue-400/20 shadow-blue-900/40" : ""
                            )}
                        />
                    </div>

                    <div className="flex flex-col">
                        <span className={cn(
                            "text-2xl md:text-3xl tracking-tight uppercase leading-none font-black",
                            isNuestroDeporte
                                ? "font-['Bebas_Neue'] tracking-wider text-white"
                                : "font-['Montserrat'] font-extrabold text-sidebar"
                        )}>
                            {settings.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "text-xs font-bold tracking-[0.2em] uppercase",
                                isNuestroDeporte ? "text-blue-400" : "text-slate-500"
                            )}>
                                Portal Oficial
                            </span>
                            {isNuestroDeporte && (
                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 border-l border-slate-700 pl-2">
                                    Desde 1985
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    {typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('nuestrodeporte') ? (
                        <a
                            href="https://league-os-weld.vercel.app/login"
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5",
                                isNuestroDeporte
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-blue-900/40 border border-blue-400/30"
                                    : "bg-blue-700 text-white hover:bg-blue-800"
                            )}
                        >
                            <UserCircle className="w-4 h-4 md:w-5 md:h-5" />
                            <span>INICIAR SESIÓN</span>
                        </a>
                    ) : (
                        <Link
                            to="/login"
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5",
                                isNuestroDeporte
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-blue-900/40 border border-blue-400/30"
                                    : "bg-blue-700 text-white hover:bg-blue-800"
                            )}
                        >
                            <UserCircle className="w-4 h-4 md:w-5 md:h-5" />
                            <span>INICIAR SESIÓN</span>
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

