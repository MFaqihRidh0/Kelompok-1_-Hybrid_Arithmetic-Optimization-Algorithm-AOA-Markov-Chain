// ============================================================================
// HMCDS FOG-CLOUD CYBER-DISPATCHER — 3D THREE.JS ENGINE (3-LAYER WORLD)
// ============================================================================

let scene, camera, renderer, clock;
let isIntroMode = true;
let playerGroup, playerParts = {};
let playerPos = new THREE.Vector3(0, 0, 14);
let playerRotY = Math.PI;
let hoverTime = 0;

let roadCurve = null;
let roadSamplePoints = [];
let autoWalkTarget = null;
let autoWalkBeacon = null;
const keysPressed = {};

// 360-Degree Damped Spherical Orbit Camera
let cameraYaw = 0;
let targetCameraYaw = 0;
let cameraPitch = 0.36;
let targetCameraPitch = 0.36;
let cameraDist = 14.5;
let targetCameraDist = 14.5;
let smoothFocusPos = new THREE.Vector3(0, 1.8, 14);

let isDraggingCamera = false;
let lastMousePos = { x: 0, y: 0 };
let totalDragDist = 0;

let hemiLight, dirLight, introSpotLight;
const clusterObjects = [];
const activeWaves = [];
const activeBeams = [];
const activeParticles = [];
const activeDataPackets = [];
const spinningFans = [];
const iotBeacons = [];
const ambientDataOrbs = [];

let stabilizedCount = 0;

function initGameEngine() {
  const container = document.getElementById('gameCanvasContainer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a1a);
  scene.fog = new THREE.FogExp2(0x0b0a1a, 0.0065);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 350);
  camera.position.set(0, 9.5, 25.0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  setupLighting();
  buildThreeLayerWorld();
  buildHeroDrone();
  buildAllClusterStations();
  buildAutoWalkBeacon();
  setupInputListeners();

  window.addEventListener('resize', onWindowResize);
  requestAnimationFrame(gameLoop);
}

function setupLighting() {
  hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e1b4b, 0.6);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xfef3c7, 0.9);
  dirLight.position.set(35, 65, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 80;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  introSpotLight = new THREE.SpotLight(0x38bdf8, 4.5, 36, Math.PI / 4, 0.35, 1.2);
  introSpotLight.position.set(0, 15, 14);
  introSpotLight.target.position.set(0, 0, 14);
  scene.add(introSpotLight);
  scene.add(introSpotLight.target);
}

function createGridTexture(bgHex, lineHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);

  ctx.beginPath();
  ctx.moveTo(128, 116); ctx.lineTo(128, 140);
  ctx.moveTo(116, 128); ctx.lineTo(140, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  return tex;
}

