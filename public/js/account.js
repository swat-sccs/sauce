/* eslint-disable require-jsdoc */

function sendResetRequest(userId) {
  const container = document.getElementById('alertContainer');
  const success = document.getElementById('passwordResetSuccess');
  const failure = document.getElementById('passwordResetFailure');
  const processing = document.getElementById('buttonProcessing');
  const btn = document.getElementById('changePasswordButton');
  const oldInner = btn.innerHTML;
  btn.innerHTML = processing.innerHTML;
  fetch('/account/forgot', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: userId,
    }),
  })
    .then((res) => {
      if (res.status == 200) {
        container.innerHTML = success.innerHTML;
      } else {
        console.log(res.statusText);
        container.innerHTML = failure.innerHTML;
      }
      btn.innerHTML = oldInner;
    })
    .catch((err) => {
      console.log(err);
      container.innerHTML = failure.innerHTML;
      btn.innerHTML = oldInner;
    });
}

function updateCustomEmailField() {
  const customCheck = document.getElementById('forwardCustomCheck');
  const customEmail = document.getElementById('forwardCustomEmail');

  customEmail.disabled = !customCheck.checked;
  customEmail.required = customCheck.checked;
}
