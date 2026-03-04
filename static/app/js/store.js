document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.buy");
  if(!btn) return;

  const itemId = btn.dataset.buy;
  const data = await window.API.apiPost("/api/store/buy", { item_id: itemId });

  if(!data.success){
    window.LIBA.toast(data.error || "Errore acquisto");
    return;
  }

  window.LIBA.renderWallet(data.state);
  window.LIBA.toast("Acquistato ✅");

  btn.textContent = "Acquistato ✅";
  btn.disabled = true;
});