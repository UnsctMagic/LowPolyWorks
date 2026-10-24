-- Usage days follow Amsterdam time instead of UTC. Tracking began 2026-10-05, inside summer time (UTC+2);
-- winter time (UTC+1) started 2026-10-25 01:00 UTC. Recomputing from recorded_at is idempotent.
UPDATE events SET date = date(recorded_at, CASE WHEN recorded_at < '2026-10-25T01:00:00Z' THEN '+2 hours' ELSE '+1 hours' END)
WHERE recorded_at < '2027-03-28T01:00:00Z';
