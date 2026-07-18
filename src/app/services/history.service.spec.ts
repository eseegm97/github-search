import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
  it('refresh loads history entries', async () => {
    TestBed.configureTestingModule({
      providers: [HistoryService, provideHttpClient(), provideHttpClientTesting()],
    });

    const service = TestBed.inject(HistoryService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.refresh();
    http.expectOne('/api/history').flush({
      data: [{ id: 'h1', query: 'octocat', createdAt: '2026-01-01T00:00:00.000Z' }],
    });

    await promise;
    expect(service.entries()).toHaveLength(1);
  });

  it('addEntry posts payload and prepends created entry', async () => {
    TestBed.configureTestingModule({
      providers: [HistoryService, provideHttpClient(), provideHttpClientTesting()],
    });

    const service = TestBed.inject(HistoryService);
    const http = TestBed.inject(HttpTestingController);

    const promise = service.addEntry({ query: 'search query' });
    const req = http.expectOne('/api/history');

    expect(req.request.body).toEqual({ query: 'search query' });
    req.flush({ data: { id: 'h2', query: 'search query', createdAt: '2026-01-01T00:00:00.000Z' } });

    await promise;
    expect(service.entries()[0]?.id).toBe('h2');
  });

  it('clear deletes history and resets state', async () => {
    TestBed.configureTestingModule({
      providers: [HistoryService, provideHttpClient(), provideHttpClientTesting()],
    });

    const service = TestBed.inject(HistoryService);
    const http = TestBed.inject(HttpTestingController);

    const addPromise = service.addEntry({ query: 'seed' });
    http.expectOne('/api/history').flush({ data: { id: 'h1', query: 'seed', createdAt: '2026-01-01T00:00:00.000Z' } });
    await addPromise;

    const clearPromise = service.clear();
    http.expectOne('/api/history').flush({}, { status: 204, statusText: 'No Content' });
    await clearPromise;

    expect(service.entries()).toEqual([]);
  });
});
