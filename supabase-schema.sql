-- Survey Review Bot — Supabase Schema
-- Run this in SQL Editor at https://supabase.com/dashboard

-- Surveys table (mirrors QB records)
CREATE TABLE surveys (
  id BIGSERIAL PRIMARY KEY,
  qb_record_id INTEGER UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  state TEXT,
  survey_status TEXT DEFAULT 'Submitted',
  arrivy_task_id TEXT,
  drive_link TEXT,
  survey_submitted_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table (one per bot run)
CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  survey_id BIGINT REFERENCES surveys(id) ON DELETE CASCADE,
  qb_record_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  state TEXT,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  disposition TEXT NOT NULL DEFAULT 'FLAG_FOR_REVIEW', -- APPROVE / FLAG_FOR_REVIEW / REJECT
  completeness_score NUMERIC(5,2) DEFAULT 0,
  overall_confidence NUMERIC(5,2) DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  missing_categories TEXT[] DEFAULT '{}',
  quality_flags TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  drive_folder_url TEXT,
  report_html TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo results (one per photo per review)
CREATE TABLE photo_results (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT REFERENCES reviews(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  arrivy_label TEXT,
  photo_index INTEGER DEFAULT 1,
  file_size_kb NUMERIC(10,1),
  -- Vision results
  quality_score NUMERIC(4,1),
  confirmed BOOLEAN DEFAULT TRUE,
  design_ready BOOLEAN DEFAULT TRUE,
  issues TEXT[] DEFAULT '{}',
  extracted_data JSONB DEFAULT '{}',
  vision_skipped BOOLEAN DEFAULT FALSE,
  arrivy_file_id BIGINT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design team feedback
CREATE TABLE feedback (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT REFERENCES reviews(id) ON DELETE CASCADE,
  reviewer_name TEXT,
  human_disposition TEXT, -- approve / flag / reject
  confidence_rating INTEGER, -- 1-5
  ai_caught TEXT,
  human_caught TEXT,
  patterns TEXT,
  per_photo JSONB DEFAULT '{}', -- { category_key: { agree/partial/disagree, notes } }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_qb ON reviews(qb_record_id);
CREATE INDEX idx_reviews_disposition ON reviews(disposition);
CREATE INDEX idx_reviews_date ON reviews(review_date DESC);
CREATE INDEX idx_photo_results_review ON photo_results(review_id);
CREATE INDEX idx_surveys_status ON surveys(survey_status);

-- RLS policies (anon read, service_role write)
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read surveys" ON surveys FOR SELECT USING (true);
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read photos" ON photo_results FOR SELECT USING (true);
CREATE POLICY "Public read feedback" ON feedback FOR SELECT USING (true);
CREATE POLICY "Service write surveys" ON surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write photos" ON photo_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write feedback" ON feedback FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
