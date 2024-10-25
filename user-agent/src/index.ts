import 'dotenv/config';
import 'reflect-metadata';

import argon2 from 'argon2';
import express from 'express';
import passport from 'passport';
import { Strategy as BearerStrategy } from 'passport-http-bearer';

import { forwardingRouter } from './forwardFile';
import { sshRouter } from './sshKeys';
import { userRouter } from './user';
import { denyRateLimited, logger, penalizeLimiter } from './util';

const app = express();

app.use(denyRateLimited);

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
app.use(
  passport.authenticate('bearer', { session: false, failWithError: true }),
  (err, req, res, next) => {
    logger.warn(`Invalid token provided from ${req.ip}`);
    penalizeLimiter(req, res, next);
    res.sendStatus(401);
  },
);
app.use('/newUser', userRouter);
app.use('/forwardFile', forwardingRouter);
app.use('/sshFile', sshRouter);

app.use((err, req, res, next) => {
  logger.error(err);

  res.status(500).send(err.toString());
});

const bindAddr = process.env.BIND_ADDR || null;
const port = process.env.PORT || 3001;
if (bindAddr) {
  logger.info(`Listening on ${bindAddr}:${port}`);
  app.listen(+port, bindAddr);
} else {
  logger.warn('Listening on all interfaces. This is a security risk!');
  logger.info(`Listening on port ${port}`);
  app.listen(+port);
}
