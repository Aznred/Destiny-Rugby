// Vérification SANS NAVIGATEUR du dernier lot :
//   1. le fil social se renouvelle CHAQUE SEMAINE, sans répétition ;
//   2. les compteurs des publications se tiennent (vues > likes > reposts) ;
//   3. les divisions amateurs jouent pendant la Coupe d'Europe et le Tournoi ;
//   4. le calendrier de l'année existe en entier dès le coup d'envoi ;
//   5. les poules et le tournoi de fin d'année désignent un champion ;
//   6. les montées/descentes touchent VRAIMENT toute la pyramide.

import {
  poulesDe, indexPoule, estAmateur, weekEndsJoues, totalWeekEnds,
  journeesALaSemaine, nombreJournees, affichesDeLaJournee, estJourneeDe,
} from '../src/lib/championnat';
import { tournoiDeFinDAnnee } from '../src/lib/tournoi';
import { resoudreToutesDivisions, nomDivision } from '../src/lib/promotion';
import { filDeLaSemaine } from '../src/lib/vie';
import { annuaire } from '../src/lib/comptes';
import { CALENDRIER } from '../src/data/calendrier';
import { motsCles, vignetteLocale } from '../src/lib/images';
import type { Joueur } from '../src/types';

const JOUEUR = {
  nom: 'Léo Fabre', pseudo: 'leo_fabre_31', poste: 'ailier_gauche', nation: 'France',
  club: 'Stade Toulousain', division: 'top14', saison: 1, semaine: 1, age: 22,
  reputation: 40, popularite: 50, abonnes: 4200, moral: 60, forme: 70,
  attributs: {}, titres: [], argent: 0,
} as unknown as Joueur;

console.log('=== 1. LE FIL SUIT LES SEMAINES ===');
{
  const comptes = annuaire(JOUEUR).slice(0, 80);
  const vus = new Set<string>();
  let doublons = 0;
  for (const sem of [1, 5, 12, 20, 30, 43]) {
    const posts = filDeLaSemaine({ ...JOUEUR, semaine: sem }, comptes, sem, 8);
    for (const p of posts) {
      if (vus.has(p.texte)) doublons++;
      vus.add(p.texte);
    }
    console.log(`  semaine ${String(sem).padStart(2)} (${posts[0]?.date}) : ${posts.length} posts — ex. « ${posts[0]?.texte.slice(0, 62)}… »`);
  }
  console.log(`  → ${vus.size} textes distincts sur 48 publications, ${doublons} doublon(s)`);
  // Déterminisme : deux appels donnent le même fil.
  const a = filDeLaSemaine({ ...JOUEUR, semaine: 7 }, comptes, 7, 8);
  const b = filDeLaSemaine({ ...JOUEUR, semaine: 7 }, comptes, 7, 8);
  console.log('  → déterministe ?', a.map((p) => p.texte).join() === b.map((p) => p.texte).join());
}

console.log('\n=== 2. DES COMPTEURS COHÉRENTS ===');
{
  const comptes = annuaire(JOUEUR).slice(0, 80);
  const posts = [1, 2, 3, 4, 5].flatMap((s) => filDeLaSemaine({ ...JOUEUR, semaine: s }, comptes, s, 8));
  const incoherents = posts.filter((p) => p.likes > p.vues || p.reposts > p.likes || p.vues < 10);
  console.log(`  ${posts.length} publications, ${incoherents.length} incohérence(s)`);
  for (const p of posts.slice(0, 4)) {
    console.log(`    ${p.type.padEnd(12)} ${String(p.vues).padStart(7)} vues · ${String(p.likes).padStart(5)} likes · ${String(p.reposts).padStart(4)} reposts`);
  }
}

console.log('\n=== 3. PAS DE TRÊVE EN BAS DE LA PYRAMIDE ===');
for (const id of ['top14', 'prod2', 'nationale', 'nationale2', 'fed2', 'reg2']) {
  const journees = CALENDRIER.filter((s) => estJourneeDe(id, s));
  const types = [...new Set(journees.map((s) => s.type))].join('+');
  console.log(`  ${id.padEnd(11)} amateur=${String(estAmateur(id)).padEnd(5)} ${journees.length} week-ends joués (${types})`);
}

console.log('\n=== 4. LE CALENDRIER DE L’ANNÉE EXISTE DÈS LE DÉPART ===');
{
  const total = nombreJournees('top14', 'Stade Toulousain');
  const jouees = journeesALaSemaine('top14', 1, total); // semaine 1 : rien de joué
  const j1 = affichesDeLaJournee('top14', 1, 'Stade Toulousain', 1, jouees);
  const j26 = affichesDeLaJournee('top14', 1, 'Stade Toulousain', 26, jouees);
  console.log(`  Top 14 : ${total} journées, ${jouees} jouée(s) en semaine 1`);
  console.log(`    J1  → ${j1.length} affiches, jouées : ${j1.filter((a) => a.jouee).length}`);
  console.log(`    J26 → ${j26.length} affiches, ex. ${j26[0]?.domicile} – ${j26[0]?.exterieur} (score ${j26[0]?.match ? 'connu' : 'à venir'})`);
  const finSaison = journeesALaSemaine('top14', 40, total);
  console.log(`    en semaine 40 : ${finSaison}/${total} journées disputées`);
  const totalR2 = nombreJournees('reg2', '');
  console.log(`    Régionale 2 en semaine 40 : ${journeesALaSemaine('reg2', 40, totalR2)}/${totalR2}`);
}

