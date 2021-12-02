import ldap from 'ldapjs';
import { logger } from './logging';

export const searchAsyncUid = (ldapClient: ldap.Client, uid: string) => {
  return searchAsync(ldapClient, `(uid=${uid})`);
};

export const searchAsync = async (
  ldapClient: ldap.Client,
  filter: string,
  base: string = process.env.LDAP_SEARCH_BASE,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    ldapClient.search(base, { filter: filter, scope: 'sub' }, (err, res) => {
      let found = false;
      if (err) {
        logger.error(`LDAP search error: ${err}`);
        reject(err);
      }
      res.on('error', (err) => {
        logger.error(`LDAP search error: ${err}`);
        reject(err);
      });
      res.on('searchEntry', (entry) => {
        found = true;
        resolve(entry.object);
      });
      res.on('end', (result) => {
        if (!found) {
          resolve(null);
        }
      });
    });
  });
};
