function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function parseCost(card){
  return {
    fish:  parseInt(card.dataset.costFish || "0", 10) || 0,
    brain: parseInt(card.dataset.costBrain || "0", 10) || 0,
    vibe:  parseInt(card.dataset.costVibe || "0", 10) || 0,
  };
}

function canAfford(cost, wallet){
  return (wallet.fish >= cost.fish) && (wallet.brain >= cost.brain) && (wallet.vibe >= cost.vibe);
}

/**
 * Preview avatar nello store (facoltativo).
 * Se non vuoi avatar-preview nello store, puoi togliere #avatar-img dal template
 * e questa funzione semplicemente non farà nulla.
 */
function setStorePreviewAvatar(world, skinId){
  const img = qs("#avatar-img");
  if(!img) return;

  // mapping semplice: prima skin override, poi default per mondo
  if(skinId === "skin_kpmg_tie") {
    img.src = "/static/app/ui/avatar/kpmg_tie.png";
    return;
  }

  if(world === "sarto")  img.src = "/static/app/ui/avatar/sarto_default.png";
  else if(world === "kpmg") img.src = "/static/app/ui/avatar/kpmg_default.png";
  else if(world === "malibu") img.src = "/static/app/ui/avatar/malibu_default.png";
  else img.src = "/static/app/ui/avatar/default.png";
}

function currentWorld(){
  const p = window.location.pathname || "/";
  if(p.startsWith("/world/")) return (p.split("/")[2] || "hub").toLowerCase();
  if(p === "/store") return "store";
  return "hub";
}

function renderTopWallet(state){
  // aggiorna wallet globale (se esiste in base.html)
  if(window.LIBA?.renderWallet) window.LIBA.renderWallet(state);

  // badges nello store
  const badges = qsa(".avatar-badges .badge");
  if(badges.length >= 3){
    badges[0].textContent = `🐟 ${state.wallet.fish}`;
    badges[1].textContent = `🧠 ${state.wallet.brain}`;
    badges[2].textContent = `🎧 ${state.wallet.vibe}`;
  }

  // label skin equip
  const eq = qs("#equipped-skin");
  if(eq) eq.textContent = state.equipped_skin || "default";

  // aggiorna avatar globale (quello “vero” del gioco)
  if(window.LIBA_AVATAR?.update) window.LIBA_AVATAR.update(state);

  // aggiorna anche preview avatar nello store (se presente)
  setStorePreviewAvatar(currentWorld(), state.equipped_skin);
}

function markOwned(card, state){
  card.dataset.owned = "1";

  const type = card.dataset.itemType;
  const id = card.dataset.itemId;

  const actions = qs(".item-actions", card);
  if(!actions) return;
  actions.innerHTML = "";

  if(type === "skin"){
    const equipped = (state.equipped_skin === id);
    card.dataset.equipped = equipped ? "1" : "0";

    if(equipped){
      const b = document.createElement("button");
      b.className = "btn secondary";
      b.disabled = true;
      b.textContent = "Equipped ✅";
      actions.appendChild(b);
    } else {
      const b = document.createElement("button");
      b.className = "btn equip";
      b.dataset.equip = id;
      b.textContent = "Equip";
      actions.appendChild(b);
    }
  } else {
    const b = document.createElement("button");
    b.className = "btn secondary";
    b.disabled = true;
    b.textContent = "Owned ✅";
    actions.appendChild(b);
  }
}

function applyAffordabilityHints(state){
  const wallet = state.wallet;

  qsa(".store-item").forEach(card => {
    const owned = card.dataset.owned === "1";
    const hint = qs("[data-hint]", card);
    if(!hint) return;

    if(owned){
      hint.textContent = "Owned";
      return;
    }

    const cost = parseCost(card);
    const ok = canAfford(cost, wallet);
    hint.textContent = ok ? "You can buy" : "Insufficient funds";

    const buyBtn = qs("button.buy", card);
    if(buyBtn){
      buyBtn.disabled = !ok;
      buyBtn.textContent = ok ? "Buy" : "Buy (nope)";
    }
  });
}

async function refreshState(){
  const data = await window.API.apiGet("/api/state");
  if(!data?.state) return null;
  return data.state;
}

async function handleBuy(itemId, card){
  const data = await window.API.apiPost("/api/store/buy", { item_id: itemId });

  if(!data?.success){
    window.LIBA?.toast?.(data?.error || "Errore acquisto");
    return;
  }

  const state = data.state;
  renderTopWallet(state);
  if(card) markOwned(card, state);
  applyAffordabilityHints(state);

  window.LIBA?.toast?.("Acquistato ✅");
}

async function handleEquip(skinId){
  const data = await window.API.apiPost("/api/store/equip-skin", { skin_id: skinId });
  if(!data?.success){
    window.LIBA?.toast?.(data?.error || "Errore equip");
    return;
  }

  const state = data.state;
  renderTopWallet(state);

  // aggiorna UI: solo UNA skin equip
  qsa(".store-item[data-item-type='skin']").forEach(card => {
    const id = card.dataset.itemId;
    const actions = qs(".item-actions", card);
    const owned = card.dataset.owned === "1";
    if(!actions) return;

    card.dataset.equipped = (id === state.equipped_skin) ? "1" : "0";
    actions.innerHTML = "";

    if(!owned){
      const b = document.createElement("button");
      b.className = "btn buy";
      b.dataset.buy = id;
      b.textContent = "Buy";
      actions.appendChild(b);
      return;
    }

    if(id === state.equipped_skin){
      const b = document.createElement("button");
      b.className = "btn secondary";
      b.disabled = true;
      b.textContent = "Equipped ✅";
      actions.appendChild(b);
    } else {
      const b = document.createElement("button");
      b.className = "btn equip";
      b.dataset.equip = id;
      b.textContent = "Equip";
      actions.appendChild(b);
    }
  });

  applyAffordabilityHints(state);
  window.LIBA?.toast?.("Equipped ✅");
}

function bindEvents(){
  qs("#store-refresh")?.addEventListener("click", async ()=>{
    const st = await refreshState();
    if(st){
      renderTopWallet(st);
      applyAffordabilityHints(st);
      window.LIBA?.toast?.("Refreshed");
    }
  });

  // event delegation (funziona anche dopo update innerHTML)
  qs("#store-grid")?.addEventListener("click", async (e)=>{
    const buyBtn = e.target.closest("button.buy");
    if(buyBtn){
      const itemId = buyBtn.dataset.buy;
      const card = buyBtn.closest(".store-item");
      if(itemId) await handleBuy(itemId, card);
      return;
    }

    const equipBtn = e.target.closest("button.equip");
    if(equipBtn){
      const skinId = equipBtn.dataset.equip;
      if(skinId) await handleEquip(skinId);
      return;
    }
  });
}

(async function init(){
  const st = await refreshState();
  if(st){
    renderTopWallet(st);
    applyAffordabilityHints(st);
  }
  bindEvents();
})();