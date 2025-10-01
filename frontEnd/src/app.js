

const SIZES = ["S","M","L"]; 
const players = ["p1","p2","p3","p4"]; 
const TURN_SECONDS = 90; 


let turn = 0; 
let selectedSize = { p1:"L", p2:"L", p3:"L", p4:"L" };
let inventory = {
  p1:{S:3,M:3,L:3},
  p2:{S:3,M:3,L:3},
  p3:{S:3,M:3,L:3},
  p4:{S:3,M:3,L:3}
};

const board = Array.from({length:9}, () => ({S:null,M:null,L:null}));
const history = [];


let timerId = null;
let remaining = TURN_SECONDS;


const boardEl   = document.getElementById('board');
const statusEl  = document.getElementById('status');
const winBanner = document.getElementById('winBanner');
const bannerText= document.getElementById('bannerText');
const timerEl   = document.getElementById('timer');
const timerBox  = document.getElementById('timerBox');
const timerBar  = document.getElementById('timerBar');


function playerName(p){ 
  return p==='p1'?'Jogador 1':p==='p2'?'Jogador 2':p==='p3'?'Jogador 3':'Jogador 4'; 
}
function playerColorVar(p){
  return p==='p1'?'var(--p1)':p==='p2'?'var(--p2)':p==='p3'?'var(--p3)':'var(--p4)';
}
function labelSize(s){ 
  return s==='S'?'P':s==='M'?'M':'G'; 
}
function cellLabel(i){ return `(${Math.floor(i/3)+1},${(i%3)+1})`; }
function formatTime(sec){
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}


function renderBoard(){
  boardEl.innerHTML = '';
  for(let i=0;i<9;i++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;

    const slotL = document.createElement('div'); slotL.className = 'slot L';
    const slotM = document.createElement('div'); slotM.className = 'slot M';
    const slotS = document.createElement('div'); slotS.className = 'slot S';
    cell.append(slotL, slotM, slotS);

    SIZES.forEach(sz => {
      const owner = board[i][sz];
      if(owner){
        const ring = document.createElement('div');
        ring.className = `ring ${sz} ${owner}`;
        cell.appendChild(ring);
      }
    });

    cell.addEventListener('click', onCellClick);
    boardEl.appendChild(cell);
  }
}

function renderInventory(){
  ["p1","p2","p3","p4"].forEach(p=>{
    const invBox = document.getElementById(`inv-${p}`);
    if(!invBox) return;

    invBox.querySelectorAll('.inv').forEach(div=>{
      const sz = div.dataset.size;            
      
      const span = div.querySelector('span');
      if(span) span.textContent = inventory[p][sz];

      
      const btn = document.querySelector(`.sizePicker[data-player="${p}"] .sizeBtn[data-size="${sz}"]`);
      if(btn){
        const zero = inventory[p][sz] <= 0;
        btn.disabled = zero;
        
        if (zero && selectedSize[p] === sz) {
          const next = ["S","M","L"].find(s => inventory[p][s] > 0) || null;
          selectedSize[p] = next;
          const picker = document.querySelector(`.sizePicker[data-player="${p}"]`);
          if (picker) {
            picker.querySelectorAll('.sizeBtn').forEach(b=>b.classList.remove('active'));
            if (next){
              const nb = picker.querySelector(`.sizeBtn[data-size="${next}"]`);
              nb && nb.classList.add('active');
            }
          }
        }
      }
    });
  });
}


function onCellClick(e){
  const idx = +e.currentTarget.dataset.index;
  const playersArr = ["p1","p2","p3","p4"];
  const player = playersArr[turn];
  const size = selectedSize[player];

  if(!size){
    flashStatus(`${playerName(player)} não tem peças disponíveis.`);
    return;
  }
  if (inventory[player][size] <= 0){
    flashStatus(`${playerName(player)}: acabou a peça ${labelSize(size)}.`);
    return;
  }
  if (board[idx][size] !== null){
    flashStatus(`A casa (${Math.floor(idx/3)+1},${(idx%3)+1}) já tem ${labelSize(size)}.`);
    return;
  }

  // registra para desfazer
  history.push({ idx, size, player });

  // aplica jogada
  board[idx][size] = player;
  inventory[player][size]--;                 // 👈 AQUI DECREMENTA

  // re-render UI
  renderBoard();
  renderInventory();

  const winner = checkWin(player);
  if (winner){ endGame(player, winner); return; }

  nextTurn();
}

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWin(player){
  for(const line of LINES){
    for(const sz of SIZES){
      if(line.every(i => board[i][sz] === player)){
        return { type:'same-size-line', line, size:sz };
      }
    }
  }
  for(const line of LINES){
    const seq1 = ['S','M','L'];
    const seq2 = ['L','M','S'];
    const owners1 = line.map((i,k)=> board[i][seq1[k]]);
    const owners2 = line.map((i,k)=> board[i][seq2[k]]);
    if(owners1.every(o=>o===player)) return { type:'ascending-line', line };
    if(owners2.every(o=>o===player)) return { type:'descending-line', line };
  }
  for(let i=0;i<9;i++){
    if(SIZES.every(sz => board[i][sz] === player)){
      return { type:'concentric', cell:i };
    }
  }
  return null;
}

