import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  it('refresh loads favorites into signal state', async () => {
    TestBed.configureTestingModule({
      providers: [FavoritesService, provideHttpClient(), provideHttpClientTesting()],
    });

    const service = TestBed.inject(FavoritesService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.refresh();
    const request = http.expectOne('/api/favorites');
    request.flush({
      data: [
        {
          id: 'fav-1',
          githubId: 1,
          login: 'octocat',
          avatarUrl: 'a',
          profileUrl: 'p',
          note: 'saved',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    await promise;
    expect(service.favorites()).toHaveLength(1);
    expect(service.getByLogin('OCTOCAT')?.id).toBe('fav-1');
  });

  it('addFromProfile posts and prepends result into state', async () => {
    TestBed.configureTestingModule({
      providers: [FavoritesService, provideHttpClient(), provideHttpClientTesting()],
    });

    const service = TestBed.inject(FavoritesService);
    const http = TestBed.inject(HttpTestingController);

    const addPromise = service.addFromProfile(
      {
        githubId: 2,
        username: 'new-user',
        avatarUrl: 'a2',
        profileUrl: 'p2',
        name: null,
        bio: null,
        company: null,
        location: null,
        publicRepos: 0,
        followers: 0,
        following: 0,
      },
      'note',
    );

    const request = http.expectOne('/api/favorites');
    expect(request.request.body.login).toBe('new-user');
    request.flush({
      data: {
        id: 'fav-2',
        githubId: 2,
        login: 'new-user',
        avatarUrl: 'a2',
        profileUrl: 'p2',
        note: 'note',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await addPromise;
    expect(service.favorites()[0]?.id).toBe('fav-2');
  });

  it('updateFavorite maps updated favorite in state', async () => {
    TestBed.configureTestingModule({
      providers: [FavoritesService, provideHttpClient(), provideHttpClientTesting()],
    });

    const service = TestBed.inject(FavoritesService);
    const http = TestBed.inject(HttpTestingController);

    const refreshPromise = service.refresh();
    http.expectOne('/api/favorites').flush({
      data: [
        {
          id: 'fav-1',
          githubId: 1,
          login: 'octocat',
          avatarUrl: 'a',
          profileUrl: 'p',
          note: 'old',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    await refreshPromise;

    const updatePromise = service.updateFavorite('fav-1', { note: 'new-note' });
    http.expectOne('/api/favorites/fav-1').flush({
      data: {
        id: 'fav-1',
        githubId: 1,
        login: 'octocat',
        avatarUrl: 'a',
        profileUrl: 'p',
        note: 'new-note',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    });

    await updatePromise;
    expect(service.favorites()[0]?.note).toBe('new-note');
  });
});
