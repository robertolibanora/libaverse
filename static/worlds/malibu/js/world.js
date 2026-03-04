let SCENES = [];
let SETTINGS = {
  chaos_start: 10,
  chaos_max: 100,
  chaos_security_threshold: 85,
  chaos_decay_per_round: 6,
  security_penalty_wrong: 1,
  correct_delta: 10,
  wrong_delta: -7,
  streak_bonus_every: 4,
  streak_bonus_amount: 6
};

let chaos = 0;
let streak = 0;
let current = null;

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

async function loadData(){
  const data = await window.API.apiGet("/api/world/malibu/data/dialogues.json");
  SETTINGS = Object.assign(SETTINGS, data.settings || {});
  SCENES = data.scenes || [];
}

function setChaos(value){
  chaos = clamp(value, 0, SETTINGS.chaos_max);
  const pct = Math.round((chaos / SETTINGS.chaos_max) * 100);
  document.getElementById("chaos-pct").textContent = pct + "%";
  document.getElementById("chaos-bar").style.width = pct + "%";
}

function renderScene(scene){
  current = scene;
  document.getElementById("npc-name").textContent = scene.npc;
  document.getElementById("npc-img").src = scene.img;
  document.getElementById("npc-line").textContent = scene.line;

  const wrap = document.getElementById("mali-choices");
  wrap.innerHTML = "";
  scene.choices.forEach(ch => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = ch.label;
    b.addEventListener("click", () => choose(ch));
    wrap.appendChild(b);
  });
}

function nextScene(){
  // decay caos ogni round (ti "riprendi")
  setChaos(chaos - SETTINGS.chaos_decay_per_round);
  renderScene(rand(SCENES));
}

async function securityEvent(){
  // evento di “sicurezza” quando chaos troppo alto
  streak = 0;
  document.getElementById("streak").textContent = streak;
  document.getElementById("last").textContent = "SECURITY 💀";
  window.LIBA.toast("Security Event: perdi vibe. Respira.");

  // penalità extra: 1 “wrong” addizionale (usa /api/earn)
  for(let i=0; i<SETTINGS.security_penalty_wrong; i++){
    const data = await window.API.apiPost("/api/earn", { world:"malibu", result:"wrong" });
    if(data?.state) window.LIBA.renderWallet(data.state);
  }

  // abbassa caos in modo netto (reset parziale)
  setChaos(Math.floor(SETTINGS.chaos_start / 2));
  setTimeout(nextScene, 500);
}

async function choose(choice){
  // applica chaos delta
  setChaos(chaos + (choice.chaos_delta || 0));

  const isCorrect = !!choice.correct;
  document.getElementById("last").textContent = isCorrect ? "OK ✅" : "NO ❌";

  // earn
  const data = await window.API.apiPost("/api/earn", {
    world: "malibu",
    result: isCorrect ? "correct" : "wrong"
  });

  if(data?.state) window.LIBA.renderWallet(data.state);
  window.LIBA.toast(isCorrect ? `+${SETTINGS.correct_delta} 🎧 VibeToken` : `${SETTINGS.wrong_delta} 🎧 VibeToken`);

  // streak
  if(isCorrect){
    streak += 1;
    if(streak % SETTINGS.streak_bonus_every === 0){
      await window.API.apiPost("/api/earn", {
        world: "malibu",
        result: "correct",
        delta: { vibe: SETTINGS.streak_bonus_amount }
      });
      const st = await window.LIBA.refreshState();
      if(st) window.LIBA.renderWallet(st);
      window.LIBA.toast(`STREAK +${SETTINGS.streak_bonus_amount} 🎧 🔥`);
    }
  } else {
    streak = 0;
  }
  document.getElementById("streak").textContent = streak;

  // se chaos troppo alto -> security
  if(chaos >= SETTINGS.chaos_security_threshold){
    await securityEvent();
    return;
  }

  // avanti
  setTimeout(nextScene, 450);
}

(async function init(){
  await loadData();
  setChaos(SETTINGS.chaos_start);

  document.getElementById("mali-next").addEventListener("click", nextScene);

  nextScene();
})();