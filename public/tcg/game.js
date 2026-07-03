// io peut être absent (ex. Vercel serverless ne sert pas /socket.io/) → on ne plante pas.
const socket = (typeof io !== 'undefined') ? io('/tcg') : null;

// Métadonnées d'affichage (copie légère de data/cards.js — nom, image, hp, attaques, retraite).
const CARD_META = {
  fay: { name: 'Fay', image: 'assets/cards/fay.webp', hp: 110, retreat: 2, type: 'fire',
         attacks: [{ name: 'Délit de faciès', cost: ['fire','fire','fire'], damage: 100 }] },
  groud: { name: 'Groud VSTAR', image: 'assets/cards/groud.webp', hp: 10, retreat: 1, type: 'darkness',
           attacks: [{ name: 'Amnésie', cost: ['darkness','fairy'], damage: 30 }] },
  vingt2: { name: 'vingt2', image: 'assets/cards/vingt2.webp', hp: 70, retreat: 2, type: 'fairy',
            attacks: [{ name: 'Gribouillage', cost: ['colorless','fairy','fairy'], damage: 0 }] },
  jelee: { name: 'Jelee', image: 'assets/cards/jelee.webp', hp: 100, retreat: 3, type: 'darkness',
           attacks: [{ name: 'Horde de muridés', cost: ['darkness','colorless'], damage: 20 }] },
  'energy-fire': { name: 'Énergie Feu', image: 'assets/cards/energy-fire.png', energy: 'fire' },
  'energy-water': { name: 'Énergie Eau', image: 'assets/cards/energy-water.png', energy: 'water' },
  'energy-darkness': { name: 'Énergie Ténèbres', image: 'assets/cards/energy-darkness.png', energy: 'darkness' },
  'energy-fairy': { name: 'Énergie Fée', image: 'assets/cards/energy-fairy.png', energy: 'fairy' },
  'energy-colorless': { name: 'Énergie Incolore', image: 'assets/cards/energy-colorless.png', energy: 'colorless' },
};
function meta(id) { return CARD_META[id] || { name: id, image: '' }; }

const $ = (id) => document.getElementById(id);
let state = null;            // dernier game:state reçu
let selectedHandIndex = null;

// ---- Partie test : jouée entièrement dans le navigateur (aucun serveur requis) ----
let localGame = null;
let localMode = false;

// ---- Lobby ----
$('joinBtn').onclick = () => {
  if (!socket) { $('status').textContent = 'Mode en ligne indisponible ici. Utilise « Partie test ».'; return; }
  const name = $('nameInput').value || 'Joueur';
  socket.emit('matchmaking:join', { playerName: name });
  $('status').textContent = 'Recherche d\'un adversaire...';
  $('joinBtn').disabled = true;
  $('soloBtn').disabled = true;
};
$('soloBtn').onclick = () => {
  const eng = window.TCGEngine;
  if (!eng) { $('status').textContent = 'Moteur non chargé — recharge la page.'; return; }
  const name = $('nameInput').value || 'Joueur';
  const seed = Math.floor(Math.random() * 1e9) + 1;
  localMode = true;
  localGame = eng.createGame('local',
    { pid: 'A', name: name + ' — Côté 1' },
    { pid: 'B', name: name + ' — Côté 2' }, seed);
  $('lobby').classList.add('hidden');
  $('board').classList.remove('hidden');
  renderLocal();
};

if (socket) {
  socket.on('matchmaking:waiting', () => { $('status').textContent = 'En attente d\'un adversaire...'; });
  socket.on('matchmaking:found', ({ opponentName }) => {
    $('status').textContent = `Adversaire trouvé : ${opponentName}`;
    $('lobby').classList.add('hidden');
    $('board').classList.remove('hidden');
  });
  socket.on('opponent:disconnected', () => { showOverlay('Adversaire déconnecté.'); });
  socket.on('game:error', ({ message }) => { flashLog('⛔ ' + message); });
  socket.on('game:over', ({ winnerName, youWon, solo }) => {
    if (solo) showOverlay(`🏆 ${winnerName} gagne ! (partie test)`);
    else showOverlay(youWon ? '🏆 Victoire !' : `Défaite. ${winnerName} gagne.`);
  });
  socket.on('game:state', (s) => { state = s; render(); });
}

// ---- Rendu ----
function cardEl(inPlay, opts = {}) {
  const m = meta(inPlay.cardId);
  const el = document.createElement('div');
  el.className = 'card type-' + (m.type || 'colorless') + (opts.big ? ' big' : '');
  const imgHtml = m.image
    ? `<img src="${m.image}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'${m.name}'}))" alt="${m.name}">`
    : `<div class="ph">${m.name}</div>`;
  const hpLeft = m.hp != null ? Math.max(0, m.hp - (inPlay.damage || 0)) : '';
  el.innerHTML = imgHtml +
    `<div class="meta"><span>${m.name}</span><span class="hp">${hpLeft !== '' ? hpLeft + ' PV' : ''}</span></div>` +
    `<div class="energy">${(inPlay.energy || []).map(sym).join(' ') || ''}</div>`;
  if (opts.onClick) el.onclick = opts.onClick;
  if (opts.selected) el.classList.add('selected');
  return el;
}
function sym(t) { return ({ fire:'🔥', water:'💧', darkness:'🌑', fairy:'🎀', colorless:'⭐' })[t] || t; }

