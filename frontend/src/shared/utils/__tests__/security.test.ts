import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '@/shared/utils/security';

describe('security — sanitizeUrl Utility (XSS & Protocol Injection Prevention)', () => {

    // =========================================================================
    // Safe URLs
    // =========================================================================

    describe('Safe URLs', () => {
        it('should allow valid HTTPS and HTTP URLs', () => {
            expect(sanitizeUrl('https://nuestrodeporte.com')).toBe('https://nuestrodeporte.com');
            expect(sanitizeUrl('http://localhost:8080/api')).toBe('http://localhost:8080/api');
            expect(sanitizeUrl('https://facebook.com/page?id=123')).toBe('https://facebook.com/page?id=123');
        });

        it('should allow relative paths and hash anchors', () => {
            expect(sanitizeUrl('/ligaNuestroDeporte/admin')).toBe('/ligaNuestroDeporte/admin');
            expect(sanitizeUrl('/san_lucas_logo.png')).toBe('/san_lucas_logo.png');
            expect(sanitizeUrl('#standings')).toBe('#standings');
            expect(sanitizeUrl('#')).toBe('#');
        });

        it('should allow mailto: and tel: links', () => {
            expect(sanitizeUrl('mailto:contacto@nuestrodeporte.com')).toBe('mailto:contacto@nuestrodeporte.com');
            expect(sanitizeUrl('tel:7221703324')).toBe('tel:7221703324');
        });
    });

    // =========================================================================
    // Malicious & Dangerous Protocols (XSS)
    // =========================================================================

    describe('XSS & Malicious Protocols', () => {
        it('should block javascript: URLs and return #', () => {
            expect(sanitizeUrl('javascript:alert("XSS")')).toBe('#');
            expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
            expect(sanitizeUrl('  javascript:void(0)  ')).toBe('#');
        });

        it('should block data: URLs and return #', () => {
            expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
            expect(sanitizeUrl('DATA:image/svg+xml;utf8,<svg></svg>')).toBe('#');
        });

        it('should block unsupported protocols like ftp:, file:, vbscript:', () => {
            expect(sanitizeUrl('ftp://malicious.server/file')).toBe('#');
            expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
            expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge Cases', () => {
        it('should return # for null, undefined, or empty strings', () => {
            expect(sanitizeUrl(null)).toBe('#');
            expect(sanitizeUrl(undefined)).toBe('#');
            expect(sanitizeUrl('')).toBe('#');
            expect(sanitizeUrl('   ')).toBe('#');
        });

        it('should trim surrounding whitespace from valid URLs', () => {
            expect(sanitizeUrl('  https://google.com  ')).toBe('https://google.com');
        });
    });
});
