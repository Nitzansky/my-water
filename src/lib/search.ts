// Forgiving product search: every query word must match a word of the product (in any order), Hebrew
// one-letter prefixes (ו ה ל ב מ ש כ) are ignored, and common spellings/synonyms count as the same word —
// so "מסנן תמי" finds "מסנן לתמי 4", and "tami edge" finds "פילטר לתמי 4 Edge".

const SYNONYMS = [
  ["מסנן", "מסננים", "פילטר", "פילטרים", "filter", "filters"],
  ["תמי", "טמי", "tami", "tammy"],
  ["פרימו", "primo"],
  ["פמילי", "פאמילי", "family"],
  ["אדג", "אדג'", "edge"],
  ["בייסיק", "בייסק", "basic"],
  ["בבל", "bubble"],
  ["אוסמוזה", "osmosis"],
  ["בר", "ברי"],
  ["מקרר", "מקררים"],
];
const SYN = new Map<string, string>();
for (const group of SYNONYMS) for (const w of group) SYN.set(w, group[0]);

const PREFIX = /^[והלבמשכ]{1,2}(?=[א-ת]{2})/;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // niqqud
    .replace(/([^\d\s])(\d)|(\d)([^\d\s])/g, "$1$3 $2$4") // "תמי4" → "תמי 4"
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);
}

// The forms a word can take: itself, without a Hebrew prefix, and its synonym group's head.
function forms(w: string): string[] {
  const out = new Set([w]);
  const bare = w.replace(PREFIX, "");
  out.add(bare);
  for (const f of [...out]) {
    const s = SYN.get(f) ?? SYN.get(f.replace(/'/g, ""));
    if (s) out.add(s);
  }
  return [...out];
}

// A product's searchable words (split once, then scored against each query).
export function index(text: string): string[] {
  return words(text).flatMap(forms);
}

// 0 = no match; higher = better (whole-word hits beat prefix hits).
export function score(query: string, indexed: string[]): number {
  const q = words(query);
  if (!q.length) return 1;
  let total = 0;
  for (const w of q) {
    const fs = forms(w);
    let best = 0;
    for (const t of indexed) {
      for (const f of fs) {
        if (t === f) best = Math.max(best, 3);
        else if (f.length >= 2 && t.startsWith(f)) best = Math.max(best, 2);
        else if (f.length >= 3 && t.includes(f)) best = Math.max(best, 1);
      }
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}
