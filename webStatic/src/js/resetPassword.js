import { zxcvbn, ZxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/* eslint-disable no-undef */
(function () {
  'use strict';

  const form = document.getElementById('forgotForm');
  const passwordInput = document.getElementById('passwordInput');
  const passwordConfirm = document.getElementById('passwordConfirmInput');
  form.addEventListener(
    'submit',
    function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
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

  const strengthCard = document.getElementById('strengthCard');

  const options = {
    translations: zxcvbnEnPackage.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
      userInputs: [window.username, 'sccs', 'swarthmore', 'correcthorsebatterystaple'],
    },
  };
  ZxcvbnOptions.setOptions(options);

  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  const helperText = document.getElementById('helperText');
  const strengthWords = ['Terrible', 'Bad', 'Fair', 'Great', 'Excellent'];
  const strengthClasses = ['bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-success'];

  passwordInput.addEventListener('input', function (event) {
    const results = zxcvbn(event.target.value);
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
  });
})();
