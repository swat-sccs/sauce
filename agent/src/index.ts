import 'dotenv/config';
import 'reflect-metadata'; // needed for joiful to work
import passport from 'passport';
import express from 'express';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import { userRouter } from './user';
import argon2 from 'argon2';
import { logger } from './util';
import { forwardingRouter } from './forwardFile';
import { minecraftRouter } from './minecraft';

const app = express();

app.use(express.json());
app.use(express.raw({ type: 'text/plain' }));

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

app.use('/newUser', userRouter);
app.use('/forwardFile', forwardingRouter);
app.use('/mcWhitelist', minecraftRouter);

app.use((err, req, res, next) => {
  logger.error(err);

  res.status(500).send(err.toString());
});

const port = process.env.PORT || 3001;
logger.info(`Listening on port ${port}`);
app.listen(port);
