/**
 * Generates a 1080x1920 (Instagram Story) PNG card for the top scorer using
 * the native Canvas 2D API, and shares it through the Web Share API.
 *
 * No external dependency is used: images are fetched as blobs (the backend
 * CORS config allows localhost/vercel/nuestrodeporte origins) so the canvas
 * never becomes "tainted" and can always be exported.
 */
import type { LeaderVariant } from './LeaderParts';
import { leagueApi } from '@/shared/api/league-api';

export interface ScorerShareCardData {
    playerName: string;
    teamName: string;
    goals: number;
    isCoLeader: boolean;
    photoUrl?: string;
    leagueName: string;
    leagueLogoUrl?: string;
    leagueUrl: string;
    variant: LeaderVariant;
}

const WIDTH = 1080;
const HEIGHT = 1920;

const PALETTES: Record<LeaderVariant, {
    bgTop: string;
    bgBottom: string;
    glow: string;
    accent: string;
    gold: string;
    goldDeep: string;
    muted: string;
}> = {
    fut: {
        bgTop: '#0D1A3C',
        bgBottom: '#040812',
        glow: 'rgba(232, 35, 26, 0.45)',
        accent: '#F87171',
        gold: '#FBBF24',
        goldDeep: '#E8231A',
        muted: '#CBD5E1',
    },
    classic: {
        bgTop: '#1E293B',
        bgBottom: '#020617',
        glow: 'rgba(245, 158, 11, 0.30)',
        accent: '#FBBF24',
        gold: '#FCD34D',
        goldDeep: '#F59E0B',
        muted: '#CBD5E1',
    },
};

const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const DISPLAY = '"Bebas Neue", Impact, "Arial Narrow", sans-serif';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Presigned storage URLs (Cloudflare R2 / S3) don't send CORS headers, which
 * would taint the canvas. Convert them to the backend media proxy, which does.
 * URL path format: /<bucket>/<object-key>
 */
const toCorsSafeUrl = (url: string) => {
    try {
        const parsed = new URL(url, window.location.href);
        const isPresigned = parsed.searchParams.has('X-Amz-Signature') || parsed.hostname.endsWith('r2.cloudflarestorage.com');
        if (!isPresigned) return url;
        const [, ...keyParts] = decodeURIComponent(parsed.pathname).replace(/^\//, '').split('/');
        return keyParts.length ? leagueApi.getProxyUrl(keyParts.join('/')) : url;
    } catch {
        return url;
    }
};

const loadImage = async (url: string | undefined, objectUrls: string[]): Promise<HTMLImageElement | null> => {
    if (!url) return null;
    try {
        let src = url;
        const isInline = url.startsWith('data:') || url.startsWith('blob:');
        const isSameOrigin = !isInline && new URL(url, window.location.href).origin === window.location.origin;

        if (!isInline && !isSameOrigin) {
            const res = await fetch(toCorsSafeUrl(url), { mode: 'cors' });
            if (!res.ok) return null;
            src = URL.createObjectURL(await res.blob());
            objectUrls.push(src);
        }

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('image load failed'));
            img.src = src;
        });
        return img;
    } catch {
        return null;
    }
};

const ensureFonts = async () => {
    if (!('fonts' in document)) return;
    try {
        await Promise.all([
            document.fonts.load(`120px ${DISPLAY}`),
            document.fonts.load(`900 72px ${SANS}`),
            document.fonts.load(`700 40px ${SANS}`),
        ]);
    } catch {
        /* fall back to system fonts */
    }
};

const setSpacing = (ctx: CanvasRenderingContext2D, px: number) => {
    if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
    }
};

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

