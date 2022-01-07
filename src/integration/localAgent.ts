import { EmailForwardingConfig } from '../controllers/accountController';
import { CreateAccountData } from '../functions/createAccount';
import { logger } from '../util/logging';

export const createLocalUser = (user: CreateAccountData) => {
  logger.error('createLocalUser not yet implemented');
};

export const modifyForwardFile = async (uid: string, forward: EmailForwardingConfig) => {
  logger.error('modifyForwardFile not yet implemented');
};

export const getForwardFile = async (uid: string): Promise<string> => {
  logger.error('getForwardFile not yet implemented');
  return '';
};
