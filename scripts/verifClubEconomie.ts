// VÉRIFICATION — L'ÉCONOMIE DU CLUB : stade, supporters, sponsors, conseil
//
// Demande : « une vraie économie avec stade + infrastructures + supporters +
// sponsors + merchandising + hospitalités, plutôt qu'un simple bouton
// "améliorer stade" », et la promesse qui commande tout :
//
//   « Si tu pars de Régionale 3 avec 300 spectateurs et une buvette pour
//     arriver 20 saisons plus tard avec ton propre stade de 25 000 places, tu as
//     une vraie sensation d'avoir construit le club. »
//
// ⚠️ LE CONTRÔLE LE PLUS IMPORTANT EST LE 5. Les recettes réelles doivent
// retomber dans les fourchettes de budget de `lib/economie.ts` — la table que
// tout le reste du jeu (marché, salary cap, enveloppes) utilise déjà. Si elles
// n'y retombent pas, ce lot n'est pas une économie : c'est un second système
// parallèle qui contredit le premier.
//
// Lancer : npx vite-node scripts/verifClubEconomie.ts

import { COMPETITIONS } from '../src/data/clubs';
import { ECONOMIE } from '../src/lib/economie';
import { forceEffectif } from '../src/lib/effectif';
import {
  apresLaSaison, fanbaseHistorique, notorieteDuClub, partQuiSeDeplace, total,
} from '../src/lib/supporters';
import type { Fanbase } from '../src/lib/supporters';
import {
  PRIX_CONSEILLE, TRIBUNES, affluence, campagneAbonnements, capacite,
  chargesDuStade, jourDeMatch, stadeHistorique,
} from '../src/lib/stade';
import type { ContexteAffiche, EquipementsStade, Stade } from '../src/lib/stade';
import {
  compteDeResultat, droitsTV, merchandising, offresPour, sponsoringTotal,
} from '../src/lib/financesClub';
import {
  coutDuPalier, dossierStade, infrastructuresDeBase, retourAttendu, soumettreAuConseil,
} from '../src/lib/infrastructuresClub';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(56)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(56)} ${valeur}`);
}
const E = (n: number) => Math.round(n).toLocaleString('fr-FR');
const M = (n: number) => (n >= 1_000_000 ? `${(n / 1e6).toFixed(1)} M€` : `${E(n)} €`);

const TEMOINS: [number, string, string][] = [
  [1, 'Top 14', 'Stade Toulousain'],
  [2, 'Pro D2', 'US Oyonnax'],
  [3, 'Nationale', 'SC Albi'],
  [4, 'Nationale 2', 'RC Orléans'],
  [5, 'Fédérale 1', 'U S Nafarroa'],
  [6, 'Fédérale 2', 'R C Sablais'],
  [7, 'Fédérale 3', 'R C Teillois'],
  [8, 'Régionale 1', 'Orsay'],
  [9, 'Régionale 2', 'Chartreuse'],
  [10, 'Régionale 3', 'Parentis'],
];

/** Le calendrier type d'une saison à domicile : des affiches variées. */
const AFFICHES: ContexteAffiche[] = [
  { adversaire: 78, forme: 70, importance: 'derby', meteo: 'beau', horaire: 'samediSoir' },
  { adversaire: 62, forme: 65, importance: 'ordinaire', meteo: 'pluie', horaire: 'dimanche' },
  { adversaire: 70, forme: 60, importance: 'belle', meteo: 'couvert', horaire: 'samediApresMidi' },
  { adversaire: 48, forme: 62, importance: 'ordinaire', meteo: 'couvert', horaire: 'dimanche' },
  { adversaire: 74, forme: 72, importance: 'belle', meteo: 'beau', horaire: 'samediSoir' },
  { adversaire: 55, forme: 58, importance: 'ordinaire', meteo: 'pluie', horaire: 'samediApresMidi' },
];

interface Saison {
  billetterie: number; buvettes: number; boutique: number; parking: number; vip: number;
  couts: number; spectateurs: number; matchs: number; perduEnFiles: number; remplissage: number;
}

function saisonDomicile(stade: Stade, f: Fanbase, niveau: number, eq: EquipementsStade,
  notoriete: number, reputation: number, matchs: number): Saison {
  const s: Saison = {
    billetterie: 0, buvettes: 0, boutique: 0, parking: 0, vip: 0,
    couts: 0, spectateurs: 0, matchs, perduEnFiles: 0, remplissage: 0,
  };
  for (let i = 0; i < matchs; i++) {
    const aff = affluence(stade, f, niveau, AFFICHES[i % AFFICHES.length], reputation);
    const r = jourDeMatch(stade, eq, aff, notoriete);
    s.billetterie += r.billetterie; s.buvettes += r.buvettes; s.boutique += r.boutique;
    s.parking += r.parking; s.vip += r.vip; s.couts += r.couts;
    s.spectateurs += aff.total; s.perduEnFiles += r.perduEnFiles;
    s.remplissage += aff.tauxRemplissage;
  }
  s.remplissage = Math.round(s.remplissage / matchs);
  return s;
}

// ---------------------------------------------------------------------------
console.log('\n=== 1. LA FANBASE, ÉTAGE PAR ÉTAGE ===');
// ---------------------------------------------------------------------------
// ⚠️ ON MESURE LA MÉDIANE D'UN ÉTAGE, PAS UN CLUB. Une première version
// comparait les dix clubs témoins entre eux et criait à l'inversion : elle avait
// raison sur les nombres et tort sur la question. Les fourchettes de fanbase se
// CHEVAUCHENT volontairement d'un étage à l'autre — un vieux club populaire de
// Régionale 1 a plus de monde qu'un petit club de Fédérale 3, et c'est
// exactement ce qui donne de la vie à la pyramide. Ce qui doit être vrai, c'est
// que l'ÉTAGE au-dessus pèse plus lourd, pas chacun de ses clubs.
function medianeDe(niveau: number, mesure: (club: string) => number): number {
  const comp = COMPETITIONS.find((c) => c.pays === 'France' && c.niveau === niveau);
  if (!comp) return 0;
  const v = comp.clubs.slice(0, 14).map((c) => mesure(c.nom)).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}

console.log('\n  étage        | fanbase médiane | témoin     | noyau dur | part qui se déplace');
let monotoneFan = true; let precedent = Infinity;
for (const [niveau, nom, club] of TEMOINS) {
  const med = medianeDe(niveau, (c) => total(fanbaseHistorique(c)));
  if (med > precedent) monotoneFan = false;
  precedent = med;
  const f = fanbaseHistorique(club);
  const n = total(f);
  console.log(`  ${nom.padEnd(12)} | ${E(med).padStart(15)} | ${E(n).padStart(10)} | `
    + `${String(Math.round(100 * f.hardcore / n)).padStart(8)} % | ${(partQuiSeDeplace(n) * 100).toFixed(0)} %`);
}
ligne('un étage pèse toujours plus lourd que celui du dessous',
  monotoneFan ? 'monotone sur 10 étages (médianes)' : 'INVERSION', monotoneFan);
const r3 = total(fanbaseHistorique('Parentis'));
ligne('un club de Régionale 3 fait bien quelques centaines de personnes',
  `${E(r3)} supporters, ${E(r3 * partQuiSeDeplace(r3))} au bord du terrain`,
  r3 >= 60 && r3 <= 800);

// ⚠️ « UN CLUB DE RÉGIONALE QUE TU AMÈNES EN TOP 14 EN DIX SAISONS N'AURAIT PAS
// INSTANTANÉMENT 100 000 SUPPORTERS. » C'est le contrôle qui protège toute la
// promesse du lot : si la fanbase suivait la division, elle ne serait qu'une
// deuxième écriture du niveau, et « construire un club » ne voudrait rien dire.
let ascension = fanbaseHistorique('Parentis');
const etapes: number[] = [total(ascension)];
let alea = 0.42;
const suite = () => { alea = (alea * 9301 + 49297) % 233280 / 233280; return alea; };
for (let s = 0; s < 10; s++) {
  const niveauApres = Math.max(1, 10 - s);
  ascension = apresLaSaison(ascension, {
    rang: 1, taillePoule: 12, monte: true, descend: false, titre: true, niveau: niveauApres,
  }, suite);
  etapes.push(total(ascension));
}
info('dix montées d\'affilée, Régionale 3 → Top 14', etapes.map((v) => E(v)).join(' → '));
ligne('⚠️ dix montées ne fabriquent pas 100 000 supporters',
  `${E(etapes[etapes.length - 1])} au bout de dix saisons`,
  etapes[etapes.length - 1] < 100_000 && etapes[etapes.length - 1] > etapes[0] * 8);

// Et une descente fait mal, sans tuer le club.
let chute = fanbaseHistorique('US Oyonnax');
const avantChute = total(chute);
chute = apresLaSaison(chute, { rang: 16, taillePoule: 16, monte: false, descend: true, titre: false, niveau: 3 }, suite);
ligne('une relégation coûte du monde, mais pas le noyau dur',
  `${E(avantChute)} → ${E(total(chute))} (noyau ${E(fanbaseHistorique('US Oyonnax').hardcore)} → ${E(chute.hardcore)})`,
  total(chute) < avantChute && chute.hardcore > fanbaseHistorique('US Oyonnax').hardcore * 0.85);

// ---------------------------------------------------------------------------
console.log('\n=== 2. LE STADE ===');
// ---------------------------------------------------------------------------
console.log('\n  étage        | capacité | propriété | VIP  | confort | loyer/entretien');
for (const [, nom, club] of TEMOINS) {
  const s = stadeHistorique(club);
  console.log(`  ${nom.padEnd(12)} | ${E(capacite(s)).padStart(8)} | ${s.propriete.padEnd(9)} | `
    + `${String(s.places.vip).padStart(4)} | ${String(s.confort).padStart(7)} | ${E(chargesDuStade(s))} €`);
}
const petits = TEMOINS.filter(([n]) => n >= 6).map(([, , c]) => stadeHistorique(c));
ligne('les clubs amateurs jouent chez la commune',
  `${petits.filter((s) => s.propriete !== 'club').length}/${petits.length}`,
  petits.every((s) => s.propriete !== 'club'));
ligne('… et n\'ont pas de tribune VIP',
  `${petits.filter((s) => s.places.vip === 0).length}/${petits.length}`,
  petits.every((s) => s.places.vip === 0));

// ---------------------------------------------------------------------------
console.log('\n=== 3. ⚠️ LE PRIX DU BILLET EST UN PROBLÈME D\'OPTIMISATION ===');
// ---------------------------------------------------------------------------
// « Tu gagnes davantage par spectateur mais tu remplis moins. »
const stadePro = stadeHistorique('US Oyonnax');
const fanPro = fanbaseHistorique('US Oyonnax');
const conseille = PRIX_CONSEILLE[2];
console.log('\n  prix populaire | affluence | remplissage | billetterie du match');
const courbe: { prix: number; recette: number; venus: number }[] = [];
for (const mult of [0.5, 0.75, 1, 1.25, 1.5, 2, 3]) {
  const s: Stade = { ...stadePro, prix: { ...stadePro.prix } };
  for (const t of TRIBUNES) s.prix[t] = Math.round(conseille[t] * mult);
  const aff = affluence(s, fanPro, 2, AFFICHES[2], 70);
  let recette = 0;
  for (const t of TRIBUNES) recette += aff.parTribune[t] * s.prix[t];
  courbe.push({ prix: s.prix.populaire, recette, venus: aff.total });
  console.log(`  ${String(s.prix.populaire).padStart(14)} € | ${E(aff.total).padStart(9)} | `
    + `${String(aff.tauxRemplissage).padStart(10)} % | ${E(recette)} €`);
}
ligne('augmenter le prix fait vraiment baisser l\'affluence',
  `${E(courbe[0].venus)} à ${courbe[0].prix} € → ${E(courbe[courbe.length - 1].venus)} à ${courbe[courbe.length - 1].prix} €`,
  courbe[courbe.length - 1].venus < courbe[0].venus * 0.7);
// ⚠️ IL DOIT Y AVOIR UN OPTIMUM AILLEURS QU'AUX EXTRÊMES, sinon il n'y a pas de
// décision : soit on brade toujours, soit on maximise toujours.
const meilleur = courbe.reduce((a, b) => (b.recette > a.recette ? b : a));
const auMilieu = meilleur !== courbe[0] && meilleur !== courbe[courbe.length - 1];
ligne('⚠️ la recette a un optimum au milieu, pas aux extrêmes',
  `meilleure recette à ${meilleur.prix} € (${E(meilleur.recette)} €)`, auMilieu);

// ---------------------------------------------------------------------------
console.log('\n=== 4. LE JOUR DE MATCH ===');
// ---------------------------------------------------------------------------
const eqPro: EquipementsStade = { buvettes: 3, boutique: 3, parking: 3, hospitalites: 3 };
const affPro = affluence(stadePro, fanPro, 2, AFFICHES[0], 72);
const jm = jourDeMatch(stadePro, eqPro, affPro, notorieteDuClub('US Oyonnax', 1, fanPro));
console.log(`\n  ${E(affPro.total)} spectateurs (${affPro.tauxRemplissage} % de ${E(capacite(stadePro))})`);
info('🎟️ billetterie', `${E(jm.billetterie)} €`);
info('🍺 buvettes', `${E(jm.buvettes)} €`);
info('🛍️ boutique', `${E(jm.boutique)} €`);
info('🅿️ parking', `${E(jm.parking)} €`);
info('💎 VIP', `${E(jm.vip)} €`);
info('CA match', `${E(jm.chiffreAffaires)} €`);
info('coûts', `−${E(jm.couts)} €`);
info('résultat', `+${E(jm.resultat)} €`);
ligne('un jour de match est financièrement important',
  `+${E(jm.resultat)} € de résultat`, jm.resultat > 0);
ligne('… et le billet n\'est pas tout',
  `${Math.round(100 * (1 - jm.billetterie / jm.chiffreAffaires))} % du CA vient d'ailleurs`,
  jm.billetterie / jm.chiffreAffaires < 0.75);

