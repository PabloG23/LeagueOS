-- Fix require_jersey_numbers for Liga Nuestro Deporte (tenantId: 11111111-1111-1111-1111-111111111111)
UPDATE tenant_settings 
SET require_jersey_numbers = TRUE 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
