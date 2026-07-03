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
