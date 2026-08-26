
import React from 'react';
import { Facebook, Instagram, Twitter, Phone, ArrowUpRight } from 'lucide-react';
import { useTenantSettings } from '../../tenant/context/TenantSettingsContext';
import { cn } from '@/shared/lib/utils';

export const GlobalFooter: React.FC = () => {
    const { settings } = useTenantSettings();
    const currentYear = new Date().getFullYear();

    // Format phone for direct action
    const cleanPhone = settings.footerPhone?.replace(/\D/g, '') || '';
    const telLink = cleanPhone ? `tel:${cleanPhone}` : undefined;

    return (
        <footer className={cn(
            "relative w-full border-t border-white/10 text-slate-300 pt-14 pb-10 mt-20 overflow-hidden select-none transition-colors duration-500",
            settings.footerBackgroundClass || "bg-[#060B1C]"
        )}>
            {/* Ambient Background Glows */}
            <div className="absolute -top-32 left-1/4 w-[500px] h-[250px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 right-1/4 w-[400px] h-[200px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-10 border-b border-white/10">
                    
                    {/* Brand & Identity Column (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
                        {/* Logo & League Name */}
                        <div className="flex items-center gap-4">
                            {settings.logoUrl && (
                                <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-lg shadow-black/30 group">
                                    <img
                                        src={settings.logoUrl}
                                        alt={settings.name}
                                        className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                                    {settings.name}
                                </h3>
                            </div>
                        </div>

                        {/* Slogan without quotes */}
                        {settings.slogan && (
                            <div className="pl-4 border-l-2 border-blue-500/60 py-0.5">
                                <p className="text-base sm:text-lg font-bold text-slate-200 tracking-tight">
                                    {settings.slogan}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Direct Contact & Attention (3 cols) */}
                    <div className="lg:col-span-3 flex flex-col justify-center space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Contacto Directo
                        </h4>

                        {/* Interactive Phone Card */}
                        {settings.footerPhone && (
                            <a
                                href={telLink}
                                className="group p-3 rounded-2xl bg-white/[0.04] hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/50 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md group-hover:scale-105">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                                            {settings.footerPhone}
                                        </span>
                                    </div>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
                            </a>
                        )}
                    </div>

                    {/* Social Media & Community (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col justify-center space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Comunidad & Redes
                        </h4>

                        <div className="grid grid-cols-1 gap-2.5">
                            {/* Instagram Official */}
                            {settings.instagramUrl && (
                                <a
                                    href={settings.instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-3 rounded-2xl bg-white/[0.04] hover:bg-gradient-to-r hover:from-amber-500/20 hover:via-rose-500/20 hover:to-purple-600/20 border border-white/10 hover:border-rose-500/50 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                            <Instagram className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                                                Instagram Oficial
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                @liga.nuestrodeporte
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                </a>
                            )}

                            {/* Facebook Official */}
                            {settings.facebookUrl && (
                                <a
                                    href={settings.facebookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-3 rounded-2xl bg-white/[0.04] hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/50 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                            <Facebook className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                                                Facebook Oficial
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                Liga Nuestro Deporte
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                </a>
                            )}

                            {/* Optional Twitter / Other if present */}
                            {settings.twitterUrl && (
                                <a
                                    href={settings.twitterUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group p-3 rounded-2xl bg-white/[0.04] hover:bg-sky-500/20 border border-white/10 hover:border-sky-500/50 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                            <Twitter className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                                                X / Twitter Oficial
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                Noticias y Resultados
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Legal Bar */}
                <div className="pt-6 flex items-center justify-center sm:justify-start text-xs font-medium text-slate-400">
                    <div className="flex items-center gap-2">
                        <span>&copy; {currentYear} {settings.name}</span>
                        <span>•</span>
                        <span>Todos los derechos reservados.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
