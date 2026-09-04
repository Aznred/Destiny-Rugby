import { useGame } from '../src/store/useGame';
import { effectifDuClub } from '../src/lib/effectif';
import {
  avancerSemaineCarriereAvancee, CHARGE_HEBDO_DEFAUT, deciderMedical,
  definirChargeEntrainement, disponibiliteJoueur, indisponiblesCarriereAvancee,
  moisRestantsContrat, ouvrirRenegociationJoueur, palierContrat,
  risqueMoyenGroupe, signerRenegociationJoueur,
} from '../src/lib/carriereAvancee';
import {
  approcheAGenerer, exigerSurApproche, FENETRES_APPROCHE, negocierApproche,
  reactionAuRefus, repondreApproche,
} from '../src/lib/approchesClubs';
import { negocierAvecJoueur } from '../src/lib/recrutementManager';
import { negocierAvecClub, ouvrirNegociationClub } from '../src/lib/vestiaireManager';
import type { CibleRecrutementManager } from '../src/types';

let echecs = 0;
function verifier(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  OK' : '  ECHEC'} ${nom}${detail ? ` · ${detail}` : ''}`);
  if (!ok) echecs++;
}

console.log('\n=== SANTE, CONTRATS ET MERCATO ===');
useGame.getState().reinitialiser();
useGame.getState().creerManager({ nom: 'Morgan Test', nation: 'France', club: 'Stade Toulousain' });
const manager = useGame.getState().manager!;
const effectif = effectifDuClub(manager.club, manager.saison);
const avancee = manager.avancee!;

verifier('chaque joueur a un profil medical permanent', effectif.every((j) => avancee.profilsMedicaux[j.id]?.zones.genou >= 0));
verifier('chaque joueur a un contrat suivi', effectif.every((j) => avancee.contratsJoueurs[j.id]?.fin > manager.saison));

const faible = definirChargeEntrainement(definirChargeEntrainement(avancee, 'contacts', 0), 'physique', 0);
const forte = { ...avancee, chargeEntrainement: { physique: 3, contacts: 3, sprint: 3, melee: 3, recuperation: 0 } as const };
verifier('la charge augmente le risque du groupe', risqueMoyenGroupe(forte, effectif) > risqueMoyenGroupe(faible, effectif), `${risqueMoyenGroupe(faible, effectif)} -> ${risqueMoyenGroupe(forte, effectif)}`);

const joueur = effectif[0];
const commotion = {
  ...avancee,
  chargeEntrainement: { ...CHARGE_HEBDO_DEFAUT },
  medical: [{
    id: 'commotion-test', joueurId: joueur.id, nom: joueur.nom, type: 'Commotion cérébrale',
    gravite: 'moyenne' as const, disponibilite: 0, douleur: 65, risqueAggravation: 30,
    semaines: 4, decision: 'attente' as const, penalitePerformance: 18, saison: 1, semaine: 1,
    phase: 'diagnostic' as const, zone: 'commotion' as const, origine: 'match' as const,
    diagnosticDans: 0, guerison: 10, condition: 55, rythme: 40, risqueRechute: 25,
    protocoleCommotion: true,
  }],
};
const forceInterdite = deciderMedical(commotion, 'commotion-test', 'forcer');
verifier('le protocole commotion interdit de forcer', forceInterdite.medical[0].decision === 'attente');
const repos = deciderMedical(commotion, 'commotion-test', 'repos');
verifier('le repos retire bien le joueur de la feuille', indisponiblesCarriereAvancee(repos, 1).includes(joueur.id));
const apresSemaine = avancerSemaineCarriereAvancee({ ...manager, avancee: repos }, effectif, 2);
verifier('la guerison progresse sans rendre instantanement la forme', (apresSemaine.medical[0].guerison ?? 0) > 10 && (apresSemaine.medical[0].condition ?? 100) < 100);

const nego = ouvrirRenegociationJoueur(avancee, manager, effectif, joueur.id)!;
verifier('une negociation expose motivations concurrence et visite medicale', !!nego.motivations?.length && !!nego.examenMedical && Array.isArray(nego.offresConcurrentes));
const avecPrimes = negocierAvecJoueur(nego, 'bonus').negociation;
const avecOption = negocierAvecJoueur(nego, 'option').negociation;
const avecClauses = negocierAvecJoueur(nego, 'clause').negociation;
verifier('les leviers modifient les vraies conditions', (avecPrimes.offre.primeVictoire ?? 0) > 0
  && avecOption.offre.option === nego.exigences.option
  && avecClauses.offre.clauseRelegation === nego.exigences.clauseRelegation);
const signee = signerRenegociationJoueur(avancee, { ...nego, offre: nego.exigences, etat: 'signee' });
verifier('la signature remplace duree salaire et demande', signee.contratsJoueurs[joueur.id].fin === manager.saison + nego.exigences.duree && !signee.contratsJoueurs[joueur.id].demandeRevalorisation);

