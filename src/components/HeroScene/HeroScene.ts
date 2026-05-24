// Hero scene: loads a custom GLB model lazily and animates it in code.
// Now a persistent canvas that travels through every section via a Rig system.
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
const TRANSITION_ZONE = 0.4; // default last-N portion of a section that blends to the next

const SECTION_KEYS = ['hero', 'who', 'what', 'where', 'how', 'contact'] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

interface Rig {
  pos: { x: number; y: number; z: number };
  scale: number;
  yawBias: number;
  pitchBias: number;
  exposure: number;
  fogDensity: number;
  alpha: number;
  accentBeamIntensity: number;
  accentBeamPos: { x: number; y: number; z: number };
  accentBeamTarget: { x: number; y: number; z: number };
  // Extra yaw applied to the accent beam, rotating its position around the
  // mask's vertical axis (i.e. orbiting the mask). 0 = no orbit. Used in What
  // to spin the beam opposite to the mask's yawBias spin.
  beamYawOffset: number;
  particleAlpha: number;
  // Cursor-driven rotation range on the mask (radians). 0 = mask doesn't react
  // to the cursor at all.
  pointerYaw: number;
  pointerPitch: number;
  // Cursor-driven translation of root (0 = no parallax sway). Hero/Who use 1,
  // later sections set to 0 once the cursor becomes an interaction tool
  // (Who quote reveal) rather than ambient parallax.
  parallaxStrength: number;
  // Fill-light intensities. Lowering these in What raises contrast so the
  // accent uplight reads as dramatic chiaroscuro instead of a flat wash.
  ambientIntensity: number;
  hemiIntensity: number;
  keyIntensity: number;
}

interface SectionRig {
  start: Rig;
  end?: Rig; // if omitted, end = start (steady within section)
  // Fraction of section (0–1) over which the rig blends toward the NEXT
  // section's start. Defaults to TRANSITION_ZONE. Lower values keep this
  // section's pose until closer to the boundary (e.g. What → Where should
  // hold the small mask until you actually enter Where).
  transitionOut?: number;
  // Fraction of section (0–1) to hold rigStart before beginning the lerp to
  // rigEnd. Used in What to delay the mask rotation until ~the title divider
  // is reached. 0 = lerp begins immediately.
  holdStart?: number;
}

