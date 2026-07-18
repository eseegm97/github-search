import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    connectDatabase: vi.fn(),
    favoriteModel: {
      find: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOneAndDelete: vi.fn(),
    },
  };
});

vi.mock('../database', () => ({
  connectDatabase: mocks.connectDatabase,
}));

vi.mock('../models/favorite.model', () => ({
  FavoriteProfileModel: mocks.favoriteModel,
}));

import { favoritesRouter } from '../routes/favorites.routes';
import { sendError } from '../routes/responses';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/favorites', favoritesRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, error);
  });
  return app;
}

describe('favoritesRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectDatabase.mockResolvedValue(undefined);
  });

  it('validates required fields when creating favorites', async () => {
    const response = await request(buildApp()).post('/favorites').send({ login: 'only-login' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(mocks.favoriteModel.create).not.toHaveBeenCalled();
  });

  it('creates and returns a favorite', async () => {
    const created = {
      toJSON: () => ({
        id: 'fav-1',
        githubId: 101,
        login: 'exactuser',
        avatarUrl: 'avatar',
        profileUrl: 'profile',
        note: 'saved note',
      }),
    };
    mocks.favoriteModel.create.mockResolvedValue(created);

    const response = await request(buildApp()).post('/favorites').send({
      githubId: 101,
      login: 'ExactUser',
      avatarUrl: 'avatar',
      profileUrl: 'profile',
      note: 'saved note',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe('fav-1');
    expect(mocks.favoriteModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        login: 'exactuser',
      }),
    );
  });

  it('updates favorite note by id', async () => {
    const updated = {
      toJSON: () => ({
        id: 'fav-1',
        githubId: 101,
        login: 'exactuser',
        avatarUrl: 'avatar',
        profileUrl: 'profile',
        note: 'updated note',
      }),
    };
    mocks.favoriteModel.findOneAndUpdate.mockResolvedValue(updated);

    const response = await request(buildApp())
      .put('/favorites/64b90f15b98e4f0f4bbf9a40')
      .send({ note: 'updated note' });

    expect(response.status).toBe(200);
    expect(response.body.data.note).toBe('updated note');
    expect(mocks.favoriteModel.findOneAndUpdate).toHaveBeenCalled();
  });

  it('requires note for update payload', async () => {
    const response = await request(buildApp())
      .put('/favorites/64b90f15b98e4f0f4bbf9a40')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('deletes an existing favorite', async () => {
    mocks.favoriteModel.findOneAndDelete.mockResolvedValue({ id: 'fav-1' });

    const response = await request(buildApp()).delete('/favorites/exactuser');

    expect(response.status).toBe(204);
    expect(mocks.favoriteModel.findOneAndDelete).toHaveBeenCalled();
  });

  it('returns not found when deleting missing favorite', async () => {
    mocks.favoriteModel.findOneAndDelete.mockResolvedValue(null);

    const response = await request(buildApp()).delete('/favorites/missing-user');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
