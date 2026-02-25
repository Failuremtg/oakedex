(function () {
  var useFirebase = typeof window !== 'undefined' && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId;

  function showMessage(messageEl, text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.hidden = !text;
    messageEl.className = 'signup-message signup-message--' + (type || '');
  }

  function submitViaFirebase(form, email, beta, source, messageEl, successText) {
    var config = window.FIREBASE_CONFIG;
    if (!window.firebase || !window.firebase.firestore) {
      showMessage(messageEl, 'Sign-up is not configured. Please try again later.', 'error');
      return Promise.reject();
    }
    var app = window.firebase.app();
    if (!app) {
      try {
        app = window.firebase.initializeApp(config);
      } catch (e) {
        app = window.firebase.app();
      }
    }
    var db = window.firebase.firestore(app);
    var doc = {
      email: email.trim().toLowerCase(),
      beta: beta,
      source: source,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    return db.collection('landingSignups').add(doc).then(function () {
      showMessage(messageEl, successText, 'success');
      form.reset();
    }).catch(function (err) {
      showMessage(messageEl, err.message || 'Something went wrong. Please try again.', 'error');
      throw err;
    });
  }

  function submitViaFormspree(form, messageEl, successText) {
    var action = form.getAttribute('action');
    if (!action || action.indexOf('YOUR_FORM_ID') !== -1) {
      showMessage(messageEl, 'Sign-up is not configured yet. Please try again later.', 'error');
      return Promise.reject();
    }
    var body = new FormData(form);
    return fetch(action, {
      method: 'POST',
      body: body,
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (res.ok) {
        showMessage(messageEl, successText, 'success');
        form.reset();
      } else {
        return res.json().then(function (data) {
          showMessage(messageEl, data.error || 'Something went wrong. Please try again.', 'error');
        });
      }
    });
  }

  function setupForm(formId, messageId, successText, source) {
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

      var email = emailInput.value.trim();
      var betaCheckbox = form.querySelector('input[name="beta"]');
      var beta = betaCheckbox ? betaCheckbox.checked : false;

      emailInput.disabled = true;
      showMessage(messageEl, '', 'success');

      var promise = useFirebase
        ? submitViaFirebase(form, email, beta, source, messageEl, successText)
        : submitViaFormspree(form, messageEl, successText);

      promise.catch(function () {}).finally(function () {
        emailInput.disabled = false;
      });
    });
  }

  setupForm('signup-form', 'signup-message', "You're on the list! We'll email you when there's news or beta invites.", 'hero');
  setupForm('cta-signup-form', 'cta-signup-message', "You're on the beta list! We'll be in touch.", 'cta');
})();
