import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    connectDatabase: vi.fn(),
    historyModel: {
      find: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
});

vi.mock('../database', () => ({
  connectDatabase: mocks.connectDatabase,
}));

vi.mock('../models/history.model', () => ({
  SearchHistoryModel: mocks.historyModel,
}));

import { historyRouter } from '../routes/history.routes';
import { sendError } from '../routes/responses';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/history', historyRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, error);
  });
  return app;
}

describe('historyRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectDatabase.mockResolvedValue(undefined);
  });

  it('validates required query field on create', async () => {
    const response = await request(buildApp()).post('/history').send({ query: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(mocks.historyModel.create).not.toHaveBeenCalled();
  });

  it('validates selectedAt as ISO datetime', async () => {
    const response = await request(buildApp()).post('/history').send({
      query: 'octocat',
      selectedAt: 'not-a-date',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('creates a history entry with normalized selectedLogin', async () => {
    const created = {
      toJSON: () => ({
        id: 'hist-1',
        query: 'octocat',
        selectedLogin: 'octocat',
      }),
    };
    mocks.historyModel.create.mockResolvedValue(created);

    const response = await request(buildApp()).post('/history').send({
      query: 'octocat',
      selectedLogin: 'OctoCat',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe('hist-1');
    expect(mocks.historyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'octocat',
        selectedLogin: 'octocat',
      }),
    );
  });

  it('lists history entries', async () => {
    const entries = [{ id: 'hist-1', query: 'one' }, { id: 'hist-2', query: 'two' }];
    const lean = vi.fn().mockResolvedValue(entries);
    const sort = vi.fn().mockReturnValue({ lean });
    mocks.historyModel.find.mockReturnValue({ sort });

    const response = await request(buildApp()).get('/history');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(entries);
  });

  it('clears history entries', async () => {
    mocks.historyModel.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const response = await request(buildApp()).delete('/history');

    expect(response.status).toBe(204);
    expect(mocks.historyModel.deleteMany).toHaveBeenCalledWith({});
  });
});
