import { Router } from 'express';
import { connectDatabase } from '../database';
import { CreateSearchHistoryPayload, SearchHistoryModel } from '../models/history.model';
import { RouteError, sendData } from './responses';

export const historyRouter = Router();

historyRouter.get('/', async (_req, res, next) => {
  try {
    await connectDatabase();
    const entries = await SearchHistoryModel.find({}).sort({ createdAt: -1 }).lean();
    sendData(res, entries);
  } catch (error) {
    next(new RouteError(503, 'DATABASE_FAILURE', 'Unable to list history.', { cause: error }));
  }
});

historyRouter.post('/', async (req, res, next) => {
  try {
    const payload = req.body as CreateSearchHistoryPayload;
    const query = `${payload.query ?? ''}`.trim();

    if (!query) {
      throw new RouteError(400, 'BAD_REQUEST', 'query is required.');
    }

    const selectedLogin = payload.selectedLogin?.trim().toLowerCase() || undefined;
    const selectedAt = payload.selectedAt ? new Date(payload.selectedAt) : undefined;

    if (selectedAt && Number.isNaN(selectedAt.getTime())) {
      throw new RouteError(400, 'BAD_REQUEST', 'selectedAt must be a valid ISO datetime.');
    }

    await connectDatabase();
    const created = await SearchHistoryModel.create({
      query,
      selectedLogin,
      selectedAt: selectedAt ?? (selectedLogin ? new Date() : undefined),
    });

    sendData(res, created.toJSON(), 201);
  } catch (error) {
    next(error);
  }
});

historyRouter.delete('/', async (_req, res, next) => {
  try {
    await connectDatabase();
    await SearchHistoryModel.deleteMany({});
    res.status(204).send();
  } catch (error) {
    next(new RouteError(503, 'DATABASE_FAILURE', 'Unable to clear history.', { cause: error }));
  }
});