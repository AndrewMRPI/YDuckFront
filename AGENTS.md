<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Context

This repo backs the Yellow Ducky Corp personal website intended for deployment to Vercel at `yellowduckycorp.com`.

## Workflow

- Treat `main` as the production branch.
- Do not deploy to Vercel unless explicitly asked.
- Run `npm run build` before committing deployable code changes.
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
