import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HistoryEntry } from '../models/history-entry.model';

type ApiEnvelope<T> = {
  data: T;
};

type AddHistoryPayload = {
  query: string;
  selectedLogin?: string;
  selectedAt?: string;
};

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly historyState = signal<HistoryEntry[]>([]);

  readonly entries: Signal<HistoryEntry[]> = this.historyState.asReadonly();

  async refresh(): Promise<void> {
    const response = await firstValueFrom(this.http.get<ApiEnvelope<HistoryEntry[]>>('/api/history'));
    this.historyState.set(response.data);
  }

  async addEntry(payload: AddHistoryPayload): Promise<HistoryEntry> {
    const response = await firstValueFrom(
      this.http.post<ApiEnvelope<HistoryEntry>>('/api/history', payload),
    );
    this.historyState.update((current) => [response.data, ...current]);
    return response.data;
  }

  async clear(): Promise<void> {
    await firstValueFrom(this.http.delete('/api/history'));
    this.historyState.set([]);
  }
}