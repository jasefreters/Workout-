// Garage Gym — workout tracker. All data is stored in this browser (localStorage).

const STORE_KEY = "garage-gym-v1";
const app = document.getElementById("app");
const personSelect = document.getElementById("person");

// ---------- data ----------

const EXERCISES = {};
DAYS.forEach((d) => d.exercises.forEach((ex) => { EXERCISES[ex.id] = { ...ex, dayId: d.id }; }));

// Built-in exercise or one the user added themselves.
const getEx = (id) => EXERCISES[id] || state.custom.find((c) => c.id === id);
const dayExercises = (dayId) => dayById(dayId).exercises.concat(state.custom.filter((c) => c.dayId === dayId));

// Exercises repeated on Day 4 share history with the original.
const keyOf = (exId) => (getEx(exId) && getEx(exId).sameAs) || exId;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.people)) return { custom: [], ...s };
  } catch (e) { /* fall through */ }
  return { people: ["Me"], person: "Me", sessions: [], picks: {}, active: null, custom: [] };
}
let state = load();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { alert("Couldn't save — storage may be full or blocked."); }
}

const mySessions = () => state.sessions.filter((s) => s.person === state.person);

// All logged entries for an exercise, oldest first: [{date, sets}]
function historyFor(key) {
  const out = [];
  mySessions()
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((s) => s.entries.forEach((e) => {
      if (keyOf(e.exId) === key && e.sets.length) out.push({ date: s.date, sets: e.sets, sessionId: s.id });
    }));
  return out;
}
const topSet = (sets) => sets.reduce((b, s) => (!b || s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps) ? s : b), null);
function bestEver(key) {
  let best = null;
  historyFor(key).forEach((h) => { const t = topSet(h.sets); if (!best || t.kg > best.kg || (t.kg === best.kg && t.reps > best.reps)) best = { ...t, date: h.date }; });
  return best;
}
const lastFor = (key) => { const h = historyFor(key); return h[h.length - 1] || null; };

// Suggest going up when every set last time hit the top of the rep range.
function suggestion(ex) {
  const last = lastFor(keyOf(ex.id));
  if (!last) return null;
  const top = topSet(last.sets);
  if (last.sets.every((s) => s.reps >= ex.reps[1]) && last.sets.length >= 2) {
    if (ex.type === "bw") return { kg: top.kg, text: "Hit all reps last time — add reps or slow the lowering" };
    const kg = round(top.kg + TYPE_INFO[ex.type].step);
    return { kg, text: `Hit all reps last time — go up to ${kgLabel(ex, kg)}` };
  }
  return null;
}

// ---------- helpers ----------

