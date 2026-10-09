// BANC DU MONDE FÉMININ — npx vite-node scripts/verifierMondeFeminin.ts
//
// Ce qu'il tient : chaque club d'un championnat jouable a un effectif jouable (deux joueuses par poste, trente au
// moins, aucune joueuse deux fois) ; chaque portrait et chaque écusson annoncés existent sur le disque ; les règlements
// donnent les bonnes places (quatre demi-finalistes, deux finalistes en Aupiki, une descente en Élite 1…) ; le monde
// se traduit sans perte vers les types du jeu.
import { existsSync } from 'node:fs';
import { CHAMPIONNATS_FEMININS, CLUBS_FEMININS, effectifFeminin } from '../src/data/mondeFeminin.generated';
import { championnatDuClubFeminin, championnatsJouables, competitionsFeminines, matchsParClub, pyramideFrancaise, quinzeType, statutsDuClassement } from '../src/lib/mondeFeminin';
import { POSTE_PAR_ID } from '../src/data/rugby';
import { LOGO_COMPETITION } from '../src/data/logosCompetitions';

let controles = 0, echecs = 0;
const ok = (condition: unknown, quoi: string) => { controles++; if (!condition) { echecs++; console.error('ÉCHEC :', quoi); } };
const POSTES = Object.keys(POSTE_PAR_ID);

ok(CHAMPIONNATS_FEMININS.length === 11, 'onze championnats déclarés (l’All-Ireland League en deux divisions)');
const jouables = championnatsJouables();
ok(jouables.length === 11, `les onze championnats sont jouables (${jouables.length})`);
ok(new Set(CHAMPIONNATS_FEMININS.map(c => c.id)).size === CHAMPIONNATS_FEMININS.length, 'identifiants uniques');
ok(pyramideFrancaise().map(c => c.id).join() === 'f-elite1,f-elite2', 'pyramide française : Élite 1 puis Élite 2');
ok(pyramideFrancaise().every(c => c.clubs.length === 10), 'deux divisions françaises de dix clubs');
ok(championnatDuClubFeminin('Stade Villeneuvois Lille Métropole')?.id === 'f-elite2', 'Lille en Élite 2, saison 2026-2027');
ok(championnatDuClubFeminin('Racing 92')?.clubs.find(c => c.nom === 'Racing 92')?.logo === '/logos/racing_92.png', 'Racing : même écusson que les hommes');
for (const c of CHAMPIONNATS_FEMININS) ok(LOGO_COMPETITION[c.id] && existsSync('public' + LOGO_COMPETITION[c.id]), `${c.nom} : logo officiel pour les listes et les matchs`);

const tousLesClubs = jouables.flatMap(c => c.clubs.map(k => k.nom));
ok(new Set(tousLesClubs).size === tousLesClubs.length, 'un club ne joue que dans un championnat');
ok(tousLesClubs.every(c => CLUBS_FEMININS.includes(c)), 'chaque club a un effectif');

