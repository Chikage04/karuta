function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(decklist) {
  const out = [];
  for (const { id, count } of decklist) {
    for (let i = 0; i < count; i++) out.push(id);
  }
  return out;
}

function draw(deck, n) {
  return { drawn: deck.slice(0, n), deck: deck.slice(n) };
}

module.exports = { mulberry32, shuffle, buildDeck, draw };