const round = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDate = (iso) => new Date(iso + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const kgLabel = (ex, kg) => (ex.type === "bw" ? (kg ? `BW +${kg}kg` : "BW") : `${kg}kg`);
const setsText = (ex, sets) => {
  const kgs = [...new Set(sets.map((s) => s.kg))];
  if (kgs.length === 1) return `${kgLabel(ex, kgs[0])} × ${sets.map((s) => s.reps).join(", ")}`;
  return sets.map((s) => `${kgLabel(ex, s.kg)}×${s.reps}`).join(", ");
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function lastLine(ex) {
  const key = keyOf(ex.id);
  const last = lastFor(key);
  if (!last) return `<div class="last">Not done yet</div>`;
  const best = bestEver(key);
  const sug = suggestion(ex);
  return `<div class="last">Last (${fmtDate(last.date)}): <b>${esc(setsText(ex, last.sets))}</b>
    · Best: <b>${esc(kgLabel(ex, best.kg))} × ${best.reps}</b>
    ${sug ? `<br><span class="up">↑ ${esc(sug.text)}</span>` : ""}</div>`;
}

// ---------- views ----------

function viewHome() {
  const active = state.active && state.active.person === state.person ? state.active : null;
  const lastByDay = {};
  mySessions().forEach((s) => { if (!lastByDay[s.dayId] || s.date > lastByDay[s.dayId]) lastByDay[s.dayId] = s.date; });
  return `
    <h1>Hey ${esc(state.person)} 👋</h1>
    <p class="sub">Pick today's session.</p>
    ${active ? `<a class="card day-card" href="#/workout" style="border-color:var(--accent)">
        <div class="day">In progress</div>
        <div class="title">${esc(dayById(active.dayId).title)}</div>
        <div class="muted small">Tap to carry on</div></a>` : ""}
    ${DAYS.map((d) => `
      <a class="card day-card" href="#/day/${d.id}">
        <div class="day">${d.name}</div>
        <div class="title">${d.title}</div>
        <div class="muted small">${dayExercises(d.id).length} exercises to choose from
          · ${lastByDay[d.id] ? "last done " + fmtDate(lastByDay[d.id]) : "not done yet"}</div>
      </a>`).join("")}
    <h2>Backup</h2>
    <div class="card stack">
      <div class="muted small">Your data lives on this device only. Export a backup now and then, or to move it to another phone.</div>
      <div class="row">
        <button class="btn grow" data-action="export">Export backup</button>
        <label class="btn grow">Import backup<input type="file" accept=".json,application/json" data-action="import" hidden></label>
      </div>
    </div>`;
}

const dayById = (id) => DAYS.find((d) => d.id === id);

function picksFor(dayId) {
  const k = state.person + "|" + dayId;
  if (!state.picks[k]) state.picks[k] = dayExercises(dayId).slice(0, 5).map((e) => e.id);
  return state.picks[k];
}

function viewDay(dayId) {
  const day = dayById(dayId);
  if (!day) return viewHome();
  const picks = picksFor(dayId);
  return `
    <a href="#/" class="muted small">← Back</a>
    <h1>${day.title}</h1>
    <p class="sub">Tick the exercises you want to do today (5 is a good number).</p>
    ${dayExercises(dayId).map((ex) => `
      <div class="card pick ${picks.includes(ex.id) ? "on" : ""}">
        <label class="pick-main">
          <input type="checkbox" data-action="pick" data-day="${dayId}" data-ex="${ex.id}" ${picks.includes(ex.id) ? "checked" : ""}>
          <div class="grow">
            <div class="name">${esc(ex.name)}</div>
            <div><span class="tag">${TYPE_INFO[ex.type].label}</span><span class="tag">${ex.sets} × ${ex.reps[0]}–${ex.reps[1]}</span>${ex.custom ? `<span class="tag">Your own</span>` : ""}</div>
            ${lastLine(ex)}
          </div>
        </label>
        ${infoBtn(ex)}
      </div>`).join("")}
    <button class="btn block dashed" data-action="custom-new" data-day="${dayId}">+ Add your own exercise</button>
    <div class="sticky-foot"><div>
      <button class="btn primary block" data-action="start" data-day="${dayId}" ${picks.length ? "" : "disabled"}>
        Start workout (${picks.length} exercise${picks.length === 1 ? "" : "s"})
      </button></div></div>`;
}

function startWorkout(dayId) {
  if (state.active && state.active.person === state.person && !confirm("You have a workout in progress. Replace it?")) return;
  const picks = picksFor(dayId);
  const entries = dayExercises(dayId).filter((ex) => picks.includes(ex.id)).map((ex) => {
    const last = lastFor(keyOf(ex.id));
    const sug = suggestion(ex);
    let sets;
    if (last) {
      sets = last.sets.map((s) => ({ kg: sug ? sug.kg : s.kg, reps: s.reps, done: false }));
    } else {
      sets = Array.from({ length: ex.sets }, () => ({ kg: ex.type === "bw" ? 0 : "", reps: "", done: false }));
    }
    return { exId: ex.id, sets };
  });
  state.active = { person: state.person, dayId, date: today(), entries };
  save();
  location.hash = "#/workout";
}

function viewWorkout() {
  const w = state.active;
  if (!w || w.person !== state.person) {
    return `<div class="empty">No workout in progress.<br><br><a class="btn" href="#/">Choose a day</a></div>`;
  }
  const day = dayById(w.dayId);
  const doneCount = w.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  return `
    <h1>${day.title}</h1>
    <div class="row" style="margin-bottom:14px">
      <span class="muted">Date</span>
      <input type="date" value="${w.date}" data-action="date" class="btn small">
      <span class="grow"></span>
      <button class="btn small ghost" data-action="cancel">Discard</button>
    </div>
    ${w.entries.map((e, ei) => {
      const ex = getEx(e.exId);
      if (!ex) return "";
      const unit = TYPE_INFO[ex.type].unit;
      return `
      <div class="card">
        <div class="ex-head"><div class="name">${esc(ex.name)}</div><div class="row"><span class="tag">${ex.reps[0]}–${ex.reps[1]} reps</span>${infoBtn(ex)}</div></div>
        <div class="setup">${esc(ex.setup)}</div>
        ${lastLine(ex)}
        <table class="sets" style="margin-top:8px">
          <tr><th></th><th>${unit}</th><th>Reps</th><th></th><th></th></tr>
          ${e.sets.map((s, si) => `
            <tr class="${s.done ? "done" : ""}">
              <td class="n">${si + 1}</td>
              <td><div class="num">
                <button data-action="bump" data-ei="${ei}" data-si="${si}" data-f="kg" data-d="-1" aria-label="Less weight">−</button>
                <input type="number" inputmode="decimal" step="any" min="0" value="${s.kg}" data-action="set" data-ei="${ei}" data-si="${si}" data-f="kg">
                <button data-action="bump" data-ei="${ei}" data-si="${si}" data-f="kg" data-d="1" aria-label="More weight">+</button>
              </div></td>
              <td><div class="num">
                <input type="number" inputmode="numeric" min="0" value="${s.reps}" placeholder="${ex.reps[1]}" data-action="set" data-ei="${ei}" data-si="${si}" data-f="reps">
              </div></td>
              <td><button class="done-btn ${s.done ? "on" : ""}" data-action="done" data-ei="${ei}" data-si="${si}" aria-label="Set done">✓</button></td>
              <td><button class="del" data-action="delset" data-ei="${ei}" data-si="${si}" aria-label="Remove set">✕</button></td>
            </tr>`).join("")}
        </table>
        <button class="btn small" style="margin-top:8px" data-action="addset" data-ei="${ei}">+ Add set</button>
      </div>`;
    }).join("")}
    <div class="sticky-foot"><div>
      <button class="btn primary block" data-action="finish">Finish & save (${doneCount} set${doneCount === 1 ? "" : "s"} ticked)</button>
    </div></div>`;
}

function finishWorkout() {
  const w = state.active;
  const entries = w.entries
    .filter((e) => getEx(e.exId))
    .map((e) => ({ exId: e.exId, name: getEx(e.exId).name, sets: e.sets.filter((s) => s.done && Number(s.reps) > 0).map((s) => ({ kg: Number(s.kg) || 0, reps: Number(s.reps) })) }))
    .filter((e) => e.sets.length);
  if (!entries.length) {
    alert("Tick ✓ next to the sets you've done (with reps filled in) before saving.");
    return;
  }
  state.sessions.push({ id: uid(), person: w.person, dayId: w.dayId, date: w.date, entries });
  state.active = null;
  save();
  location.hash = "#/history";
}

function viewProgress(query) {
  const done = new Set();
  mySessions().forEach((s) => s.entries.forEach((e) => done.add(keyOf(e.exId))));
  const q = (query || "").toLowerCase();
  const items = DAYS.flatMap((d) => dayExercises(d.id).filter((ex) => !ex.sameAs).map((ex) => ({ ex, day: d })))
    .filter(({ ex }) => !q || ex.name.toLowerCase().includes(q));
  const tried = items.filter(({ ex }) => done.has(ex.id));
  const notYet = items.filter(({ ex }) => !done.has(ex.id));
  const row = ({ ex, day }) => {
    const best = bestEver(ex.id);
    return `<a class="list-item" href="#/progress/${ex.id}" style="text-decoration:none">
      <span>${esc(ex.name)}<br><span class="muted small">${day.title}</span></span>
      <span class="muted">${best ? esc(kgLabel(ex, best.kg)) + " ×" + best.reps : ""} ›</span></a>`;
  };
  return `
    <h1>Progress</h1>
    <p class="sub">Your best lifts and how they've climbed.</p>
    <input class="search" type="search" placeholder="Search exercises" value="${esc(query || "")}" data-action="search">
    ${tried.length ? `<div class="card">${tried.map(row).join("")}</div>` : `<div class="empty">Nothing logged yet — finish a workout and it'll show up here.</div>`}
    ${notYet.length ? `<h2 class="muted">Not done yet</h2><div class="card">${notYet.map(row).join("")}</div>` : ""}`;
}

function viewExercise(exId) {
  const ex = getEx(exId);
  if (!ex) return viewProgress();
  const hist = historyFor(keyOf(exId));
  const best = bestEver(keyOf(exId));
  const first = hist[0] && topSet(hist[0].sets);
  const lastTop = hist.length && topSet(hist[hist.length - 1].sets);
  return `
    <a href="#/progress" class="muted small">← Progress</a>
    <h1>${esc(ex.name)}</h1>
    <p class="sub">${esc(ex.setup)} ${infoBtn(ex, "How to")}</p>
    ${hist.length ? `
      <div class="stats">
        <div class="stat"><div class="v">${esc(kgLabel(ex, best.kg))}</div><div class="k">Best (×${best.reps})</div></div>
        <div class="stat"><div class="v">${esc(kgLabel(ex, lastTop.kg))}</div><div class="k">Last time</div></div>
        <div class="stat"><div class="v">${lastTop.kg - first.kg >= 0 ? "+" : ""}${round(lastTop.kg - first.kg)}kg</div><div class="k">Since first</div></div>
      </div>
      <div class="card">${chart(hist)}<div class="muted small" style="text-align:center">Heaviest set each session</div></div>
      <h2>Every session</h2>
      <div class="card">${hist.slice().reverse().map((h) => `
        <div class="list-item"><span>${fmtDate(h.date)}</span><span>${esc(setsText(ex, h.sets))}</span></div>`).join("")}</div>`
    : `<div class="empty">Not logged yet.</div>`}`;
}

function chart(hist) {
  const pts = hist.map((h) => ({ date: h.date, kg: topSet(h.sets).kg }));
  const W = 600, H = 220, L = 40, R = 12, T = 12, B = 28;
  let min = Math.min(...pts.map((p) => p.kg)), max = Math.max(...pts.map((p) => p.kg));
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const pad = (max - min) * 0.1; min = Math.max(0, min - pad); max += pad;
  const x = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1));
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [0, 0.5, 1].map((f) => min + f * (max - min));
  const labelIdx = pts.length <= 2 ? pts.map((_, i) => i) : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time">
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="lbl" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${round(t)}</text>`).join("")}
    <polyline class="line" points="${pts.map((p, i) => `${x(i)},${y(p.kg)}`).join(" ")}"/>
    ${pts.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.kg)}" r="4"><title>${fmtDate(p.date)}: ${p.kg}kg</title></circle>`).join("")}
    ${labelIdx.map((i) => `<text class="lbl" x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtDate(pts[i].date).replace(/^\w+,? /, "")}</text>`).join("")}
  </svg>`;
}

function viewHistory() {
  const list = mySessions().slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) return `<h1>History</h1><div class="empty">No workouts saved yet.</div>`;
  return `<h1>History</h1><p class="sub">${list.length} workout${list.length === 1 ? "" : "s"} logged.</p>
    ${list.map((s) => `
      <div class="card">
        <div class="ex-head"><div><div class="name">${dayById(s.dayId).title}</div><div class="muted small">${fmtDate(s.date)}</div></div>
          <button class="del" data-action="delsession" data-id="${s.id}" aria-label="Delete workout">🗑</button></div>
        ${s.entries.map((e) => { const ex = getEx(e.exId); return `<div class="list-item"><span>${esc(ex ? ex.name : e.name || e.exId)}</span><span class="muted">${ex ? esc(setsText(ex, e.sets)) : ""}</span></div>`; }).join("")}
      </div>`).join("")}`;
}

// ---------- info sheet & custom exercises ----------

const sheet = document.getElementById("sheet");
const infoBtn = (ex, label) => `<button class="info-btn${label ? " labelled" : ""}" data-action="info" data-ex="${ex.id}" aria-label="How to do ${esc(ex.name)}">${label ? esc(label) + " " : ""}<span>i</span></button>`;

function openSheet(html) {
  sheet.innerHTML = `<div class="sheet-backdrop" data-action="close"></div>
    <div class="sheet-panel" role="dialog" aria-modal="true">
      <button class="sheet-close" data-action="close" aria-label="Close">✕</button>${html}</div>`;
  sheet.hidden = false;
  document.body.classList.add("noscroll");
}
function closeSheet() {
  sheet.hidden = true;
  sheet.innerHTML = "";
  document.body.classList.remove("noscroll");
}
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !sheet.hidden) closeSheet(); });

function openInfo(exId) {
  const ex = getEx(exId);
  if (!ex) return;
  const g = GUIDE[keyOf(exId)] || GENERIC_GUIDE;
  openSheet(`
    <h2 class="sheet-title">${esc(ex.name)}</h2>
    <div><span class="tag">${TYPE_INFO[ex.type].label}</span><span class="tag">${ex.sets} sets × ${ex.reps[0]}–${ex.reps[1]} reps</span></div>
    ${ex.custom ? "" : `<div class="art-wrap">${renderArt(g.art)}<div class="muted small">Start ⇄ finish position</div></div>`}
    ${g.muscles ? `<h3>Works</h3><p>${esc(g.muscles)}</p>` : ""}
    ${ex.setup ? `<h3>Setup</h3><p>${esc(ex.setup)}</p>` : ""}
    ${g.steps.length ? `<h3>How to do it</h3><ol>${g.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
    ${g.tips.length ? `<h3>Tips</h3><ul>${g.tips.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
    ${ex.custom ? `<div class="row" style="margin-top:16px">
        <button class="btn grow" data-action="custom-edit" data-ex="${ex.id}">Edit</button>
        <button class="btn grow" data-action="custom-delete" data-ex="${ex.id}">Delete</button></div>` : ""}`);
}

function openCustomForm(dayId, editId) {
  const ex = editId ? getEx(editId) : { dayId, name: "", type: "cable", sets: 3, reps: [8, 12], setup: "" };
  openSheet(`
    <h2 class="sheet-title">${editId ? "Edit exercise" : "Add your own exercise"}</h2>
    <form class="form" onsubmit="return false">
      <input type="hidden" name="id" value="${editId || ""}">
      <label>Name<input name="name" required maxlength="60" value="${esc(ex.name)}" placeholder="e.g. Smith Machine Squat"></label>
      <label>Day<select name="dayId">${DAYS.map((d) => `<option value="${d.id}" ${d.id === ex.dayId ? "selected" : ""}>${d.name} – ${d.title}</option>`).join("")}</select></label>
      <label>Type<select name="type">${Object.entries(TYPE_INFO).map(([k, v]) => `<option value="${k}" ${k === ex.type ? "selected" : ""}>${v.label}</option>`).join("")}</select></label>
      <div class="row">
        <label class="grow">Sets<input name="sets" type="number" inputmode="numeric" min="1" max="10" value="${ex.sets}"></label>
        <label class="grow">Reps from<input name="r0" type="number" inputmode="numeric" min="1" value="${ex.reps[0]}"></label>
        <label class="grow">to<input name="r1" type="number" inputmode="numeric" min="1" value="${ex.reps[1]}"></label>
      </div>
      <label>How to / notes<textarea name="setup" rows="3" maxlength="400" placeholder="Pulley position, attachment, cues…">${esc(ex.setup)}</textarea></label>
      <button type="button" class="btn primary block" data-action="custom-save">${editId ? "Save changes" : "Add exercise"}</button>
    </form>`);
  sheet.querySelector("input[name=name]").focus();
}

function saveCustom(form) {
  const f = Object.fromEntries(new FormData(form));
  const name = f.name.trim();
  if (!name) { alert("Give the exercise a name."); return; }
  const r0 = Math.max(1, Number(f.r0) || 8), r1 = Math.max(r0, Number(f.r1) || r0);
  const data = { name, dayId: f.dayId, type: f.type, sets: Math.max(1, Number(f.sets) || 3), reps: [r0, r1], setup: f.setup.trim(), custom: true };
  if (f.id) {
    Object.assign(getEx(f.id), data);
  } else {
    const id = "c-" + uid();
    state.custom.push({ id, ...data });
    picksFor(data.dayId).push(id);
  }
  save();
  closeSheet();
  if (!f.id && location.hash !== "#/day/" + data.dayId) location.hash = "#/day/" + data.dayId;
  else render();
}

function deleteCustom(id) {
  const ex = getEx(id);
  if (!ex || !confirm(`Delete "${ex.name}"? Workouts you've already logged keep it.`)) return;
  state.custom = state.custom.filter((c) => c.id !== id);
  Object.values(state.picks).forEach((list) => { const i = list.indexOf(id); if (i >= 0) list.splice(i, 1); });
  save();
  closeSheet();
  render();
}

// ---------- routing & rendering ----------

let searchQuery = "";
function render() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const tab = parts[0] === "progress" ? "progress" : parts[0] === "history" ? "history" : "home";
  let html;
  if (parts[0] === "day") html = viewDay(parts[1]);
  else if (parts[0] === "workout") html = viewWorkout();
  else if (parts[0] === "progress" && parts[1]) html = viewExercise(parts[1]);
  else if (parts[0] === "progress") html = viewProgress(searchQuery);
  else if (parts[0] === "history") html = viewHistory();
  else html = viewHome();
  app.innerHTML = html;
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  personSelect.innerHTML = state.people.map((p) => `<option ${p === state.person ? "selected" : ""}>${esc(p)}</option>`).join("")
    + `<option value="__add">+ Add person</option>` + (state.people.length > 1 ? `<option value="__remove">Remove ${esc(state.person)}</option>` : "");
}

