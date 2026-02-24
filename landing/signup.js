(function () {
  function setupForm(formId, messageId, successText) {
    var form = document.getElementById(formId);
    var messageEl = document.getElementById(messageId);
    if (!form || !messageEl) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[name="email"]');
      if (!emailInput || !emailInput.value.trim()) {
        showMessage(messageEl, 'Please enter your email address.', 'error');
        return;
      }
      if (!emailInput.validity.valid) {
        showMessage(messageEl, 'Please enter a valid email address.', 'error');
        return;
      }

      emailInput.disabled = true;
      showMessage(messageEl, '', 'success');

      var action = form.getAttribute('action');
      if (!action || action.indexOf('YOUR_FORM_ID') !== -1) {
        showMessage(messageEl, 'Sign-up is not configured yet. Please try again later.', 'error');
        emailInput.disabled = false;
        return;
      }

      var body = new FormData(form);
      fetch(action, {
        method: 'POST',
        body: body,
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (res.ok) {
            showMessage(messageEl, successText, 'success');
            form.reset();
          } else {
            return res.json().then(function (data) {
              showMessage(messageEl, data.error || 'Something went wrong. Please try again.', 'error');
            });
          }
        })
        .catch(function () {
          showMessage(messageEl, 'Something went wrong. Please try again.', 'error');
        })
        .finally(function () {
          emailInput.disabled = false;
        });
    });
  }

  function showMessage(messageEl, text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.hidden = !text;
    messageEl.className = 'signup-message signup-message--' + (type || '');
  }

  setupForm('signup-form', 'signup-message', "You're on the list! We'll email you when there's news or beta invites.");
  setupForm('cta-signup-form', 'cta-signup-message', "You're on the beta list! We'll be in touch.");
})();
