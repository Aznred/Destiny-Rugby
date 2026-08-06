// TRADUCTION AUTOMATIQUE DU DICTIONNAIRE
//
// Demande : « au lieu de tout traduire en 7 langues, y'a pas une extension ou
// quoi qui peut le faire automatiquement ? »
//
// ⚠️ RÉPONSE HONNÊTE : IL N'Y A PAS D'EXTENSION À INSTALLER ICI. Les outils du
// marché (i18next-parser, Weblate, Crowdin, Lokalise, l'extension VS Code
// « i18n Ally »…) supposent tous des fichiers de ressources — un `en.json`, un
// `es.json`… Ce projet, lui, range les sept langues CÔTE À CÔTE sur la même
// ligne (`{ fr: …, en: …, es: … }`), ce qui est bien plus lisible quand on écrit
// une clé, et incompatible avec eux. Les brancher voudrait dire réécrire tout
// `data/textes*.ts`, ajouter une dépendance et un compte en ligne payant, pour
// traduire six cents chaînes. Ce script fait le même travail en 200 lignes, sans
// compte, sans abonnement, et avec la clé Groq que le jeu a déjà.
//
// ⚠️ IL N'ÉCRIT JAMAIS DANS LES FICHIERS ÉCRITS À LA MAIN. La sortie est un
// fichier GÉNÉRÉ, `src/data/textesAuto.ts`, fusionné dans `TEXTES` avec la
// priorité la PLUS BASSE : une traduction humaine gagne toujours sur une
// traduction machine, et relancer le script ne peut rien écraser. C'est aussi ce
// qui rend l'opération réversible — supprimer le fichier suffit.
//
// Ce qu'il fait :
//   1. lit tout le dictionnaire et repère les (clé, langue) manquantes ;
//   2. les envoie à Groq par paquets, avec le contexte de la clé ;
//   3. écrit `src/data/textesAuto.ts`.
//
// Lancer :
//   node --env-file=.env.local -e ""   # (pour vérifier que la clé est là)
//   VITE_GROQ_KEY=gsk_... npx vite-node scripts/traduire.ts
//   npx vite-node scripts/traduire.ts --verifier   # ne traduit rien, liste les trous
//
// La clé est lue dans `VITE_GROQ_KEY` (ou `GROQ_KEY`), comme le jeu.

import fs from 'node:fs';
import path from 'node:path';
import { TEXTES } from '../src/data/textes';
import { LANGUES, type Langue } from '../src/lib/i18n';

const SORTIE = path.join('src', 'data', 'textesAuto.ts');
const MODELE = 'llama-3.3-70b-versatile';
// Assez petit pour que le modèle ne perde pas de clé en route, assez grand pour
// que le contexte (le prompt) ne coûte pas plus cher que la traduction.
const PAR_PAQUET = 25;
const CIBLES = LANGUES.filter((l) => l.id !== 'fr');

const verifierSeulement = process.argv.includes('--verifier');
const cle = process.env.VITE_GROQ_KEY ?? process.env.GROQ_KEY ?? '';

// ---------------------------------------------------------------------------
// 1. OÙ SONT LES TROUS
// ---------------------------------------------------------------------------

type Trou = { cle: string; fr: string; langues: Langue[] };

function trouver(): Trou[] {
  const trous: Trou[] = [];
  for (const [k, entree] of Object.entries(TEXTES)) {
    const manquantes = CIBLES
      .filter((l) => !(entree as Record<string, string | undefined>)[l.id])
      .map((l) => l.id as Langue);
    if (manquantes.length) trous.push({ cle: k, fr: entree.fr, langues: manquantes });
  }
  return trous;
}

const trous = trouver();
const total = Object.keys(TEXTES).length;

console.log(`=== DICTIONNAIRE : ${total} clés × ${CIBLES.length} langues cibles ===`);
for (const l of CIBLES) {
  const manque = trous.filter((t) => t.langues.includes(l.id as Langue)).length;
  const barre = '█'.repeat(Math.round(((total - manque) / total) * 24)).padEnd(24, '·');
  console.log(`  ${l.id}  ${barre}  ${total - manque}/${total}`);
}

