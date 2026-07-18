# github-gateway

GitHub Gateway is a backend-proxied Angular SPA. The UI runs in Angular while an Express server handles API endpoints and GitHub REST API calls.

## Workspace Layout

- `src/app/components/` - SPA route components.
- `src/app/models/` - Frontend data models.
- `src/server/models/` - Server data models.
- `src/server/routes/` - Server API route handlers.

## Quick Start

1. Install dependencies:

   `npm install`

2. Copy and edit environment values:

   `copy .env.example .env`

3. Start development runtime (SSR + API):

   `npm run dev`

## Scripts

- `npm run dev` - Runs Angular dev server with Express integration.
- `npm run build` - Builds production assets.
- `npm run start:prod` - Runs built production server.
- `npm test` - Runs backend and frontend test suites.

## Environment Contract

Defined in `.env.example`:

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
