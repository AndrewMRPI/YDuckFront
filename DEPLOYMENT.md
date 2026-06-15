# Yellow Ducky Corp Deployment Plan

Goal: deploy this repo to Vercel for `yellowduckycorp.com`. The frontend expects
the Cloud Run API URL in `NEXT_PUBLIC_API_BASE_URL`.

## Current Repo

- Local path: repo root after cloning `AndrewMRPI/YDuckFront`
- GitHub remote: `https://github.com/AndrewMRPI/YDuckFront.git`
- App entry point: `app/page.tsx`
- Authenticated app routes: `app/home`, `app/players`, `app/admin/users/new`,
  and `app/admin/matches/new`
- Backend API contract: `../../Backend/YDuckBack/docs/swagger.yaml`
- Production branch: `main`

## First: Deploy Locally

Before deploying to Vercel, run the production build locally and verify the site in a browser.

```bash
cd YDuckFront
npm install
npm run generate:api
npm run build
npm run start
```

Open:

```text
http://localhost:3000
```

Check the page, navigation, images, layout, and browser console. Stop the local server with `Ctrl+C` when finished.

## One-Time Vercel Setup

Set the backend API URL before production deploys:

```bash
vercel env add NEXT_PUBLIC_API_BASE_URL production
```

Use the Cloud Run service URL, for example `https://SERVICE_URL`.

```bash
cd YDuckFront
npm install
npm run generate:api
npm run build
npm i -g vercel
vercel login
vercel
```

Use the `vercel` prompts to create or link a Vercel project from this repo. Confirm the generated `*.vercel.app` URL works.

After linking, Vercel writes project metadata to `.vercel/project.json`. Do not commit `.vercel/`.

## Connect The Domain

In Vercel:

1. Project -> Settings -> Domains
2. Add `yellowduckycorp.com`
3. Optionally add `www.yellowduckycorp.com`
4. Copy Vercel's DNS records into your domain registrar

Typical records:

```text
yellowduckycorp.com      A      76.76.21.21
www.yellowduckycorp.com  CNAME  cname.vercel-dns.com
```

Use Vercel's exact displayed records if they differ.

## Production Deploy

Deploy the current local checkout to Vercel production:

```bash
cd YDuckFront
npm run generate:api
npm run build
vercel deploy --prod --yes
```

Expected successful output includes:

```text
Production  https://...
Aliased     https://yellowduckycorp.com
```

Inspect the deployment:

```bash
vercel inspect <deployment-url>
```

Verify the stable Vercel project URL:

```bash
curl -I https://yd-uck-front.vercel.app
```

If the local worktree has uncommitted edits that should not be deployed, deploy from a clean temporary archive of the latest commit instead:

```bash
cd YDuckFront
tmpdir=$(mktemp -d /tmp/yduckfront-deploy.XXXXXX)
git archive HEAD | tar -x -C "$tmpdir"
mkdir -p "$tmpdir/.vercel"
cp .vercel/project.json "$tmpdir/.vercel/project.json"
cd "$tmpdir"
vercel deploy --prod --yes
```

## Manual Change Loop

```bash
cd YDuckFront
$EDITOR app/page.tsx
npm run generate:api
npm run lint
npx tsc --noEmit
npm run build
npm run start
git status
git add .
git commit
git push
```

Verify `http://localhost:3000` before committing. Then either push to let Vercel deploy from GitHub, or run `vercel deploy --prod --yes` for an immediate CLI production deploy. Verify the live site after deployment:

```text
https://yellowduckycorp.com
```

## DNS Verification

If Vercel says the domain configuration is valid but the browser cannot load `yellowduckycorp.com`, check public DNS propagation:

```bash
dig yellowduckycorp.com @1.1.1.1
dig yellowduckycorp.com @8.8.8.8
dig NS yellowduckycorp.com @1.1.1.1
vercel domains inspect yellowduckycorp.com
```

Force-test the domain against known Vercel IPs returned by DNS:

```bash
curl -I --resolve yellowduckycorp.com:443:64.29.17.65 https://yellowduckycorp.com
curl -I --resolve yellowduckycorp.com:443:216.198.79.65 https://yellowduckycorp.com
```

If those return `HTTP 200`, Vercel is serving the site and the remaining issue is DNS propagation or local resolver cache.

## Codex Change Loop

1. Ask Codex to make a site change.
2. Codex edits the relevant app files.
3. Codex runs `npm run generate:api` when the backend schema may have changed.
4. Codex runs `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
5. Codex runs `npm run start` and verifies the local production site when the
   change affects runtime behavior.
6. Codex commits with a descriptive subject and body when asked.
7. Codex pushes to GitHub only when asked.
8. Vercel deploys automatically from GitHub.
9. Codex verifies the live domain if deployment was requested.

Useful checks:

```bash
git status
npm run generate:api
npm run lint
npx tsc --noEmit
npm run build
npm run start
vercel list
vercel inspect <deployment-url>
curl -I https://yellowduckycorp.com
```
