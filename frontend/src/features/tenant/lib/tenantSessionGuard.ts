/**
 * Detecta si la sesión almacenada pertenece a un tenant distinto al de la URL.
 * Genérico para todos los tenants: no contiene ningún tenant hardcodeado.
 *
 * Si falta alguno de los dos IDs (p. ej. superadmin sin tenant o settings aún sin resolver)
 * NO se considera mismatch: la autorización real siempre la hace el backend (TenantContextFilter).
 */
export function isTenantSessionMismatch(
    sessionTenantId: string | null | undefined,
    urlTenantId: string | null | undefined
): boolean {
    if (!sessionTenantId || !urlTenantId) return false;
    return sessionTenantId.trim().toLowerCase() !== urlTenantId.trim().toLowerCase();
}
