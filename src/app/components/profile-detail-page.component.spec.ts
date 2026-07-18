import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Favorite } from '../models/favorite.model';
import { GithubProfile } from '../models/github-user.model';
import { FavoritesService } from '../services/favorites.service';
import { GithubApiService } from '../services/github-api.service';
import { HistoryService } from '../services/history.service';
import { ProfileDetailPageComponent } from './profile-detail-page.component';

describe('ProfileDetailPageComponent', () => {
  let fixture: ComponentFixture<ProfileDetailPageComponent>;
  let component: ProfileDetailPageComponent;

  const loginParams$ = new BehaviorSubject(convertToParamMap({ login: 'octocat' }));

  const profileFixture: GithubProfile = {
    githubId: 1,
    username: 'octocat',
    avatarUrl: 'avatar',
    profileUrl: 'profile',
    name: 'Octo Cat',
    bio: 'bio',
    company: null,
    location: null,
    publicRepos: 8,
    followers: 10,
    following: 4,
  };

  const favoritesState = signal<Favorite[]>([]);
  const favoritesServiceMock = {
    refresh: vi.fn(),
    getByLogin: vi.fn(),
    addFromProfile: vi.fn(),
    updateFavorite: vi.fn(),
    favorites: favoritesState.asReadonly(),
  };

  const githubApiMock = {
    getUserProfile: vi.fn(),
  };

  const historyServiceMock = {
    addEntry: vi.fn(),
  };

  beforeEach(async () => {
    favoritesServiceMock.refresh.mockReset();
    favoritesServiceMock.getByLogin.mockReset();
    favoritesServiceMock.addFromProfile.mockReset();
    favoritesServiceMock.updateFavorite.mockReset();
    githubApiMock.getUserProfile.mockReset();
    historyServiceMock.addEntry.mockReset();

    favoritesServiceMock.refresh.mockResolvedValue(undefined);
    favoritesServiceMock.getByLogin.mockReturnValue(undefined);
    favoritesServiceMock.addFromProfile.mockResolvedValue({ id: 'fav-1' });
    favoritesServiceMock.updateFavorite.mockResolvedValue({ id: 'fav-1' });
    githubApiMock.getUserProfile.mockResolvedValue(profileFixture);
    historyServiceMock.addEntry.mockResolvedValue({ id: 'h1' });

    loginParams$.next(convertToParamMap({ login: 'octocat' }));

    await TestBed.configureTestingModule({
      imports: [ProfileDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: FavoritesService, useValue: favoritesServiceMock },
        { provide: GithubApiService, useValue: githubApiMock },
        { provide: HistoryService, useValue: historyServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: loginParams$.asObservable(),
            snapshot: {
              queryParamMap: convertToParamMap({ q: 'from-search' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads selected profile and records selected history entry', () => {
    expect(githubApiMock.getUserProfile).toHaveBeenCalledWith('octocat');
    expect(historyServiceMock.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'from-search',
        selectedLogin: 'octocat',
      }),
    );
    expect(component.profile()?.username).toBe('octocat');
  });

  it('saves new favorite when profile is not already saved', async () => {
    component.note = 'new note';

    await component.saveFavorite();

    expect(favoritesServiceMock.addFromProfile).toHaveBeenCalledWith(profileFixture, 'new note');
    expect(favoritesServiceMock.updateFavorite).not.toHaveBeenCalled();
  });

  it('updates existing favorite when profile already exists', async () => {
    component.existingFavoriteId.set('fav-existing');

    component.note = 'updated note';
    await component.saveFavorite();

    expect(favoritesServiceMock.updateFavorite).toHaveBeenCalledWith('fav-existing', {
      note: 'updated note',
    });
  });
});
