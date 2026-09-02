const form = document.querySelector('#housing-application');
const panels = [...document.querySelectorAll('[data-step]')];
const progress = [...document.querySelectorAll('.progress-list li')];
const back = document.querySelector('[data-back]');
const next = document.querySelector('[data-next]');
const submit = document.querySelector('[data-submit]');
const errorSummary = document.querySelector('#error-summary');
let step = 1;
document.querySelector('#startedAt').value = Date.now();

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
    errorSummary.textContent = 'Please complete the required information before continuing.';
    errorSummary.hidden = false;
    invalid.reportValidity();
    invalid.focus();
    return false;
  }
  if (step === 2) {
    const occupantCount = Number(document.querySelector('#occupants').value);
    const agesField = document.querySelector('#occupantAges');
    const ages = agesField.value.split(',').map(age => age.trim()).filter(Boolean);
    const agesAreValid = ages.every(age => /^\d{1,3}$/.test(age) && Number(age) >= 0 && Number(age) <= 120);
    if (!agesAreValid || ages.length !== occupantCount) {
      agesField.setAttribute('aria-invalid', 'true');
      errorSummary.textContent = `Please enter exactly ${occupantCount} valid occupant age${occupantCount === 1 ? '' : 's'}, separated by commas.`;
      errorSummary.hidden = false;
      agesField.focus();
      return false;
    }
  }
  return true;
}

function value(name) {
  const data = new FormData(form);
  return data.get(name) || 'Not provided';
}

function buildReview() {
  const sections = [
    ['Contact', [['Name', value('fullName')], ['Phone', value('phone')], ['Email', value('email')], ['Best time to call', value('bestContactTime')]]],
    ['Housing Need', [['Seeking housing for', value('applyingFor')], ['Total proposed occupants', value('occupants')], ['Ages of proposed occupants', value('occupantAges')], ['Move-in timeframe', value('moveIn')], ['Current situation', value('currentHousing')]]],
    ['Housing Services', [['Seeking housing-only accommodations', value('housingOnly')], ['Expected payment source', value('paymentSource')]]],
    ['Additional Information', [['Housing information', value('additional')]]]
  ];
  document.querySelector('#review').innerHTML = sections.map(([title, rows]) => `<div class="review-section"><h3>${escapeHtml(title)}</h3>${rows.map(([label, content]) => `<div class="review-row"><b>${escapeHtml(label)}</b><span>${escapeHtml(content)}</span></div>`).join('')}</div>`).join('');
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
  submit.textContent = 'Submitting…';
  try {
    const endpoint = window.TCL_CONFIG?.applicationEndpoint;
    if (!endpoint || !endpoint.startsWith('https://')) throw new Error('Inquiry delivery has not been configured yet.');
    const payload = new FormData(form);
    const existingAdditional = String(payload.get('additional') || '').trim();
    payload.set('additional', `Proposed occupant ages: ${payload.get('occupantAges')}${existingAdditional ? `\n\n${existingAdditional}` : ''}`);
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: payload });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to submit the inquiry.');
    form.hidden = true;
    document.querySelector('#reference-number').textContent = result.reference || 'provided by email';
    const success = document.querySelector('#success');
    success.hidden = false;
    success.focus();
  } catch (error) {
    errorSummary.textContent = `${error.message} Please try again later or contact Tailored Care Living directly.`;
    errorSummary.hidden = false;
    submit.disabled = false;
    submit.textContent = 'Join Interest List';
  }
});
