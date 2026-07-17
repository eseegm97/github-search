# github-gateway

GitHub Gateway is a backend-proxied Angular SPA. The UI runs in Angular while an Express server handles API endpoints and GitHub REST API calls.

## Workspace Layout

- `github-gateway/` - Angular SSR app plus Express API host.
- `github-gateway/src/app/components/` - SPA route components.
- `github-gateway/src/app/models/` - Frontend data models.
- `github-gateway/src/server/models/` - Server data models.
- `github-gateway/src/server/routes/` - Server API route handlers.

## Quick Start

1. Install root dependencies:

   `npm install`

2. Install app dependencies:

   `npm install --prefix github-gateway`

3. Copy and edit environment values:

   `copy github-gateway\\.env.example github-gateway\\.env`

4. Start development runtime (SSR + API):

   `npm run dev`

## Scripts (Root)

- `npm run dev` - Runs Angular dev server with Express integration.
- `npm run build` - Builds production assets.
- `npm run start:prod` - Runs built production server.
- `npm test` - Runs backend and frontend test suites.

## Environment Contract

Defined in `github-gateway/.env.example`:

- `PORT` - Express server port.
- `CORS_ORIGIN` - Allowed browser origin for API calls.
- `GITHUB_API_BASE_URL` - GitHub API base URL.
- `GITHUB_TOKEN` - Optional token for higher API rate limits.
- `MONGODB_URI` - MongoDB connection string for favorites/history persistence.

## Phase 1 API Surface

Base path: `/api`

- `GET /health`
- `GET /github/search?username=<value>`
- `GET /github/users/:username`
- `GET /favorites`
- `POST /favorites`
- `PUT /favorites/:id`
- `DELETE /favorites/:id`
- `GET /history`
- `POST /history`
- `DELETE /history`

Notes:

- Favorites and history use in-memory storage during Phase 1.
- MongoDB model and persistence wiring is planned for the next phase.
