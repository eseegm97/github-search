import { Router } from 'express';
import { favoritesRouter } from './favorites.routes';
import { githubRouter } from './github.routes';
import { historyRouter } from './history.routes';
import { RouteError, sendError, sendData } from './responses';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  sendData(res, { status: 'ok' });
});

apiRouter.use('/github', githubRouter);
apiRouter.use('/favorites', favoritesRouter);
apiRouter.use('/history', historyRouter);

apiRouter.all('{*splat}', (req, res) => {
  sendError(res, new RouteError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
});