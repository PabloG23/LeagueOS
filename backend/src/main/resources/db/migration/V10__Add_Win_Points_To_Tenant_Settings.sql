-- Add configurable win points to tenant_settings.
-- Default value is 3 (standard FIFA soccer rules).
-- Tenants with custom rules (e.g. 2 points per win) can update this column.
ALTER TABLE tenant_settings ADD COLUMN win_points_on_win INTEGER NOT NULL DEFAULT 3;
