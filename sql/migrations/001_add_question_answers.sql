ALTER TABLE feedback_submissions
  ADD COLUMN IF NOT EXISTS question_answers JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_question_answers_gin
  ON feedback_submissions USING GIN (question_answers);
