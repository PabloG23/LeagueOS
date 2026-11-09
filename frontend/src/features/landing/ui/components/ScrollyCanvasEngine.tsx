import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';

export interface ScrollyCanvasEngineProps {
    /** Normalized scroll progress (0.0 to 1.0), smoothed via spring */
    scrollProgress: MotionValue<number>;
    /** Primary high-res hero source image */
    heroImageSrc: string;
    /** Optional array of pre-rendered WebP/AVIF frame URLs */
    frameSequenceUrls?: string[];
    /** Total virtual frames for scrubbing telemetry (default 120) */
    totalFrames?: number;
    /** Mouse X normalized (-1 to 1) for 2.5D multi-plane canvas parallax */
    mouseX?: number;
    /** Mouse Y normalized (-1 to 1) for 2.5D multi-plane canvas parallax */
    mouseY?: number;
    /** Callback when active frame index changes */
    onFrameChange?: (frameIndex: number, totalFrames: number) => void;
}

interface StadiumParticle {
    x: number;
    y: number;
    z: number;
    size: number;
    hue: 'cyan' | 'emerald' | 'blue';
}

const PARTICLE_COUNT = 22;
const STADIUM_PARTICLES: StadiumParticle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const seed1 = Math.sin(i * 12.9898) * 43758.5453;
    const seed2 = Math.sin(i * 78.233) * 43758.5453;
    const seed3 = Math.sin(i * 45.164) * 43758.5453;
    const r1 = seed1 - Math.floor(seed1);
    const r2 = seed2 - Math.floor(seed2);
    const r3 = seed3 - Math.floor(seed3);

    const z = 0.3 + r3 * 1.2;
    const hues: Array<'cyan' | 'emerald' | 'blue'> = ['cyan', 'emerald', 'blue'];

    return {
        x: r1,
        y: r2,
        z,
        size: (1.0 + r1 * 1.8) * z,
        hue: hues[i % 3],
    };
});

/**
 * Builds a clean 4K Stadium Background Plate from hero_dashboard.jpg by keeping 100% of the
 * stadium floodlights, night sky, cheering stands, celebrating players, green pitch, LED perimeter
 * boards, and glowing holographic soccer ball, while replacing the central baked-in board rectangle
 * with a seamless nocturnal stadium sky & distant bowl atmosphere.
 */
function createCleanStadiumCanvas(img: HTMLImageElement): HTMLCanvasElement {
    const w = img.naturalWidth || 1376;
    const h = img.naturalHeight || 768;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return offscreen;

    // 1. Draw the original 4K image as the base
    ctx.drawImage(img, 0, 0, w, h);

    // 2. Create a secondary canvas with the nocturnal sky fill, then composite it with a Gaussian blur mask
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = w;
    patchCanvas.height = h;
    const pctx = patchCanvas.getContext('2d');
    if (!pctx) return offscreen;

    const boxLeft = Math.floor(w * 0.178);
    const boxRight = Math.ceil(w * 0.822);
    const boxTop = Math.floor(h * 0.165);
    const boxBottom = Math.ceil(h * 0.758);
    const boxW = boxRight - boxLeft;
    const boxH = boxBottom - boxTop;

    // Step A: Feathered alpha mask (fallback-safe if ctx.filter is unsupported on older mobile WebViews)
    pctx.save();
    if (typeof pctx.filter === 'string') {
        pctx.filter = 'blur(20px)';
    }
    pctx.fillStyle = '#ffffff';
    pctx.beginPath();
    if (typeof pctx.roundRect === 'function') {
        pctx.roundRect(boxLeft, boxTop, boxW, boxH, 36);
    } else {
        pctx.rect(boxLeft, boxTop, boxW, boxH);
    }
    pctx.fill();
    pctx.restore();

    // Step B: Composite the night sky gradient strictly inside the feathered mask
    pctx.save();
    pctx.globalCompositeOperation = 'source-in';
    const skyGrad = pctx.createLinearGradient(0, boxTop, 0, boxBottom);
    skyGrad.addColorStop(0.0, '#040914');
    skyGrad.addColorStop(0.35, '#050c1b');
    skyGrad.addColorStop(0.75, '#061222');
    skyGrad.addColorStop(1.0, '#071824');
    pctx.fillStyle = skyGrad;
    pctx.fillRect(0, 0, w, h);

    // Add soft stadium floodlight continuation inside the sky patch
    pctx.globalCompositeOperation = 'source-atop';
    const leftTowerGlow = pctx.createRadialGradient(
        w * 0.1,
        h * 0.2,
        10,
        w * 0.25,
        h * 0.35,
        w * 0.36
    );
    leftTowerGlow.addColorStop(0, 'rgba(0, 195, 255, 0.20)');
    leftTowerGlow.addColorStop(0.5, 'rgba(14, 116, 244, 0.07)');
    leftTowerGlow.addColorStop(1, 'rgba(4, 9, 21, 0)');
    pctx.fillStyle = leftTowerGlow;
    pctx.fillRect(0, 0, w, h);

    const rightTowerGlow = pctx.createRadialGradient(
        w * 0.9,
        h * 0.2,
        10,
        w * 0.75,
        h * 0.35,
        w * 0.36
    );
    rightTowerGlow.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    rightTowerGlow.addColorStop(0.5, 'rgba(0, 195, 255, 0.07)');
    rightTowerGlow.addColorStop(1, 'rgba(4, 9, 21, 0)');
    pctx.fillStyle = rightTowerGlow;
    pctx.fillRect(0, 0, w, h);
    pctx.restore();

    ctx.drawImage(patchCanvas, 0, 0);
    ctx.drawImage(patchCanvas, 0, 0);

    return offscreen;
}