function handCardEl(id, index) {
  const m = meta(id);
  const el = document.createElement('div');
  el.className = 'card type-' + (m.type || 'colorless') + (selectedHandIndex === index ? ' selected' : '');
  el.innerHTML = (m.image
    ? `<img src="${m.image}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'${m.name}'}))">`
    : `<div class="ph">${m.name}</div>`) + `<div class="meta"><span>${m.name}</span></div>`;
  el.onclick = () => { selectedHandIndex = (selectedHandIndex === index ? null : index); render(); };
  return el;
}

function render() {
  if (!state) return;
  const you = state.you, opp = state.opponent;
  $('oppInfo').innerHTML = `${opp.name} — récompenses ${opp.prizesTaken}/3 — main ${opp.handCount} — deck ${opp.deckCount}`;
  const soloTag = state.solo ? '🎮 <span class="badge">MODE TEST</span> tu joues les 2 côtés · ' : '';
  $('youInfo').innerHTML = soloTag + `${you.name} — récompenses ${you.prizesTaken}/3 — deck ${you.deckCount}` +
    (state.yourTurn ? ' — <span class="badge">À CE CÔTÉ DE JOUER</span>' : ' — tour adverse');

  fill('oppActive', opp.active ? [cardEl(opp.active, { big: true })] : []);
  fill('oppBench', opp.bench.map((b) => cardEl(b)));

  fill('youActive', you.active ? [cardEl(you.active, {
    big: true,
    onClick: () => tryAttachTo('active'),
  })] : []);
  fill('youBench', you.bench.map((b, i) => cardEl(b, { onClick: () => tryAttachTo('bench:' + i) })));

  fill('hand', you.hand.map((id, i) => handCardEl(id, i)));
  renderActions();
  $('log').innerHTML = (state.log || []).map((l) => `<div>${l}</div>`).join('');
}

function fill(id, nodes) { const c = $(id); c.innerHTML = ''; nodes.forEach((n) => c.appendChild(n)); }

function renderActions() {
  const box = $('actions'); box.innerHTML = '';
  const my = state.yourTurn;
  const you = state.you;

  // Attaques de l'actif
  const activeMeta = you.active ? meta(you.active.cardId) : null;
  if (activeMeta && activeMeta.attacks) {
    activeMeta.attacks.forEach((atk, i) => {
      const b = document.createElement('button');
      b.textContent = `Attaque : ${atk.name} (${atk.cost.map(sym).join('')})`;
      b.disabled = !my;
      b.onclick = () => sendAction({ type: 'attack', payload: { attackIndex: i } });
      box.appendChild(b);
    });
  }
  // Jouer le Pokémon sélectionné au banc
  if (selectedHandIndex != null) {
    const bench = document.createElement('button');
    bench.textContent = 'Poser au banc';
    bench.disabled = !my || you.bench.length >= 2;
    bench.onclick = () => { sendAction({ type: 'playBench', payload: { handIndex: selectedHandIndex } }); selectedHandIndex = null; };
    box.appendChild(bench);
  }
  // Retraite
  if (you.active && you.bench.length > 0) {
    const r = document.createElement('button');
    r.textContent = 'Retraite (→ banc 0)';
    r.disabled = !my;
    r.onclick = () => sendAction({ type: 'retreat', payload: { benchIndex: 0 } });
    box.appendChild(r);
  }
  // Passer
  const pass = document.createElement('button');
  pass.textContent = 'Passer le tour';
  pass.disabled = !my;
  pass.onclick = () => { selectedHandIndex = null; sendAction({ type: 'pass', payload: {} }); };
  box.appendChild(pass);

  if (selectedHandIndex != null) {
    const hint = document.createElement('span');
    hint.className = 'badge';
    hint.textContent = 'Carte sélectionnée : clique un Pokémon pour attacher l\'énergie, ou "Poser au banc".';
    box.appendChild(hint);
  }
}

function tryAttachTo(slot) {
  if (!state.yourTurn || selectedHandIndex == null) return;
  const id = state.you.hand[selectedHandIndex];
  if (!meta(id).energy) return; // seulement les énergies s'attachent
  sendAction({ type: 'attachEnergy', payload: { handIndex: selectedHandIndex, targetSlot: slot } });
  selectedHandIndex = null;
}

// Envoi d'une action : en solo → moteur local ; en ligne → serveur.
function sendAction(action) {
  if (localMode) {
    const res = window.TCGEngine.applyAction(localGame, localGame.turn, action);
    if (!res.ok) flashLog('⛔ ' + res.error);
    renderLocal();
  } else if (socket) {
    sendAction(action);
  }
}
function renderLocal() {
  const eng = window.TCGEngine;
  state = Object.assign({}, eng.viewFor(localGame, localGame.turn), { solo: true });
  render();
  if (localGame.phase === 'gameOver') {
    const w = localGame.players[localGame.winner];
    showOverlay(`🏆 ${w ? w.name : '?'} gagne ! (partie test)`);
  }
}

function flashLog(msg) { const l = $('log'); if (l) l.insertAdjacentHTML('afterbegin', `<div>${msg}</div>`); }
function showOverlay(text) { const o = $('overlay'); o.textContent = text; o.classList.remove('hidden'); }
