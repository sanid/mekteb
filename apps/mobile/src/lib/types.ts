/**
 * Response shapes for the `/api/v1` endpoints this app consumes.
 *
 * Hand-written against the route handlers rather than generated: the routes
 * reshape their Supabase rows (snake_case columns become camelCase fields in
 * some places and not others), so the DB types in
 * `apps/web/src/lib/supabase/types.ts` do not describe the wire format.
 *
 * Keep the field casing exactly as the route returns it — mixed casing below
 * is faithful to the API, not an oversight.
 */

export type TeacherGroup = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  student_count: number;
  teacher_count: number;
};

export type GroupEnrollment = {
  id: string;
  studentProfileId: string;
  studentName: string;
  enrolledAt: string;
};

export type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  enrollments: GroupEnrollment[];
  teacherLinks: Array<{ id: string; teacherProfileId: string; teacherName: string }>;
};

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceSession = {
  id: string;
  session_date: string;
  created_at: string;
  attendance_records: Array<{
    id: string;
    student_profile_id: string;
    status: AttendanceStatus;
  }>;
};

/**
 * One row of the student's own attendance history (`GET /student/attendance`,
 * newest first, capped at 120). `status` is constrained to the four values
 * above by a DB check constraint, so the narrow type is safe.
 */
export type StudentAttendanceRecord = {
  id: string;
  status: AttendanceStatus;
  sessionId: string;
  sessionDate: string;
  groupId: string;
  groupName: string;
};

/**
 * One row from `GET /student/exams`, which returns `{ sessions }` with the
 * raw `exam_sessions` columns — snake_case, unlike most of this file.
 *
 * `status` is proposed | scheduled | in_progress | passed | failed | cancelled
 * and `schedule_status` proposed | confirmed | counter_proposed; both stay
 * `string` here because the screen renders an unknown value rather than
 * crashing if the server adds one.
 */
export type StudentExamSession = {
  id: string;
  status: string;
  summary: string | null;
  exam_date: string | null;
  schedule_status: string | null;
  /** The date awaiting a decision — not yet `exam_date` until accepted. */
  proposed_date: string | null;
  /** Who proposed it: `examiner`, `parent` or `student`. Whose turn it is. */
  proposed_by: string | null;
  diploma_generated_at: string | null;
};

/**
 * `GET /announcements` — published rows the caller may see, newest first,
 * capped at 100. Raw columns, so snake_case. `body` is plain text (the web
 * renders it with `whitespace-pre-line`; RN `Text` keeps newlines already).
 */
export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  audience: string;
  group_id: string | null;
  published_at: string | null;
  created_at: string;
};

/**
 * What `POST /teacher/groups/[id]/students` and `.../parents` return.
 *
 * `tempPassword` is the *only* time the plain password exists anywhere — the
 * server stores a hash and issues an OTP alongside it. Losing it means an
 * admin password reset, so never discard this without showing it.
 */
export type CreatedAccount = {
  email: string;
  full_name: string;
  tempPassword: string;
  expires_at: string;
  student_profile_id?: string;
  parent_profile_id?: string;
  /** Present when the account is a student — the mosque-qualified login. */
  username?: string;
};

/** `GET /groups/[id]/homework` — the teacher's view, newest first. */
export type GroupHomework = {
  id: string;
  title: string;
  body: string | null;
  due_date: string | null;
  audience: string;
  lesson_id: string | null;
  created_at: string;
  updated_at: string;
  /** Empty for `audience: "group"`; the named students otherwise. */
  homework_targets: { student_profile_id: string }[];
};

/**
 * `GET /teacher/notes` — every note *this* teacher wrote, across all their
 * groups; there is no per-group endpoint, so callers filter on `group_id`.
 */
