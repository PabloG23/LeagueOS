import { BoardMember, TenantSettings } from '../context/TenantSettingsContext';

export interface TenantDefinition {
    tenantId: string;
    primarySlug: string;
    slugs: string[];
    hostnames?: string[];
    settings: Partial<TenantSettings>;
}

export const TENANT_ID_NUESTRO_DEPORTE = '11111111-1111-1111-1111-111111111111';
export const TENANT_ID_SAN_LUCAS = '22222222-2222-2222-2222-222222222222';
export const TENANT_ID_METEPEC = 'e39a6b17-5646-452d-929c-ca9a8dc4e44d';
export const TENANT_ID_DEFAULT_PLATFORM = '00000000-0000-0000-0000-000000000000';

export const TENANT_REGISTRY: Record<string, TenantDefinition> = {
    [TENANT_ID_SAN_LUCAS]: {
        tenantId: TENANT_ID_SAN_LUCAS,
        primarySlug: 'ligaSanLucas',
        slugs: ['ligasanlucas', 'sanlucas'],
        settings: {
            tenantId: TENANT_ID_SAN_LUCAS,
            name: "Liga Ejidal de Futbol San Sebastian y San Lucas",
            logoUrl: "/san_lucas_logo.png",
            themeClass: 'theme-san-lucas',
            allowTransfers: false,
            footerAddress: "Zaragoza S/N, San Sebastián, Metepec C.P. 52146",
            footerPhone: "722 634 4082",
            footerBackgroundClass: "bg-emerald-800",
            slogan: "Uniendo tradición y pasión en cada encuentro deportivo.",
            facebookUrl: "https://www.facebook.com/share/1DrWt7euqW/?mibextid=wwXIfr",
            instagramUrl: undefined,
            twitterUrl: undefined,
            matchTickerBackgroundClass: "bg-emerald-800",
            matchCardBackgroundClass: "bg-sidebar",
            matchTickerTextClass: "text-black",
            enableRoundRobinFixtures: true,
            enableShootoutExtraPoint: false,
            showDisciplineWidget: true,
            showOffenseDefenseWidgets: false,
            requireJerseyNumbers: true,
            boardMembers: [
                { role: "Presidente", name: "Alejo Reyes Mejía" },
                { role: "Secretario", name: "Eduardo García Díaz" },
                { role: "Tesorero", name: "Ma. de Lourdes Inés Careaga Díaz" },
                { role: "Consejo de Vigilancia", name: "Bartolo Gerardo Ramos García" }
            ]
        }
    },
    [TENANT_ID_NUESTRO_DEPORTE]: {
        tenantId: TENANT_ID_NUESTRO_DEPORTE,
        primarySlug: 'ligaNuestroDeporte',
        slugs: ['liganuestrodeporte', 'nuestrodeporte'],
        hostnames: ['nuestrodeporte'],
        settings: {
            tenantId: TENANT_ID_NUESTRO_DEPORTE,
            name: "Liga Nuestro Deporte",
            logoUrl: "/nuestro_deporte_logo.png",
            themeClass: 'theme-nuestro-deporte',
            allowTransfers: true,
            requireJerseyNumbers: true,
            footerAddress: "Liga Nuestro Deporte",
            footerPhone: "722 170 3324",
            footerBackgroundClass: "bg-[#060B1C]",
            slogan: "Tu pasión, nuestro deporte.",
            facebookUrl: "https://www.facebook.com/share/1LNGV1MDGz/?mibextid=wwXIfr",
            instagramUrl: "https://www.instagram.com/liga.nuestrodeporte?igsi=MTVzZ2FzbmNuN2szbg==",
            twitterUrl: "",
            matchTickerBackgroundClass: "bg-[#040812]",
            matchCardBackgroundClass: "bg-[#0D1A3C]",
            matchTickerTextClass: "text-white",
            enableRoundRobinFixtures: true,
            enableShootoutExtraPoint: true,
            showDisciplineWidget: false,
            showOffenseDefenseWidgets: true,
            boardMembers: [
                { role: "Presidente", name: "Mike Portocarrero" },
                { role: "Vicepresidente", name: "Carlos Mejía" },
                { role: "Secretario", name: "Rubén Hidalgo" },
                { role: "Tesorero", name: "Alberto Suárez" },
                { role: "Comisión Disciplinaria", name: "Igor Almaraz y Emmanuel Sánchez" },
                { role: "Marketing", name: "MGX Studio" },
                { role: "Staff Mesa Directiva", name: "Oliver Tello y Mario Lagunas" }
            ]
        }
    },
    [TENANT_ID_METEPEC]: {
        tenantId: TENANT_ID_METEPEC,
        primarySlug: 'ligaMetepec',
        slugs: ['ligametepec', 'metepec'],
        settings: {
            tenantId: TENANT_ID_METEPEC,
            name: "LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.",
            logoUrl: "/ligaMunicipalMetepec.jpeg",
            themeClass: 'theme-metepec',
            allowTransfers: false,
            requireJerseyNumbers: false,
            footerAddress: "Calle Josefa Ortiz de Domínguez 501, Coaxustenco, 52140 Metepec, Méx.",
            footerPhone: "+52 722 960 9949",
            footerBackgroundClass: "bg-[#0E1210]",
            slogan: "Forjando el talento y la pasión deportiva en nuestra comunidad.",
            facebookUrl: "https://www.facebook.com/share/1FenUj4krW/?mibextid=wwXIfr",
            instagramUrl: undefined,
            twitterUrl: undefined,
            matchTickerBackgroundClass: "bg-[#0E1210]",
            matchCardBackgroundClass: "bg-[#1C261F]",
            matchTickerTextClass: "text-[#93C572]",
            enableRoundRobinFixtures: true,
            enableShootoutExtraPoint: false,
            showDisciplineWidget: true,
            showOffenseDefenseWidgets: true,
            boardMembers: [
                { role: "Presidente", name: "Luis Rendón" },
                { role: "Vicepresidente", name: "Héctor Gómez" },
                { role: "Secretario General", name: "Alejandro Morales" },
                { role: "Tesorero", name: "Carlos Mendoza" },
                { role: "Comisión Disciplinaria", name: "Roberto Peña" },
                { role: "Comisión de Arbitraje", name: "Fernando Salgado" },
                { role: "Vocal 1", name: "Juan Carlos Dávila" },
                { role: "Vocal 2", name: "Miguel Ángel Flores" },
                { role: "Consejo de Vigilancia", name: "Ricardo Trejo" },
                { role: "Coordinador de Campos", name: "Gustavo Serrano" }
            ]
        }
    }
};

export function resolveTenantBySlug(slug: string): TenantDefinition | undefined {
    const normalized = slug.toLowerCase();
    return Object.values(TENANT_REGISTRY).find(t => t.slugs.includes(normalized));
}

export function resolveTenantByHostname(hostname: string): TenantDefinition | undefined {
    const lower = hostname.toLowerCase();
    return Object.values(TENANT_REGISTRY).find(t => t.hostnames?.some(h => lower.includes(h)));
}

export function resolveTenantById(tenantId: string): TenantDefinition | undefined {
    return TENANT_REGISTRY[tenantId];
}
