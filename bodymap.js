// Muscle map: front and back body outlines (bodymap-data.js) with the muscles an
// exercise works lit up. The muscles come from the "Works" line in guide.js —
// the first muscle listed is the main one, the rest are lit more faintly.

const MUSCLE_WORDS = [
  [/chest/, ["chest"]],
  [/shoulder|delt|rotator/, ["deltoids"]],
  [/tricep/, ["triceps"]],
  [/bicep/, ["biceps"]],
  [/forearm|brachialis/, ["forearm"]],
  [/\blats?\b|upper back|mid back|^back/, ["upper-back"]],
  [/trap/, ["trapezius"]],
  [/lower back/, ["lower-back"]],
  [/oblique/, ["obliques"]],
  [/core/, ["abs", "obliques"]],
  [/\babs\b/, ["abs"]],
  [/quad/, ["quadriceps"]],
  [/glute/, ["gluteal"]],
  [/hamstring/, ["hamstring"]],
  [/calves|calf/, ["calves"]],
  [/hip flexor/, ["hip-flexors"]],
];

// Body parts that are outline only and never light up.
const INERT_PARTS = new Set(["head", "hair", "neck", "hands", "knees", "ankles", "feet", "tibialis"]);

// "Lats, upper back, biceps" -> { "upper-back": 1, biceps: 0.5 }
function musclesFromText(text) {
  const out = {};
  (text || "").toLowerCase().split(",").forEach((part, i) => {
    const level = i === 0 ? 1 : 0.5;
    MUSCLE_WORDS.forEach(([re, keys]) => {
      if (re.test(part.trim())) keys.forEach((k) => { out[k] = Math.max(out[k] || 0, level); });
    });
  });
  return out;
}

function bodyMap(levels, cls) {
  if (!levels || !Object.keys(levels).length) return "";
  const view = (side) => Object.entries(BODY[side].p).map(([part, paths]) => {
    const lvl = levels[part];
    const c = INERT_PARTS.has(part) ? "bm-inert" : lvl >= 1 ? "bm-hot" : lvl ? "bm-warm" : "bm-off";
    return `<path class="${c}" d="${paths.join(" ")}"/>`;
  }).join("");
  // The back view's coordinates sit to the right of the front view's.
  return `<svg class="bodymap ${cls || ""}" viewBox="0 95 1445 1280" role="img" aria-label="Muscles worked">${view("front")}${view("back")}</svg>`;
}
