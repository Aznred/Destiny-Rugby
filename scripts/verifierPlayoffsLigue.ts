// LA PHASE FINALE D'UNE LIGUE EN LIGNE — Correctif 33.
//
// Ce que ce banc tient :
//   - le nombre de qualifiés suit la taille du championnat : 4 → 2, 6 → 4, 8 → 4, 10 → 6, 16 et plus → 8 ;
//   - UNE définition pour le serveur, le tableau de l'écran et les zones du classement ;
//   - à six qualifiés, les deux premiers sont exemptés du premier tour (barrages 3-6 et 4-5) ;
//   - les grosses ligues (16, 20 clubs) vont jusqu'à leur champion, sans affiche fantôme ni tour oublié ;
//   - le classement régulier ne bouge pas pendant la phase finale, et c'est lui qui paie ;
//   - une phase finale ouverte par l'ancienne règle (toute la ligue qualifiée) se termine avec son tableau.
//
// Les résultats sont inscrits à la main : ce banc mesure la GÉNÉRATION des tours, pas le moteur de match.
//
// Lancer : npm run verify:playoffs-ligue
import { agirCarriere, avancerCarriere, classementCarriere, creerCarriere, vueCarriere } from '../src/lib/ligue/carriere';
import type { EtatCarriereEnLigne, RencontreCarriere } from '../src/lib/ligue/typesCarriere';
import { nombreQualifiesPlayoffs, prochainTourPlayoffs, toursPlayoffs } from '../src/lib/ligue/poulesCarriere';
import { onlineRules, qualifiesPlayoffsEnLigne, standingsStatuses, tableauPlayoffs } from '../src/lib/competitionRules';
import { graine } from '../src/lib/ligue/aleatoire';

let controles = 0, echecs = 0;
function dire(ok: boolean, quoi: string, detail = '') {
  controles++;
  if (!ok) echecs++;
  console.log(`  ${ok ? '✓' : '✗ ÉCHEC'} ${quoi}${detail ? ` — ${detail}` : ''}`);
}
const titre = (t: string) => console.log(`\n${t}`);

// ── 1. La règle ─────────────────────────────────────────────────────────────
titre('1. Le nombre de qualifiés');
for (const [clubs, attendu] of [[2, 2], [3, 2], [4, 2], [5, 2], [6, 4], [7, 4], [8, 4], [9, 4], [10, 6], [12, 6], [14, 6], [15, 6], [16, 8], [20, 8], [32, 8], [64, 8]] as const) {
  dire(nombreQualifiesPlayoffs(clubs) === attendu && qualifiesPlayoffsEnLigne(clubs) === attendu, `${clubs} clubs → ${attendu} qualifiés`, `${nombreQualifiesPlayoffs(clubs)}`);
}
dire(nombreQualifiesPlayoffs(1) === 0 && nombreQualifiesPlayoffs(Number.NaN) === 0, 'un club seul, ou une taille invalide : pas de phase finale');
for (const [n, tours, exemptes] of [[2, [1], 0], [4, [2, 1], 0], [6, [2, 2, 1], 2], [8, [4, 2, 1], 0], [16, [8, 4, 2, 1], 0], [3, [1, 1], 1], [5, [1, 2, 1], 3]] as const) {
  const t = tableauPlayoffs(n);
  dire(t.tours.join(',') === tours.join(',') && t.exemptes === exemptes && toursPlayoffs(n).join(',') === tours.join(','),
    `${n} qualifiés : tours ${tours.join(' · ')}, ${exemptes} exempté(s)`, `${t.tours.join(',')} / ${t.exemptes}`);
}

