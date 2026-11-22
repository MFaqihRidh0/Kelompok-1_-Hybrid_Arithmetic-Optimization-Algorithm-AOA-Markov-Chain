// ============================================================================
// HMCDS STANDARD PRESENTATION MODE CONTROLLER
// ============================================================================

let stdSlideIdx = 0;

function updateStdSlide() {
  const slides = document.querySelectorAll('.std-slide');
  slides.forEach((s, idx) => s.classList.toggle('active', idx === stdSlideIdx));

  const counter = document.getElementById('stdCounter');
  if (counter) counter.innerText = `Slide ${stdSlideIdx + 1} / ${slides.length}`;

  const bar = document.getElementById('stdProgressBar');
  if (bar) bar.style.width = `${((stdSlideIdx + 1) / slides.length) * 100}%`;

  const prevBtn = document.getElementById('btnStdPrev');
  const nextBtn = document.getElementById('btnStdNext');
  if (prevBtn) prevBtn.disabled = stdSlideIdx === 0;
  if (nextBtn) nextBtn.disabled = stdSlideIdx === slides.length - 1;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStdSlide() {
  const slides = document.querySelectorAll('.std-slide');
  if (stdSlideIdx < slides.length - 1) {
    stdSlideIdx++;
    updateStdSlide();
  }
}

function prevStdSlide() {
  if (stdSlideIdx > 0) {
    stdSlideIdx--;
    updateStdSlide();
  }
}

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') nextStdSlide();
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevStdSlide();
});

window.addEventListener('DOMContentLoaded', () => {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
  updateStdSlide();
  if (typeof updateHMCDSimulatorUI === 'function') {
    updateHMCDSimulatorUI();
  }
});
