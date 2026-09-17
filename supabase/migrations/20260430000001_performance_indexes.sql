-- Performance indexes for hot read paths identified by query analysis.
-- All indexes are CONCURRENTLY-safe but run here inside a migration transaction;
-- production deployments should run these outside a transaction if table is large.

-- ── homework_assignments ──────────────────────────────────────────────────────
-- Admin dashboard counts published homework; teacher/parent list pages filter
-- by mosque + group + published.
create index if not exists homework_assignments_mosque_published_idx
  on public.homework_assignments (mosque_id, is_published);

-- Due-date range scans (e.g. upcoming homework widget).
create index if not exists homework_assignments_mosque_due_idx
  on public.homework_assignments (mosque_id, due_date)
  where due_date is not null;

-- ── homework_submissions ─────────────────────────────────────────────────────
-- Acknowledgement count badge: count per homework_id + mosque.
create index if not exists homework_submissions_homework_mosque_idx
  on public.homework_submissions (homework_id, mosque_id);

-- ── notification_queue ───────────────────────────────────────────────────────
-- Inbox query: all unread notifications for a recipient, newest first.
create index if not exists notification_queue_recipient_unread_idx
  on public.notification_queue (recipient_profile_id, is_read, created_at desc)
  where is_read = false;

-- ── messages ─────────────────────────────────────────────────────────────────
-- Thread detail page: messages ordered by created_at within a thread.
create index if not exists messages_thread_created_idx
  on public.messages (thread_id, created_at);

-- ── message_participants (unread count) ─────────────────────────────────────
-- Inbox unread badge: filter by profile + unread.
create index if not exists message_participants_profile_unread_idx
  on public.message_participants (profile_id, last_read_at)
  where last_read_at is null;

-- ── announcements ────────────────────────────────────────────────────────────
-- All portals list published announcements for a mosque, newest first.
create index if not exists announcements_mosque_published_created_idx
  on public.announcements (mosque_id, is_published, created_at desc);

-- ── attendance_records ───────────────────────────────────────────────────────
-- Attendance trend (last 30d): filter by mosque + created_at range.
create index if not exists attendance_records_mosque_created_idx
  on public.attendance_records (mosque_id, created_at desc);

-- Status filter for present/absent counts.
create index if not exists attendance_records_session_status_idx
  on public.attendance_records (session_id, status);

-- ── progress_notes ───────────────────────────────────────────────────────────
-- Parent portal shows only visible_to_parents notes for their child.
create index if not exists progress_notes_student_visible_idx
  on public.progress_notes (student_profile_id, visible_to_parents)
  where visible_to_parents = true;

-- ── memberships ──────────────────────────────────────────────────────────────
-- Composite (user_id, mosque_id, role) used by every auth helper call.
create index if not exists memberships_user_mosque_role_idx
  on public.memberships (user_id, mosque_id, role);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Lookup by user_id is the hottest path (called on every authenticated request).
-- auth.users.id → profiles.id is 1:1 so we only need the existing PK, but
-- must_rotate_password filter needs a partial index.
create index if not exists profiles_must_rotate_idx
  on public.profiles (id)
  where must_rotate_password = true;

-- ── groups ───────────────────────────────────────────────────────────────────
-- Active groups only (most list pages filter is_active = true).
create index if not exists groups_mosque_active_idx
  on public.groups (mosque_id, is_active);

-- ── lessons ──────────────────────────────────────────────────────────────────
-- Parent lesson library lists published lessons per topic.
create index if not exists lessons_topic_published_sort_idx
  on public.lessons (topic_id, is_published, sort_order)
  where is_published = true;
