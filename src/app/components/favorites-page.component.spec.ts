import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Favorite } from '../models/favorite.model';
import { FavoritesService } from '../services/favorites.service';
import { FavoritesPageComponent } from './favorites-page.component';

describe('FavoritesPageComponent', () => {
  let fixture: ComponentFixture<FavoritesPageComponent>;
  let component: FavoritesPageComponent;

  const favoritesFixture: Favorite[] = [
    {
      id: 'fav-1',
      githubId: 1,
      login: 'user-one',
      avatarUrl: 'a1',
      profileUrl: 'p1',
      note: 'note one',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'fav-2',
      githubId: 2,
      login: 'user-two',
      avatarUrl: 'a2',
      profileUrl: 'p2',
      note: 'note two',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const favoritesState = signal<Favorite[]>([]);
  const serviceMock = {
    favorites: favoritesState.asReadonly(),
    refresh: vi.fn(),
    updateFavorite: vi.fn(),
    deleteFavorite: vi.fn(),
  };

  beforeEach(async () => {
    favoritesState.set(structuredClone(favoritesFixture));
    serviceMock.refresh.mockReset();
    serviceMock.updateFavorite.mockReset();
    serviceMock.deleteFavorite.mockReset();
    serviceMock.refresh.mockResolvedValue(undefined);
    serviceMock.updateFavorite.mockResolvedValue(favoritesState()[0]);
    serviceMock.deleteFavorite.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [FavoritesPageComponent],
      providers: [
        provideRouter([]),
        { provide: FavoritesService, useValue: serviceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('keeps per-profile drafts independent while editing', () => {
    component.onDraftNoteChange(favoritesState()[0], 'updated one');

    expect(component.draftFor(favoritesState()[0]).note).toBe('updated one');
    expect(component.draftFor(favoritesState()[1]).note).toBe('note two');
  });

  it('saves note edits for selected profile only', async () => {
    component.onDraftNoteChange(favoritesState()[1], 'new second note');

    await component.saveFavorite(favoritesState()[1]);

    expect(serviceMock.updateFavorite).toHaveBeenCalledWith('fav-2', {
      note: 'new second note',
    });
  });

  it('removes selected favorite', async () => {
    await component.removeFavorite(favoritesState()[0]);

    expect(serviceMock.deleteFavorite).toHaveBeenCalledWith('fav-1');
  });
});