// ── 2. Le tableau, rejoué à la main ─────────────────────────────────────────
titre('2. Le tableau, tour par tour');
for (const n of [2, 3, 4, 5, 6, 7, 8, 16, 32]) {
  const qualifies = Array.from({ length: n }, (_, i) => `c${i + 1}`);
  const rng = graine(`tableau#${n}`);
  const elimines = new Set<string>();
  const tours: number[] = [];
  const joues = new Map<string, number>();
  let champion: string | undefined;
  let sain = true;
  for (let garde = 0; garde < 12; garde++) {
    const tour = prochainTourPlayoffs(qualifies, elimines);
    if (!tour.paires.length) { champion = tour.champion; break; }
    tours.push(tour.paires.length);
    const vus = new Set<string>();
    for (const p of tour.paires) {
      if (vus.has(p.domicile) || vus.has(p.exterieur) || elimines.has(p.domicile) || elimines.has(p.exterieur)) sain = false;
      if (qualifies.indexOf(p.domicile) > qualifies.indexOf(p.exterieur)) sain = false; // le mieux classé reçoit
      vus.add(p.domicile); vus.add(p.exterieur);
      joues.set(p.domicile, (joues.get(p.domicile) ?? 0) + 1); joues.set(p.exterieur, (joues.get(p.exterieur) ?? 0) + 1);
      elimines.add(rng() < 0.5 ? p.domicile : p.exterieur);
    }
  }
  dire(sain && tours.join(',') === toursPlayoffs(n).join(',') && !!champion && elimines.size === n - 1 && !elimines.has(champion!),
    `${n} qualifiés : ${tours.join(' · ')} matchs, un seul champion`, `champion ${champion}`);
}
{
  const six = ['a', 'b', 'c', 'd', 'e', 'f'];
  const t1 = prochainTourPlayoffs(six, new Set());
  dire(t1.paires.map(p => `${p.domicile}${p.exterieur}`).join(' ') === 'cf de', 'six qualifiés : barrages 3ᵉ-6ᵉ et 4ᵉ-5ᵉ, les deux premiers exemptés', t1.paires.map(p => `${p.domicile}-${p.exterieur}`).join(' '));
  const t2 = prochainTourPlayoffs(six, new Set(['c', 'd']));
  dire(t2.paires.map(p => `${p.domicile}${p.exterieur}`).join(' ') === 'af be', 'demi-finales : le 1ᵉʳ reçoit le moins bien classé des vainqueurs', t2.paires.map(p => `${p.domicile}-${p.exterieur}`).join(' '));
  const t3 = prochainTourPlayoffs(six, new Set(['c', 'd', 'a', 'e']));
  dire(t3.paires.length === 1 && t3.paires[0].domicile === 'b' && t3.paires[0].exterieur === 'f', 'finale : les deux derniers en lice, le mieux classé reçoit');
  dire(prochainTourPlayoffs(six, new Set(['c', 'd', 'a', 'e', 'b'])).champion === 'f', 'puis le champion est le dernier en lice');
}

// ── 3. Les zones du classement ──────────────────────────────────────────────
titre('3. Les zones du classement suivent la même règle');
for (const [n, directs, barrages] of [[4, 0, 2], [6, 0, 4], [8, 0, 4], [10, 2, 4], [16, 0, 8], [20, 0, 8]] as const) {
  const s = standingsStatuses(onlineRules({ playoffs: true }), n);
  const q = s.filter(x => x === 'QUALIFIED').length, p = s.filter(x => x === 'PLAYOFF').length;
  dire(q === directs && p === barrages && q + p === nombreQualifiesPlayoffs(n), `${n} clubs : ${directs} qualifié(s) direct(s), ${barrages} en phase finale`, `${q} / ${p}`);
}
dire(standingsStatuses(onlineRules({ playoffs: false }), 10).every(x => x === 'SAFE'), 'sans phase finale : aucune zone');

