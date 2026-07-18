export type HistoryEntry = {
  id: string;
  query: string;
  selectedLogin?: string;
  selectedAt?: string | Date;
  createdAt: string | Date;
};