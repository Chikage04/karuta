// io peut être absent (ex. Vercel serverless ne sert pas /socket.io/) → on ne plante pas.
const socket = (typeof io !== 'undefined') ? io('/tcg') : null;

// Toutes les infos carte viennent du moteur (source unique de vérité).
const engine = window.TCGEngine || {};
function safeCard(id) { try { return engine.getCard(id); } catch (e) { return null; } }
function meta(id) {
  const c = safeCard(id);
  if (!c) return { name: id, image: '' };
  return {
    name: c.name, image: c.image || '', hp: c.hp, type: c.type,
    attacks: c.attacks, retreat: c.retreat, ability: c.ability,
    kind: c.kind, energy: c.kind === 'energy' ? c.type : null,
  };
}

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
  el.className = 'card type-' + (m.type || 'colorless') + (opts.big ? ' big' : '') + (opts.droppable ? ' drop' : '');
  const imgHtml = m.image
    ? `<img class="art" src="${m.image}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'${m.name}'}))" alt="${m.name}">`
    : `<div class="ph">${m.name}</div>`;
  const hpLeft = m.hp != null ? Math.max(0, m.hp - (inPlay.damage || 0)) : null;
  const nrg = pips(inPlay.energy || []);
  el.innerHTML = imgHtml
    + (hpLeft != null ? `<span class="hpbadge">${hpLeft}<small>PV</small></span>` : '')
    + (nrg ? `<span class="nrgbar">${nrg}</span>` : '');
  if (opts.onClick) el.onclick = opts.onClick;
  if (opts.selected) el.classList.add('selected');
  return el;
}
function sym(t) { return ({ fire: '🔥', water: '💧', darkness: '🌑', fairy: '🎀', colorless: '⭐' })[t] || t; }
// Pastilles colorées par type d'énergie (coûts + énergies attachées).
function pips(list) { return (list || []).map((t) => `<span class="pip pip-${t}"></span>`).join(''); }

function handCardEl(id, index) {
  const m = meta(id);
  const el = document.createElement('div');
  const sel = selectedHandIndex === index ? ' selected' : '';
  if (m.energy) {
    // Carte d'énergie : couleur vive du type correspondant.
    el.className = 'card hand-card energy-card type-' + m.energy + sel;
    el.innerHTML = `<span class="edisc"><span class="pip pip-${m.energy}"></span></span><span class="ename">${m.name}</span>`;
  } else {
    el.className = 'card hand-card type-' + (m.type || 'colorless') + sel;
    const imgHtml = m.image
      ? `<img class="art" src="${m.image}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph',textContent:'${m.name}'}))">`
      : `<div class="ph">${m.name}</div>`;
    el.innerHTML = imgHtml + `<span class="cap">${m.name}</span>`;
  }
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

  // Est-on en train d'attacher une énergie ? → les Pokémon valides clignotent.
  const attaching = !!(state.yourTurn && selectedHandIndex != null
    && meta(you.hand[selectedHandIndex]).energy);

  fill('oppActive', opp.active ? [cardEl(opp.active, { big: true })] : []);
  fill('oppBench', opp.bench.map((b) => cardEl(b)));

  fill('youActive', you.active ? [cardEl(you.active, {
    big: true, droppable: attaching,
    onClick: () => tryAttachTo('active'),
  })] : []);
  fill('youBench', you.bench.map((b, i) => cardEl(b, { droppable: attaching, onClick: () => tryAttachTo('bench:' + i) })));

  fill('hand', you.hand.map((id, i) => handCardEl(id, i)));
  $('turnHint').textContent = turnHintText();
  renderActions();
  $('log').innerHTML = (state.log || []).map((l) => `<div>${l}</div>`).join('');
}

