import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { TenantSettingsTestProvider } from '@/test/helpers/renderWithProviders';
import { TENANT_NUESTRO_DEPORTE, TENANT_SAN_LUCAS } from '@/test/helpers/tenantTestUtils';

describe('useTenantSettings — Hook Unit Tests', () => {

    it('should return current tenant settings from context', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <TenantSettingsTestProvider settings={TENANT_NUESTRO_DEPORTE}>
                {children}
            </TenantSettingsTestProvider>
        );

        const { result } = renderHook(() => useTenantSettings(), { wrapper });

        expect(result.current.settings.name).toBe('Liga Nuestro Deporte');
        expect(result.current.settings.enableAutoSuspensions).toBe(true);
        expect(result.current.isLoading).toBe(false);
    });

    it('should allow updating settings via updateSettings function', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <TenantSettingsTestProvider settings={TENANT_SAN_LUCAS}>
                {children}
            </TenantSettingsTestProvider>
        );

        const { result } = renderHook(() => useTenantSettings(), { wrapper });

        expect(result.current.settings.name).toBe('Liga Ejidal de Futbol San Sebastian y San Lucas');

        act(() => {
            result.current.updateSettings({ name: 'Liga San Lucas Actualizada', allowTransfers: true });
        });

        expect(result.current.settings.name).toBe('Liga San Lucas Actualizada');
        expect(result.current.settings.allowTransfers).toBe(true);
    });
});
