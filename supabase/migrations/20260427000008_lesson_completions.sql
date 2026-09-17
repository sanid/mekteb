-- Track which lessons a student has completed.
-- One row per (student_profile_id, lesson_id) — unique.

create table public.lesson_completions (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (student_profile_id, lesson_id)
);

create index lesson_completions_student_idx
  on public.lesson_completions (student_profile_id);
create index lesson_completions_lesson_idx
  on public.lesson_completions (lesson_id);

create trigger set_updated_at
before update on public.lesson_completions
for each row execute function app.set_updated_at();

-- RLS
alter table public.lesson_completions enable row level security;

create policy lesson_completions_admin_all
  on public.lesson_completions for all
  to authenticated
  using (
    exists (
      select 1 from public.student_profiles sp
      where sp.id = lesson_completions.student_profile_id
        and sp.mosque_id in (
          select m.mosque_id from public.memberships m
          where m.user_id = auth.uid() and m.role = 'mosque_admin' and m.is_active
        )
    )
  );

create policy lesson_completions_teacher_select
  on public.lesson_completions for select
  to authenticated
  using (
    exists (
      select 1 from public.student_profiles sp
      join public.group_enrollments ge on ge.student_profile_id = sp.id and ge.is_active
      join public.teacher_group_links tgl on tgl.group_id = ge.group_id and tgl.is_active
      join public.teacher_profiles tp on tp.id = tgl.teacher_profile_id
      where sp.id = lesson_completions.student_profile_id
        and tp.profile_id = auth.uid()
    )
  );
