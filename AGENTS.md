<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Context

This repo backs the Yellow Ducky Corp Next.js frontend intended for deployment
to Vercel at `yellowduckycorp.com`. It talks to the Go Cloud Run backend in
`../../Backend/YDuckBack`.

## Repository Shape

Prefer this shape unless the app design changes:

- `app/page.tsx` is the sign-in screen for enhanced guest and admin sessions.
- `app/home/page.tsx` is the authenticated home page.
- `app/players/page.tsx` lists player records.
- `app/admin/users/new/page.tsx` creates players through `POST /api/players`.
- `app/admin/matches/new/page.tsx` creates matches through `POST /api/matches`.
- `app/components/AppShell.tsx` owns authenticated navigation, session refresh,
  and sign-out UI.
- `app/components/DataViews.tsx` owns player and match views/forms.
- `app/lib/yduck-client.ts` owns API base URL resolution, credentialed fetches,
  session storage, and short-lived data caching.
- `app/lib/generated-api.ts` is generated from the backend OpenAPI file; do not
  hand-edit it.
- `scripts/generate-api-types.mjs` reads
  `../../Backend/YDuckBack/docs/swagger.yaml` by default.

## Backend API Contract

- Use `NEXT_PUBLIC_API_BASE_URL` for the backend URL. Local development defaults
  to `http://localhost:8080`.
- All backend calls must use `credentials: "include"` so the signed session
  cookie reaches Cloud Run.
- Regenerate API types with `npm run generate:api` after backend Swagger schema
  changes.
- Keep frontend route names and labels aligned with backend resources: backend
  "players" are currently surfaced as admin "users" in the UI.

## Workflow

- Treat `main` as the production branch.
- Do not deploy to Vercel unless explicitly asked.
- Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` before committing
  deployable code changes.
- Prefer small, focused commits with a clear purpose.
- Preserve the existing GitHub remote and repo history unless the user explicitly asks to change them.

## Commit Messages

Write commit messages for future readers who may not remember the work.

- Use a specific subject line that summarizes the change.
- Include a body that explains the intent, scope, and verification.
- Mention important constraints or follow-up context when relevant.
- Avoid one-sentence commits for meaningful project changes.

## Git Identity

Use the repo-local no-reply Git identity for commits:

- Name: `AndrewMRPI`
- Email: `27524104+AndrewMRPI@users.noreply.github.com`

## Public Repo Safety

This is an open-source/public repository. Assume anything committed can be read, indexed, forked, and archived by strangers.

- Do not commit secrets, tokens, API keys, private URLs, session values, cookies, `.env*` files, Vercel credentials, or local machine credentials.
- Avoid committing personal identity details beyond the chosen public GitHub identity and no-reply email.
- Avoid unnecessary local filesystem paths, usernames, machine names, private account names, or internal notes in source, docs, logs, screenshots, and commit messages.
- Before committing, scan diffs for privacy and security leaks as well as code correctness.
- If a secret or sensitive identity detail is committed, stop and warn the user before pushing or deploying.
- Keep deployment instructions useful without exposing private tokens, account IDs, or access details that are not already intentionally public.
