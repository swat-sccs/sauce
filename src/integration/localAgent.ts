import axios from 'axios';

import { EmailForwardingConfig, SSHConfig } from '../controllers/accountController';
import { CreateAccountData } from '../functions/createAccount';

const userAgent = axios.create({
  baseURL: process.env.USER_AGENT_URL,
  headers: {
    Authorization: `Bearer ${process.env.LOCAL_AGENT_TOKEN}`,
  },
});

const mcAgent = axios.create({
  baseURL: process.env.USER_AGENT_URL,
  headers: {
    Authorization: `Bearer ${process.env.LOCAL_AGENT_TOKEN}`,
  },
});

export const createLocalUser = async (user: CreateAccountData) => {
  await userAgent.post(`/newUser/${user.classYear}/${user.username}`);
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

  await userAgent.post(`/forwardFile/${user.classYear}/${user.uid}`, forwardingString, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export const getForwardFile = async (user: any): Promise<string> => {
  return (await userAgent.get(`/forwardFile/${user.classYear}/${user.uid}`)).data;
};

export const modifySSHFile = async (user: any, config: SSHConfig) => {
  const SSHString = `${config.keys}\n`;

  await userAgent.post(`/SSHFile/${user.classYear}/${user.uid}`, SSHString, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};

export const getSSHFile = async (user: any): Promise<string> => {
  return (await userAgent.get(`/sshFile/${user.classYear}/${user.uid}`)).data;
};

export const whitelistMinecraftUser = async (uuid: string): Promise<void> => {
  await mcAgent.post(`/mcWhitelist/${uuid}`);
};

export const unWhitelistMinecraftUser = async (uuid: string): Promise<void> => {
  await mcAgent.delete(`/mcWhitelist/${uuid}`);
};
