// Garage Gym — workout tracker. All data is stored in this browser (localStorage).

const STORE_KEY = "garage-gym-v1";
const APP_VERSION = "8"; // keep in step with the ?v= tags in index.html
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

// New fields only ever get added with defaults here, so older saved data keeps loading.
function load() {
  const base = { people: ["Me"], person: "Me", sessions: [], picks: {}, active: null, custom: [], body: {}, goals: {} };
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.people)) return { ...base, ...s };
  } catch (e) { /* fall through */ }
  return base;
}
let state = load();
// One-off: rest timer default changed to 1 minute.
if (!state.restV) { state.restSecs = 60; state.restV = 2; }
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { alert("Couldn't save — storage may be full or blocked."); }
}

const mySessions = () => state.sessions.filter((s) => s.person === state.person);
// Oldest first; workouts on the same date stay in the order they were saved.
const sortedSessions = () => mySessions().map((s, i) => ({ s, i }))
  .sort((a, b) => a.s.date.localeCompare(b.s.date) || a.i - b.i).map((x) => x.s);

// Warm-up sets stay in the log but are left out of bests, charts and suggestions.
const working = (sets) => sets.filter((s) => !s.warmup);

// All logged entries for an exercise, oldest first: [{date, sets, all, sessionId}].
// `skipId` leaves out one session (the one being edited).
function historyFor(key, skipId) {
  const out = [];
  sortedSessions().forEach((s) => {
    if (s.id === skipId) return;
    s.entries.forEach((e) => {
      if (keyOf(e.exId) !== key) return;
      const sets = working(e.sets);
      if (sets.length) out.push({ date: s.date, sets, all: e.sets, sessionId: s.id });
    });
  });
  return out;
}
// The most recent sets logged for an exercise, warm-ups included.
function lastRawSets(key) {
  let out = null;
  sortedSessions().forEach((s) => s.entries.forEach((e) => { if (keyOf(e.exId) === key && e.sets.length) out = e.sets; }));
  return out;
}
const topSet = (sets) => sets.reduce((b, s) => (!b || s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps) ? s : b), null);
const beats = (s, best) => !best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps);
function bestEver(key, skipId) {
  let best = null;
  historyFor(key, skipId).forEach((h) => { const t = topSet(h.sets); if (beats(t, best)) best = { ...t, date: h.date }; });
  return best;
}
const lastFor = (key, skipId) => { const h = historyFor(key, skipId); return h[h.length - 1] || null; };

// Estimated one-rep max (Epley formula): roughly the most you could lift once.
const e1rm = (s) => (s.kg > 0 && s.reps > 0 ? round(s.reps === 1 ? s.kg : s.kg * (1 + s.reps / 30)) : 0);
const bestE1 = (key, skipId) => Math.max(0, ...historyFor(key, skipId).map((h) => Math.max(...h.sets.map(e1rm))));

// A new record: heavier than ever, more reps at your best weight, or a higher estimated max.
// The first time you do an exercise doesn't count.
function isPR(ex, s, skipId) {
  if (s.warmup || !(Number(s.reps) > 0)) return false;
  const key = keyOf(ex.id);
  const best = bestEver(key, skipId);
  if (!best) return false;
  const set = { kg: Number(s.kg) || 0, reps: Number(s.reps) };
  if (set.kg > best.kg || (set.kg === best.kg && set.reps > best.reps)) return true;
  return ex.type !== "bw" && e1rm(set) > bestE1(key, skipId);
}

// The heaviest pin setting on the cable stacks. Suggestions never go past it.
const stackMax = () => Number(state.stackMax) || 90;
// A harder variation to switch to once an exercise maxes out the stack.
const HARDER = { "lat-pulldown": "single-pulldown", "seated-row": "single-row", "cable-curl": "bayesian-curl", "cable-squat": "cable-split-squat" };

