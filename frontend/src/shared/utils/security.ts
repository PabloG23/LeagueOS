/**
 * Security utility functions for frontend validation and sanitization.
 */

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Sanitizes a URL to prevent javascript: or malicious protocol injection.
 * Returns '#' if the URL is invalid or uses a dangerous protocol.
 */
export function sanitizeUrl(url: string | null | undefined): string {
    if (!url || typeof url !== 'string') return '#';
    
    const trimmed = url.trim();
    if (!trimmed) return '#';

    // Relative URLs and anchor links are safe
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
        return trimmed;
    }

    try {
        const parsed = new URL(trimmed, window.location.origin);
        if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
            return trimmed;
        }
    } catch {
        // If URL parsing fails on a relative or custom link, check if it contains javascript:
        if (/^\s*javascript\s*:/i.test(trimmed) || /^\s*data\s*:/i.test(trimmed)) {
            return '#';
        }
        return trimmed;
    }

    return '#';
}
