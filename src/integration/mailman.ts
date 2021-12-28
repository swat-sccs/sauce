import { response } from 'express';
import axios from 'axios';
import { logger } from '../util/logging';

// TODO potentially add caching? the mailman API is stupid slow
export const listMailingLists = async (): Promise<any[]> => {
  const response = await axios.get(`${process.env.MAILMAN_URL}/lists`, {
    auth: {
      username: process.env.MAILMAN_USER,
      password: process.env.MAILMAN_PW,
    },
  });

  if (response.status != 200) {
    logger.error(`Mailman server request error: ${response.statusText}`);
    throw Error(`HTTP request error: ${response.status} ${response.statusText}`);
  }

  return response.data['entries'];
};
