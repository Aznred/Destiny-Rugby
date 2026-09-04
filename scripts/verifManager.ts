// BANC D'ESSAI DU MODE MANAGER
//
// Le mode manager pose une question que le mode joueur ne posait pas : **est-ce
// que la carrière PROGRESSE ?** Un joueur progresse par ses attributs, qu'on
// mesure depuis longtemps (`verifDifficulte.ts`). Un entraîneur ne progresse
// que par une seule jauge, le prestige, et cette jauge n'ouvre rien d'autre que
// des clubs. Si elle monte trop vite, on entraîne le Stade Toulousain à la
// troisième saison et il n'y a plus de mode ; si elle monte trop lentement, on
// reste en Fédérale 3 pendant quinze ans et il n'y a pas de mode non plus.
//
// Cinq sections, et chacune répond à une demande explicite :
//
//  1. « on peut manager n'importe quel club AVEC DE L'EXPÉRIENCE » : l'accès est
//     gradué, et il faut vraiment de l'expérience pour le haut.
//  2. « si on crée notre carrière manager on peut commencer que dans des petits
//     clubs puis évoluer » : une carrière jouée doit changer d'étage.
//  3. « avec notre statut on peut avoir de meilleurs clubs » : la reconversion
//     ouvre plus qu'un départ à froid, sans tout ouvrir.
//  4. « un mode cheat [...] mais donc pas dans le classement mondial » : le
//     barème doit savoir ranger un entraîneur, et refuser un tricheur.
//  5. le classement à catégories, y compris la catégorie déduite et non crue.
//
//   npx vite-node scripts/verifManager.ts

import {
  CONFIANCE_LICENCIEMENT, MARGE_AMBITION, PRESTIGE_ANCIEN_JOUEUR_MAX, PRESTIGE_DEBUT,
  appliquerVerdict, clubsAccessibles, etageAccessible, meilleurClubAccessible,
  noteMaximale, objectifDuBoard, prestigeDepuisJoueur, salaireManager, verdictDeSaison,
} from '../src/lib/manager';
import {
  SCORE_MAX, categorieDeLaFiche, ficheDepuisManager, scoreDeLaFiche, verifierFiche,
} from '../src/lib/classementMondial';
import { competitionDuClub, COMPETITIONS } from '../src/data/clubs';
import { useGame } from '../src/store/useGame';
import { forceEffectif } from '../src/lib/effectif';
import { effectifDuClub } from '../src/lib/effectif';
import { ciblesDuMarche } from '../src/lib/recrutementManager';
import { SEMAINES_PAR_SAISON, horodatageJeu, CALENDRIER } from '../src/data/calendrier';
import type { LegendeSauvegardee, Manager } from '../src/types';
import { compositionManagerParDefaut, TACTIQUE_MANAGER_DEFAUT } from '../src/lib/compositionManager';
import { afficheDuClub } from '../src/lib/matchLive';
import { rangFinal } from '../src/lib/championnat';
import { competitionEffective } from '../src/lib/divisions';

