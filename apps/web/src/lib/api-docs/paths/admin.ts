import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };

const adminSecurity = [{ bearerAuth: [] }];

const groupRow = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    is_active: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
    student_count: { type: "integer", description: "Active enrollments." },
    teacher_count: { type: "integer" },
  },
};

const studentRow = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    full_name: { type: "string" },
    date_of_birth: { type: "string", nullable: true },
    is_active: { type: "boolean" },
    created_at: { type: "string", format: "date-time" },
  },
};

export const adminPaths: Record<string, Json> = {
  "/api/v1/admin/groups": {
    get: {
      tags: ["Admin · Groups"],
      summary: "List groups",
      description: "All groups in the caller's mosque with active-student and teacher counts.",
      security: adminSecurity,
      responses: {
        200: { description: "Groups.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "array", items: groupRow } } } } } },
        401: UNAUTH,
      },
    },
    post: {
      tags: ["Admin · Groups"],
      summary: "Create a group",
      security: adminSecurity,
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string", minLength: 1 }, description: { type: "string" } }, required: ["name"] } } } },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: groupRow } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/groups/{id}": {
    get: {
      tags: ["Admin · Groups"],
      summary: "Get a group",
      description: "One group with its active enrollments and teacher links, names resolved.",
      security: adminSecurity,
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
        404: NOTFOUND,
      },
    },
    delete: {
      tags: ["Admin · Groups"],
      summary: "Delete a group",
      description: "Permanently deletes the group row (scoped to the mosque).",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/groups/{id}/candidates": {
    get: {
      tags: ["Admin · Groups"],
      summary: "Enrollable students and assignable teachers",
      description: "Active students not yet enrolled in the group and active teachers not yet linked, for pickers.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Candidates.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      students: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, full_name: { type: "string" } } } },
                      teachers: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, name: { type: "string" } } } },
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
  "/api/v1/admin/groups/{id}/enroll": {
    post: {
      tags: ["Admin · Groups"],
      summary: "Bulk-enroll students",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { student_profile_ids: { type: "array", items: { type: "string" } } }, required: ["student_profile_ids"] } } } },
      responses: {
        200: { description: "Enrolled.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { enrolled: { type: "integer" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/groups/{id}/enroll/{eid}": {
    delete: {
      tags: ["Admin · Groups"],
      summary: "Soft-unenroll a student",
      description: "Deactivates one enrollment row.",
      security: adminSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "eid", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Unenrolled.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { unenrolled: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/admin/groups/{id}/teachers": {
    post: {
      tags: ["Admin · Groups"],
      summary: "Bulk-assign teachers",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { teacher_profile_ids: { type: "array", items: { type: "string" } } }, required: ["teacher_profile_ids"] } } } },
      responses: {
        200: { description: "Assigned.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { assigned: { type: "integer" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/groups/{id}/teachers/{lid}": {
    delete: {
      tags: ["Admin · Groups"],
      summary: "Soft-unassign a teacher",
      security: adminSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "lid", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Unassigned.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { unassigned: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/admin/students": {
    get: {
      tags: ["Admin · Students"],
      summary: "List students",
      description: "Paginated, searchable student list with a map of each student's linked parent display names.",
      security: adminSecurity,
      parameters: [
        { name: "q", in: "query", required: false, schema: { type: "string", maxLength: 200 }, description: "Case-insensitive substring filter on full name." },
        { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
        { name: "offset", in: "query", required: false, schema: { type: "integer", minimum: 0, default: 0 } },
      ],
      responses: {
        200: {
          description: "Students.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      students: { type: "array", items: studentRow },
                      parentsByStudent: { type: "object", additionalProperties: { type: "array", items: { type: "string" } }, description: "student id -> parent display names." },
                      pagination: { $ref: "#/components/schemas/PaginationOffset" },
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
    post: {
      tags: ["Admin · Students"],
      summary: "Create a student (no login)",
      security: adminSecurity,
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { full_name: { type: "string", minLength: 1 }, date_of_birth: { type: "string", nullable: true } }, required: ["full_name"] } } } },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: studentRow } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/students/with-login": {
    post: {
      tags: ["Admin · Students"],
      summary: "Create a student with a login account",
      description: "Provisions the auth user, membership, student profile, and a pending OTP. Returns the one-time temporary password.",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                full_name: { type: "string", minLength: 1 },
                date_of_birth: { type: "string", nullable: true },
              },
              required: ["email", "full_name"],
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
                  data: { $ref: "#/components/schemas/TempPassword" },
                },
              },
            },
          },
        },
        401: UNAUTH,
        400: { description: "Validation or duplicate email (`code: account_email_exists`).", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/v1/admin/students/{id}": {
    get: {
      tags: ["Admin · Students"],
      summary: "Get a student",
      description: "Profile, active enrollments, parent links, and completed lesson ids.",
      security: adminSecurity,
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
                      student: { type: "object", properties: { id: { type: "string", format: "uuid" }, full_name: { type: "string" }, date_of_birth: { type: "string", nullable: true }, is_active: { type: "boolean" }, notes: { type: "string", nullable: true }, profile_id: { type: "string", format: "uuid", nullable: true } } },
                      enrollments: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, groups: { type: "object", nullable: true, properties: { id: { type: "string", format: "uuid" }, name: { type: "string" } } } } } },
                      parentLinks: { type: "array", items: { type: "object" } },
                      completions: { type: "array", items: { type: "string" }, description: "Completed lesson ids." },
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
    put: {
      tags: ["Admin · Students"],
      summary: "Update a student",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                full_name: { type: "string", minLength: 1 },
                date_of_birth: { type: "string", nullable: true },
                is_active: { type: "boolean" },
              },
              required: ["full_name"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string", format: "uuid" }, full_name: { type: "string" }, is_active: { type: "boolean" } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
    delete: {
      tags: ["Admin · Students"],
      summary: "Delete a student",
      description: "`soft` deactivates; `hard` permanently erases the auth user and student row.",
      security: adminSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "mode", in: "query", required: false, schema: { type: "string", enum: ["soft", "hard"], default: "soft" } },
      ],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] }, mode: { type: "string" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/admin/students/{id}/link-parent": {
    post: {
      tags: ["Admin · Students"],
      summary: "Link a parent to a student",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { parent_profile_id: { type: "string", format: "uuid" } }, required: ["parent_profile_id"] } } } },
      responses: {
        200: { description: "Linked.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { linked: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/students/{id}/unlink-parent": {
    post: {
      tags: ["Admin · Students"],
      summary: "Unlink a parent by link id",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { link_id: { type: "string", format: "uuid" } }, required: ["link_id"] } } } },
      responses: {
        200: { description: "Unlinked.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { unlinked: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/students/{id}/reset-password": {
    post: {
      tags: ["Admin · Students"],
      summary: "Issue a temporary password",
      description: "Rotates a student's password to a fresh OTP and revokes any pending OTPs. Returns the one-time password.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Temporary password issued.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      tempPassword: { type: "string", description: "XXXX-XXXX-XXXX form." },
                      expires_at: { type: "string", format: "date-time" },
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
  "/api/v1/admin/students/{id}/toggle-lesson": {
    post: {
      tags: ["Admin · Students"],
      summary: "Mark a lesson complete or not",
      description: "`completed: true` upserts a lesson completion; any other value removes it.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { lesson_id: { type: "string", format: "uuid" }, completed: { type: "boolean" } }, required: ["lesson_id"] } } } },
      responses: {
        200: { description: "Toggled.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { lesson_id: { type: "string" }, completed: { type: "boolean" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/teachers": {
    get: {
      tags: ["Admin · Teachers"],
      summary: "List teachers",
      description: "All teachers in the mosque, optionally filtered by name (client-side filter).",
      security: adminSecurity,
      parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Teachers.",
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
                        id: { type: "string", format: "uuid" },
                        bio: { type: "string", nullable: true },
                        is_active: { type: "boolean" },
                        profiles: { type: "object", nullable: true, properties: { full_name: { type: "string", nullable: true }, display_name: { type: "string", nullable: true } } },
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
    post: {
      tags: ["Admin · Teachers"],
      summary: "Create a teacher with a login account",
      description: "Provisions auth user, membership, teacher profile and OTP. Returns the one-time password.",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                full_name: { type: "string", minLength: 1 },
                phone: { type: "string", nullable: true },
                bio: { type: "string", nullable: true },
              },
              required: ["email", "full_name"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { $ref: "#/components/schemas/TempPassword" } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/teachers/{id}": {
    get: {
      tags: ["Admin · Teachers"],
      summary: "Get a teacher",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Teacher detail.",
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
                      bio: { type: "string", nullable: true },
                      is_active: { type: "boolean" },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                      profiles: { type: "object", nullable: true, properties: { id: { type: "string", format: "uuid" }, full_name: { type: "string" }, display_name: { type: "string", nullable: true }, phone: { type: "string", nullable: true }, email: { type: "string" } } },
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
    put: {
      tags: ["Admin · Teachers"],
      summary: "Update a teacher",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                full_name: { type: "string", minLength: 1 },
                display_name: { type: "string", nullable: true },
                phone: { type: "string", nullable: true },
                bio: { type: "string", nullable: true },
              },
              required: ["full_name"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
    delete: {
      tags: ["Admin · Teachers"],
      summary: "Delete a teacher",
      description: "Permanently erases the linked auth user (cascade removes the teacher profile).",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/admin/parents": {
    get: {
      tags: ["Admin · Parents"],
      summary: "List parents",
      description: "All parents in the mosque with their linked children's names.",
      security: adminSecurity,
      parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Parents.",
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
                        id: { type: "string", format: "uuid" },
                        relation: { type: "string", nullable: true },
                        is_active: { type: "boolean" },
                        profiles: { type: "object", nullable: true, properties: { full_name: { type: "string", nullable: true }, display_name: { type: "string", nullable: true } } },
                        children: { type: "array", items: { type: "string" }, description: "Linked students' full names." },
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
    post: {
      tags: ["Admin · Parents"],
      summary: "Create a parent with a login account",
      description: "Provisions auth user, membership, parent profile and OTP. Returns the one-time password.",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                full_name: { type: "string", minLength: 1 },
                phone: { type: "string", nullable: true },
                relation: { type: "string", nullable: true, description: "e.g. mother / father / guardian" },
              },
              required: ["email", "full_name"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { $ref: "#/components/schemas/TempPassword" } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/parents/{id}": {
    get: {
      tags: ["Admin · Parents"],
      summary: "Get a parent",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: {
          description: "Parent detail.",
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
                      relation: { type: "string", nullable: true },
                      is_active: { type: "boolean" },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                      profiles: { type: "object", nullable: true, properties: { id: { type: "string", format: "uuid" }, full_name: { type: "string" }, display_name: { type: "string", nullable: true }, phone: { type: "string", nullable: true }, email: { type: "string" } } },
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
    put: {
      tags: ["Admin · Parents"],
      summary: "Update a parent",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                full_name: { type: "string", minLength: 1 },
                display_name: { type: "string", nullable: true },
                phone: { type: "string", nullable: true },
                relation: { type: "string", nullable: true },
              },
              required: ["full_name"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
    delete: {
      tags: ["Admin · Parents"],
      summary: "Delete a parent",
      description: "Permanently erases the linked auth user (cascade removes the parent profile).",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        404: NOTFOUND,
      },
    },
  },
};