// ⚠️ LES FILES D'ATTENTE : c'est ce qui rend une buvette digne d'être construite.
const eqPauvre: EquipementsStade = { ...eqPro, buvettes: 1 };
const jmPauvre = jourDeMatch(stadePro, eqPauvre, affPro, 60);
info('avec 1 seul niveau de buvettes', `${E(jmPauvre.buvettes)} € encaissés, ${E(jmPauvre.perduEnFiles)} € perdus en files`);
ligne('⚠️ un stade plein avec peu de buvettes perd de l\'argent',
  `${E(jmPauvre.perduEnFiles)} € de manque à gagner`, jmPauvre.perduEnFiles > 0);
ligne('… et améliorer les buvettes le récupère',
  `${E(jmPauvre.buvettes)} € → ${E(jm.buvettes)} €`, jm.buvettes > jmPauvre.buvettes * 1.5);

// ---------------------------------------------------------------------------
console.log('\n=== 5. ⚠️ LES RECETTES RETOMBENT DANS LA TABLE ÉCONOMIQUE ===');
// ---------------------------------------------------------------------------
// C'est LE contrôle du lot. `lib/economie.ts` donne une fourchette de budget par
// étage, et tout le reste du jeu s'en sert déjà. Si les recettes réelles n'y
// retombent pas, ce lot ne remplace pas la table : il la contredit.
function bilanDe(club: string, niveau: number) {
  const f = fanbaseHistorique(club);
  const stade = stadeHistorique(club);
  const inf = infrastructuresDeBase(niveau);
  const eq: EquipementsStade = {
    buvettes: inf.buvettes, boutique: inf.boutique, parking: inf.parking, hospitalites: inf.hospitalites,
  };
  const notoriete = notorieteDuClub(club, 1, f);
  const matchs = niveau <= 2 ? 13 : 11;
  const s = saisonDomicile(stade, f, niveau, eq, notoriete, notoriete, matchs);
  const masse = ECONOMIE[niveau].masse[0] * 0.9 + ECONOMIE[niveau].salaireTypique * 6;
  return compteDeResultat({
    club, niveau, saison: 1, fanbase: f, stade,
    billetterie: s.billetterie, hospitalites: s.vip, restauration: s.buvettes,
    boutiqueJourDeMatch: s.boutique + s.parking, coutsJourDeMatch: s.couts,
    rang: 6, taillePoule: 14, masseSalariale: masse, annuiteDette: 0,
    merch: { meilleurJoueur: 80, titre: false, monte: false, descend: false, boutique: eq.boutique },
    formation: 0, primes: 0,
  });
}

