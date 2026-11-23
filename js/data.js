// ============================================================================
// HMCDS DATA REPOSITORY — KHALEIDIAN ET AL. (2025) + 3-LAYER WORLD WAYPOINTS
// ============================================================================

const HMCDS_BENCHMARK = {
  execTime: {
    500:  { hmcds: 6.86,  fa: 7.46,  pso: 8.96,  woa: 10.98, jso: 11.56, hho: 15.43 },
    1000: { hmcds: 13.41, fa: 14.72, pso: 15.63, woa: 21.34, jso: 23.14, hho: 30.84 },
    1500: { hmcds: 19.21, fa: 20.87, pso: 24.61, woa: 29.84, jso: 34.18, hho: 43.21 }
  },
  makespan: {
    500:  { hmcds: 47.21,  csa: 55.09,  hgswc: 58.45,  choa: 65.70,  woa: 71.53 },
    1000: { hmcds: 96.83,  csa: 106.67, hgswc: 116.52, choa: 128.18, woa: 142.66 },
    2000: { hmcds: 138.21, csa: 157.99, hgswc: 178.16, choa: 182.64, woa: 205.26 }
  },
  tradeoff500: {
    markovOnly: 2.45,
    aoaOnly: 4.34,
    hmcds: 6.86
  }
};

// Data untuk Simulator Interaktif di Slide 7 (berdasarkan metrik NASA iPSC & trade-off jurnal)
const HMCDS_SIM_DATA = {
  500: {
    'woa': {
      makespan: 71.53,
      schedTime: 10.98,
      delayIdx: 1.00,
      energyIdx: 1.00,
      fogUtil: 92,
      cloudUtil: 38,
      note: 'Tanpa prediksi Markov, beberapa Fog VM mengalami bottleneck sementara Cloud VM kurang termanfaatkan.'
    },
    'aoa': {
      makespan: 54.10,
      schedTime: 4.34,
      delayIdx: 0.91,
      energyIdx: 0.90,
      fogUtil: 76,
      cloudUtil: 58,
      note: 'AOA menata pemetaan secara global, namun masih reaktif terhadap lonjakan beban VM.'
    },
    'hmcds': {
      makespan: 47.21,
      schedTime: 6.86,
      delayIdx: 0.88,
      energyIdx: 0.85,
      fogUtil: 68,
      cloudUtil: 66,
      note: 'Markov memprediksi overload lebih awal; AOA memetakan tugas ke VM Low-Load sehingga Makespan & Delay turun drastis.'
    }
  },
  1000: {
    'woa': {
      makespan: 142.66,
      schedTime: 21.34,
      delayIdx: 1.00,
      energyIdx: 1.00,
      fogUtil: 95,
      cloudUtil: 41,
      note: 'Antrean Real-Time di Fog menumpuk dan memicu keterlambatan signifikan.'
    },
    'aoa': {
      makespan: 108.45,
      schedTime: 9.85,
      delayIdx: 0.92,
      energyIdx: 0.91,
      fogUtil: 79,
      cloudUtil: 61,
      note: 'Optimasi AOA menekan Makespan, namun beberapa tugas masih terjebak ke VM hampir penuh.'
    },
    'hmcds': {
      makespan: 96.83,
      schedTime: 13.41,
      delayIdx: 0.88,
      energyIdx: 0.86,
      fogUtil: 71,
      cloudUtil: 69,
      note: 'Hybrid HMCDS menyeimbangkan 15 Fog VM & 40 Cloud VM secara proaktif.'
    }
  },
  2000: {
    'woa': {
      makespan: 205.26,
      schedTime: 39.40,
      delayIdx: 1.00,
      energyIdx: 1.00,
      fogUtil: 98,
      cloudUtil: 44,
      note: 'Overload parah pada Fog VM berkecepatan 100-800 MIPS.'
    },
    'aoa': {
      makespan: 155.12,
      schedTime: 14.90,
      delayIdx: 0.91,
      energyIdx: 0.90,
      fogUtil: 81,
      cloudUtil: 63,
      note: 'AOA mampu eksplorasi ruang solusi, namun tanpa penalti kapasitas Markov beban belum merata optimal.'
    },
    'hmcds': {
      makespan: 138.21,
      schedTime: 19.21,
      delayIdx: 0.88,
      energyIdx: 0.84,
      fogUtil: 72,
      cloudUtil: 71,
      note: 'Terbaik di skala besar 2.000 tugas: Makespan 138,21 dtk, Delay -11,72%, PIR +4,66%.'
    }
  }
};

