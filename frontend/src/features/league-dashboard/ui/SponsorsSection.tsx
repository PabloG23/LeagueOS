import React from 'react';
import { ShieldCheck, Award, ExternalLink } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';
import { Sponsor, OFFICIAL_SPONSORS } from './SponsorsTicker';

interface SponsorsSectionProps {
    sponsors?: Sponsor[];
}

export const SponsorsSection: React.FC<SponsorsSectionProps> = ({ sponsors = OFFICIAL_SPONSORS }) => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    return (
        <section className={cn(
            "w-full rounded-3xl p-6 sm:p-10 border relative overflow-hidden transition-all duration-300",
            isNuestroDeporte
                ? "bg-[#060C1B] border-blue-900/30 text-white shadow-2xl shadow-blue-950/40"
                : "bg-slate-900 border-slate-800 text-white shadow-2xl"
        )}>
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Section Header */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-white/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-2.5">
                        <Award className="w-3.5 h-3.5" />
                        Alianzas Estratégicas
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-['Bebas_Neue'] sm:font-sans">
                        Nuestros Patrocinadores Oficiales
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl mt-1">
                        Empresas y marcas que impulsan el desarrollo del fútbol amateur y respaldan el talento de nuestra liga.
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Patrocinadores Oficiales Temporada 2026</span>
                </div>
            </div>

            {/* Brand Grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
                {sponsors.map((sponsor) => (
                    <div
                        key={sponsor.id}
                        className={cn(
                            "group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1",
                            isNuestroDeporte
                                ? "bg-white/[0.03] hover:bg-blue-950/40 border-white/[0.08] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
                                : "bg-slate-800/40 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600"
                        )}
                    >
                        <div className="flex items-start justify-between gap-3 mb-4">
                            {/* Logo or Typographic Badge */}
                            {sponsor.logoUrl ? (
                                <div className="h-12 w-28 flex items-center justify-center p-1 bg-white/10 rounded-xl">
                                    <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-lg font-black shadow-md shadow-blue-900/30 group-hover:scale-105 transition-transform">
                                    {sponsor.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}

                            {sponsor.tag && (
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                    sponsor.tag.includes('Master')
                                        ? "bg-amber-500/20 border border-amber-400/40 text-amber-300"
                                        : "bg-blue-500/20 border border-blue-400/30 text-blue-300"
                                )}>
                                    {sponsor.tag}
                                </span>
                            )}
                        </div>

                        <div>
                            <h4 className="text-base font-black text-white group-hover:text-blue-300 transition-colors uppercase tracking-tight leading-snug">
                                {sponsor.name}
                            </h4>
                            {sponsor.category && (
                                <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {sponsor.category}
                                </p>
                            )}
                        </div>

                        {sponsor.linkUrl && (
                            <a
                                href={sponsor.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <span>Conocer más</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};
