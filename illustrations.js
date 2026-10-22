// Animated stick-figure illustrations. Each art has a start pose (a) and a finish
// pose (b); the figure loops between them. Joints are [x, y] in a 200×200 box,
// floor at y=192. Keys: h head, s shoulder, p hip, e/w elbow/wrist, k/f knee/foot,
// e2/w2/k2/f2 the other arm/leg. Pose b only lists joints that move.
//
// Props: { post: x, pulley: y }   cable column with a pulley
//        { pulley: [x, y] }       pulley on its own (e.g. under a bench)
//        { cable: [x, y], to: "w" } cable from a pulley to a joint (moves with it)
//        { pad: [[x, y], ...] }   bench pad; { legs: [[x, y], ...] } legs down to the floor
//        { hbar: [x1, x2, y] }    horizontal bar (pull-up / dip bar), { bar: [x, y] } bar end-on
//        { grip: "w" }            handle in the hand

const P = (x, y) => [x, y];

const ART = {
  pushdown: {
    props: [{ post: 36, pulley: 22 }, { cable: [36, 22], to: "w" }, { grip: "w" }],
    a: { h: P(88, 48), s: P(92, 63), p: P(98, 114), e: P(96, 92), w: P(72, 78), k: P(100, 152), f: P(100, 190) },
    b: { w: P(96, 120) },
  },
  overhead: {
    props: [{ post: 30, pulley: 182 }, { cable: [30, 182], to: "w" }, { grip: "w" }],
    a: { h: P(118, 50), s: P(112, 64), p: P(100, 112), e: P(120, 36), w: P(96, 50), k: P(112, 150), f: P(124, 190), k2: P(92, 150), f2: P(78, 190) },
    b: { w: P(136, 12) },
  },
  curl: {
    props: [{ post: 36, pulley: 182 }, { cable: [36, 182], to: "w" }, { grip: "w" }],
    a: { h: P(98, 46), s: P(100, 62), p: P(100, 114), e: P(100, 92), w: P(94, 120), k: P(100, 152), f: P(100, 190) },
    b: { w: P(80, 70) },
  },
  bayesian: {
    props: [{ post: 172, pulley: 182 }, { cable: [172, 182], to: "w" }, { grip: "w" }],
    a: { h: P(92, 47), s: P(96, 62), p: P(100, 114), e: P(112, 88), w: P(124, 112), k: P(96, 152), f: P(90, 190), k2: P(108, 152), f2: P(118, 190) },
    b: { w: P(100, 62) },
  },
  highcurl: {
    front: true,
    props: [{ post: 18, pulley: 40 }, { post: 182, pulley: 40 }, { cable: [18, 40], to: "w" }, { cable: [182, 40], to: "w2" }, { grip: "w" }, { grip: "w2" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(72, 54), w: P(44, 48), e2: P(128, 54), w2: P(156, 48), k: P(90, 152), f: P(86, 190), k2: P(110, 152), f2: P(114, 190) },
    b: { w: P(90, 38), w2: P(110, 38) },
  },
  pulldown: {
    props: [{ post: 40, pulley: 16 }, { cable: [40, 16], to: "w" }, { grip: "w" }],
    a: { h: P(86, 84), s: P(88, 100), p: P(94, 150), e: P(80, 72), w: P(72, 44), k: P(92, 188), f: P(128, 190) },
    b: { e: P(100, 125), w: P(86, 100) },
  },
  row: {
    props: [{ post: 28, pulley: 178 }, { cable: [28, 178], to: "w" }, { grip: "w" }, { hbar: [46, 58, 186] }],
    a: { h: P(104, 115), s: P(110, 130), p: P(120, 180), e: P(96, 140), w: P(70, 148), k: P(88, 162), f: P(56, 184) },
    b: { h: P(124, 112), s: P(122, 128), e: P(146, 140), w: P(120, 152) },
  },
  onearmrow: {
    props: [{ post: 28, pulley: 96 }, { cable: [28, 96], to: "w" }, { grip: "w" }],
    a: { h: P(100, 49), s: P(104, 64), p: P(106, 114), e: P(80, 78), w: P(54, 88), k: P(100, 152), f: P(92, 190), k2: P(114, 152), f2: P(124, 190) },
    b: { e: P(128, 84), w: P(104, 84) },
  },
  straightarm: {
    props: [{ post: 30, pulley: 22 }, { cable: [30, 22], to: "w" }, { grip: "w" }],
    a: { h: P(90, 52), s: P(96, 66), p: P(104, 114), e: P(76, 46), w: P(58, 28), k: P(102, 152), f: P(100, 190) },
    b: { e: P(98, 94), w: P(100, 122) },
  },
  facepull: {
    props: [{ post: 28, pulley: 54 }, { cable: [28, 54], to: "w" }, { grip: "w" }],
    a: { h: P(102, 48), s: P(104, 64), p: P(104, 114), e: P(78, 62), w: P(52, 58), k: P(104, 152), f: P(104, 190) },
    b: { e: P(128, 56), w: P(100, 42) },
  },
  fly: {
    front: true,
    props: [{ post: 18, pulley: 66 }, { post: 182, pulley: 66 }, { cable: [18, 66], to: "w" }, { cable: [182, 66], to: "w2" }, { grip: "w" }, { grip: "w2" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(74, 66), w: P(48, 70), e2: P(126, 66), w2: P(152, 70), k: P(90, 152), f: P(86, 190), k2: P(110, 152), f2: P(114, 190) },
    b: { e: P(80, 78), w: P(97, 82), e2: P(120, 78), w2: P(103, 82) },
  },
  lowhigh: {
    front: true,
    props: [{ post: 18, pulley: 180 }, { post: 182, pulley: 180 }, { cable: [18, 180], to: "w" }, { cable: [182, 180], to: "w2" }, { grip: "w" }, { grip: "w2" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(78, 84), w: P(60, 108), e2: P(122, 84), w2: P(140, 108), k: P(90, 152), f: P(86, 190), k2: P(110, 152), f2: P(114, 190) },
    b: { e: P(84, 56), w: P(97, 34), e2: P(116, 56), w2: P(103, 34) },
  },
  reversefly: {
    front: true,
    props: [{ post: 18, pulley: 62 }, { post: 182, pulley: 62 }, { cable: [18, 62], to: "w" }, { cable: [182, 62], to: "w2" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(112, 68), w: P(128, 78), e2: P(88, 68), w2: P(72, 78), k: P(90, 152), f: P(86, 190), k2: P(110, 152), f2: P(114, 190) },
    b: { e: P(128, 62), w: P(156, 62), e2: P(72, 62), w2: P(44, 62) },
  },
  bench: {
    props: [{ pad: [P(46, 154), P(150, 154)] }, { legs: [P(60, 156), P(136, 156)] }, { pulley: [92, 186] }, { cable: [92, 186], to: "w" }, { grip: "w" }],
    a: { h: P(56, 138), s: P(72, 144), p: P(124, 144), e: P(84, 166), w: P(84, 138), k: P(160, 146), f: P(164, 190) },
    b: { e: P(74, 116), w: P(76, 88) },
  },
  incline: {
    props: [{ pad: [P(124, 152), P(92, 152), P(56, 98)] }, { legs: [P(118, 154), P(92, 154)] }, { pulley: [94, 186] }, { cable: [94, 186], to: "w" }, { grip: "w" }],
    a: { h: P(56, 84), s: P(66, 98), p: P(96, 144), e: P(76, 124), w: P(84, 98), k: P(130, 140), f: P(136, 190) },
    b: { e: P(90, 83), w: P(113, 67) },
  },
  kickback: {
    props: [{ post: 30, pulley: 182 }, { cable: [30, 182], to: "w" }, { grip: "w" }],
    a: { h: P(64, 84), s: P(78, 92), p: P(120, 112), e: P(106, 98), w: P(106, 126), k: P(118, 150), f: P(116, 190), k2: P(106, 152), f2: P(96, 190) },
    b: { w: P(134, 104) },
  },
  dips: {
    props: [{ hbar: [60, 118, 104] }, { legs: [P(64, 106)] }],
    a: { h: P(94, 38), s: P(100, 52), p: P(104, 104), e: P(94, 78), w: P(90, 104), k: P(110, 140), f: P(132, 148) },
    b: { h: P(84, 66), s: P(92, 80), p: P(100, 130), e: P(114, 90), k: P(108, 164), f: P(132, 172) },
  },
  pushup: {
    a: { h: P(46, 130), s: P(60, 138), p: P(112, 154), e: P(60, 164), w: P(60, 190), k: P(140, 170), f: P(168, 186) },
    b: { h: P(40, 166), s: P(56, 170), p: P(110, 178), e: P(80, 176), k: P(138, 184) },
  },
  pushupfeetup: {
    props: [{ pad: [P(150, 152), P(194, 152)] }, { legs: [P(156, 154), P(188, 154)] }],
    a: { h: P(46, 128), s: P(60, 138), p: P(112, 142), e: P(60, 164), w: P(60, 190), k: P(140, 144), f: P(166, 146) },
    b: { h: P(40, 166), s: P(56, 170), p: P(110, 162), e: P(80, 176), k: P(138, 154) },
  },
  pullup: {
    props: [{ hbar: [70, 140, 30] }],
    a: { h: P(94, 72), s: P(100, 86), p: P(100, 138), e: P(104, 58), w: P(106, 30), k: P(106, 172), f: P(124, 182) },
    b: { h: P(94, 24), s: P(100, 40), p: P(102, 92), e: P(124, 46), k: P(108, 126), f: P(126, 136) },
  },
  invrow: {
    props: [{ bar: [60, 110] }, { post: 40 }],
    a: { h: P(44, 168), s: P(58, 164), p: P(110, 174), e: P(59, 137), w: P(60, 110), k: P(146, 182), f: P(182, 188) },
    b: { h: P(48, 118), s: P(62, 124), p: P(112, 152), e: P(86, 128), k: P(148, 170) },
  },
  shrug: {
    props: [{ post: 36, pulley: 182 }, { cable: [36, 182], to: "w" }, { grip: "w" }],
    a: { h: P(98, 48), s: P(100, 64), p: P(100, 114), e: P(100, 92), w: P(100, 120), k: P(100, 152), f: P(100, 190) },
    b: { h: P(98, 40), s: P(100, 56), e: P(100, 84), w: P(100, 112) },
  },
  goblet: {
    props: [{ post: 30, pulley: 182 }, { cable: [30, 182], to: "w" }, { grip: "w" }],
    a: { h: P(100, 46), s: P(104, 62), p: P(104, 114), e: P(96, 86), w: P(88, 66), k: P(104, 152), f: P(104, 190) },
    b: { h: P(92, 89), s: P(100, 104), p: P(118, 150), e: P(84, 126), w: P(82, 104), k: P(84, 152) },
  },
  ohp: {
    props: [{ pad: [P(76, 150), P(124, 150), P(120, 84)] }, { legs: [P(82, 152), P(118, 152)] }, { pulley: [100, 186] }, { cable: [100, 186], to: "w" }, { grip: "w" }],
    a: { h: P(108, 74), s: P(110, 90), p: P(112, 142), e: P(98, 114), w: P(96, 88), k: P(78, 146), f: P(76, 190) },
    b: { e: P(106, 63), w: P(104, 36) },
  },
  rdl: {
    props: [{ post: 30, pulley: 182 }, { cable: [30, 182], to: "w" }, { grip: "w" }],
    a: { h: P(98, 48), s: P(102, 64), p: P(104, 114), e: P(102, 92), w: P(102, 120), k: P(104, 152), f: P(104, 190) },
    b: { h: P(60, 88), s: P(74, 96), p: P(122, 114), e: P(74, 124), w: P(74, 152), k: P(112, 152), f: P(106, 190) },
  },
  lateral: {
    front: true,
    props: [{ post: 182, pulley: 182 }, { cable: [182, 182], to: "w" }, { grip: "w" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(92, 88), w: P(98, 114), e2: P(110, 88), w2: P(114, 114), k: P(90, 152), f: P(86, 190), k2: P(110, 152), f2: P(114, 190) },
    b: { e: P(74, 58), w: P(46, 58) },
  },
  glutekick: {
    props: [{ post: 36, pulley: 182 }, { cable: [36, 182], to: "f" }],
    a: { h: P(82, 52), s: P(90, 66), p: P(100, 114), e: P(66, 78), w: P(42, 84), k: P(104, 152), f: P(106, 188), k2: P(100, 152), f2: P(100, 190) },
    b: { k: P(134, 132), f: P(166, 140) },
  },
  abduction: {
    front: true,
    props: [{ post: 162, pulley: 184 }, { cable: [162, 184], to: "f" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(90, 88), w: P(88, 114), e2: P(126, 72), w2: P(154, 82), k: P(98, 152), f: P(102, 188), k2: P(110, 152), f2: P(114, 190) },
    b: { k: P(78, 148), f: P(58, 178) },
  },
  pullthrough: {
    props: [{ post: 28, pulley: 182 }, { cable: [28, 182], to: "w" }, { grip: "w" }],
    a: { h: P(148, 82), s: P(134, 90), p: P(88, 112), e: P(126, 116), w: P(110, 140), k: P(100, 152), f: P(106, 190) },
    b: { h: P(110, 44), s: P(108, 60), p: P(106, 112), e: P(108, 88), w: P(110, 116), k: P(106, 152) },
  },
  hipthrust: {
    props: [{ pad: [P(18, 138), P(70, 138)] }, { legs: [P(24, 140), P(64, 140)] }],
    a: { h: P(52, 126), s: P(66, 132), p: P(96, 170), e: P(46, 136), w: P(26, 134), k: P(132, 150), f: P(138, 190), k2: P(130, 156), f2: P(166, 148) },
    b: { p: P(104, 138), k: P(138, 140), k2: P(140, 128), f2: P(176, 118) },
  },
  stepup: {
    props: [{ pad: [P(36, 160), P(100, 160)] }, { legs: [P(42, 162), P(94, 162)] }],
    a: { h: P(114, 44), s: P(116, 60), p: P(118, 112), e: P(118, 88), w: P(120, 114), k: P(90, 124), f: P(80, 158), k2: P(122, 152), f2: P(126, 190) },
    b: { h: P(78, 16), s: P(80, 32), p: P(82, 82), e: P(82, 60), w: P(84, 88), k: P(82, 120), k2: P(98, 118), f2: P(110, 150) },
  },
  calf: {
    props: [{ post: 36, pulley: 182 }, { cable: [36, 182], to: "w" }, { grip: "w" }],
    a: { h: P(98, 50), s: P(100, 66), p: P(100, 116), e: P(100, 94), w: P(100, 120), k: P(100, 154), f: P(100, 190) },
    b: { h: P(98, 40), s: P(100, 56), p: P(100, 106), e: P(100, 84), w: P(100, 110), k: P(100, 144) },
  },
  split: {
    props: [{ pad: [P(132, 150), P(194, 150)] }, { legs: [P(138, 152), P(188, 152)] }, { post: 30, pulley: 184 }, { cable: [30, 184], to: "w" }, { grip: "w" }],
    a: { h: P(96, 40), s: P(100, 56), p: P(104, 108), e: P(100, 84), w: P(100, 112), k: P(92, 146), f: P(84, 190), k2: P(126, 138), f2: P(152, 146) },
    b: { h: P(98, 68), s: P(102, 84), p: P(108, 136), e: P(102, 112), w: P(102, 140), k: P(76, 150), f: P(80, 190), k2: P(118, 176) },
  },
  crunch: {
    props: [{ post: 36, pulley: 20 }, { cable: [36, 20], to: "w" }, { grip: "w" }],
    a: { h: P(94, 84), s: P(100, 100), p: P(112, 150), e: P(84, 110), w: P(88, 86), k: P(110, 188), f: P(146, 190) },
    b: { h: P(58, 126), s: P(72, 136), p: P(112, 150), e: P(70, 160), w: P(62, 138) },
  },
  kneeraise: {
    props: [{ hbar: [72, 128, 100] }, { legs: [P(124, 102)] }],
    a: { h: P(96, 32), s: P(100, 48), p: P(102, 100), e: P(94, 74), w: P(90, 100), k: P(102, 138), f: P(102, 176) },
    b: { k: P(66, 98), f: P(64, 136) },
  },
  woodchop: {
    front: true,
    props: [{ post: 182, pulley: 28 }, { cable: [182, 28], to: "w" }, { grip: "w" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(124, 50), w: P(148, 38), e2: P(120, 56), w2: P(146, 42), k: P(86, 152), f: P(78, 190), k2: P(114, 152), f2: P(122, 190) },
    b: { e: P(82, 88), w: P(64, 110), e2: P(84, 92), w2: P(66, 114) },
  },
  pallof: {
    front: true,
    props: [{ post: 18, pulley: 84 }, { cable: [18, 84], to: "w" }, { grip: "w" }],
    a: { h: P(100, 44), s: P(100, 60), p: P(100, 114), e: P(86, 86), w: P(100, 80), e2: P(114, 86), w2: P(100, 80), k: P(88, 152), f: P(82, 190), k2: P(112, 152), f2: P(118, 190) },
    b: { e: P(94, 76), w: P(100, 70), e2: P(106, 76), w2: P(100, 70) },
  },
  situp: {
    props: [{ pad: [P(34, 172), P(140, 140)] }, { legs: [P(46, 172), P(130, 144)] }, { bar: [152, 130] }],
    a: { h: P(42, 166), s: P(58, 162), p: P(108, 148), e: P(74, 152), w: P(62, 146), k: P(134, 126), f: P(154, 136) },
    b: { h: P(78, 86), s: P(86, 100), e: P(98, 124), w: P(86, 114) },
  },
  lunge: {
    props: [{ post: 30, pulley: 184 }, { cable: [30, 184], to: "w" }, { grip: "w" }],
    a: { h: P(98, 48), s: P(102, 64), p: P(104, 114), e: P(102, 92), w: P(102, 120), k: P(102, 152), f: P(100, 190), k2: P(106, 152), f2: P(106, 190) },
    b: { h: P(98, 72), s: P(102, 88), p: P(104, 140), e: P(102, 116), w: P(102, 144), k: P(72, 152), f: P(76, 190), k2: P(128, 178), f2: P(160, 188) },
  },
  preacher: {
    props: [{ pad: [P(30, 150), P(96, 150), P(70, 98)] }, { legs: [P(36, 152), P(90, 152)] }, { post: 14, pulley: 184 }, { cable: [14, 184], to: "w" }, { grip: "w" }],
    a: { h: P(84, 88), s: P(90, 104), p: P(118, 150), e: P(68, 124), w: P(52, 148), k: P(120, 188), f: P(156, 190) },
    b: { w: P(80, 100) },
  },
  standing: {
    a: { h: P(98, 46), s: P(100, 62), p: P(100, 114), e: P(96, 90), w: P(92, 118), e2: P(104, 90), w2: P(108, 118), k: P(94, 152), f: P(92, 190), k2: P(106, 152), f2: P(108, 190) },
    b: {},
  },
};

function renderArt(key) {
  const art = ART[key] || ART.standing;
  const A = art.a, B = { ...art.a, ...art.b };
  const still = !art.b || !Object.keys(art.b).length ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const anim = (attr, va, vb) => (still || va === vb) ? "" :
    `<animate attributeName="${attr}" values="${va};${vb};${va}" keyTimes="0;0.5;1" dur="3.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`;
  const pts = (pose, keys) => keys.map((k) => pose[k].join(",")).join(" ");
  // edge: draw a background-coloured outline first so limbs stay readable where they cross the body
  const poly = (keys, cls, edge) => {
    if (!keys.every((k) => A[k])) return "";
    const pa = pts(A, keys), pb = pts(B, keys), a = anim("points", pa, pb);
    return (edge ? `<polyline class="edge" points="${pa}">${a}</polyline>` : "") + `<polyline class="${cls}" points="${pa}">${a}</polyline>`;
  };
  const dot = (key, r, cls) => `<circle class="${cls}" r="${r}" cx="${A[key][0]}" cy="${A[key][1]}">${anim("cx", A[key][0], B[key][0])}${anim("cy", A[key][1], B[key][1])}</circle>`;
  const far = art.front ? "limb" : "limb far";

  let back = "", fore = "";
  (art.props || []).forEach((pr) => {
    if (pr.post != null) {
      back += `<rect class="post" x="${pr.post - 5}" y="8" width="10" height="184" rx="2"/>`;
      if (pr.pulley != null) back += `<circle class="pulley" cx="${pr.post}" cy="${pr.pulley}" r="6"/>`;
    } else if (pr.pulley) {
      back += `<circle class="pulley" cx="${pr.pulley[0]}" cy="${pr.pulley[1]}" r="6"/>`;
    }
    if (pr.cable) {
      const [x, y] = pr.cable, k = pr.to || "w";
      const la = `${x},${y} ${A[k].join(",")}`, lb = `${x},${y} ${B[k].join(",")}`;
      back += `<polyline class="cable" points="${la}">${anim("points", la, lb)}</polyline>`;
    }
    if (pr.pad) back += `<polyline class="pad" points="${pr.pad.map((p) => p.join(",")).join(" ")}"/>`;
    if (pr.legs) pr.legs.forEach(([x, y]) => { back += `<line class="prop" x1="${x}" y1="${y}" x2="${x}" y2="192"/>`; });
    if (pr.hbar) back += `<line class="bar" x1="${pr.hbar[0]}" y1="${pr.hbar[2]}" x2="${pr.hbar[1]}" y2="${pr.hbar[2]}"/>`;
    if (pr.bar) fore += `<circle class="barend" cx="${pr.bar[0]}" cy="${pr.bar[1]}" r="6"/>`;
    if (pr.grip) fore += dot(pr.grip, 5, "grip");
  });

  return `<svg class="art" viewBox="0 0 200 200" role="img" aria-label="Illustration of the movement">
    <line class="floor" x1="0" y1="192" x2="200" y2="192"/>
    ${back}
    ${poly(["p", "k2", "f2"], far)}${poly(["s", "e2", "w2"], far)}
    ${poly(["p", "k", "f"], "limb")}${poly(["s", "p"], "limb")}${poly(["s", "e", "w"], "limb", true)}
    ${dot("s", 3.5, "joint")}
    ${dot("h", 10, "head")}
    ${fore}
  </svg>`;
}
