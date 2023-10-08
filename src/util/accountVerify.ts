import argon2 from 'argon2';
import { nanoid } from 'nanoid';

import { VerifyEmailRequestModel } from '../integration/models';
import { logger } from './logging';

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;

export const createVerifyAccountRequest = async (
  email: string,
  expireHours = 12 * 7,
  suppressEmail = false,
): Promise<[string, string]> => {
  logger.debug(`Creating account verification ID/key pair for ${email}`);
  const verifyId = nanoid();
  const verifyKey = nanoid();

  const expireDate = new Date();
  expireDate.setHours(expireDate.getHours() + expireHours);

  await new VerifyEmailRequestModel({
    _id: verifyId,
    key: await argon2.hash(verifyKey, { raw: false }),
    email: email,
    timestamp: expireDate,
    suppressEmail: suppressEmail,
  }).save();

  return [verifyId, verifyKey];
};
