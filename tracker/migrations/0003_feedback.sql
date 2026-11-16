-- MDLxL "Report a problem" inbox. ip_hash is a one-day keyed hash and is cleared once its day has passed.
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  received_at TEXT NOT NULL,
  day TEXT NOT NULL,
  pc TEXT NOT NULL,
  ip_hash TEXT,
  version TEXT NOT NULL,
  os TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX feedback_day ON feedback (day);
CREATE INDEX feedback_day_pc ON feedback (day, pc);
CREATE INDEX feedback_day_ip ON feedback (day, ip_hash);
CREATE INDEX feedback_unreviewed ON feedback (reviewed, id);
CREATE TABLE feedback_settings (id INTEGER PRIMARY KEY CHECK (id = 1), open INTEGER NOT NULL);
INSERT INTO feedback_settings (id, open) VALUES (1, 1);
-- Private message rules (see lib/feedback-filter.js). Filled from a file kept outside Git, never by a migration.
CREATE TABLE feedback_terms (term TEXT PRIMARY KEY);
