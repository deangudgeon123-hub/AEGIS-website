// Aegis network → layered hex-shield morph (bigger, brighter, closer)
(() => {
  if (typeof THREE === 'undefined' || typeof gsap === 'undefined') {
    console.warn('Three.js or GSAP not loaded.');
    return;
  }

  // ---------- helpers ----------
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const easeInOutCubic = (t) => (t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2);

  // ---------- scene ----------
  const canvas = document.getElementById('aegisCanvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  // gentler fog so we don’t wash things out
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );
  // move camera closer so content looks larger
  camera.position.set(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a0a, 1);

  const root = new THREE.Group();
  root.rotation.x = -0.2;  // slight tilt for depth
  scene.add(root);

  const clusterRoot = new THREE.Group();
  const shieldRoot  = new THREE.Group();
  shieldRoot.visible = true;
  shieldRoot.userData.strength = 0;
  shieldRoot.position.z = -1.8;
  root.add(clusterRoot, shieldRoot);

  // ---------- floating clusters (HERO) ----------
  const clusterCount = 20;   // more groups
  const clusters = [];

  const basePointMat = new THREE.PointsMaterial({
    color: new THREE.Color('#00f5a0'),
    size: 0.14,                // bigger points
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const baseLineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#8b5cff'),
    transparent: true,
    opacity: 0.5,              // brighter lines
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (let i = 0; i < clusterCount; i++) {
    const group = new THREE.Group();

    // denser & larger clusters
    const pointTotal   = Math.floor(lerp(80, 120, Math.random()));
    const sphereRadius = lerp(2.2, 3.6, Math.random());

    const positions = new Float32Array(pointTotal * 3);
    for (let j = 0; j < pointTotal; j++) {
      const phi   = Math.acos(lerp(-1, 1, Math.random()));
      const theta = Math.random() * Math.PI * 2;
      const r = sphereRadius * (0.45 + Math.random() * 0.65);
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = Math.cos(phi) * r * 0.92;
      const z = Math.sin(phi) * Math.sin(theta) * r;
      positions.set([x, y, z], j * 3);
    }

    const ptsGeom = new THREE.BufferGeometry();
    ptsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const ptsMat = basePointMat.clone();
    ptsMat.size = lerp(0.12, 0.18, Math.random());
    const pts = new THREE.Points(ptsGeom, ptsMat);
    group.add(pts);

    // random links
    const conn = Math.floor(pointTotal * 1.8);
    const linePositions = new Float32Array(conn * 6);
    for (let k = 0; k < conn; k++) {
      const a = (Math.random() * pointTotal) | 0;
      const b = (Math.random() * pointTotal) | 0;
      linePositions.set([
        positions[a*3+0], positions[a*3+1], positions[a*3+2],
        positions[b*3+0], positions[b*3+1], positions[b*3+2]
      ], k*6);
    }
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = baseLineMat.clone();
    const segs = new THREE.LineSegments(lineGeom, lineMat);
    group.add(segs);

    clusterRoot.add(group);

    // tighter layout so they’re visible
    const basePos = new THREE.Vector3(
      lerp(-9, 9, Math.random()),
      lerp(-5.2, 5.2, Math.random()),
      lerp(-3.2, 2.2, Math.random())
    );
    group.position.copy(basePos);

    const drift = new THREE.Vector3(
      lerp(-0.18, 0.18, Math.random()),
      lerp(-0.14, 0.14, Math.random()),
      lerp(-0.12, 0.12, Math.random())
    );
    const axis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    const rotSpeed = lerp(0.09, 0.18, Math.random());

    const pulse = { value: 1 };
    gsap.to(pulse, {
      value: lerp(1.08, 1.18, Math.random()),
      duration: lerp(2.2, 3.6, Math.random()),
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: Math.random() * 1.1,
    });

    clusters.push({
      group,
      basePos,
      drift,
      axis,
      rotSpeed,
      ptsMat,
      lineMat,
      pulse,
      seed: Math.random() * Math.PI * 2,
    });
  }

  // ---------- hex shield (ABOUT) ----------
  const shieldLayers = [];
  const ptsShieldMat = new THREE.PointsMaterial({
    color: new THREE.Color('#00f5a0'),
    size: 0.12,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lineShieldMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#8b5cff'),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // bigger shield
  const layerDepth = [-1.0, 0, 1.0];
  const baseOpac  = [0.40, 0.55, 0.70];
  const shieldRadius = 9;   // more hexes
  const spacing = 0.56;     // hex spacing

  // hex points clipped to shield silhouette
  const hexPts = [];
  for (let q = -shieldRadius; q <= shieldRadius; q++) {
    for (let r = -shieldRadius; r <= shieldRadius; r++) {
      const s = -q - r;
      if (Math.abs(s) > shieldRadius) continue;
      const x = spacing * Math.sqrt(3) * (q + r/2);
      const y = spacing * (1.5 * r);
      if (insideShield(x, y)) hexPts.push({ x, y });
    }
  }

  const layerCount = 3;
  for (let L = 0; L < layerCount; L++) {
    const grp = new THREE.Group();
    grp.position.z = layerDepth[L];

    const pos = new Float32Array(hexPts.length * 3);
    hexPts.forEach((p, i) => {
      pos[i*3+0] = p.x * lerp(0.92, 1.06, L/(layerCount-1));
      pos[i*3+1] = p.y * lerp(0.96, 1.10, L/(layerCount-1));
      pos[i*3+2] = 0;
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = ptsShieldMat.clone();
    pm.size = lerp(0.11, 0.16, L/(layerCount-1));
    const pcloud = new THREE.Points(g, pm);
    grp.add(pcloud);

    const linkCount = Math.floor(hexPts.length * 0.5);
    const lpos = new Float32Array(linkCount * 6);
    for (let i = 0; i < linkCount; i++) {
      const a = (Math.random() * hexPts.length) | 0;
      const b = (Math.random() * hexPts.length) | 0;
      const p1 = hexPts[a], p2 = hexPts[b];
      lpos.set([p1.x, p1.y, 0, p2.x, p2.y, 0], i*6);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
    const lm = lineShieldMat.clone();
    const segs = new THREE.LineSegments(lg, lm);
    grp.add(segs);

    shieldRoot.add(grp);
    shieldLayers.push({ grp, pm, lm, base: baseOpac[L] });
  }

  // core glow
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 20, 20),
    new THREE.MeshBasicMaterial({
      color: '#00f5a0',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  shieldRoot.add(core);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.6, 64),
    new THREE.MeshBasicMaterial({
      color: '#8b5cff',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.z = -0.15;
  shieldRoot.add(ring);

  const corePulse = { v: 0 };
  gsap.to(corePulse, {
    v: 1,
    duration: 2.8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
  });

  // ---------- scroll morph ----------
  const about = document.getElementById('about');
  let scroll = 0;
  function updateScroll() {
    if (!about) return;
    const r = about.getBoundingClientRect();
    const vh = window.innerHeight;
    const raw = (vh - r.top) / (vh + r.height * 0.5);
    scroll = clamp(raw, 0, 1);
  }
  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });

  // ---------- animation ----------
  const tmpQ = new THREE.Quaternion();
  const tmpAxis = new THREE.Vector3();
  const clock = new THREE.Clock();

  function tick() {
    requestAnimationFrame(tick);
    const dt = clock.getDelta();
    const t  = performance.now() * 0.001;
    const e  = easeInOutCubic(scroll);

    // clusters breathe & contract to center
    clusters.forEach((c) => {
      const k = 1 - e * 0.85;
      c.group.position.x = c.basePos.x * k + Math.sin(t*0.6 + c.seed) * c.drift.x * 8 * k;
      c.group.position.y = c.basePos.y * k + Math.cos(t*0.5 + c.seed) * c.drift.y * 8 * k;
      c.group.position.z = lerp(c.basePos.z, -1.1, e) + Math.sin(t*0.4 + c.seed) * c.drift.z * 6 * k;

      tmpAxis.copy(c.axis);
      tmpQ.setFromAxisAngle(tmpAxis, c.rotSpeed * dt);
      c.group.quaternion.multiply(tmpQ);

      const s = lerp(1, c.pulse.value, 1 - e * 0.8);
      c.group.scale.setScalar(s);

      c.ptsMat.opacity  = lerp(0.95, 0.16, e);
      c.lineMat.opacity = lerp(0.5, 0.14, e);
    });

    // shield reveals / subtle motion
    shieldRoot.rotation.z = lerp(-0.1, 0.12, Math.sin(t*0.25)*0.5 + 0.5);
    shieldRoot.rotation.y = lerp(-0.08, 0.08, Math.sin(t*0.33)*0.5 + 0.5);

    shieldLayers.forEach((L, i) => {
      const target = L.base * e;
      L.pm.opacity = lerp(L.pm.opacity, target, 0.14);
      L.lm.opacity = lerp(L.lm.opacity, target * 0.7, 0.14);
      L.grp.position.z = lerp(L.grp.position.z, layerDepth[i] * (1 - e * 0.5), 0.1);
      L.grp.rotation.z = Math.sin(t*0.35 + i) * 0.08 * (1 + i*0.3);
    });

    core.material.opacity = lerp(core.material.opacity, 0.42 * e + 0.18 * corePulse.v * e, 0.15);
    core.scale.setScalar(lerp(0.95, 1.25, corePulse.v * e));
    ring.material.opacity = lerp(ring.material.opacity, 0.32 * e, 0.12);
    ring.scale.setScalar(lerp(1.1, 1.36, 0.5 + 0.5 * Math.sin(t * 0.6)));

    renderer.render(scene, camera);
  }
  tick();

  // ---------- resize ----------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- shield silhouette (heater/hex mix) ----------
  function insideShield(x, y) {
    const ny = y / 5.2;
    const nx = x / 5.2;
    if (ny > 0.22) {
      const dx = nx;
      const dy = ny - 0.4;
      return dx*dx + dy*dy <= 0.46; // top arc
    }
    const lower = 0.95 - (ny + 0.9) * 0.6; // taper
    return Math.abs(nx) <= lower;
  }
})();
