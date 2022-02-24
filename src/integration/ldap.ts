import LdapAuth from 'ldapauth-fork';
import ldap from 'ldapjs';

import { logger } from '../util/logging';

export const LDAP_CONFIG: LdapAuth.Options = {
  url: process.env.LDAP_URL,
  searchBase: process.env.LDAP_SEARCH_BASE,
  searchFilter: '(uid={{username}})',
};

export const ldapClient = ldap.createClient(LDAP_CONFIG);

ldapClient.on('error', (err) => {
  logger.error(`LdapClient error: ${err}`);
});