const cible: CibleRecrutementManager = {
  id: 'cible-club', pseudo: 'cible_club', nom: 'Cible Club', club: 'RC Toulon', division: 'top14',
  poste: 'arriere', age: 25, note: 78, potentiel: 82, nation: 'France', indemnite: 500_000,
  valeur: 900_000, saisonsRestantes: 2, situation: 'sousContrat', salaireDemande: 200_000,
  primeDemandee: 30_000, primeMatchDemandee: 0, dureeDemandee: 3, roleDemande: 'cadre',
};
const club = ouvrirNegociationClub(cible, 1, 1);
const avecBonus = negocierAvecClub(club, 'bonus').negociation;
const avecRevente = negocierAvecClub(avecBonus.etat === 'ouverte' ? avecBonus : { ...avecBonus, etat: 'ouverte' }, 'revente').negociation;
verifier('le club vendeur memorise bonus et pourcentage', (avecBonus.bonus ?? 0) > 0 && (avecRevente.pourcentageRevente ?? 0) === 10);
verifier('le club vendeur a besoins urgence et alternatives', !!club.besoinVendeur && typeof club.urgence === 'number' && typeof club.alternatives === 'number');

// ---------------------------------------------------------------------------
// ATTACHEMENT, PALIERS DE CONTRAT ET DISPONIBILITE
// ---------------------------------------------------------------------------
verifier('chaque contrat porte un attachement mesurable', effectif.every((j) => {
  const c = avancee.contratsJoueurs[j.id];
  return typeof c.attachement === 'number' && c.attachement >= 0 && c.attachement <= 100;
}));
const attachements = effectif.map((j) => avancee.contratsJoueurs[j.id].attachement);
verifier('les attachements ne sont pas tous identiques',
  new Set(attachements).size > 3, `${Math.min(...attachements)} -> ${Math.max(...attachements)}`);

verifier('le palier de contrat suit les mois restants',
  palierContrat(moisRestantsContrat(manager.saison + 3, manager.saison, 1)) === 'serein'
  && palierContrat(moisRestantsContrat(manager.saison + 1, manager.saison, 40)) === 'danger'
  && palierContrat(moisRestantsContrat(manager.saison, manager.saison, 1)) === 'libre');

// La disponibilite se compte match par match : sans match joue, tout est vide,
// et c'est le comportement attendu — jamais un pourcentage invente.
const vide = disponibiliteJoueur(avancee.profilsMedicaux[joueur.id], manager.saison);
verifier('la disponibilite part de zero et ne s invente pas', vide.possibles === 0 && vide.part === 100);
const avecMatchs = disponibiliteJoueur({
  ...avancee.profilsMedicaux[joueur.id],
  disponibilites: [
    { saison: manager.saison - 1, possibles: 30, disponibles: 21, titularisations: 16, semainesBlessees: 6, joursBlesse: 42 },
    { saison: manager.saison, possibles: 10, disponibles: 9, titularisations: 8, semainesBlessees: 1, joursBlesse: 7 },
  ],
}, manager.saison);
verifier('le bilan agrege les saisons et sort un taux',
  avecMatchs.possibles === 40 && avecMatchs.disponibles === 30 && avecMatchs.joursBlesse === 49 && avecMatchs.part === 75,
  `${avecMatchs.disponibles}/${avecMatchs.possibles} = ${avecMatchs.part}%`);

