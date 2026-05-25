// Hero scene: persistent full-viewport canvas that travels through every
// section via a rig system. Configs live in ./scene/rigs/<section>.ts —
// this file owns the three.js setup and the per-frame animation loop only.
// Tree-shaken Three.js + GLTFLoader + MeshoptDecoder. Exports init(mount)
// so the island can hydrate lazily and call us once the mount exists.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

import type { SectionKey, SectionRig } from './scene/types';
import { MODEL_URL, TARGET_SIZE } from './scene/types';
import { cloneRig, lerpRig } from './scene/rig-math';
import { HERO_RIG, SECTION_RIGS_DESKTOP, SECTION_RIGS_MOBILE } from './scene/rigs';
import { createTargetRigComputer } from './scene/section-probe';

export interface HeroSceneHandle {
  destroy: () => void;
}

export function init(mount: HTMLElement): HeroSceneHandle {
  const mql = matchMedia('(max-width: 720px)');
  const state = { isMobile: mql.matches };

  const onBreakpointChange = (e: MediaQueryListEvent): void => {
    state.isMobile = e.matches;
  };
  mql.addEventListener('change', onBreakpointChange);

  const getActiveRigs = (): Record<SectionKey, SectionRig> =>
    state.isMobile ? SECTION_RIGS_MOBILE : SECTION_RIGS_DESKTOP;

  const computeTargetRig = createTargetRigComputer(getActiveRigs);

  const scene = new THREE.Scene();
  scene.background = null;
  const fog = new THREE.FogExp2(0x0a0a0a, HERO_RIG.fogDensity);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.8, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = HERO_RIG.exposure;
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 0.8s cubic-bezier(.2,.7,.2,1)';
  mount.appendChild(renderer.domElement);

  const accentHex = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim() || '#FF6F59';
  const ACCENT = new THREE.Color(accentHex);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x1a0e10, 0.65);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 4);
  scene.add(key);
  const accentBeam = new THREE.SpotLight(ACCENT, HERO_RIG.accentBeamIntensity, 16, Math.PI / 4.5, 0.55, 1.2);
  accentBeam.position.set(HERO_RIG.accentBeamPos.x, HERO_RIG.accentBeamPos.y, HERO_RIG.accentBeamPos.z);
  accentBeam.target.position.set(
    HERO_RIG.accentBeamTarget.x,
    HERO_RIG.accentBeamTarget.y,
    HERO_RIG.accentBeamTarget.z
  );
  scene.add(accentBeam);
  scene.add(accentBeam.target);

  // Static fills — not animated, but contribute to the lighting baseline so
  // the mask never reads as a flat silhouette when the accent beam dims.
  const accentFill = new THREE.PointLight(ACCENT, 1.6, 12, 1.2);
  accentFill.position.set(0, 0.5, 3);
  scene.add(accentFill);

  const cool = new THREE.PointLight(0x4dd2ff, 1.4, 14, 2);
  cool.position.set(2.5, 1.5, 2);
  scene.add(cool);

  const rim = new THREE.PointLight(ACCENT, 4, 12, 0.6);
  rim.position.set(0, 3.5, -2.5);
  scene.add(rim);

  // Scene graph: scene > stageGroup > root > modelGroup
  // - stageGroup holds rig-driven position/scale (per-section transforms)
  // - root holds pointer parallax (unchanged)
  // - modelGroup holds the loaded GLB mask + rotation
  const stageGroup = new THREE.Group();
  scene.add(stageGroup);

  const root = new THREE.Group();
  stageGroup.add(root);

  const modelGroup = new THREE.Group();
  // Use YXZ Euler order so yaw is applied first, then pitch around the mask's
  // *new* local right-axis. With the default XYZ, a non-zero yaw turns the
  // world X axis into the mask's forward/backward direction, and then any
  // pitchBias on rotation.x rolls the head like a clock face instead of
  // nodding it up/down. YXZ keeps pitch as a proper head-nod regardless of
  // how far the head is yawed.
  modelGroup.rotation.order = 'YXZ';
  root.add(modelGroup);

  // Load the GLB
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let modelLoaded = false;
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const s = TARGET_SIZE / maxAxis;
      model.position.sub(center).multiplyScalar(s);
      model.scale.setScalar(s);
      // Defensive: a GLB authored with a slight root rotation would read
      // as a permanent head tilt that no rig bias can cancel. We control
      // all rotation through modelGroup, so neutralise the scene root.
      model.rotation.set(0, 0, 0);

      modelGroup.add(model);
      modelLoaded = true;

      renderer.domElement.style.opacity = '1';
      mount.setAttribute('data-loaded', 'true');
      // Once the initial CSS fade-in completes, clear the transition so
      // per-frame rig-driven opacity writes are instant (no lag/smear).
      setTimeout(() => {
        renderer.domElement.style.transition = '';
      }, 900);
    },
    undefined,
    (err) => {
      console.error('Failed to load hero model', err);
      mount.setAttribute('data-load-error', 'true');
    }
  );

  // Foreground particles
  const PARTICLES = state.isMobile ? 180 : 380;
  const pPositions = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 14;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    pPositions[i * 3 + 2] = Math.random() * 4 + 1.5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
  const particlesMat = new THREE.PointsMaterial({
    color: ACCENT,
    size: 0.04,
    transparent: true,
    opacity: HERO_RIG.particleAlpha,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const particles = new THREE.Points(pGeo, particlesMat);
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

  // Rig state — currentRig lerps toward target each frame for buttery transitions.
  let currentRig = cloneRig(HERO_RIG);
  const RIG_LERP = 0.12;

  // Reused scratch vector for projecting the mask's world position to NDC
  // each frame (used for cursor-relative rotation). Hoisted so we don't
  // allocate a Vector3 every animate() tick.
  const maskNdc = new THREE.Vector3();

  const clock = new THREE.Clock();
  let raf = 0;
  function animate(): void {
    const dt = clock.getDelta();

    if (state.isMobile) {
      const t = clock.elapsedTime;
      pointer.tx = 0.35 * Math.sin(t * 0.4);
      pointer.ty = 0.22 * Math.sin(t * 0.31 + 1.5);
    }

    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    // Compute the Contact anchor's canvas translation BEFORE the rotation
    // block so cursor-relative tracking can correct for it (see the cursor
    // calc below). The actual CSS write happens at the bottom of animate().
    // Activation is offset past Contact's top by ANCHOR_DELAY so the mask
    // "lands" beside the title text rather than above it; once anchored,
    // the mask scrolls up as a unit with the page through the rest of
    // Contact. On mobile the follow is CAPPED at MOBILE_ANCHOR_CAP so the
    // mask freezes once the email line has carried past it — without the
    // cap the mask keeps shifting up and leaks visibly behind the social
    // cards' semi-transparent grid below the email.
    let overscroll = 0;
    const contactElForAnchor = document.getElementById('contact');
    if (contactElForAnchor) {
      const ANCHOR_DELAY = window.innerHeight * 0.5;
      const anchor = contactElForAnchor.offsetTop - window.innerHeight / 1.5 + ANCHOR_DELAY;
      const raw = Math.max(0, window.scrollY - anchor);
      const cap = state.isMobile ? window.innerHeight * 0.4 : Infinity;
      overscroll = Math.min(raw, cap);
    }

    // Drive target rig from scroll position and smoothly lerp current toward it.
    const target = computeTargetRig();
    currentRig = lerpRig(currentRig, target, RIG_LERP);

    // Apply rig position + scale (stageGroup).
    stageGroup.position.set(currentRig.pos.x, currentRig.pos.y, currentRig.pos.z);
    stageGroup.scale.setScalar(currentRig.scale);

    // Pointer parallax on root — gated by rig.parallaxStrength so we can fully
    // disable cursor sway in sections (What onwards) where it'd fight the
    // intentional rig animations / hover interactions.
    root.position.x = pointer.x * 0.12 * currentRig.parallaxStrength;
    root.position.y = -pointer.y * 0.08 * currentRig.parallaxStrength;

    if (modelLoaded) {
      // Cursor-driven rotation is computed relative to the mask's projected
      // screen position, not viewport centre. Without this, a mask parked
      // at the right edge (Hero, Contact) tracks the cursor as if the mask
      // were dead centre — so a cursor on the left of the screen barely
      // turns the head because pointer.x is only ~-0.3. Subtracting the
      // mask's NDC makes the rotation respond to actual angular offset
      // from the mask, so it reads as "looking at" the cursor.
      // NDC y is +1 at top, -1 at bottom; pointer.y is the opposite, so we
      // ADD maskNdc.y to invert it into pointer space.
      // Once the Contact anchor activates the canvas is CSS-translated up
      // by `overscroll` pixels — the camera still projects the mask to the
      // SAME canvas NDC, but the mask's *viewport* y is higher by that
      // many pixels. Without the overscrollNdc adjustment the cursor calc
      // would think the mask is still mid-canvas while it actually sits
      // near the top of the viewport, throwing pitch off by tens of
      // degrees once you've scrolled into Contact.
      maskNdc.set(currentRig.pos.x, currentRig.pos.y, currentRig.pos.z).project(camera);
      const overscrollNdc = 2 * overscroll / window.innerHeight;
      const cursorX = pointer.x - maskNdc.x;
      const cursorY = pointer.y + maskNdc.y + overscrollNdc;
      const yaw = cursorX * currentRig.pointerYaw + currentRig.yawBias;
      // Clamp pitch to a reasonable head-nod range. The model is centered on
      // its bounding-box midpoint (which sits *above* the face because the
      // hair spikes extend up), so a very negative pitch swings the face
      // back-and-down around that high pivot while the spikes swing
      // forward-and-up — the eye reads that as a head roll the Z
      // correction can't cancel. Capping pitch keeps the pose inside the
      // range where the pivot asymmetry is invisible. Top-left was the
      // only corner pushing past this limit because it's the only one
      // combining cursor-far-left (max negative yaw delta) with cursor-
      // near-top (max negative pitch delta).
      const PITCH_LIMIT_UP = -5.6;
      const PITCH_LIMIT_DOWN = 0.6;
      const pitch = Math.max(PITCH_LIMIT_UP, Math.min(PITCH_LIMIT_DOWN,
        cursorY * currentRig.pointerPitch + currentRig.pitchBias));
      modelGroup.rotation.y = yaw;
      modelGroup.rotation.x = pitch;
      // YXZ Euler with combined non-zero yaw + pitch makes the mask's up
      // vector pick up a world-X component, which the camera reads as
      // ~5–10° of apparent roll (head tilted to one side). Counter it
      // with a Z rotation that satisfies tan(roll) = sin(pitch)*tan(yaw),
      // keeping the up vector in the world YZ plane. Faded smoothly out
      // for non-forward yaws (cos ≤ 0.3) because the formula blows up
      // near profile poses (yaw ≈ ±π/2); without the fade, the correction
      // snaps on/off as the lerp into Contact crosses the gate threshold,
      // which reads as a visible flicker at the How→Contact boundary.
      const cosYaw = Math.cos(yaw);
      const FADE_LO = 0.3;
      const FADE_HI = 0.5;
      const correctionFactor = Math.max(0, Math.min(1, (cosYaw - FADE_LO) / (FADE_HI - FADE_LO)));
      modelGroup.rotation.z = correctionFactor > 0
        ? correctionFactor * Math.atan2(Math.sin(pitch) * Math.sin(yaw), Math.max(0.001, cosYaw))
        : 0;
    }

    // Mobile ambient breathing. Layered on top of whatever the rig already
    // wrote so even sections with start ≡ end (Who, Where, How, Contact)
    // feel alive between scroll events. Three independent periods (scale,
    // pitch, yaw) keep the motion from reading as a single repeating pulse
    // — the visitor can't predict the loop, so it registers as "alive"
    // rather than "looping". Amplitudes are intentionally small (±1.2%
    // scale, ±0.025 rad pitch, ±0.03 rad yaw) so they don't fight the
    // rig's per-section gestures (e.g. What's 2π spin, Where's flash).
    if (state.isMobile && modelLoaded) {
      const t = clock.elapsedTime;
      stageGroup.scale.multiplyScalar(1 + 0.012 * Math.sin(t * 0.6));
      modelGroup.rotation.x += 0.025 * Math.sin(t * 0.4);
      modelGroup.rotation.y += 0.03 * Math.sin(t * 0.33 + 0.7);
    }

    // Lights, fog, exposure from rig.
    renderer.toneMappingExposure = currentRig.exposure;
    fog.density = currentRig.fogDensity;
    ambient.intensity = currentRig.ambientIntensity;
    hemi.intensity = currentRig.hemiIntensity;
    key.intensity = currentRig.keyIntensity;
    accentBeam.intensity = currentRig.accentBeamIntensity;
    // Beam position = mask centre + (beam-offset rotated by beamYawOffset
    // around the mask's vertical axis). beamYawOffset = 0 leaves the beam
    // exactly at accentBeamPos; setting it to a non-zero angle orbits the
    // beam around the mask while keeping radius constant.
    {
      const dx = currentRig.accentBeamPos.x - currentRig.pos.x;
      const dz = currentRig.accentBeamPos.z - currentRig.pos.z;
      const cy = Math.cos(currentRig.beamYawOffset);
      const sy = Math.sin(currentRig.beamYawOffset);
      const rx = dx * cy - dz * sy;
      const rz = dx * sy + dz * cy;
      accentBeam.position.set(
        currentRig.pos.x + rx,
        currentRig.accentBeamPos.y,
        currentRig.pos.z + rz
      );
    }
    accentBeam.target.position.set(
      currentRig.accentBeamTarget.x,
      currentRig.accentBeamTarget.y,
      currentRig.accentBeamTarget.z
    );

    // Live (time-based) beam orbit in Contact. The rig contributes a static
    // beam position inside Contact (start ≡ end), and this block overlays a
    // continuous slow orbit on top so the lighting feels alive even when
    // the visitor isn't scrolling. liveLightFactor smoothly ramps from 0
    // (outside Contact / through the How→Contact lerp) to 1 (well inside
    // Contact), blending from rig position to orbit so there's no pop at
    // the boundary. Multiple sinusoidal axes at different periods keep the
    // motion from feeling like a clean circle — the visitor reads it as
    // chiaroscuro shifting around the mask.
    let liveLightFactor = 0;
    if (contactElForAnchor) {
      const probe = window.scrollY + window.innerHeight / 2;
      const fadeStart = contactElForAnchor.offsetTop;
      const fadeEnd = contactElForAnchor.offsetTop + window.innerHeight * 0.4;
      const raw = Math.max(0, Math.min(1, (probe - fadeStart) / (fadeEnd - fadeStart)));
      liveLightFactor = raw * raw * (3 - 2 * raw); // smoothstep
    }
    if (liveLightFactor > 0) {
      const t = clock.elapsedTime;
      const orbitX = currentRig.pos.x + 4.5 * Math.cos(t * 0.35);
      const orbitY = currentRig.pos.y + 2.5 + 2.5 * Math.sin(t * 0.27);
      const orbitZ = currentRig.pos.z + 3 + 1.2 * Math.sin(t * 0.22);
      accentBeam.position.x = accentBeam.position.x * (1 - liveLightFactor) + orbitX * liveLightFactor;
      accentBeam.position.y = accentBeam.position.y * (1 - liveLightFactor) + orbitY * liveLightFactor;
      accentBeam.position.z = accentBeam.position.z * (1 - liveLightFactor) + orbitZ * liveLightFactor;
      // Subtle intensity pulse with a third period so the brightness shifts
      // independently of the orbit position.
      const liveIntensity = 14 + 4 * Math.sin(t * 0.31);
      accentBeam.intensity = accentBeam.intensity * (1 - liveLightFactor) + liveIntensity * liveLightFactor;
    }

    // Live (time-based) beam motion in Who (mobile). The Who mobile rig is
    // intentionally static — the section's life comes from a slow accent
    // beam arc carved around the mask's lower hemisphere (sweeping from
    // bottom-left through bottom-right and back), with an out-of-phase
    // intensity pulse. The factor ramps via a tent: fades in over the
    // first 30% of Who, full from 30%-70%, fades out over the last 30%,
    // so the orbit doesn't clash with the section boundaries.
    let whoLiveFactor = 0;
    if (state.isMobile) {
      const whoEl = document.getElementById('who');
      const whatEl = document.getElementById('what');
      if (whoEl) {
        const top = whoEl.offsetTop;
        const bottom = whatEl ? whatEl.offsetTop : top + whoEl.clientHeight;
        const probe = window.scrollY + window.innerHeight / 2;
        const raw = Math.max(0, Math.min(1, (probe - top) / Math.max(1, bottom - top)));
        const tent = raw < 0.3 ? raw / 0.3 : raw > 0.7 ? (1 - raw) / 0.3 : 1;
        whoLiveFactor = Math.max(0, Math.min(1, tent));
      }
    }
    if (whoLiveFactor > 0) {
      const t = clock.elapsedTime;
      // Lateral arc — beam swings under the mask in a lazy ellipse,
      // periodically rising above. Three independent periods keep the
      // motion from reading as a single circle.
      const arcX = currentRig.pos.x + 3.2 * Math.cos(t * 0.42);
      const arcY = currentRig.pos.y - 1.2 + 1.8 * Math.sin(t * 0.55);
      const arcZ = currentRig.pos.z + 2.5 + 0.8 * Math.sin(t * 0.31);
      accentBeam.position.x = accentBeam.position.x * (1 - whoLiveFactor) + arcX * whoLiveFactor;
      accentBeam.position.y = accentBeam.position.y * (1 - whoLiveFactor) + arcY * whoLiveFactor;
      accentBeam.position.z = accentBeam.position.z * (1 - whoLiveFactor) + arcZ * whoLiveFactor;
      // Intensity breathes between 10 (dim contour) and 22 (bright wash)
      // on its own period — the visitor reads alternating soft / hard
      // light passes across the silhouette.
      const liveIntensity = 16 + 6 * Math.sin(t * 0.23);
      accentBeam.intensity = accentBeam.intensity * (1 - whoLiveFactor) + liveIntensity * whoLiveFactor;
    }

    // Live (time-based) beam motion in What (mobile). Layered on top of
    // What's 2π spin (which keeps the rig's beam offset orbiting opposite
    // to the mask) — this block adds a *position* orbit on top, so the
    // beam doesn't just counter-rotate around the mask, it also shifts
    // around in 3D space. The combination keeps the chiaroscuro
    // unpredictable. Tent factor fades in over the first 30% and out
    // over the last 30% so the orbit doesn't clash with the What→Where
    // sink transition or the Who→What spin onset.
    let whatLiveFactor = 0;
    if (state.isMobile) {
      const whatEl = document.getElementById('what');
      const whereEl = document.getElementById('where');
      if (whatEl) {
        const top = whatEl.offsetTop;
        const bottom = whereEl ? whereEl.offsetTop : top + whatEl.clientHeight;
        const probe = window.scrollY + window.innerHeight / 2;
        const raw = Math.max(0, Math.min(1, (probe - top) / Math.max(1, bottom - top)));
        const tent = raw < 0.3 ? raw / 0.3 : raw > 0.7 ? (1 - raw) / 0.3 : 1;
        whatLiveFactor = Math.max(0, Math.min(1, tent));
      }
    }
    if (whatLiveFactor > 0) {
      const t = clock.elapsedTime;
      // Upper arc — beam orbits above and around the spinning mask. Different
      // axis weights from Who's orbit so the silhouette reads differently.
      const arcX = currentRig.pos.x + 4 * Math.sin(t * 0.38);
      const arcY = currentRig.pos.y + 2 + 1.4 * Math.cos(t * 0.31);
      const arcZ = currentRig.pos.z + 3 + 1 * Math.sin(t * 0.27);
      accentBeam.position.x = accentBeam.position.x * (1 - whatLiveFactor) + arcX * whatLiveFactor;
      accentBeam.position.y = accentBeam.position.y * (1 - whatLiveFactor) + arcY * whatLiveFactor;
      accentBeam.position.z = accentBeam.position.z * (1 - whatLiveFactor) + arcZ * whatLiveFactor;
      const liveIntensity = 14 + 5 * Math.sin(t * 0.29 + 1.2);
      accentBeam.intensity = accentBeam.intensity * (1 - whatLiveFactor) + liveIntensity * whatLiveFactor;
    }

    accentBeam.target.updateMatrixWorld();
    particlesMat.opacity = currentRig.particleAlpha;

    // Particles tick.
    const ppos = pGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      ppos[i * 3 + 1] += dt * 0.12 * (((i * 17) % 5) * 0.2 + 0.3);
      if (ppos[i * 3 + 1] > 5) ppos[i * 3 + 1] = -5;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Canvas opacity from rig (only after model has loaded so the initial
    // fade-in isn't clobbered).
    if (modelLoaded) {
      renderer.domElement.style.opacity = String(currentRig.alpha);
    }

    // Apply the Contact anchor translation (overscroll was already computed
    // at the top of animate() so the rotation block could correct for it).
    // Drives a CSS variable rather than inline transform — the stage
    // element's entry animation uses `both` fill, which would otherwise
    // hold `transform: none` over our inline write. See index.astro
    // keyframes.
    mount.style.setProperty('--anchor-y', `${-overscroll}px`);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      mql.removeEventListener('change', onBreakpointChange);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
  };
}