function endGame(player, info){
  stopTimer();
  const name = playerName(player);
  let text = `${name} venceu! `;
  if(info.type==='same-size-line') text += `Linha de ${labelSize(info.size)}.`;
  if(info.type==='ascending-line') text += `Sequência P→M→G na linha.`;
  if(info.type==='descending-line') text += `Sequência G→M→P na linha.`;
  if(info.type==='concentric') text += `Concentrado P+M+G na mesma casa.`;

  bannerText.textContent = text;
  winBanner.classList.add('show');
  statusEl.innerHTML = `<b style="color:${playerColorVar(player)}">${name}</b> venceu! Clique em Reiniciar para jogar novamente.`;

  Array.from(document.getElementsByClassName('cell')).forEach(c=>c.style.pointerEvents='none');
}


function updateTurnUI(){
  players.forEach((p,idx)=>{
    const el = document.getElementById(`${p}Turn`);
    if(el) el.style.opacity = (idx===turn) ? '1' : '.35';
  });
  const curr = players[turn];
  statusEl.innerHTML = `Vez do <b style="color:${playerColorVar(curr)}">${playerName(curr)}</b>. Você tem <b>${formatTime(remaining)}</b> para jogar.`;
   highlightCurrentPlayer();
}

function nextTurn(){
  turn = (turn + 1) % players.length;
  resetTimer();
  updateTurnUI();
}

function highlightCurrentPlayer(){
  // remove destaque de todos os cards
  document.querySelectorAll('.playerCard').forEach(c=>{
    c.classList.remove('playerCard--active','p1','p2','p3','p4');
  });

  // adiciona destaque no jogador da vez
  const curr = players[turn];
  const picker = document.querySelector(`.sizePicker[data-player="${curr}"]`);
  if(picker){
    const card = picker.closest('.playerCard');
    if(card){
      card.classList.add('playerCard--active', curr); 
      // ex: "playerCard--active p1"
    }
  }
}

function timeExpired(){
  const curr = players[turn];
  flashStatus(`⏰ Tempo esgotado para ${playerName(curr)}. Passando a vez...`);
  nextTurn();
}

function resetTimer(){
  stopTimer();
  remaining = TURN_SECONDS;
  applyTimerStyle(remaining);
  timerEl.textContent = formatTime(remaining);
  timerBar.style.transform = `scaleX(1)`;

  timerId = setInterval(()=>{
    remaining--;
    if(remaining < 0){
      timeExpired();
      return;
    }
    applyTimerStyle(remaining);
    timerEl.textContent = formatTime(remaining);
    const progress = Math.max(remaining, 0) / TURN_SECONDS;
    timerBar.style.transform = `scaleX(${progress})`;
  }, 1000);
}

function applyTimerStyle(sec){
  timerBox.classList.remove('timer--warning','timer--danger');
  if(sec <= 10) timerBox.classList.add('timer--danger');
  else if(sec <= 20) timerBox.classList.add('timer--warning');
}

function stopTimer(){
  if(timerId){
    clearInterval(timerId);
    timerId = null;
  }
}


function flashStatus(msg){
  statusEl.textContent = msg;
  setTimeout(updateTurnUI, 1200);
}


document.querySelectorAll('.sizePicker').forEach(group =>{
  group.addEventListener('click', (e)=>{
    const btn = e.target.closest('.sizeBtn');
    if(!btn) return;
    const player = group.dataset.player;
    group.querySelectorAll('.sizeBtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedSize[player] = btn.dataset.size;
  });
});


document.getElementById('undoBtn').addEventListener('click', ()=>{
  if(history.length===0) return;
  const last = history.pop();
  board[last.idx][last.size] = null;
  inventory[last.player][last.size]++;       // 👈 DEVOLVE A PEÇA
  turn = ["p1","p2","p3","p4"].indexOf(last.player);
  winBanner.classList.remove('show');
  renderBoard();
  renderInventory();
  resetTimer();
  updateTurnUI();
});

document.getElementById('undoBtn').addEventListener('click', ()=>{
  if(history.length===0) return;
  const last = history.pop();
  board[last.idx][last.size] = null;
  inventory[last.player][last.size]++;
  turn = players.indexOf(last.player);
  winBanner.classList.remove('show');
  renderBoard();
  renderInventory();
  resetTimer();
  updateTurnUI();
});


renderBoard();
renderInventory();
resetTimer();
updateTurnUI();

