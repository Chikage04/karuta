const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─── Banque de proverbes français ───────────────────────────────────────────
const PHRASES = [
  "Qui vole un oeuf vole un boeuf",
  "Pierre qui roule n'amasse pas mousse",
  "L'habit ne fait pas le moine",
  "Mieux vaut tard que jamais",
  "Petit à petit, l'oiseau fait son nid",
  "Après la pluie, le beau temps",
  "Il ne faut pas vendre la peau de l'ours avant de l'avoir tué",
  "Tout ce qui brille n'est pas or",
  "La nuit porte conseil",
  "Qui sème le vent récolte la tempête",
  "Chat échaudé craint l'eau froide",
  "L'union fait la force",
  "Rien ne sert de courir, il faut partir à point",
  "À coeur vaillant rien d'impossible",
  "Les murs ont des oreilles",
  "Il faut battre le fer tant qu'il est chaud",
  "Loin des yeux, loin du coeur",
  "Chacun voit midi à sa porte",
  "La parole est d'argent, le silence est d'or",
  "Qui vivra verra",
  "Tel père, tel fils",
  "La curiosité est un vilain défaut",
  "Il n'y a pas de fumée sans feu",
  "On ne fait pas d'omelette sans casser des oeufs",
  "Quand le chat n'est pas là, les souris dansent",
  "Rome ne s'est pas faite en un jour",
  "Il vaut mieux prévenir que guérir",
  "Les bons comptes font les bons amis",
  "Aide-toi, le ciel t'aidera",
  "C'est en forgeant qu'on devient forgeron",
  "Qui ne risque rien n'a rien",
  "Il faut tourner sept fois sa langue dans sa bouche avant de parler",
  "La vengeance est un plat qui se mange froid",
  "Les chiens ne font pas des chats",
  "Impossible n'est pas français",
];

// ─── État du serveur ────────────────────────────────────────────────────────
let waitingPlayer = null;
const games = new Map();
const playerGameMap = new Map();
let gameIdCounter = 0;

// ─── Utilitaires ────────────────────────────────────────────────────────────
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getOpponentId(game, socketId) {
  return Object.keys(game.players).find(id => id !== socketId);
}

// Envoie l'état des mains aux deux joueurs
function emitHands(game) {
  const ids = Object.keys(game.players);
  for (const sid of ids) {
    const oppId = getOpponentId(game, sid);
    game.players[sid].socket.emit('game:hands', {
      yourHand: [...game.hands[sid]],
      opponentHand: [...game.hands[oppId]],
    });
  }
}

function createGame(player1, player2) {
  const id = `game_${++gameIdCounter}`;
  const selected = shuffle(PHRASES).slice(0, 14);
  const hand1 = selected.slice(0, 7);
  const hand2 = selected.slice(7, 14);

  const game = {
    id,
    players: {
      [player1.socket.id]: { socket: player1.socket, name: player1.name },
      [player2.socket.id]: { socket: player2.socket, name: player2.name },
    },
    hands: {
      [player1.socket.id]: [...hand1],
      [player2.socket.id]: [...hand2],
    },
    currentPhrase: null,
    phase: 'memorize',
    roundNumber: 0,
    timers: [],
    lockedPlayers: new Set(),
    choosingPlayer: null,
    roundStartTime: 0,       // timestamp du début de round
    faultedThisRound: new Set(), // joueurs ayant fait une faute ce round
    firstCorrectClick: null,  // { socketId, side, reactionTime }
    secondCorrectClick: null, // close race detection
    stats: {
      [player1.socket.id]: { totalTime: 0, wins: 0 },
      [player2.socket.id]: { totalTime: 0, wins: 0 },
    },
  };

  games.set(id, game);
  playerGameMap.set(player1.socket.id, id);
  playerGameMap.set(player2.socket.id, id);

  player1.socket.emit('matchmaking:found', { opponentName: player2.name });
  player2.socket.emit('matchmaking:found', { opponentName: player1.name });

  // Envoyer les deux mains à chaque joueur
  player1.socket.emit('game:init', {
    yourHand: hand1,
    opponentHand: hand2,
    yourName: player1.name,
    opponentName: player2.name,
  });
  player2.socket.emit('game:init', {
    yourHand: hand2,
    opponentHand: hand1,
    yourName: player2.name,
    opponentName: player1.name,
  });

  startPlacement(id);
}

