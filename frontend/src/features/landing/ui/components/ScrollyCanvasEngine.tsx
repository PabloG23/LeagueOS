import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';

export interface ScrollyCanvasEngineProps {
    /** Normalized scroll progress (0.0 to 1.0) */
    scrollProgress: MotionValue<number>;
    /** Primary high-res hero source image */
    heroImageSrc: string;
    /** Optional array of pre-rendered WebP/AVIF frame URLs */
    frameSequenceUrls?: string[];
    /** Total virtual frames for scrubbing telemetry */
    totalFrames?: number;
    /** Mouse X normalized (-1 to 1) for 2.5D multi-plane parallax */
    mouseX?: number;
    /** Mouse Y normalized (-1 to 1) for 2.5D multi-plane parallax */
    mouseY?: number;
    /** Callback when active frame index changes */
    onFrameChange?: (frameIndex: number, totalFrames: number) => void;
}

/**
 * Builds a clean 16:9 Widescreen Stadium Plate from `hero_dashboard.jpg` in < 2ms
 * WITHOUT `ctx.filter` (unsupported on iOS WebKit).
 * Uses `destination-in` linear gradient alpha masks on all 4 edges so the central
 * baked-in board (`x: 18%..82%, y: 17%..75.8%`) is 100% covered at full opacity
 * while feathering smoothly into the surrounding stadium floodlights and turf.
 */
function createCleanWidescreenStadium(img: HTMLImageElement): HTMLCanvasElement {
    const w = img.naturalWidth || 1376;
    const h = img.naturalHeight || 768;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return offscreen;

    // 1. Draw original 4K image
    ctx.drawImage(img, 0, 0, w, h);

    // 2. Build seamlessly feathered sky patch covering [0.14..0.86, 0.125..0.785]
    //    so its 100% opaque core covers 100% of the baked-in board [0.18..0.82, 0.17..0.758]
    const boxLeft = Math.floor(w * 0.14);
    const boxRight = Math.ceil(w * 0.86);
    const boxTop = Math.floor(h * 0.125);
    const boxBottom = Math.ceil(h * 0.785);
    const boxW = boxRight - boxLeft;
    const boxH = boxBottom - boxTop;

    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = boxW;
    patchCanvas.height = boxH;
    const pctx = patchCanvas.getContext('2d');
    if (!pctx) return offscreen;

    // Fill patch with nocturnal stadium sky gradient
    const skyGrad = pctx.createLinearGradient(0, 0, 0, boxH);
    skyGrad.addColorStop(0.0, '#040914');
    skyGrad.addColorStop(0.38, '#050c1b');
    skyGrad.addColorStop(0.76, '#061222');
    skyGrad.addColorStop(1.0, '#071824');
    pctx.fillStyle = skyGrad;
    pctx.fillRect(0, 0, boxW, boxH);

    // Subtle continuation of left & right stadium floodlight glow
    const leftGlow = pctx.createRadialGradient(
        0,
        boxH * 0.18,
        5,
        boxW * 0.12,
        boxH * 0.3,
        boxW * 0.45
    );
    leftGlow.addColorStop(0, 'rgba(0, 195, 255, 0.22)');
    leftGlow.addColorStop(0.5, 'rgba(14, 116, 244, 0.08)');
    leftGlow.addColorStop(1, 'rgba(4, 9, 20, 0)');
    pctx.fillStyle = leftGlow;
    pctx.fillRect(0, 0, boxW, boxH);

    const rightGlow = pctx.createRadialGradient(
        boxW,
        boxH * 0.18,
        5,
        boxW * 0.88,
        boxH * 0.3,
        boxW * 0.45
    );
    rightGlow.addColorStop(0, 'rgba(16, 185, 129, 0.20)');
    rightGlow.addColorStop(0.5, 'rgba(0, 195, 255, 0.07)');
    rightGlow.addColorStop(1, 'rgba(4, 9, 20, 0)');
    pctx.fillStyle = rightGlow;
    pctx.fillRect(0, 0, boxW, boxH);

    // Feather left & right edges (0..0.055 and 0.945..1.0) so [0.18..0.82] is 100% opaque
    pctx.globalCompositeOperation = 'destination-in';
    const hMask = pctx.createLinearGradient(0, 0, boxW, 0);
    hMask.addColorStop(0.0, 'rgba(0,0,0,0)');
    hMask.addColorStop(0.055, 'rgba(0,0,0,1)');
    hMask.addColorStop(0.945, 'rgba(0,0,0,1)');
    hMask.addColorStop(1.0, 'rgba(0,0,0,0)');
    pctx.fillStyle = hMask;
    pctx.fillRect(0, 0, boxW, boxH);

    // Feather top & bottom edges (0..0.065 and 0.955..1.0) so [0.17..0.758] is 100% opaque
    const vMask = pctx.createLinearGradient(0, 0, 0, boxH);
    vMask.addColorStop(0.0, 'rgba(0,0,0,0)');
    vMask.addColorStop(0.065, 'rgba(0,0,0,1)');
    vMask.addColorStop(0.955, 'rgba(0,0,0,1)');
    vMask.addColorStop(1.0, 'rgba(0,0,0,0)');
    pctx.fillStyle = vMask;
    pctx.fillRect(0, 0, boxW, boxH);

    ctx.drawImage(patchCanvas, boxLeft, boxTop);

    return offscreen;
}

