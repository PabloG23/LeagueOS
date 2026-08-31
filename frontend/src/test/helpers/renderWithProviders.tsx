import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
    TenantSettings,
    TenantSettingsContext,
} from '@/features/tenant/context/TenantSettingsContext';
import { createTenantSettings } from './tenantTestUtils';

// =========================================================================
// TenantSettingsTestProvider
// =========================================================================

export const TenantSettingsTestProvider = ({
    children,
    settings,
    isLoading = false,
}: {
    children: React.ReactNode;
    settings: TenantSettings;
    isLoading?: boolean;
}) => {
    const [currentSettings, setCurrentSettings] = React.useState(settings);

    const updateSettings = (newSettings: Partial<TenantSettings>) => {
        setCurrentSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Re-sync when settings prop changes (for rerender tests)
    React.useEffect(() => {
        setCurrentSettings(settings);
    }, [settings]);

    return (
        <TenantSettingsContext.Provider
            value={{ settings: currentSettings, isLoading, updateSettings }}
        >
            {children}
        </TenantSettingsContext.Provider>
    );
};

// =========================================================================
// renderWithProviders
// =========================================================================

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    /** Tenant settings to inject. Defaults to platform defaults. */
    tenantSettings?: TenantSettings;
    /** Initial route for MemoryRouter. Defaults to '/'. */
    initialRoute?: string;
    /** Whether to simulate loading state. Defaults to false. */
    isLoading?: boolean;
}

/**
 * Render helper that wraps components with MemoryRouter + TenantSettingsTestProvider.
 * Use this instead of raw `render()` for all component tests.
 */
export const renderWithProviders = (
    ui: React.ReactElement,
    {
        tenantSettings = createTenantSettings(),
        initialRoute = '/',
        isLoading = false,
        ...renderOptions
    }: RenderWithProvidersOptions = {}
) => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[initialRoute]}>
            <TenantSettingsTestProvider settings={tenantSettings} isLoading={isLoading}>
                {children}
            </TenantSettingsTestProvider>
        </MemoryRouter>
    );

    return render(ui, { wrapper: Wrapper, ...renderOptions });
};
