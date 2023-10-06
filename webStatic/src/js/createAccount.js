import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

/* eslint-disable require-jsdoc */
// form validation
(function () {
  'use strict';

  async function fetchEmailResult(email) {
    return await fetch('/account/email-ok/' + email).then(async function (res) {
      return (await res.text()) == 'true';
    });
  }

  const emailInput = document.getElementById('emailInput');
  const emailFeedback = document.getElementById('emailFeedback');

  async function checkEmail() {
    if (emailInput.checkValidity()) {
      if (await fetchEmailResult(emailInput.value)) {
        emailInput.classList.add('is-valid');
        emailInput.classList.remove('is-invalid');
        emailInput.setCustomValidity('');
        return true;
      } else {
        emailFeedback.innerHTML =
          "An account already exists for this email. <br> Forgot your username? <a href='/account/forgot'>Click here</a>.";
      }
    } else {
      if (emailInput.value) {
        emailFeedback.innerHTML = 'Email must be a valid @swarthmore.edu email';
      } else {
        emailFeedback.innerHTML = '';
      }
    }
    emailInput.classList.add('is-invalid');
    emailInput.classList.remove('is-valid');
    emailInput.setCustomValidity('invalid');
    return false;
  }

  const form = document.getElementById('createForm');
  form.addEventListener(
    'submit',
    async function (event) {
      event.preventDefault();

      if (!form.checkValidity() || (await checkEmail()) === false) {
        event.stopPropagation();
      } else {
        form.submit();
      }

      form.classList.add('was-validated');
    },
    false,
  );

  emailInput.addEventListener(
    'change',
    function (event) {
      emailInput.setCustomValidity('');
      checkEmail();
    },
    false,
  );

  // lil thing so we don't check usernames/emails on every keypress
  // FIXME probably would be good to check invalid characters on
  // every keypress, though
  const doneTypingInterval = 500;

  let emailTypingTimer;
  function doneTypingEmail() {
    emailInput.setCustomValidity('');
    checkEmail();
  }

  emailInput.addEventListener('input', function (event) {
    clearTimeout(emailTypingTimer);
    emailTypingTimer = setTimeout(doneTypingEmail, doneTypingInterval);
  });
})();
