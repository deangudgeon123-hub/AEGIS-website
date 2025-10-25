import * as THREE from 'three';
import { gsap } from 'gsap';

let scene, camera, renderer, points, lines, shield, mixer;
let clock = new THREE.Clock();
const canvas = document.getElementById('aegisCanvas');

// --- Scene setup ---
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 14;

// --- Renderer ---
renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0a0a0a, 1);

// --- Materials ---
const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00f5a0 });
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x8b5cff,
  transparent: true,
  opacity: 0.35,
});

// --- Geometry setup ---
const nodeCount = 240;
const nodes = [];
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(nodeCount * 3);

for (let i = 0; i < nodeCount; i++) {
  const x = (Math.random() - 0.5) * 20;
  const y = (Math.random() - 0.5) * 12;
  const z = (Math.random() - 0.5) * 10;
  positions.set([x, y, z], i * 3);
  nodes.push(new THREE.Vector3(x, y, z));
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
points = new THREE.Points(
  geometry,
  new THREE.PointsMaterial({
    color: 0x00f5a0,
    size: 0.08,
    transparent: true,
    opacity: 0.9,
  })
);
scene.add(points);

// --- Random link lines for “network” look ---
const lineGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array(nodeCount * 6);
for (let i = 0; i < nodeCount * 2; i++) {
  const a = nodes[Math.floor(Math.random() * nodes.length)];
  const b = nodes[Math.floor(Math.random() * nodes.length)];
  linePositions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 3);
}
lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
lines = new THREE.LineSegments(lineGeometry, lineMaterial);
scene.add(lines);

// --- Shield geometry (hex style) ---
const shieldGeometry = new THREE.IcosahedronGeometry(5, 2);
const shieldMaterial = new THREE.MeshBasicMaterial({
  color: 0x8b5cff,
  wireframe: true,
  transparent: true,
  opacity: 0.15,
});
shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
shield.visible = false;
scene.add(shield);

// --- Animate points ---
function animate() {
  const delta = clock.getDelta();
  requestAnimationFrame(animate);

  const positions = points.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.0004;
  }
  points.geometry.attributes.position.needsUpdate = true;

  // subtle shield pulse
  if (shield.visible) {
    shield.rotation.y += 0.001;
    const s = 1 + Math.sin(Date.now() * 0.0015) * 0.015;
    shield.scale.set(s, s, s);
  }

  renderer.render(scene, camera);
}
animate();

// --- Scroll trigger logic ---
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const aboutSection = document.getElementById('about');
  const triggerY = aboutSection.offsetTop - window.innerHeight / 2;

  if (scrollY > triggerY) {
    // Morph into shield
    gsap.to(points.material, { opacity: 0.05, duration: 2 });
    gsap.to(lines.material, { opacity: 0.05, duration: 2 });
    shield.visible = true;
    gsap.to(shield.material, { opacity: 0.25, duration: 2 });
  } else {
    // Return to free-floating state
    gsap.to(points.material, { opacity: 0.9, duration: 1.5 });
    gsap.to(lines.material, { opacity: 0.35, duration: 1.5 });
    gsap.to(shield.material, { opacity: 0, duration: 1.5 });
    gsap.delayedCall(1.5, () => (shield.visible = false));
  }
});

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});