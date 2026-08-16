import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Detect host and path
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    const rawUrl = req.url || '';
    const url = rawUrl.toLowerCase();

    const isSanLucas = url.includes('sanlucas');
    const isNuestroDeporte = host.includes('nuestrodeporte') || url.includes('nuestrodeporte');

    let title = 'LeagueOS - Plataforma de Gestión Deportiva';
    let description = 'Consulta estadísticas, rol de juegos, tabla de posiciones y resultados en vivo.';
    let image = 'https://league-os-weld.vercel.app/league_logo_new.png';
    let siteName = 'LeagueOS';

    if (isSanLucas) {
        title = 'Liga Ejidal de Futbol San Sebastian y San Lucas - Portal Oficial';
        description = 'Portal Oficial de la Liga Ejidal de Futbol San Sebastian y San Lucas. Uniendo tradición y pasión en cada encuentro deportivo.';
        image = 'https://league-os-weld.vercel.app/san_lucas_logo.png';
        siteName = 'Liga San Lucas';
    } else if (isNuestroDeporte) {
        title = 'Liga Nuestro Deporte - Portal Oficial';
        description = 'Portal Oficial de Liga Nuestro Deporte. Desde 1985.';
        image = 'https://www.nuestrodeporte.com/nuestro_deporte_logo.png';
        siteName = 'Liga Nuestro Deporte';
    }

    // Read index.html from dist
    let html = '';
    const possiblePaths = [
        path.join(process.cwd(), 'dist', 'index.html'),
        path.join(process.cwd(), 'index.html'),
        path.join(__dirname, '..', 'dist', 'index.html')
    ];

    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) {
                html = fs.readFileSync(p, 'utf8');
                break;
            }
        } catch (e) {}
    }

    if (!html) {
        html = `<!doctype html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`;
    }

    // Replace Title
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    
    // Replace meta description
    html = html.replace(/<meta name="description" content="[\s\S]*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);

    // Replace OpenGraph
    html = html.replace(/<meta property="og:title" content="[\s\S]*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta property="og:description" content="[\s\S]*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta property="og:image" content="[\s\S]*?"\s*\/?>/i, `<meta property="og:image" content="${image}" />`);
    html = html.replace(/<meta property="og:site_name" content="[\s\S]*?"\s*\/?>/i, `<meta property="og:site_name" content="${siteName}" />`);

    // Replace Twitter
    html = html.replace(/<meta name="twitter:title" content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta name="twitter:description" content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
    html = html.replace(/<meta name="twitter:image" content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:image" content="${image}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).send(html);
}
