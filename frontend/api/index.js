import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const url = req.url || '';
  const host = (req.headers.host || '').toLowerCase();
  const urlPath = url.toLowerCase();

  const isSanLucas = urlPath.includes('sanlucas');
  const isNuestroDeporte = host.includes('nuestrodeporte') || urlPath.includes('nuestrodeporte');

  let title = 'LeagueOS - Plataforma de Gestión Deportiva';
  let desc = 'Consulta estadísticas, rol de juegos, tabla de posiciones y resultados en vivo.';
  let siteName = 'LeagueOS';
  let imageFile = 'league_logo_new.png';

  if (isSanLucas) {
    title = 'Liga Ejidal de Futbol San Sebastian y San Lucas - Portal Oficial';
    desc = 'Portal Oficial de la Liga Ejidal de Futbol San Sebastian y San Lucas. Uniendo tradición y pasión en cada encuentro deportivo.';
    siteName = 'Liga San Lucas';
    imageFile = 'san_lucas_logo.png';
  } else if (isNuestroDeporte) {
    title = 'Liga Nuestro Deporte - Portal Oficial';
    desc = 'Portal Oficial de Liga Nuestro Deporte. Desde 1985.';
    siteName = 'Liga Nuestro Deporte';
    imageFile = 'nuestro_deporte_logo.png';
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const fullImageUrl = `${proto}://${req.headers.host || 'league-os-weld.vercel.app'}/${imageFile}`;

  try {
    // Read the built or root index.html
    const possiblePaths = [
      path.join(process.cwd(), 'dist', 'index.html'),
      path.join(process.cwd(), 'index.html')
    ];

    let html = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        html = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!html) {
      return res.status(500).send('index.html not found');
    }

    // Replace Title & Description
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);
    html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, `<meta name="description" content="${desc}" />`);

    // Replace OpenGraph tags
    html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta\s+property="og:site_name"\s+content=".*?"\s*\/?>/gi, `<meta property="og:site_name" content="${siteName}" />`);
    html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${desc}" />`);
    html = html.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${fullImageUrl}" />`);

    // Replace Twitter Card tags
    html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:description" content="${desc}" />`);
    html = html.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/gi, `<meta name="twitter:image" content="${fullImageUrl}" />`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Error serving index with metadata:', err);
    return res.status(500).send('Internal Server Error');
  }
}
