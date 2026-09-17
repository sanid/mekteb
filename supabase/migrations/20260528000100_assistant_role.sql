-- Add 'assistant' to the app_role enum. Assistants behave like teachers —
-- the role exists only so mosque admins can distinguish helpers from full
-- teachers in the UI. No new permissions or RLS policies needed.
ALTER TYPE app.app_role ADD VALUE IF NOT EXISTS 'assistant' AFTER 'teacher';
