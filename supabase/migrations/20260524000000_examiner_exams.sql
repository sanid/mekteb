-- Examiner & Exam System
-- Adds the "examiner" role and tables for managing oral proficiency exams.
--
-- Flow:
--   1. Teacher marks a student as "test ready" → exam_requests row (status: pending)
--   2. Examiner sees pending requests on their dashboard
--   3. Examiner accepts & conducts oral exam → exam_sessions row
--   4. Examiner records summary + pass/fail
--   5. On pass: examiner can promote student to a higher group
--      (ends old enrollment, creates new one)
--   6. (Optional) Examiner generates a PDF diploma

-- ---------------------------------------------------------------------------
-- 1. Add 'examiner' to the app_role enum
-- ---------------------------------------------------------------------------
ALTER TYPE app.app_role ADD VALUE 'examiner' AFTER 'teacher';

-- ---------------------------------------------------------------------------
-- 2. exam_requests — a teacher nominates a student for a proficiency test
-- ---------------------------------------------------------------------------
CREATE TABLE public.exam_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id uuid NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX exam_requests_mosque_id_idx ON public.exam_requests (mosque_id);
CREATE INDEX exam_requests_student_idx ON public.exam_requests (student_profile_id);
CREATE INDEX exam_requests_group_idx ON public.exam_requests (group_id);
CREATE INDEX exam_requests_requested_by_idx ON public.exam_requests (requested_by);
CREATE INDEX exam_requests_status_idx ON public.exam_requests (mosque_id, status);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.exam_requests
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Mosque consistency check: request row, student, group, and requesting
-- teacher must all belong to the same mosque.
CREATE OR REPLACE FUNCTION app.check_exam_request_mosque()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  student_mosque uuid;
  group_mosque uuid;
  teacher_mosque uuid;
BEGIN
  SELECT mosque_id INTO student_mosque FROM public.student_profiles WHERE id = NEW.student_profile_id;
  SELECT mosque_id INTO group_mosque FROM public.groups WHERE id = NEW.group_id;
  SELECT mosque_id INTO teacher_mosque FROM public.teacher_profiles WHERE id = NEW.requested_by;
  IF student_mosque IS DISTINCT FROM NEW.mosque_id
     OR group_mosque IS DISTINCT FROM NEW.mosque_id
     OR teacher_mosque IS DISTINCT FROM NEW.mosque_id THEN
    RAISE EXCEPTION 'exam_requests: mosque_id must match student, group, and teacher mosques';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER exam_requests_mosque_check
  BEFORE INSERT OR UPDATE ON public.exam_requests
  FOR EACH ROW EXECUTE FUNCTION app.check_exam_request_mosque();

-- ---------------------------------------------------------------------------
-- 3. exam_sessions — examiner conducts and records an oral exam
-- ---------------------------------------------------------------------------
CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id uuid NOT NULL REFERENCES public.mosques(id) ON DELETE CASCADE,
  exam_request_id uuid REFERENCES public.exam_requests(id) ON DELETE SET NULL,
  student_profile_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  examiner_profile_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  from_group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  to_group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed')),
  summary text,
  exam_date date NOT NULL DEFAULT current_date,
  diploma_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX exam_sessions_mosque_id_idx ON public.exam_sessions (mosque_id);
CREATE INDEX exam_sessions_student_idx ON public.exam_sessions (student_profile_id);
CREATE INDEX exam_sessions_examiner_idx ON public.exam_sessions (examiner_profile_id);
CREATE INDEX exam_sessions_from_group_idx ON public.exam_sessions (from_group_id);
CREATE INDEX exam_sessions_status_idx ON public.exam_sessions (mosque_id, status);
CREATE INDEX exam_sessions_request_id_idx ON public.exam_sessions (exam_request_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Mosque consistency check: session row, student, examiner, and both groups
-- must all belong to the same mosque.
CREATE OR REPLACE FUNCTION app.check_exam_session_mosque()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  student_mosque uuid;
  examiner_mosque uuid;
  from_group_mosque uuid;
  to_group_mosque uuid;
BEGIN
  SELECT mosque_id INTO student_mosque FROM public.student_profiles WHERE id = NEW.student_profile_id;
  SELECT mosque_id INTO examiner_mosque FROM public.teacher_profiles WHERE id = NEW.examiner_profile_id;
  SELECT mosque_id INTO from_group_mosque FROM public.groups WHERE id = NEW.from_group_id;
  IF NEW.to_group_id IS NOT NULL THEN
    SELECT mosque_id INTO to_group_mosque FROM public.groups WHERE id = NEW.to_group_id;
  END IF;
  IF student_mosque IS DISTINCT FROM NEW.mosque_id
     OR examiner_mosque IS DISTINCT FROM NEW.mosque_id
     OR from_group_mosque IS DISTINCT FROM NEW.mosque_id
     OR (NEW.to_group_id IS NOT NULL AND to_group_mosque IS DISTINCT FROM NEW.mosque_id) THEN
    RAISE EXCEPTION 'exam_sessions: mosque_id must match student, examiner, and group mosques';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER exam_sessions_mosque_check
  BEFORE INSERT OR UPDATE ON public.exam_sessions
  FOR EACH ROW EXECUTE FUNCTION app.check_exam_session_mosque();
