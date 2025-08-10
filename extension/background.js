// background.js  –  MV3 service-worker (type:"module")
//
// • Receives {type:"EXTRACT", payload:{urlF, domF}} from the content script
// • Runs URL-model and DOM-model
// • Combines the two probabilities with a fixed α read from alpha.json
// • Sends the verdict back to the tab  AND  caches it so the popup can ask later
// • Answers {type:"getVerdict", tabId} from popup.js
// -----------------------------------------------------------------------------

import { modelPromise as urlModelP, predict as predictURL } from "./url_model.js";
import { modelPromise as domModelP, predict as predictDOM } from "./dom_model.js";

// α  (0 ≤ α ≤ 1)  = weight given to the URL model
const alphaPromise = fetch(chrome.runtime.getURL("alpha.json"))
  .then(r => r.json())
  .then(obj => +obj.alpha || 0.5)
  .catch(() => 0.5);                         // fallback if file missing

// Cache last verdict per tab so popup can query it
const lastVerdict = new Map();                // key = tabId → { label, probability }

// Helper to turn p into label for banner / icon
function toLabel(p) {
  if (p >= 0.71) return "Phishing";
  if (p < 0.71) return "Safe";
  return "not sure";
}

/* ─────────────────────────  Main message router  ───────────────────────── */
chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
  /* 1️⃣  Content script sends features → run the models */
  if (msg.type === "EXTRACT") {
    const { tab }   = sender;
    const { urlF, domF } = msg.payload;

    Promise.all([urlModelP, domModelP, alphaPromise]).then(([ , , α ]) => {
      // URL model (always succeeds)
      const pUrl = predictURL(urlF);

      // DOM model (may fail if domF === null or model error)
      let pDom = 0.55;                      // neutral fallback
      try {
        if (domF) pDom = predictDOM(domF);
      } catch (e) {
        console.warn("DOM prediction failed:", e);
      }

      // Weighted average
      const pFinal = α * pUrl + (1 - α) * pDom;
      const payload = {
        label       : toLabel(pFinal),
        probability : pFinal,   // combined
        pUrl,                   // URL-model probability
        pDom                    // DOM-model probability (0.5 if fallback)
      };

      // Cache for popup
      if (tab?.id !== undefined) lastVerdict.set(tab.id, payload);

      // Send to content script for console / banner
      chrome.tabs.sendMessage(tab.id, { type: "RESULT", payload });
    });

    return true;                           // keep port open for async
  }

  /* 2️⃣  Popup asks for last verdict */
  if (msg.type === "getVerdict") {
    sendResp(lastVerdict.get(msg.tabId) || { label: "UNKNOWN", probability: 0 });
  }
});
