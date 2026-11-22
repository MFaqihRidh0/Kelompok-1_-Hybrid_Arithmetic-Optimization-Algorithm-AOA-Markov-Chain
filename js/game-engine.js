// ============================================================================
// HMCDS FOG-CLOUD CYBER-DISPATCHER — 3D THREE.JS ENGINE (360° ORBIT & 3-LAYER)
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
let autoWalkCurveTargetT = null;
let autoWalkBeacon = null;
const keysPressed = {};

// 360-Degree Damped Spherical Orbit Camera State
let cameraYaw = 0;
let targetCameraYaw = 0;
let cameraPitch = 0.36;
let targetCameraPitch = 0.36;
let cameraDist = 14.5;
let targetCameraDist = 14.5;
let smoothFocusPos = new THREE.Vector3(0, 1.8, 14);

let isDraggingCamera = false;
let lastMousePos = { x: 0, y: 0 };
let lastTouchPos = null;
let lastPinchDist = null;
let totalDragDist = 0;

let hemiLight, dirLight, introSpotLight;
const clusterObjects = [];
const activeWaves = [];
const activeBeams = [];
const activeParticles = [];
const activeDataPackets = [];
const activeDomes = [];
const spinningFans = [];
const iotBeacons = [];
const ambientDataOrbs = [];
const driftingClouds = [];
let sunsetSunGroup = null;

let stabilizedCount = 0;

function initGameEngine() {
  const container = document.getElementById('gameCanvasContainer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b193d);
  scene.fog = new THREE.FogExp2(0x3a2042, 0.0042);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 400);
  camera.position.set(0, 9.5, 25.0);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  setupLighting();
  buildSunsetSkyAndClouds();
  buildThreeLayerWorld();
  buildHeroDrone();
  buildAllClusterStations();
  buildAutoWalkBeacon();
  setupInputListeners();

  window.addEventListener('resize', onWindowResize);
  requestAnimationFrame(gameLoop);
}

function setupLighting() {
  hemiLight = new THREE.HemisphereLight(0xffd6a5, 0x3b2d54, 0.95);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xffb066, 1.3);
  dirLight.position.set(28, 42, -55);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 80;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  introSpotLight = new THREE.SpotLight(0x38bdf8, 4.0, 36, Math.PI / 4, 0.35, 1.2);
  introSpotLight.position.set(0, 15, 14);
  introSpotLight.target.position.set(0, 0, 14);
  scene.add(introSpotLight);
  scene.add(introSpotLight.target);
}

function buildSunsetSkyAndClouds() {
  // Sunset Sky Gradient Dome
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#1e1b4b');   // Zenith twilight indigo
  grad.addColorStop(0.35, '#4c1d57');  // Upper violet
  grad.addColorStop(0.55, '#9d3656');  // Warm rose-coral
  grad.addColorStop(0.72, '#ea580c');  // Sunset orange
  grad.addColorStop(0.86, '#fdba74');  // Golden horizon
  grad.addColorStop(1.0, '#2b193d');   // Lower ground blend
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 256);

  const skyTex = new THREE.CanvasTexture(canvas);
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(210, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  skyDome.position.set(0, 10, -30);
  scene.add(skyDome);

  // Glowing Orange Sunset Sun + Halo Rings
  sunsetSunGroup = new THREE.Group();
  sunsetSunGroup.position.set(28, 24, -145);

  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(10.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffedd5, fog: false })
  );
  sunsetSunGroup.add(sunCore);

  const sunMid = new THREE.Mesh(
    new THREE.SphereGeometry(13.2, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.45, fog: false })
  );
  sunsetSunGroup.add(sunMid);

  const sunOuter = new THREE.Mesh(
    new THREE.SphereGeometry(17.0, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.2, fog: false })
  );
  sunsetSunGroup.add(sunOuter);
  scene.add(sunsetSunGroup);

  // 14 Fluffy Sunset Clouds drifting slowly across the sky
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf97316,
    emissiveIntensity: 0.22,
    roughness: 0.9,
    transparent: true,
    opacity: 0.88
  });

  for (let i = 0; i < 14; i++) {
    const cg = new THREE.Group();
    const cx = -85 + (i / 14) * 170 + (Math.random() - 0.5) * 12;
    const cy = 12 + (i % 4) * 3.5 + Math.random() * 2;
    const cz = -15 - (i % 5) * 22;
    cg.position.set(cx, cy, cz);

    const puffs = [
      [-1.8, 0, 0, 1.5],
      [0, 0.55, 0, 2.2],
      [1.9, -0.1, 0.2, 1.6],
      [0.6, 0.15, -0.8, 1.35]
    ];
    puffs.forEach(([ox, oy, oz, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), cloudMat);
      s.position.set(ox, oy, oz);
      s.scale.set(1.25, 0.72, 0.95);
      cg.add(s);
    });

    scene.add(cg);
    driftingClouds.push({ group: cg, speed: 0.65 + (i % 3) * 0.35 });
  }
}

