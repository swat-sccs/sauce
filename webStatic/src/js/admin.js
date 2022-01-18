/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable require-jsdoc */
/* eslint-disable no-undef */

import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.css';

import * as bootstrap from 'bootstrap';
window.bootstrap = bootstrap; // makes responsive-bs5 not throw errors in the console
import { Tooltip, Tab } from 'bootstrap';
import { DateTime as _DateTime } from 'luxon';
import 'jquery';
import 'datatables.net';
import dt from 'datatables.net-bs5';
dt(window, $);
import responsive from 'datatables.net-responsive-bs5';
responsive(window, $);

const DateTime = _DateTime;

function refreshTooltips() {
  // tooltips, see https://getbootstrap.com/docs/5.0/components/tooltips/#example-enable-tooltips-everywhere
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new Tooltip(tooltipTriggerEl);
  });
}

function refreshTaskTimestamp() {
  document.getElementById('lastUpdated').innerHTML = `Last updated: ${DateTime.now().toLocaleString(
    DateTime.TIME_24_WITH_SHORT_OFFSET,
  )}`;
}

(function () {
  // tab listener to modify URL
  const hash = location.hash.replace(/^#/, '');
  if (hash) {
    const tabEl = document.getElementById(`${hash}`);
    if (tabEl) {
      new Tab(document.getElementById(`${hash}`)).show();
    } else {
      console.error(`Could not find tab with id ${hash}`);
      window.location.hash = '';
    }
  }

  Array.prototype.slice
    .call(document.querySelectorAll('#navTab .nav-link'))
    .forEach(function (item) {
      item.addEventListener('shown.bs.tab', function (event) {
        window.location.hash = event.target.id;
      });
    });

  refreshTooltips();
  refreshTaskTimestamp();

  // passing data to modals
  const acctModal = document.getElementById('editAccountModal');
  const acctModalBody = document.getElementById('');

  acctModal.addEventListener('show.bs.modal', function (event) {
    const btn = event.relatedTarget;
    const taskData = JSON.parse(
      document.getElementById(btn.getAttribute('data-bs-json-id')).innerHTML,
    );

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

  const approve = document.getElementById('taskApproveButton');
  const reject = document.getElementById('taskRejectButton');
  const retry = document.getElementById('taskRetryButton');
  const form = document.getElementById('editForm');
  const buttonListener = function (event) {
    event.target.innerHTML = document.getElementById('buttonLoader').innerHTML;
    approve.disabled = true;
    reject.disabled = true;
    retry.disabled = true;
    // weird terrible hack because button-based inputs don't seem to work
    document.getElementById('rejectInput').value = event.target.value;
    form.submit();
    return true;
  };

  approve.addEventListener('click', buttonListener);
  reject.addEventListener('click', buttonListener);
  retry.addEventListener('click', buttonListener);
})();

$(document).ready(function () {
  let taskTableUid = 0;
  // eslint-disable-next-line new-cap
  const taskTable = $('#taskTable').DataTable({
    ajax: TASK_DATA_URL,
    responsive: {
      details: { type: 'column' },
    },
    processing: true,
    drawCallback: refreshTooltips,
    order: [[3, 'desc']],
    language: {
      zeroRecords: 'No matching tasks found',
      emptyTable: 'No matching tasks found',
    },
    columns: [
      {
        data: null,
        className: 'dtr-control',
        orderable: false,
        targets: 0,
        // stop it from showing 'object Object' in every row; not sure why this works
        render: function (data, type, row) {
          return '';
        },
      },
      {
        data: null,
        orderable: false,
        render: function (data, type, row) {
          if (type === 'display') {
            taskTableUid++;
            return `<button 
            class="btn btn-primary btn-sm" 
            type="button" 
            data-bs-toggle="modal" 
            data-bs-target="#editAccountModal" 
            data-bs-json-id="task-json-${taskTableUid}">Review
            </button><script id="task-json-${taskTableUid}" type="text/json">${JSON.stringify(
              row,
            )}</script>`;
          } else {
            return '';
          }
        },
      },
      { data: 'operation' },
      {
        data: 'createdTimestamp',
        render: function (data, type, row) {
          const date = DateTime.fromISO(data);
          if (type === 'display') {
            return `<span data-bs-toggle='tooltip', data-bs-placement='top', title="${date
              .toUTC()
              .toISO()}">
              ${date.toRelative()}
            </span>`;
          } else {
            return data;
          }
        },
      },
      {
        data: 'status',
        render: function (data, type, row) {
          if (row['actionTimestamp']) {
            const date = DateTime.fromISO(row['actionTimestamp']);
            if (type === 'display') {
              return `<span data-bs-toggle='tooltip', data-bs-placement='top', title="${date
                .toUTC()
                .toISO()}">
                ${data} ${date.toRelative()}</span>`;
            } else {
              return `${data} ${date.toUTC().toISO()}`;
            }
          } else {
            return data;
          }
        },
      },
      {
        data: '_id',
        render: function (data, type, row) {
          if (type === 'display') {
            return `<span data-bs-toggle='tooltip', data-bs-placement='top', title="${data}">
            <code>${data.substring(0, 6)}...</code>
            </span>`;
          } else {
            return data;
          }
        },
      },
      {
        data: 'data',
        render: function (data, type, row) {
          if (type === 'display') {
            return `<pre class="mb-0">${JSON.stringify(data, null, 2)}</pre>`;
          } else if (type === 'filter') {
            // return a word salad of relevant words in the data
            return Object.entries(data)
              .map((item) => item[0] + ' ' + item[1])
              .join(' ');
          } else {
            return JSON.stringify(data);
          }
        },
      },
    ],
  });

  taskTable.on('responsive-display', refreshTooltips);

  // clear lingering POST data so if we're being rendered as a response to a POST request a refresh
  // doesn't resend the request
  if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
  }

  // keep it from adding the stupid anti-caching underscore character
  // see https://bugs.jquery.com/ticket/4898#comment:2
  jQuery.ajaxSetup({ cache: true });

  const refreshTaskTable = function () {
    console.log('Reloading table');
    const params = new URLSearchParams();

    ['pending', 'executed', 'rejected', 'failed'].forEach((status) => {
      if (document.getElementById(`${status}Check`).checked) {
        params.append('status', status);
      }
    });

    taskTable.ajax.url(TASK_DATA_URL + '?' + params.toString());
    taskTable.ajax.reload();

    refreshTaskTimestamp();

    console.log('Reloaded');
  };

  // eslint-disable-next-line guard-for-in
  ['pending', 'executed', 'rejected', 'failed'].forEach((status) => {
    document.getElementById(`${status}Check`).addEventListener('input', refreshTaskTable);
  });

  // eslint-disable-next-line new-cap
  const userTable = $('#userTable').DataTable({
    processing: true,
    serverSide: true,
    responsive: true,
    ajax: USER_DATA_URL,
    columns: [
      {
        data: 'uid',
        defaultContent: '',
      },
      {
        data: 'cn',
        defaultContent: '',
      },
      {
        data: 'swatmail',
        defaultContent: '',
      },
    ],
  });
});
