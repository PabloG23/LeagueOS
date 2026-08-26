import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { Sponsor, OFFICIAL_SPONSORS } from './SponsorsTicker';

interface SponsorsCarouselProps {
    sponsors?: Sponsor[];
}

export const SponsorsCarousel: React.FC<SponsorsCarouselProps> = ({ sponsors = OFFICIAL_SPONSORS }) => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = 
        settings?.themeClass === 'theme-nuestro-deporte' || 
        settings?.tenantId === '11111111-1111-1111-1111-111111111111' ||
        settings?.name?.toLowerCase().includes('nuestro deporte');

    // Only display sponsors carousel for Liga Nuestro Deporte
    if (!isNuestroDeporte || !settings) {
        return null;
    }

    // 2 copies for continuous seamless loop
    const displaySponsors = [...sponsors, ...sponsors];

    // Card width with gap: 260px width + 16px gap = 276px
    const cardWidthWithGap = 276;
    const halfTrackWidth = sponsors.length * cardWidthWithGap;
    const targetVelocityPxPerSec = 45; // Smooth cinematic velocity
    const animationDurationSeconds = Math.max(25, Math.round(halfTrackWidth / targetVelocityPxPerSec));

    return (
        <section className="w-full border-b border-white/10 relative overflow-hidden py-5 bg-[#040812] select-none transition-colors duration-500">
            {/* Header / Section Title */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-3.5">
                <div className="flex items-center gap-2 text-xs md:text-sm font-black uppercase tracking-widest text-slate-200">
                    <span className="p-1 rounded-md bg-amber-500/10 border border-amber-400/20 text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <span>Patrocinadores Oficiales</span>
                    <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 tracking-normal border-l border-white/15 pl-2 ml-1">
                        Temporada 2026
                    </span>
                </div>
            </div>

            {/* Edge Fade Gradients for Seamless Ribbon Effect */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-[#040812] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-[#040812] to-transparent z-10 pointer-events-none" />

            {/* Infinite Marquee Carousel */}
            <div className="w-full overflow-hidden flex items-center py-2 group">
                <div 
                    className="flex w-max animate-marquee group-hover:[animation-play-state:paused] gap-4 pl-4"
                    style={{ animationDuration: `${animationDurationSeconds}s` }}
                >
                    {displaySponsors.map((sponsor, idx) => (
                        <div
                            key={`${sponsor.id}-${idx}`}
                            className="w-[260px] min-w-[260px] h-[110px] flex items-center justify-center rounded-2xl p-4 shrink-0 cursor-pointer group/card transition-all duration-300 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.12] hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/60"
                            title={`${sponsor.name} - ${sponsor.category || 'Patrocinador Oficial'}`}
                        >
                            {/* Logo Hero Area taking 100% of Card */}
                            {sponsor.logoUrl ? (
                                <img
                                    src={sponsor.logoUrl}
                                    alt={sponsor.name}
                                    className="max-h-[82px] max-w-[225px] w-auto h-auto object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] group-hover/card:scale-105 group-hover/card:brightness-110 transition-all duration-300"
                                />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-center text-lg font-black shadow-md border border-white/20">
                                        {sponsor.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-bold text-white group-hover/card:text-blue-300 transition-colors">
                                            {sponsor.name}
                                        </span>
                                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                                            Patrocinador
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

