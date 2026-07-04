// Bundle le moteur TCG (CommonJS) en un seul fichier navigateur exposant window.TCGEngine.
// Lancer après toute modif du moteur :  node scripts/build-tcg-bundle.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// basenames uniques → sert de clés de module (require('./deck') / require('../../data/cards'))
const files = {
  cards: 'data/cards.js',
  deck: 'src/engine/deck.js',
  energy: 'src/engine/energy.js',
  damage: 'src/engine/damage.js',
  effects: 'src/engine/effects.js',
  state: 'src/engine/state.js',
  rules: 'src/engine/rules.js',
};

let out = '// AUTO-GÉNÉRÉ par scripts/build-tcg-bundle.js — ne pas éditer à la main.\n';
out += '(function(){\n';
out += 'var cache={}, defs={};\n';
out += 'function req(p){var k=p.split("/").pop().replace(/\\.js$/,"");';
out += 'if(cache[k])return cache[k].exports;var m={exports:{}};cache[k]=m;defs[k](m,m.exports,req);return m.exports;}\n';
for (const [key, rel] of Object.entries(files)) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  out += `defs[${JSON.stringify(key)}]=function(module,exports,require){\n${code}\n};\n`;
}
out += 'window.TCGEngine=Object.assign({},req("cards"),req("deck"),req("energy"),req("damage"),req("effects"),req("state"),req("rules"));\n';
out += '})();\n';

const dest = path.join(root, 'public/tcg/tcg-engine.js');
fs.writeFileSync(dest, out);
console.log('Bundle écrit :', dest, `(${out.length} octets)`);