export type ProgressNote = {
  id: string;
  group_id: string;
  student_profile_id: string;
  body: string;
  visible_to_parents: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * `GET /exam-requests` — every request this teacher filed, across groups;
 * callers filter on `group_id`. `status` stays `string`: the server can add
 * values (the screen only acts on `pending`, like the web).
 */
export type ExamRequest = {
  id: string;
  group_id: string;
  student_profile_id: string;
  notes: string | null;
  status: string;
  created_at: string;
  student_profiles: { full_name: string | null } | null;
  groups: { name: string | null } | null;
};

/** `GET /teacher/weekly-notes?group_id=` — the teacher's own weekly summaries. */
export type WeeklyNote = {
  id: string;
  group_id: string;
  week_start: string;
  body: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

/** `GET /teacher/announcements` — the author's own rows, drafts included. */
export type OwnAnnouncement = {
  id: string;
  title: string;
  body: string | null;
  audience: string;
  group_id: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

/** `GET /student/groups` — the groups this student is enrolled in. */
export type StudentGroup = {
  id: string;
  name: string;
  description: string | null;
  room: string | null;
};

/** `GET /student/groups/[id]` — what the enrolled student may see. */
export type StudentGroupDetail = {
  group: StudentGroup;
  sessions: {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_cancelled: boolean;
    notes: string | null;
  }[];
  weekly: { id: string; week_start: string; body: string }[];
  notes: {
    id: string;
    body: string;
    created_at: string;
    visible_to_parents: boolean;
  }[];
};

/** `GET /exams` — the examiner's inbox: requests to turn into exams, then the sessions. */
export type ExaminerRequest = {
  id: string;
  notes: string | null;
  status: string;
  created_at: string;
  student_profiles: { full_name: string | null } | null;
  groups: { name: string | null } | null;
  teacher_profiles: { profiles: { full_name: string | null } | null } | null;
};

export type ExaminerSession = {
  id: string;
  status: string;
  summary: string | null;
  exam_date: string | null;
  diploma_generated_at: string | null;
  schedule_status: string | null;
  proposed_date: string | null;
  proposed_by: string | null;
  oral_required: boolean | null;
  written_required: boolean | null;
  oral_passed: boolean | null;
  written_passed: boolean | null;
  retake_of_session_id: string | null;
  from_group_id: string | null;
  to_group_id: string | null;
  student_profiles: { full_name: string | null } | null;
  groups: { name: string | null } | null;
};

export type ExaminerInbox = {
  pendingRequests: ExaminerRequest[];
  sessions: ExaminerSession[];
};

/** `GET /exams/[id]/lesson-checks` — the curriculum plus which lessons are ticked. */
export type LessonChecklist = {
  lessons: { id: string; title: string; sort_order: number }[];
  checked: string[];
};

/** `GET /written-tests/[token]` — the student's test in its three states. */
export type WrittenTestPending = {
  status: "pending";
  title: string;
  mosqueName: string;
  studentName: string;
  questions: { id: string; question_text: string; order: number }[];
};

export type WrittenTestSubmitted = {
  status: "submitted";
  title: string;
  mosqueName: string;
  studentName: string;
};

export type WrittenTestGraded = {
  status: "graded";
  title: string;
  mosqueName: string;
  studentName: string;
  overallResult: string | null;
  examinerNote: string | null;
  answers: {
    order: number;
    questionText: string;
    answerText: string | null;
    examinerComment: string | null;
  }[];
};

export type WrittenTestDetail =
  | WrittenTestPending
  | WrittenTestSubmitted
  | WrittenTestGraded;

/** `GET /student/written-tests` — the student's own tests, newest first. */
export type StudentWrittenTest = {
  id: string;
  token: string;
  title: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  graded_at: string | null;
  overall_result: string | null;
  examiner_note: string | null;
  exam_session_id: string | null;
  exam_sessions: {
    id: string;
    status: string | null;
    exam_date: string | null;
    schedule_status: string | null;
  } | null;
};

/** `GET /admin/students` — one page of the mosque's students, plus their parents. */
export type AdminStudentPage = {
  students: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    is_active: boolean;
    created_at: string;
  }[];
  parentsByStudent: Record<string, string[]>;
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
    nextOffset: number | null;
  };
};

/** `GET /admin/teachers` — the mosque's teacher profiles. */
export type AdminTeacher = {
  id: string;
  bio: string | null;
  is_active: boolean;
  profiles: { full_name: string | null; display_name: string | null } | null;
};

/** `GET /admin/groups` — groups with live counts. */
export type AdminGroup = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count: number;
  teacher_count: number;
};

export type StudentHomework = {
  id: string;
  title: string;
  body: string | null;
  dueDate: string | null;
  groupName: string | null;
  acknowledgedAt: string | null;
};

/** Blocks that actually occur in lesson content — see AGENTS.md §6. */
export type LessonBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: Array<{ type: string; text?: string }>;
};

export type LessonSummary = {
  id: string;
  title: string;
  sortOrder: number;
  updatedAt: string;
};

