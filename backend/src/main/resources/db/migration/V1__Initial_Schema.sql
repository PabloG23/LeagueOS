CREATE TABLE IF NOT EXISTS event_publication (
    id UUID PRIMARY KEY,
    listener_id VARCHAR(512) NOT NULL,
    event_type VARCHAR(512) NOT NULL,
    serialized_event VARCHAR(4000) NOT NULL,
    publication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completion_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    show_offense_defense_widgets BOOLEAN,
    show_discipline_widget BOOLEAN,
    enable_auto_suspensions BOOLEAN,
    min_matches_for_playoffs INTEGER,
    theme_class VARCHAR(255)
);

CREATE TABLE teams (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    representative_name VARCHAR(255),
    representative_phone VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    team_id UUID
);

CREATE TABLE divisions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE seasons (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    division_id UUID REFERENCES divisions(id),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_matchday INTEGER NOT NULL,
    max_active_players_per_team INTEGER NOT NULL
);

CREATE TABLE team_registrations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    team_id UUID NOT NULL REFERENCES teams(id),
    season_id UUID NOT NULL REFERENCES seasons(id),
    status VARCHAR(50) NOT NULL
);

CREATE TABLE players (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    profile_photo_url VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    team_id UUID REFERENCES teams(id),
    suspended_until_matchday INTEGER
);

CREATE TABLE matches (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    season_id UUID NOT NULL REFERENCES seasons(id),
    home_team_id UUID NOT NULL REFERENCES teams(id),
    away_team_id UUID NOT NULL REFERENCES teams(id),
    match_date TIMESTAMP,
    matchday INTEGER,
    home_score INTEGER,
    away_score INTEGER,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE match_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    match_id UUID NOT NULL REFERENCES matches(id),
    player_id UUID REFERENCES players(id),
    team_id UUID NOT NULL REFERENCES teams(id),
    event_type VARCHAR(50) NOT NULL,
    suspension_matchdays INTEGER
);
