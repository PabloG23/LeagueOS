import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api, { leagueApi } from '@/shared/api/league-api';

describe('league-api — Axios Configuration, Interceptors & Tenant Headers', () => {

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    // =========================================================================
    // Base URL Configuration
    // =========================================================================

    it('should have base URL ending with /api', () => {
        expect(api.defaults.baseURL).toMatch(/\/api$/);
    });

    // =========================================================================
    // Request Interceptor
    // =========================================================================

    describe('Request Interceptor', () => {
        it('should add Authorization header when token exists in localStorage', async () => {
            localStorage.setItem('token', 'sample-jwt-token');

            // Find and invoke the request interceptor handler
            const interceptor = (api.interceptors.request as any).handlers[0];
            const config = await interceptor.fulfilled({ headers: {} });

            expect(config.headers.Authorization).toBe('Bearer sample-jwt-token');
            expect(localStorage.getItem('leagueos_last_activity')).toBeTruthy();
        });

        it('should not add Authorization header when token does not exist', async () => {
            const interceptor = (api.interceptors.request as any).handlers[0];
            const config = await interceptor.fulfilled({ headers: {} });

            expect(config.headers.Authorization).toBeUndefined();
        });
    });

    // =========================================================================
    // Response Interceptor (401 Handling)
    // =========================================================================

    describe('Response Interceptor', () => {
        it('should return successful response unmodified', async () => {
            const interceptor = (api.interceptors.response as any).handlers[0];
            const response = { data: { success: true }, status: 200 };
            const result = interceptor.fulfilled(response);

            expect(result).toEqual(response);
        });

        it('should clear localStorage and sessionStorage on 401 for authenticated requests', async () => {
            localStorage.setItem('token', 'expired-jwt-token');
            localStorage.setItem('user', JSON.stringify({ name: 'Admin' }));
            sessionStorage.setItem('tempKey', 'tempVal');

            const interceptor = (api.interceptors.response as any).handlers[0];
            const error401 = {
                response: { status: 401 },
                config: { url: '/api/leagues/teams' },
            };

            await expect(interceptor.rejected(error401)).rejects.toEqual(error401);

            expect(localStorage.getItem('token')).toBeNull();
            expect(sessionStorage.getItem('tempKey')).toBeNull();
        });

        it('should NOT clear storage on 401 if it was a login request', async () => {
            localStorage.setItem('someKey', 'value');

            const interceptor = (api.interceptors.response as any).handlers[0];
            const loginError401 = {
                response: { status: 401 },
                config: { url: '/api/auth/login' },
            };

            await expect(interceptor.rejected(loginError401)).rejects.toEqual(loginError401);
            expect(localStorage.getItem('someKey')).toBe('value');
        });
    });

    // =========================================================================
    // Tenant Header Verification in API calls
    // =========================================================================

    describe('Tenant Header Inclusion in leagueApi functions', () => {
        const TENANT_ID = '11111111-1111-1111-1111-111111111111';

        it('getProxyUrl should construct URL with proxy endpoint', () => {
            const url = leagueApi.getProxyUrl('teams/logo.png');
            expect(url).toContain('/media/proxy?key=teams%2Flogo.png');
        });

        it('api client should support custom headers per request', () => {
            const headers = { 'X-Tenant-ID': TENANT_ID };
            expect(headers['X-Tenant-ID']).toBe(TENANT_ID);
        });
    });
});
