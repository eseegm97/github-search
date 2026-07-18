import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchPageComponent } from './search-page.component';
import { GithubApiService } from '../services/github-api.service';
import { HistoryService } from '../services/history.service';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('SearchPageComponent', () => {
  let fixture: ComponentFixture<SearchPageComponent>;
  let component: SearchPageComponent;

  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  const githubApiMock = {
    searchUsers: vi.fn(),
  };

  const historyServiceMock = {
    addEntry: vi.fn(),
  };

  beforeEach(async () => {
    githubApiMock.searchUsers.mockReset();
    historyServiceMock.addEntry.mockReset();
    queryParamMap$.next(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [SearchPageComponent],
      providers: [
        provideRouter([]),
        { provide: GithubApiService, useValue: githubApiMock },
        { provide: HistoryService, useValue: historyServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('searches with debounce and updates result list', async () => {
    githubApiMock.searchUsers.mockResolvedValue([
      { githubId: 1, username: 'octocat', avatarUrl: 'a', profileUrl: 'p' },
    ]);

    component.onQueryChange('octocat');
    await wait(380);

    expect(githubApiMock.searchUsers).toHaveBeenCalledWith('octocat');
    expect(component.results()[0]?.username).toBe('octocat');
  });

  it('hydrates search query from route params (select/revisit flow)', async () => {
    githubApiMock.searchUsers.mockResolvedValue([]);

    queryParamMap$.next(convertToParamMap({ q: 'from-history' }));
    await wait(380);

    expect(component.query()).toBe('from-history');
    expect(githubApiMock.searchUsers).toHaveBeenCalledWith('from-history');
  });

  it('saves search to history with trimmed query', async () => {
    historyServiceMock.addEntry.mockResolvedValue(undefined);
    component.query.set('  octocat  ');

    await component.onSubmitSearch();

    expect(historyServiceMock.addEntry).toHaveBeenCalledWith({ query: 'octocat' });
  });

  it('shows error when history save fails', async () => {
    historyServiceMock.addEntry.mockRejectedValue(new Error('save failed'));
    component.query.set('octocat');

    await component.onSubmitSearch();

    expect(component.error()).toBe('Search ran, but history could not be saved.');
  });
});
