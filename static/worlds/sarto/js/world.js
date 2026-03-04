let FISHES = [];
let CUSTOMERS = [];
let SETTINGS = {
  patience_seconds: 9,
  correct_delta: 10,
  wrong_delta: -7,
  streak_bonus_every: 3,
  streak_bonus_amount: 5
};

let currentCustomer = null;
let patienceLeft = 1; // 0..1
let timer = null;
let streak = 0;

function rand(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

async function loadData(){
  const fishesData = await window.API.apiGet("/api/world/sarto/data/fishes.json");
  const custData = await window.API.apiGet("/api/world/sarto/data/customers.json");
  FISHES = fishesData?.fishes || [];
  CUSTOMERS = custData?.customers || [];
  SETTINGS = Object.assign(SETTINGS, custData?.settings || {});
}

function renderFishGrid(){
  const grid = document.getElementById("fish-grid");
  grid.innerHTML = "";

  const fishes = FISHES.slice(0, 4);
  fishes.forEach(f => {
    const card = document.createElement("div");
    card.className = "fish-card";
    card.dataset.fish = f.id;

    card.innerHTML = `
      <img class="fish-img" src="${f.img}" alt="${f.name}">
      <div class="fish-name">${f.name}</div>
      <div class="fish-tag">${f.tagline || ""}</div>
    `;

    card.addEventListener("click", () => pickFish(f.id));
    grid.appendChild(card);
  });
}

function setCustomer(c){
  currentCustomer = c;

  const nameEl = document.getElementById("cust-name");
  const iconEl = document.getElementById("cust-icon");
  const reqEl  = document.getElementById("cust-request");
  const imgEl  = document.getElementById("cust-img");

  if(nameEl) nameEl.textContent = c?.name || "—";
  if(iconEl) iconEl.textContent = c?.icon || "🙂";
  if(reqEl)  reqEl.textContent  = c?.request || "—";
  if(imgEl)  imgEl.src = c?.img || "/static/worlds/sarto/assets/customers/cust_placeholder.png";
}

function setPatience(p){
  patienceLeft = Math.max(0, Math.min(1, p));
  const pct = Math.round(patienceLeft * 100);
  document.getElementById("patience-pct").textContent = pct + "%";
  document.getElementById("patience-bar").style.width = pct + "%";
}

function stopTimer(){
  if(timer) clearInterval(timer);
  timer = null;
}

function startTimer(){
  stopTimer();
  const totalMs = SETTINGS.patience_seconds * 1000;
  const started = Date.now();

  timer = setInterval(async () => {
    const elapsed = Date.now() - started;
    const p = 1 - (elapsed / totalMs);
    setPatience(p);

    if(p <= 0){
      stopTimer();
      await onTimeout();
    }
  }, 80);
}

async function onTimeout(){
  streak = 0;
  document.getElementById("streak").textContent = streak;
  document.getElementById("last").textContent = "TIMEOUT 💀";

  const data = await window.API.apiPost("/api/earn", { world:"sarto", result:"wrong" });
  if(data?.state) window.LIBA.renderWallet(data.state);
  window.LIBA.toast(`Cliente scappato. ${SETTINGS.wrong_delta} 🐟`);

  nextRound();
}

function nextRound(){
  if(!CUSTOMERS.length){
    window.LIBA.toast("Nessun cliente nel JSON 😭");
    return;
  }
  setCustomer(rand(CUSTOMERS));
  setPatience(1);
  startTimer();
}

async function pickFish(fishId){
  if(!currentCustomer) return;
  stopTimer();

  const isCorrect = fishId === currentCustomer.answer;

  if(isCorrect){
    streak += 1;
    document.getElementById("last").textContent = "OK ✅";
    window.LIBA.toast(`Venduto. +${SETTINGS.correct_delta} 🐟`);

    const data = await window.API.apiPost("/api/earn", { world:"sarto", result:"correct" });
    if(data?.state) window.LIBA.renderWallet(data.state);

    if(streak > 0 && (streak % SETTINGS.streak_bonus_every === 0)){
      await window.API.apiPost("/api/earn", {
        world:"sarto",
        result:"correct",
        delta: { fish: SETTINGS.streak_bonus_amount }
      });
      const st = await window.LIBA.refreshState();
      if(st) window.LIBA.renderWallet(st);
      window.LIBA.toast(`STREAK +${SETTINGS.streak_bonus_amount} 🐟 🔥`);
    }
  } else {
    streak = 0;
    document.getElementById("last").textContent = "NO ❌";
    window.LIBA.toast(`Sbagliato. ${SETTINGS.wrong_delta} 🐟`);

    const data = await window.API.apiPost("/api/earn", { world:"sarto", result:"wrong" });
    if(data?.state) window.LIBA.renderWallet(data.state);
  }

  document.getElementById("streak").textContent = streak;
  setTimeout(nextRound, 450);
}

(async function init(){
  await loadData();
  renderFishGrid();

  document.getElementById("sarto-skip").addEventListener("click", async ()=>{
    stopTimer();
    await onTimeout();
  });

  nextRound();
})();