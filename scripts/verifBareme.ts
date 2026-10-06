// Barème par compétition : un nul rapporte 2 points, les bonus s'y AJOUTENT.
import { BAREME_CLUBS, BAREME_TOURNOI, baremeDeCompetition, pointsDuMatch } from '../src/lib/bareme.js';
import { classer, type MatchChampionnat } from '../src/lib/championnat.js';

let faux = 0, total = 0;
function ok(c: boolean, m: string) { total++; if (!c) { faux++; console.log('✗', m); } }

for (const [nom, b] of [['clubs', BAREME_CLUBS], ['tournoi', BAREME_TOURNOI]] as const) {
  ok(pointsDuMatch(b, 20, 20, 2, 2).points === 2, `${nom} : 20-20 sans bonus = 2`);
  ok(pointsDuMatch(b, 20, 20, 2, 2).bonus === 0, `${nom} : pas de bonus`);
  ok(pointsDuMatch(b, 30, 30, 5, 1).points === 3 && pointsDuMatch(b, 30, 30, 5, 1).resultat === 'nul', `${nom} : nul à 5 essais = 2 + bonus 1`);
  ok(pointsDuMatch(b, 10, 17, 1, 2).points === 1, `${nom} : battu de 7 = bonus défensif`);
  ok(pointsDuMatch(b, 40, 10, 6, 1).points === 5, `${nom} : victoire 4 + bonus 1`);
  ok(pointsDuMatch(b, 5, 40, 0, 6).points === 0, `${nom} : large défaite = 0`);
}
ok(pointsDuMatch(BAREME_TOURNOI, 20, 30, 4, 4).points === 1, 'tournoi : 4 essais marqués dans une défaite = bonus offensif');
ok(pointsDuMatch(BAREME_CLUBS, 20, 30, 4, 4).bonus === 0, 'clubs : 4 essais seuls ne suffisent pas (écart de 3)');
ok(baremeDeCompetition('sixNations') === BAREME_TOURNOI && baremeDeCompetition('coupeDuMonde') === BAREME_TOURNOI, 'six nations / coupe du monde = tournoi');
ok(baremeDeCompetition('top14') === BAREME_CLUBS && baremeDeCompetition() === BAREME_CLUBS, 'clubs par défaut');

const nul: MatchChampionnat = { domicile: 'A', exterieur: 'B', scoreD: 20, scoreE: 20, essaisD: 2, essaisE: 2 };
for (const b of [BAREME_CLUBS, BAREME_TOURNOI]) {
  const t = classer(['A', 'B'], [[nul]], b);
  ok(t.every((l) => l.points === 2 && l.nuls === 1 && l.perdus === 0 && l.gagnes === 0), 'classement : nul = 2 points chacun');
}
console.log(faux ? `${faux} échec(s) sur ${total}` : `OK — ${total} contrôles`);
process.exit(faux ? 1 : 0);