function startPlacement(gameId) {
  const game = games.get(gameId);
  if (!game) return;
  game.phase = 'placement';
  game.readyPlayers = new Set();
  game.positions = {};
  emitToAll(game, 'game:placement', {});
}

function startMemorize(gameId) {
  const game = games.get(gameId);
  if (!game) return;
  game.phase = 'memorize';

  const MEMORIZE_DURATION = 45;
  emitToAll(game, 'game:memorize', { duration: MEMORIZE_DURATION });

  let remaining = MEMORIZE_DURATION;
  const tick = () => {
    if (!games.has(gameId)) return;
    remaining--;
    emitToAll(game, 'game:memorize-tick', { remaining });
    if (remaining > 0) {
      game.timers.push(setTimeout(tick, 1000));
    } else {
      emitToAll(game, 'game:memorize-end', {});
      game.timers.push(setTimeout(() => startCountdown(gameId), 500));
    }
  };
  game.timers.push(setTimeout(tick, 1000));
}

function startCountdown(gameId) {
  const game = games.get(gameId);
  if (!game) return;
  game.phase = 'countdown';

  let count = 3;
  const emitCount = () => {
    if (!games.has(gameId)) return;
    emitToAll(game, 'game:countdown', { count });
    count--;
    if (count > 0) {
      game.timers.push(setTimeout(emitCount, 1000));
    } else {
      game.timers.push(setTimeout(() => {
        if (!games.has(gameId)) return;
        emitToAll(game, 'game:countdown', { count: 0 });
        game.timers.push(setTimeout(() => startRound(gameId), 1000));
      }, 1000));
    }
  };
  emitCount();
}

function startRound(gameId) {
  const game = games.get(gameId);
  if (!game) return;

  const allRemaining = [];
  for (const sid of Object.keys(game.hands)) {
    for (const phrase of game.hands[sid]) {
      allRemaining.push(phrase);
    }
  }

  if (allRemaining.length === 0) return;

  game.roundNumber++;
  const phrase = allRemaining[Math.floor(Math.random() * allRemaining.length)];
  game.currentPhrase = phrase;
  game.phase = 'racing';
  game.lockedPlayers.clear();
  game.choosingPlayer = null;
  game.faultedThisRound.clear();
  game.firstCorrectClick = null;
  game.secondCorrectClick = null;
  game.roundStartTime = Date.now();

  // Annonce + course simultanées
  emitToAll(game, 'round:announce', { phrase, roundNumber: game.roundNumber });

  // Timeout de 10s
  game.timers.push(setTimeout(() => {
    if (!games.has(gameId) || game.phase !== 'racing') return;
    game.phase = 'roundEnd';
    emitToAll(game, 'round:timeout', {});
    game.timers.push(setTimeout(() => startRound(gameId), 2000));
  }, 10000));
}

function handleCardClick(socket, phraseText, side) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  if (game.phase !== 'racing') return;
  if (game.lockedPlayers.has(socket.id)) return;

  const myHand = game.hands[socket.id];
  const opponentId = getOpponentId(game, socket.id);
  const oppHand = game.hands[opponentId];

  // Déterminer de quel côté la carte se trouve
  const targetHand = side === 'opponent' ? oppHand : myHand;
  const cardIndex = targetHand.indexOf(phraseText);
  if (cardIndex === -1) return;

  if (phraseText === game.currentPhrase) {
    // ══ BONNE RÉPONSE ══
    const reactionTime = Date.now() - game.roundStartTime;

    if (!game.firstCorrectClick) {
      // Premier clic correct — attendre 200ms pour détecter une course serrée
      clearGameTimers(game);
      game.firstCorrectClick = { socketId: socket.id, side, reactionTime };
      game.lockedPlayers.add(socket.id);
      game.timers.push(setTimeout(() => resolveCorrectClick(game, gameId), 200));
    } else if (game.firstCorrectClick.socketId !== socket.id) {
      // Deuxième joueur a aussi trouvé — course serrée !
      clearGameTimers(game);
      game.secondCorrectClick = { socketId: socket.id, side, reactionTime };
      resolveCorrectClick(game, gameId);
    }
  } else {
    // ══ MAUVAISE CARTE ══
    game.faultedThisRound.add(socket.id);
    game.lockedPlayers.add(socket.id);
    socket.emit('round:penalty', { phrase: phraseText, side });
    setTimeout(() => {
      game.lockedPlayers.delete(socket.id);
    }, 100);
  }
}

