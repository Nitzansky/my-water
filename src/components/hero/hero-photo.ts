// The hero photo (public/hero-dispenser.webp) and how it is framed — shared by HeroBackdrop, which zooms
// it, and the 3D story, whose first frame reproduces the photo's last one.
import { HANDOFF_FILL } from "../story/timing";

export const PHOTO = { w: 1672, h: 940 };
// The bar in the photo (px): centre and height, the zoom aims at it.
const BAR = { x: 1142, y: 536, h: 588 };
// The photo's camera, solved against the 3D model's panel, screen, drawer and body corners
// (rms ≈ 10 px over the photo): model units, vertical field of view for the whole photo.
export const PHOTO_CAMERA = { position: [0.518, 0.3131, 1.5883], target: [-0.3225, 0.2453, -0.0866], fov: 25.71 } as const;

// On phones the photo takes the bottom MOBILE_H of the screen (sky gradient above), so more of it shows.
export const MOBILE_H = 0.6;

// Zoom state for z (0 = hero, 1 = fully zoomed into the bar) in a vw×vh frame: object-fit: cover in a box
// that is the whole frame, or on phones its bottom MOBILE_H (must match .hero__bg in ui.css).
export function photoFrame(vw: number, vh: number, z: number) {
  const mobile = vw <= 760;
  const [px, py] = mobile ? [0.8, 1] : [0.7, 0.5];
  const bh = mobile ? vh * MOBILE_H : vh;
  const b = Math.max(vw / PHOTO.w, bh / PHOTO.h);
  const ox = (vw - PHOTO.w * b) * px, oy = vh - bh + (bh - PHOTO.h * b) * py;
  const cx0 = ox + BAR.x * b, cy0 = oy + BAR.y * b;
  // End framing: the bar centred and filling HANDOFF_FILL of the height.
  const s = Math.pow(Math.max(1, (HANDOFF_FILL * vh) / (BAR.h * b)), z);
  const tx = cx0 + (vw / 2 - cx0) * z - cx0 * s, ty = cy0 + (vh / 2 - cy0) * z - cy0 * s;
  // The part of the photo (photo px) the frame shows: screen = photo·(b·s) + (o·s + t).
  const k = b * s;
  const crop = { x: -(ox * s + tx) / k, y: -(oy * s + ty) / k, w: vw / k, h: vh / k };
  return { s, tx, ty, crop };
}
