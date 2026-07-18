import { describe, expect, it } from 'vitest';
import { mergeExactAndPartialResults, sortExactFirst } from '../routes/github.routes';

describe('sortExactFirst', () => {
  it('prioritizes exact username matches then alphabetic fallback', () => {
    const result = sortExactFirst(
      [
        { githubId: 1, username: 'other-user', avatarUrl: '1', profileUrl: '1' },
        { githubId: 2, username: 'ExactUser', avatarUrl: '2', profileUrl: '2' },
        { githubId: 3, username: 'another-user', avatarUrl: '3', profileUrl: '3' },
      ],
      'exactuser',
    );

    expect(result.map((item) => item.username)).toEqual([
      'ExactUser',
      'another-user',
      'other-user',
    ]);
  });

  it('merges exact lookup first and deduplicates partial results', () => {
    const exact = { githubId: 2, username: 'ExactUser', avatarUrl: '2', profileUrl: '2' };
    const merged = mergeExactAndPartialResults('exactuser', exact, [
      { githubId: 2, username: 'ExactUser', avatarUrl: '2', profileUrl: '2' },
      { githubId: 1, username: 'other-user', avatarUrl: '1', profileUrl: '1' },
    ]);

    expect(merged.map((item) => item.username)).toEqual(['ExactUser', 'other-user']);
  });
});