console.log('\n=== 5. POULES ET TOURNOI DE FIN D’ANNÉE ===');
for (const id of ['top14', 'nationale2', 'fed1', 'reg1']) {
  const p = poulesDe(id);
  const tailles = p.map((x) => x.length);
  console.log(`  ${nomDivision(id)} : ${p.length} poule(s) de ${Math.min(...tailles)}-${Math.max(...tailles)} clubs`);
}
{
  const t = tournoiDeFinDAnnee('nationale2', 1, 'Nationale 2');
  if (!t) console.log('  ✗ pas de tournoi');
  else {
    const tours = [...new Set(t.matchs.map((m) => m.tour))].join(' → ');
    console.log(`  ${t.nom} : ${t.qualifies.length} qualifiés, ${t.matchs.length} matchs (${tours})`);
    console.log(`  🏆 champion : ${t.champion} — finaliste ${t.finaliste}, ${t.relegues.length} relégables`);
  }
}

console.log('\n=== 6. TOUTE LA PYRAMIDE BOUGE ===');
{
  const debut = Date.now === undefined ? 0 : 0; // pas de mesure : on veut du déterministe
  void debut;
  const bilan = resoudreToutesDivisions(1);
  const parDivision = new Map<string, number>();
  for (const m of bilan.mouvements) parDivision.set(m.de, (parDivision.get(m.de) ?? 0) + 1);
  console.log(`  ${bilan.mouvements.length} mouvements, ${bilan.tournois.length} tournois finaux`);
  for (const [de, n] of parDivision) console.log(`    ${nomDivision(de).padEnd(14)} ${n} club(s) changent d’étage`);
  console.log('  exemples :', bilan.recits.filter((r) => r.startsWith('⬆️')).slice(0, 3).join(' '));
  // Le club du joueur ne doit pas être ancré dans une division qui n'est pas la sienne.
  console.log('  Toulouse dans la poule de reg3 ?', poulesDe('reg3').some((p) => p.includes('Stade Toulousain')));
  console.log('  index de poule de Toulouse en top14 :', indexPoule('top14', 'Stade Toulousain'));
}

console.log('\n=== 7. COMMENTAIRES ET REPOSTS ===');
{
  const { useGame } = await import('../src/store/useGame');
  useGame.getState().creerJoueur({
    nom: 'Léo Fabre', poste: 'ailier_gauche', nation: 'France',
    club: 'Stade Toulousain', division: 'top14', age: 21, traits: [],
  });
  useGame.getState().vivreSemaineSociale();
  const cible = useGame.getState().posts.find((p) => !p.moi)!;
  console.log(`  post visé : @${cible.pseudo} — « ${cible.texte.slice(0, 50)}… »`);

  const avantCommentaires = cible.reponses?.length ?? 0;
  await useGame.getState().repondreAuPost(cible.id, 'Franchement t’es nul, ferme-la.');
  const apres = useGame.getState().posts.find((p) => p.id === cible.id)!;
  const fil = apres.reponses ?? [];
  // ⚠️ Les deux DERNIÈRES réponses sont la mienne puis la riposte : le post
  // arrive maintenant avec ses propres commentaires (jusqu'à douze), on ne peut
  // plus lire les index 0 et 1.
  const mienne = fil[fil.length - 2];
  const riposte = fil[fil.length - 1];
  console.log(`  → ${fil.length} réponses (${avantCommentaires} avant la mienne)`);
  console.log(`  ma réponse : « ${mienne?.texte} » (moi : ${mienne?.moi})`);
  console.log(`  ← riposte : « ${riposte?.texte} » (hostile : ${riposte?.hostile})`);
  console.log(`  relation avec @${cible.pseudo} : ${useGame.getState().relationsSociales[cible.pseudo]}`);
  const rep = fil[0];
  console.log(`  compteurs de la réponse : ${rep.vues} vues / ${rep.likes} likes / ${rep.reposts} reposts — cohérents : ${rep.vues >= rep.likes && rep.likes >= rep.reposts}`);

  // ⚠️ REPOSTER PUIS DÉ-REPOSTER DOIT TOUT REMETTRE EN PLACE — vues comprises.
  // Bug signalé en jeu : « on peut republier / dé-republier et ça augmente les
  // vues à l'infini ». On fait donc trois allers-retours et on compare.
  const avantR = apres.reposts;
  const avantV = apres.vues;
  let pic = 0;
  for (let i = 0; i < 3; i++) {
    useGame.getState().reposter(cible.id);
    pic = Math.max(pic, useGame.getState().posts.find((p) => p.id === cible.id)!.vues);
    useGame.getState().reposter(cible.id);
  }
  const fin = useGame.getState().posts.find((p) => p.id === cible.id)!;
  const stable = fin.reposts === avantR && fin.vues === avantV;
  console.log(`  repost ×3 aller-retour : ${avantR} → pic ${pic} vues → retour ${fin.reposts} reposts / ${fin.vues} vues`);
  console.log(`  ${stable ? '✅' : '❌'} compteurs revenus à l’identique (vues ${avantV}, reposts ${avantR})`);
}

console.log('\n=== 8. IMAGES : REPLI SANS RÉSEAU ===');
console.log('  mots-clés :', motsCles('Célébration d’un essai en Coupe d’Europe'));
console.log('  vignette locale :', vignetteLocale('rugby scrum').slice(0, 64) + '…');
console.log('  week-ends top14 :', totalWeekEnds('top14'), '· fed3 :', totalWeekEnds('fed3'),
  '· joués au 20e :', weekEndsJoues('fed3', 20));
