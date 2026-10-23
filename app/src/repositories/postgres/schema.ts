import { Pool } from 'pg';

export const SCHEMA_SQL = `
-- Ticket number sequence
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1001;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(255),
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  department VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Intakes table
CREATE TABLE IF NOT EXISTS intakes (
  intake_id VARCHAR(128) PRIMARY KEY,
  created_by_uid VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  category VARCHAR(64),
  additional_details JSONB,
  attachments JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(64) NOT NULL DEFAULT 'draft',
  ticket_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intakes_created_by ON intakes(created_by_uid, created_at DESC);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id VARCHAR(128) PRIMARY KEY,
  ticket_number VARCHAR(64) NOT NULL UNIQUE,
  created_by_uid VARCHAR(128) NOT NULL,
  intake_id VARCHAR(128),
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  department_suggestion VARCHAR(128),
  assigned_to_uid VARCHAR(128),
  status VARCHAR(64) NOT NULL DEFAULT 'submitted',
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to_uid);

-- Ticket events audit log
CREATE TABLE IF NOT EXISTS ticket_events (
  event_id VARCHAR(128) PRIMARY KEY,
  ticket_id VARCHAR(128) NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  actor_uid VARCHAR(128) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON ticket_events(ticket_id, timestamp ASC);

-- OTP Challenges table
CREATE TABLE IF NOT EXISTS otp_challenges (
  challenge_id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_resent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_challenges(email, created_at DESC);
`;

export async function initPostgresSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA_SQL);
  } finally {
    client.release();
  }
}
