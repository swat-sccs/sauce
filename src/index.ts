import 'dotenv/config';
import 'reflect-metadata'; // needed for joiful to work

import MongoStore from 'connect-mongo';
import cors from 'cors';
import csrf from 'csurf';
import express from 'express';
import session from 'express-session';
import expressStaticGzip from 'express-static-gzip';
import helmet from 'helmet';
import passport from 'passport';
import LdapStrategy from 'passport-ldapauth';

import { catchErrors } from '../agent/src/util';
import { errorHandler } from './error/errorHandler';
import { HttpException } from './error/httpException';
import { LDAP_CONFIG } from './integration/ldap';
import { StaffMessageModel } from './integration/models';
import { initMongo } from './integration/mongo';
import { accountRouter } from './routes/account';
import { adminRouter } from './routes/admin';
import { docRouter } from './routes/docs';
import { loginRouter } from './routes/login';
import { mailingRouter } from './routes/mailingList';
import { minecraftRouter } from './routes/minecraft';
import { getUserInfo } from './util/authUtils';
import { doRequestId, logger, logRequest } from './util/logging';
import { limitRequestRate } from './util/rateLimits';

const initExpress = (): void => {
  const port = process.env.PORT || 3000;
  logger.info('Initializing Express');
  const app = express();

  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', process.env.TRUST_PROXY);
  }

  // security
  app.use(limitRequestRate);
  if (process.env.NODE_ENV === 'production') {
    app.use(
      helmet({
        hsts: false,
        contentSecurityPolicy: false,
      }),
    );
  }

  app.use(cors({ origin: process.env.EXTERNAL_ADDRESS }));
  app.disable('x-powered-by');

  // parsing and stuff
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(doRequestId);
  app.use(logRequest);

  // STATIC FILES
  // placed before all the passportjs and session stuff so that we don't ping LDAP, etc. on every
  // request for a stylesheet

  app.use('/static', express.static('public/'));
  app.use('/dist', expressStaticGzip('dist/', {}));

  // stupid canonical redirects
  app.use('/favicon.ico', express.static('public/favicon.ico'));
  app.use('/index.html', (req, res) => res.redirect(301, '/'));

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
      proxy: true,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // don't persist to disk but keep until you quit and reopen the browser; MongoStore also
        // expires sessions after two weeks of inactivity
      },
      name: 'sauce',
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

  app.use(csrf());
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      next(
        new HttpException(403, {
          message: 'CSRF token was invalid or missing',
          friendlyMessage:
            "Your computer made a request with an invalid CSRF token! It's possible that a malicious" +
            ' actor was attempting to do a phishing attack, or it could be a problem with our website.' +
            " We've blocked the request, but you should " +
            '<a href="mailto:staff@sccs.swarthmore.edu">contact us</a> and let us know.',
        }),
      );
    } else {
      next(err);
    }
  });

  app.use(
    catchErrors(async (req: any, res, next) => {
      // generate a csrf token so we can access it in views
      // this needs to be passed in any authenticated POST or DELETE request as a header, body param,
      // query param, etc. See https://www.npmjs.com/package/csurf#value.
      res.locals.csrfToken = req.csrfToken();

      // also, strip any incoming csrf token in the body so it doesn't annoy schema checkers or get
      // printed in logs
      delete req.body._csrf;

      // set the user object so we don't have to pass it everywhere
      res.locals.user = req.user;
      res.locals.path = req.path;

      const time = Date.now();

      const msg = await StaffMessageModel.findOne()
        .where('startDate')
        .lte(time)
        .where('endDate')
        .gte(time)
        .exec();

      if (msg) {
        logger.debug(`Displaying staff message ${msg._id}`);
        res.locals.staffMessage = msg.message;
      }

      next();
    }),
  );

  // ROUTER CONFIG
  app.use('/', loginRouter);
  app.use('/account', accountRouter);
  app.use('/admin', adminRouter);
  app.use('/lists', mailingRouter);
  app.use('/minecraft', minecraftRouter);
  app.use('/docs', docRouter);

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
  if (process.env.NODE_ENV === 'production') {
    logger.setSettings({
      displayDateTime: false,
      colorizePrettyLogs: false,
    });
    logger.info('Configured for production environment');
  }

  logger.info('Starting SAUCE server');

  initExpress();
};

init();
