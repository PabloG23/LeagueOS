import jsPDF from 'jspdf';
import { Match, Team, leagueApi } from '@/shared/api/league-api';

export interface GenerateTeamCardsOptions {
    team: {
        id?: string;
        name: string;
        logoUrl?: string;
        signedLogoUrl?: string;
    };
    matchday?: number;
    seasonName?: string;
    leagueName?: string;
    leagueLogoUrl?: string;
}

export interface GenerateMatchCardsOptions {
    match: Match;
    homeTeamName?: string;
    awayTeamName?: string;
    seasonName?: string;
    leagueName?: string;
    leagueLogoUrl?: string;
}

export interface GenerateMatchdayCardsOptions {
    matches: Match[];
    matchday: number;
    seasonName?: string;
    leagueName?: string;
    leagueLogoUrl?: string;
}

interface FetchedImage {
    dataUrl: string;
    width: number;
    height: number;
}

/**
 * Resolves full or proxy image URL
 */
const resolveImageUrl = (srcKey?: string): string | undefined => {
    if (!srcKey) return undefined;
    if (srcKey.startsWith('http://') || srcKey.startsWith('https://') || srcKey.startsWith('data:')) {
        return srcKey;
    }
    try {
        return leagueApi.getProxyUrl(srcKey);
    } catch {
        return undefined;
    }
};

/**
 * Loads an image and renders it to a transparent canvas to create a reliable watermark.
 */
const createWatermarkImage = async (
    imageUrl?: string,
    opacity = 0.16
): Promise<FetchedImage | null> => {
    if (!imageUrl) return null;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 400;
                canvas.height = img.naturalHeight || img.height || 400;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = opacity;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                resolve({
                    dataUrl,
                    width: canvas.width,
                    height: canvas.height,
                });
            } catch (err) {
                console.warn('Watermark canvas generation failed:', err);
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
};

/**
 * Loads a regular image as base64 for header icons
 */
const fetchImageAsBase64 = async (url: string): Promise<FetchedImage | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ dataUrl, width: img.width, height: img.height });
            img.onerror = () => resolve(null);
            img.src = dataUrl;
        });
    } catch {
        return null;
    }
};

/**
 * Renders a fallback subtle shield watermark vector if no logo image is available
 */
const renderFallbackShield = (doc: jsPDF, cx: number, cy: number, size = 30) => {
    doc.saveGraphicsState?.();
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setLineWidth(0.4);

    const halfW = size * 0.45;
    const topY = cy - size * 0.45;
    const midY = cy + size * 0.1;
    const botY = cy + size * 0.5;

    // Shield path
    doc.lines(
        [
            [halfW * 2, 0],
            [0, midY - topY],
            [-halfW, botY - midY],
            [-halfW, -(botY - midY)],
            [0, -(midY - topY)],
        ],
        cx - halfW,
        topY,
        [1, 1],
        'FD'
    );

    doc.restoreGraphicsState?.();
};

/**
 * Renders a single 8-card sheet for a given team on the current page of doc.
 */