function createGridTexture(bgHex, lineHex, repeatX = 36, repeatY = 36) {
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
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

function createCyberRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Dark cyber asphalt
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Glowing side lanes
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(6, 0, 10, 256);
  ctx.fillRect(240, 0, 10, 256);

  // Center dashed line
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(123, 20, 10, 90);
  ctx.fillRect(123, 148, 10, 90);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24);
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

function buildSmoothCyberRoad(curve, width = 7.6, segments = 280) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  const halfW = width / 2;
  const leftPts = [];
  const rightPts = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const leftPt = pt.clone().addScaledVector(normal, halfW);
    const rightPt = pt.clone().addScaledVector(normal, -halfW);
    leftPt.y = pt.y + 0.05;
    rightPt.y = pt.y + 0.05;

    vertices.push(leftPt.x, leftPt.y, leftPt.z);
    vertices.push(rightPt.x, rightPt.y, rightPt.z);

    if (i % 4 === 0 || i === segments) {
      leftPts.push(leftPt.clone().add(new THREE.Vector3(0, 0.14, 0)));
      rightPts.push(rightPt.clone().add(new THREE.Vector3(0, 0.14, 0)));
    }

    uvs.push(0, t * 24);
    uvs.push(1, t * 24);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const roadMesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: createCyberRoadTexture(),
      roughness: 0.55,
      metalness: 0.25,
      side: THREE.DoubleSide
    })
  );
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // Smooth glowing energy guardrails on both edges
  const railMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  [leftPts, rightPts].forEach(pts => {
    const railCurve = new THREE.CatmullRomCurve3(pts);
    const railGeo = new THREE.TubeGeometry(railCurve, 180, 0.12, 6, false);
    scene.add(new THREE.Mesh(railGeo, railMat));
  });
}

