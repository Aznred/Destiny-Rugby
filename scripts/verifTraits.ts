// BANC D'ESSAI DES TRAITS DE CARACTÈRE
//
// Deux questions, et la seconde est la vraie raison de ce script.
//
//  1. **CHAQUE EFFET DÉCLARÉ EST-IL LU QUELQUE PART ?** Question posée en jeu :
//     « les caractères, ils ont un impact ou quoi ? ». La réponse était NON pour
//     deux effets sur onze : `formeParSemaine` et `moralParSemaine` étaient
//     cumulés par `effetsTraits()` et lus par personne. Six traits sur douze
//     annonçaient donc un effet inexistant — « Professionnel » promettait de
//     mieux récupérer sans rien récupérer. Un trait qui ment est pire qu'un
//     trait absent : le joueur fonde un choix de création dessus.
//
//  2. **UN TRAIT PAYANT EST-IL PLUS FORT QU'UN TRAIT GRATUIT ?** Depuis qu'on
//     débloque des archétypes en Ovas, c'est LA question qui décide si la
//     boutique vend du choix ou de la puissance. La règle du projet est nette
//     (« ce qui s'achète est cosmétique ») et l'étalonnage de difficulté en
//     dépend : `verifDifficulte.ts` mesure des carrières, pas des intentions.
//
//   npx vite-node scripts/verifTraits.ts

import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_TRAITS, TRAITS, TRAITS_A_DEBLOQUER, TRAITS_DE_BASE, effetsTraits,
  poidsTrait, traitDisponible, type Trait,
} from '../src/data/traits';