const renderTeamSheetOnPage = (
    doc: jsPDF,
    teamName: string,
    matchday?: number,
    watermarkImg?: FetchedImage | null,
    leagueLogoImg?: FetchedImage | null
) => {
    const pageWidth = doc.internal.pageSize.getWidth();   // 215.9 mm (Letter portrait)
    const pageHeight = doc.internal.pageSize.getHeight(); // 279.4 mm

    // Layout configuration: 2 columns x 4 rows = 8 cards
    const cols = 2;
    const rows = 4;
    const cardWidth = 96;
    const cardHeight = 61;

    // Calculate margins to center the grid precisely
    const gridTotalWidth = cols * cardWidth;
    const gridTotalHeight = rows * cardHeight;
    const marginX = (pageWidth - gridTotalWidth) / (cols + 1); // ~7.96 mm
    const marginY = (pageHeight - gridTotalHeight) / (rows + 1); // ~8.88 mm

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cardX = marginX + col * (cardWidth + marginX);
            const cardY = marginY + row * (cardHeight + marginY);

            // 1. Card Outer Container & Border
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.setFillColor(255, 255, 255);
            doc.setLineWidth(0.25);
            doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

            // 2. Subtle Cut Guides (dashed corners outside margins)
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.15);

            // 3. Watermark in the Center of Card
            const centerCardX = cardX + cardWidth / 2;
            const centerCardY = cardY + cardHeight / 2 + 2;

            if (watermarkImg) {
                const maxWatermarkDim = 38;
                const aspect = watermarkImg.width / watermarkImg.height;
                let w = maxWatermarkDim;
                let h = maxWatermarkDim;

                if (aspect > 1) {
                    h = maxWatermarkDim / aspect;
                } else {
                    w = maxWatermarkDim * aspect;
                }

                const wmX = centerCardX - w / 2;
                const wmY = centerCardY - h / 2;
                try {
                    doc.addImage(watermarkImg.dataUrl, 'PNG', wmX, wmY, w, h, undefined, 'FAST');
                } catch (e) {
                    console.warn('Could not render watermark:', e);
                }
            } else {
                renderFallbackShield(doc, centerCardX, centerCardY, 30);
            }

            // 4. Header: Title & League Info
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10.5);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text('Tarjeta de Cambio', centerCardX, cardY + 5.8, { align: 'center' });

            // Small League Logo (Top Left)
            if (leagueLogoImg) {
                try {
                    const lSize = 5.5;
                    doc.addImage(leagueLogoImg.dataUrl, 'PNG', cardX + 3.5, cardY + 2.2, lSize, lSize, undefined, 'FAST');
                } catch {}
            }

            // Matchday (Top Right)
            if (matchday != null) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(71, 85, 105); // slate-600
                doc.text(`J: ${matchday}`, cardX + cardWidth - 4, cardY + 5.8, { align: 'right' });
            }

            // Subtle top divider
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(cardX + 3, cardY + 8.5, cardX + cardWidth - 3, cardY + 8.5);

            // 5. Team Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text('Equipo:', cardX + 4, cardY + 14);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            // Truncate if team name is too long for card
            const maxTeamWidth = cardWidth - 22;
            const cleanTeamName = teamName.toUpperCase();
            doc.text(cleanTeamName, cardX + 17, cardY + 14, { maxWidth: maxTeamWidth });

            // 6. Section "ENTRA"
            const entraY = cardY + 27;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text('Entra', cardX + 4, entraY);

            // Line for player name
            doc.setDrawColor(148, 163, 184); // slate-400
            doc.setLineWidth(0.35);
            doc.line(cardX + 14, entraY + 0.5, cardX + 68, entraY + 0.5);

            // Number field
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text('No.', cardX + 71, entraY);

            // Line for jersey number
            doc.line(cardX + 78, entraY + 0.5, cardX + 92, entraY + 0.5);

            // 7. Section "SALE"
            const saleY = cardY + 43;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text('Sale', cardX + 4, saleY);

            // Line for player name
            doc.setLineWidth(0.35);
            doc.line(cardX + 14, saleY + 0.5, cardX + 68, saleY + 0.5);

            // Number field
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            doc.text('No.', cardX + 71, saleY);

            // Line for jersey number
            doc.line(cardX + 78, saleY + 0.5, cardX + 92, saleY + 0.5);
        }
    }
};

/**
 * Generates and downloads a single-page PDF (8 substitution cards) for ONE team.
 */
export const generateTeamSubstitutionCardsPDF = async (options: GenerateTeamCardsOptions) => {
    const { team, matchday, leagueLogoUrl } = options;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    // Cache & preload assets concurrently O(1)
    const logoUrl = resolveImageUrl(team.signedLogoUrl || team.logoUrl);
    const leagueUrl = resolveImageUrl(leagueLogoUrl);

    const [watermarkImg, leagueLogoImg] = await Promise.all([
        createWatermarkImage(logoUrl, 0.16),
        leagueUrl ? fetchImageAsBase64(leagueUrl) : Promise.resolve(null),
    ]);

    renderTeamSheetOnPage(doc, team.name, matchday, watermarkImg, leagueLogoImg);

    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `Tarjetas_Cambio_J${matchday || 1}_${sanitize(team.name)}.pdf`;
    doc.save(filename);
};

/**
 * Generates and downloads a 2-page PDF (Home on Page 1, Away on Page 2) for a match.
 */
