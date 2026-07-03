const { test } = require('node:test');
const assert = require('node:assert');
const { copiedBaseDamage, resolveAttackEffect } = require('../src/engine/effects');
const { getCard } = require('../data/cards');

test('copiedBaseDamage copies defender best attack minus penalty', () => {
  // défenseur fay: meilleure attaque = 100 ; penalty 20 → 80
  const eff = { kind: 'copyAttack', penalty: 20 };
  assert.strictEqual(copiedBaseDamage(eff, getCard('fay')), 80);
});

test('copiedBaseDamage floors at 0 when defender has no damaging attack', () => {
  const eff = { kind: 'copyAttack', penalty: 20 };
  assert.strictEqual(copiedBaseDamage(eff, getCard('vingt2')), 0); // vingt2 attaque = 0 base
});

test('discardEnergy removes energies from the defender', () => {
  const defenderInPlay = { cardId: 'fay', damage: 0, energy: ['fire', 'fire', 'water'] };
  const log = [];
  resolveAttackEffect({ kind: 'discardEnergy', target: 'defender', amount: 2 }, { defenderInPlay, log });
  assert.strictEqual(defenderInPlay.energy.length, 1);
});

test('discardEnergy on empty energy is a no-op', () => {
  const defenderInPlay = { cardId: 'fay', damage: 0, energy: [] };
  resolveAttackEffect({ kind: 'discardEnergy', target: 'defender', amount: 1 }, { defenderInPlay, log: [] });
  assert.strictEqual(defenderInPlay.energy.length, 0);
});
