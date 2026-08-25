import jsPDF from 'jspdf';
import { Player, Team, leagueApi } from '@/shared/api/league-api';

interface GenerateCredentialsOptions {
    team: Team;
    players: Player[];
    leagueLogoUrl?: string;
}

interface FetchedImage {
    dataUrl: string;
    width: number;
    height: number;
}

const extractR2Key = (urlOrKey: string): string | null => {
    if (!urlOrKey) return null;
    const clean = urlOrKey.trim();
    if (clean.startsWith('dev/tenants/') || clean.startsWith('prod/tenants/') || clean.startsWith('tenants/')) {
        return clean;
    }
    if (clean.includes('r2.cloudflarestorage.com/')) {
        try {
            const parsed = new URL(clean);
            // pathname is e.g. /leagueos-media/dev/tenants/...
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length > 1) {
                return parts.slice(1).join('/');
            }
            return parts.join('/');
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

const fetchImageAsBase64 = async (url: string): Promise<FetchedImage> => {
    if (url.startsWith('data:')) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                if (url.includes('image/svg')) {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width || 200;
                    canvas.height = img.height || 200;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
                        return;
                    }
                }
                resolve({ dataUrl: url, width: img.width, height: img.height });
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (rawDataUrl.includes('image/svg')) {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width || 200;
                    canvas.height = img.naturalHeight || img.height || 200;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
                        return;
                    }
                }
                resolve({ dataUrl: rawDataUrl, width: img.width, height: img.height });
            };
            img.onerror = () => resolve({ dataUrl: rawDataUrl, width: 1, height: 1 });
            img.src = rawDataUrl;
        });
    } catch (err) {
        // Fallback using crossOrigin Image and Canvas
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width || 200;
                canvas.height = img.naturalHeight || img.height || 200;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({
                        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
                        width: canvas.width,
                        height: canvas.height
                    });
                } else {
                    reject(new Error('Canvas context failed'));
                }
            };
            img.onerror = reject;
            img.src = url;
        });
    }
};

