import { Router } from 'express';
import { env } from '../env';
import { GithubUserProfile, GithubUserSummary } from '../models/github.model';
import { RouteError, sendData } from './responses';

type GithubSearchResponse = {
  items?: Array<{
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
  }>;
};

type GithubUserResponse = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
};

export function sortExactFirst(users: GithubUserSummary[], query: string): GithubUserSummary[] {
  const loweredQuery = query.toLowerCase();

  return [...users].sort((a, b) => {
    const aExact = a.username.toLowerCase() === loweredQuery ? 0 : 1;
    const bExact = b.username.toLowerCase() === loweredQuery ? 0 : 1;

    if (aExact !== bExact) {
      return aExact - bExact;
    }

    return a.username.localeCompare(b.username);
  });
}

function toSummary(user: { id: number; login: string; avatar_url: string; html_url: string }): GithubUserSummary {
  return {
    githubId: user.id,
    username: user.login,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url,
  };
}

function toProfile(user: GithubUserResponse): GithubUserProfile {
  return {
    githubId: user.id,
    username: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    profileUrl: user.html_url,
    bio: user.bio,
    company: user.company,
    location: user.location,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
  };
}

async function githubRequest<T>(path: string): Promise<T> {
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'User-Agent': 'github-gateway-app',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  if (env.githubToken) {
    headers.set('Authorization', `Bearer ${env.githubToken}`);
  }

  const response = await fetch(`${env.githubApiBaseUrl}${path}`, { headers });

  if (!response.ok) {
    const body = await response.text();

    if (response.status === 404) {
      throw new RouteError(404, 'NOT_FOUND', 'GitHub user was not found.');
    }

    const remaining = response.headers.get('x-ratelimit-remaining');
    if (response.status === 403 && remaining === '0') {
      throw new RouteError(429, 'RATE_LIMITED', 'GitHub API rate limit exceeded.');
    }

    throw new RouteError(502, 'UPSTREAM_FAILURE', 'GitHub upstream request failed.', {
      upstreamStatus: response.status,
      responseBody: body,
    });
  }

  return (await response.json()) as T;
}

export function mergeExactAndPartialResults(
  query: string,
  exactMatch: GithubUserSummary | null,
  partialMatches: GithubUserSummary[],
): GithubUserSummary[] {
  const deduped = partialMatches.filter((item) =>
    exactMatch ? item.username.toLowerCase() !== exactMatch.username.toLowerCase() : true,
  );

  const sorted = sortExactFirst(deduped, query);
  return exactMatch ? [exactMatch, ...sorted] : sorted;
}

export const githubRouter = Router();

githubRouter.get('/search', async (req, res, next) => {
  try {
    const query = `${req.query['username'] ?? ''}`.trim();

    if (!query) {
      sendData(res, []);
      return;
    }

    let exactMatch: GithubUserSummary | null = null;
    try {
      const exactProfile = await githubRequest<GithubUserResponse>(`/users/${encodeURIComponent(query)}`);
      exactMatch = toSummary(exactProfile);
    } catch (error) {
      if (!(error instanceof RouteError && error.status === 404)) {
        throw error;
      }
    }

    const params = new URLSearchParams({
      q: `${query} in:login`,
      per_page: '10',
    });
    const raw = await githubRequest<GithubSearchResponse>(`/search/users?${params.toString()}`);

    const users = (raw.items ?? []).map(toSummary);
    sendData(res, mergeExactAndPartialResults(query, exactMatch, users));
  } catch (error) {
    next(error);
  }
});

githubRouter.get('/users/:username', async (req, res, next) => {
  try {
    const usernameParam = req.params['username'];
    const username = Array.isArray(usernameParam) ? usernameParam[0] : usernameParam;

    if (!username?.trim()) {
      throw new RouteError(400, 'BAD_REQUEST', 'Username is required.');
    }

    const profile = await githubRequest<GithubUserResponse>(`/users/${encodeURIComponent(username)}`);
    sendData(res, toProfile(profile));
  } catch (error) {
    next(error);
  }
});