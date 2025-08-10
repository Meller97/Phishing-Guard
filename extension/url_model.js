// url_model.js

// Hard-coded feature ordering matching your extractFeatures logic
const FEATURE_NAMES = [
  "have_ip",
  "have_at",
  "url_length",
  "url_depth",
  "redirection",
  "https_in_domain",
  "tiny_url",
  "prefix_suffix",
  "suspicious_words",
  "has_subdomain",
  "digit_count",
  "special_char_count"
];

let xgbModel = null;
const LOW_THRESH  = 0.65;
const HIGH_THRESH = 0.65;

// 1) Load and locate the array of trees from your internal JSON model
export const modelPromise = fetch(chrome.runtime.getURL("url_model_long.json"))
  .then(r => r.json())
  .then(m => {
    // model structure: m.learner.gradient_booster.model.trees -> array of tree objects
    const trees = m?.learner?.gradient_booster?.model?.trees;
    if (!Array.isArray(trees)) {
      console.error("❌ Could not find trees array in url_model_long.json");
      xgbModel = [];
    } else {
      console.log(`✅ Loaded ${trees.length} trees`);
      xgbModel = trees;
    }
    return xgbModel;
  })
  .catch(err => {
    console.error("Failed to load url_model_long.json", err);
    xgbModel = [];
    return xgbModel;
  });

// 2) Evaluate a single tree in the flat, internal XGBoost format
function evalTreeFlat(tree, feats, nodeId = 0) {
  // child pointers
  const left  = tree.left_children[nodeId];
  const right = tree.right_children[nodeId];

  // leaf if no children
  if (left < 0 && right < 0) {
    return tree.base_weights[nodeId];
  }

  // decision node
  const splitIdx   = tree.split_indices[nodeId];
  const splitCond  = tree.split_conditions[nodeId];
  const defaultLeft= Boolean(tree.default_left[nodeId]);
  const featureKey = FEATURE_NAMES[splitIdx];
  const fval       = feats[featureKey];

  // missing goes to default branch
  const goLeft = (fval === undefined || fval === null)
    ? defaultLeft
    : (fval < splitCond);

  const nextId = goLeft ? left : right;
  return evalTreeFlat(tree, feats, nextId);
}

// 3) Sum all tree outputs and apply logistic
export function predict(feats) {
  let score = 0;
  for (const tree of xgbModel) {
    score += evalTreeFlat(tree, feats, 0);
  }
  return 1 / (1 + Math.exp(-score));
}

// 4) Bucket probability into labels exactly like your notebook logic
export function predictLabel(feats) {
  const p = predict(feats);
  if (p >= HIGH_THRESH)   return { label: "page : Phishing",   probability: p };
  if (p <= LOW_THRESH)    return { label: "page : Safe",   probability: p };
  return                    { label: "not sure", probability: p };
}