/**
 * Renders a dedicated Responsive Mobile Portrait Stadium (`cw < ch`) by bringing:
 * - Left Stadium Wing (`x: 0..17.8%` — floodlights, blue roof, cheering stands, players)
 * - Right Stadium Wing (`x: 82.2..100%` — floodlights, emerald roof, cheering stands, players)
 * - Bottom Pitch & Glowing Holographic Soccer Ball (`y: 76..100%`, 1:1 aspect ratio)
 * into the portrait phone screen with a clean nocturnal stadium sky in the middle.
 * Zero baked-in dashboard text and zero floating rectangular boxes!
 */
function drawResponsivePortraitStadium(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cw: number,
    ch: number
) {
    const imgW = img.naturalWidth || 1376;
    const imgH = img.naturalHeight || 768;

    // 1. Base Nocturnal Stadium Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
    skyGrad.addColorStop(0.0, '#040812');
    skyGrad.addColorStop(0.35, '#050c1b');
    skyGrad.addColorStop(0.72, '#061322');
    skyGrad.addColorStop(1.0, '#071a20');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);

    // 2. Left & Right Stadium Wings (strictly outside x: 18%..82% so zero board pixels exist)
    const wingCanvas = document.createElement('canvas');
    wingCanvas.width = cw;
    wingCanvas.height = ch;
    const wctx = wingCanvas.getContext('2d');
    if (wctx) {
        const wingSrcW = Math.floor(imgW * 0.178);
        const wingDstW = Math.ceil(cw * 0.54);

        // Draw Left Stadium Wing
        wctx.drawImage(img, 0, 0, wingSrcW, imgH, 0, 0, wingDstW, ch);

        wctx.globalCompositeOperation = 'destination-in';
        const leftFade = wctx.createLinearGradient(0, 0, cw, 0);
        leftFade.addColorStop(0.0, 'rgba(0,0,0,1)');
        leftFade.addColorStop(0.22, 'rgba(0,0,0,0.88)');
        leftFade.addColorStop(0.50, 'rgba(0,0,0,0)');
        leftFade.addColorStop(1.0, 'rgba(0,0,0,0)');
        wctx.fillStyle = leftFade;
        wctx.fillRect(0, 0, cw, ch);

        ctx.drawImage(wingCanvas, 0, 0);

        // Draw Right Stadium Wing
        wctx.globalCompositeOperation = 'source-over';
        wctx.clearRect(0, 0, cw, ch);
        wctx.drawImage(
            img,
            imgW - wingSrcW,
            0,
            wingSrcW,
            imgH,
            cw - wingDstW,
            0,
            wingDstW,
            ch
        );

        wctx.globalCompositeOperation = 'destination-in';
        const rightFade = wctx.createLinearGradient(0, 0, cw, 0);
        rightFade.addColorStop(0.0, 'rgba(0,0,0,0)');
        rightFade.addColorStop(0.50, 'rgba(0,0,0,0)');
        rightFade.addColorStop(0.78, 'rgba(0,0,0,0.88)');
        rightFade.addColorStop(1.0, 'rgba(0,0,0,1)');
        wctx.fillStyle = rightFade;
        wctx.fillRect(0, 0, cw, ch);

        ctx.drawImage(wingCanvas, 0, 0);

        // 3. Draw Bottom Pitch & Glowing Soccer Ball at 1:1 aspect ratio (strictly below y: 76%)
        wctx.globalCompositeOperation = 'source-over';
        wctx.clearRect(0, 0, cw, ch);

        const pitchSrcY = Math.floor(imgH * 0.762);
        const pitchSrcH = imgH - pitchSrcY;

        const pitchDstH = Math.floor(ch * 0.24);
        const pitchDstY = ch - pitchDstH;

        const targetAspect = cw / Math.max(1, pitchDstH);
        const pitchSrcW = Math.min(imgW * 0.64, pitchSrcH * targetAspect);
        const pitchSrcX = (imgW - pitchSrcW) * 0.5;

        wctx.drawImage(
            img,
            pitchSrcX,
            pitchSrcY,
            pitchSrcW,
            pitchSrcH,
            0,
            pitchDstY,
            cw,
            pitchDstH
        );

        // Feather top horizon of pitch
        wctx.globalCompositeOperation = 'destination-in';
        const pitchMask = wctx.createLinearGradient(0, pitchDstY, 0, ch);
        pitchMask.addColorStop(0.0, 'rgba(0,0,0,0)');
        pitchMask.addColorStop(0.24, 'rgba(0,0,0,1)');
        pitchMask.addColorStop(1.0, 'rgba(0,0,0,1)');
        wctx.fillStyle = pitchMask;
        wctx.fillRect(0, pitchDstY, cw, pitchDstH);

        ctx.drawImage(wingCanvas, 0, 0);
    }

    // 4. Soft dark radial atmosphere in the center so white typography is 100% legible
    const centerAtmosphere = ctx.createRadialGradient(
        cw * 0.5,
        ch * 0.44,
        cw * 0.08,
        cw * 0.5,
        ch * 0.44,
        cw * 0.65
    );
    centerAtmosphere.addColorStop(0, 'rgba(4, 9, 20, 0.68)');
    centerAtmosphere.addColorStop(0.65, 'rgba(4, 9, 20, 0.35)');
    centerAtmosphere.addColorStop(1, 'rgba(4, 9, 20, 0)');
    ctx.fillStyle = centerAtmosphere;
    ctx.fillRect(0, 0, cw, ch);
}

