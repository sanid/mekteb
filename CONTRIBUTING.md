# Contributing to Mekteb

Thanks for taking an interest. Mekteb is a mosque education platform — most of
its users are children, which shapes a few of the rules below.

## Before you start

Read [`AGENTS.md`](AGENTS.md) and, for mobile work,
[`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md). They are short, and every
rule in them comes from a bug that actually happened in this repo rather than
from general best practice.

The [README](README.md#local-development) covers getting a local stack running:
`pnpm install`, `pnpm db:start`, `pnpm db:types`, `pnpm dev`. You need Docker
and the Supabase CLI — there is no hosted dev environment, and you should never
point local development at a production Supabase project.

## Ground rules

**Translations are not optional.** Every user-visible string lives in
`packages/i18n/messages/{de,en,bs,tr}.json` — all four files. German is the
default locale and the one most users actually see, so a screen is not finished
until it reads correctly in German. `pnpm check:i18n` enforces key parity and
will fail CI if you miss one.

**Row-Level Security is the security model.** Every business table carries
`mosque_id` and has RLS enabled. Never work around a policy by reaching for the
service-role key in request-path code, and never trust a `mosque_id` that came
from the client. If you need a new table, it needs `mosque_id`, audit columns,
RLS policies, and pgTAP coverage in `supabase/tests/`.

**No third-party analytics or advertising SDKs.** Crash reporting through the
existing Sentry setup only. This is a compliance constraint, not a preference.

**Never commit secrets or personal data.** `.env.local` and `.env.pull` are
ignored — keep it that way. Operator details for the Impressum come from
`NEXT_PUBLIC_OPERATOR_*` environment variables and must not be hardcoded.

## Making a change

1. Branch off `main` (`feat/…`, `fix/…`, `docs/…`).
2. Write the change, plus tests where the behaviour is testable.
3. Run the checks below.
4. Open a pull request describing what changed and how you verified it.

```bash
pnpm typecheck && pnpm lint && pnpm check:i18n && pnpm test
```

For schema changes also run `supabase test db`. For anything touching a portal
screen, actually run it — in at least two locales, and signed in as the role
that owns the screen rather than as an admin.

## Database migrations

Migrations in `supabase/migrations` are the source of truth and are append-only
— never edit one that has already been merged. Create a new one:

```bash
supabase migration new my_change
pnpm db:reset    # replay everything from scratch
pnpm db:types    # regenerate TypeScript types
```

## Commit messages

Conventional commits, scoped to the area touched:
`feat(web): …`, `fix(mobile): …`, `chore(db): …`.

## Reporting bugs and security issues

Use the issue templates for bugs and feature requests. For anything with a
security impact — auth bypass, a cross-tenant data leak, an RLS hole — please
do **not** open a public issue; use GitHub's private
[security advisory](../../security/advisories/new) form instead.

## Licence

By contributing you agree that your contributions are licensed under the
[MIT Licence](LICENSE) that covers this project.
