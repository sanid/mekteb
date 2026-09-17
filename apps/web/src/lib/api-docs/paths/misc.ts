import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const FORBIDDEN = { $ref: "#/components/responses/Forbidden" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };

const memberSecurity = [{ bearerAuth: [] }];
const teacherSecurity = [{ bearerAuth: [] }];

export const miscPaths: Record<string, Json> = {
  "/api/v1/groups/{id}/attendance": {
    get: {
      tags: ["Attendance"],
      summary: "Attendance sessions for a group",
      description: "Admin or the group's teacher.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Sessions.",
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
                        session_date: { type: "string" },
                        created_at: { type: "string" },
                        attendance_records: { type: "array", items: { type: "object", properties: { id: { type: "string" }, student_profile_id: { type: "string" }, status: { type: "string", enum: ["present", "absent", "late", "excused"] } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        403: FORBIDDEN,
      },
    },
    post: {
      tags: ["Attendance"],
      summary: "Save the attendance sheet",
      description: "Upserts the session (on `group_id, session_date`) and its records (on `session_id, student_profile_id`). Admin or the group's teacher.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                session_date: { type: "string", minLength: 4 },
                records: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    properties: {
                      student_profile_id: { type: "string" },
                      status: { type: "string", enum: ["present", "absent", "late", "excused"] },
                    },
                    required: ["student_profile_id", "status"],
                  },
                },
              },
              required: ["session_date", "records"],
            },
          },
        },
      },
      responses: {
        200: { description: "Saved.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { session_id: { type: "string" } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/groups/{id}/homework": {
    get: {
      tags: ["Homework"],
      summary: "Homework for a group",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Assignments.",
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
                        title: { type: "string" },
                        body: { type: "string", nullable: true },
                        due_date: { type: "string", nullable: true },
                        audience: { type: "string", enum: ["group", "individual"] },
                        lesson_id: { type: "string", nullable: true },
                        created_at: { type: "string" },
                        updated_at: { type: "string" },
                        homework_targets: { type: "array", items: { type: "object", properties: { student_profile_id: { type: "string" } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        403: FORBIDDEN,
      },
    },
    post: {
      tags: ["Homework"],
      summary: "Create a homework assignment",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1 },
                body: { type: "string", nullable: true },
                lesson_id: { type: "string", nullable: true },
                due_date: { type: "string", nullable: true },
                audience: { type: "string", enum: ["group", "individual"], default: "group" },
                student_ids: { type: "array", items: { type: "string" }, description: "Required non-empty when audience is `individual`." },
              },
              required: ["title"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string" } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
  },
  "/api/v1/homework/{id}": {
    put: {
      tags: ["Homework"],
      summary: "Update a homework assignment",
      description: "Teacher-only (admins are not accepted here). The teacher must be linked to the assignment's group.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                group_id: { type: "string" },
                title: { type: "string", minLength: 1 },
                body: { type: "string" },
                due_date: { type: "string" },
                lesson_id: { type: "string" },
              },
              required: ["group_id", "title"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
    delete: {
      tags: ["Homework"],
      summary: "Delete a homework assignment",
      description: "Teacher-only.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { group_id: { type: "string" } }, required: ["group_id"] },
          },
        },
      },
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
  },
  "/api/v1/announcements": {
    get: {
      tags: ["Announcements"],
      summary: "Published announcements feed",
      description: "Published announcements targeting the caller's mosque and (where relevant) their groups. Max 100.",
      security: memberSecurity,
      responses: {
        200: {
          description: "Announcements.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" }, audience: { type: "string", enum: ["mosque", "group"] }, group_id: { type: "string", nullable: true }, published_at: { type: "string" }, created_at: { type: "string" } } },
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
  "/api/v1/prayer-times": {
    get: {
      tags: ["Prayer times"],
      summary: "Today's prayer times",
      description: "Resolved through the AlAdhan API from the mosque's stored location/coordinates. Degrades to `prayerTimes: null` on any upstream failure (never errors). Requires the `prayer_times` plugin.",
      security: memberSecurity,
      responses: {
        200: {
          description: "Prayer times.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      prayerTimes: { type: "object", nullable: true, properties: { fajr: { type: "string" }, sunrise: { type: "string" }, dhuhr: { type: "string" }, asr: { type: "string" }, maghrib: { type: "string" }, isha: { type: "string" } } },
                      date: { type: "string", nullable: true, description: "YYYY-MM-DD." },
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
  "/api/v1/quran/saved-ayahs": {
    get: {
      tags: ["Quran"],
      summary: "Own saved ayahs",
      description: "Personal bookmark list, keyed on the user (not the mosque). Ordered by surah then ayah.",
      security: memberSecurity,
      responses: {
        200: {
          description: "Saved ayahs.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string" }, surahNumber: { type: "integer" }, ayahNumber: { type: "integer" }, surahName: { type: "string" }, arabicText: { type: "string" }, translationText: { type: "string", nullable: true }, translationEdition: { type: "string", nullable: true }, note: { type: "string", nullable: true }, createdAt: { type: "string", format: "date-time" } } },
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
      tags: ["Quran"],
      summary: "Save an ayah bookmark",
      description: "Upsert on `(user_id, surah_number, ayah_number)`. The client sends the ayah text so the list renders offline.",
      security: memberSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                surahNumber: { type: "integer", minimum: 1, maximum: 114 },
                ayahNumber: { type: "integer", minimum: 1 },
                surahName: { type: "string", minLength: 1, maxLength: 128 },
                arabicText: { type: "string", minLength: 1 },
                translationText: { type: "string" },
                translationEdition: { type: "string", maxLength: 64 },
                note: { type: "string", maxLength: 2000 },
              },
              required: ["surahNumber", "ayahNumber", "surahName", "arabicText"],
            },
          },
        },
      },
      responses: {
        201: { description: "Saved.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string", nullable: true }, saved: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/quran/saved-ayahs/{id}": {
    delete: {
      tags: ["Quran"],
      summary: "Remove a saved ayah",
      description: "Owner-scoped; deleting someone else's row returns 404.",
      security: memberSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/report-card": {
    get: {
      tags: ["Report"],
      summary: "On-demand report card",
      description: "Attendance since the school-year start, hifz pages, passed/failed exams, and lesson completions — for the calling student or a linked parent's child (`studentId`). Requires the `annual_report` plugin.",
      security: memberSecurity,
      parameters: [{ name: "studentId", in: "query", required: false, schema: { type: "string", format: "uuid" }, description: "Target student (parent view); omit for the caller's own card." }],
      responses: {
        200: {
          description: "Report card.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      studentName: { type: "string" },
                      since: { type: "string" },
                      isParentView: { type: "boolean" },
                      groups: { type: "array", items: { type: "string" } },
                      attendancePresent: { type: "integer" },
                      attendanceTotal: { type: "integer" },
                      attendanceRate: { type: "number", nullable: true },
                      hifz: { type: "array", items: { type: "object", properties: { groupName: { type: "string" }, pages: { type: "number" } } } },
                      examsPassed: { type: "integer" },
                      examsFailed: { type: "integer" },
                      lessonsCompleted: { type: "integer" },
                      totalLessons: { type: "integer" },
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
        400: VALIDATION,
      },
    },
  },
  "/api/v1/widget": {
    get: {
      tags: ["Widget"],
      summary: "Home-screen widget payload",
      description: "Aggregated payload by role: due homework, next lesson, and hifz progress (gated on the `quran_hifz` plugin). Raw values — formatting is left to the app.",
      security: memberSecurity,
      responses: {
        200: {
          description: "Widget data.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      role: { type: "string" },
                      assignments: {
                        type: "array",
                        items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, dueDate: { type: "string", nullable: true }, studentName: { type: "string", description: "Parent view only." } } },
                      },
                      nextLesson: { type: "object", nullable: true, properties: { date: { type: "string" }, startTime: { type: "string" }, groupName: { type: "string" } } },
                      hifz: { type: "object", nullable: true, properties: { pagesMemorized: { type: "number" }, pagesTotal: { type: "number" } } },
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
};
