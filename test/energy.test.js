const { test } = require('node:test');
const assert = require('node:assert');
const { energyCostMet, attackCost } = require('../src/engine/energy');
const { getCard } = require('../data/cards');

test('exact typed cost is met', () => {
  assert.ok(energyCostMet(['fire', 'fire'], ['fire', 'fire']));
});

test('colorless accepts any surplus energy', () => {
  assert.ok(energyCostMet(['fire', 'colorless'], ['fire', 'water']));
});

test('insufficient typed energy fails', () => {
  assert.strictEqual(energyCostMet(['fire', 'fire'], ['fire', 'water']), false);
});

test('too few energies fails', () => {
  assert.strictEqual(energyCostMet(['colorless', 'colorless'], ['fire']), false);
});

test('vingt2 defender taxes the attack cost by +1 colorless', () => {
  const attack = getCard('fay').attacks[0]; // [fire,fire,fire]
  const cost = attackCost(attack, getCard('vingt2'));
  assert.deepStrictEqual(cost, ['fire', 'fire', 'fire', 'colorless']);
});

test('non-taxing defender leaves cost unchanged', () => {
  const attack = getCard('fay').attacks[0];
  assert.deepStrictEqual(attackCost(attack, getCard('groud')), ['fire', 'fire', 'fire']);
});
