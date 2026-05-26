import type { Rig } from './types';

export function cloneRig(r: Rig): Rig {
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

export function lerpRig(a: Rig, b: Rig, t: number): Rig {
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
