import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page-shell">
      <section class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
        <div>
          <h1 class="h2 fw-bold mb-1">History</h1>
          <p class="text-secondary mb-0">Recent searches and viewed profiles are retained until you clear them.</p>
        </div>
        <button
          class="btn btn-outline-secondary"
          (click)="clearHistory()"
          [disabled]="loading() || entries().length === 0"
        >
          Clear History
        </button>
      </section>

      @if (loading()) {
        <div class="alert alert-info py-2">Loading history...</div>
      }

      @if (error()) {
        <div class="alert alert-danger py-2">{{ error() }}</div>
      }

      @if (!loading() && entries().length === 0) {
        <div class="section-card p-4 text-secondary">No history records yet.</div>
      }

      <ul class="history-list list-unstyled mb-0">
        @for (entry of entries(); track entry.id) {
          <li class="section-card p-3 p-md-4 mb-3">
            <div>
              <strong class="fs-5">{{ entry.query }}</strong>
              <div class="meta">{{ entry.createdAt | date: 'medium' }}</div>
            </div>

            @if (entry.selectedLogin) {
              <a class="btn btn-outline-primary btn-sm" [routerLink]="['/profile', entry.selectedLogin]" [queryParams]="{ q: entry.query }">
                Open {{ entry.selectedLogin }}
              </a>
            } @else {
              <a class="btn btn-outline-primary btn-sm" [routerLink]="['/search']" [queryParams]="{ q: entry.query }">Run Search</a>
            }
          </li>
        }
      </ul>
    </main>
  `,
  styles: [
    `
      .history-list {
        margin-top: 1rem;
      }

      .history-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.8rem;
      }

      .meta {
        color: #5d6574;
        font-size: 0.88rem;
      }
    `,
  ],
})
export class HistoryPageComponent {
  private readonly historyService = inject(HistoryService);

  readonly entries = this.historyService.entries;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.historyService.refresh();
    } catch {
      this.error.set('Unable to load history.');
    } finally {
      this.loading.set(false);
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await this.historyService.clear();
    } catch {
      this.error.set('Unable to clear history right now.');
    }
  }
}