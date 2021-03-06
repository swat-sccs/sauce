import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// eslint-disable-next-line require-jsdoc
function openModal() {
  window.bootstrap.Modal.getOrCreateInstance(document.getElementById('newMailingModal')).show();
}

// eslint-disable-next-line require-jsdoc
function clearValidation() {
  'use strict';
  document.getElementById('mailingForm').classList.remove('was-validated');
}

// eslint-disable-next-line require-jsdoc
function doFormSubmit() {
  'use strict';
  const form = document.getElementById('mailingForm');
  const nameInput = document.getElementById('nameInput');
  const createButton = document.getElementById('createButton');
  const alertContainer = document.getElementById('creationAlertContainer');
  const nameFeedback = document.getElementById('nameFeedback');
  const createLoading = document.getElementById('createLoading');
  const creationAlert = document.getElementById('creationAlert');

  // prevents the form from flashing green if we've previously tried something that failed validation
  form.classList.remove('was-validated');

  nameInput.setCustomValidity('');
  if (form.checkValidity()) {
    createButton.disabled = true;
    createButton.innerHTML = createLoading.innerHTML;
    const formData = new FormData();
    formData.append('name', nameInput.value);
    fetch('lists/create', {
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CSRF-Token': csrfToken,
      },
      body: new URLSearchParams(`name=${nameInput.value}`),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json['ok']) {
          alertContainer.innerHTML = creationAlert.innerHTML;
          window.bootstrap.Modal.getOrCreateInstance(
            document.getElementById('newMailingModal'),
          ).hide();
          nameInput.value = '';
          nameInput.setCustomValidity('');
        } else {
          nameFeedback.innerHTML = 'List name is already taken';
          nameInput.setCustomValidity('err');
          form.classList.add('was-validated');
        }
        createButton.innerHTML = 'Request';
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
}

// needed because otherwise webpack will get rid of the functions
window.openModal = openModal;
window.clearValidation = clearValidation;
window.doFormSubmit = doFormSubmit;
