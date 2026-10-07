import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { TEXTES } from '../src/data/textes';
import { TEXTES_INTERFACE } from '../src/data/textesInterface';
import { LANGUES, chargerTextes, definirLangue, t, tn, texteTraduit } from '../src/lib/i18n';
import { SUCCES, DEFIS, nomSucces, descriptionSucces, texteDefi } from '../src/data/succes';
import { EQUIPEMENTS } from '../src/data/boutique';
import { nomBlessure, messageBlessure, tirerBlessure } from '../src/lib/blessures';
import { CALENDRIER, libelleSemaine } from '../src/data/calendrier';

chargerTextes(TEXTES);
const erreurs: string[] = [];
const variables = (texte: string) => (texte.match(/\{\w+\}/g) ?? []).sort().join(',');
const normaliser = (texte: string) => texte.replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
const sourcesConnues = new Set(Object.values(TEXTES).map(e => normaliser(e.fr)));
const verifierSource = (source: string) => assert.ok(sourcesConnues.has(normaliser(source)), `Libellé sans traduction : ${source}`);
for (const [cle, entree] of Object.entries(TEXTES)) {
  for (const langue of LANGUES) {
    const texte = entree[langue.id];
    if (!texte?.trim()) erreurs.push(`${cle}: traduction ${langue.id} absente`);
    else if (variables(texte) !== variables(entree.fr)) erreurs.push(`${cle}: variables différentes en ${langue.id}`);
    if (texte && /9182\d{6}|[⟦⟧]/u.test(texte)) erreurs.push(`${cle}: marqueur temporaire en ${langue.id}`);
  }
}

function verifierReferences(dossier: string) {
  for (const fichier of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, fichier.name);
    if (fichier.isDirectory()) verifierReferences(chemin);
    else if (/\.tsx?$/.test(chemin) && !/textes[^/\\]*\.ts$/.test(chemin)) {
      const source = ts.createSourceFile(chemin, readFileSync(chemin, 'utf8'), ts.ScriptTarget.Latest, true,
        chemin.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      function visiter(noeud: ts.Node) {
        if (ts.isCallExpression(noeud) && ts.isIdentifier(noeud.expression)
          && ['t', 'tn'].includes(noeud.expression.text) && noeud.arguments[0] && ts.isStringLiteral(noeud.arguments[0])) {
          const cle = noeud.arguments[0].text;
          const existe = (k: string) => TEXTES[k] || TEXTES[`ml.${k}`] || TEXTES[k.replace(/^ml\./, '')];
          if (!existe(cle)) erreurs.push(`${chemin}: clé ${cle} inconnue`);
          if (noeud.expression.text === 'tn' && !existe(`${cle}.pluriel`)) erreurs.push(`${chemin}: pluriel de ${cle} absent`);
        }
        ts.forEachChild(noeud, visiter);
      }
      visiter(source);
    }
  }
}
verifierReferences('src');
if (erreurs.length) throw new Error(`${erreurs.length} erreurs de traduction :\n${erreurs.slice(0, 40).join('\n')}`);

// Les données sauvegardées restent canoniques et se relocalisent à l'affichage.
const nomDuJoueur = 'Roméo Aldegheri';
const nomDuClub = 'Meze Rugby Club';
const texteLibre = 'Mon propre récit ne doit jamais être modifié.';
for (const langue of LANGUES) {
  definirLangue(langue.id);
  assert.equal(texteTraduit(nomDuJoueur), nomDuJoueur);
  assert.equal(texteTraduit(nomDuClub), nomDuClub);
  assert.equal(texteTraduit(texteLibre), texteLibre);
  assert.equal(texteTraduit('Intersaison et préparation'), t('ui.e10758f29ee3'));
  for (const article of EQUIPEMENTS) {
    verifierSource(article.nom);
    verifierSource(article.detail);
    assert.ok(texteTraduit(article.nom));
    assert.ok(texteTraduit(article.detail));
  }
  for (const succes of SUCCES) {
    verifierSource(succes.nom);
    verifierSource(succes.desc);
    assert.ok(nomSucces(succes));
    assert.ok(descriptionSucces(succes));
  }
  for (const defi of DEFIS) {
    verifierSource(defi.texte);
    assert.ok(texteDefi(defi.id, defi.texte));
  }
  for (const sem of CALENDRIER) assert.ok(!/\{\w+\}|^(ui|cal)\./.test(libelleSemaine(sem, 1)));
  for (const tirage of [.1, .65, .92, .999]) for (const variante of [.01, .25, .5, .75, .999]) {
    const blessure = tirerBlessure(tirage, variante);
    verifierSource(blessure.nom);
    const nomCanonique = blessure.nom;
    assert.ok(nomBlessure(blessure));
    assert.ok(messageBlessure(blessure).includes(nomBlessure(blessure)));
    assert.equal(blessure.nom, nomCanonique);
    assert.ok(!/\{\w+\}/.test(messageBlessure(blessure)));
  }
}
definirLangue('en');
assert.equal(tn('blessure.legere', 1, { nom: 'Ankle sprain' }), 'Ankle sprain. Nothing serious: 1 week of treatment, then you are back.');
assert.equal(tn('blessure.legere', 2, { nom: 'Ankle sprain' }), 'Ankle sprain. Nothing serious: 2 weeks of treatment, then you are back.');
assert.equal(tn('staff.med.day', 1), 'day');
assert.equal(tn('staff.med.day', 12), 'days');
assert.equal(tn('staff.med.injuryCount', 1, { n: 1 }), '1 injury');
assert.equal(tn('staff.med.injuryCount', 5, { n: 5 }), '5 injuries');
chargerTextes({ ...TEXTES, '__audit.englishFallback': { fr: 'Continuer' } });
assert.equal(t('__audit.englishFallback'), 'Translation unavailable');
chargerTextes(TEXTES);
definirLangue('fr');
assert.equal(texteTraduit(null), '');
console.log(`OK — ${Object.keys(TEXTES).length} clés, ${Object.keys(TEXTES_INTERFACE).length} nouveaux libellés, sept langues, variables et références vérifiées.`);