function createServerRackTexture(accentHex = '#06b6d4') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 252);

  for (let i = 0; i < 10; i++) {
    const y = 8 + i * 24;
    ctx.fillStyle = i % 2 === 0 ? '#111827' : '#172033';
    ctx.fillRect(8, y, 112, 20);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(92, y + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = i % 3 === 0 ? '#f59e0b' : accentHex;
    ctx.beginPath();
    ctx.arc(106, y + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function buildThreeLayerWorld() {
  // ========================================================================
  // LAYER 1: IoT SENSOR VALLEY (y = 0)
  // ========================================================================
  const groundMat = new THREE.MeshStandardMaterial({
    map: createGridTexture('#0f1024', 'rgba(6, 182, 212, 0.25)'),
    roughness: 0.9
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, -30);
  ground.receiveShadow = true;
  scene.add(ground);

  // Start Sanctuary Pad (0, 0, 14)
  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.3, 4.6, 0.2, 32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.35 })
  );
  startPad.position.set(0, 0.02, 14);
  scene.add(startPad);

  // IoT Sensor Towers scattered in Layer 1
  const iotCoords = [
    [-12, 10], [12, 10], [-14, 0], [12, -2], [-22, -10], [6, -12]
  ];
  iotCoords.forEach(([ix, iz], idx) => {
    const g = new THREE.Group();
    g.position.set(ix, 0, iz);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.2, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 })
    );
    base.position.y = 0.25;
    g.add(base);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
    );
    mast.position.y = 2.1;
    g.add(mast);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    beacon.position.y = 3.9;
    g.add(beacon);
    iotBeacons.push({ mesh: beacon, phase: idx * 0.9 });

    scene.add(g);
  });

  // Gate Arch CF_MANAGER at Pos 2 (-10, 0, -8)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(-10, 0, -8);
  gateGroup.rotation.y = Math.PI / 5;
  [-3.8, 3.8].forEach(px => {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 5.2, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.45 })
    );
    pillar.position.set(px, 2.6, 0);
    gateGroup.add(pillar);
  });
  const archTop = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.65, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x38bdf8, emissiveIntensity: 0.6 })
  );
  archTop.position.set(0, 5.3, 0);
  gateGroup.add(archTop);
  scene.add(gateGroup);

  // ========================================================================
  // LAYER 2: FOG EDGE PLATEAU (y = 3.0) — 15 Fog VMs
  // ========================================================================
  const fogPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.55, 34),
    new THREE.MeshStandardMaterial({ color: 0x132238, roughness: 0.65, metalness: 0.3 })
  );
  fogPlatform.position.set(-9, 2.68, -28);
  fogPlatform.receiveShadow = true;
  scene.add(fogPlatform);

  const fogRim = new THREE.Mesh(
    new THREE.BoxGeometry(46.5, 0.14, 34.5),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
  );
  fogRim.position.set(-9, 2.95, -28);
  scene.add(fogRim);

  // 15 Fog VM Server Racks with blinking texture & cooling fan
  const fogRackTex = createServerRackTexture('#22d3ee');
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const rx = -9 + Math.cos(angle) * 19.5;
    const rz = -28 + Math.sin(angle) * 14;
    const h = 2.0 + (i % 3) * 0.75;

    const rackGroup = new THREE.Group();
    rackGroup.position.set(rx, 2.95, rz);

    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, h, 1.35),
      new THREE.MeshStandardMaterial({ map: fogRackTex, roughness: 0.4, metalness: 0.5 })
    );
    tower.position.y = h / 2;
    tower.castShadow = true;
    rackGroup.add(tower);

    const fan = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.08, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    fan.position.y = h + 0.12;
    rackGroup.add(fan);
    spinningFans.push(fan);

    scene.add(rackGroup);
  }

  // ========================================================================
  // LAYER 3: CLOUD SKY CITADEL (y = 6.5) — 2 Giant Data Centers (40 Cloud VMs)
  // ========================================================================
  const cloudPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.7, 32),
    new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.55, metalness: 0.4 })
  );
  cloudPlatform.position.set(7, 6.1, -67);
  cloudPlatform.receiveShadow = true;
  scene.add(cloudPlatform);

  const cloudRim = new THREE.Mesh(
    new THREE.BoxGeometry(44.5, 0.16, 32.5),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
  );
  cloudRim.position.set(7, 6.45, -67);
  scene.add(cloudRim);

  const cloudRackTex = createServerRackTexture('#60a5fa');
  [-11, 25].forEach((dcX) => {
    const dcGroup = new THREE.Group();
    dcGroup.position.set(dcX, 6.45, -72);

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 9.5, 5.6),
      new THREE.MeshStandardMaterial({ map: cloudRackTex, metalness: 0.6, roughness: 0.3 })
    );
    shell.position.y = 4.75;
    shell.castShadow = true;
    dcGroup.add(shell);

    const roofRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.15, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })
    );
    roofRing.rotation.x = Math.PI / 2;
    roofRing.position.y = 9.9;
    dcGroup.add(roofRing);

    scene.add(dcGroup);
  });

  // Stylized 3D Cyber-Clouds around Cloud Citadel
  const cloudPuffCoords = [
    [-16, 10, -58], [28, 11, -56], [-18, 12, -78], [26, 13, -80], [6, 14, -85]
  ];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe, emissive: 0x1d4ed8, emissiveIntensity: 0.25, transparent: true, opacity: 0.78
  });
  cloudPuffCoords.forEach(([cx, cy, cz]) => {
    const cg = new THREE.Group();
    cg.position.set(cx, cy, cz);
    [[-1.4, 0, 0, 1.5], [0, 0.5, 0, 2.0], [1.5, -0.1, 0.2, 1.4]].forEach(([ox, oy, oz, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), cloudMat);
      s.position.set(ox, oy, oz);
      cg.add(s);
    });
    scene.add(cg);
  });

  // Ascending Ambient Data Orbs (IoT -> Fog -> Cloud)
  for (let i = 0; i < 24; i++) {
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x22d3ee : 0x60a5fa })
    );
    orb.position.set((Math.random() - 0.5) * 44, Math.random() * 10, 10 - Math.random() * 82);
    scene.add(orb);
    ambientDataOrbs.push({ mesh: orb, speed: 1.2 + Math.random() * 1.4 });
  }

  // ========================================================================
  // 3D WINDING & ASCENDING CYBER-ROAD + GLOWING GUARDRAILS
  // ========================================================================
  const pts = ROAD_WAYPOINTS.map(w => new THREE.Vector3(w.x, w.y, w.z));
  roadCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
  roadSamplePoints = roadCurve.getSpacedPoints(450);

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0369a1,
    emissiveIntensity: 0.28,
    roughness: 0.65
  });
  const curbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });

  const roadSegCount = 240;
  for (let i = 0; i < roadSegCount; i++) {
    const t1 = i / roadSegCount;
    const t2 = (i + 1) / roadSegCount;
    const p1 = roadCurve.getPointAt(t1);
    const p2 = roadCurve.getPointAt(t2);
    const len = p1.distanceTo(p2);

    const seg = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.24, len + 0.18), roadMat);
    seg.position.copy(p1).lerp(p2, 0.5);
    seg.position.y -= 0.08;
    seg.lookAt(p2.x, p2.y - 0.08, p2.z);
    seg.receiveShadow = true;
    scene.add(seg);

    // Left & Right Glowing Guardrail Curbs (shows strict boundary!)
    const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    [-3.85, 3.85].forEach(side => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, len + 0.14), curbMat);
      curb.position.copy(seg.position).addScaledVector(right, side);
      curb.position.y += 0.12;
      curb.lookAt(p2.x + right.x * side, p2.y + 0.04, p2.z + right.z * side);
      scene.add(curb);
    });

    if (i % 4 === 0) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, len * 0.65), dashMat);
      dash.position.copy(seg.position);
      dash.position.y += 0.14;
      dash.lookAt(p2.x, p2.y + 0.06, p2.z);
      scene.add(dash);
    }
  }

  // Stars in background sky
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 360; i++) {
    starVerts.push((Math.random() - 0.5) * 240, 18 + Math.random() * 80, -30 + (Math.random() - 0.5) * 200);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.55 })));
}

