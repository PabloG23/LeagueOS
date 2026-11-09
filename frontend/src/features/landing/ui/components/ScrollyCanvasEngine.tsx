import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MotionValue, useMotionValueEvent } from 'framer-motion';

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
    phase: number;
    speedX: number;
    speedY: number;
}

const PARTICLE_COUNT = 26;
const STADIUM_PARTICLES: StadiumParticle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const seed1 = Math.sin(i * 12.9898) * 43758.5453;
    const seed2 = Math.sin(i * 78.233) * 43758.5453;
    const seed3 = Math.sin(i * 45.164) * 43758.5453;
    const r1 = seed1 - Math.floor(seed1);
    const r2 = seed2 - Math.floor(seed2);
    const r3 = seed3 - Math.floor(seed3);

    const z = 0.3 + r3 * 1.3;
    const hues: Array<'cyan' | 'emerald' | 'blue'> = ['cyan', 'emerald', 'blue'];

    return {
        x: r1,
        y: r2,
        z,
        size: (1.0 + r1 * 2.0) * z,
        hue: hues[i % 3],
        phase: r2 * Math.PI * 2,
        speedX: (r1 - 0.5) * 0.14 * z,
        speedY: (-0.06 - r2 * 0.16) * z,
    };
});

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

/**
 * Builds a clean 4K Stadium Background Plate from hero_dashboard.jpg by keeping 100% of the
 * stadium floodlights, night sky, cheering stands, celebrating players, green pitch, LED perimeter
 * boards, and glowing holographic soccer ball, while replacing the central baked-in board rectangle
 * (x: 18.5%..81.5%, y: 18.0%..76.0%) with a seamless nocturnal stadium sky & distant bowl atmosphere.
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

    // 2. Create a secondary canvas with the nocturnal sky fill, then composite it with a 28px Gaussian blur mask
    //    so there is ZERO rectangular seam on top, bottom, left, or right!
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

    // Step A: Create feathered alpha mask using canvas filter blur
    pctx.save();
    pctx.filter = 'blur(22px)';
    pctx.fillStyle = '#ffffff';
    pctx.beginPath();
    pctx.roundRect(boxLeft, boxTop, boxW, boxH, 36);
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
        w * 0.10,
        h * 0.20,
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
        w * 0.90,
        h * 0.20,
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

    // Draw the seamlessly feathered patch onto the main stadium canvas (twice to ensure 100% opacity in the core)
    ctx.drawImage(patchCanvas, 0, 0);
    ctx.drawImage(patchCanvas, 0, 0);

    return offscreen;
}

export const ScrollyCanvasEngine: React.FC<ScrollyCanvasEngineProps> = ({
    scrollProgress,
    heroImageSrc,
    frameSequenceUrls,
    totalFrames = 120,
    mouseX = 0,
    mouseY = 0,
    onFrameChange,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const heroImgRef = useRef<HTMLImageElement | null>(null);
    const cleanStadiumCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const sequenceFramesRef = useRef<Array<HTMLImageElement | null>>([]);
    const [isReady, setIsReady] = useState(false);

    const progressRef = useRef<number>(clamp(scrollProgress.get() || 0, 0, 1));
    const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const rafIdRef = useRef<number | null>(null);
    const lastReportedFrameRef = useRef<number>(-1);

    const renderFrame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            const targetW = Math.max(1, Math.floor(rect.width * dpr));
            const targetH = Math.max(1, Math.floor(rect.height * dpr));
            if (canvas.width !== targetW || canvas.height !== targetH) {
                canvas.width = targetW;
                canvas.height = targetH;
            }
        }

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const cw = canvas.width;
        const ch = canvas.height;
        if (cw <= 1 || ch <= 1) return;

        const p = progressRef.current; // 0.0 -> 1.0
        const mx = mouseRef.current.x; // -1 -> 1
        const my = mouseRef.current.y; // -1 -> 1

        ctx.fillStyle = '#060913';
        ctx.fillRect(0, 0, cw, ch);

        // MODE A: External Pre-rendered WebP Sequence Scrubbing
        if (frameSequenceUrls && frameSequenceUrls.length > 0) {
            const seqLen = frameSequenceUrls.length;
            const targetIdx = clamp(Math.round(p * (seqLen - 1)), 0, seqLen - 1);
            let frameImg = sequenceFramesRef.current[targetIdx];
            if (!frameImg) {
                for (let offset = 1; offset < seqLen; offset++) {
                    if (targetIdx - offset >= 0 && sequenceFramesRef.current[targetIdx - offset]) {
                        frameImg = sequenceFramesRef.current[targetIdx - offset];
                        break;
                    }
                    if (targetIdx + offset < seqLen && sequenceFramesRef.current[targetIdx + offset]) {
                        frameImg = sequenceFramesRef.current[targetIdx + offset];
                        break;
                    }
                }
            }
            if (frameImg) {
                drawCoverSource(
                    ctx,
                    frameImg,
                    imgNaturalW(frameImg),
                    imgNaturalH(frameImg),
                    cw,
                    ch,
                    1.04,
                    mx * 12,
                    my * 8,
                    0.5,
                    0.5
                );
            }
            return;
        }

        // MODE B: Non-Overlapping Multi-Plane Scrollytelling Engine
        const img = heroImgRef.current;
        const cleanStadium = cleanStadiumCanvasRef.current;
        if (!img || !cleanStadium) return;

        // ---------------------------------------------------------------------
        // NON-OVERLAPPING 4-ACT CHOREOGRAPHY:
        // - Base Layer (Always visible): The Clean 4K Stadium + Glowing Ball on the pitch!
        //   Zero baked-in dashboard clutter in the middle sky!
        // - Act 1 (0.00 - 0.25): Clean Stadium in background; Kickoff Title in the center sky.
        // - Act 2 (0.25 - 0.54): Text Card is on the LEFT (x: 5%..42%).
        //                        On the RIGHT (x: 46%..95%), the <canvas> draws ONLY the
        //                        Live Match Portal Slice ("LONDON FC 2 - 1 MADRID CITY")!
        //                        -> Zero overlap between Left Text and Right Visual!
        // - Act 3 (0.54 - 0.82): On the LEFT (x: 5%..54%), the <canvas> draws ONLY the
        //                        Player Radar + Heatmap + AI Insights Portal Slice!
        //                        Text Card is on the RIGHT (x: 58%..95%)!
        //                        -> Zero overlap between Left Visual and Right Text!
        // - Act 4 (0.82 - 1.00): Clean Stadium in background; 4 KPI Cards in center sky.
        // ---------------------------------------------------------------------
        const cameraZoom = 1.03 + Math.sin(p * Math.PI) * 0.04;
        const focalX = 0.5;
        const focalY = 0.54;
        const parallaxX = mx * -14;
        const parallaxY = my * -9;

        // 1. Draw the Clean 4K Stadium Plate (Floodlights + Crowd + Turf + Glowing Ball, NO center board)
        ctx.save();
        drawCoverSource(
            ctx,
            cleanStadium,
            cleanStadium.width,
            cleanStadium.height,
            cw,
            ch,
            cameraZoom,
            parallaxX,
            parallaxY,
            focalX,
            focalY
        );
        ctx.restore();

        // 2. Holographic Ball Pulse Rings on the turf
        drawHolographicBallPulse(ctx, cw, ch, p, focalY, cameraZoom, mx, my);

        // 3. Subtle atmospheric particles
        drawMultiPlaneParticles(ctx, cw, ch, p, mx, my);

        // 6. Top & Bottom Vignettes
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
    }, [frameSequenceUrls]);

    const scheduleRender = useCallback(() => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            renderFrame();
        });
    }, [renderFrame]);

    useEffect(() => {
        mouseRef.current = { x: mouseX, y: mouseY };
        scheduleRender();
    }, [mouseX, mouseY, scheduleRender]);

    useEffect(() => {
        let isMounted = true;

        if (frameSequenceUrls && frameSequenceUrls.length > 0) {
            const count = frameSequenceUrls.length;
            sequenceFramesRef.current = new Array(count).fill(null);

            const loadSingleFrame = (index: number): Promise<void> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.decoding = 'async';
                    img.src = frameSequenceUrls[index];
                    img.onload = () => {
                        if (isMounted) {
                            sequenceFramesRef.current[index] = img;
                            if (index === 0) {
                                setIsReady(true);
                                scheduleRender();
                            }
                        }
                        resolve();
                    };
                    img.onerror = () => resolve();
                });
            };

            (async () => {
                await loadSingleFrame(0);
                const strideIndices: number[] = [];
                const restIndices: number[] = [];
                for (let i = 1; i < count; i++) {
                    if (i % 4 === 0) strideIndices.push(i);
                    else restIndices.push(i);
                }
                await Promise.all(strideIndices.map(loadSingleFrame));
                scheduleRender();
                await Promise.all(restIndices.map(loadSingleFrame));
                scheduleRender();
            })();
        } else {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                if (!isMounted) return;
                heroImgRef.current = img;
                cleanStadiumCanvasRef.current = createCleanStadiumCanvas(img);
                setIsReady(true);
                renderFrame();
                scheduleRender();
            };
            img.src = heroImageSrc;
            if (img.complete && img.naturalWidth > 0) {
                heroImgRef.current = img;
                cleanStadiumCanvasRef.current = createCleanStadiumCanvas(img);
                setIsReady(true);
                renderFrame();
            }
        }

        return () => {
            isMounted = false;
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [heroImageSrc, frameSequenceUrls, renderFrame, scheduleRender]);

    useEffect(() => {
        const handleResize = () => {
            renderFrame();
        };
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, [renderFrame]);

    useMotionValueEvent(scrollProgress, 'change', (latest) => {
        const clamped = clamp(latest, 0, 1);
        progressRef.current = clamped;

        const currentFrame = Math.round(clamped * (totalFrames - 1));
        if (currentFrame !== lastReportedFrameRef.current) {
            lastReportedFrameRef.current = currentFrame;
            onFrameChange?.(currentFrame + 1, totalFrames);
        }

        scheduleRender();
    });

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#060913] select-none">
            <canvas
                ref={canvasRef}
                className={`w-full h-full block transition-opacity duration-500 ${
                    isReady ? 'opacity-100' : 'opacity-0'
                }`}
            />
            {!isReady && (
                <div className="absolute inset-0 bg-[#060913] flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                </div>
            )}
        </div>
    );
};

function imgNaturalW(el: HTMLImageElement): number {
    return el.naturalWidth || el.width || 1920;
}

function imgNaturalH(el: HTMLImageElement): number {
    return el.naturalHeight || el.height || 1080;
}

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
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, offsetX, offsetY, renderW, renderH);
}

function drawHolographicBallPulse(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    p: number,
    focalY: number,
    zoom: number,
    mx: number,
    my: number
) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const ballX = cw * 0.5 + mx * -18;
    const ballY = ch * (0.835 + (0.52 - focalY) * zoom * 0.65) + my * -10;

    const pulsePhase = (p * 4) % 1;
    const coreRadius = Math.min(cw, ch) * 0.13;
    const ballGlow = ctx.createRadialGradient(ballX, ballY, 2, ballX, ballY, coreRadius);
    ballGlow.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
    ballGlow.addColorStop(0.45, 'rgba(16, 185, 129, 0.15)');
    ballGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = ballGlow;
    ctx.beginPath();
    ctx.arc(ballX, ballY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 2; ring++) {
        const ringProgress = (pulsePhase + ring / 2) % 1;
        const radiusX = cw * (0.04 + ringProgress * 0.22);
        const radiusY = radiusX * 0.22;
        const alpha = (1 - ringProgress) * 0.32;

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

function drawMultiPlaneParticles(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    p: number,
    mx: number,
    my: number
) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < STADIUM_PARTICLES.length; i++) {
        const pt = STADIUM_PARTICLES[i];
        const pxNorm = (pt.x + p * pt.speedX + 10) % 1;
        const pyNorm = (pt.y + p * pt.speedY + 10) % 1;

        const x = pxNorm * cw + mx * -24 * pt.z;
        const y = pyNorm * ch + my * -16 * pt.z;

        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(p * Math.PI * 5 + pt.phase));
        const alpha = clamp(twinkle * 0.45, 0.08, 0.55);

        let colorRGB = '0, 229, 255';
        if (pt.hue === 'emerald') colorRGB = '52, 211, 153';
        else if (pt.hue === 'blue') colorRGB = '96, 165, 250';

        ctx.fillStyle = `rgba(${colorRGB}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, pt.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