function buildThreeLayerWorld() {
  // ========================================================================
  // LAYER 1: IoT SENSOR VALLEY (y = 0)
  // ========================================================================
  const groundMat = new THREE.MeshStandardMaterial({
    map: createGridTexture('#0d0f22', 'rgba(6, 182, 212, 0.22)', 36, 36),
    roughness: 0.9
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.06, -30);
  ground.receiveShadow = true;
  scene.add(ground);

  // Start Sanctuary Pad (0, 0, 14)
  const startPad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.3, 4.6, 0.16, 32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.35 })
  );
  startPad.position.set(0, 0.02, 14);
  scene.add(startPad);

  // IoT Sensor Towers scattered in Layer 1
  const iotCoords = [[-11, 10], [11, 10], [-13, 0], [11, -2], [-18, -9], [5, -12]];
  iotCoords.forEach(([ix, iz], idx) => {
    const g = new THREE.Group();
    g.position.set(ix, 0, iz);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.1, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 })
    );
    base.position.y = 0.22;
    g.add(base);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.16, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 })
    );
    mast.position.y = 2.0;
    g.add(mast);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    beacon.position.y = 3.7;
    g.add(beacon);
    iotBeacons.push({ mesh: beacon, phase: idx * 0.9 });

    scene.add(g);
  });

  // Gate Arch CF_MANAGER at Pos 2 (-10, 0, -8)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(-10, 0, -8);
  gateGroup.rotation.y = Math.PI / 5;
  [-4.4, 4.4].forEach(px => {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 5.2, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.45 })
    );
    pillar.position.set(px, 2.6, 0);
    gateGroup.add(pillar);
  });
  const archTop = new THREE.Mesh(
    new THREE.BoxGeometry(9.4, 0.5, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x38bdf8, emissiveIntensity: 0.55 })
  );
  archTop.position.set(0, 5.3, 0);
  gateGroup.add(archTop);
  scene.add(gateGroup);

  // ========================================================================
  // LAYER 2: FOG EDGE PLATEAU (y = 3.0) — Dark Cyber Grid + Glowing Edge Wireframe
  // ========================================================================
  const fogGeo = new THREE.BoxGeometry(42, 0.5, 22);
  const fogPlatform = new THREE.Mesh(
    fogGeo,
    new THREE.MeshStandardMaterial({
      map: createGridTexture('#111b2e', 'rgba(34, 211, 238, 0.35)', 10, 6),
      roughness: 0.7,
      metalness: 0.25
    })
  );
  fogPlatform.position.set(-9, 2.72, -29);
  fogPlatform.receiveShadow = true;
  scene.add(fogPlatform);

  const fogEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(fogGeo),
    new THREE.LineBasicMaterial({ color: 0x22d3ee })
  );
  fogEdges.position.copy(fogPlatform.position);
  scene.add(fogEdges);

  // Smooth Continuous Winding & Ascending Cyber-Road (dibangun dulu agar rak server tidak menabrak jalan)
  const pts = ROAD_WAYPOINTS.map(w => new THREE.Vector3(w.x, w.y, w.z));
  roadCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
  roadSamplePoints = roadCurve.getSpacedPoints(450);
  buildSmoothCyberRoad(roadCurve, 7.6, 280);

  // 15 Fog VM Edge Server Racks with Proper Plinth, Brushed Steel Body, Front Rack Glass & Rooftop HVAC Cooling Fan
  const fogRackTex = createServerRackTexture('#22d3ee');
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.55 });
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.35 });
  const shroudMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.65 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45 });
  const frontGlassMat = new THREE.MeshBasicMaterial({ map: fogRackTex });

  let placedFogVMs = 0;
  for (let i = 0; i < 24 && placedFogVMs < 15; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const rx = -9 + Math.cos(angle) * 19.0;
    const rz = -29 + Math.sin(angle) * 9.2;

    // Skip jika terlalu dekat dengan jalan agar tidak menghalangi rute
    let tooCloseToRoad = false;
    for (let s = 0; s < roadSamplePoints.length; s += 4) {
      if (Math.hypot(rx - roadSamplePoints[s].x, rz - roadSamplePoints[s].z) < 5.6) {
        tooCloseToRoad = true;
        break;
      }
    }
    if (tooCloseToRoad) continue;
    placedFogVMs++;

    const h = 2.1 + (placedFogVMs % 3) * 0.55;
    const rackGroup = new THREE.Group();
    rackGroup.position.set(rx, 2.97, rz);
    rackGroup.lookAt(-9, 2.97, -29);

    // Concrete/steel plinth base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 1.7), plinthMat);
    plinth.position.y = 0.11;
    rackGroup.add(plinth);

    // Brushed-steel server cabinet body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, h, 1.35), cabinetMat);
    body.position.y = 0.22 + h / 2;
    body.castShadow = true;
    rackGroup.add(body);

    // Front glowing server rack LED panel
    const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.08, h * 0.84), frontGlassMat);
    frontPanel.position.set(0, 0.22 + h / 2, 0.69);
    rackGroup.add(frontPanel);

    // Rooftop HVAC Cooling Fan Shroud (ring housing)
    const roofY = 0.22 + h;
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 0.22, 16, 1, true), shroudMat);
    shroud.position.y = roofY + 0.11;
    rackGroup.add(shroud);

    // 4-Blade Cross Cooling Fan Propeller inside Shroud
    const fanProp = new THREE.Group();
    fanProp.position.y = roofY + 0.12;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), shroudMat);
    fanProp.add(hub);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.14), bladeMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.88), bladeMat);
    fanProp.add(blade1, blade2);
    rackGroup.add(fanProp);
    spinningFans.push(fanProp);

    scene.add(rackGroup);
  }

  // ========================================================================
  // LAYER 3: CLOUD SKY CITADEL (y = 6.5) — Dark Cyber Grid + Glowing Edge Wireframe
  // ========================================================================
  const cloudGeo = new THREE.BoxGeometry(40, 0.6, 22);
  const cloudPlatform = new THREE.Mesh(
    cloudGeo,
    new THREE.MeshStandardMaterial({
      map: createGridTexture('#131b3a', 'rgba(96, 165, 250, 0.4)', 10, 6),
      roughness: 0.6,
      metalness: 0.35
    })
  );
  cloudPlatform.position.set(7, 6.18, -68);
  cloudPlatform.receiveShadow = true;
  scene.add(cloudPlatform);

  const cloudEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cloudGeo),
    new THREE.LineBasicMaterial({ color: 0x60a5fa })
  );
  cloudEdges.position.copy(cloudPlatform.position);
  scene.add(cloudEdges);

  const cloudRackTex = createServerRackTexture('#60a5fa');
  [-10, 24].forEach((dcX) => {
    const dcGroup = new THREE.Group();
    dcGroup.position.set(dcX, 6.48, -72);

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 8.8, 5.2),
      new THREE.MeshStandardMaterial({ map: cloudRackTex, metalness: 0.6, roughness: 0.3 })
    );
    shell.position.y = 4.4;
    shell.castShadow = true;
    dcGroup.add(shell);

    const roofRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.14, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })
    );
    roofRing.rotation.x = Math.PI / 2;
    roofRing.position.y = 9.2;
    dcGroup.add(roofRing);

    scene.add(dcGroup);
  });

  // Ascending Ambient Data Orbs
  for (let i = 0; i < 24; i++) {
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x22d3ee : 0xfbbf24 })
    );
    orb.position.set((Math.random() - 0.5) * 40, Math.random() * 10, 10 - Math.random() * 82);
    scene.add(orb);
    ambientDataOrbs.push({ mesh: orb, speed: 1.2 + Math.random() * 1.4 });
  }
}