function clampPlayerToRoad(posVec) {
  if (!roadSamplePoints || roadSamplePoints.length === 0) return;

  // Start Sanctuary area around (0, 0, 14)
  const distToStartHub = Math.hypot(posVec.x - 0, posVec.z - 14);
  if (posVec.z > 10.5 && distToStartHub <= 4.0) return;

  let nearestPt = roadSamplePoints[0];
  let minDist = Infinity;
  for (let i = 0; i < roadSamplePoints.length; i++) {
    const pt = roadSamplePoints[i];
    const d = Math.hypot(posVec.x - pt.x, posVec.z - pt.z);
    if (d < minDist) {
      minDist = d;
      nearestPt = pt;
    }
  }

  // Lebar jalan = 7.6 unit (curb di ±3.85). Kunci karakter di dalam radius 3.15 unit!
  const maxRoadHalfWidth = 3.15;
  if (minDist > maxRoadHalfWidth) {
    const dx = posVec.x - nearestPt.x;
    const dz = posVec.z - nearestPt.z;
    const len = Math.hypot(dx, dz) || 1;
    posVec.x = nearestPt.x + (dx / len) * maxRoadHalfWidth;
    posVec.z = nearestPt.z + (dz / len) * maxRoadHalfWidth;
  }
}

function getRoadHeightAt(x, z) {
  if (!roadSamplePoints.length) return 0;
  let bestDist = Infinity;
  let bestY = 0;
  for (let i = 0; i < roadSamplePoints.length; i++) {
    const p = roadSamplePoints[i];
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d < bestDist) {
      bestDist = d;
      bestY = p.y;
    }
  }
  return bestY;
}

