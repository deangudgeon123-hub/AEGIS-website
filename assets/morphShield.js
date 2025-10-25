// --- AEGIS NETWORK BACKGROUND ---
const canvas = document.getElementById('aegisCanvas');
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0a0a0a, 1);

// Create points (nodes)
const nodeCount = 300;
const positions = new Float32Array(nodeCount * 3);
for (let i = 0; i < nodeCount * 3; i++) positions[i] = (Math.random() - 0.5) * 30;

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const pointsMaterial = new THREE.PointsMaterial({
  color: 0x00f5a0,
  size: 0.08,
  transparent: true,
  opacity: 0.9,
});

const points = new THREE.Points(geometry, pointsMaterial);
scene.add(points);

// Create wireframe lines
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x8b5cff,
  transparent: true,
  opacity: 0.3,
});

const lineGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array(nodeCount * 6);
for (let i = 0; i < nodeCount * 2; i++) {
  const a = Math.floor(Math.random() * nodeCount);
  const b = Math.floor(Math.random() * nodeCount);
  linePositions[i * 3] = positions[a * 3];
  linePositions[i * 3 + 1] = positions[a * 3 + 1];
  linePositions[i * 3 + 2] = positions[a * 3 + 2];
  linePositions[i * 3 + 3] = positions[b * 3];
  linePositions[i * 3 + 4] = positions[b * 3 + 1];
  linePositions[i * 3 + 5] = positions[b * 3 + 2];
}
lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
scene.add(lines);

// Animate
function animate() {
  requestAnimationFrame(animate);

  const t = Date.now() * 0.001;
  points.rotation.y = t * 0.05;
  lines.rotation.y = t * 0.05;

  const s = 1 + Math.sin(t * 1.5) * 0.03;
  points.scale.set(s, s, s);
  lines.scale.set(s, s, s);

  renderer.render(scene, camera);
}
animate();

// Resize handling
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});