let reelles = 0, generees = 0;
for (const championnat of jouables) {
  ok(championnat.clubs.length >= 4, `${championnat.nom} : quatre clubs au moins`);
  for (const club of championnat.clubs) {
    const effectif = effectifFeminin(club.nom)!;
    ok(effectif.length >= 30 && effectif.length <= 46, `${club.nom} : de 30 à 46 joueuses (${effectif.length})`);
    ok(POSTES.every(p => effectif.filter(j => j.poste === p).length >= 2), `${club.nom} : deux joueuses par poste`);
    ok(new Set(effectif.map(j => j.nom)).size === effectif.length, `${club.nom} : aucune joueuse en double`);
    ok(effectif.every(j => j.note >= 40 && j.note <= 95 && j.potentiel >= j.note && j.potentiel <= 97 && j.age >= 16 && j.age <= 45), `${club.nom} : notes, potentiels et âges plausibles`);
    ok(effectif.every(j => !j.photo || existsSync('public' + j.photo)), `${club.nom} : chaque portrait annoncé existe`);
    ok(effectif.every(j => !j.generee || !j.photo), `${club.nom} : une joueuse générée n'emprunte le portrait de personne`);
    ok(club.logo && existsSync('public' + club.logo), `${club.nom} : écusson présent`);
    ok(/^#[0-9a-f]{6}$|^hsl\(/.test(club.c1) && club.c1 !== club.c2, `${club.nom} : deux couleurs distinctes`);
    ok(effectif.filter(j => !j.generee).length === club.reelles, `${club.nom} : compte des joueuses réelles exact`);
    ok(quinzeType(club.nom).length === 15, `${club.nom} : un XV type complet`);
    ok(championnatDuClubFeminin(club.nom)?.id === championnat.id, `${club.nom} : retrouvé dans son championnat`);
    reelles += club.reelles; generees += effectif.length - club.reelles;
  }
}

// Les règlements.
// Vérifier les classements avec les clubs effectivement chargés par le jeu.
const places = (id: string) => { const c = CHAMPIONNATS_FEMININS.find(x => x.id === id)!; return { s: statutsDuClassement(c), c }; };
const compte = (s: string[], statut: string) => s.filter(x => x === statut).length;
for (const id of ['f-pwr', 'f-elite1', 'f-superw', 'f-celtic', 'f-seriea', 'f-elite2']) {
  const { s } = places(id);
  ok(compte(s, 'QUALIFIED') + compte(s, 'PROMOTION') >= 4 || s.slice(0, 4).every(x => x !== 'SAFE' && x !== 'DIRECT_RELEGATION'), `${id} : quatre places de phase finale`);
}
ok(places('f-aupiki').s.slice(0, 2).every(x => x !== 'SAFE') && places('f-aupiki').s.slice(2).every(x => x === 'SAFE'), 'Aupiki : les deux premières en finale, pas de descente');
ok(places('f-elite1').s.at(-1) === 'DIRECT_RELEGATION' && compte(places('f-elite1').s, 'DIRECT_RELEGATION') === 1, 'Élite 1 : la dernière descend, elle seule');
ok(places('f-elite2').s.at(-1) === 'DIRECT_RELEGATION', 'Élite 2 : la dernière descend');
ok(compte(places('f-pwr').s, 'DIRECT_RELEGATION') === 0 && compte(places('f-superw').s, 'DIRECT_RELEGATION') === 0 && compte(places('f-celtic').s, 'DIRECT_RELEGATION') === 0, 'PWR, Super Rugby Women’s, Celtic Challenge : aucune descente');
ok(matchsParClub(places('f-pwr').c) === 16 && matchsParClub(places('f-aupiki').c) === 6 && matchsParClub(places('f-superw').c) === 4 && matchsParClub(places('f-celtic').c) === 10 && matchsParClub(places('f-fpc').c) === 11 && matchsParClub(places('f-ail').c) === 10, 'matchs par club : PWR 16, Aupiki 6, Super Rugby Women’s 4, Celtic 10, Farah Palmer Cup 11, All-Ireland League 10');

// La traduction vers les types du jeu.
const competitions = competitionsFeminines();
ok(competitions.length === jouables.length && competitions.every(c => c.clubs.length >= 4 && c.drapeaux.length === 1), 'compétitions traduites');
ok(competitions.filter(c => c.zone === 'France').map(c => c.niveau).join() === '1,2', 'France : niveaux 1 et 2');
ok(competitions.every(c => c.clubs.every(k => k.nom && k.c1 && k.c2)), 'chaque club traduit garde son nom et ses couleurs');

console.log(`${jouables.length} championnats jouables, ${tousLesClubs.length} clubs, ${reelles} joueuses réelles, ${generees} générées`);
console.log(`${controles - echecs}/${controles} contrôles`);
if (echecs) process.exitCode = 1;
