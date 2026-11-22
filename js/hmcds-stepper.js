// ============================================================================
// HMCDS STEP-BY-STEP PLAYABLE VISUALIZER (MARKOV CHAIN + AOA)
// Animasi bertahap yang bisa di-Play, Pause, Next, Prev, atau Reset
// ============================================================================

window.HMCDS_Stepper = (function () {
  let currentStep = 0; // 0..4 (Tahap 1..5)
  let autoTimer = null;
  let isPlaying = false;

  const STEPS = [
    {
      num: 1,
      badge: 'TAHAP 1 • CF_MANAGER',
      title: 'Klasifikasi Tugas & Hitung Beban Awal',
      desc: 'Tugas IoT masuk ke Fog Broker (CF_Manager). Tugas Real-Time (T1, T2) wajib ke Fog Layer, sedangkan Non-Real-Time (T3, T4) boleh ke Fog atau Cloud. Beban awal LOAD(i) setiap VM dihitung.',
      moa: '0.20',
      mop: '0.85',
      phase: 'Persiapan Broker',
      ops: ['RT → Fog Only', 'Non-RT → Fog/Cloud'],
      vms: [
        { id: 'VM1 (Fog)',  load: 35, status: 'LOW_LOAD',   tasks: [], color: '#10b981' },
        { id: 'VM2 (Fog)',  load: 88, status: 'HIGH_LOAD',  tasks: ['T_old'], color: '#f59e0b' },
        { id: 'VM3 (Fog)',  load: 52, status: 'NORMAL',     tasks: [], color: '#38bdf8' },
        { id: 'VM4 (Cloud)',load: 30, status: 'LOW_LOAD',   tasks: [], color: '#10b981' },
        { id: 'VM5 (Cloud)',load: 45, status: 'NORMAL',     tasks: [], color: '#38bdf8' }
      ],
      queue: [
        { id: 'T1', type: 'Real-Time', target: 'Queue' },
        { id: 'T2', type: 'Real-Time', target: 'Queue' },
        { id: 'T3', type: 'Non-RT',    target: 'Queue' },
        { id: 'T4', type: 'Non-RT',    target: 'Queue' }
      ],
      formula: 'LOAD(i) = Σ [ λ₁·Eᵢ(t) + λ₂·Wᵢ(t) ]'
    },
    {
      num: 2,
      badge: 'TAHAP 2 • MARKOV CHAIN',
      title: 'Prediksi Status VM via Matriks Transisi P_ij',
      desc: 'Markov Chain menghitung peluang transisi P_ij. VM2 diprediksi OVERLOADED (P_ij ≥ MAX) sehingga DIBLOKIR agar tidak menerima tugas baru, dan beban berlebihnya dimigrasikan ke VM1 (LOW_LOAD).',
      moa: '0.20',
      mop: '0.85',
      phase: 'Prediksi Markov (Memoryless)',
      ops: ['P_ij ≥ MAX → Blokir VM2', 'P_ij ≤ MIN → Prioritas VM1'],
      vms: [
        { id: 'VM1 (Fog)',  load: 48, status: 'LOW_LOAD',   tasks: ['T_mig'], color: '#10b981' },
        { id: 'VM2 (Fog)',  load: 94, status: 'OVERLOADED', tasks: ['BLOCKED'], color: '#ef4444' },
        { id: 'VM3 (Fog)',  load: 52, status: 'NORMAL',     tasks: [], color: '#38bdf8' },
        { id: 'VM4 (Cloud)',load: 30, status: 'LOW_LOAD',   tasks: [], color: '#10b981' },
        { id: 'VM5 (Cloud)',load: 45, status: 'NORMAL',     tasks: [], color: '#38bdf8' }
      ],
      queue: [
        { id: 'T1', type: 'Real-Time', target: 'Kandidat: VM1, VM3' },
        { id: 'T2', type: 'Real-Time', target: 'Kandidat: VM1, VM3' },
        { id: 'T3', type: 'Non-RT',    target: 'Kandidat: VM1,3,4,5' },
        { id: 'T4', type: 'Non-RT',    target: 'Kandidat: VM1,3,4,5' }
      ],
      formula: 'P_ij(t) = P{ Xₙ₊₁ = j | Xₙ = i }  →  VM2 = OVERLOADED'
    },
    {
      num: 3,
      badge: 'TAHAP 3 • INISIALISASI AOA',
      title: 'Bangkitkan Populasi Solusi Valid (N_pop = 10)',
      desc: 'AOA membangkitkan 10 kandidat solusi pemetaan Task → VM hanya pada VM yang lolos filter Markov (VM1, VM3, VM4, VM5). Nilai Fitness awal (Makespan & Energy) dihitung untuk mencari best(x).',
      moa: '0.35',
      mop: '0.72',
      phase: 'Inisialisasi Populasi AOA',
      ops: ['N_pop = 10 Vektor', 'Skip VM2 Overloaded'],
      vms: [
        { id: 'VM1 (Fog)',  load: 62, status: 'KANDIDAT', tasks: ['T_mig', 'T1?'], color: '#10b981' },
        { id: 'VM2 (Fog)',  load: 72, status: 'AMAN',     tasks: ['(Terkendali)'], color: '#64748b' },
        { id: 'VM3 (Fog)',  load: 68, status: 'KANDIDAT', tasks: ['T2?'], color: '#38bdf8' },
        { id: 'VM4 (Cloud)',load: 55, status: 'KANDIDAT', tasks: ['T3?'], color: '#10b981' },
        { id: 'VM5 (Cloud)',load: 58, status: 'KANDIDAT', tasks: ['T4?'], color: '#38bdf8' }
      ],
      queue: [
        { id: 'T1', type: 'Real-Time', target: 'Uji → VM1' },
        { id: 'T2', type: 'Real-Time', target: 'Uji → VM3' },
        { id: 'T3', type: 'Non-RT',    target: 'Uji → VM4' },
        { id: 'T4', type: 'Non-RT',    target: 'Uji → VM5' }
      ],
      formula: 'Fitness: Cost_fog = min( max Σ ETC_ij ),  best(x) = X_terbaik'
    },
    {
      num: 4,
      badge: 'TAHAP 4 • ITERASI AOA (÷ × − +)',
      title: 'Eksplorasi (÷, ×) & Eksploitasi (−, +)',
      desc: 'Selama iterasi C_Iter = 1..30: saat r₁ > MOA, AOA melakukan Eksplorasi global (÷, ×) mencari kombinasi VM baru; saat r₁ ≤ MOA, AOA melakukan Eksploitasi lokal (−, +) menyempurnakan pemetaan di sekitar best(x).',
      moa: '0.74',
      mop: '0.41',
      phase: 'Eksplorasi (÷ ×) → Eksploitasi (− +)',
      ops: ['÷ Pembagian', '× Perkalian', '− Pengurangan', '+ Penjumlahan'],
      vms: [
        { id: 'VM1 (Fog)',  load: 66, status: 'OPTIMAL',  tasks: ['T_mig', 'T1'], color: '#06b6d4' },
        { id: 'VM2 (Fog)',  load: 68, status: 'STABIL',   tasks: ['(Aman)'], color: '#10b981' },
        { id: 'VM3 (Fog)',  load: 69, status: 'OPTIMAL',  tasks: ['T2'], color: '#06b6d4' },
        { id: 'VM4 (Cloud)',load: 65, status: 'OPTIMAL',  tasks: ['T3'], color: '#06b6d4' },
        { id: 'VM5 (Cloud)',load: 67, status: 'OPTIMAL',  tasks: ['T4'], color: '#06b6d4' }
      ],
      queue: [
        { id: 'T1', type: 'Real-Time', target: 'Lock → VM1' },
        { id: 'T2', type: 'Real-Time', target: 'Lock → VM3' },
        { id: 'T3', type: 'Non-RT',    target: 'Lock → VM4' },
        { id: 'T4', type: 'Non-RT',    target: 'Lock → VM5' }
      ],
      formula: 'r₁ > MOA: best(x) ÷ MOP atau × MOP  |  r₁ ≤ MOA: best(x) − MOP atau + MOP'
    },
    {
      num: 5,
      badge: 'TAHAP 5 • EKSEKUSI OPTIMAL',
      title: 'Jadwal best(x) Diterapkan — Beban Seimbang!',
      desc: 'Seluruh tugas dieksekusi sesuai jadwal terbaik best(x). Tidak ada VM yang overload! Utilisasi Fog (~68%) & Cloud (~66%) seimbang, Makespan turun 8,29% dan Delay berkurang 11,72%.',
      moa: '0.90',
      mop: '0.12',
      phase: 'Konvergensi Selesai ✓',
      ops: ['Makespan -8,29%', 'Delay -11,72%', 'PIR +4,66%'],
      vms: [
        { id: 'VM1 (Fog)',  load: 68, status: 'SEIMBANG ✓', tasks: ['T_mig', 'T1'], color: '#10b981' },
        { id: 'VM2 (Fog)',  load: 68, status: 'SEIMBANG ✓', tasks: ['(Aman)'], color: '#10b981' },
        { id: 'VM3 (Fog)',  load: 69, status: 'SEIMBANG ✓', tasks: ['T2'], color: '#10b981' },
        { id: 'VM4 (Cloud)',load: 66, status: 'SEIMBANG ✓', tasks: ['T3'], color: '#10b981' },
        { id: 'VM5 (Cloud)',load: 66, status: 'SEIMBANG ✓', tasks: ['T4'], color: '#10b981' }
      ],
      queue: [
        { id: 'T1', type: 'Selesai', target: 'VM1 (Fog)' },
        { id: 'T2', type: 'Selesai', target: 'VM3 (Fog)' },
        { id: 'T3', type: 'Selesai', target: 'VM4 (Cloud)' },
        { id: 'T4', type: 'Selesai', target: 'VM5 (Cloud)' }
      ],
      formula: 'Output: best(x) diterapkan → 0 Overload, Delay & Energi Minimum'
    }
  ];

  function render() {
    const mount = document.getElementById('hmcdsStepperMount');
    if (!mount) return;
    const s = STEPS[currentStep];

    const stepPills = STEPS.map((st, idx) => `
      <button class="stepper-pill ${idx === currentStep ? 'active' : (idx < currentStep ? 'done' : '')}"
              onclick="HMCDS_Stepper.goTo(${idx})">
        ${st.num}. ${st.badge.split('•')[1].trim()}
      </button>
    `).join('');

    const queueCards = s.queue.map(q => `
      <div class="stepper-task-chip ${q.type === 'Real-Time' ? 'rt' : (q.type === 'Selesai' ? 'done' : 'nrt')}">
        <strong>${q.id}</strong> <span>(${q.type})</span>
        <div class="stepper-task-target">→ ${q.target}</div>
      </div>
    `).join('');

    const vmCards = s.vms.map(v => `
      <div class="stepper-vm-card ${v.status.includes('OVERLOADED') ? 'overloaded' : ''}">
        <div class="stepper-vm-head">
          <span>${v.id}</span>
          <span class="stepper-vm-badge" style="background:${v.color}20; color:${v.color}; border-color:${v.color}55;">${v.status}</span>
        </div>
        <div class="stepper-vm-bar-track">
          <div class="stepper-vm-bar-fill" style="width:${v.load}%; background:${v.color};"></div>
        </div>
        <div class="stepper-vm-foot">
          <span>Load: <strong>${v.load}%</strong></span>
          <span>${v.tasks.length ? v.tasks.join(', ') : 'Siap'}</span>
        </div>
      </div>
    `).join('');

    const opBadges = s.ops.map(op => `<span class="stepper-op-badge">${op}</span>`).join('');

    mount.innerHTML = `
      <div class="hmcds-stepper-box">
        <div class="stepper-topbar">
          <div>
            <span class="stepper-step-badge">${s.badge}</span>
            <h4 class="stepper-title">${s.title}</h4>
          </div>
          <div class="stepper-controls">
            <button class="btn-stepper" onclick="HMCDS_Stepper.prev()" ${currentStep === 0 ? 'disabled' : ''}>⏮ Prev</button>
            <button class="btn-stepper primary" onclick="HMCDS_Stepper.togglePlay()">
              ${isPlaying ? '⏸ Pause' : '▶ Play Tahapan'}
            </button>
            <button class="btn-stepper" onclick="HMCDS_Stepper.next()" ${currentStep === STEPS.length - 1 ? 'disabled' : ''}>Next ⏭</button>
            <button class="btn-stepper" onclick="HMCDS_Stepper.reset()">↺ Reset</button>
          </div>
        </div>

        <div class="stepper-pills-row">${stepPills}</div>

        <div class="stepper-stage-grid">
          <div class="stepper-col-left">
            <div class="stepper-section-label">📥 Antrean Tugas IoT</div>
            <div class="stepper-queue-list">${queueCards}</div>
            <div class="stepper-meta-box">
              <div><strong>Fase:</strong> ${s.phase}</div>
              <div><strong>MOA:</strong> <code>${s.moa}</code> &bull; <strong>MOP:</strong> <code>${s.mop}</code></div>
              <div class="stepper-ops-wrap">${opBadges}</div>
            </div>
          </div>

          <div class="stepper-col-right">
            <div class="stepper-section-label">🖥️ Status VM Fog (15 VM) &amp; Cloud (40 VM)</div>
            <div class="stepper-vm-grid">${vmCards}</div>
          </div>
        </div>

        <div class="stepper-explain-box">
          <div class="stepper-formula-line"><code>${s.formula}</code></div>
          <p>${s.desc}</p>
        </div>
      </div>
    `;
  }

  function stopPlay() {
    isPlaying = false;
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function togglePlay() {
    if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
    if (isPlaying) {
      stopPlay();
      render();
      return;
    }
    if (currentStep === STEPS.length - 1) currentStep = 0;
    isPlaying = true;
    render();
    autoTimer = setInterval(() => {
      if (currentStep < STEPS.length - 1) {
        currentStep++;
        if (typeof CloudAudio !== 'undefined' && CloudAudio.playMarkovScan) CloudAudio.playMarkovScan();
        render();
      } else {
        stopPlay();
        if (typeof CloudAudio !== 'undefined' && CloudAudio.playClusterStabilized) CloudAudio.playClusterStabilized();
        render();
      }
    }, 2600);
  }

  function next() {
    stopPlay();
    if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      render();
    }
  }

  function prev() {
    stopPlay();
    if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
    if (currentStep > 0) {
      currentStep--;
      render();
    }
  }

  function goTo(idx) {
    stopPlay();
    if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
    currentStep = Math.max(0, Math.min(STEPS.length - 1, idx));
    render();
  }

  function reset() {
    stopPlay();
    if (typeof CloudAudio !== 'undefined' && CloudAudio.playClick) CloudAudio.playClick();
    currentStep = 0;
    render();
  }

  return { render, togglePlay, next, prev, goTo, reset };
})();
