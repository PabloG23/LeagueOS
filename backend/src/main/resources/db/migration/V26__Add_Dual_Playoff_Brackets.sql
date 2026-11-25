ALTER TABLE seasons
    ADD COLUMN playoff_format VARCHAR(40) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE playoff_ties
    ADD COLUMN bracket_key VARCHAR(40) NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN bracket_name VARCHAR(100);

ALTER TABLE tenant_settings
    ADD COLUMN show_public_playoffs BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tenant_settings
SET show_public_playoffs = TRUE
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';
