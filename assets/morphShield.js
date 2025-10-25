(() => {
  if (typeof THREE === 'undefined' || typeof gsap === 'undefined') {
    console.warn('Three.js or GSAP not loaded.');
    return;
  }

  // --- Helpers ---
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, min, max) => Math.min(Math.max(x, min), max);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // --- Scene Setup ---
  const canvas = document.getElementById('aegisCanvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040404, 0.065);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 28);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a0a, 1);
  renderer.autoClear = true;

  const rootGroup = new THREE.Group();
  rootGroup.rotation.x = -0.2;
  scene.add(rootGroup);

  const clusterRoot = new THREE.Group();
  const shieldGroup = new THREE.Group();
  shieldGroup.visible = true;
  shieldGroup.userData.strength = 0;
  shieldGroup.position.z = -2.2;
  rootGroup.add(clusterRoot);
  rootGroup.add(shieldGroup);

  // --- Hero State (Floating Nodes) ---
  const clusterCount = 13;
  const clusters = [];

  const basePointMaterial = new THREE.PointsMaterial({
    color: new THREE.Color('#00f5a0'),
    size: 0.085,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const baseLineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color('#8b5cff'),
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (let i = 0; i < clusterCount; i++) {
    const group = new THREE.Group();
    const pointTotal = Math.floor(lerp(40, 60, Math.random()));
    const sphereRadius = lerp(1.2, 2.1, Math.random());

    const positions = new Float32Array(pointTotal * 3);
    for (let j = 0; j < pointTotal; j++) {
      const phi = Math.acos(lerp(-1, 1, Math.random()));
      const theta = Math.random() * Math.PI * 2;
      const r = sphereRadius * (0.35 + Math.random() * 0.65);
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = Math.cos(phi) * r * 0.9;
      const z = Math.sin(phi) * Math.sin(theta) * r;
      positions.set([x, y, z], j * 3);
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pointsMaterial = basePointMaterial.clone();
    pointsMaterial.size = lerp(0.06, 0.11, Math.random());

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    group.add(points);

    const lineGeometry = new THREE.BufferGeometry();
    const connectionCount = pointTotal * 2;
    const linePositions = new Float32Array(connectionCount * 3 * 2);
    for (let k = 0; k < connectionCount; k++) {
      const a = Math.floor(Math.random() * pointTotal);
      const b = Math.floor(Math.random() * pointTotal);
      linePositions[k * 6 + 0] = positions[a * 3 + 0];
      linePositions[k * 6 + 1] = positions[a * 3 + 1];
      linePositions[k * 6 + 2] = positions[a * 3 + 2];
      linePositions[k * 6 + 3] = positions[b * 3 + 0];
      linePositions[k * 6 + 4] = positions[b * 3 + 1];
      linePositions[k * 6 + 5] = positions[b * 3 + 2];
    }
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const linesMaterial = baseLineMaterial.clone();
    const lines = new THREE.LineSegments(lineGeometry, linesMaterial);
    group.add(lines);

    clusterRoot.add(group);

    const basePosition = new THREE.Vector3(
      lerp(-12, 12, Math.random()),
      lerp(-7, 7, Math.random()),
      lerp(-6, 4, Math.random())
    );
    group.position.copy(basePosition);

    const drift = new THREE.Vector3(
      lerp(-0.15, 0.15, Math.random()),
      lerp(-0.1, 0.1, Math.random()),
      lerp(-0.12, 0.12, Math.random())
    );
    const rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    const rotationSpeed = lerp(0.08, 0.18, Math.random());

    const pulse = { value: 1 };
    gsap.to(pulse, {
      value: lerp(1.05, 1.16, Math.random()),
      duration: lerp(2.2, 3.6, Math.random()),
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: Math.random() * 1.2,
    });

    clusters.push({
      group,
      basePosition,
      drift,
      rotationAxis,
      rotationSpeed,
      pointsMaterial,
      linesMaterial,
      pulse,
      seed: Math.random() * Math.PI * 2,
    });
  }

  // --- Shield Morph (Scroll Logic) ---
  const shieldLayers = [];
  const shieldPointsMaterial = new THREE.PointsMaterial({
    color: new THREE.Color('#00f5a0'),
    size: 0.09,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const shieldLineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color('#8b5cff'),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    linewidth: 1,
  });

  const layerCount = 3;
  const layerDepth = [-0.9, 0, 0.9];
  const baseOpacities = [0.25, 0.32, 0.4];
  const shieldRadius = 7;
  const spacing = 0.42;

  const hexPoints = [];
  for (let q = -shieldRadius; q <= shieldRadius; q++) {
    for (let r = -shieldRadius; r <= shieldRadius; r++) {
      const s = -q - r;
      if (Math.abs(s) > shieldRadius) continue;
      const x = spacing * Math.sqrt(3) * (q + r / 2);
      const y = spacing * (1.5 * r);
      if (isInsideShield(x, y)) {
        hexPoints.push({ x, y });
      }
    }
  }

  for (let l = 0; l < layerCount; l++) {
    const layerGroup = new THREE.Group();
    layerGroup.position.z = layerDepth[l];

    const pointPositions = new Float32Array(hexPoints.length * 3);
    hexPoints.forEach((p, idx) => {
      pointPositions[idx * 3 + 0] = p.x * lerp(0.9, 1.05, l / (layerCount - 1));
      pointPositions[idx * 3 + 1] = p.y * lerp(0.95, 1.1, l / (layerCount - 1));
      pointPositions[idx * 3 + 2] = 0;
    });

    const layerGeometry = new THREE.BufferGeometry();
    layerGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));

    const layerPointsMaterial = shieldPointsMaterial.clone();
    layerPointsMaterial.size = lerp(0.075, 0.11, l / (layerCount - 1));
    const layerPoints = new THREE.Points(layerGeometry, layerPointsMaterial);
    layerGroup.add(layerPoints);

    const lineGeometry = new THREE.BufferGeometry();
    const linkCount = Math.floor(hexPoints.length * 0.35);
    const linePositions = new Float32Array(linkCount * 6);
    for (let i = 0; i < linkCount; i++) {
      const a = Math.floor(Math.random() * hexPoints.length);
      const b = Math.floor(Math.random() * hexPoints.length);
      const p1 = hexPoints[a];
      const p2 = hexPoints[b];
      linePositions.set(
        [
          p1.x * 1.02,
          p1.y * 1.02,
          0,
          p2.x * 1.02,
          p2.y * 1.02,
          0,
        ],
        i * 6
      );
    }
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const layerLinesMaterial = shieldLineMaterial.clone();
    const layerLines = new THREE.LineSegments(lineGeometry, layerLinesMaterial);
    layerGroup.add(layerLines);

    shieldGroup.add(layerGroup);
    shieldLayers.push({
      group: layerGroup,
      pointsMaterial: layerPointsMaterial,
      linesMaterial: layerLinesMaterial,
      baseOpacity: baseOpacities[l],
    });
  }

  const coreGeometry = new THREE.SphereGeometry(0.55, 16, 16);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#00f5a0'),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  shieldGroup.add(coreMesh);

  const glowGeometry = new THREE.RingGeometry(1.6, 2.2, 48);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#8b5cff'),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.rotation.x = Math.PI / 2;
  glowMesh.position.z = -0.2;
  shieldGroup.add(glowMesh);

  const corePulse = { intensity: 0 };
  gsap.to(corePulse, {
    intensity: 1,
    duration: 2.8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });

  const aboutSection = document.getElementById('about');
  let scrollProgress = 0;

  function updateScrollProgress() {
    if (!aboutSection) return;
    const rect = aboutSection.getBoundingClientRect();
    const view = window.innerHeight;
    const raw = (view - rect.top) / (view + rect.height * 0.5);
    scrollProgress = clamp(raw, 0, 1);
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', onResize);
  updateScrollProgress();

  const clock = new THREE.Clock();
  let accumulator = 0;
  const frameStep = 1 / 60;

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    accumulator += delta;

    if (accumulator < frameStep) {
      return;
    }

    while (accumulator >= frameStep) {
      update(frameStep);
      accumulator -= frameStep;
    }

    renderer.render(scene, camera);
  }

  const tempQuaternion = new THREE.Quaternion();
  const tempAxis = new THREE.Vector3();

  function update(dt) {
    const time = performance.now() * 0.001;
    const eased = easeInOutCubic(scrollProgress);

    clusters.forEach((cluster) => {
      const { group, basePosition, drift, rotationAxis, rotationSpeed, pointsMaterial, linesMaterial, pulse, seed } =
        cluster;

      const contraction = 1 - eased * 0.85;
      group.position.x = basePosition.x * contraction + Math.sin(time * 0.6 + seed) * drift.x * 8 * contraction;
      group.position.y = basePosition.y * contraction + Math.cos(time * 0.5 + seed) * drift.y * 8 * contraction;
      group.position.z = lerp(basePosition.z, -1.2, eased) + Math.sin(time * 0.4 + seed) * drift.z * 6 * contraction;

      tempAxis.copy(rotationAxis);
      tempQuaternion.setFromAxisAngle(tempAxis, rotationSpeed * dt);
      group.quaternion.multiply(tempQuaternion);

      const pulseValue = lerp(1, pulse.value, 1 - eased * 0.8);
      group.scale.setScalar(pulseValue);

      pointsMaterial.opacity = lerp(0.85, 0.12, eased);
      linesMaterial.opacity = lerp(0.32, 0.1, eased);
    });

    shieldGroup.rotation.z = lerp(-0.1, 0.12, Math.sin(time * 0.2) * 0.5 + 0.5);
    shieldGroup.rotation.y = lerp(-0.08, 0.08, Math.sin(time * 0.3) * 0.5 + 0.5);

    shieldLayers.forEach((layer, idx) => {
      const opacityTarget = layer.baseOpacity * eased;
      layer.pointsMaterial.opacity = lerp(layer.pointsMaterial.opacity, opacityTarget, 0.12);
      layer.linesMaterial.opacity = lerp(layer.linesMaterial.opacity, opacityTarget * 0.65, 0.12);
      layer.group.position.z = lerp(layer.group.position.z, layerDepth[idx] * (1 - eased * 0.5), 0.08);
      layer.group.rotation.z = Math.sin(time * 0.35 + idx) * 0.08 * (1 + idx * 0.3);
    });

    coreMaterial.opacity = lerp(coreMaterial.opacity, 0.35 * eased + 0.15 * corePulse.intensity * eased, 0.15);
    coreMesh.scale.setScalar(lerp(0.95, 1.25, corePulse.intensity * eased));

    glowMaterial.opacity = lerp(glowMaterial.opacity, 0.25 * eased, 0.12);
    glowMesh.scale.setScalar(lerp(1.1, 1.32, 0.5 + 0.5 * Math.sin(time * 0.6)));
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(0);
  renderer.render(scene, camera);
  animate();

  function isInsideShield(x, y) {
    const ny = y / 5.5; // controls vertical scale
    const nx = x / 5.5;
    if (ny > 0.25) {
      const dx = nx;
      const dy = ny - 0.4;
      return dx * dx + dy * dy <= 0.42;
    }
    const lowerBound = 0.85 - (ny + 0.9) * 0.58;
    return Math.abs(nx) <= lowerBound;
  }
})();
