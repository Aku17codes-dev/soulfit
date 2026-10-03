/* ── your Google Apps Script web app ── */
const API = "https://script.google.com/macros/s/AKfycbx4uMrFeHfO909baKb-IR33vC9y1jiAEFKGWwNdrGE87scfnUHI_x0d9F0kTI-jZTxL/exec";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* text/plain avoids the CORS preflight that Apps Script cannot answer */
async function call(payload) {
  let res;
  try {
    res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), redirect: "follow" });
  } catch (e) {
    throw new Error("Can't reach Google Sheets. Check the URL, that access is 'Anyone', and your internet.");
  }
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) { throw new Error("Google sent a web page instead of data. Redeploy the script as a New version."); }
}

/* ── captcha ── */
const CH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let answer = "";
function captcha() {
  answer = Array.from({ length: 5 }, () => CH[Math.random() * CH.length | 0]).join("");
  let o = "";
  [...answer].forEach((c, i) => {
    const x = 20 + i * 28, y = 44 + Math.random() * 8 - 4, r = Math.random() * 40 - 20;
    o += `<text x="${x}" y="${y}" font-weight="800" font-size="${27 + Math.random() * 7}" fill="currentColor" transform="rotate(${r} ${x} ${y})">${c}</text>`;
  });
  o += `<path d="M0 ${10 + Math.random() * 40} Q86 ${Math.random() * 60} 172 ${10 + Math.random() * 40}" stroke="currentColor" fill="none" opacity=".45"/>`;
  $("#capsvg").innerHTML = o;
}
$("#capReload").onclick = e => { captcha(); $("#cap").value = ""; e.currentTarget.classList.add("spin"); setTimeout(() => e.currentTarget.classList.remove("spin"), 400); };

function fail(el, msg) { el.textContent = msg; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function shutter(mid) { const s = $("#shutter"); s.classList.remove("go"); void s.offsetWidth; s.classList.add("go"); setTimeout(mid, 450); }
const todayIST = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);

/* ── new ID ── */
$("#newId").onclick = () => {
  const t = $("#ticket"); t.classList.add("on");
  t.innerHTML = `<small>Your name for the register</small><input id="nm" maxlength="28" placeholder="e.g. Rohit Kumar"><button class="btn" id="mk">Create my ID</button>`;
  $("#mk").onclick = async () => {
    const name = $("#nm").value.trim();
    if (name.length < 2) return;
    $("#mk").disabled = true;
    try {
      const r = await call({ action: "register", name });
      if (!r.ok) throw new Error(r.error || "Could not create ID");
      t.innerHTML = `<small>Your member ID. Write it down.</small><p class="code">${esc(r.id)}</p>`;
      $("#mid").value = r.id; $("#cap").focus();
    } catch (e) { fail($("#gateErr"), e.message); $("#mk").disabled = false; }
  };
};

/* ── sign in ── */
let ME = null;
async function signIn() {
  const id = $("#mid").value.trim().toUpperCase(), err = $("#gateErr");
  err.textContent = "";
  if (!id) return fail(err, "Enter your member ID.");
  if ($("#cap").value.trim().toUpperCase() !== answer) { captcha(); $("#cap").value = ""; return fail(err, "Code didn't match. Here's a fresh one."); }
  $("#signin").disabled = true; $("#signin").textContent = "Checking…";
  try {
    const r = await call({ action: "login", id });
    if (!r.ok) throw new Error(r.error || "Sign in failed");
    ME = r;
    shutter(() => {
      $("#gate").hidden = true; $("#app").hidden = false;
      $("#who").textContent = r.name + " · " + r.id;
      $("#mdate").value = todayIST(); $("#mday").value = r.next;
      $("#count").textContent = r.count + " days marked so far.";
      view("mark");
    });
  } catch (e) { fail(err, e.message); captcha(); $("#cap").value = ""; }
  $("#signin").disabled = false; $("#signin").textContent = "Sign in";
}
$("#signin").onclick = signIn;
$("#cap").onkeydown = e => { if (e.key === "Enter") signIn(); };

/* ── tabs ── */
function view(n) {
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "v-" + n));
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === n));
}
$$("#tabs button").forEach(b => b.onclick = () => view(b.dataset.v));

