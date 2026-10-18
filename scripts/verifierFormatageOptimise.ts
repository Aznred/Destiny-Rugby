import assert from 'node:assert/strict';
import { LANGUES, chargerTextes, definirLangue, locale, nombre, tn } from '../src/lib/i18n';

const FormatNatif = Intl.NumberFormat;
const PlurielNatif = Intl.PluralRules;
let formats = 0, pluriels = 0;
Intl.NumberFormat = new Proxy(FormatNatif, { construct(cible, argumentsConstructeur) { formats++; return Reflect.construct(cible, argumentsConstructeur); } });
Intl.PluralRules = new Proxy(PlurielNatif, { construct(cible, argumentsConstructeur) { pluriels++; return Reflect.construct(cible, argumentsConstructeur); } });
try {
  const singulier = Object.fromEntries(LANGUES.map(l => [l.id, `Un ${l.id} {n} {nom}`])) as Record<'fr', string>;
  const pluriel = Object.fromEntries(LANGUES.map(l => [l.id, `Plusieurs ${l.id} {n} {nom}`])) as Record<'fr', string>;
  chargerTextes({ temoin: singulier, 'temoin.pluriel': pluriel });
  const valeurs = [0, -0, 1, -1, .001, -.001, 1.2345678, Number.NaN, Infinity, -Infinity, 1e30, 1e-10,
    ...Array.from({ length: 400 }, (_, i) => (i - 200) * 12345.6789)];
  for (let repetition = 0; repetition < 2; repetition++) for (const l of LANGUES) {
    definirLangue(l.id);
    const regles = new PlurielNatif(locale());
    for (const valeur of valeurs) {
      assert.equal(nombre(valeur), valeur.toLocaleString(locale()), `Même nombre natif en ${l.id}, ${valeur}`);
      const attendu = regles.select(valeur) === 'one' ? 'Un' : 'Plusieurs';
      assert.equal(tn('temoin', valeur, { nom: 'joueur' }), `${attendu} ${l.id} ${valeur} joueur`);
    }
  }
  assert.equal(formats, LANGUES.length, 'Une seule instance de formatage par langue, sans mémoriser les nombres.');
  assert.equal(pluriels, LANGUES.length, 'Une seule règle de pluriel par langue.');
  // Recharger le dictionnaire modifie encore les traductions, sans modifier les règles natives.
  chargerTextes({ temoin: { fr: 'Nouveau {n}' }, 'temoin.pluriel': { fr: 'Nouveaux {n}' } });
  definirLangue('fr');
  assert.equal(tn('temoin', 2), 'Nouveaux 2');
  console.log(`OK — ${valeurs.length * LANGUES.length * 2} comparaisons de nombres et pluriels, sept langues et rechargement du dictionnaire.`);
} finally {
  Intl.NumberFormat = FormatNatif; Intl.PluralRules = PlurielNatif; definirLangue('fr');
}
