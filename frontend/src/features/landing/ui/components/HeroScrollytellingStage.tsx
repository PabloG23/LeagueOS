import React, { useRef, useState, useEffect } from 'react';
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from 'framer-motion';
import {
    Zap,
    Play,
    ArrowRight,
    CheckCircle2,
    Bot,
    QrCode,
    ShieldCheck,
    Clock,
    BarChart3,
} from 'lucide-react';
import { ScrollyCanvasEngine } from './ScrollyCanvasEngine';

export interface HeroScrollytellingStageProps {
    heroDashboardImg: string;
}

const TOTAL_VIRTUAL_FRAMES = 120;

export const HeroScrollytellingStage: React.FC<HeroScrollytellingStageProps> = ({
    heroDashboardImg,
}) => {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const h1Ref = useRef<HTMLHeadingElement | null>(null);
    const revolucionaRef = useRef<HTMLSpanElement | null>(null);
    const lastMeasuredWidthRef = useRef<number>(0);
    const maxScrollDistanceRef = useRef<number>(1200);

    const [isMobile, setIsMobile] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Measured geometry so "REVOLUCIONA" translates to the exact horizontal & vertical center of the screen as it zooms
    const [revolucionaGeometry, setRevolucionaGeometry] = useState<{
        originX: string;
        originY: string;
        deltaX: number;
        deltaY: number;
    }>({
        originX: '50%',
        originY: '50%',
        deltaX: 0,
        deltaY: 0,
    });

    // Zero-dead-zone scroll progress starting immediately at window.scrollY = 0
    const rawScrollProgress = useMotionValue(0);
    const desktopSmoothProgress = useSpring(rawScrollProgress, {
        stiffness: 180,
        damping: 30,
        mass: 0.25,
        restDelta: 0.0005,
    });

    // On mobile touch screens, bind 1:1 to rawScrollProgress so there is zero delay when swiping in Chrome/Brave
    const activeProgress = isMobile ? rawScrollProgress : desktopSmoothProgress;

    useEffect(() => {
        const updateMetrics = (force = false) => {
            const currentW = window.innerWidth;
            const trackEl = trackRef.current;
            if (trackEl) {
                maxScrollDistanceRef.current = Math.max(
                    300,
                    trackEl.offsetHeight - window.innerHeight
                );
            }

            // Ignore vertical-only resize events from mobile Chrome/Brave URL bar hiding/showing
            if (!force && Math.abs(currentW - lastMeasuredWidthRef.current) < 8) {
                return;
            }
            lastMeasuredWidthRef.current = currentW;
            setIsMobile(currentW < 768);

            const h1El = h1Ref.current;
            const spanEl = revolucionaRef.current;
            if (!h1El || !spanEl) return;

            const h1W = h1El.offsetWidth;
            const h1H = h1El.offsetHeight;
            if (h1W <= 0 || h1H <= 0) return;

            const spanCenterX = spanEl.offsetLeft + spanEl.offsetWidth / 2;
            const spanCenterY = spanEl.offsetTop + spanEl.offsetHeight / 2;

            const h1CenterX = h1W / 2;
            const h1CenterY = h1H / 2;

            const ox = ((spanCenterX / h1W) * 100).toFixed(2) + '%';
            const oy = ((spanCenterY / h1H) * 100).toFixed(2) + '%';

            setRevolucionaGeometry({
                originX: ox,
                originY: oy,
                deltaX: h1CenterX - spanCenterX,
                deltaY: h1CenterY - spanCenterY,
            });
        };

        const handleScroll = () => {
            const y = window.scrollY || window.pageYOffset || 0;
            const maxDist = maxScrollDistanceRef.current;
            const p = Math.max(0, Math.min(1, y / maxDist));
            rawScrollProgress.set(p);
        };

        updateMetrics(true);
        handleScroll();

        const onResize = () => {
            updateMetrics(false);
            handleScroll();
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', onResize);
        };
    }, [rawScrollProgress]);

    // -------------------------------------------------------------------------
    // ACT 1 (0.00 -> 0.25): Immediate Fly-Through into "REVOLUCIONA" from first pixel of scroll
    // -------------------------------------------------------------------------
    const act1Opacity = useTransform(activeProgress, [0, 0.19, 0.25], [1, 1, 0]);
    const act1PointerEvents = useTransform(activeProgress, (v) =>
        v < 0.19 ? 'auto' : 'none'
    );

    // Top Shield + Badge part upward immediately as scroll begins
    const act1TopOpacity = useTransform(activeProgress, [0, 0.11], [1, 0]);
    const act1TopY = useTransform(activeProgress, [0, 0.12], [0, isMobile ? -70 : -110]);
    const act1TopScale = useTransform(activeProgress, [0, 0.12], [1, 0.86]);

    // Bottom Subtitle + CTAs part downward immediately as scroll begins
    const act1BottomOpacity = useTransform(activeProgress, [0, 0.11], [1, 0]);
    const act1BottomY = useTransform(activeProgress, [0, 0.12], [0, isMobile ? 70 : 110]);

    // Responsive zoom into REVOLUCIONA starting at 0.00 with zero dead zone
    const headlineScale = useTransform(
        activeProgress,
        [0, 0.12, 0.21, 0.25],
        isMobile ? [1, 1.38, 1.65, 1.85] : [1, 1.75, 2.35, 3.0]
    );
    const headlineX = useTransform(
        activeProgress,
        [0, 0.10, 0.25],
        [0, revolucionaGeometry.deltaX, revolucionaGeometry.deltaX]
    );
    const headlineY = useTransform(
        activeProgress,
        [0, 0.10, 0.25],
        [0, revolucionaGeometry.deltaY, revolucionaGeometry.deltaY]
    );
    const surroundingWordsOpacity = useTransform(
        activeProgress,
        [0, 0.09],
        [1, 0]
    );

    // -------------------------------------------------------------------------
    // ACT 2 (0.22 -> 0.54): Cancha Conectada
    // -------------------------------------------------------------------------
    const act2Opacity = useTransform(
        activeProgress,
        [0.20, 0.27, 0.47, 0.54],
        [0, 1, 1, 0]
    );
    const act2X = useTransform(
        activeProgress,
        [0.20, 0.27, 0.47, 0.54],
        isMobile ? [0, 0, 0, 0] : [-40, 0, 0, -30]
    );
    const act2Y = useTransform(
        activeProgress,
        [0.20, 0.27, 0.47, 0.54],
        isMobile ? [24, 0, 0, -20] : [0, 0, 0, 0]
    );
    const act2PointerEvents = useTransform(activeProgress, (v) =>
        v >= 0.22 && v < 0.52 ? 'auto' : 'none'
    );

    // -------------------------------------------------------------------------
    // ACT 3 (0.52 -> 0.82): Control de Liguilla & Credenciales
    // -------------------------------------------------------------------------
    const act3Opacity = useTransform(
        activeProgress,
        [0.50, 0.57, 0.75, 0.82],
        [0, 1, 1, 0]
    );
    const act3X = useTransform(
        activeProgress,
        [0.50, 0.57, 0.75, 0.82],
        isMobile ? [0, 0, 0, 0] : [40, 0, 0, 30]
    );
    const act3Y = useTransform(
        activeProgress,
        [0.50, 0.57, 0.75, 0.82],
        isMobile ? [24, 0, 0, -20] : [0, 0, 0, 0]
    );
    const act3PointerEvents = useTransform(activeProgress, (v) =>
        v >= 0.52 && v < 0.80 ? 'auto' : 'none'
    );

    // -------------------------------------------------------------------------
    // ACT 4 (0.80 -> 1.00): 4 High-Contrast KPI Cards over Clean Stadium Sky
    // -------------------------------------------------------------------------
    const act4Opacity = useTransform(activeProgress, [0.78, 0.86, 1], [0, 1, 1]);
    const act4Y = useTransform(activeProgress, [0.78, 0.86, 1], [28, 0, 0]);
    const act4Scale = useTransform(activeProgress, [0.78, 0.86, 1], [0.96, 1, 1]);
    const act4PointerEvents = useTransform(activeProgress, (v) =>
        v >= 0.80 ? 'auto' : 'none'
    );

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isMobile || e.pointerType === 'touch') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePos({ x: nx, y: ny });
    };

    const handlePointerLeave = () => {
        if (isMobile) return;
        setMousePos({ x: 0, y: 0 });
    };

    return (
        <section
            ref={trackRef}
            className="relative h-[250svh] lg:h-[360vh] w-full select-none"
            aria-label="Presentación Interactiva LeagueOS Scrollytelling"
        >
            <div
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                style={{ perspective: isMobile ? undefined : '1200px' }}
                className="sticky top-20 h-[calc(100svh-5rem)] min-h-[480px] sm:min-h-[580px] w-full overflow-hidden"
            >
                {/* ----------------------------------------------------------------- */}
                {/* PLANE Z-0 & Z-1: GPU-ACCELERATED STADIUM STAGE ENGINE             */}
                {/* ----------------------------------------------------------------- */}
                <div className="absolute inset-0 z-0">
                    <ScrollyCanvasEngine
                        scrollProgress={activeProgress}
                        heroImageSrc={heroDashboardImg}
                        totalFrames={TOTAL_VIRTUAL_FRAMES}
                        mouseX={isMobile ? 0 : mousePos.x}
                        mouseY={isMobile ? 0 : mousePos.y}
                    />
                </div>

                {/* ================================================================= */}
                {/* ACT 01 (0% - 25%): EL KICKOFF — FLY-THROUGH INTO "REVOLUCIONA"    */}
                {/* ================================================================= */}
                <motion.div
                    style={{
                        opacity: act1Opacity,
                        pointerEvents: act1PointerEvents,
                    }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pb-6 sm:pb-12"
                >
                    <div
                        style={{
                            transform: isMobile
                                ? undefined
                                : `translate3d(${mousePos.x * 12}px, ${mousePos.y * 8}px, 50px)`,
                        }}
                        className="max-w-4xl mx-auto flex flex-col items-center text-center"
                    >
                        {/* Top Group: Shield & Badge (Parts upward as camera zooms in) */}
                        <motion.div
                            style={{
                                opacity: act1TopOpacity,
                                y: act1TopY,
                                scale: act1TopScale,
                            }}
                            className="flex flex-col items-center"
                        >
                            <div className="relative flex items-center justify-center mb-2 sm:mb-3">
                                <div className="absolute w-28 h-28 sm:w-48 sm:h-48 bg-gradient-to-tr from-blue-600/45 via-cyan-400/30 to-emerald-400/20 rounded-full blur-2xl sm:blur-3xl pointer-events-none" />
                                <img
                                    src="/league_logo_transparent.png"
                                    alt="Escudo Oficial LeagueOS"
                                    className="relative w-20 h-20 sm:w-40 sm:h-40 object-contain filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]"
                                />
                            </div>

                            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#060913]/90 border border-cyan-500/40 text-cyan-300 text-[11px] sm:text-sm font-bold shadow-xl mb-3 sm:mb-5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                <span className="truncate max-w-[260px] sm:max-w-none">
                                    Potenciando ligas deportivas con IA
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </div>
                        </motion.div>

                        {/* Main Headline: Dramatic Fly-Through centered directly on "REVOLUCIONA" */}
                        <motion.h1
                            ref={h1Ref}
                            style={{
                                x: headlineX,
                                y: headlineY,
                                scale: headlineScale,
                                transformOrigin: `${revolucionaGeometry.originX} ${revolucionaGeometry.originY}`,
                            }}
                            className="relative text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase will-change-transform"
                        >
                            <motion.span style={{ opacity: surroundingWordsOpacity }}>
                                El Sistema Operativo que{' '}
                            </motion.span>
                            <span
                                ref={revolucionaRef}
                                className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400"
                            >
                                Revoluciona
                            </span>{' '}
                            <motion.span style={{ opacity: surroundingWordsOpacity }}>
                                tu Liga Deportiva
                            </motion.span>
                        </motion.h1>

                        {/* Bottom Group: Subtitle & CTAs (Parts downward as camera zooms into REVOLUCIONA) */}
                        <motion.div
                            style={{
                                opacity: act1BottomOpacity,
                                y: act1BottomY,
                            }}
                            className="flex flex-col items-center"
                        >
                            <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-slate-200 font-normal leading-relaxed max-w-2xl mx-auto px-1">
                                Elimina el caos de las inscripciones en papel y las hojas de Excel. Genera{' '}
                                <strong className="text-white font-semibold">
                                    estadísticas ultra-finas a la medida
                                </strong>
                                , cédulas arbitrales digitales en vivo y automatizaciones con{' '}
                                <strong className="text-emerald-400 font-semibold">
                                    Inteligencia Artificial
                                </strong>
                                .
                            </p>

                            <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
                                <a
                                    href="#contacto"
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-base uppercase tracking-wider rounded-2xl shadow-2xl shadow-blue-600/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                                    <span>Agendar Demo Gratis</span>
                                </a>
                                <a
                                    href="#clientes"
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#060913]/90 hover:bg-slate-900 text-white font-bold text-xs sm:text-base rounded-2xl border border-white/25 shadow-2xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                                    <span>Ver Ligas en Vivo</span>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* ================================================================= */}
                {/* ACT 02 (22% - 54%): CANCHA CONECTADA                              */}
                {/* ================================================================= */}
                <motion.div
                    style={{
                        opacity: act2Opacity,
                        x: act2X,
                        y: act2Y,
                        pointerEvents: act2PointerEvents,
                    }}
                    className="absolute inset-0 z-20 flex items-center justify-center px-4 sm:px-8 lg:px-12 pb-6 sm:pb-12"
                >
                    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                        {/* Left Column (5 cols): Narrative Card */}
                        <div
                            style={{
                                transform: isMobile
                                    ? undefined
                                    : `translate3d(${mousePos.x * 10}px, ${mousePos.y * 8}px, 50px) rotateY(${mousePos.x * 3}deg) rotateX(${-mousePos.y * 3}deg)`,
                            }}
                            className="lg:col-span-5 p-5 sm:p-7 rounded-3xl bg-[#060913]/95 border border-cyan-400/45 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-3.5 sm:space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[11px] sm:text-xs font-black uppercase tracking-wider border border-cyan-500/30">
                                    <QrCode className="w-3.5 h-3.5" /> 02 · Cancha Conectada
                                </span>
                                <span className="text-[11px] sm:text-xs font-black text-emerald-400 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    EN VIVO
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight">
                                Del Silbatazo Final a la Tabla en{' '}
                                <span className="text-cyan-400">Segundos</span>
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                El árbitro captura goles, tarjetas y penales desde su celular o sube la foto de la cédula firmada. Al confirmar, las tablas de posiciones y goleo se actualizan solas.
                            </p>

                            {/* Compact Mobile Preview Strip (Visible on Mobile & Tablet < lg) */}
                            <div className="lg:hidden p-3.5 rounded-2xl bg-slate-900/95 border border-white/15 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-cyan-300">
                                    <span>Cédula Digital · Jornada 12</span>
                                    <span className="text-emerald-400">✓ Verificada</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-950/90 border border-white/10">
                                    <span className="text-xs font-black text-white">GALÁCTICOS FC</span>
                                    <span className="text-base font-black text-emerald-400 font-['Orbitron',sans-serif]">
                                        3 - 2
                                    </span>
                                    <span className="text-xs font-black text-white">REAL SAN LUCAS</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-300">
                                    <span>⚽ C. Ruiz (2) · 🟨 M. Hernández</span>
                                    <span className="text-emerald-400 font-bold">+3 Pts al instante</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    0% actas extraviadas
                                </span>
                                <a
                                    href="#contacto"
                                    className="font-black text-cyan-400 hover:text-cyan-300 flex items-center gap-1 uppercase tracking-wider"
                                >
                                    <span>Agendar Demo</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>

                        {/* Right Column (7 cols on Desktop): Real LeagueOS Match Sheet & Quick Score Showcase */}
                        <div
                            style={{
                                transform: isMobile
                                    ? undefined
                                    : `translate3d(${mousePos.x * -14}px, ${mousePos.y * -10}px, 75px) rotateY(${mousePos.x * -4}deg) rotateX(${mousePos.y * 3}deg)`,
                            }}
                            className="hidden lg:block lg:col-span-7 p-6 rounded-3xl bg-[#060913]/95 border border-white/20 shadow-[0_35px_90px_rgba(0,0,0,0.95)] space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-black uppercase tracking-widest text-cyan-400">
                                        Asistente de Cédula Digital · Jornada 12
                                    </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-black text-emerald-300">
                                    CÉDULA VERIFICADA
                                </span>
                            </div>

                            <div className="grid grid-cols-3 items-center text-center py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-emerald-950/80 border border-white/15">
                                <div>
                                    <div className="text-[11px] font-bold text-blue-300 uppercase">Local</div>
                                    <div className="text-lg font-black text-white mt-0.5">GALÁCTICOS FC</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-emerald-400 font-['Orbitron',sans-serif]">
                                        3 - 2
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                        Finalizado · Cancha 1
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold text-emerald-300 uppercase">Visita</div>
                                    <div className="text-lg font-black text-white mt-0.5">REAL SAN LUCAS</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-xs">
                                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        Goles y Disciplina Capturados
                                    </div>
                                    <div className="flex justify-between text-slate-200 py-1 border-b border-white/5">
                                        <span>⚽ Carlos Ruiz (#10)</span>
                                        <span className="text-emerald-400 font-bold">2 Goles</span>
                                    </div>
                                    <div className="flex justify-between text-slate-200 py-1 border-b border-white/5">
                                        <span>🟨 M. Hernández (#4)</span>
                                        <span className="text-amber-400 font-bold">Amonestación</span>
                                    </div>
                                    <div className="flex justify-between text-slate-200 py-1">
                                        <span>📄 Hoja de Partido PDF</span>
                                        <span className="text-cyan-400 font-bold">Lista</span>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-slate-900 to-blue-950/70 border border-cyan-400/35 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                                            Evidencia en Campo
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                                            ✓ FIRMADA
                                        </span>
                                    </div>
                                    <div className="my-2 text-xs text-slate-200 leading-relaxed">
                                        Foto de cédula física adjunta desde el móvil del árbitro + actualización inmediata de la tabla general.
                                    </div>
                                    <div className="text-[11px] font-black text-emerald-400">
                                        +3 Pts aplicados automáticamente
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ================================================================= */}
                {/* ACT 03 (52% - 82%): CONTROL DE LIGUILLA & CREDENCIALES            */}
                {/* ================================================================= */}
                <motion.div
                    style={{
                        opacity: act3Opacity,
                        x: act3X,
                        y: act3Y,
                        pointerEvents: act3PointerEvents,
                    }}
                    className="absolute inset-0 z-20 flex items-center justify-center px-4 sm:px-8 lg:px-12 pb-6 sm:pb-12"
                >
                    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                        {/* Left Column (7 cols on Desktop): Real LeagueOS Regla de Liguilla, Credenciales PDF & Brackets */}
                        <div
                            style={{
                                transform: isMobile
                                    ? undefined
                                    : `translate3d(${mousePos.x * -14}px, ${mousePos.y * -10}px, 75px) rotateY(${mousePos.x * 4}deg) rotateX(${-mousePos.y * 3}deg)`,
                            }}
                            className="hidden lg:block lg:col-span-7 p-6 rounded-3xl bg-[#060913]/95 border border-emerald-400/35 shadow-[0_35px_90px_rgba(0,0,0,0.95)] space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                                        Regla de Liguilla &amp; Credenciales PDF
                                    </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-[11px] font-black text-cyan-300">
                                    MÍNIMO: 6 PARTIDOS JUGADOS
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 text-xs">
                                <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        Filtro Automático para Finales
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                                        <div>
                                            <div className="font-bold text-white">Carlos Ruiz (#10)</div>
                                            <div className="text-[10px] text-slate-400">9 PJ · CURP Verificado</div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px] border border-emerald-500/30">
                                            ELEGIBLE
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5">
                                        <div>
                                            <div className="font-bold text-slate-300">J. Morales (#19)</div>
                                            <div className="text-[10px] text-slate-500">3 PJ · Faltan 3 partidos</div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/30">
                                            PENDIENTE
                                        </span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/75 via-slate-900 to-indigo-950/75 border border-emerald-400/35 flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                            Credenciales &amp; Liguilla
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-black">
                                            PDF OFICIAL
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-200 leading-relaxed my-2">
                                        Descarga las credenciales de todo el equipo con fotografía, folio y escudo en 1 clic, y publica el bracket de Cuartos, Semifinal y Final.
                                    </p>
                                    <div className="text-[11px] font-bold text-cyan-400">
                                        ✓ Traspasos e historial por temporada
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (5 cols): Narrative Card */}
                        <div
                            style={{
                                transform: isMobile
                                    ? undefined
                                    : `translate3d(${mousePos.x * 10}px, ${mousePos.y * 8}px, 50px) rotateY(${-mousePos.x * 3}deg) rotateX(${-mousePos.y * 3}deg)`,
                            }}
                            className="lg:col-span-5 p-5 sm:p-7 rounded-3xl bg-[#060913]/95 border border-emerald-400/45 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-3.5 sm:space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] sm:text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                                    <ShieldCheck className="w-3.5 h-3.5" /> 03 · Control de Liguilla &amp; Credenciales
                                </span>
                                <span className="text-[11px] sm:text-xs font-black text-cyan-400">
                                    CERO CACHIRULES
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight">
                                Elegibilidad de Liguilla y{' '}
                                <span className="text-emerald-400">Credenciales PDF</span>
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                Define el mínimo de partidos jugados para calificar a finales y detecta al instante quiénes cumplen la{' '}
                                <strong className="text-white">Regla de Liguilla</strong>. Descarga credenciales en PDF con foto, CURP y dorsal, y publica las llaves de Playoffs o Copa en vivo.
                            </p>

                            {/* Compact Mobile Preview Strip (Visible on Mobile & Tablet < lg) */}
                            <div className="lg:hidden p-3.5 rounded-2xl bg-slate-900/95 border border-white/15 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                    <span>Regla de Liguilla · Mín. 6 PJ</span>
                                    <span className="text-cyan-300">Credenciales PDF</span>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-white/5 text-xs">
                                    <span className="font-bold text-white">Carlos Ruiz (#10) · 9 PJ</span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px]">
                                        ELEGIBLE
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-1 text-xs">
                                    <span className="font-bold text-slate-300">J. Morales (#19) · 3 PJ</span>
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px]">
                                        PENDIENTE
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    Llaves de Liguilla y Copa
                                </span>
                                <a
                                    href="#estadisticas"
                                    className="font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 uppercase tracking-wider"
                                >
                                    <span>Ver Más</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ================================================================= */}
                {/* ACT 04 (78% - 100%): CLEAN 4 KPI CARDS OVER CLEAN STADIUM SKY     */}
                {/* ================================================================= */}
                <motion.div
                    style={{
                        opacity: act4Opacity,
                        y: act4Y,
                        scale: act4Scale,
                        pointerEvents: act4PointerEvents,
                    }}
                    className="absolute inset-0 z-20 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-6 sm:pb-12"
                >
                    <div
                        style={{
                            transform: isMobile
                                ? undefined
                                : `translate3d(${mousePos.x * 12}px, ${mousePos.y * 8}px, 60px)`,
                        }}
                        className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6"
                    >
                        <div className="text-center max-w-2xl mx-auto space-y-1.5 sm:space-y-2">
                            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#060913]/95 border border-blue-500/40 text-[11px] sm:text-xs font-black uppercase tracking-widest text-cyan-300">
                                04 · Impacto Comprobado
                            </span>
                            <h2 className="text-2xl sm:text-5xl font-black text-white uppercase tracking-tight">
                                Resultados desde la{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                                    Jornada 1
                                </span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#060913]/95 border border-blue-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-center space-y-1.5 sm:space-y-2">
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mx-auto" />
                                <div className="text-2xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
                                    -92%
                                </div>
                                <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wider">
                                    Tiempo en Registro
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#060913]/95 border border-emerald-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-center space-y-1.5 sm:space-y-2">
                                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mx-auto" />
                                <div className="text-2xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
                                    +150
                                </div>
                                <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wider">
                                    Métricas a la Medida
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#060913]/95 border border-amber-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-center space-y-1.5 sm:space-y-2">
                                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mx-auto" />
                                <div className="text-2xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-300">
                                    100%
                                </div>
                                <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wider">
                                    Cédulas en Vivo
                                </div>
                            </div>

                            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#060913]/95 border border-purple-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-center space-y-1.5 sm:space-y-2">
                                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mx-auto" />
                                <div className="text-2xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
                                    24/7
                                </div>
                                <div className="text-[11px] sm:text-sm font-black text-white uppercase tracking-wider">
                                    Automatización con IA
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
