function renderWallet(state){
  const fish = document.getElementById("w-fish");
  const brain = document.getElementById("w-brain");
  const vibe = document.getElementById("w-vibe");
  if(!fish) return;
  fish.textContent = state.wallet.fish;
  brain.textContent = state.wallet.brain;
  vibe.textContent = state.wallet.vibe;
}

function toast(msg){
  const el = document.getElementById("toast");
  const m = document.getElementById("toast-msg");
  if(!el || !m) return;
  m.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> el.classList.add("hidden"), 1400);
}

async function refreshState(){
  const data = await window.API.apiGet("/api/state");
  if(data?.state) renderWallet(data.state);
  return data?.state;
}

window.LIBA = { renderWallet, toast, refreshState };