"use strict";
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: works until reload */ }
}

const $ = (id) => document.getElementById(id);
const TONES = [392, 329.63, 261.63, 196];
const pads = [...document.querySelectorAll(".pad")];
let seq = [], pos = 0, accepting = false, ac = null, best = load("simon-best", 0);
$("best").textContent = best;

function tone(i, ms) {
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = TONES[i];
    g.gain.setValueAtTime(0.2, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + ms / 1000);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + ms / 1000);
  } catch { /* silent if audio isn't available */ }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function flash(i, ms) {
  pads[i].classList.add("lit");
  tone(i, ms);
  await wait(ms);
  pads[i].classList.remove("lit");
}

async function playSequence() {
  accepting = false;
  pads.forEach((p) => (p.disabled = true));
  $("msg").textContent = "Watch…";
  await wait(500);
  const speed = Math.max(220, 520 - seq.length * 20);
  for (const i of seq) {
    await flash(i, speed);
    await wait(120);
  }
  pos = 0;
  accepting = true;
  pads.forEach((p) => (p.disabled = false));
  $("msg").textContent = "Your turn.";
}

function nextRound() {
  seq.push(Math.floor(Math.random() * 4));
  $("round").textContent = seq.length;
  playSequence();
}

async function press(i) {
  if (!accepting) return;
  flash(i, 220);
  if (i !== seq[pos]) {
    accepting = false;
    const reached = seq.length - 1;
    if (reached > best) { best = reached; save("simon-best", best); $("best").textContent = best; }
    $("msg").textContent = `Wrong pad. You completed ${reached} round${reached === 1 ? "" : "s"}. Press Start to try again.`;
    $("start").disabled = false;
    return;
  }
  pos++;
  if (pos === seq.length) {
    accepting = false;
    $("msg").textContent = "Nice!";
    await wait(500);
    nextRound();
  }
}

pads.forEach((p) => p.addEventListener("click", () => press(Number(p.dataset.i))));
$("start").addEventListener("click", () => {
  seq = [];
  $("start").disabled = true;
  nextRound();
});
