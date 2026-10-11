import { describe, it, expect } from 'vitest';
import {
    createTenantSettings,
    TENANT_NUESTRO_DEPORTE,
    TENANT_SAN_LUCAS,
    TENANT_METEPEC,
    TENANT_DEFAULT_PLATFORM,
} from '@/test/helpers/tenantTestUtils';
import {
    resolveTenantBySlug,
    resolveTenantByHostname,
    resolveTenantById,
    TENANT_ID_METEPEC,
    TENANT_ID_NUESTRO_DEPORTE,
    TENANT_ID_SAN_LUCAS,
} from '@/features/tenant/config/tenantsRegistry';

describe('TenantSettings — Tenant Isolation', () => {
    // =========================================================================
    // Factory tests
    // =========================================================================

    describe('createTenantSettings factory', () => {
        it('should create settings with default values', () => {
            const settings = createTenantSettings();

            expect(settings.name).toBe('Test League');
            expect(settings.enableAutoSuspensions).toBe(false);
            expect(settings.allowTransfers).toBe(false);
            expect(settings.showOffenseDefenseWidgets).toBe(false);
            expect(settings.allowMultipleTeamsPerPlayer).toBe(false);
        });

        it('should allow overriding specific fields', () => {
            const settings = createTenantSettings({
                name: 'Custom League',
                enableAutoSuspensions: true,
            });

            expect(settings.name).toBe('Custom League');
            expect(settings.enableAutoSuspensions).toBe(true);
            // Non-overridden fields retain defaults
            expect(settings.allowTransfers).toBe(false);
            expect(settings.showOffenseDefenseWidgets).toBe(false);
            expect(settings.allowMultipleTeamsPerPlayer).toBe(false);
        });
    });

    // =========================================================================
    // Tenant fixture identity tests
    // =========================================================================

    describe('pre-built tenant fixtures', () => {
        it('TENANT_NUESTRO_DEPORTE should have correct identity', () => {
            expect(TENANT_NUESTRO_DEPORTE.tenantId).toBe('11111111-1111-1111-1111-111111111111');
            expect(TENANT_NUESTRO_DEPORTE.name).toBe('Liga Nuestro Deporte');
            expect(TENANT_NUESTRO_DEPORTE.themeClass).toBe('theme-nuestro-deporte');
        });

        it('TENANT_SAN_LUCAS should have correct identity', () => {
            expect(TENANT_SAN_LUCAS.tenantId).toBe('22222222-2222-2222-2222-222222222222');
            expect(TENANT_SAN_LUCAS.name).toBe('Liga Ejidal de Futbol San Sebastian y San Lucas');
            expect(TENANT_SAN_LUCAS.themeClass).toBe('theme-san-lucas');
        });

        it('TENANT_METEPEC should have correct identity', () => {
            expect(TENANT_METEPEC.tenantId).toBe('e39a6b17-5646-452d-929c-ca9a8dc4e44d');
            expect(TENANT_METEPEC.name).toBe('LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.');
            expect(TENANT_METEPEC.themeClass).toBe('theme-metepec');
            expect(TENANT_METEPEC.logoUrl).toBe('/ligaMunicipalMetepec.png');
        });

        it('TENANT_DEFAULT_PLATFORM should have neutral identity', () => {
            expect(TENANT_DEFAULT_PLATFORM.tenantId).toBe('00000000-0000-0000-0000-000000000000');
            expect(TENANT_DEFAULT_PLATFORM.name).toBe('LeagueOS');
            expect(TENANT_DEFAULT_PLATFORM.themeClass).toBe('');
        });
    });

    // =========================================================================
    // ISOLATION: Feature flag differences between tenants
    // =========================================================================

    describe('ISOLATION: feature flag differences', () => {
        it('enableAutoSuspensions: Nuestro Deporte = true, San Lucas = false', () => {
            expect(TENANT_NUESTRO_DEPORTE.enableAutoSuspensions).toBe(true);
            expect(TENANT_SAN_LUCAS.enableAutoSuspensions).toBe(false);
        });

        it('allowTransfers: Nuestro Deporte = true, San Lucas = false', () => {
            expect(TENANT_NUESTRO_DEPORTE.allowTransfers).toBe(true);
            expect(TENANT_SAN_LUCAS.allowTransfers).toBe(false);
        });

        it('showDisciplineWidget: Nuestro Deporte = false, San Lucas = true, Metepec = true', () => {
            expect(TENANT_NUESTRO_DEPORTE.showDisciplineWidget).toBe(false);
            expect(TENANT_SAN_LUCAS.showDisciplineWidget).toBe(true);
            expect(TENANT_METEPEC.showDisciplineWidget).toBe(true);
        });

        it('showOffenseDefenseWidgets: Metepec = true, Nuestro Deporte = false, San Lucas = false', () => {
            expect(TENANT_METEPEC.showOffenseDefenseWidgets).toBe(true);
            expect(TENANT_NUESTRO_DEPORTE.showOffenseDefenseWidgets).toBe(false);
            expect(TENANT_SAN_LUCAS.showOffenseDefenseWidgets).toBe(false);
        });

        it('allowMultipleTeamsPerPlayer: false across all tenants', () => {
            expect(TENANT_METEPEC.allowMultipleTeamsPerPlayer).toBe(false);
            expect(TENANT_NUESTRO_DEPORTE.allowMultipleTeamsPerPlayer).toBe(false);
            expect(TENANT_SAN_LUCAS.allowMultipleTeamsPerPlayer).toBe(false);
        });

        it('allowQuickScore: Metepec = false, Nuestro Deporte = true, San Lucas = true', () => {
            expect(TENANT_METEPEC.allowQuickScore).toBe(false);
            expect(TENANT_NUESTRO_DEPORTE.allowQuickScore).toBe(true);
            expect(TENANT_SAN_LUCAS.allowQuickScore).toBe(true);
        });

        it('themeClass should be unique per tenant', () => {
            expect(TENANT_NUESTRO_DEPORTE.themeClass).not.toBe(TENANT_SAN_LUCAS.themeClass);
            expect(TENANT_NUESTRO_DEPORTE.themeClass).not.toBe(TENANT_DEFAULT_PLATFORM.themeClass);
            expect(TENANT_SAN_LUCAS.themeClass).not.toBe(TENANT_DEFAULT_PLATFORM.themeClass);
        });

        it('tenantId should be unique per tenant (no cross-contamination)', () => {
            const ids = [
                TENANT_NUESTRO_DEPORTE.tenantId,
                TENANT_SAN_LUCAS.tenantId,
                TENANT_DEFAULT_PLATFORM.tenantId,
            ];
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('boardMembers should be different per tenant', () => {
            expect(TENANT_NUESTRO_DEPORTE.boardMembers).not.toEqual(TENANT_SAN_LUCAS.boardMembers);

            // Nuestro Deporte has "Mike Portocarrero"
            expect(TENANT_NUESTRO_DEPORTE.boardMembers.some(m => m.name === 'Mike Portocarrero')).toBe(true);
            expect(TENANT_SAN_LUCAS.boardMembers.some(m => m.name === 'Mike Portocarrero')).toBe(false);

            // San Lucas has "Alejo Reyes Mejía"
            expect(TENANT_SAN_LUCAS.boardMembers.some(m => m.name === 'Alejo Reyes Mejía')).toBe(true);
            expect(TENANT_NUESTRO_DEPORTE.boardMembers.some(m => m.name === 'Alejo Reyes Mejía')).toBe(false);
        });

        it('matchTicker styles should differ between tenants', () => {
            expect(TENANT_NUESTRO_DEPORTE.matchTickerBackgroundClass)
                .not.toBe(TENANT_SAN_LUCAS.matchTickerBackgroundClass);
            expect(TENANT_NUESTRO_DEPORTE.matchTickerTextClass)
                .not.toBe(TENANT_SAN_LUCAS.matchTickerTextClass);
        });
    });

    // =========================================================================
    // ISOLATION: Mutating one tenant's settings doesn't affect another
    // =========================================================================

    describe('ISOLATION: mutations do not leak between tenants', () => {
        it('modifying a copy of TENANT_A settings should not affect TENANT_B', () => {
            const settingsA = { ...TENANT_NUESTRO_DEPORTE };
            const settingsB = { ...TENANT_SAN_LUCAS };

            // Mutate A
            settingsA.name = 'Modified Liga';
            settingsA.enableAutoSuspensions = false;
            settingsA.boardMembers = [{ role: 'New Role', name: 'New Person' }];

            // B should remain untouched
            expect(settingsB.name).toBe('Liga Ejidal de Futbol San Sebastian y San Lucas');
            expect(settingsB.enableAutoSuspensions).toBe(false);
            expect(settingsB.boardMembers[0].name).toBe('Alejo Reyes Mejía');
        });

        it('settings created via factory should be independent instances', () => {
            const settings1 = createTenantSettings({ name: 'League 1' });
            const settings2 = createTenantSettings({ name: 'League 2' });

            settings1.name = 'Modified League 1';

            expect(settings2.name).toBe('League 2'); // untouched
        });
    });

    // =========================================================================
    // Centralized Tenant Registry Resolution Tests
    // =========================================================================

    describe('Centralized Tenant Registry Resolution', () => {
        it('should resolve tenants by slug', () => {
            expect(resolveTenantBySlug('ligasanlucas')?.tenantId).toBe(TENANT_ID_SAN_LUCAS);
            expect(resolveTenantBySlug('sanlucas')?.tenantId).toBe(TENANT_ID_SAN_LUCAS);
            expect(resolveTenantBySlug('liganuestrodeporte')?.tenantId).toBe(TENANT_ID_NUESTRO_DEPORTE);
            expect(resolveTenantBySlug('nuestrodeporte')?.tenantId).toBe(TENANT_ID_NUESTRO_DEPORTE);
            expect(resolveTenantBySlug('ligametepec')?.tenantId).toBe(TENANT_ID_METEPEC);
            expect(resolveTenantBySlug('metepec')?.tenantId).toBe(TENANT_ID_METEPEC);
            expect(resolveTenantBySlug('unknown-league')).toBeUndefined();
        });

        it('should resolve tenants by hostname', () => {
            expect(resolveTenantByHostname('nuestrodeporte.com')?.tenantId).toBe(TENANT_ID_NUESTRO_DEPORTE);
            expect(resolveTenantByHostname('app.nuestrodeporte.mx')?.tenantId).toBe(TENANT_ID_NUESTRO_DEPORTE);
            expect(resolveTenantByHostname('league-os-weld.vercel.app')).toBeUndefined();
        });

        it('should resolve tenants by tenantId', () => {
            expect(resolveTenantById(TENANT_ID_SAN_LUCAS)?.primarySlug).toBe('ligaSanLucas');
            expect(resolveTenantById(TENANT_ID_NUESTRO_DEPORTE)?.primarySlug).toBe('ligaNuestroDeporte');
            expect(resolveTenantById(TENANT_ID_METEPEC)?.primarySlug).toBe('ligaMetepec');
            expect(resolveTenantById('random-uuid')).toBeUndefined();
        });
    });
});

