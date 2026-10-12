const clamp = value => Math.max(0, Math.min(1, value));

// Reconstructed from the reference video's EX -> S transition near 01:18.
// The map and chapter strip share the outgoing camera; the top menu stays fixed.
// Timing is visually calibrated, not an extracted Unity animation curve.
export function sceneTransition(elapsed, chapterSwitch = true) {
  const t = Math.max(0, elapsed);
  const cut = .4, reveal = .48, end = .9;
  if (t < cut) {
    const progress = t / cut;
    return {
      changed: false,
      fade: chapterSwitch ? clamp((progress - .35) / .65) : progress,
      zoom: 1 + (chapterSwitch ? .9 : .065) * progress * progress,
      done: false,
    };
  }
  return {
    changed: true,
    fade: 1 - clamp((t - reveal) / (end - reveal)),
    zoom: chapterSwitch ? 1 : 1 + .065 * (1 - clamp((t - reveal) / (end - reveal))),
    done: t >= end,
  };
}
