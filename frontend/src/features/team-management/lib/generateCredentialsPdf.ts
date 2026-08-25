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

const fetchImageAsBase64 = async (url: string): Promise<FetchedImage> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
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
        img.onerror = () => resolve({ dataUrl, width: 1, height: 1 }); // fallback
        img.src = dataUrl;
    });
};

const resolveImageUrl = async (srcKey?: string): Promise<string | undefined> => {
    if (!srcKey) return undefined;
    if (srcKey.startsWith('http://') || srcKey.startsWith('https://') || srcKey.startsWith('data:')) {
        return srcKey;
    }
    try {
        return leagueApi.getProxyUrl(srcKey);
    } catch (e) {
        console.error('Error resolving proxy url for', srcKey, e);
        return undefined;
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
    if (leagueLogoUrl) {
        try {
            leagueLogoImg = await fetchImageAsBase64(leagueLogoUrl);
        } catch (e) {
            console.error('Failed to load league logo');
        }
    }

    const teamLogoUrl = await resolveImageUrl(team.signedLogoUrl || team.logoUrl);
    let teamLogoImg: FetchedImage | undefined;
    if (teamLogoUrl) {
        try {
            teamLogoImg = await fetchImageAsBase64(teamLogoUrl);
        } catch (e) {
            console.error('Failed to load team logo');
        }
    }

    // 2. Pre-fetch player photos in parallel to speed up generation
    const playerPhotoPromises = players.map(async (player) => {
        const photoUrl = await resolveImageUrl(player.profilePhotoUrl);
        if (photoUrl) {
            try {
                return await fetchImageAsBase64(photoUrl);
            } catch (e) {
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
            const logoW = 14;
            const logoH = 14 * (leagueLogoImg.height / leagueLogoImg.width);
            doc.addImage(leagueLogoImg.dataUrl, x + (cardWidth - logoW) / 2, y + 5, logoW, logoH);
        } else {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bolditalic");
            doc.text("LIGA", x + cardWidth / 2, y + 10, { align: 'center' });
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
        doc.setFontSize(11);
        doc.setFont("helvetica", "bolditalic");
        const fullName = `${player.firstName} ${player.lastName}`.toUpperCase();
        const splitName = doc.splitTextToSize(fullName, cardWidth - 4);
        doc.text(splitName[0], x + cardWidth / 2, photoY + photoSize + 7, { align: 'center' });

        // -- Draw Team Name Banner --
        const bannerY = photoY + photoSize + 11;
        doc.setFillColor(250, 204, 21); // gold
        doc.rect(x, bannerY, cardWidth, 8, 'F');
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bolditalic");
        doc.setTextColor(15, 23, 42); // slate-900 (dark)
        const teamNameSplit = doc.splitTextToSize(team.name.toUpperCase(), cardWidth - 4);
        doc.text(teamNameSplit[0], x + cardWidth / 2, bannerY + 5.5, { align: 'center' });

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
