// ═══════════════════════════════════════════════════════════════════════════
// KARUTA — Client
// ═══════════════════════════════════════════════════════════════════════════

const socket = io();

// ─── DOM ────────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const screenLobby = $('#screen-lobby');
const screenGame = $('#screen-game');
const screenResults = $('#screen-results');

const inputName = $('#player-name');
const btnStart = $('#btn-start');
const btnCancel = $('#btn-cancel');
const matchmakingStatus = $('#matchmaking-status');

const opponentNameEl = $('#opponent-name');
const yourNameEl = $('#your-name');
const opponentCardsEl = $('#opponent-cards');
const yourCardsEl = $('#your-cards');
const roundNumberEl = $('#round-number');
const countdownDisplay = $('#countdown-display');
const roundStatus = $('#round-status');
const speakerIcon = $('#speaker-icon');

const opponentCardsZone = $('#opponent-cards-zone');
const yourCardsZone = $('#your-cards-zone');

const memorizeBar = $('#memorize-bar');
const memorizeProgress = $('#memorize-progress');
const memorizeSeconds = $('#memorize-seconds');

const transferOverlay = $('#transfer-overlay');
const transferCards = $('#transfer-cards');
const waitingOverlay = $('#waiting-overlay');

const resultIcon = $('#result-icon');
const resultText = $('#result-text');
const resultSub = $('#result-sub');
const btnReplay = $('#btn-replay');

const yourAvgEl = $('#your-avg');
const opponentAvgEl = $('#opponent-avg');

const disconnectOverlay = $('#disconnect-overlay');
const btnBackLobby = $('#btn-back-lobby');

const closeRaceOverlay = $('#close-race-overlay');
const raceWinnerName = $('#race-winner-name');
const raceWinnerTime = $('#race-winner-time');
const raceLoserName = $('#race-loser-name');
const raceLoserTime = $('#race-loser-time');
const raceDiff = $('#race-diff');

const placementBar = $('#placement-bar');
const btnReady = $('#btn-ready');
const readyStatus = $('#ready-status');

const incomingBar = $('#incoming-bar');
const incomingCardPreview = $('#incoming-card-preview');

// ─── État client ────────────────────────────────────────────────────────────
let myHand = [];
let oppHand = [];
let locked = false;
let cardsDisabled = true;
const TOUCH_FEEDBACK_DURATION_MS = 200;
let myPositions = new Array(12).fill(null);
let oppPositions = new Array(12).fill(null);
let isPlacementPhase = false;
let dragState = null; // { sourceIndex, ghostEl, offsetX, offsetY }
let pendingIncomingCard = null;

// ─── Synthèse vocale (TTS) ─────────────────────────────────────────────────
let frenchVoice = null;

function initVoices() {
  const voices = speechSynthesis.getVoices();
  frenchVoice = voices.find(v => v.lang.startsWith('fr') && v.localService)
    || voices.find(v => v.lang.startsWith('fr'))
    || null;
}

speechSynthesis.onvoiceschanged = initVoices;
initVoices();

function speakPhrase(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.9;
  utterance.pitch = 1;
  if (frenchVoice) utterance.voice = frenchVoice;
  utterance.onend = () => speakerIcon.classList.add('hidden');
  speechSynthesis.speak(utterance);
}

// ─── Navigation ─────────────────────────────────────────────────────────────
function showScreen(screen) {
  screenLobby.classList.remove('active');
  screenGame.classList.remove('active');
  screenResults.classList.remove('active');
  screen.classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════════════════════

btnStart.addEventListener('click', () => {
  const name = inputName.value.trim() || 'Joueur';
  socket.emit('matchmaking:join', { playerName: name });
  btnStart.classList.add('hidden');
  inputName.disabled = true;
  matchmakingStatus.classList.remove('hidden');
});

btnCancel.addEventListener('click', () => {
  socket.emit('matchmaking:cancel');
  matchmakingStatus.classList.add('hidden');
  btnStart.classList.remove('hidden');
  inputName.disabled = false;
});

inputName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnStart.click();
});

btnReplay.addEventListener('click', () => {
  showScreen(screenLobby);
  matchmakingStatus.classList.add('hidden');
  btnStart.classList.remove('hidden');
  inputName.disabled = false;
  resetGameUI();
});

