// url_features.js
// -----------------------------------------------------------------------------
// Feature schema v3  –  generated 2025-05-15
// This file MUST stay in perfect sync with the Python extractor used to train
// the XGBoost model.  Update both sides together or the browser scorer will
// drift from the notebook.
//
// Feature list (12 columns, fixed order):
//  0  have_ip              – URL contains an IPv4 literal
//  1  have_at              – URL contains “@”
//  2  url_length           – total length of the full URL
//  3  url_depth            – number of “/” characters **in the path**
//  4  redirection          – “//” appears after “scheme://”
//  5  https_in_domain      – substring “https” appears inside the host name
//  6  tiny_url             – host is a known shortening service
//  7  prefix_suffix        – host name contains “-”
//  8  suspicious_words     – count of phishing words inside the text
//  9  has_subdomain        – host has ***more than two*** dots
// 10  digit_count          – how many numeric characters in the full URL
// 11  special_char_count   – non-alphanum characters in the full URL
// -----------------------------------------------------------------------------

// Regex of common shortening services (same as the Python code)
const SHORTENING_SERVICES =
  /(bit\.ly|goo\.gl|shorte\.st|go2l\.ink|x\.co|ow\.ly|tinyurl\.com|qr\.net|1url\.com|tweez\.me|v\.gd|tr\.im|link\.zip\.net)/i;

// Words that often appear in phishing URLs
const SUSPICIOUS_WORDS = [
  "login", "secure", "account",
  "update", "bank", "signin", "verify"
];

/**
 * Extract the 12-dimensional feature vector expected by url_model.js.
 * @param {string} url   – absolute URL
 * @param {Document=} _doc – DOM document (unused, kept for API symmetry)
 * @returns {Object<string, number>} dictionary keyed by the feature names
 */
export function extractUrlFeatures(url /*, _doc */) {
  const parsed = new URL(url);
  const hostname = parsed.hostname || "";
  const path     = parsed.pathname  || "";

  // --------------------- Boolean helpers ---------------------
  const hasIPv4  = /\d+\.\d+\.\d+\.\d+/.test(url);
  const hasAt    = url.includes("@");
  const hasHttps = hostname.includes("https");
  const tinyURL  = SHORTENING_SERVICES.test(url);
  const hasDash  = hostname.includes("-");
  const dotCount = (hostname.match(/\./g) || []).length;   // dots in host
  const subDom   = dotCount > 2;       // ***Python parity***: > 2 dots only

  // --------------------- Count helpers ----------------------
  const urlLen      = url.length;
  const urlDepth    = (path.match(/\//g) || []).length;    // “/” in path
  const afterProto  = url.slice(url.indexOf("://") + 3);
  const redirect    = afterProto.includes("//");
  const suspCount   = SUSPICIOUS_WORDS.reduce(
                        (acc, w) => acc + (url.toLowerCase().includes(w) ? 1 : 0),
                        0);
  const digitCount  = (url.match(/\d/g)   || []).length;
  const specialChar = (url.match(/[^\w]/g) || []).length;  // \w = [A-Za-z0-9_]

  // --------------------- Assemble vector --------------------
  const feats = {
    have_ip            : hasIPv4        ? 1 : 0,
    have_at            : hasAt          ? 1 : 0,
    url_length         : urlLen,
    url_depth          : urlDepth,
    redirection        : redirect       ? 1 : 0,
    https_in_domain    : hasHttps       ? 1 : 0,
    tiny_url           : tinyURL        ? 1 : 0,
    prefix_suffix      : hasDash        ? 1 : 0,
    suspicious_words   : suspCount,
    has_subdomain      : subDom         ? 1 : 0,
    digit_count        : digitCount,
    special_char_count : specialChar
  };

  // Fail-fast guard: make sure we didn’t forget a feature
  const missing = Object.values(feats).some(v => v === undefined);
  /* eslint-disable no-console */
  if (missing) {
    console.error("[PhishGuard] feature extraction returned undefined values",
                  feats);
  }
  /* eslint-enable  no-console */

  return feats;
}
