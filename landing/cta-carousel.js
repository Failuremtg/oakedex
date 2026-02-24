(function () {
  var viewport = document.getElementById('cta-carousel-viewport');
  var track = document.getElementById('cta-carousel-track');
  var dotsEl = document.getElementById('cta-carousel-dots');
  var prevBtn = document.getElementById('cta-carousel-prev');
  var nextBtn = document.getElementById('cta-carousel-next');
  if (!viewport || !track || !dotsEl) return;

  var slides = track.querySelectorAll('.cta-carousel-slide');
  var n = slides.length;
  if (n === 0) return;

  var index = 0;
  var interval = 5000;

  function getSlideWidth() {
    return slides[0] ? slides[0].offsetWidth : 260;
  }
  function getGap() {
    var trackStyle = window.getComputedStyle(track);
    return parseInt(trackStyle.gap, 10) || 20;
  }

  function setActive(i) {
    index = (i + n) % n;

    var slideWidth = getSlideWidth();
    var gap = getGap();
    var viewportWidth = viewport.offsetWidth;
    var offset = viewportWidth / 2 - slideWidth / 2 - index * (slideWidth + gap);
    track.style.transform = 'translateX(' + offset + 'px)';

    slides.forEach(function (slide, j) {
      var pos = (j - index + n) % n;
      slide.classList.remove('cta-carousel-slide--left', 'cta-carousel-slide--center', 'cta-carousel-slide--right');
      if (pos === 0) slide.classList.add('cta-carousel-slide--center');
      else if (pos === 1) slide.classList.add('cta-carousel-slide--right');
      else slide.classList.add('cta-carousel-slide--left');
    });

    dotsEl.querySelectorAll('.cta-carousel-dot').forEach(function (dot, j) {
      dot.classList.toggle('cta-carousel-dot--active', j === index);
      dot.setAttribute('aria-current', j === index ? 'true' : 'false');
    });
  }

  function goPrev() {
    setActive(index - 1);
    resetTimer();
  }

  function goNext() {
    setActive(index + 1);
    resetTimer();
  }

  if (prevBtn) prevBtn.addEventListener('click', goPrev);
  if (nextBtn) nextBtn.addEventListener('click', goNext);

  for (var i = 0; i < n; i++) {
    var dot = document.createElement('button');
    dot.type = 'button';
    var startIndex = Math.floor(n / 2);
    dot.className = 'cta-carousel-dot' + (i === startIndex ? ' cta-carousel-dot--active' : '');
    dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    dot.setAttribute('aria-current', i === startIndex ? 'true' : 'false');
    (function (j) {
      dot.addEventListener('click', function () {
        setActive(j);
        resetTimer();
      });
    })(i);
    dotsEl.appendChild(dot);
  }

  setActive(Math.floor(n / 2));

  var timer;
  function next() {
    setActive(index + 1);
  }
  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(next, interval);
  }

  resetTimer();

  window.addEventListener('resize', function () {
    setActive(index);
  });
})();
