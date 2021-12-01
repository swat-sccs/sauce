import passport from 'passport';
import LdapStrategy from 'passport-ldapauth';
import session from 'express-session';

import { logger } from './logging';
import { LDAP_CONFIG, ldapClient, searchAsyncUid } from './ldap';
import { Handler } from 'express';
import MongoStore from 'connect-mongo';

export const isLoggedIn: Handler = (req, res, next) => {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) {
    // @ts-expect-error Doesn't realize that users have a UID property
    logger.debug(`Request authenticated with user ${req.user?.uid}`);
    return next();
  }
  logger.debug(`Request not authenticated; redirecting to login`);

  res.redirect('/login');
};

export const configureAuth = (app: any): void => {
  passport.use(
    new LdapStrategy({
      server: LDAP_CONFIG,
    }),
  );

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      saveUninitialized: false,
      store: MongoStore.create({ clientPromise: app.locals.mongo }),
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
      const user = await searchAsyncUid(ldapClient, uid);
      if (user) {
        logger.debug(`Found LDAP entry for ${uid}`);
        done(null, user);
      } else {
        logger.warn(`Could not find LDAP entry for ${uid}`);
        done(null, user);
      }
    } catch (err) {
      done(err);
    }
  });
};
