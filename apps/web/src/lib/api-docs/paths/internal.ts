import type { Json } from "../openapi";

export const internalPaths: Record<string, Json> = {
  "/api/health": {
    get: {
      tags: ["Internal"],
      summary: "Health check",
      description:
        "Proves the instance is up and the database answers. Deliberately unauthenticated (a secret-gated health check fails exactly when diagnosing secret rotation). Note: not the standard envelope.",
      security: [],
      responses: {
        200: {
          description: "Healthy.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok"] },
                  checks: { type: "object", properties: { database: { type: "object", properties: { ok: { type: "boolean" }, rows: { type: "integer" } } } } },
                  uptime: { type: "integer", description: "Milliseconds." },
                },
              },
            },
          },
        },
        503: { description: "Degraded (DB configured but failing, or not configured).", content: { "application/json": { schema: { type: "object" } } } },
        500: { description: "Down.", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
  "/api/checkout": {
    post: {
      tags: ["Internal"],
      summary: "Create a Stripe SetupIntent for billing",
      description:
        "Get-or-create the mosque's Stripe customer and return a SetupIntent client secret so the client can collect the card (subscription is created server-side by `/api/checkout/activate` afterwards). Authenticated by cookie session; requires a mosque_admin membership. Note: not the standard envelope.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { planId: { type: "string" } }, required: ["planId"] },
          },
        },
      },
      responses: {
        200: {
          description: "Setup intent ready.",
          content: {
            "application/json": {
              schema: { type: "object", properties: { clientSecret: { type: "string" }, setupIntentId: { type: "string" } } },
            },
          },
        },
        401: { description: "Unauthorized.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
        403: { description: "No mosque admin membership.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
        400: { description: "Invalid plan.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    },
  },
  "/api/checkout/activate": {
    post: {
      tags: ["Internal"],
      summary: "Activate billing after Stripe setup",
      description:
        "Retrieves the SetupIntent, sets the saved payment method as default, and creates or switches the mosque's Stripe subscription. Authenticated by cookie session; verifies the caller is a mosque_admin of the mosque in the SetupIntent metadata. Note: not the standard envelope.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { setupIntentId: { type: "string" } }, required: ["setupIntentId"] },
          },
        },
      },
      responses: {
        200: { description: "Activated.", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean", enum: [true] }, status: { type: "string" } } } } } },
        401: { description: "Unauthorized.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
        403: { description: "Not an admin of the target mosque.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
        400: { description: "Missing/incomplete setup intent.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    },
  },
  "/api/notifications/send-emails": {
    post: {
      tags: ["Internal"],
      summary: "Cron: drain the notification email queue",
      description:
        "Processes up to 20 queued `channel=email` notifications and sends them via Resend. Runs daily at 07:00 and 19:00 (see `vercel.json`). Authenticates with `Authorization: Bearer <CRON_SECRET>`. Note: not the standard envelope.",
      security: [{ cronSecret: [] }],
      responses: {
        200: {
          description: "Processed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { processed: { type: "integer" }, failed: { type: "integer" }, total: { type: "integer" }, remaining: { type: "string", enum: ["more", "none"] } },
              },
            },
          },
        },
        401: { description: "Missing or invalid CRON_SECRET.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    },
  },
  "/api/notifications/send-push": {
    post: {
      tags: ["Internal"],
      summary: "Cron/webhook: deliver queued notifications as push",
      description:
        "Sends pending `notification_queue` rows to every registered device of each recipient via APNs (iOS) and FCM (Android), then stamps `pushed_at`.\n\n" +
        "Two callers: the `pg_net` trigger posts `{ \"notificationId\": \"<uuid>\" }` the moment a row lands, which delivers exactly that row; the cron (08:00 and 20:00, see `vercel.json`) posts an empty body and drains a batch of up to 20 rows created in the last 3 days.\n\n" +
        "Authenticates with `Authorization: Bearer <token>` where the token is either `CRON_SECRET` or `PUSH_WEBHOOK_SECRET`. Tokens that APNs/FCM report as unregistered or invalid are deleted; transient failures leave the row pending for the next tick. Note: not the standard envelope.",
      security: [{ cronSecret: [] }],
      requestBody: {
        required: false,
        description: "Omit the body for the cron batch.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { notificationId: { type: "string", format: "uuid", description: "Deliver only this queued notification." } },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Processed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  processed: { type: "integer", description: "Queue rows stamped as handled." },
                  pushed: { type: "integer", description: "Rows that reached at least one device." },
                  devices: { type: "integer", description: "Individual device deliveries that succeeded." },
                  failed: { type: "integer" },
                },
              },
            },
          },
        },
        401: { description: "Missing or invalid CRON_SECRET / PUSH_WEBHOOK_SECRET.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
        500: { description: "Queue lookup failed.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    },
  },
  "/api/reports/send-cards": {
    post: {
      tags: ["Internal"],
      summary: "Cron: email quarterly report cards",
      description:
        "Generates and emails report-card PDFs to parents of active students for every mosque with the `annual_report` plugin. Runs quarterly (Jan 1, Apr 1, Jul 1, Oct 1) at 08:00. Authenticates with `Authorization: Bearer <CRON_SECRET>`. Note: not the standard envelope.",
      security: [{ cronSecret: [] }],
      responses: {
        200: {
          description: "Processed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { mosques: { type: "integer" }, processed: { type: "integer" }, emailed: { type: "integer" }, skipped: { type: "integer" }, failed: { type: "integer" } },
              },
            },
          },
        },
        401: { description: "Missing or invalid CRON_SECRET.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    },
  },
  "/api/webhooks/stripe": {
    post: {
      tags: ["Internal"],
      summary: "Stripe webhook receiver",
      description:
        "Keeps `mosque_subscriptions` in sync with checkout, subscription lifecycle and invoice events. Authenticated by the `stripe-signature` header verified against `STRIPE_WEBHOOK_SECRET`; duplicate events are de-duplicated via `stripe_webhook_events`. Note: not the standard envelope.",
      security: [{ stripeSignature: [] }],
      responses: {
        200: { description: "Received.", content: { "application/json": { schema: { type: "object", properties: { received: { type: "boolean" }, duplicate: { type: "boolean" } } } } } },
        400: { description: "Missing or invalid signature.", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
      },
    },
  },
  "/api/docs/openapi.json": {
    get: {
      tags: ["Internal"],
      summary: "This OpenAPI document",
      description:
        "Serves the machine-readable spec that renders the reference at `/docs/api`. Unauthenticated and cacheable for an hour. Note: not the standard envelope — it is the raw OpenAPI document.",
      security: [],
      responses: {
        200: {
          description: "The OpenAPI 3.1 document.",
          content: { "application/json": { schema: { type: "object" } } },
        },
      },
    },
  },
};