// Suggest going up when every working set last time hit the top of the rep range.
function suggestion(ex) {
  const last = lastFor(keyOf(ex.id));
  if (!last || last.sets.length < 2 || !last.sets.every((s) => s.reps >= ex.reps[1])) return null;
  const top = topSet(last.sets);
  if (ex.type === "bw") return { kg: top.kg, text: "Hit all reps last time — add reps or slow the lowering" };
  if (ex.type === "cable" && top.kg >= stackMax()) {
    const alt = getEx(HARDER[keyOf(ex.id)] || "");
    return { kg: top.kg, text: `Top of the stack — ${alt ? `try ${alt.name}, or ` : ""}slow the lowering to 3–4 seconds and pause at the hardest point` };
  }
  let kg = round(top.kg + TYPE_INFO[ex.type].step);
  if (ex.type === "cable") kg = Math.min(kg, stackMax());
  return { kg, text: `Hit all reps last time — go up to ${kgLabel(ex, kg)}` };
}

// The day after the last one you did, so you can train whenever and keep the rotation.
function nextDayId() {
  const list = sortedSessions();
  if (!list.length) return DAYS[0].id;
  const i = DAYS.findIndex((d) => d.id === list[list.length - 1].dayId);
  return DAYS[(i + 1) % DAYS.length].id;
}

const musclesOf = (exId) => musclesFromText((GUIDE[keyOf(exId)] || {}).muscles);
function dayMuscles(dayId) {
  const out = {};
  picksFor(dayId).forEach((id) => Object.entries(musclesOf(id)).forEach(([m, v]) => { out[m] = Math.max(out[m] || 0, v); }));
  return out;
}

// ---------- helpers ----------

