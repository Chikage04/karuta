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
