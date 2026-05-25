import type { Rig, SectionKey, SectionRig } from './types';
import { SECTION_KEYS, TRANSITION_ZONE } from './types';
import { lerpRig } from './rig-math';
import { HERO_RIG } from './rigs';

type RigsByBreakpoint = Record<SectionKey, SectionRig>;

function resolveSectionRig(rigs: RigsByBreakpoint, key: SectionKey, p: number): Rig {
  const r = rigs[key];
  if (!r.end) return r.start;
  const hold = r.holdStart ?? 0;
  // Hold rigStart for the first `hold` fraction, then remap (hold..1) → (0..1).
  const adjustedP = hold > 0 && p < hold ? 0 : (p - hold) / Math.max(0.0001, 1 - hold);
  return lerpRig(r.start, r.end, Math.max(0, Math.min(1, adjustedP)));
}

// Creates a closure that, on each call, reads the current scroll position +
// section element layout and returns the rig the scene should be aiming at.
// Section elements are looked up by id each call so the function tolerates
// late-mounted DOM without needing an external invalidation hook.
export function createTargetRigComputer(getActiveRigs: () => RigsByBreakpoint) {
  return function computeTargetRig(): Rig {
    const sections = SECTION_KEYS.map((k) => document.getElementById(k));
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

    const rigs = getActiveRigs();
    // Within-section progress (drives rigStart → rigEnd if both defined).
    const rigA = resolveSectionRig(rigs, SECTION_KEYS[i], p);

    // Between-section blend: hold the current rig steady through most of the
    // section, then ease toward the next section's rig in its final portion.
    // Without this, even at the top of the page (probe = mid-hero) we'd be
    // 50% blended into Who, pulling the hero pose visibly off.
    const tz = rigs[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
    const blendStart = 1 - tz;
    const rawBlend = p < blendStart ? 0 : (p - blendStart) / tz;
    const eased = rawBlend * rawBlend * (3 - 2 * rawBlend);

    const rigB = resolveSectionRig(rigs, SECTION_KEYS[ni], 0);
    return lerpRig(rigA, rigB, eased);
  };
}
