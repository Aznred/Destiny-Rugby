// VÉRIFICATION — LA MÉMOIRE DE LA SAUVEGARDE
//
// Demande : « l'objectif principal est de rendre une sauvegarde de 20 ou
// 30 saisons intéressante. Les personnages, clubs et événements doivent avoir
// une mémoire. Une décision prise plusieurs années auparavant doit pouvoir avoir
// des conséquences futures. »
//
// ⚠️ LE CONTRÔLE CENTRAL EST LE 1 : LE POIDS DE LA SAUVEGARDE. Le projet a déjà
// dû amputer `statsReelles` (une seule division, une seule saison) parce que le
// `localStorage` plafonne autour de 5 Mo. Une mémoire de trente saisons qui
// ferait sauter ce quota rendrait le jeu injouable à la vingtième — et le bug
// n'apparaîtrait qu'après des heures de partie, ce qui est le pire cas possible.
//
// Lancer : npx vite-node scripts/verifHistoire.ts

import { COMPETITIONS } from '../src/data/clubs';
import type { PosteId } from '../src/types';
import {
  SAISONS_DETAILLEES, SEUIL_HALL_OF_FAME, ajouterSaison, archiver, compacter,
  detaillee, elaguer, hallOfFameDe, palmaresDe, palmaresDuClub, poidsEnOctets,
  scoreDeLegende, titresDe, totaux,
} from '../src/lib/histoire';
import type { CarriereJoueur, HistoireDuMonde, SaisonArchivee, SaisonDeJoueur } from '../src/lib/histoire';
import {
  AXES_IDENTITE, EROSION_RIVALITE, VITESSE_IDENTITE, accordAvecLIdentite,
  apresLaSaison, apresLaSaisonRivalite, clePaire, effetsDeLaRivalite,
  identiteHistorique, intensiteDeDepart, libelleRivalite, traitsDominants,
} from '../src/lib/identiteClub';
import type { DecisionsDeSaison, Identite, Rivalite } from '../src/lib/identiteClub';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(56)} ${valeur}`);
}
function info(libelle: string, valeur: string): void {
  console.log(`     ${libelle.padEnd(56)} ${valeur}`);
}
const E = (n: number) => Math.round(n).toLocaleString('fr-FR');
const Ko = (o: number) => `${(o / 1024).toFixed(1)} Ko`;

// Un tirage déterministe, pour que la mesure soit reproductible.
let graineTest = 0.4242;
const alea = () => { graineTest = (graineTest * 9301 + 49297) % 233280 / 233280; return graineTest; };

const SAISONS = 30;
const FR = COMPETITIONS.filter((c) => c.pays === 'France' && c.niveau >= 1 && c.niveau <= 10);
const MONDE = COMPETITIONS.filter((c) => c.niveau >= 0 && c.clubs.length >= 6);

// ---------------------------------------------------------------------------
console.log('\n=== 1. ⚠️ TRENTE SAISONS TIENNENT-ELLES DANS LA SAUVEGARDE ? ===');
// ---------------------------------------------------------------------------
const POSTES: PosteId[] = ['pilier_gauche', 'talonneur', 'demi_melee', 'demi_ouverture', 'ailier_droit'];

let histoire: HistoireDuMonde = {};
const clubDuJoueur = 'Stade Toulousain';
const compDuJoueur = 'top14';

for (let s = 1; s <= SAISONS; s++) {
  for (const comp of MONDE) {
    const clubs = comp.clubs.map((c) => c.nom);
    const classement = clubs.slice().sort(() => alea() - 0.5);
    const archive: SaisonArchivee = {
      saison: s,
      champion: classement[0],
      finaliste: classement[1],
      classement,
      montees: classement.slice(0, 2),
      relegations: classement.slice(-2),
      meilleurMarqueur: { nom: `Marqueur ${s}`, club: classement[2], valeur: 9 + Math.floor(alea() * 8) },
      meilleurRealisateur: { nom: `Buteur ${s}`, club: classement[3], valeur: 140 + Math.floor(alea() * 90) },
      mvp: { nom: `MVP ${s}`, club: classement[0], valeur: 8 + alea() },
      meilleurJeune: { nom: `Espoir ${s}`, club: classement[4], valeur: 7 + alea() },
      xvDeLaSaison: Array.from({ length: 15 }, (_, i) => ({
        nom: `Joueur ${s}-${i}`, club: classement[i % classement.length], poste: POSTES[i % POSTES.length],
      })),
    };
    histoire = archiver(histoire, comp.id, archive, detaillee(comp.id, compDuJoueur));
  }
}
info('compétitions archivées', String(Object.keys(histoire).length));
info('saisons par compétition', String((histoire[compDuJoueur] ?? []).length));

// Les carrières : celles qui méritent d'être retenues.
const carrieres: CarriereJoueur[] = [];
const CLUBS_SUIVIS = FR.filter((c) => c.niveau <= 3).flatMap((c) => c.clubs.map((x) => x.nom));
for (let i = 0; i < 900; i++) {
  const club = CLUBS_SUIVIS[i % CLUBS_SUIVIS.length];
  const debut = 1 + Math.floor(alea() * 18);
  const duree = 3 + Math.floor(alea() * 12);
  const saisons: SaisonDeJoueur[] = [];
  for (let s = debut; s < Math.min(SAISONS, debut + duree); s++) {
    saisons.push({
      saison: s, club, niveau: 1 + Math.floor(alea() * 3),
      matchs: 14 + Math.floor(alea() * 12), titularisations: 10 + Math.floor(alea() * 10),
      minutes: 900 + Math.floor(alea() * 900), essais: Math.floor(alea() * 9),
      points: Math.floor(alea() * 60), cartons: Math.floor(alea() * 3),
      selections: alea() < 0.2 ? Math.floor(alea() * 6) : 0,
      titres: alea() < 0.12 ? ['brennus'] : [],
      recompenses: alea() < 0.05 ? ['meilleurTop14'] : [],
      capitaine: alea() < 0.1, note: Math.round((5 + alea() * 4) * 10) / 10,
    });
  }
  carrieres.push({
    id: `j${i}`, nom: `Joueur ${i}`, nation: 'France', poste: POSTES[i % POSTES.length],
    age: 22 + Math.floor(alea() * 14), saisons,
    retraiteEn: alea() < 0.5 ? debut + duree : undefined,
  });
}

const poids = poidsEnOctets(histoire, carrieres);
info('carrières conservées', String(carrieres.length));
info('poids brut', Ko(poids));
const elaguees = elaguer(carrieres, [clubDuJoueur]);
info('après élagage', `${elaguees.length} carrières · ${Ko(poidsEnOctets(histoire, elaguees))}`);

// ⚠️ LA COMPACTION EST LA SOUPAPE, et elle ne s'invente pas : sans elle, mesuré,
// neuf cents carrières pesaient 1 Mo à elles seules et la mémoire mangeait le
// tiers de la sauvegarde.
const compactees = elaguees.map((c) => compacter(c, SAISONS));
const poidsElague = poidsEnOctets(histoire, compactees);
info('après compaction', `${Ko(poidsElague)} (${SAISONS_DETAILLEES} dernières saisons détaillées)`);
// ⚠️ Le budget : la sauvegarde ENTIÈRE doit tenir sous ~5 Mo, et le reste du jeu
// (journal, posts, statsReelles, effectifs annoncés) en occupe déjà une part.
// On s'accorde 1,2 Mo pour la mémoire, ce qui laisse de la marge partout.
ligne('⚠️ trente saisons de mémoire tiennent dans la sauvegarde',
  `${Ko(poidsElague)} pour ${SAISONS} saisons et ${Object.keys(histoire).length} compétitions`,
  poidsElague < 1_200_000);
info('… soit par saison', Ko(poidsElague / SAISONS));

// ⚠️ ET ELLE NE PERD AUCUN TOTAL. C'est la condition pour avoir le droit de
// replier : les cumuls, les titres et les récompenses doivent être EXACTS au
// point près, sinon le Hall of Fame et le palmarès se mettraient à mentir.
let pertes = 0;
for (let i = 0; i < elaguees.length; i++) {
  const a = totaux(elaguees[i]);
  const b = totaux(compactees[i]);
  if (a.matchs !== b.matchs || a.essais !== b.essais || a.minutes !== b.minutes
    || a.titres !== b.titres || a.recompenses !== b.recompenses || a.selections !== b.selections
    || a.clubs.length !== b.clubs.length) pertes++;
}
ligne('⚠️ replier une carrière n\'en perd aucun total',
  `${pertes} carrière(s) altérée(s) sur ${elaguees.length}`, pertes === 0);
const replie = compactees.find((c) => c.saisons.some((s) => s.resume));
ligne('… et les lignes repliées le disent',
  replie ? `${replie.saisons.filter((s) => s.resume).length} ligne(s) marquée(s) « resume »` : 'aucune',
  !!replie && replie.saisons.some((s) => s.resume && (s.saisonsResumees ?? 0) > 1));

// ⚠️ ET L'ALLÈGEMENT DOIT MORDRE. Sans lui, le XV de la saison de trente-trois
// compétitions pendant trente ans, c'est quinze mille noms.
let complet: HistoireDuMonde = {};
for (let s = 1; s <= SAISONS; s++) {
  for (const comp of MONDE) {
    const clubs = comp.clubs.map((c) => c.nom);
    complet = archiver(complet, comp.id, {
      saison: s, champion: clubs[0], finaliste: clubs[1], classement: clubs,
      montees: clubs.slice(0, 2), relegations: clubs.slice(-2),
      xvDeLaSaison: Array.from({ length: 15 }, (_, i) => ({
        nom: `Joueur ${s}-${i}`, club: clubs[0], poste: POSTES[i % POSTES.length],
      })),
    }, true);
  }
}
const poidsComplet = poidsEnOctets(complet, []);
info('si on détaillait TOUTES les compétitions', Ko(poidsComplet));
ligne('… l\'allègement divise vraiment le poids',
  `${Ko(poidsComplet)} → ${Ko(poidsEnOctets(histoire, []))}`,
  poidsEnOctets(histoire, []) < poidsComplet * 0.6);

// ---------------------------------------------------------------------------
console.log('\n=== 2. RIEN NE S\'EFFACE ===');
// ---------------------------------------------------------------------------
const palmares = palmaresDe(histoire, compDuJoueur);
console.log('');
for (const p of palmares.slice(0, 5)) console.log(`  Top 14 · saison ${p.saison} — ${p.champion}`);
ligne('les trente saisons sont relisibles', `${palmares.length} saisons de Top 14`,
  palmares.length === SAISONS);
ligne('… et rangées de la plus récente à la plus ancienne',
  `${palmares[0].saison} → ${palmares[palmares.length - 1].saison}`,
  palmares[0].saison === SAISONS && palmares[palmares.length - 1].saison === 1);

// ⚠️ « NE JAMAIS SUPPRIMER CES DONNÉES » : rejouer une saison ne l'écrase pas.
const avant = histoire[compDuJoueur].find((s) => s.saison === 5)!.champion;
const apres = archiver(histoire, compDuJoueur, {
  saison: 5, champion: 'IMPOSTEUR', classement: [], montees: [], relegations: [],
}, true);
ligne('⚠️ ré-archiver une saison ne l\'écrase pas',
  `${avant} reste champion de la saison 5`,
  apres[compDuJoueur].find((s) => s.saison === 5)?.champion === avant);

const gagnant = palmares[0].champion;
info(`palmarès de ${gagnant}`, palmaresDuClub(histoire, gagnant)
  .slice(0, 3).map((p) => `${p.competitionId} ×${p.saisons.length}`).join(' · '));
ligne('on sait combien de fois un club a gagné',
  `${titresDe(histoire, compDuJoueur, gagnant)} titre(s)`,
  titresDe(histoire, compDuJoueur, gagnant) >= 1);

// ---------------------------------------------------------------------------
console.log('\n=== 3. LA CARRIÈRE D\'UN JOUEUR SE CUMULE ===');
// ---------------------------------------------------------------------------
let unJoueur: CarriereJoueur = {
  id: 'dupont', nom: 'Antoine Dupont', nation: 'France', poste: 'demi_melee', age: 34, saisons: [],
};
for (let s = 1; s <= 14; s++) {
  unJoueur = ajouterSaison(unJoueur, {
    saison: s, club: clubDuJoueur, niveau: 1,
    matchs: 26, titularisations: 24, minutes: 1900, essais: 10, points: 50, cartons: 1,
    selections: 8, titres: s % 4 === 0 ? ['brennus'] : [], recompenses: s === 7 ? ['meilleurJoueur'] : [],
    capitaine: s >= 5, note: 8.1,
  });
}
// ⚠️ Le club ET la sélection écrivent dans la même saison : on cumule.
unJoueur = ajouterSaison(unJoueur, {
  saison: 7, club: clubDuJoueur, niveau: 1, matchs: 0, titularisations: 0, minutes: 0,
  essais: 0, points: 0, cartons: 0, selections: 4, titres: ['sixNations'], recompenses: [],
  capitaine: true, note: 8.4,
});
const t = totaux(unJoueur);
console.log('');
info('matchs', E(t.matchs));
info('essais', E(t.essais));
info('sélections', E(t.selections));
info('titres', `${t.titres} · récompenses ${t.recompenses}`);
info('saisons capitaine', String(t.saisonsCapitaine));
ligne('une saison écrite deux fois se cumule au lieu de s\'écraser',
  `${unJoueur.saisons.filter((s) => s.saison === 7).length} entrée pour la saison 7, ${t.selections} sélections`,
  unJoueur.saisons.filter((s) => s.saison === 7).length === 1 && t.selections === 14 * 8 + 4);
ligne('… et le titre de sélection est bien retenu',
  unJoueur.saisons.find((s) => s.saison === 7)!.titres.join(', '),
  unJoueur.saisons.find((s) => s.saison === 7)!.titres.includes('sixNations'));

// La fiche reste consultable après la retraite.
const retraite: CarriereJoueur = { ...unJoueur, retraiteEn: 15, clubDeFin: clubDuJoueur };
ligne('la fiche survit à la retraite',
  `${totaux(retraite).matchs} matchs toujours lisibles`, totaux(retraite).matchs === t.matchs);

// ---------------------------------------------------------------------------
console.log('\n=== 4. ⚠️ LE HALL OF FAME RÉCOMPENSE LA MAISON, PAS LE CV ===');
// ---------------------------------------------------------------------------
// « Créer un Hall of Fame PAR CLUB. » Un international qui passe une saison
// n'est pas une légende du club — sinon le Hall of Fame ne serait qu'un
// classement mondial affiché douze fois.
const fidele = scoreDeLegende(unJoueur, clubDuJoueur)!;
const passage: CarriereJoueur = {
  id: 'star', nom: 'Star de passage', nation: 'Afrique du Sud', poste: 'centre' as PosteId, age: 30,
  saisons: [
    { saison: 9, club: 'Ailleurs', niveau: 1, matchs: 24, titularisations: 24, minutes: 1900,
      essais: 12, points: 60, cartons: 0, selections: 10, titres: ['brennus'], recompenses: ['meilleurJoueur'],
      capitaine: false, note: 8.6 },
    { saison: 10, club: clubDuJoueur, niveau: 1, matchs: 22, titularisations: 22, minutes: 1700,
      essais: 11, points: 55, cartons: 0, selections: 10, titres: [], recompenses: [],
      capitaine: false, note: 8.5 },
  ],
};
const deuxSaisons = scoreDeLegende(passage, clubDuJoueur)!;
console.log('');
info(`${unJoueur.nom} — 14 saisons au club`, `score ${fidele.score} · ${fidele.rang}`);
info(`${passage.nom} — 1 saison au club`, `score ${deuxSaisons.score} · ${deuxSaisons.rang}`);
ligne('⚠️ quatorze saisons valent plus qu\'une saison brillante',
  `${fidele.score} contre ${deuxSaisons.score}`, fidele.score > deuxSaisons.score * 2.5);
ligne('… et le fidèle est bien une légende', fidele.rang, fidele.rang === 'legende');
ligne('… quand le joueur de passage ne l\'est pas',
  deuxSaisons.rang, deuxSaisons.rang !== 'legende');

// ⚠️ UN CLUB AMATEUR DOIT POUVOIR AVOIR SES LÉGENDES. Sinon la promesse
// « partir de Régionale 3 et construire un club » perd sa moitié humaine.
let villageois: CarriereJoueur = {
  id: 'village', nom: 'Le gars du village', nation: 'France', poste: 'numero_8' as PosteId, age: 36, saisons: [],
};
for (let s = 1; s <= 16; s++) {
  villageois = ajouterSaison(villageois, {
    saison: s, club: 'Parentis', niveau: 10, matchs: 20, titularisations: 19, minutes: 1500,
    essais: 5, points: 25, cartons: 1, selections: 0,
    titres: s % 6 === 0 ? ['regionale'] : [], recompenses: [], capitaine: s >= 4, note: 7.4,
  });
}
const legendeDuVillage = scoreDeLegende(villageois, 'Parentis')!;
info('seize saisons en Régionale 3', `score ${legendeDuVillage.score} · ${legendeDuVillage.rang}`);
ligne('⚠️ un club de village a droit à ses légendes',
  legendeDuVillage.rang, legendeDuVillage.rang !== 'joueurMarquant');

const hof = hallOfFameDe([...carrieres, unJoueur, passage], clubDuJoueur);
info(`Hall of Fame du ${clubDuJoueur}`, `${hof.length} fiches, seuil ${SEUIL_HALL_OF_FAME}`);
ligne('le Hall of Fame est trié par score',
  hof.length >= 2 ? `${hof[0].score} ≥ ${hof[1].score}` : 'trop peu de fiches',
  hof.length < 2 || hof[0].score >= hof[1].score);

// ---------------------------------------------------------------------------
console.log('\n=== 5. ⚠️ L\'IDENTITÉ MET DES ANNÉES À CHANGER ===');
// ---------------------------------------------------------------------------
const idDepart = identiteHistorique(clubDuJoueur);
console.log('');
console.log('  ' + AXES_IDENTITE.map((a) => `${a} ${Math.round(idDepart[a])}`).join(' · '));
info('traits dominants', traitsDominants(idDepart).join(', '));

// ⚠️ Les axes opposés ne peuvent pas être hauts ensemble.
let contradictions = 0;
for (const comp of FR) for (const c of comp.clubs.slice(0, 8)) {
  const id = identiteHistorique(c.nom);
  if (id.joueursLocaux >= 75 && id.international >= 75) contradictions++;
}
ligne('⚠️ un club ne peut pas être local ET international à fond',
  `${contradictions} contradiction(s)`, contradictions === 0);

// On tente de retourner un club : que du recrutement étranger, aucune formation.
const retournement: DecisionsDeSaison = {
  partJeunesFormes: 0, partLocaux: 0, partEtrangers: 1, grosSalaires: 6,
  essaisMarques: 4.5, essaisEncaisses: 3, cartons: 3, departs: 6,
  changementDEntraineur: false, positionRelative: 0.1, investissementFormation: 0,
};
let id: Identite = { ...idDepart };
const suivi: number[] = [Math.round(id.formation)];
let saisonsPourRetourner = 0;
for (let s = 1; s <= 20; s++) {
  const avantAxe = id.formation;
  id = apresLaSaison(id, retournement);
  if (Math.abs(id.formation - avantAxe) > VITESSE_IDENTITE + 0.01) saisonsPourRetourner = -1;
  suivi.push(Math.round(id.formation));
  if (saisonsPourRetourner === 0 && id.formation <= idDepart.formation - 25) saisonsPourRetourner = s;
}
info('formation, saison après saison', suivi.slice(0, 12).join(' → ') + ' …');
ligne('⚠️ aucun axe ne bouge de plus de 3 points en une saison',
  `vitesse maximale ${VITESSE_IDENTITE}`, saisonsPourRetourner !== -1);
ligne('⚠️ il faut des ANNÉES pour retourner un club',
  saisonsPourRetourner > 0 ? `${saisonsPourRetourner} saisons pour perdre 25 points de formation` : 'jamais atteint',
  saisonsPourRetourner >= 6);
info('après vingt saisons de recrutement étranger',
  `formation ${Math.round(id.formation)} · international ${Math.round(id.international)} · stars ${Math.round(id.stars)}`);
ligne('… mais l\'identité finit par se retourner vraiment',
  `international ${Math.round(idDepart.international)} → ${Math.round(id.international)}`,
  id.international > idDepart.international + 15);

// ⚠️ La stabilité tombe vite et remonte lentement : c'est la seule asymétrie.
const stable: Identite = { ...idDepart, stabilite: 80 };
const apresLimogeage = apresLaSaison(stable, { ...retournement, changementDEntraineur: true });
const apresCalme = apresLaSaison(apresLimogeage, { ...retournement, changementDEntraineur: false });
info('stabilité', `80 → ${Math.round(apresLimogeage.stabilite)} (limogeage) → ${Math.round(apresCalme.stabilite)}`);
ligne('changer d\'entraîneur coûte immédiatement en stabilité',
  `−${Math.round(80 - apresLimogeage.stabilite)} points`, apresLimogeage.stabilite <= 72);
ligne('… et se rattrape beaucoup plus lentement',
  `+${Math.round(apresCalme.stabilite - apresLimogeage.stabilite)} en une saison calme`,
  apresCalme.stabilite - apresLimogeage.stabilite < 80 - apresLimogeage.stabilite);

// L'identité juge un recrutement.
const clubLocal: Identite = { ...idDepart, joueursLocaux: 88, stars: 22, formation: 84 };
const bonneRecrue = accordAvecLIdentite(clubLocal, { age: 20, etranger: false, local: true, grosSalaire: false, duCentre: true });
const mauvaiseRecrue = accordAvecLIdentite(clubLocal, { age: 32, etranger: true, local: false, grosSalaire: true, duCentre: false });
info('un jeune du cru', `accord ${bonneRecrue.accord}`);
info('un étranger de 32 ans à gros salaire',
  `accord ${mauvaiseRecrue.accord} · reproches : ${mauvaiseRecrue.reproches.join(', ') || 'aucun'}`);
ligne('⚠️ l\'identité rend le recrutement lisible',
  `${bonneRecrue.accord} contre ${mauvaiseRecrue.accord}`,
  bonneRecrue.accord > mauvaiseRecrue.accord + 25 && mauvaiseRecrue.reproches.length > 0);

// ---------------------------------------------------------------------------
console.log('\n=== 6. ⚠️ LES RIVALITÉS NAISSENT ET S\'ÉTEIGNENT ===');
// ---------------------------------------------------------------------------
console.log('');
info('à 12 km, même division', String(intensiteDeDepart(12, true)));
info('à 90 km, même division', String(intensiteDeDepart(90, true)));
info('à 400 km, divisions différentes', String(intensiteDeDepart(400, false)));
ligne('la proximité crée un terrain favorable, pas une rivalité',
  `${intensiteDeDepart(12, true)} à 12 km — « ${libelleRivalite(intensiteDeDepart(12, true))} »`,
  libelleRivalite(intensiteDeDepart(12, true)) !== 'brulante');

// ⚠️ DEUX CLUBS ÉLOIGNÉS QUI SE DISPUTENT TROIS FINALES FINISSENT PAR SE DÉTESTER.
let lointaine: Rivalite = {
  clubs: clePaire('Stade Toulousain', 'Stade Rochelais'),
  intensite: intensiteDeDepart(350, true), causes: [], derniereSaison: 0,
};
const depart = lointaine.intensite;
for (const s of [1, 2, 4]) lointaine = apresLaSaisonRivalite(lointaine, ['finale', 'serieSerree'], s);
info('après trois finales', `${depart} → ${Math.round(lointaine.intensite)} — « ${libelleRivalite(lointaine.intensite)} »`);
ligne('⚠️ une rivalité peut naître loin de chez soi',
  `${depart} → ${Math.round(lointaine.intensite)}`, lointaine.intensite >= 60);

// ⚠️ ET ELLE RETOMBE QUAND IL NE SE PASSE PLUS RIEN.
let calme = { ...lointaine };
for (let s = 5; s <= 14; s++) calme = apresLaSaisonRivalite(calme, [], s);
info('dix saisons sans se croiser', `${Math.round(lointaine.intensite)} → ${Math.round(calme.intensite)}`);
ligne('⚠️ sans érosion, tout le monde finirait à 100',
  `−${Math.round(lointaine.intensite - calme.intensite)} en dix saisons (${EROSION_RIVALITE}/saison)`,
  calme.intensite < lointaine.intensite - 20);
ligne('… mais elle ne s\'efface pas d\'un coup',
  `${Math.round(calme.intensite)} après dix ans`, calme.intensite > 0);

const e = effetsDeLaRivalite(100);
info('effets à 100', `affluence ×${e.affluence.toFixed(2)} · pression ×${e.pression.toFixed(2)} · médias ×${e.interetMedia.toFixed(2)}`);
ligne('⚠️ une rivalité fait pencher un match, elle ne double pas l\'affluence',
  `×${e.affluence.toFixed(2)}`, e.affluence < 1.5);
ligne('la cause reste lisible',
  lointaine.causes.join(', '), lointaine.causes.includes('finale'));

console.log(
  echecs === 0
    ? '\n✅ Trente saisons de mémoire, dans la sauvegarde, et rien ne s\'efface.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