const round = (n) => Math.round(n * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => isoOf(new Date());
const addDays = (iso, n) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() + n); return isoOf(d); };
const mondayOf = (iso) => addDays(iso, -((new Date(iso + "T00:00").getDay() + 6) % 7));
const fmtDate = (iso) => new Date(iso + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const kgLabel = (ex, kg) => (ex.type === "bw" ? (kg ? `BW +${kg}kg` : "BW") : `${kg}kg`);
const setsText = (ex, sets) => {
  const part = (list) => {
    const kgs = [...new Set(list.map((s) => s.kg))];
    if (kgs.length === 1) return `${kgLabel(ex, kgs[0])} × ${list.map((s) => s.reps).join(", ")}`;
    return list.map((s) => `${kgLabel(ex, s.kg)}×${s.reps}`).join(", ");
  };
  const warm = sets.filter((s) => s.warmup), work = working(sets);
  return [warm.length ? `Warm-up ${part(warm)}` : "", work.length ? part(work) : ""].filter(Boolean).join(" · ");
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function toast(text) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 3000);
}

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
  const next = nextDayId();
  return `
    <h1>Hey ${esc(state.person)} 👋</h1>
    <p class="sub">Pick today's session.</p>
    ${active ? `<a class="card day-card" href="#/workout" style="border-color:var(--accent)">
        <div class="day">${active.editingId ? "Editing" : "In progress"}</div>
        <div class="title">${esc(dayById(active.dayId).title)}</div>
        <div class="muted small">Tap to carry on</div></a>` : ""}
    ${DAYS.map((d) => `
      <a class="card day-card ${d.id === next ? "next" : ""}" href="#/day/${d.id}">
        <div class="day-row">
          <div class="grow">
            <div class="day">${d.name}${d.id === next ? ` <span class="next-tag">Next up</span>` : ""}</div>
            <div class="title">${d.title}</div>
            <div class="muted small">${dayExercises(d.id).length} exercises to choose from
              · ${lastByDay[d.id] ? "last done " + fmtDate(lastByDay[d.id]) : "not done yet"}</div>
          </div>
          ${bodyMap(dayMuscles(d.id), "mini")}
        </div>
      </a>`).join("")}
    <h2>Settings</h2>
    <div class="card stack">
      <div class="row">
        <span class="grow">Heaviest cable stack setting</span>
        <div class="num" style="width:96px"><input type="number" inputmode="decimal" step="any" min="1" value="${stackMax()}" data-action="stackmax" aria-label="Heaviest stack setting in kg"></div>
        <span class="muted">kg</span>
      </div>
      <div class="muted small">The app won't suggest going heavier than this. Once you max it out, it suggests a harder variation instead.</div>
    </div>
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
    <div class="day-row">
      <div class="grow"><h1>${day.title}</h1>
      <p class="sub">Tick the exercises you want to do today (5 is a good number).</p></div>
      ${bodyMap(dayMuscles(dayId), "mini")}
    </div>
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

// One set to start, matching the first set from last time; "+ Add set" copies it as you go.
function firstSetFor(ex) {
  const prev = (lastRawSets(keyOf(ex.id)) || [])[0];
  return prev ? { kg: prev.kg, reps: prev.reps, warmup: !!prev.warmup, done: false } : { kg: ex.type === "bw" ? 0 : "", reps: "", done: false };
}

function startWorkout(dayId, date) {
  if (state.active && state.active.person === state.person && !confirm("You have a workout in progress. Replace it?")) return;
  const picks = picksFor(dayId);
  const entries = dayExercises(dayId).filter((ex) => picks.includes(ex.id)).map((ex) => ({ exId: ex.id, sets: [firstSetFor(ex)] }));
  const d = date || today();
  state.active = { person: state.person, dayId, date: d, entries, noRest: d !== today() };
  state.rest = null;
  save();
  location.hash = "#/workout";
}

// Load a saved workout back into the workout screen to fix it.
function editSession(id) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return;
  if (state.active && state.active.person === state.person && !confirm("You have a workout in progress. Replace it?")) return;
  state.active = {
    person: s.person, dayId: s.dayId, date: s.date, editingId: s.id, noRest: true,
    entries: s.entries.map((e) => ({ exId: e.exId, name: e.name, sets: e.sets.map((x) => ({ kg: x.kg, reps: x.reps, warmup: !!x.warmup, done: true })) })),
  };
  state.rest = null;
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
  const inWorkout = new Set(w.entries.map((e) => e.exId));
  const others = dayExercises(w.dayId).filter((ex) => !inWorkout.has(ex.id));
  return `
    ${w.editingId ? `<div class="banner">Editing a saved workout. Change anything, then tap Save changes.</div>` : ""}
    <h1>${day.title}</h1>
    <div class="row" style="margin-bottom:14px">
      <span class="muted">Date</span>
      <input type="date" value="${w.date}" max="${today()}" data-action="date" class="btn small">
      <span class="grow"></span>
      <button class="btn small ghost" data-action="cancel">${w.editingId ? "Cancel" : "Discard"}</button>
    </div>
    ${w.noRest ? "" : `<div class="row rest-pick">
      <span class="muted">Rest</span>
      ${REST_CHOICES.map((sec) => `<button class="chip ${restSecs() === sec ? "on" : ""}" data-action="rest-default" data-secs="${sec}">${sec ? fmtClock(sec) : "Off"}</button>`).join("")}
    </div>`}
    <p class="muted small" style="margin:0 0 12px">Tap a set's number to mark it as a warm-up. Warm-ups don't count towards records. 🏆 = new record.</p>
    ${w.entries.map((e, ei) => {
      const ex = getEx(e.exId);
      if (!ex) return "";
      const unit = TYPE_INFO[ex.type].unit;
      let n = 0;
      return `
      <div class="card">
        <div class="ex-head"><div class="name">${esc(ex.name)}</div><div class="row"><span class="tag">${ex.reps[0]}–${ex.reps[1]} reps</span>${infoBtn(ex)}</div></div>
        <div class="setup">${esc(ex.setup)}</div>
        ${lastLine(ex)}
        <table class="sets" style="margin-top:8px">
          <tr><th></th><th>${unit}</th><th>Reps</th><th></th><th></th></tr>
          ${e.sets.map((s, si) => {
            const pr = s.done && isPR(ex, s, w.editingId);
            const label = s.warmup ? "W" : pr ? "🏆" : ++n;
            if (!s.warmup && pr) n++;
            return `
            <tr class="${s.done ? "done" : ""} ${s.warmup ? "warm" : ""}">
              <td class="n"><button class="set-n" data-action="warm" data-ei="${ei}" data-si="${si}" aria-label="${s.warmup ? "Warm-up set, tap to make it a working set" : "Set " + (si + 1) + ", tap to mark as warm-up"}">${label}</button></td>
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
            </tr>`;
          }).join("")}
        </table>
        <button class="btn small" style="margin-top:8px" data-action="addset" data-ei="${ei}">+ Add set</button>
      </div>`;
    }).join("")}
    ${others.length ? `<select class="search" data-action="addex" aria-label="Add another exercise">
        <option value="">+ Add another exercise…</option>
        ${others.map((ex) => `<option value="${ex.id}">${esc(ex.name)}</option>`).join("")}
      </select>` : ""}
    ${state.rest ? `<div style="height:80px"></div>` : ""}
    <div class="sticky-foot"><div>
      ${restBar()}
      <button class="btn primary block" data-action="finish">${w.editingId ? "Save changes" : `Finish & save (${doneCount} set${doneCount === 1 ? "" : "s"} ticked)`}</button>
    </div></div>`;
}

function finishWorkout() {
  const w = state.active;
  // Exercises that have since been deleted aren't shown, but their sets are kept as they were.
  const entries = w.entries
    .map((e) => {
      const ex = getEx(e.exId);
      const sets = e.sets.filter((s) => s.done && Number(s.reps) > 0)
        .map((s) => ({ kg: Number(s.kg) || 0, reps: Number(s.reps), ...(s.warmup ? { warmup: true } : {}) }));
      return { exId: e.exId, name: ex ? ex.name : e.name, sets };
    })
    .filter((e) => e.sets.length);
  if (!entries.length) {
    alert("Tick ✓ next to the sets you've done (with reps filled in) before saving.");
    return;
  }
  const saved = w.editingId && state.sessions.find((s) => s.id === w.editingId);
  if (saved) Object.assign(saved, { date: w.date, entries });
  else state.sessions.push({ id: uid(), person: w.person, dayId: w.dayId, date: w.date, entries });
  state.active = null;
  state.rest = null;
  save();
  location.hash = "#/history";
  if (saved) toast("Workout updated");
}

// A year of training at a glance: one square per day, filled if you trained.
function heatmap() {
  const trained = new Set(mySessions().map((s) => s.date));
  const end = today();
  const start = addDays(mondayOf(end), -52 * 7);
  const C = 11, G = 3, top = 14;
  let cells = "", labels = "", d = start, i = 0, lastMonth = "";
  while (d <= end) {
    const col = Math.floor(i / 7), row = i % 7;
    cells += `<rect class="hm ${trained.has(d) ? "on" : ""}" x="${col * (C + G)}" y="${top + row * (C + G)}" width="${C}" height="${C}" rx="2"><title>${fmtDate(d)}</title></rect>`;
    const month = new Date(d + "T00:00").toLocaleDateString(undefined, { month: "short" });
    if (row === 0 && month !== lastMonth) {
      if (col < 51) labels += `<text class="lbl" x="${col * (C + G)}" y="10">${month}</text>`;
      lastMonth = month;
    }
    d = addDays(d, 1);
    i++;
  }
  const cols = Math.ceil(i / 7);
  const yearCount = mySessions().filter((s) => s.date > addDays(end, -365)).length;
  const monthCount = mySessions().filter((s) => s.date.slice(0, 7) === end.slice(0, 7)).length;
  // Weeks in a row with at least one workout (this week counts once you've trained).
  const weeks = new Set(mySessions().map((s) => mondayOf(s.date)));
  let wk = mondayOf(end), streak = 0;
  if (!weeks.has(wk)) wk = addDays(wk, -7);
  while (weeks.has(wk)) { streak++; wk = addDays(wk, -7); }
  return `
    <div class="stats">
      <div class="stat"><div class="v">${monthCount}</div><div class="k">This month</div></div>
      <div class="stat"><div class="v">${yearCount}</div><div class="k">Last 12 months</div></div>
      <div class="stat"><div class="v">${streak}</div><div class="k">Week streak</div></div>
    </div>
    <div class="card heat"><svg class="heatmap" viewBox="0 0 ${cols * (C + G) - G} ${top + 7 * (C + G) - G}" role="img" aria-label="Days trained in the last year">${labels}${cells}</svg></div>`;
}

function bodyCard() {
  const list = (state.body[state.person] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const goal = state.goals[state.person];
  const latest = list[list.length - 1];
  const monthAgo = list.filter((b) => b.date <= addDays(today(), -30)).pop();
  const diff = (a, b) => `${a - b > 0 ? "+" : ""}${round(a - b)}kg`;
  return `
    <h2>Bodyweight</h2>
    <div class="card stack">
      ${latest ? `<div class="stats" style="margin:0">
        <div class="stat"><div class="v">${latest.kg}kg</div><div class="k">${fmtDate(latest.date)}</div></div>
        <div class="stat"><div class="v">${monthAgo ? diff(latest.kg, monthAgo.kg) : "–"}</div><div class="k">Last 30 days</div></div>
        <div class="stat"><div class="v">${goal ? diff(latest.kg, goal).replace(/^\+/, "") : "–"}</div><div class="k">${goal ? `To goal (${goal}kg)` : "No goal set"}</div></div>
      </div>` : `<div class="muted small">Log your weight now and then to see how it changes.</div>`}
      ${list.length ? chart(list.map((b) => ({ date: b.date, v: b.kg })), { goal }) : ""}
      <div class="row">
        <div class="num grow"><input type="number" inputmode="decimal" step="any" min="20" id="bw-kg" placeholder="Today's weight (kg)" aria-label="Today's weight in kg"></div>
        <button class="btn primary" data-action="bw-add">Add</button>
      </div>
      <div class="row">
        <span class="muted small grow">Goal weight</span>
        <div class="num" style="width:110px"><input type="number" inputmode="decimal" step="any" min="20" data-action="bw-goal" value="${goal || ""}" placeholder="kg" aria-label="Goal weight in kg"></div>
      </div>
      ${list.length ? `<div>${list.slice(-5).reverse().map((b) => `
        <div class="list-item"><span>${fmtDate(b.date)}</span><span>${b.kg}kg <button class="del" data-action="bw-del" data-id="${b.id}" aria-label="Delete">✕</button></span></div>`).join("")}</div>` : ""}
    </div>`;
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
    <p class="sub">Your training, bodyweight and best lifts.</p>
    ${heatmap()}
    ${bodyCard()}
    <h2>Lifts</h2>
    <input class="search" type="search" placeholder="Search exercises" value="${esc(query || "")}" data-action="search">
    ${tried.length ? `<div class="card">${tried.map(row).join("")}</div>` : `<div class="empty">Nothing logged yet — finish a workout and it'll show up here.</div>`}
    ${notYet.length ? `<h2 class="muted">Not done yet</h2><div class="card">${notYet.map(row).join("")}</div>` : ""}`;
}

let chartMode = "top";
function viewExercise(exId) {
  const ex = getEx(exId);
  if (!ex) return viewProgress();
  const key = keyOf(exId);
  const hist = historyFor(key);
  const best = bestEver(key);
  const bw = ex.type === "bw";
  const first = hist[0] && topSet(hist[0].sets);
  const lastTop = hist.length && topSet(hist[hist.length - 1].sets);
  const mode = bw ? "top" : chartMode;
  const pts = hist.map((h) => ({ date: h.date, v: bw ? Math.max(...h.sets.map((s) => s.reps)) : mode === "e1rm" ? Math.max(...h.sets.map(e1rm)) : topSet(h.sets).kg }));
  // Mark the sessions where a record was set.
  let running = null;
  const prs = new Set();
  hist.forEach((h) => { const t = topSet(h.sets); if (running && beats(t, running)) prs.add(h.sessionId); if (beats(t, running)) running = t; });
  return `
    <a href="#/progress" class="muted small">← Progress</a>
    <h1>${esc(ex.name)}</h1>
    <p class="sub">${esc(ex.setup)} ${infoBtn(ex, "How to")}</p>
    ${hist.length ? `
      <div class="stats">
        <div class="stat"><div class="v">${esc(kgLabel(ex, best.kg))}</div><div class="k">Best (×${best.reps})</div></div>
        ${bw ? `<div class="stat"><div class="v">${Math.max(...hist.flatMap((h) => h.sets.map((s) => s.reps)))}</div><div class="k">Most reps</div></div>`
          : `<div class="stat"><div class="v">${bestE1(key)}kg</div><div class="k">Est. max (1 rep)</div></div>`}
        <div class="stat"><div class="v">${lastTop.kg - first.kg >= 0 ? "+" : ""}${round(lastTop.kg - first.kg)}kg</div><div class="k">Since first</div></div>
      </div>
      <div class="card">
        ${bw ? "" : `<div class="row" style="justify-content:center;margin-bottom:6px">
          <button class="chip ${mode === "top" ? "on" : ""}" data-action="chartmode" data-mode="top">Heaviest set</button>
          <button class="chip ${mode === "e1rm" ? "on" : ""}" data-action="chartmode" data-mode="e1rm">Est. max</button></div>`}
        ${chart(pts, { unit: bw ? "" : "kg" })}
        <div class="muted small" style="text-align:center">${bw ? "Most reps in a set each session" : mode === "e1rm" ? "Estimated one-rep max each session — the most you could lift once" : "Heaviest set each session"}</div>
      </div>
      <h2>Every session</h2>
      <div class="card">${hist.slice().reverse().map((h) => `
        <div class="list-item"><span>${prs.has(h.sessionId) ? "🏆 " : ""}${fmtDate(h.date)}</span><span>${esc(setsText(ex, h.all))}</span></div>`).join("")}</div>`
    : `<div class="empty">Not logged yet.</div>`}`;
}

// Line chart of [{date, v}], with an optional dashed goal line.
function chart(pts, opts = {}) {
  const unit = opts.unit == null ? "kg" : opts.unit;
  const W = 600, H = 220, L = 52, R = 12, T = 12, B = 28;
  const vals = pts.map((p) => p.v).concat(opts.goal ? [opts.goal] : []);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min = Math.max(0, min - 5); max = max + 5; }
  const pad = (max - min) * 0.1; min = Math.max(0, min - pad); max += pad;
  const x = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1));
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [0, 0.5, 1].map((f) => min + f * (max - min));
  const labelIdx = pts.length <= 2 ? pts.map((_, i) => i) : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart over time">
    ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="lbl" x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${max - min >= 10 ? Math.round(t) : round(t)}</text>`).join("")}
    ${opts.goal ? `<line class="goal" x1="${L}" x2="${W - R}" y1="${y(opts.goal)}" y2="${y(opts.goal)}"/><text class="lbl goal-lbl" x="${W - R}" y="${y(opts.goal) - 6}" text-anchor="end">Goal ${opts.goal}kg</text>` : ""}
    <polyline class="line" points="${pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")}"/>
    ${pts.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.v)}" r="4"><title>${fmtDate(p.date)}: ${p.v}${unit}</title></circle>`).join("")}
    ${labelIdx.map((i) => `<text class="lbl" x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtDate(pts[i].date).replace(/^\w+,? /, "")}</text>`).join("")}
  </svg>`;
}

function viewHistory() {
  const list = mySessions().slice().sort((a, b) => b.date.localeCompare(a.date));
  return `<h1>History</h1>
    <div class="row" style="margin-bottom:12px">
      <p class="sub grow" style="margin:0">${list.length ? `${list.length} workout${list.length === 1 ? "" : "s"} logged.` : "No workouts saved yet."}</p>
      <button class="btn small" data-action="log-past">+ Log a past workout</button>
    </div>
    ${list.map((s) => `
      <div class="card">
        <div class="ex-head"><div><div class="name">${dayById(s.dayId).title}</div><div class="muted small">${fmtDate(s.date)}</div></div>
          <div class="row">
            <button class="btn small" data-action="editsession" data-id="${s.id}">Edit</button>
            <button class="del" data-action="delsession" data-id="${s.id}" aria-label="Delete workout">🗑</button>
          </div></div>
        ${s.entries.map((e) => { const ex = getEx(e.exId); return `<div class="list-item"><span>${esc(ex ? ex.name : e.name || e.exId)}</span><span class="muted">${esc(setsText(ex || { type: "other" }, e.sets))}</span></div>`; }).join("")}
      </div>`).join("")}`;
}

function openLogPast() {
  openSheet(`
    <h2 class="sheet-title">Log a past workout</h2>
    <form class="form" onsubmit="return false">
      <label>Day<select name="dayId">${DAYS.map((d) => `<option value="${d.id}">${d.name} – ${d.title}</option>`).join("")}</select></label>
      <label>Date<input type="date" name="date" value="${addDays(today(), -1)}" max="${today()}"></label>
      <p class="muted small">You'll get that day's ticked exercises. Fill in what you did, tick each set, then save.</p>
      <button type="button" class="btn primary block" data-action="log-past-go">Start logging</button>
    </form>`);
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
    ${g.muscles ? `<h3>Works</h3><div class="works">${bodyMap(musclesOf(exId), "info")}<p>${esc(g.muscles)}</p></div>` : ""}
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

// ---------- rest timer ----------
// Ticking a set done starts a countdown. It's stored as an end time, so it stays
// right if the screen locks or the page reloads. At zero: vibrate + beep.

const REST_CHOICES = [0, 60, 90, 120, 180];
const restSecs = () => (state.restSecs == null ? 60 : state.restSecs);
const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
let audioCtx = null, wakeLock = null;

function startRest() {
  if (!restSecs() || (state.active && state.active.noRest)) { save(); return; }
  state.rest = { endsAt: Date.now() + restSecs() * 1000, total: restSecs(), alerted: false };
  save();
  // Audio and wake lock must be set up from a tap, so do it here.
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { /* no sound */ }
  keepAwake();
}

function restBar() {
  if (!state.rest) return "";
  return `<div class="rest" id="rest">
    <div class="rest-fill" id="rest-fill"></div>
    <button class="chip" data-action="rest-add" data-d="-15" aria-label="15 seconds less">−15</button>
    <div class="rest-mid"><div class="rest-label" id="rest-label">Rest</div><div class="rest-time" id="rest-time"></div></div>
    <button class="chip" data-action="rest-add" data-d="15" aria-label="15 seconds more">+15</button>
    <button class="chip" data-action="rest-skip">Skip</button>
  </div>`;
}

function tickRest() {
  const r = state.rest;
  if (!r) return;
  const left = Math.ceil((r.endsAt - Date.now()) / 1000);
  if (left <= 0 && left > -6 && !r.alerted) {
    r.alerted = true;
    save();
    restAlarm();
  }
  // Clear the "go" message a few seconds after the timer ends.
  if (left <= -6) { state.rest = null; save(); if (location.hash === "#/workout") render(); return; }
  const el = document.getElementById("rest");
  if (!el) return;
  el.classList.toggle("go", left <= 0);
  document.getElementById("rest-time").textContent = left > 0 ? fmtClock(left) : "Go!";
  document.getElementById("rest-label").textContent = left > 0 ? "Rest" : "Next set";
  document.getElementById("rest-fill").style.width = `${Math.max(0, Math.min(100, (left / r.total) * 100))}%`;
}

function restAlarm() {
  try { navigator.vibrate && navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) { /* ignore */ }
  if (!audioCtx) return;
  try {
    [0, 0.35, 0.7].forEach((t) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = t === 0.7 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.25);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t);
      o.stop(audioCtx.currentTime + t + 0.3);
    });
  } catch (e) { /* no sound */ }
}

// Keep the screen on during a workout so the timer can alert (where supported).
async function keepAwake() {
  if (!("wakeLock" in navigator) || wakeLock || document.visibilityState !== "visible") return;
  try { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } catch (e) { /* not allowed */ }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { tickRest(); if (state.active) keepAwake(); }
});
setInterval(tickRest, 250);

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
  tickRest();
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  personSelect.innerHTML = state.people.map((p) => `<option ${p === state.person ? "selected" : ""}>${esc(p)}</option>`).join("")
    + `<option value="__add">+ Add person</option>` + (state.people.length > 1 ? `<option value="__remove">Remove ${esc(state.person)}</option>` : "");
}

// Phones often keep an old copy of the page open. Check for a newer version when
// the app opens or comes back to the front, and reload (everything is saved first).
async function checkForUpdate() {
  if (location.protocol === "file:") return;
  try {
    const html = await (await fetch(`./?check=${Date.now()}`, { cache: "no-store" })).text();
    const live = (html.match(/app\.js\?v=(\w+)/) || [])[1];
    // Guard against a reload loop if the server is briefly out of step.
    let last = null;
    try { last = sessionStorage.getItem("gg-reloaded"); } catch (e) { /* ignore */ }
    if (live && live !== APP_VERSION && last !== live) {
      try { sessionStorage.setItem("gg-reloaded", live); } catch (e) { /* ignore */ }
      save();
      location.reload();
    }
  } catch (e) { /* offline */ }
}
checkForUpdate();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });

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
      delete state.body[gone];
      delete state.goals[gone];
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
  else if (a === "cancel") { if (confirm("Discard this workout?")) { state.active = null; state.rest = null; save(); location.hash = "#/"; } }
  else if (a === "done") {
    const s = state.active.entries[ei].sets[si];
    if (!s.done && (s.reps === "" || s.reps == null)) s.reps = getEx(state.active.entries[ei].exId).reps[1];
    s.done = !s.done;
    const ex = getEx(state.active.entries[ei].exId);
    if (s.done && isPR(ex, s, state.active.editingId)) toast(`🏆 New record: ${kgLabel(ex, Number(s.kg) || 0)} × ${s.reps}`);
    if (s.done) startRest(); else save();
    render();
  } else if (a === "rest-add") {
    if (state.rest) { state.rest.endsAt += Number(t.dataset.d) * 1000; state.rest.total = Math.max(1, state.rest.total + Number(t.dataset.d)); save(); tickRest(); }
  } else if (a === "rest-skip") {
    state.rest = null; save(); render();
  } else if (a === "rest-default") {
    state.restSecs = Number(t.dataset.secs);
    if (!state.restSecs) state.rest = null;
    save(); render();
  } else if (a === "bump") {
    const ex = getEx(state.active.entries[ei].exId);
    const s = state.active.entries[ei].sets[si];
    const prev = state.active.entries[ei].sets[si - 1];
    const base = s.kg === "" && prev && prev.kg !== "" ? Number(prev.kg) : Number(s.kg) || 0;
    s.kg = Math.max(0, round(base + (s.kg === "" && prev ? 0 : Number(t.dataset.d) * TYPE_INFO[ex.type].step)));
    if (ex.type === "cable") s.kg = Math.min(s.kg, stackMax());
    save(); render();
  } else if (a === "addset") {
    const sets = state.active.entries[ei].sets;
    const prev = sets[sets.length - 1];
    sets.push({ kg: prev ? prev.kg : "", reps: prev ? prev.reps : "", warmup: false, done: false });
    save(); render();
  } else if (a === "delset") {
    state.active.entries[ei].sets.splice(si, 1); save(); render();
  } else if (a === "delsession") {
    if (confirm("Delete this workout?")) { state.sessions = state.sessions.filter((s) => s.id !== t.dataset.id); save(); render(); }
  } else if (a === "warm") {
    const s = state.active.entries[ei].sets[si];
    s.warmup = !s.warmup; save(); render();
  } else if (a === "editsession") editSession(t.dataset.id);
  else if (a === "log-past") openLogPast();
  else if (a === "log-past-go") {
    const f = Object.fromEntries(new FormData(t.closest("form")));
    closeSheet();
    startWorkout(f.dayId, f.date && f.date <= today() ? f.date : today());
  } else if (a === "chartmode") { chartMode = t.dataset.mode; render(); }
  else if (a === "bw-add") {
    const kg = Number(document.getElementById("bw-kg").value);
    if (!(kg > 0)) { alert("Enter your weight in kg."); return; }
    const list = state.body[state.person] || (state.body[state.person] = []);
    const same = list.find((b) => b.date === today());
    if (same) same.kg = round(kg); else list.push({ id: uid(), date: today(), kg: round(kg) });
    save(); render();
  } else if (a === "bw-del") {
    if (confirm("Delete this weigh-in?")) { state.body[state.person] = (state.body[state.person] || []).filter((b) => b.id !== t.dataset.id); save(); render(); }
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
  } else if (a === "date") { state.active.date = t.value && t.value <= today() ? t.value : today(); save(); }
  else if (a === "stackmax") { const v = Number(t.value); if (v > 0) { state.stackMax = round(v); save(); } render(); }
  else if (a === "bw-goal") { const v = Number(t.value); if (v > 0) state.goals[state.person] = round(v); else delete state.goals[state.person]; save(); render(); }
  else if (a === "addex" && t.value) {
    const ex = getEx(t.value);
    state.active.entries.push({ exId: ex.id, sets: [firstSetFor(ex)] });
    save(); render();
  }
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
      state = { picks: {}, active: null, custom: [], body: {}, goals: {}, ...data };
      save(); render();
    } catch (e) { alert("That doesn't look like a Garage Gym backup file."); }
  };
  reader.readAsText(file);
}

render();