// ⚠️ MÊME LEÇON QU'EN SECTION 1 : on juge un ÉTAGE, pas un club. Un club dont la
// fanbase est au bas de sa fourchette sortira au bas de sa fourchette de
// recettes — c'est correct, et ça ne dit rien sur le réglage. Ce qui doit être
// vrai, c'est que la médiane de l'étage tombe dans la bande, et que la grande
// majorité des clubs y tombent aussi.
console.log('\n  étage        | médiane     | fourchette attendue     | clubs dans la bande');
let horsBande = 0; let clubsTestes = 0; let clubsDedans = 0;
const bilans: Record<string, ReturnType<typeof compteDeResultat>> = {};
for (const [niveau, nom, club] of TEMOINS) {
  bilans[nom] = bilanDe(club, niveau);
  const comp = COMPETITIONS.find((c) => c.pays === 'France' && c.niveau === niveau)!;
  const echantillon = comp.clubs.slice(0, 10).map((c) => bilanDe(c.nom, niveau).totalRevenus);
  const tries = echantillon.slice().sort((a, b) => a - b);
  const mediane = tries[Math.floor(tries.length / 2)];
  const [bas, haut] = ECONOMIE[niveau].budget;
  const dedans = echantillon.filter((v) => v >= bas && v <= haut).length;
  clubsTestes += echantillon.length; clubsDedans += dedans;
  const medianeOk = mediane >= bas && mediane <= haut;
  if (!medianeOk) horsBande++;
  console.log(
    `  ${medianeOk ? '✅' : '❌'} ${nom.padEnd(11)} | ${M(mediane).padStart(11)} | `
    + `${`${M(bas)} – ${M(haut)}`.padEnd(23)} | ${dedans}/${echantillon.length}`,
  );
}
ligne('⚠️ la médiane de chaque étage tient la table de `economie.ts`',
  `${TEMOINS.length - horsBande}/${TEMOINS.length} étages`, horsBande === 0);
