// Hero scene: loads a custom GLB model lazily and animates it in code.
// Tree-shaken Three.js + GLTFLoader + MeshoptDecoder. Exports init(mount) so
// the island can hydrate lazily and call us once the canvas mount exists.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface HeroSceneHandle {
  destroy: () => void;
}

const MODEL_URL = '/models/hero.compressed.glb';
const TARGET_SIZE = 3.5; // world units along the largest bounding-box axis

export function init(mount: HTMLElement): HeroSceneHandle {
  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.04);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.8, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 0.8s cubic-bezier(.2,.7,.2,1)';
  mount.appendChild(renderer.domElement);

  const accentHex = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim() || '#FF6F59';
  const ACCENT = new THREE.Color(accentHex);

  // Moody dark setup: ambient lifts the whole mask off pitch black, a soft
  // desaturated key replaces the old white directional so we don't get a
  // harsh white specular glare on the wet material.
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x1a0e10, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 4);
  scene.add(key);
  const accentBeam = new THREE.SpotLight(ACCENT, 9.0, 16, Math.PI / 4.5, 0.55, 1.2);
  accentBeam.position.set(-3.5, -3, 2.5);
  accentBeam.target.position.set(1.5, 1.8, -0.5);
  scene.add(accentBeam);
  scene.add(accentBeam.target);

  const accentFill = new THREE.PointLight(ACCENT, 1.6, 12, 1.2);
  accentFill.position.set(0, 0.5, 2);
  scene.add(accentFill);

  const cool = new THREE.PointLight(0x4dd2ff, 1.4, 14, 2);
  cool.position.set(2.5, 1.5, 2);
  scene.add(cool);

  const rim = new THREE.PointLight(ACCENT, 4, 12, 0.6);
  rim.position.set(0, 3.5, -2.5);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  // Model group — populated after async load
  const modelGroup = new THREE.Group();
  modelGroup.position.y = 0.5; // lift the mask slightly so it sits above the horizon
  root.add(modelGroup);

  // Load the GLB
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let modelLoaded = false;
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;

      // Center on origin and scale to fit TARGET_SIZE along the largest axis
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const scale = TARGET_SIZE / maxAxis;
      model.position.sub(center).multiplyScalar(scale);
      model.scale.setScalar(scale);

      modelGroup.add(model);
      modelLoaded = true;

      renderer.domElement.style.opacity = '1';
      mount.setAttribute('data-loaded', 'true');
    },
    undefined,
    (err) => {
      console.error('Failed to load hero model', err);
      mount.setAttribute('data-load-error', 'true');
    }
  );

  // Foreground particles — z stays positive so they sit between camera and mask.
  const PARTICLES = 380;
  const pPositions = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 14;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    pPositions[i * 3 + 2] = Math.random() * 4 + 1.5; // z 1.5 to 5.5, in front of mask
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: ACCENT,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
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
  // Max yaw/pitch the mask will turn toward the cursor (radians ≈ ~34° / 23°)
  const YAW_RANGE = 0.6;
  const PITCH_RANGE = 0.4;
  // Rest tilt — negative lifts the gaze up to horizontal
  // (in this scene, +rotation.x tilts the face down, so we need a negative offset).
  const REST_PITCH = -0.4;
  function animate(): void {
    const dt = clock.getDelta();
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    // Subtle parallax so the scene still breathes
    root.position.x = pointer.x * 0.12;
    root.position.y = -pointer.y * 0.08;

    if (modelLoaded) {
      // Mask tracks the cursor — yaw follows pointer X, pitch follows pointer Y.
      // pointer.y is negative when mouse is near top of screen; combined with our
      // convention (+rotation.x = look down), that means mouse-up = look up.
      modelGroup.rotation.y = pointer.x * YAW_RANGE;
      modelGroup.rotation.x = pointer.y * PITCH_RANGE + REST_PITCH;
    }

    const ppos = pGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      ppos[i * 3 + 1] += dt * 0.12 * (((i * 17) % 5) * 0.2 + 0.3);
      if (ppos[i * 3 + 1] > 5) ppos[i * 3 + 1] = -5;
    }
    pGeo.attributes.position.needsUpdate = true;

    const heroH = window.innerHeight;
    const fade = Math.max(0, 1 - scrollY / (heroH * 0.9));
    root.position.y -= scrollY * 0.0015;
    if (modelLoaded) {
      renderer.domElement.style.opacity = String(fade);
    }

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
