(function () {
  var form = document.getElementById('signup-form');
  var messageEl = document.getElementById('signup-message');
  var submitBtn = document.getElementById('signup-submit');
  if (!form || !messageEl || !submitBtn) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var emailInput = form.querySelector('input[name="email"]');
    if (!emailInput || !emailInput.value.trim()) {
      showMessage('Please enter your email address.', 'error');
      return;
    }
    if (!emailInput.validity.valid) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    showMessage('', 'success');

    var action = form.getAttribute('action');
    if (!action || action.indexOf('YOUR_FORM_ID') !== -1) {
      showMessage('Sign-up is not configured yet. Please try again later.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Notify me';
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
          showMessage("You're on the list! We'll email you when there's news or beta invites.", 'success');
          form.reset();
        } else {
          return res.json().then(function (data) {
            showMessage(data.error || 'Something went wrong. Please try again.', 'error');
          });
        }
      })
      .catch(function () {
        showMessage('Something went wrong. Please try again.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Notify me';
      });
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.hidden = !text;
    messageEl.className = 'signup-message signup-message--' + (type || '');
  }
})();
