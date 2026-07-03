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