btnBackLobby.addEventListener('click', () => {
  disconnectOverlay.classList.add('hidden');
  showScreen(screenLobby);
  matchmakingStatus.classList.add('hidden');
  btnStart.classList.remove('hidden');
  inputName.disabled = false;
  resetGameUI();
});

btnReady.addEventListener('click', () => {
  socket.emit('game:ready', { positions: [...myPositions] });
  btnReady.disabled = true;
  btnReady.textContent = 'En attente...';
});

function resetGameUI() {
  opponentCardsZone.innerHTML = '';
  yourCardsZone.innerHTML = '';
  roundStatus.textContent = '';
  roundStatus.className = '';
  countdownDisplay.classList.add('hidden');
  memorizeBar.classList.add('hidden');
  placementBar.classList.add('hidden');
  incomingBar.classList.add('hidden');
  speakerIcon.classList.add('hidden');
  transferOverlay.classList.add('hidden');
  waitingOverlay.classList.add('hidden');
  closeRaceOverlay.classList.add('hidden');
  opponentCardsZone.classList.remove('hidden');
  yourCardsZone.classList.remove('placement-mode');
  yourCardsZone.classList.remove('incoming-mode');
  myHand = [];
  oppHand = [];
  myPositions = new Array(12).fill(null);
  oppPositions = new Array(12).fill(null);
  dragState = null;
  pendingIncomingCard = null;
  isPlacementPhase = false;
  locked = false;
  cardsDisabled = true;
  speechSynthesis.cancel();
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHMAKING
// ═══════════════════════════════════════════════════════════════════════════

socket.on('matchmaking:waiting', () => {});

socket.on('matchmaking:found', ({ opponentName }) => {
  opponentNameEl.textContent = opponentName;
});

socket.on('game:init', ({ yourHand, opponentHand, yourName, opponentName }) => {
  myHand = [...yourHand];
  oppHand = [...opponentHand];
  showScreen(screenGame);
  yourNameEl.textContent = yourName;
  opponentNameEl.textContent = opponentName;
  yourCardsEl.textContent = myHand.length;
  opponentCardsEl.textContent = oppHand.length;
  roundNumberEl.textContent = '0';
  roundStatus.textContent = '';
  yourAvgEl.textContent = '—';
  opponentAvgEl.textContent = '—';
  cardsDisabled = true;
});

// ═══════════════════════════════════════════════════════════════════════════
// PLACEMENT
// ═══════════════════════════════════════════════════════════════════════════

socket.on('game:placement', () => {
  isPlacementPhase = true;
  dragState = null;
  myPositions = new Array(12).fill(null);
  myHand.forEach((phrase, i) => { myPositions[i] = phrase; });

  placementBar.classList.remove('hidden');
  opponentCardsZone.classList.add('hidden');
  yourCardsZone.classList.add('placement-mode');
  btnReady.disabled = false;
  btnReady.textContent = 'Prêt';
  readyStatus.textContent = '';

  renderPlacementGrid();
});

socket.on('game:opponentReady', () => {
  readyStatus.textContent = 'Adversaire prêt !';
});

socket.on('game:allReady', ({ yourPositions, opponentPositions }) => {
  myPositions = yourPositions;
  oppPositions = opponentPositions;
  isPlacementPhase = false;
  dragState = null;

  placementBar.classList.add('hidden');
  opponentCardsZone.classList.remove('hidden');
  yourCardsZone.classList.remove('placement-mode');

  renderAllCards();
});

function renderPlacementGrid() {
  yourCardsZone.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const slot = document.createElement('div');
    slot.className = 'grid-slot';
    slot.dataset.index = i;

    if (myPositions[i]) {
      const card = document.createElement('div');
      card.className = 'card';
      card.textContent = myPositions[i];
      card.style.animationDelay = `${i * 0.03}s`;
      card.addEventListener('pointerdown', (e) => onDragStart(e, i));
      slot.appendChild(card);
    }

    yourCardsZone.appendChild(slot);
  }
}

