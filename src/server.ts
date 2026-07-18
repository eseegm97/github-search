import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import 'dotenv/config';
import express from 'express';
import { join } from 'node:path';
import { connectDatabase } from './server/database';
import { env } from './server/env';
import { apiRouter } from './server/routes';
import { sendError } from './server/routes/responses';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', env.corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method.toUpperCase() === 'OPTIONS') {
    res.status(204).send();
    return;
  }

  next();
});

app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json());
app.use('/api', apiRouter);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(res, error);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  connectDatabase()
    .then(() => {
      console.log('[DB] MongoDB connected.');
    })
    .catch((error) => {
      console.warn('[DB] MongoDB connection failed. API will return database errors until available.');
      console.warn(error);
    });

  app.listen(env.port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${env.port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
