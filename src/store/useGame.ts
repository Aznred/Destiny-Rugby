import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { projectionMemoisee, stockageCarriereOptimise } from '../lib/persistanceNavigation';
import type {
  Attributs,
  Ecran,
  EntreeJournal,
  TypeInstallation,
  EvenementHebdo,
  Joueur,
  LegendeSauvegardee,
  FinCarriere,
  MotifFinCarriere,
  BilanEnCours,
  PreAccord,
  TitreGagne,
  Blessure,
  Theme,
  StatsDetaillees,
  PosteId,
  ReponseMJ,
  StatVariable,
  PostSocial,
  NotifSocial,
  SuccesDebloques,
  CompteSuivi,
  MessageDM,
  DossierRecrutementClub,
  TransfertAnnonce,
  ProfilSocial,
  DecisionClub,
  Manager, SaisonManager, CibleRecrutementManager, CompositionManager,
  TactiqueManager, ResultatMatchManager, ActionAcademieManager, ObjectifJeuneManager,
  ReponseApprocheManager, LevierApprocheManager, ApprocheClubManager, DemandeJoueur,
} from '../types';
import {
  publierPost, pseudoDe, feedAmbiance, suggestionsLocales,
  estCertifie, statsDepuisVues, LIMITE_CARACTERES, vieillirPost,
} from '../lib/social';
import {
  appliquerSanctionSociale, evaluerEmbrouilleSociale,
} from '../lib/disciplineSociale';
import { sanctionEmbrouilleSociale } from '../data/socialLocalise';
import { filIA, reponsesIA, messageIA } from '../lib/iaSociale';
import {
  abonnesCible, annuaire, bassinSocial, pseudoStable, rapprocherAbonnes,
} from '../lib/comptes';
// ⚠️ LE MOTEUR DE MATCH N'EST PAS IMPORTÉ ICI (économie de chargement).
// `moteur/saison.ts` tire derrière lui les 3 500 lignes du moteur ; le store
// étant chargé dès la page d'accueil, tout partait dans le chunk principal
// alors que rien n'en a besoin avant la première semaine jouée.
// `simulerStatsJournee` le charge donc À LA DEMANDE (`import()`), et seule la
// petite fonction `estTitulaire` — qui n'a aucune dépendance — reste statique.
import { estTitulaire } from '../lib/moteur/titulaire';
import { definirLangue, langueDuNavigateur, nombre, t, type Langue } from '../lib/i18n';
import { LANGUE_DE_REPLI } from '../lib/cible';
import type { LigneReelle } from '../lib/moteur/saison';
import { coupeEnDirect, coupesDuClub } from '../lib/coupe';
import { LIMITES, ficheDepuisJoueur, ficheDepuisManager, scoreDeLaFiche } from '../lib/classementMondial';
import { cleAleatoire, envoyerAuClassement } from '../lib/classementEnLigne';
import {
  COMPETITIONS_U20, competitionsDeLaSaison,
  internationalEnDirect,
} from '../lib/international';
import { CALENDRIER as SEMAINES } from '../data/calendrier';
import { appliquerCompte, ecrireCompte } from '../lib/sauvegardes';
import {
  chargerAncienneCollectionSolo, normaliserCollectionSolo,
  type EtatCollectionSolo, type ResultatPackSolo,
} from '../lib/collectionSolo';

// Les journées complètes utilisent le moteur lourd chargé à la demande. Une
// file unique empêche plusieurs clics rapides (ou une avance calendrier) de
// rejouer en parallèle la même journée et d'écraser leurs cumuls respectifs.
let fileStatsReelles: Promise<void> = Promise.resolve();

// ⚠️ LA PARTIE VA DANS L'EMPLACEMENT ACTIF, plus dans une clé unique. Le store
// écrit toujours sous le même nom (`destin-ovalie`) et ne sait rien des
// emplacements : c'est l'adaptateur de `lib/sauvegardes.ts` qui redirige ce nom
// vers l'emplacement en cours. Sans ce détour, créer une carrière d'entraîneur
// écrasait la carrière de joueur — les deux modes se chassent l'un l'autre
// (`creerManager` pose `joueur: null`, `creerJoueur` pose `manager: null`).
//
// Il gère aussi le cas des scripts de vérification et du rendu serveur, qui
// n'ont pas de `localStorage` : le repli mémoire vit dans l'adaptateur.
const stockageJeu = stockageCarriereOptimise<Partial<GameState>>();

// Combien de week-ends de ce type se sont écoulés AVANT cette semaine.
function passeesDuType(numeroSemaine: number, type: string): number {
  return SEMAINES.slice(0, Math.max(0, numeroSemaine - 1)).filter((s) => s.type === type).length;
}
import { matchDeLaSemaine, afficheDuClub } from '../lib/matchLive';
import {
  filDeLaSemaine, messageSpontane, invitationCoequipier, effetSurRelation, reponseLocale,
  tonDuMessage, reactionsPour,
} from '../lib/vie';
import { evaluerSucces, defisDeLaSemaine, cleSemaine } from '../lib/succes';
import { DEFI_PAR_ID, SUCCES_PAR_ID, type EvenementDefi } from '../data/succes';
import { evaluerSuccesManager } from '../data/succesManager';
import { POSTE_PAR_ID, migrerPoste, ATTRIBUTS_LABELS, nomPoste } from '../data/rugby';
import {
  retourDeMatch, BUDGET_MATCHS_PAR_SAISON, type StatsMatchJoueur,
} from '../lib/moteur/apresMatch';
import { plafonnerDeltas, ressembleATriche } from '../lib/mj';
import {
  MODELE_DEFAUT, MODELES_GROQ, definirCleGroqJoueur, erreurSilencieuse, iaDisponible,
} from '../lib/groq';
import { EVENEMENTS, traduireEvenement } from '../data/evenements';
import { situationPour, versScenario, type ConsequenceDure } from '../data/situations';
import {
  appliquerActionClub, appliquerConsequence, consequenceAutorisee, lireDerapage,
  consequenceDuDerapage, niveauDeFaute,
} from '../lib/consequences';
import {
  SKIN_PAR_ID, EQUIPEMENT_PAR_ID, EQUIPEMENTS_RETIRES, type CategorieEquipement,
} from '../data/boutique';
import { ETAT_PUBS_VIDE, OVAS_PAR_PUB, etatDuJour, pubDisponible, type EtatPubs } from '../lib/pub';
import type { Scenario } from '../data/scenarios';
import { COMPETITIONS, divisionDuClub, competitionDuClub, clubParNom } from '../data/clubs';
import {
  forceEffectif, forceMoyenneDivision, noteDuClub, setApportsDuCentre, setTransfertsSociaux,
  effectifDuClub,
} from '../lib/effectif';
import { nomAleatoirePourNation } from '../lib/nomsJoueurs';
import { chantierVisible } from '../lib/modeDev';
import { evoluer } from '../lib/progression';
import { genererOffres, offreProlongation, cote } from '../lib/offres';
import { agentsAccessibles, descriptionAgent, niveauPourAgent, nomAgent, SEUIL_AGENT } from '../data/agents';
import {
  approcheDepuisOffre, confianceALArrivee, phraseLevier, repondreAuClub, resumerTermes,
  LEVIER_PAR_ID, type Approche, type Levier, type Reponse,
} from '../lib/negociation';
import {
  TROPHEES,
  TROPHEE_PAR_DIVISION,
  TROPHEE_PAR_COUPE,
  TROPHEE_PAR_INTERNATIONAL,
  MEILLEUR_JOUEUR_PAR_DIVISION,
  estIndividuel,
} from '../data/trophees';
import { decernerHonneurs, noterSaisonIndividuelle, BARRES_HONNEURS } from '../lib/honneurs';
import { nomNation } from '../lib/nations';
import {
  semaine, libelleDate, SEMAINES_PAR_SAISON, estAnneeDeCoupeDuMonde, type Semaine,
} from '../data/calendrier';
import { convocation, convocationU20 } from '../lib/selection';
import { actualiserRassemblements, situationInternationale, ajouterMatchInternational, parcoursInternational } from '../lib/rassemblements';
import { migrerSemaineCalendrier } from '../data/calendrier';
import {
  resoudrePyramide, nomDivision, resoudreToutesDivisions, oublierResultats,
  equilibrerMouvements, setContexteJoueur, resoudreSaisonClub,
} from '../lib/promotion';
// ⚠️ LE MODE MANAGER : ses règles d’accès vivent dans un module pur, sans
// store ni DOM (`lib/manager.ts`). Le store ne fait qu’appliquer ce qu’elles
// disent — c’est ce qui permet au banc d’essai de les mesurer sans navigateur.
import {
  MARGE_AMBITION, PRESTIGE_DEBUT, appliquerVerdict, noteMaximale, objectifDuBoard,
  prestigeDepuisJoueur, salaireManager, verdictDeSaison, CONFIANCE_LICENCIEMENT,
} from '../lib/manager';
import {
  coutAmelioration, gainEntrainement, installationsVierges,
  niveauInstallation, NIVEAU_INSTALLATION_MAX, PLACES_ENTRAINEMENT,
} from '../lib/installations';
import { explorer } from '../lib/recruteurs';
import {
  appliquerActionAcademie, evoluerAcademieManager, proposerProjetJeune,
  tableauDetectionManager, motifObservationJeune,
} from '../lib/formationManager';
import {
  accepterDemandesJoueur, budgetsDuClub, coutPremiereSaison, joueurDejaRecrute,
  negocierAvecJoueur, ouvrirNegociationManager,
  reparerRecrutementsDupliques, salairesEffectif, situationSalariale,
  type LevierRecrutementManager, porteeSportive,
} from '../lib/recrutementManager';
import {
  demandeAGenerer, negocierAvecClub, offresPourVente, ouvrirNegociationClub,
  valeurDeVente, type LevierClubManager,
} from '../lib/vestiaireManager';
import {
  exigerSurApproche, negocierApproche, reactionAuRefus, repondreApproche,
} from '../lib/approchesClubs';
import { avatarPourCompte } from '../lib/avatars';
import { reportsBudgets, renouvelerBudgets, reparerPlafondSalarial } from '../lib/tresorerieManager';
import { objectifsDeSaison } from '../lib/objectifsManager';
import { competitionEffective, setArriveesClubs, setMouvementsClubs } from '../lib/divisions';
import { phaseFinale, type MatchFinal, type PhaseFinale } from '../lib/phaseFinale';
import {
  championnatEnDirect, journeesApres, nombreJournees, graine, rangFinal,
  estAmateur, weekEndsJoues, totalWeekEnds, poulesDe, indexPoule,
  enregistrerResultatJoue, setResultatsJoues, effacerResultatsJoues, jouerRencontre,
} from '../lib/championnat';
import {
  compositionManagerParDefaut, reconcilerCompositionManager, TACTIQUE_MANAGER_DEFAUT, EFFECTIF_MINIMUM,
} from '../lib/compositionManager';
import { risqueDeBlessure, tirerBlessure, messageBlessure, deltasBlessure } from '../lib/blessures';
import { effetsTraits, MAX_TRAITS, TRAIT_PAR_ID } from '../data/traits';
import { nouerRelations, bonusVestiaire, meriteLeBrassard } from '../lib/vestiaire';
import { interviewAleatoire, scenarioDuPool, type JugementMJ } from '../lib/ia';
import { agentDe } from '../data/agents';
import {
  accepterSelectionAvance, avancerSemaineCarriereAvancee, apresResultatCarriereAvancee,
  assurerEtatCarriereAvancee, changerClubCarriereAvancee, creerEtatCarriereAvancee,
  deciderMedical, definirChargeEntrainement, enregistrerMatchSelectionAvance, finSaisonCarriereAvancee,
  indisponiblesCarriereAvancee, negocierContratManagerAvance, observerCible, postulerBancAvance,
  refuserSelectionAvance, repondreDiscussionAvancee, joueurAgent, ouvrirRenegociationJoueur,
  signerRenegociationJoueur,
  type DecisionMedicale, type EtatCarriereAvancee, type PlanChargeHebdo, type ReponseDiscussion,
} from '../lib/carriereAvancee';
import {
  apresDepartJoueurProfonde, configurerDelegationProfonde, definirCapitainesProfonde,
  enregistrerTransfertProfonde, facteurAmbitionRecrutement, repondreDecisionStrategiqueProfonde,
  type DomaineDelegation,
} from '../lib/carriereProfonde';

// Essais marqués par match, par poste : un ailier finit, un pilier non.
const ESSAIS_PAR_MATCH: Record<PosteId, number> = {
  pilier_gauche: 0.05, talonneur: 0.09, pilier_droit: 0.05,
  deuxieme_ligne_g: 0.08, deuxieme_ligne_d: 0.08,
  troisieme_aile_g: 0.13, troisieme_aile_d: 0.13, numero_8: 0.18,
  demi_melee: 0.16, demi_ouverture: 0.12,
  ailier_gauche: 0.42, premier_centre: 0.2, deuxieme_centre: 0.26, ailier_droit: 0.42,
  arriere: 0.3,
};

const ATTRS_KEYS: (keyof Attributs)[] = [
  'vitesse', 'force', 'endurance', 'plaquage',
  'passe', 'jeuAuPied', 'vision', 'mental',
];

function attributsDeBase(poste: PosteId): Attributs {
  const cles = POSTE_PAR_ID[poste].cles;
  const base = {} as Attributs;
  for (const k of ATTRS_KEYS) {
    let v = 26 + Math.floor(Math.random() * 11);
    if (cles.includes(k)) v += 6 + Math.floor(Math.random() * 5);
    base[k] = Math.min(60, v);
  }
  return base;
}

function borne(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

/**
 * LE JEU EST-IL BLOQUÉ FAUTE DE CONTRAT ?
 *
 * ⚠️ CE PRÉDICAT REMPLACE LE PANNEAU « CHOIX DE CARRIÈRE » (décision de
 * l'utilisateur : « il disparaît complètement »). Le blocage ne peut plus être
 * « un panneau est ouvert » — il n'y a plus de panneau. C'est désormais un ÉTAT
 * DE LA FICHE, lisible de partout : contrat épuisé et aucun accord trouvé.
 * La nav le montre, `semaineSuivante` et `avancerJusqua` s'y arrêtent, et
 * `saisonSuivante` refuse de démarrer.
 */
export function contratBloque(j: Joueur | null | undefined): boolean {
  if (!j) return false;
  return (j.contrat?.saisons ?? 1) <= 0 && !j.preAccord;
}

export function noteGlobale(j: Pick<Joueur, 'attributs'>): number {
  const vals = Object.values(j.attributs);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ⚠️ UNE SEULE DÉFINITION DU SCORE DANS TOUT LE PROJET. Le barème vit dans
// `lib/classementMondial.ts` parce que le SERVEUR devra le recalculer à
// l'identique pour valider un envoi : deux exemplaires, c'est la garantie
// d'avoir un jour deux vérités, et un serveur qui refuse des scores légitimes
// (ou en accepte d'impossibles).
export function scoreCarriere(j: Joueur): number {
  return scoreDeLaFiche({
    note: noteGlobale(j),
    reputation: j.reputation,
    saisons: j.saison,
    titres: j.titres,
    essais: j.essais,
    matchs: j.matchsJoues,
  });
}

// APPORT DU JOUEUR AU CHAMPIONNAT DE SON CLUB.
// ⚠️ Il doit être CONSTANT sur toute la saison, sinon le classement affiché en
// direct ne correspondrait plus au classement final (c'est ce qui faisait que
// les montées et descentes semblaient sorties de nulle part). On le calcule
// donc à partir de la note de la saison PRÉCÉDENTE, connue dès la 1ʳᵉ journée :
// un joueur qui sort d'un grand exercice tire son club vers le haut toute
// l'année. Sa saison en cours, elle, pèse sur sa progression et sa note.
export function bonusClubDuJoueur(j: Joueur | null | undefined): number {
  return j?.apportClub ?? 0;
}

// Ce que tu pèses sur les résultats de ton club, FIGÉ pour toute la saison :
// ta saison précédente (est-ce qu'on peut compter sur toi ?) et ton niveau face
// à ton groupe (es-tu au-dessus du lot ?). Recalculé à chaque intersaison et à
// chaque signature — jamais pendant la saison, sinon le classement affiché en
// direct bougerait sous les yeux du joueur.
export function calculerApportClub(j: Joueur): number {
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;
  const groupe = forceEffectif(j.club, j.saison);
  const forme = Math.max(-3, Math.min(3, ((j.noteSaison ?? 5.5) - 5.5) * 1.2));
  const niveau = Math.max(-2.5, Math.min(4.5, (perso - groupe) * 0.16));
  return Math.round((forme + niveau) * 100) / 100;
}

let compteur = 0;
const prefixeSession = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
function idUnique(): string {
  compteur += 1;
  return `e-${prefixeSession}-${compteur}`;
}

/** Le premier message qui rend une approche visible et compréhensible dans L'Ovale. */
function messageInitialApproche(a: Approche, joueur: Joueur | null | undefined): MessageDM {
  const texte = a.prolongation
    ? `${joueur?.nom ?? 'Bonjour'}, ton contrat arrive à son terme et on aimerait te garder. `
      + `Notre proposition : ${resumerTermes(a.offre)}. Dis-nous.`
    : `Bonjour${joueur?.nom ? `, ${joueur.nom}` : ''}. Ici ${a.club} (${a.divisionNom}). `
      + `On suit ce que tu fais et on aimerait t'avoir la saison prochaine. `
      + `Ce qu'on met sur la table : ${resumerTermes(a.offre)}. On en discute ?`;
  return {
    id: idUnique(), pseudo: a.pseudo, de: 'lui', texte,
    saison: a.saison, semaine: a.semaine, creeLe: Date.now(), lu: false,
  };
}

/**
 * Une offre ouverte ne doit jamais exister sans son fil de messages. Cette
 * réparation idempotente couvre notamment les anciennes sauvegardes et les
 * écritures interrompues par un quota de stockage.
 */
function assurerConversationsApproches(
  joueur: Joueur | null | undefined,
  approches: readonly Approche[],
  conversations: Record<string, MessageDM[]>,
): Record<string, MessageDM[]> {
  let resultat = conversations;
  for (const approche of approches) {
    if (approche.etat !== 'ouverte' && approche.etat !== 'accord') continue;
    if ((resultat[approche.pseudo] ?? []).length > 0) continue;
    if (resultat === conversations) resultat = { ...conversations };
    resultat[approche.pseudo] = [messageInitialApproche(approche, joueur)];
  }
  return resultat;
}

/**
 * Retrouve un club même depuis un ancien compte suivi dont le champ `type`
 * est faux ou incomplet. C'est précisément le cas qui laissait certains fils
 * sans réponse : le profil et son pseudo existaient encore, mais la branche
 * « club » n'était jamais atteinte.
 */
/**
 * Ce qu'un contrat rapporte, dit en français.
 *
 * ⚠️ TOUS LES CLUBS NE VERSENT PAS DE SALAIRE (retour de jeu : « certains clubs
 * ne proposent pas de salaires, que des primes »). En dessous de la Nationale 2,
 * et dans les petits championnats étrangers, un club défraie la feuille de match
 * et rien d'autre : écrire « 0 € par saison » serait exact et se lirait comme un
 * bug.
 */
function remuneration(c: { salaire: number; primeMatch?: number }): string {
  if (c.salaire > 0) return `${c.salaire.toLocaleString('fr-FR')} € par saison`;
  return `pas de salaire, ${(c.primeMatch ?? 0).toLocaleString('fr-FR')} € la feuille de match`;
}

function clubDepuisCompte(compte: CompteSuivi): string | null {
  const avatar = compte.avatar.startsWith('club:') ? compte.avatar.slice(5) : '';
  for (const nom of [compte.club, compte.nom, avatar]) {
    if (nom && competitionDuClub(nom)) return nom;
  }
  return null;
}

function motifRefusClub(joueur: Joueur, club: string): string {
  const cible = competitionDuClub(club);
  const actuelle = competitionDuClub(joueur.club);
  const ecart = noteDuClub(club) - cote(joueur);
  if (cible && actuelle && actuelle.niveau - cible.niveau > (joueur.age <= 21 ? 3 : 2)) {
    return t('recrut.refus.palier');
  }
  if (ecart > 1) {
    return t('recrut.refus.niveau');
  }
  return t('recrut.refus.poste');
}

/**
 * Rattrape au chargement les anciens fils terminés par un message du joueur.
 * La correction ne demande donc pas de renvoyer « vous recrutez ? » : le
 * club apporte le refus qui manquait et le dossier devient vraiment suivi.
 */
function reparerSilencesClubs(
  joueur: Joueur,
  comptesSuivis: readonly CompteSuivi[],
  conversations: Record<string, MessageDM[]>,
  dossiers: Record<string, DossierRecrutementClub>,
  approches: readonly Approche[],
): {
  conversations: Record<string, MessageDM[]>;
  dossiers: Record<string, DossierRecrutementClub>;
} {
  let fils = conversations;
  let suivis = dossiers;
  const monde = annuaire(joueur);
  const valeur = cote(joueur);

  for (const [pseudo, fil] of Object.entries(conversations)) {
    if (fil.at(-1)?.de !== 'moi') continue;
    const compte = comptesSuivis.find((c) => c.pseudo === pseudo)
      ?? monde.find((c) => c.pseudo === pseudo);
    const club = compte ? clubDepuisCompte(compte) : null;
    if (!club || club === joueur.club) continue;

    const existante = approches.find((a) =>
      a.club === club && (a.etat === 'ouverte' || a.etat === 'accord'));
    const texte = existante
      ? (existante.etat === 'accord'
          ? t('recrut.accord.maintenu', { club })
          : t('recrut.offre.ouverte'))
      : t('recrut.refus.message', { motif: motifRefusClub(joueur, club) });

    fils = {
      ...fils,
      [pseudo]: [...fil, {
        id: idUnique(), pseudo, de: 'lui', texte, saison: joueur.saison,
        semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
      }],
    };
    if (!existante) {
      suivis = {
        ...suivis,
        [pseudo]: suivis[pseudo] ?? {
          pseudo, club, saisonContact: joueur.saison,
          semaineContact: joueur.semaine ?? 1, coteAuContact: valeur,
          derniereCoteEtudiee: valeur, derniereSaisonEtudiee: joueur.saison,
        },
      };
    }
  }
  return { conversations: fils, dossiers: suivis };
}

export interface CreationInput {
  nom: string;
  poste: PosteId;
  nation: string;
  club: string;
  division: string;
  age: number;
  traits?: string[];
}

// Points d'attributs qu'on peut au maximum gagner via le MJ sur une saison.
// Le gros de la progression doit venir du TERRAIN (lib/progression.ts), pas du
// dialogue avec l'IA — sinon il suffirait d'enchaîner les actions.
export const BUDGET_IA_PAR_SAISON = 4;
/**
 * Ce que le MJ peut faire gagner en ARGENT sur une saison, en années de salaire.
 *
 * ⚠️ IL N'EXISTAIT PAS. Les attributs avaient leur budget de saison depuis
 * toujours ; l'argent n'avait qu'un plafond PAR ACTION (salaire / 3). Comme
 * rien ne limite le NOMBRE d'actions libres écrites dans une saison —
 * `MAX_PAR_SAISON` ne garde que les évènements et les situations —, il
 * suffisait d'en enchaîner : mesuré, 200 actions rapportaient 280 000 € à un
 * joueur payé 4 200 € par an, soit 66 années de salaire.
 *
 * Une demi-année de salaire par saison, c'est une prime exceptionnelle ou un
 * contrat publicitaire : ça existe, ça ne se répète pas toutes les semaines.
 */
export const BUDGET_ARGENT_PAR_SAISON = 0.5;

// ---------------------------------------------------------------------------
// L'AMBIANCE DU SITE
// ---------------------------------------------------------------------------
// On pose l'attribut sur <html> et le CSS fait tout le reste (`index.css`,
// blocs `:root[data-theme=…]`). Aucun composant n'est re-rendu : c'est le
// navigateur qui repeint. Le thème par défaut — le vert pelouse — ne pose
// aucun attribut, pour que `:root` reste la source de vérité.
export function appliquerTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  if (theme === 'vert') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  // La barre d'adresse du téléphone suit la couleur du fond : sans ça, elle
  // reste verte sur un thème rouge, et la découpe se voit.
  const meta = document.querySelector('meta[name="theme-color"]');
  const fonds: Record<Theme, string> = {
    vert: '#08160f',
    bleu: '#060f1c',
    rouge: '#1a0709',
    violet: '#130a23',
    turquoise: '#041716',
    cuivre: '#1b0d06',
    rose: '#190812',
    carbone: '#0c0e12',
  };
  if (meta) meta.setAttribute('content', fonds[theme]);
}

// Fin de carrière : libre à partir de 33 ans, imposée à 44.
// ⚠️ Demande explicite : « limite d'âge à 44 ans ». Elle est désormais VRAIMENT
// appliquée — `saisonSuivante` raccroche d'office quand on l'atteint, là où le
// jeu se contentait d'afficher « dernière ligne droite » sans jamais arrêter.
export const AGE_RETRAITE_LIBRE = 33;
export const AGE_RETRAITE_FORCEE = 44;

export function motifFinDepuisConsequence(type?: ConsequenceDure): MotifFinCarriere {
  if (type === 'deces') return 'deces';
  if (type === 'banRugby') return 'radiation';
  if (type === 'finDeCarriere') return 'blessure';
  return 'autre';
}

function motifFinParDefaut(joueur: Joueur): MotifFinCarriere {
  if (joueur.age >= AGE_RETRAITE_FORCEE) return 'ageLimite';
  if (joueur.blessure?.gravite === 'carriere') {
    return joueur.blessure.nom.toLocaleLowerCase().includes('radiation') ? 'radiation' : 'blessure';
  }
  if ((joueur.contrat?.saisons ?? 1) <= 0) return 'sansClub';
  return 'retraiteChoisie';
}

// ---------------------------------------------------------------------------
// LA RÉCUPÉRATION HEBDOMADAIRE
// ---------------------------------------------------------------------------
// ⚠️ ELLE N'EXISTAIT PAS, ET C'ÉTAIT LE BUG signalé en jeu : « impossible de
// récupérer de la forme, on en perd trop et à la moitié de la saison on est
// à 0 ». Le bilan d'une semaine de match était STRUCTURELLEMENT négatif :
//
//     match regardé  −(3 + minutes/14) ≈ −9   ·   match estimé −(minutes/12) ≈ −6
//     séance de la semaine                −4
//     ────────────────────────────────────────
//     total                        −10 à −13 par semaine de match
//
// …et la seule remontée venait des week-ends SANS match (+6 à +8). Sur les
// ~30 semaines de match d'une saison de Top 14, ça fait −300 pour +90 : le
// joueur touchait le fond avant Noël, et n'en ressortait plus.
//
// ⚠️ CE N'EST PAS UN BONUS FIXE, C'EST UNE CONVERGENCE, et c'est ce qui rend le
// réglage stable. Le corps revient vers une CONDITION DE BASE, d'autant plus
// vite qu'il en est loin — comme dans la réalité. Un bonus fixe aurait le même
// défaut que l'ancien système, à l'envers : trop petit il ne change rien, trop
// grand tout le monde reste à 100 et la forme cesse de vouloir dire quelque
// chose. Ici, l'équilibre se cale tout seul :
//
//   · joueur qui enchaîne les matchs ....... plafonne vers « base − 20 »
//   · joueur qui ne joue pas ............... remonte à sa condition de base
//   · vétéran de 35 ans .................... base plus basse, donc plus fragile
//
/** La condition de base d'un joueur : là où son corps revient au repos. */
export function conditionDeBase(j: Joueur): number {
  // L'endurance et la jeunesse font tout : un ailier de 22 ans à 90 d'endurance
  // se remet d'une semaine à l'autre, un pilier de 35 ans traîne sa fatigue.
  return borne(
    72 + (j.attributs.endurance - 60) * 0.2 - Math.max(0, j.age - 28) * 1.5,
    52, 94,
  );
}

/** Ce que le corps regagne en une semaine, avant l'effort de cette semaine-là. */
export function recuperationHebdo(j: Joueur): number {
  // ⚠️ Un joueur à l'infirmerie ne « récupère » pas sa condition de match : il
  // soigne une blessure. On vise plus bas, sinon on revenait de six semaines
  // d'arrêt plus frais qu'en sortant d'un week-end de repos.
  const cible = conditionDeBase(j) - (j.blessure && j.blessure.semaines > 0 ? 18 : 0);
  // ⚠️ LE TRAIT DE CARACTÈRE ENTRE ENFIN ICI, et c'était un bug muet.
  // `formeParSemaine` était calculé par `effetsTraits()` et **lu nulle part** :
  // « Professionnel » promettait de mieux récupérer et ne récupérait rien de
  // plus, « Fêtard » promettait de le payer physiquement et ne payait rien.
  // Deux traits sur douze annonçaient un effet inexistant — c'est exactement le
  // genre de promesse qui rend un choix de création sans conséquence.
  return Math.max(0, Math.round(
    (cible - j.forme) * 0.45 + 4 + effetsTraits(j.traits).formeParSemaine,
  ));
}

// ---------------------------------------------------------------------------
// UNE SÉANCE D'ENTRAÎNEMENT
// ---------------------------------------------------------------------------
// Isolée pour être rejouable EN LOT : quand on passe la saison d'un bloc (mode
// « saison rapide », ou clic sur la trêve avant la dernière journée), les
// séances hebdomadaires n'étaient tout simplement jamais jouées — la moitié de
// la progression du joueur disparaissait avec le mode de jeu choisi.
// `valeur` est la valeur COURANTE de l'attribut (elle bouge d'une séance à
// l'autre), `forme` la fraîcheur du moment.
function gainDUneSeance(
  age: number, potentiel: number, valeur: number, forme: number, tirage: () => number,
): number {
  const marge = Math.max(0, potentiel - valeur);
  // ⚠️ Aligné sur `potentiel jusqu'à 31` : on travaille encore utilement après
  // 27 ans, ce qui n'était pas le cas (0,65 dès 28 ans).
  const facteurAge = age <= 23 ? 1.4 : age <= 28 ? 1 : age <= 31 ? 0.8 : age <= 35 ? 0.5 : 0.3;
  const fraicheur = Math.max(0.3, forme / 100);
  const chance = Math.min(0.95, (0.25 + marge / 45) * facteurAge * fraicheur);
  return tirage() < chance ? 1 + (tirage() < 0.12 ? 1 : 0) : 0;
}

// Les reconversions proposées quand on raccroche. La plus crédible dépend de
// ce qu'a été la carrière (palmarès, réputation, mental).
export const RECONVERSIONS = [
  { id: 'entraineur', emoji: '📋', nom: 'Entraîneur', desc: 'Tu passes tes diplômes et prends un banc. ⚠️ C’est le SEUL choix qui ouvre une vraie seconde carrière : ton statut de joueur devient ton prestige de départ (lib/manager.ts).' },
  { id: 'consultant', emoji: '🎙️', nom: 'Consultant TV', desc: 'Costume, plateau et analyses du dimanche soir. Ta voix compte encore.' },
  { id: 'agent', emoji: '🤝', nom: 'Agent de joueurs', desc: 'Tu connais les coulisses par cœur : tu défends désormais les jeunes.' },
  { id: 'bar', emoji: '🍺', nom: 'Patron de bar', desc: 'Le troisième mi-temps à vie, au comptoir du club, à raconter les anciens.' },
  { id: 'formateur', emoji: '🧑‍🏫', nom: 'Directeur de centre de formation', desc: 'Tu formes ceux qui te remplaceront. La plus belle des transmissions.' },
];

// Ce que renvoie une négociation de contrat (lot 6) : l'écran s'en sert pour
// faire raconter la scène par l'IA quand une clé est disponible.
export interface ResultatNegociation {
  issue: 'succes' | 'partiel' | 'echec';
  salaire: number;
  club: string;
  agent: string;
}

// Nombre max d'évènements 🎲 et de situations 📖 par saison.
//
// ⚠️ NE GOUVERNE PLUS LE RÉCIT. Depuis que la scène tombe CHAQUE semaine, elle
// passe par `lancerScenario(false)` et n'est pas rationnée — 43 semaines dans un
// compteur calibré pour deux situations par an, ça se serait tu dès la
// troisième. Ce plafond ne s'applique plus qu'aux appels manuels
// (`evenementAleatoire`, `lancerScenario()`), qu'aucun écran ne déclenche
// aujourd'hui : ils restent là pour un futur bouton, pas pour la boucle.
export const MAX_PAR_SAISON = 2;

// Économie volontairement DURE : les Ovas se méritent. Les valeurs "ovas" des
// données (évènements/scénarios) sont fortement réduites à l'encaissement.
function gainOvas(base: number): number {
  return Math.max(1, Math.floor(base / 8));
}

/**
 * CE QUE LES DÉFIS DE LA SEMAINE PEUVENT RAPPORTER EN UNE SAISON.
 *
 * ⚠️ C'EST LE GARDE-FOU DE TOUTE L'ÉCONOMIE, et il vient d'une mesure : trois
 * défis par semaine sur les 43 semaines du calendrier, à 1-2 Ovas pièce, ça
 * faisait ~250 Ovas la saison — donc ~3 000 sur une carrière, quand tout le
 * reste du jeu (succès, trophées, saisons, retraite) en donne moins de 500 à
 * lui tout seul. Les défis payaient à eux seuls six fois le jeu.
 *
 * Demande explicite de l'utilisateur : « il faut que ce soit dur d'obtenir des
 * cosmétiques ; si on fait une bonne carrière avec les achievements on fait
 * facile 4 000-5 000 Ovas, réduis pour que ce soit plus autour des 500 ».
 *
 * Le défi continue d'être VALIDÉ et notifié une fois le plafond atteint — c'est
 * un objectif de semaine, pas seulement une prime — mais il ne verse plus rien,
 * et l'onglet Succès de L'Ovale affiche le compteur pour que ce ne soit jamais
 * une surprise.
 */
export const PLAFOND_OVAS_DEFIS_PAR_SAISON = 10;

/**
 * MÊME GARDE-FOU POUR LES ACTIONS ÉCRITES AU MAÎTRE DU JEU.
 *
 * ⚠️ La deuxième fuite, et elle était invisible pour la même raison : une
 * action rapporte 1 Ova, ce qui semblait dérisoire — sauf que la scène tombe
 * CHAQUE semaine depuis le calendrier réel, soit 43 occasions par saison, donc
 * ~500 Ovas sur une carrière rien qu'en répondant. Autant que tout le reste.
 *
 * Rien ne l'annonce à l'écran (règle du projet : « pas de +X 🪙 dans le journal
 * ni sur les boutons »), donc le plafond ne trahit aucun affichage.
 */
export const PLAFOND_OVAS_ACTIONS_PAR_SAISON = 4;

// Comparaison de noms tolérante (accents, casse, ponctuation).
function normaliserNom(nom: string): string {
  return nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

// Nouvelles publications en tête du fil, sans doublon, taille bornée.
// ⚠️ TES PUBLICATIONS NE S'EFFACENT JAMAIS.
// Le fil était simplement tronqué aux 80 (ou 60) posts les plus récents. Or
// chaque semaine jouée y déverse 8 publications du monde : au bout de dix
// semaines — typiquement le temps d'un changement de club — TES tweets étaient
// poussés dehors et disparaissaient de ton profil. D'où « les posts X se
// suppriment quand on change de club ».
// On sépare donc les deux fils : les tiens (plafonnés à 120, largement de quoi
// tenir une carrière) et ceux du monde (60, c'est de l'actualité).
const MES_POSTS_MAX = 120;
const POSTS_MONDE_MAX = 60;

function limiterPosts(liste: PostSocial[]): PostSocial[] {
  const miens: PostSocial[] = [];
  const monde: PostSocial[] = [];
  for (const p of liste) (p.moi ? miens : monde).push(p);
  const gardes = new Set([
    ...miens.slice(0, MES_POSTS_MAX),
    // Un post du monde sous lequel tu as commenté ou que tu as reposté fait
    // partie de ton histoire : il reste, lui aussi.
    ...monde.filter((p) => p.repostee || p.reponses?.some((r) => r.moi)).slice(0, 40),
    ...monde.slice(0, POSTS_MONDE_MAX),
  ]);
  return liste.filter((p) => gardes.has(p));
}

function fusionner(nouveaux: PostSocial[], existants: PostSocial[]): PostSocial[] {
  const vus = new Set(existants.map((p) => `${p.pseudo}|${p.texte}`));
  const inedits = nouveaux.filter((p) => !vus.has(`${p.pseudo}|${p.texte}`));
  return limiterPosts([...inedits, ...existants]);
}

// Reconstruit un palmarès exploitable depuis les libellés d'une vieille
// sauvegarde : « Bouclier de Brennus (S4) » → { trophee: 'brennus', saison: 4 }.
// Le club n'y figurait pas, il reste donc vide (voir `migrate`).
// ⚠️ EXPORTÉE : l'armoire à trophées (components/ArmoireTrophees) en a besoin
// pour les légendes du Panthéon, qui ne gardent que des LIBELLÉS (« Bouclier de
// Brennus (S4) ») et pas le palmarès structuré — celui-ci n'existe que sur la
// carrière en cours.
export function palmaresDepuisLibelles(titres: string[]): TitreGagne[] {
  const parNom = new Map(Object.values(TROPHEES).map((t) => [t.nom, t.id]));
  const sortie: TitreGagne[] = [];
  for (const libelle of titres) {
    const m = /^(.*?)\s*\(S(\d+)\)$/.exec(libelle);
    if (!m) continue;
    const id = parNom.get(m[1].trim());
    if (!id) continue;
    sortie.push({ trophee: id, nom: m[1].trim(), saison: Number(m[2]), club: '' });
  }
  return sortie;
}

/**
 * L'ardoise disciplinaire d'un match, telle que le moteur la rend
 * (`BilanMatch.discipline`). On la recopie ici plutôt que d'importer le type du
 * moteur : le store est chargé dès l'accueil, le moteur ne l'est qu'à
 * l'ouverture d'un match — et c'est ce qui garde ses 3 500 lignes hors du
 * chunk principal (voir la note sur `moteur/titulaire.ts`).
 */
export interface SanctionDeMatch {
  citation: { semaines: number; motif: string } | null;
  blessure: { nom: string; semaines: number } | null;
  jaunes: number;
  rouges: number;
}

interface GameState {
  ecran: Ecran;
  /**
   * Les écrans déjà ouverts au moins une fois, pour le guide de carrière.
   *
   * ⚠️ C'est la seule façon de cocher « tu as vu l'écran Résultats » sans
   * scripter le tutoriel : le guide LIT ce que le joueur a fait, il ne lui
   * impose pas un parcours (voir `data/guide.ts`).
   */
  ecransVus: string[];
  /** Le guide de carrière a été refermé pour de bon. */
  guideFerme: boolean;
  joueur: Joueur | null;
  journal: EntreeJournal[];
  coins: number;
  /** Collection de cartes commune au compte local, independante des carrieres. */
  collectionSolo: EtatCollectionSolo;
  inventaire: string[];
  skinActif: string;
  /** Articles du vestiaire possédés (cosmétique pur). */
  equipements: string[];
  /** Ce qu'il porte, une pièce par catégorie. */
  equipementActif: Partial<Record<CategorieEquipement, string>>;
  /** Consentement publicitaire — rien ne se charge tant que c'est 'inconnu'. */
  pubConsentement: 'inconnu' | 'oui' | 'non';
  /**
   * LE TUTORIEL A-T-IL DÉJÀ ÉTÉ VU ?
   *
   * ⚠️ Demande explicite : « fais un tuto pour les nouveaux joueurs pour
   * baisser le bounce rate ». Il ne s'ouvre donc QU'UNE FOIS, et seulement pour
   * quelqu'un qui n'a pas encore de carrière : un tutoriel qui revient à chaque
   * visite est exactement ce qui fait fuir. Persisté avec le reste.
   */
  tutoVu: boolean;
  /**
   * La notice de la manette de match a déjà été vue.
   *
   * ⚠️ ELLE EST SÉPARÉE DE `tutoVu`, et ce n'est pas de la coquetterie : le
   * tutoriel d'accueil explique le JEU (« tu es un joueur, pas un manager »),
   * celui-ci explique les COMMANDES du direct — joystick à gauche, gros bouton
   * à droite, ralenti sur tes moments. Quelqu'un qui a passé l'accueil il y a
   * trois saisons découvre quand même la manette à son premier match piloté.
   * Il s'affiche UNE FOIS et se referme au premier geste : un tutoriel qui
   * revient est exactement ce qui fait fermer l'onglet.
   */
  tutoMatchVu: boolean;
  /**
   * Les touches du match réassignées par le joueur.
   *
  /**
   * Les archétypes de caractère débloqués en Ovas (`data/traits.ts`).
   *
   * ⚠️ ON ACHÈTE DU CHOIX, PAS DE LA PUISSANCE. `MAX_TRAITS` reste à deux :
   * un joueur qui a tout débloqué en porte autant qu'un joueur qui n'a rien
   * acheté. Ce que les Ovas ouvrent, ce sont des façons de jouer en plus —
   * et chaque archétype coûte quelque chose autant qu'il apporte
   * (`scripts/verifTraits.ts` échoue si ce n'est plus vrai).
   *
   * ⚠️ Persisté HORS de la fiche du joueur : un trait débloqué appartient au
   * compte, pas à la carrière. On ne rachète pas ses archétypes à chaque fois
   * qu'on raccroche.
   */
  traitsDebloques: string[];
  /**
   * L'IDENTITÉ DE CETTE INSTALLATION AU CLASSEMENT MONDIAL.
   *
   * ⚠️ CORRECTION D'UN BUG SIGNALÉ EN JEU : « si on a le même pseudo qu'un
   * joueur dans le classement, notre classement apparaît pas ». La table était
   * clé par le PSEUDO, et l'écriture gardée par « le score ne recule pas » : le
   * second joueur à porter un pseudo n'écrivait donc rien du tout, en silence.
   * C'est cette clé-ci qui identifie désormais la ligne (voir
   * `FicheCarriere.cle` et `serveur/schema-vercel.sql`).
   *
   * ⚠️ Persistée HORS de la fiche du joueur, comme `traitsDebloques` : elle
   * appartient à l'installation, pas à la carrière. Deux carrières successives
   * partagent donc une ligne, et c'est voulu — le classement garde le meilleur
   * score d'un joueur, il ne liste pas toutes ses tentatives.
   */
  cleClassement: string;
  /**
   * LE PSEUDO SOUS LEQUEL ON FIGURE AU CLASSEMENT MONDIAL.
   *
   * Demande explicite : « faire un système de pseudo ». Jusqu'ici la fiche
   * partait sous `j.pseudo ?? j.nom`, c'est-à-dire sous l'IDENTIFIANT @ DE
   * L'OVALE s'il existait, sinon sous le nom du personnage. Deux surprises pour
   * le joueur : il figurait sous un nom qu'il n'avait pas choisi pour ça, et il
   * changeait de nom au classement en changeant de carrière.
   *
   * ⚠️ IL APPARTIENT À L'INSTALLATION, PAS À LA CARRIÈRE — comme
   * `cleClassement` et `traitsDebloques`. On garde donc son nom de classement
   * quand on raccroche et qu'on repart pour une nouvelle carrière : c'est la
   * même personne qui joue, et c'est la même ligne du classement.
   *
   * ⚠️ VIDE = LE NOM DU PERSONNAGE. Pas de valeur par défaut inventée : tant
   * qu'on n'a rien choisi, on figure sous le nom qu'on s'est donné à la
   * création, exactement comme avant. Aucune sauvegarde ne change de nom au
   * chargement.
   */
  pseudoClassement: string;
  /**
   * L'identifiant de MA ligne dans le tableau mondial, tel que le serveur l'a
   * renvoyé au dernier envoi réussi. Nul tant qu'aucun envoi n'a abouti.
   *
   * ⚠️ IL FAUT BIEN CELUI-LÀ, ET PAS LE PSEUDO : c'est tout l'objet du
   * correctif. Deux lignes peuvent porter le même pseudo, et surligner
   * « la mienne » d'après le nom affiché reviendrait à désigner celle d'un
   * inconnu une fois sur deux.
   */
  rangMondialId: number | null;
  /**
   * Le meilleur score DÉJÀ ACCEPTÉ par le serveur, ou 0.
   *
   * ⚠️ IL SERT DE FREIN, PAS DE MÉMOIRE. La carrière est publiée en cours de
   * route (plus seulement à la fin d’une saison), et il faut bien un garde-fou
   * pour ne pas réveiller le serveur à chaque semaine jouée. On ne renvoie que
   * si le score a PROGRESSÉ — c’est-à-dire si la carrière a réellement changé.
   *
   * ⚠️ ÉCRIT UNIQUEMENT SUR UN ENVOI ACCEPTÉ. Le noter avant la réponse
   * enfermerait un joueur hors ligne : son premier envoi échouerait, le frein
   * se refermerait, et sa carrière n’entrerait jamais.
   */
  dernierScoreEnvoye: number;
  /** Compteur des pubs récompensées (quota journalier et délai d'attente). */
  pubs: EtatPubs;
  pantheon: LegendeSauvegardee[];
  /** Épilogue à lire avant l'entrée effective dans le Hall des légendes. */
  finCarriere: FinCarriere | null;
  scenarioActif: Scenario | null;
  // ═══ LE RÉCIT DE LA SEMAINE ═════════════════════════════════════════════
  // ⚠️ Demande explicite : « au lieu d'avoir des boutons chaque semaine, l'IA
  // sort un évènement ; le joueur répond en écrivant et l'IA juge ». D'où deux
  // champs et non un : `attenteEvenement` dit qu'il FAUT en poser un (c'est le
  // store qui le sait, à la fin de `semaineSuivante`), `evenementHebdo` est
  // celui qui attend une réponse (c'est l'écran qui l'a fabriqué, parce que
  // la génération est asynchrone et que le store, lui, est synchrone).
  attenteEvenement: boolean;
  /**
   * Une avance rapide est en cours (`avancerJusqua`). Non persisté — c'est un
   * état de la seconde qui passe, pas de la sauvegarde.
   * ⚠️ Il sert à NE PAS demander une scène du MJ à chaque semaine sautée : sans
   * lui, un saut de quinze semaines déclenchait quinze générations et empilait
   * quinze questions sans réponse.
   */
  avanceRapide: boolean;
  evenementHebdo: EvenementHebdo | null;
  /** Titres déjà posés cette saison : envoyés à l'IA pour qu'elle se répète moins. */
  evenementsVus: string[];
  compteurs: {
    evenements: number; situations: number; gainsIA: number; gainsMatchs?: number;
    /** Ovas déjà versées par les défis cette saison (`PLAFOND_OVAS_DEFIS_PAR_SAISON`). */
    ovasDefis?: number;
    /** Idem pour les actions au MJ (`PLAFOND_OVAS_ACTIONS_PAR_SAISON`). */
    ovasActions?: number;
    /**
     * Augmentations de salaire accordées par le MJ cette saison.
     * ⚠️ UNE SEULE (`AUGMENTATIONS_PAR_SAISON`). Le MJ juge 43 semaines par
     * saison : sans ce compteur, un joueur bavard doublait son salaire avant
     * Noël, et toute l'économie (cote, offres, plafond d'argent) partait avec.
     */
    augmentations?: number;
    /** Primes déjà versées par le MJ cette saison, en € (`PART_PRIMES_PAR_SAISON`). */
    primesIA?: number;
    /** Argent déjà accordé par le MJ cette saison (voir BUDGET_ARGENT_PAR_SAISON). */
    gainsArgentIA?: number;
  };
  tropheesEnAttente: string[]; // file des trophées à afficher en 3D
  /**
   * LES APPROCHES DE CLUBS, en cours ou closes (`lib/negociation.ts`).
   * ⚠️ Elles remplacent `offres` / `offresOuvertes` : le panneau « Choix de
   * carrière » a été supprimé, tout se négocie en message privé sur L'Ovale.
   */
  approches: Approche[];
  /** Clubs qui ont refusé aujourd'hui mais gardent le joueur sur leur liste. */
  dossiersRecrutement: Record<string, DossierRecrutementClub>;
  // ⚠️ L'AMBIANCE DU SITE (demande explicite). Elle ne touche QUE la rampe de
  // fond (les variables `--pelouse-*` d'index.css) : l'or, le cuir et la craie
  // ne bougent pas, sinon on perdrait l'identité « stade nocturne » du jeu.
  theme: Theme;
  // La langue de TOUT : l'interface (data/textes.ts) et le contenu écrit par
  // l'IA (consigneDeLangue, ajoutée à chaque prompt).
  langue: Langue;
  /** Une langue choisie dans les réglages prime toujours sur la détection IP. */
  langueManuelle: boolean;
  mouvementsClubs: Record<string, string>; // club → division après montées/descentes
  /**
   * club → saison où il est ARRIVÉ dans sa division actuelle.
   *
   * ⚠️ INDISPENSABLE À LA COUPE D'EUROPE. La qualification se calcule sur le
   * classement de la saison passée ; sans savoir depuis quand un club est là,
   * un promu se voyait classé dans un championnat qu'il n'avait pas joué et
   * pouvait décrocher une Champions Cup. Voir `etaitDansLaDivision`.
   */
  arriveesClubs: Record<string, number>;
  // Lot 7 — réseau social « L'Ovale », succès et défis
  posts: PostSocial[]; // fil : publications du joueur ET du monde (récentes en tête)
  filSemaine: string; // « saison#semaine » de la dernière fournée générée
  notifsSocial: NotifSocial[];
  comptesSuivis: CompteSuivi[];
  suggestionsComptes: CompteSuivi[];
  conversations: Record<string, MessageDM[]>; // pseudo → fil de messages
  transfertsSociaux: TransfertAnnonce[]; // annonces appliquées au monde du jeu
  relationsSociales: Record<string, number>; // pseudo → relation (−100..100)
  succesDebloques: SuccesDebloques; // id → saison où il est tombé
  defis: { cle: string; faits: string[] }; // défis de la semaine en cours
  /** L'IA est-elle autorisée par le joueur ? (⚙️ Réglages) */
  iaActivee: boolean;
  modele: string;
  tenorKey: string; // clé Tenor (facultative) pour les GIFs dans les posts
  /** Clé Groq personnelle (facultative) : elle prend le pas sur celle du site. */
  groqKey: string;
  // navigation & réglages
  /**
   * ⚠️ SUR QUEL ONGLET OUVRIR 𝕏 L’OVALE — un ordre donné à l’écran, pas un
   * état de la partie (donc NON persisté, comme `attenteEvenement`).
   *
   * Retour de jeu : « lorsque notre joueur est en fin de contrat, ouvre 𝕏
   * sur les messages avec les propositions des autres clubs ou la
   * prolongation ». Les clubs écrivaient déjà — en message privé, derrière
   * un badge bleu sur un onglet, sur un réseau social qu’on n’a aucune
   * raison d’ouvrir ce jour-là. Le seul signal d’une carrière qui bascule
   * était une pastille.
   */
  // ═══ LE MODE MANAGER ═══════════════════════════════════════════════════
  /**
   * La carrière d’entraîneur en cours.
   *
   * ⚠️ ELLE VIT À CÔTÉ DE `joueur`, PAS À SA PLACE. Une reconversion garde le
   * passé de joueur dans `Manager.passeJoueur` — mais `joueur` lui-même passe
   * à `null`, comme à n’importe quelle retraite : on ne joue plus. Les deux
   * champs pleins en même temps signifieraient deux carrières simultanées, et
   * tout l’écran de carrière aurait à choisir laquelle afficher.
   */
  manager: Manager | null;
  /**
   * La carrière de joueur qui vient de s’achever, en attente d’un banc.
   *
   * ⚠️ NON PERSISTÉE, comme `attenteEvenement` : c’est un ordre donné à
   * l’écran de création, pas un état de la partie. La légende est DÉJÀ au
   * Hall et DÉJÀ envoyée au classement — si le joueur ferme l’onglet ici, il
   * ne perd rien, il repart d’une création d’entraîneur ordinaire.
   */
  reconversionManager: LegendeSauvegardee | null;
  creerManager: (m: {
    nom: string; nation: string; club: string; age?: number;
    libre?: boolean; depuis?: LegendeSauvegardee;
  }) => void;
  /** La fin de saison : le board juge, le prestige bouge, on garde ou on part. */
  saisonManager: () => void;
  /** Une semaine de calendrier passe. */
  semaineManager: () => void;
  /** Trancher la scène de la semaine avant de pouvoir continuer. */
  repondreDecisionManager: (decisionId: string, choixId: string) => void;
  /** Modifier la feuille de match et le plan collectif depuis le banc. */
  definirCompositionManager: (composition: CompositionManager) => void;
  definirTactiqueManager: (tactique: TactiqueManager) => void;
  enregistrerResultatManager: (resultat: ResultatMatchManager) => void;
  /** Ouvrir puis mener une négociation avec un joueur dans L'Ovale. */
  contacterClubManager: (cible: CibleRecrutementManager) => void;
  negocierClubManager: (id: string, levier: LevierClubManager) => void;
  contacterJoueurManager: (cible: CibleRecrutementManager) => void;
  negocierJoueurManager: (id: string, levier: LevierRecrutementManager) => void;
  accepterDemandesJoueurManager: (id: string) => void;
  signerJoueurManager: (id: string) => void;
  rompreNegociationManager: (id: string) => void;
  repondreDemandeManager: (id: string, accepter: boolean) => void;
  mettreEnVenteManager: (joueurId: string) => void;
  retirerVenteManager: (joueurId: string) => void;
  accepterOffreVenteManager: (joueurId: string, offreId: string) => void;
  /**
   * Payer une marche d'une structure du club.
   *
   * ⚠️ ELLE APPARTIENT AU CLUB, pas à l'entraîneur : elle reste derrière lui
   * quand il part, et il la retrouve s'il revient.
   */
  ameliorerInstallation: (type: TypeInstallation) => void;
  /** Mettre un joueur au programme individuel, ou l'en retirer. */
  basculerEntrainement: (nom: string) => void;
  /** Investir un déplacement ou un entretien dans un rapport jeune. */
  observerJeuneManager: (jeuneId: string, entretien?: boolean) => void;
  /** Présenter le projet du centre ; le jeune reste libre de choisir. */
  proposerProjetJeuneManager: (jeuneId: string) => void;
  /** U18, Espoirs, prêt, seniors ou libération. */
  gererAcademicienManager: (jeuneId: string, action: ActionAcademieManager) => void;
  /** Définir le programme individuel d'un joueur du centre. */
  definirObjectifJeuneManager: (jeuneId: string, objectif: ObjectifJeuneManager) => void;
  /** Associer un cadre du groupe senior au jeune. */
  definirMentorJeuneManager: (jeuneId: string, mentorId?: string) => void;
  /** Prendre un banc (premier contrat, ou après un licenciement). */
  signerBanc: (club: string) => void;
  /** Répondre à une discussion et, le cas échéant, enregistrer une promesse. */
  repondreDiscussionAvancee: (id: string, reponse: ReponseDiscussion) => void;
  deciderMedicalManager: (id: string, decision: Exclude<DecisionMedicale, 'attente'>) => void;
  definirChargeEntrainementManager: (axe: keyof PlanChargeHebdo, niveau: PlanChargeHebdo[keyof PlanChargeHebdo]) => void;
  ouvrirRenegociationJoueurManager: (joueurId: string) => void;
  /** Répondre à un club venu chercher un joueur qu'on n'a pas mis en vente. */
  repondreApprocheManager: (id: string, reponse: ReponseApprocheManager) => void;
  /** Une marche de négociation face à l'acheteur, du côté vendeur. */
  negocierApprocheManager: (id: string, levier: LevierApprocheManager) => void;
  /** Fixer soi-même le montant réclamé pour libérer le joueur. */
  exigerSurApprocheManager: (id: string, montant: number) => void;
  /** Encaisser une approche conclue. Interne : appelée par les deux au-dessus. */
  conclureApprocheInterne: (approche: ApprocheClubManager, avancee: EtatCarriereAvancee) => void;
  observerCibleManager: (cible: CibleRecrutementManager) => void;
  postulerBancManager: (club: string) => void;
  negocierContratManager: () => void;
  demissionnerManager: () => void;
  accepterOffreBancManager: (id: string) => void;
  repondreSelectionManager: (accepter: boolean) => void;
  enregistrerMatchSelectionManager: (scorePour: number, scoreContre: number) => void;
  configurerDelegationManager: (domaine: DomaineDelegation, delegue: boolean) => void;
  definirHierarchieCapitainesManager: (capitaineId: string, viceCapitaineId: string, troisiemeCapitaineId: string) => void;
  repondreDecisionStrategiqueManager: (decisionId: string, choixId: string) => void;
  /** Raccrocher : la carrière part au Hall et au classement. */
  quitterBanc: () => void;
  /**
   * Quel groupe l’écran Effectif doit ouvrir : son club, ou sa sélection.
   *
   * ⚠️ NON PERSISTÉ, comme `ouvrirSocialSur` : c’est un ordre donné à un
   * écran au moment où on l’ouvre, pas un état de la partie. L’écran garde
   * ses deux onglets — ceci ne fait que choisir celui qui s’affiche en
   * arrivant.
   */
  ouvrirEffectifSur: 'club' | 'selection' | null;
  viserEffectif: (quoi: 'club' | 'selection') => void;
  consommerViseeEffectif: () => void;
  ouvrirSocialSur: 'messages' | null;
  conversationSocialeCible: string | null;
  ouvrirMessagesOvale: () => void;
  /** Rattrape les anciens messages adressés à un club et restés sans réponse. */
  reparerSilencesClubs: () => void;
  ouvrirDiscussionOvale: (pseudo: string) => void;
  consommerOuvertureSociale: () => void;
  consommerConversationSocialeCible: () => void;
  setEcran: (e: Ecran) => void;
  setIAActivee: (active: boolean) => void;
  setModele: (m: string) => void;
  setTenorKey: (k: string) => void;
  setGroqKey: (k: string) => void;
  // carrière
  creerJoueur: (input: CreationInput) => void;
  ajouterEntree: (e: Omit<EntreeJournal, 'id' | 'saison'>) => void;
  appliquerReponse: (r: ReponseMJ, actionJoueur: string) => void;
  saisonSuivante: () => void;
  semaineSuivante: () => void;
  /**
   * Avance jusqu'à cette semaine du calendrier EN JOUANT tout ce qu'il y a
   * entre les deux. Renvoie ce qui a réellement été joué et pourquoi on s'est
   * arrêté — l'écran s'en sert pour le dire au joueur.
   */
  avancerJusqua: (numeroSemaine: number) => {
    semaines: number;
    arret: 'arrive' | 'question' | 'saison' | 'contrat' | 'fin';
  };
  /**
   * La même chose sur un banc. Retour de jeu : « rajoute qu'on puisse simuler
   * les semaines comme dans la carrière joueur ».
   *
   * ⚠️ ELLE NE PEUT PAS ÊTRE `avancerJusqua` AVEC UN `if`. Les deux carrières
   * s'arrêtent sur des choses différentes — le joueur sur une scène du MJ et
   * sur son contrat, l'entraîneur sur une DÉCISION du board et sur un MATCH
   * qu'il doit coacher. Un motif d'arrêt commun aurait obligé à mentir dans un
   * des deux cas, et c'est précisément ce que l'écran affiche au joueur.
   */
  avancerJusquaManager: (numeroSemaine: number, deleguerMatchs?: boolean) => {
    semaines: number;
    arret: 'arrive' | 'decision' | 'match' | 'saison' | 'sansBanc' | 'approche';
  };
  setTheme: (t: Theme) => void;
  setLangue: (l: Langue) => void;
  appliquerLangueAutomatique: (l: Langue) => void;
  entrainer: (attribut: keyof Attributs) => void;
  // Le secteur travaillé chaque semaine, modifiable à tout moment.
  choisirFocus: (attribut: keyof Attributs) => void;
  evenementAleatoire: () => void;
  /** @param compter false pour le récit hebdomadaire, qui n'est pas rationné. */
  lancerScenario: (compter?: boolean) => void;
  // Lot 6 — boucle unifiée : une situation posée, d'où qu'elle vienne (pool ou IA)
  poserSituation: (sc: Scenario, compter?: boolean) => void;
  resoudreChoix: (index: number) => void;
  // ═══ L'ÉVÈNEMENT DE LA SEMAINE ═══════════════════════════════════════════
  /** L'écran a obtenu une scène de l'IA locale : on la pose et on attend la réponse écrite. */
  poserEvenementHebdo: (evt: EvenementHebdo) => void;
  /** Le MJ a jugé la réponse écrite : on l'applique (deltas, marché, conséquence dure). */
  appliquerJugement: (jugement: JugementMJ, reponse: string) => void;
  /** Pas de clé, ou l'IA a flanché : on renonce à la scène de cette semaine. */
  abandonnerEvenement: () => void;
  // Lot 6 — agent et négociation de contrat
  /** Signe avec un agent. Renvoie false s'il a décliné (tu n'es pas à son niveau). */
  choisirAgent: (id: string) => boolean;
  /** Intersaison : un meilleur agent te démarche, ou le tien te lâche. */
  mouvementAgents: () => void;
  prendreRetraite: (
    reconversion?: string, motif?: MotifFinCarriere, detail?: string,
  ) => void;
  /**
   * Referme l'épilogue.
   *
   * ⚠️ LA DESTINATION EST DEVENUE UN PARAMÈTRE, et c'était le chaînon manquant
   * du « relais » demandé (« faire le relais en fin de carrière joueur, le
   * parcours entraîneur »). Elle était figée à la création de l'épilogue,
   * d'après la reconversion cochée AVANT de raccrocher — or on ne coche cette
   * liste qu'en prenant sa retraite volontairement. Une carrière arrêtée par
   * une blessure, par la limite d'âge ou faute de club n'avait donc jamais
   * accès au banc, quoi qu'ait voulu le joueur.
   */
  continuerFinCarriere: (destination?: 'pantheon' | 'manager') => void;
  fermerTrophee: () => void;
  reinitialiser: () => void;
  // marché des transferts — tout passe par les messages privés de L'Ovale
  susciterApproches: (maximum?: number, demande?: boolean, clubCible?: string) => number;
  /** Réétudie les candidatures conservées après une progression ou une intersaison. */
  examinerDossiersRecrutement: () => number;
  repondreApproche: (id: string, levier: Levier) => Reponse | null;
  accepterApproche: (id: string) => void;
  refuserApproche: (id: string) => void;
  appliquerPreAccord: () => void;
  demanderTransfert: () => void;
  /** Après un licenciement : ouvre le marché tout de suite, ou clôt la carrière. */
  retrouverUnClub: () => void;
  // fin de carrière
  prendreMentorat: () => void;
  // lot 7 — réseau social, succès et défis
  publier: (texte: string, ton: string, media?: PostSocial['media']) => Promise<void>;
  // L'Ovale piloté par l'IA : le fil, les comptes suivis, les messages privés
  rafraichirFil: () => Promise<void>;
  chargerSuggestions: () => Promise<void>;
  suivreCompte: (c: CompteSuivi) => void;
  nePlusSuivre: (pseudo: string) => void;
  envoyerMessage: (pseudo: string, texte: string) => Promise<void>;
  lireConversation: (pseudo: string) => void;
  appliquerAnnonce: (post: PostSocial) => void;
  // Le fil suit le CALENDRIER : une fournée de publications par semaine jouée.
  vivreSemaineSociale: () => void;
  repondreAuPost: (id: string, texte: string) => Promise<void>;
  reposter: (id: string) => void;
  majProfilSocial: (p: ProfilSocial) => void;
  chargementSocial: boolean;
  erreurSocial: string | null;
  aimerPost: (id: string) => void;
  marquerNotifsLues: () => void;
  verifierSucces: () => void;
  signalerDefi: (evenement: EvenementDefi) => void;
  /** Une blessure de gravité `carriere` arrête vraiment la carrière. */
  raccrocherSurBlessure: () => void;
  /**
   * ⚖️ CE QUE LA COMMISSION RETIENT DU MATCH. Appelée par `MatchLive` à la
   * sirène, juste après `enregistrerMatchVecu` : carton rouge, coup de poing
   * relevé sur les images, blessure prise dans une bagarre. C'est le seul
   * chemin par lequel la discipline du terrain devient une conséquence de
   * carrière (voir `lib/moteur/bagarre.ts`).
   */
  appliquerSanctionMatch: (sanction: SanctionDeMatch) => void;
  // Les VRAIES statistiques du match regardé en direct, versées dans la saison.
  // `contexte` porte le résultat de la rencontre : c'est lui qui permet à la
  // feuille de match d'être la SEULE entrée du journal pour ce week-end.
  enregistrerMatchVecu: (
    // ⚠️ LA FEUILLE COMPLÈTE, pas un extrait. C'est `StatsMatchJoueur`
    // (moteur/apresMatch.ts) : la partager plutôt que d'en recopier une version
    // tronquée était le vrai correctif — l'ancienne signature s'arrêtait aux
    // essais et aux plaquages, si bien que la mêlée, la touche, les offloads et
    // les passes décisives du joueur humain n'arrivaient jamais jusqu'ici.
    stats: StatsMatchJoueur,
    contexte?: {
      adversaire: string; scorePour: number; scoreContre: number;
      domicile: boolean; libelle: string;
    },
  ) => void;
  matchRegarde: string; // « saison#semaine » du dernier match suivi en direct
  // Situations déjà vécues cette carrière : on ne repropose pas la même.
  situationsVues: string[];
  // ⚠️ LES VRAIES STATISTIQUES DE LA POULE. Le moteur rejoue en fond TOUTES les
  // affiches de la journée (sans rendu) : le classement des joueurs n'est plus
  // une estimation, ce sont les chiffres des matchs réellement simulés.
  // Clé : « division#saison » → « club|nom » → cumul.
  statsReelles: Record<string, Record<string, LigneReelle>>;
  journeesReelles: Record<string, number>;
  /**
   * Rejoue en fond la journée de la semaine QUI VIENT D’ÊTRE JOUÉE.
   *
   * ⚠️ LE NUMÉRO DE SEMAINE EST UN PARAMÈTRE, ET IL DOIT LE RESTER. Cette
   * fonction est appelée depuis `semaineSuivante`, APRÈS que la fiche du
   * joueur soit passée à `numero + 1` : lire `joueur.semaine` revenait donc à
   * rejouer la journée SUIVANTE, celle qui n’a pas encore eu lieu.
   */
  simulerStatsJournee: (semaineJouee?: number) => Promise<void>;
  // boutique
  acheterSkin: (id: string) => boolean;
  /** Debite les Ovas du compte et valide un tirage de collection en une operation. */
  acheterPackCollectionSolo: (prix: number, tirer: (etat: EtatCollectionSolo) => ResultatPackSolo) => ResultatPackSolo | null;
  choisirSkin: (id: string) => void;
  acheterEquipement: (id: string) => boolean;
  /** Débloque un archétype de caractère contre des Ovas. */
  debloquerTrait: (id: string) => boolean;
  /** Choisir son nom au classement mondial. Vide = le nom du personnage. */
  setPseudoClassement: (p: string) => void;
  /**
   * Publie la carrière EN COURS au classement mondial.
   *
   * @param force ignore les freins (fin de saison, retraite).
   */
  publierAuClassement: (force?: boolean) => void;
  /** Débloque un cosmétique « par pub » une fois la pub regardée. */
  debloquerParPub: (id: string) => boolean;
  basculerEquipement: (id: string) => void;
  setPubConsentement: (choix: 'oui' | 'non') => void;
  setTutoVu: (vu: boolean) => void;
  setTutoMatchVu: (vu: boolean) => void;
  /** Referme le guide de carrière définitivement. */
  fermerGuide: () => void;
  /** Crédite la récompense d'une pub REGARDÉE JUSQU'AU BOUT. */
  encaisserPub: () => number;
  // ⚠️ `acheterBoost` a été supprimé : la boutique ne vend plus de bonus
  // d'attributs (demande explicite). Voir `src/data/boutique.ts`.
}

/**
 * Retient l'identifiant de MA ligne au classement mondial, s'il est revenu.
 *
 * ⚠️ ON NE TOUCHE À RIEN QUAND LE SERVEUR N'EN DONNE PAS. Une base restée à un
 * schéma antérieur, un serveur en panne ou une absence de réseau ne doivent pas
 * effacer l'identifiant déjà connu : le joueur perdrait le surlignage de sa
 * propre ligne pour une raison qui n'a rien à voir avec lui.
 */
/**
 * Le plancher entre deux envois automatiques.
 *
 * ⚠️ CE N’EST PAS UN CHIFFRE EN L’AIR : IL EST CALCULÉ SUR LE DÉBIT DU
 * SERVEUR. `api/classement.ts` accepte `PAR_HEURE` envois par appareil ; on se
 * laisse donc une heure divisée par ce nombre. Publier plus vite, c’est se
 * faire jeter par son propre débit — et le joueur honnête récolterait des 429
 * pendant que sa carrière n’entre pas.
 *
 * ⚠️ ET LES DEUX VALEURS DOIVENT BOUGER ENSEMBLE. Tripler le débit du serveur
 * sans toucher à ce plancher n’aurait RIEN changé pour le joueur : c’est lui
 * qui limitait la cadence, pas le serveur. Demande explicite : « augmente la
 * limite de requêtes par heure, c’est pas assez ». 6/h et dix minutes sont
 * donc devenus 18/h et trois minutes vingt.
 */
const ENVOIS_PAR_HEURE = 18; // ⚠️ doit rester égal à PAR_HEURE (api/classement.ts)
const DELAI_ENVOI = Math.round((60 / ENVOIS_PAR_HEURE) * 60 * 1000);

/**
 * Dernier envoi tenté, en horloge murale. Volontairement HORS de la sauvegarde :
 * une nouvelle session a le droit de publier tout de suite.
 */
let dernierEnvoiLe = 0;

function retenirMaLigne(poser: (p: Partial<GameState>) => void) {
  return (r: { id?: number }) => {
    if (typeof r?.id === 'number' && Number.isFinite(r.id)) poser({ rangMondialId: r.id });
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ecran: 'accueil',
      joueur: null,
      journal: [],
      coins: 0,
      collectionSolo: chargerAncienneCollectionSolo(),
      inventaire: ['classique'],
      skinActif: 'classique',
      equipements: [],
      equipementActif: {},
      pubConsentement: 'inconnu',
      tutoVu: false,
      tutoMatchVu: false,
      traitsDebloques: [],
      // Tirée au premier lancement, puis persistée : elle ne change plus.
      cleClassement: cleAleatoire(),
      pseudoClassement: '',
      rangMondialId: null,
      dernierScoreEnvoye: 0,
      pubs: ETAT_PUBS_VIDE,
      pantheon: [],
      finCarriere: null,
      scenarioActif: null,
      attenteEvenement: false,
      avanceRapide: false,
      evenementHebdo: null,
      evenementsVus: [],
      ecransVus: [],
      guideFerme: false,
      compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsArgentIA: 0, gainsMatchs: 0, ovasDefis: 0, ovasActions: 0, augmentations: 0, primesIA: 0 },
      tropheesEnAttente: [],
      approches: [],
      dossiersRecrutement: {},
      theme: 'vert',
      langue: langueDuNavigateur(LANGUE_DE_REPLI),
      langueManuelle: false,
      mouvementsClubs: {}, arriveesClubs: {},
      posts: [],
      filSemaine: '',
      matchRegarde: '',
      situationsVues: [],
      statsReelles: {},
      journeesReelles: {},
      notifsSocial: [],
      comptesSuivis: [],
      suggestionsComptes: [],
      conversations: {},
      transfertsSociaux: [],
      relationsSociales: {},
      chargementSocial: false,
      erreurSocial: null,
      succesDebloques: {},
      defis: { cle: '', faits: [] },
      // ⚠️ ACTIVE PAR DÉFAUT, ET ÇA NE COÛTE RIEN AU JOUEUR : la clé du site est
      // embarquée, il n'y a plus rien à télécharger ni à saisir. Le réglage ne
      // sert qu'à ceux qui préfèrent le jeu entièrement pré-écrit.
      iaActivee: true,
      tenorKey: '',
      groqKey: '',
      modele: MODELE_DEFAUT,

      manager: null,
      reconversionManager: null,
      ouvrirEffectifSur: null,
      viserEffectif: (quoi) => set({ ouvrirEffectifSur: quoi }),
      consommerViseeEffectif: () => set({ ouvrirEffectifSur: null }),
      ouvrirSocialSur: null,
      conversationSocialeCible: null,
      ouvrirMessagesOvale: () => set((s) => {
        const dansCarriereManager = !!s.manager && !s.joueur;
        const cible = dansCarriereManager
          ? [...(s.manager?.demandes ?? []), ...(s.manager?.negociations ?? []),
              ...(s.manager?.negociationsClubs ?? [])]
              .reverse()
              .find((d) => d.etat === 'ouverte' || d.etat === 'accord')?.pseudo ?? null
          : s.approches.find((a) => a.etat === 'ouverte')?.pseudo ?? null;
        return {
          // Le joueur ouvre l'écran social complet. Le manager reste dans sa
          // carrière : son L'Ovale est un onglet du bureau, avec la même
          // messagerie et les mêmes négociations.
          ecran: dansCarriereManager ? 'manager' : 'social',
          ouvrirSocialSur: 'messages',
          conversationSocialeCible: cible,
          conversations: assurerConversationsApproches(s.joueur, s.approches, s.conversations),
          ecransVus: s.ecransVus.includes('social') ? s.ecransVus : [...s.ecransVus, 'social'],
        };
      }),
      reparerSilencesClubs: () => {
        const s = get();
        if (!s.joueur) return;
        const repare = reparerSilencesClubs(
          s.joueur, s.comptesSuivis, s.conversations, s.dossiersRecrutement, s.approches,
        );
        if (repare.conversations !== s.conversations || repare.dossiers !== s.dossiersRecrutement) {
          set({ conversations: repare.conversations, dossiersRecrutement: repare.dossiers });
        }
      },
      ouvrirDiscussionOvale: (pseudo) => set((s) => ({
        ecran: s.manager && !s.joueur ? 'manager' : 'social',
        ouvrirSocialSur: 'messages',
        conversationSocialeCible: pseudo,
        ecransVus: s.ecransVus.includes('social') ? s.ecransVus : [...s.ecransVus, 'social'],
      })),
      consommerOuvertureSociale: () => set({ ouvrirSocialSur: null }),
      consommerConversationSocialeCible: () => set({ conversationSocialeCible: null }),

      setEcran: (ecran) => set((s) => {
        // Tant que l'épilogue n'a pas été lu, aucun bouton de navigation ne
        // peut téléporter directement vers le Hall et escamoter l'explication.
        const cible = s.finCarriere ? 'finCarriere' : ecran;
        return {
          ecran: cible,
          ecransVus: s.ecransVus.includes(cible) ? s.ecransVus : [...s.ecransVus, cible],
        };
      }),
      fermerGuide: () => set({ guideFerme: true }),
      setIAActivee: (iaActivee) => set({ iaActivee }),
      setModele: (modele) => set({ modele }),
      setTenorKey: (tenorKey) => set({ tenorKey }),
      // La clé personnelle vit aussi dans un module (comme la langue et le
      // thème) : `lib/groq.ts` ne peut pas importer le store sans cycle.
      setGroqKey: (groqKey) => { definirCleGroqJoueur(groqKey); set({ groqKey }); },

      creerJoueur: (input) => {
        // ⚠️ ON VALIDE À LA PORTE, PAS DANS L’ÉCRAN. `Creation` borne déjà
        //    l’âge et n’offre que les quinze postes, mais ce n’est pas le seul
        //    chemin : une sauvegarde ancienne ou abîmée passe aussi par ici.
        //    Mesuré sans ces lignes : un âge à 0, 999, -5 ou NaN était accepté
        //    tel quel, et un poste inconnu faisait PLANTER la création
        //    (« Cannot read properties of undefined »), donc écran noir.
        const poste: PosteId = POSTE_PAR_ID[input.poste] ? input.poste : 'demi_ouverture';
        const ageDemande = Number(input.age);
        const age = Number.isFinite(ageDemande)
          ? Math.min(LIMITES.ageMax, Math.max(LIMITES.ageDebutMin, Math.round(ageDemande)))
          : LIMITES.ageDebutMin;
        input = { ...input, poste, age };
        const attributs = attributsDeBase(poste);
        const gen = noteGlobale({ attributs });
        const salaireDepart = Math.max(0, Math.round(noteDuClub(input.club) * 60));
        // ⚠️ LE NOM SE TIRE AVANT TOUT LE RESTE, et ce n’était pas le cas :
        // `pseudo` était calculé sur `input.nom`, donc sur le champ VIDE. Une
        // carrière sans nom saisi s’appelait « Matis Page-Relo » à l’écran et
        // « @anonyme_59 » partout ailleurs — sur 𝕏 L’Ovale, et surtout au
        // classement mondial, où le joueur ne se reconnaissait pas dans la
        // liste. Retour de jeu : « si on ne met pas de nom à la création, on
        // n’apparaît pas dans le classement mondial ». Il y apparaissait :
        // sous un identifiant technique que rien ne rattachait à lui.
        const nomChoisi = input.nom.trim() || nomAleatoirePourNation(input.nation);
        const joueur: Joueur = {
          // ⚠️ PLUS DE « Anonyme ». Un champ laissé vide donne désormais un nom
          // tiré dans le vivier de SA nationalité (lib/nomsJoueurs.ts) : on
          // recombine le prénom et le nom de deux des 11 916 joueurs étiquetés
          // que le jeu embarque déjà. C'est ici et nulle part ailleurs, parce
          // que c'est le seul endroit où un joueur est créé.
          nom: nomChoisi,
          poste: input.poste,
          traits: (input.traits ?? []).slice(0, MAX_TRAITS),
          nation: input.nation,
          club: input.club,
          division: input.division,
          age: input.age,
          attributs,
          forme: 70,
          moral: 75,
          reputation: 20,
          argent: 1500,
          saison: 1,
          matchsJoues: 0,
          essais: 0,
          titres: [],
          // Potentiel de départ : d'autant plus haut qu'on démarre jeune, avec
          // une QUEUE LONGUE — le tirage au carré fait que la plupart des
          // joueurs plafonnent honnêtement et qu'un sur cent naît avec le talent
          // d'un international. Il bouge ensuite au gré des saisons.
          potentiel: Math.min(
            96,
            gen + 18 + Math.floor(Math.random() ** 1.5 * 44) + Math.max(0, 24 - input.age),
          ),
          contrat: {
            club: input.club,
            division: input.division,
            saisons: 2 + Math.floor(Math.random() * 2),
            salaire: salaireDepart,
          },
          // L'Ovale : on démarre avec une poignée d'abonnés — la famille, les
          // copains du club, deux ou trois supporters curieux.
          pseudo: pseudoDe(nomChoisi),
          abonnes: 120 + Math.floor(Math.random() * 300),
          // Le premier maillot de la carrière : la liste des clubs commence ici
          // et s'allonge à chaque signature (`appliquerPreAccord`).
          clubs: [input.club],
        };
        // Nouvelle carrière = pyramide remise à son état d'origine, et plus
        // aucun transfert annoncé sur L'Ovale ne traîne.
        setMouvementsClubs({});
        setArriveesClubs({});
        // La pyramide repart de zéro : les fins de saison mémoïsées et le contexte
        // du joueur précédent sont périmés (voir lib/promotion.ts).
        oublierResultats();
        setContexteJoueur('', 0);
        setTransfertsSociaux([]);
        setApportsDuCentre([], {});
        set({
          joueur,
          finCarriere: null,
          ecran: 'carriere',
          // ⚠️ Le guide lit `ecransVus` : un écran atteint sans passer par
          // `setEcran` doit s'y inscrire quand même, sinon son étape reste
          // décochée alors qu'on est justement dessus.
          ecransVus: ['carriere'],
          scenarioActif: null,
          attenteEvenement: false,
          evenementHebdo: null,
          evenementsVus: [],
          mouvementsClubs: {}, arriveesClubs: {},
          compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsArgentIA: 0, gainsMatchs: 0, ovasDefis: 0, ovasActions: 0, augmentations: 0, primesIA: 0 },
          // Nouvelle carrière : timeline et défis repartent de zéro. Les SUCCÈS,
          // eux, sont un palmarès de joueur — ils traversent les carrières (et
          // ne peuvent donc pas être refarmés pour des Ovas).
          posts: [],
          filSemaine: '',
          notifsSocial: [],
          comptesSuivis: [],
          suggestionsComptes: [],
          conversations: {},
          dossiersRecrutement: {},
          transfertsSociaux: [],
          relationsSociales: {},
          defis: { cle: '', faits: [] },
          journal: [
            {
              id: idUnique(),
              saison: 1,
              role: 'systeme',
              titre: t('car.debutTitre'),
              texte: t('car.debutTexte', {
                joueur: joueur.nom, poste: nomPoste(joueur.poste).toLowerCase(), club: joueur.club,
              }),
            },
          ],
        });
      },

      ajouterEntree: (e) => {
        const saison = get().joueur?.saison ?? 1;
        set((s) => ({ journal: [...s.journal, { ...e, id: idUnique(), saison }] }));
      },

      appliquerReponse: (r, actionJoueur) => {
        const { joueur, compteurs } = get();
        if (!joueur) return;

        // ⚖️ Le MJ propose, le jeu dispose : ses deltas passent par un plafond
        // que rien ne peut contourner (voir lib/iaLocale.ts). Le budget de
        // progression par saison empêche de « farmer » l'IA.
        const { deltas, attributsGagnes, argentGagne, recadre } = plafonnerDeltas(r.deltas ?? {}, {
          budgetAttributs: Math.max(0, BUDGET_IA_PAR_SAISON - compteurs.gainsIA),
          budgetArgent: Math.max(0, Math.round(
            (joueur.contrat?.salaire ?? 0) * BUDGET_ARGENT_PAR_SAISON,
          ) - (compteurs.gainsArgentIA ?? 0)),
          age: joueur.age,
          salaire: joueur.contrat?.salaire ?? 0,
          abonnes: joueur.abonnes ?? 0,
          suspect: ressembleATriche(actionJoueur),
        });

        // ⚠️ UNE ACTION LIBRE ENGAGE AUTANT QU'UNE RÉPONSE À LA SCÈNE DE LA
        // SEMAINE. Écrire « je vais dire au président ce que je pense de lui
        // devant les caméras », c'est la même faute, qu'on l'écrive dans la
        // barre d'action ou en réponse à une scène — et ça doit coûter la même
        // chose. Il n'y a pas d'évènement `risque` ici : le seul juge de paix
        // est donc ce que le joueur a écrit (`niveauDeFaute`), ce qui garantit
        // au passage qu'on ne meurt jamais après « je m'entraîne au plaquage ».
        const faute = niveauDeFaute(actionJoueur);
        const consequence = r.consequence
          && consequenceAutorisee(r.consequence, false, faute)
          ? r.consequence
          : undefined;
        const suites = appliquerSuitesMJ(
          appliquerDeltas(joueur, deltas),
          {
            consequence,
            // Une blessure hors scène dangereuse reste une affaire de semaines.
            semaines: consequence === 'blessure'
              ? Math.min(r.semaines ?? 3, 10)
              : r.semaines,
            motif: r.motif ?? r.evenement ?? actionJoueur.slice(0, 120),
            club: r.club,
          },
          compteurs,
        );
        const j = suites.joueur;

        const entrees: EntreeJournal[] = [
          { id: idUnique(), saison: j.saison, role: 'joueur', texte: actionJoueur },
          {
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: r.evenement,
            texte: r.recit,
            deltas,
            evenement: r.evenement,
          },
        ];
        if (recadre) {
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'systeme',
            titre: '⚖️ Réalisme',
            texte:
              'Le récit est joué, mais les gains ont été ramenés à ce qu’une carrière réelle permet. ' +
              'On ne progresse pas en le demandant : entraîne-toi, joue, et laisse les saisons faire.',
          });
        }
        entrees.push(...suites.entrees);

        // Plafonné à la saison (voir `PLAFOND_OVAS_ACTIONS_PAR_SAISON`).
        const primeAction = Math.min(1, Math.max(0,
          PLAFOND_OVAS_ACTIONS_PAR_SAISON - (get().compteurs.ovasActions ?? 0)));
        set((s) => ({
          joueur: j,
          coins: s.coins + primeAction,
          compteurs: {
            ...s.compteurs,
            gainsIA: s.compteurs.gainsIA + attributsGagnes,
            gainsArgentIA: (s.compteurs.gainsArgentIA ?? 0) + argentGagne,
            ovasActions: (s.compteurs.ovasActions ?? 0) + primeAction,
            augmentations: (s.compteurs.augmentations ?? 0) + (suites.augmentation ? 1 : 0),
            primesIA: (s.compteurs.primesIA ?? 0) + suites.primeVersee,
          },
          journal: [...s.journal, ...entrees],
        }));

        if (r.marche && !suites.finale && !suites.sansClub) get().demanderTransfert();
        if (suites.sansClub) get().retrouverUnClub();
        get().verifierSucces();
        if (suites.finale) get().prendreRetraite(
          undefined, motifFinDepuisConsequence(consequence),
          r.motif ?? r.evenement ?? actionJoueur.slice(0, 120),
        );
      },

      saisonSuivante: () => {
        const { joueur, compteurs, journal } = get();
        if (!joueur) return;

        // ═══ ON NE JOUE PAS UNE SAISON SANS CONTRAT ═══════════════════════
        // ⚠️ Bug signalé en jeu : « si on est sans contrat on reste dans le
        // club alors qu'on n'a plus de contrat avec ». Le contrat tombait à
        // zéro, des offres arrivaient, et si on les ignorait le jeu continuait
        // comme si de rien n'était : salaire versé, place de titulaire, tout.
        // Un contrat terminé, c'est un joueur libre — et un joueur libre n'a
        // plus de club tant qu'il n'a pas signé.
        // ⚠️ Une vieille sauvegarde peut ne PAS avoir de contrat du tout (le
        // champ est arrivé en cours de route) : on lui en fabrique un plutôt que
        // de la mettre au chômage rétroactivement.
        if (!joueur.contrat) {
          set({
            joueur: {
              ...joueur,
              contrat: {
                club: joueur.club,
                division: joueur.division ?? divisionDuClub(joueur.club)?.id ?? 'fed3',
                saisons: 2,
                salaire: Math.round(noteDuClub(joueur.club) * 60),
              },
            },
          });
          return get().saisonSuivante();
        }
        // ⚠️ LE PRÉ-ACCORD NE S'APPLIQUE PAS ICI — il s'applique APRÈS que la
        // saison écoulée a été résolue (voir plus bas, juste avant le mercato).
        //
        // Bug attrapé par `verifTitres.ts` : posé en tête, le transfert changeait
        // de club AVANT `resoudreTrophees`. Le joueur remportait donc la
        // Champions Cup avec son NOUVEAU club — qui ne l'avait pas gagnée — et
        // le titre de l'ancien passait à la trappe. Mesuré : 5 titres oubliés
        // sur 48 saisons. On finit sa saison là où on l'a jouée.
        //
        // ⚠️ ET LE BLOCAGE LIT `contratBloque`, pas `contrat.saisons` : un
        // joueur qui a trouvé un accord n'est plus bloqué, même à zéro saison
        // restante — c'est justement ce qui lui permet de repartir.
        if (contratBloque(joueur)) {
          // Le marché est relancé : les clubs écrivent sur L'Ovale.
          const nees = get().susciterApproches(4, true);
          if (nees > 0 || get().approches.some((a) => a.etat === 'ouverte')) {
            set((s) => ({
              journal: s.journal.some((e) => e.evenement === `libre-${joueur.saison}`)
                ? s.journal
                : [...s.journal, {
                    id: idUnique(),
                    saison: joueur.saison,
                    role: 'mj' as const,
                    titre: '📄 Tu es libre de tout contrat',
                    texte: `Ton contrat à ${joueur.club} est arrivé à son terme. `
                      + `Tant que tu n'as pas signé, tu n'as plus de club, plus de salaire et plus de match. `
                      + `Des clubs t'écrivent sur 𝕏 L'Ovale : ouvre tes messages et négocie.`,
                    evenement: `libre-${joueur.saison}`,
                  }],
            }));
            // ⚠️ ON L’EMMÈNE, ON NE LUI DIT PAS D’Y ALLER. Le journal
            // annonçait « ouvre tes messages » et laissait le joueur sur un
            // écran où plus rien ne répondait : le bouton refusait d’avancer
            // sans expliquer où cliquer. La demande est explicite — « ouvre
            // 𝕏 sur les messages ».
            get().ouvrirMessagesOvale();
            return; // la saison ne démarre pas tant qu'on n'a pas signé
          }
          // ⚠️ AUCUN CLUB N'EN VEUT. On ne laisse pas le joueur en suspens : le
          // rugby s'arrête là, comme pour des milliers de joueurs réels.
          set((s) => ({
            journal: [...s.journal, {
              id: idUnique(),
              saison: joueur.saison,
              role: 'mj' as const,
              titre: '🚪 Plus aucun club',
              texte: `Ton contrat est terminé et le téléphone ne sonne plus. `
                + `À ${joueur.age} ans, aucune formation ne te propose de place : la carrière s'arrête ici.`,
            }],
          }));
          get().prendreRetraite(undefined, 'sansClub',
            `Aucune formation n’a proposé de contrat à ${joueur.age} ans.`);
          return;
        }
        // La saison a réellement été jouée journée après journée. Une vieille
        // sauvegarde privée de bilan ne doit surtout pas recevoir des matchs et
        // essais inventés : l'absence de donnée vaut zéro, puis la nouvelle
        // saison repart avec un bilan propre.
        const forceGroupe = forceEffectif(joueur.club, joueur.saison);
        const vecu = joueur.saisonEnCours;
        const matchsSaison = vecu?.matchs ?? 0;
        const essaisSaison = vecu?.essais ?? 0;
        const noteMatchs = vecu?.notes.length
          ? vecu.notes.reduce((a, b) => a + b, 0) / vecu.notes.length
          : undefined;

        // ---- CE QUE LA SAISON A VÉCU, MÊME QUAND ON LA PASSE D'UN BLOC ----
        // ⚠️ Trois choses restaient figées quand la saison n'était pas jouée
        // semaine après semaine (mode « saison rapide », ou passage direct à la
        // trêve) :
        //   · la BLESSURE gardait son compte de semaines — on repartait blessé
        //     pour la même durée, saison après saison, sans jamais guérir ;
        //   · la FORME ne remontait que de +10, alors qu'une intersaison
        //     complète (repos puis préparation) remet un joueur d'aplomb ;
        //   · les SÉANCES HEBDOMADAIRES n'étaient jamais jouées : choisir le
        //     mode rapide, c'était renoncer à toute la progression à
        //     l'entraînement (mesurée à ~+7 de générale sur six saisons).
        const semainesSautees = Math.max(0, SEMAINES_PAR_SAISON - (joueur.semaine ?? 1));

        // 1. L'infirmerie tourne pendant ces semaines-là.
        const blessureRestante = joueur.blessure
          ? Math.max(0, joueur.blessure.semaines - semainesSautees)
          : 0;
        const blessure = joueur.blessure && blessureRestante > 0
          ? { ...joueur.blessure, semaines: blessureRestante }
          : null;
        const guerie = !!joueur.blessure && !blessure;
        const bancRestant = Math.max(0, (joueur.miseAuBanc?.semaines ?? 0) - semainesSautees);
        const miseAuBanc = joueur.miseAuBanc && bancRestant > 0
          ? { ...joueur.miseAuBanc, semaines: bancRestant }
          : undefined;

        // 2. La préparation d'été. Un vétéran remonte moins haut qu'un espoir,
        // et un joueur encore à l'infirmerie ne fait pas de préparation.
        const plancherForme = blessure ? 55 : Math.max(62, 88 - Math.max(0, joueur.age - 29) * 2);
        const forme = borne(Math.max(joueur.forme + 10, plancherForme));

        // 3. Les séances non jouées, rattrapées d'un bloc — mêmes règles qu'en
        // semaine (`gainDUneSeance`), une séance par semaine sautée, et jamais
        // pendant les semaines d'indisponibilité.
        const focus = joueur.entrainementFocus;
        const seances = focus
          ? Math.max(0, semainesSautees - Math.min(semainesSautees, joueur.blessure?.semaines ?? 0))
          : 0;
        let gainEntrainement = 0;
        if (focus && seances > 0) {
          const potentielCible = joueur.potentiel ?? noteGlobale(joueur) + 10;
          let valeur = joueur.attributs[focus];
          // La fraîcheur baisse au fil des semaines de travail, puis remonte.
          for (let n = 0; n < seances; n++) {
            const fraicheur = Math.max(45, joueur.forme - (n % 4) * 4);
            const g = gainDUneSeance(joueur.age, potentielCible, valeur, fraicheur, Math.random);
            valeur = Math.min(99, valeur + g);
            gainEntrainement += g;
          }
        }

        let j: Joueur = {
          ...joueur,
          division: joueur.division ?? divisionDuClub(joueur.club)?.id ?? 'fed3',
          saison: joueur.saison + 1,
          age: joueur.age + 1,
          matchsJoues: joueur.matchsJoues + matchsSaison,
          essais: joueur.essais + essaisSaison,
          forme,
          blessure,
          miseAuBanc,
          semaine: 1,
          entrainementSemaine: undefined,
          saisonEnCours: undefined,
          selections: (joueur.selections ?? 0) + (vecu?.capes ?? 0),
          stats: vecu ? additionnerStats(joueur.stats ?? STATS_VIDES, vecu.stats) : joueur.stats,
          attributs: gainEntrainement
            ? { ...joueur.attributs, [focus!]: Math.min(99, joueur.attributs[focus!] + gainEntrainement) }
            : joueur.attributs,
        };

        const entrees: EntreeJournal[] = [];
        let gain = 3;

        if (guerie) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🩺 Sorti de l’infirmerie',
            texte: `Ta blessure est derrière toi : tu as repris la course, puis le contact, puis le ballon. Tu attaques la saison ${j.saison} apte.`,
            deltas: { moral: 6 },
          });
          j = appliquerDeltas(j, { moral: 6 });
        } else if (blessure) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: `🚑 Toujours indisponible : ${blessure.nom}`,
            texte: `Tu reprends la saison à l'infirmerie : encore ${blessure.semaines} semaine${blessure.semaines > 1 ? 's' : ''} avant de retoucher un ballon.`,
          });
        }
        if (gainEntrainement > 0 && focus) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: `💪 Une saison de travail, +${gainEntrainement} ${ATTRIBUTS_LABELS[focus]}`,
            texte: `${seances} séances ciblées sur ton ${ATTRIBUTS_LABELS[focus].toLowerCase()} au fil de la saison. Le staff a vu la différence.`,
            deltas: { [focus]: gainEntrainement },
          });
        }

        // ---- Saison passée sans rien faire ? Le destin joue à ta place. ----
        const rienFait =
          compteurs.evenements === 0 &&
          compteurs.situations === 0 &&
          !journal.some((e) => e.saison === joueur.saison && e.role === 'joueur');
        if (rienFait) {
          const evt = traduireEvenement(EVENEMENTS[Math.floor(Math.random() * EVENEMENTS.length)]);
          j = appliquerDeltas(j, evt.deltas);
          gain += gainOvas(evt.ovas);
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'mj',
            titre: `${evt.emoji} ${evt.titre}`,
            texte: `Pendant que tu laissais filer la saison, la vie a décidé pour toi : ${evt.recit}`,
            deltas: evt.deltas,
            evenement: evt.titre,
          });
        }

        // ---- FIN DE SAISON DE TOUTE LA PYRAMIDE ----
        // Un seul calcul, déterministe, qui sert à TOUT : classement final,
        // phase finale (barrages → demies → finale), match d'accès, montées et
        // descentes. Plus aucune de ces briques n'est tirée au sort dans son coin.
        const divisionJouee = joueur.division ?? divisionDuClub(joueur.club)?.id ?? 'fed3';
        const pyramide = resoudrePyramide(
          divisionJouee, joueur.saison, joueur.club, bonusClubDuJoueur(joueur),
        );

        // ---- Bilan sportif : classement du club puis titres remportés ----
        const bilan = resoudreTrophees(
          j, joueur.saison, matchsSaison, essaisSaison, pyramide.phase, vecu?.capes ?? 0,
        );

        // ---- ÉVOLUTION : la saison jouée fait progresser (ou régresser) ----
        const evolution = evoluer(
          { ...joueur, noteSaison: joueur.noteSaison },
          { matchs: matchsSaison, essais: essaisSaison, forceGroupe, rang: bilan.rang, noteMatchs },
        );
        j = appliquerDeltas(j, evolution.deltas);
        j = {
          ...j,
          noteSaison: evolution.noteSaison,
          potentiel: Math.max(
            noteGlobale(j),
            Math.min(99, (joueur.potentiel ?? noteGlobale(joueur) + 12) + evolution.gainPotentiel),
          ),
        };
        const bougees = Object.entries(evolution.deltas).filter(([, v]) => v !== 0);
        entrees.push({
          id: idUnique(),
          saison: joueur.saison,
          role: 'systeme',
          titre: `📈 Évolution, note de saison ${evolution.noteSaison.toFixed(1)}/10`,
          texte:
            `${evolution.resume} ` +
            (bougees.length
              ? `Générale : ${noteGlobale(joueur)} → ${noteGlobale(j)} (potentiel ${j.potentiel}).`
              : 'Tes attributs ne bougent pas cette saison.'),
          deltas: evolution.deltas,
        });
        // ---- LES DISTINCTIONS INDIVIDUELLES ----
        // ⚠️ ICI ET PAS PLUS HAUT : elles se jugent sur la NOTE DE SAISON, qui
        // vient d'être calculée par `evoluer()`. Et sur le palmarès de l'année,
        // que `resoudreTrophees` vient de remplir. Les deux entrées existent
        // enfin — c'est le seul point du programme où c'est vrai.
        //
        // ⚠️ Plus aucun tirage au sort (demande explicite : « que ça soit par
        // rapport à notre note de saison, nos stats et notre palmarès »).
        // `lib/honneurs.ts` est pure et déterministe : rejouer la saison
        // redonne exactement le même verdict.
        const saisonJugee = {
          note: evolution.noteSaison,
          reputation: j.reputation,
          poste: j.poste,
          matchs: matchsSaison,
          essais: essaisSaison,
          // N'existe qu'en mode « journée par journée » : le module s'en accommode.
          stats: joueur.saisonEnCours?.stats,
          rang: bilan.rang,
          taillePoule: bilan.taillePoule,
          titres: bilan.trophees,
          competition: bilan.competition,
          championsCup: bilan.enChampionsCup,
          tournoiId: bilan.tournoiId,
          niveau: bilan.niveau,
          saison: joueur.saison,
        };
        const honneurs = decernerHonneurs(saisonJugee);
        bilan.trophees.push(...honneurs.map((h) => h.trophee));

        // Le joueur doit pouvoir SUIVRE sa cote. Un système de récompense qu'on
        // ne voit pas venir n'est pas un objectif, c'est une surprise — et on ne
        // travaille pas pour une surprise. La note s'affiche donc dès qu'une
        // distinction est en jeu, gagnée ou non.
        if (MEILLEUR_JOUEUR_PAR_DIVISION[bilan.competition] || bilan.enChampionsCup || bilan.tournoiId) {
          const cote = noterSaisonIndividuelle(saisonJugee);
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: `🗳️ Vote du meilleur joueur, ta saison cotée ${Math.round(cote)}/100`,
            texte: honneurs.length
              ? `Note de saison, statistiques, palmarès : tu passes devant tout le monde. `
                + `${honneurs.length > 1 ? `${honneurs.length} distinctions` : 'Une distinction'} pour toi.`
              : `Il fallait environ ${Math.round(BARRES_HONNEURS.championnat)} pour être élu meilleur joueur du championnat. `
                + `La note de saison compte pour les deux tiers, les statistiques et les titres de l'année font le reste.`,
          });
        }

        const gagnes = bilan.trophees;
        entrees.push({
          id: idUnique(),
          saison: joueur.saison,
          role: 'systeme',
          titre: `Bilan de la saison ${joueur.saison}`,
          texte:
            `${joueur.club} termine ${bilan.rang}${bilan.rang === 1 ? 'er' : 'e'} de ${bilan.divisionNom} ` +
            `(effectif noté ${Math.round(bilan.forceEffectif)}). ` +
            `Ta saison : ${matchsSaison} match${matchsSaison > 1 ? 's' : ''}, ` +
            `${essaisSaison} essai${essaisSaison > 1 ? 's' : ''} - ` +
            (vecu ? `${vecu.stats.points} pts, ${vecu.stats.plaquages} plaquages${vecu.stats.butsTentes ? `, ${vecu.stats.butsReussis}/${vecu.stats.butsTentes} au pied` : ''}${vecu.stats.grattages ? `, ${vecu.stats.grattages} grattages` : ''}. ` : '') +
            (bilan.apport >= 0.6
              ? 'tu as tiré ton équipe vers le haut.'
              : bilan.apport <= -0.6
                ? "tu as pesé sur l'équipe."
                : "dans la moyenne de l'effectif."),
        });

        // ---- PHASE FINALE : le bracket, match par match ----
        const bracket = pyramide.phase.matchs;
        if (bracket.length) {
          const lesNotres = bracket.filter((m) => m.domicile === joueur.club || m.exterieur === joueur.club);
          const finale = bracket.find((m) => m.tour === 'finale')!;
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: bilan.champion ? 'mj' : 'systeme',
            titre: `🔥 Phase finale de ${bilan.divisionNom}`,
            texte:
              (bilan.qualifie
                ? `${joueur.club} disputait la phase finale. ` +
                  (lesNotres.length
                    ? lesNotres
                        .map((m) => `${m.libelle.split(':')[0].trim()} : ${m.domicile} ${m.scoreD}-${m.scoreE} ${m.exterieur}.`)
                        .join(' ')
                    : '')
                : `${joueur.club} n'était pas qualifié pour la phase finale. `) +
              ` Le titre revient à ${finale.vainqueur}, vainqueur ${Math.max(finale.scoreD, finale.scoreE)}-${Math.min(finale.scoreD, finale.scoreE)} de ${finale.perdant} en finale.` +
              (bilan.champion ? ' 🏆 Et ce champion, c’est TOI.' : ''),
          });
        }
        for (const id of gagnes) {
          const t = TROPHEES[id];
          // ⚠️ On garde le libellé POUR L'AFFICHAGE et on enregistre en plus le
          // titre sous forme structurée : c'est ce qui permet les succès de
          // palmarès (« champion avec trois clubs différents », « trois
          // Boucliers de Brennus »…). Voir `TitreGagne` dans types.ts.
          j = {
            ...j,
            titres: [...j.titres, `${t.nom} (S${joueur.saison})`],
            palmares: [
              ...(j.palmares ?? []),
              {
                trophee: t.id,
                nom: t.nom,
                saison: joueur.saison,
                club: joueur.club,
                division: joueur.division,
              },
            ],
          };
          gain += t.ovas;
          // ⚠️ ON NE RACONTE PAS UNE DISTINCTION COMME UN TITRE D'ÉQUIPE. « Tu
          // soulèves le trophée devant ton public » n'a aucun sens pour un
          // trophée de meilleur joueur — et surtout, le joueur doit voir CE QUI
          // le lui a valu, sinon la récompense tombe du ciel.
          const perso = estIndividuel(t);
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'mj',
            titre: `${perso ? '🥇' : '🏆'} ${t.nom}`,
            texte: perso
              ? `${t.desc} Ta saison notée ${evolution.noteSaison.toFixed(1)}/10`
                + (matchsSaison ? `, ${matchsSaison} match${matchsSaison > 1 ? 's' : ''} et ${essaisSaison} essai${essaisSaison > 1 ? 's' : ''}` : '')
                + `${bilan.trophees.length > 1 ? ', et un palmarès qui parle pour toi' : ''} : le jury n'a pas hésité.`
              : `${t.desc} Tu soulèves le trophée devant ton public !`,
            deltas: { reputation: perso ? 8 : 6, moral: 10 },
          });
          j = appliquerDeltas(j, { reputation: perso ? 8 : 6, moral: 10 });
        }

        entrees.push({
          id: idUnique(),
          saison: j.saison,
          role: 'systeme',
          titre: `Saison ${j.saison}`,
          texte:
            `Nouvelle saison. Tu as ${j.age} ans. L'intersaison t'a régénéré. ` +
            (j.age >= AGE_RETRAITE_FORCEE
              ? 'Le corps ne suit plus : c’est ta dernière ligne droite, il est temps de raccrocher.'
              : j.age >= AGE_RETRAITE_LIBRE
                ? 'À ton âge, chaque saison est un sursis, tu peux raccrocher quand tu le sens.'
                : 'Quels sont tes objectifs ?'),
        });

        // ---- VESTIAIRE : nouveaux liens, et le brassard éventuellement ----
        const liens = nouerRelations(j, joueur.saison);
        if (liens.length) {
          j = { ...j, relations: [...(j.relations ?? []), ...liens] };
          const amis = liens.filter((r) => r.type === 'ami');
          const rivaux = liens.filter((r) => r.type === 'nemesis');
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🤝 Vestiaire',
            texte:
              (amis.length
                ? `Tu t'es lié d'amitié avec ${amis.map((r) => r.nom).join(' et ')}. On se comprend sans se parler, et ça se voit sur le terrain. `
                : '') +
              (rivaux.length
                ? `En revanche, ça ne passe pas du tout avec ${rivaux[0].nom} : deux fortes têtes, un seul vestiaire.`
                : ''),
          });
        }

        const devientCapitaine = !j.capitaine && meriteLeBrassard(j, forceGroupe);
        if (devientCapitaine) {
          j = appliquerDeltas({ ...j, capitaine: true }, { moral: 12, reputation: 4 });
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: '©️ Le brassard est pour toi',
            texte: `Le staff a tranché : tu seras le capitaine de ${j.club} la saison prochaine. Le groupe t'écoute, à toi de le tirer vers le haut.`,
            deltas: { moral: 12, reputation: 4 },
          });
        }

        // ---- Contrat : salaire encaissé (moins la commission de l'agent) ----
        const contrat = j.contrat ?? {
          club: j.club,
          division: j.division ?? 'fed3',
          saisons: 1,
          salaire: Math.round(noteDuClub(j.club) * 60),
        };
        const agent = agentDe(j.agent);
        // ⚠️ EN AMATEUR, ON N'EST PAS PAYÉ POUR L'ANNÉE : ON EST DÉFRAYÉ POUR LES
        // MATCHS JOUÉS. Un club sans salaire (`salaire: 0`) verse `primeMatch`
        // par feuille de match — une saison pleine rapporte à peu près ce que
        // valait l'ancien salaire annuel, une saison sur le banc ne rapporte
        // rien. C'est le seul endroit où ce champ se transforme en euros.
        const primesDeMatch = Math.round((contrat.primeMatch ?? 0) * matchsSaison);
        const gains = contrat.salaire + primesDeMatch;
        const commission = Math.round(gains * agent.commission);
        j = {
          ...j,
          argent: j.argent + gains - commission,
          contrat: { ...contrat, saisons: Math.max(0, contrat.saisons - 1) },
        };
        if (primesDeMatch > 0) {
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'systeme',
            titre: '🧾 Défraiements de la saison',
            texte: `${j.club} ne verse pas de salaire : ${matchsSaison} feuille${matchsSaison > 1 ? 's' : ''} de match `
              + `à ${(contrat.primeMatch ?? 0).toLocaleString('fr-FR')} €, soit ${primesDeMatch.toLocaleString('fr-FR')} € sur l'année.`,
            deltas: { argent: primesDeMatch },
          });
        }
        if (commission > 0) {
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'systeme',
            titre: `${agent.emoji} ${t('agent.commission.titre')}`,
            texte: t('agent.commission.texte', {
              agent: nomAgent(agent), taux: Math.round(agent.commission * 100), commission: nombre(commission),
            }),
            deltas: { argent: -commission },
          });
        }

        // ---- LOT 6 : ce que le staff et le public retiennent de la saison ----
        // La confiance du coach se rejoue chaque été (nouveau projet, nouvelles
        // hiérarchies) ; la popularité, elle, tire la réputation dans son sens.
        const popularite = j.popularite ?? 50;
        const derive = Math.round((popularite - 50) / 12);
        j = {
          ...j,
          confianceCoach: borne(Math.round(((j.confianceCoach ?? 50) + 50) / 2 + (evolution.noteSaison - 5.5) * 3)),
          popularite: borne(Math.round(popularite + (popularite - 50) * -0.2 + (evolution.noteSaison - 5.5) * 2)),
          reputation: borne(j.reputation + derive),
        };
        // Un agent tapageur finit par déclencher une histoire.
        if (agent.drame > 0 && Math.random() < agent.drame) {
          const degats = { reputation: -6, moral: -8 };
          j = appliquerDeltas(j, degats);
          entrees.push({
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: `📰 ${t('agent.drame.titre')}`,
            texte: t('agent.drame.texte', { agent: nomAgent(agent) }),
            deltas: degats,
          });
        }

        // ---- MERCATO D'INTERSAISON : les clubs écrivent sur L'Ovale ----
        // ⚠️ Plus de panneau « Choix de carrière » : `susciterApproches` ouvre
        // des conversations. La règle du « un an de contrat maximum » vaut ici
        // aussi — sauf en fin de contrat, où le marché s'ouvre en grand.
        const finDeContrat = (j.contrat?.saisons ?? 0) <= 0;
        const belleSaison = evolution.noteSaison >= 7;
        // ⚠️ ON POSE LE JOUEUR AVANT, sinon `susciterApproches` lirait la fiche
        // de la saison écoulée (club, division et contrat d'avant l'intersaison).
        set({ joueur: j });

        // ═══ LE TRANSFERT S'EFFECTUE ICI, ET SEULEMENT ICI ═══════════════════
        // Décision de l'utilisateur : « le transfert s'effectue qu'à
        // l'intersaison ». La saison écoulée vient d'être résolue — titres
        // compris — avec le club où elle a été jouée ; on peut déménager.
        if (j.preAccord && j.preAccord.saison <= joueur.saison) {
          get().appliquerPreAccord();
          j = get().joueur!;
        }
        // Les clubs qui avaient conservé la candidature refont leur choix à
        // chaque intersaison, avant que le marché général ne se mette à sonner.
        get().examinerDossiersRecrutement();
        // La prolongation vient du club actuel, et elle passe par le même canal.
        if (finDeContrat && !j.preAccord) {
          const prolongation = offreProlongation(j, competitionDuClub(j.club), j.saison);
          if (prolongation && !get().approches.some((a) => a.club === j.club && a.saison === j.saison)) {
            const app = approcheDepuisOffre(prolongation, j, j.semaine ?? 1, true);
            set((s) => ({
              approches: [...s.approches, app],
              conversations: {
                ...s.conversations,
                [app.pseudo]: [
                  ...(s.conversations[app.pseudo] ?? []),
                  {
                    id: idUnique(), pseudo: app.pseudo, de: 'lui' as const, saison: j.saison,
                    texte: `${j.nom}, ton contrat arrive à son terme et on aimerait te garder. `
                      + `Notre proposition : ${resumerTermes(app.offre)}. Dis-nous.`,
                    semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
                  },
                ],
              },
            }));
          }
        }
        if (finDeContrat || belleSaison || Math.random() < 0.25) {
          get().susciterApproches(finDeContrat ? 3 : 2, finDeContrat);
        }
        // ⚠️ APRÈS les approches : un agent qui te repère commente ta saison,
        // il ne prédit pas le marché. Et il faut que `noteSaison` soit posée.
        get().mouvementAgents();

        // ---- MONTÉES ET DESCENTES DE TOUTE LA PYRAMIDE ----
        // ⚠️ Avant, seules la division du joueur et ses deux voisines bougeaient :
        // un club de Fédérale 2 y restait à vie. On résout désormais les DIX
        // étages français, tournois de fin d'année des divisions à poules
        // compris (lib/tournoi.ts). Les mouvements de la division du joueur
        // (match d'accès inclus) passent devant : c'est sa saison à lui.
        const complete = resoudreToutesDivisions(joueur.saison);
        // ⚠️ `equilibrerMouvements` est le garde-fou de TAILLE DES DIVISIONS.
        // Sans lui, la fusion des deux résolutions pouvait faire monter deux
        // clubs pour une seule descente : le Top 14 se retrouvait à 16 équipes
        // et la Pro D2 à 14 (bug signalé en jeu). Voir lib/promotion.ts.
        const mouvements = equilibrerMouvements([
          ...pyramide.mouvements,
          ...complete.mouvements.filter(
            (m) => !pyramide.mouvements.some((p) => p.club === m.club),
          ),
        ]);
        // ⚠️ On enregistre les mouvements ET on les publie à lib/divisions.ts :
        // sans ça, la division du club promu ne changeait nulle part et le
        // championnat de la saison suivante était identique au précédent.
        const majMouvements = { ...get().mouvementsClubs };
        const majArrivees = { ...get().arriveesClubs };
        for (const m of mouvements) {
          majMouvements[m.club] = m.vers;
          // Il arrive POUR la saison suivante : il n'a pas joué celle qui finit.
          majArrivees[m.club] = (get().joueur?.saison ?? 1) + 1;
        }
        setMouvementsClubs(majMouvements);
        setArriveesClubs(majArrivees);
        oublierResultats(); // la pyramide a changé : les résultats mémoïsés sont périmés

        if (complete.tournois.length) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🏆 Tournois de fin d’année',
            texte: complete.tournois
              .map((t) => `${t.nom} : ${t.champion}.`)
              .join(' '),
          });
        }

        if (mouvements.length) {
          const siennes = pyramide.recits;
          const ailleurs = mouvements.filter((m) => m.club !== joueur.club).length;
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '🔀 Montées, descentes et match d’accès',
            texte: `${siennes.join(' ')} Au total, ${ailleurs} club${ailleurs > 1 ? 's changent' : ' change'} de division dans toute la pyramide française.`,
          });
          // Le joueur suit son club s'il monte ou s'il descend.
          const sien = mouvements.find((m) => m.club === joueur.club);
          if (sien) {
            j = {
              ...j,
              division: sien.vers,
              contrat: j.contrat ? { ...j.contrat, division: sien.vers } : j.contrat,
            };
            const parAcces = sien.motif === 'acces';
            entrees.push({
              id: idUnique(),
              saison: j.saison,
              role: 'mj',
              titre: sien.sens === 'montee' ? '⬆️ Ton club monte !' : '⬇️ Ton club descend',
              texte: sien.sens === 'montee'
                ? `${joueur.club} accède à la ${nomDivision(sien.vers)}${parAcces ? ' au terme du match d’accès' : ' en tant que champion'}. Une marche de plus, et un niveau de jeu qui va piquer.`
                : `${joueur.club} est relégué en ${nomDivision(sien.vers)}${parAcces ? ' après avoir perdu le match d’accès' : ''}. À toi de voir si tu suis le club ou si tu cherches mieux ailleurs.`,
              deltas: sien.sens === 'montee' ? { moral: 10, reputation: 3 } : { moral: -10 },
            });
            j = appliquerDeltas(j, sien.sens === 'montee' ? { moral: 10, reputation: 3 } : { moral: -10 });
          }
        }

        // ---- L'AUDIENCE DE LA SAISON ÉCOULÉE ----
        // Une saison au niveau, c'est un compte qui grossit. Le compteur avance
        // par un gros pas vers l'audience qu'un joueur de ce niveau, dans ce
        // club-là, aurait sur L'Ovale (`abonnesCible`, lib/comptes.ts).
        const cibleAbonnes = abonnesCible(j.nom, j.club, noteGlobale(j), j.reputation);
        // ⚠️ UNE MAUVAISE SAISON COÛTE DES ABONNÉS (demande explicite). Le
        // compteur ne suivait que le NIVEAU du club : on pouvait faire une
        // saison à 3/10 et continuer de grossir parce qu'on jouait en Top 14.
        // En dessous de 5/10, le public s'en va — d'autant plus vite que la
        // saison a été mauvaise (jusqu'à −18 % à 2/10), et le staff qui ne te
        // fait plus confiance n'arrange rien.
        const note = evolution.noteSaison;
        const decu = note < 5 ? Math.min(0.18, (5 - note) * 0.045) : 0;
        const boude = (j.confianceCoach ?? 50) < 35 ? 0.05 : 0;
        const apresErosion = Math.round((j.abonnes ?? 0) * (1 - decu - boude));
        const abonnesApresSaison = rapprocherAbonnes(apresErosion, cibleAbonnes, 0.22);
        const deltaAbonnes = abonnesApresSaison - (j.abonnes ?? 0);
        j = { ...j, abonnes: abonnesApresSaison };
        if (decu > 0 && (j.abonnes ?? 0) > 0) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: '𝕏 Saison décevante, audience en berne',
            texte: `Une saison notée ${note.toFixed(1)}/10, ça se voit sur ton compte : `
              + `${Math.round(decu * 100)} % de tes abonnés te lâchent avant même le mercato.`,
          });
        }
        if (Math.abs(deltaAbonnes) >= 100) {
          entrees.push({
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme',
            titre: deltaAbonnes > 0 ? '𝕏 Ton audience grimpe' : '𝕏 Ton audience s’érode',
            texte: deltaAbonnes > 0
              ? `Ta saison à ${joueur.club} a fait parler : **+${deltaAbonnes.toLocaleString('fr-FR')} abonnés** sur L'Ovale, `
                + `pour un total de ${abonnesApresSaison.toLocaleString('fr-FR')}.`
              : `Moins exposé cette saison, ton compte perd ${Math.abs(deltaAbonnes).toLocaleString('fr-FR')} abonnés `
                + `(${abonnesApresSaison.toLocaleString('fr-FR')} au total).`,
          });
        }

        // Ce que tu pèseras sur ton club la saison qui s'ouvre, figé maintenant.
        j = { ...j, apportClub: calculerApportClub(j) };

        set((s) => ({
          joueur: j,
          // Les feuilles détaillées sont utiles pendant la saison, mais les
          // conserver pour chaque championnat et chaque année finit par remplir
          // le localStorage du navigateur et bloque alors tous les boutons.
          statsReelles: {},
          journeesReelles: {},
          coins: s.coins + gain,
          compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsArgentIA: 0, gainsMatchs: 0, ovasDefis: 0, ovasActions: 0, augmentations: 0, primesIA: 0 },
          tropheesEnAttente: [...s.tropheesEnAttente, ...gagnes],
          mouvementsClubs: majMouvements,
          arriveesClubs: majArrivees,
          journal: [...s.journal, ...entrees],
        }));
        get().verifierSucces();

        // ═══ LE CLASSEMENT MONDIAL SE MET À JOUR TOUT SEUL ═══════════════════
        // ⚠️ Demande explicite : « la fiche d'envoi, il faut que ça s'envoie
        // automatiquement ». L'envoi tenait à un bouton caché dans un dépliant
        // de l'écran Classement : personne ne le trouvait, donc la table restait
        // vide. Une fin de saison est le bon moment — la carrière vient de
        // gagner ses titres, ses matchs et ses essais de l'année.
        //
        // Fait exprès : on n'attend pas la réponse et on n'échoue jamais. Sans
        // serveur, hors ligne, fiche refusée ou quota atteint, la saison se
        // referme exactement pareil. Le serveur ne garde que le MEILLEUR score :
        // renvoyer chaque année ne peut donc rien dégrader.
        get().publierAuClassement(true);

        // ---- LA LIMITE D'ÂGE, VRAIMENT APPLIQUÉE ----
        // ⚠️ `AGE_RETRAITE_FORCEE` n'était qu'un texte : on pouvait jouer
        // jusqu'à 60 ans. À 44 ans révolus, le corps a dit non — la carrière se
        // referme et entre au Panthéon.
        if (j.age >= AGE_RETRAITE_FORCEE) {
          set((s) => ({
            journal: [...s.journal, {
              id: idUnique(),
              saison: j.saison,
              role: 'mj' as const,
              titre: `🏛️ ${AGE_RETRAITE_FORCEE} ans, le rideau tombe`,
              texte: `Tu as ${j.age} ans. Aucune fédération ne délivre plus de licence de joueur `
                + `professionnel à cet âge : ta carrière s'arrête ici, et elle s'arrête debout.`,
            }],
          }));
          get().prendreRetraite(undefined, 'ageLimite',
            `La limite de la carrière joueur est fixée à ${AGE_RETRAITE_FORCEE} ans.`);
        }
      },

      fermerTrophee: () =>
        set((s) => ({ tropheesEnAttente: s.tropheesEnAttente.slice(1) })),

      // Le thème vit sur <html data-theme="…"> : le CSS fait tout le reste,
      // et le fond change sans qu'un seul composant soit re-rendu.
      // Le module i18n garde la langue courante HORS de React : `t()` est
      // appelée depuis des fonctions pures (libellés de postes, formatage de
      // dates) qui n'ont pas accès à un hook.
      setLangue: (langue) => {
        definirLangue(langue);
        set({ langue, langueManuelle: true });
      },

      // La réponse IP arrive après le premier rendu. Si la personne a choisi
      // une langue pendant ce temps, son choix gagne — sans course ni flash
      // tardif qui remettrait l'interface dans une autre langue.
      appliquerLangueAutomatique: (langue) => {
        if (get().langueManuelle) return;
        definirLangue(langue);
        set({ langue });
      },

      setTheme: (theme) => {
        appliquerTheme(theme);
        set({ theme });
      },

      // ---- ENTRAÎNEMENT DE LA SEMAINE ----
      // Une séance ciblée par semaine : c'est le seul levier direct du joueur
      // sur ses stats. Le gain dépend de l'âge, de la marge au potentiel et de
      // la fraîcheur — et il coûte de la forme.
      choisirFocus: (attribut) => {
        const joueur = get().joueur;
        if (!joueur) return;
        set((st) => ({
          joueur: { ...joueur, entrainementFocus: attribut },
          journal: [...st.journal, {
            id: idUnique(), saison: joueur.saison, role: 'systeme' as const,
            titre: `🎯 Secteur de travail : ${ATTRIBUTS_LABELS[attribut]}`,
            texte: `Tu préviens le préparateur physique : chaque semaine, tu travailleras ton `
              + `${ATTRIBUTS_LABELS[attribut].toLowerCase()}. Tu peux en changer quand tu veux.`,
          }],
        }));
      },

      entrainer: (attribut) => {
        const joueur = get().joueur;
        if (!joueur) return;
        const numero = joueur.semaine ?? 1;
        if (joueur.entrainementSemaine === numero) return; // déjà travaillé
        if (joueur.blessure && joueur.blessure.semaines > 0) return;

        const gen = noteGlobale(joueur);
        const potentiel = joueur.potentiel ?? gen + 10;
        // Espérance ~0,6 point : il faut plusieurs séances pour gagner 1 point.
        const gagne = gainDUneSeance(
          joueur.age, potentiel, joueur.attributs[attribut], joueur.forme, Math.random,
        );

        const j = appliquerDeltas(
          { ...joueur, entrainementSemaine: numero },
          { [attribut]: gagne, forme: -4, moral: gagne ? 2 : -1 } as Partial<Record<StatVariable, number>>,
        );
        set((st) => ({
          joueur: j,
          journal: [
            ...st.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: gagne
                ? `💪 Séance réussie, +${gagne} ${ATTRIBUTS_LABELS[attribut]}`
                : '💪 Séance d’entraînement',
              texte: gagne
                ? `Tu as passé la semaine à travailler ton ${ATTRIBUTS_LABELS[attribut].toLowerCase()}. Le staff a vu la différence.`
                : `Semaine de travail sur ton ${ATTRIBUTS_LABELS[attribut].toLowerCase()} : rien de visible pour l'instant, mais rien ne se perd.`,
              deltas: { [attribut]: gagne, forme: -4 },
            },
          ],
        }));
        get().signalerDefi('entrainement');
      },

      // ---- MODE JOURNÉE PAR JOURNÉE ----
      // Une semaine du calendrier réel : un match de championnat, une affiche
      // de coupe d'Europe, une fenêtre internationale ou une trêve. À la
      // dernière semaine, la saison se clôt d'elle-même.
      // ═══ AVANCER JUSQU'À UNE DATE DU CALENDRIER ════════════════════════════
      //
      // ⚠️ CE QUI REMPLACE LA « SIMULATION DE SAISON ». Demande explicite :
      // « il faut pas qu'on puisse simuler la saison mais plus qu'on puisse
      // cliquer sur une date dans le calendrier et que ça nous y amène en
      // simulant tous les matchs ». Le mode rapide résumait l'année d'un trait
      // de plume — d'où « on a toujours 2 matchs, 0 essai » : les compteurs
      // venaient d'un `Math.random()` de fin de saison, pas de matchs joués.
      // Ici on JOUE chaque semaine, une par une, exactement comme si on avait
      // cliqué « semaine suivante » à la main. Les statistiques, la forme, les
      // blessures, les sélections et le classement en découlent naturellement.
      //
      // ⚠️ ON S'ARRÊTE À LA PREMIÈRE CHOSE QUI DEMANDE LE JOUEUR — une scène du
      // MJ, une offre de contrat à signer, la fin de saison, la retraite.
      // Enjamber ces moments-là, c'est exactement ce que faisait l'ancien mode
      // rapide, et c'est ce qu'on ne veut plus.
      avancerJusqua: (cible) => {
        cible = Number.isFinite(cible) ? Math.min(SEMAINES_PAR_SAISON + 1, Math.max(1, Math.floor(cible))) : 1;
        const depart = get().joueur?.semaine ?? 1;
        let semaines = 0;
        if (!get().joueur || cible <= depart) return { semaines, arret: 'arrive' };
        // ⚠️ ON VÉRIFIE LE BLOCAGE AVANT D'ENTRER DANS LA BOUCLE. Sinon on
        // comptait une semaine que `semaineSuivante` avait justement refusé de
        // jouer, et l'écran annonçait « 1 semaine jouée » sans que rien ne bouge.
        if (contratBloque(get().joueur)) return { semaines: 0, arret: 'contrat' };

        // ⚠️ PAS UNE SCÈNE PAR SEMAINE SAUTÉE. `semaineSuivante` lève
        // `attenteEvenement`, et l'écran Carrière fabrique alors une scène avec
        // l'IA. Sur un saut de quinze semaines, ce serait quinze générations — et
        // quinze questions empilées à l'arrivée. On lève le drapeau une seule
        // fois, à destination.
        set({ avanceRapide: true });
        let arret: 'arrive' | 'question' | 'saison' | 'contrat' | 'fin' = 'arrive';
        try {
          while ((get().joueur?.semaine ?? 1) < cible) {
            const avant = get().joueur!;
            if (get().evenementHebdo || get().scenarioActif) { arret = 'question'; break; }
            get().semaineSuivante();
            const apres = get().joueur;
            if (!apres) { arret = 'fin'; break; }                     // retraite
            // ⚠️ ON NE COMPTE QUE CE QUI A VRAIMENT ÉTÉ JOUÉ. `semaineSuivante`
            // peut refuser (contrat épuisé) : compter quand même annonçait des
            // semaines qui n'avaient pas eu lieu.
            if (apres.saison === avant.saison && apres.semaine === avant.semaine) {
              arret = contratBloque(apres) ? 'contrat' : 'question';
              break;
            }
            semaines++;
            if (apres.saison !== avant.saison) { arret = 'saison'; break; }
            // ⚠️ Le blocage de fin de contrat n'est plus un panneau ouvert :
            // c'est l'état de la fiche. Voir `contratBloque`.
            if (contratBloque(get().joueur)) { arret = 'contrat'; break; }
          }
        } finally {
          set({ avanceRapide: false });
        }
        // La scène de la semaine est demandée UNE fois, à l'arrivée.
        const arrivee = get().joueur;
        if (arrivee && !get().evenementHebdo && !get().scenarioActif
          && ((arrivee.semaine ?? 1) % 4 === 1)) {
          set({ attenteEvenement: true });
        }
        return { semaines, arret };
      },

      semaineSuivante: () => {
        let { joueur } = get();
        if (!joueur) return;
        joueur = actualiserRassemblements(joueur);
        // ⚠️ SANS CONTRAT, ON N'AVANCE PAS. Le panneau « Choix de carrière »
        // portait ce blocage ; il a été supprimé, donc il vit ici (voir
        // `contratBloque`). Sans ça, on jouerait la saison sans club.
        if (contratBloque(joueur)) return;
        const numero = joueur.semaine ?? 1;
        const sem = semaine(numero);

        // ═══ LES CLUBS DÉMARCHENT EN COURS D'ANNÉE ═════════════════════════
        // ⚠️ Décision de l'utilisateur : « intersaison plus dans l'année, mais
        // le transfert s'effectue qu'à l'intersaison, et entre en fin de contrat
        // en mode 1 an max restant ». `susciterApproches` porte la règle du
        // « un an maximum » ; ici on décide seulement de la FRÉQUENCE — assez
        // rare pour que recevoir un message reste un événement.
        if (!joueur.preAccord && Math.random() < 0.05) get().susciterApproches(1);

        // Dernière semaine : on referme la saison (bilan, trophées, mercato).
        if (numero >= SEMAINES_PAR_SAISON) {
          get().saisonSuivante();
          return;
        }

        const resultat = jouerSemaine(joueur, sem);
        // ⚠️ SI LE MATCH A ÉTÉ REGARDÉ, L'ESTIMATION N'EXISTE PLUS DU TOUT.
        // `enregistrerMatchVecu` a déjà payé la forme, le moral, la réputation,
        // la blessure éventuelle et les statistiques à partir de la VRAIE
        // performance. La condition portait sur `resultat.aJoue` : quand le
        // tirage de `jouerMatch` (indépendant de celui du moteur) décidait que
        // le joueur n'était pas dans le groupe, le journal affichait DEUX
        // résumés contradictoires — une feuille de match à 32 minutes suivie de
        // « tu n'es pas retenu dans le groupe ».
        const matchDejaVecu = get().matchRegarde === `${joueur.saison}#${numero}`;
        // ⚠️ LA SEMAINE COMMENCE PAR LA RÉCUPÉRATION, ET ELLE EST LA MÊME POUR
        // LES DEUX CHEMINS. Elle est appliquée ici, en un seul endroit, qu'on
        // ait regardé le match (la fatigue a déjà été payée par
        // `enregistrerMatchVecu`) ou non : c'est le seul moyen d'avoir un
        // barème de forme unique. Voir `recuperationHebdo`.
        const recuperation = recuperationHebdo(joueur);
        // ⚠️ `moralParSemaine` SOUFFRAIT DU MÊME BUG QUE `formeParSemaine` : il
        // était cumulé par `effetsTraits()` et jamais lu. Quatre traits sur
        // douze — Fêtard, Leader naturel, Ambitieux, Fidèle au maillot —
        // annonçaient un effet sur le moral qui n'existait pas. Il s'applique
        // désormais chaque semaine, comme la récupération physique.
        let j = appliquerDeltas(joueur, {
          forme: recuperation,
          moral: effetsTraits(joueur.traits).moralParSemaine,
        });
        j = appliquerDeltas(j, matchDejaVecu ? {} : resultat.deltas);

        // Suivi de l'infirmerie : on décompte, ou on encaisse une nouvelle blessure.
        if (resultat.soinBlessure && j.blessure) {
          const reste = j.blessure.semaines - 1;
          j = { ...j, blessure: reste > 0 ? { ...j.blessure, semaines: reste } : null };
        } else if (resultat.blessure && !matchDejaVecu) {
          j = appliquerDeltas({ ...j, blessure: resultat.blessure }, deltasBlessure(resultat.blessure));
        }
        // La mise au banc a pesé sur la feuille qui vient d'être jouée, puis sa
        // durée baisse. Elle disparaît proprement au terme de la sanction.
        if ((j.miseAuBanc?.semaines ?? 0) > 0) {
          const reste = j.miseAuBanc!.semaines - 1;
          j = { ...j, miseAuBanc: reste > 0 ? { ...j.miseAuBanc!, semaines: reste } : undefined };
        }
        const vecu: BilanEnCours = joueur.saisonEnCours ?? {
          matchs: 0, titularisations: 0, essais: 0, notes: [], capes: 0, stats: STATS_VIDES,
        };
        // ⚠️ Si le match a été REGARDÉ en direct, TOUT est déjà comptabilisé
        // par `enregistrerMatchVecu` : le match, les essais, la note et les
        // statistiques viennent du moteur — les vraies. On ne les simule pas
        // une seconde fois par-dessus, sinon le joueur compterait double.
        // ---- L'AUDIENCE SUIT LA CARRIÈRE ----
        // Une semaine de plus au haut niveau, c'est des abonnés en plus : le
        // compteur avance vers l'audience que mérite le joueur à son niveau,
        // dans SON club (`abonnesCible`). Sans ça, il ne bougeait qu'en publiant.
        // ⚠️ Pas plus de 1,2 % par semaine : sur les 43 semaines d'une saison,
        // c'est déjà 40 % de l'écart comblé. Plus vite, l'audience atteignait sa
        // cible en une demi-saison et le compteur ne racontait plus rien.
        const abonnes = rapprocherAbonnes(
          j.abonnes ?? 0,
          abonnesCible(j.nom, j.club, noteGlobale(j), j.reputation),
          0.012,
        );

        j = {
          ...j,
          semaine: numero + 1,
          abonnes,
          saisonEnCours: {
            matchs: vecu.matchs + (resultat.aJoue && !matchDejaVecu ? 1 : 0),
            titularisations: vecu.titularisations
              + (resultat.titulaire && !matchDejaVecu ? 1 : 0),
            essais: vecu.essais + (matchDejaVecu ? 0 : resultat.essais),
            notes: resultat.note != null && !matchDejaVecu ? [...vecu.notes, resultat.note] : vecu.notes,
            capes: vecu.capes + (resultat.cape && !matchDejaVecu ? 1 : 0),
            stats: resultat.stats && !matchDejaVecu
              ? additionnerStats(vecu.stats, resultat.stats)
              : vecu.stats,
          },
        };

        if (resultat.cape && !matchDejaVecu) {
          const bilan = ajouterMatchInternational({ ...j, semaine: numero }, resultat.essais, resultat.stats?.points ?? resultat.essais * 5, resultat.titulaire);
          j = { ...j, international: bilan.international };
        }
        j = actualiserRassemblements(j);

        // ---- LOT 6 : le match n'est pas fini quand la sirène sonne ----
        // Un moment décisif (le choix de la 80ᵉ) ou le micro d'après-match.
        // Rien d'obligatoire : ça ne tombe que de temps en temps, et jamais
        // deux choses à la fois.
        // ⚠️ Quand le match a été REGARDÉ, c'est la vraie note du moteur qui
        // décide de l'après-match, pas celle de l'estimation qu'on vient de
        // neutraliser — sinon on décrochait une interview « exploit » après une
        // feuille de match à 4/10.
        const notesVecues = j.saisonEnCours?.notes ?? [];
        const aJoue = matchDejaVecu ? true : resultat.aJoue;
        const note = matchDejaVecu
          ? notesVecues[notesVecues.length - 1]
          : resultat.note;

        // ═══ LE RÉCIT DE LA SEMAINE ═══════════════════════════════════════
        // ⚠️ LES « MOMENTS DÉCISIFS » ONT SAUTÉ (retour de jeu : « supprime les
        // scénarios de matchs car le match est déjà passé »). On posait ici, une
        // fois sur cinq, un choix de 80ᵉ minute — alors que la feuille de match
        // venait d'être écrite au journal, score compris. Absurde, et ça ne
        // pouvait pas l'être moins : `resultatSemaine` a déjà tout tranché.
        //
        // À la place : on DEMANDE une scène pour la semaine qui commence.
        // L'écran s'en charge (la génération est asynchrone) et rappelle
        // `poserEvenementHebdo`. Sans clé, il retombe sur les scénarios à choix
        // multiples du pool — le jeu reste entier hors ligne.
        //
        // L'interview d'après-match, elle, reste : elle arrive APRÈS le match,
        // c'est sa raison d'être. Mais seulement quand aucune scène n'attend,
        // pour ne jamais empiler deux choses à répondre.
        // ⚠️ PENDANT UNE AVANCE RAPIDE, ON NE POSE RIEN. Ni scène du MJ, ni
        // interview : on traverse les semaines pour arriver à une date, et
        // `avancerJusqua` lèvera le drapeau une seule fois, à l'arrivée. Sans
        // ça, chaque semaine sautée déclenchait une génération — et une
        // interview d'après-match tombée en route bloquait le saut net.
        const enAvance = get().avanceRapide;
        let suite: Scenario | null = null;
        const rienEnCours = !get().scenarioActif && !get().evenementHebdo;
        if (!enAvance && rienEnCours && aJoue && note != null && Math.random() < 0.18) {
          if (note >= 7.8) suite = interviewAleatoire('exploit');
          else if (note <= 4.5) suite = interviewAleatoire('defaite');
        }

        set((s) => ({
          joueur: j,
          scenarioActif: suite ?? s.scenarioActif,
          // Une seule scène à la fois : si une interview vient de tomber, la
          // semaine n'en réclame pas une deuxième.
          // Une scène environ toutes les quatre semaines : le récit reste vivant
          // sans bloquer la carrière à chaque passage de calendrier.
          attenteEvenement: !enAvance && rienEnCours && !suite && numero % 4 === 1,
          journal: [
            ...s.journal,
            // ⚠️ Si le match vient d'être JOUÉ en direct, on n'ajoute PAS le
            // récit simulé : il racontait une autre histoire que la feuille de
            // match (« tu es resté sur le banc » alors qu'on venait de jouer
            // 80 minutes). La feuille de match, elle, est déjà au journal.
            ...(matchDejaVecu ? [] : [{
              id: idUnique(),
              saison: j.saison,
              role: 'systeme' as const,
              titre: `${resultat.emoji} ${libelleDate(sem)} - ${resultat.titre}`,
              texte: resultat.texte,
              // ⚠️ La récupération EST dans les deltas affichés. Un gain qu'on
              // ne voit pas n'existe pas pour le joueur : c'est ce qui donnait
              // l'impression qu'on ne récupérait jamais.
              deltas: {
                ...resultat.deltas,
                forme: (resultat.deltas.forme ?? 0) + recuperation,
              },
            }]),
            ...(suite
              ? [{
                  id: idUnique(),
                  saison: j.saison,
                  role: 'mj' as const,
                  titre: `${suite.emoji} ${suite.titre}`,
                  texte: suite.situation,
                }]
              : []),
          ],
        }));

        // ---- LOT 7 : défis de la semaine et succès ----
        // ⚠️ On signale AVANT que la semaine ne change vraiment de numéro dans
        // l'esprit du joueur : `signalerDefi` lit `j.semaine`, déjà incrémenté,
        // donc on repasse par la semaine qui vient d'être jouée.
        // ⚠️ Rien à re-signaler quand le match a été regardé : `enregistrerMatchVecu`
        // l'a déjà fait sur les VRAIS chiffres du moteur.
        const enJeu = { ...j, semaine: numero };
        set({ joueur: enJeu });
        if (!matchDejaVecu) {
          if (resultat.aJoue) get().signalerDefi('match');
          if (resultat.essais > 0) get().signalerDefi('essai');
          if ((resultat.note ?? 0) >= 7) get().signalerDefi('note7');
          if ((resultat.note ?? 0) >= 8) get().signalerDefi('note8');
          if (resultat.victoire) get().signalerDefi('victoire');
          if ((resultat.stats?.plaquages ?? 0) >= 8) get().signalerDefi('plaquages');
          if ((resultat.stats?.butsReussis ?? 0) > 0) get().signalerDefi('transformation');
        }
        set({ joueur: j });
        // ---- LA JOURNÉE EST REJOUÉE EN FOND ----
        // C'est ici que les statistiques individuelles de toute la poule sont
        // produites, juste après le match du joueur.
        get().simulerStatsJournee(numero);

        // ---- LA SÉANCE DE LA SEMAINE SE FAIT TOUTE SEULE ----
        // ⚠️ On ne clique plus sur un secteur chaque semaine : on choisit une
        // fois ce qu'on travaille (`entrainementFocus`), et la séance tombe
        // automatiquement. On peut changer de secteur quand on veut.
        if (j.entrainementFocus && !(j.blessure && j.blessure.semaines > 0)) {
          get().entrainer(j.entrainementFocus);
        }

        // Une candidature refusée n'est pas oubliée : une vraie progression
        // de cote suffit à faire réexaminer le dossier par le club concerné.
        get().examinerDossiersRecrutement();

        // ---- L'OVALE SUIT LE CALENDRIER ----
        // Une semaine jouée = une nouvelle fournée de publications, datée.
        get().vivreSemaineSociale();
        get().verifierSucces();
        // ⚠️ ET LA CARRIÈRE EN COURS ENTRE AU CLASSEMENT, sans attendre la fin
        // de la saison. Les deux freins de `publierAuClassement` font que ça ne
        // part réellement que si le score a bougé, et au plus une fois par dix
        // minutes : une avance de douze semaines ne produit donc qu’un envoi.
        get().publierAuClassement();
        // ⚠️ EN DERNIER, PARCE QUE C'EST DÉFINITIF. Une blessure de gravité
        // `carriere` tirée par le match arrête vraiment la carrière (voir
        // `raccrocherSurBlessure`) — la semaine se termine normalement avant.
        if (j.blessure?.gravite === 'carriere') get().raccrocherSurBlessure();
      },

      // ---- Marché des transferts ----
      // ═══════════════════════════════════════════════════════════════════════
      // LE MARCHÉ DES TRANSFERTS — tout se passe sur 𝕏 L'Ovale
      // ═══════════════════════════════════════════════════════════════════════
      // ⚠️ Demande explicite : « refaire tout le système de transfert, que ça se
      // passe par X : un club envoie un message et c'est à nous de négocier ».
      // Le panneau « Choix de carrière » a disparu — il présentait des cartes à
      // prendre ou à laisser, sans un mot échangé.
      //
      // ⚠️ TROIS RÈGLES DONNÉES PAR L'UTILISATEUR, ET ELLES SONT ICI :
      //   1. un club ne démarche QUE s'il reste au plus UN an de contrat ;
      //   2. on peut être approché EN COURS DE SAISON…
      //   3. …mais le transfert ne s'applique QU'À L'INTERSAISON (`preAccord`).

      /**
       * Fait écrire des clubs. Renvoie le nombre d'approches réellement nées.
       * @param demande true = on s'est mis sur le marché (barre abaissée).
       */
      susciterApproches: (maximum = 2, demande = false, clubCible?: string) => {
        const joueur = get().joueur;
        if (!joueur) return 0;
        // ⚠️ LA RÈGLE DU « UN AN MAX RESTANT ». Un club n'écrit pas à un joueur
        // sous contrat pour trois ans : ça n'existe pas, et ça rendrait le
        // marché permanent. Une demande explicite du joueur passe outre — c'est
        // lui qui a fait savoir qu'il voulait partir.
        const restant = joueur.contrat?.saisons ?? 0;

        // ⚠️ ET UNE EXCEPTION QUI N'EST PAS UN CONTOURNEMENT : UN JOUEUR QUI NE
        // JOUE PAS EST SUR LE DÉPART, quel que soit son contrat.
        //
        // Mesuré, sans elle : un espoir de 32 de générale recruté par un club
        // noté 58 y restait DOUZE SAISONS sans pouvoir en bouger — la médiane de
        // difficulté s'écroulait de 58 à 32 et plus AUCUNE carrière sur 100 ne
        // dépassait 40. C'est la mobilité qui permet à un jeune de trouver son
        // niveau, d'y jouer, et donc de progresser (`noterSaison` compare le
        // joueur à son groupe).
        //
        // Et c'est réaliste : un club qui ne fait pas jouer un joueur le prête
        // ou le laisse partir. La règle du « un an max » vise les clubs qui
        // DÉBAUCHENT un joueur qui réussit — pas un joueur dont personne ne veut
        // dans son propre vestiaire.
        const enDessous = noteGlobale(joueur) < forceEffectif(joueur.club, joueur.saison) - 12;
        if (!demande && !enDessous && restant > 1) return 0;

        const dejaVues = new Set(
          get().approches.filter((a) => a.saison === joueur.saison).map((a) => a.club),
        );
        // Deux années de mémoire suffisent à renouveler les appels sans rendre
        // impossible le retour d'un club réellement insistant plus tard.
        const clubsRecents = get().approches
          .filter((a) => !a.prolongation && a.saison >= joueur.saison - 2)
          .map((a) => a.club);
        // On réutilise LE moteur du marché : cote, besoin au poste, saut
        // d'étage, salaires par âge. Rien n'est recalculé ici.
        const offres = genererOffres(joueur, {
          saison: joueur.saison, maximum: maximum + 3, demande, clubCible, clubsRecents,
        })
          // Une candidature directe ne doit JAMAIS être remplacée par
          // l'offre d'un autre club. C'était la cause du silence observé :
          // le moteur trouvait un autre prétendant, renvoyait « 1 offre »,
          // puis le fil du club contacté restait sans réponse.
          .filter((o) => (!clubCible || o.club === clubCible) && !dejaVues.has(o.club))
          .slice(0, maximum);
        if (!offres.length) return 0;

        const semaine = joueur.semaine ?? 1;
        const nouvelles = offres.map((o) => approcheDepuisOffre(o, joueur, semaine));
        set((s) => ({
          approches: [...s.approches, ...nouvelles],
          dossiersRecrutement: Object.fromEntries(
            Object.entries(s.dossiersRecrutement)
              .filter(([, dossier]) => !nouvelles.some((a) => a.club === dossier.club)),
          ),
          // Le premier mot du club arrive en message privé, comme n'importe qui.
          conversations: nouvelles.reduce((acc, a) => ({
            ...acc,
            [a.pseudo]: [
              ...(acc[a.pseudo] ?? []),
              {
                id: idUnique(),
                pseudo: a.pseudo,
                de: 'lui' as const,
                texte: `Bonjour, ${joueur.nom}. Ici ${a.club} (${a.divisionNom}). `
                  + `On suit ce que tu fais et on aimerait t'avoir la saison prochaine. `
                  + `Ce qu'on met sur la table : ${resumerTermes(a.offre)}. On en discute ?`,
                saison: joueur.saison,
                semaine: joueur.semaine ?? 1, creeLe: Date.now(),
                lu: false,
              },
            ],
          }), { ...s.conversations }),
          notifsSocial: [
            {
              id: idUnique(),
              emoji: '✉️',
              titre: `${nouvelles.length} club${nouvelles.length > 1 ? 's te contactent' : ' te contacte'}`,
              texte: nouvelles.map((a) => a.club).join(', '),
              saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lue: false,
            },
            ...s.notifsSocial,
          ].slice(0, 40),
          journal: [...s.journal, {
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme' as const,
            titre: `✉️ ${nouvelles.length} club${nouvelles.length > 1 ? 's t’écrivent' : ' t’écrit'}`,
            texte: `${nouvelles.map((a) => `${a.club} (${a.divisionNom})`).join(' · ')}. `
              + `Réponds dans tes messages privés sur 𝕏 L'Ovale, c'est là que ça se négocie.`,
          }],
        }));
        return nouvelles.length;
      },

      examinerDossiersRecrutement: () => {
        const joueur = get().joueur;
        if (!joueur || joueur.preAccord) return 0;
        const actuelle = cote(joueur);
        let offresCreees = 0;

        // Une progression de cote d'un point correspond déjà à plusieurs
        // gains d'attributs : c'est assez significatif pour rouvrir un dossier,
        // sans faire relancer le même club après chaque petite séance.
        for (const [pseudo, dossier] of Object.entries(get().dossiersRecrutement)) {
          const approcheExistante = get().approches.some((a) =>
            a.club === dossier.club && (a.etat === 'ouverte' || a.etat === 'accord'));
          if (joueur.club === dossier.club || approcheExistante) {
            set((s) => {
              const { [pseudo]: _retire, ...restants } = s.dossiersRecrutement;
              return { dossiersRecrutement: restants };
            });
            continue;
          }

          const nouvelleSaison = joueur.saison > dossier.derniereSaisonEtudiee;
          const progression = actuelle >= dossier.derniereCoteEtudiee + 1;
          if (!nouvelleSaison && !progression) continue;

          // On date l'examen avant de lancer le marché : si le club refuse
          // encore, la semaine suivante ne doit pas recommencer en boucle.
          set((s) => ({
            dossiersRecrutement: {
              ...s.dossiersRecrutement,
              [pseudo]: {
                ...dossier,
                derniereCoteEtudiee: actuelle,
                derniereSaisonEtudiee: joueur.saison,
              },
            },
          }));
          offresCreees += get().susciterApproches(1, true, dossier.club);
        }
        return offresCreees;
      },

      /** Une demande faite au club. Les chiffres tranchent, pas l'IA. */
      repondreApproche: (id, levier) => {
        const { joueur, approches } = get();
        const a = approches.find((x) => x.id === id);
        if (!joueur || !a || a.etat !== 'ouverte') return null;
        const def = LEVIER_PAR_ID[levier];
        const r = repondreAuClub(a, levier);
        set((s) => ({
          approches: s.approches.map((x) => (x.id === id ? r.approche : x)),
          conversations: {
            ...s.conversations,
            [a.pseudo]: [
              ...(s.conversations[a.pseudo] ?? []),
              { id: idUnique(), pseudo: a.pseudo, de: 'moi', texte: phraseLevier(def.id), saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: true },
              { id: idUnique(), pseudo: a.pseudo, de: 'lui', texte: r.texte, saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false },
            ],
          },
        }));
        return r;
      },

      /**
       * On serre la main. ⚠️ RIEN NE BOUGE TOUT DE SUITE : c'est un PRÉ-ACCORD,
       * appliqué à l'intersaison par `saisonSuivante`.
       */
      accepterApproche: (id) => {
        const { joueur, approches } = get();
        const a = approches.find((x) => x.id === id);
        if (!joueur || !a || a.etat !== 'ouverte') return;
        // Sans contrat valide, on ne serre pas la main pour l'été prochain : on
        // signe maintenant (voir le commentaire en bas de cette fonction).
        const libre = contratBloque(joueur);
        const preAccord: PreAccord = {
          club: a.club, division: a.division, divisionNom: a.divisionNom,
          salaire: a.offre.salaire, prime: a.offre.prime, primeMatch: a.offre.primeMatch,
          saisons: a.offre.saisons,
          garantie: a.offre.garantie, etranger: a.etranger, prolongation: a.prolongation,
          saison: joueur.saison,
        };
        set((s) => ({
          joueur: { ...joueur, preAccord },
          // Toutes les autres discussions se ferment : on a donné sa parole.
          approches: s.approches.map((x) =>
            x.id === id ? { ...x, etat: 'accord' as const }
              : x.etat === 'ouverte' ? { ...x, etat: 'rompue' as const } : x),
          conversations: {
            ...s.conversations,
            [a.pseudo]: [
              ...(s.conversations[a.pseudo] ?? []),
              { id: idUnique(), pseudo: a.pseudo, de: 'moi', texte: 'C’est d’accord. On se voit cet été.', saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: true },
              {
                id: idUnique(), pseudo: a.pseudo, de: 'lui', saison: joueur.saison,
                texte: `Parfait. On officialise à l’intersaison : ${resumerTermes(a.offre)}. `
                  + `D’ici là, finis ta saison, et pas un mot à la presse.`,
                semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
              },
            ],
          },
          journal: [...s.journal, {
            id: idUnique(),
            saison: joueur.saison,
            role: 'systeme' as const,
            titre: a.prolongation ? `🤝 Accord de prolongation à ${a.club}` : `🤝 Accord trouvé avec ${a.club}`,
            texte: `${resumerTermes(a.offre)}. `
              + (libre
                ? 'Tu étais sans club : la signature prend effet immédiatement.'
                : `⚠️ Rien ne change avant l'intersaison : tu finis la saison à ${joueur.club}.`),
          }],
        }));
        // ═══ UN JOUEUR LIBRE SIGNE ET JOUE — TOUT DE SUITE ═══════════════════
        // ⚠️ LA RÈGLE « LE TRANSFERT NE SE FAIT QU'À L'INTERSAISON » VISE UN
        // JOUEUR SOUS CONTRAT. Appliquée à un joueur libre, elle produisait
        // l'inverse de ce qu'elle protège : contrat épuisé (ou rompu par une
        // exclusion) → `contratBloque()` gèle le calendrier → le joueur signe
        // → mais le pré-accord n'était consommé qu'à la fin de la saison
        // SUIVANTE, celle qu'il ne pouvait pas jouer. Il restait donc affiché
        // au club qu'il venait de quitter, sans contrat, sans match, jusqu'à
        // la fin des temps. Un joueur sans club signe et joue le samedi : c'est
        // ce que fait cette ligne, et c'est ce que la vraie vie fait aussi.
        if (libre) get().appliquerPreAccord();
        get().verifierSucces();
      },

      /** On décline. Le club n'insistera pas cette saison. */
      refuserApproche: (id) => {
        const { joueur, approches } = get();
        const a = approches.find((x) => x.id === id);
        if (!joueur || !a || a.etat !== 'ouverte') return;
        set((s) => ({
          approches: s.approches.map((x) => (x.id === id ? { ...x, etat: 'rompue' as const } : x)),
          conversations: {
            ...s.conversations,
            [a.pseudo]: [
              ...(s.conversations[a.pseudo] ?? []),
              { id: idUnique(), pseudo: a.pseudo, de: 'moi', texte: 'Merci, mais je ne suis pas intéressé.', saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: true },
              { id: idUnique(), pseudo: a.pseudo, de: 'lui', texte: 'Dommage. Bonne fin de saison.', saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false },
            ],
          },
        }));
      },

      /** Le pré-accord devient un vrai contrat. Appelé à l'intersaison. */
      appliquerPreAccord: () => {
        const joueur = get().joueur;
        const p = joueur?.preAccord;
        if (!joueur || !p) return;
        const reste = p.club === joueur.club;
        const confiance = confianceALArrivee(
          { salaire: p.salaire, prime: p.prime, primeMatch: p.primeMatch, saisons: p.saisons, garantie: p.garantie },
          p.prolongation,
        );
        const arrive: Joueur = {
          ...joueur,
          club: p.club,
          division: p.division,
          preAccord: undefined,
          capitaine: reste ? joueur.capitaine : false,
          // Nouveau club = nouveau staff. Une garantie de temps de jeu, c'est un
          // coach qui t'attend : ça se lit dès la première feuille de match.
          confianceCoach: reste ? joueur.confianceCoach : confiance,
          argent: joueur.argent + p.prime,
          moral: borne(joueur.moral + (reste ? 6 : 10)),
          reputation: borne(joueur.reputation + (p.etranger ? 6 : reste ? 2 : 4)),
          contrat: {
            club: p.club, division: p.division, saisons: p.saisons, salaire: p.salaire,
            ...(p.primeMatch ? { primeMatch: p.primeMatch } : {}),
          },
          // ⚠️ C'EST LE SEUL ENDROIT OÙ LE JOUEUR CHANGE DE CLUB. On y tient la
          // liste des maillots portés — une prolongation ne la rallonge pas.
          clubs: reste
            ? (joueur.clubs ?? [joueur.club])
            : [...(joueur.clubs ?? [joueur.club]), p.club],
        };
        const abonnesApres = rapprocherAbonnes(
          arrive.abonnes ?? 0,
          abonnesCible(arrive.nom, arrive.club, noteGlobale(arrive), arrive.reputation),
          0.45,
        );
        const gagnes = abonnesApres - (arrive.abonnes ?? 0);
        const j: Joueur = {
          ...arrive,
          abonnes: abonnesApres,
          apportClub: calculerApportClub(arrive),
        };
        set((s) => ({
          joueur: j,
          // Les discussions de l'an passé sont closes.
          approches: s.approches.filter((a) => a.saison >= j.saison),
          journal: [...s.journal, {
            id: idUnique(),
            saison: j.saison,
            role: 'systeme',
            titre: reste ? `✍️ Prolongation à ${p.club}` : `✍️ Signature à ${p.club}`,
            // ⚠️ UN CLUB AMATEUR N'ANNONCE PAS « 0 € par saison » : il défraie la
            // feuille de match, et c'est ce qu'il faut écrire.
            texte: (reste
              ? `Tu prolonges de ${p.saisons} saison${p.saisons > 1 ? 's' : ''} à ${p.club} (${p.divisionNom}) pour ${remuneration(p)}.`
              : `${p.club} (${p.divisionNom}) t'engage pour ${p.saisons} saison${p.saisons > 1 ? 's' : ''} : `
                + `${remuneration(p)}${p.prime > 0 ? ` et ${p.prime.toLocaleString('fr-FR')} € à la signature` : ''}.`
                + (p.garantie ? ' Le coach s’est engagé sur ton temps de jeu.' : '')
                + (p.etranger ? ' Direction l’étranger, nouvelle langue, nouveau rugby.' : ''))
              + (gagnes >= 50
                ? ` 𝕏 L'annonce tourne : **+${gagnes.toLocaleString('fr-FR')} abonnés** sur L'Ovale.`
                : gagnes <= -50
                  ? ` 𝕏 Un étage plus bas, les projecteurs s'éloignent : ${gagnes.toLocaleString('fr-FR')} abonnés.`
                  : ''),
          }],
        }));
        get().verifierSucces();
      },

      // Passé 30 ans, transmettre ralentit la chute : le corps s'entretient et
      // le vestiaire vous garde une place (voir lib/progression.ts).
      prendreMentorat: () => {
        const joueur = get().joueur;
        if (!joueur || joueur.age < 30 || joueur.mentorat) return;
        set((st) => ({
          joueur: { ...joueur, mentorat: true, moral: borne(joueur.moral + 8) },
          journal: [
            ...st.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'systeme',
              titre: '🧑‍🏫 Mentor',
              texte: 'Tu prends un jeune du centre de formation sous ton aile. Les séances vidéo remplacent les fins de soirée : ton corps te dit merci, et le vestiaire te regarde autrement.',
            },
          ],
        }));
      },

      /**
       * SE METTRE SUR LE MARCHÉ. ⚠️ C'est le SEUL moyen de faire écrire des
       * clubs quand il reste plus d'un an de contrat — la règle du « un an max »
       * (`susciterApproches`) ne s'applique pas à une demande explicite. Et ça
       * se paie : le vestiaire apprend qu'on veut partir.
       */
      demanderTransfert: () => {
        const joueur = get().joueur;
        if (!joueur) return;
        const j = appliquerDeltas(joueur, { moral: -6, reputation: -2 });
        set({ joueur: j });
        const nees = get().susciterApproches(3, true);
        set((s) => ({
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'systeme',
              titre: '📣 Demande de transfert',
              texte: nees
                ? `Ton agent a fait passer le message. ${nees} club${nees > 1 ? 's se positionnent' : ' se positionne'} et t'écrit sur 𝕏 L'Ovale, le vestiaire, lui, apprécie moyennement.`
                : "Ton agent a fait le tour du marché : personne ne se positionne à ton niveau pour l'instant. Le vestiaire, lui, a entendu parler de ta demande.",
            },
          ],
        }));
      },

      evenementAleatoire: () => {
        const { joueur, compteurs } = get();
        if (!joueur || compteurs.evenements >= MAX_PAR_SAISON) return;
        const evt = traduireEvenement(EVENEMENTS[Math.floor(Math.random() * EVENEMENTS.length)]);
        const j = appliquerDeltas(joueur, evt.deltas);
        set((s) => ({
          joueur: j,
          coins: s.coins + gainOvas(evt.ovas),
          compteurs: { ...s.compteurs, evenements: s.compteurs.evenements + 1 },
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: j.saison,
              role: 'mj',
              titre: `${evt.emoji} ${evt.titre}`,
              texte: evt.recit,
              deltas: evt.deltas,
              evenement: evt.titre,
            },
          ],
        }));
      },

      lancerScenario: (compter = true) => {
        const { joueur, scenarioActif, evenementHebdo, compteurs } = get();
        if (!joueur || scenarioActif || evenementHebdo) return;
        // ⚠️ LE RATIONNEMENT NE VAUT QUE POUR LE BOUTON MANUEL. Le récit
        // hebdomadaire tombe chaque semaine — 43 fois par saison — et n'a rien à
        // faire dans un compteur calibré pour deux situations par an.
        if (compter && compteurs.situations >= MAX_PAR_SAISON) return;
        // ⚠️ LA SITUATION EST CONTEXTUELLE. On ne propose plus « ton premier
        // contrat pro » à un joueur de 33 ans : `situationPour` filtre sur
        // l'âge, la forme, le moral, la division, le contrat (data/situations.ts),
        // et on évite celles déjà vues cette saison.
        const vues = get().situationsVues ?? [];
        const s = situationPour(joueur, vues);
        if (s) {
          set((st) => ({ situationsVues: [...(st.situationsVues ?? []), s.id].slice(-30) }));
          get().poserSituation(versScenario(s));
          return;
        }
        get().poserSituation(scenarioDuPool());
      },

      // Boucle unifiée du lot 6 : le jeu pose UNE situation à choix. Elle vient
      // du pool pré-écrit, d'un moment décisif, d'une interview ou de l'IA locale —
      // à partir d'ici, c'est exactement la même chose.
      poserSituation: (sc, compter = true) => {
        const { joueur, scenarioActif } = get();
        if (!joueur || scenarioActif) return;
        set((s) => ({
          scenarioActif: sc,
          compteurs: compter
            ? { ...s.compteurs, situations: s.compteurs.situations + 1 }
            : s.compteurs,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'mj',
              titre: `${sc.emoji} ${sc.titre}`,
              texte: sc.situation,
            },
          ],
        }));
      },

      // ═══════════════════════════════════════════════════════════════════════
      // L'ÉVÈNEMENT DE LA SEMAINE
      // ═══════════════════════════════════════════════════════════════════════
      // Demande explicite : « chaque semaine l'IA sort un évènement, le joueur
      // répond en écrivant, et l'IA juge la réponse — très sévère, en tenant
      // compte des stats ».

      poserEvenementHebdo: (evt) => {
        const { joueur, scenarioActif, evenementHebdo } = get();
        // Deux scènes en même temps, jamais : le joueur ne saurait plus à quoi
        // il répond, et le MJ non plus.
        if (!joueur || scenarioActif || evenementHebdo) return;
        set((s) => ({
          evenementHebdo: evt,
          attenteEvenement: false,
          // Les titres servent à l'IA pour ne pas se répéter ; douze suffisent.
          evenementsVus: [...s.evenementsVus, evt.titre].slice(-12),
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'mj',
              titre: `${evt.emoji} ${evt.titre}`,
              texte: evt.texte,
            },
          ],
        }));
      },

      abandonnerEvenement: () => set({ attenteEvenement: false }),

      appliquerJugement: (jugement, reponse) => {
        const { joueur, evenementHebdo, compteurs } = get();
        if (!joueur || !evenementHebdo) return;

        // ⚠️ LA CONSÉQUENCE DURE N'EST JAMAIS UNE SURPRISE. `lib/ia.ts` ne l'a
        // laissée passer que si la scène était marquée `risque`, OU si la
        // réponse du joueur EST elle-même la faute (insulter son club, truquer
        // un match, prendre le volant ivre). C'est la traduction de la demande :
        // « des folies furieuses qui peuvent mener à la mort, l'arrestation »,
        // et « toute action qui porte atteinte au club, c'est l'exclusion ».
        const suites = appliquerSuitesMJ(
          appliquerDeltas(joueur, jugement.deltas),
          {
            consequence: jugement.consequence,
            semaines: jugement.semaines,
            // Sans motif écrit par le MJ, le titre de la scène fait l'affaire.
            motif: jugement.motif ?? evenementHebdo.titre,
            club: jugement.club,
          },
          compteurs,
        );
        const j = suites.joueur;

        const entrees: EntreeJournal[] = [
          { id: idUnique(), saison: j.saison, role: 'joueur', texte: reponse },
          {
            id: idUnique(),
            saison: j.saison,
            role: 'mj',
            titre: jugement.titre,
            texte: jugement.recit,
            deltas: jugement.deltas,
          },
        ];
        if (jugement.recadre) {
          entrees.push({
            id: idUnique(), saison: j.saison, role: 'systeme', titre: '⚖️ Réalisme',
            texte:
              'Le récit est joué, mais les gains ont été ramenés à ce qu’une carrière réelle permet. '
              + 'On ne progresse pas en le demandant : entraîne-toi, joue, et laisse les saisons faire.',
          });
        }
        entrees.push(...suites.entrees);

        // ⚠️ C'EST LA SCÈNE HEBDOMADAIRE — 43 par saison. Sans le plafond
        // ci-dessous, répondre à sa semaine rapportait à lui seul ~500 Ovas par
        // carrière, autant que tout le reste du jeu réuni.
        const primeHebdo = Math.min(1, Math.max(0,
          PLAFOND_OVAS_ACTIONS_PAR_SAISON - (get().compteurs.ovasActions ?? 0)));
        set((s) => ({
          joueur: j,
          evenementHebdo: null,
          attenteEvenement: false,
          coins: s.coins + primeHebdo,
          compteurs: {
            ...s.compteurs,
            gainsIA: s.compteurs.gainsIA + jugement.attributsGagnes,
            ovasActions: (s.compteurs.ovasActions ?? 0) + primeHebdo,
            augmentations: (s.compteurs.augmentations ?? 0) + (suites.augmentation ? 1 : 0),
            primesIA: (s.compteurs.primesIA ?? 0) + suites.primeVersee,
          },
          journal: [...s.journal, ...entrees],
        }));

        // ⚠️ UN TRANSFERT ANNONCÉ DOIT SE PRODUIRE. Le MJ ne change jamais de
        // club dans son récit (le prompt le lui interdit) : quand la réponse du
        // joueur revient à vouloir partir, on ouvre le VRAI marché — celui qui
        // change le club, la division, le salaire et la durée quand on signe.
        if (jugement.marche && !suites.finale && !suites.sansClub) get().demanderTransfert();
        // Licencié : le marché s'ouvre TOUT DE SUITE, sinon la carrière se fige.
        if (suites.sansClub) get().retrouverUnClub();

        get().signalerDefi('situation');
        get().verifierSucces();
        if (suites.finale) get().prendreRetraite(
          undefined, motifFinDepuisConsequence(jugement.consequence),
          jugement.motif ?? evenementHebdo.titre,
        );
      },

      /**
       * LE JOUEUR VIENT D'ÊTRE LICENCIÉ — ET IL FAUT QU'IL PUISSE REBONDIR.
       *
       * ⚠️ SANS CETTE FONCTION, UNE EXCLUSION FIGEAIT LA PARTIE. Un contrat à
       * zéro saison rend `contratBloque()` vrai : `semaineSuivante` refuse
       * d'avancer, `saisonSuivante` refuse de démarrer, et la seule porte de
       * sortie — le mercato — ne s'ouvre qu'à l'intersaison. Le joueur restait
       * planté sur sa semaine, pour toujours.
       *
       * On ouvre donc le marché dans la seconde. Et si vraiment personne n'en
       * veut, on ne laisse pas le joueur en suspens : le rugby s'arrête là,
       * exactement comme quand un contrat se termine sans repreneur.
       */
      retrouverUnClub: () => {
        const joueur = get().joueur;
        if (!joueur) return;
        const ouvertes = get().approches.filter((a) => a.etat === 'ouverte').length;
        const nees = get().susciterApproches(4, true);
        if (nees > 0 || ouvertes > 0) {
          set((s) => ({
            journal: [...s.journal, {
              id: idUnique(), saison: joueur.saison, role: 'systeme' as const,
              titre: '📞 Il va falloir retrouver un club',
              texte: 'Sans contrat, tu ne joues plus une minute : le calendrier s’arrête pour toi. '
                + 'Ouvre tes messages privés sur 𝕏 L’Ovale, négocie, et signe : '
                + 'cette fois, la signature prend effet immédiatement.',
            }],
          }));
          return;
        }
        set((s) => ({
          journal: [...s.journal, {
            id: idUnique(), saison: joueur.saison, role: 'mj' as const,
            titre: '🚪 Plus aucun club',
            texte: `Le téléphone ne sonne pas. Après ce que tu as fait, plus personne `
              + `ne veut de ton nom sur une feuille de match : la carrière s'arrête ici.`,
          }],
        }));
        get().prendreRetraite(undefined, 'sansClub',
          'Après la rupture du contrat, aucun club n’a accepté de relancer la carrière.');
      },

      // ---- AGENT (lot 6) : il prélève sa commission, mais ouvre les portes ----
      /**
       * SIGNER AVEC UN AGENT — ou s'en séparer.
       *
       * ⚠️ IL PEUT REFUSER (demande explicite : « on peut pas vraiment le
       * choisir, ça dépend de nos performances »). On cochait un nom dans une
       * liste dès la première semaine : le requin qui fait exploser les salaires
       * était accessible à un joueur de Régionale 3. Chaque agent a maintenant
       * sa barre (`SEUIL_AGENT`), et se faire jeter coûte du moral.
       * Renvoie `true` si l'agent a dit oui.
       */
      choisirAgent: (id) => {
        const joueur = get().joueur;
        if (!joueur) return false;
        const agent = agentDe(id);
        if (joueur.agent === agent.id) return false;

        // Se séparer de son agent est toujours possible — c'est le seul sens
        // dans lequel le joueur décide seul.
        if (!agent.id) {
          set((s) => ({
            joueur: { ...joueur, agent: undefined },
            journal: [...s.journal, {
              id: idUnique(), saison: joueur.saison, role: 'systeme' as const,
              titre: `${agent.emoji} Sans agent`,
              texte: 'Tu te sépares de ton agent : désormais, tu négocies seul, '
                + 'et le marché s\'en ressent.',
            }],
          }));
          return true;
        }

        const niveau = niveauPourAgent(cote(joueur), joueur.reputation);
        const seuil = SEUIL_AGENT[agent.id] ?? 99;
        if (niveau < seuil) {
          // Poli, mais c'est non. Et ça pique.
          set((s) => ({
            joueur: appliquerDeltas(joueur, { moral: -4 }),
            journal: [...s.journal, {
              id: idUnique(), saison: joueur.saison, role: 'mj' as const,
              titre: `${agent.emoji} ${t('agent.decline.titre', { agent: nomAgent(agent) })}`,
              texte: t('agent.decline.texte', { seuil: Math.round(seuil), niveau: Math.round(niveau) }),
              deltas: { moral: -4 },
            }],
          }));
          return false;
        }

        set((s) => ({
          joueur: { ...joueur, agent: agent.id },
          journal: [...s.journal, {
            id: idUnique(), saison: joueur.saison, role: 'systeme' as const,
            titre: `${agent.emoji} ${t('agent.represente.titre', { agent: nomAgent(agent) })}`,
            texte: `${descriptionAgent(agent)} ${t('ov.commissionAgent', { n: Math.round(agent.commission * 100) })}`,
          }],
        }));
        return true;
      },

      /**
       * LES AGENTS DÉMARCHENT — et lâchent ceux qui coulent.
       * Appelé à chaque intersaison. Un agent écrit quand on vient de franchir
       * sa barre ; il s'en va après deux saisons ratées d'affilée.
       */
      mouvementAgents: () => {
        const joueur = get().joueur;
        if (!joueur) return;
        const niveau = niveauPourAgent(cote(joueur), joueur.reputation);
        const actuel = agentDe(joueur.agent);

        // ---- Il te lâche ----
        // ⚠️ Deux saisons ratées, pas une : un agent ne part pas sur un accident.
        const rate = (joueur.noteSaison ?? 6) < 5;
        if (actuel.id && rate && joueur.derniereSaisonRatee) {
          set((s) => ({
            joueur: { ...joueur, agent: undefined, derniereSaisonRatee: true },
            journal: [...s.journal, {
              id: idUnique(), saison: joueur.saison, role: 'mj' as const,
              titre: `${actuel.emoji} ${t('agent.quitte.titre', { agent: nomAgent(actuel) })}`,
              texte: t('agent.quitte.texte'),
            }],
          }));
          return;
        }
        set({ joueur: { ...joueur, derniereSaisonRatee: rate } });

        // ---- Un meilleur agent te repère ----
        const mieux = agentsAccessibles(niveau)
          .find((a) => (SEUIL_AGENT[a.id] ?? 99) > (SEUIL_AGENT[actuel.id] ?? -1));
        if (!mieux || Math.random() > 0.6) return;
        const pseudo = `agent:${mieux.id}`;
        set((s) => ({
          conversations: {
            ...s.conversations,
            [pseudo]: [
              ...(s.conversations[pseudo] ?? []),
              {
                id: idUnique(), pseudo, de: 'lui' as const, saison: joueur.saison,
                texte: t('agent.contact.texte', {
                  joueur: joueur.nom, agent: nomAgent(mieux), taux: Math.round(mieux.commission * 100),
                }),
                semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
              },
            ],
          },
          notifsSocial: [{
            id: idUnique(), emoji: mieux.emoji,
            titre: t('agent.contact.titre', { agent: nomAgent(mieux) }),
            texte: t('agent.contact.notif'),
            saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lue: false,
          }, ...s.notifsSocial].slice(0, 40),
          journal: [...s.journal, {
            id: idUnique(), saison: joueur.saison, role: 'mj' as const,
            titre: `${mieux.emoji} ${t('agent.contact.titre', { agent: nomAgent(mieux) })}`,
            texte: t('agent.contact.journal'),
          }],
        }));
      },

      resoudreChoix: (index) => {
        const { joueur, scenarioActif } = get();
        if (!joueur || !scenarioActif) return;
        const choix = scenarioActif.choix[index];
        if (!choix) return;
        let j = appliquerDeltas(joueur, choix.issue.deltas);
        // Interviews (lot 6) : ce que tu dis change ce que le staff et le
        // public pensent de toi — et ces deux jauges-là ont des dents.
        if (choix.issue.coach != null || choix.issue.fans != null) {
          j = {
            ...j,
            confianceCoach: borne((j.confianceCoach ?? 50) + (choix.issue.coach ?? 0)),
            popularite: borne((j.popularite ?? 50) + (choix.issue.fans ?? 0)),
          };
        }
        // ⚠️ LES CONSÉQUENCES DURES. Certaines issues ne se paient pas en points
        // de moral : prison, accident, exclusion, fin de carrière. Elles ne
        // tombent JAMAIS au hasard — toujours à la suite d'un choix explicite.
        const dur = (choix.issue as { dur?: { type: ConsequenceDure; semaines?: number; motif: string } }).dur;
        let entreeDure: EntreeJournal | null = null;
        let finale = false;
        if (dur) {
          const effet = appliquerConsequence(j, dur.type, dur.motif, dur.semaines ?? 8);
          j = effet.joueur;
          finale = effet.finale;
          entreeDure = {
            id: idUnique(), saison: j.saison, role: 'systeme',
            titre: `${effet.emoji} ${effet.titre}`, texte: effet.texte,
          };
        }

        set((s) => ({
          joueur: j,
          scenarioActif: null,
          coins: s.coins + gainOvas(choix.issue.ovas),
          journal: [
            ...s.journal,
            { id: idUnique(), saison: j.saison, role: 'joueur', texte: choix.texte },
            {
              id: idUnique(),
              saison: j.saison,
              role: 'mj',
              texte: choix.issue.recit,
              deltas: choix.issue.deltas,
            },
            ...(entreeDure ? [entreeDure] : []),
          ],
        }));
        // ⚠️ UN CHOIX QUI DIT « JE PARS » OUVRE LE VRAI MARCHÉ. Avant, une issue
        // pouvait porter `transfert: { club, division }` et réécrire la fiche du
        // joueur : club changé, mais contrat, salaire et durée inchangés — et en
        // pratique aucun scénario ne le remplissait, si bien que « Offre d'un
        // club plus huppé » racontait un départ qui n'arrivait jamais.
        if (choix.issue.marche && !finale) get().demanderTransfert();
        // Une issue qui licencie doit rouvrir le marché, comme pour le MJ.
        if (dur?.type === 'exclusionClub' && !finale) get().retrouverUnClub();

        get().signalerDefi('situation');
        get().verifierSucces();
        // Fin de carrière imposée : on fige la carrière dans le panthéon.
        if (finale) get().prendreRetraite(
          undefined, motifFinDepuisConsequence(dur?.type), dur?.motif,
        );
      },

      prendreRetraite: (reconversion, motif, detail) => {
        const joueur = get().joueur;
        if (!joueur) return;
        const legende: LegendeSauvegardee = {
          id: idUnique(),
          nom: joueur.nom,
          poste: joueur.poste,
          nation: joueur.nation,
          age: joueur.age,
          saisons: joueur.saison,
          note: noteGlobale(joueur),
          reputation: joueur.reputation,
          matchsJoues: joueur.matchsJoues,
          essais: joueur.essais,
          titres: joueur.titres,
          // Les ids servent au classement mondial : voir `LegendeSauvegardee`.
          tropheeIds: (joueur.palmares ?? []).map((t) => t.trophee),
          clubs: joueur.clubs ?? [joueur.club],
          score: scoreCarriere(joueur),
          reconversion,
        };
        const versManager = reconversion === 'entraineur' && chantierVisible('manager');
        const raison = motif ?? motifFinParDefaut(joueur);
        // ═══ LE CLASSEMENT MONDIAL SE REMPLIT ICI ════════════════════════════
        // ⚠️ BUG SIGNALÉ EN JEU : « le classement fonctionne pas, la table se
        // remplit pas ». La fonction serveur, la base et le barème étaient bons
        // — mais RIEN N'ENVOYAIT JAMAIS. L'envoi était entièrement manuel, et
        // caché dans un dépliant replié de l'écran Classement. L'écran promet
        // pourtant, noir sur blanc : « Mène une carrière à son terme et elle y
        // entrera ». C'est ici que ça se tient.
        //
        // Fait exprès : on n'attend PAS la réponse et on n'échoue jamais. Sans
        // serveur, hors ligne, ou quota atteint, `envoyerAuClassement` renvoie
        // une erreur qu'on ignore — la retraite reste instantanée, et le
        // classement local n'a besoin de personne. Le bouton manuel de l'écran
        // Classement reste là pour renvoyer une carrière en cours ou réessayer.
        get().publierAuClassement(true);
        setMouvementsClubs({});
        setArriveesClubs({});
        // La pyramide repart de zéro : les fins de saison mémoïsées et le contexte
        // du joueur précédent sont périmés (voir lib/promotion.ts).
        oublierResultats();
        setContexteJoueur('', 0);
        set((s) => ({
          pantheon: [...s.pantheon, legende],
          // Le succès « Entrer au Hall » se décerne ici : juste après, il n'y a
          // plus de joueur, donc plus rien à évaluer.
          coins: s.coins + Math.round(legende.score / 150)
            + (s.succesDebloques.legende == null ? SUCCES_PAR_ID.legende.ovas : 0),
          succesDebloques: s.succesDebloques.legende == null
            ? { ...s.succesDebloques, legende: joueur.saison }
            : s.succesDebloques,
          posts: [],
          filSemaine: '',
          notifsSocial: [],
          defis: { cle: '', faits: [] },
          joueur: null,
          // ⚠️ « SI À LA FIN DE NOTRE CARRIÈRE JOUEUR ON PEUT DEVENIR
          // ENTRAÎNEUR » : la légende part au Hall ET reste sous la main de
          // l’écran de création, qui en tire le prestige de départ
          // (`prestigeDepuisJoueur`). Le Hall reste la sortie par défaut.
          // La reconversion entraîneur est publique. Le garde central demeure
          // pour qu'une éventuelle remise en chantier fasse retomber proprement
          // la carrière au Hall, sans casser les anciennes sauvegardes.
          reconversionManager: versManager ? legende : null,
          finCarriere: {
            legendeId: legende.id,
            motif: raison,
            detail: detail?.trim() || undefined,
            reconversion,
            destination: versManager ? 'manager' : 'pantheon',
          },
          mouvementsClubs: {}, arriveesClubs: {},
          journal: [],
          scenarioActif: null,
          attenteEvenement: false,
          evenementHebdo: null,
          evenementsVus: [],
          tropheesEnAttente: [],
          offres: [],
          offresOuvertes: false,
          // On ne saute plus directement au Hall : l'épilogue explique
          // d'abord pourquoi la carrière est terminée et récapitule le bilan.
          ecran: 'finCarriere',
          ecransVus: [...s.ecransVus, 'finCarriere'].filter((e, i, l) => l.indexOf(e) === i),
        }));
      },

      continuerFinCarriere: (choisie) => {
        const fin = get().finCarriere;
        // La reconversion cochée avant de raccrocher reste la proposition par
        // défaut ; le bouton de l'épilogue peut la contredire.
        const voulue = choisie ?? (fin?.destination === 'manager' ? 'manager' : 'pantheon');
        const versManager = voulue === 'manager' && chantierVisible('manager');
        const destination = versManager ? 'creationManager' : 'pantheon';
        set((s) => ({
          finCarriere: null,
          // ⚠️ ON REPOSE LA LÉGENDE SOUS LA MAIN DE L'ÉCRAN DE CRÉATION. Elle
          // n'est pas persistée (c'est un ordre donné à un écran, pas un état
          // du monde) : après un rechargement en plein épilogue, elle a disparu
          // et il faut la reprendre au Hall, où elle vient d'être archivée.
          reconversionManager: versManager
            ? s.reconversionManager ?? s.pantheon.find((l) => l.id === fin?.legendeId) ?? null
            : null,
          ecran: destination,
          ecransVus: s.ecransVus.includes(destination)
            ? s.ecransVus : [...s.ecransVus, destination],
        }));
      },

      // ═══ LE MODE MANAGER ═════════════════════════════════════════════════
      // LE MODE MANAGER : charpente de carrière, scène hebdomadaire et marché.
      // Le XV coaché en direct viendra encore par-dessus ; les décisions, les
      // budgets et les signatures via L'Ovale vivent déjà ici et partagent le
      // même championnat et les mêmes effectifs que la carrière joueur.

      creerManager: ({ nom, nation, club, age, libre, depuis }) => {
        const fiche = clubParNom(club);
        if (!fiche) return;
        const comp = competitionDuClub(club);
        const prestige = depuis ? prestigeDepuisJoueur(depuis) : PRESTIGE_DEBUT;
        const force = forceEffectif(club, 1);
        const objectif = objectifDuBoard(club, comp, 1);
        const budgets = budgetsDuClub(club, 1);
        const manager: Manager = {
          // ⚠️ MÊME RÈGLE QUE POUR UN JOUEUR, et pour la même raison : l’écran
          // de création PROMET « laissé vide, un nom de ta nation est tiré ».
          // Retomber sur la chaîne « Entraîneur » aurait été un troisième
          // « Anonyme » — une promesse d’interface non tenue par le store.
          nom: nom.trim() || depuis?.nom || nomAleatoirePourNation(nation),
          nation,
          age: age ?? (depuis ? depuis.age : 34),
          club,
          division: comp?.id ?? '',
          divisionNom: comp?.nom ?? '',
          saison: 1,
          semaine: 1,
          prestige,
          // Un board recrute avec de l’espoir : on ne démarre pas sur la
          // sellette, mais pas non plus intouchable.
          confiance: 62,
          objectif,
          argent: 0,
          budgetTransferts: budgets.transferts,
          budgetSalarial: budgets.salarial,
          budgetStructure: budgets.structure,
          contrat: { saisons: 3, salaire: salaireManager(force) },
          decision: null,
          composition: compositionManagerParDefaut(effectifDuClub(club, 1)),
          tactique: { ...TACTIQUE_MANAGER_DEFAUT },
          resultats: {},
          negociations: [],
          recrues: [],
          // ⚠️ ON PREND UN CLUB TEL QU'IL EST : rien n'est construit tant que
          // rien n'a été payé. Offrir un centre de niveau 1 « pour démarrer »
          // retirerait au premier achat ce qui en fait un moment de carrière.
          installations: {},
          jeunesFormes: [],
          entrainements: [],
          progres: {},
          rapports: [],
          academie: [],
          observationsJeunes: {},
          missionsJeunes: { saison: 1, utilises: 0 },
          reponsesJeunes: {},
          revenusFormation: {},
          negociationsClubs: [],
          tempsDeJeu: {},
          demandes: [],
          ventes: [],
          clubs: [club],
          titres: [],
          palmares: [],
          historique: [],
          ...(depuis ? {
            passeJoueur: {
              nom: depuis.nom,
              saisons: depuis.saisons,
              note: Math.round(depuis.note),
              reputation: Math.round(depuis.reputation),
              matchs: depuis.matchsJoues,
              essais: depuis.essais,
              selections: 0,
              titres: depuis.tropheeIds ?? [],
              clubs: depuis.clubs ?? [],
              ageDebut: depuis.age - depuis.saisons + 1,
            },
          } : {}),
          ...(libre ? { libre: true } : {}),
        };
        manager.avancee = creerEtatCarriereAvancee(manager, effectifDuClub(club, 1));
        set((s) => ({
          manager,
          joueur: null,
          reconversionManager: null,
          ecran: 'manager',
          ecransVus: s.ecransVus.includes('manager') ? s.ecransVus : [...s.ecransVus, 'manager'],
          // Le compte officiel du club ouvre un fil à son propre calendrier ;
          // les anciens posts du joueur ne doivent pas se mélanger à la S1 du manager.
          posts: [],
          filSemaine: '',
          journal: [{
            id: idUnique(),
            saison: 1,
            role: 'mj' as const,
            titre: t('mgr.journal.premierBanc'),
            texte: t('mgr.journal.premierBancTexte', {
              manager: manager.nom, club, division: manager.divisionNom, objectif,
            }) + (libre ? ` ${t('mgr.journal.horsClassement')}` : ''),
          }],
        }));
      },

      ameliorerInstallation: (type) => {
        const m = get().manager;
        if (!m?.club) return;
        const murs = m.installations[m.club] ?? installationsVierges();
        if (murs[type] >= NIVEAU_INSTALLATION_MAX) return;
        // Même tarif fixe que celui annoncé dans les trois écrans de structures.
        const cout = coutAmelioration(murs[type]);
        if (cout === null || m.budgetStructure < cout) return;

        const vise = murs[type] + 1;
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            budgetStructure: st.manager.budgetStructure - cout,
            installations: {
              ...st.manager.installations,
              [m.club]: { ...murs, [type]: vise },
            },
          },
          journal: [...st.journal, {
            id: idUnique(),
            role: 'mj' as const,
            titre: t('mgr.inst.titre'),
            texte: t('mgr.inst.journal', {
              nom: t(`mgr.inst.${type}.nom`),
              niveau: String(vise),
              cout: nombre(cout),
            }),
            saison: m.saison,
          }],
        }));
      },

      basculerEntrainement: (nom) => {
        const m = get().manager;
        if (!m?.club) return;
        const niveau = niveauInstallation(m.installations, m.club, 'entrainement');
        if (niveau <= 0) return;
        const places = PLACES_ENTRAINEMENT[Math.min(niveau, NIVEAU_INSTALLATION_MAX)];
        const dedans = m.entrainements.includes(nom);
        // ⚠️ ON REFUSE SILENCIEUSEMENT AU-DELÀ DES PLACES, et l'écran désactive
        // les cases correspondantes : un programme qu'on croirait avoir posé
        // sans qu'il compte serait le pire des deux mondes.
        if (!dedans && m.entrainements.length >= places) return;
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            entrainements: dedans
              ? st.manager.entrainements.filter((n) => n !== nom)
              : [...st.manager.entrainements, nom],
          },
        }));
      },

      observerJeuneManager: (jeuneId, entretien = false) => {
        const m = get().manager;
        if (!m?.club) return;
        const tableau = tableauDetectionManager(m);
        if (motifObservationJeune(m, jeuneId, entretien)) return;
        const auCentre = m.academie.some((j) => j.id === jeuneId && j.clubCentre === m.club);
        const actuelle = m.observationsJeunes[jeuneId] ?? {
          jeuneId, matchs: 0, entretien: false, saison: m.saison,
        };
        const cout = auCentre ? 0 : entretien ? 3 : 1;
        if (tableau.deplacementsRestants < cout) return;
        if (entretien && (actuelle.entretien || actuelle.matchs < 3)) return;
        if (!entretien && actuelle.matchs >= 10) return;
        const suivante = {
          ...actuelle,
          matchs: entretien ? actuelle.matchs : actuelle.matchs + 1,
          entretien: actuelle.entretien || entretien,
          saison: m.saison,
        };
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            observationsJeunes: { ...st.manager.observationsJeunes, [jeuneId]: suivante },
            missionsJeunes: {
              saison: m.saison,
              utilises: tableau.deplacementsUtilises + cout,
            },
          },
        }));
      },

      proposerProjetJeuneManager: (jeuneId) => {
        const m = get().manager;
        if (!m?.club) return;
        const verdict = proposerProjetJeune(m, jeuneId);
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            budgetTransferts: verdict.academicien
              ? st.manager.budgetTransferts - verdict.indemnite
              : st.manager.budgetTransferts,
            academie: verdict.academicien
              ? [...st.manager.academie, verdict.academicien]
              : st.manager.academie,
            reponsesJeunes: {
              ...st.manager.reponsesJeunes,
              [jeuneId]: { etat: verdict.etat, texte: verdict.texte, saison: m.saison },
            },
          },
          journal: [...st.journal, {
            id: idUnique(),
            role: 'mj' as const,
            saison: m.saison,
            titre: verdict.etat === 'accepte' ? '🎓 Un jeune choisit le centre' : '🔎 Réponse du jeune',
            texte: verdict.texte,
          }],
        }));
      },

      gererAcademicienManager: (jeuneId, action) => {
        const m = get().manager;
        if (!m?.club) return;
        const resultat = appliquerActionAcademie(m, jeuneId, action);
        let jeunesFormes = m.jeunesFormes;
        if (resultat.senior) {
          const j = resultat.senior;
          jeunesFormes = [...jeunesFormes, {
            id: `${j.clubCentre}-academie-${j.id}`,
            club: j.clubCentre,
            saison: m.saison,
            nom: j.nom,
            poste: j.poste,
            nation: j.nation,
            age: j.age,
            note: Math.round(j.note),
            // Ce plafond est utilisé par le moteur d'effectif, jamais affiché.
            potentiel: Math.round(j.potentielReel),
          }];
        }
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            academie: resultat.academie,
            jeunesFormes,
          },
          journal: [...st.journal, {
            id: idUnique(), role: 'mj' as const, saison: m.saison,
            titre: '🎓 Décision du centre', texte: resultat.texte,
          }],
        }));
        if (resultat.senior) setApportsDuCentre(jeunesFormes, m.progres);
      },

      definirObjectifJeuneManager: (jeuneId, objectif) => {
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            academie: st.manager.academie.map((j) => j.id === jeuneId
              ? { ...j, objectif } : j),
          },
        }));
      },

      definirMentorJeuneManager: (jeuneId, mentorId) => {
        const m = get().manager;
        if (!m?.club) return;
        const mentorValide = !mentorId || effectifDuClub(m.club, m.saison)
          .some((j) => j.id === mentorId && j.age >= 28);
        if (!mentorValide) return;
        set((st) => ({
          manager: st.manager && {
            ...st.manager,
            academie: st.manager.academie.map((j) => j.id === jeuneId
              ? { ...j, mentorId } : j),
          },
        }));
      },

      signerBanc: (club) => {
        const m = get().manager;
        if (!m || !clubParNom(club)) return;
        const comp = competitionEffective(club);
        const force = forceEffectif(club, m.saison);
        // ⚠️ ON NE VÉRIFIE PAS SEULEMENT « le club existe » : un banc au-dessus
        // de son prestige, c’est exactement le mode libre — et il se déclare à
        // la création, pas en cours de route.
        if (!m.libre && force > noteMaximale(m.prestige) + MARGE_AMBITION) return;
        const budgets = budgetsDuClub(club, m.saison);
        const suivant: Manager = {
          ...m,
          club,
          division: comp?.id ?? '',
          divisionNom: comp?.nom ?? '',
          objectif: objectifDuBoard(club, comp, m.saison),
          confiance: 62,
          budgetTransferts: budgets.transferts,
          budgetSalarial: budgets.salarial,
          // ⚠️ L'ENVELOPPE STRUCTURE REPART DE ZÉRO, ET LES MURS RESTENT. Un
          // entraîneur n'emporte pas le centre de formation de son ancien club
          // (`Manager.installations` est indexé PAR CLUB) : il découvre celui
          // du nouveau, souvent inexistant. L'épargne, elle, appartenait au
          // club qu'on vient de quitter.
          budgetStructure: budgets.structure,
          contrat: { saisons: 3, salaire: salaireManager(force) },
          decision: null,
          composition: compositionManagerParDefaut(effectifDuClub(club, m.saison), new Set(indisponiblesCarriereAvancee(m.avancee, m.semaine))),
          tactique: { ...TACTIQUE_MANAGER_DEFAUT },
          negociations: m.negociations.map((n) => (
            n.etat === 'ouverte' || n.etat === 'accord' ? { ...n, etat: 'rompue' as const } : n
          )),
          negociationsClubs: m.negociationsClubs.map((n) => (
            n.etat === 'ouverte' || n.etat === 'accord' ? { ...n, etat: 'rompue' as const } : n
          )),
          tempsDeJeu: {},
          demandes: m.demandes.map((d) => d.etat === 'ouverte'
            ? { ...d, etat: 'refusee' as const } : d),
          ventes: [],
          clubs: m.clubs[m.clubs.length - 1] === club ? m.clubs : [...m.clubs, club],
        };
        suivant.avancee = changerClubCarriereAvancee(m.avancee, suivant, effectifDuClub(club, m.saison));
        set({
          manager: suivant,
        });
      },

      repondreDiscussionAvancee: (id, reponse) => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        set({ manager: { ...m, avancee: repondreDiscussionAvancee(avancee, m, id, reponse) } });
      },

      deciderMedicalManager: (id, decision) => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        set({ manager: { ...m, avancee: deciderMedical(avancee, id, decision) } });
      },

      definirChargeEntrainementManager: (axe, niveau) => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        set({ manager: { ...m, avancee: definirChargeEntrainement(avancee, axe, niveau) } });
      },

      ouvrirRenegociationJoueurManager: (joueurId) => {
        const m = get().manager;
        if (!m?.club) return;
        const groupe = effectifDuClub(m.club, m.saison);
        const avancee = assurerEtatCarriereAvancee(m, groupe);
        const existante = [...m.negociations].reverse().find((n) => n.joueur.id === joueurId
          && n.nature !== 'recrutement' && (n.etat === 'ouverte' || n.etat === 'accord'));
        const nego = existante ?? ouvrirRenegociationJoueur(avancee, m, groupe, joueurId);
        if (!nego) return;
        set((s) => ({
          manager: existante ? { ...m, avancee } : { ...m, avancee, negociations: [...m.negociations, nego] },
          conversations: existante ? s.conversations : { ...s.conversations, [nego.pseudo]: [
            ...(s.conversations[nego.pseudo] ?? []),
            { id: idUnique(), pseudo: nego.pseudo, de: 'moi' as const,
              texte: nego.nature === 'revalorisation' ? 'Parlons de ta revalorisation.' : 'Je veux te proposer une prolongation.',
              saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true },
            { id: idUnique(), pseudo: nego.pseudo, de: 'lui' as const,
              texte: `Mon agent attend ${nombre(nego.exigences.salaire)} € par an, ${nego.exigences.duree} saison(s) et un statut ${nego.exigences.role}.`,
              saison: m.saison, semaine: m.semaine, creeLe: Date.now() + 1, lu: false },
          ] },
          ouvrirSocialSur: 'messages', conversationSocialeCible: nego.pseudo,
          ecran: s.manager && !s.joueur ? 'manager' : 'social',
          ecransVus: s.ecransVus.includes('social') ? s.ecransVus : [...s.ecransVus, 'social'],
        }));
      },

      /**
       * ⚠️ REFUSER DOIT COÛTER QUELQUE CHOSE, SINON L'APPROCHE EST DÉCORATIVE.
       * Le joueur apprend toujours qu'un club est venu : c'est son agent qui
       * l'appelle, pas le manager. Selon son attachement, sa satisfaction, son
       * temps de jeu et l'étage du prétendant, il comprend — ou il demande
       * officiellement son départ, et cette demande entre dans le même fil de
       * L'Ovale que les autres, avec les mêmes réponses possibles.
       */
      repondreApprocheManager: (id, reponse) => {
        const m = get().manager;
        if (!m?.club) return;
        const groupe = effectifDuClub(m.club, m.saison);
        const avancee = assurerEtatCarriereAvancee(m, groupe);
        const actuelle = avancee.approches.find((a) => a.id === id);
        if (!actuelle || actuelle.etat !== 'ouverte') return;
        const resultat = repondreApproche(actuelle, reponse);
        if (resultat.accord) {
          get().conclureApprocheInterne(resultat.approche, avancee);
          return;
        }
        if (reponse === 'negocier') {
          set({ manager: { ...m, avancee: { ...avancee,
            approches: avancee.approches.map((a) => a.id === id ? resultat.approche : a) } } });
          return;
        }
        // Refus ou « il n'est pas disponible » : la réaction du joueur.
        const contrat = avancee.contratsJoueurs[actuelle.joueurId];
        const joueur = groupe.find((j) => j.id === actuelle.joueurId);
        if (!contrat || !joueur) return;
        const matchs = Math.max(1, Object.values(m.resultats).filter((r) => r.saison === m.saison && r.club === m.club).length);
        const reaction = reactionAuRefus(actuelle, contrat, avancee.vestiaire[actuelle.joueurId], {
          partDeJeu: (m.tempsDeJeu[actuelle.joueurId] ?? 0) / matchs,
          monterDEtage: (competitionEffective(actuelle.club)?.niveau ?? 9) < (competitionEffective(m.club)?.niveau ?? 9),
          indisponible: indisponiblesCarriereAvancee(avancee, m.semaine).includes(actuelle.joueurId),
        });
        const profil = avancee.vestiaire[actuelle.joueurId];
        const partant = reaction.reaction === 'demandeDepart';
        const demande: DemandeJoueur | null = partant && !m.demandes.some((d) => d.joueurId === actuelle.joueurId && d.etat === 'ouverte')
          ? { id: idUnique(), pseudo: pseudoStable(actuelle.nom), joueurId: actuelle.joueurId,
            nom: actuelle.nom, poste: actuelle.poste, note: actuelle.note, type: 'depart',
            raison: 'offreRecue', saison: m.saison, semaine: m.semaine, etat: 'ouverte' }
          : null;
        const approcheFinale: ApprocheClubManager = { ...resultat.approche, reaction: reaction.reaction };
        set((s) => ({
          manager: {
            ...m,
            demandes: demande ? [...m.demandes, demande] : m.demandes,
            avancee: {
              ...avancee,
              approches: avancee.approches.map((a) => a.id === id ? approcheFinale : a),
              vestiaire: profil ? { ...avancee.vestiaire, [actuelle.joueurId]: {
                ...profil, satisfaction: borne(profil.satisfaction + reaction.satisfaction),
                moral: borne(profil.moral + reaction.moral), soutien: !partant && profil.soutien,
              } } : avancee.vestiaire,
              contratsJoueurs: { ...avancee.contratsJoueurs, [actuelle.joueurId]: {
                ...contrat, satisfaction: borne(contrat.satisfaction + reaction.satisfaction),
              } },
            },
          },
          conversations: { ...s.conversations, [actuelle.pseudo]: [
            ...(s.conversations[actuelle.pseudo] ?? []),
            { id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
              texte: reponse === 'indisponible'
                ? `${actuelle.nom} n’est pas disponible. Ne revenez pas cette saison.`
                : `Nous refusons votre offre pour ${actuelle.nom}.`,
              saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true },
            { id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
              texte: reponse === 'indisponible' ? 'Message reçu. Nous cherchons ailleurs.'
                : 'Dommage. Nous restons attentifs à sa situation.',
              saison: m.saison, semaine: m.semaine, creeLe: Date.now() + 1, lu: false },
          ] },
          notifsSocial: [{
            id: idUnique(), emoji: partant ? '😡' : '💬',
            titre: `${actuelle.nom} · réaction au refus`, texte: reaction.texte,
            saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lue: false,
          }, ...s.notifsSocial].slice(0, 40),
        }));
      },

      negocierApprocheManager: (id, levier) => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        const actuelle = avancee.approches.find((a) => a.id === id);
        if (!actuelle || actuelle.etat !== 'negociation') return;
        const resultat = negocierApproche(actuelle, levier);
        if (resultat.accord) {
          get().conclureApprocheInterne(resultat.approche, avancee);
          return;
        }
        set((s) => ({
          manager: { ...m, avancee: { ...avancee,
            approches: avancee.approches.map((a) => a.id === id ? resultat.approche : a) } },
          conversations: { ...s.conversations, [actuelle.pseudo]: [
            ...(s.conversations[actuelle.pseudo] ?? []),
            { id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
              texte: levier === 'exiger' ? `Il nous faut ${nombre(resultat.approche.demande)} €.`
                : levier === 'bonus' ? 'Nous acceptons une part en bonus différés.'
                  : 'Nous voulons un pourcentage à la revente.',
              saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true },
            { id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
              texte: resultat.approche.etat === 'rompue'
                ? 'Négociations terminées. Nous nous tournons vers une autre piste.'
                : `Nous montons à ${nombre(resultat.approche.offre)} €. Il nous reste ${resultat.approche.patience} marche(s).`,
              saison: m.saison, semaine: m.semaine, creeLe: Date.now() + 1, lu: false },
          ] },
        }));
      },

      exigerSurApprocheManager: (id, montant) => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        set({ manager: { ...m, avancee: { ...avancee,
          approches: avancee.approches.map((a) => a.id === id ? exigerSurApproche(a, montant) : a) } } });
      },

      /**
       * Encaisser une approche conclue. Interne : elle réutilise EXACTEMENT le
       * chemin d'une vente ordinaire — part à la revente due au club formateur,
       * annonce de transfert, deuil du vestiaire, ligne au journal.
       */
      conclureApprocheInterne: (approche: ApprocheClubManager, avancee: EtatCarriereAvancee) => {
        const m = get().manager;
        if (!m?.club) return;
        const joueur = effectifDuClub(m.club, m.saison).find((j) => j.id === approche.joueurId);
        if (!joueur) return;
        const contratOrigine = m.recrues.findLast((r) => r.club === m.club
          && (r.joueur.id === approche.joueurId || r.joueur.nom === joueur.nom));
        const partRevente = contratOrigine?.accordClub?.pourcentageRevente ?? 0;
        const reversement = Math.round(approche.offre * partRevente / 100);
        const montantNet = Math.max(0, approche.offre - reversement);
        const transfert: TransfertAnnonce = {
          nom: joueur.nom, de: m.club, vers: approche.club, saison: m.saison,
          poste: POSTE_PAR_ID[joueur.poste]?.famille, age: joueur.age,
          note: joueur.note, nation: joueur.nation,
        };
        let suite = avancee;
        if (suite.profonde) {
          const depart = apresDepartJoueurProfonde(suite.profonde, m, approche.joueurId);
          const vestiaire = { ...suite.vestiaire };
          for (const [id, delta] of Object.entries(depart.moralTouches)) {
            const profil = vestiaire[id];
            if (profil) vestiaire[id] = { ...profil, moral: borne(profil.moral + delta), satisfaction: borne(profil.satisfaction + delta) };
          }
          suite = { ...suite, vestiaire,
            profonde: enregistrerTransfertProfonde(depart.etat, m, joueur, approche.offre, 'vente', approche.club) };
        }
        suite = { ...suite, approches: suite.approches.map((a) => a.id === approche.id
          ? { ...approche, etat: 'conclue' as const } : a) };
        set((s) => {
          const transfertsSociaux = [...s.transfertsSociaux, transfert];
          setTransfertsSociaux(transfertsSociaux);
          return {
            manager: {
              ...m, avancee: suite,
              budgetTransferts: m.budgetTransferts + montantNet,
              ventes: m.ventes.filter((v) => v.joueurId !== approche.joueurId),
              entrainements: m.entrainements.filter((n) => n !== joueur.nom),
              composition: reconcilerCompositionManager(effectifDuClub(m.club, m.saison), m.composition),
            },
            transfertsSociaux,
            journal: [...s.journal, {
              id: idUnique(), saison: m.saison, role: 'mj' as const,
              titre: `Départ · ${joueur.nom}`,
              texte: `${approche.club} l’emporte pour ${nombre(montantNet)} €`
                + (approche.bonus > 0 ? `, plus ${nombre(approche.bonus)} € de bonus différés` : '')
                + (approche.pourcentageRevente > 0 ? ` et ${approche.pourcentageRevente} % à la revente` : '')
                + (reversement > 0 ? `. ${nombre(reversement)} € sont reversés à ${contratOrigine?.accordClub?.clubVendeur}` : '')
                + '.',
            }],
          };
        });
      },

      observerCibleManager: (cible) => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        const paysConnu = competitionDuClub(cible.club)?.pays === competitionDuClub(m.club)?.pays;
        set({ manager: { ...m, avancee: observerCible(avancee, cible.id, m.saison, paysConnu) } });
      },

      postulerBancManager: (club) => {
        const m = get().manager;
        if (!m || !clubParNom(club) || club === m.club) return;
        const avancee = assurerEtatCarriereAvancee(m, m.club ? effectifDuClub(m.club, m.saison) : []);
        set({ manager: { ...m, avancee: postulerBancAvance(avancee, m, club) } });
      },

      negocierContratManager: () => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = assurerEtatCarriereAvancee(m, effectifDuClub(m.club, m.saison));
        const resultat = negocierContratManagerAvance(avancee, m);
        set({ manager: { ...m, avancee: resultat.etat, contrat: resultat.contrat, confiance: borne(m.confiance + resultat.confiance) } });
      },

      demissionnerManager: () => {
        const m = get().manager;
        if (!m?.club) return;
        const avancee = changerClubCarriereAvancee(m.avancee, { ...m, club: '', division: '', divisionNom: '' }, []);
        set((s) => ({
          manager: { ...m, club: '', division: '', divisionNom: '', contrat: null, composition: { titulaires: [], remplacants: [], capitaineId: '', buteurId: '' }, confiance: 58, avancee },
          journal: [...s.journal, { id: idUnique(), saison: m.saison, role: 'mj' as const, titre: '🚪 Démission', texte: `${m.nom} quitte ${m.club}. Sa réputation reste intacte, mais il doit désormais convaincre un nouveau président.` }],
        }));
      },

      accepterOffreBancManager: (id) => {
        const m = get().manager;
        const offre = m?.avancee?.offresBanc.find((o) => o.id === id && o.statut === 'offre');
        if (!m || !offre) return;
        get().signerBanc(offre.club);
      },

      repondreSelectionManager: (accepter) => {
        const m = get().manager;
        if (!m?.avancee?.propositionSelection) return;
        set({ manager: { ...m, avancee: accepter ? accepterSelectionAvance(m.avancee, m) : refuserSelectionAvance(m.avancee) } });
      },

      enregistrerMatchSelectionManager: (scorePour, scoreContre) => {
        const m = get().manager;
        if (!m?.avancee?.selection?.matchEnAttente) return;
        set({ manager: { ...m, avancee: enregistrerMatchSelectionAvance(m.avancee, m, scorePour, scoreContre) } });
      },

      configurerDelegationManager: (domaine, delegue) => {
        const m = get().manager;
        if (!m?.club || !m.avancee?.profonde) return;
        set({ manager: { ...m, avancee: { ...m.avancee, profonde: configurerDelegationProfonde(m.avancee.profonde, domaine, delegue) } } });
      },

      definirHierarchieCapitainesManager: (capitaineId, viceCapitaineId, troisiemeCapitaineId) => {
        const m = get().manager;
        if (!m?.club || !m.avancee?.profonde) return;
        const ids = new Set(effectifDuClub(m.club, m.saison).map((j) => j.id));
        if (!ids.has(capitaineId) || (viceCapitaineId && !ids.has(viceCapitaineId)) || (troisiemeCapitaineId && !ids.has(troisiemeCapitaineId))) return;
        const differents = [capitaineId, viceCapitaineId, troisiemeCapitaineId].filter(Boolean);
        if (new Set(differents).size !== differents.length) return;
        const profonde = definirCapitainesProfonde(m.avancee.profonde, m, capitaineId, viceCapitaineId, troisiemeCapitaineId);
        set({ manager: { ...m, composition: { ...m.composition, capitaineId }, avancee: { ...m.avancee, profonde } } });
      },

      repondreDecisionStrategiqueManager: (decisionId, choixId) => {
        const m = get().manager;
        if (!m?.club || !m.avancee?.profonde) return;
        const resultat = repondreDecisionStrategiqueProfonde(m.avancee.profonde, m, decisionId, choixId);
        if (!resultat.choix) return;
        set((s) => ({
          manager: {
            ...m,
            confiance: borne(m.confiance + resultat.choix!.confianceDirection),
            budgetTransferts: Math.max(0, m.budgetTransferts + resultat.choix!.budgetTransferts),
            budgetStructure: Math.max(0, m.budgetStructure + resultat.choix!.budgetStructure),
            avancee: { ...m.avancee!, profonde: resultat.etat },
          },
          journal: [...s.journal, { id: idUnique(), saison: m.saison, role: 'joueur' as const, titre: `🏛️ ${resultat.choix!.label}`, texte: resultat.choix!.consequence }],
        }));
      },

      semaineManager: () => {
        const m = get().manager;
        if (!m) return;
        // Sans banc, le temps ne passe pas : on cherche un club.
        if (!m.club) return;
        // Le championnat du manager est désormais joué, pas seulement simulé.
        // Tant que l'affiche de cette semaine n'a pas atteint la sirène, le
        // calendrier ne peut pas l'effacer en passant au lundi suivant.
        // ⚠️ TOUTES LES AFFICHES, PAS SEULEMENT LE CHAMPIONNAT.
        // `matchDuClubSemaine` ne lit que la grille des journées : une semaine
        // de PHASE FINALE ou de COUPE n'en contient aucune, donc le verrou ne
        // se déclenchait pas et le calendrier passait par-dessus le match.
        // C'est l'autre moitié du « je n'ai pas fait les play-offs » : même
        // avec un match proposé à l'écran, la semaine pouvait avancer sans lui.
        const affiche = afficheDuClub(m);
        if (affiche && !m.resultats[affiche.cle]) return;
        if (m.semaine < SEMAINES_PAR_SAISON) {
          const suivante = m.semaine + 1;
          const groupe = effectifDuClub(m.club, m.saison);
          const avancee = avancerSemaineCarriereAvancee(m, groupe, suivante);
          const delegations = avancee.profonde.delegations;
          const murs = m.installations[m.club] ?? installationsVierges();
          const places = PLACES_ENTRAINEMENT[Math.min(murs.entrainement, NIVEAU_INSTALLATION_MAX)];
          const entrainements = delegations.entrainements
            ? [...groupe].sort((a, b) => (b.potentiel - b.note) - (a.potentiel - a.note) || a.age - b.age).slice(0, places).map((j) => j.nom)
            : m.entrainements;
          // ⚠️ UN BLESSÉ SORT DE LA FEUILLE, MÊME SANS DÉLÉGATION. La composition
          //    n’était recalculée QUE si le manager avait délégué ce domaine :
          //    sinon la feuille sauvegardée gardait le joueur, et on se
          //    retrouvait à aligner un homme absent six semaines. Mesuré en jeu :
          //    deux blessés « repos » et « attente » toujours titularisés.
          //    On réconcilie donc toujours — les choix du manager sur les autres
          //    postes sont préservés, seuls les indisponibles sont évincés.
          //
          // ⚠️ ET ON LIT L’ÉTAT NEUF, pas l’ancien : `avancee` et `suivante`
          //    portent les blessures qui viennent de tomber cette semaine.
          const absents = new Set(indisponiblesCarriereAvancee(avancee, suivante));
          const composition = delegations.compositions
            ? compositionManagerParDefaut(groupe, absents)
            : reconcilerCompositionManager(groupe, m.composition, absents);
          // ⚠️ UNE APPROCHE QUI N'OUVRE PAS DE CONVERSATION N'EXISTE PAS. Elle
          // naît dans la couche pure (`avancerSemaineCarriereAvancee`), qui ne
          // connaît ni les messages ni les notifications : c'est ici, et
          // seulement ici, que le club écrit vraiment sur L'Ovale.
          const connues = new Set((m.avancee?.approches ?? []).map((a) => a.id));
          const neuve = avancee.approches.find((a) => !connues.has(a.id));
          set((s) => ({
            manager: { ...m, semaine: suivante, decision: null, avancee, entrainements, composition },
            conversations: neuve ? { ...s.conversations, [neuve.pseudo]: [
              ...(s.conversations[neuve.pseudo] ?? []),
              { id: idUnique(), pseudo: neuve.pseudo, de: 'lui' as const,
                texte: `Nous souhaitons recruter ${neuve.nom}. Nous proposons ${nombre(neuve.offre)} € d’indemnité.`,
                saison: m.saison, semaine: suivante, creeLe: Date.now(), lu: false },
            ] } : s.conversations,
            notifsSocial: neuve ? [{
              id: idUnique(), emoji: '📨', titre: `Offre — ${neuve.nom}`,
              texte: `${neuve.club} veut le recruter. ${nombre(neuve.offre)} € sur la table.`,
              saison: m.saison, semaine: suivante, creeLe: Date.now(), lue: false,
            }, ...s.notifsSocial].slice(0, 40) : s.notifsSocial,
          }));
          get().vivreSemaineSociale();
          return;
        }
        get().saisonManager();
      },

      avancerJusquaManager: (cibleDemandee, deleguerMatchs = false) => {
        const cible = Number.isFinite(cibleDemandee)
          ? Math.min(SEMAINES_PAR_SAISON + 1, Math.max(1, Math.floor(cibleDemandee))) : 1;
        const depart = get().manager?.semaine ?? 1;
        let semaines = 0;
        if (!get().manager?.club) return { semaines, arret: 'sansBanc' as const };
        if (cible <= depart) return { semaines, arret: 'arrive' as const };

        let arret: 'arrive' | 'decision' | 'match' | 'saison' | 'sansBanc' | 'approche' = 'arrive';
        while ((get().manager?.semaine ?? 1) < cible) {
          const avant = get().manager;
          if (!avant?.club) { arret = 'sansBanc'; break; }
          // ⚠️ ON S'ARRÊTE À CE QUI DEMANDE L'ENTRAÎNEUR, exactement comme la
          // carrière joueur s'arrête sur une scène du MJ. Enjamber une décision
          // du board ou un match à coacher, c'est refaire l'ancien mode
          // « saison rapide » qui a été supprimé pour cette raison précise.
          if (avant.decision) { arret = 'decision'; break; }
          const affiche = afficheDuClub(avant);
          if (affiche && !avant.resultats[affiche.cle]) {
            if (!deleguerMatchs) { arret = 'match'; break; }
            const { domicile, exterieur } = affiche.match;
            const groupe = effectifDuClub(avant.club, avant.saison);
            const absents = new Set(indisponiblesCarriereAvancee(avant.avancee, avant.semaine));
            const moyenne = (liste: typeof groupe) => {
              const meilleurs = [...liste].sort((a,b) => b.note - a.note).slice(0,23);
              return meilleurs.reduce((n,j) => n + j.note,0) / Math.max(1, meilleurs.length);
            };
            const bonus = moyenne(groupe.filter((j) => !absents.has(j.id))) - moyenne(groupe);
            const match = jouerRencontre(domicile, exterieur, avant.saison, affiche.cle, { club: avant.club, bonus });
            const chezMoi = domicile === avant.club;
            get().enregistrerResultatManager({
              cle: affiche.cle, club: avant.club, saison: avant.saison, semaine: avant.semaine,
              journee: affiche.journee, domicile: chezMoi,
              adversaire: chezMoi ? exterieur : domicile,
              scorePour: chezMoi ? match.scoreD : match.scoreE,
              scoreContre: chezMoi ? match.scoreE : match.scoreD,
              essaisPour: chezMoi ? match.essaisD : match.essaisE,
              essaisContre: chezMoi ? match.essaisE : match.essaisD,
            });
            // Certaines semaines contiennent deux journées : toutes passent
            // par l'enregistrement normal avant d'avancer la date.
            if (!get().manager?.resultats[affiche.cle]) { arret = 'match'; break; }
            continue;
          }

          get().semaineManager();

          const apres = get().manager;
          if (!apres) { arret = 'sansBanc'; break; }
          // ⚠️ ON NE COMPTE QUE CE QUI A VRAIMENT ÉTÉ JOUÉ. `semaineManager`
          // peut refuser en silence (un match non joué, plus de banc) : compter
          // quand même annoncerait des semaines qui n'ont pas eu lieu — le
          // défaut déjà payé côté joueur.
          if (apres.saison === avant.saison && apres.semaine === avant.semaine) {
            arret = apres.club ? 'match' : 'sansBanc';
            break;
          }
          semaines++;
          if (apres.saison !== avant.saison) { arret = 'saison'; break; }
          if (!apres.club) { arret = 'sansBanc'; break; }
          // ⚠️ ON S'ARRÊTE SUR UNE OFFRE REÇUE, exactement comme sur une
          // décision du board. L'approche a une patience de quelques semaines :
          // l'enjamber en avance rapide, c'est répondre « non » à la place du
          // manager sans le lui avoir demandé.
          const connues = new Set((avant.avancee?.approches ?? []).map((a) => a.id));
          if ((apres.avancee?.approches ?? []).some((a) => !connues.has(a.id))) { arret = 'approche'; break; }
        }
        return { semaines, arret };
      },

      repondreDecisionManager: (decisionId, choixId) => {
        const m = get().manager;
        const decision = m?.decision;
        if (!m || !decision || decision.id !== decisionId) return;
        const choix = decision.choix.find((c) => c.id === choixId);
        if (!choix) return;
        set((s) => ({
          manager: {
            ...m,
            confiance: borne(m.confiance + (choix.confiance ?? 0)),
            prestige: borne(m.prestige + (choix.prestige ?? 0)),
            budgetTransferts: Math.max(0, m.budgetTransferts + (choix.budgetTransferts ?? 0)),
            budgetSalarial: Math.max(0, m.budgetSalarial + (choix.budgetSalarial ?? 0)),
            decision: null,
          },
          journal: [...s.journal, {
            id: idUnique(),
            saison: m.saison,
            role: 'joueur' as const,
            titre: `${decision.emoji} ${choix.label}`,
            texte: choix.consequence,
          }],
        }));
      },

      definirCompositionManager: (composition) => {
        const m = get().manager;
        if (!m?.club) return;
        const effectif = effectifDuClub(m.club, m.saison);
        set({ manager: { ...m, composition: reconcilerCompositionManager(effectif, composition, new Set(indisponiblesCarriereAvancee(m.avancee, m.semaine))) } });
      },

      definirTactiqueManager: (tactique) => {
        const m = get().manager;
        if (!m?.club) return;
        set({ manager: { ...m, tactique: { ...tactique } } });
      },

      enregistrerResultatManager: (resultat) => {
        const m = get().manager;
        if (!m?.club || resultat.club !== m.club || m.resultats[resultat.cle]) return;
        // Pas de nul en match couperet. Le départage est sauvegardé avec le
        // score, donc identique dans le calendrier, le tableau et le palmarès.
        if (/^(phase|coupe|acces|tournoi)#/.test(resultat.cle)
          && resultat.scorePour === resultat.scoreContre) {
          const victoire = graine(`departage#${resultat.cle}`)() < .5;
          resultat = { ...resultat,
            scorePour: resultat.scorePour + (victoire ? 3 : 0),
            scoreContre: resultat.scoreContre + (victoire ? 0 : 3),
          };
        }
        const domicile = resultat.domicile ? resultat.club : resultat.adversaire;
        const exterieur = resultat.domicile ? resultat.adversaire : resultat.club;
        const scoreD = resultat.domicile ? resultat.scorePour : resultat.scoreContre;
        const scoreE = resultat.domicile ? resultat.scoreContre : resultat.scorePour;
        const essaisD = resultat.domicile ? resultat.essaisPour : resultat.essaisContre;
        const essaisE = resultat.domicile ? resultat.essaisContre : resultat.essaisPour;
        enregistrerResultatJoue(resultat.cle, { domicile, exterieur, scoreD, scoreE, essaisD, essaisE });
        oublierResultats();
        const victoire = resultat.scorePour > resultat.scoreContre;
        const nul = resultat.scorePour === resultat.scoreContre;
        // ⚠️ LE TEMPS DE JEU SE COMPTE ICI, ET NULLE PART AILLEURS. C'est le
        // seul endroit du programme où un match du club est certainement JOUÉ :
        // la feuille de match est figée, le score est tombé. Compter à
        // l'affichage de la composition donnerait du temps de jeu à un XV qu'on
        // a seulement regardé, et les demandes du vestiaire deviendraient
        // fausses sans que rien ne le signale.
        const tempsDeJeu = { ...m.tempsDeJeu };
        const absents = new Set(indisponiblesCarriereAvancee(m.avancee, m.semaine));
        for (const id of [...m.composition.titulaires, ...m.composition.remplacants]) {
          if (id && !absents.has(id)) tempsDeJeu[id] = (tempsDeJeu[id] ?? 0) + 1;
        }
        const resultats = { ...m.resultats, [resultat.cle]: resultat };
        const avecResultat: Manager = {
          ...m,
          resultats,
          tempsDeJeu,
          confiance: borne(m.confiance + (victoire ? 2 : nul ? 0 : -2)),
          prestige: borne(m.prestige + (victoire ? 0.35 : nul ? 0.05 : -0.12)),
        };
        const bilanAvance = apresResultatCarriereAvancee(
          avecResultat, effectifDuClub(m.club, m.saison), resultat,
        );
        avecResultat.avancee = bilanAvance.etat;
        avecResultat.confiance = borne(avecResultat.confiance + bilanAvance.confiance);
        const matchsJoues = Object.values(resultats)
          .filter((r) => r.saison === m.saison && r.club === m.club).length;
        const besoin = demandeAGenerer(
          avecResultat, effectifDuClub(m.club, m.saison), matchsJoues,
        );
        const demande = besoin ? {
          ...besoin,
          id: `demande-${besoin.joueurId}-${m.saison}-${m.semaine}`,
          saison: m.saison,
          semaine: m.semaine,
          etat: 'ouverte' as const,
        } : null;
        const compteClub = annuaire({ club: m.club, saison: m.saison, division: m.division })
          .find((c) => c.pseudo === pseudoStable(m.club, '_officiel'));
        const rngPost = graine(`resultat-manager#${resultat.cle}`);
        const postResultat: PostSocial = {
          id: `manager-resultat-${resultat.cle}`,
          auteur: compteClub?.nom ?? m.club,
          pseudo: compteClub?.pseudo ?? pseudoStable(m.club, '_officiel'),
          avatar: `club:${m.club}`,
          certifie: true,
          texte: t('mgr.x.postResultat', {
            club: m.club,
            adversaire: resultat.adversaire,
            scorePour: resultat.scorePour,
            scoreContre: resultat.scoreContre,
          }),
          saison: m.saison,
          semaine: m.semaine,
          date: libelleDate(semaine(m.semaine)),
          type: 'club',
          ...statsDepuisVues(1_200 + rngPost() * 18_000, rngPost),
        };
        const managerSuivant = demande
          ? { ...avecResultat, demandes: [...avecResultat.demandes, demande] }
          : avecResultat;
        set((s) => ({
          manager: managerSuivant,
          posts: fusionner([postResultat], s.posts),
          conversations: demande ? {
            ...s.conversations,
            [demande.pseudo]: [
              ...(s.conversations[demande.pseudo] ?? []),
              {
                id: idUnique(), pseudo: demande.pseudo, de: 'lui' as const,
                texte: demande.type === 'depart'
                  ? t('mgr.x.demandeDepart', { joueur: demande.nom })
                  : t('mgr.x.demandeTemps', { joueur: demande.nom }),
                saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: false,
              },
            ],
          } : s.conversations,
          notifsSocial: demande ? [{
            id: idUnique(), emoji: '💬',
            titre: t('mgr.x.demandeTitre', { joueur: demande.nom }),
            texte: demande.type === 'depart'
              ? t('mgr.x.demandeDepartCourt') : t('mgr.x.demandeTempsCourt'),
            saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lue: false,
          }, ...s.notifsSocial].slice(0, 40) : s.notifsSocial,
          journal: [...s.journal, {
            id: idUnique(), saison: m.saison, role: 'systeme' as const,
            titre: victoire ? '🏉 Victoire du manager' : nul ? '🤝 Match nul' : '📋 Défaite du manager',
            texte: `${m.club} ${resultat.scorePour}-${resultat.scoreContre} ${resultat.adversaire} · `
              + `${resultat.essaisPour} essai${resultat.essaisPour > 1 ? 's' : ''} marqué${resultat.essaisPour > 1 ? 's' : ''}. `
              + `Le résultat est enregistré dans le championnat.`,
          }],
        }));
        get().verifierSucces();
      },

      contacterClubManager: (cible) => {
        const m = get().manager;
        if (!m?.club || cible.club === m.club) return;
        // ⚠️ LE VERROU SPORTIF EST ICI, PAS SEULEMENT SUR LE BOUTON. L'écran
        // grise déjà l'action, mais un bouton désactivé n'est pas une règle :
        // c'est le store qui décide qui peut être contacté, exactement comme
        // `signerBanc` refuse un club au-dessus du prestige. Sans lui, le jour
        // où un second chemin ouvre une négociation (une carte de décision, un
        // dossier de L'Ovale), le critère sportif disparaîtrait en silence.
        if (!porteeSportive(cible, m.club, m.saison, m.prestige).aPortee) return;
        // Une signature est un état terminal. L'ancien fil du club reste
        // consultable, mais ne doit jamais recréer un contrat pour sa recrue.
        if (joueurDejaRecrute(m, cible.id)) {
          get().contacterJoueurManager(cible);
          return;
        }
        // En amateur, il n'existe aucune indemnité : le parcours saute
        // naturellement le club vendeur et ouvre directement le joueur.
        if (cible.indemnite <= 0) {
          get().contacterJoueurManager(cible);
          return;
        }
        const existante = [...m.negociationsClubs].reverse()
          .find((n) => n.cible.id === cible.id && n.saison === m.saison);
        if (existante?.etat === 'accord') {
          get().contacterJoueurManager(cible);
          return;
        }
        const nego = existante ?? ouvrirNegociationClub(cible, m.saison, m.semaine);
        set((s) => ({
          manager: existante ? m : {
            ...m,
            negociationsClubs: [...m.negociationsClubs, nego],
          },
          conversations: existante ? s.conversations : {
            ...s.conversations,
            [nego.pseudo]: [
              ...(s.conversations[nego.pseudo] ?? []),
              {
                id: idUnique(), pseudo: nego.pseudo, de: 'moi' as const,
                texte: t('mgr.x.clubContact', { joueur: cible.nom }),
                saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
              {
                id: idUnique(), pseudo: nego.pseudo, de: 'lui' as const,
                texte: t('mgr.x.clubDemande', { montant: nombre(nego.demande) }),
                saison: m.saison, semaine: m.semaine, creeLe: Date.now() + 1, lu: false,
              },
            ],
          },
          ouvrirSocialSur: 'messages',
          conversationSocialeCible: nego.pseudo,
          // ⚠️ UN MANAGER RESTE DANS SON BUREAU. Retour de jeu : « quand on
          // est dans le marché, fais que ça ouvre le X du bureau, pas celui de
          // la page ». L'Ovale du manager est un ONGLET de l'écran manager
          // (`vue === 'ovale'`) : forcer `ecran: 'social'` le sortait de son
          // bureau vers l'écran plein du joueur, perdant les onglets Marché,
          // Composition et Club au moment précis où il négocie.
          // `ouvrirDiscussionOvale` posait déjà la bonne règle depuis
          // longtemps — ces trois écritures ne l'avaient jamais reprise.
          ecran: s.manager && !s.joueur ? 'manager' : 'social',
          ecransVus: s.ecransVus.includes('social') ? s.ecransVus : [...s.ecransVus, 'social'],
        }));
      },

      negocierClubManager: (id, levier) => {
        const m = get().manager;
        const actuelle = m?.negociationsClubs.find((n) => n.id === id);
        if (!m || !actuelle || actuelle.etat !== 'ouverte') return;
        const resultat = negocierAvecClub(actuelle, levier);
        const reponse = resultat.accord
          ? t('mgr.x.clubAccord', { montant: nombre(resultat.negociation.offre) })
          : resultat.negociation.etat === 'rompue'
            ? t('mgr.x.clubRupture')
            : t('mgr.x.clubRefus', { n: resultat.negociation.patience });
        set((s) => ({
          manager: {
            ...m,
            negociationsClubs: m.negociationsClubs.map((n) => (
              n.id === id ? resultat.negociation : n
            )),
          },
          conversations: {
            ...s.conversations,
            [actuelle.pseudo]: [
              ...(s.conversations[actuelle.pseudo] ?? []),
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
                texte: t(`mgr.x.clubLevier.${levier}`, {
                  montant: nombre(resultat.negociation.offre),
                }),
                saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
                texte: reponse, saison: m.saison, semaine: m.semaine,
                creeLe: Date.now() + 1, lu: false,
              },
            ],
          },
        }));
      },

      contacterJoueurManager: (cible) => {
        const m = get().manager;
        if (!m?.club || cible.club === m.club) return;
        const signee = [...m.negociations].reverse().find((n) => (
          n.joueur.id === cible.id && n.etat === 'signee'
        ));
        if (joueurDejaRecrute(m, cible.id)) {
          // On rouvre seulement le reçu de la signature. Si une vieille
          // sauvegarde n'a plus son dossier, on sort sans fabriquer de contrat.
          if (signee) set((s) => ({
            ouvrirSocialSur: 'messages',
            conversationSocialeCible: signee.pseudo,
            ecran: s.manager && !s.joueur ? 'manager' : 'social',
            ecransVus: s.ecransVus.includes('social') ? s.ecransVus : [...s.ecransVus, 'social'],
          }));
          return;
        }
        // ⚠️ ON NE PARLE AU JOUEUR QU'UNE FOIS LE CLUB D'ACCORD, et c'est
        // l'ordre du rugby : se mettre d'accord avec un joueur puis découvrir
        // que son club ne le lâche pas n'existe pas dans un transfert réel, et
        // ferait perdre au manager une négociation entière pour rien.
        // Sous la Nationale 2, l'indemnité vaut 0 : il n'y a rien à négocier,
        // et on parle directement au joueur.
        if (cible.indemnite > 0) {
          const dossier = m.negociationsClubs.find((n) => n.cible.id === cible.id);
          if (dossier?.etat !== 'accord') return;
        }
        const existante = m.negociations.find((n) => n.joueur.id === cible.id
          && (n.etat === 'ouverte' || n.etat === 'accord'));
        const agent = joueurAgent(m.avancee, cible.id);
        // Un bon historique avec l'agent adoucit légèrement ses exigences ;
        // son intérêt financier produit l'effet inverse. Le joueur conserve
        // toutefois ses propres priorités : l'écart reste volontairement borné.
        const facteurAgent = agent
          ? Math.max(0.86, Math.min(1.14,
            1 + (50 - agent.relationManager) / 500 + (agent.interetFinancier - 50) / 1000))
          : 1;
        const facteurAmbition = facteurAmbitionRecrutement(m.avancee?.profonde, cible, m.club);
        const facteurExigences = facteurAgent * facteurAmbition;
        const cibleNegociee = facteurExigences === 1 ? cible : {
          ...cible,
          salaireDemande: Math.round(cible.salaireDemande * facteurExigences),
          primeDemandee: Math.round(cible.primeDemandee * facteurExigences),
          primeMatchDemandee: Math.round(cible.primeMatchDemandee * facteurExigences),
        };
        const profilVestiaire = m.avancee?.vestiaire[cible.id];
        const profilMedical = m.avancee?.profilsMedicaux[cible.id];
        const risqueMedical = profilMedical
          ? Math.min(100, profilMedical.fragiliteNaturelle * .4 + profilMedical.historique.length * 10
            + Object.values(profilMedical.sequelles).reduce((n, x) => n + (x ?? 0), 0))
          : undefined;
        const nego = existante ?? ouvrirNegociationManager(cibleNegociee, m.saison, m.semaine, {
          nature: 'recrutement', satisfaction: profilVestiaire?.satisfaction,
          performance: cible.note, risqueMedical,
          interetExterieur: Math.max(0, (cible.note - forceEffectif(m.club, m.saison)) * 10),
        });
        const avancee = !m.avancee || !agent || agent.joueurs.includes(cible.id)
          ? m.avancee
          : {
            ...m.avancee,
            agents: m.avancee.agents.map((a) => a.id === agent.id
              ? { ...a, joueurs: [...a.joueurs, cible.id] }
              : a),
          };
        set((s) => ({
          manager: existante ? m : { ...m, avancee, negociations: [...m.negociations, nego] },
          conversations: existante ? s.conversations : {
            ...s.conversations,
            [nego.pseudo]: [
              ...(s.conversations[nego.pseudo] ?? []),
              {
                id: idUnique(), pseudo: nego.pseudo, de: 'moi' as const,
                texte: t('mgr.dm.contact', { club: m.club }), saison: m.saison,
                semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
              {
                id: idUnique(), pseudo: nego.pseudo, de: 'lui' as const,
                texte: t('mgr.dm.exigences', {
                  salaire: nombre(nego.exigences.salaire),
                  prime: nombre(nego.exigences.prime),
                  duree: nego.exigences.duree,
                }),
                saison: m.saison, semaine: m.semaine, creeLe: Date.now() + 1, lu: false,
              },
            ],
          },
          ouvrirSocialSur: 'messages',
          conversationSocialeCible: nego.pseudo,
          // ⚠️ UN MANAGER RESTE DANS SON BUREAU. Retour de jeu : « quand on
          // est dans le marché, fais que ça ouvre le X du bureau, pas celui de
          // la page ». L'Ovale du manager est un ONGLET de l'écran manager
          // (`vue === 'ovale'`) : forcer `ecran: 'social'` le sortait de son
          // bureau vers l'écran plein du joueur, perdant les onglets Marché,
          // Composition et Club au moment précis où il négocie.
          // `ouvrirDiscussionOvale` posait déjà la bonne règle depuis
          // longtemps — ces trois écritures ne l'avaient jamais reprise.
          ecran: s.manager && !s.joueur ? 'manager' : 'social',
          ecransVus: s.ecransVus.includes('social') ? s.ecransVus : [...s.ecransVus, 'social'],
        }));
      },

      negocierJoueurManager: (id, levier) => {
        const m = get().manager;
        const actuelle = m?.negociations.find((n) => n.id === id);
        if (!m || !actuelle || actuelle.etat !== 'ouverte') return;
        const resultat = negocierAvecJoueur(actuelle, levier);
        const reponse = resultat.accord
          ? t('mgr.dm.accord')
          : resultat.negociation.etat === 'rompue'
            ? t('mgr.dm.rupturePatience')
            : t('mgr.dm.contreProposition', { n: resultat.negociation.patience });
        set((s) => ({
          manager: {
            ...m,
            negociations: m.negociations.map((n) => n.id === id ? resultat.negociation : n),
          },
          conversations: {
            ...s.conversations,
            [actuelle.pseudo]: [
              ...(s.conversations[actuelle.pseudo] ?? []),
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
                texte: t(`mgr.dm.levier.${levier}`), saison: m.saison,
                semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
                texte: reponse, saison: m.saison, semaine: m.semaine,
                creeLe: Date.now() + 1, lu: false,
              },
            ],
          },
        }));
      },

      accepterDemandesJoueurManager: (id) => {
        const m = get().manager;
        const actuelle = m?.negociations.find((n) => n.id === id);
        if (!m || !actuelle || actuelle.etat !== 'ouverte') return;
        const accord = accepterDemandesJoueur(actuelle);
        set((s) => ({
          manager: { ...m, negociations: m.negociations.map((n) => n.id === id ? accord : n) },
          conversations: {
            ...s.conversations,
            [actuelle.pseudo]: [
              ...(s.conversations[actuelle.pseudo] ?? []),
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
                texte: t('mgr.dm.accepterDemandes'), saison: m.saison,
                semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
                texte: t('mgr.dm.accord'), saison: m.saison,
                semaine: m.semaine, creeLe: Date.now() + 1, lu: false,
              },
            ],
          },
        }));
      },

      signerJoueurManager: (id) => {
        const m = get().manager;
        const actuelle = m?.negociations.find((n) => n.id === id);
        if (!m?.club || !actuelle || actuelle.etat !== 'accord') return;
        if (actuelle.nature === 'prolongation' || actuelle.nature === 'revalorisation') {
          const groupe = effectifDuClub(m.club, m.saison);
          const avancee = assurerEtatCarriereAvancee(m, groupe);
          const salaireActuel = salairesEffectif(m.club, m.saison, m.recrues, avancee.contratsJoueurs)
            .find((j) => j.joueurId === actuelle.joueur.id || j.nom === actuelle.joueur.nom)?.salaire ?? 0;
          const margeAvecRemplacement = situationSalariale({ ...m, avancee }).disponible + salaireActuel;
          if (actuelle.offre.salaire > margeAvecRemplacement || actuelle.offre.prime > m.budgetTransferts) return;
          const signee = { ...actuelle, etat: 'signee' as const };
          set((s) => ({
            manager: {
              ...m, budgetTransferts: m.budgetTransferts - actuelle.offre.prime,
              negociations: m.negociations.map((n) => n.id === id ? signee : n),
              avancee: signerRenegociationJoueur(avancee, signee, {
                semaine: m.semaine, feuilles: m.tempsDeJeu[actuelle.joueur.id] ?? 0,
              }),
            },
            conversations: { ...s.conversations, [actuelle.pseudo]: [
              ...(s.conversations[actuelle.pseudo] ?? []),
              { id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
                texte: 'Le contrat est prêt. Bienvenue pour la suite.', saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true },
              { id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
                texte: 'Accord signé. Je me projette avec le club.', saison: m.saison, semaine: m.semaine, creeLe: Date.now() + 1, lu: false },
            ] },
            journal: [...s.journal, { id: idUnique(), saison: m.saison, role: 'mj' as const,
              titre: `Contrat · ${actuelle.joueur.nom}`,
              texte: `${actuelle.offre.duree} saison(s), ${nombre(actuelle.offre.salaire)} € par an, statut ${actuelle.offre.role}.` }],
          }));
          return;
        }
        // Défense en profondeur : même si une ancienne interface ou un double
        // clic parvient jusqu'ici, aucun débit ni transfert ne peut être rejoué.
        if (joueurDejaRecrute(m, actuelle.joueur.id)) return;
        const dossier = m.negociationsClubs.find(
          (n) => n.cible.id === actuelle.joueur.id && n.etat === 'accord',
        );
        const cout = coutPremiereSaison(actuelle, dossier?.offre);
        // ⚠️ LE SALARY CAP SE VÉRIFIE SUR LA MASSE, PAS SUR UN SALAIRE ISOLÉ.
        // L'ancien test comparait le plafond du club au salaire de LA recrue :
        // il passait donc toujours, puisqu'aucun joueur ne coûte à lui seul
        // onze millions. « Tu peux avoir énormément d'argent en banque et quand
        // même être incapable de recruter Dupont parce que tu n'as plus assez
        // de place sous ton salary cap » : la contrainte porte sur ce qui est
        // DÉJÀ engagé, plus ce qu'on ajoute.
        if (m.budgetTransferts < cout) return;
        if (actuelle.offre.salaire > situationSalariale(m).disponible) return;
        const transfert: TransfertAnnonce = {
          nom: actuelle.joueur.nom,
          de: actuelle.joueur.club,
          vers: m.club,
          saison: m.saison,
          poste: POSTE_PAR_ID[actuelle.joueur.poste]?.famille,
          age: actuelle.joueur.age,
          note: actuelle.joueur.note,
          nation: actuelle.joueur.nation,
        };
        const avancee = m.avancee?.profonde ? {
          ...m.avancee,
          profonde: enregistrerTransfertProfonde(
            m.avancee.profonde, m, actuelle.joueur, dossier?.offre ?? actuelle.joueur.indemnite,
            'recrue', actuelle.joueur.club,
          ),
        } : m.avancee;
        set((s) => {
          const transfertsSociaux = [...s.transfertsSociaux, transfert];
          setTransfertsSociaux(transfertsSociaux);
          const signee = { ...actuelle, etat: 'signee' as const };
          return {
            manager: {
              ...m,
              budgetTransferts: m.budgetTransferts - cout,
              negociations: m.negociations.map((n) => n.id === id ? signee : n),
              recrues: [...m.recrues, {
                club: m.club, joueur: actuelle.joueur, termes: actuelle.offre, saison: m.saison,
                accordClub: dossier ? { clubVendeur: dossier.club, indemnite: dossier.offre,
                  bonus: dossier.bonus ?? 0, pourcentageRevente: dossier.pourcentageRevente ?? 0 } : undefined,
              }],
              avancee,
            },
            transfertsSociaux,
            conversations: {
              ...s.conversations,
              [actuelle.pseudo]: [
                ...(s.conversations[actuelle.pseudo] ?? []),
                {
                  id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
                  texte: t('mgr.dm.signature', { club: m.club }), saison: m.saison,
                  semaine: m.semaine, creeLe: Date.now(), lu: true,
                },
                {
                  id: idUnique(), pseudo: actuelle.pseudo, de: 'lui' as const,
                  texte: t('mgr.dm.signatureReponse'), saison: m.saison,
                  semaine: m.semaine, creeLe: Date.now() + 1, lu: false,
                },
              ],
            },
            journal: [...s.journal, {
              id: idUnique(), saison: m.saison, role: 'mj' as const,
              titre: t('mgr.journal.recrueTitre', { joueur: actuelle.joueur.nom }),
              texte: t('mgr.journal.recrueTexte', {
                joueur: actuelle.joueur.nom, club: actuelle.joueur.club,
                destination: m.club, montant: nombre(dossier?.offre ?? actuelle.joueur.indemnite),
              }),
            }],
          };
        });
      },

      rompreNegociationManager: (id) => {
        const m = get().manager;
        const actuelle = m?.negociations.find((n) => n.id === id);
        if (!m || !actuelle || actuelle.etat === 'signee') return;
        set((s) => ({
          manager: {
            ...m,
            negociations: m.negociations.map((n) => n.id === id ? { ...n, etat: 'rompue' } : n),
          },
          conversations: {
            ...s.conversations,
            [actuelle.pseudo]: [
              ...(s.conversations[actuelle.pseudo] ?? []),
              {
                id: idUnique(), pseudo: actuelle.pseudo, de: 'moi' as const,
                texte: t('mgr.dm.finDiscussion'), saison: m.saison,
                semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
            ],
          },
        }));
      },

      repondreDemandeManager: (id, accepter) => {
        const m = get().manager;
        const demande = m?.demandes.find((d) => d.id === id);
        if (!m?.club || !demande || demande.etat !== 'ouverte') return;
        let ventes = m.ventes;
        if (accepter && demande.type === 'depart' && !ventes.some((v) => v.joueurId === demande.joueurId)) {
          const joueur = effectifDuClub(m.club, m.saison).find((j) => j.id === demande.joueurId);
          if (joueur) {
            const profilMedical = m.avancee?.profilsMedicaux[joueur.id];
            const contratJoueur = m.avancee?.contratsJoueurs[joueur.id];
            const vente = {
              joueurId: joueur.id,
              nom: joueur.nom,
              poste: joueur.poste,
              age: joueur.age,
              note: joueur.note,
              potentiel: joueur.potentiel,
              valeur: valeurDeVente(joueur, m.club, m.saison, {
                historiqueMedical: profilMedical?.historique.length,
                sequelles: Object.values(profilMedical?.sequelles ?? {}).reduce((n, x) => n + (x ?? 0), 0),
                contratFin: contratJoueur?.fin,
              }),
              saison: m.saison,
              offres: [],
            };
            ventes = [{ ...vente, offres: offresPourVente(vente, m.club, m.saison) }, ...ventes];
          }
        }
        set((s) => ({
          manager: {
            ...m,
            ventes,
            confiance: borne(m.confiance + (accepter ? 1 : -2)),
            demandes: m.demandes.map((d) => d.id === id
              ? { ...d, etat: accepter ? 'acceptee' as const : 'refusee' as const }
              : d),
          },
          conversations: {
            ...s.conversations,
            [demande.pseudo]: [
              ...(s.conversations[demande.pseudo] ?? []),
              {
                id: idUnique(), pseudo: demande.pseudo, de: 'moi' as const,
                texte: accepter
                  ? t('mgr.x.demandeAcceptee', { joueur: demande.nom })
                  : t('mgr.x.demandeRefusee', { joueur: demande.nom }),
                saison: m.saison, semaine: m.semaine, creeLe: Date.now(), lu: true,
              },
            ],
          },
        }));
      },

      mettreEnVenteManager: (joueurId) => {
        const m = get().manager;
        if (!m?.club || m.ventes.some((v) => v.joueurId === joueurId)) return;
        const groupe = effectifDuClub(m.club, m.saison);
        const joueur = groupe.find((j) => j.id === joueurId);
        if (!joueur) return;
        // ⚠️ ON NE VEND PAS TOUT L'EFFECTIF. Retour de jeu : « on peut vendre
        // tout l'effectif sans problème ». Un club qui n'a plus 23 joueurs ne
        // peut pas remplir une feuille de match — et `composerParDefaut` se
        // contentait de rendre une feuille trouée, sans que rien ne l'explique.
        //
        // ⚠️ LE PLANCHER COMPTE LES JOUEURS QUI RESTENT, ventes en cours
        // COMPRISES : lister six joueurs un par un contournerait un contrôle
        // qui ne regarderait que le groupe du jour. Vingt-six, c'est les 23 de
        // la feuille plus trois de marge — un club qui descend à 23 n'a plus
        // aucun remplaçant en cas de blessure, et c'est déjà une décision.
        const restants = groupe.length - m.ventes.filter(
          (v) => v.saison === m.saison && groupe.some((j) => j.id === v.joueurId),
        ).length;
        if (restants <= EFFECTIF_MINIMUM) {
          set((s2) => ({
            journal: [...s2.journal, {
              id: idUnique(), saison: m.saison, role: 'mj' as const,
              titre: t('mgr.effectifMinTitre'),
              texte: t('mgr.effectifMinTexte', { min: EFFECTIF_MINIMUM }),
            }],
          }));
          return;
        }
        const profilMedical = m.avancee?.profilsMedicaux[joueur.id];
        const contratJoueur = m.avancee?.contratsJoueurs[joueur.id];
        const vente = {
          joueurId: joueur.id,
          nom: joueur.nom,
          poste: joueur.poste,
          age: joueur.age,
          note: joueur.note,
          potentiel: joueur.potentiel,
          valeur: valeurDeVente(joueur, m.club, m.saison, {
            historiqueMedical: profilMedical?.historique.length,
            sequelles: Object.values(profilMedical?.sequelles ?? {}).reduce((n, x) => n + (x ?? 0), 0),
            contratFin: contratJoueur?.fin,
          }),
          saison: m.saison,
          offres: [],
        };
        const avecOffres = { ...vente, offres: offresPourVente(vente, m.club, m.saison) };
        set((s) => ({
          manager: { ...m, ventes: [avecOffres, ...m.ventes] },
          journal: [...s.journal, {
            id: idUnique(), saison: m.saison, role: 'mj' as const,
            titre: t('mgr.x.venteListeTitre', { joueur: joueur.nom }),
            texte: avecOffres.offres.length
              ? t('mgr.x.venteOffres', { n: avecOffres.offres.length })
              : t('mgr.x.venteSansOffre'),
          }],
        }));
      },

      retirerVenteManager: (joueurId) => {
        const m = get().manager;
        if (!m) return;
        set({ manager: { ...m, ventes: m.ventes.filter((v) => v.joueurId !== joueurId) } });
      },

      accepterOffreVenteManager: (joueurId, offreId) => {
        const m = get().manager;
        const vente = m?.ventes.find((v) => v.joueurId === joueurId);
        const offre = vente?.offres.find((o) => o.id === offreId);
        if (!m?.club || !vente || !offre) return;
        const joueur = effectifDuClub(m.club, m.saison).find((j) => j.id === joueurId);
        if (!joueur) return;
        const transfert: TransfertAnnonce = {
          nom: joueur.nom,
          de: m.club,
          vers: offre.club,
          saison: m.saison,
          poste: POSTE_PAR_ID[joueur.poste]?.famille,
          age: joueur.age,
          note: joueur.note,
          nation: joueur.nation,
        };
        const contratOrigine = m.recrues.findLast((r) => r.club === m.club
          && (r.joueur.id === joueurId || r.joueur.nom === joueur.nom));
        const partRevente = contratOrigine?.accordClub?.pourcentageRevente ?? 0;
        const reversement = Math.round(offre.montant * partRevente / 100);
        const montantNet = Math.max(0, offre.montant - reversement);
        let avancee = m.avancee;
        if (avancee?.profonde) {
          const depart = apresDepartJoueurProfonde(avancee.profonde, m, joueurId);
          const vestiaire = { ...avancee.vestiaire };
          for (const [id, delta] of Object.entries(depart.moralTouches)) {
            const profil = vestiaire[id];
            if (profil) vestiaire[id] = { ...profil, moral: borne(profil.moral + delta), satisfaction: borne(profil.satisfaction + delta) };
          }
          avancee = {
            ...avancee,
            profonde: enregistrerTransfertProfonde(depart.etat, m, joueur, offre.montant, 'vente', offre.club),
            vestiaire,
          };
        }
        set((s) => {
          const transfertsSociaux = [...s.transfertsSociaux, transfert];
          setTransfertsSociaux(transfertsSociaux);
          return {
            manager: {
              ...m,
              budgetTransferts: m.budgetTransferts + montantNet,
              ventes: m.ventes.filter((v) => v.joueurId !== joueurId),
              entrainements: m.entrainements.filter((n) => n !== joueur.nom),
              avancee,
              composition: reconcilerCompositionManager(
                effectifDuClub(m.club, m.saison), m.composition,
              ),
            },
            transfertsSociaux,
            journal: [...s.journal, {
              id: idUnique(), saison: m.saison, role: 'mj' as const,
              titre: t('mgr.x.venteConclue', { joueur: joueur.nom }),
              texte: t('mgr.x.venteConclueTexte', {
                club: offre.club, montant: nombre(montantNet),
              }) + (reversement > 0 ? ` ${nombre(reversement)} € sont reversés à ${contratOrigine?.accordClub?.clubVendeur}.` : ''),
            }],
          };
        });
      },

      /**
       * La fin de saison d’un entraîneur.
       *
       * ⚠️ LE RANG VIENT DU CHAMPIONNAT RÉELLEMENT JOUÉ (`rangFinal`), pas
       * d’une estimation. C’est la même fonction que la carrière de joueur, et
       * c’est la condition pour que le mode manager soit jugé sur le même
       * monde : montées, générations dorées et effectifs vieillissants
       * compris.
       *
       * ⚠️ ET LE BOARD JUGE SUR L’ÉCART À SON OBJECTIF, jamais sur le rang nu.
       * Finir huitième avec le budget du dernier est un exploit ; finir
       * troisième avec celui du premier est un échec. Sans cet écart, la seule
       * stratégie serait de prendre le meilleur club accessible et d’y rester.
       */
      saisonManager: () => {
        const m = get().manager;
        if (!m || !m.club) return;
        const rang = rangFinal(m.division, m.saison, m.club);
        const py = resoudreSaisonClub(m.division, m.saison, m.club);
        const monte = py.mouvements.some((x) => x.club === m.club && x.sens === 'montee');
        const descendu = py.mouvements.some((x) => x.club === m.club && x.sens === 'descente');

        // ═══ LA PYRAMIDE BOUGE AUSSI POUR L'ENTRAÎNEUR ═════════════════════
        // ⚠️ ELLE NE BOUGEAIT PAS DU TOUT, ET C'ÉTAIT LE BUG SIGNALÉ (« gros
        // problème : on ne monte pas de division »). Le mouvement du club était
        // pourtant CALCULÉ — `monte` et `descendu` alimentaient déjà le verdict
        // du board, le prestige et la ligne d'historique — mais `suivant`
        // recopiait `division`, `divisionNom` et `objectif` de la saison
        // précédente : on gagnait sa Régionale 2, on lisait « ⬆ montée » dans
        // son bilan, et on rejouait la Régionale 2 la saison suivante.
        //
        // ⚠️ ET IL NE SUFFIT PAS DE CHANGER LE CHAMP. `lib/divisions.ts` tient
        // un REGISTRE DE MODULE que lisent le championnat, le calendrier, les
        // classements et l'atlas : sans `setMouvementsClubs`, le club serait
        // promu dans sa fiche et resterait dans l'ancienne poule partout
        // ailleurs. C'est exactement la ligne que la carrière joueur commente
        // depuis longtemps — « sans ça, la division du club promu ne changeait
        // nulle part et le championnat de la saison suivante était identique au
        // précédent ». Le mode manager ne l'avait simplement jamais reçue.
        const mouvements = py.mouvements;
        const majMouvements = { ...get().mouvementsClubs };
        const majArrivees = { ...get().arriveesClubs };
        for (const x of mouvements) {
          majMouvements[x.club] = x.vers;
          // Il arrive POUR la saison suivante : il n'a pas joué celle qui finit.
          majArrivees[x.club] = m.saison + 1;
        }

        const divisionSuivante = majMouvements[m.club] ?? m.division;
        const compSuivante = COMPETITIONS.find((c) => c.id === divisionSuivante);
        // Le manager lit les MÊMES finales que la carrière joueur : le rang de
        // poule qualifie, mais seul le vainqueur du tableau soulève le titre.
        const phase = py.phase;
        const tropheeNational = phase.champion === m.club
          ? TROPHEE_PAR_DIVISION[m.division]
          : undefined;
        // Les coupes sont elles aussi résolues par leur vrai tableau. Le mode
        // manager ne repart donc plus sans trophée après une finale européenne
        // remportée dans le monde simulé.
        const tropheesCoupes = ['championsCup', 'challengeCup', 'premCup'].flatMap((coupeId) => {
          const tropheeCoupe = TROPHEE_PAR_COUPE[coupeId];
          if (!tropheeCoupe) return [];
          const etat = coupeEnDirect(
            coupeId, m.saison, m.club,
            SEMAINES.filter((s) => s.type === 'coupe').length,
          );
          return etat?.vainqueur === m.club ? [tropheeCoupe] : [];
        });
        const titres = [...new Set([...(tropheeNational ? [tropheeNational] : []), ...tropheesCoupes])];
        const gainTrophees = titres.reduce((total, id) => total + (TROPHEES[id]?.ovas ?? 0), 0);

        const v = verdictDeSaison(rang, m.objectif, {
          titres: titres.length, montee: monte, descente: descendu,
        });
        const verdictBoard = appliquerVerdict(m, v);
        const groupe = effectifDuClub(m.club, m.saison);
        const bilanAvance = finSaisonCarriereAvancee(m, groupe, rang);
        // Les reports se mesurent dans l'ancienne division, avant les mouvements.
        const reports = reportsBudgets(m);
        const prestige = verdictBoard.prestige;
        const confiance = borne(verdictBoard.confiance + bilanAvance.confiance);

        // On fige les titres et l'histoire AVANT de changer les poules.
        setMouvementsClubs(majMouvements);
        setArriveesClubs(majArrivees);
        oublierResultats();

        const ligne: SaisonManager = {
          saison: m.saison, club: m.club, division: m.division,
          divisionNom: m.divisionNom, rang, objectif: m.objectif,
          tenu: v.tenu, titres,
          ...(monte ? { montee: true } : {}),
          ...(descendu ? { descente: true } : {}),
        };

        // ⚠️ LE LICENCIEMENT EST LE SEUL VRAI RISQUE DU MODE, et il doit être
        // lisible : la confiance se lit toute la saison, elle ne tombe pas par
        // surprise à la sirène. Un contrat qui expire ne protège de rien.
        // Le mode libre sert aussi de bac à sable tactique et structurel : il
        // est hors classement, donc le board ne peut pas interrompre l'essai.
        const licencie = !m.libre && confiance < CONFIANCE_LICENCIEMENT;
        const saisonsContrat = Math.max(0, (m.contrat?.saisons ?? 1) - 1);
        const budgets = budgetsDuClub(m.club, m.saison + 1);

        // ═══ LES INSTALLATIONS RENDENT LEUR SAISON ═════════════════════════
        // ⚠️ TOUT SE PASSE ICI, ET AVANT LA CONSTRUCTION DE `suivant`. La
        // composition est réconciliée quelques lignes plus bas sur
        // `effectifDuClub(club, saison + 1)` : si les jeunes du centre
        // n'étaient pas déjà déversés dans le registre, ils n'existeraient pas
        // encore pour elle, et le manager découvrirait sa promotion sans
        // pouvoir l'aligner avant l'intersaison suivante.
        const murs = m.installations[m.club] ?? installationsVierges();
        // 🎓 L'académie ne fabrique plus magiquement des seniors. Les jeunes
        // repérés, recrutés puis gérés par le manager progressent ici ; leur
        // intégration au groupe professionnel reste une décision explicite.
        const bilanAcademie = licencie ? {
          academie: m.academie,
          observations: m.observationsJeunes,
          indemnites: 0,
          revenus: [],
          liberes: [],
          progressions: [],
        } : evoluerAcademieManager(m);
        const jeunesFormes = m.jeunesFormes;
        const cleRevenus = `${m.club}|${m.saison}`;
        const revenusFormation = bilanAcademie.indemnites > 0
          ? {
              ...m.revenusFormation,
              [cleRevenus]: (m.revenusFormation[cleRevenus] ?? 0) + bilanAcademie.indemnites,
            }
          : m.revenusFormation;

        // 🏋️ Le programme individuel rend ce qu'il a fait gagner.
        const progres = { ...m.progres };
        const gagnants: string[] = [];
        if (!licencie && murs.entrainement > 0) {
          const places = PLACES_ENTRAINEMENT[Math.min(murs.entrainement, NIVEAU_INSTALLATION_MAX)];
          for (const nom of m.entrainements.slice(0, places)) {
            const j = groupe.find((x) => x.nom === nom);
            if (!j) continue;
            const gain = gainEntrainement(murs.entrainement, j.age, j.potentiel - j.note);
            if (gain <= 0) continue;
            const cle = `${m.club}|${nom}`;
            // Daté : il ne rattrape pas les saisons déjà jouées (voir types.ts).
            progres[cle] = [...(progres[cle] ?? []), { depuis: m.saison + 1, gain }];
            gagnants.push(`${nom} +${gain.toString().replace('.', ',')}`);
          }
        }

        // 🔎 Les recruteurs rendent leur rapport de la saison à venir.
        const rapports = licencie || murs.recrutement <= 0
          ? m.rapports
          : explorer(m.club, m.saison + 1, murs.recrutement);

        // Les bonus négociés avec le club vendeur sont différés, mais réels :
        // ils deviennent dus si la recrue participe à au moins la moitié des
        // rencontres de sa première saison. Ils sortent de l'enveloppe suivante.
        const matchsJouesSaison = Math.max(1, Object.keys(m.resultats).length);
        const bonusConditionnels = m.recrues.filter((r) => r.club === m.club && r.saison === m.saison && (r.accordClub?.bonus ?? 0) > 0)
          .reduce((total, r) => {
            const joueur = groupe.find((j) => j.id === r.joueur.id || j.nom === r.joueur.nom);
            const feuilles = joueur ? (m.tempsDeJeu[joueur.id] ?? 0) : 0;
            return total + (feuilles >= matchsJouesSaison / 2 ? (r.accordClub?.bonus ?? 0) : 0);
          }, 0);
        const budgetsRenouveles = renouvelerBudgets(
          m, budgets, bilanAcademie.indemnites, bilanAvance.revenusMarketing, reports,
        );
        budgetsRenouveles.budgetTransferts = Math.max(0, budgetsRenouveles.budgetTransferts - bonusConditionnels);

        // ⚠️ ON DÉVERSE AVANT DE LIRE L'EFFECTIF SUIVANT, pas après.
        setApportsDuCentre(jeunesFormes, progres);

        const suivant: Manager = {
          ...m,
          saison: m.saison + 1,
          semaine: 1,
          age: m.age + 1,
          prestige,
          confiance: licencie ? 62 : confiance,
          argent: m.argent + (m.contrat?.salaire ?? 0),
          // Le board renouvelle une partie des enveloppes. Épargner aide, mais
          // ne permet pas d'empiler dix saisons de budgets sans les dépenser.
          ...(licencie ? { budgetTransferts: 0, budgetSalarial: 0, budgetStructure: 0 }
            : budgetsRenouveles),
          jeunesFormes,
          academie: bilanAcademie.academie,
          observationsJeunes: bilanAcademie.observations,
          missionsJeunes: { saison: m.saison + 1, utilises: 0 },
          revenusFormation,
          progres,
          rapports,
          // Un joueur parti ne suit plus le programme du club.
          entrainements: licencie ? [] : m.entrainements,
          titres: titres.length
            ? [...m.titres, ...titres.map((id) => `${TROPHEES[id]?.nom ?? nomDivision(m.division)} (S${m.saison})`)]
            : m.titres,
          palmares: titres.length
            ? [...m.palmares, ...titres.map((trophee) => ({
              trophee, nom: TROPHEES[trophee]?.nom ?? trophee,
              saison: m.saison, club: m.club, division: m.division,
            }))]
            : m.palmares,
          historique: [...m.historique, { ...ligne, ...(licencie ? { licencie: true } : {}) }],
          // Sans banc, le temps s’arrête : on cherche un club avant de repartir.
          club: licencie ? '' : m.club,
          // ⚠️ LA DIVISION SUIT LE MOUVEMENT DU CLUB, pas la saison précédente.
          division: licencie ? '' : divisionSuivante,
          divisionNom: licencie ? '' : (compSuivante?.nom ?? m.divisionNom),
          contrat: licencie ? null : { saisons: saisonsContrat, salaire: m.contrat?.salaire ?? 0 },
          // ⚠️ ET L'OBJECTIF SE RECALCULE DANS LA NOUVELLE DIVISION. Un promu
          // en Nationale ne se voit pas demander le rang qu'il visait en
          // Nationale 2 : `objectifDuBoard` classe l'effectif dans SA poule,
          // et la poule vient de changer.
          objectif: licencie ? 0
            : objectifDuBoard(m.club, compSuivante ?? competitionDuClub(m.club), m.saison + 1),
          decision: null,
          composition: licencie
            ? m.composition
            : reconcilerCompositionManager(effectifDuClub(m.club, m.saison + 1), m.composition, new Set(indisponiblesCarriereAvancee(m.avancee, m.semaine))),
          negociations: m.negociations.map((n) => (
            n.etat === 'ouverte' || n.etat === 'accord' ? { ...n, etat: 'rompue' as const } : n
          )),
          negociationsClubs: m.negociationsClubs.map((n) => (
            n.etat === 'ouverte' || n.etat === 'accord' ? { ...n, etat: 'rompue' as const } : n
          )),
          tempsDeJeu: {},
          demandes: m.demandes.map((d) => d.etat === 'ouverte'
            ? { ...d, etat: 'refusee' as const } : d),
          ventes: [],
          avancee: bilanAvance.etat,
        };
        suivant.avancee = { ...bilanAvance.etat, objectifs: objectifsDeSaison(suivant,
          suivant.club ? effectifDuClub(suivant.club, suivant.saison) : []) };

        // ⚠️ CE QUE LES STRUCTURES ONT PRODUIT SE DIT, sinon elles n'existent
        // pas. Une promotion qui apparaît en silence dans l'écran Composition
        // se lit comme un bug d'effectif, et un joueur qui gagne deux points
        // sans explication passe pour du bruit — c'est exactement ce qui rend
        // un système de progression invisible « inutile » pour qui y joue.
        const ditesLe: string[] = [];
        if (bonusConditionnels > 0) ditesLe.push(`${nombre(bonusConditionnels)} € de bonus de transfert déclenchés`);
        if (bilanAcademie.progressions.length) {
          ditesLe.push(`Académie : ${bilanAcademie.progressions.slice(0, 5).join(', ')}.`);
        }
        if (bilanAcademie.revenus.length) {
          ditesLe.push(bilanAcademie.revenus.map((r) =>
            `${r.jeune} rejoint ${r.club} : ${nombre(r.indemnite)} € d’indemnité de formation.`).join(' '));
        }
        if (bilanAcademie.liberes.length) {
          ditesLe.push(`Fin de cycle Espoirs : ${bilanAcademie.liberes.join(', ')}.`);
        }
        if (gagnants.length) ditesLe.push(t('mgr.inst.progres', { noms: gagnants.join(', ') }));
        if (rapports.length && rapports !== m.rapports) {
          ditesLe.push(t('mgr.inst.rapport', { n: String(rapports.length) }));
        }

        // ⚠️ UN ENTRAÎNEUR RACCROCHE, LUI AUSSI — et ça manquait. Le manager
        // vieillissait d'un an par saison sans qu'aucune borne ne l'arrête,
        // alors que le crible du classement refuse une fiche au-delà de
        // `ageManagerMax`. Un banc tenu trop longtemps sortait donc du
        // classement EN SILENCE, exactement comme la carrière de joueur qui
        // continuait après une blessure de fin de carrière : la règle existait
        // dans les données, personne ne l'appliquait au jeu.
        //
        // ⚠️ MAIS ON NE FERME PAS LA PARTIE DEPUIS ICI. `quitterBanc` vide le
        // journal et emmène au Hall : appelé dans la foulée, il effacerait
        // l'entrée qu'on vient d'écrire et la carrière s'arrêterait sans un
        // mot. L'écran manager voit `age > ageManagerMax` et pose la question
        // (voir `screens/Manager.tsx`) — même principe que la retraite du
        // joueur, qui passe par un épilogue plutôt que par un `set()` muet.
        const finDAge = suivant.age > LIMITES.ageManagerMax;

        set((st) => ({
          manager: suivant,
          // ⚠️ LE REGISTRE DE MODULE NE SUFFIT PAS : il vit en mémoire et
          // disparaît au rechargement. Sans cette ligne, un club promu
          // redescendait tout seul au premier F5 — c'est pour ça que la
          // réhydratation repose `setMouvementsClubs(etat.mouvementsClubs)`.
          mouvementsClubs: majMouvements,
          arriveesClubs: majArrivees,
          coins: st.coins + gainTrophees,
          tropheesEnAttente: [...st.tropheesEnAttente, ...titres],
          journal: [...st.journal, ...(ditesLe.length ? [{
            id: idUnique(),
            saison: m.saison,
            role: 'mj' as const,
            titre: t('mgr.inst.titre'),
            texte: ditesLe.join(' '),
          }] : []), {
            id: idUnique(),
            saison: m.saison,
            role: 'mj' as const,
            titre: licencie
              ? t('mgr.journal.licencie')
              : t('mgr.journal.bilanTitre', { saison: m.saison }),
            texte: t('mgr.journal.bilanTexte', {
              club: m.club, rang, objectif: m.objectif, prestige: prestige.toFixed(0),
            })
              + (titres.length ? ` ${titres.map((id) => TROPHEES[id]?.nom ?? id).join(' · ')}.` : '')
              + (monte ? ` ${t('mgr.journal.montee')}` : '')
              + (descendu ? ` ${t('mgr.journal.descente')}` : '')
              + ` ${bilanAvance.resume}`
              + (licencie
                ? ` ${t('mgr.journal.nouveauBanc')}`
                : ` ${t('mgr.journal.confiance', { confiance })}`),
          }, ...(finDAge ? [{
            id: idUnique(),
            saison: m.saison,
            role: 'mj' as const,
            titre: t('mgr.journal.finDAgeTitre'),
            texte: t('mgr.journal.finDAgeTexte', {
              nom: suivant.nom, age: suivant.age, saisons: suivant.historique.length,
            }),
          }] : [])],
        }));
        get().verifierSucces();
      },

      quitterBanc: () => {
        const m = get().manager;
        if (!m) return;
        // ⚠️ LE MODE LIBRE N’ENVOIE RIEN, ET C’EST LE SEUL ENDROIT QUI DÉCIDE.
        // Demande explicite : « mode triche […] donc pas dans le classement
        // mondial ». Le verrou est ici, pas dans `ficheDepuisManager` : une
        // fonction pure qui refuserait de produire une fiche selon un drapeau
        // se contournerait en retirant le drapeau.
        if (!m.libre) get().publierAuClassement(true);
        setMouvementsClubs({});
        setArriveesClubs({});
        effacerResultatsJoues();
        oublierResultats();
        setContexteJoueur('', 0);
        set((s) => ({
          manager: null,
          mouvementsClubs: {}, arriveesClubs: {},
          journal: [],
          ecran: 'pantheon',
          ecransVus: s.ecransVus.includes('pantheon') ? s.ecransVus : [...s.ecransVus, 'pantheon'],
        }));
      },

      setPseudoClassement: (p) => {
        // ⚠️ ON BORNE ICI, PAS SEULEMENT À L'ÉCRAN. `verifierFiche` refuse un
        // pseudo de plus de 24 caractères : laisser passer une saisie plus
        // longue, c'est un envoi refusé par le serveur et une carrière qui
        // n'entre jamais au classement, sans que rien ne l'explique.
        set({ pseudoClassement: p.trim().slice(0, LIMITES.pseudoMax) });
      },

      // ═══ LA CARRIÈRE EN COURS ENTRE AU CLASSEMENT ═══════════════════════
      // ⚠️ RETOUR DE JEU : « si c'est la première saison pas finie, c'est pas
      // pris en compte ». C’était exact, et c’était une conséquence du réglage
      // précédent : l’envoi n’avait lieu qu’à la FIN D’UNE SAISON et à la
      // retraite. Quelqu’un qui joue ses premières journées — le moment où l’on
      // a le plus envie de se voir quelque part — n’existait nulle part.
      //
      // ⚠️ DEUX FREINS, ET LES DEUX SONT NÉCESSAIRES :
      //   · le score doit avoir PROGRESSÉ depuis le dernier envoi accepté —
      //     sinon on renverrait la même fiche à chaque semaine ;
      //   · un plancher entre deux envois, calculé sur le débit du serveur
      //     (`DELAI_ENVOI`) — se faire jeter par son propre débit serait le
      //     comble.
      // La fin de saison et la retraite passent outre (`force`) : ce sont les
      // deux moments où la carrière DOIT être posée, quoi qu’il arrive.
      // ⚠️ ET UNE CARRIÈRE D'ENTRAÎNEUR SE PUBLIE AUSSI. Elle ne se publiait
      // PAS : cette fonction commençait par `if (!joueur) return`, or
      // `creerManager` pose `joueur: null`. L'appel de `quitterBanc` était donc
      // un no-op SILENCIEUX — et avec lui tout l'étage manager du classement,
      // pourtant écrit, calibré et déployé : `ficheDepuisManager`, le barème
      // `scoreManager`, les bornes du banc (`ageDebutManagerMin`,
      // `titresManagerParSaison`…), les trois catégories SQL de
      // `api/classement.ts` et les quatre onglets de l'écran. Rien n'était
      // jamais envoyé, et rien ne le disait.
      //
      // ⚠️ LE VERROU DU MODE LIBRE RESTE DANS `quitterBanc`, pas ici : c'est
      // lui qui décide de ne pas appeler. Le remettre aussi dans cette
      // fonction donnerait deux gardiens pour une seule porte, donc un jour
      // deux réponses.
      publierAuClassement: (force = false) => {
        const j = get().joueur;
        const m = get().manager;
        if (!j && !m) return;
        const fiche = j
          ? ficheDepuisJoueur(j, get().pseudoClassement || undefined, get().cleClassement)
          : ficheDepuisManager(m!, get().pseudoClassement || undefined, get().cleClassement);
        if (!force) {
          if (fiche.score <= get().dernierScoreEnvoye) return;
          if (Date.now() - dernierEnvoiLe < DELAI_ENVOI) return;
        }
        dernierEnvoiLe = Date.now();
        // Fait exprès : on n’attend pas la réponse et on n’échoue jamais. Sans
        // serveur, hors ligne, fiche refusée ou quota atteint, le jeu continue
        // exactement pareil. Le serveur ne garde que le MEILLEUR score.
        void envoyerAuClassement(fiche)
          .then((r) => {
            retenirMaLigne(set)(r);
            if (r.ok) set({ dernierScoreEnvoye: fiche.score });
          })
          .catch(() => {});
      },

      reinitialiser: () => {
        setMouvementsClubs({});
        setArriveesClubs({});
        // La pyramide repart de zéro : les fins de saison mémoïsées et le contexte
        // du joueur précédent sont périmés (voir lib/promotion.ts).
        oublierResultats();
        setContexteJoueur('', 0);
        set({
          joueur: null,
          finCarriere: null,
          journal: [],
          scenarioActif: null,
          attenteEvenement: false,
          evenementHebdo: null,
          evenementsVus: [],
          tropheesEnAttente: [],
          approches: [],
          dossiersRecrutement: {},
          mouvementsClubs: {}, arriveesClubs: {},
          compteurs: { evenements: 0, situations: 0, gainsIA: 0, gainsArgentIA: 0, gainsMatchs: 0, ovasDefis: 0, ovasActions: 0, augmentations: 0, primesIA: 0 },
          posts: [],
          filSemaine: '',
          notifsSocial: [],
          comptesSuivis: [],
          suggestionsComptes: [],
          conversations: {},
          transfertsSociaux: [],
          relationsSociales: {},
          defis: { cle: '', faits: [] },
          ecran: 'accueil',
        });
      },

      // ---- LOT 7 : L'OVALE (réseau social) ----
      // Publier engage : la portée dépend de la notoriété, le ton décide de
      // l'accueil, et le club veille. Tout est calculé dans `lib/social.ts`.
      publier: async (texte, ton, media) => {
        const { joueur } = get();
        if (!joueur) return;
        const propre = texte.trim().slice(0, 280);
        if (!propre) return;

        const r = publierPost(joueur, propre, ton, idUnique());
        if (media?.url) r.post.media = media;

        // Avec l'IA locale, ce sont des commentaires écrits pour ce post précis.
        // Sinon, on garde les réponses du pool pré-écrit.
        if (get().iaActivee && iaDisponible()) {
          try {
            set({ chargementSocial: true, erreurSocial: null });
            const reponses = await reponsesIA(
              { joueur, modele: get().modele, suivis: get().comptesSuivis },
              propre, ton, 8,
            );
            if (reponses.length) r.post.reponses = reponses;
          } catch (e) {
            // ⚠️ QUOTA / CLÉ / RÉSEAU : ON N'AFFICHE RIEN (demande explicite).
            // Le fil a déjà son contenu pré-écrit ; une bannière rouge ne
            // ferait qu'inquiéter le joueur pour une bascule invisible.
            set({ erreurSocial: erreurSilencieuse(e) ? null : (e as Error).message });
          } finally {
            set({ chargementSocial: false });
          }
        }
        let j = appliquerDeltas(
          {
            ...joueur,
            abonnes: Math.max(0, (joueur.abonnes ?? 0) + r.gainAbonnes),
            popularite: borne((joueur.popularite ?? 50) + r.fans),
            confianceCoach: borne((joueur.confianceCoach ?? 50) + r.coach),
            pseudo: joueur.pseudo ?? pseudoDe(joueur.nom),
          },
          r.deltas,
        );

        // ⚠️ UN TWEET PEUT COÛTER UNE CARRIÈRE. Le clash, la punchline et le
        // règlement de comptes restent autorisés — c'est le ton du réseau. Mais
        // les propos discriminatoires, les menaces et l'apologie des produits
        // interdits passent en commission de discipline, comme dans la vraie
        // vie (lib/consequences.ts).
        const derapage = lireDerapage(propre);
        let entreeDure: EntreeJournal | null = null;
        let carriereFinie = false;
        let exclusionSociale = false;
        if (derapage) {
          const c = consequenceDuDerapage(derapage);
          const effet = appliquerConsequence(j, c.type, c.motif, c.semaines);
          j = effet.joueur;
          carriereFinie = effet.finale;
          // ⚠️ Un propos discriminatoire, une menace : ce n'est pas une
          // « polémique », c'est un compte qui se vide. La moitié de l'audience
          // part dans la journée — c'est ce qui arrive dans la vraie vie.
          j = { ...j, abonnes: Math.round((j.abonnes ?? 0) * 0.5) };
          entreeDure = {
            id: idUnique(), saison: j.saison, role: 'systeme',
            titre: `${effet.emoji} ${c.titre}`,
            texte: `${effet.texte} La publication est capturée, relayée, et ne disparaîtra jamais. `
              + `La moitié de tes abonnés se désabonnent dans la journée.`,
          };
        } else if (r.sanction) {
          const effet = appliquerSanctionSociale(j, r.sanction);
          j = effet.joueur;
          exclusionSociale = effet.exclusion;
        }

        const notifs: NotifSocial[] = [
          {
            id: idUnique(),
            emoji: r.gainAbonnes >= 0 ? '📈' : '📉',
            titre: r.gainAbonnes >= 0
              ? `+${r.gainAbonnes.toLocaleString('fr-FR')} abonnés`
              : `${r.gainAbonnes.toLocaleString('fr-FR')} abonnés`,
            texte: `Ta publication a été vue ${r.post.vues.toLocaleString('fr-FR')} fois.`
              + (r.desabonnes > 0
                ? ` ${r.desabonnes.toLocaleString('fr-FR')} comptes se sont désabonnés.`
                : ''),
            saison: j.saison,
            semaine: j.semaine ?? 1,
          },
          ...(r.post.reponses ?? []).slice(0, 3).map((rep) => ({
            id: idUnique(),
            emoji: rep.hostile ? '💬' : '❤️',
            titre: `@${rep.pseudo} a répondu`,
            texte: rep.texte,
            saison: j.saison,
            semaine: j.semaine ?? 1,
          })),
          ...(!derapage && r.sanction
            ? [{
                id: idUnique(), emoji: r.sanction.niveau === 'banc' ? '🪑' : '⚠️',
                titre: r.sanction.titre, texte: r.sanction.texte,
                saison: j.saison, semaine: j.semaine ?? 1,
              }]
            : []),
        ];

        set((s) => ({
          joueur: j,
          posts: limiterPosts([r.post, ...s.posts]),
          notifsSocial: [...notifs, ...s.notifsSocial].slice(0, 40),
          journal: [
            ...s.journal,
            ...(!derapage && r.sanction
              ? [{
                  id: idUnique(),
                  saison: j.saison,
                  role: 'systeme' as const,
                  titre: r.sanction.titre,
                  texte: r.sanction.texte,
                  deltas: { argent: -r.sanction.amende },
                }]
              : []),
            ...(entreeDure ? [entreeDure] : []),
          ],
        }));
        get().signalerDefi('post');
        get().verifierSucces();
        // Salir son club en public, c'est le licenciement — et donc un marché
        // à rouvrir dans la seconde (`retrouverUnClub`).
        if (derapage && !carriereFinie
          && consequenceDuDerapage(derapage).type === 'exclusionClub') {
          get().retrouverUnClub();
        }
        if (exclusionSociale) get().retrouverUnClub();
        if (carriereFinie) get().prendreRetraite(
          undefined, motifFinParDefaut(j), entreeDure?.texte,
        );
      },

      // ---- LE FIL DU MONDE, ÉCRIT PAR L'IA ----
      // Clubs, joueurs, journalistes et supporters publient. Sans IA locale, on
      // retombe sur la timeline d'ambiance pré-écrite.
      rafraichirFil: async () => {
        const { joueur, comptesSuivis, modele } = get();
        if (!joueur) return;
        if (!get().iaActivee || !iaDisponible()) {
          const secours = feedAmbiance(joueur, 6);
          set((s) => ({ posts: fusionner(secours, s.posts) }));
          return;
        }

        set({ chargementSocial: true, erreurSocial: null });
        try {
          // De quoi parle-t-on cette semaine ? Des dernières entrées du journal.
          const sujets = get().journal
            .slice(-6)
            .map((e) => e.titre ?? e.texte.slice(0, 60))
            .filter(Boolean) as string[];
          // ⚠️ UN SEUL APPEL PAR SEMAINE (économie de tokens, demande explicite).
          // Il y en avait TROIS : le fil, puis un appel de commentaires pour
          // chacune des deux publications les plus lues. `filIA` rend
          // désormais les commentaires DANS la même réponse. Les publications
          // qu'il n'a pas commentées reçoivent les réactions locales, qui sont
          // gratuites et jamais vides.
          const posts = await filIA({ joueur, modele, suivis: comptesSuivis }, sujets, 6);
          const bassinReac = bassinSocial(joueur, comptesSuivis);
          for (const p of posts) {
            if (!p.reponses?.length) p.reponses = reactionsPour(p, bassinReac, 2);
          }
          set((s) => ({ posts: fusionner(posts, s.posts) }));
          // Les annonces ne sont pas que du texte : on les applique au monde.
          for (const p of posts) get().appliquerAnnonce(p);
        } catch (e) {
          // Une coupure pendant le chargement du modèle ne doit jamais laisser
          // le fil vide : on publie immédiatement la même ambiance locale que
          // lorsque l'IA est désactivée, tout en conservant l'erreur visible.
          const secours = feedAmbiance(joueur, 6);
          set((s) => ({
            erreurSocial: erreurSilencieuse(e) ? null : (e instanceof Error ? e.message : String(e)),
            posts: fusionner(secours, s.posts),
          }));
        } finally {
          set({ chargementSocial: false });
        }
      },

      // ---- UNE ANNONCE DEVIENT UN FAIT ----
      // Un transfert annoncé sur L'Ovale se produit vraiment : le joueur change
      // d'effectif. S'il concerne le joueur humain, ça ne s'impose pas — ça
      // devient une OFFRE, qu'il reste libre de refuser.
      appliquerAnnonce: (post) => {
        const a = post.action;
        const joueur = get().joueur;
        if (!a || !joueur || a.type !== 'transfert') return;
        if (!a.joueur || !a.de || !a.vers || a.de === a.vers) return;
        // Les clubs doivent exister, sinon l'IA a inventé.
        if (!clubParNom(a.de) || !clubParNom(a.vers)) return;
        // Le joueur humain ne se fait pas transférer par un tweet.
        if (normaliserNom(a.joueur) === normaliserNom(joueur.nom)) return;
        if (get().transfertsSociaux.some(
          (t) => normaliserNom(t.nom) === normaliserNom(a.joueur!) && t.saison === joueur.saison,
        )) return;

        const transfert: TransfertAnnonce = {
          nom: a.joueur, de: a.de, vers: a.vers, saison: joueur.saison,
          poste: a.poste, age: a.age, note: a.note,
        };
        const liste = [...get().transfertsSociaux, transfert];
        setTransfertsSociaux(liste);
        set((s) => ({
          transfertsSociaux: liste,
          journal: [
            ...s.journal,
            {
              id: idUnique(),
              saison: joueur.saison,
              role: 'systeme' as const,
              titre: '🔁 Mercato, c’est officiel',
              texte: `${a.joueur} quitte ${a.de} pour ${a.vers}. Le transfert est acté : tu le verras dans les effectifs.`,
            },
          ],
        }));
      },

      // ---- LE FIL SUIT LE CALENDRIER ----
      //
      // ⚠️ Il y avait avant un « battement » toutes les 8 secondes qui faisait
      // tomber un post au hasard pendant qu'on lisait : fil incohérent, mêmes
      // phrases en boucle, dates absurdes. Désormais une SEMAINE JOUÉE = une
      // fournée de publications, datée de cette semaine, déterministe
      // (lib/vie.ts). Appelé par `semaineSuivante`, et par l'écran L'Ovale à
      // l'ouverture pour rattraper les semaines déjà passées.
      vivreSemaineSociale: () => {
        const { joueur, manager, comptesSuivis, relationsSociales, conversations } = get();
        const acteur = joueur ?? (manager?.club ? {
          club: manager.club,
          saison: manager.saison,
          division: manager.division,
          nom: manager.nom,
          semaine: manager.semaine,
        } : null);
        if (!acteur) return;
        const sem = acteur.semaine ?? 1;
        const cle = `${joueur ? 'joueur' : 'manager'}#${acteur.saison}#${sem}`;
        if (get().filSemaine === cle) return; // déjà générée

        // 1. La fournée de la semaine. ⚠️ Le bassin est ÉQUILIBRÉ (clubs,
        // joueurs, presse, supporters) : prendre les 80 premiers comptes de
        // l'annuaire ne donnait que des championnats et des clubs.
        const bassin = bassinSocial(acteur, comptesSuivis);
        const fournee = filDeLaSemaine(acteur, bassin, sem, 8);
        // ⚠️ LES POSTS DÉJÀ EN LIGNE CONTINUENT DE TOURNER. Un tweet ne meurt
        // pas le jour où il est publié : ses vues, ses likes et ses reposts
        // montent encore les semaines suivantes, de moins en moins vite
        // (`vieillirPost`), jusqu'à s'éteindre au bout de six semaines.
        set((s) => ({
          posts: fusionner(
            fournee,
            s.posts.map((p) =>
              p.saison === acteur.saison
                ? { ...p, ...vieillirPost(p, sem - p.semaine) }
                : p,
            ),
          ),
          filSemaine: cle,
        }));

        // 1 bis. UN COÉQUIPIER TE PROPOSE QUELQUE CHOSE. Une semaine sur deux,
        // quelqu'un du vestiaire écrit — barbecue, séance vidéo, padel, visite
        // à l'hôpital. C'est ce qui fait qu'un club est un groupe et pas une
        // liste de noms.
        if (joueur) {
          const rngV = graine(`vestiaire#${cle}#${joueur.club}`);
          const groupe = effectifDuClub(joueur.club, joueur.saison)
            .filter((c) => c.nom !== joueur.nom);
          if (groupe.length && rngV() < 0.5) {
            const co = groupe[Math.floor(rngV() * groupe.length)];
            const pseudo = pseudoStable(co.nom);
            const fil = conversations[pseudo] ?? [];
            if (fil[fil.length - 1]?.de !== 'lui') {
              const texte = invitationCoequipier(`${pseudo}#${cle}`);
              set((s) => ({
                conversations: {
                  ...s.conversations,
                  [pseudo]: [
                    ...(s.conversations[pseudo] ?? []),
                    { id: idUnique(), pseudo, de: 'lui' as const, texte, saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false },
                  ],
                },
                notifsSocial: [
                  {
                    id: idUnique(), emoji: '💬',
                    titre: `${co.nom} t’a écrit`,
                    texte, saison: joueur.saison, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lue: false,
                  },
                  ...s.notifsSocial,
                ].slice(0, 40),
              }));
            }
          }
        }

        // 2. Une fois sur trois, un compte suivi t'écrit dans la semaine.
        if (comptesSuivis.length) {
          const rng = graine(`dm#${cle}#${acteur.club}`);
          if (rng() < 0.34) {
            const compte = comptesSuivis[Math.floor(rng() * comptesSuivis.length)];
            const relation = relationsSociales[compte.pseudo] ?? 0;
            const fil = conversations[compte.pseudo] ?? [];
            // On n'enchaîne pas deux messages sans réponse du joueur.
            if (fil[fil.length - 1]?.de !== 'lui') {
              const texte = messageSpontane(relation, `${compte.pseudo}#${cle}`);
              set((s) => ({
                conversations: {
                  ...s.conversations,
                  [compte.pseudo]: [
                    ...(s.conversations[compte.pseudo] ?? []),
                    { id: idUnique(), pseudo: compte.pseudo, de: 'lui' as const, texte, saison: acteur.saison, semaine: acteur.semaine ?? 1, creeLe: Date.now(), lu: false },
                  ],
                },
                notifsSocial: [
                  {
                    id: idUnique(),
                    emoji: '✉️',
                    titre: `@${compte.pseudo} t’a envoyé un message`,
                  texte, saison: acteur.saison, semaine: acteur.semaine ?? 1, creeLe: Date.now(), lue: false,
                  },
                  ...s.notifsSocial,
                ].slice(0, 40),
              }));
            }
          }
        }
      },

      // ---- RÉPONDRE SOUS UN POST ----
      // Une réponse est publique : l'auteur riposte ET le club peut la voir.
      // Une récidive peut donc coûter une amende, le banc, une suspension ou
      // le contrat — exactement comme une publication autonome.
      repondreAuPost: async (id, texte) => {
        const { joueur, posts } = get();
        const propre = texte.trim().slice(0, LIMITE_CARACTERES);
        if (!joueur || !propre) return;
        const cible = posts.find((p) => p.id === id);
        if (!cible) return;

        const sem = semaine(joueur.semaine ?? 1);
        const rng = graine(`rep#${id}#${propre}`);
        const mienne: PostSocial = {
          id: idUnique(),
          auteur: joueur.profilSocial?.nomAffiche ?? joueur.nom,
          pseudo: joueur.pseudo ?? pseudoDe(joueur.nom),
          avatar: 'moi',
          certifie: estCertifie(joueur),
          texte: propre,
          saison: joueur.saison,
          semaine: joueur.semaine ?? 1,
          date: libelleDate(sem),
          moi: true,
          ...statsDepuisVues(cible.vues * (0.03 + rng() * 0.12), rng),
        };
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, reponses: [...(p.reponses ?? []), mienne] } : p,
          ),
        }));

        // L'auteur du post te répond. Le ton de ton commentaire compte : il fait
        // bouger la relation, exactement comme un message privé.
        if (cible.moi) return; // on ne se répond pas à soi-même
        const avant = get().relationsSociales[cible.pseudo] ?? 0;
        const apres = effetSurRelation(propre, avant);
        set((s) => ({ relationsSociales: { ...s.relationsSociales, [cible.pseudo]: apres } }));

        const compte: CompteSuivi = annuaire(joueur).find((c) => c.pseudo === cible.pseudo) ?? {
          pseudo: cible.pseudo, nom: cible.auteur, avatar: cible.avatar,
          type: (cible.type as CompteSuivi['type']) ?? 'fan', abonnes: 2000,
        };
        const sanction = evaluerEmbrouilleSociale(joueur, propre, {
          canal: 'commentaire', cibleType: compte.type, relation: apres,
          cle: `${id}#${cible.pseudo}`,
        });
        let reponse = '';
        if (get().iaActivee && iaDisponible()) {
          set({ chargementSocial: true, erreurSocial: null });
          try {
            reponse = await messageIA(
              { joueur, modele: get().modele, suivis: get().comptesSuivis },
              compte,
              [{ id: 'ctx', pseudo: cible.pseudo, de: 'lui', texte: cible.texte, saison: joueur.saison }],
              propre, apres,
            );
          } catch (e) {
            // ⚠️ QUOTA / CLÉ / RÉSEAU : ON N'AFFICHE RIEN (demande explicite).
            // Le fil a déjà son contenu pré-écrit ; une bannière rouge ne
            // ferait qu'inquiéter le joueur pour une bascule invisible.
            set({ erreurSocial: erreurSilencieuse(e) ? null : (e as Error).message });
          } finally {
            set({ chargementSocial: false });
          }
        }
        if (!reponse) reponse = reponseLocale(compte, apres, propre);

        const rng2 = graine(`riposte#${id}#${propre}`);
        const sienne: PostSocial = {
          id: idUnique(),
          auteur: cible.auteur,
          pseudo: cible.pseudo,
          avatar: cible.avatar,
          certifie: cible.certifie,
          type: cible.type,
          texte: reponse,
          hostile: tonDuMessage(propre) === 'agressif',
          saison: joueur.saison,
          semaine: joueur.semaine ?? 1,
          date: libelleDate(sem),
          ...statsDepuisVues(cible.vues * (0.05 + rng2() * 0.2), rng2),
        };
        const joueurCourant = get().joueur;
        const effetSanction = sanction && joueurCourant
          ? appliquerSanctionSociale(joueurCourant, sanction)
          : null;
        const libelleSanction = sanction ? sanctionEmbrouilleSociale(joueur, sanction) : null;
        set((s) => ({
          joueur: effetSanction?.joueur ?? s.joueur,
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, reponses: [...(p.reponses ?? []), sienne] } : p,
          ),
          notifsSocial: [
            {
              id: idUnique(), emoji: '💬',
              titre: `@${cible.pseudo} a répondu à ton commentaire`,
              texte: reponse, saison: joueur.saison, semaine: joueur.semaine ?? 1,
            },
            ...(libelleSanction
              ? [{
                  id: idUnique(), emoji: sanction?.niveau === 'banc' ? '🪑' : '⚠️',
                  titre: libelleSanction.titre, texte: libelleSanction.texte,
                  saison: joueur.saison, semaine: joueur.semaine ?? 1,
                }]
              : []),
            ...s.notifsSocial,
          ].slice(0, 40),
          journal: libelleSanction
            ? [...s.journal, {
                id: idUnique(), saison: joueur.saison, role: 'systeme' as const,
                titre: libelleSanction.titre, texte: libelleSanction.texte,
                deltas: sanction?.amende ? { argent: -sanction.amende } : undefined,
              }]
            : s.journal,
        }));
        if (effetSanction?.exclusion) get().retrouverUnClub();
        get().signalerDefi('post');
      },

      // ---- REPOSTER ----
      // Un repost apparaît sur TON profil, avec la mention de qui l'a écrit à
      // l'origine, et fait gagner un peu de portée à l'auteur.
      // ⚠️ REPOSTER EST RÉVERSIBLE — ET LE COMPTEUR AUSSI.
      // L'ancien code ajoutait 4 % de vues à CHAQUE activation et n'en retirait
      // jamais (`Math.max(p.vues, …)`). Reposter / dé-reposter en boucle faisait
      // donc grimper les vues à l'infini — bug signalé en jeu. On mémorise
      // maintenant le bonus exact accordé (`bonusRepost`) pour pouvoir le
      // reprendre au dé-repost : l'opération est parfaitement symétrique.
      reposter: (id) =>
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== id) return p;
            const actif = !p.repostee;
            const bonus = p.bonusRepost ?? Math.round(p.vues * 0.04);
            return {
              ...p,
              repostee: actif,
              bonusRepost: bonus,
              reposts: Math.max(0, p.reposts + (actif ? 1 : -1)),
              vues: Math.max(1, p.vues + (actif ? bonus : -bonus)),
            };
          }),
        })),

      // ---- PROFIL PERSONNALISABLE ----
      majProfilSocial: (profil) =>
        set((s) => (s.joueur
          ? {
              joueur: {
                ...s.joueur,
                pseudo: profil.pseudo?.trim() ? profil.pseudo.replace(/[^A-Za-z0-9_]/g, '').slice(0, 20) : s.joueur.pseudo,
                profilSocial: { ...s.joueur.profilSocial, ...profil },
              },
            }
          : s)),

      // ---- COMPTES À SUIVRE ----
      // ⚠️ PLUS D'APPEL IA ICI (économie de tokens, et exactitude). L'IA
      // inventait des comptes AVEC LEUR NOMBRE D'ABONNÉS : Explorer affichait
      // « 12 000 abonnés » pour un compte qui, ouvert, en annonçait 400 — et
      // souvent un compte qui n'existait nulle part ailleurs dans le jeu.
      // L'annuaire (`lib/comptes.ts`) contient déjà tout le monde : les clubs,
      // les championnats, les 6 306 joueurs réels, la presse et les supporters,
      // chacun avec son audience calibrée sur son étage. C'est gratuit, c'est
      // déterministe, et le chiffre est le même partout.
      chargerSuggestions: async () => {
        const { joueur, comptesSuivis } = get();
        if (!joueur) return;
        set({ suggestionsComptes: suggestionsLocales(joueur, comptesSuivis) });
      },

      suivreCompte: (c) =>
        set((s) => (
          s.comptesSuivis.some((x) => x.pseudo === c.pseudo)
            ? s
            : {
                comptesSuivis: [...s.comptesSuivis, c],
                suggestionsComptes: s.suggestionsComptes.filter((x) => x.pseudo !== c.pseudo),
              }
        )),

      nePlusSuivre: (pseudo) =>
        set((s) => ({ comptesSuivis: s.comptesSuivis.filter((c) => c.pseudo !== pseudo) })),

      // ---- MESSAGES PRIVÉS ----
      // L'IA locale répond à la place du compte, en gardant son caractère.
      envoyerMessage: async (pseudo, texte) => {
        const { joueur, comptesSuivis, conversations, modele, relationsSociales } = get();
        // On peut écrire à n'importe quel compte du monde, pas seulement aux
        // comptes suivis (on ouvre une conversation depuis un profil).
        const compte = comptesSuivis.find((c) => c.pseudo === pseudo)
          ?? (joueur ? annuaire(joueur).find((c) => c.pseudo === pseudo) : undefined);
        if (!joueur || !compte || !texte.trim()) return;

        const mien: MessageDM = {
          id: idUnique(), pseudo, de: 'moi', texte: texte.trim().slice(0, 400), saison: joueur.saison,
          semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: true,
        };
        const fil = [...(conversations[pseudo] ?? []), mien];
        // CE QUE TU DIS COMPTE : le ton du message fait bouger la relation, et
        // c'est cette relation qui décide de la réponse (chaleureuse ou cinglante).
        const avant = relationsSociales[pseudo] ?? 0;
        const apres = effetSurRelation(mien.texte, avant);
        set({
          conversations: { ...conversations, [pseudo]: fil },
          relationsSociales: { ...relationsSociales, [pseudo]: apres },
        });

        // Écrire à un club devient une démarche concrète. On reconnaît le
        // club par son identité réelle, pas uniquement par `type` : certaines
        // anciennes sauvegardes gardent un profil parfaitement visible avec
        // une catégorie obsolète, ce qui expliquait les fils sans réponse.
        const clubContacte = clubDepuisCompte(compte);
        if (clubContacte && clubContacte !== joueur.club) {
          const existante = get().approches.find((a) =>
            a.club === clubContacte && (a.etat === 'ouverte' || a.etat === 'accord'));
          if (existante) {
            const reponse = existante.etat === 'accord'
              ? t('recrut.accord.maintenu', { club: clubContacte })
              : t('recrut.offre.ouverte');
            set((s) => ({
              conversations: {
                ...s.conversations,
                [pseudo]: [
                  ...(s.conversations[pseudo] ?? []),
                  {
                    id: idUnique(), pseudo, de: 'lui' as const, saison: joueur.saison,
                    texte: reponse, semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
                  },
                ],
              },
            }));
            return;
          }

          if (get().susciterApproches(1, true, clubContacte) > 0) return;

          const valeur = cote(joueur);
          const motif = motifRefusClub(joueur, clubContacte);
          set((s) => ({
            dossiersRecrutement: {
              ...s.dossiersRecrutement,
              [pseudo]: {
                pseudo,
                club: clubContacte,
                saisonContact: s.dossiersRecrutement[pseudo]?.saisonContact ?? joueur.saison,
                semaineContact: s.dossiersRecrutement[pseudo]?.semaineContact ?? (joueur.semaine ?? 1),
                coteAuContact: s.dossiersRecrutement[pseudo]?.coteAuContact ?? valeur,
                derniereCoteEtudiee: valeur,
                derniereSaisonEtudiee: joueur.saison,
              },
            },
            conversations: {
              ...s.conversations,
              [pseudo]: [
                ...(s.conversations[pseudo] ?? []),
                {
                  id: idUnique(), pseudo, de: 'lui' as const, saison: joueur.saison,
                  texte: t('recrut.refus.message', { motif }),
                  semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
                },
              ],
            },
          }));
          return;
        }

        let reponse = '';
        if (get().iaActivee && iaDisponible()) {
          set({ chargementSocial: true, erreurSocial: null });
          try {
            reponse = await messageIA(
              { joueur, modele, suivis: comptesSuivis }, compte, fil, mien.texte, apres,
            );
          } catch (e) {
            // ⚠️ QUOTA / CLÉ / RÉSEAU : ON N'AFFICHE RIEN (demande explicite).
            // Le fil a déjà son contenu pré-écrit ; une bannière rouge ne
            // ferait qu'inquiéter le joueur pour une bascule invisible.
            set({ erreurSocial: erreurSilencieuse(e) ? null : (e as Error).message });
          } finally {
            set({ chargementSocial: false });
          }
        }
        if (!reponse) reponse = reponseLocale(compte, apres, mien.texte);
        // Un privé peut être capturé. Les comptes institutionnels répondent par
        // leur propre procédure ; pour les joueurs, supporters et haters, une
        // fuite devient une vraie affaire disciplinaire.
        const sanction = compte.type === 'club' || compte.type === 'competition'
          ? null
          : evaluerEmbrouilleSociale(joueur, mien.texte, {
              canal: 'messagePrive', cibleType: compte.type, relation: apres,
              cle: `${mien.id}#${pseudo}`,
            });
        const joueurCourant = get().joueur;
        const effetSanction = sanction && joueurCourant
          ? appliquerSanctionSociale(joueurCourant, sanction)
          : null;
        const libelleSanction = sanction ? sanctionEmbrouilleSociale(joueur, sanction) : null;
        set((s) => ({
          joueur: effetSanction?.joueur ?? s.joueur,
          conversations: {
            ...s.conversations,
            [pseudo]: [
              ...(s.conversations[pseudo] ?? []),
              {
                id: idUnique(), pseudo, de: 'lui' as const, texte: reponse, saison: joueur.saison,
                semaine: joueur.semaine ?? 1, creeLe: Date.now(), lu: false,
              },
            ],
          },
          notifsSocial: libelleSanction
            ? [{
                id: idUnique(), emoji: sanction?.niveau === 'banc' ? '🪑' : '⚠️',
                titre: libelleSanction.titre, texte: libelleSanction.texte,
                saison: joueur.saison, semaine: joueur.semaine ?? 1,
              }, ...s.notifsSocial].slice(0, 40)
            : s.notifsSocial,
          journal: libelleSanction
            ? [...s.journal, {
                id: idUnique(), saison: joueur.saison, role: 'systeme' as const,
                titre: libelleSanction.titre, texte: libelleSanction.texte,
                deltas: sanction?.amende ? { argent: -sanction.amende } : undefined,
              }]
            : s.journal,
        }));
        if (effetSanction?.exclusion) get().retrouverUnClub();
      },

      aimerPost: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id
              ? { ...p, aime: !p.aime, likes: p.likes + (p.aime ? -1 : 1) }
              : {
                  ...p,
                  reponses: p.reponses?.map((r) =>
                    r.id === id ? { ...r, aime: !r.aime, likes: r.likes + (r.aime ? -1 : 1) } : r,
                  ),
                },
          ),
        })),

      marquerNotifsLues: () =>
        set((s) => ({ notifsSocial: s.notifsSocial.map((n) => ({ ...n, lue: true })) })),

      lireConversation: (pseudo) => set((s) => {
        const fil = s.conversations[pseudo] ?? [];
        if (!fil.some((m) => m.de === 'lui' && !m.lu)) return s;
        return {
          conversations: {
            ...s.conversations,
            [pseudo]: fil.map((m) => m.de === 'lui' ? { ...m, lu: true } : m),
          },
        };
      }),

      // ---- SUCCÈS ----
      // Appelé après chaque action qui fait bouger la carrière. Un succès ne
      // tombe qu'une fois, et rapporte ses Ovas au moment où il tombe.
      verifierSucces: () => {
        const { joueur, manager, posts, pantheon, succesDebloques, coins } = get();
        if (!joueur && !manager) return;
        const nouveaux = joueur
          ? evaluerSucces(
            {
              joueur, posts, abonnes: joueur.abonnes ?? 0, pantheon, coins,
              succesFaits: Object.keys(succesDebloques).length,
            },
            succesDebloques,
          )
          : evaluerSuccesManager(manager!, succesDebloques);
        if (!nouveaux.length) return;
        const gain = nouveaux.reduce((a, s) => a + s.ovas, 0);
        const saisonSucces = joueur?.saison ?? manager!.saison;
        // `semaine` est facultative sur les anciennes sauvegardes joueur.
        // Son absence ne signifie pas qu'une carrière entraîneur existe :
        // l'ancien repli lisait alors `manager.semaine` sur `null` et faisait
        // planter des actions aussi courantes qu'un post ou un transfert.
        const semaineSucces = joueur ? (joueur.semaine ?? 1) : manager!.semaine;
        set((s) => ({
          coins: s.coins + gain,
          succesDebloques: {
            ...s.succesDebloques,
            ...Object.fromEntries(nouveaux.map((n) => [n.id, saisonSucces])),
          },
          notifsSocial: [
            ...nouveaux.map((n) => ({
              id: idUnique(),
              emoji: n.emoji,
              titre: `Succès débloqué : ${n.nom}`,
              texte: n.desc,
              saison: saisonSucces,
              semaine: semaineSucces ?? 1,
            })),
            ...s.notifsSocial,
          ].slice(0, 40),
          journal: [
            ...s.journal,
            ...nouveaux.map((n) => ({
              id: idUnique(),
              saison: saisonSucces,
              role: 'systeme' as const,
              titre: `${n.emoji} Succès : ${n.nom}`,
              texte: n.desc,
            })),
          ],
        }));
      },

      // ---- DÉFIS DE LA SEMAINE ----
      // Le store SIGNALE ce qui vient de se passer ; si un défi de la semaine
      // correspond et n'est pas encore coché, il est validé.
      // ---- LES VRAIES STATS DU MATCH REGARDÉ ----
      // Quand on suit son match en direct, ce n'est plus une estimation : le
      // moteur a compté chaque plaquage, chaque passe, chaque mètre. On les
      // verse dans la saison, et `jouerSemaine` saura ne pas les simuler une
      // deuxième fois (`matchRegarde`).
      enregistrerMatchVecu: (s, contexte) => {
        const { joueur, compteurs } = get();
        if (!joueur) return;
        const inter = situationInternationale(joueur);
        if (inter.indisponibleClub && (!inter.match || inter.role === 'horsGroupe')) return;
        const cle = `${joueur.saison}#${joueur.semaine ?? 1}`;
        if (get().matchRegarde === cle) return; // déjà comptabilisé
        const vecu = joueur.saisonEnCours ?? {
          matchs: 0, titularisations: 0, essais: 0, notes: [], capes: 0, stats: STATS_VIDES,
        };

        // ⚠️ LA PERFORMANCE PAIE TOUT DE SUITE (demande explicite). La note du
        // match fait bouger la forme, le moral, la réputation et la confiance
        // du staff — et, si le match a été gros, un point d'attribut. Le budget
        // de saison (`BUDGET_MATCHS_PAR_SAISON`) empêche d'en faire une machine
        // à progresser : voir `lib/moteur/apresMatch.ts`.
        const budget = Math.max(0, BUDGET_MATCHS_PAR_SAISON - (compteurs.gainsMatchs ?? 0));
        const retour = retourDeMatch(joueur, s, budget, Math.random);

        let j = appliquerDeltas(joueur, retour.deltas);
        j = {
          ...j,
          confianceCoach: Math.max(0, Math.min(100,
            (j.confianceCoach ?? 50) + Math.round((retour.note - 6) * 1.6))),
          saisonEnCours: {
            ...vecu,
            matchs: vecu.matchs + 1,
            // Entré d'entrée de jeu = titularisation. Le moteur donne les vraies
            // minutes : au-delà d'une heure, on était sur la feuille de départ.
            titularisations: vecu.titularisations + (s.minutes >= 55 ? 1 : 0),
            essais: vecu.essais + s.essais,
            capes: vecu.capes + (inter.camp && !inter.camp.u20 && s.minutes > 0 ? 1 : 0),
            notes: [...vecu.notes, retour.note],
            // ⚠️ TOUTE LA FEUILLE EST CUMULÉE. `passesDecisives: 0` et
            // `cartonsRouges: 0` étaient écrits en dur : le joueur humain
            // finissait sa carrière avec zéro passe décisive et zéro carton
            // rouge, quoi qu'il ait fait sur le terrain — et deux succès du jeu
            // ne pouvaient donc pas se débloquer.
            stats: additionnerStats(vecu.stats, {
              points: s.points ?? s.essais * 5 + s.butsReussis * 2,
              butsTentes: s.butsTentes,
              butsReussis: s.butsReussis,
              plaquages: s.plaquages,
              plaquagesManques: s.plaquagesManques,
              grattages: s.grattages,
              passesDecisives: s.passesDecisives ?? 0,
              cartonsRouges: s.cartonsRouges ?? 0,
              cartonsJaunes: Math.max(0, s.cartons - (s.cartonsRouges ?? 0)),
              passes: s.passes,
              offloads: s.offloads ?? 0,
              metres: s.metres,
              franchissements: s.franchissements ?? 0,
              turnovers: s.turnovers ?? 0,
              melees: s.melees ?? 0,
              touchesGagnees: s.touchesGagnees ?? 0,
              pickAndGo: s.pickAndGo ?? 0,
              coupsDePied: 0,
              cinquanteVingtDeux: s.cinquanteVingtDeux ?? 0,
            }),
          },
        };
        if (inter.match && s.minutes > 0) {
          j = ajouterMatchInternational(j, s.essais, s.points ?? s.essais * 5 + s.butsReussis * 2, inter.role === 'titulaire');
          if (contexte) {
            const domicile = inter.match.match.domicile === inter.camp!.nation;
            const match = { ...inter.match.match,
              scoreD: domicile ? contexte.scorePour : contexte.scoreContre,
              scoreE: domicile ? contexte.scoreContre : contexte.scorePour,
            };
            if (inter.match.competition.id === 'coupeDuMonde' && inter.match.journee > 3 && match.scoreD === match.scoreE) {
              if (graine(inter.match.cle + '#prolongation')() < 0.5) match.scoreD += 3; else match.scoreE += 3;
            }
            const p = parcoursInternational(j);
            j = { ...j, international: { ...p, resultats: { ...p.resultats, [inter.match.cle]: match } } };
            enregistrerResultatJoue(inter.match.cle, match);
          }
        }
        if (retour.attribut) {
          j = {
            ...j,
            attributs: {
              ...j.attributs,
              [retour.attribut]: Math.min(99, (j.attributs?.[retour.attribut] ?? 50) + 1),
            },
          };
        }

        // ⚠️ LE CORPS PEUT LÂCHER ICI AUSSI. Le tirage de blessure vivait dans
        // `jouerMatch` (l'estimation) : comme le récit simulé est désormais
        // supprimé quand on a regardé le match, il ne se serait plus jamais
        // produit — regarder ses matchs aurait rendu invulnérable. Le risque est
        // calculé sur les MINUTES RÉELLEMENT jouées.
        const tr = effetsTraits(j.traits);
        const brute = Math.random() < risqueDeBlessure(j, s.minutes, 1) * tr.risqueBlessure
          ? tirerBlessure()
          : null;
        const blessure = brute
          ? { ...brute, semaines: Math.max(1, Math.round(brute.semaines * tr.graviteBlessure)) }
          : null;
        if (blessure) j = appliquerDeltas({ ...j, blessure }, deltasBlessure(blessure));

        const gagne = retour.attribut
          ? ` **+1 ${ATTRIBUTS_LABELS[retour.attribut]}**, le staff a vu ce qu'il voulait voir.`
          : '';
        // ⚠️ UNE SEULE ENTRÉE POUR LE WEEK-END. Le résultat de la rencontre est
        // porté par la feuille de match : `semaineSuivante` n'ajoute plus son
        // récit simulé par-dessus (« tu n'es pas retenu dans le groupe » juste
        // à côté d'une feuille de match à 32 minutes).
        const c = contexte;
        const resultat = !c
          ? ''
          : c.scorePour > c.scoreContre
            ? `Victoire ${c.scorePour}-${c.scoreContre}`
            : c.scorePour < c.scoreContre
              ? `Défaite ${c.scorePour}-${c.scoreContre}`
              : `Match nul ${c.scorePour}-${c.scoreContre}`;
        set((st) => ({
          matchRegarde: cle,
          joueur: j,
          compteurs: {
            ...st.compteurs,
            gainsMatchs: (st.compteurs.gainsMatchs ?? 0) + (retour.attribut ? 1 : 0),
          },
          journal: [...st.journal, {
            id: idUnique(),
            saison: j.saison,
            role: 'systeme' as const,
            titre: c
              ? `📋 ${c.libelle} - ${resultat} ${c.domicile ? 'contre' : 'à'} ${c.adversaire} · ${retour.note}/10`
              : `📋 Feuille de match : ${retour.note}/10`,
            texte: `${retour.texte} ${s.minutes}′ jouées · ${s.plaquages} plaquage${s.plaquages > 1 ? 's' : ''} · `
              + `${Math.round(s.metres)} m portés · ${s.essais} essai${s.essais > 1 ? 's' : ''}.${gagne}`
              + (blessure ? ` 🚑 ${messageBlessure(blessure)}` : ''),
            deltas: retour.deltas,
          }],
        }));
        if (s.essais > 0) get().signalerDefi('essai');
        if (s.plaquages >= 8) get().signalerDefi('plaquages');
        if (s.butsReussis > 0) get().signalerDefi('transformation');
        if (retour.note >= 7) get().signalerDefi('note7');
        if (retour.note >= 8) get().signalerDefi('note8');
        if (contexte && contexte.scorePour > contexte.scoreContre) get().signalerDefi('victoire');
        get().signalerDefi('match');
        // ⚠️ UNE BLESSURE DE FIN DE CARRIÈRE DOIT VRAIMENT L'ARRÊTER.
        if (blessure?.gravite === 'carriere') get().raccrocherSurBlessure();
      },

      // ═══ LE CORPS A DIT NON ═════════════════════════════════════════════
      // ⚠️ BUG CORRIGÉ. `tirerBlessure()` peut sortir une blessure de gravité
      // `carriere` (2 % des blessures) — « les médecins sont unanimes : tu ne
      // rejoueras plus ». Le message tombait au journal… et le jeu continuait :
      // 99 semaines d'infirmerie, aucun match, aucun entraînement (`entrainer`
      // refuse quand on est blessé), la générale qui s'effondre saison après
      // saison, et rien pour en sortir. Le joueur restait donc coincé DEUX ANS
      // devant un bouton « semaine suivante » qui ne racontait que des soins.
      //
      // La voie du Maître du Jeu, elle, était correcte depuis le début
      // (`appliquerConsequence` → `finale: true` → retraite) : c'est le tirage
      // du terrain qui n'avait jamais été branché. Il l'est ici.
      raccrocherSurBlessure: () => {
        const joueur = get().joueur;
        if (!joueur || joueur.blessure?.gravite !== 'carriere') return;
        set((s) => ({
          journal: [...s.journal, {
            id: idUnique(),
            saison: joueur.saison,
            role: 'mj' as const,
            titre: '🛑 Carrière terminée',
            texte: `${joueur.blessure?.nom}. Les examens sont sans appel : tu ne rejoueras plus. `
              + `À ${joueur.age} ans, il faut raccrocher, et choisir ce que tu fais de la suite.`,
          }],
        }));
        get().prendreRetraite(undefined, 'blessure', joueur.blessure?.nom);
      },

      // ═══ LA COMMISSION DE DISCIPLINE ════════════════════════════════════
      // ⚠️ LE CARTON COÛTAIT DIX MINUTES ET RIEN D'AUTRE. Le moteur distribuait
      // des rouges depuis longtemps ; ils finissaient dans une colonne de
      // statistiques, et le joueur rejouait le week-end suivant comme si de
      // rien n'était. Ce chemin-là est le pendant de `appliquerConsequence` du
      // côté du terrain : ce qu'on fait sur le pré se paie dans la carrière.
      //
      // ⚠️ ON NE CUMULE PAS DEUX INDISPONIBILITÉS. `Joueur.blessure` est un
      // champ unique — il porte aussi bien un ligament croisé qu'une suspension
      // (voir `lib/consequences.ts`). Une main cassée à la 30ᵉ ET quinze
      // semaines de suspension, ce n'est pas vingt et une semaines d'absence :
      // c'est la plus longue des deux, l'autre se soignant pendant.
      appliquerSanctionMatch: (sanction) => {
        const joueur = get().joueur;
        if (!joueur) return;
        const { citation, blessure, rouges } = sanction;
        if (!citation && !blessure && rouges === 0) return;

        let j = joueur;
        const entrees: { titre: string; texte: string }[] = [];

        // 1. La blessure de bagarre, d'abord : la suspension pourra l'écraser.
        if (blessure) {
          const gravite: Blessure['gravite'] = blessure.semaines <= 3 ? 'legere'
            : blessure.semaines <= 10 ? 'moyenne' : 'saison';
          const b: Blessure = { nom: blessure.nom, gravite, semaines: blessure.semaines };
          j = appliquerDeltas({ ...j, blessure: b }, deltasBlessure(b));
          entrees.push({
            titre: `🚑 ${blessure.nom}`,
            texte: `Ramassée dans la bagarre. ${blessure.semaines} semaine${blessure.semaines > 1 ? 's' : ''} d’indisponibilité : `
              + 'et une facture que personne n’avait prévue au budget.',
          });
        }

        // 2. Un rouge sans citation coûte quand même la confiance du staff : on
        //    ne finit pas un match à quatorze impunément.
        if (rouges > 0 && !citation) {
          j = {
            ...j,
            confianceCoach: Math.max(0, Math.min(100, (j.confianceCoach ?? 50) - 10)),
            moral: Math.max(0, Math.min(100, j.moral - 6)),
          };
          entrees.push({
            titre: '🟥 Carton rouge',
            texte: 'Tu as laissé les tiens à quatorze. La commission n’a pas donné suite, '
              + 'mais le staff, lui, a très bien retenu.',
          });
        }

        // 3. La suspension. `appliquerConsequence` fait tout le reste — moral,
        //    réputation, confiance du staff — exactement comme pour une issue
        //    du Maître du Jeu.
        if (citation) {
          const restant = j.blessure && j.blessure.gravite !== 'carriere' ? j.blessure.semaines : 0;
          const effet = appliquerConsequence(j, 'suspension', citation.motif, citation.semaines);
          j = effet.joueur;
          // La blessure éventuelle se soigne PENDANT la suspension : on garde
          // la plus longue des deux indisponibilités, pas leur somme.
          if (restant > citation.semaines && j.blessure) {
            j = { ...j, blessure: { ...j.blessure, semaines: restant } };
          }
          entrees.push({ titre: `${effet.emoji} ${effet.titre}`, texte: effet.texte });
        }

        set((s) => ({
          joueur: j,
          journal: [...s.journal, ...entrees.map((entree) => ({
            id: idUnique(),
            saison: j.saison,
            role: 'systeme' as const,
            titre: entree.titre,
            texte: entree.texte,
          }))],
        }));
      },

      // ---- SIMULATION DE FOND DE LA JOURNÉE ----
      // Toutes les affiches de la poule sont rejouées par le MÊME moteur que le
      // match qu'on regarde, mais sans aucun rendu. Comme la graine est celle du
      // championnat, le match suivi en direct et celui rejoué ici sont
      // rigoureusement identiques : rien n'est compté deux fois.
      simulerStatsJournee: (semaineJouee) => {
        const fiche = get().joueur;
        const division = fiche?.division;
        if (!fiche || !division) return Promise.resolve();
        // ⚠️ ON TRAVAILLE SUR LA SEMAINE JOUÉE, PAS SUR CELLE DE LA FICHE.
        //
        // Deux bugs signalés en jeu n'en faisaient qu'un : « on a plus de matchs
        // que le maximum possible » et « on voit les stats de la journée avant
        // de l'avoir jouée ». `semaineSuivante` incrémente `joueur.semaine`
        // AVANT d'appeler cette fonction, et `matchDeLaSemaine` rend l'affiche
        // de la semaine qu'on lui donne : on rejouait donc systématiquement la
        // journée N+1. Le classement individuel avait une journée d'avance sur
        // le championnat, d'où des joueurs à sept matchs quand six journées
        // seulement avaient été disputées.
        //
        // Le repli sur `joueur.semaine` ne sert qu'aux appels hors boucle de
        // jeu (scripts, rattrapage manuel), où la fiche n'a pas été avancée.
        const numeroJoue = semaineJouee ?? fiche.semaine ?? 1;
        const joueur = { ...fiche, semaine: numeroJoue };
        fileStatsReelles = fileStatsReelles.catch(() => {}).then(async () => {
          // Les saisons précédentes n'alimentent plus l'écran courant. Les
          // ignorer évite qu'une avance très rapide laisse des simulations
          // obsolètes tourner plusieurs minutes après l'arrivée.
          const actuel = get().joueur;
          if (!actuel || actuel.saison !== fiche.saison || actuel.club !== fiche.club) return;
          await new Promise<void>((resoudre) => setTimeout(resoudre, 0));
          const sem = semaine(numeroJoue);
        // ⚠️ LE MOTEUR EST CHARGÉ ICI, PAS AU DÉMARRAGE. C'est le seul endroit
        // du store qui en a besoin : le sortir du chunk principal enlève
        // 3 500 lignes du premier chargement, pour un import qui arrive bien
        // avant que la simulation ne soit visible.
          const { cumuler, simulerJournee, simulerJourneeCoupe, simulerJourneeInternationale }
            = await import('../lib/moteur/saison');
          const avatar = {
            club: joueur.club, nom: joueur.nom, poste: joueur.poste,
            attributs: joueur.attributs,
          };
          const inter = situationInternationale(joueur);
          if (inter.match && inter.camp) {
            const f = inter.match;
            const cleI = f.competition.id + '#' + joueur.saison;
            if ((get().journeesReelles[cleI] ?? 0) < f.journee) {
              const lignes = simulerJourneeInternationale(f.competition.id, joueur.saison, f.journee,
                inter.role === 'horsGroupe' ? undefined : { ...avatar, club: inter.camp.nation, titulaire: inter.role === 'titulaire' });
              set((st) => ({
                statsReelles: { ...st.statsReelles, [cleI]: cumuler(st.statsReelles[cleI] ?? {}, lignes) },
                journeesReelles: { ...st.journeesReelles, [cleI]: f.journee },
              }));
            }
          }

        // ⚠️ UNE SEMAINE EUROPÉENNE OU INTERNATIONALE A AUSSI SES STATISTIQUES.
        // Elles n'existaient pas : le joueur était le seul de la compétition à
        // avoir des chiffres après un match de coupe ou de sélection.
          if (sem.type === 'coupe' && !estAmateur(division)) {
          const coupes = coupesDuClub(joueur.club, joueur.saison);
          if (!coupes.length) return;
          const journee = passeesDuType(numeroJoue, 'coupe') + 1;
          const cleC = `${coupes[0]}#${joueur.saison}`;
          if ((get().journeesReelles[cleC] ?? 0) >= journee) return;
          const lignesC = simulerJourneeCoupe(coupes[0], joueur.saison, journee, joueur.club, inter.indisponibleClub ? undefined : {
            ...avatar, titulaire: estTitulaire(joueur, `${coupes[0]}#${joueur.saison}#${journee}`),
          });
          set((s) => ({
            statsReelles: { ...s.statsReelles, [cleC]: cumuler(s.statsReelles[cleC] ?? {}, lignesC) },
            journeesReelles: { ...s.journeesReelles, [cleC]: journee },
          }));
            return;
          }


          const affiche = matchDeLaSemaine(joueur, bonusClubDuJoueur(joueur));
          if (!affiche) return; // pas de journée cette semaine
          const cle = `${division}#${joueur.saison}`;
          const dejaFaites = get().journeesReelles[cle] ?? 0;
          if (dejaFaites >= affiche.journee) return; // journée déjà simulée

        // ⚠️ ON RATTRAPE LES JOURNÉES MANQUANTES, ON NE SAUTE PLUS À LA
        // DERNIÈRE. Depuis qu'on peut avancer de plusieurs semaines d'un coup
        // (`avancerJusqua`), cette fonction est appelée une fois par semaine
        // mais ne s'EXÉCUTE qu'après la boucle — donc toutes les invocations
        // lisent la même semaine d'arrivée, et une seule journée était rejouée.
        // Le compteur `journeesReelles` sautait alors à J18 avec les
        // statistiques d'UNE journée : le classement des marqueurs affichait
        // « 2 essais » en tête au mois de mars.
        //
        // ⚠️ ET ON BORNE, EN LE DISANT. Rejouer une journée coûte ~0,9 s (huit
        // matchs par le moteur complet). Au-delà de `MAX_RATTRAPAGE`, on prend
        // les plus récentes et on écrit dans la console ce qui a été laissé de
        // côté — un plafond silencieux se lit « tout est couvert » alors que
        // non.
        // ⚠️ RELEVÉ DE 6 À 12 APRÈS RETOUR DE JEU (« des fois il perd des
        // stats »). Depuis que l'avance par le calendrier est LE moyen d'aller
        // vite, sauter dix journées est courant : borner à 6 laissait des trous
        // systématiques. Douze journées couvrent un saut d'une demi-saison.
          const MAX_RATTRAPAGE = 12;
          const premiere = Math.max(dejaFaites + 1, affiche.journee - MAX_RATTRAPAGE + 1);
          if (premiere > dejaFaites + 1) {
            console.info(
              `[stats] journées ${dejaFaites + 1} à ${premiere - 1} non rejouées `
              + `(rattrapage borné à ${MAX_RATTRAPAGE} journées).`,
            );
          }

          const poules = poulesDe(division);
          const numeroPoule = poules.length > 1
            ? Math.max(0, indexPoule(division, joueur.club)) : undefined;
          for (let journee = premiere; journee <= affiche.journee; journee++) {
          // ⚠️ ON REND LA MAIN ENTRE DEUX JOURNÉES. Rejouer une journée, c'est
          // huit matchs par le moteur complet : ~0,9 s de JavaScript synchrone.
          // Douze d'affilée, et l'onglet se fige dix secondes sans rien
          // afficher. Un `setTimeout(0)` laisse React peindre entre chaque : le
          // classement se remplit sous les yeux du joueur au lieu de le geler.
          if (journee > premiere) await new Promise((r) => setTimeout(r, 0));
          // ⚠️ La clé du match de CETTE journée-là, pas celle de la semaine en
          // cours : c'est elle qui décide de la titularisation, et c'est ce qui
          // garantit qu'un match rejoué ici est identique à celui du direct.
          const cleMatch = journee === affiche.journee
            ? affiche.cle
            : `${division}#${joueur.saison}#${journee}`;
          const lignes = simulerJournee(
            division, joueur.saison, journee, joueur.club,
            bonusClubDuJoueur(joueur), numeroPoule,
            inter.indisponibleClub ? undefined : {
              club: joueur.club, nom: joueur.nom, poste: joueur.poste,
              attributs: joueur.attributs,
              // Même décision que dans le direct : le match rejoué est le même.
              titulaire: estTitulaire(joueur, cleMatch),
            },
          );
            set((s) => ({
            // ⚠️ On ne garde que la saison EN COURS : accumuler tout l'historique
            // ferait exploser le quota du localStorage. La coupe et la sélection
            // ont chacune leur clé, elles cohabitent avec le championnat.
            statsReelles: { ...s.statsReelles, [cle]: cumuler(s.statsReelles[cle] ?? {}, lignes) },
            journeesReelles: { ...s.journeesReelles, [cle]: journee },
            }));
          }
        });
        return fileStatsReelles;
      },

      signalerDefi: (evenement) => {
        const { joueur, defis } = get();
        if (!joueur) return;
        const cle = cleSemaine(joueur.saison, joueur.semaine ?? 1);
        const actifs = defisDeLaSemaine(joueur.saison, joueur.semaine ?? 1);
        const courant = defis.cle === cle ? defis : { cle, faits: [] };
        if (courant.faits.includes(evenement)) return;
        if (!actifs.some((d) => d.id === evenement)) {
          // Rien à valider, mais on garde la semaine courante en mémoire.
          if (defis.cle !== cle) set({ defis: courant });
          return;
        }
        const defi = DEFI_PAR_ID[evenement];
        // ⚠️ LE PLAFOND DE SAISON. Le défi est validé et notifié quoi qu'il
        // arrive — c'est un objectif de semaine — mais il ne verse plus rien une
        // fois `PLAFOND_OVAS_DEFIS_PAR_SAISON` atteint. Sans ça, les défis
        // rapportaient à eux seuls six fois le reste du jeu (voir la constante).
        const dejaVerse = get().compteurs.ovasDefis ?? 0;
        const verse = Math.max(0, Math.min(defi?.ovas ?? 1, PLAFOND_OVAS_DEFIS_PAR_SAISON - dejaVerse));
        set((s) => ({
          defis: { cle, faits: [...courant.faits, evenement] },
          coins: s.coins + verse,
          compteurs: { ...s.compteurs, ovasDefis: (s.compteurs.ovasDefis ?? 0) + verse },
          notifsSocial: [
            {
              id: idUnique(),
              emoji: defi?.emoji ?? '🎯',
              titre: 'Défi de la semaine relevé',
              texte: defi?.texte ?? '',
              saison: joueur.saison,
              semaine: joueur.semaine ?? 1,
            },
            ...s.notifsSocial,
          ].slice(0, 40),
        }));
      },

      acheterSkin: (id) => {
        const { coins, inventaire } = get();
        const skin = SKIN_PAR_ID[id];
        if (!skin || inventaire.includes(id) || coins < skin.prix) return false;
        set({
          coins: coins - skin.prix,
          inventaire: [...inventaire, id],
          skinActif: id,
        });
        return true;
      },

      acheterPackCollectionSolo: (prix, tirer) => {
        const { coins, collectionSolo } = get();
        if (!Number.isSafeInteger(prix) || prix < 0 || coins < prix) return null;
        const resultat = tirer(collectionSolo);
        if (!resultat.indices.length) return null;
        set({ coins: coins - prix, collectionSolo: resultat.etat });
        return resultat;
      },

      choisirSkin: (id) => {
        if (get().inventaire.includes(id)) set({ skinActif: id });
      },

      // ---- LE VESTIAIRE ----
      // ⚠️ PUREMENT COSMÉTIQUE. Un article d'équipement ne touche à AUCUN
      // attribut, ni à la forme, ni au moral, ni au potentiel : c'est la règle
      // qui a fait supprimer les boosts, et l'étalonnage de difficulté
      // (`scripts/verifDifficulte.ts`) n'a donc pas à être relancé.
      // ⚠️ MÊME GARDE-FOU QUE POUR LES COSMÉTIQUES : on vérifie que le trait
      // EXISTE, qu'il est bien payant, qu'on ne l'a pas déjà, et que le solde
      // suffit. Sans le test « il est bien payant », un appel forgé
      // débloquerait un trait de base et le ferait disparaître de la liste
      // gratuite au profit de la liste achetée.
      debloquerTrait: (id) => {
        const { coins, traitsDebloques } = get();
        const trait = TRAIT_PAR_ID[id];
        if (!trait || trait.prix == null || traitsDebloques.includes(id)) return false;
        if (coins < trait.prix) return false;
        set({ coins: coins - trait.prix, traitsDebloques: [...traitsDebloques, id] });
        return true;
      },

      acheterEquipement: (id) => {
        const { coins, equipements } = get();
        const article = EQUIPEMENT_PAR_ID[id];
        if (!article || equipements.includes(id) || coins < article.prix) return false;
        // ⚠️ UN ARTICLE « PAR PUB » NE S'ACHÈTE PAS, MÊME À 0 OVA. Sans cette
        // ligne, `coins < 0` étant toujours faux, n'importe quel clic sur une
        // carte l'aurait débloqué gratuitement — la porte de la pub servait
        // alors de décoration.
        if (article.parPub) return false;
        set((s) => ({
          coins: s.coins - article.prix,
          equipements: [...s.equipements, id],
          // On l'enfile tout de suite : personne n'achète des crampons pour les
          // laisser dans le sac.
          equipementActif: { ...s.equipementActif, [article.categorie]: id },
        }));
        return true;
      },

      /**
       * Débloque un cosmétique « par pub », APRÈS que la pub a été regardée.
       *
       * ⚠️ ELLE CONSOMME UN PASSAGE QUOTIDIEN, exactement comme la pub qui
       * rapporte des Ovas (`encaisserPub`) : deux par jour, quinze minutes
       * d'écart. Sans ça, on débloquerait les quatre articles d'affilée en une
       * minute et la contrainte n'existerait plus. C'est aussi ce qui garantit
       * qu'on ne peut pas boucler la boutique en une soirée de visionnage.
       */
      debloquerParPub: (id) => {
        const { equipements, pubs } = get();
        const article = EQUIPEMENT_PAR_ID[id];
        if (!article?.parPub || equipements.includes(id)) return false;
        const etat = etatDuJour(pubs);
        if (!pubDisponible(etat).possible) return false;
        set((s) => ({
          equipements: [...s.equipements, id],
          equipementActif: { ...s.equipementActif, [article.categorie]: id },
          pubs: { ...etat, vues: etat.vues + 1, derniere: Date.now() },
        }));
        return true;
      },

      // ---- PUBLICITÉ ----
      // ⚠️ RIEN NE SE CHARGE AVANT CE CHOIX. Tant que le consentement vaut
      // « inconnu », aucun script de régie n'est injecté et aucun emplacement
      // n'est rendu (voir `lib/pub.ts`). Un refus est définitif et respecté :
      // le jeu ne redemande pas à chaque écran.
      setPubConsentement: (choix) => set({ pubConsentement: choix }),
      setTutoVu: (vu) => set({ tutoVu: vu }),
      setTutoMatchVu: (vu) => set({ tutoMatchVu: vu }),

      // ⚠️ `setToucheMatch` ET `reinitialiserTouchesMatch` ONT ÉTÉ SUPPRIMÉS
      // avec le pilotage : le match ne se joue plus qu'aux cartes de décision,
      // il n'y a plus une seule touche à assigner. Les sauvegardes qui portent
      // encore un `touchesMatch` le gardent en base sans que rien ne le lise —
      // `partialize` ne le réécrit plus, il s'éteindra de lui-même.

      /**
       * ⚠️ ELLE RAPPORTE DES OVAS, ET RIEN D'AUTRE. Pas un point d'attribut,
       * pas un point de forme : les Ovas n'achètent que du cosmétique, donc
       * regarder des pubs ne peut pas déplacer l'étalonnage de difficulté
       * (`scripts/verifDifficulte.ts`). C'est la condition pour que la
       * monétisation ne « nuise pas au jeu ».
       *
       * ⚠️ ET ELLE VÉRIFIE LE QUOTA CÔTÉ STORE, pas seulement dans le bouton :
       * l'appel est le seul point de crédit, il doit tenir tout seul.
       */
      encaisserPub: () => {
        const etat = etatDuJour(get().pubs);
        if (!pubDisponible(etat).possible) return 0;
        set((s) => ({
          coins: s.coins + OVAS_PAR_PUB,
          pubs: { ...etat, vues: etat.vues + 1, derniere: Date.now() },
        }));
        return OVAS_PAR_PUB;
      },

      /** Équipe l'article, ou le retire s'il est déjà porté. */
      basculerEquipement: (id) => {
        const article = EQUIPEMENT_PAR_ID[id];
        if (!article || !get().equipements.includes(id)) return;
        set((s) => ({
          equipementActif: {
            ...s.equipementActif,
            [article.categorie]: s.equipementActif[article.categorie] === id ? undefined : id,
          },
        }));
      },

    }),
    {
      name: 'destin-ovalie',
      version: 29,
      storage: stockageJeu,
      // Sauvegardes d'avant les 15 postes : le poste stocké est une famille
      // (« pilier »), on lui attribue un numéro de maillot.
      // ⚠️ Version 3 : on RÉPARE aussi les données abîmées (poste inconnu,
      // nation vide, champs manquants). Une seule légende mal formée suffisait
      // à laisser le Hall et le Classement sur un écran blanc.
      migrate: (etat: unknown, version: number) => {
        const s = etat as {
          joueur?: Joueur | null;
          pantheon?: LegendeSauvegardee[];
          posts?: PostSocial[];
          filSemaine?: string;
          matchRegarde?: string;
          statsReelles?: Record<string, Record<string, LigneReelle>>;
          journeesReelles?: Record<string, number>;
          journal?: EntreeJournal[];
          notifsSocial?: NotifSocial[];
          approches?: Approche[];
          dossiersRecrutement?: Record<string, DossierRecrutementClub>;
          succesDebloques?: SuccesDebloques;
          defis?: { cle: string; faits: string[] };
          comptesSuivis?: CompteSuivi[];
          conversations?: Record<string, MessageDM[]>;
          transfertsSociaux?: TransfertAnnonce[];
          relationsSociales?: Record<string, number>;
          evenementHebdo?: EvenementHebdo | null;
          evenementsVus?: string[];
          iaLocaleActivee?: boolean;
          iaActivee?: boolean;
          equipements?: string[];
          equipementActif?: Partial<Record<CategorieEquipement, string>>;
          tutoVu?: boolean;
          tutoMatchVu?: boolean;
          traitsDebloques?: string[];
          cleClassement?: string;
          pseudoClassement?: string;
          rangMondialId?: number | null;
          dernierScoreEnvoye?: number;
          ecransVus?: string[];
          guideFerme?: boolean;
          pubConsentement?: 'inconnu' | 'oui' | 'non';
          pubs?: EtatPubs;
          modele?: string;
          groqKey?: string;
          langue?: Langue;
          langueManuelle?: boolean;
          rythme?: unknown;
          manager?: Manager | null;
          mouvementsClubs?: Record<string, string>;
          collectionSolo?: EtatCollectionSolo;
        };
        if (!s) return s;
        s.collectionSolo = s.collectionSolo
          ? normaliserCollectionSolo(s.collectionSolo)
          : chargerAncienneCollectionSolo();
        // ⚠️ VERSION 27 — LES ANCIENS AVATARS EXTERNES SONT RÉÉCRITS EN LOCAL.
        // `photoDe` pointait sur `randomuser.me`, un service qui ne répond plus :
        // chaque compte sans portrait officiel tombait donc sur le monogramme de
        // repli, et sur un réseau social ça se voit tout de suite (« les joueurs
        // n'ont pas de photo de profil sur X »). Le code a été corrigé et sert
        // désormais `public/photos/`, mais les URL mortes sont PERSISTÉES dans
        // les posts, les comptes suivis et les conversations : sans cette
        // réécriture, une partie en cours garderait ses trous pour toujours.
        //
        // On ne touche qu'aux `photo:http…` : un `photo:/photos/…` local, un
        // `club:`, un `compet:`, un `initiales:` ou `moi` sont déjà justes.
        if (version < 27) {
          const localiser = (avatar: unknown, nom: string): string => {
            if (typeof avatar !== 'string') return avatarPourCompte(nom, 'joueur');
            if (!avatar.startsWith('photo:initiales:') && !(avatar.startsWith('photo:') && avatar.includes('randomuser.me/'))) return avatar;
            return avatarPourCompte(nom, 'joueur');
          };
          if (Array.isArray(s.posts)) {
            s.posts = s.posts.map((p) => (p && typeof p === 'object'
              ? { ...p, avatar: localiser((p as { avatar?: unknown }).avatar, String((p as { auteur?: string }).auteur ?? '')) }
              : p));
          }
          if (Array.isArray(s.comptesSuivis)) {
            s.comptesSuivis = s.comptesSuivis.map((c) => (c && typeof c === 'object'
              ? { ...c, avatar: localiser((c as { avatar?: unknown }).avatar, String((c as { nom?: string }).nom ?? '')) }
              : c));
          }
          if (Array.isArray(s.notifsSocial)) {
            s.notifsSocial = s.notifsSocial.map((n) => (n && typeof n === 'object' && 'avatar' in n
              ? { ...n, avatar: localiser((n as { avatar?: unknown }).avatar, String((n as { auteur?: string }).auteur ?? '')) }
              : n));
          }
        }
        if (version < 25) {
          if (s.joueur) {
            s.joueur.semaine = migrerSemaineCalendrier(s.joueur.semaine ?? 1);
            if (s.joueur.entrainementSemaine) s.joueur.entrainementSemaine = migrerSemaineCalendrier(s.joueur.entrainementSemaine);
          }
          if (s.manager) {
            s.manager.semaine = migrerSemaineCalendrier(s.manager.semaine);
            for (const r of Object.values(s.manager.resultats ?? {})) r.semaine = migrerSemaineCalendrier(r.semaine);
            if (s.manager.avancee) s.manager.avancee.convocations = [];
          }
          if (s.matchRegarde) {
            const [saison, numero] = s.matchRegarde.split('#');
            s.matchRegarde = saison + '#' + migrerSemaineCalendrier(Number(numero));
          }
        }
        if (version < 2 && s.joueur) {
          s.joueur = { ...s.joueur, poste: migrerPoste(s.joueur.poste as string) };
        }
        if (s.joueur) {
          s.joueur = {
            ...s.joueur,
            // ⚠️ VERSION 10 — LA LISTE DES CLUBS TRAVERSÉS N'EXISTAIT PAS. On ne
            // peut pas la reconstituer (le jeu ne gardait aucune trace des
            // transferts passés) : on repart du club actuel, et elle s'allonge
            // à la prochaine signature.
            clubs: s.joueur.clubs?.length ? s.joueur.clubs : [s.joueur.club],
            poste: migrerPoste(s.joueur.poste as string),
            nation: s.joueur.nation ?? 'France',
            titres: s.joueur.titres ?? [],
            // ⚠️ PALMARÈS RECONSTRUIT POUR LES VIEILLES SAUVEGARDES.
            // Les succès de palmarès lisent `Joueur.palmares`, qui n'existait
            // pas : sans ça, une carrière déjà titrée n'aurait rien débloqué.
            // On le rebâtit depuis les libellés (« Bouclier de Brennus (S4) »).
            // ⚠️ Le CLUB reste inconnu — il n'a jamais été enregistré : les
            // succès « champion avec deux clubs » ne comptent donc que les
            // titres gagnés à partir de maintenant. C'est volontaire : mieux
            // vaut ne rien débloquer que de débloquer sur une donnée inventée.
            palmares: s.joueur.palmares ?? palmaresDepuisLibelles(s.joueur.titres ?? []),
          };
        }
        s.pantheon = (s.pantheon ?? []).map((l) => ({
          ...l,
          poste: migrerPoste(l.poste as string),
          nation: l.nation ?? '',
          titres: l.titres ?? [],
          score: Number.isFinite(l.score) ? l.score : 0,
          note: Number.isFinite(l.note) ? l.note : 0,
        }));
        // Lot 7 : champs qui n'existaient pas avant.
        s.posts ??= [];
        s.filSemaine ??= '';
        s.matchRegarde ??= '';
        s.statsReelles ??= {};
        s.journeesReelles ??= {};
        // Migration anti « quota exceeded » : les anciennes sauvegardes
        // empilaient les feuilles de matchs de toutes les saisons. On ne garde
        // que la saison en cours, plus un historique de lecture raisonnable.
        const saisonCourante = s.joueur?.saison;
        if (saisonCourante) {
          const suffixe = `#${saisonCourante}`;
          s.statsReelles = Object.fromEntries(Object.entries(s.statsReelles)
            .filter(([cle]) => cle.endsWith(suffixe)));
          s.journeesReelles = Object.fromEntries(Object.entries(s.journeesReelles)
            .filter(([cle]) => cle.endsWith(suffixe)));
        }
        s.journal = (s.journal ?? []).slice(-160);
        s.posts = (s.posts ?? []).slice(-120);
        s.notifsSocial = (s.notifsSocial ?? []).slice(0, 40);
        s.conversations = Object.fromEntries(Object.entries(s.conversations ?? {})
          .map(([pseudo, fil]) => [pseudo, fil.slice(-40)]));
        s.notifsSocial ??= [];
        s.comptesSuivis ??= [];
        s.conversations ??= {};
        s.transfertsSociaux ??= [];
        s.relationsSociales ??= {};
        s.succesDebloques ??= {};
        s.defis ??= { cle: '', faits: [] };
        // Le récit hebdomadaire : absent des sauvegardes d'avant.
        s.evenementHebdo ??= null;
        s.evenementsVus ??= [];
        // ⚠️ LE MARCHÉ A CHANGÉ DE FORME. Une sauvegarde d'avant porte `offres`
        // et `offresOuvertes` ; ces champs n'existent plus. On repart d'une
        // liste d'approches vide : les offres en cours sont perdues, mais la
        // fin de saison en régénère aussitôt — c'est mieux que de convertir des
        // cartes en négociations qui n'ont jamais eu lieu.
        s.approches ??= [];
        // VERSION 16 — un refus de club devient un vrai suivi de recrutement,
        // conservé entre les sessions puis réétudié avec la progression.
        s.dossiersRecrutement ??= {};
        // VERSION 15 — une approche persistée sans son fil créait une vignette
        // « offre » sur la carrière, mais aucun interlocuteur dans L'Ovale.
        // On reconstruit uniquement le message d'ouverture manquant ; les fils
        // existants et toutes les décisions du joueur restent intacts.
        if (version < 15) {
          s.conversations = assurerConversationsApproches(s.joueur, s.approches, s.conversations);
        }
        // Versions 6 et 7 : l'IA a vécu un temps dans le navigateur (WebLLM),
        // avec un modèle de 900 Mo téléchargé en arrière-plan. La version 9
        // ci-dessous referme cette parenthèse — on ne migre donc plus rien ici.
        // Version 8 : l'ancien compteur d'identifiants repartait de zéro à
        // chaque rechargement et recréait `e1-20`, `e2-27`… déjà présents
        // dans le journal persisté. React pouvait alors masquer ou dupliquer
        // des messages. On assainit une fois les anciennes sauvegardes ; les
        // nouveaux identifiants portent désormais un préfixe propre à la session.
        if (version < 8) {
          s.journal = (s.journal ?? []).map((entree, index) => ({
            ...entree,
            id: `m8-${index}-${entree.saison}`,
          }));
        }
        // ⚠️ VERSION 9 — RETOUR À UNE IA DISTANTE (Groq). Le modèle embarqué
        // est parti avec sa dépendance : `modele` désignait un fichier WebLLM
        // (« Llama-3.2-1B-Instruct-q4f16_1-MLC ») qui n'existe plus, et le
        // laisser en place enverrait un nom de modèle inconnu à l'API. Le
        // réglage « IA activée », lui, est conservé tel que le joueur l'a laissé.
        if (version < 9) {
          s.iaActivee = s.iaLocaleActivee ?? true;
          s.modele = MODELE_DEFAUT;
        }
        s.iaActivee ??= true;
        s.groqKey ??= '';
        // ⚠️ LES MODÈLES LLAMA ONT DISPARU DU CATALOGUE GROQ. Une sauvegarde
        // faite avant la bascule garde leur nom : on repose le modèle par
        // défaut dès que celui qui est enregistré ne fait plus partie de la
        // cascade, plutôt que d'afficher dans ⚙️ Réglages le nom d'un modèle
        // que plus personne ne sert.
        if (!s.modele || !MODELES_GROQ.includes(s.modele)) s.modele = MODELE_DEFAUT;
        delete s.iaLocaleActivee;
        // Le vestiaire est arrivé après coup : une sauvegarde d'avant n'a ni
        // liste d'articles ni tenue portée.
        s.equipements ??= [];
        s.equipementActif ??= {};
        // ⚠️ VERSION 10 — LE VESTIAIRE A MAIGRI. Protège-dents, mitaines, tee de
        // buteur et les trois paires de chaussettes ont été retirés de la vente
        // (demande explicite). Une sauvegarde peut donc porter un article qui
        // n'existe plus : on le retire de l'inventaire ET de l'emplacement
        // équipé, sinon la boutique afficherait un emplacement occupé par un
        // fantôme qu'aucune carte ne permet plus de libérer.
        s.equipements = s.equipements.filter((id) => !EQUIPEMENTS_RETIRES.includes(id));
        s.equipementActif = Object.fromEntries(
          Object.entries(s.equipementActif)
            .filter(([, id]) => id && !EQUIPEMENTS_RETIRES.includes(id)),
        ) as Partial<Record<CategorieEquipement, string>>;
        // ⚠️ VERSION 11 — LE SAC ET LE BOUCLIER ONT QUITTÉ « ACCESSOIRE ».
        // Ils ont chacun leur catégorie pour pouvoir être posés TOUS LES DEUX
        // au sol (`data/boutique.ts`). Une sauvegarde d'avant range l'un des
        // deux sous `accessoire` : sans cette reprise, l'objet resterait
        // « acheté mais jamais affiché », et la boutique montrerait un
        // emplacement vide alors que le joueur a payé.
        {
          const actif = s.equipementActif as Record<string, string | undefined>;
          const ancien = actif.accessoire;
          if (ancien === 'sac' || ancien === 'bouclier') actif[ancien] = ancien;
          delete actif.accessoire;
        }
        s.pubConsentement ??= 'inconnu';
        s.tutoVu ??= false;
        s.tutoMatchVu ??= false;
        s.traitsDebloques ??= [];
        // ⚠️ Une sauvegarde d'avant ce champ n'a pas de clé : on lui en tire une
        // ici. Sa ligne historique au classement (clé par pseudo) reste en base
        // et le serveur la laisse tranquille ; la prochaine fin de saison en
        // ouvre une nouvelle, à elle. Voir `serveur/schema-vercel.sql`.
        // Réparation idempotente : une sauvegarde d'avant l'envoi en cours de
        // saison n'a pas ce frein, et `undefined` le rendrait inopérant.
        s.dernierScoreEnvoye ??= 0;
        s.cleClassement ||= cleAleatoire();
        s.pseudoClassement ??= '';
        s.rangMondialId ??= null;
        s.ecransVus ??= [];
        s.guideFerme ??= false;
        s.pubs ??= ETAT_PUBS_VIDE;
        // VERSION 13 — la langue automatique vient désormais du pays de l'IP.
        // Les anciennes sauvegardes n'indiquaient pas si le réglage avait été
        // touché : elles basculent sur la nouvelle détection. Tout choix fait
        // ensuite dans ⚙️ est marqué et ne sera plus jamais écrasé.
        s.langueManuelle ??= false;
        // ⚠️ VERSION 17 — ON DÉCOINCE LES SAUVEGARDES QUE ⚙️ AVAIT MARQUÉES À TORT.
        //
        // L'ancien panneau de réglages travaillait sur un brouillon et publiait
        // TOUT au clic sur « Enregistrer », y compris `setLangue(langueLocale)`
        // — même quand la personne n'avait pas touché à la langue. Or `setLangue`
        // lève `langueManuelle`. Il suffisait donc d'ouvrir ⚙️ une seule fois
        // pour coller sa clé Groq ou changer d'ambiance, et la détection par le
        // pays de l'IP était éteinte DÉFINITIVEMENT : quelqu'un arrivant
        // d'Angleterre gardait le français, et rien ne l'expliquait.
        //
        // ⚠️ ON NE REMET PAS TOUT LE MONDE À ZÉRO, et c'est le point délicat :
        // on ne peut pas distinguer après coup un vrai choix d'un marquage
        // parasite. Mais le marquage parasite réécrivait la langue DÉJÀ en
        // place, c'est-à-dire celle du navigateur. On ne rouvre donc la
        // détection que dans ce cas précis ; une langue différente de celle du
        // navigateur ne peut venir que d'un clic délibéré, et elle est
        // conservée. Reste un cas non couvert, assumé : celui qui a choisi
        // exprès la langue de son navigateur verra la détection repasser une
        // fois — son prochain clic dans ⚙️ tiendra pour de bon.
        if (s.langueManuelle && s.langue === langueDuNavigateur(LANGUE_DE_REPLI)) {
          s.langueManuelle = false;
        }
        // VERSION 12 — le manager gagne son bureau hebdomadaire et ses
        // enveloppes de recrutement. Une ancienne carrière reprend avec les
        // moyens normaux de son club et une première décision à trancher.
        if (s.manager) {
          const budgets = s.manager.club
            ? budgetsDuClub(s.manager.club, s.manager.saison)
            : { transferts: 0, salarial: 0, structure: 0 };
          s.manager = {
            ...s.manager,
            budgetTransferts: Number.isFinite(s.manager.budgetTransferts)
              ? s.manager.budgetTransferts : budgets.transferts,
            budgetSalarial: Number.isFinite(s.manager.budgetSalarial)
              ? s.manager.budgetSalarial : budgets.salarial,
            negociations: s.manager.negociations ?? [],
            negociationsClubs: s.manager.negociationsClubs ?? [],
            recrues: s.manager.recrues ?? [],
            // VERSION 19 — le bureau n'impose plus de carte de décision.
            // Les vraies décisions passent par le match, le mercato et les
            // demandes mesurées du vestiaire dans L'Ovale.
            decision: null,
            tempsDeJeu: s.manager.tempsDeJeu ?? {},
            demandes: s.manager.demandes ?? [],
            ventes: s.manager.ventes ?? [],
            composition: s.manager.composition ?? (s.manager.club
              ? compositionManagerParDefaut(effectifDuClub(s.manager.club, s.manager.saison))
              : { titulaires: [], remplacants: [], capitaineId: '', buteurId: '' }),
            tactique: { ...TACTIQUE_MANAGER_DEFAUT, ...(s.manager.tactique ?? {}) },
            resultats: s.manager.resultats ?? {},
            // ⚠️ VERSION 18 — LES INSTALLATIONS DU CLUB. Une carrière d'avant
            // ce lot n'a ni murs, ni promotion, ni rapports : elle repart avec
            // l'enveloppe normale de son club et RIEN de construit. Lui offrir
            // un centre de niveau 1 « pour ne pas la pénaliser » lui retirerait
            // le premier achat, qui est justement le moment de carrière.
            budgetStructure: Number.isFinite(s.manager.budgetStructure)
              ? s.manager.budgetStructure : budgets.structure,
          };
          // ⚠️ VERSION 20 — LES TROIS ENVELOPPES SONT REMISES À LEUR NIVEAU.
          // Les budgets d'avant cette version sortaient de l'ancienne formule
          // `(force − 31)² × k`, qui ignorait complètement ce que gagne un club
          // de rugby : mesuré sur une carrière de chantier, l'US Oyonnax
          // gardait 34 682 500 € de budget transferts alors que la Pro D2
          // entière tourne autour de 10,7 M€ de produits d'exploitation. Un
          // magot pareil rend le nouveau marché sans objet — plus rien n'a de
          // prix quand on peut tout acheter.
          //
          // ⚠️ ON REMET, ON NE PLAFONNE PAS. Un plafonnement laisserait la
          // caisse pleine à ras bord, c'est-à-dire exactement le problème en
          // plus discret. Et ce qui est perdu n'a jamais été gagné : c'est un
          // chiffre produit par une formule qu'on vient de retirer.
          if (version < 20 && s.manager.club) {
            const remis = budgetsDuClub(s.manager.club, s.manager.saison);
            s.manager = {
              ...s.manager,
              budgetTransferts: remis.transferts,
              budgetSalarial: remis.salarial,
              // La structure se banque : on rend l'épargne d'une saison, pas
              // celle d'une carrière entière comptée en ancienne monnaie.
              budgetStructure: Math.min(s.manager.budgetStructure, remis.structure * 3),
            };
          }
          s.manager = {
            ...s.manager,
            installations: s.manager.installations ?? {},
            jeunesFormes: s.manager.jeunesFormes ?? [],
            entrainements: s.manager.entrainements ?? [],
            progres: s.manager.progres ?? {},
            rapports: s.manager.rapports ?? [],
            // VERSION 21 — le centre devient une vraie filière. Les anciennes
            // promotions seniors restent intactes ; l'académie démarre vide.
            academie: s.manager.academie ?? [],
            observationsJeunes: s.manager.observationsJeunes ?? {},
            missionsJeunes: s.manager.missionsJeunes ?? {
              saison: s.manager.saison,
              utilises: 0,
            },
            reponsesJeunes: s.manager.reponsesJeunes ?? {},
            revenusFormation: s.manager.revenusFormation ?? {},
          };
          // VERSION 23 — la mémoire longue contient maintenant les personnes,
          // supporters, délégations, records et décisions pluriannuelles. Le
          // même assureur initialise cette couche sans toucher aux faits v22.
          // La migration est idempotente : elle conserve tout état déjà écrit
          // et initialise seulement les anciennes sauvegardes.
          s.manager.avancee = assurerEtatCarriereAvancee(
            s.manager,
            s.manager.club ? effectifDuClub(s.manager.club, s.manager.saison) : [],
          );

          // VERSION 24 — UNE SIGNATURE NE PEUT PLUS ÊTRE REJOUÉE.
          // Le bouton du club vendeur permettait de recréer une négociation
          // portant le même id qu'un contrat signé. Un levier remplaçait alors
          // aussi l'état `signee`, puis débitait de nouveau les deux budgets.
          // On garde la première recrue, ferme le dossier, retire les annonces
          // identiques et rembourse exactement les signatures surnuméraires.
          if (version < 24) {
            const repare = reparerRecrutementsDupliques(s.manager, s.transfertsSociaux ?? []);
            s.manager = {
              ...s.manager,
              recrues: repare.recrues,
              negociations: repare.negociations,
              negociationsClubs: repare.negociationsClubs,
              budgetTransferts: s.manager.budgetTransferts + repare.remboursementTransferts,
              budgetSalarial: s.manager.budgetSalarial + repare.remboursementSalarial,
            };
            s.transfertsSociaux = repare.transfertsSociaux;
          }
        }
        if (version < 27 && s.manager?.club) {
          // Restaurer le monde avant de mesurer les charges et les objectifs.
          setMouvementsClubs(s.mouvementsClubs ?? {});
          setTransfertsSociaux(s.transfertsSociaux ?? []);
          setApportsDuCentre(s.manager.jeunesFormes, s.manager.progres);
          s.manager.recrues = s.manager.recrues.map((r) => ({ ...r, club: r.club ?? s.transfertsSociaux?.find((t) =>
            t.nom === r.joueur.nom && t.de === r.joueur.club && t.saison === r.saison)?.vers }));
          s.manager.budgetSalarial = reparerPlafondSalarial(s.manager, s.transfertsSociaux ?? []);
          s.manager.avancee = assurerEtatCarriereAvancee(s.manager, effectifDuClub(s.manager.club, s.manager.saison));
        }
        // Le mode de simulation saison par saison a été supprimé. On enlève
        // aussi sa valeur persistée afin qu'une sauvegarde v4 ne puisse plus
        // réactiver une branche obsolète après fusion par Zustand.
        delete s.rythme;
        return s;
      },
      // La pyramide (qui joue dans quelle division) vit dans un registre de
      // module : au retour d'une sauvegarde, il faut la lui rendre.
      onRehydrateStorage: () => (etat) => {
        setMouvementsClubs(etat?.mouvementsClubs ?? {});
        setArriveesClubs(etat?.arriveesClubs ?? {});
        // Les fins de saison mémoïsées (lib/promotion.ts) sont calculées sur la
        // composition des divisions : elles doivent être purgées en même temps.
        oublierResultats();
        setTransfertsSociaux(etat?.transfertsSociaux ?? []);
        // ⚠️ MÊME RAISON QUE LA LIGNE AU-DESSUS : les jeunes du centre et les
        // programmes individuels vivent dans un registre de module
        // (`lib/effectif.ts`). Sans cette ligne, une carrière rechargée verrait
        // sa promotion s'évaporer et son effectif rétrécir sans un mot.
        setApportsDuCentre(etat?.manager?.jeunesFormes, etat?.manager?.progres);
        setResultatsJoues(Object.values(etat?.manager?.resultats ?? {}).map((r) => ({
          cle: r.cle,
          match: {
            domicile: r.domicile ? r.club : r.adversaire,
            exterieur: r.domicile ? r.adversaire : r.club,
            scoreD: r.domicile ? r.scorePour : r.scoreContre,
            scoreE: r.domicile ? r.scoreContre : r.scorePour,
            essaisD: r.domicile ? r.essaisPour : r.essaisContre,
            essaisE: r.domicile ? r.essaisContre : r.essaisPour,
          },
        })));
        for (const [cle, match] of Object.entries(etat?.joueur?.international?.resultats ?? {})) enregistrerResultatJoue(cle, match);
        for (const [cle, match] of Object.entries(etat?.manager?.avancee?.selection?.resultats ?? {})) enregistrerResultatJoue(cle, match);
        // ⚠️ Le thème vit sur <html>, pas dans React : il faut le reposer à la
        // réhydratation, sinon le site repart en vert à chaque rechargement.
        appliquerTheme(etat?.theme ?? 'vert');
        // Idem pour la langue : elle vit dans un module, pas dans React.
        definirLangue(etat?.langue ?? langueDuNavigateur(LANGUE_DE_REPLI));
        // Les sauvegardes qui contiennent déjà un message resté sans
        // réponse sont réparées au rechargement, dans la langue de la partie.
        if (etat?.joueur) {
          etat.reparerSilencesClubs();
        }
        // Fermer l'onglet sur l'épilogue ne permet pas de le contourner : au
        // retour, on reprend l'explication avant d'ouvrir le Hall.
        if (etat?.finCarriere) etat.setEcran('finCarriere');
        // Et la clé Groq personnelle, pour la même raison (`lib/groq.ts` ne
        // peut pas lire le store sans créer un cycle d'imports).
        definirCleGroqJoueur(etat?.groqKey ?? '');
      },
      partialize: projectionMemoisee((s: GameState) => ({
        joueur: s.joueur,
        // ⚠️ SANS CETTE LIGNE, UNE CARRIÈRE D’ENTRAÎNEUR DISPARAÎT AU
        //    RECHARGEMENT. Attrapé en jouant : un rechargement de page, et le
        //    banc, le prestige, le palmarès et tout l’historique repartaient à
        //    zéro sans un mot. `reconversionManager`, lui, ne se persiste PAS :
        //    c’est un ordre donné à l’écran de création, pas un état de la
        //    partie (même règle que `attenteEvenement`).
        manager: s.manager,
        journal: s.journal.slice(-160),
        coins: s.coins,
        collectionSolo: s.collectionSolo,
        inventaire: s.inventaire,
        skinActif: s.skinActif,
        equipements: s.equipements,
        equipementActif: s.equipementActif,
        pubConsentement: s.pubConsentement,
        tutoVu: s.tutoVu,
        tutoMatchVu: s.tutoMatchVu,
        traitsDebloques: s.traitsDebloques,
        cleClassement: s.cleClassement,
        pseudoClassement: s.pseudoClassement,
        rangMondialId: s.rangMondialId,
        dernierScoreEnvoye: s.dernierScoreEnvoye,
        pubs: s.pubs,
        pantheon: s.pantheon,
        finCarriere: s.finCarriere,
        scenarioActif: s.scenarioActif,
        // La scène de la semaine est persistée : fermer l'onglet en plein
        // milieu ne doit pas escamoter la question qui attend une réponse.
        evenementHebdo: s.evenementHebdo,
        evenementsVus: s.evenementsVus,
        // `attenteEvenement`, lui, ne l'est PAS : c'est un ordre donné à l'écran,
        // pas un état du monde. Le persister ferait rejouer une génération à
        // chaque rechargement de page.
        compteurs: s.compteurs,
        tropheesEnAttente: s.tropheesEnAttente,
        approches: s.approches,
        dossiersRecrutement: s.dossiersRecrutement,
        theme: s.theme,
        langue: s.langue,
        langueManuelle: s.langueManuelle,
        mouvementsClubs: s.mouvementsClubs,
        posts: s.posts.slice(-120),
        filSemaine: s.filSemaine,
        matchRegarde: s.matchRegarde,
        ecransVus: s.ecransVus,
        guideFerme: s.guideFerme,
        statsReelles: Object.fromEntries(Object.entries(s.statsReelles)
          .filter(([cle]) => cle.endsWith(`#${s.joueur?.saison ?? 0}`))),
        journeesReelles: Object.fromEntries(Object.entries(s.journeesReelles)
          .filter(([cle]) => cle.endsWith(`#${s.joueur?.saison ?? 0}`))),
        notifsSocial: s.notifsSocial.slice(0, 40),
        comptesSuivis: s.comptesSuivis,
        conversations: Object.fromEntries(Object.entries(s.conversations)
          .map(([pseudo, fil]) => [pseudo, fil.slice(-40)])),
        transfertsSociaux: s.transfertsSociaux,
        relationsSociales: s.relationsSociales,
        succesDebloques: s.succesDebloques,
        defis: s.defis,
        iaActivee: s.iaActivee,
        tenorKey: s.tenorKey,
        groqKey: s.groqKey,
        modele: s.modele,
      })),

      /**
       * ⚠️ CE QUI APPARTIENT À L'APPAREIL SE POSE PAR-DESSUS LA PARTIE.
       *
       * Bug signalé : « quand on switch de sauvegarde, ça nous remet le tuto ».
       * Et le tutoriel n'était que le symptôme le plus visible — `persist` écrit
       * TOUT dans l'emplacement actif, si bien qu'ouvrir une autre partie
       * rendait aussi la langue du navigateur, le thème vert, zéro Ova, une
       * boutique vide et un Hall des légendes remis à zéro.
       *
       * `merge` est le bon endroit : il est appelé une seule fois, au chargement
       * de l'emplacement, avec l'état lu et l'état initial. Le faire dans
       * `onRehydrateStorage` reviendrait à écraser l'état APRÈS que React s'y
       * soit abonné, donc à peindre l'écran deux fois.
       */
      merge: (persiste, courant) => appliquerCompte({
        ...courant,
        ...(persiste as Partial<GameState>),
      }) as GameState,
    },
  ),
);

/**
 * ⚠️ ET LE COMPTE SE RÉÉCRIT QUAND IL BOUGE, PAS QUAND LA PARTIE BOUGE.
 * `ecrireCompte` compare le JSON de ses seules clés à celui de la dernière
 * écriture et sort en silence s'il est identique : gagner un Ova écrit, jouer
 * une minute de match n'écrit rien. C'est ce qui permet de partager les
 * réglages et la boutique sans payer une seconde sauvegarde à chaque `set()`.
 */
useGame.subscribe((etat) => ecrireCompte(etat as unknown as Record<string, unknown>));
// Figer les convocations dès l'annonce, y compris création et rechargement.
useGame.subscribe((etat, avant) => {
  if (etat.joueur && etat.joueur !== avant.joueur) {
    const joueur = actualiserRassemblements(etat.joueur);
    if (joueur !== etat.joueur) useGame.setState({ joueur });
  }
});

// ---- Palmarès : quels titres le joueur remporte-t-il cette saison ? ----
// On simule d'abord le CLASSEMENT du club dans sa poule (1 à 14). Il découle
// de l'écart entre la FORCE DE L'EFFECTIF cette saison-là (moyenne pondérée
// des 23 meilleurs joueurs, qui évolue avec les progressions, les déclins et
// les regens) et le niveau moyen de la division. La saison personnelle du
// joueur ne fait que l'infléchir.
// Ce classement conditionne ensuite les titres et la coupe d'Europe jouée :
// en Top 14, les 8 premiers vont en Champions Cup, les 6 derniers en Challenge.
// Taille de la poule où le club joue : le vrai nombre de clubs quand la
// compétition est courte (Premiership 10, Top 14, URC 16…), 12 par défaut pour
// les divisions amateurs, qui sont découpées en poules régionales.
function taillePoule(division: { clubs: unknown[] } | undefined): number {
  const n = division?.clubs.length ?? 14;
  return n >= 6 && n <= 20 ? n : 12;
}

function rangDuClub(force: number, reference: number, taille: number): number {
  const ecart = force - reference;
  // 1,2 point d'écart de moyenne d'effectif ≈ 1 place au classement.
  const base = taille / 2 + 0.5 - ecart * 1.2;
  const rang = Math.round(base + (Math.random() * 5 - 2.5));
  return Math.max(1, Math.min(taille, rang));
}

// Apport personnel du joueur au résultat collectif, en « places » de
// classement : son niveau par rapport au groupe, sa saison (matchs, essais) et
// son état de forme.
function apportDuJoueur(j: Joueur, forceClub: number, matchsSaison: number, essaisSaison: number): number {
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;
  const titulaire = Math.min(1, matchsSaison / 18); // 18 matchs ≈ saison pleine
  return (
    (perso - forceClub) * 0.12 * titulaire +
    essaisSaison * 0.25 +
    (j.forme - 70) * 0.02 +
    (j.moral - 70) * 0.01
  );
}

export interface BilanSaison {
  rang: number;
  divisionNom: string;
  trophees: string[];
  forceEffectif: number;
  apport: number;
  champion: boolean; // le club du joueur a gagné la finale
  finaliste: boolean; // battu en finale — il jouera le match d'accès
  qualifie: boolean; // a disputé la phase finale
  // --- Ce qu'il faut pour décerner les distinctions individuelles, une fois la
  // note de saison connue (voir `lib/honneurs.ts` et l'appel dans `saisonSuivante`).
  competition: string;
  taillePoule: number;
  enChampionsCup: boolean; // le club dispute la Champions Cup
  /**
   * L’id du tournoi de sélections RÉELLEMENT disputé, s’il y en a un.
   * ⚠️ Un id, plus un booléen : un Sud-Africain joue le Rugby Championship,
   * pas le Tournoi des 6 Nations, et le jeu lui décernait quand même le titre
   * de meilleur joueur des 6 Nations (bug signalé en jeu).
   */
  tournoiId?: string;
  /** Niveau de la compétition de club (0 = élite). Décide de la vitrine mondiale. */
  niveau: number;
}

/**
 * Combien de week-ends de coupe d'Europe compte une saison. Sert à demander à
 * `coupeEnDirect` la compétition ENTIÈRE (poules + tableau final) : en fin de
 * saison, tout a été joué.
 */
const WEEKENDS_COUPE = SEMAINES.filter((s) => s.type === 'coupe').length;

/**
 * Le vainqueur d'une compétition de sélections, tel que le classement le donne.
 *
 * ⚠️ `apport: null`, COMME PARTOUT AILLEURS. L'écran Résultats et le classement
 * latéral lisent ces compétitions sans bonus du joueur (`internationalEnDirect(
 * …, null)`). Passer un apport ici donnerait un autre classement que celui que
 * le joueur a sous les yeux pendant toute la saison — donc un champion qui n'est
 * pas celui qu'il a vu gagner. C'est exactement le genre d'écart qui a produit
 * le bug d'origine.
 */
function vainqueurInternational(id: string, saison: number): string | null {
  const comp = competitionsDeLaSaison(saison).find((c) => c.id === id);
  if (!comp) return null;
  const etat = internationalEnDirect(id, saison, comp.journees, null);
  // ⚠️ UNE COUPE DU MONDE SE GAGNE EN FINALE, PAS EN TÊTE D’UN CLASSEMENT.
  // `EtatInternational.vainqueur` n’est rempli que par elle ; pour un
  // championnat de sélections (Tournoi, Rugby Championship), le premier du
  // tableau reste la bonne réponse.
  return etat?.vainqueur ?? etat?.classement[0]?.club ?? null;
}

/** La compétition de sélections que SA nation dispute sur une fenêtre donnée. */
function competitionDeSaNation(
  nation: string, saison: number, fenetre: 'automne' | 'tournoi',
) {
  return competitionsDeLaSaison(saison).find(
    (c) => c.fenetre === fenetre && !COMPETITIONS_U20.has(c.id) && c.equipes.includes(nation),
  );
}

function resoudreTrophees(
  j: Joueur,
  saisonEcoulee: number,
  matchsSaison: number,
  essaisSaison: number,
  phase: PhaseFinale,
  capesSaison: number,
): BilanSaison {
  const trophees: string[] = [];
  const divisionId = j.division ?? divisionDuClub(j.club)?.id ?? 'fed3';
  // Toutes les compétitions, France ET monde : on peut désormais signer à
  // l'étranger, et on y joue le vrai titre national du championnat.
  const division = COMPETITIONS.find((d) => d.id === divisionId);
  const taille = taillePoule(division);

  // Force de l'effectif tel qu'il était pendant la saison écoulée, comparée au
  // niveau moyen de la division la même saison.
  const force = forceEffectif(j.club, saisonEcoulee);
  const reference = forceMoyenneDivision(divisionId, saisonEcoulee);
  const apport = apportDuJoueur(j, force, matchsSaison, essaisSaison);
  // Le rang vient du VRAI championnat, joué journée après journée
  // (lib/championnat.ts) ; la vieille estimation ne sert plus que de repli.
  const rang =
    phase.classement.find((l) => l.club === j.club)?.position ??
    Math.max(1, Math.min(taille, rangDuClub(force, reference, taille) - Math.round(apport)));

  // ---- TITRE NATIONAL : plus aucun tirage au sort ----
  // Le champion est celui qui a gagné LA FINALE (lib/phaseFinale.ts), après
  // barrages et demi-finales réellement disputés.
  const tropheeNational = TROPHEE_PAR_DIVISION[divisionId];
  const champion = phase.champion === j.club;
  const finaliste = phase.finaliste === j.club;
  const qualifie = phase.qualifies.includes(j.club);
  if (tropheeNational && champion) trophees.push(tropheeNational);

  // ---- COUPES D'EUROPE : le VRAI vainqueur, plus un tirage au sort ----
  //
  // ⚠️ BUG SIGNALÉ EN JEU : « j'ai gagné la Champions Cup et je ne l'ai pas
  // eue ». La coupe est jouée pour de vrai depuis longtemps (`lib/coupe.ts` :
  // quatre poules, quarts, demies, finale) et le joueur en suit le tableau dans
  // l'écran Résultats — mais le TITRE, lui, était tiré au sort à partir du rang
  // en championnat (`tire((9 − rang) / 48)`). Deux vérités parallèles : on
  // pouvait soulever le trophée à l'écran et repartir les mains vides, ou
  // l'inverse. On lit maintenant le vainqueur de la finale, et rien d'autre.
  //
  // ⚠️ ET ON LIT LES COUPES QUE LE CLUB DISPUTE VRAIMENT (`coupesDuClub`, la
  // liste des engagés de `COUPES_EUROPE`), pas celles que son classement lui
  // « donnerait ». C'est déjà ce que montrent l'écran Résultats et le classement
  // latéral : le trophée doit sortir de la même source qu'eux.
  for (const coupeId of coupesDuClub(j.club, saisonEcoulee)) {
    const tropheeCoupe = TROPHEE_PAR_COUPE[coupeId];
    if (!tropheeCoupe) continue;
    const etat = coupeEnDirect(coupeId, saisonEcoulee, j.club, WEEKENDS_COUPE);
    if (etat?.vainqueur === j.club) trophees.push(tropheeCoupe);
  }
  const enChampionsCup = coupesDuClub(j.club, saisonEcoulee).includes('championsCup');

  // ---- SÉLECTION NATIONALE : le VRAI vainqueur, là aussi ----
  //
  // ⚠️ MÊME BUG, MÊME CAUSE : « j'ai fait le Grand Chelem avec l'équipe de
  // France et je n'ai pas eu les 6 Nations ». Le Tournoi se joue journée par
  // journée (`lib/international.ts`), son classement est affiché tout au long de
  // la saison — et le titre était décidé par `tire((perso − 78) / 220)`, sans
  // jamais regarder ce classement. Cinq victoires sur cinq pouvaient donc ne
  // rien rapporter, et une quatrième place tout rafler.
  const nation = nomNation(j.nation);

  // Être sélectionné, d'abord. Deux façons de l'établir, et c'est voulu : les
  // CAPES réellement jouées en mode « journée par journée » (la vérité du
  // terrain), et à défaut — mode « saison rapide », où aucune cape n'est
  // simulée — la convocation au niveau, tranchée sans hasard (`alea = 0,5`).
  // ⚠️ Le même booléen sert à gagner le Tournoi ET à pouvoir en être élu
  // meilleur joueur : deux expressions différentes finiraient par diverger, et
  // on serait meilleur joueur d'un tournoi qu'on n'a pas disputé.
  const matchsInternationaux = Object.values(j.international?.matchs ?? {}).filter((m) => m.saison === saisonEcoulee);
  const selectionne = j.international ? matchsInternationaux.length > 0 : capesSaison > 0;

  const sonTournoi = competitionDeSaNation(nation, saisonEcoulee, 'tournoi');
  const tournoiId = selectionne && sonTournoi ? sonTournoi.id : undefined;
  if (sonTournoi && selectionne && (!j.international || matchsInternationaux.some((m) => m.competition === sonTournoi.id))) {
    const trophee = TROPHEE_PAR_INTERNATIONAL[sonTournoi.id];
    if (trophee && vainqueurInternational(sonTournoi.id, saisonEcoulee) === nation) {
      trophees.push(trophee);
    }
  }

  // La Coupe du monde : le sommet absolu d'une carrière. Elle remplace la
  // tournée d'automne une saison sur quatre — `estAnneeDeCoupeDuMonde` est LA
  // source (le vieux `saison % 4 === 0` en était une deuxième, et les deux ne
  // tombaient pas forcément sur la même année).
  if (estAnneeDeCoupeDuMonde(saisonEcoulee) && (j.international
    ? j.international.rassemblements.some((r) => r.saison === saisonEcoulee && r.competition === 'coupeDuMonde' && r.retenu)
    : selectionne)) {
    const mondial = competitionDeSaNation(nation, saisonEcoulee, 'automne');
    const trophee = mondial && TROPHEE_PAR_INTERNATIONAL[mondial.id];
    if (trophee && vainqueurInternational(mondial.id, saisonEcoulee) === nation) {
      trophees.push(trophee);
    }
  }

  // ⚠️ LES DISTINCTIONS INDIVIDUELLES NE SE DÉCIDENT PAS ICI, et c'est
  // structurel : elles dépendent de la NOTE DE SAISON, que `evoluer()` ne
  // calcule qu'une fois le rang connu — donc après cette fonction. Les décerner
  // ici obligerait à noter la saison deux fois, avec deux résultats possibles.
  // C'est `saisonSuivante` qui appelle `decernerHonneurs`, juste après
  // l'évolution, et qui complète `trophees`. On lui laisse donc le contexte.

  return {
    rang,
    divisionNom: division?.nom ?? 'sa division',
    trophees,
    forceEffectif: force,
    apport,
    champion,
    finaliste,
    qualifie,
    competition: divisionId,
    taillePoule: taille,
    enChampionsCup,
    ...(tournoiId ? { tournoiId } : {}),
    niveau: division?.niveau ?? 10,
  };
}

// L'ancien système d'offre unique (montée d'une division française) est
// remplacé par le vrai marché des transferts : voir src/lib/offres.ts.

// ---------------------------------------------------------------------------
// STATISTIQUES DÉTAILLÉES
// Un match ne se résume pas à « joué / essai marqué » : on compte les points,
// les tirs au but, les plaquages (réussis ET manqués), les grattages, les
// passes décisives et les cartons. Le volume dépend du poste et du niveau.
// ---------------------------------------------------------------------------
export const STATS_VIDES: StatsDetaillees = {
  points: 0, butsTentes: 0, butsReussis: 0, plaquages: 0, plaquagesManques: 0,
  grattages: 0, passesDecisives: 0, cartonsJaunes: 0, cartonsRouges: 0,
};

export function additionnerStats(a: StatsDetaillees, b: StatsDetaillees): StatsDetaillees {
  return {
    points: a.points + b.points,
    butsTentes: a.butsTentes + b.butsTentes,
    butsReussis: a.butsReussis + b.butsReussis,
    plaquages: a.plaquages + b.plaquages,
    plaquagesManques: a.plaquagesManques + b.plaquagesManques,
    grattages: a.grattages + b.grattages,
    passesDecisives: a.passesDecisives + b.passesDecisives,
    cartonsJaunes: a.cartonsJaunes + b.cartonsJaunes,
    cartonsRouges: a.cartonsRouges + b.cartonsRouges,
  };
}

// Le buteur du match : ouvreur d'abord, sinon arrière ou centre.
const BUTEURS: PosteId[] = ['demi_ouverture', 'arriere', 'deuxieme_centre'];

// Plaquages attendus sur 80 minutes, par poste.
const PLAQUAGES_80: Record<PosteId, number> = {
  pilier_gauche: 9, talonneur: 10, pilier_droit: 9,
  deuxieme_ligne_g: 11, deuxieme_ligne_d: 11,
  troisieme_aile_g: 14, troisieme_aile_d: 15, numero_8: 12,
  demi_melee: 6, demi_ouverture: 6,
  ailier_gauche: 5, premier_centre: 10, deuxieme_centre: 9, ailier_droit: 5,
  arriere: 6,
};

function statsDuMatch(
  poste: PosteId, minutes: number, essais: number, note: number,
  jeuAuPied: number, plaquage: number, vision: number, estButeur: boolean,
  facteurCartons = 1,
): StatsDetaillees {
  const part = minutes / 80;
  const qualite = (note - 5.5) / 10; // -0,35 … +0,45
  const alea = () => Math.random();

  const plaquagesTentes = Math.round(PLAQUAGES_80[poste] * part * (0.7 + alea() * 0.6));
  const tauxReussite = Math.min(0.97, 0.72 + plaquage / 400 + qualite * 0.2);
  const plaquages = Math.round(plaquagesTentes * tauxReussite);

  let butsTentes = 0;
  let butsReussis = 0;
  if (estButeur) {
    butsTentes = Math.round((2 + alea() * 5) * part);
    // Un très bon buteur tourne autour de 75-80 % de réussite, pas 90 %.
    const adresse = Math.min(0.9, 0.38 + jeuAuPied / 300 + qualite * 0.2);
    for (let n = 0; n < butsTentes; n++) if (alea() < adresse) butsReussis += 1;
  }

  const grattages = Math.random() < (poste === 'troisieme_aile_d' ? 0.7 : poste === 'troisieme_aile_g' ? 0.5 : 0.15) * part
    ? 1 + (alea() < 0.25 ? 1 : 0) : 0;
  const passesDecisives = Math.random() < (0.1 + vision / 500 + qualite * 0.2) * part * 2 ? 1 : 0;
  const cartonsJaunes = Math.random() < 0.05 * part * facteurCartons ? 1 : 0;
  const cartonsRouges = cartonsJaunes && Math.random() < 0.08 ? 1 : 0;

  return {
    points: essais * 5 + butsReussis * 2, // transformations et pénalités confondues
    butsTentes, butsReussis,
    plaquages, plaquagesManques: plaquagesTentes - plaquages,
    grattages, passesDecisives, cartonsJaunes, cartonsRouges,
  };
}

// ---------------------------------------------------------------------------
// UNE SEMAINE DE LA SAISON (mode journée par journée)
// ---------------------------------------------------------------------------
interface ResultatSemaine {
  emoji: string;
  titre: string;
  texte: string;
  deltas: Partial<Record<StatVariable, number>>;
  aJoue: boolean;
  titulaire: boolean;
  essais: number;
  note?: number; // note du match, sur 10
  blessure?: Blessure | null;
  cape?: boolean;
  soinBlessure?: boolean; // semaine passée à l'infirmerie
  stats?: StatsDetaillees;
  victoire?: boolean; // le club du joueur a gagné ce week-end
}

// Le joueur dispute-t-il ce match, et comment ? Tout part de son niveau face
// à celui de son groupe : un joueur au-dessus est titulaire, un joueur en
// dessous gratte des fins de match, un joueur très en dessous reste en tribune.
function jouerMatch(j: Joueur, intensite: number, role?: 'titulaire' | 'remplacant'): ResultatSemaine {
  const forceGroupe = forceEffectif(j.club, j.saison);
  const perso = noteGlobale(j) * 0.7 + j.reputation * 0.3;
  const ecart = perso - forceGroupe - (intensite - 1) * 6; // une affiche européenne est plus relevée
  // La confiance du staff (lot 6 : interviews, attitude) pèse pour ±0,25 sur la
  // titularisation : à niveau égal, c'est elle qui fait la différence.
  const confiance = ((j.confianceCoach ?? 50) - 50) / 200;
  const chanceTitulaire = Math.max(0.05, Math.min(0.95, 0.5 + ecart / 16 + confiance));
  const tirage = Math.random();
  const forceBanc = (j.miseAuBanc?.semaines ?? 0) > 0;
  const titulaire = role ? role === 'titulaire' : !forceBanc && tirage < chanceTitulaire;
  const remplacant = role ? role === 'remplacant' : forceBanc || (!titulaire && tirage < chanceTitulaire + 0.3);

  if (!titulaire && !remplacant) {
    return {
      emoji: '👕', titre: 'Sur la feuille de match… ou pas',
      texte: `Tu n'es pas retenu dans le groupe. Tu regardes tes coéquipiers depuis les tribunes, et tu ravales ta frustration.`,
      deltas: { moral: -3, forme: 3 },
      aJoue: false, titulaire: false, essais: 0,
    };
  }

  const minutes = titulaire ? 55 + Math.floor(Math.random() * 26) : 12 + Math.floor(Math.random() * 24);
  const essais = Math.random() < ESSAIS_PAR_MATCH[j.poste] * (minutes / 80) * (0.6 + noteGlobale(j) / 100) * 1.6
    ? 1 + (Math.random() < 0.12 ? 1 : 0)
    : 0;

  // Note du match : niveau relatif, temps de jeu, essais, forme, et une bonne
  // part d'aléa — c'est un match de rugby, pas une feuille de calcul.
  const note = Math.round(
    Math.max(2, Math.min(10,
      5.6 + ecart * 0.1 + (minutes - 50) * 0.012 + essais * 1.2
      + (j.forme - 70) * 0.012 + (Math.random() * 3 - 1.5)
      + effetsTraits(j.traits).noteMatch
      + bonusVestiaire(j, j.saison)
      + (j.capitaine ? 0.25 : 0)
      + (intensite > 1.2 ? effetsTraits(j.traits).noteGrosMatch : 0),
    )) * 10,
  ) / 10;

  const fatigue = -Math.round(minutes / 12);
  const deltas: Partial<Record<StatVariable, number>> = {
    forme: fatigue,
    moral: note >= 7 ? 4 : note >= 5 ? 1 : -3,
  };
  if (note >= 8) deltas.reputation = 2;
  if (essais >= 2) deltas.reputation = (deltas.reputation ?? 0) + 1;

  const estButeur = BUTEURS.includes(j.poste) && (j.poste === 'demi_ouverture' || Math.random() < 0.3);
  const stats = statsDuMatch(
    j.poste, minutes, essais, note,
    j.attributs.jeuAuPied, j.attributs.plaquage, j.attributs.vision, estButeur,
    effetsTraits(j.traits).cartons,
  );

  // Le corps peut lâcher : le risque monte avec les minutes, la fatigue et l'âge.
  const tr = effetsTraits(j.traits);
  const blessureBrute = Math.random() < risqueDeBlessure(j, minutes, intensite) * tr.risqueBlessure
    ? tirerBlessure()
    : null;
  const blessure = blessureBrute
    ? { ...blessureBrute, semaines: Math.max(1, Math.round(blessureBrute.semaines * tr.graviteBlessure)) }
    : null;

  const recit = titulaire
    ? `Titulaire, tu joues ${minutes} minutes.`
    : forceBanc
      ? `Sanctionné par le club, tu débutes sur le banc puis disputes ${minutes} minutes.`
      : `Tu entres en jeu et disputes ${minutes} minutes.`;
  const finition = essais > 0 ? ` Tu marques ${essais === 1 ? 'un essai' : `${essais} essais`} !` : '';
  const bobo = blessure ? ` 🚑 ${messageBlessure(blessure)}` : '';
  const details = ` (${stats.plaquages} plaquages${stats.butsTentes ? `, ${stats.butsReussis}/${stats.butsTentes} au pied` : ''}${stats.grattages ? `, ${stats.grattages} grattage` : ''}${stats.cartonsJaunes ? ', carton jaune 🟨' : ''})`;
  // ⚠️ Demande explicite : des résumés PLUS POSITIFS. Un 6/10 est une bonne
  // sortie, pas un match raté — les paliers étaient calés trop haut et le
  // joueur avait l'impression de passer à côté de toutes ses rencontres.
  const jugement = note >= 8.4
    ? ' La presse te désigne homme du match.'
    : note >= 7.4 ? ' Tu sors sous les applaudissements du stade.'
      : note >= 6.5 ? ' Une prestation pleine, saluée par le staff.'
        : note >= 5.6 ? ' Du travail sérieux, sans un mot plus haut que l’autre.'
          : note >= 4.6 ? ' Tu tiens ton rang, sans éclat.'
            : ' Ce n’était pas ton jour.';

  return {
    emoji: essais > 0 ? '🎯' : '🏉',
    titre: `Match, note ${note}/10`,
    texte: `${recit}${finition}${jugement}${details}${bobo}`,
    deltas,
    aJoue: true,
    titulaire,
    essais,
    note,
    stats,
    blessure,
  };
}

/**
 * LE JOUEUR PART-IL AVEC SA SÉLECTION CETTE SEMAINE ?
 *
 * ⚠️ FONCTION À PART, ET EXPORTÉE, POUR QU'ELLE SOIT TESTABLE. C'est elle qui
 * tranche entre « je joue le Tournoi » et « je joue mon championnat », et le bug
 * qu'elle corrige était invisible autrement : `jouerSemaine` n'est pas exportée,
 * la seule façon de vérifier le comportement était de dérouler une carrière
 * entière. Ici, `scripts/verifSelection.ts` la teste en trois lignes.
 *
 * Séniors ET U20 : une convocation chez les moins de 20 ans mobilise autant
 * qu'une cape A — on ne joue pas avec son club le week-end du Tournoi U20.
 */
export function partEnSelection(j: Joueur, sem: Semaine): boolean {
  return situationInternationale({ ...j, semaine: sem.numero }).indisponibleClub;
}

function jouerSemaine(j: Joueur, sem: Semaine): ResultatSemaine {
  // À l'infirmerie : on récupère, une semaine à la fois.
  if (j.blessure && j.blessure.semaines > 0) {
    const reste = j.blessure.semaines - 1;
    return {
      emoji: '🚑',
      titre: `Infirmerie : ${j.blessure.nom}`,
      texte: reste > 0
        ? `Soins, kiné, salle. Encore ${reste} semaine${reste > 1 ? 's' : ''} avant de retoucher un ballon.`
        : 'Dernière séance de rééducation : tu es apte pour la semaine prochaine. Le retour va piquer.',
      deltas: { forme: reste > 0 ? 0 : 6, moral: reste > 0 ? -2 : 6 },
      aJoue: false, titulaire: false, essais: 0,
      soinBlessure: true,
    };
  }
  const inter = situationInternationale(j);
  if (inter.camp) {
    if (!inter.match || inter.role === 'horsGroupe' || inter.role === 'preparation') return {
      emoji: '🏳️', titre: inter.camp.nom + (inter.role === 'horsGroupe' ? ' · hors des 23' : ' · rassemblement'),
      texte: 'Tu restes avec la sélection. Ton club poursuit son calendrier avec tes remplaçants.',
      deltas: { forme: 3, moral: inter.role === 'horsGroupe' ? -1 : 1 }, aJoue: false, titulaire: false, essais: 0,
    };
    const r = jouerMatch(j, 2, inter.role);
    return { ...r, emoji: '🏳️', titre: inter.camp.nom + ' · ' + (inter.role === 'titulaire' ? 'titulaire' : 'remplaçant'),
      texte: inter.match.match.domicile + ' – ' + inter.match.match.exterieur + '. ' + r.texte,
      cape: r.aJoue && !inter.camp.u20 };
  }
  // ---- PAS DE TRÊVE EN BAS DE LA PYRAMIDE ----
  // Demande explicite : de la Nationale 2 à la Régionale 3, on joue AUSSI les
  // week-ends de Coupe d'Europe et de Tournoi des 6 Nations. Ces divisions-là
  // n'ont ni coupe européenne ni internationaux : leur championnat continue.
  const divisionDuJoueur = j.division ?? 'fed3';
  // ⚠️ ...SAUF QUAND ON EST EN SÉLECTION, ET C'ÉTAIT UN BUG.
  // La règle « les amateurs jouent aussi les week-ends internationaux » était
  // appliquée AVANT de regarder si le joueur était convoqué : un espoir de
  // Fédérale appelé chez les U20 de son pays voyait sa sélection purement et
  // simplement escamotée, et jouait son match de championnat à la place. Le
  // panneau de carrière, lui, affichait bien l'affiche internationale — deux
  // vérités pour la même semaine.
  // Quand on part avec sa sélection, on ne joue pas le championnat : le club
  // joue sans nous, comme dans la vraie vie.
  const enSelection = partEnSelection(j, sem);
  const semaineJouee: Semaine =
    estAmateur(divisionDuJoueur) && (sem.type === 'coupe' || (sem.type === 'international' && !enSelection))
      ? { ...sem, type: 'championnat', libelle: 'Journée de championnat' }
      : sem;

  switch (semaineJouee.type) {
    case 'championnat': {
      const affiche = afficheDuJour(j, weekEndsJoues(divisionDuJoueur, sem.numero) + 1);
      // Poule courte : il y a moins de journées que de week-ends au calendrier.
      // Ces week-ends-là, il n'y a tout simplement pas de match.
      if (!affiche) {
        return {
          emoji: '🏋️', titre: `${semaineJouee.libelle}, pas de match`,
          texte: 'Aucun adversaire au programme ce week-end : semaine complète à l’entraînement, et le corps respire.',
          // ⚠️ Le gros de la remontée vient maintenant de `recuperationHebdo`
          // (convergence vers la condition de base). Ce qui reste ici n'est que
          // le petit plus d'un week-end sans choc — cumuler les deux renvoyait
          // tout le monde à 100 dès la première semaine creuse, et la forme
          // cessait de vouloir dire quoi que ce soit.
          deltas: { forme: 2, moral: 1 },
          aJoue: false, titulaire: false, essais: 0,
        };
      }
      const r = jouerMatch(j, 1);
      return {
        ...r,
        titre: `J${affiche.journee} - ${affiche.resume}`,
        texte: `${affiche.recit} ${r.texte}`,
        victoire: affiche.victoire,
      };
    }

    case 'coupe': {
      // Encore faut-il que le club dispute la coupe d'Europe.
      // ⚠️ ON LIT LA LISTE DES ENGAGÉS (`coupesDuClub`), pas la division. C'est
      // la même source que l'écran Résultats, le classement latéral et le
      // palmarès de fin de saison — trois vérités différentes sur « mon club
      // joue-t-il l'Europe ? », c'est le bug du titre fantôme en puissance.
      if (!afficheDuClub({ club: j.club, division: j.division ?? 'fed3', saison: j.saison, semaine: j.semaine ?? 1 })) {
        return {
          emoji: '🛌', titre: semaineJouee.libelle,
          texte: 'Week-end sans match : ton club ne dispute pas la coupe d’Europe. Semaine d’entraînement et de récupération.',
          deltas: { forme: 3, moral: 1 },
          aJoue: false, titulaire: false, essais: 0,
        };
      }
      const r = jouerMatch(j, 1.6);
      return { ...r, titre: `${semaineJouee.libelle}${r.aJoue ? `, note ${r.note}/10` : ''}` };
    }

    case 'international': {
      const conv = convocation(j);
      if (!conv.selectionne) {
        // ⚠️ PAS CHEZ LES A ? RESTE LES U20 (demande explicite). Un espoir de
        // 19 ans ne sera jamais appelé chez les séniors — mais il peut porter le
        // maillot de son pays chez les moins de 20 ans, et c'est souvent LE
        // moment où une carrière décolle.
        const jeune = convocationU20(j);
        if (jeune.selectionne) {
          const rj = jouerMatch({ ...j, reputation: Math.max(0, j.reputation - 10) }, 1.6);
          return {
            ...rj,
            emoji: '🌱',
            titre: `${semaineJouee.libelle}, sélection U20`,
            texte: `Tu es appelé chez les moins de 20 ans de ${nomNation(j.nation)} ! ${rj.texte}`,
            deltas: {
              ...rj.deltas,
              reputation: (rj.deltas.reputation ?? 0) + (rj.aJoue ? 3 : 1),
              moral: (rj.deltas.moral ?? 0) + 5,
            },
            // ⚠️ Une cape U20 n'est PAS une cape internationale : elle ne compte
            // pas dans `Joueur.selections`, qui est le palmarès des séniors.
            cape: false,
          };
        }
        return {
          emoji: '📺', titre: `${semaineJouee.libelle}, pas convoqué`,
          texte: `Le groupe est annoncé sans toi (il faut ${Math.round(conv.exige)} de niveau international, tu es à ${Math.round(conv.niveau)}).`
            + (j.age <= 20
              ? ` Chez les U20 non plus (${Math.round(jeune.exige)} exigé).`
              : '')
            + ' Tu restes au club pour travailler.',
          deltas: { forme: 2, moral: conv.marge > -4 ? -4 : -1 },
          aJoue: false, titulaire: false, essais: 0,
        };
      }
      const r = jouerMatch({ ...j, reputation: Math.max(0, j.reputation - 6) }, 2);
      return {
        ...r,
        emoji: '🏳️',
        titre: `${semaineJouee.libelle}, sélection nationale`,
        texte: `Tu es appelé en sélection ! ${r.texte}`,
        deltas: { ...r.deltas, reputation: (r.deltas.reputation ?? 0) + (r.aJoue ? 5 : 2), moral: (r.deltas.moral ?? 0) + 6 },
        cape: r.aJoue,
      };
    }

    case 'phaseFinale': {
      // On joue le VRAI bracket : barrages, demies, finale, puis match d'accès.
      const division = j.division ?? 'fed3';
      const bonus = bonusClubDuJoueur(j);
      const tour = semaineJouee.tourFinal ?? 'finale';
      const repos = (texte: string, emoji = '🏖️'): ResultatSemaine => ({
        emoji, titre: semaineJouee.libelle, texte,
        deltas: { forme: 4 },
        aJoue: false, titulaire: false, essais: 0,
      });

      let match: MatchFinal | null = null;
      if (tour === 'acces') {
        const py = resoudrePyramide(division, j.saison, j.club, bonus);
        match =
          [py.accesVersLeHaut, py.accesDepuisLeBas].find(
            (m): m is MatchFinal => !!m && (m.domicile === j.club || m.exterieur === j.club),
          ) ?? null;
        if (!match) return repos('Pas de match d’accès pour ton club : la saison est bel et bien finie. Vacances, puis mercato.');
      } else {
        const phase = phaseFinale(division, j.saison, j.club, bonus);
        if (!phase.qualifies.includes(j.club)) {
          return repos('Ta saison est terminée : le club n’est pas qualifié pour la phase finale. Place aux vacances et au mercato.');
        }
        match =
          phase.matchs.find(
            (m) => m.tour === tour && (m.domicile === j.club || m.exterieur === j.club),
          ) ?? null;
        if (!match) {
          // Qualifié mais pas de match ce week-end : soit exempt de barrages
          // (les deux premiers), soit déjà éliminé.
          const dejaJoue = phase.matchs.some(
            (m) => m.domicile === j.club || m.exterieur === j.club,
          );
          return repos(
            tour === 'barrage'
              ? 'Ton club a fini dans les deux premiers : il est exempt de barrages et attend son adversaire en demi-finale. Semaine de préparation.'
              : dejaJoue
                ? 'Ton club a été éliminé de la phase finale. Tu regardes la suite depuis le canapé, avec un goût amer.'
                : 'Pas de match cette semaine pour ton club.',
            '📺',
          );
        }
      }

      const chezNous = match.domicile === j.club;
      const nous = chezNous ? match.scoreD : match.scoreE;
      const eux = chezNous ? match.scoreE : match.scoreD;
      const adversaire = chezNous ? match.exterieur : match.domicile;
      const gagne = match.vainqueur === j.club;
      const r = jouerMatch(j, tour === 'finale' ? 2 : 1.8);
      const enjeu =
        tour === 'acces'
          ? gagne ? ' Ta place est assurée, quel soulagement.' : ' C’est la relégation. Un vestiaire en larmes.'
          : tour === 'finale'
            ? gagne ? ' VOUS ÊTES CHAMPIONS !' : ' Si près du Brennus, si loin.'
            : gagne ? ' Vous passez au tour suivant !' : ' L’aventure s’arrête là.';
      return {
        ...r,
        emoji: gagne ? '🔥' : '💔',
        titre: `${semaineJouee.libelle} - ${gagne ? 'Victoire' : 'Défaite'} ${nous}-${eux} contre ${adversaire}`,
        texte: `${chezNous ? 'À domicile' : 'En déplacement'} contre ${adversaire} : ${nous}-${eux}.${enjeu} ${r.texte}`,
        deltas: {
          ...r.deltas,
          moral: (r.deltas.moral ?? 0) + (gagne ? 8 : -8),
          reputation: (r.deltas.reputation ?? 0) + (gagne && tour === 'finale' ? 6 : gagne ? 2 : 0),
        },
      };
    }

    default:
      return {
        emoji: '🛌', titre: semaineJouee.libelle,
        texte: 'Semaine de repos.',
        deltas: { forme: 10 },
        aJoue: false, titulaire: false, essais: 0,
      };
  }
}

// L'affiche du jour dans le vrai championnat : adversaire et score final.
// ⚠️ Le calendrier compte 23 week-ends de championnat, le championnat lui-même
// 22 à 30 journées selon la taille de la poule : `journeesApres` fait la
// conversion (certains week-ends enchaînent deux journées).
function afficheDuJour(
  j: Joueur, weekEnd: number,
): { resume: string; recit: string; victoire: boolean; journee: number } | null {
  const division = j.division;
  if (!division) return null;
  const total = nombreJournees(division, j.club);
  const surCombien = totalWeekEnds(division);
  const fin = journeesApres(weekEnd, total, surCombien);
  const debut = journeesApres(weekEnd - 1, total, surCombien) + 1;
  if (fin < debut) return null; // week-end sans nouvelle journée (poule courte)
  const etat = championnatEnDirect(division, j.saison, j.club, fin, bonusClubDuJoueur(j));
  let match = null;
  let journee = fin;
  for (let idx = fin; idx >= debut && !match; idx--) {
    match = etat.journees[idx - 1]?.find((m) => m.domicile === j.club || m.exterieur === j.club) ?? null;
    if (match) journee = idx;
  }
  if (!match) return null;
  const domicile = match.domicile === j.club;
  const adversaire = domicile ? match.exterieur : match.domicile;
  const nous = domicile ? match.scoreD : match.scoreE;
  const eux = domicile ? match.scoreE : match.scoreD;
  const issue = nous > eux ? 'Victoire' : nous < eux ? 'Défaite' : 'Match nul';
  return {
    resume: `${issue} ${nous}-${eux} contre ${adversaire}`,
    recit: `${domicile ? 'À domicile' : 'En déplacement'} contre ${adversaire} : ${nous}-${eux}.`,
    victoire: nous > eux,
    journee,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LES SUITES D'UNE DÉCISION DU MJ
// ═══════════════════════════════════════════════════════════════════════════
// Demande explicite : « que Groq puisse gérer les actions de notre carrière :
// virer du club, mort du joueur, blessure, suspension, prison, augmentation,
// prime de match, popularité ».
//
// ⚠️ UN SEUL ENDROIT POUR LES DEUX CHEMINS. Le joueur peut écrire librement
// (`appliquerReponse`) ou répondre à la scène de la semaine
// (`appliquerJugement`) : sans cette fonction, les mêmes règles auraient été
// recopiées deux fois, et auraient divergé au premier correctif.
//
// ⚠️ ET C'EST ICI QUE LES PLAFONDS DE SAISON S'APPLIQUENT. Le MJ pourrait
// accorder une augmentation par semaine : quarante-trois par saison, et
// l'économie du jeu n'existe plus. Une augmentation par saison, et un cumul de
// primes borné au salaire — le reste est raconté, pas versé.
interface SuitesMJ {
  consequence?: ConsequenceDure;
  semaines?: number;
  motif?: string;
  club?: DecisionClub;
}

interface ResultatSuites {
  joueur: Joueur;
  entrees: EntreeJournal[];
  /** La carrière s'arrête ici (décès, radiation, fin de carrière). */
  finale: boolean;
  /** Le joueur vient de perdre son club : le marché doit s'ouvrir tout de suite. */
  sansClub: boolean;
  /** Une augmentation a été consommée cette saison. */
  augmentation: boolean;
  /** Primes versées par cette décision, à ajouter au cumul de la saison. */
  primeVersee: number;
}

/** Une augmentation par saison, pas deux. */
const AUGMENTATIONS_PAR_SAISON = 1;
/** Cumul de primes que le MJ peut verser sur une saison, en part de salaire. */
const PART_PRIMES_PAR_SAISON = 0.6;
const PRIMES_MINIMUM_PAR_SAISON = 2000;

function appliquerSuitesMJ(
  depart: Joueur,
  suites: SuitesMJ,
  compteurs: { augmentations?: number; primesIA?: number },
): ResultatSuites {
  let joueur = depart;
  const entrees: EntreeJournal[] = [];
  let finale = false;
  let sansClub = false;
  let augmentation = false;
  let primeVersee = 0;

  // ---- 1. La conséquence dure (déjà filtrée par `consequenceAutorisee`) ----
  if (suites.consequence) {
    const motif = suites.motif?.trim() || 'ce que tu viens de faire';
    const effet = appliquerConsequence(
      joueur, suites.consequence, motif, suites.semaines ?? 10,
    );
    joueur = effet.joueur;
    finale = effet.finale;
    sansClub = suites.consequence === 'exclusionClub';
    entrees.push({
      id: idUnique(), saison: joueur.saison, role: 'systeme',
      titre: `${effet.emoji} ${effet.titre}`, texte: effet.texte,
    });
  }

  // ---- 2. Ce que le club décide côté portefeuille ----
  // ⚠️ Jamais après une radiation ou un décès : on ne primait tout de même pas
  // un joueur que la fédération vient de rayer à vie.
  if (suites.club && !finale) {
    const type = suites.club.type;
    const salaire = joueur.contrat?.salaire ?? 0;
    const plafondPrimes = Math.max(
      PRIMES_MINIMUM_PAR_SAISON, Math.round(salaire * PART_PRIMES_PAR_SAISON),
    );
    const dejaVersees = compteurs.primesIA ?? 0;
    const trop = type === 'augmentation'
      ? (compteurs.augmentations ?? 0) >= AUGMENTATIONS_PAR_SAISON
      : type === 'prime' && dejaVersees >= plafondPrimes;
    if (!trop) {
      const effet = appliquerActionClub(
        joueur, type, suites.club.montant ?? 0, suites.club.motif?.trim() || '',
      );
      if (effet) {
        joueur = effet.joueur;
        if (type === 'augmentation') augmentation = true;
        if (type === 'prime') primeVersee = effet.montant;
        entrees.push({
          id: idUnique(), saison: joueur.saison, role: 'systeme',
          titre: `${effet.emoji} ${effet.titre}`, texte: effet.texte,
        });
      }
    }
  }

  return { joueur, entrees, finale, sansClub, augmentation, primeVersee };
}

function appliquerDeltas(joueur: Joueur, deltas: Partial<Record<StatVariable, number>>): Joueur {
  const j: Joueur = { ...joueur, attributs: { ...joueur.attributs } };
  for (const [cle, val] of Object.entries(deltas) as [StatVariable, number][]) {
    if (ATTRS_KEYS.includes(cle as keyof Attributs)) {
      const k = cle as keyof Attributs;
      j.attributs[k] = borne(j.attributs[k] + val);
    } else if (cle === 'forme' || cle === 'moral' || cle === 'reputation') {
      j[cle] = borne(j[cle] + val);
    } else if (cle === 'argent') {
      j.argent = Math.max(0, j.argent + val);
    } else if (cle === 'popularite' || cle === 'confianceCoach') {
      // Deux jauges 0-100 arrivées après coup : elles valent 50 par défaut sur
      // les vieilles sauvegardes, jamais `undefined`.
      j[cle] = borne((j[cle] ?? 50) + val);
    } else if (cle === 'abonnes') {
      // Un compteur, pas une jauge : pas de borne haute, mais jamais négatif.
      j.abonnes = Math.max(0, (j.abonnes ?? 0) + val);
    }
  }
  return j;
}

// ⚠️ LE CLASSEMENT PART VIERGE (demande explicite).
// Il était pré-rempli de LÉGENDES FICTIVES (`data/legendes.ts`) : un joueur qui
// arrivait voyait vingt carrières inventées au-dessus de la sienne, et croyait
// jouer contre du vrai monde. Un classement, ça se construit — il ne contient
// donc plus que ce qui a VRAIMENT été joué sur cet appareil : le panthéon (les
// carrières menées à leur terme) et la carrière en cours.
// Le pas suivant — le classement partagé entre tous les joueurs — demande un
// backend : voir la marche à suivre affichée dans `src/screens/Classement.tsx`.
export function classementComplet(
  pantheon: LegendeSauvegardee[],
  joueur: Joueur | null,
): (LegendeSauvegardee & { enCours?: boolean; joueur?: boolean })[] {
  const liste: (LegendeSauvegardee & { enCours?: boolean; joueur?: boolean })[] = [
    ...pantheon.map((l) => ({ ...l, joueur: true })),
  ];
  if (joueur) {
    liste.push({
      id: 'en-cours',
      nom: `${joueur.nom} (en cours)`,
      poste: joueur.poste,
      nation: joueur.nation,
      age: joueur.age,
      saisons: joueur.saison,
      note: noteGlobale(joueur),
      reputation: joueur.reputation,
      matchsJoues: joueur.matchsJoues,
      essais: joueur.essais,
      titres: joueur.titres,
      tropheeIds: (joueur.palmares ?? []).map((t) => t.trophee),
      clubs: joueur.clubs ?? [joueur.club],
      score: scoreCarriere(joueur),
      enCours: true,
      joueur: true,
    });
  }
  return liste.sort((a, b) => b.score - a.score);
}
