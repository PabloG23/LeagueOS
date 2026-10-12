/**
 * Vercel Edge Middleware — per-tenant social previews (WhatsApp, Facebook, X...).
 *
 * Social crawlers don't execute JavaScript, so the OpenGraph tags must be present
 * in the HTML returned by the server. For every tenant URL (e.g. /ligaMetepec/...)
 * we fetch the static index.html and inject that tenant's name, slogan and logo.
 * Tenant data comes from TENANT_REGISTRY, so new tenants get previews automatically.
 */
import { resolveTenantByHostname, resolveTenantBySlug } from './src/features/tenant/config/tenantsRegistry';

export const config = {
    // Skip static files (anything with an extension) and API routes.
    matcher: ['/((?!api/|assets/|.*\\..*).*)'],
};

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const setMeta = (html: string, attr: 'property' | 'name', key: string, value: string): string =>
    html.replace(
        new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, 'i'),
        `$1${escapeHtml(value)}$2`,
    );

export default async function middleware(request: Request): Promise<Response | undefined> {
    const url = new URL(request.url);
    const firstSegment = url.pathname.split('/').filter(Boolean)[0] ?? '';

    const tenant =
        (firstSegment && resolveTenantBySlug(firstSegment)) || resolveTenantByHostname(url.hostname);
    if (!tenant) return undefined; // Continue with the default (generic LeagueOS) HTML.

    const { name, slogan, logoUrl } = tenant.settings;
    const imagePath = tenant.ogImageUrl ?? logoUrl;
    if (!name) return undefined;

    const indexResponse = await fetch(new URL('/index.html', url.origin));
    if (!indexResponse.ok) return undefined;
    let html = await indexResponse.text();

    const title = `${name} - Portal Oficial`;
    const description = slogan || 'Consulta estadísticas, tabla de posiciones, rol de juegos y resultados en vivo.';
    const imageUrl = imagePath ? new URL(imagePath, url.origin).toString() : undefined;
    const pageUrl = url.toString();

    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    html = setMeta(html, 'name', 'description', description);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:site_name', name);
    html = setMeta(html, 'property', 'og:description', description);
    html = setMeta(html, 'property', 'og:url', pageUrl);
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', description);
    if (imageUrl) {
        html = setMeta(html, 'property', 'og:image', imageUrl);
        html = setMeta(html, 'name', 'twitter:image', imageUrl);
        html = html.replace(/(<link\s+rel="icon"[^>]*href=")[^"]*(")/i, `$1${escapeHtml(imagePath!)}$2`);
        // Logo dimensions vary per tenant; drop the fixed 1200x630 hints.
        html = html.replace(/\s*<meta\s+property="og:image:(width|height)"[^>]*>/gi, '');
    }

    return new Response(html, {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
        },
    });
}
