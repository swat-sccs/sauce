import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { PasswordResetRequestModel } from '../integration/models';
import { logger } from './logging';

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;

export const createPasswordResetRequest = async (
  uid: string,
  expireHours = 1,
  suppressEmail = false,
): Promise<[string, string]> => {
  logger.debug(`Creating password reset ID/key pair for ${uid}`);
  const resetId = nanoid();
  const resetKey = nanoid();

  const expireDate = new Date();
  expireDate.setHours(expireDate.getHours() + expireHours);

  await new PasswordResetRequestModel({
    _id: resetId,
    key: await argon2.hash(resetKey, { raw: false }),
    user: uid,
    timestamp: expireDate,
    suppressEmail: suppressEmail,
  }).save();

  return [resetId, resetKey];
};
