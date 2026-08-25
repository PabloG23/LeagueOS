import React from 'react';
import { Award } from 'lucide-react';
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

    // 2 copies for standard 50% loop
    const displaySponsors = [...sponsors, ...sponsors];

    // Calculate duration so linear velocity (px/sec) is EXACTLY the same as MatchdayCarousel (~48 px/s)
    const cardWidthWithGap = 256; // 240px width + 16px gap
    const halfTrackWidth = sponsors.length * cardWidthWithGap;
    const targetVelocityPxPerSec = 48; // Standard velocity
    const animationDurationSeconds = Math.max(20, Math.round(halfTrackWidth / targetVelocityPxPerSec));

    return (
        <section className={`w-full border-b border-white/10 transition-colors duration-500 py-6 ${settings.matchTickerBackgroundClass}`}>
            {/* Header centered */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mb-3">
                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${settings.matchTickerTextClass}`}>
                        <Award className="w-4 h-4 text-amber-400" />
                        Patrocinadores Oficiales
                    </div>
                </div>
            </div>

            {/* Infinite Moving Carousel Container (100% full screen width edge-to-edge) */}
            <div className="w-full overflow-hidden flex items-center py-2 group select-none">
                <div 
                    className="flex w-max animate-marquee group-hover:[animation-play-state:paused] gap-4 pl-4"
                    style={{ animationDuration: `${animationDurationSeconds}s` }}
                >
                        {displaySponsors.map((sponsor, idx) => (
                            <div
                                key={`${sponsor.id}-${idx}`}
                                className={`w-[240px] min-w-[240px] h-[95px] flex items-center justify-center ${settings.matchCardBackgroundClass || 'bg-card'} backdrop-blur-md rounded-2xl p-4 border border-red-700/40 hover:border-red-500/80 transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-red-900/20 hover:-translate-y-0.5 shrink-0 group/card`}
                                title={sponsor.name}
                            >
                                {sponsor.logoUrl ? (
                                    <img
                                        src={sponsor.logoUrl}
                                        alt={sponsor.name}
                                        className="max-h-[60px] max-w-[180px] object-contain filter drop-shadow-md group-hover/card:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-center text-sm font-black shadow-md border border-white/20">
                                            {sponsor.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-white group-hover/card:text-blue-300 transition-colors">
                                                {sponsor.name}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
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

