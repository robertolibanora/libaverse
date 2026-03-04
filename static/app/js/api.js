async function apiGet(url){
  const r = await fetch(url, { credentials: "same-origin" });
  return r.json();
}

async function apiPost(url, body){
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    credentials: "same-origin",
    body: JSON.stringify(body || {})
  });
  return r.json();
}

window.API = { apiGet, apiPost };