import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const NOTFOUND = { $ref: "#/components/responses/NotFound" };
const FORBIDDEN = { $ref: "#/components/responses/Forbidden" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };

const memberSecurity = [{ bearerAuth: [] }];
const teacherSecurity = [{ bearerAuth: [] }];

export const messagingPaths: Record<string, Json> = {
  "/api/v1/messages/contacts": {
    get: {
      tags: ["Messaging"],
      summary: "People the caller can message",
      description: "Full contact list for the recipient picker, derived from the same security-definer RPC the write path uses.",
      security: memberSecurity,
      responses: {
        200: {
          description: "Contacts.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, role: { type: "string" } } } },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/messages/find-or-create": {
    post: {
      tags: ["Messaging"],
      summary: "Find or create a 1:1 thread",
      description: "Idempotent: returns the existing 1:1 thread with the recipient, or creates one. Cannot chat with yourself; the recipient must be in the caller's contact list.",
      security: memberSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { recipient_id: { type: "string" } }, required: ["recipient_id"] },
          },
        },
      },
      responses: {
        200: { description: "Existing thread.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { threadId: { type: "string" } } } } } } } },
        201: { description: "New thread created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { threadId: { type: "string" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        403: FORBIDDEN,
      },
    },
  },
  "/api/v1/messages/threads": {
    get: {
      tags: ["Messaging"],
      summary: "List own threads",
      description: "Newest first with participant names and the last message per thread. Keyset pagination on `updated_at`.",
      security: memberSecurity,
      parameters: [
        { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        { name: "before", in: "query", required: false, schema: { type: "string", format: "date-time" }, description: "Return threads updated strictly before this timestamp." },
      ],
      responses: {
        200: {
          description: "Threads.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      threads: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            subject: { type: "string", nullable: true },
                            updated_at: { type: "string", format: "date-time" },
                            participants: { type: "array", items: { type: "object", properties: { profile_id: { type: "string", nullable: true }, last_read_at: { type: "string", nullable: true }, name: { type: "string" } } } },
                            lastMessage: { type: "object", nullable: true, properties: { body: { type: "string" }, author_profile_id: { type: "string", nullable: true } } },
                          },
                        },
                      },
                      nextCursor: { type: "string", nullable: true },
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
      tags: ["Messaging"],
      summary: "Create a thread with a first message",
      security: memberSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                subject: { type: "string", nullable: true },
                body: { type: "string", minLength: 1 },
                recipient_ids: { type: "array", items: { type: "string" }, minItems: 1 },
              },
              required: ["body", "recipient_ids"],
            },
          },
        },
      },
      responses: {
        201: { description: "Thread created.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { threadId: { type: "string" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/messages/threads/{id}": {
    get: {
      tags: ["Messaging"],
      summary: "Get a thread with all messages",
      description: "Participants with names and messages oldest-first. Caller must be a participant (403 otherwise).",
      security: memberSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Thread.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      thread: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          subject: { type: "string", nullable: true },
                          created_at: { type: "string", format: "date-time" },
                          updated_at: { type: "string", format: "date-time" },
                          message_participants: { type: "array", items: { type: "object", properties: { profile_id: { type: "string", nullable: true }, last_read_at: { type: "string", nullable: true }, profiles: { type: "object", nullable: true, properties: { full_name: { type: "string", nullable: true }, display_name: { type: "string", nullable: true } } } } } },
                        },
                      },
                      messages: { type: "array", items: { type: "object", properties: { id: { type: "string" }, author_profile_id: { type: "string", nullable: true }, body: { type: "string" }, created_at: { type: "string", format: "date-time" } } } },
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
    post: {
      tags: ["Messaging"],
      summary: "Send a message",
      security: memberSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { body: { type: "string", minLength: 1 } }, required: ["body"] },
          },
        },
      },
      responses: {
        200: { description: "Sent.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { sent: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        403: FORBIDDEN,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/messages/threads/{id}/read": {
    put: {
      tags: ["Messaging"],
      summary: "Mark a thread as read",
      description: "Sets the caller's `last_read_at` to now for this thread.",
      security: memberSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Marked read.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { marked_read: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "List own notifications",
      description: "Newest first with keyset paging on `created_at`. `thread_id` is flattened from the source message for tap-through.",
      security: memberSecurity,
      parameters: [
        { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
        { name: "before", in: "query", required: false, schema: { type: "string", format: "date-time" } },
        { name: "unreadOnly", in: "query", required: false, schema: { type: "string", enum: ["true", "false"] } },
      ],
      responses: {
        200: {
          description: "Notifications.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      notifications: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            subject: { type: "string", nullable: true },
                            body: { type: "string", nullable: true },
                            channel: { type: "string" },
                            status: { type: "string" },
                            is_read: { type: "boolean" },
                            created_at: { type: "string", format: "date-time" },
                            source_announcement_id: { type: "string", nullable: true },
                            source_message_id: { type: "string", nullable: true },
                            template_key: { type: "string", nullable: true },
                            template_params: { type: "object", nullable: true },
                            thread_id: { type: "string", nullable: true },
                          },
                        },
                      },
                      nextCursor: { type: "string", nullable: true },
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
    put: {
      tags: ["Notifications"],
      summary: "Mark all notifications read",
      security: memberSecurity,
      responses: {
        200: { description: "Marked read.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { marked_all_read: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/calendar": {
    get: {
      tags: ["Calendar"],
      summary: "Week calendar",
      description: "Sessions, events and school holidays for a date range. `scope=mine` shows the caller's own groups/children; `scope=mosque` (or anything else) shows everything. Requires the `calendar` plugin. Range limited to 62 days.",
      security: memberSecurity,
      parameters: [
        { name: "from", in: "query", required: false, schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, description: "Defaults to Monday of the current week." },
        { name: "to", in: "query", required: false, schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, description: "Defaults to from + 6 days." },
        { name: "scope", in: "query", required: false, schema: { type: "string", enum: ["mine", "mosque"] }, description: "`mosque` shows everything to every role." },
      ],
      responses: {
        200: {
          description: "Calendar week.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      from: { type: "string" },
                      to: { type: "string" },
                      sessions: { type: "array", items: { type: "object", properties: { id: { type: "string" }, date: { type: "string" }, startTime: { type: "string", nullable: true }, endTime: { type: "string", nullable: true }, isCancelled: { type: "boolean" }, notes: { type: "string", nullable: true }, groupId: { type: "string", nullable: true }, title: { type: "string", nullable: true }, room: { type: "string", nullable: true }, color: { type: "string", nullable: true } } } },
                      events: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string", nullable: true }, date: { type: "string" }, startTime: { type: "string", nullable: true }, endTime: { type: "string", nullable: true } } } },
                      holidays: { type: "array", items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" } } } },
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
  "/api/v1/calendar/sessions/{id}": {
    patch: {
      tags: ["Calendar"],
      summary: "Cancel or restore a lesson session",
      description: "Teacher-only: the teacher must be linked to the session's group. Cancellation notifications are fanned out by a DB trigger.",
      security: teacherSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                is_cancelled: { type: "boolean" },
                notes: { type: "string", maxLength: 500, nullable: true, description: "Only applied when cancelling." },
              },
              required: ["is_cancelled"],
            },
          },
        },
      },
      responses: {
        200: { description: "Updated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { ok: { type: "boolean", enum: [true] } } } } } } } },
        401: UNAUTH,
        400: BAD,
        404: NOTFOUND,
      },
    },
  },
  "/api/v1/checkin/{token}": {
    get: {
      tags: ["Check-in"],
      summary: "Resolve a check-in code",
      description: "What a signed-in student/parent sees when opening a check-in QR: the session summary and eligible students' presence. Codes expire 12 hours after opening, require the `student_checkin` plugin, and the caller must be enrolled in the session's group.",
      security: memberSecurity,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Session state.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      groupName: { type: "string" },
                      sessionDate: { type: "string" },
                      students: { type: "array", items: { type: "object", properties: { id: { type: "string" }, full_name: { type: "string" }, present: { type: "boolean" } } } },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        404: { description: "Code invalid/expired/plugin-off, or caller not enrolled.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
    post: {
      tags: ["Check-in"],
      summary: "Check in a student",
      description: "Marks an eligible student present (upsert). Teacher-set statuses (non-absent) are never overwritten.",
      security: memberSecurity,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { studentId: { type: "string", format: "uuid" } }, required: ["studentId"] },
          },
        },
      },
      responses: {
        200: { description: "Checked in.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { alreadyPresent: { type: "boolean" } } } } } } } },
        401: UNAUTH,
        400: VALIDATION,
        403: { description: "Not allowed to check in this student.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        404: { description: "Code invalid/expired/plugin-off, or caller not enrolled.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
};
