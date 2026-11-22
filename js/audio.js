// ============================================================================
// HMCDS FOG-CLOUD CYBER-DISPATCHER — PROCEDURAL WEB AUDIO ENGINE
// ============================================================================

const CloudAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let compressor = null;
  let bgmGain = null;

  let isMuted = false;
  let isPausedForSlide = false;
  let bgmInterval = null;
  let bgmStep = 0;
  let lastMoveSoundTime = 0;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, ctx.currentTime);
        compressor.knee.setValueAtTime(12, ctx.currentTime);
        compressor.ratio.setValueAtTime(4, ctx.currentTime);
        compressor.attack.setValueAtTime(0.005, ctx.currentTime);
        compressor.release.setValueAtTime(0.15, ctx.currentTime);

        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.9, ctx.currentTime);

        bgmGain = ctx.createGain();
        bgmGain.gain.setValueAtTime(0.45, ctx.currentTime);

        bgmGain.connect(compressor);
        masterGain.connect(compressor);
        compressor.connect(ctx.destination);
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  ['pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => ensureContext(), { passive: true });
  });

  function playTone(freq, type, duration, gainVal = 0.22, slideFreq = null, useBgmBus = false) {
    if (isMuted) return;
    if (useBgmBus && isPausedForSlide) return;
    ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(useBgmBus ? bgmGain : masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playFootstep() {
    if (isMuted || isPausedForSlide) return;
    const nowMs = performance.now();
    if (nowMs - lastMoveSoundTime < 280) return;
    lastMoveSoundTime = nowMs;
    playTone(180 + Math.random() * 35, 'sine', 0.07, 0.07, 140);
  }

  // [J] Markov Radar Scan (Sonar Cyan Ping)
  function playMarkovScan() {
    if (isMuted || isPausedForSlide) return;
    ensureContext();
    playTone(680, 'sine', 0.22, 0.28, 1220);
    setTimeout(() => {
      if (!isMuted && !isPausedForSlide) playTone(980, 'triangle', 0.28, 0.22, 540);
    }, 90);
  }

  // [K] AOA Arithmetic Beam (Harmonic Optimizer Synth)
  function playAOABeam() {
    if (isMuted || isPausedForSlide) return;
    ensureContext();
    playTone(440, 'sawtooth', 0.18, 0.16, 880);
    setTimeout(() => {
      if (!isMuted && !isPausedForSlide) playTone(660, 'triangle', 0.25, 0.24, 990);
    }, 80);
  }

  // Cluster Stabilized Chime
  function playClusterStabilized() {
    if (isMuted) return;
    ensureContext();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      setTimeout(() => playTone(f, 'triangle', 0.26, 0.22), idx * 65);
    });
  }

  function playClick() {
    if (isMuted) return;
    playTone(580, 'sine', 0.07, 0.14, 720);
  }

  function startBGM() {
    if (bgmInterval) return;
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63];
    bgmInterval = setInterval(() => {
      if (isMuted || isPausedForSlide) return;
      const freq = scale[bgmStep % scale.length];
      playTone(freq, 'sine', 0.38, 0.07, null, true);
      if (bgmStep % 2 === 0) {
        playTone(freq * 0.5, 'triangle', 0.45, 0.06, null, true);
      }
      bgmStep++;
    }, 480);
  }

  function pauseForPresentation() {
    isPausedForSlide = true;
  }

  function resumeFromPresentation() {
    isPausedForSlide = false;
  }

  function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('btnAudioToggle');
    if (btn) btn.innerText = isMuted ? '🔇' : '🔊';
    if (!isMuted) playClick();
  }

  return {
    playFootstep,
    playMarkovScan,
    playAOABeam,
    playClusterStabilized,
    playClick,
    startBGM,
    pauseForPresentation,
    resumeFromPresentation,
    toggleMute
  };
})();