function clampPlayerToRoad(posVec) {
  if (!roadSamplePoints || roadSamplePoints.length === 0) return;

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

  const maxRoadHalfWidth = 3.15;
  if (minDist > maxRoadHalfWidth) {
    const dx = posVec.x - nearestPt.x;
    const dz = posVec.z - nearestPt.z;
    const len = Math.hypot(dx, dz) || 1;
    posVec.x = nearestPt.x + (dx / len) * maxRoadHalfWidth;
    posVec.z = nearestPt.z + (dz / len) * maxRoadHalfWidth;
  }
}

function findClosestCurveT(posVec) {
  if (!roadSamplePoints.length) return 0;
  let bestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < roadSamplePoints.length; i++) {
    const pt = roadSamplePoints[i];
    const d = Math.hypot(posVec.x - pt.x, posVec.z - pt.z);
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }
  return bestIdx / (roadSamplePoints.length - 1);
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
  playerParts.thrusters = [];

  // Sleek Central Fuselage
  const hull = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.72, roughness: 0.22 })
  );
  hull.scale.set(1.15, 0.75, 1.35);
  hull.position.y = 1.45;
  hull.castShadow = true;
  playerGroup.add(hull);

  // Glowing Visor Ring
  const visor = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.09, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 1.1 })
  );
  visor.rotation.x = Math.PI / 2;
  visor.position.y = 1.45;
  playerGroup.add(visor);
  playerParts.visor = visor;

  // 4 Quad-Rotor Pods + Spinning Translucent Rotor Discs
  const armMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 });
  const podMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.5 });
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  const discMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, side: THREE.DoubleSide });

  [[-1.05, 1.05], [1.05, 1.05], [-1.05, -1.05], [1.05, -1.05]].forEach(([ax, az]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 1.5), armMat);
    arm.position.set(ax * 0.5, 1.52, az * 0.5);
    arm.lookAt(ax, 1.52, az);
    playerGroup.add(arm);

    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.24, 10), podMat);
    pod.position.set(ax, 1.56, az);
    playerGroup.add(pod);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(ax, 1.7, az);
    playerGroup.add(disc);

    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 0.12), bladeMat);
    rotor.position.set(ax, 1.71, az);
    playerGroup.add(rotor);
    playerParts.rotors.push(rotor);
  });

  // Twin Rear Thrusters
  [-0.32, 0.32].forEach(tx => {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.55, 8),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(tx, 1.42, -1.25);
    playerGroup.add(flame);
    playerParts.thrusters.push(flame);
  });

  // Left Emitter: Markov Radar (Cyan) & Right Emitter: AOA Beam (Amber)
  const leftOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.3 })
  );
  leftOrb.position.set(-1.35, 1.5, 0.25);
  playerGroup.add(leftOrb);
  playerParts.leftOrb = leftOrb;

  const rightOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.3 })
  );
  rightOrb.position.set(1.35, 1.5, 0.25);
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
    const padRing = new THREE.Mesh(new THREE.RingGeometry(1.85, 2.35, 6), padMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.09;
    group.add(padRing);

    // Server Cluster Pillar
    const coreMat = new THREE.MeshStandardMaterial({
      map: rackTex,
      emissive: 0xef4444,
      emissiveIntensity: 0.4,
      metalness: 0.55,
      roughness: 0.35
    });
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 2.5, 8), coreMat);
    coreMesh.position.y = 1.3;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    // Floating Status Crystal above Server
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf87171, emissive: 0xef4444, emissiveIntensity: 0.9, roughness: 0.2
    });
    const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat);
    crystalMesh.position.y = 3.25;
    group.add(crystalMesh);

    // Vertical Holographic Beacon Beam
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xef4444, transparent: true, opacity: 0.18, side: THREE.DoubleSide
    });
    const beaconMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.72, 5.2, 12, 1, true), beaconMat);
    beaconMesh.position.y = 3.0;
    group.add(beaconMesh);

    // Dual Counter-Rotating Orbital Rings
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf87171 });
    const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.06, 8, 28), haloMat);
    haloMesh.position.y = 2.4;
    haloMesh.rotation.x = Math.PI / 2.4;
    group.add(haloMesh);

    const halo2Mesh = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.05, 8, 28), haloMat);
    halo2Mesh.position.y = 2.4;
    halo2Mesh.rotation.x = -Math.PI / 2.4;
    group.add(halo2Mesh);

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
      crystalMesh,
      crystalMat,
      beaconMat,
      haloMesh,
      halo2Mesh,
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
  v.y += 3.8;
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

