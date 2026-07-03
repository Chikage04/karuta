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
