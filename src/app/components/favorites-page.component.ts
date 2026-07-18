import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Favorite } from '../models/favorite.model';
import { FavoritesService } from '../services/favorites.service';

type FavoriteDraft = {
  note: string;
  tagsText: string;
};

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      <h1>Favorites</h1>
      <p>Manage saved profiles, update notes/tags, or remove favorites.</p>

      @if (loading()) {
        <p>Loading favorites...</p>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (!loading() && favorites().length === 0) {
        <p>No favorites saved yet.</p>
      }

      <ul class="favorite-list">
        @for (favorite of favorites(); track favorite.id) {
          <li>
            <img [src]="favorite.avatarUrl" [alt]="favorite.login + ' avatar'" loading="lazy" />
            <div class="content">
              <div class="top-row">
                <strong>{{ favorite.login }}</strong>
                <a [routerLink]="['/profile', favorite.login]">Open</a>
              </div>

              <label>
                Note
                <textarea
                  [(ngModel)]="draftFor(favorite.id).note"
                  rows="2"
                ></textarea>
              </label>

              <label>
                Tags (comma-separated)
                <input [(ngModel)]="draftFor(favorite.id).tagsText" />
              </label>

              <div class="actions">
                <button (click)="saveFavorite(favorite)">Save</button>
                <button class="danger" (click)="removeFavorite(favorite)">Remove</button>
              </div>
            </div>
          </li>
        }
      </ul>

      <a routerLink="/search">Back to Search</a>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      .favorite-list {
        list-style: none;
        margin: 1rem 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .favorite-list li {
        display: flex;
        gap: 0.8rem;
        border: 1px solid #e3e6ee;
        border-radius: 8px;
        padding: 0.8rem;
      }

      img {
        width: 56px;
        height: 56px;
        border-radius: 50%;
      }

      .content {
        flex: 1;
        display: grid;
        gap: 0.45rem;
      }

      .top-row {
        display: flex;
        justify-content: space-between;
      }

      textarea,
      input {
        width: 100%;
        margin-top: 0.25rem;
        padding: 0.45rem;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
      }

      button {
        padding: 0.45rem 0.9rem;
      }

      .danger {
        background: #fff0f0;
        border: 1px solid #cc4a4a;
        color: #962626;
      }

      .error {
        color: #a02020;
      }
    `,
  ],
})
export class FavoritesPageComponent {
  private readonly favoritesService = inject(FavoritesService);

  readonly favorites = this.favoritesService.favorites;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly drafts = signal<Record<string, FavoriteDraft>>({});

  constructor() {
    void this.loadFavorites();
  }

  private async loadFavorites(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.favoritesService.refresh();
      this.syncDrafts();
    } catch {
      this.error.set('Unable to load favorites.');
    } finally {
      this.loading.set(false);
    }
  }

  private syncDrafts(): void {
    const nextDrafts: Record<string, FavoriteDraft> = {};

    for (const favorite of this.favorites()) {
      nextDrafts[favorite.id] = {
        note: favorite.note,
        tagsText: favorite.tags.join(', '),
      };
    }

    this.drafts.set(nextDrafts);
  }

  async saveFavorite(favorite: Favorite): Promise<void> {
    const draft = this.draftFor(favorite.id);

    try {
      await this.favoritesService.updateFavorite(favorite.id, {
        note: draft.note,
        tags: parseTags(draft.tagsText),
      });
      this.syncDrafts();
    } catch {
      this.error.set(`Unable to save changes for ${favorite.login}.`);
    }
  }

  async removeFavorite(favorite: Favorite): Promise<void> {
    try {
      await this.favoritesService.deleteFavorite(favorite.id);
      this.syncDrafts();
    } catch {
      this.error.set(`Unable to remove ${favorite.login}.`);
    }
  }

  draftFor(id: string): FavoriteDraft {
    const existing = this.drafts()[id];

    if (existing) {
      return existing;
    }

    const next = { ...this.drafts(), [id]: { note: '', tagsText: '' } };
    this.drafts.set(next);
    return next[id];
  }
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}