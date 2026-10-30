const form = document.querySelector('#placement-request');
const panels = [...document.querySelectorAll('[data-step]')];
const progress = [...document.querySelectorAll('.progress-list li')];
const back = document.querySelector('[data-back]');
const next = document.querySelector('[data-next]');
const submit = document.querySelector('[data-submit]');
const errorSummary = document.querySelector('#error-summary');
const multiFields = ['settingTypes', 'situations', 'incomeSources'];
let step = 1;
document.querySelector('#startedAt').value = Date.now();

// Build the Yes / No / Not sure rows from each list's data-yn="name:Question|..." attribute.
document.querySelectorAll('[data-yn]').forEach(list => {
  list.innerHTML = list.dataset.yn.split('|').map(entry => {
    const [name, question] = entry.split(':');
    const options = [['Yes', 'Y'], ['No', 'N'], ['Not sure', '?']];
    return `<div class="yn-row" role="radiogroup" aria-label="${escapeHtml(question)}"><span class="yn-question">${escapeHtml(question)}</span><div class="yn-options">${options.map(([value, short]) => `<span class="yn-option"><input id="${name}-${short}" name="${name}" value="${value}" type="radio"><label for="${name}-${short}" title="${value}">${value}</label></span>`).join('')}</div></div>`;
  }).join('');
});

function showStep(value) {
  step = value;
  panels.forEach((panel, index) => panel.hidden = index + 1 !== step);
  progress.forEach((item, index) => {
    item.classList.toggle('active', index + 1 === step);
    item.classList.toggle('complete', index + 1 < step);
  });
  back.hidden = step === 1;
  next.hidden = step === panels.length;
  submit.hidden = step !== panels.length;
  errorSummary.hidden = true;
  document.querySelector('.form-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const heading = panels[step - 1].querySelector('h2');
  heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
  if (step === panels.length) buildReview();
}

function validatePanel() {
  const fields = [...panels[step - 1].querySelectorAll('input,select,textarea')];
  const invalid = fields.find(field => !field.checkValidity());
  fields.forEach(field => field.removeAttribute('aria-invalid'));
  if (invalid) {
    invalid.setAttribute('aria-invalid', 'true');
    errorSummary.textContent = invalid.type === 'email' ? 'Please enter a valid email address.' : 'Please complete the required information before continuing.';
    errorSummary.hidden = false;
    invalid.reportValidity();
    invalid.focus();
    return false;
  }
  return true;
}

function value(name) {
  const data = new FormData(form);
  const values = data.getAll(name).filter(Boolean);
  return values.length ? values.join('; ') : 'Not provided';
}

function buildReview() {
  const sections = [
    ['About You', [['I am', value('requesterRole')], ['Name', value('requesterName')], ['Organization', value('organization')], ['Phone', value('requesterPhone')], ['Email', value('requesterEmail')], ['Best time to reach you', value('bestTime')]]],
    ['Person Needing Placement', [['Name', `${value('clientFirstName')} ${value('clientLastName')}`], ['Date of birth', value('clientDob')], ['Phone', value('clientPhone')], ['Gender', value('clientGender')], ['Preferred language', value('preferredLanguage')], ['Veteran', value('veteran')], ['Current location', value('currentLocation')], ['Expected discharge / release', value('dischargeDate')], ['Legal decision-maker', value('decisionMaker')], ['Decision-maker contact', value('decisionMakerContact')]]],
    ['Placement Needs', [['Setting requested', value('settingTypes')], ['Situation', value('situations')], ['Move-in timeframe', value('moveIn')], ['Preferred area', value('preferredArea')], ['Areas to avoid', value('areasToAvoid')]]],
    ['Income & Daily Living', [['Income sources', value('incomeSources')], ['Monthly income', value('monthlyIncome')], ['Housing budget', value('housingBudget')], ['Has photo ID', value('hasPhotoId')], ...ynRows(4), ['Accommodations', value('accommodations')]]],
    ['Background', [...ynRows(5), ['Agent / case manager', value('agentContact')], ['Additional information', value('additionalInfo')]]]
  ];
  document.querySelector('#review').innerHTML = sections.map(([title, rows]) => `<div class="review-section"><h3>${escapeHtml(title)}</h3>${rows.map(([label, content]) => `<div class="review-row"><b>${escapeHtml(label)}</b><span>${escapeHtml(content)}</span></div>`).join('')}</div>`).join('');
}

function ynRows(stepNumber) {
  return [...panels[stepNumber - 1].querySelectorAll('.yn-row')].map(row => [row.querySelector('.yn-question').textContent, value(row.querySelector('input').name)]);
}

function escapeHtml(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

next.addEventListener('click', () => { if (validatePanel()) showStep(step + 1); });
back.addEventListener('click', () => showStep(step - 1));
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validatePanel()) return;
  submit.disabled = true;
  submit.textContent = 'Sending…';
  try {
    const endpoint = window.TCL_CONFIG?.placementEndpoint;
    if (!endpoint || !endpoint.startsWith('https://')) throw new Error('Placement requests have not been configured yet.');
    const payload = new FormData(form);
    multiFields.forEach(name => payload.set(name, payload.getAll(name).join('; ')));
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: payload });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to send the placement request.');
    form.hidden = true;
    document.querySelector('#reference-number').textContent = result.reference || 'provided by email';
    const success = document.querySelector('#success');
    success.hidden = false;
    success.focus();
  } catch (error) {
    errorSummary.textContent = `${error.message} Please try again later or call 1-888-599-2504.`;
    errorSummary.hidden = false;
    submit.disabled = false;
    submit.textContent = 'Send Placement Request';
  }
});
