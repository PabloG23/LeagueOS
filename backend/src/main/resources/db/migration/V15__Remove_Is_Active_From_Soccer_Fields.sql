-- Remove is_active column from soccer_fields
ALTER TABLE soccer_fields DROP COLUMN IF EXISTS is_active;
