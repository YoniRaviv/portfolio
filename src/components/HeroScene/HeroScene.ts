// Hero scene: persistent full-viewport canvas that travels through every
// section via a rig system. Configs live in ./scene/rigs/<section>.ts —
// this file owns the three.js setup and the per-frame animation loop only.
// Tree-shaken Three.js + GLTFLoader + MeshoptDecoder. Exports init(mount)
// so the island can hydrate lazily and call us once the mount exists.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

import type { SectionKey, SectionRig } from './scene/types';
import { MODEL_URL, TARGET_SIZE, SWORD_URL, SWORD_TARGET_SIZE } from './scene/types';
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
  const accentBeam = new THREE.SpotLight(ACCENT, HERO_RIG.accentBeamIntensity, 16, Math.PI / 2, 0.55, 1.2);
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

  // Sword-only spot. Uses Three.js render layers to scope the light to
  // sword meshes — sword meshes opt into SWORD_LIGHT_LAYER below, this
  // light is set to ONLY that layer. Everything else in the scene (mask,
  // particles, fog) is unaffected by this spot no matter how we tune it.
  // -------- SWORD SPOT TUNING --------
  // Warm key from front-right. Tightened from π/2.2 to π/3 so the cone
  // hugs the blade silhouette instead of bleeding orange over the
  // whole sword — that lets the cool back-rim (below) own the left
  // edge for cinematic separation. Intensity dropped from 60 to 38
  // to match the tighter cone.
  // -----------------------------------
  const SWORD_LIGHT_LAYER = 2;
  const swordSpot = new THREE.SpotLight(ACCENT, 38, 16, Math.PI / 3, 0.55, 1.5);
  swordSpot.position.set(3, 4, 5);
  swordSpot.target.position.set(0, 0, 0);
  swordSpot.layers.set(SWORD_LIGHT_LAYER);
  scene.add(swordSpot);
  scene.add(swordSpot.target);

  // Cool back-rim from behind-left. Sells the silhouette against the
  // dark page bg by tracing a cyan-tinted edge down the left side of
  // the blade and tsuka. Layer-scoped to the sword only.
  const swordRim = new THREE.SpotLight(0x88c5ff, 26, 14, Math.PI / 3.5, 0.7, 1.6);
  swordRim.position.set(-3.5, 2, -3);
  swordRim.target.position.set(0, 0, 0);
  swordRim.layers.set(SWORD_LIGHT_LAYER);
  scene.add(swordRim);
  scene.add(swordRim.target);

  // Top kicker — subtle warm catch on the tsuka cap + pommel from
  // directly overhead. Reads as a thin highlight along the upper
  // hilt detail; gives the blade a sense of presence under stage
  // light. Tight and low-intensity so it doesn't compete with the
  // ACCENT key.
  const swordKicker = new THREE.SpotLight(0xfff0d0, 14, 10, Math.PI / 4, 0.6, 1.8);
  swordKicker.position.set(0.3, 5, 1.5);
  swordKicker.target.position.set(0, 0.5, 0);
  swordKicker.layers.set(SWORD_LIGHT_LAYER);
  scene.add(swordKicker);
  scene.add(swordKicker.target);

  // ===== Contact landing dramatic lights — gated by landingProgress =====
  // These three lights all start at intensity 0 and ramp up via
  // landingProgress in animate(). They run continuous time-based
  // animations so the final scene reads as "alive" — not a still pose.
  // All scoped to SWORD_LIGHT_LAYER so the mask + particles + page
  // backdrop never see them. Initial position values are placeholders;
  // animate() rewrites them every frame once landed.
  //
  // 1. Impact glow — point light at the tip of the embedded sword.
  //    Pulses warm orange with a heartbeat period, sells the "blade
  //    buried in glowing ground" read.
  const impactGlow = new THREE.PointLight(ACCENT, 0, 5, 1.6);
  impactGlow.layers.set(SWORD_LIGHT_LAYER);
  scene.add(impactGlow);

  // 2. Orbiting accent spot — slow circle around the embedded sword,
  //    catching edge highlights on the blade and tsuka as it sweeps.
  //    Same colour family as the key, so the wash blends instead of
  //    fighting the warm tone.
  const swordOrbiter = new THREE.SpotLight(ACCENT, 0, 14, Math.PI / 4.5, 0.6, 1.5);
  swordOrbiter.target.position.set(0, -0.8, 0);
  swordOrbiter.layers.set(SWORD_LIGHT_LAYER);
  scene.add(swordOrbiter);
  scene.add(swordOrbiter.target);

  // 3. Cool counter-pulse — opposite-phase cool point light on the
  //    far side. Breathes inversely to the impact glow so the
  //    chiaroscuro shifts back and forth across the blade.
  const coolPulse = new THREE.PointLight(0x6fb0ff, 0, 8, 1.6);
  coolPulse.layers.set(SWORD_LIGHT_LAYER);
  scene.add(coolPulse);

  // 4. Theatrical stage spot — the "showpiece" key for the landed
  //    sword. Tight cone pointing straight down from directly above
  //    the blade midpoint, like a stage spotlight cutting through
  //    the dark. Cone tightened (π/7) and penumbra lowered (0.25)
  //    so the beam reads as a focused overhead column rather than a
  //    soft wash. Per-frame pan is small and along X only so the
  //    highlight crawls along the blade edge without the light
  //    drifting off the vertical axis. This is what sells the
  //    cinematic "buried weapon under a spotlight" read.
  const swordStage = new THREE.SpotLight(ACCENT, 0, 16, Math.PI / 7, 0.25, 1.4);
  swordStage.target.position.set(0, -0.8, 0);
  swordStage.layers.set(SWORD_LIGHT_LAYER);
  scene.add(swordStage);
  scene.add(swordStage.target);

  // 5. Warm ground bounce — low fill from below the landing point.
  //    Sells the "the floor is faintly lit by the embedded blade"
  //    read and lifts the lower half of the sword off pure black.
  const swordFloor = new THREE.PointLight(ACCENT, 0, 6, 1.4);
  swordFloor.layers.set(SWORD_LIGHT_LAYER);
  scene.add(swordFloor);

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

  // Separate group for the katana shown in the How section. Lives as a
  // sibling of modelGroup so they share stageGroup transforms (rig pos
  // + scale) but rotate independently — mask yaws/pitches per cursor,
  // sword spins per scroll. In Contact the sword descends out of How and
  // embeds at a landing pose (Z-tilt + offset position) — YXZ order keeps
  // the spin Y-axis independent of the landing Z-tilt.
  const swordGroup = new THREE.Group();
  swordGroup.visible = false;
  swordGroup.rotation.order = 'YXZ';
  root.add(swordGroup);
  // Holds the loaded sword model; we rotate this child for tip-down
  // orientation while swordGroup itself owns the scroll-driven spin.
  const swordPivot = new THREE.Group();
  swordGroup.add(swordPivot);

  // Load the GLB
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let modelLoaded = false;
  let swordLoaded = false;
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
      // Mirror onto <html> so components outside #stage (the HUD's leaders,
      // targets and telemetry — which live in <HeroHud /> inside <section.hero>)
      // can gate their entrance animations on "mask is ready" without needing
      // a JS bridge or a parent-relationship change.
      document.documentElement.setAttribute('data-hero-loaded', 'true');
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

  // Collect sword mesh materials so animate() can drive per-frame opacity
  // for a clean fade at the How section boundaries — group.visible is a
  // hard toggle, which would cause a one-frame pop. Setting material
  // transparent + opacity gives a real cross-fade with the mask.
  const swordMaterials: THREE.Material[] = [];
  loader.load(
    SWORD_URL,
    (gltf) => {
      const sword = gltf.scene;

      const box = new THREE.Box3().setFromObject(sword);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const s = SWORD_TARGET_SIZE / maxAxis;
      sword.position.sub(center).multiplyScalar(s);
      sword.scale.setScalar(s);
      sword.rotation.set(0, 0, 0);

      sword.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          // Opt this mesh into the sword spot's layer (still on layer 0
          // for the camera, so it renders as normal — but now ALSO on
          // layer 2 so the dedicated sword spot can light it).
          mesh.layers.enable(SWORD_LIGHT_LAYER);
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            mat.transparent = true;
            mat.depthWrite = true;
            // BASELINE: no overrides — the GLB's authored materials are
            // used as-is (lambert5 = thermal stripe with baked red
            // emissive; lambert2 = pure-black metallic for blade body
            // and hilt wraps). transparent + depthWrite above are kept
            // because the per-frame swordOpacity ramp needs them.
            swordMaterials.push(mat);
          }
        }
      });

      swordPivot.add(sword);
      swordLoaded = true;
    },
    undefined,
    (err) => {
      console.error('Failed to load katana model', err);
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

  // Sword spin: rotates around its own length (Y) axis as you scroll —
  // like the Mina-Massoud style where the handle sweeps left→right→left
  // while the blade stays roughly vertical. The slight x=2.9 tilt on the
  // pivot gives the blade visible arc; without the tilt the blade would
  // barely move (just narrow/widen with no side sweep).
  const SWORD_REST_ANGLE = 0;
  const SWORD_REVOLUTIONS = 1.5;
  // Persistent spin angle for the sword. While inside How (landingProgress=0)
  // this is re-derived from howProgress every frame. Once landing engages we
  // *advance* it with a decaying time-based delta so the blade keeps a slow
  // residual spin during the fall — never unwinds, never snaps to a stop.
  let swordYawState = 0;
  // Grand-finale landing pose — sword descends out of How and embeds in the
  // bottom social strip (desktop) / top of the GitHub block (mobile). Tilt
  // is a Z rotation (hilt to upper-right, tip into the surface).
  const SWORD_LANDING_POS_DESKTOP = { x: 0, y: -1.4, z: 0.5 };
  const SWORD_LANDING_POS_MOBILE = { x: 0.3, y: -0.3, z: 0.5 };
  const SWORD_LANDING_TILT_Z = -0.62;

  // Sword rest pose (orientation before the per-frame scroll spin and
  // landing tilt are layered on). Two poses, lerped by landingProgress:
  //   - SWORD_REST_HOW : helicopter-friendly tilt for the How section.
  //   - SWORD_REST_LAND: original Contact landing pose, kept verbatim
  //                      so the embed visual reads as before.
  // Tune SWORD_REST_HOW freely — only affects How. SWORD_REST_LAND was
  // tuned alongside SWORD_LANDING_* and shouldn't need to change.
  const SWORD_REST_HOW = { x: Math.PI / 2, y: 70 * Math.PI / 180, z: 0 };
  const SWORD_REST_LAND = { x: 2.7, y: -0.4, z: -Math.PI / 2 };
  // Quaternions for the two rest poses. We slerp between them rather
  // than lerping the three Euler axes independently — independent-axis
  // lerping tumbles the blade through a near-horizontal intermediate
  // (the X axis hits ~2.1 rad while Z is mid-way to -π/2, so the sword
  // pitches into a sideways pose before "straightening" into the
  // landing). Slerp takes the shortest great-arc rotation between the
  // two orientations, so the sword swings cleanly from the How
  // helicopter pose to the embed pose without an awkward midpoint.
  const SWORD_REST_HOW_Q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(SWORD_REST_HOW.x, SWORD_REST_HOW.y, SWORD_REST_HOW.z, 'XYZ')
  );
  const SWORD_REST_LAND_Q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(SWORD_REST_LAND.x, SWORD_REST_LAND.y, SWORD_REST_LAND.z, 'XYZ')
  );
  const swordRestQ = new THREE.Quaternion();

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
    // Contact. Tracking continues uncapped on both breakpoints — once the
    // sword has landed it should scroll up and exit with the rest of the
    // page rather than stay pinned in the viewport as the visitor reaches
    // the footer. (The mask, which the original cap was designed to keep
    // from leaking through the social grid, is hidden throughout Contact
    // because the sword is at full opacity here.)
    let overscroll = 0;
    const contactElForAnchor = document.getElementById('contact');
    if (contactElForAnchor) {
      const ANCHOR_DELAY = window.innerHeight * 0.5;
      const anchor = contactElForAnchor.offsetTop - window.innerHeight / 1.5 + ANCHOR_DELAY;
      overscroll = Math.max(0, window.scrollY - anchor);
    }

    // Drive target rig from scroll position and smoothly lerp current toward it.
    const target = computeTargetRig();
    currentRig = lerpRig(currentRig, target, RIG_LERP);

    // Apply rig position + scale (stageGroup).
    stageGroup.position.set(currentRig.pos.x, currentRig.pos.y, currentRig.pos.z);
    stageGroup.scale.setScalar(currentRig.scale);

    // How section: swap mask for the katana. The sword cross-fades with
    // the mask at the section boundaries (material opacity ramp) so the
    // swap never reads as a one-frame pop. Within How, the sword spins
    // around its (now-vertical) long axis driven by scroll progress, plus
    // a constant slow rotation so the blade keeps catching light when the
    // visitor stops scrolling. A subtle hover bob + spin-axis wobble
    // keep the motion from feeling mechanical.
    // Sword visibility window: fade-IN happens *inside* Where (60%-80% of
    // the section) so the mask→sword swap completes BEFORE the user reaches
    // How. By the time the probe crosses into How, the model is already
    // the sword. The Where rig holds What_END's pose through this window
    // (no scale growth during the cross-fade), then morphs to HOW_RIG_START
    // during Where's transitionOut zone (last 20%) while only the sword
    // is visible. Fade-OUT still happens in the last 6% of How.
    const whereElForSword = document.getElementById('where');
    const howEl = document.getElementById('how');
    const contactElForSword = document.getElementById('contact');
    const swordProbe = window.scrollY + window.innerHeight / 2;
    let howProgress = 0;
    let swordOpacity = 0;
    if (howEl) {
      const top = howEl.offsetTop;
      const bottom = contactElForSword ? contactElForSword.offsetTop : top + howEl.clientHeight;
      howProgress = Math.max(0, Math.min(1, (swordProbe - top) / Math.max(1, bottom - top)));
    }
    if (whereElForSword && howEl) {
      const whereTop = whereElForSword.offsetTop;
      const whereBottom = howEl.offsetTop;
      if (swordProbe >= whereTop && swordProbe < whereBottom) {
        const wp = (swordProbe - whereTop) / Math.max(1, whereBottom - whereTop);
        const FADE_IN_START = 0.6;
        const FADE_IN_END = 0.8;
        if (wp >= FADE_IN_END) {
          swordOpacity = 1;
        } else if (wp > FADE_IN_START) {
          swordOpacity = (wp - FADE_IN_START) / (FADE_IN_END - FADE_IN_START);
        }
      }
    }
    // Grand finale: sword stays at full opacity through How AND all of Contact.
    // The old FADE_OUT in the last 6% of How is gone — the sword never fades
    // away; it descends out of How and embeds at the landing pose in Contact.
    if (howEl) {
      if (swordProbe >= howEl.offsetTop) {
        swordOpacity = 1;
      }
    }
    swordOpacity = Math.max(0, Math.min(1, swordOpacity));

    // Landing progress drives the descent + embed: 0 while still spinning in
    // How, 1 once the sword is fully embedded just past the Contact boundary.
    // Starts in the last 30% of How (gives the spin time to slow and the
    // position room to lerp without snapping at the section boundary).
    let landingProgress = 0;
    if (howEl && contactElForSword) {
      const howTop = howEl.offsetTop;
      const contactTop = contactElForSword.offsetTop;
      const startZone = howTop + (contactTop - howTop) * 0.7;
      const endZone = contactTop + window.innerHeight * 0.15;
      const raw = (swordProbe - startZone) / Math.max(1, endZone - startZone);
      landingProgress = Math.max(0, Math.min(1, raw));
    }
    if (swordLoaded) {
      swordGroup.visible = swordOpacity > 0;
      if (swordGroup.visible) {
        for (const mat of swordMaterials) {
          mat.opacity = swordOpacity;
        }
      }
    }
    // Mask hides only past the cross-fade midpoint so both are visible
    // briefly during the dissolve — no one-frame pop at the boundary.
    if (modelLoaded) {
      modelGroup.visible = swordOpacity < 0.5;
    }
    if (swordLoaded && swordGroup.visible) {
      // Compute landing ease once — drives both the rest-pose lerp
      // below and the descent tilt/position further down.
      const lp = landingProgress;
      const landEase = lp * lp * (3 - 2 * lp);

      // Rest pose: slerp from SWORD_REST_HOW (helicopter-friendly tilt)
      // toward SWORD_REST_LAND (original Contact pose) as the sword
      // embeds. landingProgress=0 holds How exactly; landingProgress=1
      // reaches the embedded pose verbatim. The scroll-driven Y spin
      // and landing Z-tilt below are applied on swordGroup, separate
      // from this rest pose.
      swordRestQ.copy(SWORD_REST_HOW_Q).slerp(SWORD_REST_LAND_Q, landEase);
      swordPivot.quaternion.copy(swordRestQ);

      // Spin state: in How (landingProgress=0) the yaw is re-derived from
      // scroll every frame. Once landing engages we advance the SAME state
      // with a decaying time delta — never recompute from scroll while
      // landing or the blade would visibly unwind. settleEase fades the
      // residual spin smoothly to a stop as the sword embeds.
      if (landingProgress <= 0) {
        swordYawState = SWORD_REST_ANGLE + howProgress * Math.PI * 2 * SWORD_REVOLUTIONS;
      } else if (landingProgress < 1) {
        const settleEase = 1 - landingProgress;
        swordYawState += dt * 0.5 * settleEase;
      }

      // Landing tilt + position interpolate from 0 (How centre) to the
      // breakpoint-specific landing pose. smoothstep (via landEase
      // above) gives the descent an ease-in-ease-out feel.
      const landingPos = state.isMobile ? SWORD_LANDING_POS_MOBILE : SWORD_LANDING_POS_DESKTOP;
      swordGroup.rotation.set(0, swordYawState, SWORD_LANDING_TILT_Z * landEase);
      swordGroup.position.set(
        landingPos.x * landEase,
        landingPos.y * landEase,
        landingPos.z * landEase
      );

      // === Contact landing dramatic light show ===
      // Three sword-scoped lights animate during landing + Contact to
      // sell the "wow" finish. All ramp via landEase so they fade in
      // smoothly as the sword embeds, and animate continuously off
      // clock.elapsedTime so the final scene never reads as a still.
      // - impactGlow throbs at the tip (heartbeat ~ 1.4 rad/s = ~80 bpm)
      // - swordOrbiter spotlights the blade from a slow circle
      // - coolPulse breathes opposite-phase to impactGlow on the back
      const t = clock.elapsedTime;
      // Tip world position: extend a bit past the landing position
      // along the negative Y, then nudged by the Z-tilt direction
      // (sword leans hilt-right tip-left, so tip is left-down of the
      // group origin). Tuned visually for each breakpoint.
      const tipX = state.isMobile ? landingPos.x - 0.4 : landingPos.x - 0.8;
      const tipY = state.isMobile ? landingPos.y - 1.4 : landingPos.y - 1.6;
      const tipZ = landingPos.z;
      impactGlow.position.set(tipX, tipY, tipZ);
      // Heartbeat: 6 baseline + ±3 sin pulse. landEase gates the whole
      // thing so it stays dark while the sword is still spinning in How.
      impactGlow.intensity = landEase * (6 + 3 * Math.sin(t * 1.4));

      // Orbiting accent spot circles the embedded sword. Slightly
      // elliptical orbit (different cos/sin multipliers) + bobbed Y
      // gives the sweep an organic feel rather than a flat circle.
      const orbitR = 3.6;
      swordOrbiter.position.set(
        landingPos.x + orbitR * Math.cos(t * 0.42),
        landingPos.y + 1.8 + 1.0 * Math.sin(t * 0.31),
        landingPos.z + 2.0 + (orbitR * 0.8) * Math.sin(t * 0.42)
      );
      swordOrbiter.target.position.set(landingPos.x, landingPos.y - 0.6, landingPos.z);
      swordOrbiter.intensity = landEase * 34;

      // Cool counter-pulse — opposite side and opposite phase. Sits
      // on the back-left so it edge-lights the blade silhouette as
      // the orbiter sweeps off the front. Low intensity so it tints,
      // doesn't dominate.
      coolPulse.position.set(
        landingPos.x - 2.6,
        landingPos.y + 0.4,
        landingPos.z - 1.8
      );
      coolPulse.intensity = landEase * (5 + 3 * Math.sin(t * 1.4 + Math.PI));

      // Theatrical stage spot — pointing straight down from directly
      // above the blade. Position is locked to landingPos.x/z (no Z
      // offset, no X pan on the light itself) so the source reads as
      // a fixed overhead column. The target pans gently across the
      // blade midline, which tilts the cone a few degrees off-vertical
      // and makes the hot spot crawl along the blade without the
      // beam ever drifting off the top of the scene.
      const panX = 0.6 * Math.sin(t * 0.23);
      swordStage.position.set(
        landingPos.x,
        landingPos.y + 5.5,
        landingPos.z
      );
      swordStage.target.position.set(
        landingPos.x + panX,
        landingPos.y - 0.6,
        landingPos.z
      );
      // Punchy baseline (78) with a slow breath. Bumped from 60 to
      // compensate for the tighter cone (π/7) — same delivered
      // illuminance on the blade, more dramatic falloff at the edges.
      swordStage.intensity = landEase * (78 + 12 * Math.sin(t * 0.4));

      // Warm ground bounce just below the embed point. Low intensity
      // (constant) — it's a fill, not a feature.
      swordFloor.position.set(
        landingPos.x,
        landingPos.y - 2.4,
        landingPos.z + 0.3
      );
      swordFloor.intensity = landEase * 5;

      // Breath on the baseline lights so the key + back-rim also move,
      // and lift them noticeably once landed so the whole sword reads
      // brighter (not just the new orbital + stage).
      swordSpot.intensity = 38 + landEase * (16 + 6 * Math.sin(t * 0.5));
      swordRim.intensity = 26 + landEase * (12 + 5 * Math.sin(t * 0.5 + 1.7));
    } else {
      swordGroup.rotation.set(0, 0, 0);
      swordGroup.position.set(0, 0, 0);
      // Mute the landing dramatic lights when the sword isn't visible
      // so they don't keep affecting anything during early sections.
      impactGlow.intensity = 0;
      swordOrbiter.intensity = 0;
      coolPulse.intensity = 0;
      swordStage.intensity = 0;
      swordFloor.intensity = 0;
    }

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

    // Live (time-based) beam motion in How. The katana spins around its
    // vertical axis; this block orbits the accent beam *horizontally*
    // around the spin axis at a different period — the relative motion
    // between spin and beam means the blade catches highlights at a
    // shifting angle every frame, giving the constant rotational sparkle
    // a katana should have. Intensity also pulses on a third period for
    // extra unpredictability. swordOpacity gates the orbit so it ramps
    // in/out with the cross-fade — no jolt when the sword swaps with
    // the mask.
    if (swordOpacity > 0) {
      const t = clock.elapsedTime;
      // Orbit centre follows the sword: rig pos in How, sliding to the
      // landing pose in Contact. Without the landing offset the beam stays
      // anchored to the (now-hidden) mask anchor while the sword is
      // physically several units away — the embedded blade would never
      // catch the orbit's highlight pass.
      const lp = landingProgress;
      const landEase = lp * lp * (3 - 2 * lp);
      const landingPos = state.isMobile ? SWORD_LANDING_POS_MOBILE : SWORD_LANDING_POS_DESKTOP;
      const centreX = currentRig.pos.x + landingPos.x * landEase;
      const centreY = currentRig.pos.y + landingPos.y * landEase;
      const centreZ = currentRig.pos.z + landingPos.z * landEase;
      // Horizontal orbit at blade midpoint height — radius wider than
      // the sword so the beam sweeps across the visible side of the
      // blade rather than from inside it.
      const orbitR = 4.5;
      const orbitX = centreX + orbitR * Math.cos(t * 0.55);
      const orbitZ = centreZ + orbitR * Math.sin(t * 0.55);
      // Slow vertical bob so the beam height also varies — accents the
      // upper half of the blade on one period, the lower half on another.
      const orbitY = centreY + 1.8 * Math.sin(t * 0.32);
      accentBeam.position.x = accentBeam.position.x * (1 - swordOpacity) + orbitX * swordOpacity;
      accentBeam.position.y = accentBeam.position.y * (1 - swordOpacity) + orbitY * swordOpacity;
      accentBeam.position.z = accentBeam.position.z * (1 - swordOpacity) + orbitZ * swordOpacity;
      // Beam target also follows the sword so the cone is aimed at the
      // blade in Contact, not at the empty rig anchor.
      accentBeam.target.position.x = centreX;
      accentBeam.target.position.y = centreY;
      accentBeam.target.position.z = centreZ;
      // Beam intensity flickers between 24 and 38 — punchier than the
      // mask sections so the blade highlights pop.
      const liveIntensity = 31 + 7 * Math.sin(t * 0.71);
      accentBeam.intensity = accentBeam.intensity * (1 - swordOpacity) + liveIntensity * swordOpacity;
    }

    accentBeam.target.updateMatrixWorld();
    particlesMat.opacity = currentRig.particleAlpha;

    // Sakura-mode particles in Contact: petals fall *diagonally* (down + to
    // screen-left) instead of the default upward drift, and the dots get a
    // little larger so they read as leaves rather than embers. Blend factor
    // reuses liveLightFactor — same Contact smoothstep that drives the
    // beam-orbit lighting, so particle mode and lighting come up together.
    const sakuraFactor = liveLightFactor;
    particlesMat.size = 0.04 + 0.03 * sakuraFactor;

    // Particles tick. Per-particle velocity has the same magnitude variation
    // (((i * 17) % 5) * 0.2 + 0.3) in both modes — only the direction blends.
    const ppos = pGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      const speed = ((i * 17) % 5) * 0.2 + 0.3;
      const upVy = dt * 0.12 * speed;
      // Falling petals: a bit faster than the upward drift and with a
      // horizontal component so they slide across screen as they fall.
      const downVy = -dt * 0.18 * speed;
      const drift = ((i * 11) % 5) * 0.2 + 0.3;
      const downVx = -dt * 0.07 * drift;

      ppos[i * 3] += downVx * sakuraFactor;
      ppos[i * 3 + 1] += upVy * (1 - sakuraFactor) + downVy * sakuraFactor;

      // Wrap on both edges of the falling path so the stream stays full
      // regardless of which direction is active.
      if (ppos[i * 3 + 1] > 5) ppos[i * 3 + 1] = -5;
      else if (ppos[i * 3 + 1] < -5) ppos[i * 3 + 1] = 5;
      if (ppos[i * 3] < -7) ppos[i * 3] = 7;
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
