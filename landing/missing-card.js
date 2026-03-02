(function () {
  var form = document.getElementById('missing-card-form');
  var messageEl = document.getElementById('missing-card-message');
  var submitBtn = document.getElementById('missing-card-submit');
  var fileInput = document.getElementById('card-image');
  var hintEl = document.getElementById('card-image-hint');

  var MAX_SIZE = 4 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function showMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.hidden = !text;
    messageEl.className = 'signup-message signup-message--' + (type || '');
  }

  function setSubmitting(loading) {
    if (submitBtn) submitBtn.disabled = loading;
  }

  if (fileInput && hintEl) {
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      hintEl.textContent = file ? file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)' : 'No file chosen';
    });
  }

  if (!form) return;

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        if (typeof result === 'string' && result.indexOf('base64,') !== -1) {
          resolve(result.split(',')[1]);
        } else {
          reject(new Error('Could not read file'));
        }
      };
      reader.onerror = function () { reject(new Error('Could not read file')); };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var cardNameInput = form.querySelector('[name="cardName"]');
    var setNameInput = form.querySelector('[name="setName"]');
    var notesInput = form.querySelector('[name="notes"]');
    var emailInput = form.querySelector('[name="email"]');

    var cardName = cardNameInput ? cardNameInput.value.trim() : '';
    var setName = setNameInput ? setNameInput.value.trim() : '';
    var notes = notesInput ? notesInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';

    if (!cardName) {
      showMessage('Please enter the card name.', 'error');
      if (cardNameInput) cardNameInput.focus();
      return;
    }

    var file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) {
      showMessage('Please choose a photo of the card.', 'error');
      if (fileInput) fileInput.focus();
      return;
    }

    if (file.size > MAX_SIZE) {
      showMessage('Image must be 4 MB or smaller. Please use a smaller or compressed image.', 'error');
      return;
    }

    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      showMessage('Please use a JPG, PNG, WebP or GIF image.', 'error');
      return;
    }

    setSubmitting(true);
    showMessage('Uploading…', 'success');

    readFileAsBase64(file)
      .then(function (imageBase64) {
        var apiUrl = '/api/missing-card';
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          apiUrl = window.location.origin + '/api/missing-card';
        }
        return fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardName: cardName,
            setName: setName || undefined,
            notes: notes || undefined,
            email: email || undefined,
            imageBase64: imageBase64,
            imageFileName: file.name || 'image.jpg',
          }),
        });
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Something went wrong');
          return data;
        });
      })
      .then(function () {
        showMessage('Thanks! Your card submission was received. We’ll use it to add the card.', 'success');
        form.reset();
        if (hintEl) hintEl.textContent = 'No file chosen';
      })
      .catch(function (err) {
        showMessage(err && err.message ? err.message : 'Something went wrong. Please try again.', 'error');
      })
      .finally(function () {
        setSubmitting(false);
      });
  });
})();
