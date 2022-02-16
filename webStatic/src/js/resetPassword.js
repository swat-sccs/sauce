/* eslint-disable require-jsdoc */
import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

import { zxcvbn, ZxcvbnOptions } from '@zxcvbn-ts/core';

// As soon as the script runs, we start lazy-loading the zxcvbn dictionaries (which are about a
// megabyte and a half, and still 750kB when gzipped). Then once the listener hits

const zxcvbnCommonPackage = import(
  /* webpackChunkName: "zxcvbnCommonPackage" */ '@zxcvbn-ts/language-common'
);
const zxcvbnEnPackage = import(/* webpackChunkName: "zxcvbnEnPackage" */ '@zxcvbn-ts/language-en');

let zxcvbnOptionsInitialized = false;

const loadOptions = async () => {
  const zxcvbnCommon = await zxcvbnCommonPackage;
  const zxcvbnEn = await zxcvbnEnPackage;

  ZxcvbnOptions.setOptions({
    dictionary: {
      ...zxcvbnCommon.default.dictionary,
      ...zxcvbnEn.default.dictionary,
    },
    graphs: zxcvbnCommon.adjacencyGraphs,
    translations: zxcvbnEn.default.translations,
    userInputs: [window.username, 'sccs', 'swarthmore', 'correcthorsebatterystaple'],
  });

  zxcvbnOptionsInitialized = true;
};

const form = document.getElementById('forgotForm');
const passwordInput = document.getElementById('passwordInput');
const passwordConfirm = document.getElementById('passwordConfirmInput');
const strengthCard = document.getElementById('strengthCard');

const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const helperText = document.getElementById('helperText');
const strengthWords = ['Terrible', 'Bad', 'Fair', 'Great', 'Excellent'];
const strengthClasses = ['bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-success'];

async function checkPassword() {
  if (!zxcvbnOptionsInitialized) {
    await loadOptions();
  }

  const results = zxcvbn(passwordInput.value);
  console.log(results);
  const progress = results.score * 25;
  const crackTime = results.crackTimesDisplay.onlineNoThrottling10PerSecond;

  strengthBar.style = `width: ${progress}%;`;
  strengthBar.ariaValueNow = progress;

  strengthBar.classList.remove(...strengthClasses);
  strengthBar.classList.add(strengthClasses[results.score]);

  strengthText.innerHTML = `${strengthWords[results.score]} (time to guess: ${crackTime})`;
  strengthText.classList.remove('d-none');

  const warning = results.feedback.warning;
  if (warning) {
    helperText.innerHTML = `${results.feedback.warning} ${results.feedback.suggestions[0] || ''}`;
    helperText.classList.remove('d-none');
  } else {
    helperText.classList.add('d-none');
  }

  if (results.score < 2) {
    passwordInput.setCustomValidity('Password is too weak');
  } else {
    passwordInput.setCustomValidity('');
  }
}

/* eslint-disable no-undef */
(function () {
  'use strict';

  form.addEventListener(
    'submit',
    async function (event) {
      // stop the normal form-submission event (we stay on the main thread until the first await
      // call, so this is ok)

      event.preventDefault();
      event.stopPropagation();
      // make sure the password has been checked
      await checkPassword();

      if (form.checkValidity()) {
        form.submit();
      }
    },
    false,
  );

  passwordConfirm.addEventListener('input', (event) => {
    if (passwordConfirm.value != passwordInput.value) {
      passwordConfirm.setCustomValidity('Passwords must match');
    } else {
      passwordConfirm.setCustomValidity('');
    }
    form.classList.add('was-validated');
  });

  passwordInput.addEventListener('input', checkPassword);
})();
