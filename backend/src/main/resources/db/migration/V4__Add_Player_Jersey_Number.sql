ALTER TABLE players ADD COLUMN jersey_number INTEGER;
ALTER TABLE tenant_settings ADD COLUMN require_jersey_numbers BOOLEAN NOT NULL DEFAULT FALSE;
