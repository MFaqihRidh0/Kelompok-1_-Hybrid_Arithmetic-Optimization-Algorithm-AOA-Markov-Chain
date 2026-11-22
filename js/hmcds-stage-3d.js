// ============================================================================
// HMCDS STAGE 3D — AUTOMATIC CHAPTER-BY-CHAPTER (PER-BABAK) 3D VISUALIZER
// Setiap Tab (CF_Manager, Markov Chain, AOA Eksplorasi, AOA Eksploitasi)
// menjalankan animasi 3D otomatis secara bertahap lengkap dengan narasi live
// ============================================================================

window.HMCDSStage3D = (function () {
  let dcScene, dcCamera, dcRenderer, dcControls;
  let containerEl = null;
  let animFrameId = null;
  let isLoopActive = false;
  let isInitialized = false;

  const dcNodes = {};
  let dispatcherPlatform = null;
  const laserLines = [];
  const networkPackets = [];
  const datacenterFans = [];
  const aoaExploreDrones = [];
  const aoaExploitDrones = [];
  let goldenCrown = null;
  let goldenBeam = null;
  let markovDome = null;
  let markovRing = null;

  let activeFlyingTasks = [];
  let landedTasks = [];
  let currentMode = 'topology';
  let subStepIdx = 0;
  let chapterTimer = null;
  let autoCycleAll = false;
  const rackTextureCache = {};

  const MODE_ORDER = ['topology', 'markov', 'aoa-explore', 'aoa-exploit'];

  // Daftar Babak & Tahapan Otomatis di Setiap Tab 3D
  const CHAPTER_SCRIPTS = {
    'topology': [
      {
        stepLabel: 'BABAK 1 (1/3) • KEDATANGAN TUGAS IOT',
        narration: 'Perangkat sensor IoT mengirim antrean tugas ke CF_Manager (Fog–Cloud Broker) di bagian atas. CF_Manager memantau beban awal LOAD(i) pada 15 Fog VM & 40 Cloud VM.',
        camPos: [0, 24, 34],
        camTarget: [0, 3.8, 0],
        action: 'spawn_initial_mix'
      },
      {
        stepLabel: 'BABAK 1 (2/3) • KLASIFIKASI REAL-TIME VS NON-RT',
        narration: 'CF_Manager memilah tugas berdasarkan deadline: Tugas Real-Time (kubus biru & hijau) diarahkan ke Fog Cluster A & B, sedangkan Non-Real-Time berat (kubus ungu) ke Cloud Datacenter.',
        camPos: [0, 22, 31],
        camTarget: [0, 3.8, 1],
        action: 'spawn_classified'
      },
      {
        stepLabel: 'BABAK 1 (3/3) • DETEKSI KETIMPANGAN BEBAN AWAL',
        narration: 'Karena kapasitas Fog Cluster B kecil (100–800 MIPS), antrean tugas cepat menumpuk di Fog B. Di sinilah prediksi Markov Chain dibutuhkan pada Babak 2!',
        camPos: [-3, 19, 27],
        camTarget: [0, 3.5, 4],
        action: 'highlight_fogB_warning'
      }
    ],
    'markov': [
      {
        stepLabel: 'BABAK 2 (1/3) • PEMINDAIAN MATRIKS TRANSISI P_ij',
        narration: 'Markov Chain menghitung peluang transisi status beban P_ij(t) = P{X_{n+1}=j | x_n=i} secara memoryless. Cincin radar cyan memindai Fog Cluster A & Fog Cluster B.',
        camPos: [-4, 18, 25],
        camTarget: [-3, 3.5, 3],
        action: 'markov_scan_start'
      },
      {
        stepLabel: 'BABAK 2 (2/3) • PREDIKSI OVERLOAD (P_ij ≥ MAX)',
        narration: 'Fog Cluster B terdeteksi memiliki P_ij ≥ MAX(d_i) → diprediksi akan OVERLOADED (Status V3 = O)! Kubah Perisai Markov aktif memblokir pengiriman tugas baru ke Fog B.',
        camPos: [0, 15, 22],
        camTarget: [0, 3.2, 7.5],
        action: 'markov_block_overload'
      },
      {
        stepLabel: 'BABAK 2 (3/3) • MIGRASI TUGAS KE VM LOW-LOAD (P_ij ≤ MIN)',
        narration: 'Tugas berlebih dari Fog Cluster B otomatis dimigrasikan (terbang melengkung) menuju Fog Cluster A yang berstatus V2 = LOW-LOAD (P_ij ≤ MIN) hingga Fog B kembali NORMAL (V1)!',
        camPos: [-6, 17, 24],
        camTarget: [-5, 3.5, 2.5],
        action: 'markov_migrate_tasks'
      }
    ],
    'aoa-explore': [
      {
        stepLabel: 'BABAK 3 (1/3) • INISIALISASI POPULASI AOA (N_pop = 10)',
        narration: 'Setelah VM Overloaded disaring oleh Markov, AOA membangkitkan 10 kandidat vektor pemetaan (Task → VM valid) dan menghitung nilai MOA serta MOP pada iterasi saat ini.',
        camPos: [0, 23, 32],
        camTarget: [0, 6.0, 0],
        action: 'aoa_explore_init'
      },
      {
        stepLabel: 'BABAK 3 (2/3) • EKSPLORASI GLOBAL (r₁ > MOA): OPERATOR ÷ DAN ×',
        narration: 'Saat r₁ > MOA, Drone Pembagian (÷) & Perkalian (×) terbang mengorbit luas menjelajahi seluruh ruang solusi Fog–Cloud untuk mencegah algoritma terjebak di Local Optima.',
        camPos: [4, 21, 29],
        camTarget: [0, 6.5, 0],
        action: 'aoa_explore_flights'
      },
      {
        stepLabel: 'BABAK 3 (3/3) • EVALUASI FITNESS (MAKESPAN, DELAY & ENERGI)',
        narration: 'Setiap kandidat jadwal dinilai dengan Cost_fog = min(max Σ ETC_ij) dan F = α·D + (1−α)·E. Kandidat dengan Makespan & Energi terendah disimpan sementara sebagai best(x).',
        camPos: [-5, 20, 28],
        camTarget: [0, 5.0, 0],
        action: 'aoa_explore_eval'
      }
    ],
    'aoa-exploit': [
      {
        stepLabel: 'BABAK 4 (1/3) • EKSPLOITASI LOKAL (r₁ ≤ MOA): OPERATOR − DAN +',
        narration: 'Memasuki iterasi akhir, nilai MOA meningkat sehingga r₁ ≤ MOA. Drone Pengurangan (−) & Penjumlahan (+) mengorbit rapat di sekitar solusi terbaik best(x) untuk fine-tuning.',
        camPos: [-11, 16, 16],
        camTarget: [-11, 5.5, -2],
        action: 'aoa_exploit_focus'
      },
      {
        stepLabel: 'BABAK 4 (2/3) • KONVERGENSI JADWAL TERBAIK best(x)',
        narration: 'Sinar Emas best(x) menyala! Pemetaan optimal ditemukan: tugas Real-Time diproses cepat di Fog Cluster A & B tanpa antrean, dan tugas Non-RT berat di Cloud Datacenter.',
        camPos: [0, 21, 30],
        camTarget: [0, 4.0, 0],
        action: 'aoa_exploit_dispatch'
      },
      {
        stepLabel: 'BABAK 4 (3/3) • EKSEKUSI SEIMBANG — MAKESPAN -8,29% & DELAY -11,72%',
        narration: 'Seluruh tugas selesai dieksekusi dengan beban VM seimbang (Fog A: 68%, Fog B: 65%, Cloud: 66%, 0 Overload). Makespan lebih cepat 8,29% dan Delay turun 11,72%!',
        camPos: [0, 23, 33],
        camTarget: [0, 3.8, 0],
        action: 'aoa_exploit_finish'
      }
    ]
  };

  function getRackTexture(accentColorHex) {
    const key = String(accentColorHex);
    if (rackTextureCache[key]) return rackTextureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 252);

    const slotCount = 10;
    const slotH = 240 / slotCount;
    const accent = typeof accentColorHex === 'number' ? '#' + accentColorHex.toString(16).padStart(6, '0') : accentColorHex;

    for (let i = 0; i < slotCount; i++) {
      const y = 8 + i * slotH;
      ctx.fillStyle = i % 2 === 0 ? '#0284c7' : '#38bdf8';
      ctx.fillRect(6, y + 1, 116, slotH - 3);

      ctx.fillStyle = '#0369a1';
      ctx.fillRect(10, y + 4, 60, slotH - 8);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(92, y + slotH / 2, 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(112, y + slotH / 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    rackTextureCache[key] = texture;
    return texture;
  }

  function getHazardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#f59e0b';
    const stripeW = 18;
    for (let x = -32; x < 288; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x + stripeW, 32);
      ctx.lineTo(x + stripeW + 16, 0);
      ctx.lineTo(x + 16, 0);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    return tex;
  }

  function createUnifiedBillboard(title, subtitle, status, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    updateBillboardCanvas(canvas, title, subtitle, status, colorHex);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(6.8, 1.85, 1);
    sp.userData = { canvas, texture, title, subtitle };
    return sp;
  }

  function updateBillboardCanvas(canvas, title, subtitle, status, colorHex) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.roundRect ? ctx.roundRect(8, 8, 496, 124, 18) : ctx.fillRect(8, 8, 496, 124);
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = typeof colorHex === 'number' ? '#' + colorHex.toString(16).padStart(6, '0') : colorHex;
    ctx.stroke();

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 46);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(subtitle, 256, 80);

    ctx.fillStyle = typeof colorHex === 'number' ? '#' + colorHex.toString(16).padStart(6, '0') : colorHex;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(status, 256, 114);
  }

  function setBillboardStatus(id, statusText, colorHex) {
    const node = dcNodes[id];
    if (!node) return;
    const sp = node.billboard;
    updateBillboardCanvas(sp.userData.canvas, node.name, node.subtitle, statusText, colorHex);
    sp.userData.texture.needsUpdate = true;
  }

  function buildDatacenterTower(id, name, subtitle, pos, height, bodyColor, ledColor) {
    const tower = new THREE.Group();
    const hazardTex = getHazardTexture();
    const rackTex = getRackTexture(ledColor);

    const plinthW = 5.6;
    const plinthD = 5.6;
    const plinthH = 0.5;

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(plinthW, plinthH, plinthD),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.65, metalness: 0.2 })
    );
    plinth.position.set(pos[0], plinthH / 2, pos[2]);
    plinth.receiveShadow = true;
    tower.add(plinth);

    const hazardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(plinthW + 0.08, 0.12, plinthD + 0.08),
      new THREE.MeshBasicMaterial({ map: hazardTex })
    );
    hazardMesh.position.set(pos[0], plinthH - 0.06, pos[2]);
    tower.add(hazardMesh);

    const bldgW = 3.8;
    const bldgD = 3.8;
    const bldgH = height;
    const bldgY = plinthH + bldgH / 2;

    const bldgShell = new THREE.Mesh(
      new THREE.BoxGeometry(bldgW, bldgH, bldgD),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.2, metalness: 0.35, roughness: 0.3 })
    );
    bldgShell.position.set(pos[0], bldgY, pos[2]);
    bldgShell.castShadow = true;
    bldgShell.receiveShadow = true;
    tower.add(bldgShell);

    const glassW = bldgW * 0.72;
    const glassH = bldgH * 0.75;
    const internalRacks = new THREE.Mesh(
      new THREE.PlaneGeometry(glassW, glassH),
      new THREE.MeshBasicMaterial({ map: rackTex })
    );
    internalRacks.position.set(pos[0], bldgY, pos[2] + bldgD / 2 + 0.02);
    tower.add(internalRacks);

    const roofY = plinthH + bldgH;
    const ledRingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bldgW + 0.22, 0.16, bldgD + 0.22),
      new THREE.MeshBasicMaterial({ color: ledColor })
    );
    ledRingMesh.position.set(pos[0], roofY + 0.22, pos[2]);
    tower.add(ledRingMesh);

    const chillerOffsets = id === 'cloud' ? [[-0.85, -0.85], [0.85, -0.85], [0.0, 0.85]] : [[-0.75, 0], [0.75, 0]];
    chillerOffsets.forEach(([cx, cz], chIdx) => {
      const chillerGroup = new THREE.Group();
      chillerGroup.position.set(pos[0] + cx, roofY + 0.3, pos[2] + cz);

      const chBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.5, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.45, roughness: 0.35 })
      );
      chBody.position.y = 0.25;
      chillerGroup.add(chBody);

      const fanProp = new THREE.Group();
      fanProp.position.y = 0.56;
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.03, 0.75),
          new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.7, roughness: 0.2 })
        );
        blade.rotation.y = (b * Math.PI) / 2;
        fanProp.add(blade);
      }
      chillerGroup.add(fanProp);
      tower.add(chillerGroup);
      datacenterFans.push({ fanMesh: fanProp, baseSpeed: 0.07 + chIdx * 0.015 });
    });

    const rackCount = 3;
    const rackRadius = 3.7;
    for (let i = 0; i < rackCount; i++) {
      const satH = height * (0.48 + i * 0.08);
      const ang = (i * Math.PI * 2) / rackCount;
      const rx = pos[0] + Math.cos(ang) * rackRadius;
      const rz = pos[2] + Math.sin(ang) * rackRadius;

      const podGroup = new THREE.Group();
      podGroup.position.set(rx, plinthH + satH / 2, rz);

      const rackFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, satH, 1.35),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.35, roughness: 0.32 })
      );
      rackFrame.castShadow = true;
      podGroup.add(rackFrame);

      const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, satH * 0.92), new THREE.MeshBasicMaterial({ map: rackTex }));
      frontPanel.position.set(0, 0, 0.69);
      podGroup.add(frontPanel);

      tower.add(podGroup);
    }

    const dcLight = new THREE.PointLight(ledColor, 1.3, 18);
    dcLight.position.set(pos[0], roofY + 1.2, pos[2]);
    dcScene.add(dcLight);

    const billboard = createUnifiedBillboard(name, subtitle, 'STATUS: SIAP ALOKASI', ledColor);
    billboard.position.set(pos[0], roofY + 2.9, pos[2]);
    tower.add(billboard);

    dcScene.add(tower);

    dcNodes[id] = {
      id,
      group: tower,
      bodyMesh: bldgShell,
      ledMesh: ledRingMesh,
      light: dcLight,
      billboard,
      pos: new THREE.Vector3(...pos),
      height: roofY,
      name,
      subtitle,
      baseColor: bodyColor,
      baseLedColor: ledColor,
      landedCount: 0
    };
  }

  function buildNetworkTrunk(id, p1, p2, color) {
    const v1 = new THREE.Vector3(...p1);
    const v2 = new THREE.Vector3(...p2);

    const geom = new THREE.BufferGeometry().setFromPoints([v1, v2]);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geom, mat);
    dcScene.add(line);
    laserLines.push(line);

    for (let i = 0; i < 2; i++) {
      const packetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 10),
        new THREE.MeshBasicMaterial({ color })
      );
      packetMesh.position.copy(v1);
      dcScene.add(packetMesh);
      networkPackets.push({
        mesh: packetMesh,
        p1: v1,
        p2: v2,
        progress: i * 0.5,
        speed: 0.009 + Math.random() * 0.004
      });
    }
  }

  function buildDispatcherPlatform(pos) {
    dispatcherPlatform = new THREE.Group();

    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(3.0, 3.4, 0.45, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 })
    );
    plat.castShadow = true;
    dispatcherPlatform.add(plat);

    const ringOuter = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.07, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    ringOuter.rotation.x = Math.PI / 2;
    dispatcherPlatform.add(ringOuter);

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 104;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.roundRect ? ctx.roundRect(6, 6, 488, 92, 16) : ctx.fillRect(6, 6, 488, 92);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0284c7';
    ctx.stroke();

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚦 CF_Manager (Fog-Cloud Broker)', 250, 44);

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Klasifikasi Tugas IoT & Prediksi Markov P_ij', 250, 78);

    const texture = new THREE.CanvasTexture(canvas);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sp.scale.set(5.8, 1.25, 1);
    sp.position.set(0, 1.9, 0);
    dispatcherPlatform.add(sp);

    dispatcherPlatform.position.set(...pos);
    dcScene.add(dispatcherPlatform);
  }

  function buildQuadcopterMesh(accentColor, glyphText) {
    const droneGroup = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.22, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
    );
    droneGroup.add(body);

    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.34, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.9, roughness: 0.2 })
    );
    canopy.rotation.x = Math.PI / 2;
    canopy.position.set(0, 0.12, 0.05);
    droneGroup.add(canopy);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = typeof accentColor === 'number' ? '#' + accentColor.toString(16).padStart(6, '0') : accentColor;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyphText, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(0.85, 0.85, 1);
    sp.position.set(0, 0.65, 0);
    droneGroup.add(sp);

    const scanCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 2.2, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
    );
    scanCone.rotation.x = Math.PI;
    scanCone.position.set(0, -1.1, 0);
    droneGroup.add(scanCone);

    return droneGroup;
  }

  function createAOADronesAndMarkovShield() {
    ['÷', '×'].forEach((op, idx) => {
      const dir = idx === 0 ? -1 : 1;
      const drone = buildQuadcopterMesh(0x0284c7, op);
      dcScene.add(drone);
      aoaExploreDrones.push({
        group: drone,
        radius: 16.5 + idx * 2.5,
        speed: 0.014 * dir,
        angle: idx * Math.PI,
        height: 11.5 + idx * 1.4
      });
    });

    ['-', '+'].forEach((op, idx) => {
      const dir = idx === 0 ? -1 : 1;
      const drone = buildQuadcopterMesh(0x10b981, op);
      dcScene.add(drone);
      aoaExploitDrones.push({
        group: drone,
        center: new THREE.Vector3(-11, 9.5, -2),
        radius: 4.6 + idx * 1.2,
        speed: 0.026 * dir,
        angle: idx * Math.PI,
        height: 9.8 + idx * 1.1
      });
    });

    markovDome = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.55 })
    );
    markovDome.position.set(0, 0.2, 7.5);
    dcScene.add(markovDome);

    markovRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.8, 0.1, 10, 36),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    markovRing.rotation.x = Math.PI / 2;
    markovRing.position.set(0, 2.5, 7.5);
    dcScene.add(markovRing);
  }

  function calculateLandingSlot(targetId, stackOverload = false) {
    const node = dcNodes[targetId];
    const count = node.landedCount || 0;
    node.landedCount = count + 1;

    if (stackOverload) {
      const stackH = count * 0.45;
      return {
        x: (Math.random() - 0.5) * 0.4,
        y: node.height + 0.3 + stackH,
        z: (Math.random() - 0.5) * 0.4
      };
    }
    const ang = (count * Math.PI * 2) / 5;
    const radius = 2.2;
    return {
      x: Math.cos(ang) * radius,
      y: 0.35 + Math.floor(count / 5) * 0.72,
      z: Math.sin(ang) * radius
    };
  }

  function spawnTaskBatch(fromPosVec, targetList, stackOverloadOnFogB = false) {
    targetList.forEach((targetId, idx) => {
      const destNode = dcNodes[targetId];
      if (!destNode) return;
      const isCloud = targetId === 'cloud';
      const cubeSize = isCloud ? 1.05 : (targetId === 'fogA' ? 0.85 : 0.72);
      const cubeColor = isCloud ? 0x7c3aed : (targetId === 'fogA' ? 0x0284c7 : 0x059669);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
        new THREE.MeshStandardMaterial({
          color: cubeColor,
          emissive: cubeColor,
          emissiveIntensity: 0.55,
          roughness: 0.3
        })
      );
      mesh.position.copy(fromPosVec);
      mesh.castShadow = true;
      dcScene.add(mesh);

      const landOffset = calculateLandingSlot(targetId, stackOverloadOnFogB && targetId === 'fogB');
      const endP = new THREE.Vector3(
        destNode.pos.x + landOffset.x,
        destNode.pos.y + landOffset.y,
        destNode.pos.z + landOffset.z
      );

      const midX = (fromPosVec.x + endP.x) / 2;
      const midZ = (fromPosVec.z + endP.z) / 2;
      const midY = Math.max(fromPosVec.y, endP.y) + 3.6 + Math.random() * 1.5;
      const ctrlP = new THREE.Vector3(midX, midY, midZ);

      activeFlyingTasks.push({
        mesh,
        targetId,
        startP: fromPosVec.clone(),
        ctrlP,
        endP,
        progress: -(idx * 0.06),
        speed: 0.022
      });
    });
  }

  function executeChapterAction(actionName) {
    const brokerPos = new THREE.Vector3(0, 9.5, -12);
    const fogBTop = new THREE.Vector3(0, 6.0, 7.5);

    if (actionName === 'spawn_initial_mix') {
      clearTasks();
      aoaExploreDrones.forEach(d => d.group.visible = false);
      aoaExploitDrones.forEach(d => d.group.visible = false);
      if (markovDome) markovDome.visible = false;
      if (markovRing) markovRing.visible = false;
      if (goldenBeam) goldenBeam.visible = false;
      setBillboardStatus('fogA', 'LOAD(1): 35% (V2 = LOW-LOAD)', 0x0284c7);
      setBillboardStatus('fogB', 'LOAD(2): 58% (V1 = NORMAL)', 0x059669);
      setBillboardStatus('cloud', 'LOAD(3): 40% (CLOUD POOL)', 0x7c3aed);
      spawnTaskBatch(brokerPos, ['fogA', 'fogB', 'cloud', 'fogB', 'fogA', 'fogB']);
    } else if (actionName === 'spawn_classified') {
      setBillboardStatus('fogA', 'REAL-TIME → FOG CLUSTER A', 0x0284c7);
      setBillboardStatus('fogB', 'REAL-TIME → FOG CLUSTER B', 0xf59e0b);
      setBillboardStatus('cloud', 'NON-REAL-TIME → CLOUD DC', 0x7c3aed);
      spawnTaskBatch(brokerPos, ['fogB', 'fogB', 'fogA', 'cloud', 'fogB', 'cloud'], true);
    } else if (actionName === 'highlight_fogB_warning') {
      setBillboardStatus('fogB', 'PERINGATAN: ANTREAN MENUMPUK ⚠️', 0xdc2626);
      if (dcNodes.fogB) {
        dcNodes.fogB.ledMesh.material.color.setHex(0xdc2626);
        dcNodes.fogB.light.color.setHex(0xdc2626);
      }
    } else if (actionName === 'markov_scan_start') {
      clearTasks();
      aoaExploreDrones.forEach(d => d.group.visible = false);
      aoaExploitDrones.forEach(d => d.group.visible = false);
      if (goldenBeam) goldenBeam.visible = false;
      if (markovDome) markovDome.visible = false;
      if (markovRing) markovRing.visible = true;
      setBillboardStatus('fogA', 'MARKOV SCAN: P_ij = 0.18 (≤ MIN)', 0x06b6d4);
      setBillboardStatus('fogB', 'MARKOV SCAN: P_ij = 0.89 (≥ MAX)', 0xf59e0b);
      setBillboardStatus('cloud', 'MARKOV SCAN: P_ij = 0.42 (NORMAL)', 0x7c3aed);
      spawnTaskBatch(brokerPos, ['fogB', 'fogB', 'fogB', 'fogB', 'fogB'], true);
    } else if (actionName === 'markov_block_overload') {
      if (markovDome) markovDome.visible = true;
      if (markovRing) markovRing.visible = true;
      setBillboardStatus('fogB', 'V3 = OVERLOADED 🔴 (BLOKIR TUGAS BARU)', 0xdc2626);
      setBillboardStatus('fogA', 'V2 = LOW-LOAD 🟢 (SIAP TERIMA MIGRASI)', 0x10b981);
    } else if (actionName === 'markov_migrate_tasks') {
      // Animasikan migrasi tugas langsung dari Fog Cluster B ke Fog Cluster A!
      setBillboardStatus('fogB', 'MIGRASI KE FOG A → KEMBALI NORMAL ✓', 0x10b981);
      setBillboardStatus('fogA', 'MENERIMA TUGAS MIGRASI (STABIL 62%)', 0x0284c7);
      if (dcNodes.fogB) {
        dcNodes.fogB.ledMesh.material.color.setHex(0x10b981);
        dcNodes.fogB.light.color.setHex(0x10b981);
      }
      spawnTaskBatch(fogBTop, ['fogA', 'fogA', 'fogA', 'fogA']);
    } else if (actionName === 'aoa_explore_init') {
      clearTasks();
      if (markovDome) markovDome.visible = true;
      if (markovRing) markovRing.visible = false;
      if (goldenBeam) goldenBeam.visible = false;
      aoaExploreDrones.forEach(d => d.group.visible = true);
      aoaExploitDrones.forEach(d => d.group.visible = false);
      setBillboardStatus('fogA', 'KANDIDAT AOA: VM 1..8 (VALID)', 0x0284c7);
      setBillboardStatus('fogB', 'DIJAGA MARKOV (KAPASITAS AMAN)', 0x10b981);
      setBillboardStatus('cloud', 'KANDIDAT AOA: VM 16..55 (VALID)', 0x7c3aed);
    } else if (actionName === 'aoa_explore_flights') {
      setBillboardStatus('fogA', 'EKSPLORASI (÷, ×): UJI KOMBINASI', 0x0284c7);
      setBillboardStatus('cloud', 'EKSPLORASI (÷, ×): UJI NON-RT', 0x7c3aed);
      spawnTaskBatch(brokerPos, ['fogA', 'cloud', 'fogA', 'cloud', 'fogB', 'fogA', 'cloud']);
    } else if (actionName === 'aoa_explore_eval') {
      setBillboardStatus('fogA', 'FITNESS TERBAIK SEMENTARA: best(x)', 0xf59e0b);
      setBillboardStatus('cloud', 'DELAY & ENERGI: F = α·D + (1-α)·E', 0x7c3aed);
    } else if (actionName === 'aoa_exploit_focus') {
      clearTasks();
      aoaExploreDrones.forEach(d => d.group.visible = false);
      aoaExploitDrones.forEach(d => d.group.visible = true);
      if (markovDome) markovDome.visible = true;
      if (goldenBeam) goldenBeam.visible = true;
      setBillboardStatus('fogA', 'EKSPLOITASI (−, +): FINE-TUNING best(x)', 0x10b981);
      setBillboardStatus('fogB', 'BEBAN TERKENDALI (NORMAL)', 0x10b981);
      setBillboardStatus('cloud', 'EKSPLOITASI (−, +): OPTIMASI CLOUD', 0x7c3aed);
    } else if (actionName === 'aoa_exploit_dispatch') {
      spawnTaskBatch(brokerPos, [
        'fogA', 'cloud', 'fogA', 'cloud', 'fogB',
        'fogA', 'cloud', 'fogA', 'cloud', 'fogB',
        'fogA', 'cloud'
      ]);
    } else if (actionName === 'aoa_exploit_finish') {
      setBillboardStatus('fogA', 'SEIMBANG 68% • MAKESPAN -8,29% ✓', 0x10b981);
      setBillboardStatus('fogB', 'SEIMBANG 65% • 0 OVERLOAD ✓', 0x10b981);
      setBillboardStatus('cloud', 'SEIMBANG 66% • DELAY -11,72% ✓', 0x10b981);
    }
  }

  function applySubStep() {
    const list = CHAPTER_SCRIPTS[currentMode] || CHAPTER_SCRIPTS['topology'];
    const item = list[subStepIdx] || list[0];

    const titleEl = document.getElementById('embeddedStageTitle');
    if (titleEl) titleEl.innerText = item.stepLabel;

    const narrEl = document.getElementById('stageChapterNarration');
    if (narrEl) narrEl.innerText = item.narration;

    const dotsEl = document.getElementById('stageSubStepDots');
    if (dotsEl) {
      dotsEl.innerHTML = list.map((_, i) =>
        `<span style="display:inline-block;width:${i === subStepIdx ? '18px' : '7px'};height:7px;border-radius:999px;background:${i === subStepIdx ? '#38bdf8' : 'rgba(255,255,255,0.35)'};transition:all 0.25s;"></span>`
      ).join('');
    }

    if (dcControls && dcCamera && item.camPos && item.camTarget) {
      dcCamera.position.set(...item.camPos);
      dcControls.target.set(...item.camTarget);
    }

    executeChapterAction(item.action);
  }

  function startChapterLoop() {
    if (chapterTimer) clearInterval(chapterTimer);
    applySubStep();

    chapterTimer = setInterval(() => {
      const list = CHAPTER_SCRIPTS[currentMode] || CHAPTER_SCRIPTS['topology'];
      if (subStepIdx < list.length - 1) {
        subStepIdx++;
        applySubStep();
      } else if (autoCycleAll) {
        const nextModeIdx = (MODE_ORDER.indexOf(currentMode) + 1) % MODE_ORDER.length;
        setMode(MODE_ORDER[nextModeIdx], true);
      } else {
        subStepIdx = 0;
        applySubStep();
      }
    }, 4200);
  }

  function init(container) {
    if (!container) return;
    if (isInitialized && dcRenderer && dcScene) {
      resize();
      return;
    }
    containerEl = container;
    isInitialized = true;

    containerEl.innerHTML = '';
    const width = containerEl.clientWidth || 800;
    const height = containerEl.clientHeight || 340;

    dcScene = new THREE.Scene();
    dcScene.background = new THREE.Color(0xe0f2fe);
    dcScene.fog = new THREE.FogExp2(0xe0f2fe, 0.008);

    dcCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    dcCamera.position.set(0, 24, 34);

    dcRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    dcRenderer.setSize(width, height);
    dcRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    dcRenderer.shadowMap.enabled = true;
    dcRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerEl.appendChild(dcRenderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      dcControls = new THREE.OrbitControls(dcCamera, dcRenderer.domElement);
      dcControls.enableDamping = true;
      dcControls.dampingFactor = 0.05;
      dcControls.maxPolarAngle = Math.PI / 2 - 0.05;
      dcControls.target.set(0, 3.8, 0);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    dcScene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    sunLight.position.set(24, 42, 28);
    sunLight.castShadow = true;
    dcScene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.75);
    rimLight.position.set(-25, 20, -25);
    dcScene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    dcScene.add(floor);

    const gridHelper = new THREE.GridHelper(90, 45, 0x0284c7, 0x7dd3fc);
    gridHelper.position.y = 0.02;
    dcScene.add(gridHelper);

    buildDatacenterTower('fogA', 'FOG CLUSTER A (VM 1..8)', 'Low-Load (V2) • 1.500-2.800 MIPS', [-11, 0, -2], 7.4, 0x0284c7, 0x38bdf8);
    buildDatacenterTower('cloud', 'CLOUD DATACENTER (40 VM)', 'Non-Real-Time • 3.000-5.000 MIPS', [11, 0, -2], 9.2, 0x7c3aed, 0xa855f7);
    buildDatacenterTower('fogB', 'FOG CLUSTER B (VM 9..15)', 'Edge Node • 100-800 MIPS', [0, 0, 7.5], 4.8, 0x059669, 0x10b981);

    buildNetworkTrunk('fogA_cloud', [-11, 0.6, -2], [11, 0.6, -2], 0x0284c7);
    buildNetworkTrunk('fogA_fogB', [-11, 0.6, -2], [0, 0.6, 7.5], 0x06b6d4);
    buildNetworkTrunk('cloud_fogB', [11, 0.6, -2], [0, 0.6, 7.5], 0x7c3aed);

    buildDispatcherPlatform([0, 9.5, -12]);
    buildNetworkTrunk('disp_fogA', [0, 9.5, -12], [-11, 4.5, -2], 0x38bdf8);
    buildNetworkTrunk('disp_cloud', [0, 9.5, -12], [11, 5.2, -2], 0xa855f7);
    buildNetworkTrunk('disp_fogB', [0, 9.5, -12], [0, 2.8, 7.5], 0x10b981);

    goldenCrown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.95, roughness: 0.2 })
    );
    goldenCrown.position.set(-11, 9.0, -2);
    dcScene.add(goldenCrown);

    goldenBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 8.5, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 })
    );
    goldenBeam.position.set(-11, 13.0, -2);
    goldenBeam.visible = false;
    dcScene.add(goldenBeam);

    createAOADronesAndMarkovShield();
    start();
    setMode('topology');
  }

  function start() {
    if (isLoopActive) return;
    isLoopActive = true;
    animate();
    startChapterLoop();
  }

  function stop() {
    isLoopActive = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (chapterTimer) {
      clearInterval(chapterTimer);
      chapterTimer = null;
    }
  }

  function animate() {
    if (!isLoopActive) return;
    animFrameId = requestAnimationFrame(animate);

    if (dcControls) dcControls.update();

    datacenterFans.forEach(f => {
      f.fanMesh.rotation.y += f.baseSpeed;
    });

    const time = Date.now() * 0.003;

    networkPackets.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      p.mesh.position.lerpVectors(p.p1, p.p2, p.progress);
    });

    aoaExploreDrones.forEach(d => {
      d.angle += d.speed;
      d.group.position.set(Math.cos(d.angle) * d.radius, d.height + Math.sin(d.angle * 2) * 0.8, Math.sin(d.angle) * d.radius);
      d.group.rotation.y = -d.angle + Math.PI / 2;
    });

    aoaExploitDrones.forEach(d => {
      d.angle += d.speed;
      d.group.position.set(d.center.x + Math.cos(d.angle) * d.radius, d.height + Math.sin(d.angle * 3) * 0.5, d.center.z + Math.sin(d.angle) * d.radius);
      d.group.rotation.y = -d.angle + Math.PI / 2;
    });

    if (goldenCrown) {
      goldenCrown.rotation.y += 0.03;
      goldenCrown.position.y = 9.0 + Math.sin(time * 2) * 0.2;
    }

    if (markovRing && markovRing.visible) {
      markovRing.position.y = 2.4 + Math.sin(time * 2.5) * 1.6;
      markovRing.rotation.z += 0.02;
    }

    for (let i = activeFlyingTasks.length - 1; i >= 0; i--) {
      const t = activeFlyingTasks[i];
      t.progress += t.speed;

      if (t.progress < 0) {
        t.mesh.visible = false;
        continue;
      }
      t.mesh.visible = true;

      if (t.progress >= 1.0) {
        t.mesh.position.copy(t.endP);
        t.mesh.rotation.set(0, Math.random() * Math.PI, 0);
        landedTasks.push(t.mesh);
        activeFlyingTasks.splice(i, 1);
      } else {
        const u = t.progress;
        const p0 = t.startP;
        const p1 = t.ctrlP;
        const p2 = t.endP;

        const x = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x;
        const y = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y;
        const z = (1 - u) * (1 - u) * p0.z + 2 * (1 - u) * u * p1.z + u * u * p2.z;

        t.mesh.position.set(x, y, z);
        t.mesh.rotation.x += 0.04;
        t.mesh.rotation.y += 0.06;
      }
    }

    if (dcRenderer && dcScene && dcCamera) {
      dcRenderer.render(dcScene, dcCamera);
    }
  }

  function resize() {
    if (!containerEl || !dcRenderer || !dcCamera) return;
    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    if (width === 0 || height === 0) return;
    dcCamera.aspect = width / height;
    dcCamera.updateProjectionMatrix();
    dcRenderer.setSize(width, height);
  }

  function clearTasks() {
    activeFlyingTasks.forEach(t => dcScene.remove(t.mesh));
    activeFlyingTasks = [];

    landedTasks.forEach(mesh => dcScene.remove(mesh));
    landedTasks = [];

    Object.values(dcNodes).forEach(node => {
      node.landedCount = 0;
      node.ledMesh.material.color.setHex(node.baseLedColor);
      node.light.color.setHex(node.baseLedColor);
    });
  }

  function setMode(mode, keepAutoCycle = false) {
    if (!keepAutoCycle) autoCycleAll = false;
    currentMode = mode;
    subStepIdx = 0;

    ['btnModeEmbeddedTopo', 'btnModeEmbeddedMarkov', 'btnModeEmbeddedExplore', 'btnModeEmbeddedExploit'].forEach(btnId => {
      const b = document.getElementById(btnId);
      if (b) b.classList.remove('active');
    });
    if (mode === 'topology') document.getElementById('btnModeEmbeddedTopo')?.classList.add('active');
    if (mode === 'markov') document.getElementById('btnModeEmbeddedMarkov')?.classList.add('active');
    if (mode === 'aoa-explore') document.getElementById('btnModeEmbeddedExplore')?.classList.add('active');
    if (mode === 'aoa-exploit') document.getElementById('btnModeEmbeddedExploit')?.classList.add('active');

    const autoBtn = document.getElementById('btnModeAutoAll');
    if (autoBtn) {
      autoBtn.classList.toggle('active', autoCycleAll);
      autoBtn.innerText = autoCycleAll ? '⏸ Auto-Semua Babak' : '▶ Auto-Semua Babak';
    }

    startChapterLoop();
  }

  function toggleAutoAll() {
    autoCycleAll = !autoCycleAll;
    const autoBtn = document.getElementById('btnModeAutoAll');
    if (autoBtn) {
      autoBtn.classList.toggle('active', autoCycleAll);
      autoBtn.innerText = autoCycleAll ? '⏸ Auto-Semua Babak' : '▶ Auto-Semua Babak';
    }
    if (autoCycleAll) {
      setMode('topology', true);
    }
  }

  return {
    init,
    start,
    stop,
    resize,
    clearTasks,
    setMode,
    toggleAutoAll
  };
})();