export const generateCredentialsPdf = async (options: GenerateCredentialsOptions) => {
    const { team, players, leagueLogoUrl } = options;

    if (!players || players.length === 0) {
        throw new Error('No hay jugadores registrados en este equipo.');
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 3x3 layout
    const cols = 3;
    const rows = 3;
    
    const cardWidth = 60;
    const cardHeight = 90;

    // Calculate margins to center the 3x3 grid
    const totalWidth = cols * cardWidth;
    const totalHeight = rows * cardHeight;
    const marginX = (pageWidth - totalWidth) / 2;
    const marginY = (pageHeight - totalHeight) / 2;

    // 1. Pre-load common images (League Logo & Team Logo)
    let leagueLogoImg: FetchedImage | undefined;
    const targetLeagueLogo = leagueLogoUrl || '/nuestro_deporte_logo.png';
    const resolvedLeagueLogo = resolveImageUrl(targetLeagueLogo);
    if (resolvedLeagueLogo) {
        try {
            leagueLogoImg = await fetchImageAsBase64(resolvedLeagueLogo);
        } catch (e) {
            console.error('Failed to load league logo', e);
        }
    }

    const teamLogoUrl = resolveImageUrl(team.signedLogoUrl || team.logoUrl);
    let teamLogoImg: FetchedImage | undefined;
    if (teamLogoUrl) {
        try {
            teamLogoImg = await fetchImageAsBase64(teamLogoUrl);
        } catch (e) {
            console.error('Failed to load team logo', e);
        }
    }

    // 2. Pre-fetch player photos in parallel to speed up generation
    const playerPhotoPromises = players.map(async (player) => {
        const photoUrl = resolveImageUrl(player.profilePhotoUrl);
        if (photoUrl) {
            try {
                return await fetchImageAsBase64(photoUrl);
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

        // -- Draw Card Background --
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(x, y, cardWidth, cardHeight, 'F');
        
        // -- Sporty Angle Top Background --
        doc.setFillColor(30, 58, 138); // blue-900
        doc.triangle(x, y, x + cardWidth, y, x + cardWidth, y + 45, 'F');

        // -- Border --
        doc.setDrawColor(51, 65, 85); // slate-700
        doc.setLineWidth(0.5);
        doc.rect(x, y, cardWidth, cardHeight, 'D');

        // Header Line (LeagueOS style)
        doc.setFillColor(59, 130, 246); // blue-500
        doc.rect(x, y, cardWidth, 3, 'F');

        // -- Draw League Logo (Center Top) --
        if (leagueLogoImg) {
            const maxW = 26;
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
            doc.addImage(leagueLogoImg.dataUrl, logoX, logoY, logoW, logoH);
        } else {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bolditalic");
            doc.text("LIGA NUESTRO DEPORTE", x + cardWidth / 2, y + 12, { align: 'center' });
        }

        // -- Draw Player Photo (Center) --
        const photoImg = playerPhotos[i];
        const photoSize = 36;
        const photoX = x + (cardWidth - photoSize) / 2;
        const photoY = y + 21;

        if (photoImg) {
            // Draw photo
            doc.addImage(photoImg.dataUrl, photoX, photoY, photoSize, photoSize);
            // Draw a nice sporty border around photo
            doc.setDrawColor(250, 204, 21); // gold
            doc.setLineWidth(1.2);
            doc.rect(photoX, photoY, photoSize, photoSize);
        } else {
            // Placeholder silhouette
            doc.setFillColor(51, 65, 85); // slate-700
            doc.rect(photoX, photoY, photoSize, photoSize, 'F');
            doc.setDrawColor(250, 204, 21);
            doc.setLineWidth(1.2);
            doc.rect(photoX, photoY, photoSize, photoSize);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.setFontSize(8);
            doc.setFont("helvetica", "bolditalic");
            doc.text("FOTO", photoX + photoSize / 2, photoY + photoSize / 2 + 3, { align: 'center' });
        }

        // -- Draw Player Name --
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bolditalic");
        const fullName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim().toUpperCase();
        
        let nameFontSize = 10.5;
        doc.setFontSize(nameFontSize);
        
        // Auto-scale font size down to 7.5 if single line can fit
        while (doc.getTextWidth(fullName) > cardWidth - 4 && nameFontSize > 7.5) {
            nameFontSize -= 0.5;
            doc.setFontSize(nameFontSize);
        }

        const splitName = doc.splitTextToSize(fullName, cardWidth - 4);
        if (splitName.length === 1) {
            doc.text(splitName[0], x + cardWidth / 2, photoY + photoSize + 6.5, { align: 'center' });
        } else {
            // If name wraps across 2 lines, adjust font size and line height
            doc.setFontSize(Math.min(nameFontSize, 8.5));
            doc.text(splitName.slice(0, 2), x + cardWidth / 2, photoY + photoSize + 4.5, { align: 'center', lineHeightFactor: 1.15 });
        }

        // -- Draw Team Name Banner --
        const bannerY = photoY + photoSize + 11;
        doc.setFillColor(250, 204, 21); // gold
        doc.rect(x, bannerY, cardWidth, 8, 'F');
        
        doc.setTextColor(15, 23, 42); // slate-900 (dark)
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

        // -- Draw Team Logo (Bottom Left) --
        if (teamLogoImg) {
            const tLogoW = 14;
            const tLogoH = 14 * (teamLogoImg.height / teamLogoImg.width);
            doc.addImage(teamLogoImg.dataUrl, x + 4, y + cardHeight - tLogoH - 4, tLogoW, tLogoH);
        }

        // -- Draw Jersey Number (Bottom Right) --
        if (player.jerseyNumber !== undefined && player.jerseyNumber !== null) {
            doc.setFontSize(32);
            doc.setFont("helvetica", "bolditalic");
            doc.setTextColor(255, 255, 255); // white
            doc.text(`${player.jerseyNumber}`, x + cardWidth - 4, y + cardHeight - 3, { align: 'right' });
        }
    }

    doc.save(`Credenciales_${team.name.replace(/\s+/g, '_')}.pdf`);
};
