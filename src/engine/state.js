const { mulberry32, shuffle, buildDeck, draw } = require('./deck');
const { getCard, DEFAULT_DECK } = require('../../data/cards');

function isBasicPokemon(id) {
  const c = getCard(id);
  return c.kind === 'pokemon' && c.stage === 'basic';
}

function newInPlay(cardId) {
  return { cardId, damage: 0, energy: [] };
}

function setupPlayer(name, decklist, rng) {
  let hand, deck;
  for (let attempt = 0; attempt < 10; attempt++) {
    deck = shuffle(buildDeck(decklist), rng);
    const d = draw(deck, 5);
    hand = d.drawn; deck = d.deck;
    if (hand.some(isBasicPokemon)) break;
  }
  const player = {
    name, deck, hand: [...hand],
    active: null, bench: [], discard: [],
    prizesTaken: 0, energyAttachedThisTurn: false,
  };
  // placement automatique de l'ouverture
  for (let i = player.hand.length - 1; i >= 0; i--) {
    if (!isBasicPokemon(player.hand[i])) continue;
    const id = player.hand[i];
    if (!player.active) { player.active = newInPlay(id); player.hand.splice(i, 1); }
    else if (player.bench.length < 2) { player.bench.push(newInPlay(id)); player.hand.splice(i, 1); }
  }
  return player;
}

function createGame(id, p1, p2, seed) {
  const rng = mulberry32(seed);
  const players = {
    [p1.pid]: setupPlayer(p1.name, p1.decklist || DEFAULT_DECK, rng),
    [p2.pid]: setupPlayer(p2.name, p2.decklist || DEFAULT_DECK, rng),
  };
  return {
    id, players, order: [p1.pid, p2.pid],
    turn: p1.pid, phase: 'main', winner: null,
    log: ['La partie commence !'],
  };
}

function publicPlayer(p, includeHand) {
  const base = {
    name: p.name,
    active: p.active,
    bench: p.bench,
    prizesTaken: p.prizesTaken,
    handCount: p.hand.length,
    deckCount: p.deck.length,
    energyAttachedThisTurn: p.energyAttachedThisTurn,
  };
  if (includeHand) base.hand = [...p.hand];
  return base;
}

function viewFor(game, pid) {
  const oppId = game.order.find((x) => x !== pid);
  return {
    you: publicPlayer(game.players[pid], true),
    opponent: publicPlayer(game.players[oppId], false),
    turn: game.turn,
    phase: game.phase,
    winner: game.winner,
    youWin: game.winner === pid,
    yourTurn: game.turn === pid,
    log: game.log.slice(-8),
  };
}

module.exports = { createGame, viewFor, newInPlay, isBasicPokemon };
