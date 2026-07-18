import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GithubProfile, GithubUser } from '../models/github-user.model';

type ApiEnvelope<T> = {
  data: T;
};

@Injectable({ providedIn: 'root' })
export class GithubApiService {
  private readonly http = inject(HttpClient);

  async searchUsers(username: string): Promise<GithubUser[]> {
    const query = username.trim();

    if (!query) {
      return [];
    }

    const response = await firstValueFrom(
      this.http.get<ApiEnvelope<GithubUser[]>>('/api/github/search', {
        params: { username: query },
      }),
    );

    return response.data;
  }

  async getUserProfile(login: string): Promise<GithubProfile> {
    const response = await firstValueFrom(
      this.http.get<ApiEnvelope<GithubProfile>>(`/api/github/users/${encodeURIComponent(login)}`),
    );

    return response.data;
  }
}