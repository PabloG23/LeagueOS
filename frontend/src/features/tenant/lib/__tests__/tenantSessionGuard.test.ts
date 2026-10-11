import { describe, it, expect } from 'vitest';
import { isTenantSessionMismatch } from '../tenantSessionGuard';
import {
    TENANT_ID_METEPEC,
    TENANT_ID_NUESTRO_DEPORTE,
    TENANT_ID_SAN_LUCAS,
} from '../../config/tenantsRegistry';

describe('isTenantSessionMismatch', () => {
    it('no hay mismatch cuando la sesión y la URL son el mismo tenant', () => {
        expect(isTenantSessionMismatch(TENANT_ID_METEPEC, TENANT_ID_METEPEC)).toBe(false);
        expect(isTenantSessionMismatch(TENANT_ID_NUESTRO_DEPORTE, TENANT_ID_NUESTRO_DEPORTE)).toBe(false);
        expect(isTenantSessionMismatch(TENANT_ID_SAN_LUCAS, TENANT_ID_SAN_LUCAS)).toBe(false);
    });

    it('detecta mismatch entre cualquier par de tenants distintos', () => {
        expect(isTenantSessionMismatch(TENANT_ID_METEPEC, TENANT_ID_NUESTRO_DEPORTE)).toBe(true);
        expect(isTenantSessionMismatch(TENANT_ID_NUESTRO_DEPORTE, TENANT_ID_SAN_LUCAS)).toBe(true);
        expect(isTenantSessionMismatch(TENANT_ID_SAN_LUCAS, TENANT_ID_METEPEC)).toBe(true);
    });

    it('ignora mayúsculas y espacios', () => {
        expect(isTenantSessionMismatch(` ${TENANT_ID_METEPEC.toUpperCase()} `, TENANT_ID_METEPEC)).toBe(false);
    });

    it('no bloquea si falta alguno de los IDs (el backend sigue siendo la autoridad)', () => {
        expect(isTenantSessionMismatch(null, TENANT_ID_METEPEC)).toBe(false);
        expect(isTenantSessionMismatch(TENANT_ID_METEPEC, undefined)).toBe(false);
        expect(isTenantSessionMismatch('', '')).toBe(false);
    });
});
