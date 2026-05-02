-- ─────────────────────────────────────────────
-- Connected India · Analytics Schema
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  event       TEXT        NOT NULL,          -- e.g. 'village_view', 'search_query'
  session_id  TEXT,                          -- anonymous browser session
  properties  JSONB       DEFAULT '{}',      -- flexible event payload
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for the queries the dashboard will run
CREATE INDEX IF NOT EXISTS idx_ae_event       ON analytics_events (event);
CREATE INDEX IF NOT EXISTS idx_ae_created_at  ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_session     ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ae_slug        ON analytics_events ((properties->>'slug'));

-- ─── Handy views ───────────────────────────────

-- Top villages (last 7 days)
CREATE OR REPLACE VIEW top_villages_7d AS
SELECT
  properties->>'slug'          AS slug,
  properties->>'village_name'  AS village_name,
  properties->>'district_name' AS district_name,
  properties->>'state_name'    AS state_name,
  COUNT(*)                     AS views,
  COUNT(DISTINCT session_id)   AS unique_visitors
FROM analytics_events
WHERE event = 'village_view'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1,2,3,4
ORDER BY views DESC
LIMIT 20;

-- Top search queries (last 7 days)
CREATE OR REPLACE VIEW top_searches_7d AS
SELECT
  properties->>'query'               AS query,
  COUNT(*)                           AS searches,
  ROUND(AVG((properties->>'results_count')::numeric), 1) AS avg_results
FROM analytics_events
WHERE event = 'search_query'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY searches DESC
LIMIT 20;

-- Daily active sessions (last 30 days)
CREATE OR REPLACE VIEW daily_sessions AS
SELECT
  DATE(created_at)          AS day,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*)                   AS events
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- Feature usage summary
CREATE OR REPLACE VIEW feature_usage AS
SELECT
  event,
  COUNT(*)                   AS total,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM analytics_events
WHERE event IN ('surprise_me','compare_view','share_click','curated_click')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY event
ORDER BY total DESC;
