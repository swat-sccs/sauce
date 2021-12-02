import 'dotenv/config';
import 'reflect-metadata'; // needed for joiful to work
import express from 'express';
import cors from 'cors';

import { logger, doRequestId, logRequest } from './logging';

import { attachRoutes } from './routes';
import { configureAuth } from './auth';
import { createMongo } from './mongo';
import { Mongoose } from 'mongoose';

const initExpress = (): void => {
  const port = process.env.PORT || 3000;
  logger.info('Initializing Express');
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(doRequestId);
  app.use(logRequest);

  app.locals.mongo = createMongo(process.env.MONGO_URI);

  configureAuth(app);
  attachRoutes(app);

  // error handler
  app.use((err, req, res: any, next) => {
    logger.error(err);
    if (!res.headersSent) {
      return res.status(500).render('500');
    } else {
      next(err);
    }
  });

  app.set('view engine', 'pug');

  app.listen(process.env.port || 3000);
  logger.info(`Listening on port ${port}`);
};

const init = async (): Promise<void> => {
  logger.info('Starting SAUCE server');
  initExpress();
};

init();