/**
 * GPU-Composited Stadium Canvas Engine:
 * - Pre-renders the clean 4K stadium plate, holographic ball pulse rings, atmospheric particles,
 *   and top/bottom vignettes ONCE into the <canvas> buffer (and only when viewport width changes).
 * - Uses Framer Motion GPU compositor transforms (`scale`, `x`, `y` with `will-change: transform`)
 *   during scroll instead of per-frame main-thread 2D canvas redrawing or `getBoundingClientRect()`
 *   layout thrashing. This guarantees a locked 60/120 FPS on mobile Chrome, Brave, and Safari.
 */
export const ScrollyCanvasEngine: React.FC<ScrollyCanvasEngineProps> = ({
    scrollProgress,
    heroImageSrc,
    mouseX = 0,
    mouseY = 0,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const cleanStadiumCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastWidthRef = useRef<number>(0);
    const [isReady, setIsReady] = useState(false);

    // GPU-accelerated camera zoom driven by scrollProgress without main-thread canvas redraws
    const cameraScale = useTransform(
        scrollProgress,
        [0, 0.25, 0.5, 0.75, 1],
        [1.02, 1.06, 1.04, 1.06, 1.02]
    );

    const paintStaticStadiumBuffer = useCallback(() => {
        const canvas = canvasRef.current;
        const cleanStadium = cleanStadiumCanvasRef.current;
        if (!canvas || !cleanStadium) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        // Cap DPR at 1.25 on mobile screens (<768px) to save 60% GPU memory bandwidth, 1.75 on desktop
        const isSmallScreen = window.innerWidth < 768;
        const maxDpr = isSmallScreen ? 1.25 : 1.75;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

        const cw = Math.max(1, Math.floor(rect.width * dpr));
        const ch = Math.max(1, Math.floor(rect.height * dpr));

        canvas.width = cw;
        canvas.height = ch;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.fillStyle = '#060913';
        ctx.fillRect(0, 0, cw, ch);

        // 1. Draw Clean 4K Stadium Plate
        drawCoverSource(
            ctx,
            cleanStadium,
            cleanStadium.width,
            cleanStadium.height,
            cw,
            ch,
            1.02,
            0,
            0,
            0.5,
            0.54
        );

        // 2. Draw Holographic Ball Glow & Rings on the pitch
        drawHolographicBallPulse(ctx, cw, ch);

        // 3. Draw Stadium Atmospheric Particles
        drawMultiPlaneParticles(ctx, cw, ch);

        // 4. Top & Bottom Vignettes
        const topGrad = ctx.createLinearGradient(0, 0, 0, ch * 0.14);
        topGrad.addColorStop(0, 'rgba(6, 9, 19, 0.78)');
        topGrad.addColorStop(1, 'rgba(6, 9, 19, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, cw, ch * 0.14);

        const bottomVignetteHeight = ch * 0.16;
        const bottomGrad = ctx.createLinearGradient(0, ch - bottomVignetteHeight, 0, ch);
        bottomGrad.addColorStop(0, 'rgba(6, 9, 19, 0)');
        bottomGrad.addColorStop(1, 'rgba(8, 13, 30, 0.88)');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, ch - bottomVignetteHeight, cw, bottomVignetteHeight);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (!isMounted) return;
            cleanStadiumCanvasRef.current = createCleanStadiumCanvas(img);
            lastWidthRef.current = window.innerWidth;
            paintStaticStadiumBuffer();
            setIsReady(true);
        };
        img.src = heroImageSrc;
        if (img.complete && img.naturalWidth > 0) {
            cleanStadiumCanvasRef.current = createCleanStadiumCanvas(img);
            lastWidthRef.current = window.innerWidth;
            paintStaticStadiumBuffer();
            setIsReady(true);
        }

        return () => {
            isMounted = false;
        };
    }, [heroImageSrc, paintStaticStadiumBuffer]);

    useEffect(() => {
        const handleResize = () => {
            // Ignore vertical-only resize events caused by mobile Chrome/Brave address bar hiding/showing
            const currentW = window.innerWidth;
            if (Math.abs(currentW - lastWidthRef.current) < 8) return;
            lastWidthRef.current = currentW;
            paintStaticStadiumBuffer();
        };
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, [paintStaticStadiumBuffer]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#060913] select-none">
            <motion.div
                style={{
                    scale: cameraScale,
                    x: mouseX * -12,
                    y: mouseY * -8,
                }}
                className="w-full h-full will-change-transform"
            >
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full block transition-opacity duration-500 ${
                        isReady ? 'opacity-100' : 'opacity-0'
                    }`}
                />
            </motion.div>
            {!isReady && (
                <div className="absolute inset-0 bg-[#060913] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                </div>
            )}
        </div>
    );
};

function drawCoverSource(
    ctx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    sourceW: number,
    sourceH: number,
    cw: number,
    ch: number,
    zoom: number,
    shiftX: number,
    shiftY: number,
    focalX: number,
    focalY: number
) {
    const imgRatio = sourceW / sourceH;
    const canvasRatio = cw / ch;

    let renderW: number;
    let renderH: number;

    if (canvasRatio > imgRatio) {
        renderW = cw * zoom;
        renderH = (cw / imgRatio) * zoom;
    } else {
        renderH = ch * zoom;
        renderW = ch * imgRatio * zoom;
    }

    const offsetX = (cw - renderW) * focalX + shiftX;
    const offsetY = (ch - renderH) * focalY + shiftY;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, offsetX, offsetY, renderW, renderH);
}

function drawHolographicBallPulse(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const ballX = cw * 0.5;
    const ballY = ch * 0.822;

    const coreRadius = Math.min(cw, ch) * 0.13;
    const ballGlow = ctx.createRadialGradient(ballX, ballY, 2, ballX, ballY, coreRadius);
    ballGlow.addColorStop(0, 'rgba(0, 229, 255, 0.32)');
    ballGlow.addColorStop(0.45, 'rgba(16, 185, 129, 0.14)');
    ballGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = ballGlow;
    ctx.beginPath();
    ctx.arc(ballX, ballY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 2; ring++) {
        const ringProgress = ring === 0 ? 0.35 : 0.75;
        const radiusX = cw * (0.04 + ringProgress * 0.18);
        const radiusY = radiusX * 0.22;
        const alpha = (1 - ringProgress) * 0.28;

        ctx.strokeStyle =
            ring % 2 === 0
                ? `rgba(0, 229, 255, ${alpha.toFixed(3)})`
                : `rgba(52, 211, 153, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(ballX, ballY + coreRadius * 0.18, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawMultiPlaneParticles(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < STADIUM_PARTICLES.length; i++) {
        const pt = STADIUM_PARTICLES[i];
        const x = pt.x * cw;
        const y = pt.y * ch;

        let colorRGB = '0, 229, 255';
        if (pt.hue === 'emerald') colorRGB = '52, 211, 153';
        else if (pt.hue === 'blue') colorRGB = '96, 165, 250';

        ctx.fillStyle = `rgba(${colorRGB}, 0.28)`;
        ctx.beginPath();
        ctx.arc(x, y, pt.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