function getLayerNameByY(y) {
  if (y < 1.5) return 'Lapisan 1: IoT Sensor Valley';
  if (y < 4.8) return 'Lapisan 2: Fog Edge Plateau (15 VM)';
  return 'Lapisan 3: Cloud Sky Citadel (40 VM)';
}

function buildHeroDrone() {
  playerGroup = new THREE.Group();
  playerParts.rotors = [];

  // Core chassis
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.75, 1),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7, roughness: 0.22 })
  );
  body.position.y = 1.35;
  body.castShadow = true;
  playerGroup.add(body);

  // Glowing Visor Ring
  const visor = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.08, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 1.0 })
  );
  visor.rotation.x = Math.PI / 2;
  visor.position.y = 1.35;
  playerGroup.add(visor);
  playerParts.visor = visor;

  // 4 Quad-Rotor Arms + Spinning Propellers
  const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
  const propMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.85 });
  [[-0.95, 0.95], [0.95, 0.95], [-0.95, -0.95], [0.95, -0.95]].forEach(([ax, az]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.35), armMat);
    arm.position.set(ax * 0.5, 1.48, az * 0.5);
    arm.lookAt(ax, 1.48, az);
    playerGroup.add(arm);

    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.14), propMat);
    rotor.position.set(ax, 1.56, az);
    playerGroup.add(rotor);
    playerParts.rotors.push(rotor);
  });

  // Left Emitter: Markov Radar (Cyan)
  const leftOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.2 })
  );
  leftOrb.position.set(-1.15, 1.35, 0.25);
  playerGroup.add(leftOrb);
  playerParts.leftOrb = leftOrb;

  // Right Emitter: AOA Beam (Amber/Gold)
  const rightOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
  );
  rightOrb.position.set(1.15, 1.35, 0.25);
  playerGroup.add(rightOrb);
  playerParts.rightOrb = rightOrb;

  playerGroup.position.copy(playerPos);
  scene.add(playerGroup);
}

function buildAutoWalkBeacon() {
  autoWalkBeacon = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.15, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
  );
  autoWalkBeacon.rotation.x = -Math.PI / 2;
  autoWalkBeacon.visible = false;
  scene.add(autoWalkBeacon);
}

function buildAllClusterStations() {
  const labelsContainer = document.getElementById('worldLabelsContainer');
  const rackTex = createServerRackTexture('#ef4444');

  CLUSTER_STATIONS.forEach((st, idx) => {
    const group = new THREE.Group();
    group.position.set(st.x, st.y, st.z);

    // Base Hex Pad Ring
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.85
    });
    const padRing = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.45, 6), padMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.08;
    group.add(padRing);

    // Server Cluster Pillar with rack texture
    const coreMat = new THREE.MeshStandardMaterial({
      map: rackTex,
      emissive: 0xef4444,
      emissiveIntensity: 0.45,
      metalness: 0.55,
      roughness: 0.35
    });
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.7, 8), coreMat);
    coreMesh.position.y = 1.4;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    // Vertical Holographic Beacon Beam
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, transparent: true, opacity: 0.22, side: THREE.DoubleSide
    });
    const beaconMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.75, 5.5, 12, 1, true), beaconMat);
    beaconMesh.position.y = 3.2;
    group.add(beaconMesh);

    // Orbiting Alert Halo
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf87171, wireframe: true });
    const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 8, 24), haloMat);
    haloMesh.position.y = 2.55;
    haloMesh.rotation.x = Math.PI / 2;
    group.add(haloMesh);

    scene.add(group);

    // DOM 3D Label
    const labelEl = document.createElement('div');
    labelEl.className = 'enemy-label-3d';
    labelEl.id = `clusterLabel_${idx}`;
    labelEl.innerHTML = `
      <div class="enemy-pos-tag">${st.icon} POS ${st.posNum}</div>
      <div class="enemy-hp-track"><div class="enemy-hp-fill" id="clusterHpFill_${idx}"></div></div>
      <div class="enemy-attack-hint" id="clusterHint_${idx}">OVERLOADED 🔴 • [J] Markov + [K] AOA</div>
    `;
    labelEl.addEventListener('click', () => {
      if (clusterObjects[idx].stabilized) {
        openSlideWindow(idx);
      }
    });
    labelsContainer.appendChild(labelEl);

    clusterObjects.push({
      station: st,
      group,
      padMat,
      coreMat,
      beaconMat,
      haloMesh,
      haloMat,
      labelEl,
      instability: 100,
      stabilized: false,
      wobble: 0
    });
  });
}