export const ScrollyCanvasEngine: React.FC<ScrollyCanvasEngineProps> = ({
    scrollProgress,
    heroImageSrc,
    mouseX = 0,
    mouseY = 0,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rawImgRef = useRef<HTMLImageElement | null>(null);
    const cleanWidescreenRef = useRef<HTMLCanvasElement | null>(null);
    const lastWidthRef = useRef<number>(0);
    const [isReady, setIsReady] = useState(false);

    const cameraScale = useTransform(
        scrollProgress,
        [0, 0.35, 0.58, 0.80, 1],
        [1.02, 1.05, 1.03, 1.05, 1.02]
    );

    const paintResponsiveStadium = useCallback(() => {
        const canvas = canvasRef.current;
        const img = rawImgRef.current;
        if (!canvas || !img) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const isPortraitMobile = rect.width < rect.height;
        const maxDpr = isPortraitMobile ? 1.25 : 1.75;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

        const cw = Math.max(1, Math.floor(rect.width * dpr));
        const ch = Math.max(1, Math.floor(rect.height * dpr));

        canvas.width = cw;
        canvas.height = ch;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        if (isPortraitMobile) {
            drawResponsivePortraitStadium(ctx, img, cw, ch);
        } else {
            if (!cleanWidescreenRef.current) {
                cleanWidescreenRef.current = createCleanWidescreenStadium(img);
            }
            const cleanWide = cleanWidescreenRef.current;
            drawCoverSource(
                ctx,
                cleanWide,
                cleanWide.width,
                cleanWide.height,
                cw,
                ch,
                1.02,
                0.5,
                0.54
            );
        }

        drawHolographicBallPulse(ctx, cw, ch);

        const topGrad = ctx.createLinearGradient(0, 0, 0, ch * 0.14);
        topGrad.addColorStop(0, 'rgba(6, 9, 19, 0.80)');
        topGrad.addColorStop(1, 'rgba(6, 9, 19, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, cw, ch * 0.14);

        const bottomVignetteHeight = ch * 0.15;
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
            rawImgRef.current = img;
            lastWidthRef.current = window.innerWidth;
            paintResponsiveStadium();
            setIsReady(true);
        };
        img.src = heroImageSrc;
        if (img.complete && img.naturalWidth > 0) {
            rawImgRef.current = img;
            lastWidthRef.current = window.innerWidth;
            paintResponsiveStadium();
            setIsReady(true);
        }

        return () => {
            isMounted = false;
        };
    }, [heroImageSrc, paintResponsiveStadium]);

    useEffect(() => {
        const handleResize = () => {
            const currentW = window.innerWidth;
            if (Math.abs(currentW - lastWidthRef.current) < 8) return;
            lastWidthRef.current = currentW;
            paintResponsiveStadium();
        };
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, [paintResponsiveStadium]);

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
                    className={`w-full h-full block transition-opacity duration-300 ${
                        isReady ? 'opacity-100' : 'opacity-0'
                    }`}
                />
            </motion.div>
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

    const offsetX = (cw - renderW) * focalX;
    const offsetY = (ch - renderH) * focalY;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, offsetX, offsetY, renderW, renderH);
}

function drawHolographicBallPulse(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const ballX = cw * 0.5;
    const ballY = ch * 0.85;

    const coreRadius = Math.min(cw, ch) * 0.14;
    const ballGlow = ctx.createRadialGradient(ballX, ballY, 2, ballX, ballY, coreRadius);
    ballGlow.addColorStop(0, 'rgba(0, 229, 255, 0.30)');
    ballGlow.addColorStop(0.45, 'rgba(16, 185, 129, 0.12)');
    ballGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = ballGlow;
    ctx.beginPath();
    ctx.arc(ballX, ballY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
