// APPLIQUER UN SCHÉMA SQL À LA BASE NEON
//
// ⚠️ POURQUOI CET OUTIL EXISTE. La console SQL de Vercel — et le pilote HTTP de
// Neon qu'elle utilise — passe par des *prepared statements*, qui n'acceptent
// **qu'une instruction à la fois**. Coller un schéma entier y échoue avec
// « cannot insert multiple commands into a prepared statement ». Nos schémas en
// comptent une quarantaine : les passer à la main, c'est quarante copier-coller
// et une occasion d'en oublier un.
//
// Ce script fait exactement ce que ferait `psql` : il découpe le fichier en
// instructions et les envoie une par une, dans l'ordre, en s'arrêtant à la
// première erreur.
//
//   node scripts/appliquerSchema.mjs serveur/schema-ligues.sql serveur/schema-carriere.sql
//
// ⚠️ IL NE DEVINE PAS LA BASE, IL LA MONTRE. Un projet peut avoir plusieurs
// bases connectées, et se tromper de cible est précisément le piège qu'on vient
// de rencontrer : les tables créées dans l'une, l'application qui lit l'autre.
// Le script affiche donc l'hôte et l'inventaire AVANT d'écrire, et demande
// confirmation — sauf si on passe `--sans-confirmation`.

import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { neon } from '@neondatabase/serverless';

// ── La chaîne de connexion ──────────────────────────────────────────────────
// Depuis l'environnement, ou depuis un `.env` local (jamais versionné).
function chaineConnexion() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue;
    const ligne = readFileSync(f, 'utf8').split('\n')
      .find((l) => l.trim().startsWith('DATABASE_URL='));
    const valeur = ligne?.slice(ligne.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    if (valeur) return valeur;
  }
  return null;
}

/**
 * Découpe un script en instructions.
 *
 * ⚠️ UN `split(';')` NE SUFFIT PAS. Un point-virgule peut vivre dans un
 * commentaire (`-- voir a; b`), dans une chaîne (`'a;b'`) ou dans un bloc
 * `$$…$$`. Nos schémas n'en contiennent pas aujourd'hui, mais un découpage
 * naïf casserait au premier `check (nom <> 'a;b')` ajouté un jour — et il
 * casserait SILENCIEUSEMENT, en coupant une instruction en deux.
 */
export function decouper(sql) {
  const instructions = [];
  let courante = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const suivant = sql[i + 1];
    if (c === '-' && suivant === '-') {
      const fin = sql.indexOf('\n', i);
      i = fin < 0 ? sql.length : fin;
      continue;
    }
    if (c === '/' && suivant === '*') {
      const fin = sql.indexOf('*/', i + 2);
      i = fin < 0 ? sql.length : fin + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length && !(sql[j] === c && sql[j - 1] !== '\\')) j++;
      courante += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const dollar = c === '$' && /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
    if (dollar) {
      const balise = dollar[0];
      const fin = sql.indexOf(balise, i + balise.length);
      const j = fin < 0 ? sql.length : fin + balise.length;
      courante += sql.slice(i, j);
      i = j;
      continue;
    }
    if (c === ';') {
      if (courante.trim()) instructions.push(courante.trim());
      courante = '';
      i++;
      continue;
    }
    courante += c;
    i++;
  }
  if (courante.trim()) instructions.push(courante.trim());
  return instructions;
}

const fichiers = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const sansConfirmation = process.argv.includes('--sans-confirmation');

if (!fichiers.length) {
  console.error('Usage : node scripts/appliquerSchema.mjs <fichier.sql> [autre.sql…] [--sans-confirmation]');
  process.exit(1);
}
for (const f of fichiers) {
  if (!existsSync(f)) { console.error(`Fichier introuvable : ${f}`); process.exit(1); }
}

const url = chaineConnexion();
if (!url) {
  console.error(`
DATABASE_URL introuvable.

Récupère la chaîne de connexion de la base que TON APPLICATION lit :
  Vercel → Storage → ta base → .env.local / Connection string
puis mets-la dans un fichier .env à la racine (il est déjà ignoré par git) :

  DATABASE_URL=postgres://…
`);
  process.exit(1);
}

const sql = neon(url);
const hote = (() => { try { return new URL(url.replace(/^postgres(ql)?:/, 'https:')).host; } catch { return '(hôte illisible)'; } })();

console.log(`\n  Base ciblée : ${hote}\n`);

// ── L'inventaire AVANT d'écrire ─────────────────────────────────────────────
// ⚠️ On lit la base avant de l'écrire, et l'échec de CETTE lecture est le seul
// endroit où une mauvaise chaîne de connexion se manifeste. La laisser remonter
// brute afficherait une pile de 30 lignes pour un mot de passe recopié de
// travers : on la traduit.
let noms = [];
try {
  const avant = await sql`select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`;
  noms = avant.map((r) => r.table_name);
} catch (erreur) {
  console.error(`  ❌ Connexion impossible : ${erreur.message}\n`);
  console.error('  Reprends la chaîne entière depuis Vercel → Storage → ta base →');
  console.error('  « .env.local » (bouton Copy), sans la retaper à la main.\n');
  process.exit(1);
}
console.log(`  ${noms.length} table(s) déjà présente(s) : ${noms.join(', ') || '(aucune)'}`);

// ⚠️ LE TEST QUI LÈVE L'AMBIGUÏTÉ ENTRE DEUX BASES. Si `classement` contient des
// lignes, c'est la base historique du jeu — celle que `DATABASE_URL` doit
// désigner. Une base vide toute neuve n'en a pas.
if (noms.includes('classement')) {
  const [{ n }] = await sql`select count(*)::int as n from classement`;
  console.log(`  Table « classement » : ${n} ligne(s)${n > 0 ? '  ← c’est la base du classement mondial' : '  ← vide : est-ce la bonne base ?'}`);
}

const lots = fichiers.map((f) => ({ f, instructions: decouper(readFileSync(f, 'utf8')) }));
console.log('');
for (const { f, instructions } of lots) console.log(`  ${f} → ${instructions.length} instructions`);

if (!sansConfirmation) {
  const lecture = createInterface({ input: process.stdin, output: process.stdout });
  const reponse = await lecture.question('\n  Appliquer sur cette base ? (oui / non) ');
  lecture.close();
  if (!/^o(ui)?$/i.test(reponse.trim())) { console.log('  Annulé, rien n’a été écrit.'); process.exit(0); }
}

// ── L'application, une instruction à la fois ────────────────────────────────
let total = 0;
for (const { f, instructions } of lots) {
  console.log(`\n  ── ${f}`);
  for (const [n, instruction] of instructions.entries()) {
    const resume = instruction.replace(/\s+/g, ' ').slice(0, 70);
    try {
      await sql.query(instruction);
      total++;
      process.stdout.write(`    ${String(n + 1).padStart(2)}/${instructions.length}  ✅ ${resume}\n`);
    } catch (erreur) {
      console.error(`    ${String(n + 1).padStart(2)}/${instructions.length}  ❌ ${resume}`);
      console.error(`\n  ${erreur.message}\n`);
      console.error('  Arrêt. Les instructions précédentes ont été appliquées ; les schémas');
      console.error('  sont en « if not exists », donc relancer après correction est sans risque.\n');
      process.exit(1);
    }
  }
}

const apres = await sql`select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
console.log(`\n  ✅ ${total} instructions appliquées.`);
console.log(`  ${apres.length} tables au total : ${apres.map((r) => r.table_name).join(', ')}\n`);