function onDragStart(e, sourceIndex) {
  if (!isPlacementPhase || dragState) return;
  e.preventDefault();

  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();

  // Create ghost that follows cursor
  const ghost = document.createElement('div');
  ghost.className = 'card drag-ghost';
  ghost.textContent = myPositions[sourceIndex];
  ghost.style.width = rect.width + 'px';
  ghost.style.minHeight = rect.height + 'px';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  document.body.appendChild(ghost);

  card.classList.add('dragging');

  dragState = {
    sourceIndex,
    ghostEl: ghost,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    sourceCard: card
  };

  card.setPointerCapture(e.pointerId);
  card.addEventListener('pointermove', onDragMove);
  card.addEventListener('pointerup', onDragEnd);
}

function onDragMove(e) {
  if (!dragState) return;
  dragState.ghostEl.style.left = (e.clientX - dragState.offsetX) + 'px';
  dragState.ghostEl.style.top = (e.clientY - dragState.offsetY) + 'px';

  // Highlight slot under cursor
  const slots = yourCardsZone.querySelectorAll('.grid-slot');
  slots.forEach(s => s.classList.remove('drop-target'));
  const target = getSlotUnderPointer(e.clientX, e.clientY);
  if (target !== null && target !== dragState.sourceIndex) {
    slots[target].classList.add('drop-target');
  }
}

function onDragEnd(e) {
  if (!dragState) return;

  const targetIndex = getSlotUnderPointer(e.clientX, e.clientY);

  // Swap if dropped on a different slot
  if (targetIndex !== null && targetIndex !== dragState.sourceIndex) {
    [myPositions[dragState.sourceIndex], myPositions[targetIndex]] =
      [myPositions[targetIndex], myPositions[dragState.sourceIndex]];
  }

  // Cleanup
  dragState.ghostEl.remove();
  dragState.sourceCard.removeEventListener('pointermove', onDragMove);
  dragState.sourceCard.removeEventListener('pointerup', onDragEnd);
  dragState = null;

  renderPlacementGrid();
}

