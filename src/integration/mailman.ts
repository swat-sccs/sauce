import axios from 'axios';
import { logger } from '../util/logging';

const api = axios.create({
  baseURL: process.env.MAILMAN_URL,
  auth: {
    username: process.env.MAILMAN_USER,
    password: process.env.MAILMAN_PW,
  },
  validateStatus: (status) => true, // we'll handle errors ourselves
});

// TODO potentially add caching? the mailman API is stupid slow
export const listMailingLists = async (): Promise<any[]> => {
  logger.debug('Enumerating mailing lists from server');
  const response = await api.get('/lists');

  if (response.status != 200) {
    logger.error(`Mailman server request error: ${response.statusText}`);
    throw Error(`HTTP request error: ${response.status} ${response.statusText}`);
  }

  logger.debug(`Found ${response.data['entries'].length} lists`);
  return response.data['entries'];
};

export const getMailingList = async (name: string): Promise<any> => {
  const response = await api.get(`/lists/${name}.sccs.swarthmore.edu`);

  if (response.status === 404) {
    logger.debug(`Mailing list ${name} not found`);
    return null;
  } else if (response.status != 200) {
    logger.error(`Mailman server request error: ${response.statusText}`);
    throw Error(`HTTP request error: ${response.status} ${response.statusText}`);
  } else {
    logger.debug(`Found mailing list ${name}`);
    return response.data;
  }
};

export const addMailingList = async (name: string, ownerEmail: string) => {
  logger.debug(`Creating list ${name} owned by ${ownerEmail}`);
  const createResponse = await api.post('/lists', { fqdn_listname: `${name}@sccs.swarthmore.edu` });

  if (createResponse.status != 201) {
    const errDesc =
      createResponse.data['description'] || createResponse.status + ' ' + createResponse.statusText;
    throw Error(`Error creating mailing list: ${errDesc}`);
  }

  logger.info(`Created mailing list ${name}`);
  logger.debug(`Adding ${ownerEmail} as owner of mailing list ${name}`);

  const addOwnerResponse = await api.post('/members', {
    list_id: `${name}.sccs.swarthmore.edu`,
    subscriber: ownerEmail,
    role: 'owner',
  });

  if (addOwnerResponse.status != 201) {
    const errDesc =
      addOwnerResponse.data['description'] ||
      addOwnerResponse.status + ' ' + addOwnerResponse.statusText;
    throw Error(`Error adding owner to mailing list: ${errDesc}`);
  }

  logger.info(`Added ${ownerEmail} as owner of mailing list ${name}`);
};
