-- Flyway migration V25: Add tournament_type to seasons table
ALTER TABLE seasons 
    ADD COLUMN IF NOT EXISTS tournament_type VARCHAR(50) DEFAULT 'LIGA';