ligne('… et la grande majorité des clubs y tombent aussi',
  `${clubsDedans}/${clubsTestes} clubs (${Math.round(100 * clubsDedans / clubsTestes)} %)`,
  clubsDedans / clubsTestes >= 0.7);

const top14 = bilans['Top 14'];
console.log('\n  Détail Top 14 — REVENUS');
for (const [k, v] of Object.entries(top14.revenus)) info(k, M(v));
console.log('  Détail Top 14 — DÉPENSES');
for (const [k, v] of Object.entries(top14.depenses)) info(k, `−${M(v)}`);
info('RÉSULTAT', `${top14.resultat >= 0 ? '+' : ''}${M(top14.resultat)}`);

// ⚠️ « À CE NIVEAU, LA BUVETTE PEUT PRESQUE ÊTRE PLUS IMPORTANTE QUE LA
// BILLETTERIE. » C'est la phrase qui décrit le bas de la pyramide, et elle doit
// être vraie dans les chiffres, pas seulement dans l'intention.
const bas = bilans['Régionale 3'];
info('Régionale 3 · billetterie', M(bas.revenus.billetterie));
info('Régionale 3 · restauration', M(bas.revenus.restauration));
info('Régionale 3 · vie associative', M(bas.revenus.autres));
ligne('⚠️ en Régionale, la buvette pèse autant que la billetterie',
  `${M(bas.revenus.restauration)} contre ${M(bas.revenus.billetterie)}`,
  bas.revenus.restauration >= bas.revenus.billetterie * 0.6);
