/**
 * Generates a 1080x1920 (Instagram Story / WhatsApp Status) PNG card for the
 * complete Standings Table (Tabla General) using native Canvas 2D API.
 *
 * Maximizes available vertical space to deliver high-impact, broadcast-quality
 * graphics with large typography and prominent team crests.
 */
import type { LeaderVariant } from '../top-scorers/LeaderParts';
import { leagueApi } from '@/shared/api/league-api';

export interface StandingsShareTeam {
    rank: number;
    team: string;
    logoUrl?: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
}

export type CrestStyle = 'capsule' | 'shield' | 'clean';
export type LogoChoice = 'league' | 'tournament';

export interface StandingsShareCardData {
    leagueName: string;
    leagueLogoUrl?: string;
    secondaryLogoUrl?: string;
    activeLogo?: LogoChoice;
    leagueUrl: string;
    divisionName?: string;
    seasonName?: string;
    variant: LeaderVariant;
    crestStyle?: CrestStyle;
    teams: StandingsShareTeam[];
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
    ptsPillBg: string;
    ptsPillBorder: string;
    leaderBg: string;
    leaderBorder: string;
    liguillaAccent: string;
}> = {
    fut: {
        bgTop: '#0B1530',
        bgBottom: '#03060E',
        glow: 'rgba(232, 35, 26, 0.35)',
        accent: '#F87171',
        gold: '#FBBF24',
        goldDeep: '#F59E0B',
        muted: '#CBD5E1',
        ptsPillBg: 'rgba(232, 35, 26, 0.28)',
        ptsPillBorder: 'rgba(248, 113, 113, 0.50)',
        leaderBg: 'rgba(251, 191, 36, 0.12)',
        leaderBorder: 'rgba(251, 191, 36, 0.75)',
        liguillaAccent: '#38BDF8',
    },
    metepec: {
        bgTop: '#111D15',
        bgBottom: '#050806',
        glow: 'rgba(147, 197, 114, 0.40)',
        accent: '#93C572',
        gold: '#C9A54A',
        goldDeep: '#93C572',
        muted: '#CBD5E1',
        ptsPillBg: 'rgba(46, 90, 54, 0.35)',
        ptsPillBorder: 'rgba(147, 197, 114, 0.50)',
        leaderBg: 'rgba(147, 197, 114, 0.14)',
        leaderBorder: 'rgba(201, 165, 74, 0.75)',
        liguillaAccent: '#93C572',
    },
    classic: {
        bgTop: '#1E293B',
        bgBottom: '#020617',
        glow: 'rgba(245, 158, 11, 0.30)',
        accent: '#FBBF24',
        gold: '#FCD34D',
        goldDeep: '#F59E0B',
        muted: '#CBD5E1',
        ptsPillBg: 'rgba(245, 158, 11, 0.25)',
        ptsPillBorder: 'rgba(252, 211, 77, 0.50)',
        leaderBg: 'rgba(245, 158, 11, 0.14)',
        leaderBorder: 'rgba(252, 211, 77, 0.75)',
        liguillaAccent: '#38BDF8',
    },
};

const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const DISPLAY = '"Bebas Neue", Impact, "Arial Narrow", sans-serif';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
            document.fonts.load(`100px ${DISPLAY}`),
            document.fonts.load(`900 64px ${SANS}`),
            document.fonts.load(`800 36px ${SANS}`),
            document.fonts.load(`700 28px ${SANS}`),
            document.fonts.load(`600 24px ${SANS}`),
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
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
};

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
};

const drawShieldPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number = 18) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h * 0.62);
    ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.88, x + w / 2, y + h);
    ctx.quadraticCurveTo(x + w * 0.05, y + h * 0.88, x, y + h * 0.62);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};


const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
};

