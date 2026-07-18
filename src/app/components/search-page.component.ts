import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, from, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { GithubUser } from '../models/github-user.model';
import { GithubApiService } from '../services/github-api.service';
import { HistoryService } from '../services/history.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      <h1>GitHub Gateway</h1>
      <p>Search GitHub users by login. Exact matches are surfaced first, followed by partial matches.</p>

      <form class="search-form" (ngSubmit)="onSubmitSearch()">
        <label for="search">Username</label>
        <div class="search-row">
          <input
            id="search"
            name="search"
            [ngModel]="query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="Type a GitHub username"
            autocomplete="off"
          />
          <button type="submit" [disabled]="!query().trim()">Save Search</button>
        </div>
      </form>

      @if (searching()) {
        <p class="status">Searching...</p>
      }

      @if (error()) {
        <p class="status error">{{ error() }}</p>
      }

      <section class="panel">
        <h2>Results</h2>
        @if (!query().trim()) {
          <p>Start typing to search for users.</p>
        } @else if (!searching() && results().length === 0) {
          <p>No users found for "{{ query().trim() }}".</p>
        } @else {
          <ul class="result-list">
            @for (user of results(); track user.githubId) {
              <li>
                <img [src]="user.avatarUrl" [alt]="user.username + ' avatar'" loading="lazy" />
                <div>
                  <div class="result-title">
                    <strong>{{ user.username }}</strong>
                    @if (isExactMatch(user)) {
                      <span class="badge">Exact</span>
                    }
                  </div>
                  <a
                    [routerLink]="['/profile', user.username]"
                    [queryParams]="{ q: query().trim() }"
                  >
                    View Profile
                  </a>
                </div>
              </li>
            }
          </ul>
        }
      </section>

      <nav class="actions">
        <a routerLink="/search">Search</a>
        <a routerLink="/favorites">Favorites</a>
        <a routerLink="/history">History</a>
      </nav>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 960px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      .search-form {
        margin: 1rem 0;
      }

      .search-row {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.5rem;
      }

      input {
        flex: 1;
        padding: 0.6rem;
      }

      button {
        padding: 0.6rem 1rem;
      }

      .panel {
        border: 1px solid #d2d5dc;
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
      }

      .result-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .result-list li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        border: 1px solid #e4e7ee;
        border-radius: 6px;
        padding: 0.75rem;
      }

      img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
      }

      .result-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .badge {
        font-size: 0.75rem;
        background: #e8f5eb;
        color: #185a28;
        border-radius: 999px;
        padding: 0.1rem 0.45rem;
      }

      .status {
        margin-top: 0.5rem;
      }

      .error {
        color: #a02020;
      }

      .actions {
        display: flex;
        gap: 1rem;
      }

      @media (max-width: 640px) {
        .search-row {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class SearchPageComponent {
  private readonly githubApi = inject(GithubApiService);
  private readonly historyService = inject(HistoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryInput$ = new Subject<string>();

  readonly query = signal('');
  readonly results = signal<GithubUser[]>([]);
  readonly searching = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.queryInput$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((value) => {
          const trimmed = value.trim();

          if (!trimmed) {
            this.results.set([]);
            this.error.set(null);
            return of<GithubUser[]>([]);
          }

          this.searching.set(true);
          this.error.set(null);

          return from(this.githubApi.searchUsers(trimmed)).pipe(
            catchError(() => {
              this.error.set('Unable to search GitHub users right now.');
              return of<GithubUser[]>([]);
            }),
            finalize(() => {
              this.searching.set(false);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => {
        this.results.set(users);
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const q = params.get('q')?.trim();

      if (q && q !== this.query()) {
        this.query.set(q);
        this.queryInput$.next(q);
      }
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.queryInput$.next(value);
  }

  async onSubmitSearch(): Promise<void> {
    const trimmed = this.query().trim();

    if (!trimmed) {
      return;
    }

    try {
      await this.historyService.addEntry({ query: trimmed });
    } catch {
      this.error.set('Search ran, but history could not be saved.');
    }
  }

  isExactMatch(user: GithubUser): boolean {
    return user.username.toLowerCase() === this.query().trim().toLowerCase();
  }
}