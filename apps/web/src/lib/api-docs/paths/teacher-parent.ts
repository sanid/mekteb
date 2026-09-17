import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const FORBIDDEN = { $ref: "#/components/responses/Forbidden" };

const teacherSecurity = [{ bearerAuth: [] }];
const parentSecurity = [{ bearerAuth: [] }];

export const teacherParentPaths: Record<string, Json> = {
  "/api/v1/teacher/announcements": {
    get: {
      tags: ["Teacher"],
      summary: "List own announcements",
      description: "The calling teacher's announcements, newest first (max 100).",
      security: teacherSecurity,
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
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, body: { type: "string" }, audience: { type: "string", enum: ["mosque", "group"] }, group_id: { type: "string", nullable: true }, is_published: { type: "boolean" }, published_at: { type: "string", nullable: true }, created_at: { type: "string", format: "date-time" } } },
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
      tags: ["Teacher"],
      summary: "Create and publish an announcement",
      security: teacherSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1 },
                body: { type: "string", minLength: 1 },
                audience: { type: "string", enum: ["mosque", "group"], default: "mosque" },
                group_id: { type: "string", format: "uuid", description: "Required when audience is `group`." },
              },
              required: ["title", "body"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { created: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/teacher/announcements/{id}": {
    put: {
      tags: ["Teacher"],
      summary: "Update an own announcement",
      description: "Scoped to the caller's own author id.",
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
                body: { type: "string", minLength: 1 },
                audience: { type: "string", enum: ["mosque", "group"], default: "mosque" },
                group_id: { type: "string", format: "uuid" },
                is_published: { type: "boolean", default: true },
              },
              required: ["title", "body"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
    delete: {
      tags: ["Teacher"],
      summary: "Delete an own announcement",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/teacher/groups": {
    get: {
      tags: ["Teacher"],
      summary: "List own groups",
      description: "Groups the calling teacher is linked to, with student/teacher counts.",
      security: teacherSecurity,
      responses: {
        200: {
          description: "Groups.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" }, description: { type: "string", nullable: true }, is_active: { type: "boolean" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" }, student_count: { type: "integer" }, teacher_count: { type: "integer" } } },
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
  "/api/v1/teacher/groups/{id}": {
    get: {
      tags: ["Teacher"],
      summary: "Get a group the teacher teaches",
      description: "Requires an active teacher-group link (403 otherwise).",
      security: teacherSecurity,
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
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                      description: { type: "string", nullable: true },
                      is_active: { type: "boolean" },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                      enrollments: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, studentProfileId: { type: "string", format: "uuid" }, studentName: { type: "string" }, enrolledAt: { type: "string" } } } },
                      teacherLinks: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, teacherProfileId: { type: "string", format: "uuid" }, teacherName: { type: "string" } } } },
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
      },
    },
  },
  "/api/v1/teacher/groups/{id}/parents": {
    post: {
      tags: ["Teacher"],
      summary: "Create a parent and link to an enrolled student",
      description: "Provisions a parent account, links them to the student, and returns the one-time password. Requires an active teacher-group link for the group and the student must be enrolled in it.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                full_name: { type: "string", minLength: 1 },
                email: { type: "string", format: "email" },
                phone: { type: "string" },
                relation: { type: "string" },
                student_profile_id: { type: "string", format: "uuid" },
              },
              required: ["full_name", "email", "student_profile_id"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      email: { type: "string" },
                      full_name: { type: "string" },
                      tempPassword: { type: "string" },
                      expires_at: { type: "string", format: "date-time" },
                      parent_profile_id: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
  },
  "/api/v1/teacher/groups/{id}/students": {
    post: {
      tags: ["Teacher"],
      summary: "Create a student and enroll them in the group",
      description: "Provisions a student account, enrolls them, and returns the one-time password.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                full_name: { type: "string", minLength: 1 },
                email: { type: "string", format: "email" },
                date_of_birth: { type: "string" },
              },
              required: ["full_name", "email"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      email: { type: "string" },
                      full_name: { type: "string" },
                      tempPassword: { type: "string" },
                      expires_at: { type: "string", format: "date-time" },
                      student_profile_id: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
  },
  "/api/v1/teacher/notes": {
    get: {
      tags: ["Teacher"],
      summary: "List own progress notes",
      security: teacherSecurity,
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
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, group_id: { type: "string" }, student_profile_id: { type: "string" }, body: { type: "string" }, visible_to_parents: { type: "boolean" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
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
      tags: ["Teacher"],
      summary: "Create a progress note",
      security: teacherSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                group_id: { type: "string", format: "uuid" },
                student_profile_id: { type: "string", format: "uuid" },
                body: { type: "string", minLength: 1 },
                visible_to_parents: { type: "boolean", default: false },
              },
              required: ["group_id", "student_profile_id", "body"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { created: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/teacher/notes/{id}": {
    put: {
      tags: ["Teacher"],
      summary: "Update an own progress note",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { body: { type: "string", minLength: 1 }, visible_to_parents: { type: "boolean", default: false } }, required: ["body"] },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
    delete: {
      tags: ["Teacher"],
      summary: "Delete an own progress note",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/teacher/students/{id}": {
    get: {
      tags: ["Teacher"],
      summary: "Get a student in a taught group",
      description: "Full student view for a teacher: groups, attendance (last 20), progress notes (last 15), homework (last 10), parent contacts, and hifz progress. 404 unless the student is enrolled in a group the teacher actively teaches.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Student detail.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      student: { type: "object", properties: { id: { type: "string", format: "uuid" }, full_name: { type: "string" }, date_of_birth: { type: "string", nullable: true }, is_active: { type: "boolean" } } },
                      groups: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, isHifz: { type: "boolean" } } } },
                      attendance: { type: "array", items: { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, sessionDate: { type: "string", nullable: true }, groupName: { type: "string", nullable: true } } } },
                      progressNotes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, body: { type: "string" }, visibleToParents: { type: "boolean" }, createdAt: { type: "string" }, groupName: { type: "string", nullable: true } } } },
                      homework: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, dueDate: { type: "string", nullable: true }, groupName: { type: "string", nullable: true } } } },
                      parents: { type: "array", items: { type: "object", properties: { name: { type: "string", nullable: true }, relation: { type: "string", nullable: true }, phone: { type: "string", nullable: true } } } },
                      hifz: { type: "array", items: { type: "object", properties: { pages: { type: "number" }, groupName: { type: "string", nullable: true } } } },
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
  "/api/v1/teacher/weekly-notes": {
    get: {
      tags: ["Teacher"],
      summary: "List own weekly notes",
      description: "Newest week first (max 52).",
      security: teacherSecurity,
      parameters: [{ name: "group_id", in: "query", required: false, schema: { type: "string", format: "uuid" } }],
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
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, group_id: { type: "string" }, week_start: { type: "string" }, body: { type: "string" }, is_published: { type: "boolean" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
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
      tags: ["Teacher"],
      summary: "Upsert a weekly note",
      description: "Upsert keyed on `(group_id, week_start)` — posting the same week replaces the row.",
      security: teacherSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                group_id: { type: "string", format: "uuid" },
                week_start: { type: "string", description: "YYYY-MM-DD." },
                body: { type: "string", minLength: 1 },
                is_published: { type: "boolean", default: false },
              },
              required: ["group_id", "week_start", "body"],
            },
          },
        },
      },
      responses: {
        200: { description: "Upserted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { upserted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
  },
  "/api/v1/parent/children": {
    get: {
      tags: ["Parent"],
      summary: "List linked children",
      security: parentSecurity,
      responses: {
        200: {
          description: "Children.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, fullName: { type: "string" }, dateOfBirth: { type: "string", nullable: true }, isActive: { type: "boolean" } } },
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
  "/api/v1/parent/children/{id}": {
    get: {
      tags: ["Parent"],
      summary: "Get a child's full dashboard",
      description: "Groups, homework (with acknowledgement state, max 50), attendance (max 60), exams (max 50), parent-visible notes (max 50) and written-test results (max 20). Requires a parent-student link (403 otherwise).",
      security: parentSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Child dashboard.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      student: { type: "object", properties: { id: { type: "string" }, fullName: { type: "string" }, dateOfBirth: { type: "string", nullable: true }, isActive: { type: "boolean" } } },
                      groups: { type: "array", items: { type: "object", properties: { enrollmentId: { type: "string" }, groupId: { type: "string" }, groupName: { type: "string" } } } },
                      homework: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string", nullable: true }, dueDate: { type: "string", nullable: true }, groupId: { type: "string" }, acknowledgedAt: { type: "string", nullable: true } } } },
                      attendance: { type: "array", items: { type: "object", properties: { sessionId: { type: "string" }, sessionDate: { type: "string" }, status: { type: "string" } } } },
                      exams: { type: "array", items: { type: "object", properties: { id: { type: "string" }, status: { type: "string" }, summary: { type: "string", nullable: true }, exam_date: { type: "string", nullable: true }, schedule_status: { type: "string", nullable: true }, proposed_date: { type: "string", nullable: true }, proposed_by: { type: "string", nullable: true } } } },
                      notes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, body: { type: "string" }, createdAt: { type: "string" }, groupId: { type: "string" } } } },
                      writtenTests: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, status: { type: "string" }, createdAt: { type: "string" }, overallResult: { type: "string", nullable: true }, examinerNote: { type: "string", nullable: true }, exam: { type: "object", nullable: true, properties: { status: { type: "string" }, examDate: { type: "string", nullable: true } } } } } },
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
      },
    },
  },
  "/api/v1/parent/homework/{id}/acknowledge": {
    post: {
      tags: ["Parent"],
      summary: "Acknowledge homework for a child",
      description: "Idempotent upsert of the child's acknowledgement.",
      security: parentSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { student_profile_id: { type: "string", format: "uuid" } }, required: ["student_profile_id"] },
          },
        },
      },
      responses: {
        200: { description: "Acknowledged.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { acknowledged: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: BAD,
      },
    },
  },
};
