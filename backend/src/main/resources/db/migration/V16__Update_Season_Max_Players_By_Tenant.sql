-- Migration: Update season max active players per team based on tenant rules
-- Nuestro Deporte: 30 players
UPDATE seasons 
SET max_active_players_per_team = 30 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- San Lucas: 25 players
UPDATE seasons 
SET max_active_players_per_team = 25 
WHERE tenant_id = '22222222-2222-2222-2222-222222222222';
