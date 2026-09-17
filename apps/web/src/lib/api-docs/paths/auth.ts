import type { Json } from "../openapi";

const UNAUTH = { $ref: "#/components/responses/Unauthorized" };
const BAD = { $ref: "#/components/responses/BadRequest" };
const VALIDATION = { $ref: "#/components/responses/ValidationFailed" };
const RATE = { $ref: "#/components/responses/RateLimited" };

export const authPaths: Record<string, Json> = {
  "/api/v1/auth/sign-in": {
    post: {
      tags: ["Authentication"],
      summary: "Sign in with an email or mosque-qualified username",
      description:
        "Authenticates an admin, teacher, examiner or parent by email, or a student by mosque-qualified username (`al-nour.amina`). Returns a fresh session plus the caller's role, the full set of roles, mosque, plugins and profile — everything `/auth/me` would return — so a mobile client can skip the follow-up call. Anything containing `@` is treated as an email; `slug.username` resolves to the student's derived address; a bare username needs `mosqueSlug` (from the mosque subdomain). Unknown slugs deliberately produce normal invalid-credentials rather than a mosque lookup, to avoid enumeration.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                login: { type: "string", description: "Email or username. Either `login` or `email` is required." },
                email: { type: "string", description: "Deprecated alias for `login`." },
                password: { type: "string", minLength: 1 },
                mosqueSlug: { type: "string", maxLength: 64, description: "Lets a subdomain caller send a bare username." },
              },
              required: ["password"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Signed in.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ok", "data"],
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "integer" },
                      expiresAt: { type: "integer" },
                      tokenType: { type: "string", example: "bearer" },
                      mustRotatePassword: { type: "boolean" },
                      mfaRequired: { type: "boolean", description: "True when the user has a verified TOTP factor; follow up with /auth/mfa/challenge + /auth/mfa/verify." },
                      role: { $ref: "#/components/schemas/UserRole" },
                      userId: { type: "string", format: "uuid" },
                      email: { type: "string" },
                      roles: { type: "array", items: { type: "string" }, description: "Every active role, e.g. [\"teacher\",\"examiner\"]." },
                      mosqueId: { type: "string", format: "uuid", nullable: true },
                      mosqueName: { type: "string", nullable: true },
                      plugins: { type: "array", items: { type: "string" }, description: "Active plugin ids for the mosque." },
                      profile: {
                        type: "object",
                        nullable: true,
                        properties: {
                          full_name: { type: "string", nullable: true },
                          display_name: { type: "string", nullable: true },
                          phone: { type: "string", nullable: true },
                          avatar_url: { type: "string", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: VALIDATION,
        401: { description: "Invalid credentials. `code: invalid_credentials`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        403: { description: "Authenticated but has no active membership (`role: none`).", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        429: RATE,
      },
    },
  },
  "/api/v1/auth/refresh": {
    post: {
      tags: ["Authentication"],
      summary: "Exchange a refresh token for a new session",
      description: "The refresh token is the credential and travels in the body. Rate-limited to 60 requests / 60 s (global bucket).",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { refreshToken: { type: "string", minLength: 10 } },
              required: ["refreshToken"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "New session.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "integer" },
                      expiresAt: { type: "integer" },
                      tokenType: { type: "string" },
                      userId: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
        },
        400: VALIDATION,
        401: { description: "Invalid refresh token. `code: invalid_refresh_token`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        429: RATE,
      },
    },
  },
  "/api/v1/auth/sign-out": {
    post: {
      tags: ["Authentication"],
      summary: "Revoke all sessions",
      description: "Invalidates every refresh token for the user (global scope) and records a logout audit entry.",
      responses: {
        200: {
          description: "Signed out.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: { type: "object", properties: { signedOut: { type: "boolean", enum: [true] } } },
                },
              },
            },
          },
        },
        401: UNAUTH,
      },
    },
  },
  "/api/v1/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Current user, roles, mosque and plugins",
      description: "Returns the resolved landing role, the full set of roles (a user can be teacher and examiner at once), the active mosque, and the mosque's enabled plugins. Works even when `mustRotatePassword` is true so the client can show the forced-rotation screen.",
      responses: {
        200: {
          description: "Profile.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      userId: { type: "string", format: "uuid" },
                      email: { type: "string" },
                      mustRotatePassword: { type: "boolean" },
                      role: { $ref: "#/components/schemas/UserRole" },
                      roles: { type: "array", items: { type: "string" }, description: "Every active role, e.g. [\"teacher\",\"examiner\"]." },
                      mosqueId: { type: "string", format: "uuid", nullable: true },
                      mosqueName: { type: "string", nullable: true },
                      plugins: { type: "array", items: { type: "string" }, description: "Active plugin ids for the mosque." },
                      profile: {
                        type: "object",
                        nullable: true,
                        properties: {
                          full_name: { type: "string", nullable: true },
                          display_name: { type: "string", nullable: true },
                          phone: { type: "string", nullable: true },
                          avatar_url: { type: "string", nullable: true },
                        },
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
  "/api/v1/auth/change-password": {
    post: {
      tags: ["Authentication"],
      summary: "Rotate the current password",
      description: "Re-authenticates with `current_password`, updates the password via the service role, clears `must_rotate_password`, and activates the newest pending OTP. This is the endpoint a forced-rotation user is allowed to call. Rate-limited to 5 / 15 min per user.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                current_password: { type: "string", minLength: 1 },
                new_password: { type: "string", minLength: 8 },
                confirm_password: { type: "string", minLength: 1 },
              },
              required: ["current_password", "new_password", "confirm_password"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Password rotated.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      mustRotatePassword: { type: "boolean", enum: [false] },
                      role: { $ref: "#/components/schemas/UserRole" },
                    },
                  },
                },
              },
            },
          },
        },
        400: VALIDATION,
        401: { description: "Not authenticated or current password incorrect (`code: invalid_credentials`).", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        429: RATE,
      },
    },
  },
  "/api/v1/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Request a password-recovery email",
      description: "Always returns `{ sent: true }` (even for unknown addresses) to prevent email enumeration. Recovery links are generated by Supabase; `redirectTo` is honoured only when it matches the configured allowlist or the site URL. Rate-limited to 5 / 60 min per address plus 20 / IP.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
                redirectTo: { type: "string", format: "uri" },
                client: { type: "string", enum: ["web", "ios", "android"] },
                locale: { $ref: "#/components/schemas/Locale" },
              },
              required: ["email"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Recovery email sent (or deliberately faked).",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { sent: { type: "boolean", enum: [true] } } } },
              },
            },
          },
        },
        400: VALIDATION,
        429: RATE,
      },
    },
  },
  "/api/v1/auth/reset-password": {
    post: {
      tags: ["Authentication"],
      summary: "Complete a password reset with a recovery token",
      description: "Verifies the `token_hash` from the recovery deep link, sets the new password, clears `must_rotate_password`, activates the pending OTP, and returns a fresh session. Rate-limited to 10 / 60 min.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                tokenHash: { type: "string", minLength: 10 },
                type: { type: "string", enum: ["recovery", "email", "invite"], default: "recovery" },
                newPassword: { type: "string", minLength: 8 },
              },
              required: ["tokenHash", "newPassword"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Password reset and signed in.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "integer" },
                      expiresAt: { type: "integer" },
                      tokenType: { type: "string" },
                      mustRotatePassword: { type: "boolean", enum: [false] },
                      role: { $ref: "#/components/schemas/UserRole" },
                      userId: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
        },
        400: VALIDATION,
        401: { description: "Invalid or expired token. `code: invalid_token`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        429: RATE,
      },
    },
  },
  "/api/v1/auth/mfa/challenge": {
    post: {
      tags: ["Authentication"],
      summary: "Create a TOTP MFA challenge",
      description: "Creates a challenge for the user's first verified TOTP factor. Call after `sign-in` reported `mfaRequired: true`. Responds with the factor and challenge ids used by `/auth/mfa/verify`.",
      responses: {
        200: {
          description: "Challenge created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      factorId: { type: "string" },
                      challengeId: { type: "string" },
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
  "/api/v1/auth/mfa/verify": {
    post: {
      tags: ["Authentication"],
      summary: "Verify an MFA code and complete the session",
      description: "Verifies the 6-digit code against the challenge created by `/auth/mfa/challenge` and returns the completed session plus the user's role. Uses the pending sign-in token.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                factorId: { type: "string" },
                challengeId: { type: "string" },
                code: { type: "string", minLength: 6, maxLength: 6 },
              },
              required: ["factorId", "challengeId", "code"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "MFA verified.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      expiresIn: { type: "integer" },
                      expiresAt: { type: "integer" },
                      role: { $ref: "#/components/schemas/UserRole" },
                    },
                  },
                },
              },
            },
          },
        },
        400: VALIDATION,
        401: UNAUTH,
      },
    },
  },
  "/api/v1/account/profile": {
    patch: {
      tags: ["Account"],
      summary: "Update the caller's own profile",
      description: "Partial update of `fullName`, `displayName` and `phone`. Only explicitly-provided fields are changed; an empty `phone` is coerced to `null`.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                fullName: { type: "string", minLength: 1, maxLength: 120 },
                displayName: { type: "string", minLength: 1, maxLength: 120 },
                phone: { type: "string", maxLength: 40, nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Updated profile row.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      full_name: { type: "string", nullable: true },
                      display_name: { type: "string", nullable: true },
                      phone: { type: "string", nullable: true },
                      avatar_url: { type: "string", nullable: true },
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
  "/api/v1/account/gdpr-requests": {
    get: {
      tags: ["Account"],
      summary: "List the caller's own GDPR requests",
      description: "Returns the caller's export and deletion requests, newest first (max 50). RLS scopes to `auth.uid()`.",
      responses: {
        200: {
          description: "List of requests.",
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
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            type: { type: "string", enum: ["deletion", "export"] },
                            status: { type: "string", enum: ["pending", "processing", "sent", "completed", "rejected", "failed"] },
                            reason: { type: "string", nullable: true },
                            requested_at: { type: "string", format: "date-time" },
                            processed_at: { type: "string", format: "date-time", nullable: true },
                            created_at: { type: "string", format: "date-time" },
                          },
                        },
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
  "/api/v1/account/delete-request": {
    post: {
      tags: ["Account"],
      summary: "Submit an account-deletion request",
      description: "GDPR deletion request. Nothing is deleted here — the mosque admin processes it (see `/api/v1/admin/gdpr-requests/{id}/execute-deletion`). Mosque admins cannot request deletion for themselves. Rate-limited to 3 / 24 h.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { reason: { type: "string", maxLength: 2000 } },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Request created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      requested: { type: "boolean", enum: [true] },
                      requestId: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        403: { description: "Mosque admins cannot request deletion. `code: admin_forbidden`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        409: { description: "A deletion request is already pending. `code: already_pending`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        429: RATE,
      },
    },
  },
  "/api/v1/account/export": {
    post: {
      tags: ["Account"],
      summary: "Request a GDPR data export",
      description: "Builds the caller's full data export, renders it to HTML and emails it as `mekteb-export.html`. The request row is visible immediately with `status: processing`. Rate-limited to 3 / 24 h.",
      responses: {
        200: {
          description: "Export requested.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      requested: { type: "boolean", enum: [true] },
                      requestId: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        429: RATE,
      },
    },
  },
  "/api/v1/devices": {
    post: {
      tags: ["Devices"],
      summary: "Register a push-token device",
      description: "Registers or refreshes an APNs / FCM / Web push token for the caller. Idempotent on `(user_id, token)`; call on every launch.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                platform: { type: "string", enum: ["ios", "android", "web"] },
                token: { type: "string", minLength: 10, maxLength: 512 },
                bundleId: { type: "string", maxLength: 256 },
                appVersion: { type: "string", maxLength: 64 },
                deviceModel: { type: "string", maxLength: 128 },
                locale: { type: "string", maxLength: 16 },
              },
              required: ["platform", "token"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Registered.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { registered: { type: "boolean", enum: [true] } } } },
              },
            },
          },
        },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
    delete: {
      tags: ["Devices"],
      summary: "Remove a push-token device",
      description: "Deletes the device token, typically on logout.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { token: { type: "string", minLength: 10, maxLength: 512 } },
              required: ["token"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Deleted.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { ok: { type: "boolean", enum: [true] }, data: { type: "object", properties: { deleted: { type: "boolean", enum: [true] } } } },
              },
            },
          },
        },
        401: UNAUTH,
        400: VALIDATION,
      },
    },
  },
  "/api/v1/config": {
    get: {
      tags: ["Devices"],
      summary: "Realtime configuration",
      description: "Returns the Supabase project URL and anon key so the client can open a Realtime websocket directly. The one sanctioned direct-Supabase call, because a websocket cannot be proxied. The URL is rewritten for LAN devices in local dev.",
      responses: {
        200: {
          description: "Realtime config.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ok: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      supabaseUrl: { type: "string", format: "uri" },
                      supabaseAnonKey: { type: "string", description: "Public by design; RLS enforces everything." },
                    },
                  },
                },
              },
            },
          },
        },
        401: UNAUTH,
        503: { description: "Realtime not configured. `code: no_realtime`.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
};
