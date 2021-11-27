import { MongoClient, MongoClientOptions } from 'mongodb';
import { logger } from './logging';

export const createMongo = async (mongoUri: string, options: MongoClientOptions = {}): Promise<MongoClient> => {
    logger.info("Connecting to MongoDB")
    const client = await new MongoClient(process.env.MONGO_URI, options).connect();
    logger.info("Connected to MongoDB")

    return client
}