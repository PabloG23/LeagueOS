-- Flyway migration: V19 Add User Management Fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Set default values for existing admin user if present
UPDATE users 
SET name = 'Administrador de Liga', 
    raw_password = 'password123',
    is_active = TRUE 
WHERE username = 'admin_liga' AND (name IS NULL OR raw_password IS NULL);
