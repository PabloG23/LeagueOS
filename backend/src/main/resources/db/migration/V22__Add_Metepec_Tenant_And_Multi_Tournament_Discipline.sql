-- Flyway migration: V22 Add Metepec Tenant And Multi-Tournament Discipline Support

-- 1. Insert Tenant Metepec
INSERT INTO tenants (id, tenant_id, name, sport_type, subdomain, created_at)
VALUES (
    'e39a6b17-5646-452d-929c-ca9a8dc4e44d',
    'e39a6b17-5646-452d-929c-ca9a8dc4e44d',
    'LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.',
    'SOCCER',
    'ligametepec',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Add columns to tenant_settings for new configurable business rules (backward-compatible defaults)
ALTER TABLE tenant_settings 
    ADD COLUMN IF NOT EXISTS tiebreaker_order VARCHAR(100) NOT NULL DEFAULT 'PTS_GD_GF_NAME',
    ADD COLUMN IF NOT EXISTS allow_admin_exceed_roster_limit BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reject_expired_ine BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS enable_accumulated_yellow_suspensions BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS yellow_cards_per_suspension INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS max_accumulated_suspension_matchdays INT NOT NULL DEFAULT 12;

-- 3. Insert tenant_settings for Metepec
INSERT INTO tenant_settings (
    id, tenant_id, created_at, 
    show_offense_defense_widgets, show_discipline_widget, enable_auto_suspensions,
    require_jersey_numbers, min_matches_for_playoffs, theme_class, win_points_on_win,
    allow_multiple_teams_per_player, require_curp, enable_shootout_extra_point,
    tiebreaker_order, allow_admin_exceed_roster_limit, reject_expired_ine,
    enable_accumulated_yellow_suspensions, yellow_cards_per_suspension, max_accumulated_suspension_matchdays
) VALUES (
    gen_random_uuid(),
    'e39a6b17-5646-452d-929c-ca9a8dc4e44d',
    NOW(),
    TRUE, TRUE, TRUE,
    FALSE, 0, 'theme-metepec', 3,
    TRUE, FALSE, FALSE,
    'PTS_GD_GF_FP_NAME', TRUE, TRUE,
    TRUE, 5, 12
) ON CONFLICT DO NOTHING;

-- 4. Phase and group support for matches and team registrations
ALTER TABLE matches 
    ADD COLUMN IF NOT EXISTS phase_group VARCHAR(50);

ALTER TABLE team_registrations 
    ADD COLUMN IF NOT EXISTS phase_group VARCHAR(50),
    ADD COLUMN IF NOT EXISTS phase_seed INT;

-- 5. Tournament-level suspensions table (isolated by season)
CREATE TABLE IF NOT EXISTS player_tournament_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    remaining_matches INT NOT NULL DEFAULT 1,
    total_matches_assigned INT NOT NULL DEFAULT 1,
    reason VARCHAR(255) NOT NULL,
    is_tournament_banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pts_player_season ON player_tournament_suspensions(player_id, season_id);