function resolveCorrectClick(game, gameId) {
  const first = game.firstCorrectClick;
  if (!first) return;
  const second = game.secondCorrectClick;

  const winnerId = first.socketId;
  const winnerSide = first.side;
  const phraseText = game.currentPhrase;

  const myHand = game.hands[winnerId];
  const opponentId = getOpponentId(game, winnerId);
  const oppHand = game.hands[opponentId];

  // Retirer la carte de la bonne main
  const targetHand = winnerSide === 'opponent' ? oppHand : myHand;
  const cardIndex = targetHand.indexOf(phraseText);
  if (cardIndex !== -1) targetHand.splice(cardIndex, 1);

  game.phase = 'roundEnd';

  const tookFromOpponent = (winnerSide === 'opponent');
  const reactionTime = first.reactionTime;

  // Stats de vitesse
  game.stats[winnerId].totalTime += reactionTime;
  game.stats[winnerId].wins++;

  // Pénalité de faute
  const loserId = opponentId;
  let faultPenaltyPhrase = null;
  if (game.faultedThisRound.has(loserId) && myHand.length > 0) {
    const randomIdx = Math.floor(Math.random() * myHand.length);
    faultPenaltyPhrase = myHand[randomIdx];
    myHand.splice(randomIdx, 1);
    game.hands[loserId].push(faultPenaltyPhrase);
  }

  // Données de course serrée
  let closeRace = null;
  if (second) {
    closeRace = {
      winnerTime: first.reactionTime,
      loserTime: second.reactionTime,
      diff: second.reactionTime - first.reactionTime,
      winnerName: game.players[first.socketId].name,
      loserName: game.players[second.socketId].name,
    };
  }

  // Envoyer le résultat aux deux joueurs
  const ids = Object.keys(game.players);
  for (const sid of ids) {
    const oppSid = getOpponentId(game, sid);
    const avgTime = game.stats[sid].wins > 0
      ? Math.round(game.stats[sid].totalTime / game.stats[sid].wins)
      : 0;
    const oppAvgTime = game.stats[oppSid].wins > 0
      ? Math.round(game.stats[oppSid].totalTime / game.stats[oppSid].wins)
      : 0;
    game.players[sid].socket.emit('round:result', {
      winnerId,
      winnerName: game.players[winnerId].name,
      phrase: phraseText,
      yourHand: [...game.hands[sid]],
      opponentHand: [...game.hands[oppSid]],
      youWonRound: sid === winnerId,
      tookFromOpponent,
      reactionTime,
      yourAvgTime: avgTime,
      opponentAvgTime: oppAvgTime,
      faultPenaltyPhrase,
      faultPenaltyTo: game.faultedThisRound.has(loserId) ? loserId : null,
      closeRace,
    });
  }

  // Reset close race state
  game.firstCorrectClick = null;
  game.secondCorrectClick = null;

  if (tookFromOpponent && myHand.length > 0) {
    game.phase = 'choosing';
    game.choosingPlayer = winnerId;
    game.players[winnerId].socket.emit('game:chooseTransfer', {});
    game.players[opponentId].socket.emit('game:waitingTransfer', {
      message: "L'adversaire choisit une carte à vous envoyer...",
    });
  } else {
    checkWinOrContinue(game, gameId);
  }
}

function handleTransferCard(socket, phraseText) {
  const gameId = playerGameMap.get(socket.id);
  if (!gameId) return;
  const game = games.get(gameId);
  if (!game) return;
  if (game.phase !== 'choosing') return;
  if (game.choosingPlayer !== socket.id) return;

  const myHand = game.hands[socket.id];
  const opponentId = getOpponentId(game, socket.id);
  const oppHand = game.hands[opponentId];

  const idx = myHand.indexOf(phraseText);
  if (idx === -1) return;

  // Transférer la carte
  myHand.splice(idx, 1);
  oppHand.push(phraseText);
  game.choosingPlayer = null;

  // Envoyer les mains mises à jour
  const ids = Object.keys(game.players);
  for (const sid of ids) {
    const oppSid = getOpponentId(game, sid);
    game.players[sid].socket.emit('game:transferDone', {
      yourHand: [...game.hands[sid]],
      opponentHand: [...game.hands[oppSid]],
      transferredPhrase: phraseText,
      transferredBy: socket.id,
    });
  }

  checkWinOrContinue(game, gameId);
}

