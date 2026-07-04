// AUTO-GÉNÉRÉ par scripts/build-tcg-bundle.js — ne pas éditer à la main.
(function(){
var cache={}, defs={};
function req(p){var k=p.split("/").pop().replace(/\.js$/,"");if(cache[k])return cache[k].exports;var m={exports:{}};cache[k]=m;defs[k](m,m.exports,req);return m.exports;}
defs["cards"]=function(module,exports,require){
const CARDS = {
  fay: {
    id: 'fay', name: 'Fay', image: 'assets/cards/fay.webp',
    kind: 'pokemon', hp: 110, type: 'fire', stage: 'basic', tags: ['blue-solo'],
    weakness: { type: 'water', amount: 10, mode: 'add' },
    retreat: 2,
    ability: {
      name: 'Fast learner', trigger: 'passive',
      effect: { kind: 'damageBonus', ifDefenderTag: 'chikage', amount: 30, else: 10 },
    },
    attacks: [
      { name: 'Délit de faciès', cost: ['fire', 'fire', 'fire'], damage: 100, effect: null },
    ],
  },
  groud: {
    id: 'groud', name: 'Groud VSTAR', image: 'assets/cards/groud.webp',
    kind: 'pokemon', hp: 10, type: 'darkness', stage: 'basic', tags: ['blue-solo'],
    weakness: null,
    retreat: 1,
    ability: {
      name: 'Groudance', trigger: 'passive',
      // Aura d'équipe : tant que Groud est en jeu (actif OU banc), les Pokémon
      // "blue-solo" de son côté infligent +20 dégâts.
      effect: { kind: 'teamAura', requiresTag: 'blue-solo', bonus: 20 },
    },
    attacks: [
      { name: 'Amnésie', cost: ['darkness', 'fairy'], damage: 30,
        effect: { kind: 'discardEnergy', target: 'defender', amount: 1 } },
    ],
  },
  vingt2: {
    id: 'vingt2', name: 'vingt2', image: 'assets/cards/vingt2.webp',
    kind: 'pokemon', hp: 70, type: 'fairy', stage: 'basic', tags: ['blue-solo'],
    weakness: { type: 'darkness', amount: 2, mode: 'multiply' },
    retreat: 2,
    ability: {
      name: 'Conversation libérée', trigger: 'passive',
      effect: { kind: 'taxAttackCost', target: 'opponentActive', amount: 1 },
    },
    attacks: [
      { name: 'Gribouillage', cost: ['colorless', 'fairy', 'fairy'], damage: 0,
        effect: { kind: 'copyAttack', target: 'defender', penalty: 20 } },
    ],
  },
  jelee: {
    id: 'jelee', name: 'Jelee', image: 'assets/cards/jelee.webp',
    kind: 'pokemon', hp: 100, type: 'darkness', stage: 'basic', tags: ['blue-solo'],
    weakness: { type: 'darkness', amount: 20, mode: 'add' },
    retreat: 3,
    ability: {
      name: 'Anonyme', trigger: 'passive',
      // "Devient invisible" : ne subit que la moitié des dégâts des attaques adverses.
      effect: { kind: 'damageReduction', factor: 0.5 },
    },
    attacks: [
      { name: 'Horde de muridés', cost: ['darkness', 'colorless'], damage: 20, effect: null },
    ],
  },
  'energy-fire': { id: 'energy-fire', name: 'Énergie Feu', kind: 'energy', type: 'fire', image: 'assets/cards/energy-fire.png' },
  'energy-water': { id: 'energy-water', name: 'Énergie Eau', kind: 'energy', type: 'water', image: 'assets/cards/energy-water.png' },
  'energy-darkness': { id: 'energy-darkness', name: 'Énergie Ténèbres', kind: 'energy', type: 'darkness', image: 'assets/cards/energy-darkness.png' },
  'energy-fairy': { id: 'energy-fairy', name: 'Énergie Fée', kind: 'energy', type: 'fairy', image: 'assets/cards/energy-fairy.png' },
  'energy-colorless': { id: 'energy-colorless', name: 'Énergie Incolore', kind: 'energy', type: 'colorless', image: 'assets/cards/energy-colorless.png' },
};

function getCard(id) {
  const c = CARDS[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

// Deck de démarrage jouable (mix Pokémon + énergies).
const DEFAULT_DECK = [
  { id: 'fay', count: 2 },
  { id: 'groud', count: 2 },
  { id: 'vingt2', count: 2 },
  { id: 'jelee', count: 2 },
  { id: 'energy-fire', count: 4 },
  { id: 'energy-darkness', count: 4 },
  { id: 'energy-fairy', count: 4 },
  { id: 'energy-colorless', count: 3 },
];

module.exports = { CARDS, getCard, DEFAULT_DECK };

};
defs["deck"]=function(module,exports,require){
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

};
defs["energy"]=function(module,exports,require){
function energyCostMet(cost, attached) {
  const pool = [...attached];
  let colorless = 0;
  // 1) satisfaire d'abord les symboles typés
  for (const sym of cost) {
    if (sym === 'colorless') { colorless++; continue; }
    const idx = pool.indexOf(sym);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  // 2) le reste couvre les colorless
  return pool.length >= colorless;
}

function attackCost(attack, defenderCard) {
  const cost = [...attack.cost];
  const ab = defenderCard && defenderCard.ability && defenderCard.ability.effect;
  if (ab && ab.kind === 'taxAttackCost' && ab.target === 'opponentActive') {
    for (let i = 0; i < ab.amount; i++) cost.push('colorless');
  }
  return cost;
}

module.exports = { energyCostMet, attackCost };

};
defs["damage"]=function(module,exports,require){
const { getCard } = require('../../data/cards');

// attackerAllies : liste des cardId en jeu du côté de l'attaquant (actif + banc).
// Sert aux auras d'équipe (ex. Groud buffe les alliés "blue-solo").
function computeDamage({ attackerCard, defenderCard, baseDamage, attackerAllies = [] }) {
  let dmg = baseDamage;
  const tags = (defenderCard && defenderCard.tags) || [];
  const eff = attackerCard && attackerCard.ability && attackerCard.ability.effect;

  if (eff && eff.kind === 'damageBonus') {
    const hit = eff.ifDefenderTag ? tags.includes(eff.ifDefenderTag) : true;
    dmg += hit ? eff.amount : (eff.else || 0);
  }
  if (eff && eff.kind === 'damageMultiplier') {
    const hit = eff.ifDefenderTag ? tags.includes(eff.ifDefenderTag) : true;
    if (hit) dmg *= eff.factor;
  }

  // Aura d'équipe : un allié en jeu (ex. Groud) buffe les attaquants portant le tag requis.
  const atkTags = (attackerCard && attackerCard.tags) || [];
  for (const allyId of attackerAllies) {
    let ally;
    try { ally = getCard(allyId); } catch (e) { continue; }
    const ae = ally.ability && ally.ability.effect;
    if (ae && ae.kind === 'teamAura' && atkTags.includes(ae.requiresTag)) {
      dmg += ae.bonus;
    }
  }

  const w = defenderCard && defenderCard.weakness;
  if (w && attackerCard && attackerCard.type === w.type) {
    dmg = w.mode === 'multiply' ? dmg * w.amount : dmg + w.amount;
  }

  // Réduction de dégâts du défenseur (ex. Jelee "Anonyme" : moitié des dégâts).
  const de = defenderCard && defenderCard.ability && defenderCard.ability.effect;
  if (de && de.kind === 'damageReduction') {
    dmg *= de.factor;
  }

  return Math.max(0, Math.floor(dmg));
}

module.exports = { computeDamage };

};
defs["effects"]=function(module,exports,require){
function copiedBaseDamage(effect, defenderCard) {
  const attacks = (defenderCard && defenderCard.attacks) || [];
  const best = attacks.reduce((m, a) => Math.max(m, a.damage || 0), 0);
  return Math.max(0, best - (effect.penalty || 0));
}

function resolveAttackEffect(effect, ctx) {
  const log = ctx.log || [];
  if (!effect) return log;
  switch (effect.kind) {
    case 'discardEnergy': {
      const p = ctx.defenderInPlay;
      const n = Math.min(effect.amount, p.energy.length);
      p.energy.splice(0, n);
      if (n > 0) log.push(`${n} énergie(s) défaussée(s) de l'adversaire.`);
      break;
    }
    case 'copyAttack':
      // géré en amont via copiedBaseDamage — pas d'effet secondaire ici
      break;
    default:
      break;
  }
  return log;
}

module.exports = { copiedBaseDamage, resolveAttackEffect };

};
defs["state"]=function(module,exports,require){
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

};
defs["rules"]=function(module,exports,require){
const { newInPlay, isBasicPokemon } = require('./state');
const { energyCostMet, attackCost } = require('./energy');
const { computeDamage } = require('./damage');
const { copiedBaseDamage, resolveAttackEffect } = require('./effects');
const { draw } = require('./deck');
const { getCard } = require('../../data/cards');

function opponentOf(game, pid) { return game.order.find((x) => x !== pid); }

function endGame(game, winnerPid, reason) {
  game.phase = 'gameOver';
  game.winner = winnerPid;
  game.log.push(reason);
}

function checkVictory(game, pid) {
  const p = game.players[pid];
  const opp = game.players[opponentOf(game, pid)];
  if (p.prizesTaken >= 3) { endGame(game, pid, `${p.name} a pris 3 récompenses !`); return true; }
  if (!opp.active && opp.bench.length === 0) { endGame(game, pid, `${opp.name} n'a plus de Pokémon.`); return true; }
  return false;
}

function startTurn(game) {
  const pid = game.turn;
  const p = game.players[pid];
  if (p.deck.length === 0) { endGame(game, opponentOf(game, pid), `${p.name} ne peut plus piocher.`); return; }
  const d = draw(p.deck, 1);
  p.hand.push(...d.drawn); p.deck = d.deck;
  p.energyAttachedThisTurn = false;
  game.log.push(`Au tour de ${p.name}.`);
}

function passTurn(game) {
  game.turn = opponentOf(game, game.turn);
  startTurn(game);
}

function promoteIfNeeded(game, pid) {
  const p = game.players[pid];
  if (!p.active && p.bench.length > 0) p.active = p.bench.shift();
}

function applyAction(game, pid, action) {
  if (game.phase !== 'main') return { ok: false, error: 'Partie terminée.' };
  if (game.turn !== pid) return { ok: false, error: "Ce n'est pas ton tour." };
  const p = game.players[pid];
  const { type, payload = {} } = action;

  switch (type) {
    case 'attachEnergy': {
      if (p.energyAttachedThisTurn) return { ok: false, error: 'Déjà attaché une énergie ce tour.' };
      const card = getCard(p.hand[payload.handIndex] || '');
      if (!card || card.kind !== 'energy') return { ok: false, error: 'Carte énergie invalide.' };
      const slot = payload.targetSlot === 'active' ? p.active
        : p.bench[Number(String(payload.targetSlot).split(':')[1])];
      if (!slot) return { ok: false, error: 'Cible invalide.' };
      slot.energy.push(card.type);
      p.hand.splice(payload.handIndex, 1);
      p.energyAttachedThisTurn = true;
      return { ok: true };
    }
    case 'playBench': {
      if (p.bench.length >= 2) return { ok: false, error: 'Banc plein.' };
      const id = p.hand[payload.handIndex];
      if (!id || !isBasicPokemon(id)) return { ok: false, error: 'Pokémon Basic requis.' };
      p.bench.push(newInPlay(id));
      p.hand.splice(payload.handIndex, 1);
      return { ok: true };
    }
    case 'retreat': {
      if (!p.active) return { ok: false, error: 'Aucun actif.' };
      const idx = Number(payload.benchIndex);
      if (!p.bench[idx]) return { ok: false, error: 'Banc invalide.' };
      const cost = getCard(p.active.cardId).retreat;
      if (p.active.energy.length < cost) return { ok: false, error: 'Pas assez d\'énergie pour la retraite.' };
      p.active.energy.splice(0, cost);
      const old = p.active;
      p.active = p.bench[idx];
      p.bench[idx] = old;
      return { ok: true };
    }
    case 'attack': {
      if (!p.active) return { ok: false, error: 'Aucun actif.' };
      const oppId = opponentOf(game, pid);
      const opp = game.players[oppId];
      if (!opp.active) return { ok: false, error: 'Aucune cible.' };
      const attackerCard = getCard(p.active.cardId);
      const defenderCard = getCard(opp.active.cardId);
      const attack = attackerCard.attacks[payload.attackIndex];
      if (!attack) return { ok: false, error: 'Attaque invalide.' };
      const cost = attackCost(attack, defenderCard);
      if (!energyCostMet(cost, p.active.energy)) return { ok: false, error: 'Énergie insuffisante.' };

      let base = attack.damage;
      if (attack.effect && attack.effect.kind === 'copyAttack') {
        base = copiedBaseDamage(attack.effect, defenderCard);
      }
      const attackerAllies = [p.active.cardId, ...p.bench.map((b) => b.cardId)];
      const dmg = computeDamage({ attackerCard, defenderCard, baseDamage: base, attackerAllies });
      opp.active.damage += dmg;
      game.log.push(`${p.name} utilise ${attack.name} : ${dmg} dégâts.`);
      resolveAttackEffect(attack.effect, { defenderInPlay: opp.active, log: game.log });

      if (opp.active.damage >= defenderCard.hp) {
        game.log.push(`${defenderCard.name} est mis K.O. !`);
        opp.discard.push(opp.active.cardId, ...opp.active.energy);
        opp.active = null;
        p.prizesTaken += 1;
        promoteIfNeeded(game, oppId);
      }
      if (checkVictory(game, pid)) return { ok: true };
      passTurn(game);
      return { ok: true };
    }
    case 'pass': {
      passTurn(game);
      return { ok: true };
    }
    default:
      return { ok: false, error: 'Action inconnue.' };
  }
}

module.exports = { applyAction, startTurn, passTurn };

};
window.TCGEngine=Object.assign({},req("cards"),req("deck"),req("energy"),req("damage"),req("effects"),req("state"),req("rules"));
})();
