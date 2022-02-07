import 'dotenv/config';
import 'reflect-metadata'; // needed for joiful to work
import passport from 'passport';
import { Logger } from 'tslog';
import express from 'express';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { apiRouter } from './api';
import argon2 from 'argon2';

export const logger: Logger = new Logger();

const app = express();

app.use(express.json());

passport.use(
  'bearer',
  new BearerStrategy(async function (token, done) {
    if (await argon2.verify(process.env.SECRET_HASH, token)) {
      done(null, true);
    } else {
      done(null, false);
    }
  }),
);

app.use(passport.initialize());

app.use(apiRouter);

app.use((err, req, res, next) => {
  logger.error(err);

  res.status(500).send(err.toString());
});

app.listen(process.env.PORT || 3001);
