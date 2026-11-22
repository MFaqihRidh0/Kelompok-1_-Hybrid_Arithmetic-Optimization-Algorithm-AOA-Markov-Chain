// ============================================================================
// HMCDS FOG-CLOUD CYBER-DISPATCHER — 3D THREE.JS ENGINE (3-LAYER WORLD)
// ============================================================================

let scene, camera, renderer, clock;
let isIntroMode = true;
let playerGroup, playerParts = {};
let playerPos = new THREE.Vector3(0, 0, 22);
let playerRotY = Math.PI;
let hoverTime = 0;

let roadCurve = null;
let roadSamplePoints = [];
let autoWalkTarget = null;
const keysPressed = {};

// 360-Degree Damped Spherical Orbit Camera
let cameraYaw = 0;
let targetCameraYaw = 0;
let cameraPitch = 0.36;
let targetCameraPitch = 0.36;
let cameraDist = 15.5;
let targetCameraDist = 15.5;
let smoothFocusPos = new THREE.Vector3(0, 1.8, 22);

let isDraggingCamera = false;
let lastMousePos = { x: 0, y: 0 };
let totalDragDist = 0;

let hemiLight, dirLight, introSpotLight;
const clusterObjects = [];
const activeWaves = [];
const activeBeams = [];
const activeParticles = [];

let stabilizedCount = 0;

function initGameEngine() {
  const container = document.getElementById('gameCanvasContainer');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0b21);
  scene.fog = new THREE.FogExp2(0x0f0b21, 0.0048);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 450);
  camera.position.set(0, 11.5, 34.0);

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
  setupInputListeners();

  window.addEventListener('resize', onWindowResize);
  requestAnimationFrame(gameLoop);
}

function setupLighting() {
  hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e1b4b, 0.55);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xfef3c7, 0.85);
  dirLight.position.set(45, 80, 35);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 110;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  introSpotLight = new THREE.SpotLight(0x38bdf8, 4.2, 38, Math.PI / 4.2, 0.35, 1.2);
  introSpotLight.position.set(0, 16, 22);
  introSpotLight.target.position.set(0, 0, 22);
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
  ctx.moveTo(128, 120); ctx.lineTo(128, 136);
  ctx.moveTo(120, 128); ctx.lineTo(136, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  return tex;
}

function buildThreeLayerWorld() {
  // Base Ground (IoT Valley y = 0)
  const groundMat = new THREE.MeshStandardMaterial({
    map: createGridTexture('#121026', 'rgba(56, 189, 248, 0.22)'),
    roughness: 0.9
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, -60);
  ground.receiveShadow = true;
  scene.add(ground);

  // Layer 2 Plateau: Fog Edge Plateau (y = 4.45)
  const fogPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(92, 0.6, 56),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 })
  );
  fogPlatform.position.set(-22, 4.15, -64);
  fogPlatform.receiveShadow = true;
  scene.add(fogPlatform);

  // 15 Mini-Towers Fog VM (100 - 2.800 MIPS) around Fog Plateau
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const rx = -22 + Math.cos(angle) * 34;
    const rz = -64 + Math.sin(angle) * 21;
    const h = 2.2 + (i % 4) * 0.8;
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, h, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x0e7490, emissive: 0x06b6d4, emissiveIntensity: 0.25 })
    );
    tower.position.set(rx, 4.45 + h / 2, rz);
    tower.castShadow = true;
    scene.add(tower);
  }

  // Layer 3 Plateau: Cloud Sky Citadel (y = 8.95)
  const cloudPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(88, 0.8, 56),
    new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.6, metalness: 0.35 })
  );
  cloudPlatform.position.set(16, 8.55, -134);
  cloudPlatform.receiveShadow = true;
  scene.add(cloudPlatform);

  // 2 Giant Cloud Data Centers (40 VMs, 3.000 - 5.000 MIPS)
  [-6, 38].forEach((dcX) => {
    const dc = new THREE.Mesh(
      new THREE.BoxGeometry(8, 14, 8),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x3b82f6, emissiveIntensity: 0.35 })
    );
    dc.position.set(dcX, 8.95 + 7, -142);
    dc.castShadow = true;
    scene.add(dc);
  });

  // 3D Winding & Ascending Road Spline
  const pts = ROAD_WAYPOINTS.map(w => new THREE.Vector3(w.x, w.y, w.z));
  roadCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
  roadSamplePoints = roadCurve.getSpacedPoints(240);

  // Build glowing road ribbon segments
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x0284c7,
    emissiveIntensity: 0.22,
    roughness: 0.75
  });
  for (let i = 0; i < roadSamplePoints.length - 1; i++) {
    const p1 = roadSamplePoints[i];
    const p2 = roadSamplePoints[i + 1];
    const len = p1.distanceTo(p2);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.24, len + 0.35), roadMat);
    seg.position.copy(p1).lerp(p2, 0.5);
    seg.position.y -= 0.08;
    seg.lookAt(p2.x, p2.y - 0.08, p2.z);
    seg.receiveShadow = true;
    scene.add(seg);
  }

  // Stars in background sky
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 450; i++) {
    starVerts.push((Math.random() - 0.5) * 320, 25 + Math.random() * 110, -40 + (Math.random() - 0.5) * 280);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.65 })));
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
  if (y < 2.2) return 'Lapisan 1: IoT Sensor Valley';
  if (y < 7.0) return 'Lapisan 2: Fog Edge Plateau (15 VM)';
  return 'Lapisan 3: Cloud Sky Citadel (40 VM)';
}