function spawnFloatingText(worldPos, text, colorHex) {
  const v = worldPos.clone();
  v.y += 3.6;
  v.project(camera);
  if (v.z > 1) return;

  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;

  const el = document.createElement('div');
  el.className = 'floating-dmg';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = colorHex;
  el.innerText = text;
  document.getElementById('worldLabelsContainer').appendChild(el);
  setTimeout(() => el.remove(), 1350);
}

function findNearestCluster(maxDist = 14) {
  let best = null;
  let bestDist = maxDist;
  clusterObjects.forEach(cl => {
    if (cl.stabilized) return;
    const d = playerPos.distanceTo(cl.group.position);
    if (d < bestDist) {
      bestDist = d;
      best = cl;
    }
  });
  return best;
}

function spawnBurstParticles(pos, colorHex, count = 16) {
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 })
    );
    p.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
    const angle = (i / count) * Math.PI * 2;
    const speed = 3.5 + Math.random() * 4.5;
    const vel = new THREE.Vector3(Math.cos(angle) * speed, 2.5 + Math.random() * 4, Math.sin(angle) * speed);
    scene.add(p);
    activeParticles.push({ mesh: p, vel, life: 0.75 });
  }
}

function spawnDataPackets(fromPos, toPos, colorHex, count = 5) {
  for (let i = 0; i < count; i++) {
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    cube.position.copy(fromPos).add(new THREE.Vector3(0, 1.4, 0));
    scene.add(cube);
    activeDataPackets.push({
      mesh: cube,
      start: fromPos.clone().add(new THREE.Vector3(0, 1.4, 0)),
      end: toPos.clone().add(new THREE.Vector3(0, 1.5, 0)),
      progress: -i * 0.14,
      speed: 2.4
    });
  }
}

function castHMCDSAction(type) {
  if (isIntroMode) return;
  const modalActive = document.getElementById('slideModalOverlay').classList.contains('active');
  if (modalActive) return;

  const target = findNearestCluster(15);
  if (!target) {
    spawnFloatingText(playerPos, 'Dekati Pos Cluster merah dulu!', '#fde047');
    return;
  }

  let amount = 50;
  if (type === 'markov') {
    CloudAudio.playMarkovScan();
    spawnWaveEffect(target.group.position, 0x06b6d4, 2);
    spawnBurstParticles(target.group.position, 0x22d3ee, 14);
    spawnFloatingText(target.group.position, '📡 MARKOV SCAN: Blokir Overload!', '#22d3ee');
  } else if (type === 'aoa') {
    CloudAudio.playAOABeam();
    spawnBeamEffect(playerPos, target.group.position, 0xf59e0b);
    spawnDataPackets(playerPos, target.group.position, 0xfbbf24, 6);
    spawnBurstParticles(target.group.position, 0xf59e0b, 16);
    spawnFloatingText(target.group.position, '⚡ AOA BEAM (÷ × - +): Optimasi!', '#fbbf24');
  } else if (type === 'ultimate') {
    amount = 100;
    CloudAudio.playMarkovScan();
    CloudAudio.playAOABeam();
    spawnWaveEffect(target.group.position, 0xa855f7, 3);
    spawnBeamEffect(playerPos, target.group.position, 0x38bdf8);
    spawnDataPackets(playerPos, target.group.position, 0xc084fc, 8);
    spawnBurstParticles(target.group.position, 0x38bdf8, 22);
    spawnFloatingText(target.group.position, '💥 HYBRID HMCDS: 100% STABIL!', '#c084fc');
  }

  target.instability = Math.max(0, target.instability - amount);
  target.wobble = 0.45;

  const idx = target.station.id;
  const hpFill = document.getElementById(`clusterHpFill_${idx}`);
  if (hpFill) hpFill.style.width = `${target.instability}%`;

  if (target.instability <= 0 && !target.stabilized) {
    target.stabilized = true;
    stabilizedCount++;
    CloudAudio.playClusterStabilized();

    // Change visuals to Emerald Green Stabilized
    target.padMat.color.setHex(0x10b981);
    target.padMat.emissive.setHex(0x059669);
    target.coreMat.emissive.setHex(0x10b981);
    target.beaconMat.color.setHex(0x10b981);
    target.haloMat.color.setHex(0x34d399);

    target.labelEl.innerHTML = `
      <div class="enemy-pos-tag">${target.station.icon} POS ${target.station.posNum} • STABIL</div>
      <div class="corpse-reopen-badge" onclick="openSlideWindow(${idx})">
        <span class="key-o">O</span> Buka Slide (Pos ${target.station.posNum})
      </div>
    `;

    updateQuestHudProgress();
    setTimeout(() => openSlideWindow(idx), 520);
  }
}