let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(52)} ${valeur}`);
}
function verdict(f: unknown): { ok: boolean; motif: string } {
  const v = verifierFiche(f as never);
  return { ok: v.valide, motif: v.anomalies.join(' · ') || 'ok' };
}
function info(nom: string, valeur: string | number): void {
  console.log(`     ${nom.padEnd(52)} ${valeur}`);
}

// ---------------------------------------------------------------------------
// 1. L'ACCÈS EST GRADUÉ
// ---------------------------------------------------------------------------
console.log("=== 1. « AVEC DE L'EXPÉRIENCE » : L'ACCÈS EST GRADUÉ ===");
{
  const t0 = Date.now();
  const debut = clubsAccessibles(PRESTIGE_DEBUT, 1);
  const cout = Date.now() - t0;

  // ⚠️ CE CHIFFRE EST LE BUDGET DE L'ÉCRAN DE CRÉATION. `clubsAccessibles`
  // balaie TOUTES les compétitions et appelle `forceEffectif` sur chaque club :
  // c'est ce qui permet à une génération dorée d'ouvrir un club au-dessus de son
  // étage, et c'est aussi ce qui coûte cher. Au-delà de deux secondes et demie,
  // l'écran doit passer par un état d'attente au lieu de bloquer le rendu.
  info('coût du premier balayage (tous les clubs)', `${cout} ms`);
  ligne('le balayage tient sous 2,5 s', `${cout} ms`, cout < 2500);
  info('clubs ouverts au premier jour', String(debut.length));

  const t1 = Date.now();
  clubsAccessibles(PRESTIGE_DEBUT, 1);
  info('coût du second balayage (mémoïsé)', `${Date.now() - t1} ms`);

  const paliers = [PRESTIGE_DEBUT, 20, 40, 60, 80, 100];
  let precedent = -1;
  let monotone = true;
  for (const p of paliers) {
    const meilleur = meilleurClubAccessible(p, 1);
    const etage = etageAccessible(p);
    const n = clubsAccessibles(p, 1).length;
    if (n < precedent) monotone = false;
    precedent = n;
    info(
      `prestige ${String(p).padStart(3)}`,
      `${String(n).padStart(4)} clubs · plafond ${noteMaximale(p).toFixed(1)}`
      + ` · étage ${etage?.nom ?? '—'} · meilleur : ${meilleur?.club.nom ?? '—'}`
      + ` (${meilleur?.force.toFixed(1) ?? '—'})`,
    );
  }
  ligne('le nombre de clubs ne décroît jamais', 'monotone', monotone);

  // Le départ doit être petit, et le sommet doit tout ouvrir.
  const auDebut = meilleurClubAccessible(PRESTIGE_DEBUT, 1);
  const niveauDebut = auDebut ? (competitionDuClub(auDebut.club.nom)?.niveau ?? 0) : 0;
  ligne(
    "un débutant ne prend qu'un club amateur",
    `${auDebut?.club.nom} (niveau ${niveauDebut})`,
    niveauDebut >= 4,
  );

  const auSommet = clubsAccessibles(100, 1);
  const total = clubsAccessibles(0, 1, { triche: true }).length;
  ligne('à 100 de prestige, tout est ouvert', `${auSommet.length} / ${total}`, auSommet.length === total);

  // ⚠️ ET LE MODE LIBRE OUVRE TOUT DÈS LE PREMIER JOUR : c'est sa définition.
  const libre = clubsAccessibles(PRESTIGE_DEBUT, 1, { triche: true });
  ligne('le mode libre ouvre tout, prestige 6', `${libre.length} clubs`, libre.length === total);

  // La marge d'ambition existe, et elle reste étroite.
  const ambitieux = clubsAccessibles(40, 1).filter((c) => c.ambitieux);
  ligne(
    "la marge d'ambition n'ouvre qu'une poignée de clubs",
    `${ambitieux.length} clubs au-dessus du plafond (marge ${MARGE_AMBITION})`,
    ambitieux.length > 0 && ambitieux.length < 150,
  );
}

// ---------------------------------------------------------------------------
// 2. UNE CARRIÈRE D'ENTRAÎNEUR, JOUÉE
// ---------------------------------------------------------------------------
console.log('\n=== 2. « COMMENCER PETIT PUIS ÉVOLUER » : 15 SAISONS ===');
{
  // ⚠️ ON NE REJOUE PAS LE CHAMPIONNAT ICI, ET C'EST VOLONTAIRE. Rejouer quinze
  // saisons de dix étages coûterait des minutes, et ce n'est pas ce qu'on
  // mesure : ce qu'on veut savoir, c'est si la BOUCLE DE PRESTIGE tient — un
  // entraîneur qui tient ses objectifs change d'étage, un entraîneur qui échoue
  // se fait remercier. Le rang réel est donc posé autour de l'objectif, et
  // `verifSaison`/`verifPyramide` couvrent le championnat lui-même.
  function carriere(reussite: number, saisons = 15): {
    prestige: number; etages: string[]; licenciements: number;
    forceDebut: number; forceMax: number; niveauMax: number;
  } {
    let prestige = PRESTIGE_DEBUT;
    let confiance = 62;
    let club = meilleurClubAccessible(prestige, 1)!;
    const etages: string[] = [club.competition.nom];
    const forceDebut = club.force;
    let forceMax = club.force;
    let niveauMax = club.competition.niveau;
    let licenciements = 0;

    for (let s = 1; s <= saisons; s++) {
      // `reussite` : 1 = on finit deux ou trois places devant l'objectif,
      // 0 = deux ou trois places derrière. Rien d'aléatoire, on mesure une
      // mécanique, pas un tirage.
      const ecart = Math.round((reussite - 0.5) * 5);
      const rang = Math.max(1, club.objectif - ecart);
      const titre = rang === 1 ? 1 : 0;
      const v = verdictDeSaison(rang, club.objectif, { titres: titre });
      ({ prestige, confiance } = appliquerVerdict({ prestige, confiance } as Manager, v));

      if (confiance < CONFIANCE_LICENCIEMENT) {
        licenciements++;
        confiance = 62;
        club = meilleurClubAccessible(prestige, s + 1)!;
      } else {
        // Un entraîneur qui réussit regarde plus haut à l'intersaison.
        const mieux = meilleurClubAccessible(prestige, s + 1);
        if (mieux && mieux.force > club.force + 1.5) club = mieux;
      }
      if (etages[etages.length - 1] !== club.competition.nom) etages.push(club.competition.nom);
      if (club.force > forceMax) forceMax = club.force;
      niveauMax = Math.min(niveauMax, club.competition.niveau);
    }
    return { prestige, etages, licenciements, forceDebut, forceMax, niveauMax };
  }

  // ⚠️ ON MESURE LA FORCE DU CLUB, PAS LE NOMBRE D'ÉTAGES TRAVERSÉS. Le nom de
  // l'étage saute d'un pays à l'autre (« All-Ireland League », « Top 12
  // argentin ») dès qu'un club étranger passe devant à niveau égal : compter
  // les changements de libellé donnait « 13 étages » pour une progression de
  // trois crans. La force de l'effectif, elle, dit vraiment où l'on entraîne.
  const bon = carriere(1);
  info('carrière réussie · prestige final', bon.prestige.toFixed(1));
  info('carrière réussie · étages traversés', bon.etages.join(' → '));
  info('carrière réussie · force du club',
    `${bon.forceDebut.toFixed(1)} → ${bon.forceMax.toFixed(1)} (niveau ${bon.niveauMax})`);
  ligne('elle finit dans un club nettement plus fort',
    `+${(bon.forceMax - bon.forceDebut).toFixed(1)} de force`, bon.forceMax - bon.forceDebut >= 20);
  ligne('elle quitte vraiment le monde amateur', `niveau ${bon.niveauMax}`, bon.niveauMax <= 3);
  ligne("elle n'atteint pas 100 de prestige en 15 saisons", bon.prestige.toFixed(1), bon.prestige < 100);
  ligne("elle n'est jamais remerciée", `${bon.licenciements} licenciement(s)`, bon.licenciements === 0);

  const moyen = carriere(0.5);
  info('carrière moyenne · prestige final', moyen.prestige.toFixed(1));
  ligne(
    'tenir tout juste ses objectifs fait progresser, lentement',
    `${PRESTIGE_DEBUT} → ${moyen.prestige.toFixed(1)}`,
    moyen.prestige > PRESTIGE_DEBUT && moyen.prestige < bon.prestige,
  );

  const rate = carriere(0);
  info('carrière ratée · prestige final', rate.prestige.toFixed(1));
  ligne('échouer fait remercier', `${rate.licenciements} licenciement(s)`, rate.licenciements >= 3);
  ligne('échouer ne fait pas monter', rate.prestige.toFixed(1), rate.prestige <= PRESTIGE_DEBUT);
}

// ---------------------------------------------------------------------------
// 3. LA RECONVERSION
// ---------------------------------------------------------------------------
console.log('\n=== 3. « AVEC NOTRE STATUT » : LA RECONVERSION ===');
{
  function legende(p: Partial<LegendeSauvegardee>): LegendeSauvegardee {
    return {
      id: 'x', nom: 'Test', poste: 10, nation: 'France', age: 34, saisons: 16,
      note: 70, reputation: 60, matchsJoues: 300, essais: 40, titres: [],
      score: 1000, ...p,
    } as LegendeSauvegardee;
  }

  const modeste = prestigeDepuisJoueur(legende({ saisons: 8, note: 52, reputation: 25, titres: [] }));
  const solide = prestigeDepuisJoueur(legende({
    saisons: 14, note: 74, reputation: 62, tropheeIds: ['top14', 'champions'],
  }));
  const legendaire = prestigeDepuisJoueur(legende({
    saisons: 20, note: 92, reputation: 98,
    tropheeIds: ['top14', 'top14', 'champions', 'sixNations', 'coupeMonde', 'meilleurJoueur',
      'meilleurTop14', 'challenge', 'prod2', 'nationale'],
  }));

  for (const [nom, p] of [['modeste', modeste], ['solide', solide], ['légendaire', legendaire]] as const) {
    info(`carrière ${nom}`, `prestige ${p} · étage ${etageAccessible(p)?.nom ?? '—'}`);
  }

  ligne("une carrière modeste ouvre à peine plus qu'un départ à froid",
    `${modeste} vs ${PRESTIGE_DEBUT}`, modeste > PRESTIGE_DEBUT && modeste < 24);
  ligne('les trois paliers sont ordonnés', `${modeste} < ${solide} < ${legendaire}`,
    modeste < solide && solide < legendaire);
  ligne('même la meilleure carrière reste sous le plafond',
    `${legendaire} ≤ ${PRESTIGE_ANCIEN_JOUEUR_MAX}`, legendaire <= PRESTIGE_ANCIEN_JOUEUR_MAX);

  // ⚠️ LE POINT QUI COMPTE : un ancien grand joueur ne prend PAS le Top 14.
  const sommet = meilleurClubAccessible(legendaire, 1);
  const niveau = sommet ? (competitionDuClub(sommet.club.nom)?.niveau ?? 0) : 0;
  ligne("un ancien grand joueur n'entraîne pas l'élite le lendemain",
    `${sommet?.club.nom} (niveau ${niveau})`, niveau >= 2);
}

// ---------------------------------------------------------------------------
// 4. LE SALAIRE ET L'OBJECTIF SUIVENT LE CLUB
// ---------------------------------------------------------------------------
console.log('\n=== 4. LE SALAIRE ET L\'OBJECTIF SUIVENT LE CLUB ===');
{
  const clubs = ['Stade Toulousain', 'RC Vannes', 'Stade Aurillacois'];
  let croissant = true;
  let precedent = -1;
  for (const nom of clubs) {
    const comp = competitionDuClub(nom);
    if (!comp) { ligne(`club connu : ${nom}`, 'introuvable', false); continue; }
    const force = forceEffectif(nom, 1);
    const sal = salaireManager(force);
    const obj = objectifDuBoard(nom, comp, 1);
    info(nom, `${comp.nom} · force ${force.toFixed(1)} · objectif ${obj}ᵉ`
      + ` · salaire ${sal.toLocaleString('fr-FR')} €`);
    if (precedent >= 0 && sal > precedent) croissant = false;
    precedent = sal;
  }
  ligne('un plus gros club paie plus', 'décroissant du haut vers le bas', croissant);
  ligne('un objectif reste dans la poule', 'borné', clubs.every((nom) => {
    const comp = competitionDuClub(nom);
    const o = objectifDuBoard(nom, comp, 1);
    return o >= 1 && o <= (comp?.clubs.length ?? 99);
  }));
}

// ---------------------------------------------------------------------------
// 5. LE CLASSEMENT À CATÉGORIES
// ---------------------------------------------------------------------------
console.log('\n=== 5. LE CLASSEMENT À CATÉGORIES ===');
{
  function manager(p: Partial<Manager> = {}): Manager {
    return {
      nom: 'Coach', nation: 'France', age: 52, club: 'Stade Toulousain',
      division: 'top14', divisionNom: 'Top 14', saison: 18, semaine: 1,
      prestige: 84, confiance: 70, objectif: 2, argent: 0,
      budgetTransferts: 20_000_000, budgetSalarial: 4_000_000,
      contrat: { saisons: 2, salaire: 400_000 },
      decision: null,
      composition: compositionManagerParDefaut(effectifDuClub('Stade Toulousain', 18)),
      tactique: { ...TACTIQUE_MANAGER_DEFAUT }, resultats: {},
      negociations: [], recrues: [],
      clubs: ['SU Agen', 'RC Vannes', 'Stade Toulousain'],
      titres: [],
      palmares: [
        { trophee: 'top14', nom: 'Bouclier de Brennus', saison: 16, club: 'Stade Toulousain' },
        { trophee: 'champions', nom: 'Champions Cup', saison: 17, club: 'Stade Toulousain' },
      ],
      historique: [{
        saison: 4, club: 'SU Agen', division: 'prod2', divisionNom: 'Pro D2',
        rang: 1, objectif: 5, tenu: true, titres: ['prod2'], montee: true,
      }],
      ...p,
    };
  }

  const pur = ficheDepuisManager(manager());
  ligne('un entraîneur sans passé de joueur → « entraineur »',
    pur.categorie ?? '—', pur.categorie === 'entraineur');
  ligne('sa fiche est acceptée', verdict(pur).motif, verdict(pur).ok);
  info('son score', String(pur.score));

  const double = ficheDepuisManager(manager({
    passeJoueur: {
      nom: 'Coach', saisons: 14, note: 82, reputation: 80, matchs: 280, essais: 55,
      selections: 40, titres: ['top14', 'sixNations'], clubs: ['SU Agen'], ageDebut: 19,
    },
  }));
  ligne('un ancien joueur devenu entraîneur → « joueurEntraineur »',
    double.categorie ?? '—', double.categorie === 'joueurEntraineur');
  ligne('sa fiche est acceptée', verdict(double).motif, verdict(double).ok);
  ligne("et elle score plus que l'entraîneur pur",
    `${double.score} > ${pur.score}`, double.score > pur.score);
  ligne('les deux tiennent sous le plafond du barème',
    `${double.score} ≤ ${SCORE_MAX}`, double.score <= SCORE_MAX);

  // ⚠️ LA CATÉGORIE EST DÉDUITE, JAMAIS CRUE. C'est le seul moyen de ne pas
  // laisser un client se ranger dans le classement qui l'arrange.
  const menteur = { ...double, categorie: 'joueur' as const };
  ligne('le serveur redéduit la catégorie', `annoncée « joueur » → « ${categorieDeLaFiche(menteur)} »`,
    categorieDeLaFiche(menteur) === 'joueurEntraineur');
  ligne('et le score annoncé est recalculé',
    String(scoreDeLaFiche(menteur)), scoreDeLaFiche(menteur) === double.score);

  // Les attaques. Chacune doit être refusée AVEC UN MOTIF LISIBLE.
  const attaques: Array<[string, unknown]> = [
    ["300 saisons d'entraîneur", { ...pur, manager: { ...pur.manager, saisons: 300 } }],
    ['plus de saisons de banc que de vie', {
      ...pur, saisons: 5, manager: { ...pur.manager, saisons: 40 },
    }],
    ['40 titres en 18 saisons', {
      ...pur, manager: { ...pur.manager, titres: Array(40).fill('top14') },
    }],
    ['un trophée inventé', {
      ...pur, manager: { ...pur.manager, titres: ['coupeDesRevesDoresXXL'] },
    }],
    ['prestige 900', { ...pur, manager: { ...pur.manager, prestige: 900 } }],
    ['score gonflé à la main', { ...pur, score: 999_999 }],
    ['NaN dans le prestige', { ...pur, manager: { ...pur.manager, prestige: NaN } }],
  ];
  for (const [nom, fiche] of attaques) {
    const v = verdict(fiche);
    ligne(nom, v.ok ? 'ACCEPTÉE' : v.motif, !v.ok);
  }
}

console.log('\n=== 6. LA BOUCLE ENTIÈRE, PAR LE STORE ===');
{
  // ⚠️ CE QUE LES CINQ SECTIONS PRÉCÉDENTES NE PEUVENT PAS PROUVER : que les
  // règles pures sont RÉELLEMENT BRANCHÉES. `lib/manager.ts` peut être
  // parfait et le store ne jamais l’appeler — c’est exactement ce qui est
  // arrivé à `formeParSemaine`, cumulé par `effetsTraits()` et lu par
  // personne pendant des mois. On joue donc la boucle par le store.
  const s0 = useGame.getState();

  // 6a. Une création à froid.
  s0.creerManager({ nom: '', nation: 'France', club: 'Marseillais', age: 34 });
  const m1 = useGame.getState().manager;
  ligne('creerManager pose bien une carrière', m1 ? `${m1.nom} · ${m1.club}` : 'aucune', !!m1);
  ligne('un nom vide est TIRÉ, pas remplacé par « Entraîneur »',
    m1?.nom ?? '—', !!m1 && m1.nom !== 'Entraîneur' && m1.nom.includes(' '));
  ligne('le joueur laisse la place', String(useGame.getState().joueur), useGame.getState().joueur === null);
  ligne('l’objectif tient dans la poule réellement jouée',
    `${m1?.objectif}ᵉ`, !!m1 && m1.objectif >= 1 && m1.objectif <= 12);
  ligne('le bureau ne bloque plus sur une décision narrative',
    m1?.decision?.titre ?? 'aucune', m1?.decision === null);
  ligne('une feuille de 23 joueurs est prête dès la création',
    `${(m1?.composition.titulaires.length ?? 0) + (m1?.composition.remplacants.length ?? 0)} joueurs`,
    m1?.composition.titulaires.length === 15 && m1.composition.remplacants.length === 8);

  // 6b. Le marché mondial mène bien à une signature et modifie l'effectif.
  const cible = ciblesDuMarche(m1!.division, m1!.saison, m1!.club)[0];
  const avant = effectifDuClub(m1!.club, m1!.saison).some((j) => j.nom === cible.nom);
  useGame.getState().contacterJoueurManager(cible);
  let enCours = useGame.getState().manager!.negociations.at(-1)!;
  ligne('le contact ouvre une discussion dans L’Ovale',
    `@${enCours.pseudo}`, !!useGame.getState().conversations[enCours.pseudo]?.length);
  useGame.getState().accepterDemandesJoueurManager(enCours.id);
  enCours = useGame.getState().manager!.negociations.at(-1)!;
  useGame.setState((st) => ({ manager: st.manager && {
    ...st.manager, budgetTransferts: 99_000_000, budgetSalarial: 99_000_000,
  } }));
  useGame.getState().signerJoueurManager(enCours.id);
  const apresSignature = useGame.getState().manager!;
  const dansEffectif = effectifDuClub(apresSignature.club, apresSignature.saison)
    .some((j) => j.nom === cible.nom);
  ligne('la signature est persistée dans la carrière',
    `${apresSignature.recrues.length} recrue(s)`, apresSignature.recrues.length === 1);
  ligne('le joueur rejoint réellement l’effectif', `${avant} → ${dansEffectif}`, !avant && dansEffectif);

  // 6c. Une saison entière, semaine par semaine : chaque décision est tranchée
  // avant de continuer, exactement comme le joueur doit répondre à son récit.
  let verrouMatchTeste = false;
  for (let i = 0; i < SEMAINES_PAR_SAISON + 1; i++) {
    const courant = useGame.getState().manager;
    if (courant?.decision) {
      useGame.getState().repondreDecisionManager(courant.decision.id, courant.decision.choix[0].id);
    }
    const prepare = useGame.getState().manager!;
    // Une saison manager comprend aussi les coupes et phases finales. Ne
    // regarder que le championnat laissait la simulation bloquée devant un
    // match obligatoire pourtant invisible au banc d'essai.
    const affiche = afficheDuClub(prepare);
    if (affiche && !prepare.resultats[affiche.cle]) {
      const semaineAvant = prepare.semaine;
      useGame.getState().semaineManager();
      if (!verrouMatchTeste) {
        ligne('un match non joué bloque réellement la semaine',
          `semaine ${semaineAvant}`, useGame.getState().manager?.semaine === semaineAvant);
        verrouMatchTeste = true;
      }
      const domicile = affiche.match.domicile === prepare.club;
      useGame.getState().enregistrerResultatManager({
        cle: affiche.cle, club: prepare.club, saison: prepare.saison,
        semaine: prepare.semaine, journee: affiche.journee, domicile,
        adversaire: domicile ? affiche.match.exterieur : affiche.match.domicile,
        scorePour: domicile ? affiche.match.scoreD : affiche.match.scoreE,
        scoreContre: domicile ? affiche.match.scoreE : affiche.match.scoreD,
        essaisPour: domicile ? affiche.match.essaisD : affiche.match.essaisE,
        essaisContre: domicile ? affiche.match.essaisE : affiche.match.essaisD,
      });
    }
    useGame.getState().semaineManager();
  }
  const m2 = useGame.getState().manager!;
  info('après une saison', `saison ${m2.saison} · prestige ${m2.prestige} · confiance ${m2.confiance}`);
  ligne('la saison se clôt toute seule', `saison ${m2.saison}`, m2.saison === 2);
  ligne('elle laisse une ligne d’historique', `${m2.historique.length}`, m2.historique.length === 1);
  ligne('le rang vient du championnat, pas d’une estimation',
    `${m2.historique[0].rang}ᵉ dans une poule de 12`,
    m2.historique[0].rang >= 1 && m2.historique[0].rang <= 12);
  ligne('le salaire est versé', `${m2.argent} €`, m2.argent > 0);

  // 6d. La reconversion : la vraie demande, « avec notre statut ».
  useGame.setState({ manager: null, joueur: null });
  useGame.getState().creerJoueur({
    nom: 'Grand Joueur', poste: 'demi_ouverture', nation: 'France',
    club: 'Stade Toulousain', division: 'top14', age: 22, traits: [],
  } as never);
  useGame.setState((st) => ({
    joueur: st.joueur && {
      ...st.joueur, saison: 15, age: 36, reputation: 90,
      titres: ['Bouclier de Brennus (S9)'],
      palmares: [{ trophee: 'top14', nom: 'Bouclier de Brennus', saison: 9, club: 'Stade Toulousain' }],
    },
  }));
  useGame.getState().prendreRetraite('entraineur');
  const apres = useGame.getState();
  ligne('la retraite « entraîneur » garde la légende sous la main',
    apres.reconversionManager?.nom ?? 'aucune', !!apres.reconversionManager);
  // ⚠️ ON NE SAUTE PLUS DIRECTEMENT À LA CRÉATION. L'épilogue `finCarriere`
  // s'est intercalé : il explique POURQUOI la carrière est finie et récapitule
  // le bilan avant d'orienter vers la suite. Le contrôle porte donc sur les
  // deux marches — sinon il vérifierait qu'on escamote l'épilogue.
  ligne('… et passe par l’épilogue de fin de carrière', apres.ecran, apres.ecran === 'finCarriere');
  ligne('… tout en laissant la carrière au Hall', `${apres.pantheon.length} légende(s)`, apres.pantheon.length > 0);

  apres.continuerFinCarriere();
  const suite = useGame.getState();
  ligne('… puis l’épilogue emmène à l’écran de création',
    suite.ecran, suite.ecran === 'creationManager');
  ligne('… et l’épilogue est consommé', String(suite.finCarriere), suite.finCarriere === null);

  const depuis = apres.reconversionManager!;
  const prestigeRecon = prestigeDepuisJoueur(depuis);
  apres.creerManager({
    nom: '', nation: 'France', club: meilleurClubAccessible(prestigeRecon, 1)!.club.nom,
    depuis,
  });
  const m3 = useGame.getState().manager!;
  ligne('la reconversion démarre AU-DESSUS d’un inconnu',
    `${m3.prestige} vs ${PRESTIGE_DEBUT}`, m3.prestige > PRESTIGE_DEBUT);
  ligne('elle garde le passé de joueur', m3.passeJoueur?.nom ?? 'perdu', !!m3.passeJoueur);
  ligne('la légende consommée ne traîne pas',
    String(useGame.getState().reconversionManager), useGame.getState().reconversionManager === null);

  // 6e. Le mode libre ne publie rien. C’est LE verrou de la demande.
  useGame.setState({ manager: null });
  s0.creerManager({
    nom: 'Tricheur', nation: 'France', club: 'Stade Toulousain', libre: true,
  });
  const libre = useGame.getState().manager!;
  ligne('le mode libre ouvre le plus gros club du jeu', libre.club, libre.club === 'Stade Toulousain');
  let publie = 0;
  const vraiePublication = useGame.getState().publierAuClassement;
  useGame.setState({ publierAuClassement: (() => { publie++; }) as never });
  useGame.getState().quitterBanc();
  useGame.setState({ publierAuClassement: vraiePublication });
  ligne('⚠️ et il n’envoie RIEN au classement mondial',
    `${publie} envoi(s)`, publie === 0);
}

// ---------------------------------------------------------------------------
// 6. LA CARRIÈRE D'ENTRAÎNEUR PART VRAIMENT AU CLASSEMENT
// ---------------------------------------------------------------------------
// ⚠️ CE CONTRÔLE EXISTE PARCE QUE CELUI DE LA SECTION 5 NE POUVAIT PAS ATTRAPER
// LE BUG. La section 5 REMPLACE `publierAuClassement` par un espion pour
// compter les appels : elle vérifie donc que `quitterBanc` APPELLE, jamais que
// l'appel FASSE quelque chose. Et il ne faisait rien — `publierAuClassement`
// commençait par `const j = get().joueur; if (!j) return;`, or `creerManager`
// pose `joueur: null`. Tout l'étage manager du classement (`ficheDepuisManager`,
// le barème `scoreManager`, les bornes du banc, les trois catégories SQL de
// `api/classement.ts` et les quatre onglets de l'écran) était écrit, calibré,
// déployé… et jamais alimenté. Aucune carrière d'entraîneur n'y est arrivée.
//
// La leçon est générale : UN BANC D'ESSAI QUI BOUCHONNE LA FONCTION À TESTER NE
// TESTE QUE SON PROPRE BOUCHON. On intercepte donc le RÉSEAU, pas le store.
//
// ⚠️ Il faut une URL : sans `VITE_CLASSEMENT_URL`, `lib/classementEnLigne.ts`
// n'appelle pas hors production (constante `ACTIF`) — c'est voulu, Vite ne sait
// pas exécuter une fonction serverless. Le contrôle s'annonce donc IGNORÉ
// plutôt que de passer au vert sur du vide.
console.log("\n=== 6. LA CARRIÈRE D'ENTRAÎNEUR PART VRAIMENT AU CLASSEMENT ===");
{
  if (!process.env.VITE_CLASSEMENT_URL) {
    info('contrôle ignoré (pas d’URL)',
      'VITE_CLASSEMENT_URL=https://exemple.test/api/classement npx vite-node scripts/verifManager.ts');
  } else {
    const envoyees: Record<string, unknown>[] = [];
    const vraiFetch = globalThis.fetch;
    globalThis.fetch = (async (cible: unknown, init?: { method?: string; body?: string }) => {
      if (String(cible).includes('classement') && init?.method === 'POST' && init.body) {
        envoyees.push(JSON.parse(init.body) as Record<string, unknown>);
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, id: 'test' }) };
    }) as unknown as typeof globalThis.fetch;

    useGame.getState().creerManager({
      nom: 'Renaud Bascou', nation: 'France', age: 42, club: 'Stade Nantais', libre: false,
    });

    ligne('la carrière est bien celle d’un entraîneur',
      useGame.getState().joueur === null ? 'joueur: null' : '⚠️ un joueur traîne',
      useGame.getState().joueur === null && !!useGame.getState().manager);

    useGame.getState().publierAuClassement(true);
    await new Promise((r) => setTimeout(r, 250));
    globalThis.fetch = vraiFetch;

    ligne('⚠️ une fiche est réellement envoyée',
      `${envoyees.length} envoi(s)`, envoyees.length === 1);
    const f = envoyees[0];
    if (f) {
      ligne('elle porte le poste « entraineur »', String(f.poste), f.poste === 'entraineur');
      ligne('elle porte le versant manager', f.manager ? 'présent' : 'absent', !!f.manager);
      ligne('et le serveur l’accepterait', verdict(f).motif, verdict(f).ok);
      info('son score', String(f.score));
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\n=== 7. UNE CONVERSATION NE REMONTE PAS LE TEMPS ===');
// ---------------------------------------------------------------------------
// ⚠️ VU À L'ÉCRAN, ET INTROUVABLE AUTREMENT : l'heure d'un message était semée
// sur SON IDENTIFIANT, donc tirée indépendamment pour chacun. Un échange de
// deux lignes affichait la réponse du club à 13:56 sous la question posée à
// 14:55 — la négociation se lisait à l'envers. On sème désormais sur le FIL, et
// chaque réplique avance de quelques minutes.
{
  const heures = (fil: string, n: number) => Array.from({ length: n }, (_, rang) => {
    const texte = horodatageJeu(5, `1#${fil}`, rang);
    const [h, m] = texte.split('·')[1].trim().split(':').map(Number);
    return h * 60 + m;
  });

  const fil = heures('provence_rugby_officiel', 8);
  let croissant = true;
  for (let i = 1; i < fil.length; i++) if (fil[i] < fil[i - 1]) croissant = false;
  ligne('les heures d’un fil ne reculent jamais',
    fil.map((v) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`).join(' → '),
    croissant);
  ligne('… et elles avancent vraiment',
    `${fil.at(-1)! - fil[0]} minutes sur 8 messages`, fil.at(-1)! > fil[0]);
  // Deux fils différents gardent des heures différentes : sans ça, tous les
  // messages du jeu tomberaient à la même minute et la date perdrait son sens.
  const autre = heures('as_beziers_herault_officiel', 8);
  ligne('deux fils ne battent pas à la même heure',
    `${fil[0]} vs ${autre[0]}`, fil[0] !== autre[0]);
  // ⚠️ ET ON NE DÉBORDE PAS SUR LE LENDEMAIN : un fil très long se tasse en fin
  // de soirée plutôt que d'afficher « 27:14 ».
  const long = heures('provence_rugby_officiel', 400);
  ligne('un fil très long reste dans la journée',
    `dernier message à ${Math.floor(long.at(-1)! / 60)}:${String(long.at(-1)! % 60).padStart(2, '0')}`,
    long.at(-1)! <= 23 * 60 + 59);
}

// ---------------------------------------------------------------------------
console.log('\n=== 8. LA PYRAMIDE BOUGE AUSSI POUR UN ENTRAÎNEUR ===');
// ---------------------------------------------------------------------------
// ⚠️ C'ÉTAIT LE « GROS PROBLÈME : ON NE MONTE PAS DE DIVISION ». Le mouvement du
// club était CALCULÉ depuis toujours — `monte` et `descendu` alimentaient le
// verdict du board, le prestige et la ligne d'historique — mais `suivant`
// recopiait `division` de la saison précédente : on gagnait sa Régionale 2, on
// lisait « ⬆ montée » dans son bilan, et on rejouait la Régionale 2.
{
  console.log('');
  const nomDiv = (id: string) => COMPETITIONS.find((c) => c.id === id)?.nom ?? id;
  // Labastide-Beauvoir finit PREMIER de Régionale 3 à la saison 1 : c'est le
  // cas rapporté (« premier, et je ne monte pas »), pas un club moyen.
  useGame.getState().creerManager({
    nom: 'Banc d’essai', nation: 'France', club: 'Labastide-Beauvoir', age: 34, libre: true,
  });
  const depart = useGame.getState().manager!;
  info('club de départ', `${depart.club} · ${nomDiv(depart.division)}`);
  info('rang final de la saison 1', String(rangFinal(depart.division, 1, depart.club)));

  useGame.getState().saisonManager();
  const apres = useGame.getState().manager!;
  ligne('un champion de sa division CHANGE de division',
    `${nomDiv(depart.division)} → ${nomDiv(apres.division)}`,
    apres.division !== depart.division);
  ligne('… et son nom de division suit',
    apres.divisionNom,
    apres.divisionNom === nomDiv(apres.division));
  // ⚠️ LE REGISTRE DE MODULE DOIT SUIVRE, sinon le club serait promu dans sa
  // fiche et resterait dans l'ancienne poule partout ailleurs (classement,
  // calendrier, atlas). C'est la ligne que la carrière joueur commente depuis
  // longtemps et que le mode manager n'avait jamais reçue.
  const effective = competitionEffective(apres.club, apres.division);
  ligne('le reste du jeu voit la même division',
    `${nomDiv(effective?.id ?? '?')} vs ${nomDiv(apres.division)}`,
    effective?.id === apres.division);
  ligne('l’objectif est recalculé dans la NOUVELLE division',
    `${apres.objectif}ᵉ`, apres.objectif > 0);
}

// ---------------------------------------------------------------------------
console.log('\n=== 9. LES PLAY-OFFS ET LES COUPES SONT PROPOSÉS ===');
// ---------------------------------------------------------------------------
// ⚠️ `matchDuClubSemaine` NE LIT QUE LA GRILLE DES JOURNÉES. Les trois semaines
// de phase finale du calendrier n'ont pas de journée — elles ont un `tourFinal`
// — et les huit dates de coupe non plus. Premier de sa poule, un manager
// traversait donc demies et finale sans qu'aucun match ne lui soit proposé.
{
  console.log('');
  const clubR2 = COMPETITIONS.find((c) => c.id === 'reg2')!.clubs[0].nom;
  let phases = 0; let championnat = 0;
  for (let s = 1; s <= CALENDRIER.length; s++) {
    const a = afficheDuClub({ club: clubR2, division: 'reg2', saison: 1, semaine: s });
    if (!a) continue;
    if (a.nature === 'phaseFinale') phases++; else if (a.nature === 'championnat') championnat++;
  }
  info(`${clubR2} sur une saison`, `${championnat} journées · ${phases} match(s) de phase finale`);
  ligne('un club qualifié a bien un match de phase finale', `${phases}`, phases > 0);

  let coupes = 0;
  for (let s = 1; s <= CALENDRIER.length; s++) {
    const a = afficheDuClub({ club: 'Stade Toulousain', division: 'top14', saison: 1, semaine: s });
    if (a?.nature === 'coupe') coupes++;
  }
  ligne('un club européen a ses dates de coupe', `${coupes} match(s)`, coupes > 0);
}

console.log(`\n${echecs === 0 ? '✅ TOUT PASSE' : `❌ ${echecs} ÉCHEC(S)`}`);
process.exitCode = echecs === 0 ? 0 : 1;