export const generateMatchSubstitutionCardsPDF = async (options: GenerateMatchCardsOptions) => {
    const { match, homeTeamName, awayTeamName, leagueLogoUrl } = options;

    const homeName = homeTeamName || match.homeTeam?.name || 'Local';
    const awayName = awayTeamName || match.awayTeam?.name || 'Visitante';
    const matchday = match.matchday || 1;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    const homeLogoUrl = resolveImageUrl(match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl);
    const awayLogoUrl = resolveImageUrl(match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl);
    const leagueUrl = resolveImageUrl(leagueLogoUrl);

    // Preload all assets in parallel O(1)
    const [homeWatermark, awayWatermark, leagueLogoImg] = await Promise.all([
        createWatermarkImage(homeLogoUrl, 0.16),
        createWatermarkImage(awayLogoUrl, 0.16),
        leagueUrl ? fetchImageAsBase64(leagueUrl) : Promise.resolve(null),
    ]);

    // Page 1: Home Team
    renderTeamSheetOnPage(doc, homeName, matchday, homeWatermark, leagueLogoImg);

    // Page 2: Away Team
    doc.addPage('letter', 'portrait');
    renderTeamSheetOnPage(doc, awayName, matchday, awayWatermark, leagueLogoImg);

    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `Tarjetas_Cambio_J${matchday}_${sanitize(homeName)}_vs_${sanitize(awayName)}.pdf`;
    doc.save(filename);
};

/**
 * Generates and downloads a consolidated PDF for ALL matches in a matchday.
 * Uses an in-memory Map cache to ensure O(N) image processing across all teams.
 */
export const generateMatchdaySubstitutionCardsPDF = async (options: GenerateMatchdayCardsOptions) => {
    const { matches, matchday, leagueLogoUrl } = options;

    if (!matches || matches.length === 0) {
        throw new Error('No hay partidos para generar tarjetas.');
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    const leagueUrl = resolveImageUrl(leagueLogoUrl);
    const leagueLogoImg = leagueUrl ? await fetchImageAsBase64(leagueUrl) : null;

    // Collect distinct teams O(N)
    interface TeamInfo {
        id: string;
        name: string;
        logoUrl?: string;
        signedLogoUrl?: string;
    }
    const teamMap = new Map<string, TeamInfo>();

    matches.forEach((m) => {
        const homeId = m.homeTeam?.id || m.homeTeamId || 'home_' + m.id;
        const homeName = m.homeTeam?.name || 'Local';
        const homeLogo = m.homeTeam?.logoUrl;
        const homeSigned = m.homeTeam?.signedLogoUrl;
        if (!teamMap.has(homeId)) {
            teamMap.set(homeId, { id: homeId, name: homeName, logoUrl: homeLogo, signedLogoUrl: homeSigned });
        }

        const awayId = m.awayTeam?.id || m.awayTeamId || 'away_' + m.id;
        const awayName = m.awayTeam?.name || 'Visitante';
        const awayLogo = m.awayTeam?.logoUrl;
        const awaySigned = m.awayTeam?.signedLogoUrl;
        if (!teamMap.has(awayId)) {
            teamMap.set(awayId, { id: awayId, name: awayName, logoUrl: awayLogo, signedLogoUrl: awaySigned });
        }
    });

    // Preload and watermark all unique team logos in parallel O(N)
    const watermarkCache = new Map<string, FetchedImage | null>();
    const teamsList = Array.from(teamMap.values());

    await Promise.all(
        teamsList.map(async (t) => {
            const resolvedUrl = resolveImageUrl(t.signedLogoUrl || t.logoUrl);
            const wm = await createWatermarkImage(resolvedUrl, 0.16);
            watermarkCache.set(t.id, wm);
        })
    );

    // Render 1 page per team
    let isFirstPage = true;
    for (const team of teamsList) {
        if (!isFirstPage) {
            doc.addPage('letter', 'portrait');
        }
        isFirstPage = false;
        const wm = watermarkCache.get(team.id) || null;
        renderTeamSheetOnPage(doc, team.name, matchday, wm, leagueLogoImg);
    }

    const filename = `Tarjetas_Cambio_Jornada_${matchday}_Completa.pdf`;
    doc.save(filename);
};