function buildHeroDrone() {
  playerGroup = new THREE.Group();

  // Core chassis
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.85, 1),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.65, roughness: 0.25 })
  );
  body.position.y = 1.45;
  body.castShadow = true;
  playerGroup.add(body);

  // Glowing Visor Ring
  const visor = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 0.9 })
  );
  visor.rotation.x = Math.PI / 2;
  visor.position.y = 1.45;
  playerGroup.add(visor);
  playerParts.visor = visor;

  // Left Emitter: Markov Radar (Cyan)
  const leftOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.2 })
  );
  leftOrb.position.set(-1.3, 1.5, 0.2);
  playerGroup.add(leftOrb);
  playerParts.leftOrb = leftOrb;

  // Right Emitter: AOA Beam (Amber/Gold)
  const rightOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
  );
  rightOrb.position.set(1.3, 1.5, 0.2);
  playerGroup.add(rightOrb);
  playerParts.rightOrb = rightOrb;

  playerGroup.position.copy(playerPos);
  scene.add(playerGroup);
}

function buildAllClusterStations() {
  const labelsContainer = document.getElementById('worldLabelsContainer');

  CLUSTER_STATIONS.forEach((st, idx) => {
    const group = new THREE.Group();
    group.position.set(st.x, st.y, st.z);

    // Base Pad Ring (Red when Overloaded, Emerald when Stabilized)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.75
    });
    const padRing = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.6, 32), padMat);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.08;
    group.add(padRing);

    // Server Cluster Pillar
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0xef4444,
      emissiveIntensity: 0.55,
      metalness: 0.5,
      roughness: 0.35
    });
    const coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 2.8, 8), coreMat);
    coreMesh.position.y = 1.45;
    coreMesh.castShadow = true;
    group.add(coreMesh);

    // Orbiting Alert Halo
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf87171, wireframe: true });
    const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.07, 8, 24), haloMat);
    haloMesh.position.y = 2.6;
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
  setTimeout(() => el.remove(), 1250);
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

function castHMCDSAction(type) {
  if (isIntroMode) return;
  const modalActive = document.getElementById('slideModalOverlay').classList.contains('active');
  if (modalActive) return;

  const target = findNearestCluster(16);
  if (!target) {
    spawnFloatingText(playerPos, 'Dekati Pos Cluster merah dulu!', '#fde047');
    return;
  }

  let amount = 50;
  if (type === 'markov') {
    CloudAudio.playMarkovScan();
    spawnWaveEffect(target.group.position, 0x06b6d4);
    spawnFloatingText(target.group.position, '📡 MARKOV SCAN: P_ij >= MAX!', '#22d3ee');
  } else if (type === 'aoa') {
    CloudAudio.playAOABeam();
    spawnBeamEffect(playerPos, target.group.position, 0xf59e0b);
    spawnFloatingText(target.group.position, '⚡ AOA BEAM (÷ × - +): -50% Beban', '#fbbf24');
  } else if (type === 'ultimate') {
    amount = 100;
    CloudAudio.playMarkovScan();
    CloudAudio.playAOABeam();
    spawnWaveEffect(target.group.position, 0xa855f7);
    spawnBeamEffect(playerPos, target.group.position, 0x38bdf8);
    spawnFloatingText(target.group.position, '💥 HYBRID HMCDS INSTANT!', '#c084fc');
  }

  target.instability = Math.max(0, target.instability - amount);
  target.wobble = 0.35;

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
    target.haloMat.color.setHex(0x34d399);

    target.labelEl.innerHTML = `
      <div class="enemy-pos-tag">${target.station.icon} POS ${target.station.posNum} • STABIL</div>
      <div class="corpse-reopen-badge" onclick="openSlideWindow(${idx})">
        <span class="key-o">O</span> Buka Slide (Pos ${target.station.posNum})
      </div>
    `;

    updateQuestHudProgress();
    setTimeout(() => openSlideWindow(idx), 480);
  }
}

function spawnWaveEffect(pos, colorHex) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.9, 32),
    new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, pos.y + 0.35, pos.z);
  scene.add(ring);
  activeWaves.push({ mesh: ring, life: 0.65 });
}

