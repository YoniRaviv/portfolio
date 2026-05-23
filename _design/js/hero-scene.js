// Cyberpunk hero scene — circuit chip / katana / mask, tweakable.
// Vanilla Three.js, no extras. Exposes window.__heroScene with setObject/setAccent.

(function(){
  const mount = document.getElementById('stage');
  if(!mount || !window.THREE) return;
  const THREE = window.THREE;

  const scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x0a0a0a, 0.025);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.8, 5.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  mount.appendChild(renderer.domElement);

  // ── lights ───────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, .8);
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

  let ACCENT = new THREE.Color('#FF6F59');
  function setAccent(hex){
    ACCENT.set(hex);
    rim.color.copy(ACCENT);
    chipTraceMat.color.copy(ACCENT);
    chipCoreMat.emissive.copy(ACCENT);
    chipCoreMat.color.copy(ACCENT);
    ringMat.color.copy(ACCENT);
    katanaEdgeMat.color.copy(ACCENT);
    katanaEdgeMat.emissive.copy(ACCENT);
    maskWireMat.color.copy(ACCENT);
    particleMat.color.copy(ACCENT);
  }

  // ── group root ───────────────────────────────────────
  const root = new THREE.Group();
  scene.add(root);
  window.__heroRoot = root;

  // ── (A) CYBERPUNK CHIP ───────────────────────────────
  const chip = new THREE.Group();

  // body
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, metalness:.35, roughness:.5
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, .22, 2.6), bodyMat);
  chip.add(body);

  // beveled top inset
  const inset = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, .04, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness:.3, roughness:.6 })
  );
  inset.position.y = .12;
  chip.add(inset);

  // chip core (glowing center square)
  const chipCoreMat = new THREE.MeshStandardMaterial({
    color: 0xff6f59, emissive: 0xff6f59, emissiveIntensity: 1.6, toneMapped:false
  });
  const core = new THREE.Mesh(new THREE.BoxGeometry(.7, .06, .7), chipCoreMat);
  core.position.y = .15;
  chip.add(core);

  // traces (neon lines on top)
  const chipTraceMat = new THREE.LineBasicMaterial({ color: 0xff6f59, linewidth: 1, transparent:true, opacity:.95 });
  const traceGeo = new THREE.BufferGeometry();
  const tracePts = [];
  // Build a circuit-style routing pattern
  function addLine(ax, az, bx, bz){ tracePts.push(ax, .15, az, bx, .15, bz); }
  // square around core
  addLine(-.35,-.35, .35,-.35); addLine(.35,-.35, .35,.35); addLine(.35,.35, -.35,.35); addLine(-.35,.35, -.35,-.35);
  // 8 outward routes (each with a step)
  const routes = [
    [.35,0, 1.15,0, 1.15,.45],
    [.35,.2, .8,.2, .8,1.0],
    [.35,-.2, .8,-.2, .8,-1.0],
    [0,.35, 0,1.0, .6,1.0],
    [0,-.35, 0,-1.0, -.6,-1.0],
    [-.35,0, -1.15,0, -1.15,-.45],
    [-.35,.2, -.8,.2, -.8,1.0],
    [-.35,-.2, -.8,-.2, -.8,-1.0],
  ];
  routes.forEach(r=>{
    for(let i=0; i<r.length-2; i+=2){
      addLine(r[i], r[i+1], r[i+2], r[i+3]);
    }
  });
  traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(tracePts, 3));
  const traces = new THREE.LineSegments(traceGeo, chipTraceMat);
  chip.add(traces);

  // small solder pads at trace endpoints
  const padMat = new THREE.MeshStandardMaterial({
    color: 0xff6f59, emissive: 0xff6f59, emissiveIntensity:1.3, toneMapped:false
  });
  const padGeom = new THREE.CylinderGeometry(.04,.04,.04,8);
  const padPositions = [
    [1.15,.45],[.8,1.0],[.8,-1.0],[.6,1.0],[-.6,-1.0],
    [-1.15,-.45],[-.8,1.0],[-.8,-1.0]
  ];
  padPositions.forEach(p=>{
    const m = new THREE.Mesh(padGeom, padMat);
    m.position.set(p[0], .15, p[1]);
    chip.add(m);
  });

  // pins (edges)
  const pinMat = new THREE.MeshStandardMaterial({ color:0xc8c4b8, metalness:.5, roughness:.4 });
  const pinGeom = new THREE.BoxGeometry(.06, .08, .22);
  const pinCount = 14;
  for(let i=0; i<pinCount; i++){
    const t = (i/(pinCount-1) - .5) * 2.4;
    // top / bottom rows
    [-1.42, 1.42].forEach((z)=>{
      const p = new THREE.Mesh(pinGeom, pinMat);
      p.position.set(t, 0, z); p.rotation.x = 0; chip.add(p);
    });
    [-1.42, 1.42].forEach((x)=>{
      const p = new THREE.Mesh(pinGeom, pinMat);
      p.position.set(x, 0, t); p.rotation.y = Math.PI/2; chip.add(p);
    });
  }

  // holographic ring above chip
  const ringMat = new THREE.MeshBasicMaterial({
    color:0xff6f59, transparent:true, opacity:.55, side:THREE.DoubleSide, toneMapped:false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.58, 80), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = .35;
  chip.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 1.87, 100, 1, 0, Math.PI*1.6),
    new THREE.MeshBasicMaterial({ color:0xff6f59, transparent:true, opacity:.32, side:THREE.DoubleSide, toneMapped:false })
  );
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = .55;
  chip.add(ring2);

  // chip tilt
  chip.rotation.x = 0;
  chip.rotation.z = .08;
  chip.scale.setScalar(1.1);

  // ── (B) KATANA ───────────────────────────────────────
  const katana = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c, metalness:.95, roughness:.18, emissive:0x000000
  });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.16, 3.6, .04), bladeMat);
  blade.position.y = 1.0;
  katana.add(blade);
  // tip - chamfer
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(.09, .4, 4),
    bladeMat
  );
  tip.rotation.y = Math.PI/4;
  tip.position.y = 2.9;
  katana.add(tip);
  // neon edge
  const katanaEdgeMat = new THREE.MeshBasicMaterial({
    color:0xff6f59, transparent:true, opacity:.9, toneMapped:false
  });
  katanaEdgeMat.emissive = new THREE.Color(0xff6f59); // ignored on basic but keeps API
  const edge = new THREE.Mesh(new THREE.BoxGeometry(.025, 3.6, .05), katanaEdgeMat);
  edge.position.set(.085, 1.0, 0);
  katana.add(edge);

  // guard
  const guardMat = new THREE.MeshStandardMaterial({ color:0x3d2a1e, metalness:.6, roughness:.5 });
  const guard = new THREE.Mesh(new THREE.BoxGeometry(.42, .08, .12), guardMat);
  guard.position.y = -.85;
  katana.add(guard);
  // handle (tsuka)
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .9, 12), new THREE.MeshStandardMaterial({color:0x1a0f0a, roughness:.8}));
  handle.position.y = -1.35;
  katana.add(handle);
  // wrap rings
  for(let i=0;i<8;i++){
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(.075, .012, 6, 12),
      new THREE.MeshStandardMaterial({color:0xff6f59, emissive:0x301008, roughness:.4})
    );
    r.position.y = -1.7 + i*.09;
    r.rotation.x = Math.PI/2;
    katana.add(r);
  }
  // pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), guardMat);
  pommel.position.y = -1.85;
  katana.add(pommel);

  katana.rotation.z = .22;
  katana.position.x = .3;
  katana.visible = false;

  // ── (C) WIREFRAME MASK ───────────────────────────────
  const mask = new THREE.Group();
  const maskGeom = new THREE.IcosahedronGeometry(1.4, 1);
  // displace vertices slightly to look like a face
  const pos = maskGeom.attributes.position;
  for(let i=0; i<pos.count; i++){
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // pull back of head in
    const back = Math.max(0, -z) * .3;
    pos.setXYZ(i, x*(1-back*.3), y, z + back);
  }
  pos.needsUpdate = true;
  maskGeom.computeVertexNormals();
  const maskBodyMat = new THREE.MeshStandardMaterial({
    color:0x0c0c0c, metalness:.7, roughness:.35, flatShading:true
  });
  const maskMesh = new THREE.Mesh(maskGeom, maskBodyMat);
  mask.add(maskMesh);
  const maskWireMat = new THREE.LineBasicMaterial({ color:0xff6f59, transparent:true, opacity:.9 });
  const maskWire = new THREE.LineSegments(new THREE.EdgesGeometry(maskGeom, 1), maskWireMat);
  mask.add(maskWire);
  // visor strip
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, .18, .05),
    new THREE.MeshBasicMaterial({ color:0xff6f59, transparent:true, opacity:.85, toneMapped:false })
  );
  visor.position.set(0, .1, 1.2);
  mask.add(visor);
  mask.visible = false;

  root.add(chip, katana, mask);

  // ── (D) CUSTOM GLB MODEL slot ────────────────────────
  // Drop your .glb into ./models/hero.glb (or change path below)
  // It'll auto-load and become a 4th option in the Tweaks panel.
  const custom = new THREE.Group();
  custom.visible = false;
  root.add(custom);
  const loader = (typeof THREE.GLTFLoader === 'function') ? new THREE.GLTFLoader() : null;
  const MODEL_PATH = 'models/hero.glb';
  if(loader){
    loader.load(MODEL_PATH, (gltf)=>{
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      const size = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if(maxDim > 0){
        const s = 3 / maxDim;
        m.scale.setScalar(s);
      }
      const center = new THREE.Vector3(); box.getCenter(center);
      m.position.sub(center.multiplyScalar(m.scale.x));
      custom.add(m);
      if(window.__heroScene) window.__heroScene.customLoaded = true;
      console.log('[hero] loaded GLB:', MODEL_PATH);
    }, undefined, ()=>{
      console.log('[hero] no custom model at', MODEL_PATH, '— drop a .glb there to enable the "Custom GLB" option');
    });
  } else {
    console.warn('[hero] GLTFLoader not available — custom GLB option disabled');
  }

  // ── floor grid (cyberpunk vibe) ──────────────────────
  const grid = new THREE.GridHelper(40, 40, 0xff6f59, 0x222222);
  grid.position.y = -2.2;
  grid.material.transparent = true;
  grid.material.opacity = .25;
  scene.add(grid);

  // ── particles ───────────────────────────────────────
  const PARTICLE_COUNT = 280;
  const pPositions = new Float32Array(PARTICLE_COUNT*3);
  for(let i=0;i<PARTICLE_COUNT;i++){
    pPositions[i*3]   = (Math.random()-.5) * 16;
    pPositions[i*3+1] = (Math.random()-.5) * 8;
    pPositions[i*3+2] = (Math.random()-.5) * 12 - 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xff6f59, size: .03, transparent:true, opacity:.6, sizeAttenuation:true, toneMapped:false
  });
  const particles = new THREE.Points(pGeo, particleMat);
  scene.add(particles);

  // ── resize ──────────────────────────────────────────
  function resize(){
    const w = mount.clientWidth, h = mount.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── interaction: parallax via pointer ───────────────
  const pointer = { x:0, y:0, tx:0, ty:0 };
  window.addEventListener('pointermove', e=>{
    pointer.tx = (e.clientX / window.innerWidth - .5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - .5) * 2;
  });

  // scroll fade
  let scrollY = 0;
  window.addEventListener('scroll', ()=>{ scrollY = window.scrollY; }, {passive:true});

  // ── object switching ────────────────────────────────
  const objects = { chip, katana, mask, custom };
  function setObject(name){
    Object.entries(objects).forEach(([k, o])=> o.visible = (k === name));
  }

  // chip / katana / mask / custom rotations
  // (rotation already on chip + katana below; for custom we just spin Y)
  // animate

  let spinSpeed = 1;
  function setSpinSpeed(v){ spinSpeed = v; }

  // ── animate ─────────────────────────────────────────
  const clock = new THREE.Clock();
  function animate(){
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();
    pointer.x += (pointer.tx - pointer.x) * .04;
    pointer.y += (pointer.ty - pointer.y) * .04;

    root.position.x = pointer.x * .25;
    root.position.y = -pointer.y * .2;

    // chip
    chip.rotation.y = t * .25 * spinSpeed;
    chipCoreMat.emissiveIntensity = 1.2 + Math.sin(t*3)*.4;
    ring.rotation.z = t * .9 * spinSpeed;
    ring2.rotation.z = -t * .5 * spinSpeed;

    // katana
    katana.rotation.y = t * .6 * spinSpeed;
    katana.position.y = Math.sin(t*.8) * .15;

    // mask
    mask.rotation.y = Math.sin(t*.4) * .6;
    mask.rotation.x = Math.cos(t*.3) * .15;

    // custom GLB
    custom.rotation.y = t * .35 * spinSpeed;

    // particles drift
    const ppos = pGeo.attributes.position.array;
    for(let i=0;i<PARTICLE_COUNT;i++){
      ppos[i*3+1] += dt * .12 * (((i*17)%5)*.2 + .3);
      if(ppos[i*3+1] > 5) ppos[i*3+1] = -5;
    }
    pGeo.attributes.position.needsUpdate = true;

    // hero parallax fade as you scroll
    const heroH = window.innerHeight;
    const fade = Math.max(0, 1 - scrollY / (heroH * .9));
    root.position.y -= scrollY * 0.0015;
    renderer.domElement.style.opacity = fade;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // expose
  window.__heroScene = { setObject, setAccent, setSpinSpeed, scene, camera, renderer, chip, katana, mask };

  // apply initial accent from CSS var
  const cssAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  if(cssAccent) setAccent(cssAccent);
})();