// ---------------------------------------------------------------------------
// APPROCHES RECUES : un club vient chercher un joueur qu'on garde
// ---------------------------------------------------------------------------
// On force l'interet exterieur : la generation ne doit dependre que de lui, du
// contrat restant et du besoin reel de l'acheteur — pas d'un tirage libre.
const convoites = Object.fromEntries(Object.entries(avancee.contratsJoueurs).map(([id, c]) => [id, { ...c, interetExterieur: 92 }]));
let nee: ReturnType<typeof approcheAGenerer> = null;
for (const semaine of FENETRES_APPROCHE) {
  nee = approcheAGenerer(manager, effectif, convoites, avancee.profilsMedicaux, [], semaine);
  if (nee) break;
}
verifier('un club finit par se positionner sur un cadre convoite', !!nee, nee ? `${nee.club} · ${nee.offre} €` : 'aucune');
if (nee) {
  verifier('l acheteur expose besoin urgence alternatives et plafond cache',
    !!nee.besoin && nee.urgence > 0 && nee.alternatives < 3 && nee.plafond >= nee.offre);
  verifier('aucune approche tant qu une autre est ouverte',
    approcheAGenerer(manager, effectif, convoites, avancee.profilsMedicaux, [nee], nee.semaine) === null);
  // ⚠️ Une approche d une saison passee ne doit plus rien bloquer : au 1er
  // juillet la semaine repart a 1, et un dossier laisse ouvert en juin
  // condamnait le marche pour toute la carriere.
  verifier('une approche perimee ne bloque plus le marche',
    avancerSemaineCarriereAvancee(
      { ...manager, saison: manager.saison + 1, avancee: { ...avancee, approches: [nee] } }, effectif, 2,
    ).approches[0].etat === 'rompue');

  const enNego = repondreApproche(nee, 'negocier').approche;
  verifier('negocier ouvre la table sans vendre', enNego.etat === 'negociation');
  const monte = negocierApproche(enNego, 'exiger').approche;
  verifier('le levier fait monter l acheteur vers son plafond',
    monte.offre > nee.offre && monte.offre <= nee.plafond, `${nee.offre} -> ${monte.offre}`);
  const avecRevente2 = negocierApproche(enNego, 'revente').approche;
  verifier('la part a la revente est reellement inscrite', avecRevente2.pourcentageRevente === 10);
  const absurde = negocierApproche(exigerSurApproche(enNego, nee.plafond * 4), 'exiger').approche;
  verifier('une demande absurde termine les negociations', absurde.etat === 'rompue');
  const conclu = repondreApproche(nee, 'accepter');
  verifier('accepter conclut immediatement', conclu.accord && conclu.approche.etat === 'accord');

  // ⚠️ MESURE : une negociation doit pouvoir ABOUTIR, sinon les leviers ne sont
  // qu'un decor avant un refus obligatoire. On rejoue 200 approches reelles :
  // la gourmandise pure (« qu'ils montent » quatre fois) doit echouer souvent,
  // et une strategie mixte doit conclure la grande majorite du temps.
  const clubsTest = ['Stade Toulousain', 'RC Toulon', 'Section Paloise', 'US Montauban', 'Provence Rugby'];
  let tirees = 0; let gourmandes = 0; let mixtes = 0;
  for (const clubTest of clubsTest) {
    const mm = { ...manager, club: clubTest };
    const eff = effectifDuClub(clubTest, 1);
    const cts = Object.fromEntries(eff.map((x) => [x.id, { ...avancee.contratsJoueurs[joueur.id], joueurId: x.id, nom: x.nom, club: clubTest, fin: 4, interetExterieur: 90 }]));
    for (const semaine of FENETRES_APPROCHE) {
      const app = approcheAGenerer(mm, eff, cts, {}, [], semaine);
      if (!app) continue;
      tirees++;
      let gourmand = repondreApproche(app, 'negocier').approche;
      for (let i = 0; i < 4 && gourmand.etat === 'negociation'; i++) gourmand = negocierApproche(gourmand, 'exiger').approche;
      if (gourmand.etat === 'accord') gourmandes++;
      let mixte = repondreApproche(app, 'negocier').approche;
      for (const levier of ['exiger', 'exiger', 'revente', 'bonus'] as const) {
        if (mixte.etat !== 'negociation') break;
        mixte = negocierApproche(mixte, levier).approche;
      }
      if (mixte.etat === 'accord') mixtes++;
    }
  }
  verifier('assez d approches pour mesurer', tirees >= 8, `${tirees} approches`);
  verifier('une strategie mixte conclut la plupart du temps', mixtes / Math.max(1, tirees) >= .8,
    `${mixtes}/${tirees}`);
  verifier('la gourmandise pure ne suffit pas', gourmandes < mixtes, `${gourmandes}/${tirees}`);

  // La reaction au refus doit dependre du joueur, pas d'un tirage.
  const contratLoyal = { ...avancee.contratsJoueurs[nee.joueurId], attachement: 95, satisfaction: 80 };
  const contratMercenaire = { ...avancee.contratsJoueurs[nee.joueurId], attachement: 8, satisfaction: 22 };
  const profilAmbitieux = { ...avancee.vestiaire[nee.joueurId], traits: ['ambitieux' as const, 'mercenaire' as const] };
  const calme = reactionAuRefus(nee, contratLoyal, avancee.vestiaire[nee.joueurId], { partDeJeu: .8, monterDEtage: true, indisponible: false });
  const furieux = reactionAuRefus(nee, contratMercenaire, profilAmbitieux, { partDeJeu: .1, monterDEtage: true, indisponible: false });
  verifier('un joueur attache et titulaire comprend le refus', calme.reaction === 'comprend');
  verifier('un ambitieux mecontent demande son depart', furieux.reaction === 'demandeDepart');
  verifier('le refus coute toujours quelque chose', calme.satisfaction < 0 && furieux.satisfaction < calme.satisfaction);
}

if (echecs) {
  console.error(`\n${echecs} controle(s) en echec`);
  process.exitCode = 1;
} else console.log('\nOK · sante, contrats et mercato sont relies et persistants.');
