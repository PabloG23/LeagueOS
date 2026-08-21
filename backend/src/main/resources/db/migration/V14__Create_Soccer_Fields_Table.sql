-- Create soccer_fields table for managing venues/fields
CREATE TABLE IF NOT EXISTS soccer_fields (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    location_url TEXT,
    address VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_soccer_fields_tenant ON soccer_fields(tenant_id);

-- Link match to soccer_fields
ALTER TABLE matches ADD COLUMN IF NOT EXISTS field_id UUID REFERENCES soccer_fields(id) ON DELETE SET NULL;