// Canvas is now full-viewport. The mask sits in the right portion of the
// scene via stageGroup.position.x so the visible composition matches the
// original right-70% framing while particles span the full page width.
// At 16:9 a world-x of ~1.23 places the mask near viewport-65vw (the old
// canvas centre); pos.x of 0 places it at viewport-50vw.
const HERO_RIG: Rig = {
  pos: { x: 1.23, y: 0.5, z: 0 },
  scale: 1,
  yawBias: 0,
  pitchBias: -0.5,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 9.0,
  accentBeamPos: { x: -3.5, y: -3, z: 2.5 },
  accentBeamTarget: { x: 1.5, y: 1.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.8,
  pointerYaw: 0.6,
  pointerPitch: 0.4,
  parallaxStrength: 1,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// Mask shrinks and centres horizontally (pos.x = 0 → viewport centre) so it
// sits behind the quote.
//
// As the user scrolls *through* Who, the accent beam sweeps from the lower
// left (continuing Hero's direction) over to the upper right and ramps in
// intensity, so the lighting feels dynamic instead of static. The mask is
// kept readable via a healthier exposure + lighter fog than the prior pass.
//
// Knobs you'll likely want to tinker with:
//   * exposure          — overall mask brightness (renderer.toneMappingExposure)
//   * fogDensity        — atmospheric falloff
//   * accentBeamPos     — light direction (the beam points at target 1.5,1.8,-0.5)
//   * accentBeamIntensity — how strongly the orange key light hits the mask
const WHO_RIG_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: -0.35,
  exposure: 0.6,
  fogDensity: 0.05,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: -2.5, z: 2.5 },
  accentBeamTarget: { x: 0, y: 0.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0.4,
  pointerPitch: 0.3,
  parallaxStrength: 1,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

const WHO_RIG_END: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 0.85,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 26,
  accentBeamPos: { x: 4, y: -1, z: 2.5 },
  accentBeamTarget: { x: 0, y: 0.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0.4,
  pointerPitch: 0.3,
  parallaxStrength: 1,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// In What: small mask, centred, with a subtle downward gaze. Lit much like
// Hero (so it's properly visible, not a red silhouette) but with a slight
// uplight from below + a low-key accent beam orbiting opposite to the mask's
// 360° spin. Rotation starts at holdStart on the section so it kicks in after
// the title divider rolls past.
//
// Knobs to tinker with:
//   * accentBeamIntensity — push higher for more orange wash, lower for none
//   * accentBeamPos.y     — push more negative to exaggerate the uplight
//   * ambientIntensity    — overall fill; lower for darker / contrastier mask
//   * pitchBias           — positive = look down, negative = look up
const WHAT_RIG_START: Rig = {
  pos: { x: 0, y: 0.4, z: 0 },
  scale: 0.5,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.4, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

const WHAT_RIG_END: Rig = {
  pos: { x: 0, y: 0.4, z: 0 },
  scale: 0.5,
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.4, z: 0 },
  beamYawOffset: -Math.PI * 2,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// How: a side profile peeking in from the right edge. yawBias 3π/2 turns
// the face toward -X (looking left, into the section content). pos.x is
// far enough right that the back of the head and ears sit off-screen and
// only the front of the profile (jaw → nose) slips into view.
//
// Through the section the mask holds still — only the accent beam moves,
// sweeping top → bottom as the user scrolls. accentBeamPos.y goes from
// +5 (above the mask) at the section start down to -4 (below) at the end.
//
// keyIntensity is zeroed here so there's no static white directional
// light fighting the moving accent — you only see ONE light source.
const HOW_RIG_START: Rig = {
  pos: { x: 4, y: 0.5, z: -0.2 },
  scale: 1.2,
  yawBias: (2.9 * Math.PI) / 2,
  pitchBias: 0.1,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 14,
  accentBeamPos: { x: -5, y: 5, z: 3 },
  accentBeamTarget: { x: 4.5, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.55,
  hemiIntensity: 0.45,
  keyIntensity: 0,
};

const HOW_RIG_END: Rig = {
  pos: { x: 4, y: 0.5, z: -0.2 },
  scale: 1.2,
  yawBias: (2.9 * Math.PI) / 2,
  pitchBias: -0.45,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 14,
  accentBeamPos: { x: -5, y: -4, z: 3 },
  accentBeamTarget: { x: 4.5, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.55,
  hemiIntensity: 0.45,
  keyIntensity: 0,
};

// Contact: mask sits to the right of the centered text block, face turned
// back toward camera (forward-facing). yawBias is 2π — visually identical
// to 0, but numerically just +π/2 from How_END's 3π/2, so the transition
// from How → Contact is a clean 90° CCW rotation (mask rotates from left
// profile back to forward) instead of unwinding the full 3π/2 backward.
const CONTACT_RIG: Rig = {
  pos: { x: 2, y: 0.3, z: 0 },
  scale: 0.8,
  // ~45° turn toward -X (the text is on the LEFT of the viewport, so the
  // mask should turn its face toward the left to address it). 2π - π/4 is
  // visually 45° CCW from forward and still keeps the lerp path from
  // How_END (3π/2) clean — just +π/4 numerically.
  yawBias: Math.PI * 2 - Math.PI / 4,
  pitchBias: -0,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 9,
  accentBeamPos: { x: -3, y: 0, z: 3 },
  accentBeamTarget: { x: 2, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// Where: animation pause. Position/rotation/scale and lighting all match
// HOW_RIG_START so the mask is "set" in profile pose with the light already
// at the top, ready to start the sweep — just invisible via alpha. When
// alpha fades in toward How, there's no sliding, rotation, or lighting
// change — the mask simply materialises where it lives in How.
const WHERE_RIG: Rig = {
  pos: { x: 4, y: 0.5, z: -0.2 },
  scale: 1.2,
  yawBias: (3 * Math.PI) / 2,
  pitchBias: 0.1,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 0,
  accentBeamIntensity: 0,
  accentBeamPos: { x: -5, y: 5, z: 3 },
  accentBeamTarget: { x: 4.5, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.55,
  hemiIntensity: 0.45,
  keyIntensity: 0,
};

const SECTION_RIGS: Record<SectionKey, SectionRig> = {
  hero: { start: HERO_RIG },
  who: { start: WHO_RIG_START, end: WHO_RIG_END },
  // What holds its small mask + uplight all the way until just before Where —
  // the transition out is tight (5% of section) so the scale-back lands at
  // the start of Where, not in the middle of the project list. holdStart
  // delays the start of the spin until ~the title divider is past.
  what: {
    start: WHAT_RIG_START,
    end: WHAT_RIG_END,
    transitionOut: 0.05,
    holdStart: 0.12,
  },
  // Where stays paused through most of its scroll length; the mask only
  // re-enters in the last 20% as it lerps toward How — emerging from
  // center-stage, rotating to profile, and sliding to the right edge.
  where: { start: WHERE_RIG, transitionOut: 0.2 },
  // How holds the profile still — only the light position lerps from top
  // (rigStart) to bottom (rigEnd) as you scroll. transitionOut: 0.15 gives
  // the 90° rotation from profile → forward-facing enough room to feel
  // natural rather than snap.
  how: { start: HOW_RIG_START, end: HOW_RIG_END, transitionOut: 0.15 },
  contact: { start: CONTACT_RIG },
};

function cloneRig(r: Rig): Rig {
  return {
    pos: { ...r.pos },
    scale: r.scale,
    yawBias: r.yawBias,
    pitchBias: r.pitchBias,
    exposure: r.exposure,
    fogDensity: r.fogDensity,
    alpha: r.alpha,
    accentBeamIntensity: r.accentBeamIntensity,
    accentBeamPos: { ...r.accentBeamPos },
    accentBeamTarget: { ...r.accentBeamTarget },
    beamYawOffset: r.beamYawOffset,
    particleAlpha: r.particleAlpha,
    pointerYaw: r.pointerYaw,
    pointerPitch: r.pointerPitch,
    parallaxStrength: r.parallaxStrength,
    ambientIntensity: r.ambientIntensity,
    hemiIntensity: r.hemiIntensity,
    keyIntensity: r.keyIntensity,
  };
}

function lerpRig(a: Rig, b: Rig, t: number): Rig {
  const m = (x: number, y: number): number => x + (y - x) * t;
  return {
    pos: { x: m(a.pos.x, b.pos.x), y: m(a.pos.y, b.pos.y), z: m(a.pos.z, b.pos.z) },
    scale: m(a.scale, b.scale),
    yawBias: m(a.yawBias, b.yawBias),
    pitchBias: m(a.pitchBias, b.pitchBias),
    exposure: m(a.exposure, b.exposure),
    fogDensity: m(a.fogDensity, b.fogDensity),
    alpha: m(a.alpha, b.alpha),
    accentBeamIntensity: m(a.accentBeamIntensity, b.accentBeamIntensity),
    accentBeamPos: {
      x: m(a.accentBeamPos.x, b.accentBeamPos.x),
      y: m(a.accentBeamPos.y, b.accentBeamPos.y),
      z: m(a.accentBeamPos.z, b.accentBeamPos.z),
    },
    accentBeamTarget: {
      x: m(a.accentBeamTarget.x, b.accentBeamTarget.x),
      y: m(a.accentBeamTarget.y, b.accentBeamTarget.y),
      z: m(a.accentBeamTarget.z, b.accentBeamTarget.z),
    },
    beamYawOffset: m(a.beamYawOffset, b.beamYawOffset),
    particleAlpha: m(a.particleAlpha, b.particleAlpha),
    pointerYaw: m(a.pointerYaw, b.pointerYaw),
    pointerPitch: m(a.pointerPitch, b.pointerPitch),
    parallaxStrength: m(a.parallaxStrength, b.parallaxStrength),
    ambientIntensity: m(a.ambientIntensity, b.ambientIntensity),
    hemiIntensity: m(a.hemiIntensity, b.hemiIntensity),
    keyIntensity: m(a.keyIntensity, b.keyIntensity),
  };
}

function resolveSectionRig(key: SectionKey, p: number): Rig {
  const r = SECTION_RIGS[key];
  if (!r.end) return r.start;
  const hold = r.holdStart ?? 0;
  // Hold rigStart for the first `hold` fraction, then remap (hold..1) → (0..1).
  const adjustedP = hold > 0 && p < hold ? 0 : (p - hold) / Math.max(0.0001, 1 - hold);
  return lerpRig(r.start, r.end, Math.max(0, Math.min(1, adjustedP)));
}

export function init(mount: HTMLElement): HeroSceneHandle {
  const scene = new THREE.Scene();
  scene.background = null;
  const fog = new THREE.FogExp2(0x0a0a0a, HERO_RIG.fogDensity);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.8, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  const PARTICLES = 380;
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

  // Section element refs (resolved lazily — they may not exist when this script
  // first runs on a fresh page; getElementById is cheap to call each frame and
  // returns null gracefully).
  function getSectionEls(): (HTMLElement | null)[] {
    return SECTION_KEYS.map((k) => document.getElementById(k));
  }

  function computeTargetRig(): Rig {
    const sections = getSectionEls();
    const probeY = window.scrollY + window.innerHeight * 0.5;

    // Find the section the probe falls into (last section whose top is <= probe).
    let i = 0;
    for (let j = sections.length - 1; j >= 0; j--) {
      const el = sections[j];
      if (el && probeY >= el.offsetTop) {
        i = j;
        break;
      }
    }
    const ni = Math.min(i + 1, sections.length - 1);
    const curEl = sections[i];
    const nextEl = sections[ni];
    if (!curEl) return HERO_RIG;

    const top = curEl.offsetTop;
    const bottom =
      ni === i || !nextEl ? top + curEl.clientHeight : nextEl.offsetTop;
    const rawP = (probeY - top) / Math.max(1, bottom - top);
    const p = Math.max(0, Math.min(1, rawP));

    // Within-section progress (drives rigStart → rigEnd if both defined).
    const rigA = resolveSectionRig(SECTION_KEYS[i], p);

    // Between-section blend: hold the current rig steady through most of the
    // section, then ease toward the next section's rig in its final portion.
    // Without this, even at the top of the page (probe = mid-hero) we'd be
    // 50% blended into Who, pulling the hero pose visibly off.
    const tz = SECTION_RIGS[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
    const blendStart = 1 - tz;
    const rawBlend = p < blendStart ? 0 : (p - blendStart) / tz;
    const eased = rawBlend * rawBlend * (3 - 2 * rawBlend);

    const rigB = resolveSectionRig(SECTION_KEYS[ni], 0);
    return lerpRig(rigA, rigB, eased);
  }

  // Rig state — currentRig lerps toward target each frame for buttery transitions.
  let currentRig = cloneRig(HERO_RIG);
  const RIG_LERP = 0.12;

  // animate
  const clock = new THREE.Clock();
  let raf = 0;
  function animate(): void {
    const dt = clock.getDelta();

    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

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
      // Mask rotation = pointer parallax * per-rig sensitivity + rig bias.
      modelGroup.rotation.y = pointer.x * currentRig.pointerYaw + currentRig.yawBias;
      modelGroup.rotation.x = pointer.y * currentRig.pointerPitch + currentRig.pitchBias;
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

    // Anchor the canvas to the page once the mask has parked at Contact.
    // Up to that point the canvas stays viewport-fixed (so the rig system
    // can place the mask anywhere on screen). Activation is offset past
    // Contact's top by ANCHOR_DELAY so the mask "lands" beside the title
    // text rather than above it; once anchored, the mask scrolls up as a
    // unit with the page through the rest of Contact.
    const contactEl = document.getElementById('contact');
    if (contactEl) {
      const ANCHOR_DELAY = window.innerHeight * 0.5;
      const anchor = contactEl.offsetTop - window.innerHeight / 2 + ANCHOR_DELAY;
      const overscroll = Math.max(0, window.scrollY - anchor);
      // Drive a CSS variable rather than inline transform — the stage element's
      // entry animation uses `both` fill, which would otherwise hold
      // `transform: none` over our inline write. See index.astro keyframes.
      mount.style.setProperty('--anchor-y', `${-overscroll}px`);
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
  };
}
