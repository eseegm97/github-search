import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { githubRouter, mergeExactAndPartialResults, sortExactFirst } from '../routes/github.routes';
import { sendError } from '../routes/responses';

function buildApp() {
  const app = express();
  app.use('/github', githubRouter);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    sendError(res, error);
  });
  return app;
}

function mockFetchSequence(responses: Response[]): void {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal('fetch', fetchMock);
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sortExactFirst', () => {
  it('prioritizes exact username matches then alphabetic fallback', () => {
    const result = sortExactFirst(
      [
        { githubId: 1, username: 'other-user', avatarUrl: '1', profileUrl: '1' },
        { githubId: 2, username: 'ExactUser', avatarUrl: '2', profileUrl: '2' },
        { githubId: 3, username: 'another-user', avatarUrl: '3', profileUrl: '3' },
      ],
      'exactuser',
    );

    expect(result.map((item) => item.username)).toEqual([
      'ExactUser',
      'another-user',
      'other-user',
    ]);
  });

  it('merges exact lookup first and deduplicates partial results', () => {
    const exact = { githubId: 2, username: 'ExactUser', avatarUrl: '2', profileUrl: '2' };
    const merged = mergeExactAndPartialResults('exactuser', exact, [
      { githubId: 2, username: 'ExactUser', avatarUrl: '2', profileUrl: '2' },
      { githubId: 1, username: 'other-user', avatarUrl: '1', profileUrl: '1' },
    ]);

    expect(merged.map((item) => item.username)).toEqual(['ExactUser', 'other-user']);
  });
});

describe('githubRouter', () => {
  it('returns exact match first followed by sorted partial matches', async () => {
    mockFetchSequence([
      jsonResponse({
        id: 200,
        login: 'ExactUser',
        avatar_url: 'exact-avatar',
        html_url: 'exact-profile',
      }),
      jsonResponse({
        items: [
          { id: 200, login: 'ExactUser', avatar_url: 'exact-avatar', html_url: 'exact-profile' },
          { id: 100, login: 'z-user', avatar_url: 'z-avatar', html_url: 'z-profile' },
          { id: 101, login: 'a-user', avatar_url: 'a-avatar', html_url: 'a-profile' },
        ],
      }),
    ]);

    const response = await request(buildApp()).get('/github/search').query({ username: 'exactuser' });

    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { username: string }) => item.username)).toEqual([
      'ExactUser',
      'a-user',
      'z-user',
    ]);
  });

  it('returns partial matches when exact lookup is not found', async () => {
    mockFetchSequence([
      new Response('missing', { status: 404 }),
      jsonResponse({
        items: [{ id: 100, login: 'partial-user', avatar_url: 'p-avatar', html_url: 'p-profile' }],
      }),
    ]);

    const response = await request(buildApp()).get('/github/search').query({ username: 'partial' });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].username).toBe('partial-user');
  });

  it('maps GitHub user not found to 404 on profile endpoint', async () => {
    mockFetchSequence([new Response('missing', { status: 404 })]);

    const response = await request(buildApp()).get('/github/users/not-real-user');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('maps GitHub rate limiting to 429', async () => {
    mockFetchSequence([
      new Response('rate limited', {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
        },
      }),
    ]);

    const response = await request(buildApp()).get('/github/users/exhausted-user');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});