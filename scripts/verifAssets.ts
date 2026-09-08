// ═══════════════════════════════════════════════════════════════════════════
// LES FICHIERS QUE LE JEU RÉCLAME EXISTENT-ILS VRAIMENT ?
// ═══════════════════════════════════════════════════════════════════════════
//
//   npm run verify:assets
//
// ⚠️ POURQUOI CE BANC EXISTE. Le 7 septembre 2026, un commit de 3 117 fichiers
// appelé « fix » a emporté 439 binaires au passage : 71 modèles 3D, l'image
// Open Graph, `ads.txt`. Rien ne l'a signalé — ni le build (`vite` ne lit pas
// `public/`, il le recopie), ni le typage (une URL est une chaîne), ni le lint.
// La panne s'est vue en PRODUCTION, sur un téléphone, en ouvrant l'armoire à
// trophées : « Could not load /m3d/six-nations.glb : responded with 404 ».
//
// Un fichier de `public/` n'a pas de compilateur pour le défendre. Ce banc lui
// en sert un : il relit tous les chemins d'assets écrits en dur dans `src/` et
// dans `index.html`, et vérifie que chacun se pose sur un vrai fichier.
//
// ⚠️ IL NE VOIT QUE LES CHEMINS LITTÉRAUX, et c'est assumé. Une URL fabriquée
// à l'exécution (`/logos/${club}.png`) est ignorée : la deviner demanderait de
// rejouer le jeu. Les portraits, eux, ont déjà leur banc — `verify:photos`
// croise les index de photos avec le disque.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const fichiers = (dossier: string, acc: string[] = []): string[] => {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory()) fichiers(p, acc);
    else if (/\.(tsx?|css|html|json)$/.test(p)) acc.push(p);
  }
  return acc;
};

/** Les dossiers d'assets servis tels quels, à la racine du site. */
const DOSSIERS = ['photos', 'logos', 'm3d', 'images', 'sons', 'polices', 'videos'];
const DANS_LE_CODE = new RegExp(`["'\`(]/(${DOSSIERS.join('|')})/[^"'\`)\\s]+`, 'g');
/** Et les fichiers cités à la racine par `index.html` (og:image, favicon…). */
const DANS_INDEX = /(?:href|content|src)="(?:https:\/\/destiny-rugby\.fr)?(\/[^"]+\.(?:png|svg|ico|txt|webp|jpg|webmanifest))"/g;

/**
 * ⚠️ ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER. Ce dépôt commente
 * lourdement, et il commente en CITANT les chemins : `CarteJoueurEnLigne.tsx`
 * raconte le piège de `/photos/adam_hastings.webp`, une silhouette supprimée
 * exprès. Sans ce nettoyage, le banc réclamait le retour d'un fichier dont tout
 * le projet explique qu'il ne doit plus exister.
 */
const sansCommentaires = (texte: string) => texte
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');

const reclames = new Set<string>();
for (const f of [...fichiers('src'), 'index.html']) {
  const texte = sansCommentaires(readFileSync(f, 'utf8'));
  for (const m of texte.matchAll(DANS_LE_CODE)) reclames.add(m[0].slice(1));
}
for (const m of readFileSync('index.html', 'utf8').matchAll(DANS_INDEX)) reclames.add(m[1]);

// Un chemin qui porte encore un `${…}` est fabriqué à l'exécution : on passe.
const litteral = (u: string) => !u.includes('${') && !u.includes('$%7B');
const manquants = [...reclames]
  .filter(litteral)
  .filter((u) => !existsSync('public' + decodeURIComponent(u.split('?')[0])))
  .sort();

console.log(`\n  ${reclames.size} chemins d'assets écrits en dur, ${manquants.length} introuvable(s).`);
for (const m of manquants) console.log(`  ❌ MANQUE  public${m}`);
if (!manquants.length) console.log('  ✅ Aucun 404 possible sur un chemin écrit en dur.\n');
else {
  console.log('\n  ⚠️ Ces fichiers ont disparu de `public/`. Avant de les regénérer,');
  console.log('     cherchez-les dans l\'historique : `git log --all --diff-filter=D');
  console.log('     --name-only -- public/<chemin>` puis `git checkout <commit>~1 -- …`.\n');
  process.exit(1);
}