// ── 4. De bout en bout, dans une vraie ligue ────────────────────────────────
const T0 = Date.parse('2026-10-12T10:00:00Z');
function ligue(clubs: number, cle: string): EtatCarriereEnLigne {
  let e = creerCarriere({ id: `ligue-${cle}`, nom: `Ligue ${cle}`, code: `DR-${cle}`.toUpperCase(), compteId: `${cle}-1`, pseudo: 'Un', clubNom: `${cle} 1`,
    rythme: 7, maxClubs: 32, playoffs: true, packsGratuitsParJour: 0, doublonsAutorises: true }, T0, `graine-${cle}`);
  for (let i = 2; i <= clubs; i++) e = agirCarriere(e, `${cle}-${i}`, { type: 'rejoindre', pseudo: `P${i}`, clubNom: `${cle} ${i}` }, T0, `g-${cle}-${i}`);
  return agirCarriere(e, `${cle}-1`, { type: 'demarrerSaison' }, T0, `saison-${cle}`);
}
/** Inscrit un résultat sans jouer le match : le club de plus petit numéro gagne, sauf si `surprise` dit le contraire. */
function inscrire(e: EtatCarriereEnLigne, r: RencontreCarriere, vainqueurExterieur: boolean) {
  r.resultat = { pointsD: vainqueurExterieur ? 12 : 27, pointsE: vainqueurExterieur ? 27 : 12, essaisD: vainqueurExterieur ? 1 : 3, essaisE: vainqueurExterieur ? 3 : 1,
    joueLe: new Date(T0).toISOString(), origine: 'absence' };
}
const numero = (e: EtatCarriereEnLigne, id: string) => e.clubs.findIndex(c => c.id === id);

titre('4. Une saison entière, pour chaque taille de ligue');
for (const clubs of [4, 6, 8, 10, 16, 20]) {
  let e = ligue(clubs, `t${clubs}`);
  const c0 = e.competitions[0];
  // Phase régulière : le club inscrit le plus tôt gagne toujours — le classement est donc l'ordre d'inscription.
  for (const r of e.rencontres.filter(r => r.competitionId === c0.id)) inscrire(e, r, numero(e, r.exterieur) < numero(e, r.domicile));
  const regulier = classementCarriere(e, c0.id).map(l => l.clubId);
  const attendu = nombreQualifiesPlayoffs(clubs);
  const toursAttendus = toursPlayoffs(attendu);
  const vus: number[] = [];
  let sain = true, classementStable = true, exemptesAuRepos = true;
  const rng = graine(`saison#${clubs}`);
  for (let garde = 0; garde < 10 && e.competitions[0].etat === 'enCours'; garde++) {
    e = avancerCarriere(e, T0, `avance-${clubs}-${garde}`);
    const c = e.competitions[0];
    if (c.etat !== 'enCours') break;
    const derniere = Math.max(...e.rencontres.filter(r => r.competitionId === c.id).map(r => r.journee));
    const tour = e.rencontres.filter(r => r.competitionId === c.id && r.journee === derniere && !r.resultat);
    if (!tour.length) { sain = false; break; }
    vus.push(tour.length);
    const enLice = new Set(tour.flatMap(r => [r.domicile, r.exterieur]));
    if (enLice.size !== tour.length * 2) sain = false;
    if (vus.length === 1 && attendu === 6 && (enLice.has(regulier[0]) || enLice.has(regulier[1]))) exemptesAuRepos = false;
    if (tour.some(r => regulier.indexOf(r.domicile) > regulier.indexOf(r.exterieur))) sain = false;
    if (tour.some(r => regulier.indexOf(r.domicile) >= attendu || regulier.indexOf(r.exterieur) >= attendu)) sain = false;
    // Une surprise sur trois : le moins bien classé passe.
    for (const r of tour) inscrire(e, r, rng() < 0.34);
    if (classementCarriere(e, c.id).map(l => l.clubId).join() !== regulier.join()) classementStable = false;
  }
  const c = e.competitions[0];
  const finale = e.rencontres.filter(r => r.competitionId === c.id).sort((a, b) => b.journee - a.journee)[0];
  dire(c.qualifies === attendu, `${clubs} clubs : ${attendu} qualifiés gelés à l'ouverture de la phase finale`, `${c.qualifies}`);
  dire(sain && vus.join(',') === toursAttendus.join(','), `${clubs} clubs : tours ${toursAttendus.join(' · ')}`, vus.join(' · '));
  dire(c.etat === 'terminee' && [finale.domicile, finale.exterieur].includes(c.vainqueur!) && [finale.domicile, finale.exterieur].includes(c.finaliste!) && c.vainqueur !== c.finaliste,
    `${clubs} clubs : la finale couronne un champion et désigne son finaliste`);
  dire(classementStable && vueCarriere(e, e.clubs[0].compteId).classement.map(l => l.clubId).join() === regulier.join(),
    `${clubs} clubs : le classement régulier n'a pas bougé pendant la phase finale`);
  if (attendu === 6) dire(exemptesAuRepos, `${clubs} clubs : les deux premiers ne jouent pas les barrages`);
  // L'argent suit le classement régulier : hors champion et finaliste, la dotation décroît avec le rang.
  const gains = new Map(e.transactions.filter(t => t.nature === 'competition').map(t => [t.clubId, t.ovas]));
  const autres = regulier.filter(id => id !== c.vainqueur && id !== c.finaliste).map(id => gains.get(id) ?? -1);
  dire(gains.size === clubs && autres.every((g, i) => i === 0 || g <= autres[i - 1]), `${clubs} clubs : chacun est payé, à sa place du classement régulier`);
  dire(e.rencontres.filter(r => r.competitionId === c.id && !r.resultat).length === 0 && e.phase === 'intersaison', `${clubs} clubs : aucune affiche fantôme, la saison se clôt`);
}

