import axios from 'axios';
import { EmailForwardingConfig } from '../controllers/accountController';
import { CreateAccountData } from '../functions/createAccount';
import { logger } from '../util/logging';

const localAgent = axios.create({
  baseURL: process.env.LOCAL_AGENT_URL,
  headers: {
    Authorization: `Bearer ${process.env.LOCAL_AGENT_TOKEN}`,
  },
});

export const createLocalUser = async (user: CreateAccountData) => {
  await localAgent.post(`/newUser/${user.classYear}/${user.username}`);
};

export const modifyForwardFile = async (user: any, forward: EmailForwardingConfig) => {
  let forwardingString = '';
  if (forward.forwardSwarthmore) {
    forwardingString += `${user.swatmail}\n`;
  }

  if (forward.forwardCustom) {
    forwardingString += `${forward.customEmail}\n`;
  }

  if (forward.forwardLocal) {
    forwardingString += `\\${user.uid}\n`;
  }

  await localAgent.post(`/forwardFile/${user.classYear}/${user.uid}`, forwardingString, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export const getForwardFile = async (user: any): Promise<string> => {
  return (await localAgent.get(`/forwardFile/${user.classYear}/${user.uid}`)).data;
};

export const whitelistMinecraftUser = async (uuid: string): Promise<void> => {
  await localAgent.post(`/mcWhitelist/${uuid}`);
};

export const unWhitelistMinecraftUser = async (uuid: string): Promise<void> => {
  await localAgent.delete(`/mcWhitelist/${uuid}`);
};