if (!trous.length) {
  console.log('\n✅ Aucun trou : les sept langues sont complètes.');
  console.log('   Ce script sert à chaque fois que tu ajoutes une clé — écris la ligne');
  console.log('   avec le seul `fr:`, relance-le, et les six autres arrivent toutes seules.');
  if (!verifierSeulement && fs.existsSync(SORTIE)) {
    console.log(`   (${SORTIE} existe déjà et reste en place.)`);
  }
  process.exit(0);
}

console.log(`\n${trous.length} clé(s) incomplète(s) :`);
for (const t of trous.slice(0, 12)) {
  console.log(`  · ${t.cle.padEnd(30)} manque ${t.langues.join(', ')}`);
}
if (trous.length > 12) console.log(`  … et ${trous.length - 12} autres.`);

if (verifierSeulement) process.exit(trous.length ? 1 : 0);

if (!cle) {
  console.log('\n⛔ Aucune clé Groq. Relance avec :');
  console.log('   VITE_GROQ_KEY=gsk_... npx vite-node scripts/traduire.ts');
  console.log('   (une clé gratuite s\'obtient sur console.groq.com — la même que celle du jeu)');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. TRADUIRE
// ---------------------------------------------------------------------------
// ⚠️ LE PROMPT PORTE LES RÈGLES DU JEU, PAS SEULEMENT « TRADUIS ». Une machine à
// qui l'on donne « Essais » sans contexte écrit « Attempts » : c'est le mot
// juste en français courant, et le contre-sens absolu au rugby (« Tries »).
// D'où le vocabulaire imposé, et l'interdiction de toucher aux variables.
const REGLES = `You translate the user interface of a French rugby-career video game.

ABSOLUTE RULES
1. Keep every placeholder EXACTLY as-is: {n}, {club}, {nom}, {adverse}… Never
   translate, reorder or remove them. A missing placeholder breaks the game.
2. Use the RUGBY vocabulary of the target language, not the everyday word:
   essai = try / ensayo / meta / Versuch / ensaio (NOT "attempt"),
   mêlée = scrum / melé / mischia / Gedränge / formação ordenada,
   touche = lineout, plaquage = tackle, drop = drop goal,
   transformation = conversion, pénalité = penalty, en-avant = knock-on,
   grattage = turnover won at the breakdown, ailier = wing, ouvreur = fly-half,
   demi de mêlée = scrum-half, pilier = prop, talonneur = hooker,
   troisième ligne = back row, deuxième ligne = lock, arrière = full-back.
3. Never translate proper nouns: club names, competition names, player names,
   "Destiny Rugby", "L'Ovale", "Ovas" (the in-game currency), "Brennus".
4. Keep the register and the LENGTH: these are buttons and labels in a tight
   interface. A label twice as long breaks the layout. Keep the capitalisation
   style of the French (ALL CAPS stays ALL CAPS).
5. Keep the typographic apostrophe ’ where the French uses it.

Answer with JSON only: {"<key>": {"<lang>": "<translation>", …}, …}
Same keys as the input, nothing else, no commentary.`;

async function traduirePaquet(paquet: Trou[]): Promise<Record<string, Record<string, string>>> {
  const demande = paquet.map((t) => ({
    cle: t.cle,
    fr: t.fr,
    langues: t.langues,
  }));
  const noms = CIBLES.map((l) => `${l.id} = ${l.enAnglais}`).join(', ');

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
    body: JSON.stringify({
      model: MODELE,
      temperature: 0.2, // une traduction n'a pas à être créative
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${REGLES}\n\nLanguage codes: ${noms}.` },
        {
          role: 'user',
          content: `Translate each French string into the languages listed for it.\n\n`
            + JSON.stringify(demande, null, 1),
        },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status} : ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const brut = data.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(brut);
}

/**
 * ⚠️ ON VÉRIFIE CE QUE LA MACHINE REND. Un modèle qui « améliore » un texte en
 * supprimant `{n}` casse le jeu en silence — le compteur affiche « matchs
 * joués » sans le nombre. Une traduction qui perd une variable est REJETÉE, et
 * la clé retombe sur le français, ce qui est le comportement sain du socle.
 */
function variables(s: string): string[] {
  return (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
}

const resultat: Record<string, Partial<Record<Langue, string>>> = {};
let acceptees = 0;
let rejetees = 0;
const motifs: string[] = [];

for (let i = 0; i < trous.length; i += PAR_PAQUET) {
  const paquet = trous.slice(i, i + PAR_PAQUET);
  process.stdout.write(`  paquet ${Math.floor(i / PAR_PAQUET) + 1}/${Math.ceil(trous.length / PAR_PAQUET)} (${paquet.length} clés)… `);
  let rendu: Record<string, Record<string, string>>;
  try {
    rendu = await traduirePaquet(paquet);
  } catch (e) {
    console.log(`⛔ ${(e as Error).message}`);
    continue;
  }
  let ok = 0;
  for (const t of paquet) {
    const propose = rendu[t.cle];
    if (!propose) { rejetees += t.langues.length; motifs.push(`${t.cle} : absente de la réponse`); continue; }
    const attendues = variables(t.fr).join(',');
    for (const l of t.langues) {
      const texte = propose[l];
      if (typeof texte !== 'string' || !texte.trim()) { rejetees++; continue; }
      if (variables(texte).join(',') !== attendues) {
        rejetees++;
        motifs.push(`${t.cle} [${l}] : variables perdues (${attendues || 'aucune'} → ${variables(texte).join(',') || 'aucune'})`);
        continue;
      }
      (resultat[t.cle] ??= {})[l] = texte.trim();
      acceptees++;
      ok++;
    }
  }
  console.log(`${ok} traduction(s)`);
}

// ---------------------------------------------------------------------------
// 3. ÉCRIRE LE FICHIER GÉNÉRÉ
// ---------------------------------------------------------------------------

const cles = Object.keys(resultat).sort();
if (!cles.length) {
  console.log('\n⛔ Rien de retenu. Le fichier généré n\'est pas touché.');
  process.exit(1);
}

const echapper = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
const lignes = cles.map((k) => {
  const paires = CIBLES
    .filter((l) => resultat[k][l.id as Langue])
    .map((l) => `${l.id}: '${echapper(resultat[k][l.id as Langue]!)}'`)
    .join(', ');
  return `  '${echapper(k)}': { ${paires} },`;
});

fs.writeFileSync(SORTIE, `// ⚠️ FICHIER GÉNÉRÉ — NE PAS ÉDITER À LA MAIN.
//
// Produit par \`npx vite-node scripts/traduire.ts\`, qui remplit automatiquement
// les langues manquantes du dictionnaire à partir du français.
//
// ⚠️ IL EST FUSIONNÉ AVEC LA PRIORITÉ LA PLUS BASSE dans \`data/textes.ts\` :
// toute traduction écrite à la main gagne sur celle-ci. C'est ce qui permet de
// relancer le script sans jamais rien écraser, et de corriger une tournure
// simplement en l'écrivant dans le fichier normal.
//
// ⚠️ LES CLÉS N'ONT PAS DE \`fr\` : le français est la source, il vit dans les
// fichiers écrits à la main. Le type l'exige pour une \`Traduction\` complète ;
// ici on ne fournit que les compléments, d'où le type partiel.

import type { Langue } from '../lib/i18n';

export const TEXTES_AUTO: Record<string, Partial<Record<Langue, string>>> = {
${lignes.join('\n')}
};
`, 'utf8');

console.log(`\n✅ ${acceptees} traduction(s) écrite(s) dans ${SORTIE} (${cles.length} clés).`);
if (rejetees) {
  console.log(`⚠ ${rejetees} rejetée(s) — elles retombent sur le français, rien n'est cassé :`);
  for (const m of motifs.slice(0, 10)) console.log(`   · ${m}`);
}
console.log('   Relance `npm run build` pour les embarquer.');
