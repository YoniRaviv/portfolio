// Cyberpunk chip hero scene. Tree-shaken Three.js, exports init(mount) so the
// island can hydrate lazily and call us once the canvas mount exists.

import * as THREE from 'three';

export interface HeroSceneHandle {
  destroy: () => void;
}

export function init(mount: HTMLElement): HeroSceneHandle {
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.025);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.8, 5.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 4, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6f59, 6, 14, 2);
  rim.position.set(-2.5, 1.5, 2);
  scene.add(rim);
  const rim2 = new THREE.PointLight(0x4dd2ff, 4, 14, 2);
  rim2.position.set(2.5, -1, 2);
  scene.add(rim2);

  const accentHex = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim() || '#FF6F59';
  const ACCENT = new THREE.Color(accentHex);

  const root = new THREE.Group();
  scene.add(root);

  // chip body
  const chip = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.22, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.35, roughness: 0.5 })
  );
  chip.add(body);

  const inset = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.04, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.3, roughness: 0.6 })
  );
  inset.position.y = 0.12;
  chip.add(inset);

  const chipCoreMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 1.6,
    toneMapped: false,
  });
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), chipCoreMat);
  core.position.y = 0.15;
  chip.add(core);

  // traces
  const tracePts: number[] = [];
  const addLine = (ax: number, az: number, bx: number, bz: number): void => {
    tracePts.push(ax, 0.15, az, bx, 0.15, bz);
  };
  addLine(-0.35, -0.35, 0.35, -0.35);
  addLine(0.35, -0.35, 0.35, 0.35);
  addLine(0.35, 0.35, -0.35, 0.35);
  addLine(-0.35, 0.35, -0.35, -0.35);
  const routes: number[][] = [
    [0.35, 0, 1.15, 0, 1.15, 0.45],
    [0.35, 0.2, 0.8, 0.2, 0.8, 1.0],
    [0.35, -0.2, 0.8, -0.2, 0.8, -1.0],
    [0, 0.35, 0, 1.0, 0.6, 1.0],
    [0, -0.35, 0, -1.0, -0.6, -1.0],
    [-0.35, 0, -1.15, 0, -1.15, -0.45],
    [-0.35, 0.2, -0.8, 0.2, -0.8, 1.0],
    [-0.35, -0.2, -0.8, -0.2, -0.8, -1.0],
  ];
  routes.forEach((r) => {
    for (let i = 0; i < r.length - 2; i += 2) addLine(r[i], r[i + 1], r[i + 2], r[i + 3]);
  });
  const traceGeo = new THREE.BufferGeometry();
  traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(tracePts, 3));
  const traceMat = new THREE.LineBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.95,
  });
  chip.add(new THREE.LineSegments(traceGeo, traceMat));

  // pads
  const padMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 1.3,
    toneMapped: false,
  });
  const padGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
  const padPositions: Array<[number, number]> = [
    [1.15, 0.45], [0.8, 1.0], [0.8, -1.0], [0.6, 1.0],
    [-0.6, -1.0], [-1.15, -0.45], [-0.8, 1.0], [-0.8, -1.0],
  ];
  padPositions.forEach((p) => {
    const m = new THREE.Mesh(padGeom, padMat);
    m.position.set(p[0], 0.15, p[1]);
    chip.add(m);
  });

  // pins
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xc8c4b8, metalness: 0.5, roughness: 0.4 });
  const pinGeom = new THREE.BoxGeometry(0.06, 0.08, 0.22);
  const pinCount = 14;
  for (let i = 0; i < pinCount; i++) {
    const t = (i / (pinCount - 1) - 0.5) * 2.4;
    [-1.42, 1.42].forEach((z) => {
      const p = new THREE.Mesh(pinGeom, pinMat);
      p.position.set(t, 0, z);
      chip.add(p);
    });
    [-1.42, 1.42].forEach((x) => {
      const p = new THREE.Mesh(pinGeom, pinMat);
      p.position.set(x, 0, t);
      p.rotation.y = Math.PI / 2;
      chip.add(p);
    });
  }

  // rings
  const ringMat = new THREE.MeshBasicMaterial({
    color: ACCENT,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.58, 80), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.35;
  chip.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 1.87, 100, 1, 0, Math.PI * 1.6),
    new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.55;
  chip.add(ring2);

  chip.rotation.z = 0.08;
  chip.scale.setScalar(1.1);
  root.add(chip);

  // floor grid
  const grid = new THREE.GridHelper(40, 40, ACCENT, 0x222222);
  grid.position.y = -2.2;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.25;
  scene.add(grid);

  // particles
  const PARTICLES = 280;
  const pPositions = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 16;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: ACCENT,
      size: 0.03,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      toneMapped: false,
    })
  );
  scene.add(particles);

  // resize handling
  function resize(): void {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);

  // pointer parallax
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent): void => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // scroll fade
  let scrollY = 0;
  const onScroll = (): void => {
    scrollY = window.scrollY;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // animate
  const clock = new THREE.Clock();
  let raf = 0;
  const spinSpeed = 1.4;
  function animate(): void {
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    root.position.x = pointer.x * 0.25;
    root.position.y = -pointer.y * 0.2;

    chip.rotation.y = t * 0.25 * spinSpeed;
    chipCoreMat.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.4;
    ring.rotation.z = t * 0.9 * spinSpeed;
    ring2.rotation.z = -t * 0.5 * spinSpeed;

    const ppos = pGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      ppos[i * 3 + 1] += dt * 0.12 * (((i * 17) % 5) * 0.2 + 0.3);
      if (ppos[i * 3 + 1] > 5) ppos[i * 3 + 1] = -5;
    }
    pGeo.attributes.position.needsUpdate = true;

    const heroH = window.innerHeight;
    const fade = Math.max(0, 1 - scrollY / (heroH * 0.9));
    root.position.y -= scrollY * 0.0015;
    renderer.domElement.style.opacity = String(fade);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
  };
}
