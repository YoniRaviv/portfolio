// Tweaks panel app — mounts a small floating panel for live edits.

const { useEffect } = React;

function YRTweaksApp(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // accent → CSS var + scene
  useEffect(()=>{
    document.documentElement.style.setProperty('--accent', t.accent);
    const a = t.accent;
    // recompute --accent-soft
    document.documentElement.style.setProperty('--accent-soft', a + '2e');
    if(window.__heroScene) window.__heroScene.setAccent(a);
  }, [t.accent]);

  // hero object
  useEffect(()=>{
    if(window.__heroScene) window.__heroScene.setObject(t.heroObject);
  }, [t.heroObject]);

  // spin speed
  useEffect(()=>{
    if(window.__heroScene) window.__heroScene.setSpinSpeed(t.spinSpeed);
  }, [t.spinSpeed]);

  // display font
  useEffect(()=>{
    const map = {
      'Bebas Neue':     '"Bebas Neue", "Anton", "Archivo Black", sans-serif',
      'Anton':          '"Anton", "Bebas Neue", sans-serif',
      'Archivo Black':  '"Archivo Black", "Bebas Neue", sans-serif',
    };
    document.documentElement.style.setProperty('--display', map[t.displayFont] || map['Bebas Neue']);
  }, [t.displayFont]);

  // scanlines
  useEffect(()=>{
    const sl = document.querySelector('.scanlines');
    if(sl) sl.style.display = t.scanlines ? '' : 'none';
  }, [t.scanlines]);

  // glitch / cursor glow toggle — now controls CRT pulse + scramble availability
  useEffect(()=>{
    const pulse = document.getElementById('crtPulse');
    if(pulse) pulse.style.display = t.cursorGlow ? '' : 'none';
  }, [t.cursorGlow]);

  // background
  useEffect(()=>{
    const grain = document.querySelector('.grain');
    if(!grain) return;
    grain.style.display = (t.background === 'noise') ? '' : 'none';
    // grid handled by floor; scanlines separate. Background mode could add overlays later.
    document.body.style.background =
      t.background === 'plain' ? '#0a0a0a' :
      t.background === 'noise' ? 'var(--main)' :
      t.background === 'grid'  ? 'linear-gradient(var(--main), var(--main))' :
      'var(--main)';
    // grid overlay
    let gridEl = document.getElementById('__bgGrid');
    if(t.background === 'grid'){
      if(!gridEl){
        gridEl = document.createElement('div');
        gridEl.id = '__bgGrid';
        gridEl.style.cssText = `
          position:fixed;inset:0;z-index:2;pointer-events:none;opacity:.08;
          background-image:
            linear-gradient(to right, var(--text) 1px, transparent 1px),
            linear-gradient(to bottom, var(--text) 1px, transparent 1px);
          background-size: 80px 80px;
        `;
        document.body.appendChild(gridEl);
      }
    } else if(gridEl){ gridEl.remove(); }
  }, [t.background]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="3D Hero" />
      <TweakSelect label="Object" value={t.heroObject}
        options={[
          {value:'chip', label:'Circuit chip'},
          {value:'katana', label:'Neon katana'},
          {value:'mask', label:'Wireframe mask'},
          {value:'custom', label:'Custom GLB (models/hero.glb)'},
        ]}
        onChange={(v)=> setTweak('heroObject', v)} />
      <TweakSlider label="Spin speed" value={t.spinSpeed} min={0} max={3} step={0.1}
        onChange={(v)=> setTweak('spinSpeed', v)} />

      <TweakSection label="Palette" />
      <TweakColor label="Accent" value={t.accent}
        options={['#FF6F59', '#4DD2FF', '#E0FF4D', '#FF4DC8', '#9D6BFF', '#42E695']}
        onChange={(v)=> setTweak('accent', v)} />

      <TweakSection label="Typography" />
      <TweakSelect label="Display face" value={t.displayFont}
        options={[
          {value:'Bebas Neue', label:'Bebas Neue'},
          {value:'Anton', label:'Anton'},
          {value:'Archivo Black', label:'Archivo Black'},
        ]}
        onChange={(v)=> setTweak('displayFont', v)} />

      <TweakSection label="Atmosphere" />
      <TweakRadio label="Background" value={t.background}
        options={['noise','grid','plain']}
        onChange={(v)=> setTweak('background', v)} />
      <TweakToggle label="Scanlines" value={t.scanlines}
        onChange={(v)=> setTweak('scanlines', v)} />
      <TweakToggle label="CRT pulse" value={t.cursorGlow}
        onChange={(v)=> setTweak('cursorGlow', v)} />
    </TweaksPanel>
  );
}

// mount
const __yrMount = document.createElement('div');
document.body.appendChild(__yrMount);
ReactDOM.createRoot(__yrMount).render(<YRTweaksApp />);
