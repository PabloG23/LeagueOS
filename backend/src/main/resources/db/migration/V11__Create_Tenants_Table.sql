-- V11: Create tenants table and seed the two existing tenants
--
-- Note: The 'tenants' table uses itself as its own tenant_id (self-referential),
-- since Tenant extends BaseEntity which requires a tenant_id column.
-- The tenant_id column is set to the same value as the id.

CREATE TABLE tenants (
    id         UUID PRIMARY KEY,
    tenant_id  UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    name       VARCHAR(255) NOT NULL,
    sport_type VARCHAR(100) NOT NULL DEFAULT 'SOCCER',
    subdomain  VARCHAR(255) NOT NULL UNIQUE
);

-- Tenant 1: Liga Nuestro Deporte (new client — UUID 11111111)
INSERT INTO tenants (id, tenant_id, name, sport_type, subdomain)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Liga Nuestro Deporte',
    'SOCCER',
    'nuestrodeporte'
);

-- Tenant 2: Liga San Lucas (existing client — UUID 22222222)
INSERT INTO tenants (id, tenant_id, name, sport_type, subdomain)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Liga San Lucas',
    'SOCCER',
    'sanlucas'
);
