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

// ─── État client ────────────────────────────────────────────────────────────
let myHand = [];
let oppHand = [];
let locked = false;
let cardsDisabled = true;

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

function resetGameUI() {
  opponentCardsZone.innerHTML = '';
  yourCardsZone.innerHTML = '';
  roundStatus.textContent = '';
  roundStatus.className = '';
  countdownDisplay.classList.add('hidden');
  memorizeBar.classList.add('hidden');
  speakerIcon.classList.add('hidden');
  transferOverlay.classList.add('hidden');
  waitingOverlay.classList.add('hidden');
  myHand = [];
  oppHand = [];
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
  renderAllCards();
});

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
  roundNumberEl.textContent = roundNumber;
  speakerIcon.classList.remove('hidden');
  roundStatus.textContent = 'Trouvez la carte !';
  roundStatus.className = '';
  // Cliquable immédiatement
  cardsDisabled = false;
  locked = false;
  setAllCardsDisabled(false);
  speakPhrase(phrase);
});

socket.on('round:result', ({ winnerName, phrase, yourHand, opponentHand, youWonRound, tookFromOpponent, reactionTime, yourAvgTime, opponentAvgTime, faultPenaltyPhrase }) => {
  cardsDisabled = true;
  setAllCardsDisabled(true);
  speakerIcon.classList.add('hidden');

  // Mettre à jour les vitesses moyennes
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

  // Animer la carte correcte avant de mettre à jour
  const cardEl = findCardInZones(phrase);
  if (cardEl) {
    cardEl.classList.add('correct');
    setTimeout(() => {
      cardEl.classList.add('removing');
      setTimeout(() => {
        myHand = yourHand;
        oppHand = opponentHand;
        updateCounts();
        renderAllCards();
      }, 400);
    }, 500);
  } else {
    myHand = yourHand;
    oppHand = opponentHand;
    updateCounts();
    renderAllCards();
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
  // Afficher l'overlay avec mes cartes
  transferOverlay.classList.remove('hidden');
  transferCards.innerHTML = '';
  myHand.forEach((phrase, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = phrase;
    card.style.animationDelay = `${index * 0.06}s`;
    card.addEventListener('click', () => {
      socket.emit('game:transferCard', { phraseText: phrase });
      transferOverlay.classList.add('hidden');
    });
    transferCards.appendChild(card);
  });
});

socket.on('game:waitingTransfer', () => {
  waitingOverlay.classList.remove('hidden');
});

socket.on('game:transferDone', ({ yourHand, opponentHand, transferredPhrase }) => {
  transferOverlay.classList.add('hidden');
  waitingOverlay.classList.add('hidden');
  myHand = yourHand;
  oppHand = opponentHand;
  updateCounts();
  renderAllCards();
  roundStatus.textContent = 'Carte transférée !';
  roundStatus.className = '';
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

// Mise à jour des mains depuis le serveur (sync)
socket.on('game:hands', ({ yourHand, opponentHand }) => {
  myHand = yourHand;
  oppHand = opponentHand;
  updateCounts();
  renderAllCards();
});

// ═══════════════════════════════════════════════════════════════════════════
// RENDU DES CARTES
// ═══════════════════════════════════════════════════════════════════════════

function renderAllCards() {
  renderZone(opponentCardsZone, oppHand, 'opponent');
  renderZone(yourCardsZone, myHand, 'your');
}

function renderZone(zone, hand, side) {
  zone.innerHTML = '';
  hand.forEach((phrase, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.phrase = phrase;
    card.dataset.side = side;
    card.textContent = phrase;
    card.style.animationDelay = `${index * 0.06}s`;
    card.addEventListener('click', () => onCardClick(phrase, side));
    if (cardsDisabled) card.classList.add('disabled');
    zone.appendChild(card);
  });
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

function onCardClick(phrase, side) {
  if (cardsDisabled || locked) return;
  const serverSide = side === 'opponent' ? 'opponent' : 'own';
  socket.emit('game:cardClick', { phraseText: phrase, side: serverSide });
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
