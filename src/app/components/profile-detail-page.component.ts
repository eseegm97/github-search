import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { GithubProfile } from '../models/github-user.model';
import { FavoritesService } from '../services/favorites.service';
import { GithubApiService } from '../services/github-api.service';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-profile-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page-shell">
      @if (loading()) {
        <div class="alert alert-info py-2">Loading profile...</div>
      }

      @if (error()) {
        <div class="alert alert-danger py-2">{{ error() }}</div>
      }

      @if (profile(); as user) {
        <section class="section-card p-3 p-md-4 mb-4">
          <div class="header">
            <img [src]="user.avatarUrl" [alt]="user.username + ' avatar'" />
            <div>
              <h1 class="h2 fw-bold mb-1">{{ user.name || user.username }}</h1>
              <p class="muted mb-2">@{{ user.username }}</p>
            </div>
          </div>

          @if (user.bio) {
            <p class="bio mt-3 mb-3">{{ user.bio }}</p>
          }

          <div class="stats">
            <span class="chip">Repos: {{ user.publicRepos }}</span>
            <span class="chip">Followers: {{ user.followers }}</span>
            <span class="chip">Following: {{ user.following }}</span>
          </div>
        </section>

        <section class="section-card p-3 p-md-4">
          <h2 class="h4 fw-semibold mb-3">Save to Favorites</h2>

          @if (existingFavoriteId()) {
            <p class="text-secondary small mb-3">Already in favorites. Saving will update the note.</p>
          }

          <label for="favorite-note" class="form-label fw-semibold">Note</label>
          <textarea id="favorite-note" class="form-control" [(ngModel)]="note" rows="3"></textarea>

          <div class="actions mt-3">
            <button class="btn btn-primary" (click)="saveFavorite()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Favorite' }}
            </button>
            <a class="btn btn-outline-dark" [href]="user.profileUrl" target="_blank" rel="noopener">Open on GitHub</a>
          </div>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .header {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      img {
        width: 88px;
        height: 88px;
        border-radius: 50%;
      }

      .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .chip {
        border: 1px solid #cae0ff;
        background: #eef5ff;
        color: #17407f;
        border-radius: 999px;
        padding: 0.35rem 0.75rem;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .bio {
        color: #3f4d69;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        align-items: center;
      }

      .muted {
        color: #5a6170;
      }
    `,
  ],
})
export class ProfileDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly githubApi = inject(GithubApiService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly historyService = inject(HistoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly profile = signal<GithubProfile | null>(null);
  readonly existingFavoriteId = signal<string | null>(null);

  note = '';

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('login')?.trim() ?? ''),
        filter((login) => login.length > 0),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((login) => {
        void this.loadProfile(login);
      });
  }

  private async loadProfile(login: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.favoritesService.refresh();
      const profile = await this.githubApi.getUserProfile(login);
      this.profile.set(profile);

      const existing = this.favoritesService.getByLogin(profile.username);
      this.existingFavoriteId.set(existing?.id ?? null);
      this.note = existing?.note ?? '';

      const query = this.route.snapshot.queryParamMap.get('q')?.trim() || profile.username;
      await this.historyService.addEntry({
        query,
        selectedLogin: profile.username,
        selectedAt: new Date().toISOString(),
      });
    } catch {
      this.error.set('Unable to load this profile.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveFavorite(): Promise<void> {
    const profile = this.profile();

    if (!profile) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      const existingId = this.existingFavoriteId();

      if (existingId) {
        const updated = await this.favoritesService.updateFavorite(existingId, {
          note: this.note,
        });
        this.existingFavoriteId.set(updated.id);
      } else {
        const created = await this.favoritesService.addFromProfile(profile, this.note);
        this.existingFavoriteId.set(created.id);
      }
    } catch {
      this.error.set('Unable to save favorite right now.');
    } finally {
      this.saving.set(false);
    }
  }
}
