import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';

export interface Sponsor {
    id: string;
    name: string;
    category?: string;
    logoUrl?: string;
    linkUrl?: string;
    tag?: string;
}

export const OFFICIAL_SPONSORS: Sponsor[] = [
    { id: '1', name: 'Brathia Fisioterapia', category: 'Fisioterapia & Rehabilitación', logoUrl: '/partners/1.png', tag: 'Oficial' },
    { id: '2', name: 'El Tapir', category: 'Cervezas y Milanesas', logoUrl: '/partners/2.png', tag: 'Oficial' },
    { id: '3', name: 'Poderío Deportivo', category: 'Indumentaria Deportiva', logoUrl: '/partners/3.png', tag: 'Oficial' },
    { id: '4', name: 'Pádel City Metepec', category: 'Club & Canchas de Pádel', logoUrl: '/partners/4.png', tag: 'Oficial' },
    { id: '5', name: 'Centro Odontológico Digital', category: 'Salud y Cuidado Dental', logoUrl: '/partners/5.png', tag: 'Oficial' },
    { id: '6', name: 'Rifas Chingonas', category: 'Entretenimiento & Premios', logoUrl: '/partners/6.png', tag: 'Oficial' },
    { id: '7', name: 'Fonda Don Carlos', category: 'Gastronomía Tradicional', logoUrl: '/partners/7.png', tag: 'Oficial' },
    { id: '8', name: 'Patitas Limpias', category: 'Cuidado y Bienestar Canino', logoUrl: '/partners/8.png', tag: 'Oficial' },
    { id: '9', name: 'TES Telecomunicaciones', category: 'Audio, Redes & Telecomunicaciones', logoUrl: '/partners/9.png', tag: 'Oficial' },
    { id: '10', name: 'Academia Arqueros Javi', category: 'Entrenador de Porteros', logoUrl: '/partners/10.png', tag: 'Oficial' },
    { id: '11', name: 'Ciudad Maderas', category: 'Desarrollo Inmobiliario', logoUrl: '/partners/11.png', tag: 'Patrocinador Master' },
    { id: '12', name: 'Muchachito Alegre', category: 'Restaurante & Música', logoUrl: '/partners/12.png', tag: 'Oficial' },
];

export const SponsorsTicker: React.FC<{ sponsors?: Sponsor[] }> = ({ sponsors = OFFICIAL_SPONSORS }) => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = 
        settings?.themeClass === 'theme-nuestro-deporte' || 
        settings?.tenantId === '11111111-1111-1111-1111-111111111111' ||
        settings?.name?.toLowerCase().includes('nuestro deporte');

    // Only render for Liga Nuestro Deporte
    if (!isNuestroDeporte) {
        return null;
    }

    // Duplicate list for infinite smooth loop
    const tickerItems = [...sponsors, ...sponsors, ...sponsors];

    return (
        <div className={cn(
            "w-full border-y relative overflow-hidden py-3 transition-colors duration-300 select-none",
            "bg-[#040814] border-blue-900/30 text-white"
        )}>
            {/* Ambient edge shadows for seamless fade */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-28 bg-gradient-to-r from-[#040814] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-28 bg-gradient-to-l from-[#040814] to-transparent z-10 pointer-events-none" />

            <div className="flex items-center">
                {/* Fixed Label on Left */}
                <div className="shrink-0 pl-4 md:pl-8 pr-4 z-20 flex items-center gap-2 border-r border-white/10">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        Patrocinadores Oficiales
                    </span>
                </div>

                {/* Marquee Track */}
                <div className="flex overflow-hidden relative flex-1 group">
                    <div className="flex shrink-0 items-center gap-8 animate-marquee group-hover:[animation-play-state:paused]">
                        {tickerItems.map((sponsor, idx) => (
                            <div
                                key={`${sponsor.id}-${idx}`}
                                className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 transition-all duration-300 shrink-0 cursor-default"
                            >
                                {sponsor.logoUrl ? (
                                    <img
                                        src={sponsor.logoUrl}
                                        alt={sponsor.name}
                                        className="h-6 w-auto object-contain max-w-[80px]"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[10px] font-black text-white shadow-xs">
                                        {sponsor.name.substring(0, 1)}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-200 group-hover:text-white tracking-tight whitespace-nowrap uppercase">
                                        {sponsor.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
