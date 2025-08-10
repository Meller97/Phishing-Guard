/* popup.js */
(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return showError("No active tab");

    const tabId = tabs[0].id;
    chrome.runtime.sendMessage(
      { type: 'getVerdict', tabId },
      (resp) => {
        if (chrome.runtime.lastError) return showError("Could not get verdict");

        const { label, probability, pUrl, pDom } = resp;
        const verdictEl     = document.getElementById('verdict');
        const probabilityEl = document.getElementById('probability');
        const reasonEl      = document.getElementById('reason');

        // 1) Verdict
        verdictEl.textContent = label.toUpperCase();
        verdictEl.className   = label.toUpperCase() || 'UNKNOWN';

        // 2) Combined probability
        probabilityEl.textContent =
          `Combined: ${(probability * 100).toFixed(1)} %`;

        // 3) Breakdown
        reasonEl.innerText =
          `URL model : ${(pUrl  * 100).toFixed(1)} %\n` +
          `DOM model : ${(pDom  * 100).toFixed(1)} %`;

      }
    );
  });

  function showError(msg) {
    const el = document.getElementById('verdict');
    el.textContent = `Error: ${msg}`;
    el.className   = 'ERROR';
  }
})();
