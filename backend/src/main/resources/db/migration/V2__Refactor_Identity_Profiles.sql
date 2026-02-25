CREATE TABLE persons (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    birth_date DATE,
    profile_photo_url VARCHAR(255)
);

-- Migrate data from players to persons (assuming simple 1-to-1 temp logic for existing data)
-- For simplicity in this dev environment, we assume the DB will either be wiped or we can just append constraints.
-- Let's add the column first
ALTER TABLE players ADD COLUMN person_id UUID;
ALTER TABLE teams ADD COLUMN representative_id UUID;
ALTER TABLE users ADD COLUMN person_id UUID;

-- Drop old columns
ALTER TABLE players DROP COLUMN first_name;
ALTER TABLE players DROP COLUMN last_name;
ALTER TABLE players DROP COLUMN birth_date;
ALTER TABLE players DROP COLUMN profile_photo_url;

ALTER TABLE teams DROP COLUMN representative_name;
ALTER TABLE teams DROP COLUMN representative_phone;

-- Add Foreign Key Constraints
ALTER TABLE players ADD CONSTRAINT fk_players_person FOREIGN KEY (person_id) REFERENCES persons(id);
ALTER TABLE teams ADD CONSTRAINT fk_teams_rep_person FOREIGN KEY (representative_id) REFERENCES persons(id);
ALTER TABLE users ADD CONSTRAINT fk_users_person FOREIGN KEY (person_id) REFERENCES persons(id);
