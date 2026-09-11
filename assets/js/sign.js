const loadingState = document.querySelector('#loading-state');
const errorState = document.querySelector('#error-state');
const signForm = document.querySelector('#sign-form');
const successState = document.querySelector('#success-state');
const formError = document.querySelector('#form-error');
const submitButton = document.querySelector('#submit-sign');

const token = new URLSearchParams(window.location.search).get('token');
let session = null;

function showError(message) {
  loadingState.hidden = true;
  errorState.hidden = false;
  errorState.textContent = message;
}

async function loadSession() {
  if (!token) {
    showError('This link is missing information. Please use the acknowledgment link sent to your email, or contact Tailored Care Living.');
    return;
  }
  const endpoint = window.TCL_CONFIG?.policySignSessionEndpoint;
  if (!endpoint || !endpoint.startsWith('https://')) {
    showError('Acknowledgment delivery has not been configured yet. Please contact Tailored Care Living.');
    return;
  }
  try {
    const response = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`, { headers: { 'Accept': 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'This acknowledgment link is invalid or has expired.');
    session = result;
    document.querySelector('#signer-display-name').textContent = session.fullName;
    document.querySelector('#version-text').textContent = session.docVersion ? ` (${session.docVersion})` : '';
    const manualLink = document.querySelector('#manual-link');
    if (session.docUrl) {
      manualLink.href = session.docUrl;
    } else {
      manualLink.remove();
    }
    loadingState.hidden = true;
    signForm.hidden = false;
  } catch (error) {
    showError(error.message);
  }
}

signForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!signForm.checkValidity()) {
    formError.textContent = 'Please type your full legal name and check the acknowledgment box before submitting.';
    formError.hidden = false;
    signForm.reportValidity();
    return;
  }
  formError.hidden = true;
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting…';
  try {
    const endpoint = window.TCL_CONFIG?.policySignSubmitEndpoint;
    if (!endpoint || !endpoint.startsWith('https://')) throw new Error('Acknowledgment delivery has not been configured yet.');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        token,
        typedName: document.querySelector('#typedName').value.trim(),
        acknowledge: document.querySelector('#acknowledge').checked,
        signedAtClient: new Date().toISOString()
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to submit your acknowledgment.');
    signForm.hidden = true;
    successState.hidden = false;
    successState.focus();
  } catch (error) {
    formError.textContent = `${error.message} Please try again or contact Tailored Care Living directly.`;
    formError.hidden = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Sign & Submit';
  }
});

loadSession();
