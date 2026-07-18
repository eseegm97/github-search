import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HistoryService } from '../services/history.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <h1>History</h1>
      <p>Recent searches and viewed profiles are retained until you clear them.</p>

      <div class="toolbar">
        <button (click)="clearHistory()" [disabled]="loading() || entries().length === 0">Clear History</button>
      </div>

      @if (loading()) {
        <p>Loading history...</p>
      }

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (!loading() && entries().length === 0) {
        <p>No history records yet.</p>
      }

      <ul class="history-list">
        @for (entry of entries(); track entry.id) {
          <li>
            <div>
              <strong>{{ entry.query }}</strong>
              <div class="meta">{{ entry.createdAt | date: 'medium' }}</div>
            </div>

            @if (entry.selectedLogin) {
              <a [routerLink]="['/profile', entry.selectedLogin]" [queryParams]="{ q: entry.query }">
                Open {{ entry.selectedLogin }}
              </a>
            } @else {
              <a [routerLink]="['/search']" [queryParams]="{ q: entry.query }">Run Search</a>
            }
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

      .toolbar {
        margin: 1rem 0;
      }

      .history-list {
        list-style: none;
        margin: 1rem 0;
        padding: 0;
        display: grid;
        gap: 0.7rem;
      }

      .history-list li {
        border: 1px solid #e3e6ee;
        border-radius: 8px;
        padding: 0.7rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.8rem;
      }

      .meta {
        color: #5d6574;
        font-size: 0.88rem;
      }

      .error {
        color: #a02020;
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