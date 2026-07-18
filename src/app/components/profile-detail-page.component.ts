import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { GithubProfile } from '../models/github-user.model';
import { FavoritesService } from '../services/favorites.service';
import { GithubApiService } from '../services/github-api.service';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-profile-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      @if (loading()) {
        <p>Loading profile...</p>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (profile(); as user) {
        <div class="header">
          <img [src]="user.avatarUrl" [alt]="user.username + ' avatar'" />
          <div>
            <h1>{{ user.name || user.username }}</h1>
            <p class="muted">@{{ user.username }}</p>
            @if (user.bio) {
              <p>{{ user.bio }}</p>
            }
          </div>
        </div>

        <div class="stats">
          <span>Repos: {{ user.publicRepos }}</span>
          <span>Followers: {{ user.followers }}</span>
          <span>Following: {{ user.following }}</span>
        </div>

        <section class="panel">
          <h2>Save to Favorites</h2>

          @if (existingFavoriteId()) {
            <p class="muted">Already in favorites. Saving will update the note/tags.</p>
          }

          <label>
            Note
            <textarea [(ngModel)]="note" rows="3"></textarea>
          </label>

          <label>
            Tags (comma-separated)
            <input [(ngModel)]="tagsText" />
          </label>

          <div class="actions">
            <button (click)="saveFavorite()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Favorite' }}
            </button>
            <a [href]="user.profileUrl" target="_blank" rel="noopener">Open on GitHub</a>
          </div>
        </section>
      }

      <div class="footer-links">
        <a routerLink="/search">Back to Search</a>
        <a routerLink="/favorites">Go to Favorites</a>
      </div>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

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
        gap: 1rem;
        margin: 1rem 0;
      }

      .panel {
        border: 1px solid #d2d5dc;
        border-radius: 8px;
        padding: 1rem;
        display: grid;
        gap: 0.6rem;
      }

      textarea,
      input {
        width: 100%;
        margin-top: 0.25rem;
        padding: 0.45rem;
      }

      .actions {
        display: flex;
        gap: 0.7rem;
        align-items: center;
      }

      .footer-links {
        margin-top: 1rem;
        display: flex;
        gap: 1rem;
      }

      .muted {
        color: #5a6170;
      }

      .error {
        color: #a02020;
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
  tagsText = '';

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
      this.tagsText = existing?.tags.join(', ') ?? '';

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
      const tags = parseTags(this.tagsText);
      const existingId = this.existingFavoriteId();

      if (existingId) {
        const updated = await this.favoritesService.updateFavorite(existingId, {
          note: this.note,
          tags,
        });
        this.existingFavoriteId.set(updated.id);
      } else {
        const created = await this.favoritesService.addFromProfile(profile, this.note, tags);
        this.existingFavoriteId.set(created.id);
      }
    } catch {
      this.error.set('Unable to save favorite right now.');
    } finally {
      this.saving.set(false);
    }
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