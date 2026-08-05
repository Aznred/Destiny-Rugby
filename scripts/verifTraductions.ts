// VÉRIFICATION — LES TRADUCTIONS
//
// Retour de jeu : « les traductions ne sont pas finies, juste la barre du haut
// est traduite ». C'était vrai : le dictionnaire existait (`data/textes.ts`)
// mais seuls `Nav` et `Réglages` appelaient `t()` — tout le reste du jeu était
// écrit en dur en français.
//
// Ce script fait trois choses :
//   1. il relit TOUS les appels `t('…')` / `tn('…')` du code et vérifie que la
//      clé existe (une clé inconnue s'affiche telle quelle à l'écran) ;
//   2. il compte les clés traduites par langue ;
//   3. il liste les écrans qui n'appellent JAMAIS `t()` — ceux qui restent
//      entièrement en français.
//
// Lancer : npx vite-node scripts/verifTraductions.ts

import fs from 'node:fs';
import path from 'node:path';
import { TEXTES } from '../src/data/textes';
import { LANGUES, chargerTextes, definirLangue, t } from '../src/lib/i18n';

chargerTextes(TEXTES);

const RACINE = path.join(process.cwd(), 'src');
// La documentation de `lib/i18n.ts` cite des clés d'exemple : ce n'est pas du
// code appelé, on ne l'analyse pas.
const IGNORES = new Set(['src/lib/i18n.ts']);

function fichiers(dossier: string): string[] {
  const sortie: string[] = [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) sortie.push(...fichiers(p));
    else if (/\.tsx?$/.test(e.name)) sortie.push(p);
  }
  return sortie;
}

const tous = fichiers(RACINE);
const utilisees = new Map<string, string[]>();
const sansTraduction: string[] = [];

for (const f of tous) {
  const relatif = path.relative(process.cwd(), f).split(path.sep).join('/');
  if (IGNORES.has(relatif)) continue;
  const code = fs.readFileSync(f, 'utf8');
  // ⚠️ `\btn?\(` matcherait aussi `format(`, `point(`… : on exige que le nom de
  // la fonction commence le mot, et on capture la clé littérale.
  const cles = [...code.matchAll(/(?<![A-Za-z0-9_$.])(tn?)\(\s*'([^']+)'/g)]
    .map((m) => m[2]);
  for (const c of cles) {
    if (!utilisees.has(c)) utilisees.set(c, []);
    utilisees.get(c)!.push(relatif);
  }
  // Les écrans et composants d'interface qui n'appellent jamais `t()`.
  if (/src[/\\](screens|components)[/\\]/.test(f) && cles.length === 0) {
    sansTraduction.push(relatif);
  }
}

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(46)} ${valeur}`);
}

console.log('=== 1. TOUTES LES CLÉS APPELÉES EXISTENT ===');
{
  const inconnues = [...utilisees.keys()].filter((c) => {
    // `tn()` cherche aussi la forme plurielle.
    return !TEXTES[c] && !TEXTES[`${c}.pluriel`];
  });
  ligne('clés utilisées dans le code',
    `${utilisees.size} clés${inconnues.length ? ' — inconnues : ' + inconnues.join(', ') : ''}`,
    inconnues.length === 0);
  // Les clés au pluriel doivent avoir leur singulier, et réciproquement.
  const orphelines = Object.keys(TEXTES)
    .filter((c) => c.endsWith('.pluriel') && !TEXTES[c.replace('.pluriel', '')]);
  ligne('formes plurielles sans singulier',
    orphelines.length ? orphelines.join(', ') : 'aucune', orphelines.length === 0);
}

console.log('\n=== 2. COUVERTURE PAR LANGUE ===');
{
  const total = Object.keys(TEXTES).length;
  for (const l of LANGUES) {
    const n = Object.values(TEXTES).filter((tr) => (tr as Record<string, string>)[l.id]).length;
    const part = Math.round((n / total) * 100);
    ligne(`${l.nom} (${l.id})`, `${n}/${total} clés — ${part} %`, part >= 95);
  }
}

console.log('\n=== 3. LE CHANGEMENT DE LANGUE FONCTIONNE ===');
{
  const echantillon = ['nav.carriere', 'pj.forme', 'ml.terminer', 'ch.titre', 'bo.equiper'];
  for (const l of LANGUES) {
    definirLangue(l.id);
    console.log(`     ${l.id} : ${echantillon.map((c) => t(c)).join(' · ')}`);
  }
  definirLangue('en');
  ligne('une clé traduite change bien de langue',
    `nav.carriere → « ${t('nav.carriere')} »`, t('nav.carriere') === 'Career');
  definirLangue('fr');
}

console.log('\n=== 4. ÉCRANS ENCORE ENTIÈREMENT EN FRANÇAIS ===');
{
  console.log(sansTraduction.length
    ? '     ' + sansTraduction.join('\n     ')
    : '     aucun');
  // On exige que les écrans PRINCIPAUX soient couverts ; les modales et
  // composants purement graphiques peuvent attendre.
  const majeurs = [
    'src/components/PanneauJoueur.tsx', 'src/components/ClassementLateral.tsx',
    'src/components/MatchLive.tsx', 'src/components/Nav.tsx', 'src/components/Reglages.tsx',
    'src/screens/Boutique.tsx', 'src/screens/Championnats.tsx', 'src/screens/Creation.tsx',
    'src/screens/Social.tsx', 'src/screens/Accueil.tsx', 'src/screens/Tableau.tsx',
    'src/screens/Pantheon.tsx',
  ];
  const manquants = majeurs.filter((m) => sansTraduction.includes(m));
  ligne('écrans majeurs branchés sur t()',
    `${majeurs.length - manquants.length}/${majeurs.length}${manquants.length ? ' — reste : ' + manquants.join(', ') : ''}`,
    manquants.length === 0);
}

console.log(echecs === 0 ? '\n✅ Traductions conformes.' : `\n❌ ${echecs} contrôle(s) en échec.`);
