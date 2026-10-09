CREATE TABLE IF NOT EXISTS tickets (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  status        text NOT NULL,
  opened_by     text NOT NULL,
  decided_by    text,
  reject_reason text
);