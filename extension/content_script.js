// content_script.js
// ─────────────────────────────────────────────────────────────────────────────
//  Runs inside every page.  Extracts two feature vectors (URL + DOM) *after*
//  the document is fully parsed, sends them to the background service-worker,
//  and logs / receives the verdict.
//
//  Works with `run_at: "document_idle"` (recommended) **and** gracefully
//  falls back if the manifest is ever changed back to "document_start".
//
//  The script also re-fires on Single-Page-App (SPA) route changes by
//  listening to `popstate` + `pushState` overrides.
//
// ─────────────────────────────────────────────────────────────────────────────

(async function initContentScript() {
  /* ---------------- 1.  Wait until <body> is present -------------------- */
  if (!document.body) {
    await new Promise((resolve) =>
      document.addEventListener("DOMContentLoaded", resolve, { once: true })
    );
  }

  /* ---------------- 2.  Dynamic imports (MV3-safe) ---------------------- */
  const { extractUrlFeatures } = await import(
    chrome.runtime.getURL("url_features.js")
  );
  const { extractDomFeatures } = await import(
    chrome.runtime.getURL("dom_features.js")
  );

  /* ---------------- 3.  Helper to run the pipeline ---------------------- */
  async function runDetection() {
    // strip off anything from “?” onward:
    const fullUrl   = window.location.href;
    const pageUrl = fullUrl.split('?')[0].split('#')[0];
    // URL-based features (always available)
    const urlF = extractUrlFeatures(pageUrl);

    // DOM-based features (may fail on about:blank, CSP etc.)
    let domF = null;
    try {
      domF = extractDomFeatures(document, pageUrl);
    } catch (e) {
      console.warn("DOM feature extraction failed:", e);
    }

    chrome.runtime.sendMessage({
      type: "EXTRACT",
      payload: { urlF, domF }
    });
  }

  /* ---------------- 4.  Initial run + SPA hooks ------------------------- */
  await runDetection();

  // Re-run for SPA navigations (pushState / replaceState / popstate)
  const _push = history.pushState;
  history.pushState = function () {
    _push.apply(this, arguments);
    setTimeout(runDetection, 0);
  };
  const _replace = history.replaceState;
  history.replaceState = function () {
    _replace.apply(this, arguments);
    setTimeout(runDetection, 0);
  };
  window.addEventListener("popstate", () => setTimeout(runDetection, 0), false);
})();

/* ---------------- 5.  Receive verdict from background ------------------- */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "RESULT") return;

  const { label, probability, pUrl, pDom } = msg.payload;
  console.log(
    `PhishGuard → ${label}\n` +
    `  URL model : ${(pUrl  * 100).toFixed(1)} %\n` +
    `  DOM model : ${(pDom  * 100).toFixed(1)} %\n` +
    `  Combined  : ${(probability * 100).toFixed(1)} %  ← final\n` +
    `  URL       : ${window.location.href}`
  );

  function showInlinePopup({ label, pUrl, pDom, probability }) {
  // if it’s already there, update and return
  let box = document.getElementById('phishguard-inline');
  if (!box) {
    box = document.createElement('div');
    box.id = 'phishguard-inline';
    Object.assign(box.style, {
      position:   'fixed',
      top:        '10px',
      right:      '10px',
      padding:    '8px',
      background: 'rgba(0,0,0,0.75)',
      color:      'white',
      fontSize:   '12px',
      zIndex:     '2147483647',
      borderRadius: '4px'
    });
    document.body.appendChild(box);
  }
  box.textContent =
    `Decision: ${label.toUpperCase()} (${(probability*100).toFixed(1)}%)\n`
    //`URL: ${(pUrl*100).toFixed(1)}% DOM: ${(pDom*100).toFixed(1)}%`;
}

// then, wherever you get your final verdict:
showInlinePopup({ label, pUrl, pDom, probability });


});
