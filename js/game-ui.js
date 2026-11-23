// ============================================================================
// HMCDS FOG-CLOUD CYBER-DISPATCHER — UI CONTROLLER, KATEX & 3D STAGE SIMULATOR
// ============================================================================

let currentOpenSlideIdx = 0;
let simClockTimer = null;
let simClockValue = 0;

function startGameFromIntro() {
  if (!isIntroMode) return;
  isIntroMode = false;

  const introEl = document.getElementById('introOverlay');
  if (introEl) introEl.classList.add('hidden');

  const hudEl = document.getElementById('gameHudLayer');
  if (hudEl) hudEl.classList.remove('hidden');

  CloudAudio.startBGM();
  CloudAudio.playClusterStabilized();
  updateQuestHudProgress();
  renderTeleportList();
}

function updateQuestHudProgress() {
  const titleEl = document.getElementById('questProgressTitle');
  const descEl = document.getElementById('questProgressDesc');
  if (!titleEl || !descEl) return;

  titleEl.innerText = `Misi HMCDS • ${stabilizedCount}/${CLUSTER_STATIONS.length} Awan Pos Putih`;

  const nextCl = clusterObjects.find(c => !c.stabilized);
  if (nextCl) {
    descEl.innerHTML = `Target Berikutnya: <strong>${nextCl.station.name}</strong> (${nextCl.station.layerName}). Serang 2x dengan <strong>📡 Markov [J]</strong> & <strong>⚡ AOA [K]</strong> (atau <strong>[L]</strong>) agar awan mendung berubah putih & membuka Slide ${nextCl.station.posNum}!`;
  } else {
    descEl.innerHTML = `🎉 <strong>Seluruh ${CLUSTER_STATIONS.length} Awan Pos Telah Putih & Stabil!</strong> Dekati Pos mana pun & tekan <strong>[O]</strong> untuk membuka kembali slide.`;
  }
  renderTeleportList();
}

