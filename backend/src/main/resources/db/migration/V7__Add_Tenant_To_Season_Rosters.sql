-- Add tenant_id to season_rosters since it extends BaseEntity
ALTER TABLE season_rosters ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from the referencing team to ensure data consistency
UPDATE season_rosters sr
SET tenant_id = t.tenant_id
FROM teams t
WHERE sr.team_id = t.id AND sr.tenant_id IS NULL;

-- BaseEntity expects tenant_id to be NOT NULL
ALTER TABLE season_rosters ALTER COLUMN tenant_id SET NOT NULL;
