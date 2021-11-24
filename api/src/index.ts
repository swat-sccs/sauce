import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {logger, doRequestId} from './logging'

import { attachRoutes } from './routes'

const initExpress = (): void => {
  const port = process.env.PORT || 3000
  logger.info("Initializing Express")
  const app = express();

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded())
  app.use(doRequestId)
  
  attachRoutes(app)
  app.listen(process.env.port || 3000)
  logger.info(`Listening on port ${port}`)
}

const init = async (): Promise<void> => {
  logger.info("Starting SAUCE API")
  initExpress()
}

init()