(function () {
  'use strict';

  const form = document.getElementById('mailingForm');
  const nameInput = document.getElementById('nameInput');
  const createButton = document.getElementById('createButton');
  const successAlert = document.getElementById('listCreateSuccess');
  const mailingModal = new window.bootstrap.Modal(document.getElementById('newMailingModal'));
  const nameFeedback = document.getElementById('nameFeedback');

  createButton.addEventListener('click', function (event) {
    nameInput.setCustomValidity('');
    if (form.checkValidity()) {
      createButton.disabled = true;
      createButton.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
      const formData = new FormData();
      formData.append('name', nameInput.value);
      fetch('lists/create', {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(`name=${nameInput.value}`),
      })
        .then((response) => response.json())
        .then((json) => {
          if (json['ok']) {
            successAlert.classList.remove('d-none');
            successAlert.classList.add('show');
            mailingModal.hide();
            nameInput.setCustomValidity('');
          } else {
            nameFeedback.innerHTML = 'List already exists';
            nameInput.setCustomValidity('err');
          }

          form.classList.add('was-validated');
          createButton.innerHTML = 'Create';
          createButton.disabled = false;
        })
        .catch((err) => {
          console.error(err);
          nameFeedback.innerHTML = 'An internal error occurred. Please try again later.';
          createButton.innerHTML = 'Create';
          createButton.disabled = false;
          nameInput.setCustomValidity('err');
          form.classList.add('was-validated');
        });
    } else {
      nameFeedback.innerHTML = 'List name is invalid';
      form.classList.add('was-validated');
    }
  });
  form.addEventListener(
    'submit',
    function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        const name = nameInput.value;
      }

      form.classList.add('was-validated');
    },
    false,
  );

  document.getElementById('nameInput').addEventListener('input', function (event) {
    form.classList.remove('was-validated');
  });
})();
