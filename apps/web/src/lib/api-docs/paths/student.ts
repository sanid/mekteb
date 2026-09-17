import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };

const studentSecurity = [{ bearerAuth: [] }];

const localeParam = {
  name: "locale",
  in: "query",
  required: false,
  schema: { $ref: "#/components/schemas/Locale" },
  description: "Resolves lesson/topic titles (and bodies) through the translation catalogue; falls back to the default title.",
};

export const studentPaths: Record<string, Json> = {
  "/api/v1/student/me": {
    get: {
      tags: ["Student"],
      summary: "Own identity and groups",
      security: studentSecurity,
      responses: {
        200: {
          description: "Identity.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      studentProfileId: { type: "string", format: "uuid" },
                      fullName: { type: "string" },
                      groups: { type: "array", items: { type: "object", properties: { enrollmentId: { type: "string" }, groupId: { type: "string" }, groupName: { type: "string" } } } },
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
  },
  "/api/v1/student/groups": {
    get: {
      tags: ["Student"],
      summary: "Enrolled groups",
      security: studentSecurity,
      responses: {
        200: {
          description: "Groups.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, description: { type: "string", nullable: true }, room: { type: "string", nullable: true } } } },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/student/groups/{id}": {
    get: {
      tags: ["Student"],
      summary: "Get an enrolled group",
      description: "Group, upcoming sessions (max 5), published weekly notes (max 4), and parent-visible progress notes about this student (max 10).",
      security: studentSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Group detail.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      group: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, description: { type: "string", nullable: true }, room: { type: "string", nullable: true } } },
                      sessions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, date: { type: "string" }, start_time: { type: "string", nullable: true }, end_time: { type: "string", nullable: true }, is_cancelled: { type: "boolean" }, notes: { type: "string", nullable: true } } } },
                      weekly: { type: "array", items: { type: "object", properties: { id: { type: "string" }, week_start: { type: "string" }, body: { type: "string" } } } },
                      notes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, body: { type: "string" }, created_at: { type: "string" }, visible_to_parents: { type: "boolean" } } } },
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
  },
  "/api/v1/student/attendance": {
    get: {
      tags: ["Student"],
      summary: "Own attendance history",
      description: "Latest first (max 120 records).",
      security: studentSecurity,
      responses: {
        200: {
          description: "Attendance records.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, sessionId: { type: "string" }, sessionDate: { type: "string" }, groupId: { type: "string" }, groupName: { type: "string" } } },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/student/homework": {
    get: {
      tags: ["Student"],
      summary: "Own homework",
      description: "Group-wide and individually-targeted assignments (max 100), each with the caller's acknowledgement timestamp.",
      security: studentSecurity,
      responses: {
        200: {
          description: "Homework.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string", nullable: true }, dueDate: { type: "string", nullable: true }, groupId: { type: "string" }, groupName: { type: "string" }, acknowledgedAt: { type: "string", nullable: true } } },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/student/homework/{id}/acknowledge": {
    post: {
      tags: ["Student"],
      summary: "Acknowledge own homework",
      description: "Idempotent upsert; the first acknowledgement timestamp is kept (re-tapping does not move it).",
      security: studentSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Acknowledged.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { acknowledged: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        404: { description: "Homework not found or unpublished.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/v1/student/exams": {
    get: {
      tags: ["Student"],
      summary: "Own exam sessions",
      description: "Includes scheduling fields that decide whose turn it is to propose a date.",
      security: studentSecurity,
      responses: {
        200: {
          description: "Exam sessions.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      sessions: {
                        type: "array",
                        items: { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, summary: { type: "string", nullable: true }, exam_date: { type: "string", nullable: true }, schedule_status: { type: "string" }, proposed_date: { type: "string", nullable: true }, proposed_by: { type: "string", nullable: true }, diploma_generated_at: { type: "string", nullable: true } } },
                      },
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
  },
  "/api/v1/student/lessons": {
    get: {
      tags: ["Student · Lessons"],
      summary: "Lesson library",
      description: "Published topics with their published lessons (titles only). Requires the `lesson_library` plugin. Also open to parents/teachers via the member guard.",
      security: studentSecurity,
      parameters: [localeParam],
      responses: {
        200: {
          description: "Topics.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string", nullable: true },
                        description: { type: "string", nullable: true },
                        sortOrder: { type: "number" },
                        lessons: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, sortOrder: { type: "number" }, updatedAt: { type: "string" } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: NOTFOUND,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/student/lessons/{id}": {
    get: {
      tags: ["Student · Lessons"],
      summary: "Get a lesson with resources and audio",
      description: "Lesson body (BlockNote JSON) plus resources and audio behind 1-hour signed URLs (`signedUrlTtlSeconds: 3600`). Cache the resource list, never the URLs — refetch for fresh URLs.",
      security: studentSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }, localeParam],
      responses: {
        200: {
          description: "Lesson detail.",
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
                      title: { type: "string" },
                      body: { $ref: "#/components/schemas/BlockNoteJson" },
                      updatedAt: { type: "string", format: "date-time" },
                      topic: { type: "object", nullable: true, properties: { id: { type: "string" }, title: { type: "string" } } },
                      resources: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, mimeType: { type: "string" }, sizeBytes: { type: "number" }, signedUrl: { type: "string", nullable: true } } } },
                      audio: { type: "array", items: { type: "object", properties: { id: { type: "string" }, locale: { type: "string", nullable: true }, title: { type: "string" }, mimeType: { type: "string" }, sizeBytes: { type: "number" }, durationSeconds: { type: "number", nullable: true }, signedUrl: { type: "string", nullable: true } } } },
                      signedUrlTtlSeconds: { type: "integer", example: 3600 },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: NOTFOUND,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/student/lessons/content": {
    get: {
      tags: ["Student · Lessons"],
      summary: "All lesson content for offline cache",
      description: "Titles + bodies of every published lesson in one request. Deliberately no signed URLs — use the detail endpoint for fresh attachment/audio URLs.",
      security: studentSecurity,
      parameters: [localeParam],
      responses: {
        200: {
          description: "Lessons.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { $ref: "#/components/schemas/BlockNoteJson" }, updatedAt: { type: "string", format: "date-time" }, topic: { type: "object", nullable: true, properties: { id: { type: "string" }, title: { type: "string" } } } } },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: NOTFOUND,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/student/hifz": {
    get: {
      tags: ["Student"],
      summary: "Own hifz progress",
      description: "Per-group pages plus combined totals (juz = 20 pages of the 604-page mushaf). Requires the `quran_hifz` plugin. Read-only — progress is written by the assessing teacher.",
      security: studentSecurity,
      responses: {
        200: {
          description: "Hifz progress.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      pagesMemorized: { type: "number" },
                      pagesTotal: { type: "number", example: 604 },
                      juzMemorized: { type: "number" },
                      percentComplete: { type: "number" },
                      groups: { type: "array", items: { type: "object", properties: { groupId: { type: "string" }, groupName: { type: "string", nullable: true }, pagesMemorized: { type: "number", nullable: true }, notes: { type: "string", nullable: true }, updatedAt: { type: "string", format: "date-time" } } } },
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
  },
  "/api/v1/student/progress-notes": {
    get: {
      tags: ["Student"],
      summary: "Own progress notes",
      description: "Max 100. Requires the `lesson_library` plugin.",
      security: studentSecurity,
      responses: {
        200: {
          description: "Notes.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { notes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, body: { type: "string" }, createdAt: { type: "string", format: "date-time" }, groupName: { type: "string", nullable: true } } } } },
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
  },
  "/api/v1/student/weekly-notes": {
    get: {
      tags: ["Student"],
      summary: "Published weekly notes",
      description: "For the student's groups (max 100). Requires the `lesson_library` plugin.",
      security: studentSecurity,
      responses: {
        200: {
          description: "Weekly notes.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { notes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, body: { type: "string" }, weekStart: { type: "string" }, groupName: { type: "string", nullable: true } } } } },
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
  },
  "/api/v1/student/written-tests": {
    get: {
      tags: ["Student"],
      summary: "Own written tests",
      description: "Newest first (max 20), including each test's ownership token (also printed on the paper sheet).",
      security: studentSecurity,
      responses: {
        200: {
          description: "Written tests.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string" }, token: { type: "string" }, title: { type: "string" }, status: { type: "string" }, created_at: { type: "string", format: "date-time" }, submitted_at: { type: "string", nullable: true }, graded_at: { type: "string", nullable: true }, overall_result: { type: "string", nullable: true }, examiner_note: { type: "string", nullable: true }, exam_session_id: { type: "string", nullable: true }, exam_sessions: { type: "object", nullable: true, properties: { id: { type: "string" }, status: { type: "string" }, exam_date: { type: "string", nullable: true }, schedule_status: { type: "string" } } } } },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
  },
};
