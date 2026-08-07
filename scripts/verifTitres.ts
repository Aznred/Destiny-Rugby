// VÉRIFICATION — LES TITRES VIENNENT DES COMPÉTITIONS RÉELLEMENT JOUÉES
//
// ⚠️ CE SCRIPT EXISTE À CAUSE D'UN BUG PRÉCIS, SIGNALÉ EN JEU : « j'ai fait le
// Grand Chelem avec l'équipe de France et je n'ai pas eu les 6 Nations, et
// pareil pas eu la Champions Cup alors qu'on a gagné ».
//
// La cause tenait en deux lignes de `resoudreTrophees` (store) :
//
//     if (selectionne6N && tire((perso - 78) / 220)) trophees.push('sixNations');
//     if (enChampionsCup && tire((9 - rang) / 48)) trophees.push('champions');
//
// Le Tournoi et la coupe d'Europe étaient JOUÉS pour de vrai — journée par
// journée, avec leur classement et leur tableau final affichés à l'écran toute
// la saison — mais le TITRE, lui, était tiré au sort à partir de la note du
// joueur et du rang de son club. Deux vérités parallèles qui ne se parlaient
// pas : on pouvait gagner les cinq matchs du Tournoi et repartir les mains
// vides, ou finir troisième et soulever le trophée.
//
// Ce que ce script contrôle, et qu'aucun autre ne couvrait :
//   1. il n'y a PLUS AUCUN TIRAGE AU SORT dans l'attribution d'un titre ;
//   2. le vainqueur d'une compétition de sélections est bien celui du classement
//      que le joueur a sous les yeux (même appel, `apport: null`) ;
//   3. le vainqueur d'une coupe d'Europe est bien celui de la finale ;
//   4. en jeu, sur des carrières réellement jouées, un titre n'apparaît au
//      palmarès QUE si son club (ou sa sélection) a vraiment gagné ;
//   5. et l'inverse : un club qui gagne la coupe et dont on est le joueur ne
//      peut pas être oublié.
//
// Lancer : npx vite-node scripts/verifTitres.ts

import { jouerUneSaison } from './_saison';
import { COMPETITIONS_U20, competitionsDeLaSaison, internationalEnDirect } from '../src/lib/international';
import { coupeEnDirect, coupesDuClub } from '../src/lib/coupe';
import { TROPHEE_PAR_COUPE, TROPHEE_PAR_INTERNATIONAL, TROPHEES } from '../src/data/trophees';
import { CALENDRIER } from '../src/data/calendrier';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(54)} ${valeur}`);
}

const WEEKENDS_COUPE = CALENDRIER.filter((s) => s.type === 'coupe').length;
const SAISONS = [1, 2, 3, 4, 5, 6, 7, 8];

console.log('\n=== 1. LES TROPHÉES DÉCLARÉS EXISTENT ===');
{
  for (const [comp, trophee] of Object.entries(TROPHEE_PAR_INTERNATIONAL)) {
    ligne(`« ${comp} » → trophée « ${trophee} »`, TROPHEES[trophee]?.nom ?? 'INCONNU', !!TROPHEES[trophee]);
  }
  // La compétition doit exister quelque part dans la saison, sinon la table
  // désigne un titre qu'on ne pourra jamais gagner.
  for (const comp of Object.keys(TROPHEE_PAR_INTERNATIONAL)) {
    const connue = SAISONS.some((s) => competitionsDeLaSaison(s).some((c) => c.id === comp));
    ligne(`… et la compétition « ${comp} » se joue`, connue ? 'oui' : 'JAMAIS', connue);
  }
}

console.log('\n=== 2. LE TOURNOI A UN VAINQUEUR, ET C\'EST CELUI DU CLASSEMENT ===');
{
  // ⚠️ MÊME APPEL QUE L'ÉCRAN RÉSULTATS (`apport: null`). C'est LA condition
  // pour que le trophée corresponde au classement que le joueur a vu.
  for (const s of SAISONS.slice(0, 5)) {
    const comp = competitionsDeLaSaison(s).find((c) => c.id === 'sixNations')!;
    const etat = internationalEnDirect('sixNations', s, comp.journees, null)!;
    const premier = etat.classement[0];
    const invaincu = etat.journees.flat().filter((m) =>
      (m.domicile === premier.club && m.scoreD > m.scoreE)
      || (m.exterieur === premier.club && m.scoreE > m.scoreD)).length;
    ligne(
      `S${s} — 6 Nations remporté`,
      `${premier.club} (${premier.points} pts, ${invaincu}/5 victoires)`,
      !!premier.club && etat.journeesJouees === comp.journees,
    );
    // Le premier au classement doit avoir au moins autant de points que tous
    // les autres : sinon, `classer()` et nous ne lisons pas la même chose.
    ligne(
      `S${s} — … et personne n'a fait mieux`,
      `2ᵉ : ${etat.classement[1].club} ${etat.classement[1].points} pts`,
      premier.points >= etat.classement[1].points,
    );
  }
}

console.log('\n=== 3. LE MÊME CLASSEMENT DEUX FOIS DE SUITE ===');
{
  // Déterminisme : c'est ce qui garantit que le titre décerné en fin de saison
  // est celui de la compétition suivie pendant la saison.
  let stable = true;
  for (const s of SAISONS) {
    for (const id of ['sixNations', 'recEurope']) {
      const comp = competitionsDeLaSaison(s).find((c) => c.id === id);
      if (!comp) continue;
      const a = internationalEnDirect(id, s, comp.journees, null)!.classement[0].club;
      const b = internationalEnDirect(id, s, comp.journees, null)!.classement[0].club;
      if (a !== b) stable = false;
    }
  }
  ligne('rejouer une compétition redonne le même vainqueur', `${SAISONS.length} saisons × 2 compétitions`, stable);
}

