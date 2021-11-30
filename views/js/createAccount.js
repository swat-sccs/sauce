/* eslint-disable require-jsdoc */
// form validation
(function () {
  'use strict';

  async function fetchUsernameResult(username) {
    return await fetch('/account/username-ok/' + username).then(async function (res) {
      return (await res.text()) == 'true';
    });
  }
  const usernameInput = document.getElementById('usernameInput');
  const usernameFeedback = document.getElementById('usernameFeedback');

  async function checkUsername() {
    if (usernameInput.checkValidity()) {
      if (await fetchUsernameResult(usernameInput.value)) {
        usernameInput.classList.add('is-valid');
        usernameInput.classList.remove('is-invalid');
        usernameInput.setCustomValidity('');
        return true;
      } else {
        usernameFeedback.innerHTML = 'Username is already taken';
      }
    } else {
      if (usernameInput.value) {
        usernameFeedback.innerHTML = 'Username contains an invalid character';
      } else {
        usernameFeedback.innerHTML = '';
      }
    }
    usernameInput.classList.add('is-invalid');
    usernameInput.classList.remove('is-valid');
    usernameInput.setCustomValidity('invalid');
    return false;
  }

  const form = document.getElementById('createForm');
  form.addEventListener(
    'submit',
    async function (event) {
      event.preventDefault();

      if (!form.checkValidity() || (await checkUsername()) === false) {
        event.stopPropagation();
      } else {
        form.submit();
      }

      form.classList.add('was-validated');
    },
    false,
  );

  usernameInput.addEventListener(
    'change',
    function (event) {
      usernameInput.setCustomValidity('');
      checkUsername();
    },
    false,
  );

  // lil thing so we don't check usernames on every keypress
  // FIXME probably would be good to check invalid characters on
  // every keypress, though
  let typingTimer;
  const doneTypingInterval = 500;
  function doneTyping() {
    usernameInput.setCustomValidity('');
    checkUsername();
  }

  usernameInput.addEventListener('input', function (event) {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
  });
})();
