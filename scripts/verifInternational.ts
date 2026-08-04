// Vérifie que les compétitions de sélections sont JOUÉES et cohérentes.
import {
  internationalEnDirect, affichesInternationales, fenetreInternationale,
  matchInternationalDuJoueur, effectifNational, competitionsDeLaSaison,
  journeesInternationalesA,
} from '../src/lib/international';
import { CALENDRIER } from '../src/data/calendrier';
import { simulerJourneeInternationale, simulerJourneeCoupe } from '../src/lib/moteur/saison';
import type { Joueur } from '../src/types';

console.log('=== 1. LES COMPÉTITIONS SE JOUENT ===');
for (const c of competitionsDeLaSaison(1)) {
  const e = internationalEnDirect(c.id, 1, 99);
  if (!e) { console.log(`  ❌ ${c.id} introuvable`); continue; }
  const matchs = e.journees.flat().length;
  const tete = e.classement[0];
  console.log(`  ${c.emoji} ${c.nom.padEnd(26)} ${e.equipes.length} équipes · ${e.totalJournees} journées · ${matchs} matchs`);
  console.log(`     vainqueur : ${tete.club} (${tete.points} pts, ${tete.gagnes}V ${tete.perdus}D, diff ${tete.difference > 0 ? '+' : ''}${tete.difference})`);
  const impossibles = e.journees.flat().filter((m) => [1, 2, 4].includes(m.scoreD) || [1, 2, 4].includes(m.scoreE)).length;
  console.log(`     scores impossibles au rugby : ${impossibles} ${impossibles === 0 ? '✅' : '❌'}`);
}

console.log('\n=== 2. LA FENÊTRE SUIT LE CALENDRIER ===');
for (const s of CALENDRIER.filter((x) => x.type === 'international')) {
  const f = fenetreInternationale(s.numero, 1);
  console.log(`  sem ${String(s.numero).padStart(2)} ${s.libelle.padEnd(34)} → ${f ? `${f.competition.nom} J${f.journee}` : '—'}`);
}

console.log('\n=== 3. LE MATCH DU JOUEUR ===');
const base = { nom: 'Léo Fabre', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain', division: 'top14', saison: 1 } as unknown as Joueur;
for (const sem of CALENDRIER.filter((x) => x.type === 'international').map((x) => x.numero)) {
  const a = matchInternationalDuJoueur({ ...base, semaine: sem });
  console.log(`  sem ${String(sem).padStart(2)} → ${a ? `${a.competition.nom} J${a.journee} : ${a.match.domicile} ${a.match.scoreD}-${a.match.scoreE} ${a.match.exterieur}` : 'pas de match'}`);
}
const italien = matchInternationalDuJoueur({ ...base, nation: 'Italie', semaine: 22 });
console.log(`  un Italien semaine 22 → ${italien ? italien.match.domicile + ' – ' + italien.match.exterieur : 'pas de match'}`);
const belge = matchInternationalDuJoueur({ ...base, nation: 'Belgique', semaine: 22 });
console.log(`  un Belge semaine 22 → ${belge ? 'match' : 'pas de match (nation hors tournoi) ✅'}`);

console.log('\n=== 4. LES EFFECTIFS DE SÉLECTION ===');
for (const n of ['France', 'Irlande', 'Italie', 'Nouvelle-Zélande']) {
  const g = effectifNational(n, 1);
  const moy = g.slice(0, 23).reduce((s, c) => s + c.note, 0) / Math.min(23, g.length);
  console.log(`  ${n.padEnd(18)} ${g.length} joueurs · 23 meilleurs à ${moy.toFixed(1)} de moyenne`);
  console.log(`     ex. ${g.slice(0, 3).map((c) => `${c.nom} (${c.poste}, ${c.note})`).join(' · ')}`);
}

console.log('\n=== 5. AFFICHES ET PROGRESSION ===');
{
  const j3 = affichesInternationales('sixNations', 1, 1, 1);
  console.log(`  6 Nations J1 : ${j3.map((a) => `${a.domicile} ${a.match?.scoreD}-${a.match?.scoreE} ${a.exterieur}`).join(' · ')}`);
  const aVenir = affichesInternationales('sixNations', 1, 5, 1);
  console.log(`  J5 non jouée : ${aVenir.every((a) => !a.jouee) ? '✅ affiches connues, scores en attente' : '❌'}`);
  for (const sem of [22, 23, 25, 27, 28]) {
    console.log(`  journées disputées au calendrier sem ${sem} : ${journeesInternationalesA('sixNations', sem, 1)}`);
  }
}

console.log('\n=== 6. STATISTIQUES DE FOND : COUPES ET SÉLECTIONS ===');
{
  const t0 = Date.now();
  const inter = simulerJourneeInternationale('sixNations', 1, 1, undefined);
  const ms1 = Date.now() - t0;
  const clubs = [...new Set(inter.map((l) => l.club))];
  const meilleur = [...inter].sort((a, b) => b.plaquages - a.plaquages)[0];
  console.log(`  6 Nations J1 : ${inter.length} lignes · ${clubs.length} sélections · ${ms1} ms`);
  console.log(`     ${clubs.join(' · ')}`);
  console.log(`     top plaqueur : ${meilleur.nom} (${meilleur.club}) — ${meilleur.plaquages} plaquages, ${meilleur.minutes}′`);
  const essais = inter.reduce((s, l) => s + l.essais, 0);
  console.log(`     essais cumulés : ${essais}`);

  const t1 = Date.now();
  const coupe = simulerJourneeCoupe('championsCup', 1, 1, 'Stade Toulousain', undefined);
  const ms2 = Date.now() - t1;
  const clubsC = [...new Set(coupe.map((l) => l.club))];
  console.log(`  Champions Cup J1 : ${coupe.length} lignes · ${clubsC.length} clubs · ${ms2} ms`);
  console.log(`     ${clubsC.slice(0, 6).join(' · ')}…`);
}