ligne('… et la vie associative fait vivre le club',
  `${Math.round(100 * bas.revenus.autres / bas.totalRevenus)} % des recettes`,
  bas.revenus.autres / bas.totalRevenus >= 0.3);

// ---------------------------------------------------------------------------
console.log('\n=== 6. SPONSORS, TV, MERCHANDISING ===');
// ---------------------------------------------------------------------------
const spTls = sponsoringTotal('Stade Toulousain', fanbaseHistorique('Stade Toulousain'), 1, stadeHistorique('Stade Toulousain'));
const offres = offresPour('Stade Toulousain', 'principal', spTls, 1);
console.log('');
for (const [i, o] of offres.entries()) {
  console.log(`  Offre ${'ABC'[i]} : ${M(o.fixe)}/an sur ${o.duree} ans`
    + (o.bonusTop6 ? ` · +${M(o.bonusTop6)} si Top 6 · +${M(o.bonusTitre)} si champion` : ''));
}
// ⚠️ Les trois offres doivent avoir une espérance VOISINE : sinon il n'y a pas
// de choix entre sécurité et performance, juste une bonne réponse.
const esperances = offres.map((o) => o.fixe + o.bonusTop6 * 0.35 + o.bonusTitre * 0.12);
const ecart = (Math.max(...esperances) - Math.min(...esperances)) / Math.max(...esperances);
ligne('⚠️ les trois offres se valent — c\'est un arbitrage, pas une évidence',
  `${Math.round(ecart * 100)} % d'écart d'espérance`, ecart < 0.16);

