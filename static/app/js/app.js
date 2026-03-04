// PWA SW
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(()=>{});
}

// highlight active nav
(() => {
  const path = location.pathname;
  document.querySelectorAll(".nav a").forEach(a=>{
    if(a.getAttribute("href") === path) a.classList.add("active");
  });
})();

// initial wallet sync
window.LIBA.refreshState().catch(()=>{});