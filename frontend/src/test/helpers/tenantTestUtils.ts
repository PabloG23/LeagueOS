import { TenantSettings } from '@/features/tenant/context/TenantSettingsContext';

/**
 * Factory to create TenantSettings for tests.
 * Override any field by passing a partial object.
 */
export const createTenantSettings = (overrides: Partial<TenantSettings> = {}): TenantSettings => ({
    tenantId: 'default-tenant-uuid',
    name: 'Test League',
    logoUrl: '/test-logo.png',
    boardMembers: [],
    showOffenseDefenseWidgets: false,
    showDisciplineWidget: false,
    enableAutoSuspensions: false,
    minMatchesForPlayoffs: 0,
    allowTransfers: false,
    requireJerseyNumbers: false,
    allowMultipleTeamsPerPlayer: false,
    themeClass: '',
    footerAddress: 'Test Address',
    footerPhone: '555-0000',
    footerBackgroundClass: 'bg-slate-900',
    slogan: 'Test Slogan',
    facebookUrl: '#',
    instagramUrl: '#',
    twitterUrl: '#',
    matchTickerBackgroundClass: 'bg-sidebar',
    matchCardBackgroundClass: 'bg-white/5',
    matchTickerTextClass: 'text-primary',
    enableRoundRobinFixtures: true,
    enableShootoutExtraPoint: false,
    allowQuickScore: true,
    enableTournamentTypeSelection: false,
    ...overrides,
});

// =========================================================================
// Pre-built tenant fixtures for isolation tests
// =========================================================================

/** Liga Nuestro Deporte — enableAutoSuspensions, allowTransfers */
export const TENANT_NUESTRO_DEPORTE = createTenantSettings({
    tenantId: '11111111-1111-1111-1111-111111111111',
    name: 'Liga Nuestro Deporte',
    logoUrl: '/nuestro_deporte_logo.png',
    themeClass: 'theme-nuestro-deporte',
    enableAutoSuspensions: true,
    allowTransfers: true,
    showDisciplineWidget: false,
    showOffenseDefenseWidgets: false,
    allowMultipleTeamsPerPlayer: false,
    footerAddress: 'Liga Nuestro Deporte',
    footerPhone: '722 170 3324',
    footerBackgroundClass: 'bg-[#060B1C]',
    slogan: 'Tu pasión, nuestro deporte.',
    matchTickerBackgroundClass: 'bg-[#040812]',
    matchCardBackgroundClass: 'bg-[#0D1A3C]',
    matchTickerTextClass: 'text-white',
    enableRoundRobinFixtures: true,
    enableShootoutExtraPoint: true,
    boardMembers: [
        { role: 'Presidente', name: 'Mike Portocarrero' },
        { role: 'Vicepresidente', name: 'Carlos Mejía' },
    ],
});

/** Liga San Lucas — NO transfers, different theme */
export const TENANT_SAN_LUCAS = createTenantSettings({
    tenantId: '22222222-2222-2222-2222-222222222222',
    name: 'Liga Ejidal de Futbol San Sebastian y San Lucas',
    logoUrl: '/san_lucas_logo.png',
    themeClass: 'theme-san-lucas',
    enableAutoSuspensions: false,
    allowTransfers: false,
    enableShootoutExtraPoint: false,
    showDisciplineWidget: true,
    showOffenseDefenseWidgets: false,
    allowMultipleTeamsPerPlayer: false,
    footerAddress: 'Zaragoza S/N, San Sebastián, Metepec C.P. 52146',
    footerPhone: '722 634 4082',
    footerBackgroundClass: 'bg-emerald-800',
    slogan: 'Uniendo tradición y pasión en cada encuentro deportivo.',
    matchTickerBackgroundClass: 'bg-emerald-800',
    matchCardBackgroundClass: 'bg-sidebar',
    matchTickerTextClass: 'text-black',
    enableRoundRobinFixtures: true,
    boardMembers: [
        { role: 'Presidente', name: 'Alejo Reyes Mejía' },
        { role: 'Secretario', name: 'Eduardo García Díaz' },
    ],
});

/** Liga Municipal de Futbol de Metepec A.C. — Pistache & Obsidiana */
export const TENANT_METEPEC = createTenantSettings({
    tenantId: 'e39a6b17-5646-452d-929c-ca9a8dc4e44d',
    name: 'LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.',
    logoUrl: '/ligaMunicipalMetepec.png',
    themeClass: 'theme-metepec',
    enableAutoSuspensions: false,
    allowTransfers: false,
    enableShootoutExtraPoint: false,
    showDisciplineWidget: true,
    showOffenseDefenseWidgets: true,
    allowMultipleTeamsPerPlayer: false,
    footerAddress: 'Calle Josefa Ortiz de Domínguez 501, Coaxustenco, 52140 Metepec, Méx.',
    footerPhone: '+52 722 960 9949',
    footerBackgroundClass: 'bg-[#0E1210]',
    slogan: 'Forjando el talento y la pasión deportiva en nuestra comunidad.',
    matchTickerBackgroundClass: 'bg-[#0E1210]',
    matchCardBackgroundClass: 'bg-[#1C261F]',
    matchTickerTextClass: 'text-[#93C572]',
    enableRoundRobinFixtures: true,
    allowQuickScore: false,
    enableTournamentTypeSelection: true,
    boardMembers: [
        { role: 'Presidente', name: 'Luis Rendón' },
        { role: 'Vicepresidente', name: 'Omar Rea' },
    ],
});

/** Neutral LeagueOS platform (no specific tenant) */
export const TENANT_DEFAULT_PLATFORM = createTenantSettings({
    tenantId: '00000000-0000-0000-0000-000000000000',
    name: 'LeagueOS',
    logoUrl: '/league_logo_new.png',
    themeClass: '',
    slogan: 'Plataforma de Gestión Deportiva',
    enableAutoSuspensions: false,
    allowTransfers: false,
    showDisciplineWidget: false,
});

