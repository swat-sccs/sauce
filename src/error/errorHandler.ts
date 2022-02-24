import { ErrorRequestHandler } from 'express';

import { logger } from '../util/logging';
import { HttpException } from './httpException';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof HttpException) {
    if (err.status >= 500) {
      logger.error(`HTTP error ${err.status}${err.message ? ': ' + err.message : ''}`);
    } else if (err.status >= 400) {
      logger.warn(`HTTP error ${err.status}${err.message ? ': ' + err.message : ''}`);
    } else {
      logger.info(`HTTP exception ${err.status}: ${err.message}`);
    }

    res.status(err.status).render('error', err);
  } else {
    logger.error('Error processing request', err);
    if (!res.headersSent) {
      return res.status(500).render('error', new HttpException(500, { showFooter: false }));
    }
  }
};
