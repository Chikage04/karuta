function computeDamage({ attackerCard, defenderCard, baseDamage }) {
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

  const w = defenderCard && defenderCard.weakness;
  if (w && attackerCard && attackerCard.type === w.type) {
    dmg = w.mode === 'multiply' ? dmg * w.amount : dmg + w.amount;
  }

  return Math.max(0, Math.floor(dmg));
}

module.exports = { computeDamage };
