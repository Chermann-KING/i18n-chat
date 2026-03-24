-- Enable pgcrypto extension for encrypting personal data at rest (GDPR compliance).
-- This script runs automatically on first PostgreSQL container startup.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
