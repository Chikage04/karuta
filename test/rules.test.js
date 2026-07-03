const { test } = require('node:test');
const assert = require('node:assert');
const { applyAction } = require('../src/engine/rules');
const { getCard } = require('../data/cards');

// Fabrique un état minimal contrôlé (contourne le hasard de createGame)
function makeGame() {
  return {
    id: 't', order: ['A', 'B'], turn: 'A', phase: 'main', winner: null, log: [],
    players: {
      A: { name: 'A', deck: ['energy-fire'], hand: ['energy-fire'],
           active: { cardId: 'fay', damage: 0, energy: ['fire', 'fire'] }, bench: [],
           discard: [], prizesTaken: 0, energyAttachedThisTurn: false },
      B: { name: 'B', deck: ['energy-fire'], hand: [],
           active: { cardId: 'vingt2', damage: 0, energy: [] }, bench: [],
           discard: [], prizesTaken: 0, energyAttachedThisTurn: false },
    },
  };
}

test('attachEnergy moves an energy from hand onto the active', () => {
  const g = makeGame();
  const r = applyAction(g, 'A', { type: 'attachEnergy', payload: { handIndex: 0, targetSlot: 'active' } });
  assert.ok(r.ok, r.error);
  assert.strictEqual(g.players.A.active.energy.length, 3);
  assert.strictEqual(g.players.A.hand.length, 0);
  assert.strictEqual(g.players.A.energyAttachedThisTurn, true);
});

test('only one energy attachment per turn', () => {
  const g = makeGame();
  g.players.A.hand = ['energy-fire', 'energy-fire'];
  applyAction(g, 'A', { type: 'attachEnergy', payload: { handIndex: 0, targetSlot: 'active' } });
  const r = applyAction(g, 'A', { type: 'attachEnergy', payload: { handIndex: 0, targetSlot: 'active' } });
  assert.strictEqual(r.ok, false);
});

test('attack rejected when energy cost not met', () => {
  const g = makeGame(); // fay active a 2 fire, coût = 3 fire (+1 colorless taxe vingt2)
  const r = applyAction(g, 'A', { type: 'attack', payload: { attackIndex: 0 } });
  assert.strictEqual(r.ok, false);
});

test('attack applies damage, ends turn, and KO takes a prize', () => {
  const g = makeGame();
  g.players.A.active.energy = ['fire', 'fire', 'fire', 'fire']; // couvre 3 fire + 1 colorless (taxe vingt2)
  g.players.B.active = { cardId: 'groud', damage: 0, energy: [] }; // 10 PV → KO garanti
  g.players.B.bench = [{ cardId: 'vingt2', damage: 0, energy: [] }]; // promu après le K.O. → la partie continue
  const r = applyAction(g, 'A', { type: 'attack', payload: { attackIndex: 0 } });
  assert.ok(r.ok, r.error);
  assert.strictEqual(g.players.A.prizesTaken, 1);
  assert.strictEqual(g.players.B.active.cardId, 'vingt2'); // le banc a été promu en actif
  assert.strictEqual(g.phase, 'main'); // la partie n'est pas terminée
  assert.strictEqual(g.turn, 'B'); // le tour est passé à l'adversaire
});

test('losing your last pokemon ends the game', () => {
  const g = makeGame();
  g.players.A.active.energy = ['fire', 'fire', 'fire', 'fire'];
  g.players.B.active = { cardId: 'groud', damage: 0, energy: [] };
  g.players.B.deck = []; // au cas où
  applyAction(g, 'A', { type: 'attack', payload: { attackIndex: 0 } });
  assert.strictEqual(g.phase, 'gameOver');
  assert.strictEqual(g.winner, 'A');
});

test('pass hands the turn to the opponent', () => {
  const g = makeGame();
  const r = applyAction(g, 'A', { type: 'pass', payload: {} });
  assert.ok(r.ok);
  assert.strictEqual(g.turn, 'B');
});
