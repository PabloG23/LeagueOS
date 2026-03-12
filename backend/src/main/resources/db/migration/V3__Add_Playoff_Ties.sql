-- Create playoff_ties table
CREATE TABLE playoff_ties (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    season_id UUID NOT NULL,
    round VARCHAR(50) NOT NULL,
    home_seed_team_id UUID,
    away_seed_team_id UUID,
    advancing_team_id UUID,
    next_tie_id UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_pt_season FOREIGN KEY (season_id) REFERENCES seasons(id),
    CONSTRAINT fk_pt_home_team FOREIGN KEY (home_seed_team_id) REFERENCES teams(id),
    CONSTRAINT fk_pt_away_team FOREIGN KEY (away_seed_team_id) REFERENCES teams(id),
    CONSTRAINT fk_pt_advancing_team FOREIGN KEY (advancing_team_id) REFERENCES teams(id)
);

-- Add new columns to matches table
ALTER TABLE matches ADD COLUMN stage VARCHAR(50) NOT NULL DEFAULT 'REGULAR';
ALTER TABLE matches ADD COLUMN playoff_tie_id UUID;
ALTER TABLE matches ADD COLUMN leg_number INT;
ALTER TABLE matches ADD COLUMN is_tiebreaker_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE matches ADD CONSTRAINT fk_match_playoff_tie FOREIGN KEY (playoff_tie_id) REFERENCES playoff_ties(id);
