-- Migration: Ensure all seasons for Nuestro Deporte have max_active_players_per_team = 30
UPDATE seasons 
SET max_active_players_per_team = 30 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
   OR tenant_id IS NULL;

UPDATE seasons 
SET max_active_players_per_team = 25 
WHERE tenant_id = '22222222-2222-2222-2222-222222222222';