// Le naming n'existe que chez soi.
const chezSoi = stadeHistorique('Stade Toulousain');
const faux: Stade = { ...chezSoi, propriete: 'municipal' };
const spSansNaming = sponsoringTotal('Stade Toulousain', fanbaseHistorique('Stade Toulousain'), 1, faux);
ligne('un stade municipal ne se vend pas au naming',
  `${M(spTls)} contre ${M(spSansNaming)}`, spSansNaming < spTls);

console.log('\n  étage        | droits TV');
for (const [niveau, nom, club] of TEMOINS) {
  console.log(`  ${nom.padEnd(12)} | ${M(droitsTV(club, niveau, 6, 14))}`);
}
const tvNat = droitsTV('SC Albi', 3, 6, 14);
const tvPro = droitsTV('SC Albi', 2, 6, 16);
ligne('⚠️ monter change financièrement la vie du club',
  `Nationale ${M(tvNat)} → Pro D2 ${M(tvPro)}`, tvPro > tvNat * 4);

const fanTls = fanbaseHistorique('Stade Toulousain');
const merchNormal = merchandising('Stade Toulousain', fanTls, 1,
  { meilleurJoueur: 80, titre: false, monte: false, descend: false, boutique: 4 });
const merchStar = merchandising('Stade Toulousain', fanTls, 1,
  { meilleurJoueur: 92, titre: false, monte: false, descend: false, boutique: 4 });
