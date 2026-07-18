import mongoose from 'mongoose';
import { env } from './env';

let connectionAttempt: Promise<typeof mongoose> | null = null;

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionAttempt) {
    connectionAttempt = mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    await connectionAttempt;
  } finally {
    connectionAttempt = null;
  }
}