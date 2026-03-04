let QUESTIONS = [];
let idx = 0;

function shuffle(arr){
  return arr.map(v=>[Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}

async function loadQuestions(){
  const data = await window.API.apiGet("/api/world/kpmg/data/questions.json");
  QUESTIONS = Array.isArray(data) ? data : (data.questions || []);
  QUESTIONS = shuffle(QUESTIONS);
}

function renderQuestion(){
  const q = QUESTIONS[idx % QUESTIONS.length];
  document.getElementById("q-text").textContent = q.text;

  const wrap = document.getElementById("q-answers");
  wrap.innerHTML = "";
  q.answers.forEach((a) => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = a.label;
    b.addEventListener("click", () => answer(a.correct));
    wrap.appendChild(b);
  });
}

async function answer(isCorrect){
  const result = isCorrect ? "correct" : "wrong";
  const data = await window.API.apiPost("/api/earn", { world:"kpmg", result });

  if(data?.state) window.LIBA.renderWallet(data.state);
  window.LIBA.toast(isCorrect ? "+10 🧠 BrainCell" : "-7 🧠 BrainCell 💀");

  idx++;
  renderQuestion();
}

(async function init(){
  await loadQuestions();
  renderQuestion();
  document.getElementById("kpmg-next").addEventListener("click", ()=>{
    idx++; renderQuestion();
  });
})();