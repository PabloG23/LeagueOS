-- Add soft delete flag to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Create season_rosters pivot table
CREATE TABLE IF NOT EXISTS season_rosters (
    id UUID PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id),
    team_id UUID NOT NULL REFERENCES teams(id),
    season_id UUID NOT NULL REFERENCES seasons(id),
    jersey_number INTEGER,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    last_modified_by VARCHAR(50),
    
    -- Ensure a player can only be registered once per team per season
    CONSTRAINT uk_season_roster_player_team_season UNIQUE (player_id, team_id, season_id)
);

-- Backfill existing player-team relationships into the new roster table assuming current active season
-- This is a simplistic data migration for the development environment.
-- Assuming all teams belong to 'Torneo 2026' (the active Draft/Active season)
INSERT INTO season_rosters (id, player_id, team_id, season_id, jersey_number, status, created_at, updated_at)
SELECT gen_random_uuid(), p.id, p.team_id, s.id, p.jersey_number, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM players p
JOIN teams t ON p.team_id = t.id
CROSS JOIN (SELECT id FROM seasons LIMIT 1) s -- Grabbing an arbitrary season for backward compatibility in dev
WHERE p.team_id IS NOT NULL;

-- Drop constraints and columns from players
ALTER TABLE players DROP CONSTRAINT IF EXISTS fk_players_team;
ALTER TABLE players DROP COLUMN IF EXISTS team_id;
ALTER TABLE players DROP COLUMN IF EXISTS jersey_number;
ALTER TABLE players DROP COLUMN IF EXISTS status;
