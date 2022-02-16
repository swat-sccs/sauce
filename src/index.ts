import 'dotenv/config';
import 'reflect-metadata'; // needed for joiful to work
import MongoStore from 'connect-mongo';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import LdapStrategy from 'passport-ldapauth';
import expressStaticGzip from 'express-static-gzip';
import { LDAP_CONFIG } from './integration/ldap';
import { doRequestId, logger, logRequest } from './util/logging';
import { initMongo } from './integration/mongo';
import { accountRouter } from './routes/account';
import { adminRouter } from './routes/admin';
import { loginRouter } from './routes/login';
import { getUserInfo } from './util/authUtils';
import { HttpException } from './error/httpException';
import { errorHandler } from './error/errorHandler';
import { mailingRouter } from './routes/mailingList';
import { minecraftRouter } from './routes/minecraft';
import { docRouter } from './routes/docs';

const initExpress = (): void => {
  const port = process.env.PORT || 3000;
  logger.info('Initializing Express');
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(doRequestId);
  app.use(logRequest);

  // DB CONFIG
  const mongoPromise = initMongo(process.env.MONGO_URI);

  // AUTH CONFIG
  passport.use(
    new LdapStrategy({
      server: LDAP_CONFIG,
    }),
  );

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      saveUninitialized: false,
      store: MongoStore.create({ clientPromise: mongoPromise }),
      cookie: {
        httpOnly: true,
        maxAge: 60 * 60 * 1000,
      },
      resave: false,
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    logger.debug(`Serializing user ${user['uid']}`);
    done(null, user.uid);
  });

  passport.deserializeUser(async (uid: string, done) => {
    logger.debug(`Deserializing user ${uid}`);
    try {
      done(null, await getUserInfo(uid));
    } catch (err) {
      logger.error('Error deserializing user', err);
      done(err);
    }
  });

  // ROUTER CONFIG
  app.use('/', loginRouter);
  app.use('/account', accountRouter);
  app.use('/admin', adminRouter);
  app.use('/lists', mailingRouter);
  app.use('/minecraft', minecraftRouter);
  app.use('/docs', docRouter);

  app.use('/static', express.static('public/'));
  app.use('/dist', expressStaticGzip('dist/', {}));

  app.use((req: any, res, next) => {
    next(new HttpException(404, { message: req.path }));
  });

  // error handler
  app.use(errorHandler);

  app.set('view engine', 'pug');

  app.listen(+port || 3000, '0.0.0.0', null);
  logger.info(`Listening on port ${port}`);
};

const init = async (): Promise<void> => {
  logger.info('Starting SAUCE server');
  initExpress();
};

init();
