// Shared scroll timing between the hero photo (HeroBackdrop) and the 3D story (WaterStory).
// Measured from the story's top, in viewport heights: the photo finishes zooming into the bar at
// HANDOFF and cross-fades into the 3D bar over FADE, which then zooms back out.
export const HANDOFF = 0.4;
export const FADE = 0.1;
// At the handoff the bar is centred and fills this fraction of the view height, in the photo and in 3D alike.
export const HANDOFF_FILL = 0.95;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t: number) => t * t * (3 - 2 * t);