window.addEventListener("hashchange", () => { closeSheet(); render(); window.scrollTo(0, 0); });

personSelect.addEventListener("change", () => {
  const v = personSelect.value;
  if (v === "__add") {
    const name = (prompt("Name?") || "").trim();
    if (name && !state.people.includes(name)) state.people.push(name);
    if (name) state.person = name;
  } else if (v === "__remove") {
    if (confirm(`Remove ${state.person} and all their workouts?`)) {
      const gone = state.person;
      state.people = state.people.filter((p) => p !== gone);
      state.sessions = state.sessions.filter((s) => s.person !== gone);
      if (state.active && state.active.person === gone) state.active = null;
      state.person = state.people[0];
    }
  } else {
    state.person = v;
  }
  save();
  render();
});

function setField(ei, si, f, value) {
  const s = state.active.entries[ei].sets[si];
  s[f] = value === "" ? "" : Number(value);
  // Fill the same weight into later sets that are still empty.
  if (f === "kg" && value !== "") state.active.entries[ei].sets.slice(si + 1).forEach((n) => {
    if (n.kg === "" && !n.done) n.kg = Number(value);
  });
  save();
}

document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-action]");
  if (!t) return;
  const a = t.dataset.action;
  const ei = Number(t.dataset.ei), si = Number(t.dataset.si);
  if (a === "start") startWorkout(t.dataset.day);
  else if (a === "finish") finishWorkout();
  else if (a === "cancel") { if (confirm("Discard this workout?")) { state.active = null; save(); location.hash = "#/"; } }
  else if (a === "done") {
    const s = state.active.entries[ei].sets[si];
    if (!s.done && (s.reps === "" || s.reps == null)) s.reps = getEx(state.active.entries[ei].exId).reps[1];
    s.done = !s.done; save(); render();
  } else if (a === "bump") {
    const ex = getEx(state.active.entries[ei].exId);
    const s = state.active.entries[ei].sets[si];
    const prev = state.active.entries[ei].sets[si - 1];
    const base = s.kg === "" && prev && prev.kg !== "" ? Number(prev.kg) : Number(s.kg) || 0;
    s.kg = Math.max(0, round(base + (s.kg === "" && prev ? 0 : Number(t.dataset.d) * TYPE_INFO[ex.type].step)));
    save(); render();
  } else if (a === "addset") {
    const sets = state.active.entries[ei].sets;
    const prev = sets[sets.length - 1];
    sets.push({ kg: prev ? prev.kg : "", reps: prev ? prev.reps : "", done: false });
    save(); render();
  } else if (a === "delset") {
    state.active.entries[ei].sets.splice(si, 1); save(); render();
  } else if (a === "delsession") {
    if (confirm("Delete this workout?")) { state.sessions = state.sessions.filter((s) => s.id !== t.dataset.id); save(); render(); }
  } else if (a === "export") exportData();
  else if (a === "info") openInfo(t.dataset.ex);
  else if (a === "close") closeSheet();
  else if (a === "custom-new") openCustomForm(t.dataset.day);
  else if (a === "custom-edit") openCustomForm(null, t.dataset.ex);
  else if (a === "custom-save") saveCustom(t.closest("form"));
  else if (a === "custom-delete") deleteCustom(t.dataset.ex);
});

document.addEventListener("change", (ev) => {
  const t = ev.target;
  const a = t.dataset.action;
  if (a === "pick") {
    const picks = picksFor(t.dataset.day);
    const i = picks.indexOf(t.dataset.ex);
    if (t.checked && i < 0) picks.push(t.dataset.ex);
    if (!t.checked && i >= 0) picks.splice(i, 1);
    save(); render();
  } else if (a === "date") { state.active.date = t.value || today(); save(); }
  else if (a === "import") importData(t.files[0]);
});

document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.dataset.action === "set") setField(Number(t.dataset.ei), Number(t.dataset.si), t.dataset.f, t.value);
  else if (t.dataset.action === "search") {
    searchQuery = t.value;
    render();
    const box = app.querySelector(".search");
    box.focus(); box.setSelectionRange(box.value.length, box.value.length);
  }
});

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `garage-gym-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.people) || !Array.isArray(data.sessions)) throw new Error("bad file");
      if (!confirm(`Replace everything on this device with the backup (${data.sessions.length} workouts)?`)) return;
      state = { picks: {}, active: null, custom: [], ...data };
      save(); render();
    } catch (e) { alert("That doesn't look like a Garage Gym backup file."); }
  };
  reader.readAsText(file);
}

render();
