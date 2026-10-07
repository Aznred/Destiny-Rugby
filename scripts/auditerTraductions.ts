import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { TEXTES } from '../src/data/textes';

const racine = 'src';
const erreurs: string[] = [];
// The Kiri Labo is a separate, French-only internal administration console;
// it has no English mode. Keep it out of the English player-interface audit.
const interfacesAdminFrancaises = /src[\\/]components[\\/](?:AtelierKiri|Labo[^\\/]+|match[\\/]Profileur)\.tsx$/;
const elementsFr = /\b(?:aujourd'hui|demain|hier|continuer|acheter|annuler|confirmer|chargement|rechercher|aucun|aucune|joueur|joueurs|équipe|équipé|blessure|blessé|blessée|classement|paramètres|saison|match terminé|créer|rejoindre|retour|suivant|précédent|fermer|supprimer|enregistrer|succès|échec|erreur)\b/i;
const accentFr = /[àâçéèêëîïôûùüÿœæÀÂÇÉÈÊËÎÏÔÛÙÜŸŒÆ]/;
for (const [cle, traduction] of Object.entries(TEXTES)) {
  if (!traduction.en?.trim()) erreurs.push(`src/data/textes.ts: missing English translation: ${cle}`);
}

function visiterDossier(dossier: string): void {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      visiterDossier(chemin);
      continue;
    }
    if (!/\.tsx?$/.test(chemin) || /src[\\/]data[\\/]/.test(chemin)) continue;
    if (interfacesAdminFrancaises.test(chemin)) continue;
    const source = ts.createSourceFile(chemin, readFileSync(chemin, 'utf8'), ts.ScriptTarget.Latest, true,
      chemin.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const signaler = (texte: string, noeud: ts.Node) => {
      if (!accentFr.test(texte) && !elementsFr.test(texte)) return;
      const position = source.getLineAndCharacterOfPosition(noeud.getStart(source));
      erreurs.push(`${relative('.', chemin)}:${position.line + 1}: ${texte.trim().slice(0, 120)}`);
    };
    const parcourir = (noeud: ts.Node) => {
      if (ts.isJsxText(noeud)) signaler(noeud.text, noeud);
      if (ts.isJsxAttribute(noeud) && noeud.initializer && ts.isStringLiteral(noeud.initializer)) {
        const nom = noeud.name.getText(source);
        if (/^(?:title|placeholder|aria-label|alt|label)$/.test(nom)) signaler(noeud.initializer.text, noeud);
      }
      if (ts.isCallExpression(noeud) && ts.isIdentifier(noeud.expression)
        && ['t', 'tn'].includes(noeud.expression.text) && noeud.arguments[0] && ts.isStringLiteral(noeud.arguments[0])) {
        const cle = noeud.arguments[0].text;
        if (!TEXTES[cle] && !TEXTES[`ml.${cle}`] && !TEXTES[cle.replace(/^ml\./, '')]) {
          const position = source.getLineAndCharacterOfPosition(noeud.getStart(source));
          erreurs.push(`${relative('.', chemin)}:${position.line + 1}: unknown translation key ${cle}`);
        }
      }
      ts.forEachChild(noeud, parcourir);
    };
    parcourir(source);
  }
}

visiterDossier(racine);
console.log(`English translation coverage: ${Object.values(TEXTES).filter(t => !!t.en?.trim()).length}/${Object.keys(TEXTES).length} keys.`);
console.log('French-only Kiri admin tools (excluded from the player UI scan): Labo screens and the match profile viewer.');
console.log(`Potential French UI literals and unknown keys: ${erreurs.length}`);
for (const erreur of erreurs) console.log(`- ${erreur}`);
