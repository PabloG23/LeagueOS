-- Flyway migration: V21 Add Shootout Extra Point Support
-- Adds configurable shootout extra point rule to tenant_settings (for leagues like Liga Nuestro Deporte)
-- Adds penalty shootout scores and winner to matches

ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS enable_shootout_extra_point BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_penalty_score INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_penalty_score INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_winner_team_id UUID REFERENCES teams(id);

-- Enable by default for Liga Nuestro Deporte tenant
UPDATE tenant_settings 
SET enable_shootout_extra_point = TRUE 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