const getInitials = (name: string): string => {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('');
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const generateStandingsShareCard = async (data: StandingsShareCardData): Promise<Blob> => {
    const palette = PALETTES[data.variant];
    const objectUrls: string[] = [];

    try {
        const logoUrlToUse = (data.activeLogo === 'tournament' && data.secondaryLogoUrl)
            ? data.secondaryLogoUrl
            : data.leagueLogoUrl;

        // Preload fonts and logos in parallel
        const [leagueLogo, leagueOSLogo, ...teamLogos] = await Promise.all([
            loadImage(logoUrlToUse, objectUrls),
            loadImage('/league_logo_new.png', objectUrls),
            ...data.teams.map(t => loadImage(t.logoUrl, objectUrls)),
        ]);
        await ensureFonts();

        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D no disponible');

        /* 1. Background --------------------------------------------- */
        const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        bg.addColorStop(0, palette.bgTop);
        bg.addColorStop(1, palette.bgBottom);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Top glow
        const glowTop = ctx.createRadialGradient(WIDTH / 2, 220, 0, WIDTH / 2, 220, 750);
        glowTop.addColorStop(0, palette.glow);
        glowTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowTop;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Subtle diagonal speed stripes
        ctx.save();
        ctx.globalAlpha = 0.035;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        for (let i = -HEIGHT; i < WIDTH; i += 46) {
            ctx.beginPath();
            ctx.moveTo(i, HEIGHT);
            ctx.lineTo(i + HEIGHT * 0.6, 0);
            ctx.stroke();
        }
        ctx.restore();

        /* 2. League Crest (3 UX/UI Proposals) ---------------------- */
        const crestStyle: CrestStyle = data.crestStyle || 'capsule';
        const headerTop = 44;
        let crestBottomY = headerTop + 140;

        if (leagueLogo) {
            const cx = WIDTH / 2;

            if (data.activeLogo === 'tournament') {
                /* OPCIÓN TORNEO VÍCTOR RUIZ: Insignia Vertical con relación de aspecto natural */
                const cardW = 150;
                const cardH = 188;
                const cardX = cx - cardW / 2;
                const cardY = headerTop;
                crestBottomY = cardY + cardH;

                // 1. Ambient Glow
                const halo = ctx.createRadialGradient(cx, cardY + cardH / 2, cardW * 0.4, cx, cardY + cardH / 2, cardW * 1.3);
                halo.addColorStop(0, 'rgba(232, 35, 26, 0.45)');
                halo.addColorStop(0.5, 'rgba(0, 82, 255, 0.35)');
                halo.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.save();
                ctx.fillStyle = halo;
                ctx.fillRect(cardX - 60, cardY - 40, cardW + 120, cardH + 80);
                ctx.restore();

                // 2. Drop Shadow & Multi-stop Gold Border
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.80)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 10;

                const goldGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
                goldGrad.addColorStop(0, '#FFFBEB');
                goldGrad.addColorStop(0.35, palette.gold);
                goldGrad.addColorStop(1, palette.goldDeep);

                roundedRect(ctx, cardX, cardY, cardW, cardH, 20);
                ctx.fillStyle = goldGrad;
                ctx.fill();

                // Inner plate
                const borderThick = 3;
                roundedRect(ctx, cardX + borderThick, cardY + borderThick, cardW - borderThick * 2, cardH - borderThick * 2, 17);
                ctx.fillStyle = '#0052FF';
                ctx.fill();
                ctx.restore();

                // 3. Clipped Image inside card
                ctx.save();
                roundedRect(ctx, cardX + borderThick, cardY + borderThick, cardW - borderThick * 2, cardH - borderThick * 2, 17);
                ctx.clip();
                drawImageFit(ctx, leagueLogo, cardX + 4, cardY + 4, cardW - 8, cardH - 8, 'cover');
                ctx.restore();

                // 4. Subtle inner light highlight
                ctx.save();
                roundedRect(ctx, cardX, cardY, cardW, cardH, 20);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();

            } else if (crestStyle === 'shield') {

                /* PROPUESTA 2: Escudo Deportivo Heráldico (Estilo Club / Federación) */
                const shieldW = 210;
                const shieldH = 160;
                const shieldX = cx - shieldW / 2;
                const shieldY = headerTop;
                crestBottomY = shieldY + shieldH;

                // 1. Ambient Halo Glow
                const halo = ctx.createRadialGradient(cx, shieldY + shieldH * 0.45, shieldW * 0.35, cx, shieldY + shieldH * 0.45, shieldW * 1.3);
                halo.addColorStop(0, palette.gold);
                halo.addColorStop(0.5, 'rgba(0, 82, 255, 0.35)');
                halo.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.save();
                ctx.fillStyle = halo;
                ctx.fillRect(shieldX - 60, shieldY - 40, shieldW + 120, shieldH + 80);
                ctx.restore();

                // 2. Drop Shadow & Gold Shield Border
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.80)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 10;

                const goldGrad = ctx.createLinearGradient(shieldX, shieldY, shieldX + shieldW, shieldY + shieldH);
                goldGrad.addColorStop(0, '#FFFBEB');
                goldGrad.addColorStop(0.35, palette.gold);
                goldGrad.addColorStop(1, palette.goldDeep);

                drawShieldPath(ctx, shieldX, shieldY, shieldW, shieldH, 18);
                ctx.fillStyle = goldGrad;
                ctx.fill();

                // Inner shield body
                drawShieldPath(ctx, shieldX + 4, shieldY + 4, shieldW - 8, shieldH - 8, 15);
                ctx.fillStyle = '#0052FF';
                ctx.fill();
                ctx.restore();

                // 3. Clipped Image inside shield
                ctx.save();
                drawShieldPath(ctx, shieldX + 4, shieldY + 4, shieldW - 8, shieldH - 8, 15);
                ctx.clip();
                drawImageFit(ctx, leagueLogo, shieldX + 8, shieldY + 12, shieldW - 16, shieldH - 24, 'contain');
                ctx.restore();

                // 4. Subtle inner light highlight
                ctx.save();
                drawShieldPath(ctx, shieldX, shieldY, shieldW, shieldH, 18);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();

            } else if (crestStyle === 'clean') {
                /* PROPUESTA 3: Isotipo Neón Clean (Flotante Moderno) */
                const logoW = 240;
                const logoH = 145;
                const logoX = cx - logoW / 2;
                const logoY = headerTop;
                crestBottomY = logoY + logoH;

                // 1. Vibrant Blue & Gold Ambient Glow
                const halo = ctx.createRadialGradient(cx, logoY + logoH / 2, logoW * 0.3, cx, logoY + logoH / 2, logoW * 1.2);
                halo.addColorStop(0, 'rgba(0, 82, 255, 0.60)');
                halo.addColorStop(0.5, 'rgba(251, 191, 36, 0.30)');
                halo.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.save();
                ctx.fillStyle = halo;
                ctx.fillRect(logoX - 70, logoY - 50, logoW + 140, logoH + 100);
                ctx.restore();

                // 2. Floating logo with rich drop shadow & clean rounded corners
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 8;
                roundedRect(ctx, logoX, logoY, logoW, logoH, 16);
                ctx.clip();
                drawImageFit(ctx, leagueLogo, logoX, logoY, logoW, logoH, 'contain');
                ctx.restore();

                // 3. Subtle outer neon border
                ctx.save();
                roundedRect(ctx, logoX, logoY, logoW, logoH, 16);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();

            } else {
                /* PROPUESTA 1 (Default): Cápsula Broadcast Horizontal */
                const cardW = 240;
                const cardH = 144;
                const cardX = cx - cardW / 2;
                const cardY = headerTop;
                crestBottomY = cardY + cardH;

                // 1. Ambient Glow
                const halo = ctx.createRadialGradient(cx, cardY + cardH / 2, cardW * 0.35, cx, cardY + cardH / 2, cardW * 1.15);
                halo.addColorStop(0, 'rgba(0, 82, 255, 0.50)');
                halo.addColorStop(0.5, 'rgba(251, 191, 36, 0.30)');
                halo.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.save();
                ctx.fillStyle = halo;
                ctx.fillRect(cardX - 60, cardY - 40, cardW + 120, cardH + 80);
                ctx.restore();

                // 2. Drop Shadow & Multi-stop Gold Border
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
                ctx.shadowBlur = 24;
                ctx.shadowOffsetY = 10;

                const goldGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
                goldGrad.addColorStop(0, '#FFFBEB');
                goldGrad.addColorStop(0.35, palette.gold);
                goldGrad.addColorStop(1, palette.goldDeep);

                roundedRect(ctx, cardX, cardY, cardW, cardH, 20);
                ctx.fillStyle = goldGrad;
                ctx.fill();

                // Inner plate
                const borderThick = 3;
                roundedRect(ctx, cardX + borderThick, cardY + borderThick, cardW - borderThick * 2, cardH - borderThick * 2, 17);
                ctx.fillStyle = '#0052FF';
                ctx.fill();
                ctx.restore();

                // 3. Clipped Image inside card (Full aspect ratio, no crop)
                ctx.save();
                roundedRect(ctx, cardX + borderThick, cardY + borderThick, cardW - borderThick * 2, cardH - borderThick * 2, 17);
                ctx.clip();
                drawImageFit(ctx, leagueLogo, cardX + 8, cardY + 8, cardW - 16, cardH - 16, 'contain');
                ctx.restore();

                // 4. Subtle glass gleam top half
                ctx.save();
                roundedRect(ctx, cardX + borderThick, cardY + borderThick, cardW - borderThick * 2, (cardH - borderThick * 2) * 0.45, 17);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.fill();
                ctx.restore();
            }
        }

        // League Name
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `800 28px ${SANS}`;
        setSpacing(ctx, 4);
        const leagueY = leagueLogo ? crestBottomY + 42 : headerTop + 55;
        ctx.fillText(data.leagueName.toUpperCase(), WIDTH / 2, leagueY);

        // Deduplicate and format Subtitle (Season / Division)
        let subtitle = '';
        const season = data.seasonName?.trim();
        const division = data.divisionName?.trim();
        if (season && division) {
            if (season.toLowerCase().includes(division.toLowerCase())) {
                subtitle = season;
            } else {
                subtitle = `${season} • ${division}`;
            }
        } else {
            subtitle = season || division || '';
        }

        let subtitleY = leagueY;
        if (subtitle) {
            subtitleY = leagueY + 38;
            ctx.fillStyle = palette.accent;
            ctx.font = `700 21px ${SANS}`;
            setSpacing(ctx, 3);
            ctx.fillText(subtitle.toUpperCase(), WIDTH / 2, subtitleY);
        }

        // Main Title "TABLA GENERAL"
        const titleY = subtitleY + (subtitle ? 92 : 78);
        ctx.font = `96px ${DISPLAY}`;
        setSpacing(ctx, 6);
        const titleGrad = ctx.createLinearGradient(0, titleY - 74, 0, titleY);
        titleGrad.addColorStop(0, '#FFFFFF');
        titleGrad.addColorStop(0.35, '#FFF7D6');
        titleGrad.addColorStop(1, palette.gold);
        ctx.fillStyle = titleGrad;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        ctx.fillText('TABLA GENERAL', WIDTH / 2, titleY);
        ctx.restore();

        /* 3. Maximized Table Dimensions & Generous Scaling ---------- */
        const marginX = 36;
        const tableW = WIDTH - marginX * 2; // 1008px
        const headerEndY = titleY + 22;

        const footerTop = HEIGHT - 95;
        const teams = data.teams;
        const count = teams.length;
        const liguillaCutoff = count >= 8 ? 8 : count >= 6 ? 4 : 0;

        const colHeaderH = 48;
        const gap = count <= 12 ? 8 : count <= 16 ? 7 : count <= 20 ? 5 : 4;

        // Total available height between header and footer
        const availableHeight = footerTop - headerEndY - 20;
        const usableForRows = availableHeight - colHeaderH - gap;

        // Generous row height so data is large, punchy and fills the poster
        const computedRowHeight = Math.floor((usableForRows - (count - 1) * gap) / count);
        const maxRowHeight = count <= 10 ? 88 : count <= 14 ? 80 : count <= 16 ? 74 : count <= 20 ? 64 : 54;
        const rowHeight = Math.max(38, Math.min(maxRowHeight, computedRowHeight));

        const totalTableHeight = colHeaderH + gap + (count * rowHeight) + ((count - 1) * gap);

        // Center the whole table block vertically between title and footer
        const blockStartY = headerEndY + Math.max(12, Math.floor((availableHeight - totalTableHeight) / 2));
        const colHeaderY = blockStartY;
        const firstRowY = colHeaderY + colHeaderH + gap;

        // Column X coordinates (drawable width = 1008px)
        const colPos = marginX + 38;      // Center: 74
        const colLogo = marginX + 76;     // Left: 112
        const colTeam = marginX + 146;    // Left: 182
        const colJJ = marginX + 630;      // Center: 666
        const colJG = marginX + 698;      // Center: 734
        const colJE = marginX + 766;      // Center: 802
        const colJP = marginX + 834;      // Center: 870
        const colDG = marginX + 910;      // Center: 946
        const colPTS = marginX + 975;     // Center: 1011

        /* 4. Column Header Row -------------------------------------- */
        ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
        roundedRect(ctx, marginX, colHeaderY, tableW, colHeaderH, 10);
        ctx.fill();

        ctx.font = `800 19px ${SANS}`;
        setSpacing(ctx, 1.5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
        ctx.textBaseline = 'middle';

        ctx.textAlign = 'center';
        ctx.fillText('POS', colPos, colHeaderY + colHeaderH / 2);
        ctx.textAlign = 'left';
        ctx.fillText('EQUIPO', colTeam, colHeaderY + colHeaderH / 2);
        ctx.textAlign = 'center';
        ctx.fillText('JJ', colJJ, colHeaderY + colHeaderH / 2);
        ctx.fillText('JG', colJG, colHeaderY + colHeaderH / 2);
        ctx.fillText('JE', colJE, colHeaderY + colHeaderH / 2);
        ctx.fillText('JP', colJP, colHeaderY + colHeaderH / 2);
        ctx.fillText('DG', colDG, colHeaderY + colHeaderH / 2);
        ctx.fillStyle = palette.accent;
        ctx.fillText('PTS', colPTS, colHeaderY + colHeaderH / 2);

        /* 5. Team Rows (Large Fonts, Prominent Badges) -------------- */
        const posFontSize = Math.min(26, Math.max(16, Math.round(rowHeight * 0.40)));
        const teamFontSize = Math.min(27, Math.max(16, Math.round(rowHeight * 0.39)));
        const statFontSize = Math.min(24, Math.max(15, Math.round(rowHeight * 0.36)));
        const ptsFontSize = Math.min(32, Math.max(18, Math.round(rowHeight * 0.47)));
        const logoBadgeSize = Math.min(52, Math.max(28, Math.round(rowHeight * 0.72)));

        teams.forEach((t, i) => {
            const rowY = firstRowY + i * (rowHeight + gap);
            const isLeader = i === 0;
            const inLiguilla = i < liguillaCutoff;
            const centerY = rowY + rowHeight / 2;

            // Row background
            if (isLeader) {
                const leaderGrad = ctx.createLinearGradient(marginX, rowY, marginX + tableW, rowY);
                leaderGrad.addColorStop(0, palette.leaderBg);
                leaderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
                ctx.fillStyle = leaderGrad;
                roundedRect(ctx, marginX, rowY, tableW, rowHeight, 10);
                ctx.fill();

                ctx.strokeStyle = palette.leaderBorder;
                ctx.lineWidth = 1.8;
                roundedRect(ctx, marginX, rowY, tableW, rowHeight, 10);
                ctx.stroke();

                // Gold strip indicator on left
                ctx.fillStyle = palette.gold;
                roundedRect(ctx, marginX, rowY + 3, 5, rowHeight - 6, 3);
                ctx.fill();
            } else {
                ctx.fillStyle = inLiguilla
                    ? 'rgba(255, 255, 255, 0.05)'
                    : i % 2 === 0
                        ? 'rgba(255, 255, 255, 0.025)'
                        : 'rgba(255, 255, 255, 0.012)';
                roundedRect(ctx, marginX, rowY, tableW, rowHeight, 8);
                ctx.fill();

                // Liguilla accent indicator on left border
                if (inLiguilla) {
                    ctx.fillStyle = palette.liguillaAccent;
                    roundedRect(ctx, marginX, rowY + 3, 4, rowHeight - 6, 2);
                    ctx.fill();
                }
            }

            // 1. POS Column
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isLeader) {
                const crownH = Math.round(rowHeight * 0.28);
                drawCrown(ctx, colPos, centerY - rowHeight * 0.20, crownH, palette.gold);
                ctx.font = `900 ${posFontSize}px ${SANS}`;
                ctx.fillStyle = palette.gold;
                ctx.fillText('1', colPos, centerY + rowHeight * 0.14);
            } else {
                ctx.font = `800 ${posFontSize}px ${SANS}`;
                ctx.fillStyle = inLiguilla ? '#FFFFFF' : 'rgba(203, 213, 225, 0.7)';
                ctx.fillText(String(t.rank || i + 1), colPos, centerY);
            }

            // 2. EQUIPO Column (Logo + Name)
            const teamLogoImg = teamLogos[i];
            const logoY = centerY - logoBadgeSize / 2;

            if (teamLogoImg) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(colLogo + logoBadgeSize / 2, centerY, logoBadgeSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                ctx.clip();
                drawImageFit(ctx, teamLogoImg, colLogo, logoY, logoBadgeSize, logoBadgeSize, 'contain');
                ctx.restore();
            } else {
                // Monogram placeholder
                ctx.save();
                ctx.beginPath();
                ctx.arc(colLogo + logoBadgeSize / 2, centerY, logoBadgeSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.font = `800 ${Math.round(logoBadgeSize * 0.44)}px ${SANS}`;
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(getInitials(t.team), colLogo + logoBadgeSize / 2, centerY);
                ctx.restore();
            }

            // Team Name
            const nameX = colLogo + logoBadgeSize + 14;
            const maxNameWidth = colJJ - nameX - 18;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = isLeader ? `900 ${teamFontSize}px ${SANS}` : `700 ${teamFontSize}px ${SANS}`;
            ctx.fillStyle = isLeader ? '#FFF5D6' : '#FFFFFF';
            setSpacing(ctx, 0.5);
            ctx.fillText(truncateText(ctx, t.team, maxNameWidth), nameX, centerY);

            // 3. Stats Columns (JJ, JG, JE, JP)
            ctx.font = `700 ${statFontSize}px ${SANS}`;
            ctx.fillStyle = 'rgba(203, 213, 225, 0.88)';
            ctx.textAlign = 'center';
            setSpacing(ctx, 0);

            ctx.fillText(String(t.played), colJJ, centerY);
            ctx.fillText(String(t.won), colJG, centerY);
            ctx.fillText(String(t.drawn), colJE, centerY);
            ctx.fillText(String(t.lost), colJP, centerY);

            // 4. DG Column
            const diff = t.goalDifference;
            const diffText = diff > 0 ? `+${diff}` : String(diff);
            ctx.font = `800 ${statFontSize}px ${SANS}`;
            ctx.fillStyle = diff > 0 ? '#34D399' : diff < 0 ? '#F87171' : 'rgba(203, 213, 225, 0.7)';
            ctx.fillText(diffText, colDG, centerY);

            // 5. PTS Pill Column
            const pillW = Math.min(74, Math.max(52, Math.round(rowHeight * 1.10)));
            const pillH = Math.round(rowHeight * 0.68);
            const pillX = colPTS - pillW / 2;
            const pillY = centerY - pillH / 2;

            if (isLeader) {
                const ptsGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
                ptsGrad.addColorStop(0, palette.gold);
                ptsGrad.addColorStop(1, palette.goldDeep);
                ctx.fillStyle = ptsGrad;
                roundedRect(ctx, pillX, pillY, pillW, pillH, Math.round(pillH / 2));
                ctx.fill();

                ctx.font = `900 ${ptsFontSize}px ${SANS}`;
                ctx.fillStyle = '#0F172A';
                ctx.fillText(String(t.points), colPTS, centerY);
            } else {
                ctx.fillStyle = palette.ptsPillBg;
                ctx.strokeStyle = palette.ptsPillBorder;
                ctx.lineWidth = 1;
                roundedRect(ctx, pillX, pillY, pillW, pillH, Math.round(pillH / 2));
                ctx.fill();
                ctx.stroke();

                ctx.font = `800 ${ptsFontSize}px ${SANS}`;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(String(t.points), colPTS, centerY);
            }
        });

        /* 6. Footer: LeagueOS + Slogan + Clean Domain --------------- */
        const footerY = HEIGHT - 55;

        // LeagueOS Watermark
        const brandLabel = 'POWERED BY LEAGUEOS';
        ctx.font = `800 20px ${SANS}`;
        setSpacing(ctx, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

        let curX = WIDTH / 2;
        if (leagueOSLogo) {
            const logoH = 22;
            const logoW = (leagueOSLogo.width / leagueOSLogo.height) * logoH;
            const textW = ctx.measureText(brandLabel).width;
            const totalW = logoW + 12 + textW;
            const startBrandX = WIDTH / 2 - totalW / 2;

            ctx.drawImage(leagueOSLogo, startBrandX, footerY - logoH + 2, logoW, logoH);
            curX = startBrandX + logoW + 12;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        } else {
            ctx.textAlign = 'center';
        }

        ctx.fillText(brandLabel, curX, footerY);

        // Domain & Slogan
        ctx.textAlign = 'center';
        ctx.font = `600 20px ${SANS}`;
        setSpacing(ctx, 2.5);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
        const cleanDomain = data.leagueUrl
            .replace(/^https?:\/\//i, '')
            .split('/')[0]
            .replace(/^localhost:\d+/, 'nuestrodeporte.com');
        ctx.fillText(`${cleanDomain}  •  Tu pasión, nuestro deporte`, WIDTH / 2, footerY + 34);

        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))), 'image/png');
        });
    } finally {
        objectUrls.forEach(u => URL.revokeObjectURL(u));
    }
};

export const buildStandingsFileName = (leagueName: string, divisionName?: string) => {
    const slug = `${leagueName}-${divisionName || 'general'}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    return `tabla-general-${slug}.png`;
};

/** True when the browser can open the native share sheet with image files (mobile Safari/Chrome). */
export const canShareImageFiles = (file: File) =>
    typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

/**
 * Opens the native share sheet with only the image file.
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
