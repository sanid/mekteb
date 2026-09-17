import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };

const adminSecurity = [{ bearerAuth: [] }];

export const adminMorePaths: Record<string, Json> = {
  "/api/v1/admin/lessons": {
    get: {
      tags: ["Admin · Lessons"],
      summary: "List lessons",
      description: "All lessons for the mosque. Open to admins and (fallback) teachers.",
      security: adminSecurity,
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
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, topic_id: { type: "string", format: "uuid", nullable: true }, sort_order: { type: "integer" } } },
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
      tags: ["Admin · Lessons"],
      summary: "Create a lesson",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1 },
                body: { $ref: "#/components/schemas/BlockNoteJson" },
                topic_id: { type: "string", format: "uuid", nullable: true },
              },
              required: ["title"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string", format: "uuid" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/lessons/{id}": {
    get: {
      tags: ["Admin · Lessons"],
      summary: "Get a lesson with resources",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
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
                      id: { type: "string", format: "uuid" },
                      title: { type: "string" },
                      body: { $ref: "#/components/schemas/BlockNoteJson" },
                      topic_id: { type: "string", format: "uuid", nullable: true },
                      sort_order: { type: "integer" },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                      resources: {
                        type: "array",
                        items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, storage_path: { type: "string" }, mime_type: { type: "string", nullable: true }, size_bytes: { type: "integer" }, created_at: { type: "string", format: "date-time" } } },
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
      },
    },
    put: {
      tags: ["Admin · Lessons"],
      summary: "Update a lesson",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1 },
                body: { $ref: "#/components/schemas/BlockNoteJson" },
                topic_id: { type: "string", format: "uuid", nullable: true },
              },
              required: ["title"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
    delete: {
      tags: ["Admin · Lessons"],
      summary: "Delete a lesson",
      description: "Removes the lesson, its resource files from storage, and related rows.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/admin/lessons/{id}/resources": {
    post: {
      tags: ["Admin · Lessons"],
      summary: "Upload a lesson resource",
      description: "Multipart upload to the `lesson-resources` bucket. Allowed MIME types: PDF, Office documents, images (png/jpeg/webp/gif), plain text/markdown/csv, audio (mpeg/mp4/m4a/wav/ogg), video (mp4/webm/quicktime), ZIP. SVG and HTML are rejected.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                file: { type: "string", format: "binary" },
              },
              required: ["title", "file"],
            },
          },
        },
      },
      responses: {
        201: { description: "Uploaded.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string", format: "uuid" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/lessons/{id}/resources/{rid}": {
    delete: {
      tags: ["Admin · Lessons"],
      summary: "Delete a lesson resource",
      security: adminSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "rid", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/topics": {
    get: {
      tags: ["Admin · Topics"],
      summary: "List topics",
      security: adminSecurity,
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
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, description: { type: "string", nullable: true }, sort_order: { type: "integer" }, created_at: { type: "string", format: "date-time" } } },
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
      tags: ["Admin · Topics"],
      summary: "Create a topic",
      security: adminSecurity,
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { title: { type: "string", minLength: 1 }, description: { type: "string" } }, required: ["title"] } } } },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string", format: "uuid" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/topics/{id}": {
    put: {
      tags: ["Admin · Topics"],
      summary: "Update a topic and its translations",
      description: "`translations` keys are locales (de/en/bs/tr); a `null` value deletes that locale's translation.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1 },
                description: { type: "string", nullable: true },
                translations: {
                  type: "object",
                  additionalProperties: {
                    anyOf: [
                      { type: "null" },
                      { type: "object", properties: { title: { type: "string", minLength: 1 }, description: { type: "string", nullable: true } }, required: ["title"] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        404: NOTFOUND,
      },
    },
    delete: {
      tags: ["Admin · Topics"],
      summary: "Delete a topic",
      description: "Deletes the topic row. Child lessons are not cascaded or blocked.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/admin/topics/reorder": {
    put: {
      tags: ["Admin · Topics"],
      summary: "Reorder topics",
      security: adminSecurity,
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { itemIds: { type: "array", items: { type: "string" } } }, required: ["itemIds"] } } } },
      responses: {
        200: { description: "Reordered.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/settings/branding": {
    put: {
      tags: ["Admin · Settings"],
      summary: "Save brand colors",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                primary_color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$", nullable: true },
                secondary_color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Saved.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/settings/info": {
    put: {
      tags: ["Admin · Settings"],
      summary: "Update mosque info",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1 },
                timezone: { type: "string" },
                locale: { $ref: "#/components/schemas/Locale" },
              },
              required: ["name"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/settings/logo": {
    post: {
      tags: ["Admin · Settings"],
      summary: "Upload the mosque logo",
      description: "Multipart upload to the `mosque-logos` bucket (replaces existing). PNG/JPEG/WebP only, max 2 MB. SVG rejected (stored-XSS).",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: { type: "object", properties: { logo: { type: "string", format: "binary" } }, required: ["logo"] },
          },
        },
      },
      responses: {
        200: { description: "Uploaded.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { logo_url: { type: "string" } } } } } } } },
        401: UNAUTH,
        400: BAD,
      },
    },
  },
  "/api/v1/admin/settings/plugins": {
    get: {
      tags: ["Admin · Settings"],
      summary: "List plugins with mosque state",
      security: adminSecurity,
      responses: {
        200: {
          description: "Plugins.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      plugins: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, description: { type: "string", nullable: true }, category: { type: "string", nullable: true }, is_active: { type: "boolean" } } } },
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
    put: {
      tags: ["Admin · Settings"],
      summary: "Toggle a plugin",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { plugin_id: { type: "string", minLength: 1 }, is_active: { type: "boolean" } },
              required: ["plugin_id", "is_active"],
            },
          },
        },
      },
      responses: {
        200: { description: "Toggled.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { plugin_id: { type: "string" }, is_active: { type: "boolean" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/settings/prayer": {
    get: {
      tags: ["Admin · Settings"],
      summary: "Get prayer settings",
      security: adminSecurity,
      responses: {
        200: {
          description: "Prayer settings.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: { type: "object", properties: { prayer_location: { type: "string", nullable: true }, prayer_method: { type: "string", nullable: true } } },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
    put: {
      tags: ["Admin · Settings"],
      summary: "Update prayer settings",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                prayer_location: { type: "string", minLength: 1 },
                prayer_method: { type: "string", enum: ["MWL", "ISNA", "Egypt", "Makkah", "Karachi", "Tehran", "Jafari"], default: "MWL" },
              },
              required: ["prayer_location"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { prayer_location: { type: "string" }, prayer_method: { type: "string" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/announcements": {
    get: {
      tags: ["Admin · Announcements"],
      summary: "List announcements",
      security: adminSecurity,
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
                    items: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, body: { type: "string" }, audience: { type: "string", enum: ["mosque", "group"] }, group_id: { type: "string", format: "uuid", nullable: true }, is_published: { type: "boolean" }, published_at: { type: "string", nullable: true }, created_at: { type: "string", format: "date-time" } } },
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
      tags: ["Admin · Announcements"],
      summary: "Create an announcement",
      security: adminSecurity,
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
                publish: { type: "boolean", default: false },
              },
              required: ["title", "body"],
            },
          },
        },
      },
      responses: {
        201: { description: "Created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { id: { type: "string", format: "uuid" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/admin/announcements/{id}": {
    delete: {
      tags: ["Admin · Announcements"],
      summary: "Delete an announcement",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/admin/announcements/{id}/publish": {
    put: {
      tags: ["Admin · Announcements"],
      summary: "Publish an announcement",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Published.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { nullable: true } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/admin/audit": {
    get: {
      tags: ["Admin · Security"],
      summary: "List audit logs",
      description: "Paginated (50/page) audit log for the mosque with actor-name resolution.",
      security: adminSecurity,
      parameters: [
        { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "action", in: "query", required: false, schema: { type: "string" }, description: "Case-insensitive substring filter." },
      ],
      responses: {
        200: {
          description: "Audit log.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      logs: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, action: { type: "string" }, actor_user_id: { type: "string", nullable: true }, target_table: { type: "string", nullable: true }, target_id: { type: "string", nullable: true }, metadata: { type: "object", nullable: true }, created_at: { type: "string", format: "date-time" } } } },
                      page: { type: "integer" },
                      totalPages: { type: "integer" },
                      total: { type: "integer" },
                      actors: { type: "object", additionalProperties: { type: "string" }, description: "actor_user_id -> display name." },
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
  "/api/v1/admin/enrollment-requests": {
    get: {
      tags: ["Admin · Enrollment"],
      summary: "List enrollment-request queue",
      security: adminSecurity,
      parameters: [
        { name: "status", in: "query", required: false, schema: { type: "string", enum: ["pending", "approved", "rejected"] } },
        { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
      ],
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
                    type: "object",
                    properties: {
                      requests: {
                        type: "array",
                        items: { type: "object", properties: { id: { type: "string", format: "uuid" }, parent_name: { type: "string" }, parent_email: { type: "string" }, parent_phone: { type: "string", nullable: true }, child_name: { type: "string" }, child_birth_year: { type: "string", nullable: true }, message: { type: "string", nullable: true }, status: { type: "string" }, created_at: { type: "string", format: "date-time" } } },
                      },
                      pendingCount: { type: "integer" },
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
  "/api/v1/admin/enrollment-requests/{id}": {
    post: {
      tags: ["Admin · Enrollment"],
      summary: "Approve, reject or delete an enrollment request",
      description: "Approving sets the status only — no account is provisioned from an approved request.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { action: { type: "string", enum: ["approve", "reject", "delete"] } }, required: ["action"] },
          },
        },
      },
      responses: {
        200: { description: "Processed.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { status: { type: "string" }, deleted: { type: "boolean" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/admin/exams": {
    get: {
      tags: ["Admin · Exams"],
      summary: "List exam sessions and pending requests",
      security: adminSecurity,
      parameters: [
        { name: "status", in: "query", required: false, schema: { type: "string" }, description: "Exact match on session status." },
        { name: "group", in: "query", required: false, schema: { type: "string", format: "uuid" }, description: "Exact match on from_group_id." },
      ],
      responses: {
        200: {
          description: "Sessions and requests.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      sessions: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, status: { type: "string" }, summary: { type: "string", nullable: true }, exam_date: { type: "string", nullable: true }, diploma_generated_at: { type: "string", nullable: true }, exam_request_id: { type: "string", nullable: true }, examiner_profile_id: { type: "string", nullable: true }, student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } }, groups: { type: "object", nullable: true, properties: { id: { type: "string" }, name: { type: "string" } } }, teacher_profiles: { type: "object", nullable: true, properties: { profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } } } } } } },
                      pendingRequests: { type: "array", items: { type: "object", properties: { id: { type: "string", format: "uuid" }, notes: { type: "string", nullable: true }, created_at: { type: "string", format: "date-time" }, student_profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } }, groups: { type: "object", nullable: true, properties: { name: { type: "string" } } }, teacher_profiles: { type: "object", nullable: true, properties: { profiles: { type: "object", nullable: true, properties: { full_name: { type: "string" } } } } } } } },
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
  "/api/v1/admin/gdpr-requests": {
    get: {
      tags: ["Admin · GDPR"],
      summary: "List mosque GDPR requests",
      security: adminSecurity,
      parameters: [
        { name: "status", in: "query", required: false, schema: { type: "string", enum: ["pending", "processing", "sent", "completed", "rejected", "failed"] } },
        { name: "type", in: "query", required: false, schema: { type: "string", enum: ["export", "deletion"] } },
        { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200, default: 100 } },
      ],
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
                    type: "object",
                    properties: {
                      requests: {
                        type: "array",
                        items: { type: "object", properties: { id: { type: "string", format: "uuid" }, user_id: { type: "string", nullable: true }, email: { type: "string", nullable: true }, type: { type: "string" }, status: { type: "string" }, reason: { type: "string", nullable: true }, requested_at: { type: "string" }, processed_at: { type: "string", nullable: true }, processed_by: { type: "string", nullable: true } } },
                      },
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
  "/api/v1/admin/gdpr-requests/{id}": {
    patch: {
      tags: ["Admin · GDPR"],
      summary: "Mark a GDPR request completed or rejected",
      description: "Status-only update; does not itself delete data (see execute-deletion).",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { status: { type: "string", enum: ["completed", "rejected"] }, note: { type: "string", maxLength: 2000 } }, required: ["status"] },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { updated: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/admin/gdpr-requests/{id}/execute-deletion": {
    post: {
      tags: ["Admin · GDPR"],
      summary: "Execute a deletion request",
      description: "Scrubs residual PII, hard-deletes the auth user (cascading), and writes a PII-free tombstone + audit row. Cannot delete your own account.",
      security: adminSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        200: { description: "Deleted.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: { description: "Cannot delete your own account.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        404: NOTFOUND,
        409: { description: "Not a deletion request or already completed. Codes: `wrong_type`, `already_done`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/v1/admin/people": {
    post: {
      tags: ["Admin · People"],
      summary: "Create a teacher, parent or student account",
      description: "One-shot account provisioning for any role. Teachers/parents need `email`; students need `username` (used to derive their login email). Enforces the plan's student limit. Returns the one-time temporary password.",
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["teacher", "parent", "student"] },
                full_name: { type: "string", minLength: 1 },
                email: { type: "string", format: "email", description: "Required for teacher/parent." },
                username: { type: "string", pattern: "^[a-zA-Z0-9_-]+$", description: "Required for student; mosque-qualified as slug.username." },
                phone: { type: "string" },
                bio: { type: "string", description: "Teacher only." },
                relation: { type: "string", description: "Parent only." },
                date_of_birth: { type: "string", description: "Student only." },
              },
              required: ["role", "full_name"],
            },
          },
        },
      },
      responses: {
        200: {
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
                      username: { type: "string", description: "Student only: the mosque-qualified login id." },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        400: VALIDATION,
        404: { description: "Mosque not found (student path). `code: mosque_not_found`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
};
