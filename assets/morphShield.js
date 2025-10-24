/* Aegis wireframe network → morph into shield on scroll
   - Three.js
   - Lightweight: points + wire links (nearest neighbors)
   - Gradual morph based on scroll progress into #about
*/

(() => {
  const canvas = document.getElementById('aegisCanvas');
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 0, 900);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Parameters
  const POINTS = 260;        // density of nodes
  const LINK_NEIGHBORS = 3;  // how many neighbors to link
  const BOX = 800;           // initial random volume (±BOX/2)
  const TARGET_W = 520;      // shield width
  const TARGET_H = 620;      // shield height

  // Storage
  const initPos = new Float32Array(POINTS * 3);
  const targPos = new Float32Array(POINTS * 3);
  const currPos = new Float32Array(POINTS * 3);

  // Create initial random points
  for (let i = 0; i < POINTS; i++) {
    initPos[3*i+0] = (Math.random() - 0.5) * BOX;
    initPos[3*i+1] = (Math.random() - 0.5) * BOX * 0.6;
    initPos[3*i+2] = (Math.random() - 0.5) * 220;
  }

  // Create target shield outline points (2D), then give slight Z jitter
  const outline = shieldOutlinePoints(POINTS, TARGET_W, TARGET_H);
  for (let i = 0; i < POINTS; i++) {
    targPos[3*i+0] = outline[i].x;
    targPos[3*i+1] = outline[i].y;
    targPos[3*i+2] = (Math.random()-0.5) * 30; // tiny depth for parallax
  }

  // Start current = initial
  currPos.set(initPos);

  // Points (small glowing dots)
  const ptsGeom = new THREE.BufferGeometry();
  ptsGeom.setAttribute('position', new THREE.BufferAttribute(currPos, 3));
  const ptsMat = new THREE.PointsMaterial({
    color: 0x21e6a2,          // emerald
    size: 3,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(ptsGeom, ptsMat);
  scene.add(points);

  // Build neighbor graph (based on initial layout; good enough visually)
  const neighborPairs = buildNeighbors(initPos, POINTS, LINK_NEIGHBORS);
  const linePositions = new Float32Array(neighborPairs.length * 2 * 3);
  const lineGeom = new THREE.BufferGeometry();
  lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xa855f7,          // purple
    transparent: true,
    opacity: 0.4
  });
  const lines = new THREE.LineSegments(lineGeom, lineMat);
  scene.add(lines);

  // Subtle scene lighting (for a faint tint)
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  // Scroll-based morph factor 0..1 using the #about section
  let morph = 0;
  const about = document.getElementById('about');

  function updateMorphFromScroll() {
    const rect = about.getBoundingClientRect();
    const vh = window.innerHeight;

    // Start morph when top of #about enters lower 65% of viewport
    const start = vh * 0.65;
    // Finish morph when the center of #about reaches ~35% from top
    const end = vh * 0.35;

    // progress increases as rect.top moves from start -> end
    const raw = (start - rect.top) / (start - end);
    morph = clamp(raw, 0, 1);
  }

  // Animation loop
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    updateMorphFromScroll();

    // Ease for smooth transform
    const e = easeInOutCubic(morph);

    // rotate a little while not fully morphed for “living” feel
    points.rotation.y = (1 - e) * 0.12;
    lines.rotation.y  = (1 - e) * 0.12;

    // Lerp positions & update line segments
    for (let i = 0; i < POINTS; i++) {
      const ix = 3*i;
      currPos[ix+0] = lerp(initPos[ix+0], targPos[ix+0], e);
      currPos[ix+1] = lerp(initPos[ix+1], targPos[ix+1], e);
      currPos[ix+2] = lerp(initPos[ix+2], targPos[ix+2], e);
    }
    ptsGeom.attributes.position.needsUpdate = true;

    // Update line positions from current points
    for (let k = 0; k < neighborPairs.length; k++) {
      const i = neighborPairs[k][0];
      const j = neighborPairs[k][1];
      const a = 3*i, b = 3*j;
      const L = 6*k;
      linePositions[L+0] = currPos[a+0];
      linePositions[L+1] = currPos[a+1];
      linePositions[L+2] = currPos[a+2];
      linePositions[L+3] = currPos[b+0];
      linePositions[L+4] = currPos[b+1];
      linePositions[L+5] = currPos[b+2];
    }
    lineGeom.attributes.position.needsUpdate = true;

    // gentle color breathing between green & purple
    t += 0.005;
    const mix = 0.5 + 0.5*Math.sin(t*0.8);
    const col = new THREE.Color().lerpColors(
      new THREE.Color(0x21e6a2),
      new THREE.Color(0xa855f7),
      mix
    );
    lineMat.color.copy(col);
    ptsMat.color.copy(new THREE.Color().lerpColors(
      new THREE.Color(0x21e6a2),
      new THREE.Color(0xffffff),
      0.2 + 0.2*Math.sin(t*0.6)
    ));

    renderer.render(scene, camera);
  }

  // Resize handling
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }, { passive: true });

  // Scroll handling
  window.addEventListener('scroll', updateMorphFromScroll, { passive: true });
  updateMorphFromScroll();

  animate();

  // ---------- helpers ----------

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(x) {
    return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
  }

  // Build nearest-neighbor pairs (small K), avoid duplicates
  function buildNeighbors(positions, count, k = 3) {
    const pts = [];
    for (let i = 0; i < count; i++) {
      pts.push({ i, x: positions[3*i], y: positions[3*i+1], z: positions[3*i+2] });
    }
    const pairs = [];
    for (let i = 0; i < count; i++) {
      // brute-force nearest k (fine for a few hundred)
      const dists = [];
      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dz = pts[i].z - pts[j].z;
        dists.push({ j, d: dx*dx + dy*dy + dz*dz });
      }
      dists.sort((a,b)=>a.d-b.d);
      for (let n = 0; n < k; n++) {
        const j = dists[n].j;
        const a = Math.min(i, j);
        const b = Math.max(i, j);
        // push unique pair
        if (!pairs.some(p => p[0]===a && p[1]===b)) pairs.push([a,b]);
      }
    }
    return pairs;
  }

  // Generate an approximate heater-shield outline, centered at (0,0)
  function shieldOutlinePoints(n, w, h) {
    // Compose from top arc + side curves to a bottom point
    const pts = [];
    const topRadius = w * 0.48;
    const topCenterY = -h * 0.38; // raise arc a bit
    const sideDepth = h * 0.55;   // how far sides go down before taper
    const bottomY = h * 0.48;

    // 1) Top arc (200° → -20°)
    const arcCount = Math.floor(n * 0.35);
    for (let i = 0; i < arcCount; i++) {
      const t = i / (arcCount - 1);
      const ang = (200 - 220 * t) * Math.PI/180; // 200° to -20°
      const x = Math.cos(ang) * topRadius;
      const y = topCenterY + Math.sin(ang) * topRadius;
      pts.push({ x, y });
    }

    // 2) Left side curve to bottom
    const sideCount = Math.floor(n * 0.3);
    for (let i = 0; i < sideCount; i++) {
      const t = i / (sideCount - 1);
      const x = -w*0.5 + (w*0.1) * (1 - Math.pow(t, 0.8)); // slight inward bend
      const y = topCenterY + (sideDepth - topCenterY) * t + (Math.sin(t*Math.PI)*8);
      pts.push({ x, y });
    }

    // 3) Bottom tip
    pts.push({ x: 0, y: bottomY });

    // 4) Right side curve (mirror of left)
    for (let i = sideCount - 1; i >= 0; i--) {
      const t = i / (sideCount - 1);
      const x =  w*0.5 - (w*0.1) * (1 - Math.pow(t, 0.8));
      const y = topCenterY + (sideDepth - topCenterY) * t + (Math.sin(t*Math.PI)*8);
      pts.push({ x, y });
    }

    // 5) Close back to arc start (smooth)
    // Normalize to requested count by resampling along polyline length
    return resamplePolyline(pts, n);
  }

  // Resample a polyline to exactly n points (approx. equal distances)
  function resamplePolyline(poly, n) {
    // compute cumulative lengths
    const segs = [];
    let total = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i+1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a, b, d });
      total += d;
    }
    const out = [];
    for (let k = 0; k < n; k++) {
      const dist = (k / (n - 1)) * total;
      let acc = 0;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (acc + s.d >= dist) {
          const t = (dist - acc) / s.d;
          out.push({ x: lerp(s.a.x, s.b.x, t), y: lerp(s.a.y, s.b.y, t) });
          break;
        }
        acc += s.d;
      }
    }
    return out;
  }
})();