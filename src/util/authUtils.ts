import { Handler } from 'express';
import { HttpException } from '../error/httpException';
import { ldapClient } from '../integration/ldap';
import { searchAsync, searchAsyncUid } from './ldapUtils';
import { logger } from './logging';

export const isLoggedIn: Handler = (req: any, res, next) => {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) {
    logger.debug(`Request authenticated with user ${req.user?.uid}`);
    return next();
  }
  logger.debug(`Request not authenticated; redirecting to login`);

  res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
};

export const isAdmin: Handler = async (req: any, res, next) => {
  try {
    // that is, check if logged in and if so we'll run the inner bit
    isLoggedIn(req, res, () => {
      if (req.user) {
        if (req.user.admin) {
          logger.debug(`${req.user.uid} is an admin`);
          next();
        } else {
          throw new HttpException(403, {
            message: `${req.user.uid} is not an admin and is unauthorized`,
          });
        }
      } else {
        throw Error("req.user didn't exist on an authenticated request");
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getUserInfo = async (uid: string): Promise<Express.User | false> => {
  const [user, admins] = await Promise.all([
    searchAsyncUid(ldapClient, uid),
    // is there a better way to do this than getting the entire list of staff members
    // and if there isn't, can we cache this or something
    searchAsync(
      ldapClient,
      `(&(cn=${process.env.LDAP_ADMIN_GROUP}))`,
      process.env.LDAP_SEARCH_BASE_GROUP,
    )
      .then((value) => value.memberUid)
      .catch((err) => {
        // if there's an error getting admins, log it but we shouldn't explode if LDAP doesn't
        // want to give us the admin list
        logger.error('LDAP error getting admin list:', err);
        return [];
      }),
  ]);
  if (user) {
    user.admin = admins.includes(user.uid);

    logger.debug(`Found LDAP entry for ${uid} ${user.admin ? '(admin)' : ''}`);

    return user;
  } else {
    logger.warn(`Could not find LDAP entry for ${uid}`);
    return false;
  }
};
