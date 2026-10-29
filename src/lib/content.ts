// Turns WordPress/Elementor HTML into clean, accessible HTML for the new design.
// All text is kept verbatim; only layout wrappers, inline styles, scripts and builder
// widgets (sliders, forms, menus) are dropped.
import "server-only";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { BASE_PATH } from "./site";
import { decode } from "./wp";

const SITE_RE = /^https?:\/\/(www\.)?my-water\.co\.il/;

const REMOVE = [
  "script", "style", "noscript", "form", "svg",
  ".elementor-hidden-desktop", // duplicate mobile-only copies of desktop content
  ".elementor-nav-menu", ".elementor-menu-toggle", ".elementor-widget-wp-widget-nav_menu",
  ".elementor-swiper-button", ".swiper-pagination", ".elementor-screen-only",
  ".rev_slider_wrapper", ".elementor-widget-form", ".elementor-share-buttons",
  ".woocommerce", ".elementor-widget-woocommerce-products", ".elementor-widget-wc-categories",
  "[aria-hidden=true]",
].join(",");

export function cleanHtml(html: string, opts: { demoteH1?: boolean } = {}): string {
  const $ = cheerio.load(html, null, false);
  $(REMOVE).remove();
  // lazy-loaded images keep the real URL in data-src / data-lazy-src
  $("img").each((_, el) => {
    const img = $(el);
    const real = img.attr("data-src") || img.attr("data-lazy-src");
    if (real) img.attr("src", real);
    img.removeAttr("srcset").removeAttr("sizes");
  });
  // internal links become relative so they stay inside the new site
  $("a[href]").each((_, el) => {
    const a = $(el);
    const href = a.attr("href")!;
    const internal = SITE_RE.test(href) || (href.startsWith("/") && !href.startsWith("//"));
    if (internal && !/\/wp-content\//.test(href)) a.attr("href", BASE_PATH + (decode(href.replace(SITE_RE, "")) || "/"));
  });
  if (opts.demoteH1) $("h1").each((_, el) => { el.tagName = "h2"; });

  const clean = sanitizeHtml($.html(), {
    allowedTags: [
      "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "ul", "ol", "li", "a", "strong", "b", "em", "i", "u", "span",
      "blockquote", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "caption", "iframe",
      "div",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "title", "width", "height", "allowfullscreen"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"],
    },
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "www.google.com", "maps.google.com"],
    transformTags: {
      h1: "h2",
      a: (tag, attribs) => {
        const external = /^https?:/.test(attribs.href ?? "") && !SITE_RE.test(attribs.href ?? "");
        return { tagName: "a", attribs: external ? { ...attribs, target: "_blank", rel: "noopener" } : attribs };
      },
      img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, alt: attribs.alt ?? "", loading: "lazy", decoding: "async" } }),
      iframe: (tag, attribs) => ({ tagName: "iframe", attribs: { ...attribs, loading: "lazy", title: attribs.title || "תוכן מוטמע" } }),
    },
    exclusiveFilter: (frame) =>
      (frame.tag === "div" || frame.tag === "span" || frame.tag === "p") && !frame.text.trim() && !frame.mediaChildren.length,
  });

  // collapse the remaining builder <div> soup: unwrap nested divs
  const $$ = cheerio.load(clean, null, false);
  let changed = true;
  while (changed) {
    changed = false;
    $$("div").each((_, el) => {
      const d = $$(el);
      if (d.children().length === 1 && d.children("div").length === 1 && !d.contents().filter((_, n) => n.type === "text" && !!$$(n).text().trim()).length) {
        d.replaceWith(d.children());
        changed = true;
      }
    });
  }
  return $$.html().trim();
}

export function plainText(html: string): string {
  return cheerio.load(html, null, false).text().replace(/\s+/g, " ").trim();
}

// Product and category pages the original content linked to (in order, unique) — those links sat
// inside WooCommerce widgets that cleanHtml drops, so the new site renders them as live cards instead.
export function linkedPaths(html: string): { products: string[]; categories: string[] } {
  const seen = new Set<string>();
  const products: string[] = [];
  const categories: string[] = [];
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (!SITE_RE.test(href) && !href.startsWith("/")) continue;
    let path = decode(href.replace(SITE_RE, "").split(/[?#]/)[0]).replace(/\/?$/, "/");
    if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) path = path.slice(BASE_PATH.length);
    if (seen.has(path)) continue;
    seen.add(path);
    if (path.startsWith("/product/")) products.push(path);
    else if (path.startsWith("/product-category/")) categories.push(path);
  }
  return { products, categories };
}
