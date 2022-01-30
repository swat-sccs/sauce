import 'dotenv/config';
import 'reflect-metadata'; // needed for joiful to work
import passport from 'passport';
import { Logger } from 'tslog';
import express from 'express';
import { Strategy as BearerStrategy } from 'passport-http-bearer';

export const logger: Logger = new Logger();

const app = express();

app.use(express.json());

passport.use(
  new BearerStrategy(function (token, done) {
    if (token === process.env.SECRET) {
      done(null, true);
    } else {
      done(null, false);
    }
  }),
);
