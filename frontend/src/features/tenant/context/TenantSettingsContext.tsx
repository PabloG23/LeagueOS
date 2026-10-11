import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, matchPath } from 'react-router-dom';
import {
    resolveTenantBySlug,
    resolveTenantByHostname,
    resolveTenantById,
    TenantDefinition
} from '../config/tenantsRegistry';

export interface BoardMember {
    role: string;
    name: string;
}

export interface TenantSettings {
    tenantId?: string;
    name: string;
    logoUrl: string;
    boardMembers: BoardMember[];
    showOffenseDefenseWidgets: boolean;
    showDisciplineWidget: boolean;
    enableAutoSuspensions: boolean;
    minMatchesForPlayoffs: number;
    allowTransfers: boolean;
    requireJerseyNumbers: boolean;
    themeClass?: string;
    footerAddress: string;
    footerPhone: string;
    footerBackgroundClass: string;
    slogan: string;
    facebookUrl?: string;
    instagramUrl?: string;
    twitterUrl?: string;

    // Match Ticker Styles
    matchTickerBackgroundClass: string;
    matchCardBackgroundClass: string;
    matchTickerTextClass: string;

    // Feature flags
    enableRoundRobinFixtures: boolean;
    enableShootoutExtraPoint?: boolean;
    tiebreakerOrder?: string;
    allowAdminExceedRosterLimit?: boolean;
    rejectExpiredIne?: boolean;
    enableAccumulatedYellowSuspensions?: boolean;
    allowMultipleTeamsPerPlayer?: boolean;
    allowQuickScore?: boolean;
}

const DEFAULT_SETTINGS: TenantSettings = {
    name: "LeagueOS",
    logoUrl: "/league_logo_new.png",
    boardMembers: [],
    showOffenseDefenseWidgets: false,
    showDisciplineWidget: false,
    enableAutoSuspensions: false,
    minMatchesForPlayoffs: 0,
    allowTransfers: false,
    requireJerseyNumbers: false,
    themeClass: '',
    footerAddress: "Plataforma de Gestión Deportiva LeagueOS",
    footerPhone: "",
    footerBackgroundClass: "bg-slate-900",
    slogan: "Plataforma de Gestión Deportiva",
    facebookUrl: "#",
    instagramUrl: "#",
    twitterUrl: "#",

    matchTickerBackgroundClass: "bg-sidebar",
    matchCardBackgroundClass: "bg-white/5",
    matchTickerTextClass: "text-primary",

    enableRoundRobinFixtures: true,
    enableShootoutExtraPoint: false,
    allowMultipleTeamsPerPlayer: false,
    allowAdminExceedRosterLimit: false,
    rejectExpiredIne: false,
    enableAccumulatedYellowSuspensions: false,
    allowQuickScore: true,
    tiebreakerOrder: 'PTS_GD_GF_NAME',
};

interface TenantSettingsContextType {
    settings: TenantSettings;
    isLoading: boolean;
    updateSettings: (newSettings: Partial<TenantSettings>) => void;
}

export const TenantSettingsContext = createContext<TenantSettingsContextType>({
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    updateSettings: () => {},
});

