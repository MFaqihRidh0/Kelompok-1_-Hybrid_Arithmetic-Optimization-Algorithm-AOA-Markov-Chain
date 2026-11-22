// ============================================================================
// HMCDS FOG-CLOUD CYBER-DISPATCHER — UI CONTROLLER, KATEX & SIMULATOR
// ============================================================================

let currentOpenSlideIdx = 0;

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

  titleEl.innerText = `Misi HMCDS • ${stabilizedCount}/${CLUSTER_STATIONS.length} Cluster Stabil`;

  const nextCl = clusterObjects.find(c => !c.stabilized);
  if (nextCl) {
    descEl.innerHTML = `Target Berikutnya: <strong>${nextCl.station.name}</strong> (${nextCl.station.layerName}). Tekan <strong>📡 Markov [J]</strong> & <strong>⚡ AOA [K]</strong> (atau <strong>[L]</strong>) untuk membuka Slide ${nextCl.station.posNum}!`;
  } else {
    descEl.innerHTML = `🎉 <strong>Seluruh ${CLUSTER_STATIONS.length} Cluster Telah Stabil!</strong> Dekati Cluster hijau mana pun & tekan <strong>[O]</strong> untuk membuka kembali slide.`;
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

  updateHMCDSimulatorUI();
}

function closeSlideWindow() {
  const overlay = document.getElementById('slideModalOverlay');
  const wasActive = overlay && overlay.classList.contains('active');
  if (overlay) overlay.classList.remove('active');

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
      ? `<span style="color:#059669; font-size:10.5px;">🟢 Stabil [O]</span>`
      : `<span style="color:#dc2626; font-size:10.5px;">🔴 Overload 100%</span>`;

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
// INTERACTIVE HMCDS SIMULATOR CONSOLE (Slide 7)
// ============================================================================
function updateHMCDSimulatorUI() {
  const algoEl = document.getElementById('simAlgoSelect');
  const taskEl = document.getElementById('simTaskSelect');
  if (!algoEl || !taskEl) return;

  const algo = algoEl.value;
  const tasks = parseInt(taskEl.value, 10);
  const d = HMCDS_SIM_DATA[tasks][algo];
  if (!d) return;

  document.getElementById('simMakespanVal').innerText = `${d.makespan.toFixed(2)} dtk`;
  document.getElementById('simSchedVal').innerText = `${d.schedTime.toFixed(2)} dtk`;
  document.getElementById('simDelayVal').innerText = algo === 'hmcds' ? '-11,72%' : (algo === 'aoa' ? '-8,40%' : 'Baseline');
  document.getElementById('simPirVal').innerText = algo === 'hmcds' ? '+4,66% (Unggul)' : (algo === 'aoa' ? '+2,10%' : '0,00%');

  document.getElementById('simFogBar').style.width = `${d.fogUtil}%`;
  document.getElementById('simFogPct').innerText = `${d.fogUtil}%`;
  document.getElementById('simCloudBar').style.width = `${d.cloudUtil}%`;
  document.getElementById('simCloudPct').innerText = `${d.cloudUtil}%`;
  document.getElementById('simNoteText').innerText = d.note;
}

function runHMCDSimulation() {
  CloudAudio.playAOABeam();
  updateHMCDSimulatorUI();
}