export type LessonTopic = {
  id: string | null;
  title: string | null;
  description: string | null;
  sortOrder: number;
  lessons: LessonSummary[];
};

export type LessonAudio = {
  id: string;
  /** `null` = base audio for every language; otherwise the locale it translates. */
  locale: string | null;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  signedUrl: string | null;
};

export type LessonDetail = {
  id: string;
  title: string;
  body: LessonBlock[] | null;
  updatedAt: string;
  topic: { id: string; title: string } | null;
  resources: Array<{
    id: string;
    title: string;
    mimeType: string | null;
    sizeBytes: number | null;
    signedUrl: string | null;
  }>;
  audio: LessonAudio[];
  /** Signed URLs expire — refetch rather than caching them (AGENTS.md §5). */
  signedUrlTtlSeconds: number;
};

/**
 * `GET /student/lessons/content` — text-only bodies for background caching.
 * No signed URLs here: the detail endpoint is what a real visit refetches.
 */
export type LessonTextContent = {
  id: string;
  title: string;
  body: LessonBlock[] | null;
  updatedAt: string;
  topic: { id: string; title: string } | null;
};

/** `GET /parent/children` — the children this parent is linked to. */
export type ParentChild = {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  isActive: boolean;
};

/**
 * `GET /parent/children/[id]` — everything the parent may see about one child.
 *
 * `notes` is already filtered server-side to `visible_to_parents`; a teacher's
 * private notes never reach this endpoint.
 */
export type ParentChildDetail = {
  student: ParentChild;
  groups: { enrollmentId: string; groupId: string; groupName: string }[];
  homework: {
    id: string;
    title: string;
    body: string | null;
    dueDate: string | null;
    groupId: string;
    acknowledgedAt: string | null;
  }[];
  attendance: { sessionId: string; sessionDate: string; status: string }[];
  /**
   * Same shape the student's own exam screen renders — one component serves
   * both. Optional because a phone can be newer than the server it talks to,
   * and an older deployment simply omits the key.
   */
  exams?: StudentExamSession[];
  notes: { id: string; body: string; createdAt: string; groupId: string }[];
  /** The child's written tests, newest first — optional for older servers. */
  writtenTests?: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    overallResult: string | null;
    examinerNote: string | null;
    exam: { status: string | null; examDate: string | null } | null;
  }[];
};

/**
 * `GET /notifications` — the inbox. `thread_id` is resolved server-side from
 * `source_message_id`, so a message notification can open its conversation.
 */
export type NotificationItem = {
  id: string;
  subject: string | null;
  body: string | null;
  channel: string;
  status: string;
  is_read: boolean;
  created_at: string;
  source_announcement_id: string | null;
  source_message_id: string | null;
  thread_id: string | null;
  /**
   * What happened, plus the values involved — rendered in the reader's locale
   * by `notification-text.ts`. Null on rows written before templates existed
   * and on announcements, which carry their own words.
   */
  template_key: string | null;
  template_params: Record<string, unknown> | null;
};

export type NotificationPage = {
  notifications: NotificationItem[];
  nextCursor: string | null;
};

/** One row of `GET /messages/threads`. */
export type MessageThreadSummary = {
  id: string;
  subject: string | null;
  updated_at: string;
  participants: {
    profile_id: string;
    last_read_at: string | null;
    name: string;
  }[];
  lastMessage: { body: string; author_profile_id: string | null } | null;
};

export type MessageThreadPage = {
  threads: MessageThreadSummary[];
  nextCursor: string | null;
};

/**
 * `GET /messages/threads/[id]` — this route returns the Supabase row
 * unreshaped, so participants arrive as the nested `message_participants`
 * relation rather than the flattened `participants` of the list route.
 */
export type MessageThreadDetail = {
  thread: {
    id: string;
    subject: string | null;
    created_at: string;
    updated_at: string;
    message_participants: {
      profile_id: string;
      last_read_at: string | null;
      profiles: { full_name: string | null; display_name: string | null } | null;
    }[];
  };
  messages: {
    id: string;
    author_profile_id: string | null;
    body: string;
    created_at: string;
  }[];
};

/** `GET /messages/contacts` — who this member is allowed to write to. */
export type MessagingContact = {
  id: string;
  name: string;
  role: string;
};

