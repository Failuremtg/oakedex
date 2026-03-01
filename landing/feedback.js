(function () {
  var form = document.getElementById('feedback-form');
  var messageEl = document.getElementById('feedback-message-el');
  var submitBtn = document.getElementById('feedback-submit');
  var textarea = document.getElementById('feedback-message');
  var charCount = document.getElementById('feedback-char-count');

  function showMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.hidden = !text;
    messageEl.className = 'signup-message signup-message--' + (type || '');
  }

  function setSubmitting(loading) {
    if (submitBtn) submitBtn.disabled = loading;
  }

  if (textarea && charCount) {
    function updateCount() {
      var len = (textarea.value || '').length;
      charCount.textContent = len + ' / 5000';
    }
    textarea.addEventListener('input', updateCount);
    textarea.addEventListener('change', updateCount);
    updateCount();
  }

  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var typeSelect = form.querySelector('[name="type"]');
    var emailInput = form.querySelector('[name="email"]');
    var messageInput = form.querySelector('[name="message"]');

    var type = typeSelect ? typeSelect.value : 'feedback';
    var email = emailInput ? emailInput.value.trim() : '';
    var message = messageInput ? messageInput.value.trim() : '';

    if (!message) {
      showMessage('Please enter your message.', 'error');
      if (messageInput) messageInput.focus();
      return;
    }

    if (message.length > 5000) {
      showMessage('Message must be at most 5000 characters.', 'error');
      return;
    }

    setSubmitting(true);
    showMessage('Sending…', 'success');

    var apiUrl = '/api/feedback';
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      apiUrl = window.location.origin + '/api/feedback';
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        email: email || undefined,
        message: message,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Something went wrong');
          return data;
        });
      })
      .then(function () {
        showMessage('Thanks! Your message was sent. We’ll read it soon.', 'success');
        form.reset();
        if (charCount) charCount.textContent = '0 / 5000';
      })
      .catch(function (err) {
        showMessage(err && err.message ? err.message : 'Something went wrong. Please try again.', 'error');
      })
      .finally(function () {
        setSubmitting(false);
      });
  });
})();