function spawnWaveEffect(pos, colorHex, rings = 2) {
  for (let r = 0; r < rings; r++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.85, 32),
      new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.35 + r * 0.4, pos.z);
    scene.add(ring);
    activeWaves.push({ mesh: ring, life: 0.72 - r * 0.12 });
  }
}

function spawnBeamEffect(fromPos, toPos, colorHex) {
  const start = fromPos.clone().add(new THREE.Vector3(0, 1.35, 0));
  const end = toPos.clone().add(new THREE.Vector3(0, 1.45, 0));
  const dist = start.distanceTo(end);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, dist, 10),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 })
  );
  beam.position.copy(start).lerp(end, 0.5);
  beam.lookAt(end);
  beam.rotateX(Math.PI / 2);
  scene.add(beam);
  activeBeams.push({ mesh: beam, life: 0.55 });
}

function triggerOpenNearestDefeatedSlide() {
  let bestIdx = -1;
  let bestDist = 16;
  clusterObjects.forEach((cl, idx) => {
    if (!cl.stabilized) return;
    const d = playerPos.distanceTo(cl.group.position);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });
  if (bestIdx !== -1) {
    openSlideWindow(bestIdx);
  } else {
    spawnFloatingText(playerPos, 'Belum ada Cluster Stabil di dekatmu', '#94a3b8');
  }
}

function walkToNextUnstabilizedPos() {
  CloudAudio.playClick();
  const next = clusterObjects.find(c => !c.stabilized) || clusterObjects[0];
  if (next) {
    autoWalkTarget = new THREE.Vector3(next.station.x, next.station.y, next.station.z + 3.4);
  }
}

function teleportToPos(idx) {
  CloudAudio.playClick();
  const st = CLUSTER_STATIONS[idx];
  if (!st) return;
  autoWalkTarget = null;
  playerPos.set(st.x, st.y, st.z + 3.4);
  clampPlayerToRoad(playerPos);
  document.getElementById('teleportPopover').classList.remove('active');
}

function resetPlayerPosition() {
  CloudAudio.playClick();
  autoWalkTarget = null;
  playerPos.set(0, 0, 14);
}

function adjustCameraZoom(delta) {
  targetCameraDist = Math.max(8.0, Math.min(24, targetCameraDist + delta));
}

