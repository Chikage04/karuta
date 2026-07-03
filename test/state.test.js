const { test } = require('node:test');
const assert = require('node:assert');
const { createGame, viewFor } = require('../src/engine/state');
const { getCard } = require('../data/cards');

test('createGame gives each player an active basic pokemon', () => {
  const g = createGame('g1', { pid: 'A', name: 'Alice' }, { pid: 'B', name: 'Bob' }, 123);
  assert.ok(g.players.A.active, 'A has active');
  assert.strictEqual(getCard(g.players.A.active.cardId).stage, 'basic');
  assert.ok(g.players.B.active);
  assert.strictEqual(g.phase, 'main');
  assert.strictEqual(g.turn, g.order[0]);
});

test('bench holds at most 2 pokemon', () => {
  const g = createGame('g2', { pid: 'A', name: 'Alice' }, { pid: 'B', name: 'Bob' }, 5);
  assert.ok(g.players.A.bench.length <= 2);
});

test('viewFor hides the opponent hand contents', () => {
  const g = createGame('g3', { pid: 'A', name: 'Alice' }, { pid: 'B', name: 'Bob' }, 9);
  const v = viewFor(g, 'A');
  assert.ok(Array.isArray(v.you.hand));
  assert.strictEqual(v.opponent.hand, undefined);
  assert.strictEqual(typeof v.opponent.handCount, 'number');
});
