// COMBIEN D'OVAS RAPPORTE UNE CARRIÈRE ? — le budget, robinet par robinet
//
// ⚠️ CE SCRIPT EXISTE PARCE QUE PERSONNE NE SAVAIT RÉPONDRE. L'économie était
// réputée « dure » (départ à 0, une action rapporte 1, une saison 3) alors
// qu'une belle carrière versait en réalité **4 000 à 5 000 Ovas** — de quoi
// vider deux fois la boutique. La fuite ne venait d'aucune des valeurs
// affichées : elle venait du NOMBRE d'occasions, 3 défis × 43 semaines ×
// 12 saisons, que personne n'avait jamais multiplié.
//
// Il ne simule PAS une carrière : il additionne les robinets. C'est justement
// ce qu'il faut ici — un ordre de grandeur qu'on peut relire, pas un tirage.
//
//   npx vite-node scripts/verifEconomie.ts

import { SUCCES, DEFIS } from '../src/data/succes';
import { TROPHEES } from '../src/data/trophees';
import { SKINS, EQUIPEMENTS } from '../src/data/boutique';
import { TRAITS_A_DEBLOQUER } from '../src/data/traits';
import { PLAFOND_OVAS_DEFIS_PAR_SAISON, PLAFOND_OVAS_ACTIONS_PAR_SAISON } from '../src/store/useGame';
import { OVAS_PAR_PUB, PUBS_PAR_JOUR } from '../src/lib/pub';

/** Une belle carrière : 12 saisons pleines. */
const SAISONS = 12;
/** Part des succès qu'une belle carrière débloque réellement (les secrets et
 *  les paliers extrêmes restent hors de portée). */
const PART_SUCCES = 0.6;
/** Titres remportés par une belle carrière, et leur valeur moyenne. */
const TITRES = 10;
/** Ovas de base versées à chaque intersaison (`saisonSuivante`). */
const OVAS_PAR_SAISON = 3;
/** Situations et évènements encaissés dans l'année, après `gainOvas()` (÷ 8). */
const OVAS_SITUATIONS_PAR_SAISON = 2;
/** Actions écrites au MJ : 43 occasions par saison, mais plafonnées. */
const ACTIONS_IA_PAR_SAISON = PLAFOND_OVAS_ACTIONS_PAR_SAISON;

const poolSucces = SUCCES.reduce((a, s) => a + s.ovas, 0);
const valeurMoyenneTrophee = Object.values(TROPHEES).reduce((a, t) => a + t.ovas, 0)
  / Object.values(TROPHEES).length;

const robinets = [
  ['Succès', Math.round(poolSucces * PART_SUCCES)],
  ['Défis de la semaine', PLAFOND_OVAS_DEFIS_PAR_SAISON * SAISONS],
  ['Trophées', Math.round(TITRES * valeurMoyenneTrophee)],
  ['Fin de saison', OVAS_PAR_SAISON * SAISONS],
  ['Situations / évènements', OVAS_SITUATIONS_PAR_SAISON * SAISONS],
  ['Actions au Maître du Jeu', ACTIONS_IA_PAR_SAISON * SAISONS],
  ['Retraite (score / 150)', 23],
] as const;

const total = robinets.reduce((a, [, v]) => a + v, 0);

console.log(`\n🪙 CE QUE RAPPORTE UNE BELLE CARRIÈRE (${SAISONS} saisons)\n`);
for (const [nom, valeur] of robinets) {
  const part = Math.round((valeur / total) * 100);
  console.log(`  ${nom.padEnd(26)} ${String(valeur).padStart(5)}   ${'█'.repeat(Math.round(part / 2))} ${part} %`);
}
console.log(`  ${'TOTAL'.padEnd(26)} ${String(total).padStart(5)}`);
console.log(`\n  Cagnotte totale des succès : ${poolSucces} Ovas (tous, sur toutes les carrières)`);
console.log(`  Valeur moyenne d'un trophée : ${valeurMoyenneTrophee.toFixed(1)} Ovas`);
console.log(`  Pub récompensée : ${OVAS_PAR_PUB} × ${PUBS_PAR_JOUR}/jour = ${OVAS_PAR_PUB * PUBS_PAR_JOUR} Ovas/jour`);

// ⚠️ LES ARCHÉTYPES DE CARACTÈRE COMPTENT DANS LE CATALOGUE. Ils s’achètent
// en Ovas comme le reste ; les oublier ici, c’est annoncer « tout acheter :
// N carrières » en ignorant un tiers de la dépense possible.
const traits = TRAITS_A_DEBLOQUER.reduce((a, tr) => a + (tr.prix ?? 0), 0);
const catalogue = SKINS.reduce((a, s) => a + s.prix, 0)
  + EQUIPEMENTS.reduce((a, e) => a + e.prix, 0)
  + traits;
console.log(`\n🛒 LA BOUTIQUE\n`);
console.log(`  Tout acheter : ${catalogue} Ovas, soit ${(catalogue / total).toFixed(1)} carrières`);
console.log(`  dont ${TRAITS_A_DEBLOQUER.length} archétypes de caractère : ${traits} Ovas`);
const plusCher = [...SKINS.map((s) => ({ nom: s.nom, prix: s.prix })), ...EQUIPEMENTS]
  .sort((a, b) => b.prix - a.prix)[0];
console.log(`  Pièce la plus chère : ${plusCher.nom} à ${plusCher.prix} Ovas`
  + ` (${Math.round((plusCher.prix / total) * 100)} % d'une carrière)`);
console.log(`  Défis : ${DEFIS.length} modèles, ${PLAFOND_OVAS_DEFIS_PAR_SAISON} Ovas par saison au maximum\n`);

// ⚠️ LA CIBLE EST ÉCRITE ICI, ET LE SCRIPT ÉCHOUE SI ON S'EN ÉLOIGNE. Demande
// explicite de l'utilisateur : « réduis pour que ce soit plus autour des 500 ».
if (total < 380 || total > 640) {
  console.error(`\n❌ Hors cible : ${total} Ovas par carrière, attendu ~500 (380-640).`);
  process.exit(1);
}
console.log(`✅ ${total} Ovas par belle carrière — dans la cible (~500).\n`);