function findNearestCluster(maxDist = 15) {
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

function spawnRadarDome(pos, colorHex) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: colorHex, wireframe: true, transparent: true, opacity: 0.9 })
  );
  dome.position.copy(pos);
  scene.add(dome);
  activeDomes.push({ mesh: dome, life: 0.75 });
}

function spawnBurstParticles(pos, colorHex, count = 18) {
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

function spawnDataPackets(fromPos, toPos, colorHex, count = 6) {
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
      progress: -i * 0.12,
      speed: 2.5
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
    spawnWaveEffect(target.group.position, 0x06b6d4, 3);
    spawnRadarDome(target.group.position, 0x22d3ee);
    spawnBurstParticles(target.group.position, 0x22d3ee, 16);
    spawnFloatingText(target.group.position, '📡 MARKOV SCAN: Blokir Overload!', '#22d3ee');
  } else if (type === 'aoa') {
    CloudAudio.playAOABeam();
    spawnBeamEffect(playerPos, target.group.position, 0xf59e0b);
    spawnDataPackets(playerPos, target.group.position, 0xfbbf24, 6);
    spawnBurstParticles(target.group.position, 0xf59e0b, 18);
    spawnFloatingText(target.group.position, '⚡ AOA BEAM (÷ × - +): Optimasi!', '#fbbf24');
  } else if (type === 'ultimate') {
    amount = 100;
    CloudAudio.playMarkovScan();
    CloudAudio.playAOABeam();
    spawnWaveEffect(target.group.position, 0xa855f7, 3);
    spawnRadarDome(target.group.position, 0xa855f7);
    spawnBeamEffect(playerPos, target.group.position, 0x38bdf8);
    spawnDataPackets(playerPos, target.group.position, 0xc084fc, 8);
    spawnBurstParticles(target.group.position, 0x38bdf8, 24);
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

    target.padMat.color.setHex(0x10b981);
    target.padMat.emissive.setHex(0x059669);
    target.coreMat.emissive.setHex(0x10b981);
    target.crystalMat.color.setHex(0x34d399);
    target.crystalMat.emissive.setHex(0x10b981);
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
    ring.position.set(pos.x, pos.y + 0.3 + r * 0.45, pos.z);
    scene.add(ring);
    activeWaves.push({ mesh: ring, life: 0.72 - r * 0.1 });
  }
}

function spawnBeamEffect(fromPos, toPos, colorHex) {
  const start = fromPos.clone().add(new THREE.Vector3(0, 1.45, 0));
  const end = toPos.clone().add(new THREE.Vector3(0, 1.45, 0));
  const dist = start.distanceTo(end);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, dist, 10),
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
    const dest = new THREE.Vector3(next.station.x, next.station.y, next.station.z + 3.2);
    autoWalkTarget = dest;
    autoWalkCurveTargetT = findClosestCurveT(dest);
  }
}

