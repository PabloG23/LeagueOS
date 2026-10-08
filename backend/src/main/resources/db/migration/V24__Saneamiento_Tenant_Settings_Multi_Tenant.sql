-- Flyway migration V24: Saneamiento y alineación integral de tenant_settings para todos los clientes

-- 1. Liga Nuestro Deporte (11111111-1111-1111-1111-111111111111)
UPDATE tenant_settings
SET show_offense_defense_widgets = FALSE,
    show_discipline_widget = FALSE,
    allow_multiple_teams_per_player = FALSE,
    require_jersey_numbers = TRUE,
    require_curp = TRUE,
    enable_shootout_extra_point = TRUE,
    tiebreaker_order = 'PTS_GD_GF_NAME',
    allow_admin_exceed_roster_limit = FALSE,
    reject_expired_ine = FALSE,
    enable_accumulated_yellow_suspensions = FALSE
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- 2. Liga San Lucas (22222222-2222-2222-2222-222222222222)
UPDATE tenant_settings
SET show_offense_defense_widgets = FALSE,
    show_discipline_widget = TRUE,
    allow_multiple_teams_per_player = FALSE,
    require_jersey_numbers = TRUE,
    require_curp = FALSE,
    enable_shootout_extra_point = FALSE,
    tiebreaker_order = 'PTS_GD_GF_NAME',
    allow_admin_exceed_roster_limit = FALSE,
    reject_expired_ine = FALSE,
    enable_accumulated_yellow_suspensions = FALSE
WHERE tenant_id = '22222222-2222-2222-2222-222222222222';

-- 3. Liga Metepec (e39a6b17-5646-452d-929c-ca9a8dc4e44d)
UPDATE tenant_settings
SET show_offense_defense_widgets = TRUE,
    show_discipline_widget = TRUE,
    allow_multiple_teams_per_player = FALSE,
    require_jersey_numbers = FALSE,
    require_curp = FALSE,
    enable_shootout_extra_point = FALSE,
    tiebreaker_order = 'PTS_GD_GF_FP_NAME',
    allow_admin_exceed_roster_limit = TRUE,
    reject_expired_ine = TRUE,
    enable_accumulated_yellow_suspensions = TRUE
WHERE tenant_id = 'e39a6b17-5646-452d-929c-ca9a8dc4e44d';
