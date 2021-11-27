require('dotenv').config()
import 'reflect-metadata'; // needed for joiful to work
import express from 'express';
import cors from 'cors';

import { logger, doRequestId, logRequest } from './logging'

import { attachRoutes } from './routes'
import { configureAuth } from './auth';

const initExpress = (): void => {
  const port = process.env.PORT || 3000
  logger.info("Initializing Express")
  const app = express();

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded())
  app.use(doRequestId)
  app.use(logRequest)

  configureAuth(app)
  attachRoutes(app)
  
  app.set('view engine', 'pug')

  app.listen(process.env.port || 3000)
  logger.info(`Listening on port ${port}`)
}

const init = async (): Promise<void> => {
  logger.info("Starting SAUCE server")
  initExpress()
}

init()