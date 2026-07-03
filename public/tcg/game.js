const socket = io('/tcg');

// Métadonnées d'affichage (copie légère de data/cards.js — nom, image, hp, attaques, retraite).
const CARD_META = {
  fay: { name: 'Fay', image: 'assets/cards/fay.png', hp: 110, retreat: 2,
         attacks: [{ name: 'Délit de faciès', cost: ['fire','fire','fire'], damage: 100 }] },
  groud: { name: 'Groud VSTAR', image: 'assets/cards/groud.png', hp: 10, retreat: 1,
           attacks: [{ name: 'Amnésie', cost: ['darkness','fairy'], damage: 30 }] },
  vingt2: { name: 'vingt2', image: 'assets/cards/vingt2.png', hp: 70, retreat: 2,
            attacks: [{ name: 'Gribouillage', cost: ['colorless','fairy','fairy'], damage: 0 }] },
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

// ---- Lobby ----
$('joinBtn').onclick = () => {
  const name = $('nameInput').value || 'Joueur';
  socket.emit('matchmaking:join', { playerName: name });
  $('status').textContent = 'Recherche d\'un adversaire...';
  $('joinBtn').disabled = true;
};
socket.on('matchmaking:waiting', () => { $('status').textContent = 'En attente d\'un adversaire...'; });
socket.on('matchmaking:found', ({ opponentName }) => {
  $('status').textContent = `Adversaire trouvé : ${opponentName}`;
  $('lobby').classList.add('hidden');
  $('board').classList.remove('hidden');
});
socket.on('opponent:disconnected', () => { showOverlay('Adversaire déconnecté.'); });
socket.on('game:error', ({ message }) => { flashLog('⛔ ' + message); });
socket.on('game:over', ({ winnerName, youWon }) => {
  showOverlay(youWon ? '🏆 Victoire !' : `Défaite. ${winnerName} gagne.`);
});
socket.on('game:state', (s) => { state = s; render(); });

// ---- Rendu ----
function cardEl(inPlay, opts = {}) {
  const m = meta(inPlay.cardId);
  const el = document.createElement('div');
  el.className = 'card' + (opts.big ? ' big' : '');
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
  el.className = 'card' + (selectedHandIndex === index ? ' selected' : '');
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
  $('youInfo').innerHTML = `${you.name} — récompenses ${you.prizesTaken}/3 — deck ${you.deckCount}` +
    (state.yourTurn ? ' — <span class="badge">TON TOUR</span>' : ' — tour adverse');

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
      b.onclick = () => socket.emit('game:action', { type: 'attack', payload: { attackIndex: i } });
      box.appendChild(b);
    });
  }
  // Jouer le Pokémon sélectionné au banc
  if (selectedHandIndex != null) {
    const bench = document.createElement('button');
    bench.textContent = 'Poser au banc';
    bench.disabled = !my || you.bench.length >= 2;
    bench.onclick = () => { socket.emit('game:action', { type: 'playBench', payload: { handIndex: selectedHandIndex } }); selectedHandIndex = null; };
    box.appendChild(bench);
  }
  // Retraite
  if (you.active && you.bench.length > 0) {
    const r = document.createElement('button');
    r.textContent = 'Retraite (→ banc 0)';
    r.disabled = !my;
    r.onclick = () => socket.emit('game:action', { type: 'retreat', payload: { benchIndex: 0 } });
    box.appendChild(r);
  }
  // Passer
  const pass = document.createElement('button');
  pass.textContent = 'Passer le tour';
  pass.disabled = !my;
  pass.onclick = () => { selectedHandIndex = null; socket.emit('game:action', { type: 'pass', payload: {} }); };
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
  socket.emit('game:action', { type: 'attachEnergy', payload: { handIndex: selectedHandIndex, targetSlot: slot } });
  selectedHandIndex = null;
}

function flashLog(msg) { const l = $('log'); if (l) l.insertAdjacentHTML('afterbegin', `<div>${msg}</div>`); }
function showOverlay(text) { const o = $('overlay'); o.textContent = text; o.classList.remove('hidden'); }