/** Draws `img` so it covers (crop) or fits (contain) the given box. */
const drawImageFit = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number, y: number, w: number, h: number,
    mode: 'cover' | 'contain',
) => {
    const scale = mode === 'cover'
        ? Math.max(w / img.width, h / img.height)
        : Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

/** Splits text into at most `maxLines` lines that fit `maxWidth`. */
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !current) {
            current = candidate;
        } else {
            lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);

    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`;
        return kept;
    }
    return lines;
};

const drawCrown = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) => {
    const w = size;
    const h = size * 0.72;
    const left = cx - w / 2;
    const top = cy - h / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(left, top + h * 0.25);
    ctx.lineTo(left + w * 0.27, top + h * 0.6);
    ctx.lineTo(left + w * 0.5, top);
    ctx.lineTo(left + w * 0.73, top + h * 0.6);
    ctx.lineTo(left + w, top + h * 0.25);
    ctx.lineTo(left + w * 0.88, top + h * 0.85);
    ctx.lineTo(left + w * 0.12, top + h * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(left + w * 0.12, top + h * 0.92, w * 0.76, h * 0.1);
};

const drawPersonSilhouette = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.25, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.35, size * 0.4, size * 0.28, 0, Math.PI, 0);
    ctx.fill();
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const generateScorerShareCard = async (data: ScorerShareCardData): Promise<Blob> => {
    const palette = PALETTES[data.variant];
    const objectUrls: string[] = [];

    try {
        const [, photo, logo, leagueOSLogo] = await Promise.all([
            ensureFonts(),
            loadImage(data.photoUrl, objectUrls),
            loadImage(data.leagueLogoUrl, objectUrls),
            loadImage('/league_logo_new.png', objectUrls),
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D no disponible');

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        /* Background ------------------------------------------------ */
        const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        bg.addColorStop(0, palette.bgTop);
        bg.addColorStop(1, palette.bgBottom);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const glowTop = ctx.createRadialGradient(WIDTH / 2, 380, 0, WIDTH / 2, 380, 760);
        glowTop.addColorStop(0, palette.glow);
        glowTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowTop;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const glowGold = ctx.createRadialGradient(WIDTH / 2, 900, 0, WIDTH / 2, 900, 620);
        glowGold.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
        glowGold.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGold;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Diagonal speed stripes
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        for (let i = -HEIGHT; i < WIDTH; i += 46) {
            ctx.beginPath();
            ctx.moveTo(i, HEIGHT);
            ctx.lineTo(i + HEIGHT * 0.6, 0);
            ctx.stroke();
        }
        ctx.restore();

        /* Header: league logo + name -------------------------------- */
        const logoSize = 120;
        if (logo) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(WIDTH / 2, 70 + logoSize / 2, logoSize / 2 + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(WIDTH / 2, 70 + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            drawImageFit(ctx, logo, WIDTH / 2 - logoSize / 2, 70, logoSize, logoSize, 'contain');
            ctx.restore();
        }

        ctx.fillStyle = palette.muted;
        ctx.font = `700 34px ${SANS}`;
        setSpacing(ctx, 6);
        const leagueLines = wrapText(ctx, data.leagueName.toUpperCase(), 900, 2);
        const leagueTop = logo ? 250 : 130;
        leagueLines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, leagueTop + i * 44));

        /* Title ----------------------------------------------------- */
        const titleY = leagueTop + leagueLines.length * 44 + 110;
        const title = data.isCoLeader ? 'CO-LÍDER DE GOLEO' : 'LÍDER DE GOLEO';
        setSpacing(ctx, 6);
        ctx.font = `128px ${DISPLAY}`;
        const titleGrad = ctx.createLinearGradient(0, titleY - 110, 0, titleY);
        titleGrad.addColorStop(0, '#FFF7D6');
        titleGrad.addColorStop(1, palette.gold);
        ctx.fillStyle = titleGrad;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.45)';
        ctx.shadowBlur = 30;
        ctx.fillText(title, WIDTH / 2, titleY);
        ctx.shadowBlur = 0;

        /* Photo card ------------------------------------------------ */
        const cardW = 700;
        const cardH = 800;
        const cardX = (WIDTH - cardW) / 2;
        const cardY = titleY + 50;
        const border = 8;

        ctx.save();
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 80;
        const borderGrad = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
        borderGrad.addColorStop(0, palette.gold);
        borderGrad.addColorStop(0.55, palette.goldDeep);
        borderGrad.addColorStop(1, 'rgba(251, 191, 36, 0.5)');
        ctx.fillStyle = borderGrad;
        roundedRect(ctx, cardX, cardY, cardW, cardH, 44);
        ctx.fill();
        ctx.restore();

        const innerX = cardX + border;
        const innerY = cardY + border;
        const innerW = cardW - border * 2;
        const innerH = cardH - border * 2;

        ctx.save();
        roundedRect(ctx, innerX, innerY, innerW, innerH, 38);
        ctx.clip();
        ctx.fillStyle = '#060A1A';
        ctx.fillRect(innerX, innerY, innerW, innerH);

        if (photo) {
            // Blurred cover background so ID-style photos never show empty bars
            ctx.save();
            ctx.filter = 'blur(36px) brightness(0.7)';
            drawImageFit(ctx, photo, innerX - 60, innerY - 60, innerW + 120, innerH + 120, 'cover');
            ctx.restore();
            ctx.fillStyle = 'rgba(6, 10, 26, 0.35)';
            ctx.fillRect(innerX, innerY, innerW, innerH);
            drawImageFit(ctx, photo, innerX, innerY, innerW, innerH, 'contain');
        } else {
            drawPersonSilhouette(ctx, WIDTH / 2, innerY + innerH / 2, 320);
        }

        const fade = ctx.createLinearGradient(0, innerY + innerH - 160, 0, innerY + innerH);
        fade.addColorStop(0, 'rgba(8, 13, 36, 0)');
        fade.addColorStop(1, 'rgba(8, 13, 36, 0.9)');
        ctx.fillStyle = fade;
        ctx.fillRect(innerX, innerY + innerH - 160, innerW, 160);
        ctx.restore();

        // Crown badge
        const crownCx = cardX + cardW - 20;
        const crownCy = cardY + 20;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        const crownGrad = ctx.createLinearGradient(crownCx - 60, 0, crownCx + 60, 0);
        crownGrad.addColorStop(0, '#FBBF24');
        crownGrad.addColorStop(1, '#EAB308');
        ctx.fillStyle = crownGrad;
        ctx.beginPath();
        ctx.arc(crownCx, crownCy, 62, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#FDE68A';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(crownCx, crownCy, 62, 0, Math.PI * 2);
        ctx.stroke();
        drawCrown(ctx, crownCx, crownCy + 2, 64, '#0F172A');

        /* Player name ----------------------------------------------- */
        let y = cardY + cardH + 110;
        setSpacing(ctx, 1);
        let nameSize = 76;
        ctx.font = `900 ${nameSize}px ${SANS}`;
        let nameLines = wrapText(ctx, data.playerName.toUpperCase(), 960, 2);
        while (nameSize > 48 && nameLines.some(l => ctx.measureText(l).width > 960)) {
            nameSize -= 4;
            ctx.font = `900 ${nameSize}px ${SANS}`;
            nameLines = wrapText(ctx, data.playerName.toUpperCase(), 960, 2);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        nameLines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, y + i * (nameSize + 8)));
        ctx.shadowBlur = 0;
        y += (nameLines.length - 1) * (nameSize + 8);

        /* Team ------------------------------------------------------ */
        y += 70;
        ctx.font = `700 40px ${SANS}`;
        setSpacing(ctx, 5);
        ctx.fillStyle = palette.muted;
        ctx.fillText(data.teamName.toUpperCase(), WIDTH / 2, y);

        /* Goals pill ------------------------------------------------ */
        const goalsLabel = data.goals === 1 ? 'GOL' : 'GOLES';
        ctx.font = `200px ${DISPLAY}`;
        setSpacing(ctx, 4);
        const numW = ctx.measureText(String(data.goals)).width;
        ctx.font = `800 46px ${SANS}`;
        setSpacing(ctx, 8);
        const labelW = ctx.measureText(goalsLabel).width;
        const gap = 28;
        const pillW = numW + gap + labelW + 120;
        const pillH = 210;
        const pillX = (WIDTH - pillW) / 2;
        const pillY = Math.min(y + 50, HEIGHT - pillH - 120);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 3;
        ctx.stroke();

        const baseline = pillY + pillH / 2 + 70;
        ctx.textAlign = 'left';
        ctx.font = `200px ${DISPLAY}`;
        setSpacing(ctx, 4);
        ctx.fillStyle = palette.accent;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 16;
        ctx.fillText(String(data.goals), pillX + 60, baseline);
        ctx.shadowBlur = 0;
        ctx.font = `800 46px ${SANS}`;
        setSpacing(ctx, 8);
        ctx.fillStyle = palette.muted;
        ctx.fillText(goalsLabel, pillX + 60 + numW + gap, baseline - 8);
        ctx.textAlign = 'center';

        /* Footer: Powered by LeagueOS + Clean Domain --------------- */
        const rowY = HEIGHT - 92;
        const poweredLabel = 'POWERED BY ';
        const brandLabel = 'LeagueOS';

        ctx.font = `700 24px ${SANS}`;
        setSpacing(ctx, 3);
        const poweredW = ctx.measureText(poweredLabel).width;

        ctx.font = `900 27px ${SANS}`;
        setSpacing(ctx, 1);
        const brandW = ctx.measureText(brandLabel).width;

        const leagueOSLogoSize = 34;
        const logoGap = 12;
        const totalFooterW = (leagueOSLogo ? leagueOSLogoSize + logoGap : 0) + poweredW + brandW;
        let curX = (WIDTH - totalFooterW) / 2;

        if (leagueOSLogo) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(curX + leagueOSLogoSize / 2, rowY - 8, leagueOSLogoSize / 2 + 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(curX + leagueOSLogoSize / 2, rowY - 8, leagueOSLogoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(leagueOSLogo, curX, rowY - 8 - leagueOSLogoSize / 2, leagueOSLogoSize, leagueOSLogoSize);
            ctx.restore();
            curX += leagueOSLogoSize + logoGap;
        }

        ctx.textAlign = 'left';
        ctx.font = `700 24px ${SANS}`;
        setSpacing(ctx, 3);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.fillText(poweredLabel, curX, rowY);
        curX += poweredW;

        ctx.font = `900 27px ${SANS}`;
        setSpacing(ctx, 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
        ctx.shadowBlur = 10;
        ctx.fillText(brandLabel, curX, rowY);
        ctx.shadowBlur = 0;

        /* Clean League Domain --------------------------------------- */
        ctx.textAlign = 'center';
        ctx.font = `600 24px ${SANS}`;
        setSpacing(ctx, 3);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.65)';
        ctx.fillText(data.leagueUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''), WIDTH / 2, HEIGHT - 46);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))), 'image/png');
        });
    } finally {
        objectUrls.forEach(u => URL.revokeObjectURL(u));
    }
};

export const buildShareFileName = (playerName: string) =>
    `lider-goleo-${playerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.png`;

/** True when the browser can open the native share sheet with image files (mobile Safari/Chrome). */
export const canShareImageFiles = (file: File) =>
    typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

/**
 * Opens the native share sheet with only the image file.
 * Text/url are intentionally omitted: Instagram hides itself from the iOS
 * share sheet when the payload mixes files with text.
 * Must be called directly from a click handler (user activation).
 */
export const shareImageFile = async (file: File): Promise<'shared' | 'cancelled'> => {
    try {
        await navigator.share({ files: [file] });
        return 'shared';
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
        throw err;
    }
};

export const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
