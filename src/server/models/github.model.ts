export type GithubUserSummary = {
  githubId: number;
  username: string;
  avatarUrl: string;
  profileUrl: string;
};

export type GithubUserProfile = {
  githubId: number;
  username: string;
  name: string | null;
  avatarUrl: string;
  profileUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
};