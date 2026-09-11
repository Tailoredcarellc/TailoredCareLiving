const STORAGE_KEY = 'tcl_admin_key';

const gateScreen = document.querySelector('#gate-screen');
const listScreen = document.querySelector('#list-screen');
const gateForm = document.querySelector('#gate-form');
const gateError = document.querySelector('#gate-error');
const listError = document.querySelector('#list-error');
const emptyState = document.querySelector('#empty-state');
const applicantList = document.querySelector('#applicant-list');
const logOutButton = document.querySelector('#log-out');
const refreshButton = document.querySelector('#refresh-list');

function escapeHtml(input) {
  const div = document.createElement('div');
  div.textContent = input ?? '';
  return div.innerHTML;
}

function getKey() {
  return sessionStorage.getItem(STORAGE_KEY) || '';
}

function showGate(message) {
  listScreen.hidden = true;
  logOutButton.hidden = true;
  gateScreen.hidden = false;
  if (message) {
    gateError.textContent = message;
    gateError.hidden = false;
  }
}

function showList() {
  gateScreen.hidden = true;
  listScreen.hidden = false;
  logOutButton.hidden = false;
}

function applicantCard(applicant) {
  const rows = [
    ['Phone', applicant.phone],
    ['Email', applicant.email || 'Not provided'],
    ['Best time to call', applicant.bestContactTime],
    ['Seeking housing for', applicant.applyingFor],
    ['Total occupants', applicant.occupants],
    ['Occupant ages', applicant.occupantAges],
    ['Move-in timeframe', applicant.moveIn],
    ['Housing-only accommodations', applicant.housingOnly],
    ['Expected payment source', applicant.paymentSource],
    ['Current housing situation', applicant.currentHousing],
    ['Additional information', applicant.additional || 'Not provided']
  ];
  const card = document.createElement('div');
  card.className = 'applicant-card';
  card.innerHTML = `
    <h2>${escapeHtml(applicant.fullName)}</h2>
    <div class="meta">Reference ${escapeHtml(applicant.reference)} · Received ${escapeHtml(new Date(applicant.receivedAt).toLocaleString())}</div>
    <div class="applicant-grid">
      ${rows.map(([label, value]) => `<div class="row"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</div>`).join('')}
    </div>
    <div class="applicant-actions">
      <button class="decide-button accept" type="button" data-decision="Accepted">Accept</button>
      <button class="decide-button decline" type="button" data-decision="Declined">Decline</button>
    </div>
  `;
  card.querySelectorAll('.decide-button').forEach((button) => {
    button.addEventListener('click', () => decide(applicant.row_number, button.dataset.decision, card, button));
  });
  return card;
}

async function loadList() {
  listError.hidden = true;
  const endpoint = window.TCL_CONFIG?.adminPendingEndpoint;
  const response = await fetch(endpoint, { headers: { 'X-Admin-Key': getKey(), 'Accept': 'application/json' } });
  if (response.status === 401 || response.status === 403) {
    sessionStorage.removeItem(STORAGE_KEY);
    showGate('That admin key was not accepted. Please try again.');
    return;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to load applicants.');
  showList();
  applicantList.innerHTML = '';
  const applicants = result.applicants || [];
  emptyState.hidden = applicants.length > 0;
  applicants.forEach((applicant) => applicantList.appendChild(applicantCard(applicant)));
}

async function decide(rowNumber, decision, card, triggeringButton) {
  const originalLabel = triggeringButton.textContent;
  card.querySelectorAll('.decide-button').forEach((button) => (button.disabled = true));
  triggeringButton.textContent = 'Saving…';
  try {
    const endpoint = window.TCL_CONFIG?.adminDecideEndpoint;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-Admin-Key': getKey(), 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ row_number: rowNumber, decision })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to save this decision.');
    card.remove();
    emptyState.hidden = applicantList.children.length > 0;
  } catch (error) {
    listError.textContent = error.message;
    listError.hidden = false;
    card.querySelectorAll('.decide-button').forEach((button) => (button.disabled = false));
    triggeringButton.textContent = originalLabel;
  }
}

gateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  gateError.hidden = true;
  const key = document.querySelector('#admin-key').value.trim();
  if (!key) return;
  sessionStorage.setItem(STORAGE_KEY, key);
  try {
    await loadList();
  } catch (error) {
    gateError.textContent = error.message;
    gateError.hidden = false;
  }
});

logOutButton.addEventListener('click', () => {
  sessionStorage.removeItem(STORAGE_KEY);
  showGate();
});

refreshButton.addEventListener('click', () => {
  loadList().catch((error) => {
    listError.textContent = error.message;
    listError.hidden = false;
  });
});

if (getKey()) {
  loadList().catch(() => showGate());
} else {
  showGate();
}