/* ── day marker ── */
const EMO = ["💪", "🔥", "🏋️", "⚡", "🥇", "🫡"];
$("#markBtn").onclick = async () => {
  const date = $("#mdate").value, day = +$("#mday").value, err = $("#markErr");
  err.textContent = "";
  if (!date) return fail(err, "Pick a date.");
  if (!day || day < 1) return fail(err, "Enter a day number, 1 or higher.");
  $("#markBtn").disabled = true;
  try {
    const r = await call({ action: "mark", id: ME.id, rowKey: ME.rowKey, date, day });
    if (!r.ok) throw new Error(r.error || "Could not mark");
    $("#emo").textContent = EMO[Math.random() * EMO.length | 0];
    $("#stT").textContent = "Day " + day + " marked";
    $("#stS").textContent = new Date(date + "T06:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    const s = $("#stamp"); s.classList.remove("on"); void s.offsetWidth; s.classList.add("on");
    $("#count").textContent = r.count + " days marked so far.";
    $("#mday").value = day + 1;
  } catch (e) { fail(err, e.message); }
  $("#markBtn").disabled = false;
};
$("#stX").onclick = () => $("#stamp").classList.remove("on");

/* ── week plan ── */
const WEEK = [
  ["Monday", "Chest and triceps", ["Bench press 4 × 6–8", "Incline dumbbell press 3 × 10", "Dips 3 × 10", "Cable fly 3 × 14", "Rope pushdown 3 × 15"], "Bench first while fresh. Add 2.5 kg only when every set hits the top reps."],
  ["Tuesday", "Back and biceps", ["Deadlift 3 × 5", "Lat pulldown 4 × 10", "Barbell row 3 × 8", "Seated row 3 × 12", "Barbell curl 3 × 10"], "Pull with the elbows, not the hands."],
  ["Wednesday", "Legs and calves", ["Squat 4 × 6–8", "Romanian deadlift 3 × 10", "Walking lunge 3 × 12", "Leg curl 3 × 12", "Calf raise 4 × 15"], "Hardest day. Eat your biggest lunch today."],
  ["Thursday", "Shoulders and abs", ["Overhead press 4 × 6–8", "Lateral raise 4 × 15", "Face pull 3 × 15", "Hanging knee raise 3 × 12", "Plank 3 × 45 sec"], "Side delts answer to reps, not weight."],
  ["Friday", "Arms", ["EZ-bar curl 4 × 10", "Hammer curl 3 × 12", "Skull crusher 4 × 10", "Overhead extension 3 × 12", "Wrist curls 3 × 20"], "Superset biceps and triceps to finish in under 50 minutes."],
  ["Saturday", "Full body and cardio", ["Front squat 3 × 8", "Push press 3 × 6", "Chin-up 3 × max", "Kettlebell swing 4 × 20", "Skipping 10 min"], "Short rests. Finish sweating, not crushed."],
  ["Sunday", "Rest", ["Easy walk 30–40 min", "Stretching 15 min", "Plan the week's food"], "Muscle grows on rest days. Sleep 7–8 hours."]
];
$("#weekList").innerHTML = WEEK.map((d, i) => `<div class="row"><button><span class="tag">${i + 1}</span><b>${d[0]}</b><em>${d[1]}</em></button><div class="body"><div><ul>${d[2].map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="note">${esc(d[3])}</p></div></div></div>`).join("");

/* one-open-at-a-time accordion */
function accordion(box) {
  $$(".row > button", box).forEach(b => b.onclick = () => {
    const r = b.parentElement, was = r.classList.contains("open");
    $$(".row", box).forEach(x => x.classList.remove("open"));
    if (!was) r.classList.add("open");
  });
}
accordion($("#weekList"));

/* ── diet (INR) ── */
const PLANS = [
  ["Tight budget", [["6:30", "Pre-workout", "2 bananas, black coffee", 12], ["9:00", "Breakfast", "4 boiled eggs, 3 rotis, half bowl curd", 48], ["13:00", "Lunch", "Rice, dal, 50 g soya chunks, sabzi, salad", 54], ["17:00", "Evening", "60 g roasted chana, 250 ml milk, peanuts", 30], ["21:00", "Dinner", "3 rotis, rajma or chole, curd", 38]]],
  ["Balanced", [["6:30", "Pre-workout", "Banana, 6 soaked almonds, black coffee", 20], ["9:00", "Breakfast", "2 eggs + 4 whites bhurji, 3 rotis, 300 ml milk, papaya", 74], ["13:00", "Lunch", "Rice, dal, 120 g chicken or 100 g paneer, sabzi", 92], ["17:00", "Evening", "Sprouts chaat, curd, roasted chana", 42], ["21:00", "Dinner", "3 rotis, soya sabzi, 2 boiled eggs, salad", 53]]],
  ["Mass gain", [["6:30", "Pre-workout", "2 bananas, peanut butter, black coffee", 34], ["9:00", "Breakfast", "6 eggs, 4 rotis, 400 ml milk, banana shake", 106], ["13:00", "Lunch", "Rice, dal, 180 g chicken or 150 g paneer, curd", 128], ["17:00", "Evening", "100 g paneer bhurji, peanut-chana mix, milk", 78], ["21:00", "Dinner", "4 rotis, soya gravy, fish or 3 eggs, curd", 92]]]
];
let pi = 1;
function diet() {
  const [n, m] = PLANS[pi];
  $("#plans").innerHTML = `<div class="chips">${PLANS.map((p, i) => `<button class="chip${i === pi ? " on" : ""}" data-i="${i}">${p[0]} · ₹${p[1].reduce((a, x) => a + x[3], 0)}</button>`).join("")}</div>`;
  $$("#plans .chip").forEach(c => c.onclick = () => { pi = +c.dataset.i; diet(); });
  $("#meals").innerHTML = m.map(x => `<div class="row"><button><span class="tag">${x[0]}</span><b>${x[1]}</b><em>₹${x[3]}</em></button><div class="body"><div><ul><li>${esc(x[2])}</li></ul></div></div></div>`).join("");
  accordion($("#meals"));
  $("#tot").textContent = "₹" + m.reduce((a, x) => a + x[3], 0);
}
diet();

/* ── sign out ── */
$("#outBtn").onclick = async () => {
  $("#outBtn").disabled = true;
  try { await call({ action: "logout", id: ME.id, rowKey: ME.rowKey }); } catch (e) { }
  shutter(() => {
    $("#app").hidden = true; $("#gate").hidden = false; $("#outBtn").disabled = false;
    $("#cap").value = ""; $("#gateErr").textContent = ""; $("#ticket").classList.remove("on"); captcha(); ME = null;
  });
};

captcha();
