import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const FORBIDDEN = { $ref: "#/components/responses/Forbidden" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };

const examinerSecurity = [{ bearerAuth: [] }];
const teacherSecurity = [{ bearerAuth: [] }];
const memberSecurity = [{ bearerAuth: [] }];

const localeParam = { name: "locale", in: "query", required: false, schema: { $ref: "#/components/schemas/Locale" } };

export const examPaths: Record<string, Json> = {
  "/api/v1/examiner/questions": {
    get: {
      tags: ["Exams · Question bank"],
      summary: "Question bank grouped by topic",
      description: "Active questions and mosque topics for building a written test. Examiner or admin.",
      security: examinerSecurity,
      parameters: [localeParam],
      responses: {
        200: {
          description: "Questions and topics.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      questions: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, question_text: { type: "string" }, difficulty: { type: "string" }, topic_id: { type: "string", nullable: true } } } },
                      topics: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" } } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/exams": {
    get: {
      tags: ["Exams · Sessions"],
      summary: "Pending requests and recent sessions",
      description: "Examiner view: pending exam requests and the latest 50 sessions.",
      security: examinerSecurity,
      responses: {
        200: {
          description: "Requests and sessions.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      pendingRequests: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, notes: { type: "string", nullable: true }, status: { type: "string" }, created_at: { type: "string" }, student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } }, groups: { type: "object", nullable: true, properties: { name: { type: "string" } } }, teacher_profiles: { type: "object", nullable: true, properties: { profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } } } } } } },
                      sessions: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, status: { type: "string" }, summary: { type: "string", nullable: true }, exam_date: { type: "string", nullable: true }, diploma_generated_at: { type: "string", nullable: true }, schedule_status: { type: "string" }, proposed_date: { type: "string", nullable: true }, proposed_by: { type: "string", nullable: true }, oral_required: { type: "boolean" }, written_required: { type: "boolean" }, oral_passed: { type: "boolean" }, written_passed: { type: "boolean" }, retake_of_session_id: { type: "string", nullable: true }, from_group_id: { type: "string", nullable: true }, to_group_id: { type: "string", nullable: true }, student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } }, groups: { type: "object", nullable: true, properties: { name: { type: "string" } } } } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
    post: {
      tags: ["Exams · Sessions"],
      summary: "Turn a pending request into an exam session",
      description: "Without `proposed_date` the session starts `in_progress`; with one it becomes a proposal the student/parent must accept. Oral or written must be required when proposing.",
      security: examinerSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                request_id: { type: "string", format: "uuid" },
                proposed_date: { type: "string", description: "YYYY-MM-DD." },
                oral_required: { type: "boolean", default: false },
                written_required: { type: "boolean", default: false },
              },
              required: ["request_id"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Session created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      status: { type: "string" },
                      exam_date: { type: "string", nullable: true },
                      proposed_date: { type: "string", nullable: true },
                      proposed_by: { type: "string", nullable: true },
                      schedule_status: { type: "string" },
                      oral_required: { type: "boolean" },
                      written_required: { type: "boolean" },
                      student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } },
                      groups: { type: "object", nullable: true, properties: { name: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/exams/{id}": {
    get: {
      tags: ["Exams · Sessions"],
      summary: "Get an exam session",
      security: examinerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Session.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      status: { type: "string" },
                      summary: { type: "string", nullable: true },
                      exam_date: { type: "string", nullable: true },
                      diploma_generated_at: { type: "string", nullable: true },
                      from_group_id: { type: "string", nullable: true },
                      to_group_id: { type: "string", nullable: true },
                      exam_request_id: { type: "string", nullable: true },
                      schedule_status: { type: "string" },
                      proposed_date: { type: "string", nullable: true },
                      proposed_by: { type: "string", nullable: true },
                      oral_required: { type: "boolean" },
                      written_required: { type: "boolean" },
                      oral_passed: { type: "boolean" },
                      written_passed: { type: "boolean" },
                      retake_of_session_id: { type: "string", nullable: true },
                      student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } },
                      groups: { type: "object", nullable: true, properties: { name: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: NOTFOUND,
      },
    },
    patch: {
      tags: ["Exams · Sessions"],
      summary: "Update session status / summary / date",
      description: "Status transitions: `scheduled`, `in_progress`, `passed`, `failed`. `passed`/`failed` are terminal. Passing with `to_group_id` promotes the student (deactivates the old enrollment, creates the new). Only the session's examiner may update.",
      security: examinerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["scheduled", "in_progress", "passed", "failed"] },
                summary: { type: "string" },
                to_group_id: { type: "string", format: "uuid", description: "Only honored when status is `passed`." },
                exam_date: { type: "string" },
              },
              required: ["status"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Updated.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      status: { type: "string" },
                      summary: { type: "string", nullable: true },
                      exam_date: { type: "string", nullable: true },
                      student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } },
                      groups: { type: "object", nullable: true, properties: { name: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/exams/{id}/confirm": {
    post: {
      tags: ["Exams · Scheduling"],
      summary: "Confirm the proposed date",
      description: "Examiner accepts the currently proposed date and schedules the exam.",
      security: examinerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Confirmed.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/exams/{id}/schedule": {
    post: {
      tags: ["Exams · Scheduling"],
      summary: "Examiner proposes a date",
      description: "Puts a new proposed date on the table during schedule negotiation.",
      security: examinerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                proposed_date: { type: "string", description: "YYYY-MM-DD." },
                oral_required: { type: "boolean" },
                written_required: { type: "boolean" },
              },
              required: ["proposed_date"],
            },
          },
        },
      },
      responses: {
        200: { description: "Proposed.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/exams/{id}/respond": {
    post: {
      tags: ["Exams · Scheduling"],
      summary: "Student/parent response to a proposal",
      description: "`accept`, `counter` (with `counterDate`), or `cancel`. Authorization and state transitions are delegated to Postgres functions that resolve the caller to the student or a linked parent.",
      security: memberSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["accept", "counter", "cancel"] },
                counterDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Required when action is `counter`." },
              },
              required: ["action"],
            },
          },
        },
      },
      responses: {
        200: { description: "Processed.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { action: { type: "string" }, sessionId: { type: "string" } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        409: { description: "Session no longer pending. `code: exam_not_pending`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        400: VALIDATION,
      },
    },
  },
  "/api/v1/exams/{id}/retake": {
    post: {
      tags: ["Exams · Sessions"],
      summary: "Propose a retake after a failure",
      description: "Creates a new `proposed` session linked to the failed one via `retake_of_session_id`.",
      security: examinerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                proposed_date: { type: "string", description: "YYYY-MM-DD." },
                oral_required: { type: "boolean", default: false },
                written_required: { type: "boolean", default: false },
              },
              required: ["proposed_date"],
            },
          },
        },
      },
      responses: {
        201: { description: "Retake proposed.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { retake_session_id: { type: "string", nullable: true } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/exams/{id}/lesson-checks": {
    get: {
      tags: ["Exams · Sessions"],
      summary: "Curriculum checklist for a session",
      description: "Published lessons plus which are ticked off for the session.",
      security: memberSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Checklist.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      lessons: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, sort_order: { type: "integer" } } } },
                      checked: { type: "array", items: { type: "string" }, description: "lesson ids already ticked." },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: NOTFOUND,
      },
    },
    post: {
      tags: ["Exams · Sessions"],
      summary: "Tick / untick a lesson result",
      security: examinerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                lesson_id: { type: "string", format: "uuid" },
                passed: { type: "boolean", default: true, description: "false unticks." },
              },
              required: ["lesson_id"],
            },
          },
        },
      },
      responses: {
        200: { description: "Toggled.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { lesson_id: { type: "string" }, passed: { type: "boolean" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/exam-requests": {
    get: {
      tags: ["Exams · Requests"],
      summary: "List own exam requests",
      security: teacherSecurity,
      responses: {
        200: {
          description: "Requests.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, group_id: { type: "string" }, student_profile_id: { type: "string" }, notes: { type: "string", nullable: true }, status: { type: "string" }, created_at: { type: "string" }, student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } }, groups: { type: "object", nullable: true, properties: { name: { type: "string" } } } } },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
    post: {
      tags: ["Exams · Requests"],
      summary: "Request an exam for a student",
      security: teacherSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                student_profile_id: { type: "string", format: "uuid" },
                group_id: { type: "string", format: "uuid" },
                notes: { type: "string" },
              },
              required: ["student_profile_id", "group_id"],
            },
          },
        },
      },
      responses: {
        201: { description: "Requested.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string" }, group_id: { type: "string" }, student_profile_id: { type: "string" }, status: { type: "string" }, notes: { type: "string", nullable: true }, created_at: { type: "string" }, student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } }, groups: { type: "object", nullable: true, properties: { name: { type: "string" } } } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/exam-requests/{id}": {
    get: {
      tags: ["Exams · Requests"],
      summary: "Get an exam request with its session",
      description: "Readable by teachers or examiners.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Request.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      status: { type: "string" },
                      notes: { type: "string", nullable: true },
                      created_at: { type: "string" },
                      student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } },
                      groups: { type: "object", nullable: true, properties: { name: { type: "string" } } },
                      teacher_profiles: { type: "object", nullable: true, properties: { profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } } } },
                      session: { type: "object", nullable: true, properties: { id: { type: "string" }, status: { type: "string" }, summary: { type: "string", nullable: true }, exam_date: { type: "string", nullable: true }, schedule_status: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: NOTFOUND,
      },
    },
    delete: {
      tags: ["Exams · Requests"],
      summary: "Cancel an own pending request",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Cancelled.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { cancelled: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/written-tests": {
    post: {
      tags: ["Exams · Written tests"],
      summary: "Create a written test",
      description: "Creates an online written test for an exam session from the mosque's active question bank (1-100 questions) and notifies student + parents with the token.",
      security: examinerSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                exam_session_id: { type: "string", format: "uuid" },
                title: { type: "string", minLength: 1, maxLength: 200 },
                question_ids: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 100 },
              },
              required: ["exam_session_id", "title", "question_ids"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string" }, token: { type: "string" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        404: NOTFOUND,
        409: { description: "Session has no student or already has a written test.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/v1/written-tests/{token}": {
    get: {
      tags: ["Exams · Written tests"],
      summary: "Fetch a written test by token",
      description: "Requires authentication (unlike the public web page) and authorization: the test's student, its examiner, a mosque admin, or a linked parent. Response shape depends on status — `pending` returns questions, `submitted` returns confirmation, `graded` returns result and answers.",
      security: memberSecurity,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Test state.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["pending", "submitted", "graded"] },
                      title: { type: "string" },
                      mosqueName: { type: "string" },
                      studentName: { type: "string" },
                      questions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, question_text: { type: "string" }, order: { type: "integer" } } }, description: "Only when pending." },
                      overallResult: { type: "string", nullable: true },
                      examinerNote: { type: "string", nullable: true },
                      answers: { type: "array", items: { type: "object", properties: { order: { type: "integer" }, questionText: { type: "string" }, answerText: { type: "string" }, examinerComment: { type: "string", nullable: true } } }, description: "Only when graded." },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        403: FORBIDDEN,
        404: NOTFOUND,
        409: { description: "Test has no questions.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/v1/written-tests/{token}/submit": {
    post: {
      tags: ["Exams · Written tests"],
      summary: "Submit answers for a written test",
      description: "One-time submit. Allowed: the test's student, its examiner, or a mosque admin. Parents may read but not submit. Only questions actually on the test are accepted.",
      security: memberSecurity,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                answers: {
                  type: "array",
                  minItems: 1,
                  items: { type: "object", properties: { question_id: { type: "string" }, question_order: { type: "integer" }, answer_text: { type: "string" } }, required: ["question_id", "answer_text"] },
                },
              },
              required: ["answers"],
            },
          },
        },
      },
      responses: {
        200: { description: "Submitted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { submitted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        404: NOTFOUND,
        409: { description: "Already submitted.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        400: BAD,
      },
    },
  },
};
