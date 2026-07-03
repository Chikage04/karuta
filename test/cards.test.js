const { test } = require('node:test');
const assert = require('node:assert');
const { CARDS, getCard, DEFAULT_DECK } = require('../data/cards');

test('fay is a fire pokemon with a 100-damage attack', () => {
  const fay = getCard('fay');
  assert.strictEqual(fay.kind, 'pokemon');
  assert.strictEqual(fay.type, 'fire');
  assert.strictEqual(fay.hp, 110);
  assert.strictEqual(fay.attacks[0].damage, 100);
  assert.deepStrictEqual(fay.attacks[0].cost, ['fire', 'fire', 'fire']);
});

test('groud ability is a conditional damage multiplier', () => {
  const g = getCard('groud');
  assert.strictEqual(g.hp, 10);
  assert.strictEqual(g.ability.effect.kind, 'damageMultiplier');
  assert.strictEqual(g.ability.effect.ifDefenderTag, 'blue-solo');
});

test('getCard throws on unknown id', () => {
  assert.throws(() => getCard('nope'));
});

test('DEFAULT_DECK entries reference real cards', () => {
  for (const { id } of DEFAULT_DECK) assert.ok(CARDS[id], `missing ${id}`);
});
