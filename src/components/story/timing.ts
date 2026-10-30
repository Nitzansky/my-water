// Shared scroll timing between the hero photo (HeroBackdrop) and the 3D story (WaterStory).
// Measured from the story's top, in viewport heights: the photo finishes zooming into the bar at
// HANDOFF and cross-fades into the 3D bar over FADE, which then zooms back out.
export const HANDOFF = 0.4;
export const FADE = 0.25;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t: number) => t * t * (3 - 2 * t);