/**
 * `GET /calendar?from=&to=` — one week of the shared calendar.
 *
 * Scope is decided server-side per role (own groups for a student, their
 * children's for a parent, the mosque for an admin), so the screen renders
 * whatever it is given without knowing who is looking.
 */
export type CalendarSession = {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  startTime: string | null;
  endTime: string | null;
  isCancelled: boolean;
  notes: string | null;
  groupId: string | null;
  /** Group name, or the category's when the session covers a whole category. */
  title: string | null;
  room: string | null;
  /** Category colour; null when the group has no category. */
  color: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
};

export type CalendarHoliday = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type CalendarWeek = {
  from: string;
  to: string;
  sessions: CalendarSession[];
  events: CalendarEvent[];
  holidays: CalendarHoliday[];
};

// ── Student notes (P0 port) ──────────────────────────────────────────────────

export type StudentProgressNote = {
  id: string;
  body: string;
  createdAt: string;
  groupName: string | null;
};

export type StudentWeeklyNote = {
  id: string;
  body: string;
  weekStart: string;
  groupName: string | null;
};

// ── Teacher student detail (P0 port) ────────────────────────────────────────

export type TeacherStudentDetail = {
  student: {
    id: string;
    full_name: string;
    date_of_birth: string | null;
    is_active: boolean;
  };
  groups: { id: string; name: string; isHifz: boolean }[];
  attendance: {
    id: string;
    status: string;
    sessionDate: string | null;
    groupName: string | null;
  }[];
  progressNotes: {
    id: string;
    body: string;
    visibleToParents: boolean;
    createdAt: string;
    groupName: string | null;
  }[];
  homework: {
    id: string;
    title: string;
    dueDate: string | null;
    groupName: string | null;
  }[];
  parents: { name: string | null; relation: string | null; phone: string | null }[];
  hifz: { pages: number; groupName: string | null }[];
};

// ── Admin audit + GDPR (P0 port) ─────────────────────────────────────────────

export type AuditLogEntry = {
  id: string;
  action: string;
  actor_user_id: string | null;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type GdprRequest = {
  id: string;
  user_id: string;
  email: string;
  type: "export" | "deletion";
  status: string;
  reason: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
};

// ── Prayer times (P0 port) ───────────────────────────────────────────────────

export type PrayerTimes = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

// ── Admin-from-the-phone (P1 batch) ─────────────────────────────────────────

/** `GET /admin/enrollment-requests` — one row of the admin queue. */
export type EnrollmentRequest = {
  id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  child_name: string;
  child_birth_year: number | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type EnrollmentRequestsPage = {
  requests: EnrollmentRequest[];
  pendingCount: number;
};

/** `GET /admin/groups/[id]` — group detail with roster and teachers. */
export type AdminGroupDetail = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  enrollments: {
    id: string;
    studentProfileId: string;
    studentName: string;
    enrolledAt: string;
  }[];
  teacherLinks: {
    id: string;
    teacherProfileId: string;
    teacherName: string;
  }[];
};

/** `GET /admin/groups/[id]/candidates` — pickers for the group editor. */
export type GroupCandidates = {
  students: { id: string; full_name: string }[];
  teachers: { id: string; name: string }[];
};

/** `GET/PUT /admin/settings/prayer`. */
export type PrayerSettings = {
  prayer_location: string | null;
  prayer_method: string;
};

/** `GET /admin/settings/plugins` — registry with per-mosque state. */
export type PluginState = {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
};

// ── P2 batch (check-in, written-test authoring, report card) ───────────────

/** `GET /checkin/[token]` — a live check-in session and who may check in. */
export type CheckinSession = {
  groupName: string;
  sessionDate: string;
  students: { id: string; full_name: string; present: boolean }[];
};

/** `GET /examiner/questions` — the question bank for building a test. */
export type ExaminerQuestionBank = {
  questions: {
    id: string;
    question_text: string;
    difficulty: string;
    topic_id: string | null;
  }[];
  topics: { id: string; title: string }[];
};

/** `GET /report-card` — one student's summary, web-report math. */
export type ReportCard = {
  studentName: string;
  since: string;
  isParentView: boolean;
  groups: string[];
  attendancePresent: number;
  attendanceTotal: number;
  attendanceRate: number | null;
  hifz: { groupName: string; pages: number }[];
  examsPassed: number;
  examsFailed: number;
  lessonsCompleted: number;
  totalLessons: number;
};
