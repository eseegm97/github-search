import mongoose, { InferSchemaType } from 'mongoose';

const favoriteProfileSchema = new mongoose.Schema(
  {
    githubId: { type: Number, required: true, unique: true, index: true },
    login: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    avatarUrl: { type: String, required: true },
    profileUrl: { type: String, required: true },
    note: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

favoriteProfileSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export type FavoriteProfileDocument = InferSchemaType<typeof favoriteProfileSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFavoritePayload = {
  githubId: number;
  login: string;
  avatarUrl: string;
  profileUrl: string;
  note?: string;
  tags?: string[];
};

export type UpdateFavoritePayload = {
  note?: string;
  tags?: string[];
};

export const FavoriteProfileModel =
  (mongoose.models['FavoriteProfile'] as mongoose.Model<FavoriteProfileDocument> | undefined) ??
  mongoose.model<FavoriteProfileDocument>('FavoriteProfile', favoriteProfileSchema);