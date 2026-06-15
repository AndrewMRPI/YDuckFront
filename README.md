# Yellow Ducky Frontend

Next.js frontend for Yellow Ducky Corp.

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

## Checks

```bash
npm run lint
npx tsc --noEmit
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
