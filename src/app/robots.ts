import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // Preview builds must never be indexed; production sets NEXT_PUBLIC_ALLOW_INDEXING=true.
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart/", "/checkout/", "/my-account/"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
