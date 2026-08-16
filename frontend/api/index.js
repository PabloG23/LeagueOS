import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    const url = (req.url || '').toLowerCase();

    // Check tenant based on host or path
    const isNuestroDeporte = host.includes('nuestrodeporte') || url.includes('nuestrodeporte');
    const isSanLucas = url.includes('sanlucas');

    let title = 'LeagueOS - Plataforma de Gestión Deportiva';
    let description = 'Consulta estadísticas, rol de juegos, tabla de posiciones y resultados en vivo.';
    let image = 'https://league-os-weld.vercel.app/league_logo_new.png';
    let siteName = 'LeagueOS';

    if (isNuestroDeporte) {
        title = 'Liga Nuestro Deporte - Portal Oficial';
        description = 'Portal Oficial de Liga Nuestro Deporte. Desde 1985.';
        image = 'https://www.nuestrodeporte.com/nuestro_deporte_logo.png';
        siteName = 'Liga Nuestro Deporte';
    } else if (isSanLucas) {
        title = 'Liga Ejidal de Futbol San Sebastian y San Lucas - Portal Oficial';
        description = 'Portal Oficial de la Liga Ejidal de Futbol San Sebastian y San Lucas. Uniendo tradición y pasión en cada encuentro deportivo.';
        image = 'https://league-os-weld.vercel.app/san_lucas_logo.png';
        siteName = 'Liga San Lucas';
    }

    // Read the built index.html
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    let html = '';
    try {
        html = fs.readFileSync(indexPath, 'utf8');
    } catch (e) {
        try {
            html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
        } catch (err) {
            html = `<!doctype html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`;
        }
    }

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);
    
    // Replace meta description
    html = html.replace(/<meta name="description" content=".*?" \/>/gi, `<meta name="description" content="${description}" />`);

    // Replace OpenGraph
    html = html.replace(/<meta property="og:title" content=".*?" \/>/gi, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/gi, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta property="og:image" content=".*?" \/>/gi, `<meta property="og:image" content="${image}" />`);
    html = html.replace(/<meta property="og:site_name" content=".*?" \/>/gi, `<meta property="og:site_name" content="${siteName}" />`);

    // Replace Twitter
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/gi, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/gi, `<meta name="twitter:description" content="${description}" />`);
    html = html.replace(/<meta name="twitter:image" content=".*?" \/>/gi, `<meta name="twitter:image" content="${image}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).send(html);
}
