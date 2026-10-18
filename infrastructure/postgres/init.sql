-- HealthSync Postgres Initialization Script
CREATE DATABASE healthsync_keycloak;

\c healthsync;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema privileges
GRANT ALL PRIVILEGES ON DATABASE healthsync TO postgres;
