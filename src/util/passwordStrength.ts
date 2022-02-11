import { zxcvbn, ZxcvbnOptions } from '@zxcvbn-ts/core';
import { ZxcvbnResult } from '@zxcvbn-ts/core/dist/types';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';

const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
    userInputs: ['sccs', 'swarthmore', 'correcthorsebatterystaple'],
  },
};

export const testPassword = async (password: string) => zxcvbn(password);