function turnHintText() {
  if (!state.yourTurn) return '⏳ Tour adverse…';
  if (selectedHandIndex != null) {
    const c = safeCard(state.you.hand[selectedHandIndex]);
    if (c && c.kind === 'energy') return `⚡ ${c.name} sélectionnée — clique un de TES Pokémon (ils clignotent) pour l'attacher.`;
    if (c && c.kind === 'pokemon' && c.stage === 'basic') return `🃏 ${c.name} prêt — clique « Poser au banc » ci-dessous.`;
    return 'Cette carte ne se joue pas directement. Reclique-la pour désélectionner.';
  }
  return 'À toi ! Attache une énergie (clique-la dans ta main, puis un Pokémon), pose un Pokémon Basic, ou attaque.';
}

function fill(id, nodes) { const c = $(id); c.innerHTML = ''; nodes.forEach((n) => c.appendChild(n)); }

function groupEl(label) {
  const g = document.createElement('div'); g.className = 'act-group';
  const h = document.createElement('div'); h.className = 'act-group-label'; h.textContent = label;
  g.appendChild(h);
  return g;
}
function mkBtn(label, enabled, onClick, title) {
  const b = document.createElement('button');
  b.className = 'act'; b.textContent = label; b.disabled = !enabled; b.onclick = onClick;
  if (title) b.title = title;
  return b;
}

function renderActions() {
  const box = $('actions'); box.innerHTML = '';
  const my = state.yourTurn;
  const you = state.you;
  const oppCard = state.opponent.active ? safeCard(state.opponent.active.cardId) : null;

  // Carte de main sélectionnée → action contextuelle (poser un Basic au banc)
  if (my && selectedHandIndex != null) {
    const c = safeCard(you.hand[selectedHandIndex]);
    if (c && c.kind === 'pokemon' && c.stage === 'basic') {
      const g = groupEl('Carte sélectionnée');
      const b = mkBtn(`Poser ${c.name} au banc`, you.bench.length < 2,
        () => { sendAction({ type: 'playBench', payload: { handIndex: selectedHandIndex } }); selectedHandIndex = null; },
        you.bench.length >= 2 ? 'Banc plein (2 max)' : '');
      b.classList.add('act-play');
      g.appendChild(b); box.appendChild(g);
    }
  }

  // Attaques de l'actif — avec dégâts, coût, et raison si indisponible
  if (you.active) {
    const activeCard = safeCard(you.active.cardId);
    const g = groupEl('Attaques');
    (activeCard && activeCard.attacks || []).forEach((atk, i) => {
      const cost = (oppCard && engine.attackCost) ? engine.attackCost(atk, oppCard) : atk.cost;
      const enough = oppCard && engine.energyCostMet && engine.energyCostMet(cost, you.active.energy);
      const usable = my && enough;
      const b = document.createElement('button');
      b.className = 'act act-attack' + (usable ? '' : ' locked');
      b.disabled = !usable;
      b.innerHTML = `<span class="a-name">${atk.name}</span>`
        + `<span class="a-dmg">${atk.damage ? atk.damage : '—'}</span>`
        + `<span class="a-cost">${pips(cost)}</span>`
        + (my && !enough ? `<span class="a-lock">⚡ énergie insuffisante</span>` : '');
      b.onclick = () => sendAction({ type: 'attack', payload: { attackIndex: i } });
      g.appendChild(b);
    });
    box.appendChild(g);
  }

  // Autres actions
  const g2 = groupEl('Autres');
  if (you.active && you.bench.length > 0) {
    const rcost = (safeCard(you.active.cardId) || {}).retreat || 0;
    const canRetreat = my && you.active.energy.length >= rcost;
    g2.appendChild(mkBtn(`Retraite — échanger l'actif (−${rcost}⚡)`, canRetreat,
      () => sendAction({ type: 'retreat', payload: { benchIndex: 0 } }),
      canRetreat ? '' : "Pas assez d'énergie sur l'actif"));
  }
  g2.appendChild(mkBtn('Passer le tour ▶', my,
    () => { selectedHandIndex = null; sendAction({ type: 'pass', payload: {} }); }));
  box.appendChild(g2);
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
