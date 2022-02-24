import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

import { logger } from '../util/logging';

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
