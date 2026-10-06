import { CadreCompositionManager } from '../components/CadreCompositionManager';
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { locale, tn, texteTraduit, t, nombre } from '../lib/i18n';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Confirmation } from '../components/Confirmation';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { COMPETITIONS, clubParNom } from '../data/clubs';
import { effectifDuClub, forceEffectif } from '../lib/effectif';
import { noter } from '../lib/tutoriel/guide';
import { useCatalogueSolo } from '../lib/catalogueSoloCommun';
import { classementManagerEnDirect } from '../lib/tableauManager';
import { semaine, libelleDate, libelleSemaine, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { CalendrierManager } from '../components/CalendrierManager';
import { TresorerieManager } from '../components/TresorerieManager';
import { evaluerObjectif } from '../lib/objectifsManager';
import { competitionEffective } from '../lib/divisions';
import { TROPHEES } from '../data/trophees';
import { nomPoste, POSTES, POSTE_PAR_ID } from '../data/rugby';
import { Drapeau } from '../components/Drapeau';
import { CompositionTerrainManager } from '../components/CompositionTerrainManager';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import { rareteCarriere } from '../lib/ligue/catalogueCarriere';
import { statistiquesCarte } from '../lib/ligue/statistiquesCarte';
import type { CarteCarriere } from '../lib/ligue/typesCarriere';
import { Icone } from '../components/Icone';
import { BadgeHorsClassement } from '../components/BadgeHorsClassement';
import { FicheJoueur } from '../components/FicheJoueur';
import { rareteDe } from '../lib/carteJoueur';
import type { EtatDuJoueur } from '../lib/carteJoueur';
import type { CibleRecrutementManager, PosteId } from '../types';
import { poidsDansSecteur, SECTEURS_COHESION } from '../lib/cohesion';
import type { Automatismes } from '../lib/cohesion';
import {
  ciblesDuMarche, joueurDejaRecrute, situationSalariale,
} from '../lib/recrutementManager';
import {
  CONFIANCE_DEPART, CONFIANCE_LICENCIEMENT, clubsAccessibles, etageAccessible,
  noteMaximale, salaireManager,
} from '../lib/manager';
import { afficheDuClub, libelleAfficheManager, type AfficheComplete } from '../lib/matchLive';
import { porteeSportive } from '../lib/recrutementManager';
import { LIMITES } from '../lib/classementMondial';
import {
  CLUBS_OBSERVES, coutAmelioration, ICONE_INSTALLATION, GAIN_ENTRAINEMENT,
  installationsVierges, NIVEAU_INSTALLATION_MAX, PLACES_ENTRAINEMENT,
  INCERTITUDE_RECRUTEURS,
} from '../lib/installations';
import { AXES_CENTRE, ICONE_AXE } from '../lib/centreFormation';
import {
  capaciteAcademie, ficheAcademicienManager, nomObjectifJeune, OBJECTIFS_JEUNES,
  tableauDetectionManager, motifObservationJeune, vivierFiltre,
} from '../lib/formationManager';
import {
  compositionManagerParDefaut, meilleureCompositionManager, noteCompositionManager, POSTES_XV_MANAGER,
  reconcilerCompositionManager,
} from '../lib/compositionManager';
import {
  assurerEtatCarriereAvancee, chargeTotaleEntrainement, disponibiliteJoueur,
  indisponiblesCarriereAvancee, moisRestantsContrat, moyenneVestiaire, palierContrat,
  penalitesMedicales, rapportConnaissance, risqueMedicalJoueur,
  risqueMoyenGroupe, joueurAgent,
} from '../lib/carriereAvancee';
import { hallOfFameDe, totaux } from '../lib/histoire';
import { rivalitesDe, traitsDominants } from '../lib/identiteClub';
import { effectifNational, jouerTestMatch } from '../lib/international';
import { nomNation } from '../lib/nations';
import {
  ajustementsCapitaines, contexteDerby, DOMAINES_DELEGATION, LIBELLES_DELEGATION,
  saisonsChronologie, vieClubProfonde,
} from '../lib/carriereProfonde';
import type {
  CompositionManager, ObjectifJeuneManager,
  TactiqueManager, TypeInstallation,
} from '../types';

const MatchLive = lazy(() => import('../components/MatchLive').then((m) => ({ default: m.MatchLive })));
const OvaleManager = lazy(() => import('./Social').then((m) => ({ default: m.OvaleManager })));

type VueManager = 'bureau' | 'equipe' | 'match' | 'tresorerie' | 'marche' | 'calendrier'
  | 'ovale' | 'formation' | 'recruteurs' | 'entrainement'
  | 'direction' | 'vestiaire' | 'univers' | 'histoire';

function humeurDuBoard(confiance: number): { texte: string; ton: string } {
  if (confiance < CONFIANCE_LICENCIEMENT + 12) return { texte: t('mgr.board.sellette'), ton: 'rouge' };
  if (confiance < CONFIANCE_DEPART) return { texte: t('mgr.board.doute'), ton: 'orange' };
  if (confiance < 78) return { texte: t('mgr.board.suit'), ton: 'vert' };
  return { texte: t('mgr.board.confiance'), ton: 'or' };
}

function niveauLisible(note: number): string {
  if (note >= 82) return 'exceptionnel';
  if (note >= 68) return 'très bon';
  if (note >= 54) return 'bon';
  if (note >= 40) return 'moyen';
  return 'à développer';
}

function etoiles(bas: number, haut: number): string {
  return bas === haut ? `${bas.toFixed(1)} ★` : `${bas.toFixed(1)}–${haut.toFixed(1)} ★`;
}

function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((partie) => partie[0])
    .join('')
    .toUpperCase();
}