let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(50)} ${valeur}`);
}

// ---------------------------------------------------------------------------
// 1. CHAQUE EFFET EST LU QUELQUE PART
// ---------------------------------------------------------------------------
console.log('=== 1. AUCUN EFFET MORT ===');
{
  // On balaie les sources à la recherche d'une lecture `.<effet>` en dehors du
  // fichier qui les déclare. ⚠️ C'est grossier — une lecture par destructuration
  // passerait au travers — mais c'est exactement ce qui a laissé passer le bug :
  // personne n'avait jamais vérifié.
  const racines = ['src/lib', 'src/store', 'src/components', 'src/screens', 'src/data'];
  const fichiers: string[] = [];
  const parcourir = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const complet = path.join(d, e.name);
      if (e.isDirectory()) parcourir(complet);
      else if (/\.tsx?$/.test(e.name) && !complet.endsWith(path.join('data', 'traits.ts'))) {
        fichiers.push(complet);
      }
    }
  };
  for (const r of racines) if (fs.existsSync(r)) parcourir(r);
  const source = fichiers.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  const effets = [
    'progression', 'risqueBlessure', 'graviteBlessure', 'noteMatch', 'noteGrosMatch',
    'cartons', 'formeParSemaine', 'moralParSemaine', 'offres', 'leadership', 'vestiaire',
  ];
  const morts: string[] = [];
  for (const e of effets) {
    if (!new RegExp(`\\.${e}\\b`).test(source)) morts.push(e);
  }
  ligne('tous les effets sont lus hors de traits.ts',
    morts.length ? `MORTS : ${morts.join(', ')}` : `${effets.length}/${effets.length}`,
    morts.length === 0);

  // Et l'inverse : un effet déclaré par un trait mais absent du cumul serait
  // silencieusement perdu.
  const cumul = effetsTraits(TRAITS.map((t) => t.id));
  const oublies = effets.filter((e) => !(e in cumul));
  ligne('tous les effets passent par effetsTraits()',
    oublies.length ? oublies.join(', ') : 'aucun oubli', oublies.length === 0);
}

// ---------------------------------------------------------------------------
// 2. CHAQUE TRAIT DONNE ET COÛTE
// ---------------------------------------------------------------------------
console.log('\n=== 2. AUCUN TRAIT N’EST GRATUIT ===');
{
  // Un trait n'a le droit d'exister que s'il a au moins un effet FAVORABLE et
  // au moins un effet DÉFAVORABLE. Sans cette règle, on n'écrit plus des
  // caractères mais des bonus.
  const signe = (t: Trait) => {
    const bons: string[] = [];
    const mauvais: string[] = [];
    const noter = (nom: string, v: number) => (v > 0 ? bons : mauvais).push(nom);
    if (t.progression != null) noter('progression', t.progression - 1);
    if (t.risqueBlessure != null) noter('blessure', 1 - t.risqueBlessure);
    if (t.graviteBlessure != null) noter('gravité', 1 - t.graviteBlessure);
    if (t.noteMatch != null) noter('note', t.noteMatch);
    if (t.noteGrosMatch != null) noter('gros match', t.noteGrosMatch);
    if (t.cartons != null) noter('cartons', 1 - t.cartons);
    if (t.formeParSemaine != null) noter('forme', t.formeParSemaine);
    if (t.moralParSemaine != null) noter('moral', t.moralParSemaine);
    if (t.offres != null) noter('offres', t.offres - 1);
    if (t.leadership != null) noter('leadership', t.leadership);
    if (t.vestiaire != null) noter('vestiaire', t.vestiaire);
    return { bons, mauvais };
  };

  const sansCout = TRAITS.filter((t) => signe(t).mauvais.length === 0);
  const sansGain = TRAITS.filter((t) => signe(t).bons.length === 0);
  ligne('chaque trait a un coût', sansCout.length ? sansCout.map((t) => t.id).join(', ') : `${TRAITS.length}/${TRAITS.length}`, sansCout.length === 0);
  ligne('chaque trait a un gain', sansGain.length ? sansGain.map((t) => t.id).join(', ') : `${TRAITS.length}/${TRAITS.length}`, sansGain.length === 0);
}

// ---------------------------------------------------------------------------
// 3. ⚠️ LA BOUTIQUE VEND DU CHOIX, PAS DE LA PUISSANCE
// ---------------------------------------------------------------------------
console.log('\n=== 3. ⚠️ AUCUN TRAIT PAYANT N’EST PLUS FORT QUE LES GRATUITS ===');
{
  const poidsBase = TRAITS_DE_BASE.map(poidsTrait);
  const maxBase = Math.max(...poidsBase);
  const minBase = Math.min(...poidsBase);
  console.log(`     traits de base : poids de ${minBase.toFixed(1)} à ${maxBase.toFixed(1)}`);

  const trop = TRAITS_A_DEBLOQUER.filter((t) => poidsTrait(t) > maxBase);
  ligne('aucun payant au-dessus du meilleur gratuit',
    trop.length
      ? trop.map((t) => `${t.id} ${poidsTrait(t).toFixed(1)}`).join(', ')
      : `max payant ${Math.max(...TRAITS_A_DEBLOQUER.map(poidsTrait)).toFixed(1)} ≤ ${maxBase.toFixed(1)}`,
    trop.length === 0);

  // ⚠️ ET LA MEILLEURE PAIRE NON PLUS. On en porte DEUX : deux traits
  // individuellement raisonnables peuvent se cumuler en une combinaison qui ne
  // l'est pas. C'est le test qui compte vraiment.
  const meilleurePaire = (liste: Trait[]) => {
    let max = -Infinity;
    let nom = '';
    for (let a = 0; a < liste.length; a++) {
      for (let b = a + 1; b < liste.length; b++) {
        const p = poidsTrait(liste[a]) + poidsTrait(liste[b]);
        if (p > max) { max = p; nom = `${liste[a].id} + ${liste[b].id}`; }
      }
    }
    return { max, nom };
  };
  const paireBase = meilleurePaire(TRAITS_DE_BASE);
  const paireTout = meilleurePaire(TRAITS);
  console.log(`     meilleure paire gratuite  : ${paireBase.nom} (${paireBase.max.toFixed(1)})`);
  console.log(`     meilleure paire possible  : ${paireTout.nom} (${paireTout.max.toFixed(1)})`);
  // Une marge de 15 % est tolérée : exiger l'égalité stricte interdirait
  // d'écrire un archétype un peu plus tranché sans le rendre insipide.
  const plafond = paireBase.max * 1.15;
  ligne('la meilleure paire n’explose pas avec les achats',
    `${paireTout.max.toFixed(1)} ≤ ${plafond.toFixed(1)}`, paireTout.max <= plafond);

  ligne('on n’en porte toujours que deux', `MAX_TRAITS = ${MAX_TRAITS}`, MAX_TRAITS === 2);
}

// ---------------------------------------------------------------------------
// 4. LE VERROU DE DÉBLOCAGE
// ---------------------------------------------------------------------------
console.log('\n=== 4. UN TRAIT PAYANT N’EST PAS JOUABLE SANS ACHAT ===');
{
  const payant = TRAITS_A_DEBLOQUER[0];
  const gratuit = TRAITS_DE_BASE[0];
  ligne('un trait de base est toujours disponible', gratuit.id, traitDisponible(gratuit.id, []));
  ligne('un trait payant ne l’est pas sans achat', payant.id, !traitDisponible(payant.id, []));
  ligne('… et l’est une fois acheté', payant.id, traitDisponible(payant.id, [payant.id]));
  ligne('un identifiant inconnu est refusé', 'trait_invente', !traitDisponible('trait_invente', ['trait_invente']));

  const sansPrix = TRAITS_A_DEBLOQUER.filter((t) => !t.prix || t.prix <= 0);
  ligne('chaque trait payant a un prix', sansPrix.length ? sansPrix.map((t) => t.id).join(', ') : `${TRAITS_A_DEBLOQUER.length} traits`, sansPrix.length === 0);

  // ⚠️ LE PRIX SE COMPARE À L'ÉCONOMIE RÉELLE : une belle carrière rapporte
  // ~550 Ovas (verifEconomie.ts). Tout débloquer doit demander plusieurs
  // carrières, sans qu'un seul trait soit hors de portée d'une première.
  const total = TRAITS_A_DEBLOQUER.reduce((n, t) => n + (t.prix ?? 0), 0);
  const plusCher = Math.max(...TRAITS_A_DEBLOQUER.map((t) => t.prix ?? 0));
  console.log(`     ${TRAITS_A_DEBLOQUER.length} traits à débloquer · ${total} Ovas au total · le plus cher ${plusCher}`);
  ligne('le plus cher tient dans une belle carrière (≤ 250)', plusCher, plusCher <= 250);
  ligne('tout débloquer demande plusieurs carrières (≥ 1000)', total, total >= 1000);
}

// ---------------------------------------------------------------------------
// 5. LE CUMUL SE COMPORTE BIEN
// ---------------------------------------------------------------------------
console.log('\n=== 5. LE CUMUL DES DEUX TRAITS ===');
{
  const vide = effetsTraits([]);
  ligne('sans trait, tout est neutre',
    `progression ${vide.progression}, note ${vide.noteMatch}`,
    vide.progression === 1 && vide.noteMatch === 0 && vide.risqueBlessure === 1);

  // Les multiplicateurs se multiplient, les bonus s'additionnent.
  const deux = effetsTraits(['professionnel', 'travailleur']);
  const attendu = 1.2 * 1.25;
  ligne('les multiplicateurs se multiplient',
    `${deux.progression.toFixed(3)} attendu ${attendu.toFixed(3)}`,
    Math.abs(deux.progression - attendu) < 1e-9);
  const forme = effetsTraits(['professionnel', 'increvable']);
  ligne('les bonus s’additionnent', `forme +${forme.formeParSemaine}`, forme.formeParSemaine === 6);

  ligne('un identifiant inconnu est ignoré',
    'inconnu', effetsTraits(['inconnu']).progression === 1);
}

console.log(echecs === 0
  ? '\n✅ Traits conformes — chaque effet est lu, chacun coûte quelque chose, et la boutique ne vend que du choix.'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
