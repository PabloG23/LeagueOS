import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, matchPath } from 'react-router-dom';

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
}

const DEFAULT_SETTINGS: TenantSettings = {
    name: "LeagueOS",
    logoUrl: "/league_logo_new.png",
    boardMembers: [],
    showOffenseDefenseWidgets: true,
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
};

interface TenantSettingsContextType {
    settings: TenantSettings;
    isLoading: boolean;
    updateSettings: (newSettings: Partial<TenantSettings>) => void;
}

const TenantSettingsContext = createContext<TenantSettingsContextType>({
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
        document.body.classList.remove('theme-san-lucas', 'theme-nuestro-deporte');

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

                if (!isSystemRoute && (normalizedSlug === 'ligasanlucas' || normalizedSlug === 'sanlucas')) {
                    tenantId = '22222222-2222-2222-2222-222222222222';
                    name = "Liga Ejidal de Futbol San Sebastian y San Lucas";
                    logoUrl = "/san_lucas_logo.png";
                    themeClass = 'theme-san-lucas';
                    allowTransfers = false; // Disable transfers for San Lucas
                    footerAddress = "Zaragoza S/N, San Sebastián, Metepec C.P. 52146";
                    footerPhone = "722 634 4082";
                    footerBackgroundClass = "bg-emerald-800";
                    slogan = "Uniendo tradición y pasión en cada encuentro deportivo.";
                    facebookUrl = "https://www.facebook.com/share/1DrWt7euqW/?mibextid=wwXIfr";
                    instagramUrl = undefined;
                    twitterUrl = undefined;

                    // New Match Ticker Styles for San Lucas
                    matchTickerBackgroundClass = "bg-emerald-800";
                    matchCardBackgroundClass = "bg-sidebar";
                    matchTickerTextClass = "text-black";

                    boardMembers = [
                        { role: "Presidente", name: "Alejo Reyes Mejía" },
                        { role: "Secretario", name: "Eduardo García Díaz" },
                        { role: "Tesorero", name: "Ma. de Lourdes Inés Careaga Díaz" },
                        { role: "Consejo de Vigilancia", name: "Bartolo Gerardo Ramos García" }
                    ];
                } else if (isNuestroDeporteHost || (!isSystemRoute && (normalizedSlug === 'liganuestrodeporte' || normalizedSlug === 'nuestrodeporte'))) {
                    tenantId = '11111111-1111-1111-1111-111111111111';
                    name = "Liga Nuestro Deporte";
                    logoUrl = "/nuestro_deporte_logo.png";
                    themeClass = 'theme-nuestro-deporte';
                    allowTransfers = true;
                    footerAddress = "Liga Nuestro Deporte";
                    footerPhone = "722 170 3324";
                    footerBackgroundClass = "bg-[#060B1C]";
                    slogan = "Tu pasión, nuestro deporte.";
                    facebookUrl = "https://www.facebook.com/share/1LNGV1MDGz/?mibextid=wwXIfr";
                    instagramUrl = "https://www.instagram.com/liga.nuestrodeporte?igsi=MTVzZ2FzbmNuN2szbg==";
                    twitterUrl = "";

                    matchTickerBackgroundClass = "bg-[#040812]";
                    matchCardBackgroundClass = "bg-[#0D1A3C]";
                    matchTickerTextClass = "text-white";

                    boardMembers = [
                        { role: "Presidente", name: "Mike Portocarrero" },
                        { role: "Vicepresidente", name: "Carlos Mejía" },
                        { role: "Secretario", name: "Rubén Hidalgo" },
                        { role: "Tesorero", name: "Alberto Suárez" },
                        { role: "Comisión Disciplinaria", name: "Igor y Emmanuel" },
                        { role: "Marketing", name: "MGX Studio" },
                        { role: "Staff Mesa Directiva", name: "Oliver Tello y Mario Lagunas" }
                    ];
                    enableRoundRobinFixtures = true;
                } else {
                    // Check if authenticated user has a stored tenant in localStorage
                    const storedTenantId = localStorage.getItem('tenantId');
                    if (storedTenantId === '22222222-2222-2222-2222-222222222222') {
                        tenantId = '22222222-2222-2222-2222-222222222222';
                        name = "Liga Ejidal de Futbol San Sebastian y San Lucas";
                        logoUrl = "/san_lucas_logo.png";
                        themeClass = 'theme-san-lucas';
                        allowTransfers = false;
                        footerAddress = "Zaragoza S/N, San Sebastián, Metepec C.P. 52146";
                        footerPhone = "722 634 4082";
                        footerBackgroundClass = "bg-emerald-800";
                        slogan = "Uniendo tradición y pasión en cada encuentro deportivo.";
                        facebookUrl = "https://www.facebook.com/share/1DrWt7euqW/?mibextid=wwXIfr";
                        matchTickerBackgroundClass = "bg-emerald-800";
                        matchCardBackgroundClass = "bg-sidebar";
                        matchTickerTextClass = "text-black";
                        boardMembers = [
                            { role: "Presidente", name: "Alejo Reyes Mejía" },
                            { role: "Secretario", name: "Eduardo García Díaz" },
                            { role: "Tesorero", name: "Ma. de Lourdes Inés Careaga Díaz" },
                            { role: "Consejo de Vigilancia", name: "Bartolo Gerardo Ramos García" }
                        ];
                    } else if (storedTenantId === '11111111-1111-1111-1111-111111111111') {
                        tenantId = '11111111-1111-1111-1111-111111111111';
                        name = "Liga Nuestro Deporte";
                        logoUrl = "/nuestro_deporte_logo.png";
                        themeClass = 'theme-nuestro-deporte';
                        allowTransfers = true;
                        footerAddress = "Liga Nuestro Deporte";
                        footerPhone = "722 170 3324";
                        footerBackgroundClass = "bg-[#060B1C]";
                        slogan = "Tu pasión, nuestro deporte.";
                        facebookUrl = "https://www.facebook.com/share/1LNGV1MDGz/?mibextid=wwXIfr";
                        instagramUrl = "https://www.instagram.com/liga.nuestrodeporte?igsi=MTVzZ2FzbmNuN2szbg==";
                        twitterUrl = "";
                        matchTickerBackgroundClass = "bg-[#040812]";
                        matchCardBackgroundClass = "bg-[#0D1A3C]";
                        matchTickerTextClass = "text-white";
                        boardMembers = [
                            { role: "Presidente", name: "Mike Portocarrero" },
                            { role: "Vicepresidente", name: "Carlos Mejía" },
                            { role: "Secretario", name: "Rubén Hidalgo" },
                            { role: "Tesorero", name: "Alberto Suárez" },
                            { role: "Comisión Disciplinaria", name: "Igor y Emmanuel" },
                            { role: "Marketing", name: "MGX Studio" },
                            { role: "Staff Mesa Directiva", name: "Oliver Tello y Mario Lagunas" }
                        ];
                        enableRoundRobinFixtures = true;
                    } else {
                        console.log(`[TenantContext] No slug or custom domain detected, using neutral LeagueOS platform settings`);
                    }
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
                    ...(typeof responseData === 'object' ? responseData : {}),     // Overrides from backend (if any)
                    name,
                    logoUrl,
                    themeClass,
                    boardMembers,
                    allowTransfers,
                    footerAddress,
                    footerPhone,
                    footerBackgroundClass,
                    slogan,
                    facebookUrl,
                    instagramUrl,
                    twitterUrl,
                    matchTickerBackgroundClass,
                    matchCardBackgroundClass,
                    matchTickerTextClass,
                    enableRoundRobinFixtures,
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