function renderKaTeXInElement(el) {
  if (typeof renderMathInElement === 'function' && el) {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

function openSlideWindow(slideIdx) {
  currentOpenSlideIdx = slideIdx;
  const overlay = document.getElementById('slideModalOverlay');
  overlay.classList.add('active');

  if (typeof CloudAudio !== 'undefined' && CloudAudio.pauseForPresentation) {
    CloudAudio.pauseForPresentation();
  }

  const slides = document.querySelectorAll('.game-slide-pane');
  slides.forEach((s, idx) => {
    s.style.display = idx === slideIdx ? 'block' : 'none';
  });

  const st = CLUSTER_STATIONS[slideIdx];
  document.getElementById('winStationBadge').innerText = `+ POS ${st.posNum} STABIL • ${st.layerName}`;
  document.getElementById('winStationTitle').innerText = st.slideTitle;
  document.getElementById('winFooterCounter').innerText = `Slide Pos ${st.posNum} / ${CLUSTER_STATIONS.length}`;

  const bodyEl = document.getElementById('slideWindowBody');
  if (bodyEl) {
    bodyEl.scrollTop = 0;
    renderKaTeXInElement(bodyEl);
  }

  if (typeof HMCDSStage3D !== 'undefined') {
    const stageCanvas = document.getElementById('embeddedThreeCanvas');
    const activePane = slides[slideIdx];
    if (activePane && activePane.contains(stageCanvas)) {
      HMCDSStage3D.init(stageCanvas);
      HMCDSStage3D.start();
      setTimeout(() => HMCDSStage3D.resize(), 60);
      setTimeout(() => HMCDSStage3D.resize(), 200);
    } else {
      HMCDSStage3D.stop();
    }
  }

  if (typeof HMCDS_Stepper !== 'undefined') {
    HMCDS_Stepper.render();
  }
}

function closeSlideWindow() {
  const overlay = document.getElementById('slideModalOverlay');
  const wasActive = overlay && overlay.classList.contains('active');
  if (overlay) overlay.classList.remove('active');

  if (typeof HMCDSStage3D !== 'undefined') {
    HMCDSStage3D.stop();
  }

  if (wasActive && typeof CloudAudio !== 'undefined' && CloudAudio.resumeFromPresentation) {
    CloudAudio.resumeFromPresentation();
    CloudAudio.playClick();
  }
}

function toggleSlideFullscreen() {
  CloudAudio.playClick();
  const win = document.getElementById('slideFloatingWindow');
  const btn = document.getElementById('btnFullscreenToggle');
  const isFull = win.classList.toggle('fullscreen-mode');
  if (btn) {
    btn.innerText = isFull ? '🗗 Ukuran Mengambang' : '⛶ Layar Penuh';
  }
  if (typeof HMCDSStage3D !== 'undefined') {
    setTimeout(() => HMCDSStage3D.resize(), 100);
    setTimeout(() => HMCDSStage3D.resize(), 300);
  }
}

function stepSlideInWindow(dir) {
  CloudAudio.playClick();
  const nextIdx = (currentOpenSlideIdx + dir + CLUSTER_STATIONS.length) % CLUSTER_STATIONS.length;
  openSlideWindow(nextIdx);
}

function closeAndWalkNext() {
  closeSlideWindow();
  walkToNextUnstabilizedPos();
}

function toggleTeleportPopover() {
  CloudAudio.playClick();
  const pop = document.getElementById('teleportPopover');
  pop.classList.toggle('active');
  renderTeleportList();
}

function renderTeleportList() {
  const listEl = document.getElementById('teleportListContainer');
  if (!listEl) return;

  listEl.innerHTML = CLUSTER_STATIONS.map((st, idx) => {
    const cl = clusterObjects[idx];
    const isOk = cl && cl.stabilized;
    const badge = isOk
      ? `<span style="color:#059669; font-size:10.5px;">☁️ Putih Stabil [O]</span>`
      : `<span style="color:#dc2626; font-size:10.5px;">🌩️ Mendung (2x Serang)</span>`;

    return `
      <div class="teleport-item">
        <div onclick="teleportToPos(${idx})" style="flex:1;">
          <div>Pos ${st.posNum}: ${st.slideTitle.replace(/^Slide \d+:\s*/, '')}</div>
          ${badge}
        </div>
        <button class="btn-hud-secondary" style="padding:3px 8px; font-size:10px;" onclick="openSlideWindow(${idx}); document.getElementById('teleportPopover').classList.remove('active');">
          📖 Buka
        </button>
      </div>
    `;
  }).join('');
}

function openCreditsModal() {
  CloudAudio.playClick();
  const modal = document.getElementById('creditsModal');
  if (modal) modal.classList.add('active');
}

function closeCreditsModal() {
  CloudAudio.playClick();
  const modal = document.getElementById('creditsModal');
  if (modal) modal.classList.remove('active');
}

// ============================================================================
// EMBEDDED 3D TOPOLOGY STAGE (PER-BABAK CONTROLLER)
// ============================================================================
function setEmbedded3DMode(mode) {
  if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
  if (typeof HMCDSStage3D !== 'undefined') {
    HMCDSStage3D.setMode(mode);
  }
}

function toggleEmbedded3DAutoAll() {
  if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
  if (typeof HMCDSStage3D !== 'undefined' && HMCDSStage3D.toggleAutoAll) {
    HMCDSStage3D.toggleAutoAll();
  }
}

// ============================================================================
// INTERACTIVE SCENARIO SELECTOR FOR SLIDE 1 (HMCDS vs AOA-SSA)
// ============================================================================
const HYBRID_COMPARISON_SCENARIOS = {
  'iot-rt': {
    badge: 'SKENARIO 1 • TRAFIK IOT REAL-TIME TINGGI',
    winner: '🏆 HMCDS Unggul Mutlak (Skor 95 vs 58)',
    hmcdsScore: 95,
    aoassaScore: 58,
    summary: 'Saat ribuan sensor IoT mengirim tugas Real-Time & Non-Real-Time secara bersamaan, HMCDS memisahkan tugas Real-Time ke Fog Layer dan menggunakan Markov Chain untuk meramal VM yang akan penuh sebelum terjadi antrean (Delay turun 11,72%). Sebaliknya, AOA-SSA dirancang untuk replikasi file, sehingga tidak memiliki peramal antrean CPU real-time.'
  },
  'fog-limit': {
    badge: 'SKENARIO 2 • PERANGKAT FOG KAPASITAS TERBATAS (RAM 0,5 GB)',
    winner: '🏆 HMCDS Lebih Ringan 38,5% (Skor 92 vs 52)',
    hmcdsScore: 92,
    aoassaScore: 52,
    summary: 'Node Fog memiliki CPU kecil (100–2.800 MIPS) & RAM 0,5 GB. HMCDS sangat ringan karena sifat Memoryless pada Markov Chain hanya butuh status saat ini O(1) + 1 metaheuristik AOA (13,41 dtk untuk 1.000 tugas). Sedangkan AOA-SSA menjalankan 2 metaheuristik berurutan (AOA + SSA) ditambah matriks rute terpendek Floyd O(V³) yang berat bagi node Edge.'
  },
  'data-rep': {
    badge: 'SKENARIO 3 • REPLIKASI & PENEMPATAN FILE ANTAR-GEOGRAFIS',
    winner: '⚖️ AOA-SSA Cocok untuk Storage (Skor 64 vs 89)',
    hmcdsScore: 64,
    aoassaScore: 89,
    summary: 'Jika masalah utamanya adalah menggandakan (replikasi) file populer berukuran besar di antara banyak Data Center lintas kota berbasis matriks jarak Floyd, maka AOA-SSA memang dirancang untuk itu. Namun karena fokus topik kita adalah Dynamic Task Scheduling & Load Balancing VM, maka HMCDS adalah pilihan yang paling tepat sasaran.'
  }
};

function selectHybridScenario(key) {
  if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
  const data = HYBRID_COMPARISON_SCENARIOS[key];
  if (!data) return;

  ['iot-rt', 'fog-limit', 'data-rep'].forEach(k => {
    document.querySelectorAll(`.scen-btn-${k}`).forEach(b => {
      b.classList.toggle('active', k === key);
    });
  });

  document.querySelectorAll('.scen-badge-out').forEach(el => { el.innerText = data.badge; });
  document.querySelectorAll('.scen-winner-out').forEach(el => { el.innerText = data.winner; });
  document.querySelectorAll('.scen-summary-out').forEach(el => { el.innerText = data.summary; });
  document.querySelectorAll('.scen-hmcds-bar').forEach(el => { el.style.width = `${data.hmcdsScore}%`; });
  document.querySelectorAll('.scen-hmcds-val').forEach(el => { el.innerText = `${data.hmcdsScore}/100`; });
  document.querySelectorAll('.scen-aoassa-bar').forEach(el => { el.style.width = `${data.aoassaScore}%`; });
  document.querySelectorAll('.scen-aoassa-val').forEach(el => { el.innerText = `${data.aoassaScore}/100`; });
}

function updateHMCDSimulatorUI() {
  const algoEl = document.getElementById('simAlgoSelect');
  const taskEl = document.getElementById('simTaskSelect');
  if (!algoEl || !taskEl) return;

  const algo = algoEl.value;
  const tasks = parseInt(taskEl.value, 10);
  const d = HMCDS_SIM_DATA[tasks][algo];
  if (!d) return;

  const activeTag = document.getElementById('simActiveTag');
  if (activeTag) {
    if (algo === 'hmcds') {
      activeTag.innerText = 'Hybrid HMCDS (Markov + AOA)';
      activeTag.style.background = '#e0f2fe';
      activeTag.style.color = '#0369a1';
    } else if (algo === 'aoa') {
      activeTag.innerText = 'AOA Saja (Tanpa Markov)';
      activeTag.style.background = '#fef3c7';
      activeTag.style.color = '#b45309';
    } else {
      activeTag.innerText = 'WOA Baseline (Overload)';
      activeTag.style.background = '#fee2e2';
      activeTag.style.color = '#991b1b';
    }
  }

  const msEl = document.getElementById('simMakespanVal');
  if (msEl) msEl.innerText = `${d.makespan.toFixed(2)} s`;
  const scEl = document.getElementById('simSchedVal');
  if (scEl) scEl.innerText = `${d.schedTime.toFixed(2)} s`;
  const dlEl = document.getElementById('simDelayVal');
  if (dlEl) dlEl.innerText = algo === 'hmcds' ? '-11,72%' : (algo === 'aoa' ? '-8,40%' : 'Baseline');
  const pirEl = document.getElementById('simPirVal');
  if (pirEl) pirEl.innerText = algo === 'hmcds' ? '+4,66%' : (algo === 'aoa' ? '+2,10%' : '0,00%');

  const fogBar = document.getElementById('simFogBar');
  const fogPct = document.getElementById('simFogPct');
  if (fogBar && fogPct) {
    fogBar.style.width = `${d.fogUtil}%`;
    fogBar.className = `meter-fill ${algo === 'woa' ? 'fill-danger' : 'fill-sky'}`;
    fogPct.innerText = algo === 'woa' ? `${d.fogUtil}% (Overload ⚠️)` : `${d.fogUtil}% (Optimal Low-Load)`;
  }

  const edgeUtil = algo === 'hmcds' ? 65 : (algo === 'aoa' ? 82 : 96);
  const edgeBar = document.getElementById('simEdgeBar');
  const edgePct = document.getElementById('simEdgePct');
  if (edgeBar && edgePct) {
    edgeBar.style.width = `${edgeUtil}%`;
    edgeBar.className = `meter-fill ${algo === 'hmcds' ? 'fill-green' : 'fill-danger'}`;
    edgePct.innerText = algo === 'hmcds' ? `${edgeUtil}% (Dijaga Markov P_ij)` : `${edgeUtil}% (Bottleneck!)`;
  }

  const cloudBar = document.getElementById('simCloudBar');
  const cloudPct = document.getElementById('simCloudPct');
  if (cloudBar && cloudPct) {
    cloudBar.style.width = `${d.cloudUtil}%`;
    cloudPct.innerText = `${d.cloudUtil}% (${algo === 'woa' ? 'Underutilized' : 'Non-RT Seimbang'})`;
  }

  const banner = document.getElementById('simStatusBanner');
  const noteEl = document.getElementById('simNoteText');
  if (noteEl) noteEl.innerHTML = `<strong>Hasil Analisis:</strong> ${d.note}`;
  if (banner) {
    banner.className = `sim-status-banner ${algo === 'woa' ? 'danger' : ''}`;
  }
}

function runHMCDSimulation() {
  if (typeof CloudAudio !== 'undefined' && CloudAudio.playAOABeam) CloudAudio.playAOABeam();
  updateHMCDSimulatorUI();

  const algoEl = document.getElementById('simAlgoSelect');
  const taskEl = document.getElementById('simTaskSelect');
  const algo = algoEl ? algoEl.value : 'hmcds';
  const tasks = taskEl ? parseInt(taskEl.value, 10) : 500;
  const targetMakespan = HMCDS_SIM_DATA[tasks][algo].makespan;

  if (typeof HMCDSStage3D !== 'undefined') {
    HMCDSStage3D.runSimulation(algo);
  }

  if (simClockTimer) clearInterval(simClockTimer);
  simClockValue = 0;
  const step = targetMakespan / 26;
  simClockTimer = setInterval(() => {
    simClockValue += step;
    if (simClockValue >= targetMakespan) {
      simClockValue = targetMakespan;
      clearInterval(simClockTimer);
    }
    const clk = document.getElementById('clockValue');
    if (clk) clk.innerText = `${simClockValue.toFixed(2)}s`;
  }, 45);
}

function resetHMCDSimulation() {
  if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
  if (simClockTimer) clearInterval(simClockTimer);
  const clk = document.getElementById('clockValue');
  if (clk) clk.innerText = '0.00s';
  const algoEl = document.getElementById('simAlgoSelect');
  if (algoEl) algoEl.value = 'hmcds';
  if (typeof HMCDSStage3D !== 'undefined') {
    HMCDSStage3D.clearTasks();
  }
  updateHMCDSimulatorUI();
}
