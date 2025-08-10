/**
 * dom_features.js
 * ---------------------------------------------------------------------------
 * Extracts 13 DOM–based features from an HTML Document for phishing detection.
 * Works in both browser content‐scripts and Node (with jsdom).
 * ---------------------------------------------------------------------------
 *  Returned features (exact key names expected by the DOM model):
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ num_forms                     dom_max_depth                            │
 *  │ has_password_field            text_length                              │
 *  │ form_action_external_ratio    suspicious_keyword_count                 │
 *  │ external_link_ratio           iframe                                   │
 *  │ empty_link_ratio              mouse_over                               │
 *  │ external_image_ratio          right_click                              │
 *  │ num_scripts                                                            │
 *  └─────────────────────────────────────────────────────────────────────────┘
 */

const SUSPICIOUS_KEYWORDS = [
  "login", "secure", "account", "update", "bank",
  "signin", "verify", "password", "user"
];

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

// Normalise a URL → hostname (lower-case, no trailing dot)
function getDomain(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";               // invalid / empty URL → treat as same-origin
  }
}

// Recursively compute maximum DOM tree depth (elements only)
function maxDomDepth(node) {
  const kids = Array.from(node.childNodes).filter(n => n.nodeType === 1);
  if (!kids.length) return 1;
  const depths = kids.map(maxDomDepth);
  return 1 + Math.max(...depths);
}

/* ------------------------------------------------------------------------- */
/* Main feature extractor                                                    */
/* ------------------------------------------------------------------------- */

export function extractDomFeatures(doc, pageUrl) {
  // Fail-safe guard: if document is unavailable return null
  if (!doc || typeof doc !== "object") return null;

  const originDomain = getDomain(pageUrl);

  /* ---------- 1. Forms --------------------------------------------------- */
  const forms                = Array.from(doc.forms);
  const num_forms            = forms.length;
  const has_password_field   = doc.querySelector('input[type="password"]') ? 1 : 0;
  const extFormActions       = forms.reduce((sum, f) => {
    const actionDomain = getDomain(f.getAttribute("action") || pageUrl);
    return sum + (actionDomain && actionDomain !== originDomain ? 1 : 0);
  }, 0);
  const form_action_external_ratio =
    num_forms ? extFormActions / num_forms : 0;

  /* ---------- 2. Links --------------------------------------------------- */
  const anchors              = Array.from(doc.querySelectorAll("a[href]"));
  const total_links          = anchors.length;
  const ext_links            = anchors.reduce((sum, a) => {
    const hDomain = getDomain(a.getAttribute("href"));
    return sum + (hDomain && hDomain !== originDomain ? 1 : 0);
  }, 0);
  const empty_links          = anchors.filter(a => {
    const h = (a.getAttribute("href") || "").trim();
    return h === "" || h === "#";
  }).length;
  const external_link_ratio  =
    total_links ? ext_links  / total_links : 0;
  const empty_link_ratio     =
    total_links ? empty_links / total_links : 0;

  /* ---------- 3. Images -------------------------------------------------- */
  const images               = Array.from(doc.images);
  const total_images         = images.length;
  const ext_images           = images.reduce((sum, img) => {
    const iDomain = getDomain(img.getAttribute("src"));
    return sum + (iDomain && iDomain !== originDomain ? 1 : 0);
  }, 0);
  const external_image_ratio =
    total_images ? ext_images / total_images : 0;

  /* ---------- 4. Scripts & DOM depth ------------------------------------ */
  const num_scripts          = doc.scripts.length;
  const dom_max_depth        = maxDomDepth(doc.documentElement);

  /* ---------- 5. Text & keyword stats ----------------------------------- */
  const text                 = doc.body?.innerText || "";
  const text_length          = text.length;
  const lowerText            = text.toLowerCase();
  const suspicious_keyword_count = SUSPICIOUS_KEYWORDS.reduce(
    (sum, kw) => sum + (lowerText.split(kw).length - 1), 0
  );

  /* ---------- 6. Binary flags ------------------------------------------- */
  const iframe               = doc.querySelector("iframe") ? 1 : 0;
  const mouse_over           = doc.querySelector("[onmouseover]") ? 1 : 0;
  const right_click          =
    (doc.documentElement.outerHTML || "")
      .toLowerCase()
      .includes("contextmenu") ? 1 : 0;

  /* ---------- 7. Assemble result ---------------------------------------- */
  return {
    num_forms,
    has_password_field,
    form_action_external_ratio,
    external_link_ratio,
    empty_link_ratio,
    external_image_ratio,
    num_scripts,
    dom_max_depth,
    text_length,
    suspicious_keyword_count,
    iframe,
    mouse_over,
    right_click
  };
}

/* Provide CommonJS fallback for Node (if someone uses require()) */
if (typeof module !== "undefined") {
  module.exports = { extractDomFeatures };
}
