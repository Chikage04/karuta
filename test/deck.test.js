const { test } = require('node:test');
const assert = require('node:assert');
const { mulberry32, shuffle, buildDeck, draw } = require('../src/engine/deck');

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42); const b = mulberry32(42);
  assert.strictEqual(a(), b());
});

test('shuffle is a permutation and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, mulberry32(7));
  assert.deepStrictEqual(input, [1, 2, 3, 4, 5]);
  assert.deepStrictEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

test('buildDeck expands counts', () => {
  const deck = buildDeck([{ id: 'a', count: 2 }, { id: 'b', count: 1 }]);
  assert.deepStrictEqual(deck.sort(), ['a', 'a', 'b']);
});

test('draw takes n cards from the top', () => {
  const { drawn, deck } = draw(['a', 'b', 'c', 'd'], 2);
  assert.deepStrictEqual(drawn, ['a', 'b']);
  assert.deepStrictEqual(deck, ['c', 'd']);
});
