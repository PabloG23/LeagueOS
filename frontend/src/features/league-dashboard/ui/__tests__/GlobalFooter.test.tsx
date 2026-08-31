import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { GlobalFooter } from '../GlobalFooter';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import {
    TENANT_NUESTRO_DEPORTE,
    TENANT_SAN_LUCAS,
    TENANT_DEFAULT_PLATFORM,
} from '@/test/helpers/tenantTestUtils';

describe('GlobalFooter — Multi-Tenant Rendering & Isolation', () => {

    // =========================================================================
    // Tenant: Nuestro Deporte
    // =========================================================================

    describe('Tenant: Liga Nuestro Deporte', () => {
        it('should render Nuestro Deporte branding, slogan and phone', () => {
            renderWithProviders(<GlobalFooter />, {
                tenantSettings: TENANT_NUESTRO_DEPORTE,
            });

            // Name & slogan
            expect(screen.getAllByText('Liga Nuestro Deporte').length).toBeGreaterThan(0);
            expect(screen.getByText('Tu pasión, nuestro deporte.')).toBeInTheDocument();
            expect(screen.getByText('722 170 3324')).toBeInTheDocument();

            // Should NOT render San Lucas specific info
            expect(screen.queryByText(/San Sebastián, Metepec/i)).not.toBeInTheDocument();
            expect(screen.queryByText('722 634 4082')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // Tenant: San Lucas
    // =========================================================================

    describe('Tenant: Liga San Lucas', () => {
        it('should render San Lucas address, phone and slogan', () => {
            renderWithProviders(<GlobalFooter />, {
                tenantSettings: TENANT_SAN_LUCAS,
            });

            expect(screen.getAllByText('Liga Ejidal de Futbol San Sebastian y San Lucas').length).toBeGreaterThan(0);
            expect(screen.getByText(/Zaragoza S\/N, San Sebastián, Metepec/i)).toBeInTheDocument();
            expect(screen.getByText('722 634 4082')).toBeInTheDocument();
            expect(screen.getByText('Uniendo tradición y pasión en cada encuentro deportivo.')).toBeInTheDocument();

            // Should NOT render Nuestro Deporte specific info
            expect(screen.queryByText('Tu pasión, nuestro deporte.')).not.toBeInTheDocument();
            expect(screen.queryByText('722 170 3324')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // Tenant: Default Platform
    // =========================================================================

    describe('Tenant: Default LeagueOS Platform', () => {
        it('should render generic LeagueOS footer', () => {
            renderWithProviders(<GlobalFooter />, {
                tenantSettings: TENANT_DEFAULT_PLATFORM,
            });

            expect(screen.getAllByText('LeagueOS').length).toBeGreaterThan(0);
            expect(screen.getByText('Plataforma de Gestión Deportiva')).toBeInTheDocument();
        });
    });

    // =========================================================================
    // ISOLATION TEST: Switching tenants does not leak data
    // =========================================================================

    describe('ISOLATION: Tenant Switch Isolation', () => {
        it('renders correct content when switched between tenants', () => {
            const { unmount } = renderWithProviders(<GlobalFooter />, {
                tenantSettings: TENANT_NUESTRO_DEPORTE,
            });

            expect(screen.getAllByText('Liga Nuestro Deporte').length).toBeGreaterThan(0);
            unmount();

            renderWithProviders(<GlobalFooter />, {
                tenantSettings: TENANT_SAN_LUCAS,
            });

            expect(screen.getAllByText('Liga Ejidal de Futbol San Sebastian y San Lucas').length).toBeGreaterThan(0);
            expect(screen.queryByText('Liga Nuestro Deporte')).not.toBeInTheDocument();
        });
    });
});
