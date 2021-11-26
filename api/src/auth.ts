
import passport from 'passport'
import LdapStrategy from 'passport-ldapauth'
import session from 'express-session'

import { logger } from './logging'
import { Handler } from 'express'

export const isLoggedIn: Handler = (req, res, next) => {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        // @ts-expect-error Doesn't realize that users have a UID property
        logger.debug(`Request authenticated with user ${req.user?.uid}`)
        return next();
    }
    logger.debug(`Request not authenticated; redirecting to login`)

    res.redirect('/login')
}

export const configureAuth = (app: any): void => {
    passport.use(new LdapStrategy({
        server: {
            url: process.env.LDAP_URL,
            searchBase: process.env.LDAP_SEARCH_BASE,
            searchFilter: "(uid={{username}})"
        }
    }))
    app.use(session({
        secret: 'beans',
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            maxAge: 60 * 60 * 1000
        }
    }))
    app.use(passport.initialize())
    app.use(passport.session())

    passport.serializeUser((user: any, done) => {
        logger.debug(`Serializing user ${user['uid']}`)
        done(null, user)
    })

    passport.deserializeUser((user: any, done) => {
        logger.debug(`Deserializing user ${user['uid']}`)
        done(null, user)
    })
}