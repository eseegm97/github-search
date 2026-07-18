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
    <main class="page-shell">
      <section class="hero mb-4">
        <h1 class="display-6 fw-bold mb-2">Discover GitHub Profiles</h1>
        <p class="text-secondary mb-0">
          Search by username. Exact matches are surfaced first, followed by partial matches.
        </p>
      </section>

      <section class="section-card p-3 p-md-4 mb-4">
        <form class="row g-3 align-items-end" (ngSubmit)="onSubmitSearch()">
          <div class="col-12 col-md">
            <label for="search" class="form-label fw-semibold">Username</label>
            <input
              id="search"
              name="search"
              class="form-control form-control-lg"
              [ngModel]="query()"
              (ngModelChange)="onQueryChange($event)"
              placeholder="Type a GitHub username"
              autocomplete="off"
            />
          </div>
          <div class="col-12 col-md-auto">
            <button class="btn btn-primary btn-lg w-100" type="submit" [disabled]="!query().trim()">
              Save Search
            </button>
          </div>
        </form>

        @if (searching()) {
          <div class="alert alert-info mt-3 mb-0 py-2">Searching...</div>
        }

        @if (error()) {
          <div class="alert alert-danger mt-3 mb-0 py-2">{{ error() }}</div>
        }
      </section>

      <section class="section-card p-3 p-md-4">
        <h2 class="h4 fw-semibold mb-3">Results</h2>
        @if (!query().trim()) {
          <p class="text-secondary mb-0">Start typing to search for users.</p>
        } @else if (!searching() && results().length === 0) {
          <p class="text-secondary mb-0">No users found for "{{ query().trim() }}".</p>
        } @else {
          <ul class="list-group list-group-flush">
            @for (user of results(); track user.githubId) {
              <li class="list-group-item px-0 py-3 d-flex align-items-center gap-3">
                <img class="avatar" [src]="user.avatarUrl" [alt]="user.username + ' avatar'" loading="lazy" />
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center w-100 gap-2">
                  <div class="d-flex align-items-center gap-2">
                    <strong class="fs-5">{{ user.username }}</strong>
                    @if (isExactMatch(user)) {
                      <span class="badge rounded-pill text-bg-success">Exact</span>
                    }
                  </div>
                  <a
                    class="btn btn-outline-primary btn-sm"
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

    </main>
  `,
  styles: [
    `
      .hero {
        background: linear-gradient(145deg, rgba(13, 110, 253, 0.14), rgba(0, 184, 148, 0.12));
        border: 1px solid #cfe0ff;
        border-radius: 16px;
        padding: 1.25rem;
      }

      .avatar {
        width: 54px;
        height: 54px;
        border-radius: 50%;
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