export const TenantSettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    // Effect to apply theme class, favicon and title dynamically
    useEffect(() => {
        // Remove any existing theme classes first
        document.body.classList.remove('theme-san-lucas', 'theme-nuestro-deporte', 'theme-metepec');

        if (settings.themeClass) {
            document.body.classList.add(settings.themeClass);
        }

        // Update favicon dynamically
        if (settings.logoUrl) {
            let faviconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
            if (!faviconLink) {
                faviconLink = document.createElement('link');
                faviconLink.rel = 'icon';
                document.head.appendChild(faviconLink);
            }
            faviconLink.href = settings.logoUrl;
        }

        // Update page title
        if (settings.name) {
            document.title = `${settings.name} - Portal Oficial`;
        }
    }, [settings.themeClass, settings.logoUrl, settings.name]);

    useEffect(() => {
        let requestInterceptor: number | undefined;

        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                // Neutral Platform Defaults
                let tenantId = '00000000-0000-0000-0000-000000000000';
                let name = "LeagueOS";
                let logoUrl = "/league_logo_new.png";
                let boardMembers: BoardMember[] = [];
                let allowTransfers = true;
                let themeClass = '';
                let footerAddress = "Plataforma de Gestión Deportiva LeagueOS";
                let footerPhone = "";
                let footerBackgroundClass = "bg-slate-900";
                let slogan = "Plataforma de Gestión Deportiva";
                let facebookUrl: string | undefined = "#";
                let instagramUrl: string | undefined = "#";
                let twitterUrl: string | undefined = "#";

                let matchTickerBackgroundClass = "bg-sidebar";
                let matchCardBackgroundClass = "bg-white/5";
                let matchTickerTextClass = "text-primary";
                let enableRoundRobinFixtures = true;
                let enableShootoutExtraPoint = false;
                let requireJerseyNumbers = false;

                console.log(`[TenantContext] Analyzing URL: ${location.pathname}, Hostname: ${window.location.hostname}`);

                // Check hostname for custom domains (e.g. nuestrodeporte.com)
                const hostname = window.location.hostname.toLowerCase();
                const isNuestroDeporteHost = hostname.includes('nuestrodeporte');

                // Check for /:leagueSlug or /:leagueSlug/team/:teamId
                const matchLeague = matchPath("/:leagueSlug/*", location.pathname);
                const matchLeagueExact = matchPath("/:leagueSlug", location.pathname);

                const slug = matchLeague?.params.leagueSlug || matchLeagueExact?.params.leagueSlug;
                const normalizedSlug = slug?.toLowerCase();
                const isSystemRoute = normalizedSlug === 'admin' || normalizedSlug === 'login' || normalizedSlug === 'team-dashboard' || normalizedSlug === 'referee';

                // Dynamic Tenant Resolution using centralized registry
                let matchedTenant: TenantDefinition | undefined;

                if (!isSystemRoute && normalizedSlug) {
                    matchedTenant = resolveTenantBySlug(normalizedSlug);
                }

                if (!matchedTenant && isNuestroDeporteHost) {
                    matchedTenant = resolveTenantByHostname(hostname);
                }

                if (!matchedTenant) {
                    const storedTenantId = localStorage.getItem('tenantId');
                    if (storedTenantId) {
                        matchedTenant = resolveTenantById(storedTenantId);
                    }
                }

                if (matchedTenant) {
                    const s = matchedTenant.settings;
                    tenantId = matchedTenant.tenantId;
                    if (s.name) name = s.name;
                    if (s.logoUrl) logoUrl = s.logoUrl;
                    if (s.themeClass) themeClass = s.themeClass;
                    if (s.allowTransfers !== undefined) allowTransfers = s.allowTransfers;
                    if (s.footerAddress) footerAddress = s.footerAddress;
                    if (s.footerPhone !== undefined) footerPhone = s.footerPhone;
                    if (s.footerBackgroundClass) footerBackgroundClass = s.footerBackgroundClass;
                    if (s.slogan) slogan = s.slogan;
                    if (s.facebookUrl !== undefined) facebookUrl = s.facebookUrl;
                    if (s.instagramUrl !== undefined) instagramUrl = s.instagramUrl;
                    if (s.twitterUrl !== undefined) twitterUrl = s.twitterUrl;
                    if (s.matchTickerBackgroundClass) matchTickerBackgroundClass = s.matchTickerBackgroundClass;
                    if (s.matchCardBackgroundClass) matchCardBackgroundClass = s.matchCardBackgroundClass;
                    if (s.matchTickerTextClass) matchTickerTextClass = s.matchTickerTextClass;
                    if (s.enableRoundRobinFixtures !== undefined) enableRoundRobinFixtures = s.enableRoundRobinFixtures;
                    if (s.enableShootoutExtraPoint !== undefined) enableShootoutExtraPoint = s.enableShootoutExtraPoint;
                    if (s.requireJerseyNumbers !== undefined) requireJerseyNumbers = s.requireJerseyNumbers;
                    if (s.boardMembers) boardMembers = s.boardMembers;
                } else {
                    console.log(`[TenantContext] No slug or custom domain detected, using neutral LeagueOS platform settings`);
                }

                // Set Header via Interceptor (More reliable than defaults)
                requestInterceptor = axios.interceptors.request.use(config => {
                    config.headers['X-Tenant-ID'] = tenantId;
                    return config;
                });

                console.log(`[TenantContext] Switched to tenant: ${tenantId}, Name: ${name}`);

                let responseData = {};
                try {
                    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
                    const finalBaseUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
                    const response = await axios.get(`${finalBaseUrl}/tenants/settings/current`);
                    responseData = response.data;
                } catch (apiError) {
                    console.error("[TenantContext] Failed to fetch tenant settings from backend. Using local fallbacks.", apiError);
                }

                // Merge backend settings with frontend branding REGARDLESS of API failure
                setSettings({
                    ...DEFAULT_SETTINGS, // The default interface base
                    ...(matchedTenant ? matchedTenant.settings : {}), // Tenant registry definitions
                    enableShootoutExtraPoint,
                    ...(typeof responseData === 'object' ? responseData : {}), // Overrides from backend (if any)
                    name: (responseData as any)?.name ?? matchedTenant?.settings?.name ?? name,
                    logoUrl: (responseData as any)?.logoUrl ?? matchedTenant?.settings?.logoUrl ?? logoUrl,
                    themeClass: matchedTenant?.settings?.themeClass ?? themeClass,
                    boardMembers: (responseData as any)?.boardMembers ?? matchedTenant?.settings?.boardMembers ?? boardMembers,
                    allowTransfers: (responseData as any)?.allowTransfers ?? matchedTenant?.settings?.allowTransfers ?? allowTransfers,
                    footerAddress: (responseData as any)?.footerAddress ?? matchedTenant?.settings?.footerAddress ?? footerAddress,
                    footerPhone: (responseData as any)?.footerPhone ?? matchedTenant?.settings?.footerPhone ?? footerPhone,
                    footerBackgroundClass: (responseData as any)?.footerBackgroundClass ?? matchedTenant?.settings?.footerBackgroundClass ?? footerBackgroundClass,
                    slogan: (responseData as any)?.slogan ?? matchedTenant?.settings?.slogan ?? slogan,
                    facebookUrl: (responseData as any)?.facebookUrl ?? matchedTenant?.settings?.facebookUrl ?? facebookUrl,
                    instagramUrl: (responseData as any)?.instagramUrl ?? matchedTenant?.settings?.instagramUrl ?? instagramUrl,
                    twitterUrl: (responseData as any)?.twitterUrl ?? matchedTenant?.settings?.twitterUrl ?? twitterUrl,
                    matchTickerBackgroundClass: (responseData as any)?.matchTickerBackgroundClass ?? matchedTenant?.settings?.matchTickerBackgroundClass ?? matchTickerBackgroundClass,
                    matchCardBackgroundClass: (responseData as any)?.matchCardBackgroundClass ?? matchedTenant?.settings?.matchCardBackgroundClass ?? matchCardBackgroundClass,
                    matchTickerTextClass: (responseData as any)?.matchTickerTextClass ?? matchedTenant?.settings?.matchTickerTextClass ?? matchTickerTextClass,
                    enableRoundRobinFixtures: (responseData as any)?.enableRoundRobinFixtures ?? matchedTenant?.settings?.enableRoundRobinFixtures ?? enableRoundRobinFixtures,
                    requireJerseyNumbers: (responseData as any)?.requireJerseyNumbers ?? matchedTenant?.settings?.requireJerseyNumbers ?? requireJerseyNumbers,
                    showOffenseDefenseWidgets: (responseData as any)?.showOffenseDefenseWidgets ?? matchedTenant?.settings?.showOffenseDefenseWidgets ?? DEFAULT_SETTINGS.showOffenseDefenseWidgets,
                    showDisciplineWidget: (responseData as any)?.showDisciplineWidget ?? matchedTenant?.settings?.showDisciplineWidget ?? DEFAULT_SETTINGS.showDisciplineWidget,
                    allowMultipleTeamsPerPlayer: (responseData as any)?.allowMultipleTeamsPerPlayer ?? matchedTenant?.settings?.allowMultipleTeamsPerPlayer ?? DEFAULT_SETTINGS.allowMultipleTeamsPerPlayer,
                    allowAdminExceedRosterLimit: (responseData as any)?.allowAdminExceedRosterLimit ?? matchedTenant?.settings?.allowAdminExceedRosterLimit ?? DEFAULT_SETTINGS.allowAdminExceedRosterLimit,
                    rejectExpiredIne: (responseData as any)?.rejectExpiredIne ?? matchedTenant?.settings?.rejectExpiredIne ?? DEFAULT_SETTINGS.rejectExpiredIne,
                    enableAccumulatedYellowSuspensions: (responseData as any)?.enableAccumulatedYellowSuspensions ?? matchedTenant?.settings?.enableAccumulatedYellowSuspensions ?? DEFAULT_SETTINGS.enableAccumulatedYellowSuspensions,
                    tiebreakerOrder: (responseData as any)?.tiebreakerOrder ?? matchedTenant?.settings?.tiebreakerOrder ?? DEFAULT_SETTINGS.tiebreakerOrder,
                    tenantId // <--- CRUCIAL: explicitly set tenantId
                });
            } catch (error) {
                console.error("Critical error in tenant context initialization:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();

        // Cleanup interceptor to avoid stacking
        return () => {
            if (requestInterceptor !== undefined) {
                axios.interceptors.request.eject(requestInterceptor);
            }
        };
    }, [location.pathname]);

    const updateSettings = (newSettings: Partial<TenantSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <TenantSettingsContext.Provider value={{ settings, isLoading, updateSettings }}>
            {isLoading ? null : children}
        </TenantSettingsContext.Provider>
    );
};

export const useTenantSettings = () => useContext(TenantSettingsContext);
