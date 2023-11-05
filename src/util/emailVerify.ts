import argon2 from 'argon2';
import { nanoid } from 'nanoid';

import { VerifyEmailRequestModel } from '../integration/models';
import { logger } from './logging';

const USERNAME_REGEX = /^[a-z][-a-z0-9]*$/;

export const createEmailVerificationRequest = async (
    email:string,
  expireHours = 1,
  suppressEmail = false,
): Promise<[string, string]> => {
  const resetId = nanoid();
  const resetKey = nanoid();

  const expireDate = new Date();
  expireDate.setHours(expireDate.getHours() + expireHours);


  // Maybe add email?
  await new VerifyEmailRequestModel({
    _id: resetId,
    email: email,
    key: await argon2.hash(resetKey, { raw: false }),
    timestamp: expireDate,
    suppressEmail: suppressEmail,
  }).save();

  return [resetId, resetKey];
};
