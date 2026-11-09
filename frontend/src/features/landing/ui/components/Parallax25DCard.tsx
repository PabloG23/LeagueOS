import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Award, Sparkles, Activity } from 'lucide-react';

export interface Parallax25DCardProps {
    children: React.ReactNode;
    className?: string;
    /** Maximum tilt angle in degrees (default 10) */
    maxTilt?: number;
    /** Accent glow color */
    glowColor?: 'blue' | 'emerald' | 'cyan';
}

export const Parallax25DCard: React.FC<Parallax25DCardProps> = ({
    children,
    className = '',
    maxTilt = 10,
    glowColor = 'blue',
}) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Normalized pointer coordinates (-0.5 to 0.5)
    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);

    // Smooth physics spring for 60fps 2.5D inertia
    const smoothX = useSpring(pointerX, { stiffness: 180, damping: 22, mass: 0.6 });
    const smoothY = useSpring(pointerY, { stiffness: 180, damping: 22, mass: 0.6 });

    const rotateX = useTransform(smoothY, [-0.5, 0.5], [maxTilt, -maxTilt]);
    const rotateY = useTransform(smoothX, [-0.5, 0.5], [-maxTilt, maxTilt]);

    // Specular foil glare position
    const glareX = useTransform(smoothX, [-0.5, 0.5], ['15%', '85%']);
    const glareY = useTransform(smoothY, [-0.5, 0.5], ['15%', '85%']);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        pointerX.set(normX);
        pointerY.set(normY);
    };

    const handlePointerLeave = () => {
        setIsHovered(false);
        pointerX.set(0);
        pointerY.set(0);
    };

    const glowPalette = {
        blue: 'rgba(37, 99, 235, 0.28)',
        emerald: 'rgba(16, 185, 129, 0.28)',
        cyan: 'rgba(0, 229, 255, 0.28)',
    }[glowColor];

    return (
        <div
            ref={cardRef}
            onPointerEnter={() => setIsHovered(true)}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{ perspective: '1200px' }}
            className="relative select-none"
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d',
                }}
                className={`relative transition-shadow duration-300 ${className}`}
            >
                {/* Dynamic Specular Holographic Glare Overlay */}
                <motion.div
                    aria-hidden="true"
                    style={{
                        background: useTransform(
                            [glareX, glareY],
                            ([gx, gy]) =>
                                `radial-gradient(circle at ${gx} ${gy}, ${glowPalette}, transparent 65%)`
                        ),
                        transform: 'translateZ(2px)',
                    }}
                    className={`pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300 ${
                        isHovered ? 'opacity-100' : 'opacity-40'
                    }`}
                />

                {children}
            </motion.div>
        </div>
    );
};

export interface PlayerRadar25DCardProps {
    activeSportTab: 'f7' | 'rapido' | 'f11' | 'personalizado';
}

const SPORT_TAG_METADATA: Record<
    PlayerRadar25DCardProps['activeSportTab'],
    { badge: string; pitchLabel: string; accentClass: string }
