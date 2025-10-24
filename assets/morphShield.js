// ====== AEGIS PARTICLE NETWORK (Starter Version) ======
// Uses Three.js to render floating particles with green/purple glow.

let scene, camera, renderer, particles, particlePositions;

init();
animate();

function init() {
  const canvas = document.getElementById("aegisCanvas");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.z = 900;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create particles
  const particleCount = 700;
  particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i++) {
    particlePositions[i] = (Math.random() - 0.5) * 2000;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0x00ffcc,
    size: 3,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Ambient light tint (adds faint purple glow)
  const ambient = new THREE.AmbientLight(0xa259ff, 0.6);
  scene.add(ambient);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Basic floating animation
function animate() {
  requestAnimationFrame(animate);

  particles.rotation.x += 0.0005;
  particles.rotation.y += 0.0007;

  renderer.render(scene, camera);
}