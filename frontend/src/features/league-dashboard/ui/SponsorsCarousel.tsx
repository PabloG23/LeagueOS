import React from 'react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';
import { Sponsor, OFFICIAL_SPONSORS } from './SponsorsTicker';

interface SponsorsCarouselProps {
    sponsors?: Sponsor[];
}

export const SponsorsCarousel: React.FC<SponsorsCarouselProps> = ({ sponsors = OFFICIAL_SPONSORS }) => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    // Duplicate list for infinite smooth continuous movement (like MatchdayCarousel)
    const displaySponsors = [...sponsors, ...sponsors, ...sponsors, ...sponsors];

    return (
        <section className={cn(
            "w-full rounded-3xl p-6 sm:p-8 border relative overflow-hidden transition-all duration-500",
            isNuestroDeporte
                ? "bg-[#060C1B] border-blue-900/30 text-white shadow-2xl shadow-blue-950/30"
                : "bg-slate-900 border-slate-800 text-white shadow-2xl"
        )}>
            {/* Background Ambient Glows */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 mb-6 border-b border-white/10 pb-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-['Bebas_Neue'] sm:font-sans">
                    Patrocinadores Oficiales
                </h3>
            </div>

            {/* Infinite Moving Carousel Container (Like MatchdayCarousel) */}
            <div 
                className="w-full overflow-hidden flex items-center py-2 group select-none relative z-10"
                style={{ 
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)', 
                    maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)' 
                }}
            >
                <div className="animate-sponsors-marquee gap-5 pl-4">
                    {displaySponsors.map((sponsor, idx) => (
                        <div
                            key={`${sponsor.id}-${idx}`}
                            className={cn(
                                "w-[240px] sm:w-[280px] h-36 sm:h-40 flex items-center justify-center p-5 rounded-2xl border transition-all duration-300 group/card cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1 shrink-0",
                                isNuestroDeporte
                                    ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-blue-500/50 hover:shadow-blue-500/10"
                                    : "bg-slate-800/40 hover:bg-slate-800 border-slate-700/60 hover:border-slate-500"
                            )}
                            title={sponsor.name}
                        >
                            {sponsor.logoUrl ? (
                                <img
                                    src={sponsor.logoUrl}
                                    alt={sponsor.name}
                                    className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover/card:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center gap-2.5 group-hover/card:scale-105 transition-transform duration-300">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-900/50 border border-white/20">
                                        {sponsor.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover/card:text-slate-200 transition-colors">
                                        Logo Oficial
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