function setupInputListeners() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keysPressed[k] = true;

    if (k === 'escape') {
      closeSlideWindow();
      closeCreditsModal();
      return;
    }
    if (isIntroMode) return;

    const modalActive = document.getElementById('slideModalOverlay').classList.contains('active');
    if (modalActive) return;

    if (k === 'j' || k === '1') castHMCDSAction('markov');
    else if (k === 'k' || k === '2') castHMCDSAction('aoa');
    else if (k === 'l' || k === ' ') {
      e.preventDefault();
      castHMCDSAction('ultimate');
    } else if (k === 'o') {
      triggerOpenNearestDefeatedSlide();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
  });

  const canvas = renderer.domElement;
  canvas.addEventListener('mousedown', (e) => {
    isDraggingCamera = true;
    totalDragDist = 0;
    lastMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingCamera) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    totalDragDist += Math.hypot(dx, dy);
    targetCameraYaw -= dx * 0.006;
    targetCameraPitch = Math.max(0.14, Math.min(1.08, targetCameraPitch + dy * 0.005));
    lastMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDraggingCamera = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    adjustCameraZoom(e.deltaY * 0.01);
  }, { passive: false });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(clock.getDelta(), 0.05);
  hoverTime += dt;

  let isMoving = false;

  // Player Movement + Strict Road Clamping
  if (!isIntroMode && !document.getElementById('slideModalOverlay').classList.contains('active')) {
    let moveX = 0;
    let moveZ = 0;
    if (keysPressed['w'] || keysPressed['arrowup']) moveZ -= 1;
    if (keysPressed['s'] || keysPressed['arrowdown']) moveZ += 1;
    if (keysPressed['a'] || keysPressed['arrowleft']) moveX -= 1;
    if (keysPressed['d'] || keysPressed['arrowright']) moveX += 1;

    if (keysPressed['q']) targetCameraYaw += 1.9 * dt;
    if (keysPressed['e']) targetCameraYaw -= 1.9 * dt;

    if (moveX !== 0 || moveZ !== 0) {
      autoWalkTarget = null;
      isMoving = true;
      const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
      const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
      const dir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      playerPos.addScaledVector(dir, 13.5 * dt);
      clampPlayerToRoad(playerPos);
      playerRotY = Math.atan2(dir.x, dir.z);
      CloudAudio.playFootstep();
    } else if (autoWalkTarget) {
      const toTarget = new THREE.Vector3(autoWalkTarget.x - playerPos.x, 0, autoWalkTarget.z - playerPos.z);
      const dist = toTarget.length();
      if (dist < 0.6) {
        autoWalkTarget = null;
      } else {
        isMoving = true;
        toTarget.normalize();
        playerPos.addScaledVector(toTarget, 15.0 * dt);
        clampPlayerToRoad(playerPos);
        playerRotY = Math.atan2(toTarget.x, toTarget.z);
        CloudAudio.playFootstep();
      }
    }

    const targetY = getRoadHeightAt(playerPos.x, playerPos.z);
    playerPos.y += (targetY - playerPos.y) * 0.16;

    const layerPill = document.getElementById('hudLayerIndicator');
    if (layerPill) layerPill.innerText = getLayerNameByY(playerPos.y);
  }

  // Auto-walk destination beacon
  if (autoWalkBeacon) {
    if (autoWalkTarget) {
      autoWalkBeacon.visible = true;
      autoWalkBeacon.position.set(autoWalkTarget.x, autoWalkTarget.y + 0.15, autoWalkTarget.z);
      const s = 1 + Math.sin(hoverTime * 6) * 0.18;
      autoWalkBeacon.scale.set(s, s, 1);
    } else {
      autoWalkBeacon.visible = false;
    }
  }

  // Update Hero Drone Transform & Propellers
  if (playerGroup) {
    playerGroup.position.set(playerPos.x, playerPos.y + Math.sin(hoverTime * 3.5) * 0.15, playerPos.z);
    playerGroup.rotation.y = playerRotY;
    playerGroup.rotation.x = isMoving ? 0.14 : 0;
    if (playerParts.visor) playerParts.visor.rotation.z += dt * 1.8;
    if (playerParts.rotors) {
      playerParts.rotors.forEach(r => { r.rotation.y += dt * (isMoving ? 24 : 14); });
    }
    if (playerParts.leftOrb) playerParts.leftOrb.position.y = 1.35 + Math.sin(hoverTime * 4) * 0.12;
    if (playerParts.rightOrb) playerParts.rightOrb.position.y = 1.35 + Math.cos(hoverTime * 4) * 0.12;
  }

  // Animate Environment Elements
  spinningFans.forEach(f => { f.rotation.y += dt * 6; });
  iotBeacons.forEach(b => {
    const s = 0.85 + Math.sin(hoverTime * 4 + b.phase) * 0.3;
    b.mesh.scale.set(s, s, s);
  });
  ambientDataOrbs.forEach(o => {
    o.mesh.position.y += dt * o.speed;
    o.mesh.rotation.y += dt * 2;
    if (o.mesh.position.y > 12) o.mesh.position.y = 0.2;
  });

  // Update Clusters & Projected 3D Labels
  clusterObjects.forEach((cl) => {
    cl.haloMesh.rotation.z += dt * (cl.stabilized ? 0.8 : 2.8);
    if (cl.wobble > 0) {
      cl.wobble = Math.max(0, cl.wobble - dt * 1.6);
      cl.group.rotation.z = Math.sin(hoverTime * 35) * cl.wobble * 0.3;
    } else {
      cl.group.rotation.z = 0;
    }

    const labelPos = cl.group.position.clone().add(new THREE.Vector3(0, 3.6, 0));
    labelPos.project(camera);
    if (labelPos.z > 1 || isIntroMode) {
      cl.labelEl.style.opacity = '0';
    } else {
      cl.labelEl.style.opacity = '1';
      cl.labelEl.style.left = `${(labelPos.x * 0.5 + 0.5) * window.innerWidth}px`;
      cl.labelEl.style.top = `${(-labelPos.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  });

  // Update Waves, Beams, Particles & Data Packets
  for (let i = activeWaves.length - 1; i >= 0; i--) {
    const w = activeWaves[i];
    w.life -= dt;
    w.mesh.scale.addScalar(dt * 11);
    w.mesh.material.opacity = Math.max(0, w.life * 1.4);
    if (w.life <= 0) {
      scene.remove(w.mesh);
      activeWaves.splice(i, 1);
    }
  }

  for (let i = activeBeams.length - 1; i >= 0; i--) {
    const b = activeBeams[i];
    b.life -= dt;
    b.mesh.material.opacity = Math.max(0, b.life * 2.0);
    if (b.life <= 0) {
      scene.remove(b.mesh);
      activeBeams.splice(i, 1);
    }
  }

  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const pt = activeParticles[i];
    pt.life -= dt;
    pt.vel.y -= 9.5 * dt;
    pt.mesh.position.addScaledVector(pt.vel, dt);
    pt.mesh.rotation.x += dt * 6;
    pt.mesh.material.opacity = Math.max(0, pt.life * 1.4);
    if (pt.life <= 0) {
      scene.remove(pt.mesh);
      activeParticles.splice(i, 1);
    }
  }

  for (let i = activeDataPackets.length - 1; i >= 0; i--) {
    const pk = activeDataPackets[i];
    pk.progress += dt * pk.speed;
    if (pk.progress >= 0 && pk.progress <= 1) {
      pk.mesh.visible = true;
      pk.mesh.position.lerpVectors(pk.start, pk.end, pk.progress);
      pk.mesh.position.y += Math.sin(pk.progress * Math.PI) * 1.4;
      pk.mesh.rotation.y += dt * 8;
    } else if (pk.progress < 0) {
      pk.mesh.visible = false;
    } else {
      scene.remove(pk.mesh);
      activeDataPackets.splice(i, 1);
    }
  }

  // Smooth Camera Orbit
  cameraYaw += (targetCameraYaw - cameraYaw) * 0.12;
  cameraPitch += (targetCameraPitch - cameraPitch) * 0.12;
  cameraDist += (targetCameraDist - cameraDist) * 0.12;

  const focusTarget = new THREE.Vector3(playerPos.x, playerPos.y + 1.8, playerPos.z);
  smoothFocusPos.lerp(focusTarget, 0.12);

  if (isIntroMode) {
    camera.position.set(0, 7.5, 24.5);
    camera.lookAt(0, 1.5, 14);
  } else {
    const cx = smoothFocusPos.x + cameraDist * Math.cos(cameraPitch) * Math.sin(cameraYaw);
    const cy = smoothFocusPos.y + cameraDist * Math.sin(cameraPitch);
    const cz = smoothFocusPos.z + cameraDist * Math.cos(cameraPitch) * Math.cos(cameraYaw);
    camera.position.set(cx, cy, cz);
    camera.lookAt(smoothFocusPos);
  }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', initGameEngine);