// ── 5. Une phase finale ouverte par l'ancienne règle ─────────────────────────
titre('5. Une phase finale ouverte avant le correctif garde son tableau');
{
  let e = ligue(8, 'ancien');
  const c0 = e.competitions[0];
  for (const r of e.rencontres.filter(r => r.competitionId === c0.id)) inscrire(e, r, numero(e, r.exterieur) < numero(e, r.domicile));
  const regulier = classementCarriere(e, c0.id).map(l => l.clubId);
  // L'ancienne règle qualifiait les huit clubs : quatre quarts, sans `qualifies` enregistré.
  const journee = c0.journeesRegulieres! + 1;
  const ferme = new Date(T0 + 400 * 86_400_000).toISOString();
  for (let i = 0; i < 4; i++) {
    const r: RencontreCarriere = { id: `${e.id}:rencontre:${9000 + i}`, competitionId: c0.id, journee, domicile: regulier[i], exterieur: regulier[7 - i], ouvre: ferme, ferme };
    inscrire(e, r, i === 0); // le 8ᵉ sort le 1ᵉʳ
    e.rencontres.push(r);
  }
  const vus: number[] = [];
  for (let garde = 0; garde < 6 && e.competitions[0].etat === 'enCours'; garde++) {
    e = avancerCarriere(e, T0, `ancien-${garde}`);
    const c = e.competitions[0];
    if (c.etat !== 'enCours') break;
    const derniere = Math.max(...e.rencontres.filter(r => r.competitionId === c.id).map(r => r.journee));
    const tour = e.rencontres.filter(r => r.competitionId === c.id && r.journee === derniere && !r.resultat);
    vus.push(tour.length);
    for (const r of tour) inscrire(e, r, false);
  }
  const c = e.competitions[0];
  dire(c.qualifies === 8, 'le tableau à huit est relu sur son premier tour', `${c.qualifies}`);
  dire(vus.join(',') === '2,1' && c.etat === 'terminee', 'demi-finales puis finale, jusqu\'au champion', vus.join(' · '));
  dire(c.vainqueur !== regulier[0], 'le premier, éliminé en quart, n\'est pas champion');
  dire(classementCarriere(e, c.id).map(l => l.clubId).join() === regulier.join(), 'et le classement régulier reste celui de la saison');
}

console.log(`\n${controles - echecs}/${controles} contrôles${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
if (echecs) process.exit(1);
