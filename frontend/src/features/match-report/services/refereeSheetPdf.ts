import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Match, Player } from '@/shared/api/league-api';

export interface GenerateRefereeSheetParams {
    match: Match;
    homeTeamName: string;
    awayTeamName: string;
    homeRoster: Player[];
    awayRoster: Player[];
    seasonName?: string;
    leagueName?: string;
    leagueLogoUrl?: string;
    refereeName?: string;
}

/**
 * Loads an image from a URL and converts it to an HTMLImageElement.
 */
const loadImage = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
        if (!url) {
            resolve(null);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

/**
 * Helper to truncate text with ellipsis if it exceeds the maxWidth (in mm).
 */
const fitText = (doc: jsPDF, text: string, maxWidth: number): string => {
    if (!text) return '';
    if (doc.getTextWidth(text) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidth) {
        truncated = truncated.slice(0, -1);
    }
    return truncated ? `${truncated.trim()}...` : '';
};

/**
 * Generates and downloads the Official Printed Match Sheet (Cédula Arbitral)
 * in a strictly SINGLE-PAGE Letter Landscape format (279.4 mm x 215.9 mm).
 */
export const generateRefereeMatchSheetPDF = async ({
    match,
    homeTeamName,
    awayTeamName,
    homeRoster,
    awayRoster,
    seasonName,
    leagueName = 'Liga Deportiva',
    leagueLogoUrl,
    refereeName,
}: GenerateRefereeSheetParams) => {
    // 1. Initialize jsPDF in Letter Landscape
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
    });

    const pageWidth = doc.internal.pageSize.getWidth();   // 279.4 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 215.9 mm
    const margin = 7; // Compact margins
    const contentWidth = pageWidth - margin * 2; // 265.4 mm

    // 2. Try loading league logo
    let logoImg: HTMLImageElement | null = null;
    if (leagueLogoUrl) {
        try {
            logoImg = await loadImage(leagueLogoUrl);
        } catch {
            logoImg = null;
        }
    }

    // --- HEADER SECTION (Y: 5.5 to 21 mm) ---
    const headerTopY = 5.5;
    let textStartX = margin;

    if (logoImg) {
        try {
            const logoSize = 14.5;
            doc.addImage(logoImg, 'PNG', margin, headerTopY, logoSize, logoSize, undefined, 'FAST');
            textStartX = margin + logoSize + 3;
        } catch (e) {
            console.warn('Could not render logo in PDF:', e);
        }
    }

    // 1. Calculate width of League Name & Title on the left
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const maxLeagueNameWidth = logoImg ? 65 : 80;
    const displayedLeagueName = fitText(doc, leagueName.toUpperCase(), maxLeagueNameWidth);
    const leagueNameWidth = doc.getTextWidth(displayedLeagueName);

    doc.setFontSize(8.5);
    const docTitleText = 'CÉDULA ARBITRAL OFICIAL';
    const docTitleWidth = doc.getTextWidth(docTitleText);

    // Render left header (League name + subtitle)
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(displayedLeagueName, textStartX, headerTopY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text(docTitleText, textStartX, headerTopY + 11.2);

    // --- MATCH METADATA CARD ---
    // Colinda inmediatamente con el nombre de la liga (3.5 mm gap) y abarca todo el ancho restante hasta el margen derecho
    const leftBlockWidth = Math.max(leagueNameWidth, docTitleWidth);
    const metaCardX = textStartX + leftBlockWidth + 3.5;
    const metaCardWidth = (pageWidth - margin) - metaCardX;
    const metaCardY = headerTopY;
    const metaCardHeight = 14.5;

    // Draw metadata container card
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(metaCardX, metaCardY, metaCardWidth, metaCardHeight, 1.5, 1.5, 'FD');

    // Format Date and Time if set in app
    let formattedDate = '';
    let formattedTime = '';
    if (match.matchDate) {
        try {
            const d = new Date(match.matchDate);
            formattedDate = d.toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
            formattedTime = d.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            formattedDate = '';
            formattedTime = '';
        }
    }

    // Dynamic column widths inside meta card to maximize space for Torneo and Cancha/Árbitro
    const col2Width = 34; // Jornada & Hora
    const remainingWidth = metaCardWidth - col2Width;
    const col1Width = remainingWidth * 0.52; // Torneo & Fecha (~52%)
    const col3Width = remainingWidth * 0.48; // Cancha & Árbitro (~48%)

    const div1X = metaCardX + col1Width;
    const div2X = div1X + col2Width;

    // Dividers between columns
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(div1X, metaCardY + 1.8, div1X, metaCardY + metaCardHeight - 1.8);
    doc.line(div2X, metaCardY + 1.8, div2X, metaCardY + metaCardHeight - 1.8);

    doc.setFontSize(7.2);
    const row1Y = metaCardY + 4.8;
    const row2Y = metaCardY + 10.8;

    // --- COLUMN 1: TORNEO & FECHA ---
    const col1X = metaCardX + 3;
    // Row 1: TORNEO
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TORNEO:', col1X, row1Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const maxSeasonWidth = Math.max(25, col1Width - 18);
    const seasonText = fitText(doc, (seasonName || 'Torneo Oficial').toUpperCase(), maxSeasonWidth);
    doc.text(seasonText, col1X + 14.5, row1Y);

    // Row 2: FECHA
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('FECHA:', col1X, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const maxDateWidth = Math.max(25, col1Width - 15);
    const dateText = fitText(doc, formattedDate || 'Por definir', maxDateWidth);
    doc.text(dateText, col1X + 11.5, row2Y);

    // --- COLUMN 2: JORNADA & HORA ---
    const col2X = div1X + 3;
    // Row 1: JORNADA
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('JORNADA:', col2X, row1Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const roundText = fitText(doc, `${match.matchday || 1}`, 17);
    doc.text(roundText, col2X + 15, row1Y);

    // Row 2: HORA
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('HORA:', col2X, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const timeText = fitText(doc, formattedTime || '--:--', 21);
    doc.text(timeText, col2X + 10, row2Y);

    // --- COLUMN 3: CANCHA & ÁRBITRO ---
    const col3X = div2X + 3;
    // Row 1: CANCHA
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('CANCHA:', col3X, row1Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const maxLocationWidth = Math.max(25, col3Width - 17);
    const locationText = fitText(doc, (match.location || 'Por definir').toUpperCase(), maxLocationWidth);
    doc.text(locationText, col3X + 14, row1Y);

    // Row 2: ÁRBITRO
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('ÁRBITRO:', col3X, row2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const maxRefereeWidth = Math.max(25, col3Width - 17);
    const effectiveRefereeName = refereeName || match.referee?.name;
    if (effectiveRefereeName) {
        const refText = fitText(doc, effectiveRefereeName.toUpperCase(), maxRefereeWidth);
        doc.text(refText, col3X + 14, row2Y);
    } else {
        doc.text('___________________', col3X + 14, row2Y);
    }

    // --- TEAMS ROSTER TABLES (SIDE BY SIDE) ---
    const tableGap = 15.4;
    const tableWidth = (contentWidth - tableGap) / 2; // 125 mm each
    const homeStartX = margin;
    const awayStartX = margin + tableWidth + tableGap;
    const bannerY = headerTopY + 17;
    const bannerHeight = 5;

    // Prepare rosters (strictly active and non-suspended players for this matchday)
    const targetMatchday = match.matchday || 1;
    const prepareRosterRows = (roster: Player[]) => {
        // Filtrar estrictamente solo jugadores activos y no suspendidos
        const activePlayers = roster.filter((p) => {
            if (p.status && p.status.toUpperCase() !== 'ACTIVE') return false;
            if (p.suspendedUntilMatchday && targetMatchday <= p.suspendedUntilMatchday) {
                return false;
            }
            return true;
        });

        const sorted = [...activePlayers].sort((a, b) => {
            if (a.jerseyNumber != null && b.jerseyNumber != null) {
                return a.jerseyNumber - b.jerseyNumber;
            }
            if (a.jerseyNumber != null) return -1;
            if (b.jerseyNumber != null) return 1;
            return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        });

        const rows = sorted.map((p) => [
            p.jerseyNumber != null ? String(p.jerseyNumber) : '-',
            `${p.firstName} ${p.lastName}`.trim().toUpperCase(),
            '[  ]', // J
            '',     // G
            '[  ]', // TA
            '[  ]', // TR
        ]);

        // Add 2 blank rows for write-ins
        for (let i = 0; i < 2; i++) {
            rows.push(['', '', '[  ]', '', '[  ]', '[  ]']);
        }

        return rows;
    };

    const homeRows = prepareRosterRows(homeRoster);
    const awayRows = prepareRosterRows(awayRoster);

    // Balance row count so tables are visually aligned
    const maxRowCount = Math.max(homeRows.length, awayRows.length);
    while (homeRows.length < maxRowCount) {
        homeRows.push(['', '', '[  ]', '', '[  ]', '[  ]']);
    }
    while (awayRows.length < maxRowCount) {
        awayRows.push(['', '', '[  ]', '', '[  ]', '[  ]']);
    }

    // Dynamic sizing based on row count to strictly fit in available height
    // Available height between start of table (Y=27) and footer (Y=182) is ~155 mm
    const availableTableHeight = 153;
    const calculatedRowHeight = Math.min(4.8, Math.max(3.2, (availableTableHeight - 5) / maxRowCount));
    const fontSize = calculatedRowHeight < 3.8 ? 6.2 : (calculatedRowHeight < 4.4 ? 6.8 : 7.2);
    const cellPadding = calculatedRowHeight < 3.8 ? 0.35 : 0.55;

    const headers = [
        [
            { content: '#', styles: { halign: 'center' as const } },
            { content: 'NOMBRE DEL JUGADOR', styles: { halign: 'left' as const } },
            { content: 'J', styles: { halign: 'center' as const } },
            { content: 'G', styles: { halign: 'center' as const } },
            { content: 'TA', styles: { halign: 'center' as const } },
            { content: 'TR', styles: { halign: 'center' as const } },
        ],
    ];

    const columnStyles = {
        0: { cellWidth: 8, halign: 'center' as const },
        1: { cellWidth: 77, halign: 'left' as const },
        2: { cellWidth: 10, halign: 'center' as const },
        3: { cellWidth: 10, halign: 'center' as const },
        4: { cellWidth: 10, halign: 'center' as const },
        5: { cellWidth: 10, halign: 'center' as const },
    };

    // Draw Team Banners
    // Home Team Banner
    doc.setFillColor(30, 58, 138); // blue-900
    doc.roundedRect(homeStartX, bannerY, tableWidth, bannerHeight, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    const homeBannerText = fitText(doc, `LOCAL: ${homeTeamName.toUpperCase()}`, tableWidth - 6);
    doc.text(homeBannerText, homeStartX + 3, bannerY + 3.6);

    // Away Team Banner
    doc.setFillColor(88, 28, 135); // purple-900
    doc.roundedRect(awayStartX, bannerY, tableWidth, bannerHeight, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    const awayBannerText = fitText(doc, `VISITANTE: ${awayTeamName.toUpperCase()}`, tableWidth - 6);
    doc.text(awayBannerText, awayStartX + 3, bannerY + 3.6);

    const tableStartY = bannerY + bannerHeight + 0.5;

    // Draw Home Table
    doc.setPage(1);
    autoTable(doc, {
        head: headers,
        body: homeRows,
        startY: tableStartY,
        margin: { left: homeStartX, right: pageWidth - (homeStartX + tableWidth), top: 6, bottom: 28 },
        tableWidth: tableWidth,
        theme: 'grid',
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        styles: {
            fontSize: fontSize,
            cellPadding: cellPadding,
            lineColor: [203, 213, 225],
            lineWidth: 0.12,
            textColor: [15, 23, 42],
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
            fontSize: fontSize,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles,
    });

    // Reset back to Page 1 before rendering away table (to prevent page splits)
    doc.setPage(1);

    // Draw Away Table
    autoTable(doc, {
        head: headers,
        body: awayRows,
        startY: tableStartY,
        margin: { left: awayStartX, right: margin, top: 6, bottom: 28 },
        tableWidth: tableWidth,
        theme: 'grid',
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        styles: {
            fontSize: fontSize,
            cellPadding: cellPadding,
            lineColor: [203, 213, 225],
            lineWidth: 0.12,
            textColor: [15, 23, 42],
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [30, 41, 59],
            fontStyle: 'bold',
            fontSize: fontSize,
            lineColor: [203, 213, 225],
            lineWidth: 0.15,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles,
    });

    // Make sure we stay on Page 1
    doc.setPage(1);

    // --- BOTTOM SECTION (FIXED AT THE BOTTOM OF THE SINGLE PAGE) ---
    const footerStartY = 184; // Leaves 31.9 mm to the bottom of the 215.9 mm page

    // 1. Final Score Bar
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, footerStartY, contentWidth, 6, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
        `MARCADOR FINAL:     [  LOCAL:  _______  ]        vs        [  VISITANTE:  _______  ]`,
        pageWidth / 2,
        footerStartY + 4.2,
        { align: 'center' }
    );

    // 2. Observations & Incidents Box
    const obsY = footerStartY + 7.5;
    const obsHeight = 11;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, obsY, contentWidth, obsHeight, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('INCIDENCIAS / OBSERVACIONES DEL CUERPO ARBITRAL:', margin + 3, obsY + 3.2);

    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(226, 232, 240);
    // Draw 2 handwriting guide lines
    doc.line(margin + 3, obsY + 6.2, margin + contentWidth - 3, obsY + 6.2);
    doc.line(margin + 3, obsY + 9.5, margin + contentWidth - 3, obsY + 9.5);

    // 3. Validation Signatures (3 Columns)
    const sigY = obsY + obsHeight + 2;
    const sigColWidth = contentWidth / 3;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    // Captain Local
    const sig1CenterX = margin + sigColWidth * 0.5;
    doc.line(sig1CenterX - 24, sigY + 4.5, sig1CenterX + 24, sigY + 4.5);
    doc.text('Firma Capitán Local', sig1CenterX, sigY + 7.8, { align: 'center' });

    // Main Referee
    const sig2CenterX = margin + sigColWidth * 1.5;
    doc.line(sig2CenterX - 24, sigY + 4.5, sig2CenterX + 24, sigY + 4.5);
    doc.text('Firma Árbitro Central', sig2CenterX, sigY + 7.8, { align: 'center' });

    // Captain Away
    const sig3CenterX = margin + sigColWidth * 2.5;
    doc.line(sig3CenterX - 24, sigY + 4.5, sig3CenterX + 24, sigY + 4.5);
    doc.text('Firma Capitán Visitante', sig3CenterX, sigY + 7.8, { align: 'center' });

    // 4. STRICT SINGLE PAGE ENFORCEMENT: Delete any excess pages if created
    while (doc.getNumberOfPages() > 1) {
        doc.deletePage(doc.getNumberOfPages());
    }

    // --- 5. Trigger File Download ---
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `Cedula_J${match.matchday || 1}_${sanitizeFilename(homeTeamName)}_vs_${sanitizeFilename(awayTeamName)}.pdf`;

    doc.save(filename);
};
