// Grinding-spark ember system for the Contact blade hover. A fixed,
// recycled THREE.Points pool with an additive ShaderMaterial: embers shrink
// and cool (white-hot -> orange -> deep red) over a short life while gravity
// arcs them downward. Pure module — the caller adds `points` to the scene and
// drives emit()/update(). No DOM, no camera knowledge.

import * as THREE from 'three';

export interface SparkSystem {
  /** Add this to the scene once. */
  points: THREE.Points;
  /** Spawn `count` embers at `origin`, sprayed around the `dir` axis. */
  emit(origin: THREE.Vector3, dir: THREE.Vector3, count: number): void;
  /** Integrate physics; safe to call every frame even when not emitting. */
  update(dt: number): void;
  /** Free GPU resources. */
  dispose(): void;
}

export function createSparkSystem(opts: { isMobile: boolean }): SparkSystem {
  const MAX = opts.isMobile ? 120 : 300;

  // GPU attributes
  const positions = new Float32Array(MAX * 3);
  const lifeNorm = new Float32Array(MAX); // remaining life 0..1 (shader reads)
  const seeds = new Float32Array(MAX); // per-ember random for flicker

  // CPU-only state
  const velocities = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX); // seconds remaining
  const maxLife = new Float32Array(MAX); // seconds total

  const posAttr = new THREE.BufferAttribute(positions, 3);
  const lifeAttr = new THREE.BufferAttribute(lifeNorm, 1);
  const seedAttr = new THREE.BufferAttribute(seeds, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aLife', lifeAttr);
  geo.setAttribute('aSeed', seedAttr);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: opts.isMobile ? 40 : 60 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true, // let the opaque blade occlude embers flying behind it
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      attribute float aLife;
      attribute float aSeed;
      uniform float uSize;
      uniform float uTime;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float flick = 0.7 + 0.3 * sin(uTime * 55.0 + aSeed * 6.2831);
        float sz = uSize * aLife * flick;
        gl_PointSize = sz * (1.0 / max(0.001, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.0, d);
        vec3 hot = vec3(1.0, 0.95, 0.85);
        vec3 mid = vec3(1.0, 0.5, 0.12);
        vec3 cold = vec3(0.6, 0.06, 0.0);
        vec3 col = mix(cold, mix(mid, hot, smoothstep(0.5, 1.0, vLife)), vLife);
        float alpha = soft * vLife;
        gl_FragColor = vec4(col * (0.6 + 0.4 * vLife), alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  // Positions start at the origin with life 0 (invisible); the pool's bounding
  // sphere never reflects live embers, so disable culling.
  points.frustumCulled = false;

  let writeHead = 0;
  const GRAVITY = 6.5; // scene units / s^2, pulls embers down into the arc
  const DRAG = 0.985; // per-frame velocity damping

  function emit(origin: THREE.Vector3, dir: THREE.Vector3, count: number): void {
    for (let n = 0; n < count; n++) {
      const i = writeHead;
      writeHead = (writeHead + 1) % MAX;

      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      // Tight cone around `dir`. speed = random^2 so most embers are slow and
      // a few are fast "streakers" — the signature grinding spread.
      const spread = 0.5;
      const speed = 1.2 + Math.random() * Math.random() * 4.5;
      velocities[i * 3] = (dir.x + (Math.random() - 0.5) * spread) * speed;
      velocities[i * 3 + 1] = (dir.y + (Math.random() - 0.5) * spread) * speed + 0.5;
      velocities[i * 3 + 2] = (dir.z + (Math.random() - 0.5) * spread) * speed;

      const ml = 0.3 + Math.random() * 0.4;
      maxLife[i] = ml;
      life[i] = ml;
      seeds[i] = Math.random();
      lifeNorm[i] = 1;
    }
    seedAttr.needsUpdate = true;
  }

  function update(dt: number): void {
    material.uniforms.uTime.value += dt;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) {
        if (lifeNorm[i] !== 0) lifeNorm[i] = 0;
        continue;
      }
      life[i] -= dt;
      if (life[i] <= 0) {
        lifeNorm[i] = 0;
        continue;
      }
      velocities[i * 3] *= DRAG;
      velocities[i * 3 + 1] = velocities[i * 3 + 1] * DRAG - GRAVITY * dt;
      velocities[i * 3 + 2] *= DRAG;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      lifeNorm[i] = life[i] / maxLife[i];
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }

  function dispose(): void {
    geo.dispose();
    material.dispose();
  }

  return { points, emit, update, dispose };
}