function teleportToPos(idx) {
  CloudAudio.playClick();
  const st = CLUSTER_STATIONS[idx];
  if (!st) return;
  autoWalkTarget = null;
  autoWalkCurveTargetT = null;
  playerPos.set(st.x, st.y, st.z + 3.2);
  clampPlayerToRoad(playerPos);
  document.getElementById('teleportPopover').classList.remove('active');
}

function resetPlayerPosition() {
  CloudAudio.playClick();
  autoWalkTarget = null;
  autoWalkCurveTargetT = null;
  playerPos.set(0, 0, 14);
}

function adjustCameraZoom(delta) {
  targetCameraDist = Math.max(8.0, Math.min(26.0, targetCameraDist + delta));
}

function setupInputListeners() {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    keysPressed[k] = true;

    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      autoWalkTarget = null;
      autoWalkCurveTargetT = null;
    }

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
    } else if (k === 'r') {
      resetPlayerPosition();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
  });

  // 360-DEGREE STABLE SPHERICAL ORBIT CAMERA (Window-wide Mouse Drag + 2-Finger Touchpad + Touch)
  window.addEventListener('mousedown', (e) => {
    if (isIntroMode) return;
    if (document.getElementById('slideModalOverlay').classList.contains('active')) return;
    if (e.target.closest('button, a, select, input, .hud-brand-card, .hud-quest-card, .hud-top-right, .teleport-popover, .slide-floating-window, .corpse-reopen-badge')) {
      return;
    }
    isDraggingCamera = true;
    totalDragDist = 0;
    lastMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingCamera) return;
    const dx = Math.max(-45, Math.min(45, e.clientX - lastMousePos.x));
    const dy = Math.max(-45, Math.min(45, e.clientY - lastMousePos.y));
    lastMousePos = { x: e.clientX, y: e.clientY };
    totalDragDist += Math.hypot(dx, dy);

    targetCameraYaw -= dx * 0.007;
    targetCameraPitch = Math.max(0.12, Math.min(1.12, targetCameraPitch + dy * 0.005));
  });

  window.addEventListener('mouseup', () => {
    isDraggingCamera = false;
  });

  // 2-Finger Touchpad 360° Orbit & Pinch/Scroll Zoom
  window.addEventListener('wheel', (e) => {
    if (isIntroMode) return;
    if (document.getElementById('slideModalOverlay').classList.contains('active')) return;
    if (e.target.closest('.teleport-popover, .slide-floating-window, #creditsModal')) return;

    e.preventDefault();
    const normFactor = e.deltaMode === 1 ? 16 : 1;
    const rawDX = e.deltaX * normFactor;
    const rawDY = e.deltaY * normFactor;
    const clampedDX = Math.max(-36, Math.min(36, rawDX));
    const clampedDY = Math.max(-36, Math.min(36, rawDY));

    if (e.ctrlKey || e.altKey) {
      const zoomStep = Math.max(-1.2, Math.min(1.2, rawDY * 0.022));
      targetCameraDist = Math.max(8.0, Math.min(26.0, targetCameraDist + zoomStep));
      return;
    }

    targetCameraYaw -= clampedDX * 0.0065;
    targetCameraPitch = Math.max(0.12, Math.min(1.12, targetCameraPitch + clampedDY * 0.0038));
  }, { passive: false });

  // Multi-Touch 1-Finger 360° Orbit & 2-Finger Pinch Zoom
  window.addEventListener('touchstart', (e) => {
    if (isIntroMode) return;
    if (document.getElementById('slideModalOverlay').classList.contains('active')) return;
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else if (e.touches.length === 1) {
      lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (isIntroMode) return;
    if (document.getElementById('slideModalOverlay').classList.contains('active')) return;
    if (e.touches.length === 2 && lastPinchDist !== null) {
      const curDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = lastPinchDist - curDist;
      lastPinchDist = curDist;
      targetCameraDist = Math.max(8.0, Math.min(26.0, targetCameraDist + Math.max(-1.0, Math.min(1.0, diff * 0.035))));
    } else if (e.touches.length === 1 && lastTouchPos) {
      const dx = Math.max(-40, Math.min(40, e.touches[0].clientX - lastTouchPos.x));
      const dy = Math.max(-40, Math.min(40, e.touches[0].clientY - lastTouchPos.y));
      lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      targetCameraYaw -= dx * 0.007;
      targetCameraPitch = Math.max(0.12, Math.min(1.12, targetCameraPitch + dy * 0.005));
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    lastTouchPos = null;
    lastPinchDist = null;
  });

  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
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

  let moveX = 0;
  let moveZ = 0;

  if (!isIntroMode && !document.getElementById('slideModalOverlay').classList.contains('active')) {
    if (keysPressed['q']) targetCameraYaw += 2.0 * dt;
    if (keysPressed['e']) targetCameraYaw -= 2.0 * dt;

    let inputForward = 0;
    let inputRight = 0;
    if (keysPressed['w'] || keysPressed['arrowup']) inputForward += 1;
    if (keysPressed['s'] || keysPressed['arrowdown']) inputForward -= 1;
    if (keysPressed['a'] || keysPressed['arrowleft']) inputRight -= 1;
    if (keysPressed['d'] || keysPressed['arrowright']) inputRight += 1;

    if (inputForward !== 0 || inputRight !== 0) {
      const forwardX = -Math.sin(cameraYaw);
      const forwardZ = -Math.cos(cameraYaw);
      const rightX = Math.cos(cameraYaw);
      const rightZ = -Math.sin(cameraYaw);

      moveX = forwardX * inputForward + rightX * inputRight;
      moveZ = forwardZ * inputForward + rightZ * inputRight;
    } else if (autoWalkCurveTargetT !== null && roadCurve) {
      const currentT = findClosestCurveT(playerPos);
      if (Math.abs(autoWalkCurveTargetT - currentT) > 0.008) {
        const stepDir = autoWalkCurveTargetT > currentT ? 1 : -1;
        const nextSteerT = Math.max(0, Math.min(1, currentT + stepDir * 0.025));
        const steerPt = roadCurve.getPointAt(nextSteerT);
        const toSteer = steerPt.clone().sub(playerPos);
        if (toSteer.length() > 0.2) {
          toSteer.normalize();
          moveX = toSteer.x;
          moveZ = toSteer.z;
        }
      } else {
        autoWalkCurveTargetT = null;
        autoWalkTarget = null;
      }
    }
  }

  const isMoving = Math.hypot(moveX, moveZ) > 0.05;
  if (isMoving) {
    const norm = Math.hypot(moveX, moveZ);
    const speed = 14.5;
    playerPos.x += (moveX / norm) * speed * dt;
    playerPos.z += (moveZ / norm) * speed * dt;
    clampPlayerToRoad(playerPos);

    const targetYaw = Math.atan2(moveX, moveZ);
    let diff = targetYaw - playerRotY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    playerRotY += diff * Math.min(1, dt * 12);

    CloudAudio.playFootstep();
  }

  const targetY = getRoadHeightAt(playerPos.x, playerPos.z);
  playerPos.y += (targetY - playerPos.y) * Math.min(1, dt * 12);

  const layerPill = document.getElementById('hudLayerIndicator');
  if (layerPill) layerPill.innerText = getLayerNameByY(playerPos.y);

  // Auto-walk destination beacon
  if (autoWalkBeacon) {
    if (autoWalkTarget) {
      autoWalkBeacon.visible = true;
      autoWalkBeacon.position.set(autoWalkTarget.x, autoWalkTarget.y + 0.16, autoWalkTarget.z);
      const s = 1 + Math.sin(hoverTime * 6) * 0.18;
      autoWalkBeacon.scale.set(s, s, 1);
    } else {
      autoWalkBeacon.visible = false;
    }
  }

  // Update Hero Drone Transform, Rotors & Thrusters
  if (playerGroup) {
    playerGroup.position.set(playerPos.x, playerPos.y + Math.sin(hoverTime * 3.5) * 0.14, playerPos.z);
    playerGroup.rotation.y = playerRotY;
    playerGroup.rotation.x = THREE.MathUtils.lerp(playerGroup.rotation.x, isMoving ? 0.18 : 0, dt * 10);
    if (playerParts.visor) playerParts.visor.rotation.z += dt * 2.0;
    if (playerParts.rotors) {
      playerParts.rotors.forEach(r => { r.rotation.y += dt * (isMoving ? 28 : 16); });
    }
    if (playerParts.thrusters) {
      playerParts.thrusters.forEach(t => {
        const sc = isMoving ? 1.2 + Math.sin(hoverTime * 25) * 0.35 : 0.65;
        t.scale.set(1, sc, 1);
      });
    }
    if (playerParts.leftOrb) playerParts.leftOrb.position.y = 1.5 + Math.sin(hoverTime * 4) * 0.12;
    if (playerParts.rightOrb) playerParts.rightOrb.position.y = 1.5 + Math.cos(hoverTime * 4) * 0.12;
  }

  // Animate Environment Elements (HVAC Cooling Fans, Sunset Sun, Drifting Clouds)
  spinningFans.forEach(f => { f.rotation.y += dt * 7.5; });
  if (sunsetSunGroup) {
    const pulse = 1 + Math.sin(hoverTime * 1.4) * 0.035;
    sunsetSunGroup.scale.set(pulse, pulse, pulse);
  }
  driftingClouds.forEach(c => {
    c.group.position.x += c.speed * dt;
    if (c.group.position.x > 95) c.group.position.x = -95;
  });
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
    if (cl.halo2Mesh) cl.halo2Mesh.rotation.z -= dt * (cl.stabilized ? 0.6 : 2.4);
    if (cl.crystalMesh) {
      cl.crystalMesh.rotation.y += dt * 2.2;
      cl.crystalMesh.position.y = 3.25 + Math.sin(hoverTime * 3 + cl.station.id) * 0.18;
    }
    if (cl.wobble > 0) {
      cl.wobble = Math.max(0, cl.wobble - dt * 1.6);
      cl.group.rotation.z = Math.sin(hoverTime * 35) * cl.wobble * 0.3;
    } else {
      cl.group.rotation.z = 0;
    }

    const labelPos = cl.group.position.clone().add(new THREE.Vector3(0, 3.9, 0));
    labelPos.project(camera);
    if (labelPos.z > 1 || isIntroMode) {
      cl.labelEl.style.opacity = '0';
    } else {
      cl.labelEl.style.opacity = '1';
      cl.labelEl.style.left = `${(labelPos.x * 0.5 + 0.5) * window.innerWidth}px`;
      cl.labelEl.style.top = `${(-labelPos.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  });

  // Update Waves, Radar Domes, Beams, Particles & Data Packets
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

  for (let i = activeDomes.length - 1; i >= 0; i--) {
    const d = activeDomes[i];
    d.life -= dt;
    d.mesh.scale.addScalar(dt * 5.5);
    d.mesh.material.opacity = Math.max(0, d.life * 1.2);
    if (d.life <= 0) {
      scene.remove(d.mesh);
      activeDomes.splice(i, 1);
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

  // 360-DEGREE STABLE SPHERICAL ORBIT CAMERA (Exponential Damping + Anti-Floor Clip)
  if (isIntroMode) {
    const introCamPos = new THREE.Vector3(0, 7.5, 24.5);
    camera.position.lerp(introCamPos, dt * 4.8);
    camera.lookAt(0, 1.5, 14);
    smoothFocusPos.set(playerPos.x, playerPos.y + 1.8, playerPos.z);
  } else {
    const camSmooth = 1.0 - Math.exp(-12.5 * dt);
    cameraYaw = THREE.MathUtils.lerp(cameraYaw, targetCameraYaw, camSmooth);
    cameraPitch = THREE.MathUtils.lerp(cameraPitch, targetCameraPitch, camSmooth);
    cameraDist = THREE.MathUtils.lerp(cameraDist, targetCameraDist, camSmooth);

    const desiredFocus = new THREE.Vector3(playerPos.x, playerPos.y + 1.8, playerPos.z);
    smoothFocusPos.lerp(desiredFocus, 1.0 - Math.exp(-15.0 * dt));

    const horizDist = cameraDist * Math.cos(cameraPitch);
    const vertOffset = cameraDist * Math.sin(cameraPitch);

    camera.position.set(
      smoothFocusPos.x + Math.sin(cameraYaw) * horizDist,
      Math.max(playerPos.y + 1.15, smoothFocusPos.y + vertOffset),
      smoothFocusPos.z + Math.cos(cameraYaw) * horizDist
    );
    camera.lookAt(smoothFocusPos);
  }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', initGameEngine);
