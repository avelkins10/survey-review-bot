-- Analysis queue table — Mac mini cron polls this
CREATE TABLE IF NOT EXISTS analysis_queue (
  id BIGSERIAL PRIMARY KEY,
  qb_record_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  state TEXT,
  arrivy_task_id TEXT,
  status TEXT DEFAULT 'pending', -- pending | running | completed | failed
  requested_by TEXT DEFAULT 'dashboard',
  error TEXT,
  review_id BIGINT REFERENCES reviews(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE analysis_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read queue" ON analysis_queue FOR SELECT USING (true);
CREATE POLICY "Service write queue" ON analysis_queue FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_queue_status ON analysis_queue(status);