export function Manager() {
  const catalogue = useCatalogueSolo();
  const manager = useGame((s) => s.manager);
  const setEcran = useGame((s) => s.setEcran);
  const semaineManager = useGame((s) => s.semaineManager);
  const avancerJusquaManager = useGame((s) => s.avancerJusquaManager);
  // Ce que la dernière avance a joué, et pourquoi elle s'est arrêtée. Un saut
  // muet se lit comme un bouton qui n'a rien fait.
  const [avanceFaite, setAvanceFaite] = useState<
    { semaines: number; arret: 'arrive' | 'decision' | 'match' | 'saison' | 'sansBanc' | 'approche' } | null
  >(null);
  const contacterClub = useGame((s) => s.contacterClubManager);
  const ouvrirMessages = useGame((s) => s.ouvrirMessagesOvale);
  const ouvrirDiscussion = useGame((s) => s.ouvrirDiscussionOvale);
  const ouvertureSociale = useGame((s) => s.ouvrirSocialSur);
  const signerBanc = useGame((s) => s.signerBanc);
  const quitterBanc = useGame((s) => s.quitterBanc);
  const definirComposition = useGame((s) => s.definirCompositionManager);
  const verifierSucces = useGame((s) => s.verifierSucces);
  const definirTactique = useGame((s) => s.definirTactiqueManager);
  const ameliorerInstallation = useGame((s) => s.ameliorerInstallation);
  const basculerEntrainement = useGame((s) => s.basculerEntrainement);
  const observerJeune = useGame((s) => s.observerJeuneManager);
  const proposerProjetJeune = useGame((s) => s.proposerProjetJeuneManager);
  const gererAcademicien = useGame((s) => s.gererAcademicienManager);
  const definirObjectifJeune = useGame((s) => s.definirObjectifJeuneManager);
  const definirMentorJeune = useGame((s) => s.definirMentorJeuneManager);
  const enregistrerResultat = useGame((s) => s.enregistrerResultatManager);
  const repondreDiscussion = useGame((s) => s.repondreDiscussionAvancee);
  const deciderMedical = useGame((s) => s.deciderMedicalManager);
  const definirChargeEntrainement = useGame((s) => s.definirChargeEntrainementManager);
  const ouvrirRenegociationJoueur = useGame((s) => s.ouvrirRenegociationJoueurManager);
  const observerCible = useGame((s) => s.observerCibleManager);
  const postulerBanc = useGame((s) => s.postulerBancManager);
  const negocierContrat = useGame((s) => s.negocierContratManager);
  const demissionner = useGame((s) => s.demissionnerManager);
  const accepterOffreBanc = useGame((s) => s.accepterOffreBancManager);
  const repondreSelection = useGame((s) => s.repondreSelectionManager);
  const enregistrerMatchSelection = useGame((s) => s.enregistrerMatchSelectionManager);
  const configurerDelegation = useGame((s) => s.configurerDelegationManager);
  const definirHierarchieCapitaines = useGame((s) => s.definirHierarchieCapitainesManager);
  const repondreDecisionStrategique = useGame((s) => s.repondreDecisionStrategiqueManager);
  const journal = useGame((s) => s.journal);

  const [vue, setVue] = useState<VueManager>('bureau');
  // ⚠️ LES MURS SONT CEUX DU CLUB, pas ceux de l'entraîneur : on lit le club
  // courant, et un manager qui change de banc découvre ce que l'autre a bâti.
  const murs = manager?.installations?.[manager.club] ?? installationsVierges();
  // Les tarifs fixes sont partagés avec le store.
  const placesEntrainement = PLACES_ENTRAINEMENT[Math.min(murs.entrainement, NIVEAU_INSTALLATION_MAX)];
  const rapportsFrais = manager?.rapports?.filter((r) => r.saison >= (manager.saison ?? 0)).length ?? 0;
  // La masse déjà engagée : c'est elle qui bloque une signature, pas le solde.
  const salaires = manager?.club ? situationSalariale(manager) : null;
  const masseEngagee = salaires?.engagee ?? 0;
  const masseSaturee = !!salaires && masseEngagee >= salaires.plafond * 0.92;
  const [raccrocher, setRaccrocher] = useState(false);
  const [clubVise, setClubVise] = useState('');
  const [divisionMarche, setDivisionMarche] = useState(manager?.division ?? 'top14');
  const [clubMarche, setClubMarche] = useState('');
  const [recherche, setRecherche] = useState('');
  const rechercheDifferee = useDeferredValue(recherche);
  const [limiteMarche, setLimiteMarche] = useState(24);
  const [poste, setPoste] = useState('');
  // Le vivier des jeunes : poste, âge et recherche. Vide = le rapport annuel.
  const [posteJeune, setPosteJeune] = useState('');
  const [ageJeune, setAgeJeune] = useState(0);
  const [rechercheJeune, setRechercheJeune] = useState('');
  const [vivierOuvert, setVivierOuvert] = useState(false);
  // Le marché mondial gagne le même filtre d'âge que le vivier.
  const [ageMarche, setAgeMarche] = useState('');
  useEffect(() => setLimiteMarche(24), [divisionMarche, clubMarche, rechercheDifferee, poste, ageMarche]);
  const [matchOuvert, setMatchOuvert] = useState<AfficheComplete | null>(null);
  const [matchSelectionOuvert, setMatchSelectionOuvert] = useState(false);
  const [jeuneALiberer, setJeuneALiberer] = useState<string | null>(null);
  const [demission, setDemission] = useState(false);
  // La fiche ouverte depuis le marché. Demande : « pouvoir cliquer sur les
  // profils » — voir `components/FicheJoueur.tsx`.
  const [ficheCible, setFicheCible] = useState<CibleRecrutementManager | null>(null);
  const [competitionHistoire, setCompetitionHistoire] = useState(manager?.division ?? 'top14');
  const [saisonChronologie, setSaisonChronologie] = useState(manager?.saison ?? 1);

  useEffect(() => {
    if (manager && ouvertureSociale) setVue('ovale');
  }, [manager, ouvertureSociale]);
  useEffect(() => {
    if (manager) verifierSucces();
  }, [manager, verifierSucces]);

  const saison = manager?.saison ?? 1;
  const prestige = manager?.prestige ?? 0;
  const libre = manager?.libre ?? false;
  const bancsLibres = useMemo(
    () => clubsAccessibles(prestige, saison, { triche: libre, limite: 60 }),
    [prestige, saison, libre],
  );
  const classement = useMemo(() => {
    if (!manager) return null;
    return classementManagerEnDirect(manager);
  }, [manager]);
  const classementVisible = useMemo(() => {
    const lignes = classement?.classement ?? [];
    if (lignes.length <= 5) return lignes;
    const rang = Math.max(0, lignes.findIndex((l) => l.club === manager?.club));
    const debut = Math.max(0, Math.min(lignes.length - 5, rang - 2));
    return lignes.slice(debut, debut + 5);
  }, [classement, manager?.club]);
  const vivierMarche = useMemo(() => {
    if (!manager?.club || vue !== 'marche') return [];
    const dejaRecrutees = new Set(manager.recrues.map((r) => r.joueur.id));
    return ciblesDuMarche(divisionMarche, manager.saison, manager.club, clubMarche)
      .filter((c) => !dejaRecrutees.has(c.id));
  }, [manager?.club, manager?.saison, manager?.recrues, divisionMarche, clubMarche, vue]);
  const cibles = useMemo(() => {
    return vivierMarche
      .filter((c) => !poste || c.poste === poste)
      // ⚠️ L'ÂGE EST UNE TRANCHE, PAS UN NOMBRE. Personne ne cherche « un
      //    joueur de 27 ans » : on cherche un espoir, un joueur dans ses
      //    années pleines, ou un cadre d'expérience. Les bornes suivent les
      //    paliers que le jeu utilise déjà (formation < 23, pic à 27,
      //    déclin après 31).
      .filter((c) => {
        if (!ageMarche) return true;
        if (ageMarche === 'espoir') return c.age <= 22;
        if (ageMarche === 'pleine') return c.age >= 23 && c.age <= 29;
        return c.age >= 30;
      })
      .filter((c) => !rechercheDifferee.trim()
        || `${c.nom} ${c.club} ${c.nation}`.toLowerCase().includes(rechercheDifferee.trim().toLowerCase()));
  }, [vivierMarche, poste, rechercheDifferee, ageMarche]);
  const effectifBrut = useMemo(
    () => manager?.club ? effectifDuClub(manager.club, manager.saison) : [],
    [manager, catalogue],
  );
  const avancee = useMemo(
    () => manager ? assurerEtatCarriereAvancee(manager, effectifBrut) : null,
    [manager, effectifBrut],
  );
  const indisponibles = useMemo(
    () => indisponiblesCarriereAvancee(avancee ?? undefined, manager?.semaine ?? 0),
    [avancee, manager?.semaine],
  );
  const indisponiblesSet = useMemo(() => new Set(indisponibles), [indisponibles]);
  // ⚠️ TOUTES LES AFFICHES, PAS SEULEMENT LE CHAMPIONNAT. 
  // ne lit que la grille des journées : premier de sa poule, un manager
  // traversait les demies et la finale sans qu’aucun match ne lui soit proposé
  // — c’est le « je n’ai pas fait les play-offs ».  couvre les
  // trois natures de week-end ().
  const afficheMemo = useMemo(
    () => manager ? afficheDuClub(manager) : null,
    [manager],
  );
  const prochainesAffiches = useMemo(() => {
    if (!manager?.club) return [];
    const suite: { semaine: number; affiche: AfficheComplete }[] = [];
    for (let numero = manager.semaine; numero <= SEMAINES_PAR_SAISON; numero++) {
      const affiche = afficheDuClub({ ...manager, semaine: numero });
      if (affiche && !manager.resultats[affiche.cle]) suite.push({ semaine: numero, affiche });
    }
    const visibles = suite.slice(0, 4);
    const prochaineCoupe = suite.find(({ affiche }) => affiche.nature === 'coupe');
    if (prochaineCoupe && !visibles.some(({ affiche }) => affiche.cle === prochaineCoupe.affiche.cle)) visibles.push(prochaineCoupe);
    return visibles;
  }, [manager]);
  /**
   * ⚠️ ON AVANCE JUSQU'AU PROCHAIN RENDEZ-VOUS, PAS D'UN NOMBRE DE SEMAINES.
   * Un « +4 semaines » forcerait à compter soi-même où tombe le prochain match,
   * et un saut qui s'arrête tout seul deux semaines plus tôt paraîtrait cassé.
   * On vise la fin de saison : `avancerJusquaManager` s'arrête de lui-même à la
   * première chose qui demande l'entraîneur, et le dit.
   */
  const avancerSemaines = () => {
    const r = avancerJusquaManager(SEMAINES_PAR_SAISON);
    if (r.semaines > 0) setAvanceFaite(r);
  };

  const derbyMemo = useMemo(() => {
    if (!manager?.club || !afficheMemo) return null;
    const adversaire = afficheMemo.match.domicile === manager.club
      ? afficheMemo.match.exterieur
      : afficheMemo.match.domicile;
    return contexteDerby(manager.club, adversaire);
  }, [afficheMemo, manager?.club]);
  const penalitesNote = useMemo(() => {
    const medicales = penalitesMedicales(avancee ?? undefined);
    const capitanat = ajustementsCapitaines(avancee?.profonde, effectifBrut);
    return Object.fromEntries([...new Set([...Object.keys(medicales), ...Object.keys(capitanat)])]
      .map((id) => [id, (medicales[id] ?? 0) + (capitanat[id] ?? 0) - (derbyMemo?.motivation ?? 0)]));
  }, [avancee, derbyMemo?.motivation, effectifBrut]);
  const effectifComplet = useMemo(
    () => effectifBrut
      .map((j) => ({ ...j, note: Math.max(1, j.note - (penalitesNote[j.id] ?? 0)) })),
    [effectifBrut, penalitesNote],
  );
  // La disponibilité décide de la feuille, jamais de l'appartenance au club.
  // Les blessés et internationaux restent donc dans l'effectif affiché.
  const effectif = useMemo(
    () => effectifComplet.filter((j) => !indisponiblesSet.has(j.id)),
    [effectifComplet, indisponiblesSet],
  );
  const cartesManagerCache = useMemo(() => {
    const map = new Map<string, CarteCarriere>();
    if (!manager) return map;
    const comp = competitionEffective(manager.club, manager.division);
    const ch = comp?.nom || manager.divisionNom || manager.division || 'Top 14';
    for (const j of effectifComplet) {
      const famille = POSTE_PAR_ID[j.poste]?.famille ?? 'troisieme_ligne';
      map.set(j.id, {
        id: j.id,
        sourceId: j.id,
        nom: j.nom,
        poste: j.poste,
        famille,
        postesSecondaires: j.postesSecondaires,
        note: j.note,
        potentiel: j.potentiel,
        age: j.age,
        nation: j.nation,
        clubReel: manager.club,
        championnat: ch,
        pays: 'France',
        origine: j.duCentre ? 'formation' : 'professionnel',
        rarete: rareteCarriere(j.note),
        statistiques: statistiquesCarte(j.note, famille, j.id),
        proprietaire: manager.nom,
        fatigue: 0,
        matchs: 0,
        essais: 0,
        clubs: [{ clubId: manager.club, saison: manager.saison }],
      });
    }
    return map;
  }, [effectifComplet, manager]);
  const compositionMemo = useMemo(
    () => reconcilerCompositionManager(effectif, manager?.composition),
    [effectif, manager?.composition],
  );
  const detectionJeunes = useMemo(
    () => manager?.club && (vue === 'formation' || vue === 'recruteurs') ? tableauDetectionManager(manager) : null,
    [manager, vue],
  );
  // Les âges réellement présents dans le vivier : on ne propose pas un filtre
  // « 19 ans » si le rayon n'en contient aucun.
  const agesDuVivier = useMemo<number[]>(
    () => (detectionJeunes
      ? [...new Set(detectionJeunes.vivier.map((j) => j.age))].sort((a, b) => a - b)
      : []),
    [detectionJeunes],
  );
  const filtreJeuneActif = vivierOuvert || !!posteJeune || ageJeune > 0 || !!rechercheJeune.trim();
  // ⚠️ ON NE CONSTRUIT LES FICHES QUE QUAND LE VIVIER EST OUVERT. Un rayon
  //    national ramène plusieurs centaines de garçons : en calculer la fiche
  //    à chaque frappe dans le champ de recherche n'aurait aucun intérêt.
  const vivier = useMemo(() => {
    if (!manager || !detectionJeunes || !filtreJeuneActif) return null;
    return vivierFiltre(manager, {
      poste: posteJeune as PosteId | '',
      age: ageJeune,
      recherche: rechercheJeune,
    }, 60, detectionJeunes);
  }, [manager, detectionJeunes, filtreJeuneActif, posteJeune, ageJeune, rechercheJeune]);
  const matchSelection = useMemo(() => {
    const selection = avancee?.selection;
    const rencontre = selection?.matchEnAttente;
    if (!manager || !selection || !rencontre) return null;
    return jouerTestMatch(selection.nation, rencontre.adversaire, manager.saison, rencontre.id, null);
  }, [avancee?.selection, manager]);
  const risquesBlessureMatch = useMemo(() => {
    if (!manager || !avancee) return {};
    const intensite = manager.tactique.rythme === 'intense' ? 1.25 : manager.tactique.rythme === 'gestion' ? .82 : 1;
    return Object.fromEntries(effectifBrut.map((j) => [j.id, risqueMedicalJoueur(
      avancee.profilsMedicaux[j.id], j, avancee.chargeEntrainement, 'match', intensite,
    )]));
  }, [avancee, effectifBrut, manager]);

  if (!manager) return null;

  const sansBanc = !manager.club;
  // ⚠️ STRICTEMENT SUPÉRIEUR : on entraîne JUSQU'À `ageManagerMax` inclus. À
  // `>=`, la dernière saison annoncée par l'écran de création serait refusée.
  const finDAge = manager.age > LIMITES.ageManagerMax;
  const fiche = manager.club ? clubParNom(manager.club) : undefined;
  const comp = manager.club ? competitionEffective(manager.club, manager.division) : undefined;
  const force = manager.club ? forceEffectif(manager.club, manager.saison) : 0;
  const humeur = humeurDuBoard(manager.confiance);
  const maLigne = classement?.classement.find((l) => l.club === manager.club);
  const sem = semaine(manager.semaine);
  const approchesEnCours = (avancee?.approches ?? []).filter((a) => a.etat === 'ouverte' || a.etat === 'negociation');
  const actives = manager.negociations.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');
  const dossiersClubs = manager.negociationsClubs.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');
  const demandesOuvertes = manager.demandes.filter((d) => d.etat === 'ouverte');
  const alertesOvale = actives.length + dossiersClubs.length + demandesOuvertes.length
    + approchesEnCours.length
    + manager.ventes.reduce((total, vente) => total + vente.offres.length, 0);
  const composition = compositionMemo;
  const afficheManager = afficheMemo;
  const resultatManager = afficheManager ? manager.resultats[afficheManager.cle] : undefined;
  const academieClub = manager.academie.filter((j) => j.clubCentre === manager.club);
  const mentors = effectif.filter((j) => j.age >= 28).sort((a, b) => b.note - a.note);
  const revenusFormationClub = Object.entries(manager.revenusFormation)
    .filter(([cle]) => cle.startsWith(`${manager.club}|`))
    .reduce((somme, [, montant]) => somme + montant, 0);
  const objectifsAvances = (avancee?.objectifs ?? []).map((o) => evaluerObjectif(o, manager, effectifBrut, maLigne?.joues ? maLigne.position : undefined));
  const discussionsOuvertes = avancee?.discussions.filter((d) => d.etat === 'ouverte') ?? [];
  const dossiersMedicaux = avancee?.medical.filter((d) => (d.phase ?? (d.semaines > 0 ? 'diagnostic' : 'clos')) !== 'clos') ?? [];
  const chargeHebdo = avancee?.chargeEntrainement;
  const chargeTotale = chargeHebdo ? chargeTotaleEntrainement(chargeHebdo) : 0;
  const risqueGroupe = avancee ? risqueMoyenGroupe(avancee, effectifBrut) : 0;
  const convocationsActives = avancee?.convocations.filter((c) => manager.semaine >= c.debut && manager.semaine <= c.fin) ?? [];
  const rivalitesClub = rivalitesDe(avancee?.rivalites ?? [], manager.club);
  const identiteClub = avancee?.identites[manager.club];
  const hallClub = hallOfFameDe(avancee?.carrieresJoueurs ?? [], manager.club);
  const archiveVisible = avancee?.histoire[competitionHistoire] ?? [];
  const selectionManager = avancee?.selection;
  const rencontreSelection = selectionManager?.matchEnAttente;
  const profonde = avancee?.profonde;
  const vieProfonde = vieClubProfonde(profonde, manager.club);
  const etatsComposition = new Map<string, EtatDuJoueur>();
  for (const dossier of dossiersMedicaux) {
    etatsComposition.set(dossier.joueurId, {
      condition: dossier.disponibilite,
      blesse: dossier.semaines > 0,
      tempsBlessure: dossier.semaines > 0 ? `${dossier.semaines} sem.` : undefined,
    });
  }
  for (const convocation of convocationsActives) {
    etatsComposition.set(convocation.joueurId, {
      ...etatsComposition.get(convocation.joueurId),
      enSelection: true,
    });
  }
  const automatismesComposition = profonde ? Object.fromEntries(
    SECTEURS_COHESION.map((secteur) => {
      let total = 0;
      let poids = 0;
      composition.titulaires.forEach((id, index) => {
        const integration = profonde.integrations[id];
        const posteAligne = POSTES_XV_MANAGER[index];
        if (!integration || !posteAligne) return;
        const p = poidsDansSecteur(posteAligne, secteur);
        total += integration.cohesion * p;
        poids += p;
      });
      return [secteur, Math.round(poids > 0 ? total / poids : 45)];
    }),
  ) as Automatismes : undefined;
  const decisionStrategique = profonde?.decisionsStrategiques.find((d) => !d.choisie);
  const saisonsMemoire = saisonsChronologie(profonde);
  const chronologieVisible = profonde?.chronologie.filter((e) => e.saison === saisonChronologie).sort((a, b) => a.semaine - b.semaine) ?? [];
  const changerJoueur = (zone: 'titulaires' | 'remplacants', index: number, joueurId: string) => {
    const suivante: CompositionManager = {
      ...composition,
      titulaires: [...composition.titulaires],
      remplacants: [...composition.remplacants],
    };
    const ancien = suivante[zone][index];
    for (const autreZone of ['titulaires', 'remplacants'] as const) {
      const autreIndex = suivante[autreZone].indexOf(joueurId);
      if (autreIndex >= 0) suivante[autreZone][autreIndex] = ancien;
    }
    suivante[zone][index] = joueurId;
    if (suivante.capitaineId === ancien && zone === 'titulaires') suivante.capitaineId = joueurId;
    if (suivante.buteurId === ancien) suivante.buteurId = joueurId;
    definirComposition(suivante);
  };

  const majTactique = <K extends keyof TactiqueManager>(cle: K, valeur: TactiqueManager[K]) => {
    definirTactique({ ...manager.tactique, [cle]: valeur });
  };

  const optionsBancs: OptionSelecteur[] = bancsLibres.map((c) => ({
    valeur: c.club.nom,
    label: c.club.nom,
    sous: t('mgr.banc.sous', {
      competition: c.competition.nom, force: c.force.toFixed(1), objectif: c.objectif,
      salaire: nombre(salaireManager(c.force)),
    }),
    vignette: <Blason club={c.club} taille={22} />,
  }));
  const optionsDivisions: OptionSelecteur[] = COMPETITIONS.map((c) => ({
    valeur: c.id, label: c.nom, sous: `${c.pays} · ${c.clubs.length} ${t('mgr.clubs')}`,
    vignette: <LogoCompet id={c.id} taille={22} />,
  }));
  const competitionMarche = COMPETITIONS.find((c) => c.id === divisionMarche);
  const optionsClubs: OptionSelecteur[] = [
    { valeur: '', label: t('mgr.marche.tousClubs'), sous: t('mgr.marche.selectionMondiale') },
    ...(competitionMarche?.clubs ?? []).map((c) => ({
      valeur: c.nom, label: c.nom, vignette: <Blason club={c} taille={20} />,
    })),
  ];
  const optionsPostes: OptionSelecteur[] = [
    { valeur: '', label: t('mgr.marche.tousPostes') },
    ...POSTES.map((p) => ({ valeur: p.id, label: nomPoste(p.id), sous: `n° ${p.numero}` })),
  ];
  const optionRole = (id: string): OptionSelecteur[] => {
    const joueur = effectif.find((j) => j.id === id);
    return joueur ? [{
      valeur: joueur.id,
      label: joueur.nom,
      sous: `${nomPoste(joueur.poste)} · ${joueur.age} ${t('compo.ans')}`,
      vignette: <span className="manager-role-note">{joueur.note}</span>,
    }] : [];
  };
  const optionsCapitaines = composition.titulaires.flatMap(optionRole);
  const optionsButeurs = [...composition.titulaires, ...composition.remplacants].flatMap(optionRole);
  // Les autres rôles (Correctif 17) : toute la feuille peut les tenir, et « Automatique » laisse le staff choisir.
  const optionsAutresRoles: OptionSelecteur[] = [
    { valeur: '', label: t('rv.roles.auto'), sous: t('rv.roles.autoAide') },
    ...optionsButeurs,
  ];
  const optionsTactiques: Record<keyof TactiqueManager, OptionSelecteur[]> = {
    attaque: [
      { valeur: 'equilibre', label: 'Équilibré', sous: 'Alterner jeu au près et au large', vignette: <Icone nom="ballon" taille={16} /> },
      { valeur: 'avants', label: 'Jeu d’avants', sous: 'Insister dans l’axe et les duels', vignette: <Icone nom="equipe" taille={16} /> },
      { valeur: 'large', label: 'Jouer au large', sous: 'Écarter vite vers les trois-quarts', vignette: <Icone nom="fleche-droite" taille={16} /> },
      { valeur: 'occupation', label: 'Occupation au pied', sous: 'Gagner du terrain avant d’attaquer', vignette: <Icone nom="cible" taille={16} /> },
    ],
    defense: [
      { valeur: 'blitz', label: 'Blitz', sous: 'Monter vite pour étouffer l’attaque', vignette: <Icone nom="sifflet" taille={16} /> },
      { valeur: 'glissee', label: 'Glissée', sous: 'Accompagner le ballon vers la touche', vignette: <Icone nom="fleche-droite" taille={16} /> },
      { valeur: 'repli', label: 'Repli', sous: 'Sécuriser la profondeur du terrain', vignette: <Icone nom="stade" taille={16} /> },
    ],
    rythme: [
      { valeur: 'gestion', label: 'Gérer', sous: 'Préserver les organismes', vignette: <Icone nom="batterie" taille={16} /> },
      { valeur: 'normal', label: 'Normal', sous: 'Conserver un tempo équilibré', vignette: <Icone nom="chrono" taille={16} /> },
      { valeur: 'intense', label: 'Intense', sous: 'Accélérer au prix de plus de fatigue', vignette: <Icone nom="flamme" taille={16} /> },
    ],
    penalites: [
      { valeur: 'mixte', label: 'Selon le terrain', sous: 'Adapter le choix à la situation', vignette: <Icone nom="sifflet" taille={16} /> },
      { valeur: 'points', label: 'Prendre les points', sous: 'Tenter les pénalités possibles', vignette: <Icone nom="cible" taille={16} /> },
      { valeur: 'touche', label: 'Chercher la touche', sous: 'Miser sur la conquête et le maul', vignette: <Icone nom="equipe" taille={16} /> },
    ],
    remplacements: [
      { valeur: 'precoces', label: 'Précoces', sous: 'Faire entrer le banc rapidement', vignette: <Icone nom="banc" taille={16} /> },
      { valeur: 'standard', label: 'Standards', sous: 'Changer au moment habituel', vignette: <Icone nom="chrono" taille={16} /> },
      { valeur: 'tardifs', label: 'Tardifs', sous: 'Conserver les titulaires plus longtemps', vignette: <Icone nom="batterie" taille={16} /> },
    ],
  };

  return (
    <motion.section className="carriere-manager" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <header className="manager-entete">
        <div>
          <div className="eyebrow">
            {libre ? t('mgr.modeLibre') : t('mgr.carriere')}
            {' · '}{t('gen.saison').toLowerCase()} {manager.saison}
            {!sansBanc && ` · ${libelleSemaine(sem, manager.saison)}`}
          </div>
          <h1><Icone nom="entraineur" taille={26} /> {manager.nom}{manager.horsClassement && <> <BadgeHorsClassement /></>}</h1>
        </div>
        {!sansBanc && fiche && (
          <div className="manager-identite-club">
            <Blason club={fiche} taille={42} />
            <span><b>{manager.club}</b><small>{manager.divisionNom}</small></span>
          </div>
        )}
      </header>

      {/* ═══ LA LIMITE D'ÂGE ══════════════════════════════════════════════════
          ⚠️ ELLE PASSE DEVANT TOUT LE RESTE, y compris « sans banc ». Le
          manager vieillissait d'un an par saison sans qu'aucune borne ne
          l'arrête, alors que le crible du classement refuse une fiche au-delà
          de `LIMITES.ageManagerMax` : une carrière tenue trop longtemps sortait
          du classement EN SILENCE. Elle se termine donc pour de bon, et l'écran
          dit pourquoi — comme l'épilogue d'une carrière de joueur, et pour la
          même raison : une partie qui s'arrête sans un mot se lit comme un
          bug. */}
      {finDAge ? (
        <div className="carte manager-sans-banc manager-fin-age">
          <div className="fin-age-icone" aria-hidden="true"><Icone nom="institution" taille={38} /></div>
          <h2>{t('mgr.finAgeTitre')}</h2>
          <p>{t('mgr.finAgeTexte', {
            nom: manager.nom, age: manager.age, max: LIMITES.ageManagerMax,
            saisons: manager.historique.length, titres: manager.palmares.length,
          })}</p>
          <button className="btn primaire grand" onClick={quitterBanc}>
            <Icone nom="trophee" taille={19} /> {t('mgr.finAgeBouton')}
          </button>
        </div>
      ) : sansBanc ? (
        <div className="carte manager-sans-banc">
          <h2>{t('mgr.sansClub')}</h2>
          <p>{t('mgr.sansClubTexte', {
            prestige: manager.prestige.toFixed(0), note: noteMaximale(manager.prestige).toFixed(0),
            niveau: etageAccessible(manager.prestige)?.nom ?? t('mgr.amateur'),
          })}</p>
          <div className="champ">
            <label htmlFor="banc">{t('mgr.bancsPortee', { n: bancsLibres.length })}</label>
            <Selecteur id="banc" options={optionsBancs} valeur={clubVise || optionsBancs[0]?.valeur || ''} onChange={setClubVise} recherche />
          </div>
          <button className="btn primaire grand" disabled={!optionsBancs.length} onClick={() => signerBanc(clubVise || optionsBancs[0].valeur)}>
            <Icone nom="signature" taille={18} /> {t('mgr.signer')}
          </button>
        </div>
      ) : (
        <>
          <div className="carte manager-date-permanente">
            <span><Icone nom="calendrier" taille={18} /> <b>{libelleDate(sem)}</b>{t("ui.cc2be010c13c", { v0: manager.saison, v1: manager.semaine, v2: SEMAINES_PAR_SAISON })}</span>
            <button className="btn primaire" onClick={() => setVue('calendrier')}>{t("ui.1085d81e388d")}</button>
          </div>
          {/* ⚠️ ONZE ONGLETS, ONZE TRACÉS — plus onze emoji. Un emoji est dessiné
              par Apple, Google ou Microsoft : la barre changeait d'aspect selon
              la machine, ses couleurs (un manteau bleu ciel, un livre rouge) ne
              sont pas celles du jeu, et sa ligne de base varie d'un système à
              l'autre — d'où des libellés qui ne s'alignaient pas entre eux. Les
              icônes de `components/Icone.tsx` prennent la couleur du texte, donc
              l'or de l'onglet actif. Voir « ÇA FAIT TROP IA » dans CLAUDE.md. */}
          <nav className="manager-onglets" aria-label={t('mgr.navigation')} data-tuto="mgr-onglets">
            <button data-tuto="mgr-onglet-bureau" className={vue === 'bureau' ? 'actif' : ''} onClick={() => setVue('bureau')}>
              <Icone nom="stade" taille={17} />{t("tb.club")}</button>
            <button data-tuto="mgr-onglet-equipe" className={vue === 'equipe' ? 'actif' : ''} onClick={() => setVue('equipe')}>
              <Icone nom="equipe" taille={17} />{t("online.nav.lineup")}</button>
            <button data-tuto="mgr-onglet-tresorerie" className={vue === 'tresorerie' ? 'actif' : ''} onClick={() => setVue('tresorerie')}>
              <Icone nom="euro" taille={17} />{t("ui.f40a457d4191")}</button>
            <button data-tuto="mgr-onglet-calendrier" className={vue === 'calendrier' || vue === 'match' ? 'actif' : ''} onClick={() => setVue('calendrier')}>
              <Icone nom="calendrier" taille={17} />{t("online.nav.calendar")}</button>
            <button data-tuto="mgr-onglet-marche" className={vue === 'marche' ? 'actif' : ''} onClick={() => setVue('marche')}>
              <Icone nom="monde" taille={17} /> {t('mgr.marche')}
            </button>
            <button data-tuto="mgr-onglet-ovale" className={vue === 'ovale' ? 'actif' : ''} onClick={() => { setVue('ovale'); ouvrirMessages(); }}>
              <Icone nom="ovale" taille={17} /> L’Ovale {alertesOvale > 0 && <i>{alertesOvale}</i>}
            </button>
            <button data-tuto="mgr-onglet-formation" className={vue === 'formation' ? 'actif' : ''} onClick={() => setVue('formation')}>
              <Icone nom="formation" taille={17} />{t("ui.76c3b86f6626")}</button>
            <button data-tuto="mgr-onglet-recruteurs" className={vue === 'recruteurs' ? 'actif' : ''} onClick={() => setVue('recruteurs')}>
              <Icone nom="loupe" taille={17} />{t("ui.364f4d5ac9b4")}{rapportsFrais > 0 && <i>{rapportsFrais}</i>}
            </button>
            <button data-tuto="mgr-onglet-entrainement" className={vue === 'entrainement' ? 'actif' : ''} onClick={() => setVue('entrainement')}>
              <Icone nom="halteres" taille={17} />{t("ui.c5c8664b7a6e")}</button>
            <button data-tuto="mgr-onglet-direction" className={vue === 'direction' ? 'actif' : ''} onClick={() => setVue('direction')}>
              <Icone nom="institution" taille={17} />{t("ui.1a925074120c")}</button>
            <button data-tuto="mgr-onglet-vestiaire" className={vue === 'vestiaire' ? 'actif' : ''} onClick={() => setVue('vestiaire')}>
              <Icone nom="maillot" taille={17} />{t("ui.7d2fafb0e9e7")}{(discussionsOuvertes.length + dossiersMedicaux.filter((d) => d.decision === 'attente').length) > 0 && <i>{discussionsOuvertes.length + dossiersMedicaux.filter((d) => d.decision === 'attente').length}</i>}
            </button>
            <button data-tuto="mgr-onglet-univers" className={vue === 'univers' ? 'actif' : ''} onClick={() => setVue('univers')}>
              <Icone nom="journal" taille={17} />{t("ch.monde")}</button>
            <button data-tuto="mgr-onglet-histoire" className={vue === 'histoire' ? 'actif' : ''} onClick={() => setVue('histoire')}>
              <Icone nom="livre" taille={17} />{t("online.nav.history")}</button>
          </nav>

          {vue === 'calendrier' && <CalendrierManager onMatch={() => setVue('match')} />}
          {vue === 'tresorerie' && <TresorerieManager manager={manager} onMarche={() => setVue('marche')} onStructures={() => setVue('formation')} />}

          {vue === 'bureau' && (
            <div className="manager-bureau">
              <section className="carte manager-club-resume" data-tuto="mgr-club">
                <div className="manager-club-resume-identite">
                  {fiche && <Blason club={fiche} taille={62} />}
                  <div>
                    <div className="eyebrow">{t("ui.36ff1195f183", { v0: manager.saison })}</div>
                    <h2>{manager.club}</h2>
                    <p>{comp && <LogoCompet id={comp.id} taille={19} />} {manager.divisionNom} · {texteTraduit(humeur.texte)}</p>
                  </div>
                </div>
                <div className="manager-resume-actions" data-tuto="mgr-actions">
                  <button className="btn fantome" onClick={() => setEcran('effectif')}><Icone nom="equipe" taille={16} />{t("online.nav.squad")}</button>
                  <button className="btn fantome" onClick={() => { setVue('ovale'); ouvrirMessages(); }}>𝕏 L’Ovale</button>
                  {/* ⚠️ L'AVANCE RAPIDE EST À CÔTÉ DE LA SEMAINE, PAS À SA PLACE.
                      Retour de jeu : « rajoute qu'on puisse simuler les semaines
                      comme dans la carrière joueur ». Elle ne s'affiche que
                      lorsqu'il n'y a rien à faire ce week-end — proposer de
                      sauter alors qu'un match attend serait proposer de
                      l'escamoter, ce que le mode « saison rapide » faisait et
                      qui lui a valu d'être supprimé. */}
                  {!(afficheManager && !resultatManager) && !manager.decision
                    && manager.semaine < SEMAINES_PAR_SAISON && (
                    <button className="btn fantome" onClick={avancerSemaines}>
                      <Icone nom="chrono" taille={16} /> {t('mgr.avancer')}
                    </button>
                  )}
                  <button className="btn primaire" data-tuto="mgr-semaine" onClick={() => {
                    if (afficheManager && !resultatManager) setVue('match'); else semaineManager();
                  }}>
                    {afficheManager && !resultatManager ? t("ui.010f4333aeb4") : t("mgr.semaineSuivante")}
                  </button>
                </div>
              </section>

              {/* ⚠️ UNE AVANCE MUETTE SE LIT COMME UN BOUTON CASSÉ. Le joueur
                  doit savoir combien de semaines sont parties ET ce qui l'a
                  arrêté — c'est exactement ce que la frise du calendrier fait
                  déjà côté carrière joueur. */}
              {avanceFaite && (
                <p className="manager-avance-bilan" role="status">
                  <Icone nom="chrono" taille={14} />{' '}
                  {t('mgr.avanceFaite', { n: avanceFaite.semaines })}
                  {' · '}{t(`mgr.avanceArret.${avanceFaite.arret}`)}
                  <button type="button" className="btn fantome petit" onClick={() => setAvanceFaite(null)}>
                    <Icone nom="croix" taille={13} />
                  </button>
                </p>
              )}

              <section className="manager-kpis" aria-label={t("ui.1727855df4ce")} data-tuto="mgr-kpis">
                <article className="carte"><small>{t("tb.classement")}</small><b>{maLigne ? `${maLigne.position}e` : '—'}</b><span>{t("ui.5a2866966f4c", { v0: maLigne?.points ?? 0 })}</span></article>
                <article className="carte"><small>{t("ui.72c99b14f290")}</small><b>{manager.objectif}e</b><span>{maLigne && maLigne.position <= manager.objectif ? t("ui.ce99b4c2d577") : t("ui.a2feabf0e59a")}</span></article>
                <article className="carte"><small>{t("ui.e8ebf252e98c")}</small><b>{force.toFixed(1)}</b><span>{t('compo.effectifTotal', { n: effectifComplet.length })}{indisponibles.length ? ` · ${t('compo.indisponibles', { n: indisponibles.length })}` : ''}</span></article>
                <article className="carte"><small>{t("ui.4be6b046a5de")}</small><b>{Math.round(manager.confiance)}%</b><span>{texteTraduit(humeur.texte)}</span></article>
                <article className="carte"><small>{t("mgr.budgetTransferts")}</small><b>{nombre(manager.budgetTransferts)} €</b><span>{t("ui.a3aca502f7ff", { v0: nombre(salaires?.disponible ?? 0) })}</span></article>
                <article className="carte"><small>{t("ui.b912533f7f9a")}</small><b>{nombre(manager.budgetStructure)} €</b><span>{t("ui.248327833f88", { v0: murs.formation, v1: murs.recrutement, v2: murs.entrainement })}</span></article>
              </section>

              <section className="carte manager-classement-complet" data-tuto="mgr-classement">
                <div className="comp-tete">
                  <div><b><Icone nom="resultats" taille={16} />{t("ui.b82c15fd7ceb", { v0: manager.divisionNom })}</b><small>{t("ui.1193ecba856d")}</small></div>
                  <button onClick={() => setEcran('tableau')}>{t("ui.eecc9ea176d1")}</button>
                </div>
                <div className="manager-table-classement" role="region" aria-label={t("ui.895eb6ddece6", { v0: manager.divisionNom })} tabIndex={0}>
                  <table>
                    <thead><tr><th>#</th><th>{t("tb.club")}</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>{t('ui.pointsCourts')}</th></tr></thead>
                    <tbody>
                      {classementVisible.map((l) => {
                        const club = clubParNom(l.club);
                        return (
                          <tr key={l.club} className={l.club === manager.club ? 'moi' : ''}>
                            <td>{l.position}</td>
                            <th scope="row"><span>{club && <Blason club={club} taille={27} />}<b>{l.club}</b></span></th>
                            <td>{l.joues}</td><td>{l.gagnes}</td><td>{l.nuls}</td><td>{l.perdus}</td>
                            <td className={l.difference >= 0 ? 'positif' : 'negatif'}>{l.difference > 0 ? '+' : ''}{l.difference}</td>
                            <td><strong>{l.points}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="manager-bureau-bas">
                <article className="carte manager-prochain-match" data-tuto="mgr-prochain">
                  <div className="comp-tete"><b><Icone nom="ballon" taille={16} />{t("ui.bb38c927bf1a")}</b></div>
                  {/* ⚠️ DEUX NOMS NE FONT PAS UNE AFFICHE. Le jeu embarque
                      957 écussons et les montre partout ailleurs — atlas,
                      classements, cartes d'offres, feuille de match : la seule
                      case où l'on regarde « qui on joue dimanche » les
                      ignorait. `Blason` retombe déjà sur un écusson dessiné
                      quand le club n'a pas de logo, donc aucun club du monde ne
                      laisse un trou. */}
                  {afficheManager ? (
                    <div className="manager-mini-duel">
                      <span>
                        {clubParNom(afficheManager.match.domicile) && (
                          <Blason club={clubParNom(afficheManager.match.domicile)!} taille={38} />
                        )}
                        <i>{afficheManager.match.domicile}</i>
                      </span>
                      <strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : t("ui.8db1a2e199a2")}</strong>
                      <span>
                        {clubParNom(afficheManager.match.exterieur) && (
                          <Blason club={clubParNom(afficheManager.match.exterieur)!} taille={38} />
                        )}
                        <i>{afficheManager.match.exterieur}</i>
                      </span>
                    </div>
                  ) : <p>{t("ui.effd1f3fb157")}</p>}
                  {prochainesAffiches.length > 0 && <div className="manager-prochain-calendrier" aria-label={t("ui.b32e94da9fdf")}>
                    {prochainesAffiches.map(({ semaine: numero, affiche }) => <div key={affiche.cle}>
                      <span>S{numero} · {libelleAfficheManager(affiche, manager.divisionNom)}</span>
                      <b>{affiche.match.domicile} — {affiche.match.exterieur}</b>
                    </div>)}
                  </div>}
                </article>
                <article className="carte manager-journal">
                  <div className="comp-tete"><b><Icone nom="journal" taille={16} /> {t('mgr.journal')}</b></div>
                  <div className="journal">{[...journal].reverse().slice(0, 3).map((e) => <div key={e.id} className="entree"><b>{texteTraduit(e.titre)}</b><p>{e.texte}</p></div>)}</div>
                </article>
              </section>
              {/* ⚠️ LE PARCOURS EST DU CONTENU DE CET ONGLET, ET IL DOIT VIVRE
                  DEDANS. Il était rendu en FRÈRE de `.manager-bureau`, tout en
                  étant conditionné à `vue === 'bureau'` : hors de la zone qui
                  défile, il gardait sa hauteur entière (une ligne par saison)
                  et se posait par-dessus le tableau de bord. */}
            {manager.historique.length > 0 && (
              <div className="carte bloc-competition manager-historique">
                <div className="comp-tete"><b><Icone nom="journal" taille={16} /> {t('mgr.parcours')}</b><span className="comp-count">{manager.historique.length}</span></div>
                <div className="classement-tableau tableau-live histo-manager">{[...manager.historique].reverse().map((h) => <div key={`${h.saison}-${h.club}`} className="classement-ligne"><span className="cl-pos">S{h.saison}</span><span className="cl-nom">{h.club}</span><span>{h.divisionNom}</span><span className={h.tenu ? 'cl-plus' : 'cl-moins'}>{h.rang}ᵉ / {h.objectif}ᵉ</span><span>{h.titres.map((id) => TROPHEES[id]?.nom ?? id).join(', ')}{h.montee && t("ui.a150d3029ccb")}{h.descente && t("ui.ca1aec691065")}{h.licencie && t("ui.42e7fa54fd94")}</span></div>)}</div>
              </div>
            )}
            </div>
          )}

          {vue === 'direction' && avancee && (
            <div className="manager-avance-grille">
              <section className="carte avance-entete">
                <div><div className="eyebrow">{t("ui.745c236e209b", { v0: manager.saison })}</div><h2><Icone nom="institution" taille={20} />{t("ui.e87fb964a2cb")}</h2><p>{t("ui.7eaafeab4d0a")}</p></div>
                <div className={`avance-score ${manager.confiance < CONFIANCE_LICENCIEMENT + 12 ? 'danger' : ''}`}><b>{Math.round(manager.confiance)}</b><span>{t("ui.91335fba6c07")}</span></div>
              </section>

              {decisionStrategique && <section className="carte decision-strategique-manager">
                <div className="eyebrow">{t("ui.0c4e244cc098", { v0: decisionStrategique.choix[0]?.duree ?? 3 })}</div>
                <h2>{texteTraduit(decisionStrategique.titre)}</h2><p>{texteTraduit(decisionStrategique.texte)}</p>
                <div>{decisionStrategique.choix.map((choix) => <button key={choix.id} onClick={() => repondreDecisionStrategique(decisionStrategique.id, choix.id)}><b>{texteTraduit(choix.label)}</b><span>{choix.consequence}</span><small>{t("ui.c297e99d0967", { v0: choix.confianceDirection >= 0 ? '+' : '', v1: choix.confianceDirection, v2: choix.confianceSupporters >= 0 ? '+' : '', v3: choix.confianceSupporters })}</small></button>)}</div>
              </section>}

              <section className="avance-objectifs">
                {objectifsAvances.map((objectif) => {
                  return <article className={`carte objectif-board ${objectif.etat}`} key={objectif.id}>
                    <header><span>{objectif.categorie}</span><b>{'★'.repeat(objectif.importance)}{'☆'.repeat(3 - objectif.importance)}</b></header>
                    <h3>{texteTraduit(objectif.titre)}</h3><p>{texteTraduit(objectif.detail)}</p>
                    <b className="objectif-mesure">{texteTraduit(objectif.libelle)}</b>
                    <i><em style={{ width: `${objectif.pourcentage}%` }} /></i><small>{t("ui.b1f8751f5777", { v0: objectif.atteint ? t("ui.9e92f59cd775") : t("sv.enCours") })}</small>
                  </article>;
                })}
              </section>
              {avancee?.dernierBilanObjectifs && <details className="carte bilan-objectifs-manager">
                <summary>{t("ui.9de9be6e7d56", { v0: avancee.dernierBilanObjectifs.saison, v1: avancee.dernierBilanObjectifs.club })}</summary>
                <ul>{avancee.dernierBilanObjectifs.objectifs.map((o) => <li key={o.id}><b>{o.etat === 'reussi' ? t("ui.06f2825af70d") : t("ui.0fe99be7d807")}</b> — {texteTraduit(o.titre)}</li>)}</ul>
              </details>}

              {profonde && <section className="carte delegation-manager">
                <div className="comp-tete"><div><b><Icone nom="entraineur" taille={16} />{t("ui.2a92bd50f17a")}</b><small>{t("ui.62a14282dff0")}</small></div><span className="comp-count">{DOMAINES_DELEGATION.filter((d) => profonde.delegations[d]).length}/9</span></div>
                <div className="delegation-contenu">
                  <div className="fiche-directeur-sportif"><div><span>{t("ui.fbb42839c55a")}</span><h3>{profonde.directeurSportif.nom}</h3><small>{t("ui.f36a696086e3", { v0: profonde.directeurSportif.reputation, v1: nombre(profonde.directeurSportif.salaire) })}</small></div><div>{[
                    ['Évaluation', profonde.directeurSportif.evaluation], ['Recrutement', profonde.directeurSportif.recrutement], ['Négociation', profonde.directeurSportif.negociation], ['Formation', profonde.directeurSportif.formation], ['Staff', profonde.directeurSportif.gestionStaff], ['Tactique', profonde.directeurSportif.tactique],
                  ].map(([label, valeur]) => <label key={String(label)}><span>{label}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></label>)}</div></div>
                  <div className="grille-delegations">{DOMAINES_DELEGATION.map((domaine) => <label key={domaine} className={profonde.delegations[domaine] ? 'delegue' : ''}><input type="checkbox" checked={profonde.delegations[domaine]} onChange={(e) => configurerDelegation(domaine, e.target.checked)} /><span><b>{LIBELLES_DELEGATION[domaine]}</b><small>{profonde.delegations[domaine] ? t("ui.a9a52fe31d98", { v0: profonde.directeurSportif.nom }) : t("ui.92176e2ec905")}</small></span></label>)}</div>
                </div>
                {!!profonde.decisionsDeleguees.length && <div className="journal-delegations">{profonde.decisionsDeleguees.slice().reverse().slice(0, 5).map((d) => <article key={d.id} className={d.qualite}><span>{d.qualite === 'bonne' ? '✓' : d.qualite === 'mauvaise' ? '!' : '•'}</span><div><b>{texteTraduit(d.titre)}</b><small>{t("ui.89bf5f21d1a4", { v0: d.saison, v1: d.semaine, v2: d.score })}</small><p>{texteTraduit(d.detail)}</p></div></article>)}</div>}
              </section>}

              {vieProfonde && <section className="carte politique-club-manager">
                <div className="president-manager"><div className="eyebrow">{t("ui.1b3b9ae175d3", { v0: vieProfonde.president.type })}</div><h3>{vieProfonde.president.nom}</h3><p>{t("ui.85eb3036e8fc", { v0: vieProfonde.president.depuis })}</p><div>{[['Patience', vieProfonde.president.patience], ['Ambition', vieProfonde.president.ambition], ['Finances', vieProfonde.president.finances], ['Formation', vieProfonde.president.formation], ['Local', vieProfonde.president.localisme]].map(([label, valeur]) => <span key={String(label)}><small>{label}</small><b>{valeur}</b></span>)}</div></div>
                <div className="confiances-club"><h3>{t("ui.6f5254f93adf")}</h3><div><span><small>{t("ui.1a925074120c")}</small><b>{Math.round(manager.confiance)}</b></span><span className={(vieProfonde.supporters.confiance < 45 ? 'danger' : '')}><small>{t("ui.39884130e9af")}</small><b>{vieProfonde.supporters.confiance}</b></span></div><ul>{vieProfonde.supporters.motifs.slice(0, 4).map((motif, index) => <li key={`${motif.saison}-${motif.semaine}-${index}`} className={motif.delta >= 0 ? 'positif' : 'negatif'}>{motif.delta >= 0 ? '✓' : '✕'} {motif.texte} <b>{motif.delta >= 0 ? '+' : ''}{motif.delta}</b></li>)}</ul></div>
              </section>}

              <section className="carte direction-contrat">
                <div><div className="eyebrow">{t("ui.517064cc36ac")}</div><h3>{t("ui.9bfe4631c917", { v0: manager.contrat?.saisons ?? 0, v1: nombre(manager.contrat?.salaire ?? 0) })}</h3><p>{t("ui.0649952a6a14")}</p></div>
                <div><button className="btn fantome" onClick={negocierContrat}>{t("ui.91a02bd8cafa")}</button><button className="btn danger" onClick={() => setDemission(true)}>{t("ui.292b1df68a76")}</button></div>
              </section>

              <section className="carte direction-marche-coachs">
                <div className="comp-tete"><div><b><Icone nom="poignee" taille={16} />{t("ui.fe99d9027585")}</b><small>{t("ui.d8c3935a4f13")}</small></div><span className="comp-count">{avancee.offresBanc.filter((o) => o.statut === 'offre').length}</span></div>
                <div className="direction-candidature">
                  <Selecteur options={optionsBancs.filter((o) => o.valeur !== manager.club)} valeur={clubVise || optionsBancs.find((o) => o.valeur !== manager.club)?.valeur || ''} onChange={setClubVise} recherche />
                  <button className="btn fantome" onClick={() => postulerBanc(clubVise || optionsBancs.find((o) => o.valeur !== manager.club)?.valeur || '')}>{t("ui.de326f095a2b")}</button>
                </div>
                <div className="offres-coachs">
                  {avancee.offresBanc.slice().reverse().slice(0, 8).map((offre) => <article key={offre.id}>
                    <span><b>{offre.club}</b><small>{t("ui.d6a485854319", { v0: COMPETITIONS.find((c) => c.id === offre.division)?.nom ?? offre.division, v1: nombre(offre.salaire), v2: offre.duree })}</small></span>
                    {offre.statut === 'offre' ? <button onClick={() => accepterOffreBanc(offre.id)}>{t("ui.deeee7b0b318")}</button> : <em>{offre.statut === 'refusee' ? t("ui.fdf008591082") : offre.statut}</em>}
                  </article>)}
                  {!avancee.offresBanc.length && <p className="manager-vide-texte">{t("ui.6e4fa11fdd3e")}</p>}
                </div>
              </section>

              {(avancee.propositionSelection || selectionManager) && <section className="carte direction-selection">
                <div className="comp-tete"><div><b><Icone nom="monde" taille={16} />{t("ui.dcec05d5a8fc")}</b><small>{t("ui.32986215d0f9")}</small></div></div>
                {avancee.propositionSelection && <div className="proposition-selection"><h3>{t("ui.64b6b6ac6305", { v0: avancee.propositionSelection.nation })}</h3><p>{t("ui.4609a3ac4421")}</p><div><button className="btn primaire" onClick={() => repondreSelection(true)}>{t("pub.accepter")}</button><button className="btn fantome" onClick={() => repondreSelection(false)}>{t("pub.refuser")}</button></div></div>}
                {selectionManager && <div className="selection-manager-kpis"><span><small>{t("tb.selection")}</small><b>{selectionManager.nation}</b></span><span><small>{t("attr.reputation")}</small><b>{selectionManager.reputation}</b></span><span><small>{t("ui.bbd2160534f8")}</small><b>{selectionManager.matchs}</b></span><span><small>{t("ui.728aebda41f6")}</small><b>{selectionManager.victoires}</b></span>{rencontreSelection && <button className="btn primaire" onClick={() => setMatchSelectionOuvert(true)}>{t("ui.b2cb1dbf86fe", { v0: rencontreSelection.adversaire })}</button>}</div>}
              </section>}
            </div>
          )}

          {vue === 'vestiaire' && avancee && (
            <div className="manager-avance-grille">
              <section className="carte avance-entete"><div><div className="eyebrow">{t("ui.ca0f17627186")}</div><h2><Icone nom="maillot" taille={20} />{t("ui.f2f5a058a9ed")}</h2><p>{t("ui.58862c612d2a")}</p></div><div className="avance-score"><b>{moyenneVestiaire(avancee)}</b><span>{t("ui.bce2966c0b0d")}</span></div></section>

              {profonde && <section className="carte capitaines-manager">
                <div className="comp-tete"><div><b><Icone nom="brassard" taille={16} />{t("ui.226777177cb1")}</b><small>{t("ui.cb53dfaf443c")}</small></div></div>
                <div>{[
                  ['Capitaine', profonde.capitaines.capitaineId || manager.composition.capitaineId, (id: string) => definirHierarchieCapitaines(id, profonde.capitaines.viceCapitaineId, profonde.capitaines.troisiemeCapitaineId)],
                  ['Vice-capitaine', profonde.capitaines.viceCapitaineId, (id: string) => definirHierarchieCapitaines(profonde.capitaines.capitaineId || manager.composition.capitaineId, id, profonde.capitaines.troisiemeCapitaineId)],
                  ['3e capitaine', profonde.capitaines.troisiemeCapitaineId, (id: string) => definirHierarchieCapitaines(profonde.capitaines.capitaineId || manager.composition.capitaineId, profonde.capitaines.viceCapitaineId, id)],
                ].map(([label, valeur, changer]) => <label key={String(label)}><span>{String(label)}</span><Selecteur
                  options={[
                    { valeur: '', label: 'Non désigné' },
                    ...effectifBrut.map((j) => ({
                      valeur: j.id,
                      label: j.nom,
                      sous: `${j.age} ans · ${nomPoste(j.poste)}`,
                    })),
                  ]}
                  valeur={String(valeur)}
                  onChange={changer as (id: string) => void}
                  recherche
                /></label>)}</div>
              </section>}

              {!!discussionsOuvertes.length && <section className="discussions-joueurs">
                {discussionsOuvertes.map((discussion) => <article className="carte discussion-joueur" key={discussion.id}><header><span>{discussion.nom}</span><em>{discussion.type}</em></header><blockquote>{discussion.texte}</blockquote><div><button onClick={() => repondreDiscussion(discussion.id, 'promettre')}>{t("ui.cd11a4937743")}</button><button onClick={() => repondreDiscussion(discussion.id, 'merite')}>{t("ui.44caa996edc4")}</button><button onClick={() => repondreDiscussion(discussion.id, 'aucunePromesse')}>{t("ui.ca86a4618200")}</button><button className="danger" onClick={() => repondreDiscussion(discussion.id, 'ecarter')}>{t("ui.1c3a594c305c")}</button></div></article>)}
              </section>}

              <section className="carte hierarchie-vestiaire">
                <div className="comp-tete"><div><b><Icone nom="equipe" taille={16} />{t("ui.7cd6d1756013")}</b><small>{t("ui.369535fe7f3b")}</small></div></div>
                <div>{Object.values(avancee.vestiaire).sort((a, b) => ['leader', 'influent', 'groupe', 'nouveau'].indexOf(a.rang) - ['leader', 'influent', 'groupe', 'nouveau'].indexOf(b.rang) || b.satisfaction - a.satisfaction).map((profil) => {
                  const agent = joueurAgent(avancee, profil.joueurId);
                  return <article key={profil.joueurId}><span className={`rang-vestiaire ${profil.rang}`}>{profil.rang}</span><b>{profil.nom}</b><small>{profil.traits.join(' · ')}</small><i><em style={{ width: `${profil.satisfaction}%` }} /></i><strong>{profil.satisfaction}</strong><span>{profil.soutien ? <><Icone nom="poignee" taille={13} />{t("ml.act.soutien")}</> : <><Icone nom="alerte" taille={13} />{t("ui.6631e845b2e8")}</>}</span><small>{agent ? t("ui.328bb8e63bfa", { v0: agent.nom, v1: agent.relationManager }) : ''}</small></article>;
                })}</div>
              </section>

              <section className="carte contrats-effectif-manager">
                <div className="comp-tete"><div><b><Icone nom="signature" taille={16} />{t("ui.8cf044680897")}</b><small>{t("ui.909420981e2f")}</small></div><span className="comp-count">{Object.values(avancee.contratsJoueurs).filter((c) => c.club === manager.club).length}</span></div>
                <div>{effectifBrut.map((j) => ({ j, c: avancee.contratsJoueurs[j.id] })).filter(({ c }) => c).sort((a, b) => a.c.fin - b.c.fin || b.c.interetExterieur - a.c.interetExterieur).map(({ j, c }) => {
                  const nego = manager.negociations.findLast((n) => n.joueur.id === j.id && n.nature !== 'recrutement');
                  const mois = moisRestantsContrat(c.fin, manager.saison, manager.semaine);
                  const palier = palierContrat(mois);
                  const dispo = disponibiliteJoueur(avancee.profilsMedicaux[j.id], manager.saison);
                  return <article key={j.id} className={`${c.demandeRevalorisation ? 'revalorisation ' : ''}palier-${palier}`}>
                    <span><b>{j.nom}</b><small>{t("ui.6d13dd4d9743", { v0: c.role, v1: c.fin, v2: c.option === 'aucune' ? t("ui.0300a63d8988") : t("ui.cd2d99d756f4", { v0: c.option }) })}</small></span>
                    {/* ⚠️ LE COMPTE À REBOURS EST LA VRAIE INFORMATION. « Fin
                        S4 » ne dit pas s'il faut agir cette semaine ; « 6 mois »
                        si. Les paliers viennent de `palierContrat`, la seule
                        définition, et colorent la ligne. */}
                    <div className={`echeance-contrat ${palier}`}><small>{t("ui.394c96234324")}</small><strong>{mois <= 0 ? t("mgr.libreGratuit") : t("ui.43a5293487af", { v0: mois })}</strong></div>
                    <div><small>{t("of.salaire")}</small><strong>{c.salaire > 0 ? `${nombre(c.salaire)} €` : t("mgr.amateur")}</strong></div>
                    <div><small>{t("ui.07674f7ecdcb")}</small><strong>{c.satisfaction}/100</strong></div>
                    <div><small>{t("ui.a75a02969ec8")}</small><strong>{c.attachement}/100{c.formeAuClub ? t("ui.697be59d8b4d") : ''}</strong></div>
                    <div><small>{t("online.collection.status")}</small><strong>{dispo.possibles ? `${dispo.part}%` : '—'}</strong></div>
                    <div><small>{t("ui.57028eb9694d")}</small><strong>{t("ui.168b895b1689", { v0: c.interetExterieur, v1: c.offresExterieures })}</strong></div>
                    <small className="motivations-contrat">{c.motivations.map((m) => `${m.type} ${m.importance}`).join(' · ')}{palier === 'danger' ? t("ui.dc2fe6d10248") : palier === 'libre' ? t("ui.1d7c27822bda") : ''}</small>
                    <button className={c.demandeRevalorisation ? 'danger' : ''} disabled={nego?.etat === 'signee' && nego.saison === manager.saison} onClick={() => ouvrirRenegociationJoueur(j.id)}>{nego?.etat === 'ouverte' || nego?.etat === 'accord' ? t("ui.302b36b46694") : c.demandeRevalorisation ? t("ui.05bdbd2100e7") : c.fin <= manager.saison + 1 ? t("ui.dc943ee62ae4") : t("ui.e79b4886f0ac")}</button>
                  </article>;
                })}</div>
              </section>

              {profonde && <section className="carte relations-joueurs-manager">
                <div className="comp-tete"><div><b><Icone nom="poignee" taille={16} />{t("ui.aa5a9257ef36")}</b><small>{t("ui.8138d367a04f")}</small></div><span className="comp-count">{profonde.relations.length}</span></div>
                <div>{profonde.relations.filter((r) => effectifBrut.some((j) => j.id === r.joueurA) && effectifBrut.some((j) => j.id === r.joueurB)).slice(0, 18).map((relation) => { const a = effectifBrut.find((j) => j.id === relation.joueurA); const b = effectifBrut.find((j) => j.id === relation.joueurB); return <article key={relation.id} className={relation.type}><span><b>{a?.nom}</b><i>↔</i><b>{b?.nom}</b></span><em>{relation.type}</em><div><i><em style={{ width: `${relation.intensite}%` }} /></i><strong>{relation.intensite}</strong></div></article>; })}</div>
              </section>}

              {profonde && <section className="carte integration-joueurs-manager">
                <div className="comp-tete"><div><b><Icone nom="monde" taille={16} />{t("ui.6bf6318c18cd")}</b><small>{t("ui.e019b087f59b")}</small></div></div>
                <div className="table-integration-entete"><span>{t("ml.joueur")}</span><span>{t("compoSolo.nation")}</span><span>{t("tb.club")}</span><span>{t("reg.langue")}</span><span>{t("compo.cohesion")}</span><span>{t("ui.9c466199f8ec")}</span></div>
                {effectifBrut.map((j) => profonde.integrations[j.id]).filter(Boolean).sort((a, b) => a.cohesion - b.cohesion).slice(0, 20).map((integration) => <article key={integration.joueurId}><span><b>{integration.nom}</b><small>{t("ui.682ac8b99ac6", { v0: nomNation(integration.nation), v1: integration.adaptabilite })}</small></span>{[
                  integration.adaptationPays, integration.adaptationClub, integration.langue, integration.cohesion,
                ].map((valeur, index) => <div key={index}><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></div>)}<em>{integration.ambitionRevelee ? integration.ambition.replace(/([A-Z])/g, ' $1').toLowerCase() : t("ui.d2919215537f")}<small>{integration.preferenceAvenir !== 'indecis' ? t("ui.b6c8323d0548", { v0: integration.preferenceAvenir }) : ''}</small></em></article>)}
              </section>}

              <section className="carte promesses-manager">
                <div className="comp-tete"><div><b><Icone nom="signature" taille={16} />{t("ui.b89703cc1258")}</b><small>{t("ui.2e2179c41124")}</small></div><span className="comp-count">{avancee.promesses.filter((p) => p.etat === 'active').length}</span></div>
                {avancee.promesses.slice().reverse().slice(0, 12).map((p) => <article key={p.id} className={p.etat}><span><b>{p.nom}</b><small>{t("ui.40a7118bd0ae", { v0: p.type, v1: p.echeance })}</small></span><progress value={p.progression} max={p.objectif} /><strong>{p.progression}/{p.objectif}</strong><em>{p.etat}</em></article>)}
                {!avancee.promesses.length && <p className="manager-vide-texte">{t("ui.559d3a51b54f")}</p>}
              </section>

              <section className="carte infirmerie-manager">
                <div className="comp-tete"><div><b><Icone nom="soin" taille={16} />{t("ui.e44b5cde8dfe")}</b><small>{t("ui.4dd06f9a927b")}</small></div><span className="comp-count">{dossiersMedicaux.length}</span></div>
                {dossiersMedicaux.map((d) => {
                  const phase = d.phase ?? 'diagnostic';
                  const profil = avancee.profilsMedicaux[d.joueurId];
                  const diagnosticEnAttente = phase === 'suspicion';
                  const reprise = phase === 'reprise';
                  return <article key={d.id} className={`phase-${phase}`}><header><span><b>{d.nom}</b><small>{diagnosticEnAttente ? d.diagnosticInitial : d.type} · {d.zone} · {d.origine}{d.minute ? t("ui.66d46970dc6e", { v0: d.minute }) : ''}</small></span><strong>{phase} · {d.disponibilite}%</strong></header>
                    <div className="medical-fitness"><span><small>{t("ui.6d68762ee5ae")}</small><b>{d.guerison ?? 0}%</b></span><span><small>{t("compo.condition")}</small><b>{d.condition ?? 0}%</b></span><span><small>{t("online.tactics.rhythm")}</small><b>{d.rythme ?? 0}%</b></span><span><small>{t("ui.690a1603cb9d")}</small><b>{d.risqueRechute ?? d.risqueAggravation}%</b></span></div>
                    <p>{diagnosticEnAttente ? t("ui.22674c59c531", { v0: d.diagnosticDans ?? 0 }) : t("ui.33d78c250cb6", { v0: d.semaines, v1: d.douleur })}{d.protocoleCommotion && t("ui.31df7c75a49b")}{profil?.historique.length ? t("ui.3d743caf4bfe", { v0: profil.historique.length, v1: profil.commotions }) : ''}</p>
                    {diagnosticEnAttente ? <em>{t("ui.a242fdd3fa03")}</em> : d.decision === 'attente' ? <div>{reprise ? <><button onClick={() => deciderMedical(d.id, 'reserve')}>{t("ui.ba2d4d66dc9a")}</button><button onClick={() => deciderMedical(d.id, 'reprise20')}>{t("ui.cd04501cb57e")}</button><button onClick={() => deciderMedical(d.id, 'reprise40')}>{t("ui.a5d3a8e3c12d")}</button><button className="danger" onClick={() => deciderMedical(d.id, 'retourDirect')}>{t("ui.bdc8e4541c30")}</button></> : <><button onClick={() => deciderMedical(d.id, 'repos')}>{t("ui.03eefd3aecd7")}</button><button onClick={() => deciderMedical(d.id, 'disponible')}>{t("ui.139e2b374a78")}</button>{!d.protocoleCommotion && <button className="danger" onClick={() => deciderMedical(d.id, 'forcer')}>{t("ui.ff6b62455ff8")}</button>}</>}</div> : <em>{t("ui.20c51fa6227b", { v0: d.decision })}</em>}
                  </article>;
                })}
                {!dossiersMedicaux.length && <p className="manager-vide-texte">{t("ui.0a8b3e25dadc")}</p>}
              </section>

              {/* ⚠️ LA DISPONIBILITÉ EST UNE PAGE À PART, pas une ligne perdue
                  dans l'infirmerie. C'est le chiffre qu'on veut voir AVANT de
                  signer trois ans à un joueur de 32 ans : combien de matchs le
                  club a joués pendant qu'il était là, combien il en a été
                  réellement disponible, et ce que ses blessures lui ont coûté
                  en jours. Tout est compté match par match — jamais estimé. */}
              <section className="carte disponibilite-manager">
                <div className="comp-tete"><div><b><Icone nom="resultats" taille={16} />{t("ui.5c0431e908fb")}</b><small>{t("ui.5248691481b1")}</small></div></div>
                <div className="table-disponibilite-entete"><span>{t("ml.joueur")}</span><span>{t("ui.019555d0a970")}</span><span>{t("ui.f4e4f699637b")}</span><span>{t("ui.2f36b8f61295")}</span><span>{t("ui.eed2c8c4ac67")}</span><span>{t("ui.e968ef99278e")}</span></div>
                {effectifBrut.map((j) => ({ j, d: disponibiliteJoueur(avancee.profilsMedicaux[j.id], manager.saison), p: avancee.profilsMedicaux[j.id] }))
                  .filter(({ d }) => d.possibles > 0)
                  .sort((a, b) => a.d.part - b.d.part).slice(0, 20)
                  .map(({ j, d, p }) => <article key={j.id} className={d.part < 70 ? 'fragile' : d.part < 88 ? 'moyenne' : ''}>
                    <span><b>{j.nom}</b><small>{t("ui.7003bc4ae18f", { v0: j.age, v1: nomPoste(j.poste), v2: p?.commotions ? t("ui.ce28314b3bbc", { v0: p.commotions }) : '' })}</small></span>
                    <strong>{d.possibles}</strong><strong>{d.disponibles}</strong><strong>{d.titularisations}</strong>
                    <strong>{d.joursBlesse}</strong>
                    <em><i><b style={{ width: `${d.part}%` }} /></i>{d.part}%</em>
                    <small className="historique-blessures">{(p?.historique ?? []).slice(-4).reverse()
                      .map((h) => `${h.type} — ${h.jours ?? '?'} j`).join(' · ') || t("ui.1777740f986f")}</small>
                  </article>)}
                {!effectifBrut.some((j) => disponibiliteJoueur(avancee.profilsMedicaux[j.id], manager.saison).possibles > 0)
                  && <p className="manager-vide-texte">{t("ui.c2d189a955be")}</p>}
              </section>

              {!!approchesEnCours.length && <section className="carte approches-manager">
                <div className="comp-tete"><div><b><Icone nom="monde" taille={16} />{t("ui.467ab4ebf340")}</b><small>{t("ui.2efd161f00ef")}</small></div><span className="comp-count">{approchesEnCours.length}</span></div>
                {approchesEnCours.map((a) => <article key={a.id}>
                  <span><b>{a.nom}</b><small>{t("ui.e042b12e7b84", { v0: a.club, v1: a.division, v2: a.saisonsRestantes })}</small></span>
                  <strong>{nombre(a.offre)} €</strong>
                  <button onClick={() => { setVue('ovale'); ouvrirMessages(); }}>{t("car.repondre")}</button>
                </article>)}
              </section>}

              {!!convocationsActives.length && <section className="carte convocations-manager"><div className="comp-tete"><b><Icone nom="drapeau" taille={16} />{t("ui.617e44d7977b")}</b></div>{convocationsActives.map((c) => <p key={c.id}><b>{c.nom}</b> · {c.nation} · {c.competition}</p>)}</section>}
            </div>
          )}

          {vue === 'univers' && avancee && (
            <div className="manager-avance-grille univers-manager">
              <section className="carte avance-entete"><div><div className="eyebrow">{t("ui.b49f32130f08")}</div><h2><Icone nom="journal" taille={20} />{t("ui.fb9e7545edba")}</h2><p>{t("ui.d41ae8112271")}</p></div><div className="avance-score"><b>{avancee.actualites.length}</b><span>{t("ui.db7f9d63c35b")}</span></div></section>
              {profonde && <section className="carte profil-tactique-manager"><div className="comp-tete"><div><b><Icone nom="entraineur" taille={16} />{t("ui.bf72d5f6431c")}</b><small>{t("ui.5535f802143b")}</small></div><span className="comp-count">{t("ui.0c8fbc9f7840", { v0: profonde.profilManager.matchsObserves })}</span></div><div className="tags-manager">{profonde.tagsManager.map((tag) => <strong key={tag}>{tag}</strong>)}{!profonde.tagsManager.length && <small>{t("ui.4073a671a823")}</small>}</div><div className="axes-profil-manager">{[
                ['Jeu au large', profonde.profilManager.jeuAuLarge], ['Jeu au pied', profonde.profilManager.jeuAuPied], ['Possession', profonde.profilManager.possession], ['Rythme', profonde.profilManager.rythme], ['Défense agressive', profonde.profilManager.defenseAgressive], ['Conquête', profonde.profilManager.conquete],
              ].map(([label, valeur]) => <label key={String(label)}><span>{label}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></label>)}</div></section>}

              {vieProfonde && <section className="carte reputation-club-manager"><div className="comp-tete"><div><b><Icone nom="journal" taille={16} />{t("ui.ab4fb8198f9f")}</b><small>{t("ui.507749c2e279")}</small></div></div><div className="trois-reputations"><span><small>{t("ui.ca3dc612f47e")}</small><b>{vieProfonde.reputations.locale}</b></span><span><small>{t("online.packName.nationale")}</small><b>{vieProfonde.reputations.nationale}</b></span><span><small>{t("ui.027231111e61")}</small><b>{vieProfonde.reputations.internationale}</b></span></div><div className="profils-supporters">{Object.entries(vieProfonde.supporters.profils).map(([profil, part]) => <label key={profil}><span>{profil}</span><i><em style={{ width: `${part}%` }} /></i><b>{part}%</b></label>)}</div></section>}

              {vieProfonde && <section className="carte marketing-joueurs-manager"><div className="comp-tete"><div><b><Icone nom="etoile" taille={16} />{t("ui.557c7baa2030")}</b><small>{t("ui.f0a3cb749b37", { v0: nombre(vieProfonde.revenuMarketingDerniereSaison) })}</small></div></div><div>{Object.values(vieProfonde.popularites).sort((a, b) => b.locale - a.locale).slice(0, 16).map((p) => { const joueur = effectifBrut.find((j) => j.id === p.joueurId); return <article key={p.joueurId}><span><b>{p.nom}</b><small>{t("ui.62e53db15f63", { v0: joueur?.note ?? '—' })}</small></span><label><small>{t("ui.8c31e6e72230")}</small><b>{p.locale}</b></label><label><small>{t("ui.865b30e2fae6")}</small><b>{p.nationale}</b></label><label><small>{t("compo.statut.international")}</small><b>{p.internationale}</b></label><strong>{t("ui.dec62f4c7b55", { v0: p.marketing })}</strong></article>; })}</div></section>}
              <section className="carte fil-actualites-manager"><div className="comp-tete"><b>{t("ui.915beae42391")}</b></div>{avancee.actualites.slice().reverse().slice(0, 30).map((actu) => <article key={actu.id} className={`importance-${actu.importance}`}><span>{actu.categorie}</span><div><b>{texteTraduit(actu.titre)}</b><p>{actu.texte}</p><small>{t("ui.e8e7e9d57964", { v0: actu.saison, v1: actu.semaine, v2: actu.club && ` · ${actu.club}` })}</small></div></article>)}{!avancee.actualites.length && <p className="manager-vide-texte">{t("ui.97559aba9c02")}</p>}</section>

              {identiteClub && <section className="carte adn-club"><div className="comp-tete"><div><b><Icone nom="formation" taille={16} />{t("ui.3e40c90d28eb", { v0: manager.club })}</b><small>{t("ui.5de38cb52779")}</small></div></div><div className="traits-adn">{traitsDominants(identiteClub).map((axe) => <strong key={axe}>{axe}</strong>)}</div><div className="axes-adn">{Object.entries(identiteClub).map(([axe, valeur]) => <label key={axe}><span>{axe}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{Math.round(valeur)}</b></label>)}</div></section>}

              <section className="carte rivalites-manager"><div className="comp-tete"><div><b><Icone nom="sifflet" taille={16} />{t("ui.190d966943f8")}</b><small>{t("ui.6d20b4a56e1c")}</small></div></div>{rivalitesClub.map((r) => { const autre = r.clubs.find((c) => c !== manager.club); return <article key={r.clubs.join('-')}><span><b>{manager.club} — {autre}</b><small>{r.causes.join(' · ') || t("ui.606adfb4046c")}</small></span><i><em style={{ width: `${r.intensite}%` }} /></i><strong>{Math.round(r.intensite)}/100</strong></article>; })}{!rivalitesClub.length && <p className="manager-vide-texte">{t("ui.bdab7247c11e")}</p>}</section>

              <section className="carte monde-clubs-manager"><div className="comp-tete"><div><b><Icone nom="monde" taille={16} />{t("ui.23425edc8700")}</b><small>{t("ui.413d3773dc20")}</small></div><span className="comp-count">{Object.keys(avancee.clubsMonde).length}</span></div><div>{Object.values(avancee.clubsMonde).sort((a, b) => Math.abs(b.tendance) - Math.abs(a.tendance)).slice(0, 18).map((club) => { const coach = avancee.entraineursIA[club.entraineurId]; return <article key={club.club}><span><b>{club.club}</b><small>{club.strategie} · {club.professionnel ? t("ui.07ed400759a0") : t("ui.fa1a81f0b041")}</small></span><strong className={club.tendance >= 0 ? 'cl-plus' : 'cl-moins'}>{club.tendance > 0 ? '+' : ''}{club.tendance}</strong><small><Icone nom="euro" taille={12} /> {club.richesse} · <Icone nom="stade" taille={12} /> {club.infrastructures}</small><em>{t("ui.53f0bd72d7f9", { v0: coach?.nom, v1: coach?.contrat ?? 0 })}</em></article>; })}</div></section>
            </div>
          )}

          {vue === 'histoire' && avancee && (
            <div className="manager-avance-grille histoire-manager">
              <section className="carte avance-entete"><div><div className="eyebrow">{t("ui.348581b5652d")}</div><h2><Icone nom="livre" taille={20} />{t("ui.6bfdcd5b7df4")}</h2><p>{t("ui.5b2e0dfa90ad")}</p></div><div className="avance-score"><b>{Object.values(avancee.histoire).reduce((n, s) => n + s.length, 0)}</b><span>{t("ui.dba2d02770b9")}</span></div></section>
              {profonde && <section className="carte chronologie-annuelle-manager"><div className="comp-tete"><div><b><Icone nom="chrono" taille={16} />{t("ui.5802efac2412")}</b><small>{t("ui.89032be934ec")}</small></div><Selecteur options={[{ valeur: String(manager.saison), label: `Saison ${manager.saison}` }, ...saisonsMemoire.filter((s) => s !== manager.saison).map((s) => ({ valeur: String(s), label: `Saison ${s}` }))]} valeur={String(saisonChronologie)} onChange={(v) => setSaisonChronologie(Number(v))} /></div><div>{chronologieVisible.map((evenement) => <article key={evenement.id} className={`importance-${evenement.importance}`}><time>{evenement.mois}</time><span>{evenement.categorie}</span><div><b>{texteTraduit(evenement.titre)}</b><p>{evenement.texte}</p></div></article>)}{!chronologieVisible.length && <p className="manager-vide-texte">{t("ui.bed399ca7c6b")}</p>}</div></section>}

              {vieProfonde && <section className="carte records-club-manager"><div className="comp-tete"><div><b><Icone nom="trophee" taille={16} />{t("ui.faf7544461e6", { v0: manager.club })}</b><small>{t("ui.bd6a684befd5")}</small></div><span className="comp-count">{Object.keys(vieProfonde.records.club).length}</span></div><div>{Object.values(vieProfonde.records.club).map((record) => <article key={record.id}><span><b>{texteTraduit(record.libelle)}</b><small>{record.joueurNom || record.adversaire || t("ui.9266007e4870", { v0: record.saison })}</small></span><strong>{record.valeur.toLocaleString(locale())} {record.unite}</strong></article>)}{!Object.keys(vieProfonde.records.club).length && <p className="manager-vide-texte">{t("ui.1b6750ff440d")}</p>}</div><h3>{t("ui.43604d38b059")}</h3><div>{Object.values(vieProfonde.records.championnat).map((record) => <article key={record.id}><span><b>{texteTraduit(record.libelle)}</b><small>{t("ui.9266007e4870", { v0: record.saison })}</small></span><strong>{record.valeur.toLocaleString(locale())} {record.unite}</strong></article>)}</div></section>}

              {vieProfonde && <section className="carte xv-historique-manager"><div className="comp-tete"><div><b><Icone nom="maillot" taille={16} />{t("ui.57692f51ce84")}</b><small>{t("ui.b1dab76a5d94")}</small></div></div><div>{POSTES.map((poste) => { const joueur = vieProfonde.records.xvHistorique[poste.id]; return <article key={poste.id}><span className="numero-xv">{poste.numero}</span><span><small>{nomPoste(poste.id)}</small><b>{joueur?.nom ?? t("ui.e55a20613ddf")}</b></span><strong>{joueur ? t("ui.f99d49d0be01", { v0: joueur.scoreHistorique }) : '—'}</strong>{joueur && <small>{t("ui.1fe5e4d286dd", { v0: joueur.matchs, v1: joueur.essais, v2: joueur.capitanats })}</small>}</article>; })}</div></section>}

              {profonde && !!profonde.finsCarriere.length && <section className="carte fins-carriere-manager"><div className="comp-tete"><div><b><Icone nom="trophee" taille={16} />{t("ui.eb8183a34961")}</b><small>{t("ui.e26c5a84b658")}</small></div></div>{profonde.finsCarriere.slice().reverse().slice(0, 18).map((fin) => <article key={`${fin.joueurId}-${fin.saison}`} className={fin.hommage ? 'hommage' : ''}><span><b>{fin.nom}</b><small>{t("ui.3ddae707676a", { v0: fin.age, v1: fin.saison, v2: fin.choix })}</small></span><p>{fin.texte}</p>{fin.hommage && <strong><Icone nom="stade" taille={14} />{t("ui.ccc0e4152bb7")}</strong>}</article>)}</section>}
              <section className="carte palmares-competition"><div className="comp-tete"><b><Icone nom="trophee" taille={16} />{t("ui.6e0c00e8d232")}</b><Selecteur options={optionsDivisions} valeur={competitionHistoire} onChange={setCompetitionHistoire} recherche /></div>{archiveVisible.map((s) => <article key={s.saison}><strong>S{s.saison}</strong><span><b>{s.champion}</b><small>{s.finaliste ? t("ui.424199922e5e", { v0: s.finaliste }) : ''}</small></span><em>{s.montees.length ? `↑ ${s.montees.join(', ')}` : ''}{s.relegations.length ? ` · ↓ ${s.relegations.join(', ')}` : ''}</em></article>)}{!archiveVisible.length && <p className="manager-vide-texte">{t("ui.a6e18794fc75")}</p>}</section>
              <section className="carte hall-club-manager"><div className="comp-tete"><div><b><Icone nom="institution" taille={16} />{t("ui.5e391aab236b", { v0: manager.club })}</b><small>{t("ui.50a2b2ed74b2")}</small></div><span className="comp-count">{hallClub.length}</span></div>{hallClub.map((f) => <article key={f.id}><strong>{f.score}</strong><span><b>{f.nom}</b><small>{t("ui.78ea9028d576", { v0: f.rang, v1: f.saisonsAuClub, v2: f.matchsAuClub })}</small></span><em>{t("ui.ab49120c552c", { v0: f.titresAuClub })}</em></article>)}{!hallClub.length && <p className="manager-vide-texte">{t("ui.25dab538af00")}</p>}</section>
              <section className="carte carrieres-joueurs-manager"><div className="comp-tete"><div><b><Icone nom="resultats" taille={16} />{t("ui.a0589377da4b")}</b><small>{t("ui.c9bf2a549741")}</small></div><span className="comp-count">{avancee.carrieresJoueurs.length}</span></div>{avancee.carrieresJoueurs.slice().reverse().slice(0, 25).map((c) => { const total = totaux(c); return <details key={c.id}><summary><span><b>{c.nom}</b><small>{total.clubs.join(' → ')}</small></span><strong>{t("ui.4687ed6535fa", { v0: total.matchs, v1: total.essais, v2: total.selections })}</strong></summary><div>{c.saisons.map((s) => <p key={`${s.saison}-${s.club}`}><b>{s.resume ? t("ui.18b35be9efcb", { v0: s.saisonsResumees }) : `S${s.saison}`}</b>{t("ui.6adf9c1f792d", { v0: s.club, v1: s.matchs, v2: s.titularisations, v3: s.minutes, v4: s.essais, v5: s.note.toFixed(1) })}</p>)}</div></details>; })}</section>
              <section className="carte anciens-staff-manager"><div className="comp-tete"><div><b><Icone nom="entraineur" taille={16} />{t("ui.0625ebfc0b1e")}</b><small>{t("ui.99f5e85e3b18")}</small></div><span className="comp-count">{avancee.staffAnciens.length}</span></div>{avancee.staffAnciens.map((s) => <article key={s.id}><b>{s.nom}</b><span>{s.role}</span><small>{t("ui.eee4ba3b15ee", { v0: s.club, v1: s.reputation, v2: s.joueurDepuis })}</small></article>)}{!avancee.staffAnciens.length && <p className="manager-vide-texte">{t("ui.ffb10e38f9fd")}</p>}</section>
            </div>
          )}

          {vue === 'equipe' && (
            <div className="manager-equipe" data-tuto="mgr-composition">
              <section className="carte manager-composition-tete">
                <div>
                  <div className="eyebrow">{t('compo.feuilleEffectif', { feuille: composition.titulaires.length + composition.remplacants.length, effectif: effectifComplet.length })}</div>
                  <h2><Icone nom="equipe" taille={20} />{t("online.lineup.title")}</h2>
                  <p>{t("ui.6e4e24121ca3")}</p>
                </div>
                <div className="manager-compo-droite">
                  <button
                    type="button"
                    className="btn btn-meilleure-equipe"
                    onClick={() => {
                      const comp = meilleureCompositionManager(effectif, indisponiblesSet, etatsComposition);
                      definirComposition(comp);
                    }}
                    title={t('compo.meilleureEquipeAide')}
                  >
                    <Icone nom="eclair" taille={15} /> {t('compo.meilleureEquipe')}
                  </button>
                  <div className="manager-note-compo"><b>{noteCompositionManager(effectif, composition).toFixed(1)}</b><span>{t("compoSolo.ratingXV")}</span></div>
                </div>
              </section>

              <CadreCompositionManager>
              <CompositionTerrainManager
                rendreCarte={(j) => {
                  const c = cartesManagerCache.get(j.id);
                  const logoClubCourant = manager?.club ? clubParNom(manager.club)?.logo : undefined;
                  return c ? <CarteJoueurEnLigne carte={c} logoClub={logoClubCourant} compacte /> : null;
                }}
                effectif={effectif}
                effectifComplet={effectifComplet}
                composition={composition}
                onPlacer={changerJoueur}
                etats={etatsComposition}
                indisponibles={indisponiblesSet}
                automatismes={automatismesComposition}
                onCapitaine={(id) => definirComposition({ ...composition, capitaineId: id })}
                onButeur={(id) => definirComposition({ ...composition, buteurId: id })}
                onMeilleureEquipe={() => {
                  const comp = meilleureCompositionManager(effectif, indisponiblesSet, etatsComposition);
                  definirComposition(comp);
                }}
              />

              </CadreCompositionManager>
              <section className="carte manager-roles-visuels" data-tuto="mgr-roles">
                <div><b><Icone nom="profil" taille={16} />{t("ui.3cd9c1881580")}</b><span>{t("ui.b9e3c6abe1e3")}</span></div>
                <label data-tuto="mgr-role-capitaine">
                  <span><Icone nom="brassard" taille={14} />{t("pj.capitaine")}</span>
                  <Selecteur
                    options={optionsCapitaines}
                    valeur={composition.capitaineId}
                    onChange={(id) => { noter('coach.capitaine'); definirComposition({ ...composition, capitaineId: id }); }}
                    recherche
                  />
                </label>
                <label data-tuto="mgr-role-buteur">
                  <span><Icone nom="cible" taille={14} />{t("compo.buteur")}</span>
                  <Selecteur
                    options={optionsButeurs}
                    valeur={composition.buteurId}
                    onChange={(id) => { noter('coach.buteur'); definirComposition({ ...composition, buteurId: id }); }}
                    recherche
                  />
                </label>
                {/* Les autres rôles (Correctif 17) : vice-capitaine, buteur secondaire, engagements, drop, lanceurs. */}
                {([
                  ['viceCapitaineId', 'viceCapitaine', 'brassard'], ['buteur2Id', 'buteur2', 'poteaux'],
                  ['engagementId', 'engagement', 'engagement'], ['droppeurId', 'droppeur', 'drop'],
                  ['lanceurId', 'lanceur', 'lanceur'], ['lanceur2Id', 'lanceur2', 'lanceur'],
                ] as const).map(([champ, role, icone]) => (
                  <label key={champ} data-tuto={`role-${role}`}>
                    <span><Icone nom={icone} taille={14} />{t(`rv.role.${role}`)}</span>
                    <Selecteur
                      options={optionsAutresRoles}
                      valeur={composition[champ] ?? ''}
                      onChange={(id) => definirComposition({ ...composition, [champ]: id || undefined })}
                      recherche
                    />
                  </label>
                ))}
              </section>

              <section className="carte manager-plan-avant-match" data-tuto="mgr-tactique">
                <div className="comp-tete"><b><Icone nom="entraineur" taille={16} />{t("ui.fa3d2c1f17c1")}</b><span>{t("ui.04d4427cc715")}</span></div>
                <div className="manager-tactiques-selects">
                  <label><span>{t("compo.secteur.attaque")}</span><Selecteur options={optionsTactiques.attaque} valeur={manager.tactique.attaque} onChange={(v) => majTactique('attaque', v as TactiqueManager['attaque'])} /></label>
                  <label><span>{t("online.tactics.defense")}</span><Selecteur options={optionsTactiques.defense} valeur={manager.tactique.defense} onChange={(v) => majTactique('defense', v as TactiqueManager['defense'])} /></label>
                  <label><span>{t("online.tactics.rhythm")}</span><Selecteur options={optionsTactiques.rythme} valeur={manager.tactique.rythme} onChange={(v) => majTactique('rythme', v as TactiqueManager['rythme'])} /></label>
                  <label><span>{t("ui.4752bb854318")}</span><Selecteur options={optionsTactiques.penalites} valeur={manager.tactique.penalites} onChange={(v) => majTactique('penalites', v as TactiqueManager['penalites'])} /></label>
                  <label><span>{t("online.tactics.subs")}</span><Selecteur options={optionsTactiques.remplacements} valeur={manager.tactique.remplacements} onChange={(v) => majTactique('remplacements', v as TactiqueManager['remplacements'])} /></label>
                </div>
              </section>
            </div>
          )}

          {vue === 'match' && (
            <div className="manager-match-centre" data-tuto="mgr-match">
              {!afficheManager ? (
                <section className="carte manager-match-vide"><span><Icone nom="calendrier" taille={32} /></span><h2>{t("ui.3ebc7b10db2b")}</h2><p>{t("ui.e046ca836960")}</p><button className="btn primaire" onClick={semaineManager}>{t("ui.96dc682c2bc8")}</button></section>
              ) : (
                <section className="carte manager-affiche-match">
                  <div className="eyebrow">{libelleAfficheManager(afficheManager, manager.divisionNom)}</div>
                  {derbyMemo?.derby && (
                    <div className="manager-contexte-derby">
                      <span><Icone nom="flamme" taille={14} /> {texteTraduit(derbyMemo.libelle)} · {derbyMemo.distance} km</span>
                      <b>{t("ui.548cbdc6c614", { v0: derbyMemo.motivation })}</b>
                      <small>{t("ui.df49bfb2d0ca", { v0: derbyMemo.pression, v1: derbyMemo.medias })}</small>
                    </div>
                  )}
                  <div className="manager-duel">
                    <span>{clubParNom(afficheManager.match.domicile) && <Blason club={clubParNom(afficheManager.match.domicile)!} taille={54} />}<b>{afficheManager.match.domicile}</b></span>
                    <strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : t("ui.8db1a2e199a2")}</strong>
                    <span>{clubParNom(afficheManager.match.exterieur) && <Blason club={clubParNom(afficheManager.match.exterieur)!} taille={54} />}<b>{afficheManager.match.exterieur}</b></span>
                  </div>
                  {resultatManager ? (
                    <div className="manager-match-joue"><b><Icone nom="check" taille={14} />{t("ui.0e747b62e94d")}</b><p>{tn("ui.d3b31a092ea5", resultatManager.essaisPour, { v0: resultatManager.essaisPour })}</p><button className="btn primaire" onClick={semaineManager}>{manager.semaine >= SEMAINES_PAR_SAISON ? t("mgr.cloreSaison") : t("ui.96dc682c2bc8")}</button></div>
                  ) : (
                    <div className="manager-lancer-match"><p>{t("ui.4bb382ff1adf")}</p><div><button className="btn fantome" onClick={() => setVue('equipe')}><Icone nom="equipe" taille={16} />{t("ui.da1b992afed6")}</button><button className="btn primaire grand" data-tuto="mgr-lancer" onClick={() => setMatchOuvert(afficheManager)}><Icone nom="sifflet" taille={18} />{t("ui.db01ad9b4fe2")}</button></div></div>
                  )}
                </section>
              )}
            </div>
          )}

          {(vue === 'formation' || vue === 'recruteurs' || vue === 'entrainement') && (
            <div className={`manager-club manager-club-${vue}`}>
              <section className="carte manager-inst-tete">
                <div>
                  <div className="eyebrow">{t('mgr.inst.eyebrow')}</div>
                  <h2><Icone nom={vue === 'formation' ? 'formation' : vue === 'recruteurs' ? 'loupe' : 'halteres'} taille={20} /> {vue === 'formation' ? t("mgr.inst.formation.nom") : vue === 'recruteurs' ? t("ui.364f4d5ac9b4") : t("mgr.inst.entrainement.nom")}</h2>
                  <p>{vue === 'formation'
                    ? t("ui.eee93627e6a4")
                    : vue === 'recruteurs'
                      ? t("ui.82654c2c563f")
                      : t("ui.bafce733d664")}</p>
                </div>
                <div className="manager-note-compo manager-enveloppe">
                  <b>{nombre(manager.budgetStructure)} €</b>
                  <span>{t('mgr.inst.budget')}</span>
                </div>
              </section>

              <div className="manager-inst-grille">
                {([vue === 'formation' ? 'formation' : vue === 'recruteurs' ? 'recrutement' : 'entrainement'] as TypeInstallation[]).map((type) => {
                  const niveau = murs[type];
                  const cout = coutAmelioration(niveau);
                  const finance = cout !== null && manager.budgetStructure >= cout;
                  const n = Math.min(niveau, NIVEAU_INSTALLATION_MAX);
                  const effet = type === 'formation'
                    ? `Académie de ${capaciteAcademie(n)} places · coaching et progression renforcés.`
                    : type === 'entrainement'
                      ? t('mgr.inst.effet.entrainement', {
                        places: String(PLACES_ENTRAINEMENT[n]),
                        gain: GAIN_ENTRAINEMENT[n].toString().replace('.', ','),
                      })
                      : t('mgr.inst.effet.recrutement', {
                        clubs: String(CLUBS_OBSERVES[n]),
                        precision: INCERTITUDE_RECRUTEURS[n] === 0
                          ? t('mgr.inst.exact') : `± ${INCERTITUDE_RECRUTEURS[n]}`,
                      });
                  return (
                    <section className="carte manager-inst" key={type}>
                      <div className="inst-tete">
                        <span className="inst-emoji" aria-hidden="true"><Icone nom={ICONE_INSTALLATION[type]} taille={22} /></span>
                        <div>
                          <b>{t(`mgr.inst.${type}.nom`)}</b>
                          <p>{t(`mgr.inst.${type}.desc`)}</p>
                        </div>
                      </div>
                      <div className="inst-marches">
                        {Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => (
                          <i key={i} className={i < niveau ? 'pleine' : ''} />
                        ))}
                        <span>{t('mgr.inst.niveau', { n: String(niveau) })}</span>
                      </div>
                      <p className="inst-effet">{niveau > 0 ? effet : t('mgr.inst.rien')}</p>
                      <div className="inst-prix-fixes" aria-label={t("ui.5e18f7c2954d")}>{Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => <span key={i}>N{i + 1} · {nombre(coutAmelioration(i)!)} €</span>)}</div>
                      {cout === null ? (
                        <p className="inst-max">{t('mgr.inst.max')}</p>
                      ) : (
                        <button
                          className="btn primaire"
                          disabled={!finance}
                          onClick={() => ameliorerInstallation(type)}
                        >
                          {t('mgr.inst.ameliorer', { cout: nombre(cout) })}
                        </button>
                      )}
                      {cout !== null && !finance && <p className="inst-effet">{t("ui.14eea44513df", { v0: nombre(cout - manager.budgetStructure) })}</p>}
                    </section>
                  );
                })}
              </div>

              {vue === 'formation' && detectionJeunes && (
                <>
                  <section className="carte manager-centre-identite">
                    <div className="manager-centre-score">
                      <span>{t("ui.53b94201c693")}</span>
                      <b>{detectionJeunes.noteGlobale}</b>
                      <small>{t("ui.78be5f4235d4", { v0: detectionJeunes.portee, v1: nombre(detectionJeunes.rayon) })}</small>
                    </div>
                    <div className="manager-centre-notes" aria-label={t("ui.4b53a7bef1db")}>
                      {AXES_CENTRE.map((axe) => (
                        <div key={axe}>
                          <span><Icone nom={ICONE_AXE[axe]} taille={14} /> {axe === 'installations' ? t("ui.df2bd1e0e84b") : axe === 'coaching' ? t("ui.cf7f3e1a7568") : axe === 'recrutement' ? t("mgr.x.recrutement") : axe === 'reseau' ? t("ui.b5f96c04b748") : axe === 'medical' ? t("ui.75988e7c801b") : t("attr.reputation")}</span>
                          <b>{detectionJeunes.notes[axe]}</b>
                          <i><em style={{ width: `${detectionJeunes.notes[axe]}%` }} /></i>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="carte manager-academie">
                    <div className="comp-tete">
                      <div><b><Icone nom="formation" taille={16} />{t("ui.fb5736ec2496")}</b><small>{t("ui.7cb76e682a52")}</small></div>
                      <span className="comp-count">{academieClub.length}/{detectionJeunes.capacite}</span>
                    </div>
                    <div className="manager-formation-finances">
                      <span>{t("ui.c3c6daf72ba1")}</span>
                      <b>{nombre(revenusFormationClub)} €</b>
                      <small>{t("ui.50201a67a340")}</small>
                    </div>
                    {!academieClub.length ? (
                      <div className="manager-vide-action">
                        <span><Icone nom="pousse" taille={16} /></span>
                        <div><b>{t("ui.ef28a9ac173b")}</b><p>{t("ui.c2685ed0dd7c")}</p></div>
                        <button className="btn primaire" onClick={() => setVue('recruteurs')}>{t("ui.635ca9fe4598")}</button>
                      </div>
                    ) : (
                      <div className="manager-jeunes-grille">
                        {academieClub.map((j) => {
                          const estimation = ficheAcademicienManager(manager, j, detectionJeunes.notes);
                          const motifObservation = motifObservationJeune(manager, j.id, false, detectionJeunes);
                          const motifEntretien = motifObservationJeune(manager, j.id, true, detectionJeunes);
                          const progression = j.derniereProgression;
                          return (
                            <article className="manager-jeune-carte" key={j.id}>
                              <header>
                                <div className="manager-jeune-identite">
                                  <div className="manager-jeune-avatar" aria-hidden="true">
                                    <b>{initiales(j.nom)}</b>
                                    <i><Drapeau nation={j.nation} taille={0.72} /></i>
                                  </div>
                                  <div className="manager-jeune-titre">
                                    <span>{j.clubOrigine}</span>
                                    <h3>{j.nom}</h3>
                                    <p>{t("ui.7710ea7c753d", { v0: j.age, v1: nomPoste(j.poste), v2: j.taille / 100, v3: j.poids })}</p>
                                  </div>
                                </div>
                                <em className={`manager-categorie ${j.categorie}`}>{j.categorie === 'u18' ? 'U18' : j.categorie === 'pret' ? t("ui.3613a7f6a860") : t("ui.8886065bb775")}</em>
                              </header>
                              <div className="manager-jeune-kpis">
                                <span><small>{t("ui.2b5104f5fc26")}</small><b>{j.note.toFixed(1)}</b></span>
                                <span><small>{t("ui.144b7fdf586e")}</small><b>{etoiles(estimation.etoilesBas, estimation.etoilesHaut)}</b></span>
                                <span><small>{t("stats.minutes")}</small><b>{j.tempsDeJeu}%</b></span>
                                <span><small>{t("attr.moral")}</small><b>{j.moral}%</b></span>
                              </div>
                              <p className="manager-jeune-profil">{t("ui.144e1daa2c8d", { v0: niveauLisible(j.physique), v1: niveauLisible(j.technique), v2: niveauLisible(j.mental) })}{j.clubPret && <>{t("ui.59d0c19fed47")}<b>{j.clubPret}</b></>}
                              </p>
                              {progression && (
                                <p className={`manager-progression-annuelle${progression.blesse ? ' blesse' : ''}`}>{t("ui.9a453b67dedf", { v0: progression.saison, v1: progression.noteAvant.toFixed(1), v2: progression.noteApres.toFixed(1), v3: progression.resume })}</p>
                              )}
                              <div className="manager-actions-academie">
                                <button disabled={!!motifObservation} title={motifObservation ?? t("ui.e299b8aace19")} onClick={() => observerJeune(j.id)}>{t("ui.04b9487ad4f7", { v0: estimation.matchs })}</button>
                                <button disabled={!!motifEntretien} title={motifEntretien ?? t("ui.82c92d56ea42")} onClick={() => observerJeune(j.id, true)}>{estimation.entretien ? t("ui.edc04576d022") : t("ui.a7dae86f689f")}</button>
                                <button disabled={j.age > 18 || j.categorie === 'u18'} onClick={() => gererAcademicien(j.id, 'u18')}>U18</button>
                                <button disabled={j.categorie === 'espoirs'} onClick={() => gererAcademicien(j.id, 'espoirs')}>{t("ui.0cccb48aead9")}</button>
                                <button disabled={j.age < 18 || j.categorie === 'pret'} onClick={() => gererAcademicien(j.id, 'pret')}>{t("ui.5338d4009fdd")}</button>
                                <button className="primaire" disabled={j.age < 17} onClick={() => gererAcademicien(j.id, 'senior')}>{t("ui.b0831ceb56f2")}</button>
                                <button className="danger" onClick={() => setJeuneALiberer(j.id)}>{t("ui.7f75debb0880")}</button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}

              {vue === 'entrainement' && (
                <section className="carte manager-planning-collectif">
                  <div className="comp-tete"><div><b><Icone nom="chrono" taille={16} />{t("ui.6eff1c38febe")}</b><small>{t("ui.6c3c7f5d8cd3")}</small></div><span className={`charge-risque risque-${risqueGroupe >= 65 ? 'haut' : risqueGroupe >= 40 ? 'moyen' : 'bas'}`}>{t("ui.7f32a72f51a3", { v0: risqueGroupe })}</span></div>
                  {chargeHebdo && <div className="reglages-charge">{([
                    ['physique', 'Physique'], ['contacts', 'Contacts'], ['sprint', 'Sprint'], ['melee', 'Mêlée'], ['recuperation', 'Récupération'],
                  ] as const).map(([axe, label]) => <article key={axe}><span><b>{label}</b><small>{axe === 'recuperation' ? t("ui.4d88157e0982") : axe === 'melee' ? t("ui.b4b6bbbb597a") : axe === 'sprint' ? t("ui.7a163aaf2e0c") : axe === 'contacts' ? t("ui.a461e56327b7") : t("ui.f0d2f94967af")}</small></span><div>{([0, 1, 2, 3] as const).map((niveau) => <button key={niveau} className={chargeHebdo[axe] === niveau ? 'actif' : ''} onClick={() => definirChargeEntrainement(axe, niveau)}>{['Aucun', 'Léger', 'Normal', 'Fort'][niveau]}</button>)}</div></article>)}</div>}
                  <p className="bilan-charge">{t("ui.f533554262ef", { v0: chargeTotale.toFixed(1) })}</p>
                </section>
              )}

              {vue === 'entrainement' && <section className="carte manager-programme">
                <div className="comp-tete">
                  <b><Icone nom="halteres" taille={16} /> {t('mgr.inst.programme')}</b>
                  <span className="comp-count">{manager.entrainements.length}/{placesEntrainement}</span>
                </div>
                {murs.entrainement <= 0 ? (
                  <p className="manager-vide-texte">{t('mgr.inst.programmeFerme')}</p>
                ) : (
                  <>
                    <p className="manager-vide-texte">{t('mgr.inst.programmeAide')}</p>
                    <div className="manager-liste-programme">
                      {[...effectif]
                        .sort((a, b) => (b.potentiel - b.note) - (a.potentiel - a.note))
                        .slice(0, 24)
                        .map((j) => {
                          const dedans = manager.entrainements.includes(j.nom);
                          const marge = j.potentiel - j.note;
                          const complet = !dedans && manager.entrainements.length >= placesEntrainement;
                          return (
                            <button
                              key={j.id}
                              className={`prog-ligne${dedans ? ' actif' : ''}`}
                              disabled={complet || marge <= 0}
                              aria-pressed={dedans}
                              onClick={() => basculerEntrainement(j.nom)}
                            >
                              <span className="prog-nom">{j.duCentre && <Icone nom="formation" taille={12} />}{' '}{j.nom}</span>
                              <span className="prog-poste">{nomPoste(j.poste)}</span>
                              <span className="prog-age">{j.age}</span>
                              <span className="prog-note">{j.note}</span>
                              <span className={`prog-marge${marge > 0 ? ' positive' : ''}`}>
                                {marge > 0 ? `↗ ${j.potentiel}` : '—'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}
              </section>}

              {vue === 'entrainement' && (
                <section className="carte manager-programme-jeunes">
                  <div className="comp-tete">
                    <div><b><Icone nom="pousse" taille={16} />{t("ui.fb0809ebed5a")}</b><small>{t("ui.2ff424e50f45")}</small></div>
                    <span className="comp-count">{academieClub.length}</span>
                  </div>
                  {!academieClub.length ? (
                    <p className="manager-vide-texte">{t("ui.65902aac771b")}</p>
                  ) : (
                    <div className="manager-plans-jeunes">
                      {academieClub.map((j) => (
                        <article key={j.id}>
                          <div>
                            <b>{j.nom}</b>
                            <span>{t("ui.c62d1acf78fd", { v0: j.age, v1: nomPoste(j.poste), v2: j.categorie === 'pret' ? t("ui.42e84d93c44c", { v0: j.clubPret }) : j.categorie.toUpperCase() })}</span>
                          </div>
                          <label>
                            <span>{t("ui.7c27023ecc05")}</span>
                            <Selecteur
                              options={OBJECTIFS_JEUNES.map((o) => ({ valeur: o.id, label: o.nom, sous: o.effet }))}
                              valeur={j.objectif}
                              onChange={(v) => definirObjectifJeune(j.id, v as ObjectifJeuneManager)}
                            />
                          </label>
                          <label>
                            <span>{t("ui.1946d8e37ce8")}</span>
                            <Selecteur
                              options={[
                                { valeur: '', label: 'Aucun mentor' },
                                ...mentors.map((mentor) => ({
                                  valeur: mentor.id,
                                  label: mentor.nom,
                                  sous: `${mentor.age} ans · note ${mentor.note}`,
                                })),
                              ]}
                              valeur={j.mentorId ?? ''}
                              onChange={(v) => definirMentorJeune(j.id, v || undefined)}
                            />
                          </label>
                          <p><b>{nomObjectifJeune(j.objectif)}</b>{t("ui.88bd16e898c6", { v0: j.tempsDeJeu, v1: j.professionnalisme })}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {(vue === 'recruteurs' || vue === 'formation') && detectionJeunes && (
                <>
                  <section className="carte manager-detection-tete">
                    <div>
                      <div className="eyebrow">{t("ui.2b5f22700777", { v0: detectionJeunes.fiches.length })}</div>
                      <h2><Icone nom="loupe" taille={20} />{t("ui.f6e3a3d13e06")}</h2>
                      <p>{t("ui.be8a214a47e2", { v0: nombre(detectionJeunes.candidatsVus), v1: detectionJeunes.fiches.length, v2: detectionJeunes.prioritaires })}</p>
                      {detectionJeunes.fiches.filter((f) => f.etoilesHaut >= 4.5).length >= 3 && (
                        <strong className="manager-generation-doree"><Icone nom="etoile" taille={14} />{t("ui.e2ea828255c1")}</strong>
                      )}
                    </div>
                    <div className={`manager-missions${detectionJeunes.deplacementsRestants === 0 ? ' epuise' : ''}`}>
                      <span className="manager-missions-icone" aria-hidden="true"><Icone nom="loupe" taille={16} /></span>
                      <b>{detectionJeunes.deplacementsRestants}/{detectionJeunes.deplacementsTotal}</b>
                      <span>{t("ui.0e1847cc78e0")}</span>
                      <small>{t("ui.162452bfc72a")}</small>
                    </div>
                  </section>

                  {/* ⚠️ LE VIVIER N'EST PAS UN CONTOURNEMENT DU CENTRE, C'EST SA
                      RÉCOMPENSE. La « promotion annuelle » reste ce que la cellule
                      remonte d'elle-même. Ces filtres ouvrent tout ce qui est à
                      PORTÉE — et la portée, c'est le rayon du réseau : 50 km pour
                      un club de Régionale, la France pour un gros centre. On ne
                      gagne pas l'accès en filtrant, on gagne la portée en
                      améliorant le centre. */}
                  <section className="carte manager-filtres-jeunes">
                    <div className="manager-filtres-jeunes-tete">
                      <b><Icone nom="loupe" taille={15} />{t("ui.9173ce2a2b5e")}</b>
                      <small>{t("ui.5bcb6a7120f4", { v0: nombre(detectionJeunes.candidatsVus), v1: nombre(detectionJeunes.rayon) })}</small>
                    </div>
                    <div className="manager-filtres-jeunes-champs">
                      <Selecteur
                        options={[{ valeur: '', label: 'Tous les postes' }, ...POSTES.map((p) => ({ valeur: p.id, label: nomPoste(p.id), sous: `n° ${p.numero}` }))]}
                        valeur={posteJeune}
                        onChange={setPosteJeune}
                      />
                      <Selecteur
                        options={[{ valeur: '0', label: 'Tous les âges' }, ...agesDuVivier.map((a) => ({ valeur: String(a), label: `${a} ans` }))]}
                        valeur={String(ageJeune)}
                        onChange={(v) => setAgeJeune(Number(v))}
                      />
                      <input
                        value={rechercheJeune}
                        onChange={(e) => setRechercheJeune(e.target.value)}
                        placeholder={t("ui.aa6cb5483878")}
                        aria-label={t("ui.c297246890b9")}
                      />
                      <button
                        type="button"
                        className={`btn ${filtreJeuneActif ? 'primaire' : 'fantome'}`}
                        onClick={() => {
                          if (filtreJeuneActif) {
                            setVivierOuvert(false); setPosteJeune(''); setAgeJeune(0); setRechercheJeune('');
                          } else setVivierOuvert(true);
                        }}
                      >
                        {filtreJeuneActif ? t("ui.73990f561b4f") : t("ui.3b8ae3ef1945")}
                      </button>
                    </div>
                    {filtreJeuneActif && vivier && (
                      <p className="manager-filtres-jeunes-bilan">
                        {vivier.total === 0
                          ? t("ui.87e5492462c2")
                          : tn("ui.5c6755bb5ca7", vivier.total, { v0: nombre(vivier.total), v2: vivier.total > vivier.fiches.length ? ` · les ${vivier.fiches.length} plus proches sont affichés` : '' })}
                      </p>
                    )}
                  </section>


                  <section className="manager-dossiers-jeunes">
                    {(vivier ? vivier.fiches : detectionJeunes.fiches).map((ficheJeune, index) => {
                      const j = ficheJeune.jeune;
                      const suivi = manager.observationsJeunes[j.id];
                      const reponse = manager.reponsesJeunes[j.id];
                      const dejaSigne = manager.academie.some((a) => a.id === j.id);
                      return (
                        <article className={`carte manager-dossier-jeune${!vivier && index < detectionJeunes.prioritaires ? ' prioritaire' : ''}`} key={j.id}>
                          <header>
                            <div className="manager-jeune-identite">
                              <div className="manager-jeune-avatar" aria-hidden="true">
                                <b>{initiales(j.nom)}</b>
                                <i><Drapeau nation={j.nation} taille={0.72} /></i>
                              </div>
                              <div className="manager-jeune-titre">
                                <span>{!vivier && index < detectionJeunes.prioritaires ? t("ui.3d0b2cdc83b8") : t("ui.33ee0252ff50")}</span>
                                <h3>{j.nom}</h3>
                                <p>{t("ui.f63abdd1198d", { v0: j.age, v1: nomPoste(j.poste) })}</p>
                                <small>{j.club} · {nombre(j.distance)} km</small>
                              </div>
                            </div>
                            <strong className="manager-note-observee">{ficheJeune.noteObservee}<small>{t("ui.af15fdbd8ded")}<br />{t("ui.009ad8b977dd")}</small></strong>
                          </header>
                          <div className="manager-confiance-scout">
                            <span>{t("ui.110080407f86")}</span>
                            <i><em style={{ width: `${ficheJeune.confiance}%` }} /></i>
                            <b>{ficheJeune.confiance}%</b>
                          </div>
                          <div className="manager-potentiel-cache">
                            <span>{t("ui.ba955817b6df")}</span>
                            <b>{etoiles(ficheJeune.etoilesBas, ficheJeune.etoilesHaut)}</b>
                            <small>{t("ui.66a155d2a301", { v0: ficheJeune.potentielBas, v1: ficheJeune.potentielHaut })}</small>
                          </div>
                          <div className="manager-jeune-attributs">
                            <span><b>{t("ui.88fa13ed7024")}</b>{niveauLisible(j.physique)}</span>
                            <span><b>{t("ui.bf4043a9b3df")}</b>{niveauLisible(j.technique)}</span>
                            <span><b>{t("attr.mental")}</b>{niveauLisible(j.mental)}</span>
                            <span><b>{t("nav.profil")}</b>{j.style.replace('_', ' ')}</span>
                            <span><b>{t("ui.a3662ebc72a6")}</b>{j.taille / 100} m · {j.poids} kg</span>
                            <span><b>{t("ml.vue.pied")}</b>{j.piedFort}</span>
                          </div>
                          <p className="manager-observation-resume">{tn("ui.f064a329654e", ficheJeune.matchs, { v0: ficheJeune.matchs, v3: ficheJeune.entretien ? ' · entretien réalisé' : ' · entretien non réalisé' })}</p>
                          {reponse && <p className={`manager-reponse-jeune ${reponse.etat}`}>{texteTraduit(reponse.texte)}</p>}
                          <div className="manager-actions-detection">
                            <button disabled={detectionJeunes.deplacementsRestants < 1 || ficheJeune.matchs >= 10 || dejaSigne} onClick={() => observerJeune(j.id)}><Icone nom="oeil" taille={15} />{t("ui.fa0f0a8a4213")}</button>
                            <button disabled={detectionJeunes.deplacementsRestants < 3 || ficheJeune.matchs < 3 || ficheJeune.entretien || dejaSigne} onClick={() => observerJeune(j.id, true)}>{t("ui.a7dae86f689f")}</button>
                            <button className="primaire" disabled={dejaSigne || detectionJeunes.occupes >= detectionJeunes.capacite} onClick={() => proposerProjetJeune(j.id)}>{dejaSigne ? t("ui.1a1f5328d3d3") : t("ui.d072fa5b52a9")}</button>
                          </div>
                          <small>{j.club === manager.club ? t("ui.7dfb1c700a33") : t("ui.565f9f34bba6")}</small>
                          {motifObservationJeune(manager, j.id, false, detectionJeunes) && <small role="status">{motifObservationJeune(manager, j.id, false, detectionJeunes)}</small>}
                          {ficheJeune.matchs < 3 && <small>{t("ui.dec4f5ddd6ac")}</small>}
                          {suivi && <small className="manager-rapport-date">{t("ui.ff4d3f8bc0b0", { v0: suivi.saison })}</small>}
                        </article>
                      );
                    })}
                  </section>

                  {!!manager.rapports.length && (
                    <details className="carte manager-rapports-pros">
                      <summary>{t("ui.b663733c0a7a")}<span>{manager.rapports.length}</span></summary>
                      <div className="manager-table-rapports">
                        {manager.rapports.map((r) => (
                          <div className="rap-ligne" key={r.id}>
                            <span className="rap-nom"><Drapeau nation={r.nation} taille={0.8} /> {r.nom}<em>{nomPoste(r.poste)}</em></span>
                            <span className="rap-club">{r.club}<em>{r.division}</em></span>
                            <span>{r.age}</span><span>{r.note}</span>
                            <span className="rap-pot">↗ {r.potentiel}{r.incertitude > 0 && <em>± {r.incertitude}</em>}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {vue === 'marche' && (
            <div className="manager-marche" data-tuto="mgr-marche">
              <div className="carte manager-marche-tete">
                <div><div className="eyebrow">{t('mgr.baseMondiale')}</div><h2><Icone nom="monde" taille={22} /> {t('mgr.marcheTitre')}</h2><p>{t('mgr.marcheIntro')}</p></div>
                {/* ⚠️ LA MASSE ENGAGÉE PASSE DEVANT LE PLAFOND. Un plafond seul
                    ne dit rien : ce qu'un manager doit lire avant d'ouvrir une
                    négociation, c'est ce qu'il lui RESTE. */}
                <div className="manager-budgets resume">
                  <span>{t('mgr.inst.budget')} <b>{nombre(manager.budgetStructure)} €</b></span>
                  <span>{t('mgr.transferts')} <b>{nombre(manager.budgetTransferts)} €</b></span>
                  <span className={masseSaturee ? 'masse-saturee' : ''}>
                    {t('mgr.salaires')} <b>{nombre(masseEngagee)} / {nombre(salaires?.plafond ?? 0)} €</b>
                  </span>
                </div>
              </div>
              <div className="manager-filtres carte">
                <Selecteur options={optionsDivisions} valeur={divisionMarche} onChange={(v) => { setDivisionMarche(v); setClubMarche(''); }} recherche />
                <Selecteur options={optionsClubs} valeur={clubMarche} onChange={setClubMarche} recherche />
                <Selecteur options={optionsPostes} valeur={poste} onChange={setPoste} />
                <Selecteur
                  options={[
                    { valeur: '', label: 'Tous les âges' },
                    { valeur: 'espoir', label: 'Espoirs', sous: '22 ans et moins' },
                    { valeur: 'pleine', label: 'Années pleines', sous: 'de 23 à 29 ans' },
                    { valeur: 'experience', label: 'Expérience', sous: '30 ans et plus' },
                  ]}
                  valeur={ageMarche}
                  onChange={setAgeMarche}
                />
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t('mgr.marche.rechercher')} aria-label={t('mgr.marche.rechercher')} />
              </div>
              <p className="manager-resultats-marche">{t('mgr.marche.resultats', { n: cibles.length })}</p>
              <div className="manager-cibles">
                {cibles.slice(0, limiteMarche).map((cible) => {
                  const connaissance = rapportConnaissance(avancee ?? undefined, cible, murs.recrutement);
                  // ⚠️ LE PRESTIGE ENTRE DANS LA PORTÉE : c'est la jauge centrale
                  // du mode, elle n'ouvrait que des BANCS et n'aidait jamais à
                  // convaincre un joueur.
                  const portee = porteeSportive(cible, manager.club, manager.saison, manager.prestige);
                  const existante = manager.negociations.find((n) => n.joueur.id === cible.id && n.etat !== 'rompue');
                  const clubDossier = [...manager.negociationsClubs].reverse()
                    .find((n) => n.cible.id === cible.id && n.saison === manager.saison);
                  const clubCible = clubParNom(cible.club);
                  const libelleContact = existante?.etat === 'signee'
                    ? t('mgr.signe')
                    : existante
                      ? `𝕏 ${t('mgr.reprendreDiscussion')}`
                      : cible.indemnite <= 0 || clubDossier?.etat === 'accord'
                        ? `𝕏 Parler à ${cible.nom.split(' ')[0]}`
                        : clubDossier?.etat === 'ouverte'
                          ? `𝕏 Reprendre avec ${cible.club}`
                          : clubDossier?.etat === 'rompue'
                            ? 'Club vendeur fermé'
                            : `𝕏 Négocier avec ${cible.club}`;
                  const rarete = rareteDe(cible);
                  return (
                    <article key={cible.id} className={`carte manager-cible ct-r-${rarete}`}>
                      {/* ⚠️ UN GÉNÉRAL EST UN NOMBRE, PAS UNE FOURCHETTE, et
                          c'est le bug signalé. La carte imprimait `note` telle
                          quelle : « 78–100 », « 81–100 », « 74–100 » — vingt-
                          quatre points d'amplitude, une borne haute que personne
                          n'atteint dans le jeu (les effectifs plafonnent à 99),
                          et surtout aucun moyen de comparer deux cibles d'un
                          coup d'œil, ce qui est précisément à quoi sert un
                          général. L'incertitude du scouting n'est pas retirée :
                          elle est DITE en marge (`± 6`), et elle se referme en
                          observant. Voir `rapportConnaissance`. */}
                      <div className="manager-cible-note">
                        {connaissance.estimation}
                        {connaissance.marge > 0 && <b className="mgr-marge">± {connaissance.marge}</b>}
                        <small>{t(`mgr.rapport.${connaissance.niveau}`)}</small>
                      </div>
                      <div className="manager-cible-corps">
                        <div className="manager-cible-identite">
                          <Drapeau nation={cible.nation} taille={0.95} />
                          {/* Demande : « pouvoir cliquer sur les profils ». Le
                              nom EST le lien — c'est ce qu'on vise. */}
                          <button
                            type="button"
                            className="manager-cible-nom"
                            onClick={() => setFicheCible(cible)}
                            aria-label={`${t('mgr.voirProfil')} : ${cible.nom}`}
                          >
                            <b>{cible.nom}</b>
                            <small>{nomPoste(cible.poste)} · {cible.age} {t('gen.ans')}</small>
                          </button>
                        </div>
                        <p>{clubCible && <Blason club={clubCible} taille={18} />} {cible.club}</p>
                        {/* ⚠️ LA VALEUR ET L'INDEMNITÉ SONT DEUX CHOSES, et les
                            confondre était tout le défaut de l'ancien marché :
                            on affichait un prix de football là où le rugby
                            français attend la fin d'un contrat pour ne rien
                            payer. On montre donc les deux, plus le temps qui
                            reste — c'est lui qui décide du prix. */}
                        <div className="manager-cible-chiffres">
                          <span>{t('mgr.potentiel')} <b>{connaissance.potentiel ? `${connaissance.potentiel[0]}–${connaissance.potentiel[1]}` : '?'}</b></span>
                          <span>{t('mgr.valeur')} <b>{nombre(cible.valeur)} €</b></span>
                          <span className={cible.indemnite === 0 ? 'gratuit' : ''}>
                            {t('mgr.indemnite')} <b>{cible.indemnite === 0 ? t('mgr.libreGratuit') : `${nombre(cible.indemnite)} €`}</b>
                          </span>
                          <span>{t('mgr.salaire')} <b>{connaissance.salaire ? `${nombre(connaissance.salaire[0])}–${nombre(connaissance.salaire[1])} €` : '?'}</b></span>
                        </div>
                        <p className="manager-connaissance-cible">
                          <Icone nom="oeil" taille={13} /> {t(`mgr.rapport.${connaissance.niveau}`)}
                          {connaissance.personnalite
                            ? ` · ${connaissance.personnalite}`
                            : ` · ${t('mgr.personnaliteInconnue')}`}
                        </p>
                        <p className={`manager-cible-situation ${cible.situation}`}>
                          {t(`mgr.situation.${cible.situation}`)}
                          {cible.saisonsRestantes > 0 && ` · ${t('mgr.contratRestant', { n: cible.saisonsRestantes })}`}
                        </p>
                        {/* ⚠️ CE QUI MANQUAIT AU MARCHÉ : UN CRITÈRE SPORTIF.
                            `score()` ne pèse que du contractuel, et dans le bas
                            de la pyramide les exigences contractuelles sont
                            dérisoires — il ne restait donc AUCUN obstacle entre
                            un club de Régionale 3 et le meilleur joueur du
                            monde. La portée est affichée AVANT le bouton, avec
                            son motif : un refus qu'on ne comprend pas se lit
                            comme un bug. */}
                        {!portee.aPortee && (
                          <p className="manager-cible-portee">
                            <Icone nom="stop" taille={13} />{' '}
                            {portee.motif === 'etage'
                              ? t('mgr.horsPorteeEtage')
                              : t('mgr.horsPorteeNiveau', { plafond: Math.round(portee.plafond) })}
                          </p>
                        )}
                      </div>
                      {/* ⚠️ LES ACTIONS SONT DANS LEUR PROPRE COLONNE, et ce
                          n'est pas cosmétique. `.manager-cible` est une grille
                          à trois colonnes (56 px · 1fr · auto) : posés en
                          enfants directs, les boutons au-delà du troisième
                          retombaient en ligne 2, dans la colonne de 56 px de la
                          pastille de note. Mesuré à l'écran, « Observer
                          davantage » s'affichait sur quatre lignes dans 56 px —
                          un défaut qui existait DÉJÀ avec deux boutons, et que
                          le troisième rendait seulement impossible à ignorer. */}
                      <div className="manager-cible-actions">
                        <button
                          className="btn primaire"
                          disabled={!portee.aPortee || existante?.etat === 'signee' || clubDossier?.etat === 'rompue'}
                          onClick={() => {
                            if (existante) ouvrirDiscussion(existante.pseudo);
                            else if (clubDossier?.etat === 'ouverte') ouvrirDiscussion(clubDossier.pseudo);
                            else contacterClub(cible);
                          }}
                        >
                          {libelleContact}
                        </button>
                        <button className="btn fantome" disabled={connaissance.niveau === 'complet'} onClick={() => observerCible(cible)}>
                          <Icone nom="oeil" taille={16} /> {t('mgr.observerPlus')}
                        </button>
                        <button className="btn fantome" onClick={() => setFicheCible(cible)}>
                          <Icone nom="profil" taille={16} /> {t('mgr.voirProfil')}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!cibles.length && <div className="carte manager-vide">{t('mgr.marche.aucun')}</div>}
              </div>
              {cibles.length > limiteMarche && <button className="btn secondaire" onClick={() => setLimiteMarche(n => n + 24)}>{t("ui.a852a0d6c2f5", { v0: Math.min(limiteMarche, cibles.length), v1: cibles.length })}</button>}
            </div>
          )}

          {vue === 'ovale' && (
            <div className="manager-ovale">
              <Suspense fallback={<div className="carte manager-vide">{t("ui.f3be746e231f")}</div>}>
                <OvaleManager
                  embarque
                  onRetour={(destination = 'bureau') => setVue(destination)}
                />
              </Suspense>
            </div>
          )}

        </>
      )}

      {/* ⚠️ LA FICHE VIT AU NIVEAU DE L'ÉCRAN, pas dans la carte du marché.
          Montée dans la boucle des cibles, elle serait démontée à chaque
          re-rendu de la liste (une observation, un filtre, une frappe dans le
          champ de recherche) et se refermerait toute seule. */}
      {ficheCible && (
        <FicheJoueur
          joueur={ficheCible}
          rapport={rapportConnaissance(avancee ?? undefined, ficheCible, murs.recrutement)}
          marche={{
            valeur: ficheCible.valeur,
            indemnite: ficheCible.indemnite,
            situation: ficheCible.situation,
            saisonsRestantes: ficheCible.saisonsRestantes,
            action: {
              libelle: joueurDejaRecrute(manager, ficheCible.id)
                ? t('mgr.signe')
                : `${t('mgr.negocier')} ${ficheCible.club}`,
              onClic: () => contacterClub(ficheCible),
              desactive: joueurDejaRecrute(manager, ficheCible.id),
            },
            observer: {
              onClic: () => observerCible(ficheCible),
              desactive: rapportConnaissance(avancee ?? undefined, ficheCible, murs.recrutement)
                .niveau === 'complet',
            },
          }}
          onFermer={() => setFicheCible(null)}
        />
      )}

      <button className="btn fantome manager-raccrocher" onClick={() => setRaccrocher(true)}>
        <Icone nom="retraite" taille={17} /> {t('mgr.raccrocher')}
      </button>
      {raccrocher && <Confirmation titre={t('mgr.raccrocherTitre')} message={manager.horsClassement ? t('mgr.raccrocherHorsClassement') : libre ? t('mgr.raccrocherLibre') : t('mgr.raccrocherClasse')} libelleOui={t('mgr.raccrocher')} onOui={() => { setRaccrocher(false); quitterBanc(); }} onNon={() => setRaccrocher(false)} />}
      {jeuneALiberer && (
        <Confirmation
          titre={t("ui.371cc4251fc5")}
          message={t("ui.6045c77ecc46", { v0: academieClub.find((j) => j.id === jeuneALiberer)?.nom ?? t("ui.65d7865461ae") })}
          libelleOui={t("ui.7f75debb0880")}
          onOui={() => { gererAcademicien(jeuneALiberer, 'liberer'); setJeuneALiberer(null); }}
          onNon={() => setJeuneALiberer(null)}
        />
      )}
      {matchOuvert && (
        <Suspense fallback={null}>
          <MatchLive
            match={matchOuvert.match}
            saison={manager.saison}
            cle={matchOuvert.cle}
            titre={libelleAfficheManager(matchOuvert, manager.divisionNom)}
            manager={{
              club: manager.club,
              composition,
              tactique: manager.tactique,
              onTactique: definirTactique,
              indisponibles,
              penalitesNote,
              risquesBlessure: risquesBlessureMatch,
            }}
            onTermine={({ scoreA, scoreB, essaisA, essaisB, blessures }) => {
              const domicile = matchOuvert.match.domicile === manager.club;
              enregistrerResultat({
                cle: matchOuvert.cle, club: manager.club,
                saison: manager.saison, semaine: manager.semaine,
                journee: matchOuvert.journee, domicile,
                adversaire: domicile ? matchOuvert.match.exterieur : matchOuvert.match.domicile,
                scorePour: domicile ? scoreA : scoreB,
                scoreContre: domicile ? scoreB : scoreA,
                essaisPour: domicile ? essaisA : essaisB,
                essaisContre: domicile ? essaisB : essaisA,
                blessures,
              });
            }}
            onFermer={() => setMatchOuvert(null)}
          />
        </Suspense>
      )}
      {demission && <Confirmation titre={t("ui.56b3480c30fc")} message={t("ui.812281e7c337", { v0: manager.club })} libelleOui={t("ui.292b1df68a76")} onOui={() => { setDemission(false); demissionner(); }} onNon={() => setDemission(false)} />}
      {matchSelectionOuvert && selectionManager && rencontreSelection && matchSelection && (
        <Suspense fallback={null}>
          <MatchLive
            match={matchSelection}
            saison={manager.saison}
            cle={rencontreSelection.id}
            titre={`${rencontreSelection.competition} · ${selectionManager.nation}`}
            selection
            manager={{
              club: selectionManager.nation,
              composition: compositionManagerParDefaut(effectifNational(selectionManager.nation, manager.saison)),
              tactique: manager.tactique,
              onTactique: definirTactique,
            }}
            onTermine={({ scoreA, scoreB }) => enregistrerMatchSelection(scoreA, scoreB)}
            onFermer={() => setMatchSelectionOuvert(false)}
          />
        </Suspense>
      )}
    </motion.section>
  );
}
