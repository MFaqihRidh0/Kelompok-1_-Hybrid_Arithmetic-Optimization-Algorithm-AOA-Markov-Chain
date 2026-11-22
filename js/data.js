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

// Rute 3D Menanjak: IoT Valley (y=0) -> Fog Edge Plateau (y=4.5) -> Cloud Sky Citadel (y=9.0)
const ROAD_WAYPOINTS = [
  { x: 0,   y: 0.0, z: 22 },   // Titik Awal Drone CF_Manager
  { x: 0,   y: 0.0, z: 6 },    // POS 1 (IoT Valley)
  { x: -18, y: 0.0, z: -12 },  // POS 2 (Gerbang IoT -> Fog)
  { x: -34, y: 2.2, z: -32 },  // Tanjakan ke Fog Plateau
  { x: -38, y: 4.5, z: -56 },  // POS 3 (Fog Plateau - Markov)
  { x: -12, y: 4.5, z: -76 },  // POS 4 (Fog Plateau - AOA)
  { x: 18,  y: 6.5, z: -96 },  // POS 5 (Jembatan Fog-Cloud)
  { x: 32,  y: 9.0, z: -122 }, // POS 6 (Cloud Citadel - Benchmark)
  { x: 4,   y: 9.0, z: -148 }  // POS 7 (Cloud Citadel Peak - Final)
];

// 7 Pos Cluster Bermasalah -> 7 Slide Materi HMCDS
const CLUSTER_STATIONS = [
  {
    id: 0,
    posNum: 1,
    layerName: 'Lapisan 1: IoT Sensor Valley',
    icon: '📡',
    name: 'POS 1 • SENSOR GATEWAY OVERLOAD',
    slideTitle: 'Slide 1: Identitas Jurnal & 3 Masalah Utama Fog–Cloud',
    x: 0,
    y: 0.0,
    z: 6,
    color: 0x06b6d4
  },
  {
    id: 1,
    posNum: 2,
    layerName: 'Lapisan 1→2: Gerbang CF_Manager',
    icon: '🚦',
    name: 'POS 2 • CF_MANAGER CLASSIFIER',
    slideTitle: 'Slide 2: Arsitektur 3 Lapis & Klasifikasi Tugas',
    x: -18,
    y: 0.0,
    z: -12,
    color: 0x38bdf8
  },
  {
    id: 2,
    posNum: 3,
    layerName: 'Lapisan 2: Fog Edge Plateau',
    icon: '🔮',
    name: 'POS 3 • MARKOV STATE FORECASTER',
    slideTitle: 'Slide 3: Tahap 1 — Prediksi Beban VM (Markov Chain)',
    x: -38,
    y: 4.5,
    z: -56,
    color: 0x22d3ee
  },
  {
    id: 3,
    posNum: 4,
    layerName: 'Lapisan 2: Fog Edge Plateau',
    icon: '⚙️',
    name: 'POS 4 • AOA ARITHMETIC CORE',
    slideTitle: 'Slide 4: Tahap 2 — Optimasi Penjadwalan (AOA)',
    x: -12,
    y: 4.5,
    z: -76,
    color: 0xf59e0b
  },
  {
    id: 4,
    posNum: 5,
    layerName: 'Jembatan Fog–Cloud',
    icon: '🔗',
    name: 'POS 5 • HYBRID SYNC BRIDGE',
    slideTitle: 'Slide 5: Alur Eksekusi & Pseudocode Hybrid HMCDS',
    x: 18,
    y: 6.5,
    z: -96,
    color: 0xa855f7
  },
  {
    id: 5,
    posNum: 6,
    layerName: 'Lapisan 3: Cloud Sky Citadel',
    icon: '📊',
    name: 'POS 6 • NASA iPSC/860 BENCHMARK',
    slideTitle: 'Slide 6: Eksperimen & Hasil Evaluasi Empiris',
    x: 32,
    y: 9.0,
    z: -122,
    color: 0x3b82f6
  },
  {
    id: 6,
    posNum: 7,
    layerName: 'Puncak Cloud Citadel',
    icon: '🏆',
    name: 'POS 7 • HMCDS COMMAND CORE',
    slideTitle: 'Slide 7: Kesimpulan, Live Simulator & Glosarium Q&A',
    x: 4,
    y: 9.0,
    z: -148,
    color: 0x10b981
  }
];