function getSlotUnderPointer(x, y) {
  const slots = yourCardsZone.querySelectorAll('.grid-slot');
  for (const slot of slots) {
    const r = slot.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      return parseInt(slot.dataset.index);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉMORISATION
// ═══════════════════════════════════════════════════════════════════════════

socket.on('game:memorize', ({ duration }) => {
  memorizeBar.classList.remove('hidden');
  memorizeProgress.style.transition = 'none';
  memorizeProgress.style.width = '100%';
  memorizeSeconds.textContent = `${duration}s`;
  requestAnimationFrame(() => {
    memorizeProgress.style.transition = `width ${duration}s linear`;
    memorizeProgress.style.width = '0%';
  });
});

socket.on('game:memorize-tick', ({ remaining }) => {
  memorizeSeconds.textContent = `${remaining}s`;
  if (remaining <= 5) memorizeSeconds.style.color = 'var(--vermillion)';
});

socket.on('game:memorize-end', () => {
  memorizeBar.classList.add('hidden');
  memorizeSeconds.style.color = '';
});

// ═══════════════════════════════════════════════════════════════════════════
// JEU
// ═══════════════════════════════════════════════════════════════════════════

socket.on('game:countdown', ({ count }) => {
  countdownDisplay.classList.remove('hidden');
  countdownDisplay.textContent = count > 0 ? count : 'はじめ!';
  if (count === 0) setTimeout(() => countdownDisplay.classList.add('hidden'), 900);
  countdownDisplay.style.animation = 'none';
  countdownDisplay.offsetHeight;
  countdownDisplay.style.animation = '';
});

socket.on('round:announce', ({ phrase, roundNumber }) => {
  finishPendingIncoming();
  roundNumberEl.textContent = roundNumber;
  speakerIcon.classList.remove('hidden');
  roundStatus.textContent = 'Trouvez la carte !';
  roundStatus.className = '';
  cardsDisabled = false;
  locked = false;
  setAllCardsDisabled(false);
  speakPhrase(phrase);
});

socket.on('round:result', ({ winnerName, phrase, yourHand, opponentHand, youWonRound, tookFromOpponent, reactionTime, yourAvgTime, opponentAvgTime, faultPenaltyPhrase, closeRace }) => {
  cardsDisabled = true;
  setAllCardsDisabled(true);
  speakerIcon.classList.add('hidden');

  if (yourAvgTime > 0) yourAvgEl.textContent = `${yourAvgTime} ms`;
  if (opponentAvgTime > 0) opponentAvgEl.textContent = `${opponentAvgTime} ms`;

  if (youWonRound) {
    let msg = tookFromOpponent ? 'Pris chez l\'adversaire !' : 'Bonne réponse !';
    msg += ` (${reactionTime} ms)`;
    if (faultPenaltyPhrase) msg += ' + carte envoyée au fautif !';
    roundStatus.textContent = msg;
    roundStatus.className = 'success';
  } else {
    let msg = `${winnerName} a été plus rapide !`;
    if (faultPenaltyPhrase) msg += ' Vous recevez une carte en plus (faute) !';
    roundStatus.textContent = msg;
    roundStatus.className = 'fail';
  }

  if (closeRace) showCloseRace(closeRace);

  const cardEl = findCardInZones(phrase);
  if (cardEl) {
    cardEl.classList.add('correct');
    setTimeout(() => {
      cardEl.classList.add('removing');
      setTimeout(() => {
        applyHandUpdate(yourHand, opponentHand);
      }, 400);
    }, 500);
  } else {
    applyHandUpdate(yourHand, opponentHand);
  }
});

socket.on('round:penalty', ({ phrase, side }) => {
  locked = true;
  const zone = side === 'opponent' ? opponentCardsZone : yourCardsZone;
  const cardEl = zone.querySelector(`[data-phrase="${CSS.escape(phrase)}"]`);
  if (cardEl) {
    cardEl.classList.add('wrong');
    setTimeout(() => cardEl.classList.remove('wrong'), 400);
  }
  roundStatus.textContent = 'Mauvaise carte !';
  roundStatus.className = 'fail';
  setTimeout(() => { locked = false; }, 100);
});

socket.on('round:timeout', () => {
  finishPendingIncoming();
  cardsDisabled = true;
  setAllCardsDisabled(true);
  speakerIcon.classList.add('hidden');
  roundStatus.textContent = 'Temps écoulé !';
  roundStatus.className = 'fail';
});

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFERT DE CARTE
// ═══════════════════════════════════════════════════════════════════════════

socket.on('game:chooseTransfer', () => {
  finishPendingIncoming();
  transferOverlay.classList.remove('hidden');
  transferCards.innerHTML = '';
  myHand.forEach((phrase, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = phrase;
    card.style.animationDelay = `${index * 0.06}s`;
    card.addEventListener('pointerdown', () => {
        triggerCardTouchFeedback(card);
        socket.emit('game:transferCard', { phraseText: phrase });
        transferOverlay.classList.add('hidden');
    });
    transferCards.appendChild(card);
  });
});

socket.on('game:waitingTransfer', () => {
  finishPendingIncoming();
  waitingOverlay.classList.remove('hidden');
});

socket.on('game:transferDone', ({ yourHand, opponentHand, transferredPhrase }) => {
  transferOverlay.classList.add('hidden');
  waitingOverlay.classList.add('hidden');
  roundStatus.textContent = 'Carte transférée !';
  roundStatus.className = '';
  applyHandUpdate(yourHand, opponentHand);
});

// ═══════════════════════════════════════════════════════════════════════════
// FIN DE PARTIE
// ═══════════════════════════════════════════════════════════════════════════

socket.on('game:over', ({ winnerName }) => {
  transferOverlay.classList.add('hidden');
  waitingOverlay.classList.add('hidden');
  const iWon = (winnerName === yourNameEl.textContent);
  resultIcon.textContent = iWon ? '🏆' : '🌸';
  resultText.textContent = iWon ? 'Victoire !' : 'Défaite';
  resultText.style.color = iWon ? 'var(--jade)' : 'var(--sakura-light)';
  resultSub.textContent = iWon
    ? 'Vous avez éliminé toutes vos cartes en premier !'
    : `${winnerName} a été plus rapide. Retentez votre chance !`;
  showScreen(screenResults);
});

socket.on('opponent:disconnected', () => {
  transferOverlay.classList.add('hidden');
  waitingOverlay.classList.add('hidden');
  disconnectOverlay.classList.remove('hidden');
});

socket.on('game:hands', ({ yourHand, opponentHand }) => {
  applyHandUpdate(yourHand, opponentHand);
});

// ═══════════════════════════════════════════════════════════════════════════
// RENDU DES CARTES (GRILLE 6×2)
// ═══════════════════════════════════════════════════════════════════════════

function renderAllCards() {
  renderGridZone(opponentCardsZone, oppPositions, 'opponent');
  renderGridZone(yourCardsZone, myPositions, 'your');
}

function renderGridZone(zone, positions, side) {
  zone.innerHTML = '';
  let cardIdx = 0;
  for (let i = 0; i < 12; i++) {
    const slot = document.createElement('div');
    slot.className = 'grid-slot';
    slot.dataset.index = i;

    if (positions[i]) {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.phrase = positions[i];
      card.dataset.side = side;
      card.textContent = positions[i];
      card.style.animationDelay = `${cardIdx * 0.06}s`;
      card.addEventListener('pointerdown', () => {
        onCardPress(positions[i], side, card);
      });
      if (cardsDisabled) card.classList.add('disabled');
      slot.appendChild(card);
      cardIdx++;
    }

    zone.appendChild(slot);
  }
}

function syncPositions(positions, hand) {
  const handSet = new Set(hand);
  for (let i = 0; i < 12; i++) {
    if (positions[i] && !handSet.has(positions[i])) positions[i] = null;
  }
  for (const phrase of hand) {
    let found = false;
    for (let i = 0; i < 12; i++) {
      if (positions[i] === phrase) { found = true; break; }
    }
    if (!found) {
      for (let i = 0; i < 12; i++) {
        if (positions[i] === null) { positions[i] = phrase; break; }
      }
    }
  }
}

// Retire les cartes absentes, retourne les nouvelles non placées
function syncAndFindNew(positions, hand) {
  const handSet = new Set(hand);
  for (let i = 0; i < 12; i++) {
    if (positions[i] && !handSet.has(positions[i])) positions[i] = null;
  }
  const placed = new Set(positions.filter(p => p !== null));
  return hand.filter(p => !placed.has(p));
}

// Applique la mise à jour des mains, déclenche le placement si carte reçue
function applyHandUpdate(yourHand, opponentHand) {
  myHand = yourHand;
  oppHand = opponentHand;
  syncPositions(oppPositions, oppHand);
  const unplaced = syncAndFindNew(myPositions, myHand);
  updateCounts();

  if (unplaced.length > 0) {
    renderGridZone(opponentCardsZone, oppPositions, 'opponent');
    showIncomingPlacement(unplaced[0]);
  } else {
    renderAllCards();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLACEMENT DE CARTE REÇUE
// ═══════════════════════════════════════════════════════════════════════════

function showIncomingPlacement(phrase) {
  pendingIncomingCard = phrase;
  incomingCardPreview.textContent = phrase;
  incomingBar.classList.remove('hidden');
  yourCardsZone.classList.add('incoming-mode');
  renderIncomingGrid();
}

function renderIncomingGrid() {
  yourCardsZone.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const slot = document.createElement('div');
    slot.className = 'grid-slot';
    slot.dataset.index = i;

    if (myPositions[i]) {
      const card = document.createElement('div');
      card.className = 'card disabled';
      card.textContent = myPositions[i];
      slot.appendChild(card);
    } else {
      slot.classList.add('empty');
      slot.addEventListener('pointerdown', () => {
        onIncomingSlotClick(i);
      });
    }

    yourCardsZone.appendChild(slot);
  }
}

function onIncomingSlotClick(index) {
  if (!pendingIncomingCard || myPositions[index]) return;
  myPositions[index] = pendingIncomingCard;
  pendingIncomingCard = null;

  // Vérifier s'il reste des cartes à placer
  const moreUnplaced = syncAndFindNew(myPositions, myHand);
  if (moreUnplaced.length > 0) {
    showIncomingPlacement(moreUnplaced[0]);
  } else {
    exitIncomingMode();
  }
}

// Auto-place les cartes en attente si un événement de jeu arrive
function finishPendingIncoming() {
  if (!pendingIncomingCard && !yourCardsZone.classList.contains('incoming-mode')) return;
  // Placer toutes les cartes non placées dans les premiers slots libres
  const unplaced = syncAndFindNew(myPositions, myHand);
  for (const phrase of unplaced) {
    for (let i = 0; i < 12; i++) {
      if (myPositions[i] === null) { myPositions[i] = phrase; break; }
    }
  }
  pendingIncomingCard = null;
  exitIncomingMode();
}

function exitIncomingMode() {
  incomingBar.classList.add('hidden');
  yourCardsZone.classList.remove('incoming-mode');
  renderAllCards();
}

function setAllCardsDisabled(disabled) {
  const cards = document.querySelectorAll('.card-zone .card');
  cards.forEach(c => {
    if (disabled) c.classList.add('disabled');
    else c.classList.remove('disabled');
  });
}

function findCardInZones(phrase) {
  const escaped = CSS.escape(phrase);
  return opponentCardsZone.querySelector(`[data-phrase="${escaped}"]`)
    || yourCardsZone.querySelector(`[data-phrase="${escaped}"]`);
}

function updateCounts() {
  yourCardsEl.textContent = myHand.length;
  opponentCardsEl.textContent = oppHand.length;
}

function showCloseRace(data) {
  raceWinnerName.textContent = data.winnerName;
  raceWinnerTime.textContent = `${data.winnerTime} ms`;
  raceLoserName.textContent = data.loserName;
  raceLoserTime.textContent = `${data.loserTime} ms`;
  raceDiff.textContent = `\u0394 ${data.diff} ms`;
  closeRaceOverlay.classList.remove('hidden');
  const box = closeRaceOverlay.querySelector('.close-race-box');
  box.style.animation = 'none';
  box.offsetHeight;
  box.style.animation = '';
  setTimeout(() => closeRaceOverlay.classList.add('hidden'), 4000);
}

function onCardPress(phrase, side, cardEl) {
  if (cardsDisabled || locked) return;
  triggerCardTouchFeedback(cardEl);
  const serverSide = side === 'opponent' ? 'opponent' : 'own';
  socket.emit('game:cardClick', { phraseText: phrase, side: serverSide });
}

function triggerCardTouchFeedback(cardEl) {
  if (!cardEl) return;
  cardEl.classList.remove('touch-feedback');
  requestAnimationFrame(() => {
    cardEl.classList.add('touch-feedback');
  });
  setTimeout(() => cardEl.classList.remove('touch-feedback'), TOUCH_FEEDBACK_DURATION_MS);
}

// ═══════════════════════════════════════════════════════════════════════════
// PÉTALES DE CERISIER (Canvas)
// ═══════════════════════════════════════════════════════════════════════════

const canvas = $('#petals');
const ctx = canvas.getContext('2d');
const petals = [];
const PETAL_COUNT = 22;

const PETAL_COLORS = [
  'rgba(255, 183, 197, 0.7)',
  'rgba(255, 155, 175, 0.6)',
  'rgba(255, 210, 220, 0.5)',
  'rgba(240, 130, 157, 0.5)',
];

class Petal {
  constructor() { this.reset(true); }
  reset(initial) {
    this.x = Math.random() * canvas.width;
    this.y = initial ? Math.random() * canvas.height : -15;
    this.size = 3 + Math.random() * 5;
    this.speedY = 0.3 + Math.random() * 1.0;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.03;
    this.drift = 0.3 + Math.random() * 0.7;
    this.driftOffset = Math.random() * Math.PI * 2;
    this.opacity = 0.3 + Math.random() * 0.4;
    this.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  }
  update(time) {
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(time * 0.001 + this.driftOffset) * this.drift * 0.3;
    this.angle += this.spin;
    if (this.y > canvas.height + 20) this.reset(false);
    if (this.x < -20) this.x = canvas.width + 20;
    if (this.x > canvas.width + 20) this.x = -20;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initPetals() {
  resizeCanvas();
  for (let i = 0; i < PETAL_COUNT; i++) petals.push(new Petal());
}

function animatePetals(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of petals) { p.update(time); p.draw(ctx); }
  requestAnimationFrame(animatePetals);
}

window.addEventListener('resize', resizeCanvas);
initPetals();
requestAnimationFrame(animatePetals);
