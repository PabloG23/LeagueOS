CREATE TABLE referees (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    photo_url VARCHAR(512),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

CREATE INDEX idx_referees_tenant_id ON referees(tenant_id);
CREATE INDEX idx_referees_user_id ON referees(user_id);

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS referee_id UUID REFERENCES referees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS report_photo_url VARCHAR(512);

CREATE INDEX idx_matches_referee_id ON matches(referee_id);
