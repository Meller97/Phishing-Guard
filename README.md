# Phishing Guard 🛡️
Multi-Layered Phishing Detection Algorithm as a Browser Extension

![Logo](assets/antiPhish.png)
---

## 📌 Overview
Phishing Guard is a Chromium-based browser extension that detects phishing websites in real-time.  
It uses a **two-layer detection system**:
1. **URL-based model** – lexical and host-based features.
2. **HTML content-based model** – DOM structure, form analysis, and suspicious elements.

Both models are trained on ~80,000 balanced examples from multiple sources (PhishTank and legitimate sites) and combined in a **weighted ensemble** for optimal performance.

---

## 🎯 Key Features
- **Client-side detection** — No data leaves the user’s browser.
- **Dual-model system** — URL and HTML analysis.
- **Real-time scanning** — Evaluates pages within milliseconds.
- **Privacy-focused** — No user data collection.
- **Lightweight integration** — Minimal resource usage.

---

## 📊 Results
| Model Type       | Accuracy | TPR     | FPR     | Weighted F1 |
|------------------|----------|---------|---------|-------------|
| URL Model        | 0.876    | 0.869   | 0.102   | 0.881       |
| HTML Model       | 0.988    | 0.983   | 0.007   | 0.987       |

**Final Ensemble:**  
- **70% HTML model** + **30% URL model**
- Threshold = **0.71** for phishing alert
- Balanced recall and precision, reduced false positives

---

## ⚙️ How It Works
1. **Data Collection**
   - ~40,000 phishing URLs and pages from PhishTank
   - ~40,000 legitimate URLs from multiple trusted sources
   - No domain overlap between training and test sets

2. **Feature Extraction**
   - **URL Model:** IP presence, `@` symbol, URL length, depth, HTTPS flag, suspicious keywords, hyphen usage, digit count, redirect count, TinyURL flag.
   - **HTML Model:** Password fields, external form actions, external link ratios, empty/dummy links, iframe presence, onMouseOver scripts, right-click blocking, DOM depth, suspicious text keywords, external image/scripts ratio.

3. **Model Training**
   - **Algorithm:** XGBoost
   - Exported to JSON for in-browser inference
   - HTML model weighted higher due to superior accuracy

4. **Ensemble Decision**
   - Weighted average score
   - Alert shown if score > 0.71
---
