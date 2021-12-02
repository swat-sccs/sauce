import { MongoClient } from 'mongodb';
import { logger } from '../util/logging';
import mongoose from 'mongoose';

export const initMongo = async (
  mongoUri: string,
  options: mongoose.ConnectOptions = {},
): Promise<MongoClient> => {
  logger.info('Connecting to MongoDB');

  await mongoose.connect(mongoUri, options);
  const client = mongoose.connection.getClient();

  logger.info('Connected to MongoDB');

  return client;
};
