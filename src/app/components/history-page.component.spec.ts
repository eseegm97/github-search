import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryEntry } from '../models/history-entry.model';
import { HistoryService } from '../services/history.service';
import { HistoryPageComponent } from './history-page.component';

describe('HistoryPageComponent', () => {
  let fixture: ComponentFixture<HistoryPageComponent>;
  let component: HistoryPageComponent;

  const entryState = signal<HistoryEntry[]>([
    { id: 'h1', query: 'octocat', createdAt: '2026-01-01T00:00:00.000Z' },
  ]);

  const serviceMock = {
    entries: entryState.asReadonly(),
    refresh: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(async () => {
    entryState.set([{ id: 'h1', query: 'octocat', createdAt: '2026-01-01T00:00:00.000Z' }]);
    serviceMock.refresh.mockReset();
    serviceMock.clear.mockReset();
    serviceMock.refresh.mockResolvedValue(undefined);
    serviceMock.clear.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent],
      providers: [
        provideRouter([]),
        { provide: HistoryService, useValue: serviceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads history entries on init', () => {
    expect(serviceMock.refresh).toHaveBeenCalled();
    expect(component.entries()).toHaveLength(1);
  });

  it('clears history via service action', async () => {
    await component.clearHistory();

    expect(serviceMock.clear).toHaveBeenCalled();
  });

  it('surfaces error when clear fails', async () => {
    serviceMock.clear.mockRejectedValue(new Error('clear failed'));

    await component.clearHistory();

    expect(component.error()).toBe('Unable to clear history right now.');
  });
});
