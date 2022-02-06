import * as bootstrap from 'bootstrap';

window.bootstrap = bootstrap;

(function () {
  'use strict';

  const form = document.getElementById('forgotForm');
  form.addEventListener(
    'submit',
    function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }

      form.classList.add('was-validated');
    },
    false,
  );

  document.getElementById('idInput').addEventListener('input', function (event) {
    form.classList.remove('was-validated');
  });
})();
