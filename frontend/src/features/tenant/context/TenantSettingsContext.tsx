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
}

const DEFAULT_SETTINGS: TenantSettings = {
    name: "Liga Mexiquense",
    logoUrl: "/logo.png",
    boardMembers: [],
    showOffenseDefenseWidgets: true,
    showDisciplineWidget: false,
    enableAutoSuspensions: false,
    minMatchesForPlayoffs: 0,
    allowTransfers: false,
    themeClass: '',
    footerAddress: "Joaquín Fernández de Lizardi 408-A.<br />Col. Sánchez Colin. Toluca, Estado de México.<br />C.P. 50150.",
    footerPhone: "729 103 7941",
    footerBackgroundClass: "bg-slate-900",
    slogan: "Fomentando el deporte y la sana competencia en el Estado de México desde hace más de 50 años.",
    facebookUrl: "#",
    instagramUrl: "#",
    twitterUrl: "#",

    matchTickerBackgroundClass: "bg-sidebar",
    matchCardBackgroundClass: "bg-white/5",
    matchTickerTextClass: "text-primary",
};

interface TenantSettingsContextType {
    settings: TenantSettings;
    isLoading: boolean;
}

const TenantSettingsContext = createContext<TenantSettingsContextType>({
    settings: DEFAULT_SETTINGS,
    isLoading: true,
});

export const TenantSettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<TenantSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    // Effect to apply theme class to body
    useEffect(() => {
        // Remove any existing theme classes first
        document.body.classList.remove('theme-san-lucas');

        if (settings.themeClass) {
            document.body.classList.add(settings.themeClass);
        }
    }, [settings.themeClass]);

    useEffect(() => {
        let requestInterceptor: number | undefined;

        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                // Determine Tenant from URL
                let tenantId = '11111111-1111-1111-1111-111111111111'; // Default: Mexiquense
                let name = "Liga Mexiquense";
                let logoUrl = "/logo.png";
                let boardMembers: BoardMember[] = [];
                let allowTransfers = true;
                let footerAddress = "Joaquín Fernández de Lizardi 408-A.<br />Col. Sánchez Colin. Toluca, Estado de México.<br />C.P. 50150.";
                let footerPhone = "729 103 7941";
                let footerBackgroundClass = "bg-slate-900";
                let slogan = "Fomentando el deporte y la sana competencia en el Estado de México desde hace más de 50 años.";
                let facebookUrl: string | undefined = "#";
                let instagramUrl: string | undefined = "#";
                let twitterUrl: string | undefined = "#";

                let matchTickerBackgroundClass = "bg-sidebar";
                let matchCardBackgroundClass = "bg-white/5";
                let matchTickerTextClass = "text-primary";

                console.log(`[TenantContext] Analyzing URL: ${location.pathname}`);

                // Check for /:leagueSlug or /:leagueSlug/team/:teamId
                const matchLeague = matchPath("/:leagueSlug/*", location.pathname);
                const matchLeagueExact = matchPath("/:leagueSlug", location.pathname);

                const slug = matchLeague?.params.leagueSlug || matchLeagueExact?.params.leagueSlug;

                if (slug) {
                    console.log(`[TenantContext] Detected slug: ${slug}`);
                    if (slug === 'ligaSanLucas') {
                        tenantId = '22222222-2222-2222-2222-222222222222';
                        name = "Liga Ejidal de Futbol San Sebastian y San Lucas";
                        logoUrl = "/san_lucas_logo.png";
                        allowTransfers = false; // Disable transfers for San Lucas
                        footerAddress = "Zaragoza S/N, San Sebastián, Metepec C.P. 52146";
                        footerPhone = "722 734 4082";
                        footerBackgroundClass = "bg-emerald-800";
                        slogan = "Uniendo tradición y pasión en cada encuentro deportivo.";
                        facebookUrl = "https://www.facebook.com/share/1DrWt7euqW/?mibextid=wwXIfr";
                        instagramUrl = undefined;
                        twitterUrl = undefined;

                        // New Match Ticker Styles for San Lucas
                        matchTickerBackgroundClass = "bg-emerald-800";
                        matchCardBackgroundClass = "bg-sidebar"; // Check if 'bg-sidebar' is defined or use literal color
                        matchTickerTextClass = "text-black";

                        boardMembers = [
                            { role: "Presidente", name: "Alejo Reyes Mejía" },
                            { role: "Secretario", name: "Eduardo García Díaz" },
                            { role: "Tesorero", name: "Ma. de Lourdes Inés Careaga Díaz" },
                            { role: "Consejo de Vigilancia", name: "Bartolo Gerardo Ramos García" }
                        ];
                    } else if (slug === 'ligaMexiquense') {
                        tenantId = '11111111-1111-1111-1111-111111111111';
                        name = "Liga Mexiquense";
                        logoUrl = "/logo.png";
                        allowTransfers = true; // Enable transfers for Mexiquense
                        footerAddress = "Joaquín Fernández de Lizardi 408-A.<br />Col. Sánchez Colin. Toluca, Estado de México.<br />C.P. 50150.";
                        footerPhone = "729 103 7941";
                        footerBackgroundClass = "bg-slate-900";
                        slogan = "Fomentando el deporte y la sana competencia en el Estado de México desde hace más de 50 años.";
                        facebookUrl = "#";
                        instagramUrl = "#";
                        twitterUrl = "#";

                        matchTickerBackgroundClass = "bg-sidebar";
                        matchCardBackgroundClass = "bg-white/5";
                        matchTickerTextClass = "text-primary";

                        boardMembers = [
                            { role: 'Presidente', name: 'Dr. Hugo Alvarado López' },
                            { role: 'Secretario', name: 'Lic. Santiago Téllez Pérez' },
                            { role: 'Tesorero', name: 'Lic. Eduardo Gómez Álvarez' },
                            { role: 'Comisión Disciplinaria', name: 'Lic. José Elías Nader Mata' },
                            { role: 'DCM', name: 'Lic. Eduardo Escobar Garduño' },
                        ];
                    }
                } else {
                    console.log(`[TenantContext] No slug detected, defaulting to Mexiquense`);
                }

                // Set Header via Interceptor (More reliable than defaults)
                requestInterceptor = axios.interceptors.request.use(config => {
                    config.headers['X-Tenant-ID'] = tenantId;
                    return config;
                });

                console.log(`[TenantContext] Switched to tenant: ${tenantId}, Name: ${name}`);

                let responseData = {};
                try {
                    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
                    const response = await axios.get(`${baseURL}/tenants/settings/current`);
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

    return (
        <TenantSettingsContext.Provider value={{ settings, isLoading }}>
            {children}
        </TenantSettingsContext.Provider>
    );
};

export const useTenantSettings = () => useContext(TenantSettingsContext);
