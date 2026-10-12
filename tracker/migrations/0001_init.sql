-- The publishing state document, saved with optimistic concurrency on its version.
CREATE TABLE state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- One row per usage event, keyed by its former Vercel Blob pathname.
CREATE TABLE events (
  pathname TEXT PRIMARY KEY,
  recorded_at TEXT NOT NULL,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,
  model TEXT NOT NULL,
  format TEXT NOT NULL,
  visitor TEXT,
  country TEXT NOT NULL,
  valid INTEGER NOT NULL
);
CREATE INDEX events_by_date ON events (valid, date);
CREATE INDEX events_by_visitor ON events (visitor, recorded_at);
