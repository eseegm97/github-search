export type GithubUser = {
  githubId: number;
  username: string;
  avatarUrl: string;
  profileUrl: string;
};

export type GithubProfile = GithubUser & {
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
};