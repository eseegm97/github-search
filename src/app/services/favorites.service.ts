import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Favorite } from '../models/favorite.model';
import { GithubProfile } from '../models/github-user.model';

type ApiEnvelope<T> = {
  data: T;
};

type UpdateFavoritePayload = {
  note?: string;
  tags?: string[];
};

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly favoritesState = signal<Favorite[]>([]);

  readonly favorites: Signal<Favorite[]> = this.favoritesState.asReadonly();

  async refresh(): Promise<void> {
    const response = await firstValueFrom(this.http.get<ApiEnvelope<Favorite[]>>('/api/favorites'));
    this.favoritesState.set(response.data);
  }

  getByLogin(login: string): Favorite | undefined {
    const lowered = login.toLowerCase();
    return this.favoritesState().find((item) => item.login.toLowerCase() === lowered);
  }

  async addFromProfile(profile: GithubProfile, note: string, tags: string[]): Promise<Favorite> {
    const response = await firstValueFrom(
      this.http.post<ApiEnvelope<Favorite>>('/api/favorites', {
        githubId: profile.githubId,
        login: profile.username,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        note,
        tags,
      }),
    );

    this.favoritesState.update((current) => [response.data, ...current.filter((f) => f.id !== response.data.id)]);
    return response.data;
  }

  async updateFavorite(id: string, payload: UpdateFavoritePayload): Promise<Favorite> {
    const response = await firstValueFrom(
      this.http.put<ApiEnvelope<Favorite>>(`/api/favorites/${encodeURIComponent(id)}`, payload),
    );

    this.favoritesState.update((current) =>
      current.map((item) => (item.id === response.data.id ? response.data : item)),
    );
    return response.data;
  }

  async deleteFavorite(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/favorites/${encodeURIComponent(id)}`));
    this.favoritesState.update((current) => current.filter((item) => item.id !== id));
  }
}