-- Add new settings for CURP requirement and multiple teams per player
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS allow_multiple_teams_per_player BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS require_curp BOOLEAN NOT NULL DEFAULT FALSE;
