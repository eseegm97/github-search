export type Favorite = {
  id: string;
  githubId: number;
  login: string;
  avatarUrl: string;
  profileUrl: string;
  note: string;
  tags: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
};