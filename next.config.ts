import type { NextConfig } from "next";

// STATIC_EXPORT=true builds a plain-HTML preview (GitHub Pages); NEXT_PUBLIC_BASE_PATH serves it under a sub-path.
const staticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  // WordPress URLs end with "/"; keeping that means every old URL keeps working as-is.
  trailingSlash: true,
  basePath,
  ...(staticExport ? { output: "export" as const } : {}),
  images: staticExport
    ? { loader: "custom", loaderFile: "./src/lib/static-image-loader.ts" }
    : {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [{ protocol: "https", hostname: "my-water.co.il", pathname: "/wp-content/uploads/**" }],
      },
  ...(staticExport
    ? {}
    : {
        async redirects() {
          // WordPress duplicates and builder leftovers point at their real pages.
          return [
            { source: "/cart-2/", destination: "/cart/", permanent: true },
            { source: "/checkout-2/", destination: "/checkout/", permanent: true },
            { source: "/lost-password-2/", destination: "/lost-password/", permanent: true },
          ];
        },
      }),
};

export default nextConfig;
