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

test('groud ability is a blue-solo team aura', () => {
  const g = getCard('groud');
  assert.strictEqual(g.hp, 10);
  assert.strictEqual(g.ability.effect.kind, 'teamAura');
  assert.strictEqual(g.ability.effect.requiresTag, 'blue-solo');
  assert.ok(g.tags.includes('blue-solo'));
});

test('all four Blue Solo cards carry the blue-solo tag', () => {
  for (const id of ['fay', 'groud', 'vingt2', 'jelee']) {
    assert.ok(getCard(id).tags.includes('blue-solo'), `${id} missing tag`);
  }
});

test('getCard throws on unknown id', () => {
  assert.throws(() => getCard('nope'));
});

test('DEFAULT_DECK entries reference real cards', () => {
  for (const { id } of DEFAULT_DECK) assert.ok(CARDS[id], `missing ${id}`);
});