const merchChampion = merchandising('Stade Toulousain', fanTls, 1,
  { meilleurJoueur: 92, titre: true, monte: false, descend: false, boutique: 4 });
info('merchandising · saison ordinaire', M(merchNormal));
info('… avec une star', `${M(merchStar)} (+${Math.round(100 * (merchStar / merchNormal - 1))} %)`);
info('… champion, avec une star', `${M(merchChampion)} (+${Math.round(100 * (merchChampion / merchNormal - 1))} %)`);
ligne('signer une star fait vendre des maillots',
  `+${Math.round(100 * (merchStar / merchNormal - 1))} %`,
  merchStar > merchNormal * 1.15 && merchStar < merchNormal * 1.35);

// ---------------------------------------------------------------------------
console.log('\n=== 7. LES ABONNEMENTS ===');
// ---------------------------------------------------------------------------
// « Argent immédiatement pendant l'été. Mais une place abonnée rapporte
// potentiellement moins qu'une place vendue individuellement. »
const prixAbo = {} as Record<'populaire' | 'laterale' | 'centrale' | 'vip', number>;
for (const t of TRIBUNES) prixAbo[t] = Math.round(stadePro.prix[t] * 13);
const camp = campagneAbonnements(stadePro, fanPro, prixAbo);
info('abonnés', TRIBUNES.map((t) => `${t} ${E(camp.abonnes[t])}`).join(' · '));
info('recette encaissée en juillet', M(camp.recette));
ligne('⚠️ l\'abonnement se paie en trésorerie, pas en marge',
  `l'équivalent de ${camp.equivalentMatchs} matchs pour une saison de 13`,
  camp.equivalentMatchs > 0 && camp.equivalentMatchs < 15);

// ---------------------------------------------------------------------------
console.log('\n=== 8. ⚠️ LE CONSEIL D\'ADMINISTRATION ===');
// ---------------------------------------------------------------------------
// « Ça évite que le jeu devienne "j'ai 10 M€ donc je clique niveau 10". »
console.log('\n  bâtiment       | 1→2      | 4→5      | 8→9');
for (const b of ['stade', 'musculation', 'buvettes'] as const) {
  console.log(`  ${b.padEnd(14)} | ${M(coutDuPalier(b, 1) ?? 0).padStart(8)} | `
    + `${M(coutDuPalier(b, 4) ?? 0).padStart(8)} | ${coutDuPalier(b, 8) ? M(coutDuPalier(b, 8)!) : '—'}`);
}
ligne('chaque palier coûte nettement plus cher que le précédent',
  `stade 1→2 ${M(coutDuPalier('stade', 1)!)} · 8→9 ${M(coutDuPalier('stade', 8)!)}`,
  (coutDuPalier('stade', 8) ?? 0) > (coutDuPalier('stade', 1) ?? 0) * 8);

// ⚠️ Le contrôle qui compte : de l'argent ne suffit PAS.
const richeMaisAbsurde = soumettreAuConseil({
  cout: 9_000_000, retourAnnuel: 120_000, tresorerie: 12_000_000,
  resultatSaison: 800_000, confiance: 70, detteExistante: 0, totalRevenus: 9_000_000,
});
info('projet à 9 M€ qui rapporte 120 k€/an, avec 12 M€ en caisse', richeMaisAbsurde.verdict);
ligne('⚠️ « j\'ai 10 M€ donc je clique niveau 10 » est refusé',
  `${richeMaisAbsurde.verdict} — ${richeMaisAbsurde.motif}`, richeMaisAbsurde.verdict === 'refuse');

const raisonnable = soumettreAuConseil({
  cout: 900_000, retourAnnuel: 190_000, tresorerie: 1_400_000,
  resultatSaison: 400_000, confiance: 72, detteExistante: 0, totalRevenus: 9_000_000,
});
ligne('… mais un projet qui se rembourse passe',
  raisonnable.verdict, raisonnable.verdict === 'approuve');