function spawnBeamEffect(fromPos, toPos, colorHex) {
  const start = fromPos.clone().add(new THREE.Vector3(0, 1.5, 0));
  const end = toPos.clone().add(new THREE.Vector3(0, 1.5, 0));
  const dist = start.distanceTo(end);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, dist, 8),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.92 })
  );
  beam.position.copy(start).lerp(end, 0.5);
  beam.lookAt(end);
  beam.rotateX(Math.PI / 2);
  scene.add(beam);
  activeBeams.push({ mesh: beam, life: 0.45 });
}

function triggerOpenNearestDefeatedSlide() {
  let bestIdx = -1;
  let bestDist = 18;
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
    autoWalkTarget = new THREE.Vector3(next.station.x, next.station.y, next.station.z + 4.2);
  }
}

function teleportToPos(idx) {
  CloudAudio.playClick();
  const st = CLUSTER_STATIONS[idx];
  if (!st) return;
  autoWalkTarget = null;
  playerPos.set(st.x, st.y, st.z + 4.5);
  document.getElementById('teleportPopover').classList.remove('active');
}

function resetPlayerPosition() {
  CloudAudio.playClick();
  autoWalkTarget = null;
  playerPos.set(0, 0, 22);
}

function adjustCameraZoom(delta) {
  targetCameraDist = Math.max(8.5, Math.min(26, targetCameraDist + delta));
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

  // Player Movement
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
      const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
      const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
      const dir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      playerPos.addScaledVector(dir, 14.5 * dt);
      playerRotY = Math.atan2(dir.x, dir.z);
      CloudAudio.playFootstep();
    } else if (autoWalkTarget) {
      const toTarget = new THREE.Vector3(autoWalkTarget.x - playerPos.x, 0, autoWalkTarget.z - playerPos.z);
      const dist = toTarget.length();
      if (dist < 0.6) {
        autoWalkTarget = null;
      } else {
        toTarget.normalize();
        playerPos.addScaledVector(toTarget, 16.0 * dt);
        playerRotY = Math.atan2(toTarget.x, toTarget.z);
        CloudAudio.playFootstep();
      }
    }

    // Smoothly sample road elevation (IoT y=0 -> Fog y=4.5 -> Cloud y=9.0)
    const targetY = getRoadHeightAt(playerPos.x, playerPos.z);
    playerPos.y += (targetY - playerPos.y) * 0.14;

    const layerPill = document.getElementById('hudLayerIndicator');
    if (layerPill) layerPill.innerText = getLayerNameByY(playerPos.y);
  }

  // Update Hero Drone Transform
  if (playerGroup) {
    playerGroup.position.set(playerPos.x, playerPos.y + Math.sin(hoverTime * 3.2) * 0.16, playerPos.z);
    playerGroup.rotation.y = playerRotY;
    if (playerParts.visor) playerParts.visor.rotation.z += dt * 1.4;
    if (playerParts.leftOrb) playerParts.leftOrb.position.y = 1.5 + Math.sin(hoverTime * 4) * 0.12;
    if (playerParts.rightOrb) playerParts.rightOrb.position.y = 1.5 + Math.cos(hoverTime * 4) * 0.12;
  }

  // Update Clusters & Projected 3D Labels
  clusterObjects.forEach((cl) => {
    cl.haloMesh.rotation.z += dt * (cl.stabilized ? 0.6 : 2.2);
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

  // Update Waves & Beams
  for (let i = activeWaves.length - 1; i >= 0; i--) {
    const w = activeWaves[i];
    w.life -= dt;
    w.mesh.scale.addScalar(dt * 10);
    w.mesh.material.opacity = Math.max(0, w.life * 1.4);
    if (w.life <= 0) {
      scene.remove(w.mesh);
      activeWaves.splice(i, 1);
    }
  }

  for (let i = activeBeams.length - 1; i >= 0; i--) {
    const b = activeBeams[i];
    b.life -= dt;
    b.mesh.material.opacity = Math.max(0, b.life * 2.1);
    if (b.life <= 0) {
      scene.remove(b.mesh);
      activeBeams.splice(i, 1);
    }
  }

  // Smooth Camera Orbit
  cameraYaw += (targetCameraYaw - cameraYaw) * 0.12;
  cameraPitch += (targetCameraPitch - cameraPitch) * 0.12;
  cameraDist += (targetCameraDist - cameraDist) * 0.12;

  const focusTarget = new THREE.Vector3(playerPos.x, playerPos.y + 1.8, playerPos.z);
  smoothFocusPos.lerp(focusTarget, 0.12);

  if (isIntroMode) {
    camera.position.set(0, 8.5, 33.5);
    camera.lookAt(0, 1.5, 22);
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
