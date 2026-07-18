import mongoose, { InferSchemaType } from 'mongoose';

const searchHistorySchema = new mongoose.Schema(
  {
    query: { type: String, required: true, trim: true },
    selectedLogin: { type: String, trim: true, default: undefined },
    selectedAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
  },
);

searchHistorySchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export type SearchHistoryDocument = InferSchemaType<typeof searchHistorySchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSearchHistoryPayload = {
  query: string;
  selectedLogin?: string;
  selectedAt?: string;
};

export const SearchHistoryModel =
  (mongoose.models['SearchHistory'] as mongoose.Model<SearchHistoryDocument> | undefined) ??
  mongoose.model<SearchHistoryDocument>('SearchHistory', searchHistorySchema);