function checkWinOrContinue(game, gameId) {
  const ids = Object.keys(game.players);

  for (const sid of ids) {
    if (game.hands[sid].length === 0) {
      game.phase = 'gameOver';
      game.timers.push(setTimeout(() => {
        emitToAll(game, 'game:over', {
          winnerId: sid,
          winnerName: game.players[sid].name,
        });
        cleanupGame(gameId);
      }, 1500));
      return;
    }
  }

  game.timers.push(setTimeout(() => startRound(gameId), 5000));
}

function emitToAll(game, event, data) {
  for (const sid of Object.keys(game.players)) {
    game.players[sid].socket.emit(event, data);
  }
}

function clearGameTimers(game) {
  for (const t of game.timers) clearTimeout(t);
  game.timers = [];
}

function cleanupGame(gameId) {
  const game = games.get(gameId);
  if (!game) return;
  clearGameTimers(game);
  for (const sid of Object.keys(game.players)) {
    playerGameMap.delete(sid);
  }
  games.delete(gameId);
}

// ─── Connexions Socket.IO ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`Connecté: ${socket.id}`);

  socket.on('matchmaking:join', ({ playerName }) => {
    const name = (playerName || 'Joueur').trim().substring(0, 20) || 'Joueur';
    if (playerGameMap.has(socket.id)) return;
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) return;

    if (waitingPlayer) {
      const opponent = waitingPlayer;
      waitingPlayer = null;
      createGame(opponent, { socket, name });
    } else {
      waitingPlayer = { socket, name };
      socket.emit('matchmaking:waiting', {});
    }
  });

  socket.on('matchmaking:cancel', () => {
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
      waitingPlayer = null;
    }
  });

  socket.on('game:cardClick', ({ phraseText, side }) => {
    handleCardClick(socket, phraseText, side);
  });

  socket.on('game:transferCard', ({ phraseText }) => {
    handleTransferCard(socket, phraseText);
  });

  socket.on('game:ready', ({ positions }) => {
    const gameId = playerGameMap.get(socket.id);
    if (!gameId) return;
    const game = games.get(gameId);
    if (!game || game.phase !== 'placement') return;
    if (game.readyPlayers.has(socket.id)) return;

    if (!Array.isArray(positions) || positions.length !== 12) return;
    const handSet = new Set(game.hands[socket.id]);
    const posCards = positions.filter(p => p !== null);
    if (posCards.length !== handSet.size) return;
    for (const card of posCards) {
      if (!handSet.has(card)) return;
    }

    game.positions[socket.id] = positions;
    game.readyPlayers.add(socket.id);

    const opponentId = getOpponentId(game, socket.id);
    if (opponentId) {
      game.players[opponentId].socket.emit('game:opponentReady', {});
    }

    if (game.readyPlayers.size === 2) {
      const ids = Object.keys(game.players);
      for (const sid of ids) {
        const oppId = getOpponentId(game, sid);
        game.players[sid].socket.emit('game:allReady', {
          yourPositions: game.positions[sid],
          opponentPositions: game.positions[oppId],
        });
      }
      game.timers.push(setTimeout(() => startMemorize(gameId), 500));
    }
  });

  socket.on('disconnect', () => {
    console.log(`Déconnecté: ${socket.id}`);
    if (waitingPlayer && waitingPlayer.socket.id === socket.id) {
      waitingPlayer = null;
    }
    const gameId = playerGameMap.get(socket.id);
    if (gameId) {
      const game = games.get(gameId);
      if (game) {
        const opponentId = Object.keys(game.players).find(id => id !== socket.id);
        if (opponentId && game.players[opponentId]) {
          game.players[opponentId].socket.emit('opponent:disconnected', {});
        }
        cleanupGame(gameId);
      }
    }
  });
});

// ─── Démarrage ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Karuta server running on http://localhost:${PORT}`);
});