console.log('\n=== 4. LES COUPES D\'EUROPE ONT UN VAINQUEUR ===');
{
  for (const s of SAISONS.slice(0, 4)) {
    for (const coupeId of ['championsCup', 'challengeCup']) {
      const etat = coupeEnDirect(coupeId, s, '', WEEKENDS_COUPE);
      const finale = etat?.bracket[etat.bracket.length - 1];
      ligne(
        `S${s} — ${etat?.nom ?? coupeId}`,
        etat?.vainqueur ? `${etat.vainqueur} (${finale?.resume ?? ''})` : 'AUCUN VAINQUEUR',
        !!etat?.vainqueur && etat.vainqueur === finale?.vainqueur,
      );
    }
  }
  ligne(
    'le calendrier réserve assez de week-ends européens',
    `${WEEKENDS_COUPE} dates`,
    WEEKENDS_COUPE >= (coupeEnDirect('championsCup', 1, '', 99)?.totalJournees ?? 99),
  );
}

console.log('\n=== 5. EN JEU : AUCUN TITRE FANTÔME, AUCUN TITRE OUBLIÉ ===');
{
  // ⚠️ LE SEUL TEST QUI PROUVE QUELQUE CHOSE. On fait tourner le vrai store, et
  // pour chaque titre du palmarès on redemande à la compétition qui l'a gagnée.
  // Un écart, et c'est le bug d'origine qui revient.
  const { useGame } = await import('../src/store/useGame');
  const g = () => useGame.getState();

  let titresCollectifs = 0;
  let fantomes = 0;
  let oublis = 0;
  const detail: string[] = [];

  for (let n = 0; n < 8; n++) {
    g().reinitialiser();
    // Un club de Top 14 engagé en Champions Cup, un joueur français : c'est le
    // cas rapporté en jeu, donc celui qu'il faut couvrir.
    g().creerJoueur({
      nom: `Titre${n}`, poste: 'demi_ouverture', nation: 'France',
      club: 'Stade Toulousain', division: 'top14', age: 20,
    });
    // On dope le joueur : ce qu'on teste ici, c'est la CORRESPONDANCE entre le
    // palmarès et les compétitions, pas la difficulté de progression.
    const j = g().joueur!;
    useGame.setState({
      joueur: {
        ...j,
        attributs: Object.fromEntries(Object.keys(j.attributs).map((k) => [k, 92])) as typeof j.attributs,
        reputation: 95, potentiel: 96,
      },
    });

    for (let s = 0; s < 6; s++) {
      const saisonJouee = g().joueur?.saison ?? 0;
      const club = g().joueur!.club;
      jouerUneSaison(g, (p) => useGame.setState(p));

      const gagnesCetteSaison = (g().joueur?.palmares ?? [])
        .filter((t) => t.saison === saisonJouee)
        .map((t) => t.trophee);

      // --- Les coupes d'Europe : titre au palmarès ⇔ finale gagnée ---
      for (const coupeId of coupesDuClub(club)) {
        const trophee = TROPHEE_PAR_COUPE[coupeId];
        if (!trophee) continue;
        const vainqueur = coupeEnDirect(coupeId, saisonJouee, club, WEEKENDS_COUPE)?.vainqueur;
        const auPalmares = gagnesCetteSaison.includes(trophee);
        if (auPalmares) titresCollectifs++;
        if (auPalmares && vainqueur !== club) {
          fantomes++;
          detail.push(`S${saisonJouee} ${trophee} au palmarès mais ${vainqueur} a gagné`);
        }
        if (!auPalmares && vainqueur === club) {
          oublis++;
          detail.push(`S${saisonJouee} ${club} gagne ${coupeId} — rien au palmarès`);
        }
      }

      // --- Le Tournoi : titre au palmarès ⇒ la France a vraiment gagné ---
      const tournoi = competitionsDeLaSaison(saisonJouee).find(
        (c) => c.fenetre === 'tournoi' && !COMPETITIONS_U20.has(c.id) && c.equipes.includes('France'),
      );
      if (tournoi) {
        const trophee = TROPHEE_PAR_INTERNATIONAL[tournoi.id];
        const vainqueur = internationalEnDirect(tournoi.id, saisonJouee, tournoi.journees, null)
          ?.classement[0]?.club;
        if (trophee && gagnesCetteSaison.includes(trophee)) {
          titresCollectifs++;
          if (vainqueur !== 'France') {
            fantomes++;
            detail.push(`S${saisonJouee} ${trophee} au palmarès mais ${vainqueur} a gagné le Tournoi`);
          }
        }
      }
    }
  }

  console.log(`     8 carrières × 6 saisons au Stade Toulousain — ${titresCollectifs} titre(s) collectif(s) décerné(s)`);
  for (const d of detail.slice(0, 10)) console.log(`       · ${d}`);
  ligne('aucun titre fantôme (gagné sans avoir gagné)', `${fantomes} cas`, fantomes === 0);
  ligne('aucun titre oublié (gagné et pas décerné)', `${oublis} cas`, oublis === 0);
  ligne('des titres tombent quand même', `${titresCollectifs} sur 48 saisons`, titresCollectifs > 0);
}

console.log(
  echecs === 0
    ? '\n✅ Les titres suivent les compétitions réellement jouées.\n'
    : `\n❌ ${echecs} contrôle(s) en échec.\n`,
);
process.exit(echecs === 0 ? 0 : 1);
