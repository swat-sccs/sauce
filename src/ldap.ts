import LdapAuth from 'ldapauth-fork'
import ldap from 'ldapjs'
import { logger } from './logging'

export const LDAP_CONFIG: LdapAuth.Options = {
    url: process.env.LDAP_URL,
    searchBase: process.env.LDAP_SEARCH_BASE,
    searchFilter: "(uid={{username}})"
}

export const ldapClient = ldap.createClient(LDAP_CONFIG)
ldapClient.on('error', (err) => {
    logger.error(`LdapClient error: ${err}`)
})

export const searchAsyncUid = (ldapClient, uid) => {
    return new Promise((resolve, reject) => {
        ldapClient.search(process.env.LDAP_SEARCH_BASE, { filter: `(uid=${uid})`, scope: 'sub' },
            (err, res) => {
                let found = false
                if (err) {
                    logger.error(`LDAP search error: ${err}`)
                    reject(err)
                }
                res.on('error', (err) => {
                    logger.error(`LDAP search error: ${err}`)
                    reject(err)
                });
                res.on('searchEntry', (entry) => {
                    found = true
                    resolve(entry.object)
                });
                res.on('end', (result) => {
                    if (!found) {
                        resolve(null)
                    }
                });
            });
    });
}