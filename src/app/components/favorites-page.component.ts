import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Favorite } from '../models/favorite.model';
import { FavoritesService } from '../services/favorites.service';

type FavoriteDraft = {
  note: string;
};

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page-shell">
      <section class="mb-4">
        <h1 class="h2 fw-bold mb-2">Favorites</h1>
        <p class="text-secondary mb-0">Manage saved profiles, update notes, or remove favorites.</p>
      </section>

      @if (loading()) {
        <div class="alert alert-info py-2">Loading favorites...</div>
      }

      @if (error()) {
        <div class="alert alert-danger py-2">{{ error() }}</div>
      }

      @if (!loading() && favorites().length === 0) {
        <div class="section-card p-4 text-secondary">No favorites saved yet.</div>
      }

      <ul class="favorite-list list-unstyled mb-0">
        @for (favorite of favorites(); track favorite.id) {
          <li class="section-card p-3 p-md-4 mb-3">
            <div class="d-flex gap-3 align-items-start">
              <img class="avatar" [src]="favorite.avatarUrl" [alt]="favorite.login + ' avatar'" loading="lazy" />
              <div class="content">
                <div class="top-row mb-2">
                  <strong class="fs-5">{{ favorite.login }}</strong>
                  <a class="btn btn-outline-primary btn-sm" [routerLink]="['/profile', favorite.login]">Open</a>
                </div>

                <label class="form-label fw-semibold mb-1">
                  Note
                </label>
                <textarea
                  class="form-control"
                  [(ngModel)]="draftFor(favorite.id).note"
                  rows="2"
                ></textarea>

                <div class="actions mt-3">
                  <button class="btn btn-primary" (click)="saveFavorite(favorite)">Save</button>
                  <button class="btn btn-outline-danger" (click)="removeFavorite(favorite)">Remove</button>
                </div>
              </div>
            </div>
          </li>
        }
      </ul>
    </main>
  `,
  styles: [
    `
      .favorite-list {
        margin-top: 1rem;
      }

      .avatar {
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
        align-items: center;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
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
      };
    }

    this.drafts.set(nextDrafts);
  }

  async saveFavorite(favorite: Favorite): Promise<void> {
    const draft = this.draftFor(favorite.id);

    try {
      await this.favoritesService.updateFavorite(favorite.id, {
        note: draft.note,
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

    const next = { ...this.drafts(), [id]: { note: '' } };
    this.drafts.set(next);
    return next[id];
  }
}