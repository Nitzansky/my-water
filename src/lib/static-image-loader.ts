// Image loader for the static preview: no optimizer is available, so images are served as-is
// (the product images are already optimized WebP); local paths get the base path.
export default function staticImageLoader({ src, width }: { src: string; width: number }) {
  const url = src.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}` : src;
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
}
