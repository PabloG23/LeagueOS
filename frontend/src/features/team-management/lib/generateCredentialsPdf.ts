import jsPDF from 'jspdf';
import { Player, Team, leagueApi } from '@/shared/api/league-api';

interface GenerateCredentialsOptions {
    team: Team;
    players: Player[];
    leagueLogoUrl?: string;
    requireJerseyNumbers?: boolean;
    showJerseyNumberOnCredentials?: boolean;
    themeClass?: string;
    tenantId?: string;
    leagueName?: string;
}

interface CredentialThemePalette {
    photoBorder: [number, number, number];
    bannerBg: [number, number, number];
    bannerText: [number, number, number];
    accentLine?: [number, number, number];
    bottomBg: [number, number, number];
    jerseyNumberText: [number, number, number];
    playerNameText: [number, number, number];
    trimBorder: [number, number, number];
    defaultLeagueLogo: string;
    fallbackLeagueName: string;
}

const CREDENTIAL_THEMES: Record<string, CredentialThemePalette> = {
    'theme-metepec': {
        photoBorder: [147, 197, 114],       // Verde Pistache (#93C572)
        bannerBg: [147, 197, 114],          // Verde Pistache (#93C572)
        bannerText: [14, 18, 16],           // Obsidiana (#0E1210) para contraste óptimo
        accentLine: [201, 165, 74],         // Dorado Metepec (#C9A54A)
        bottomBg: [14, 18, 16],             // Obsidiana (#0E1210)
        jerseyNumberText: [255, 255, 255],  // Blanco puro
        playerNameText: [14, 18, 16],       // Obsidiana (#0E1210)
        trimBorder: [203, 213, 225],        // slate-300
        defaultLeagueLogo: '/ligaMunicipalMetepec.png',
        fallbackLeagueName: 'LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.',
    },
    'theme-san-lucas': {
        photoBorder: [5, 150, 105],         // Esmeralda 600 (#059669)
        bannerBg: [5, 150, 105],            // Esmeralda 600 (#059669)
        bannerText: [255, 255, 255],        // Blanco
        bottomBg: [6, 95, 70],              // Esmeralda 800 (#065F46)
        jerseyNumberText: [255, 255, 255],  // Blanco
        playerNameText: [15, 23, 42],       // Slate-900
        trimBorder: [148, 163, 184],        // Slate-400
        defaultLeagueLogo: '/san_lucas_logo.png',
        fallbackLeagueName: 'LIGA EJIDAL DE FUTBOL SAN SEBASTIAN Y SAN LUCAS',
    },
    'theme-nuestro-deporte': {
        photoBorder: [220, 38, 38],         // Rojo Copa (#DC2626)
        bannerBg: [220, 38, 38],            // Rojo Copa (#DC2626)
        bannerText: [255, 255, 255],        // Blanco
        bottomBg: [15, 23, 42],             // Slate-900 (#0F172A)
        jerseyNumberText: [255, 255, 255],  // Blanco
        playerNameText: [15, 23, 42],       // Slate-900
        trimBorder: [148, 163, 184],        // Slate-400
        defaultLeagueLogo: '/nuestro_deporte_logo.png',
        fallbackLeagueName: 'LIGA NUESTRO DEPORTE',
    },
};

const resolveTheme = (themeClass?: string, tenantId?: string): CredentialThemePalette => {
    if (themeClass && CREDENTIAL_THEMES[themeClass]) {
        return CREDENTIAL_THEMES[themeClass];
    }
    if (tenantId === 'e39a6b17-5646-452d-929c-ca9a8dc4e44d') {
        return CREDENTIAL_THEMES['theme-metepec'];
    }
    if (tenantId === '22222222-2222-2222-2222-222222222222') {
        return CREDENTIAL_THEMES['theme-san-lucas'];
    }
    return CREDENTIAL_THEMES['theme-nuestro-deporte'];
};

interface FetchedImage {
    dataUrl: string;
    width: number;
    height: number;
}