// Rute 3D Menanjak Ringkas (8 Pos): IoT Valley (y=0) -> Fog Edge Plateau (y=3.0) -> Cloud Sky Citadel (y=6.5)
const ROAD_WAYPOINTS = [
  { x: 0,   y: 0.0, z: 15 },   // Titik Awal Drone CF_Manager
  { x: 0,   y: 0.0, z: 7 },    // POS 1 (Perbandingan HMCDS vs AOA-SSA)
  { x: -4,  y: 0.0, z: -1 },   // POS 2 (Latar Belakang & 3 Masalah Fog-Cloud)
  { x: -10, y: 0.0, z: -9 },   // POS 3 (Gerbang CF_Manager - Arsitektur 3 Lapis)
  { x: -16, y: 3.0, z: -22 },  // POS 4 (Fog Plateau - Markov Chain)
  { x: -2,  y: 3.0, z: -35 },  // POS 5 (Fog Plateau - AOA)
  { x: 12,  y: 4.8, z: -48 },  // POS 6 (Jembatan Fog-Cloud - Simulasi 3D Per-Babak)
  { x: 14,  y: 6.5, z: -62 },  // POS 7 (Cloud Citadel - Benchmark NASA)
  { x: 0,   y: 6.5, z: -74 }   // POS 8 (Puncak Cloud Citadel - Kesimpulan & Q&A)
];

// 8 Pos Cluster Bermasalah -> 8 Slide Materi HMCDS
const CLUSTER_STATIONS = [
  {
    id: 0,
    posNum: 1,
    layerName: 'Lapisan 1: IoT Sensor Valley',
    icon: '⚖️',
    name: 'POS 1 • HMCDS VS AOA-SSA',
    slideTitle: 'Slide 1: Mengapa HMCDS (AOA+Markov) vs AOA-SSA?',
    x: 0,
    y: 0.0,
    z: 7,
    color: 0x10b981
  },
  {
    id: 1,
    posNum: 2,
    layerName: 'Lapisan 1: IoT Sensor Valley',
    icon: '📡',
    name: 'POS 2 • SENSOR GATEWAY',
    slideTitle: 'Slide 2: Latar Belakang & 3 Masalah Fog–Cloud',
    x: -4,
    y: 0.0,
    z: -1,
    color: 0x06b6d4
  },
  {
    id: 2,
    posNum: 3,
    layerName: 'Lapisan 1→2: Gerbang CF_Manager',
    icon: '🚦',
    name: 'POS 3 • CF_MANAGER',
    slideTitle: 'Slide 3: Arsitektur 3 Lapis & Klasifikasi Tugas',
    x: -10,
    y: 0.0,
    z: -9,
    color: 0x38bdf8
  },
  {
    id: 3,
    posNum: 4,
    layerName: 'Lapisan 2: Fog Edge Plateau',
    icon: '🔮',
    name: 'POS 4 • MARKOV FORECASTER',
    slideTitle: 'Slide 4: Tahap 1 — Prediksi Beban (Markov Chain)',
    x: -16,
    y: 3.0,
    z: -22,
    color: 0x22d3ee
  },
  {
    id: 4,
    posNum: 5,
    layerName: 'Lapisan 2: Fog Edge Plateau',
    icon: '⚙️',
    name: 'POS 5 • AOA CORE',
    slideTitle: 'Slide 5: Tahap 2 — Optimasi Jadwal (AOA)',
    x: -2,
    y: 3.0,
    z: -35,
    color: 0xf59e0b
  },
  {
    id: 5,
    posNum: 6,
    layerName: 'Jembatan Fog–Cloud',
    icon: '🔗',
    name: 'POS 6 • HYBRID HMCDS 3D',
    slideTitle: 'Slide 6: Simulasi 3D Per-Babak Markov + AOA',
    x: 12,
    y: 4.8,
    z: -48,
    color: 0xa855f7
  },
  {
    id: 6,
    posNum: 7,
    layerName: 'Lapisan 3: Cloud Sky Citadel',
    icon: '📊',
    name: 'POS 7 • BENCHMARK NASA',
    slideTitle: 'Slide 7: Hasil Eksperimen NASA iPSC/860',
    x: 14,
    y: 6.5,
    z: -62,
    color: 0x3b82f6
  },
  {
    id: 7,
    posNum: 8,
    layerName: 'Puncak Cloud Citadel',
    icon: '🏆',
    name: 'POS 8 • HMCDS FINAL',
    slideTitle: 'Slide 8: Kesimpulan Akhir & Panduan Q&A',
    x: 0,
    y: 6.5,
    z: -74,
    color: 0x10b981
  }
];