const troRisque = soumettreAuConseil({
  cout: 2_400_000, retourAnnuel: 300_000, tresorerie: 500_000,
  resultatSaison: 150_000, confiance: 60, detteExistante: 0, totalRevenus: 9_000_000,
});
info('projet trop gros pour la caisse', `${troRisque.verdict} → contre-proposition ${M(troRisque.contreProposition ?? 0)}`);
ligne('⚠️ le conseil CONTRE-PROPOSE au lieu de dire non',
  `${troRisque.verdict}, leviers : ${troRisque.leviers.join(', ')}`,
  troRisque.verdict === 'reduire' && (troRisque.contreProposition ?? 0) < 2_400_000);

const surendette = soumettreAuConseil({
  cout: 3_000_000, retourAnnuel: 600_000, tresorerie: 3_000_000,
  resultatSaison: 200_000, confiance: 80, detteExistante: 700_000, totalRevenus: 4_000_000,
});
ligne('… et il refuse quand la dette devient dangereuse',
  `${surendette.verdict} — ${surendette.motif}`, surendette.verdict === 'refuse');

// ---------------------------------------------------------------------------
console.log('\n=== 9. ⚠️ CONSTRUIRE UN STADE, ET LE PAYER PENDANT QUINZE ANS ===');
// ---------------------------------------------------------------------------
// « Si tu descends juste après… tu peux être dans une merde financière
// monumentale. Et c'est justement intéressant dans un jeu de gestion. »
const stadeNat = stadeHistorique('SC Albi');
const projet = dossierStade('SC Albi', stadeNat, 'construire', 10_000, 2_000_000, 3);
console.log(`\n  Construire 10 000 places à Albi`);
info('coût', M(projet.cout));
info('durée', `${projet.mois} mois`);
info('financement', `fonds propres ${M(projet.financement.fondsPropres)} · banque ${M(projet.financement.banque)} `
  + `· ville ${M(projet.financement.ville)} · naming ${M(projet.financement.naming)}`);
info('annuité', `${M(projet.annuite)} pendant ${projet.saisonsDeDette} saisons`);
const boucle = projet.financement.fondsPropres + projet.financement.banque
  + projet.financement.ville + projet.financement.naming;
ligne('le plan de financement boucle',
  `${M(boucle)} pour ${M(projet.cout)}`, Math.abs(boucle - projet.cout) < 2);
ligne('la mairie participe vraiment',
  `${Math.round(100 * projet.financement.ville / projet.cout)} % du coût`,
  projet.financement.ville > projet.cout * 0.1);

// ⚠️ ET LA DETTE DOIT POUVOIR TUER. On relègue le club et on regarde.
const recettesNat = bilans['Nationale'].totalRevenus;
const recettesN2 = bilans['Nationale 2'].totalRevenus;
info('recettes en Nationale', M(recettesNat));
info('recettes après relégation en Nationale 2', M(recettesN2));
info('annuité à payer quoi qu\'il arrive', M(projet.annuite));
ligne('⚠️ une relégation après emprunt met le club en danger',
  `l'annuité passe de ${Math.round(100 * projet.annuite / recettesNat)} % à `
  + `${Math.round(100 * projet.annuite / recettesN2)} % des recettes`,
  projet.annuite / recettesN2 > projet.annuite / recettesNat * 1.5);

info('retour attendu, buvettes niveau 2', M(retourAttendu('buvettes', 2, 3_000, 12)));
info('retour attendu, centre de formation niveau 5', M(retourAttendu('formation', 5, 3_000, 12)));
ligne('un bâtiment sportif est plus dur à faire approuver qu\'une buvette',
  'le conseil regarde le retour', retourAttendu('formation', 5, 3_000, 12) < retourAttendu('buvettes', 2, 3_000, 12));

void forceEffectif;
console.log(
  echecs === 0
    ? '\n✅ Le club se finance, se remplit, s\'endette — et le conseil dit parfois non.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