const extractR2Key = (urlOrKey: string): string | null => {
    if (!urlOrKey) return null;
    const clean = urlOrKey.trim();

    // 1. Direct relative keys e.g. "prod/tenants/...", "dev/tenants/...", "tenants/..."
    if (clean.startsWith('dev/tenants/') || clean.startsWith('prod/tenants/') || clean.startsWith('tenants/')) {
        try {
            return decodeURIComponent(clean);
        } catch {
            return clean;
        }
    }

    // 2. Any URL containing "/tenants/" (custom domain, R2 bucket domain, presigned URL, etc.)
    const tenantsMatch = clean.match(/(?:dev\/|prod\/)?tenants\/[^\s?#]+/);
    if (tenantsMatch) {
        try {
            return decodeURIComponent(tenantsMatch[0]);
        } catch {
            return tenantsMatch[0];
        }
    }

    // 3. Fallback for r2.cloudflarestorage.com URLs
    if (clean.includes('r2.cloudflarestorage.com/')) {
        try {
            const parsed = new URL(clean);
            const parts = parsed.pathname.split('/').filter(Boolean);
            const result = parts.length > 1 ? parts.slice(1).join('/') : parts.join('/');
            return decodeURIComponent(result);
        } catch (_) {
            return null;
        }
    }
    return null;
};

const resolveImageUrl = (srcKey?: string): string | undefined => {
    if (!srcKey || !srcKey.trim()) return undefined;
    const clean = srcKey.trim();

    // 1. Static frontend asset in /public (e.g. /nuestro_deporte_logo.png or /san_lucas_logo.png)
    if (clean.startsWith('/')) {
        return clean;
    }

    // 2. If it's an R2 key or an R2 signed URL, route it through backend proxy to avoid CORS issues
    const r2Key = extractR2Key(clean);
    if (r2Key) {
        return leagueApi.getProxyUrl(r2Key);
    }

    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
        return clean;
    }

    try {
        return leagueApi.getProxyUrl(clean);
    } catch (e) {
        console.error('Error resolving proxy url for', srcKey, e);
        return undefined;
    }
};

const fetchImageAsBase64 = async (url: string, rawFallbackUrl?: string): Promise<FetchedImage> => {
    const toPngDataUrl = (img: HTMLImageElement, maxDim = 400): FetchedImage => {
        let w = img.naturalWidth || img.width || 200;
        let h = img.naturalHeight || img.height || 200;
        if (w > maxDim || h > maxDim) {
            if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
            } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            return {
                dataUrl: canvas.toDataURL('image/png'),
                width: w,
                height: h
            };
        }
        return { dataUrl: img.src, width: w, height: h };
    };

    if (url.startsWith('data:')) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Always convert to PNG via canvas to guarantee 100% jsPDF compatibility
                resolve(toPngDataUrl(img));
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    const tryFetch = async (targetUrl: string): Promise<FetchedImage> => {
        const fetchUrl = targetUrl.includes('?') ? `${targetUrl}&_t=${Date.now()}` : `${targetUrl}?_t=${Date.now()}`;
        const response = await fetch(fetchUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // ALWAYS convert via canvas to PNG so that jsPDF gets valid PNG bytes,
                // regardless of whether the original image was WebP, JPEG, PNG or SVG.
                try {
                    resolve(toPngDataUrl(img));
                } catch {
                    resolve({ dataUrl: rawDataUrl, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
                }
            };
            img.onerror = reject;
            img.src = rawDataUrl;
        });
    };

    try {
        return await tryFetch(url);
    } catch (err) {
        // If proxy or primary URL failed, and we have a raw original URL, attempt fetching rawFallbackUrl
        if (rawFallbackUrl && rawFallbackUrl !== url) {
            try {
                return await tryFetch(rawFallbackUrl);
            } catch (_) {}
        }

        // Fallback using crossOrigin Image and Canvas
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                resolve(toPngDataUrl(img));
            };
            img.onerror = reject;
            img.src = url;
        });
    }
};

