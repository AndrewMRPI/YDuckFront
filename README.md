# Yellow Ducky Frontend

Next.js frontend for Yellow Ducky Corp. The app uses the Go Cloud Run backend in
`../../Backend/YDuckBack` for auth, players, and matches.

## App Shape

- `/` signs in enhanced guests and admins.
- `/overall-match-history` shows the authenticated match history view.
- `/players` lists players and recent match data.
- `/admin/users/new` creates players.
- `/admin/matches/new` creates matches.
- Route files live in `src/app`.
- Shared UI components live in `src/components`.
- API helpers live in `src/services/yduckApiClient.ts`.
- API schema types live in `src/types/generatedApiTypes.ts` and are generated from
  the backend OpenAPI file.

## Local Development

Run against the local backend:

```bash
make dev-local
```

Run localhost frontend against the deployed Cloud Run backend:

```bash
make dev-cloud
```

`make dev-cloud` resolves the Cloud Run URL with `gcloud` using:

- `PROJECT_ID`
- `REGION`, default `us-west1`
- `SERVICE_NAME`, default `yduck-api`

You can also pass the URL directly:

```bash
CLOUD_API_BASE_URL=https://SERVICE_URL make dev-cloud
```

Open [http://localhost:3000](http://localhost:3000).

## API Types

Generate frontend API schema types from the backend Swagger file:

```bash
npm run generate:api
```

By default, generation reads:

```text
../../Backend/YDuckBack/docs/swagger.yaml
```

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