> = {
    f7: {
        badge: 'Fútbol 7 · Cancha Sintética',
        pitchLabel: 'Radar Pro F7',
        accentClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    },
    rapido: {
        badge: 'Fútbol Rápido · Bardas Activas',
        pitchLabel: 'Shootout & Pared',
        accentClass: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    },
    f11: {
        badge: 'Fútbol 11 · Reglamentario FIFA',
        pitchLabel: 'Telemetría 90 Min',
        accentClass: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    },
    personalizado: {
        badge: 'Reglas Custom · Tu Torneo',
        pitchLabel: 'Motor Configurable',
        accentClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
};

/**
 * Multi-plane 2.5D Player Analytics Card (FIFA / EA Sports FC Ultimate Team Depth Effect)
 * Separates background pitch vectors (Z=0), tactical radar (Z=20px), stat bars (Z=42px),
 * and player emblem/MVP badge (Z=65px) into physical 3D planes.
 */
export const PlayerRadar25DCard: React.FC<PlayerRadar25DCardProps> = ({ activeSportTab }) => {
    const sportMeta = SPORT_TAG_METADATA[activeSportTab];

    return (
        <Parallax25DCard
            maxTilt={11}
            glowColor={activeSportTab === 'personalizado' ? 'emerald' : 'cyan'}
            className="p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/20 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,0.85)] relative group"
        >
            {/* PLANE Z-0: Deep Base Pitch Grid & Holographic Corner Brackets */}
            <div
                style={{ transform: 'translateZ(0px)' }}
                className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden"
            >
                {/* Subtle Tactical Pitch Lines in Background */}
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(0,229,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,229,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />
                {/* Glowing Top Border Accent */}
                <div className="absolute top-0 inset-x-10 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
                <div className="absolute bottom-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            </div>

            {/* PLANE Z-3 (Highest Depth +64px): Floating Top Telemetry Chip & Player Header */}
            <div
                style={{ transform: 'translateZ(64px)', transformStyle: 'preserve-3d' }}
                className="relative z-30"
            >
                {/* Floating 2.5D Sport Context Pill */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${sportMeta.accentClass}`}
                    >
                        <Activity className="w-3 h-3" />
                        {sportMeta.badge}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        2.5D Card
                    </span>
                </div>

                {/* Main Player Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3.5">
                        {/* Number 10 Avatar floating on an extra micro-plane */}
                        <div
                            style={{ transform: 'translateZ(18px)' }}
                            className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-400 to-emerald-400 p-[2px] shadow-[0_12px_25px_rgba(0,229,255,0.35)]"
                        >
                            <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center font-black text-white">
                                <span className="text-[9px] text-cyan-400 uppercase tracking-tighter leading-none">
                                    PRO
                                </span>
                                <span className="text-lg leading-tight">10</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                                Carlos &quot;Matador&quot; Ruiz
                            </div>
                            <div className="text-xs text-slate-300 font-semibold">
                                Delantero · Galácticos FC
                            </div>
                        </div>
                    </div>

                    {/* Golden MVP Badge elevated in Z */}
                    <div
                        style={{ transform: 'translateZ(24px)' }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-400/40 shadow-[0_10px_25px_rgba(245,158,11,0.25)] flex items-center gap-1.5"
                    >
                        <Award className="w-4 h-4 text-amber-300" /> 9.4 MVP
                    </div>
                </div>
            </div>

            {/* PLANE Z-1 (+20px): Decorative Holographic Radar Polygon in Mid-Background */}
            <div
                style={{ transform: 'translateZ(20px)' }}
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 w-36 h-36 opacity-20 group-hover:opacity-35 transition-opacity duration-500"
            >
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <polygon
                        points="50,6 92,30 92,72 50,94 8,72 8,30"
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                    />
                    <polygon
                        points="50,22 76,38 76,64 50,78 24,64 24,38"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="0.8"
                    />
                    <polygon
                        points="50,12 88,33 80,70 50,90 18,66 14,32"
                        fill="rgba(0, 229, 255, 0.22)"
                        stroke="#00e5ff"
                        strokeWidth="1.5"
                    />
                </svg>
            </div>

            {/* PLANE Z-2 (+44px): Floating 3D Stat Bars with Cast Shadows */}
            <div
                style={{ transform: 'translateZ(44px)', transformStyle: 'preserve-3d' }}
                className="py-6 space-y-3.5 relative z-20"
            >
                {/* Stat 1 */}
                <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <div className="flex justify-between text-xs font-bold text-slate-200 mb-1.5">
                        <span>Goles / Partido</span>
                        <span className="text-emerald-400 font-black">2.4 avg</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full w-[92%] shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                    </div>
                </div>

                {/* Stat 2 */}
                <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <div className="flex justify-between text-xs font-bold text-slate-200 mb-1.5">
                        <span>Efectividad en Tiros</span>
                        <span className="text-blue-400 font-black">78%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full w-[78%] shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                    </div>
                </div>

                {/* Stat 3 */}
                <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <div className="flex justify-between text-xs font-bold text-slate-200 mb-1.5">
                        <span>Asistencias Clave</span>
                        <span className="text-indigo-400 font-black">11</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full w-[85%] shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                    </div>
                </div>

                {/* Stat 4 */}
                <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <div className="flex justify-between text-xs font-bold text-slate-200 mb-1.5">
                        <span>Índice Fair Play</span>
                        <span className="text-emerald-400 font-black">98/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-400 rounded-full w-[98%] shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                    </div>
                </div>
            </div>

            {/* PLANE Z-1.5 (+28px): Footer Telemetry Bar */}
            <div
                style={{ transform: 'translateZ(28px)' }}
                className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 relative z-20"
            >
                <span>Datos actualizados en vivo por LeagueOS</span>
                <span className="font-bold text-cyan-400 flex items-center gap-1">
                    Ficha Exportable a Instagram
                </span>
            </div>
        </Parallax25DCard>
    );
};