export const generateCredentialsPdf = async (options: GenerateCredentialsOptions) => {
    const {
        team,
        players: inputPlayers,
        leagueLogoUrl,
        themeClass,
        tenantId,
        leagueName,
        requireJerseyNumbers,
        showJerseyNumberOnCredentials,
    } = options;

    // Regla del tenant: en credenciales se muestra el dorsal a menos que la regla del tenant lo desactive expresamente (showJerseyNumberOnCredentials === false)
    const showJerseyNumber = showJerseyNumberOnCredentials !== false;

    const players = (inputPlayers || []).filter(p => !p.status || p.status === 'ACTIVE');

    if (!players || players.length === 0) {
        throw new Error('No hay jugadores activos registrados en este equipo.');
    }

    const theme = resolveTheme(themeClass, tenantId);

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 3x3 layout
    const cols = 3;
    const rows = 3;
    
    // Medidas solicitadas por el cliente: 6.5 cm x 9.5 cm (65mm x 95mm)
    const cardWidth = 65;
    const cardHeight = 95;

    // Calculate margins to center the 3x3 grid
    const totalWidth = cols * cardWidth;
    const totalHeight = rows * cardHeight;
    const marginX = (pageWidth - totalWidth) / 2;
    const marginY = (pageHeight - totalHeight) / 2;

    // 1. Pre-load common images (League Logo & Team Logo)
    let leagueLogoImg: FetchedImage | undefined;
    const targetLeagueLogo = leagueLogoUrl || theme.defaultLeagueLogo;
    const resolvedLeagueLogo = resolveImageUrl(targetLeagueLogo);
    if (resolvedLeagueLogo) {
        try {
            leagueLogoImg = await fetchImageAsBase64(resolvedLeagueLogo, targetLeagueLogo);
        } catch (e) {
            console.error('Failed to load league logo', e);
        }
    }

    const rawTeamLogo = team.signedLogoUrl || team.logoUrl;
    const teamLogoUrl = resolveImageUrl(rawTeamLogo);
    let teamLogoImg: FetchedImage | undefined;
    if (teamLogoUrl) {
        try {
            teamLogoImg = await fetchImageAsBase64(teamLogoUrl, rawTeamLogo);
        } catch (e) {
            console.error('Failed to load team logo', e);
        }
    }

    // 2. Pre-fetch player photos in parallel to speed up generation
    const playerPhotoPromises = players.map(async (player) => {
        const rawPhoto = player.profilePhotoUrl;
        const photoUrl = resolveImageUrl(rawPhoto);
        if (photoUrl) {
            try {
                return await fetchImageAsBase64(photoUrl, rawPhoto);
            } catch (e) {
                console.warn(`Failed to fetch photo for player ${player.firstName} ${player.lastName}`, e);
                return undefined;
            }
        }
        return undefined;
    });

    const playerPhotos = await Promise.all(playerPhotoPromises);

    // 3. Draw PDF
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        
        // Add new page if needed (after 9 cards)
        if (i > 0 && i % 9 === 0) {
            doc.addPage();
        }

        const pageIndex = i % 9;
        const col = pageIndex % cols;
        const row = Math.floor(pageIndex / cols);

        const x = marginX + (col * cardWidth);
        const y = marginY + (row * cardHeight);

        // -- Fondo superior BLANCO (solicitado por cliente para ahorrar costos de impresión) --
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, cardWidth, cardHeight, 'F');

        // -- Dibujar Logo de la Liga (Centro Superior) --
        if (leagueLogoImg) {
            try {
                const maxW = 28;
                const maxH = 14;
                const aspect = leagueLogoImg.width / leagueLogoImg.height;
                let logoW = maxW;
                let logoH = maxW / aspect;
                if (logoH > maxH) {
                    logoH = maxH;
                    logoW = maxH * aspect;
                }
                const logoX = x + (cardWidth - logoW) / 2;
                const logoY = y + 4.5 + (maxH - logoH) / 2;
                doc.addImage(leagueLogoImg.dataUrl, 'PNG', logoX, logoY, logoW, logoH);
            } catch (err) {
                console.warn('Failed to render league logo in credentials PDF:', err);
            }
        } else {
            doc.setTextColor(theme.playerNameText[0], theme.playerNameText[1], theme.playerNameText[2]);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bolditalic");
            doc.text((leagueName || theme.fallbackLeagueName).toUpperCase(), x + cardWidth / 2, y + 12, { align: 'center' });
        }

        // -- Foto del Jugador (Centro) --
        const photoImg = playerPhotos[i];
        const photoSize = 38;
        const photoX = x + (cardWidth - photoSize) / 2;
        const photoY = y + 21;
        let photoDrawn = false;

        if (photoImg) {
            try {
                doc.addImage(photoImg.dataUrl, 'PNG', photoX, photoY, photoSize, photoSize);
                // Marco deportivo con el color de tema del tenant
                doc.setDrawColor(theme.photoBorder[0], theme.photoBorder[1], theme.photoBorder[2]);
                doc.setLineWidth(1.2);
                doc.rect(photoX, photoY, photoSize, photoSize);
                photoDrawn = true;
            } catch (err) {
                console.warn(`Failed to render photo for player ${player.firstName} ${player.lastName}:`, err);
            }
        }

        if (!photoDrawn) {
            // Placeholder limpio sobre fondo blanco
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(photoX, photoY, photoSize, photoSize, 'F');
            doc.setDrawColor(theme.photoBorder[0], theme.photoBorder[1], theme.photoBorder[2]);
            doc.setLineWidth(1.2);
            doc.rect(photoX, photoY, photoSize, photoSize);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.setFontSize(8);
            doc.setFont("helvetica", "bolditalic");
            doc.text("FOTO", photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: 'center' });
        }

        // -- Nombre del Jugador (Texto con color de tema sobre fondo blanco) --
        doc.setTextColor(theme.playerNameText[0], theme.playerNameText[1], theme.playerNameText[2]);
        doc.setFont("helvetica", "bolditalic");
        const fullName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim().toUpperCase();
        
        let nameFontSize = 10.5;
        doc.setFontSize(nameFontSize);
        
        // Auto-escalar tamaño de fuente si excede el ancho de la tarjeta
        while (doc.getTextWidth(fullName) > cardWidth - 4 && nameFontSize > 7.5) {
            nameFontSize -= 0.5;
            doc.setFontSize(nameFontSize);
        }

        const splitName = doc.splitTextToSize(fullName, cardWidth - 4);
        if (splitName.length === 1) {
            doc.text(splitName[0], x + cardWidth / 2, photoY + photoSize + 6, { align: 'center' });
        } else {
            doc.setFontSize(Math.min(nameFontSize, 8.5));
            doc.text(splitName.slice(0, 2), x + cardWidth / 2, photoY + photoSize + 4.5, { align: 'center', lineHeightFactor: 1.15 });
        }

        // -- Franja (Banner del Equipo) --
        const bannerY = photoY + photoSize + 11;
        const bannerHeight = 8;
        doc.setFillColor(theme.bannerBg[0], theme.bannerBg[1], theme.bannerBg[2]);
        doc.rect(x, bannerY, cardWidth, bannerHeight, 'F');
        
        // Línea de acento si el tema lo especifica (ej. Dorado Metepec)
        if (theme.accentLine) {
            doc.setFillColor(theme.accentLine[0], theme.accentLine[1], theme.accentLine[2]);
            doc.rect(x, bannerY + bannerHeight - 0.7, cardWidth, 0.7, 'F');
        }

        doc.setTextColor(theme.bannerText[0], theme.bannerText[1], theme.bannerText[2]);
        doc.setFont("helvetica", "bolditalic");
        const teamName = (team.name || '').trim().toUpperCase();
        let teamFontSize = 10.5;
        doc.setFontSize(teamFontSize);
        while (doc.getTextWidth(teamName) > cardWidth - 4 && teamFontSize > 7) {
            teamFontSize -= 0.5;
            doc.setFontSize(teamFontSize);
        }
        const teamNameSplit = doc.splitTextToSize(teamName, cardWidth - 4);
        if (teamNameSplit.length === 1) {
            doc.text(teamNameSplit[0], x + cardWidth / 2, bannerY + 5.5, { align: 'center' });
        } else {
            doc.text(teamNameSplit.slice(0, 2), x + cardWidth / 2, bannerY + 3.5, { align: 'center', lineHeightFactor: 1.1 });
        }

        // -- Sección inferior con color de tema del tenant --
        const bottomSectionY = bannerY + bannerHeight;
        const bottomSectionH = cardHeight - (bottomSectionY - y);
        doc.setFillColor(theme.bottomBg[0], theme.bottomBg[1], theme.bottomBg[2]);
        doc.rect(x, bottomSectionY, cardWidth, bottomSectionH, 'F');

        // -- Logo del Equipo (Centrado si no lleva dorsal según la regla del tenant, o a la izquierda si lleva dorsal) --
        if (teamLogoImg) {
            try {
                const maxLogoH = bottomSectionH - 4;
                let tLogoW = 14;
                let tLogoH = 14 * (teamLogoImg.height / teamLogoImg.width);
                if (tLogoH > maxLogoH) {
                    tLogoH = maxLogoH;
                    tLogoW = maxLogoH * (teamLogoImg.width / teamLogoImg.height);
                }
                const logoX = showJerseyNumber ? (x + 4) : (x + (cardWidth - tLogoW) / 2);
                doc.addImage(teamLogoImg.dataUrl, 'PNG', logoX, y + cardHeight - tLogoH - 3.5, tLogoW, tLogoH);
            } catch (err) {
                console.warn('Failed to render team logo in credentials PDF:', err);
            }
        }

        // -- Número de Dorsal (Abajo a la derecha, solo si la regla del tenant lo permite) --
        if (showJerseyNumber && player.jerseyNumber !== undefined && player.jerseyNumber !== null) {
            doc.setFontSize(32);
            doc.setFont("helvetica", "bolditalic");
            doc.setTextColor(theme.jerseyNumberText[0], theme.jerseyNumberText[1], theme.jerseyNumberText[2]);
            doc.text(`${player.jerseyNumber}`, x + cardWidth - 4, y + cardHeight - 3, { align: 'right' });
        }

        // -- Borde exterior / Guía de recorte para las micas (0.3mm para fácil corte) --
        doc.setDrawColor(theme.trimBorder[0], theme.trimBorder[1], theme.trimBorder[2]);
        doc.setLineWidth(0.3);
        doc.rect(x, y, cardWidth, cardHeight, 'D');
    }

    const cleanTeamName = (team.name || 'Equipo').trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const fileName = `Credenciales_${cleanTeamName}.pdf`;

    try {
        const rawBlob = doc.output('blob');
        const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            try {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(blobUrl);
            } catch (_) {}
        }, 60000);
    } catch {
        doc.save(fileName);
    }
};
