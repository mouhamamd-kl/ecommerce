-- Persist side effects atomically with the order; only committed rows are dispatched.
CREATE TABLE IF NOT EXISTS order_outbox (
  id UUID PRIMARY KEY,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('email', 'realtime')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error VARCHAR(200)
);
CREATE INDEX IF NOT EXISTS idx_order_outbox_pending
  ON order_outbox (next_attempt_at, created_at) WHERE published_at IS NULL;

-- A broker redelivery after a successful SMTP send can be acknowledged without resending.
CREATE TABLE IF NOT EXISTS order_email_deliveries (
  event_id UUID PRIMARY KEY,
  order_id INTEGER NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_message_id VARCHAR(255) NOT NULL
);
