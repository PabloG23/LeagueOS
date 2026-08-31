import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { LeadershipSection } from '../LeadershipSection';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import {
    TENANT_NUESTRO_DEPORTE,
    TENANT_SAN_LUCAS,
    createTenantSettings,
} from '@/test/helpers/tenantTestUtils';

describe('LeadershipSection — Multi-Tenant Leadership Board & Isolation', () => {

    // =========================================================================
    // Empty board members
    // =========================================================================

    it('should render nothing (null) if boardMembers list is empty', () => {
        const emptySettings = createTenantSettings({ boardMembers: [] });
        const { container } = renderWithProviders(<LeadershipSection />, {
            tenantSettings: emptySettings,
        });

        expect(container.firstChild).toBeNull();
    });

    // =========================================================================
    // Tenant: Nuestro Deporte
    // =========================================================================

    describe('Tenant: Liga Nuestro Deporte', () => {
        it('should render Nuestro Deporte leadership members', () => {
            renderWithProviders(<LeadershipSection />, {
                tenantSettings: TENANT_NUESTRO_DEPORTE,
            });

            expect(screen.getByText('Mike Portocarrero')).toBeInTheDocument();
            expect(screen.getByText('Presidente')).toBeInTheDocument();
            expect(screen.getByText('Carlos Mejía')).toBeInTheDocument();
            expect(screen.getByText('Vicepresidencia')).toBeInTheDocument();

            // San Lucas leaders should NOT be present
            expect(screen.queryByText('Alejo Reyes Mejía')).not.toBeInTheDocument();
            expect(screen.queryByText('Eduardo García Díaz')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // Tenant: San Lucas
    // =========================================================================

    describe('Tenant: Liga San Lucas', () => {
        it('should render San Lucas directiva members', () => {
            renderWithProviders(<LeadershipSection />, {
                tenantSettings: TENANT_SAN_LUCAS,
            });

            expect(screen.getByText('Alejo Reyes Mejía')).toBeInTheDocument();
            expect(screen.getByText('Presidente')).toBeInTheDocument();
            expect(screen.getByText('Eduardo García Díaz')).toBeInTheDocument();
            expect(screen.getByText('Secretario')).toBeInTheDocument();

            // Nuestro Deporte leaders should NOT be present
            expect(screen.queryByText('Mike Portocarrero')).not.toBeInTheDocument();
            expect(screen.queryByText('Carlos Mejía')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // ISOLATION: Cross-tenant leakage check
    // =========================================================================

    describe('ISOLATION: Board Members do not leak across tenants', () => {
        it('changing tenant settings strictly updates rendered board members', () => {
            const { unmount } = renderWithProviders(<LeadershipSection />, {
                tenantSettings: TENANT_NUESTRO_DEPORTE,
            });

            expect(screen.getByText('Mike Portocarrero')).toBeInTheDocument();
            unmount();

            renderWithProviders(<LeadershipSection />, {
                tenantSettings: TENANT_SAN_LUCAS,
            });

            expect(screen.getByText('Alejo Reyes Mejía')).toBeInTheDocument();
            expect(screen.queryByText('Mike Portocarrero')).not.toBeInTheDocument();
        });
    });
});
