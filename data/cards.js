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
