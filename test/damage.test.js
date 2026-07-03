const { test } = require('node:test');
const assert = require('node:assert');
const { computeDamage } = require('../src/engine/damage');
const { getCard } = require('../data/cards');

test('fay bonus adds +10 vs an untagged defender', () => {
  const dmg = computeDamage({ attackerCard: getCard('fay'), defenderCard: getCard('vingt2'), baseDamage: 100 });
  // 100 + 10 (else) ; vingt2 faiblesse = darkness, pas fire → pas de faiblesse
  assert.strictEqual(dmg, 110);
});

test('fay bonus adds +30 vs a chikage-tagged defender', () => {
  const defender = { ...getCard('vingt2'), tags: ['chikage'] };
  const dmg = computeDamage({ attackerCard: getCard('fay'), defenderCard: defender, baseDamage: 100 });
  assert.strictEqual(dmg, 130);
});

test('groud multiplier doubles damage vs a blue-solo defender', () => {
  const defender = { ...getCard('vingt2'), tags: ['blue-solo'], weakness: null };
  const dmg = computeDamage({ attackerCard: getCard('groud'), defenderCard: defender, baseDamage: 30 });
  assert.strictEqual(dmg, 60);
});

test('weakness multiply doubles final damage', () => {
  // attaquant type darkness (groud) vs vingt2 (faiblesse darkness x2), base 30, pas de tag
  const dmg = computeDamage({ attackerCard: getCard('groud'), defenderCard: getCard('vingt2'), baseDamage: 30 });
  assert.strictEqual(dmg, 60);
});

test('weakness add adds a flat amount', () => {
  // attaquant water fictif vs fay (faiblesse water +10)
  const water = { type: 'water', tags: [], ability: null };
  const dmg = computeDamage({ attackerCard: water, defenderCard: getCard('fay'), baseDamage: 50 });
  assert.strictEqual(dmg, 60);
});
