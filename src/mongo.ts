import { MongoClient } from 'mongodb';
import { logger } from './logging';
import mongoose from 'mongoose';

export const createMongo = async (
  mongoUri: string,
  options: mongoose.ConnectOptions = {},
): Promise<MongoClient> => {
  logger.info('Connecting to MongoDB');

  await mongoose.connect(process.env.MONGO_URI, options);
  const client = mongoose.connection.getClient();
  logger.info('Connected to MongoDB');

  return client;
};

export const isMongoClient = (client: any): client is MongoClient => {
  console.log(client);
  return client instanceof MongoClient;
};
