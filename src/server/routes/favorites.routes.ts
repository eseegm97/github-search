import { Router } from 'express';
import mongoose from 'mongoose';
import { connectDatabase } from '../database';
import {
  CreateFavoritePayload,
  FavoriteProfileModel,
  UpdateFavoritePayload,
} from '../models/favorite.model';
import { RouteError, sendData } from './responses';

export const favoritesRouter = Router();

function buildFavoriteLookup(id: string): { $or: Array<Record<string, string>> } {
  const candidates: Array<Record<string, string>> = [{ login: id.toLowerCase() }];

  if (mongoose.isValidObjectId(id)) {
    candidates.unshift({ _id: id });
  }

  return { $or: candidates };
}

favoritesRouter.get('/', async (_req, res, next) => {
  try {
    await connectDatabase();
    const favorites = await FavoriteProfileModel.find({}).sort({ updatedAt: -1 }).lean();
    sendData(res, favorites);
  } catch (error) {
    next(new RouteError(503, 'DATABASE_FAILURE', 'Unable to list favorites.', { cause: error }));
  }
});

favoritesRouter.post('/', async (req, res, next) => {
  try {
    const payload = req.body as CreateFavoritePayload;
    const githubId = Number(payload.githubId);
    const login = payload.login?.trim().toLowerCase();
    const avatarUrl = payload.avatarUrl?.trim();
    const profileUrl = payload.profileUrl?.trim();

    if (!Number.isInteger(githubId) || githubId <= 0 || !login || !avatarUrl || !profileUrl) {
      throw new RouteError(
        400,
        'BAD_REQUEST',
        'githubId, login, avatarUrl, and profileUrl are required.',
      );
    }

    await connectDatabase();
    const created = await FavoriteProfileModel.create({
      githubId,
      login,
      avatarUrl,
      profileUrl,
      note: payload.note ?? '',
    });

    sendData(res, created.toJSON(), 201);
  } catch (error) {
    next(error);
  }
});

favoritesRouter.put('/:id', async (req, res, next) => {
  try {
    const idParam = req.params['id'];
    const id = (Array.isArray(idParam) ? idParam[0] : idParam)?.trim();
    const payload = req.body as UpdateFavoritePayload;

    if (!id) {
      throw new RouteError(400, 'BAD_REQUEST', 'Favorite id is required.');
    }

    await connectDatabase();
    const filter = buildFavoriteLookup(id);
    const updates: { note?: string } = {};

    if (payload.note !== undefined) {
      updates.note = payload.note;
    }

    if (payload.note === undefined) {
      throw new RouteError(400, 'BAD_REQUEST', 'Provide note to update.');
    }

    const updated = await FavoriteProfileModel.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      throw new RouteError(404, 'NOT_FOUND', 'Favorite was not found.');
    }

    sendData(res, updated.toJSON());
  } catch (error) {
    next(error);
  }
});

favoritesRouter.delete('/:id', async (req, res, next) => {
  try {
    const idParam = req.params['id'];
    const id = (Array.isArray(idParam) ? idParam[0] : idParam)?.trim();

    if (!id) {
      throw new RouteError(400, 'BAD_REQUEST', 'Favorite id is required.');
    }

    await connectDatabase();
    const deleted = await FavoriteProfileModel.findOneAndDelete(buildFavoriteLookup(id));

    if (!deleted) {
      throw new RouteError(404, 'NOT_FOUND', 'Favorite was not found.');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});