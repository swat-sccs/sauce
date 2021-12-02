(function () {
  // tooltips, see https://getbootstrap.com/docs/5.0/components/tooltips/#example-enable-tooltips-everywhere
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    // eslint-disable-next-line no-undef
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // passing data to modals
  const acctModal = document.getElementById('editAccountModal');
  const acctModalBody = document.getElementById('');

  acctModal.addEventListener('show.bs.modal', function (event) {
    const btn = event.relatedTarget;
    const taskData = JSON.parse(btn.getAttribute('data-bs-task-json'));

    const title = acctModal.querySelector('.modal-title');
    title.textContent = `${taskData._id} (${taskData.status})`;

    const operation = document.getElementById('editModalOperation');
    operation.textContent = taskData.operation;

    const editModalIdField = document.getElementById('editModalId');
    editModalIdField.value = taskData._id;

    const modalData = document.getElementById('editModalData');

    const dataPairs = [];
    modalData.replaceChildren();
    for (const [key, value] of Object.entries(taskData.data)) {
      console.log(key, value);
      const row = document.createElement('tr');
      const keyElement = document.createElement('th');
      keyElement.innerText = key;

      row.appendChild(keyElement);

      const valElement = document.createElement('td');
      const valInner = document.createElement('code');
      valInner.innerText = value;
      valInner.style = 'white-space: nowrap;';
      valElement.appendChild(valInner);

      row.appendChild(valElement);

      modalData.appendChild(row);
    }

    const pending = taskData.status === 'pending';
    const failed = taskData.status === 'failed';
    const reject = document.getElementById('taskRejectButton');
    reject.style.display = pending || failed ? '' : 'none';
    const approve = document.getElementById('taskApproveButton');
    approve.style.display = pending ? '' : 'none';
    const retry = document.getElementById('taskRetryButton');
    retry.style.display = failed ? '' : 'none';
  });
})();
