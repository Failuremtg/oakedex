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
      return Promise.reject(new Error('Firebase not loaded'));
    }
    var app;
    try {
      app = window.firebase.app();
    } catch (e) {
      try {
        app = window.firebase.initializeApp(config);
      } catch (e2) {
        showMessage(messageEl, 'Could not start sign-up. Please refresh and try again.', 'error');
        return Promise.reject(e2);
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
      var msg = (err && err.message) ? err.message : 'Something went wrong. Please try again.';
      showMessage(messageEl, msg, 'error');
      throw err;
    });
  }

  function setupForm(formId, messageId, successText, source) {
    var form = document.getElementById(formId);
    var messageEl = document.getElementById(messageId);
    if (!form || !messageEl) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!useFirebase) {
        showMessage(messageEl, 'Sign-up is not configured. Please try again later.', 'error');
        return;
      }
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
      showMessage(messageEl, 'Sending…', 'success');

      var promise;
      try {
        promise = submitViaFirebase(form, email, beta, source, messageEl, successText);
      } catch (err) {
        showMessage(messageEl, (err && err.message) ? err.message : 'Something went wrong. Please try again.', 'error');
        emailInput.disabled = false;
        return;
      }
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () {}).finally(function () {
          emailInput.disabled = false;
        });
      } else {
        emailInput.disabled = false;
      }
    });
  }

  setupForm('signup-form', 'signup-message', "You're on the list! We'll email you when there's news or beta invites.", 'hero');
  setupForm('cta-signup-form', 'cta-signup-message', "You're on the beta list! We'll be in touch.", 'cta');
})();
