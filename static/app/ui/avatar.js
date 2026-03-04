(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }

  // world detect robusto (da path)
  function detectWorld(){
    const p = window.location.pathname || "/";
    if(p.startsWith("/world/")){
      const w = p.split("/")[2] || "hub";
      return w.toLowerCase();
    }
    if(p === "/store") return "store";
    return "hub";
  }

  // mapping: (world, equipped_skin) -> sprite
  function resolveSprite(world, equippedSkin){
    // 1) override skin-specific
    if(equippedSkin === "skin_kpmg_tie"){
      if(world === "kpmg") return "/static/app/ui/avatar/kpmg_tie.png";
      // se vuoi: stessa skin appare anche in hub/store
      return "/static/app/ui/avatar/kpmg_tie.png";
    }

    // 2) default per world
    if(world === "sarto")  return "/static/app/ui/avatar/sarto_default.png";
    if(world === "kpmg")   return "/static/app/ui/avatar/kpmg_default.png";
    if(world === "malibu") return "/static/app/ui/avatar/malibu_default.png";

    // 3) fallback
    return "/static/app/ui/avatar/default.png";
  }

  async function fetchStateIfMissing(){
    // se non hai state in template per qualche pagina, recupera da API
    if(!window.API?.apiGet) return null;
    try{
      const data = await window.API.apiGet("/api/state");
      return data?.state || null;
    }catch{
      return null;
    }
  }

  async function updateAvatar(state){
    const img = qs("#liba-avatar-img");
    const box = qs("#liba-avatar");
    if(!img || !box) return;

    const world = detectWorld();

    let equipped = "";
    if(state?.equipped_skin) equipped = state.equipped_skin;

    // se state non c’è, prova a leggere data-attr, altrimenti fetch
    if(!equipped){
      equipped = box.dataset.equippedSkin || "";
      if(!equipped){
        const st = await fetchStateIfMissing();
        equipped = st?.equipped_skin || "";
      }
    }

    img.src = resolveSprite(world, equipped);
  }

  // expose
  window.LIBA_AVATAR = {
    update: updateAvatar
  };

  // init on load
  document.addEventListener("DOMContentLoaded", async ()=>{
    // prova a usare info dal template se c'è
    const box = qs("#liba-avatar");
    let st = null;

    // se hai già un oggetto state globale in window puoi usarlo (opzionale)
    // altrimenti andiamo di fetch solo se serve
    if(box && (box.dataset.equippedSkin !== undefined)){
      await updateAvatar({ equipped_skin: box.dataset.equippedSkin || "" });
    } else {
      st = await fetchStateIfMissing();
      await updateAvatar(st);
    }
  });
})();