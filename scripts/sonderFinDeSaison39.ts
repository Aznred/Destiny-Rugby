// SONDE (Correctif 39) : une carrière d'entraîneur CLASSÉE, jouée comme à l'écran, peut-elle rester bloquée ?
//
// On ne s'autorise que ce que l'interface permet : jouer l'affiche proposée, répondre au conseil, passer la semaine.
// Dès qu'une action ne change plus rien, on décrit l'état : c'est le verrou.
//
//   npx vite-node scripts/sonderFinDeSaison39.ts [saisons] [divisions séparées par des virgules] [graine]

import { COMPETITIONS } from '../src/data/clubs';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import { useGame } from '../src/store/useGame';
import { afficheDuClub } from '../src/lib/matchLive';
import { clubsAccessibles } from '../src/lib/manager';
import { graine } from '../src/lib/championnat';

const saisons = Number(process.argv[2] ?? 5);
const divisions = (process.argv[3] ?? 'reg3,reg1,fed2,nationale2,prod2,top14').split(',');
const semence = process.argv[4] ?? 'sonde';

const etat = () => useGame.getState();
const manager = () => etat().manager!;
const photo = () => {
  const m = manager();
  return `${m.club}|${m.saison}|${m.semaine}|${Object.keys(m.resultats).length}|${m.contrat?.saisons ?? '-'}|${m.decision?.id ?? ''}`;
};

for (const division of divisions) {
  const clubs = COMPETITIONS.find((c) => c.id === division)!.clubs;
  const rng = graine(`${semence}#${division}`);
  const club = clubs[Math.floor(rng() * clubs.length)].nom;
  etat().creerManager({ nom: 'Sonde', club, nation: 'France', age: 38 });
  const debut = Date.now();
  let verrou = '';
  let actions = 0;
  while (manager().saison <= saisons && !verrou && actions < 4000) {
    actions++;
    const avant = photo();
    const m = manager();
    let geste = '';
    if (!m.club) {
      const bancs = clubsAccessibles(m.prestige, m.saison, { triche: false, limite: 60 })
        .filter((c) => (m.departsCoach?.[c.club.nom] ?? 0) < m.saison && !(m.conseil?.depart?.club === c.club.nom && m.conseil.depart.saison >= m.saison));
      const offre = m.avancee?.offresBanc.find((o) => o.statut === 'offre');
      geste = 'signerBanc';
      if (offre) etat().accepterOffreBancManager(offre.id);
      else if (bancs.length) etat().signerBanc(bancs[Math.floor(rng() * bancs.length)].club.nom);
      else { verrou = 'aucun banc accessible'; break; }
    } else if ((m.contrat?.saisons ?? 0) <= 0) {
      geste = 'negocierContrat';
      if (!m.conseil?.offre) { verrou = 'contrat du coach à zéro, aucune offre du conseil'; break; }
      etat().negocierContratManager();
    } else if (m.decision) {
      geste = 'decision';
      etat().repondreDecisionManager(m.decision.id, m.decision.choix[0].id);
    } else {
      const a = afficheDuClub(m);
      if (a && !m.resultats[a.cle]) {
        geste = `match ${a.cle}`;
        const domicile = a.match.domicile === m.club;
        // Un score « de terrain » : parfois un nul, y compris en match couperet.
        const tirage = rng();
        const pour = tirage < 0.12 ? 17 : Math.round(8 + rng() * 30);
        const contre = tirage < 0.12 ? 17 : Math.round(8 + rng() * 30);
        etat().enregistrerResultatManager({
          cle: a.cle, club: m.club, saison: m.saison, semaine: m.semaine, journee: a.journee, domicile,
          adversaire: domicile ? a.match.exterieur : a.match.domicile,
          scorePour: pour, scoreContre: contre, essaisPour: Math.floor(pour / 7), essaisContre: Math.floor(contre / 7),
        });
      } else {
        geste = 'semaine';
        etat().semaineManager();
      }
    }
    if (photo() === avant) {
      const apres = manager();
      const a = apres.club ? afficheDuClub(apres) : null;
      verrou = `« ${geste} » n'a rien changé — S${apres.saison} sem. ${apres.semaine}/${SEMAINES_PAR_SAISON}, club ${apres.club || '∅'} (${apres.division}), `
        + `contrat ${apres.contrat?.saisons ?? '∅'}, offre ${apres.conseil?.offre ? 'oui' : 'non'}, décision ${apres.decision?.id ?? '∅'}, `
        + `affiche ${a ? `${a.cle} [${a.nature}/${a.tour ?? '-'}] résultat ${apres.resultats[a.cle] ? 'oui' : 'non'}` : '∅'}`;
    }
  }
  const m = manager();
  console.log(`${division.padEnd(11)} ${club.padEnd(34)} → saison ${m.saison}, sem. ${m.semaine}, ${actions} gestes, ${((Date.now() - debut) / 1000).toFixed(0)} s`
    + ` · parcours ${m.historique.map((h) => `${h.division}#${h.rang}${h.montee ? '↑' : h.descente ? '↓' : ''}`).join(' ')}`
    + (verrou ? `\n   ⛔ VERROU : ${verrou}` : ''));
}
