/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable require-jsdoc */
/* eslint-disable no-undef */

import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.css';
import '../scss/adminStyle.scss';

import * as bootstrap from 'bootstrap';
window.bootstrap = bootstrap; // makes responsive-bs5 not throw errors in the console
import { Tooltip, Tab, Modal } from 'bootstrap';
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

window.deleteMessage = async function (id) {
  await fetch(`/admin/deleteMessage/${id}`, {
    method: 'post',
  });

  // eslint-disable-next-line new-cap
  $('#messageTable').DataTable().ajax.reload();
};

window.submitMessage = async function () {
  const startDate = document.getElementById('messageStartDate');
  const endDate = document.getElementById('messageEndDate');
  const messageArea = document.getElementById('messageArea');
  await fetch('/admin/newMessage', {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(
      `startDate=${startDate.value}&endDate=${endDate.value}&message=${messageArea.value}`,
    ),
  });

  Modal.getOrCreateInstance(document.getElementById('messageModal')).hide();
  startDate.value = '';
  endDate.value = '';
  messageArea.value = '';

  // eslint-disable-next-line new-cap
  $('#messageTable').DataTable().ajax.reload();
};

(function () {
  refreshTooltips();
  refreshTaskTimestamp();

  // passing data to modals
  const taskModal = document.getElementById('taskModal');

  function renderTaskInModal(taskData) {
    const title = taskModal.querySelector('.modal-title');
    title.textContent = `${taskData._id} (${taskData.status})`;

    const operation = document.getElementById('taskModalOperation');
    operation.textContent = taskData.operation;

    const taskModalIdField = document.getElementById('taskModalId');
    taskModalIdField.value = taskData._id;

    const modalData = document.getElementById('taskModalData');

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
  }

  // modal button hackiness
  const approve = document.getElementById('taskApproveButton');
  const reject = document.getElementById('taskRejectButton');
  const retry = document.getElementById('taskRetryButton');
  const form = document.getElementById('taskForm');
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

  taskModal.addEventListener('show.bs.modal', function (event) {
    const btn = event.relatedTarget;
    if (btn) {
      // we're rendering from clicking a "review task" button
      const taskData = JSON.parse(
        document.getElementById(btn.getAttribute('data-bs-json-id')).innerHTML,
      );
      document.title = 'SAUCE Admin: task ' + taskData._id;
      window.history.replaceState({}, '', '/admin/tasks/' + taskData._id);

      renderTaskInModal(taskData);
    } // otherwise we're coming in from a link and it's already been rendered
  });

  // make the URL/history go back to task view when we hide
  taskModal.addEventListener('hidden.bs.modal', function (event) {
    document.title = 'SAUCE Admin: tasks';
    window.history.replaceState({}, '', '/admin/tasks');
  });

  // add stuff to history when switching tabs
  document.getElementById('tasksTab').addEventListener('shown.bs.tab', function (event) {
    document.title = 'SAUCE Admin: tasks';
    window.history.replaceState({}, '', '/admin/tasks');
  });

  document.getElementById('accountsTab').addEventListener('shown.bs.tab', function (event) {
    document.title = 'SAUCE Admin: accounts';
    window.history.replaceState({}, '', '/admin/users');
  });

  document.getElementById('messagesTab').addEventListener('shown.bs.tab', function (event) {
    document.title = 'SAUCE Admin: staff messagers';
    window.history.replaceState({}, '', '/admin/messages');
  });
})();

$(document).ready(function () {
  function handleTaskOrTab(task, tab) {
    if (task) {
      Modal.getOrCreateInstance(taskModal).show();
      document.title = 'SAUCE Admin: task ' + task._id;
      renderTaskInModal(task);
    } else {
      Modal.getOrCreateInstance(taskModal).hide();
      if (tab === 'tasks') {
        new Tab(document.getElementById('tasksTab')).show();
      } else if (tab === 'accounts') {
        new Tab(document.getElementById('accountsTab')).show();
      } else if (tab === 'messages') {
        new Tab(document.getElementById('messagesTab')).show();
      }
    }
  }

  handleTaskOrTab(window.taskToJumpTo, window.tabToJumpTo);

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
            data-bs-target="#taskModal" 
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
    const params = new URLSearchParams();

    ['pending', 'executed', 'rejected', 'failed'].forEach((status) => {
      if (document.getElementById(`${status}Check`).checked) {
        params.append('status', status);
      }
    });

    taskTable.ajax.url(TASK_DATA_URL + '?' + params.toString());
    taskTable.ajax.reload();

    refreshTaskTimestamp();
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

  // eslint-disable-next-line new-cap
  const staffMessageTable = $('#messageTable').DataTable({
    processing: true,
    responsive: true,
    ajax: MESSAGE_DATA_URL,
    order: [[2, 'desc']],
    columns: [
      {
        data: '_id',
        visible: false,
        orderable: false,
      },
      {
        data: null,
        orderable: false,
        render: function (data, type, row) {
          if (type === 'display') {
            return `<button 
            class="btn btn-danger btn-sm" 
            type="button" 
            onclick="window.deleteMessage('${data._id}')"><i class="bi bi-trash-fill" aria-label="delete message"></i></button>`;
          } else {
            return '';
          }
        },
      },
      {
        data: 'startDate',
        defaultContent: '',
        render: function (data, type, row) {
          const date = DateTime.fromISO(data);
          if (type === 'display') {
            return date.toLocal().toLocaleString(DateTime.DATETIME_MED);
          } else {
            return data;
          }
        },
      },
      {
        data: 'endDate',
        defaultContent: '',
        render: function (data, type, row) {
          const date = DateTime.fromISO(data);
          if (type === 'display') {
            return date.toLocal().toLocaleString(DateTime.DATETIME_MED);
          } else {
            return data;
          }
        },
      },
      {
        data: 'message',
        defaultContent: '',
      },
    ],
  });
});
