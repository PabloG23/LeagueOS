import { Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useTenantSettings } from '../../tenant/context/TenantSettingsContext';

export const Navbar = () => {
    const { settings } = useTenantSettings();

    return (
        <nav className="w-full bg-white border-b border-slate-200 shadow-sm relative overflow-hidden">
            {/* Background Pattern/Gradient Overlay (Optional for texture) */}
            <div className="absolute inset-0 bg-slate-50/50 pointer-events-none" />

            <div className="container mx-auto px-4 py-6 md:py-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Brand */}
                <Link to="/" className="flex flex-col md:flex-row items-center gap-6 group text-center md:text-left">
                    <div className="relative">
                        <div className="absolute inset-0 bg-sidebar/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <img
                            src={settings.logoUrl}
                            alt={settings.name}
                            className="h-24 w-auto object-contain relative z-10 drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>

                    <div className="flex flex-col">
                        <span className="font-['Montserrat'] font-extrabold text-3xl md:text-4xl tracking-tight text-sidebar uppercase leading-none">
                            {settings.name}
                        </span>
                        <span className="text-slate-500 text-sm font-bold tracking-[0.2em] uppercase mt-1">
                            Portal Oficial
                        </span>
                    </div>
                </Link>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <Link
                        to="/login"
                        className="flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold bg-blue-700 text-white hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <UserCircle className="w-5 h-5" />
                        <span>INICIAR SESIÓN</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
};
