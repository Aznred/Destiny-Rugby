import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t, nombre } from '../lib/i18n';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Confirmation } from '../components/Confirmation';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { COMPETITIONS, clubParNom } from '../data/clubs';
import { effectifDuClub, forceEffectif } from '../lib/effectif';
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
    [manager],
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
          <h1><Icone nom="entraineur" taille={26} /> {manager.nom}</h1>
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
            <span><Icone nom="calendrier" taille={18} /> <b>{libelleDate(sem)}</b> · saison {manager.saison} · semaine {manager.semaine}/{SEMAINES_PAR_SAISON}</span>
            <button className="btn primaire" onClick={() => setVue('calendrier')}>Calendrier / Avancer</button>
          </div>
          {/* ⚠️ ONZE ONGLETS, ONZE TRACÉS — plus onze emoji. Un emoji est dessiné
              par Apple, Google ou Microsoft : la barre changeait d'aspect selon
              la machine, ses couleurs (un manteau bleu ciel, un livre rouge) ne
              sont pas celles du jeu, et sa ligne de base varie d'un système à
              l'autre — d'où des libellés qui ne s'alignaient pas entre eux. Les
              icônes de `components/Icone.tsx` prennent la couleur du texte, donc
              l'or de l'onglet actif. Voir « ÇA FAIT TROP IA » dans CLAUDE.md. */}
          <nav className="manager-onglets" aria-label={t('mgr.navigation')}>
            <button className={vue === 'bureau' ? 'actif' : ''} onClick={() => setVue('bureau')}>
              <Icone nom="stade" taille={17} /> Club
            </button>
            <button className={vue === 'equipe' ? 'actif' : ''} onClick={() => setVue('equipe')}>
              <Icone nom="equipe" taille={17} /> Composition
            </button>
            <button className={vue === 'tresorerie' ? 'actif' : ''} onClick={() => setVue('tresorerie')}>
              <Icone nom="euro" taille={17} /> Trésorerie
            </button>
            <button className={vue === 'calendrier' || vue === 'match' ? 'actif' : ''} onClick={() => setVue('calendrier')}>
              <Icone nom="calendrier" taille={17} /> Calendrier
            </button>
            <button className={vue === 'marche' ? 'actif' : ''} onClick={() => setVue('marche')}>
              <Icone nom="monde" taille={17} /> {t('mgr.marche')}
            </button>
            <button className={vue === 'ovale' ? 'actif' : ''} onClick={() => { setVue('ovale'); ouvrirMessages(); }}>
              <Icone nom="ovale" taille={17} /> L’Ovale {alertesOvale > 0 && <i>{alertesOvale}</i>}
            </button>
            <button className={vue === 'formation' ? 'actif' : ''} onClick={() => setVue('formation')}>
              <Icone nom="formation" taille={17} /> Formation
            </button>
            <button className={vue === 'recruteurs' ? 'actif' : ''} onClick={() => setVue('recruteurs')}>
              <Icone nom="loupe" taille={17} /> Recruteurs {rapportsFrais > 0 && <i>{rapportsFrais}</i>}
            </button>
            <button className={vue === 'entrainement' ? 'actif' : ''} onClick={() => setVue('entrainement')}>
              <Icone nom="halteres" taille={17} /> Entraînement
            </button>
            <button className={vue === 'direction' ? 'actif' : ''} onClick={() => setVue('direction')}>
              <Icone nom="institution" taille={17} /> Direction
            </button>
            <button className={vue === 'vestiaire' ? 'actif' : ''} onClick={() => setVue('vestiaire')}>
              <Icone nom="maillot" taille={17} /> Vestiaire {(discussionsOuvertes.length + dossiersMedicaux.filter((d) => d.decision === 'attente').length) > 0 && <i>{discussionsOuvertes.length + dossiersMedicaux.filter((d) => d.decision === 'attente').length}</i>}
            </button>
            <button className={vue === 'univers' ? 'actif' : ''} onClick={() => setVue('univers')}>
              <Icone nom="journal" taille={17} /> Monde
            </button>
            <button className={vue === 'histoire' ? 'actif' : ''} onClick={() => setVue('histoire')}>
              <Icone nom="livre" taille={17} /> Histoire
            </button>
          </nav>

          {vue === 'calendrier' && <CalendrierManager onMatch={() => setVue('match')} />}
          {vue === 'tresorerie' && <TresorerieManager manager={manager} onMarche={() => setVue('marche')} onStructures={() => setVue('formation')} />}

          {vue === 'bureau' && (
            <div className="manager-bureau">
              <section className="carte manager-club-resume">
                <div className="manager-club-resume-identite">
                  {fiche && <Blason club={fiche} taille={62} />}
                  <div>
                    <div className="eyebrow">Tableau de bord · saison {manager.saison}</div>
                    <h2>{manager.club}</h2>
                    <p>{comp && <LogoCompet id={comp.id} taille={19} />} {manager.divisionNom} · {humeur.texte}</p>
                  </div>
                </div>
                <div className="manager-resume-actions">
                  <button className="btn fantome" onClick={() => setEcran('effectif')}><Icone nom="equipe" taille={16} /> Effectif</button>
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
                  <button className="btn primaire" onClick={() => {
                    if (afficheManager && !resultatManager) setVue('match'); else semaineManager();
                  }}>
                    {afficheManager && !resultatManager ? 'Coacher le match' : 'Semaine suivante'}
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

              <section className="manager-kpis" aria-label="Informations importantes du club">
                <article className="carte"><small>Classement</small><b>{maLigne ? `${maLigne.position}e` : '—'}</b><span>{maLigne?.points ?? 0} points</span></article>
                <article className="carte"><small>Objectif du board</small><b>{manager.objectif}e</b><span>{maLigne && maLigne.position <= manager.objectif ? 'Objectif tenu' : 'À rattraper'}</span></article>
                <article className="carte"><small>Force du groupe</small><b>{force.toFixed(1)}</b><span>{t('compo.effectifTotal', { n: effectifComplet.length })}{indisponibles.length ? ` · ${t('compo.indisponibles', { n: indisponibles.length })}` : ''}</span></article>
                <article className="carte"><small>Confiance</small><b>{Math.round(manager.confiance)}%</b><span>{humeur.texte}</span></article>
                <article className="carte"><small>Budget transferts</small><b>{nombre(manager.budgetTransferts)} €</b><span>Marge salariale : {nombre(salaires?.disponible ?? 0)} € / an</span></article>
                <article className="carte"><small>Structures</small><b>{nombre(manager.budgetStructure)} €</b><span>Formation {murs.formation}/4 · Recrutement {murs.recrutement}/4 · Entraînement {murs.entrainement}/4</span></article>
              </section>

              <section className="carte manager-classement-complet">
                <div className="comp-tete">
                  <div><b><Icone nom="resultats" taille={16} /> Course au classement · {manager.divisionNom}</b><small>Les cinq clubs autour du tien</small></div>
                  <button onClick={() => setEcran('tableau')}>Classement complet</button>
                </div>
                <div className="manager-table-classement" role="region" aria-label={`Classement ${manager.divisionNom}`} tabIndex={0}>
                  <table>
                    <thead><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>Pts</th></tr></thead>
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
                <article className="carte manager-prochain-match">
                  <div className="comp-tete"><b><Icone nom="ballon" taille={16} /> Prochaine échéance</b></div>
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
                      <strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : 'VS'}</strong>
                      <span>
                        {clubParNom(afficheManager.match.exterieur) && (
                          <Blason club={clubParNom(afficheManager.match.exterieur)!} taille={38} />
                        )}
                        <i>{afficheManager.match.exterieur}</i>
                      </span>
                    </div>
                  ) : <p>Aucun match cette semaine : récupération et préparation.</p>}
                </article>
                <article className="carte manager-journal">
                  <div className="comp-tete"><b><Icone nom="journal" taille={16} /> {t('mgr.journal')}</b></div>
                  <div className="journal">{[...journal].reverse().slice(0, 3).map((e) => <div key={e.id} className="entree"><b>{e.titre}</b><p>{e.texte}</p></div>)}</div>
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
                <div className="classement-tableau tableau-live histo-manager">{[...manager.historique].reverse().map((h) => <div key={`${h.saison}-${h.club}`} className="classement-ligne"><span className="cl-pos">S{h.saison}</span><span className="cl-nom">{h.club}</span><span>{h.divisionNom}</span><span className={h.tenu ? 'cl-plus' : 'cl-moins'}>{h.rang}ᵉ / {h.objectif}ᵉ</span><span>{h.titres.map((id) => TROPHEES[id]?.nom ?? id).join(', ')}{h.montee && ' — montée'}{h.descente && ' — descente'}{h.licencie && ' — licencié'}</span></div>)}</div>
              </div>
            )}
            </div>
          )}

          {vue === 'direction' && avancee && (
            <div className="manager-avance-grille">
              <section className="carte avance-entete">
                <div><div className="eyebrow">Conseil d’administration · saison {manager.saison}</div><h2><Icone nom="institution" taille={20} /> Attentes et avenir du manager</h2><p>Les objectifs sont pondérés selon les moyens du club. Ils nourrissent la confiance, les offres reçues et le risque de licenciement.</p></div>
                <div className={`avance-score ${manager.confiance < CONFIANCE_LICENCIEMENT + 12 ? 'danger' : ''}`}><b>{Math.round(manager.confiance)}</b><span>confiance</span></div>
              </section>

              {decisionStrategique && <section className="carte decision-strategique-manager">
                <div className="eyebrow">Décision pluriannuelle · {decisionStrategique.choix[0]?.duree ?? 3} saisons</div>
                <h2>{decisionStrategique.titre}</h2><p>{decisionStrategique.texte}</p>
                <div>{decisionStrategique.choix.map((choix) => <button key={choix.id} onClick={() => repondreDecisionStrategique(decisionStrategique.id, choix.id)}><b>{choix.label}</b><span>{choix.consequence}</span><small>Direction {choix.confianceDirection >= 0 ? '+' : ''}{choix.confianceDirection} · Supporters {choix.confianceSupporters >= 0 ? '+' : ''}{choix.confianceSupporters}</small></button>)}</div>
              </section>}

              <section className="avance-objectifs">
                {objectifsAvances.map((objectif) => {
                  return <article className={`carte objectif-board ${objectif.etat}`} key={objectif.id}>
                    <header><span>{objectif.categorie}</span><b>{'★'.repeat(objectif.importance)}{'☆'.repeat(3 - objectif.importance)}</b></header>
                    <h3>{objectif.titre}</h3><p>{objectif.detail}</p>
                    <b className="objectif-mesure">{objectif.libelle}</b>
                    <i><em style={{ width: `${objectif.pourcentage}%` }} /></i><small>{objectif.atteint ? 'Objectif tenu à ce jour' : 'En cours'} · bilan à la clôture</small>
                  </article>;
                })}
              </section>
              {avancee?.dernierBilanObjectifs && <details className="carte bilan-objectifs-manager">
                <summary>Bilan des objectifs · saison {avancee.dernierBilanObjectifs.saison} · {avancee.dernierBilanObjectifs.club}</summary>
                <ul>{avancee.dernierBilanObjectifs.objectifs.map((o) => <li key={o.id}><b>{o.etat === 'reussi' ? 'Réussi' : 'Manqué'}</b> — {o.titre}</li>)}</ul>
              </details>}

              {profonde && <section className="carte delegation-manager">
                <div className="comp-tete"><div><b><Icone nom="entraineur" taille={16} /> Répartition des responsabilités</b><small>Tu peux tout contrôler ou laisser le directeur sportif agir selon ses vraies compétences.</small></div><span className="comp-count">{DOMAINES_DELEGATION.filter((d) => profonde.delegations[d]).length}/9</span></div>
                <div className="delegation-contenu">
                  <div className="fiche-directeur-sportif"><div><span>Directeur sportif</span><h3>{profonde.directeurSportif.nom}</h3><small>Réputation {profonde.directeurSportif.reputation} · {nombre(profonde.directeurSportif.salaire)} €/an</small></div><div>{[
                    ['Évaluation', profonde.directeurSportif.evaluation], ['Recrutement', profonde.directeurSportif.recrutement], ['Négociation', profonde.directeurSportif.negociation], ['Formation', profonde.directeurSportif.formation], ['Staff', profonde.directeurSportif.gestionStaff], ['Tactique', profonde.directeurSportif.tactique],
                  ].map(([label, valeur]) => <label key={String(label)}><span>{label}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></label>)}</div></div>
                  <div className="grille-delegations">{DOMAINES_DELEGATION.map((domaine) => <label key={domaine} className={profonde.delegations[domaine] ? 'delegue' : ''}><input type="checkbox" checked={profonde.delegations[domaine]} onChange={(e) => configurerDelegation(domaine, e.target.checked)} /><span><b>{LIBELLES_DELEGATION[domaine]}</b><small>{profonde.delegations[domaine] ? `Délégué à ${profonde.directeurSportif.nom}` : 'Géré par toi'}</small></span></label>)}</div>
                </div>
                {!!profonde.decisionsDeleguees.length && <div className="journal-delegations">{profonde.decisionsDeleguees.slice().reverse().slice(0, 5).map((d) => <article key={d.id} className={d.qualite}><span>{d.qualite === 'bonne' ? '✓' : d.qualite === 'mauvaise' ? '!' : '•'}</span><div><b>{d.titre}</b><small>S{d.saison} · semaine {d.semaine} · score {d.score}</small><p>{d.detail}</p></div></article>)}</div>}
              </section>}

              {vieProfonde && <section className="carte politique-club-manager">
                <div className="president-manager"><div className="eyebrow">Président {vieProfonde.president.type}</div><h3>{vieProfonde.president.nom}</h3><p>Depuis la saison {vieProfonde.president.depuis}. Sa personnalité change les priorités, la patience et les investissements du club.</p><div>{[['Patience', vieProfonde.president.patience], ['Ambition', vieProfonde.president.ambition], ['Finances', vieProfonde.president.finances], ['Formation', vieProfonde.president.formation], ['Local', vieProfonde.president.localisme]].map(([label, valeur]) => <span key={String(label)}><small>{label}</small><b>{valeur}</b></span>)}</div></div>
                <div className="confiances-club"><h3>Deux confiances distinctes</h3><div><span><small>Direction</small><b>{Math.round(manager.confiance)}</b></span><span className={(vieProfonde.supporters.confiance < 45 ? 'danger' : '')}><small>Supporters</small><b>{vieProfonde.supporters.confiance}</b></span></div><ul>{vieProfonde.supporters.motifs.slice(0, 4).map((motif, index) => <li key={`${motif.saison}-${motif.semaine}-${index}`} className={motif.delta >= 0 ? 'positif' : 'negatif'}>{motif.delta >= 0 ? '✓' : '✕'} {motif.texte} <b>{motif.delta >= 0 ? '+' : ''}{motif.delta}</b></li>)}</ul></div>
              </section>}

              <section className="carte direction-contrat">
                <div><div className="eyebrow">Contrat personnel</div><h3>{manager.contrat?.saisons ?? 0} saison(s) · {nombre(manager.contrat?.salaire ?? 0)} €/an</h3><p>Une prolongation dépend de tes résultats, de ta réputation et de la confiance du président.</p></div>
                <div><button className="btn fantome" onClick={negocierContrat}>Négocier une prolongation</button><button className="btn danger" onClick={() => setDemission(true)}>Démissionner</button></div>
              </section>

              <section className="carte direction-marche-coachs">
                <div className="comp-tete"><div><b><Icone nom="poignee" taille={16} /> Marché des entraîneurs</b><small>Les postes changent dans toutes les divisions, même sans ton intervention.</small></div><span className="comp-count">{avancee.offresBanc.filter((o) => o.statut === 'offre').length}</span></div>
                <div className="direction-candidature">
                  <Selecteur options={optionsBancs.filter((o) => o.valeur !== manager.club)} valeur={clubVise || optionsBancs.find((o) => o.valeur !== manager.club)?.valeur || ''} onChange={setClubVise} recherche />
                  <button className="btn fantome" onClick={() => postulerBanc(clubVise || optionsBancs.find((o) => o.valeur !== manager.club)?.valeur || '')}>Envoyer ma candidature</button>
                </div>
                <div className="offres-coachs">
                  {avancee.offresBanc.slice().reverse().slice(0, 8).map((offre) => <article key={offre.id}>
                    <span><b>{offre.club}</b><small>{COMPETITIONS.find((c) => c.id === offre.division)?.nom ?? offre.division} · {nombre(offre.salaire)} € · {offre.duree} ans</small></span>
                    {offre.statut === 'offre' ? <button onClick={() => accepterOffreBanc(offre.id)}>Accepter le banc</button> : <em>{offre.statut === 'refusee' ? 'Candidature refusée' : offre.statut}</em>}
                  </article>)}
                  {!avancee.offresBanc.length && <p className="manager-vide-texte">Aucune approche pour l’instant. Une candidature reste possible.</p>}
                </div>
              </section>

              {(avancee.propositionSelection || selectionManager) && <section className="carte direction-selection">
                <div className="comp-tete"><div><b><Icone nom="monde" taille={16} /> Carrière internationale</b><small>Réputation distincte de la réputation en club.</small></div></div>
                {avancee.propositionSelection && <div className="proposition-selection"><h3>{avancee.propositionSelection.nation} te propose le poste</h3><p>Le cumul avec ton club est autorisé. Tournées, tournoi continental et Coupe du monde feront évoluer ta réputation internationale.</p><div><button className="btn primaire" onClick={() => repondreSelection(true)}>Accepter</button><button className="btn fantome" onClick={() => repondreSelection(false)}>Refuser</button></div></div>}
                {selectionManager && <div className="selection-manager-kpis"><span><small>Sélection</small><b>{selectionManager.nation}</b></span><span><small>Réputation</small><b>{selectionManager.reputation}</b></span><span><small>Matchs</small><b>{selectionManager.matchs}</b></span><span><small>Victoires</small><b>{selectionManager.victoires}</b></span>{rencontreSelection && <button className="btn primaire" onClick={() => setMatchSelectionOuvert(true)}>Coacher contre {rencontreSelection.adversaire}</button>}</div>}
              </section>}
            </div>
          )}

          {vue === 'vestiaire' && avancee && (
            <div className="manager-avance-grille">
              <section className="carte avance-entete"><div><div className="eyebrow">Hiérarchie, personnalités et parole donnée</div><h2><Icone nom="maillot" taille={20} /> Un vestiaire qui se souvient</h2><p>Les leaders diffusent leur soutien ou leur colère. Le temps de jeu réel, les résultats et tes réponses font le reste.</p></div><div className="avance-score"><b>{moyenneVestiaire(avancee)}</b><span>satisfaction</span></div></section>

              {profonde && <section className="carte capitaines-manager">
                <div className="comp-tete"><div><b><Icone nom="brassard" taille={16} /> Conseil des capitaines</b><small>Leadership, expérience, ancienneté, respect, sang-froid et discipline rendent le brassard crédible — ou contesté.</small></div></div>
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
                {discussionsOuvertes.map((discussion) => <article className="carte discussion-joueur" key={discussion.id}><header><span>{discussion.nom}</span><em>{discussion.type}</em></header><blockquote>{discussion.texte}</blockquote><div><button onClick={() => repondreDiscussion(discussion.id, 'promettre')}>Je vais te donner ta chance</button><button onClick={() => repondreDiscussion(discussion.id, 'merite')}>Montre-moi davantage</button><button onClick={() => repondreDiscussion(discussion.id, 'aucunePromesse')}>Je ne promets rien</button><button className="danger" onClick={() => repondreDiscussion(discussion.id, 'ecarter')}>Tu n’entres pas dans mes plans</button></div></article>)}
              </section>}

              <section className="carte hierarchie-vestiaire">
                <div className="comp-tete"><div><b><Icone nom="equipe" taille={16} /> Hiérarchie interne</b><small>Les profils ne sont pas de simples étiquettes : ils modifient les réactions.</small></div></div>
                <div>{Object.values(avancee.vestiaire).sort((a, b) => ['leader', 'influent', 'groupe', 'nouveau'].indexOf(a.rang) - ['leader', 'influent', 'groupe', 'nouveau'].indexOf(b.rang) || b.satisfaction - a.satisfaction).map((profil) => {
                  const agent = joueurAgent(avancee, profil.joueurId);
                  return <article key={profil.joueurId}><span className={`rang-vestiaire ${profil.rang}`}>{profil.rang}</span><b>{profil.nom}</b><small>{profil.traits.join(' · ')}</small><i><em style={{ width: `${profil.satisfaction}%` }} /></i><strong>{profil.satisfaction}</strong><span>{profil.soutien ? <><Icone nom="poignee" taille={13} /> Soutien</> : <><Icone nom="alerte" taille={13} /> Mécontent</>}</span><small>{agent ? `Agent : ${agent.nom} · relation ${agent.relationManager}` : ''}</small></article>;
                })}</div>
              </section>

              <section className="carte contrats-effectif-manager">
                <div className="comp-tete"><div><b><Icone nom="signature" taille={16} /> Contrats et marché</b><small>Durée, statut, satisfaction, motivations et concurrence déterminent le rapport de force.</small></div><span className="comp-count">{Object.values(avancee.contratsJoueurs).filter((c) => c.club === manager.club).length}</span></div>
                <div>{effectifBrut.map((j) => ({ j, c: avancee.contratsJoueurs[j.id] })).filter(({ c }) => c).sort((a, b) => a.c.fin - b.c.fin || b.c.interetExterieur - a.c.interetExterieur).map(({ j, c }) => {
                  const nego = manager.negociations.findLast((n) => n.joueur.id === j.id && n.nature !== 'recrutement');
                  const mois = moisRestantsContrat(c.fin, manager.saison, manager.semaine);
                  const palier = palierContrat(mois);
                  const dispo = disponibiliteJoueur(avancee.profilsMedicaux[j.id], manager.saison);
                  return <article key={j.id} className={`${c.demandeRevalorisation ? 'revalorisation ' : ''}palier-${palier}`}>
                    <span><b>{j.nom}</b><small>{c.role} · fin S{c.fin} · {c.option === 'aucune' ? 'sans option' : `option ${c.option}`}</small></span>
                    {/* ⚠️ LE COMPTE À REBOURS EST LA VRAIE INFORMATION. « Fin
                        S4 » ne dit pas s'il faut agir cette semaine ; « 6 mois »
                        si. Les paliers viennent de `palierContrat`, la seule
                        définition, et colorent la ligne. */}
                    <div className={`echeance-contrat ${palier}`}><small>Échéance</small><strong>{mois <= 0 ? 'Libre' : `${mois} mois`}</strong></div>
                    <div><small>Salaire</small><strong>{c.salaire > 0 ? `${nombre(c.salaire)} €` : 'amateur'}</strong></div>
                    <div><small>Satisfaction</small><strong>{c.satisfaction}/100</strong></div>
                    <div><small>Attachement</small><strong>{c.attachement}/100{c.formeAuClub ? ' · formé ici' : ''}</strong></div>
                    <div><small>Disponibilité</small><strong>{dispo.possibles ? `${dispo.part}%` : '—'}</strong></div>
                    <div><small>Intérêt extérieur</small><strong>{c.interetExterieur}/100 · {c.offresExterieures} offre(s)</strong></div>
                    <small className="motivations-contrat">{c.motivations.map((m) => `${m.type} ${m.importance}`).join(' · ')}{palier === 'danger' ? ' · les clubs peuvent se positionner librement' : palier === 'libre' ? ' · il part libre en fin de saison' : ''}</small>
                    <button className={c.demandeRevalorisation ? 'danger' : ''} disabled={nego?.etat === 'signee' && nego.saison === manager.saison} onClick={() => ouvrirRenegociationJoueur(j.id)}>{nego?.etat === 'ouverte' || nego?.etat === 'accord' ? 'Reprendre la négociation' : c.demandeRevalorisation ? 'Négocier la revalorisation' : c.fin <= manager.saison + 1 ? 'Prolonger' : 'Ouvrir les discussions'}</button>
                  </article>;
                })}</div>
              </section>

              {profonde && <section className="carte relations-joueurs-manager">
                <div className="comp-tete"><div><b><Icone nom="poignee" taille={16} /> Relations entre joueurs</b><small>Amitié, respect, rivalité, mentorat, conflit et famille continuent d’exister sans passer par le manager.</small></div><span className="comp-count">{profonde.relations.length}</span></div>
                <div>{profonde.relations.filter((r) => effectifBrut.some((j) => j.id === r.joueurA) && effectifBrut.some((j) => j.id === r.joueurB)).slice(0, 18).map((relation) => { const a = effectifBrut.find((j) => j.id === relation.joueurA); const b = effectifBrut.find((j) => j.id === relation.joueurB); return <article key={relation.id} className={relation.type}><span><b>{a?.nom}</b><i>↔</i><b>{b?.nom}</b></span><em>{relation.type}</em><div><i><em style={{ width: `${relation.intensite}%` }} /></i><strong>{relation.intensite}</strong></div></article>; })}</div>
              </section>}

              {profonde && <section className="carte integration-joueurs-manager">
                <div className="comp-tete"><div><b><Icone nom="monde" taille={16} /> Adaptation et projets de vie</b><small>Compatriotes, langue et adaptabilité accélèrent l’intégration. L’argent ne suffit pas toujours à retenir un joueur.</small></div></div>
                <div className="table-integration-entete"><span>Joueur</span><span>Pays</span><span>Club</span><span>Langue</span><span>Cohésion</span><span>Projet</span></div>
                {effectifBrut.map((j) => profonde.integrations[j.id]).filter(Boolean).sort((a, b) => a.cohesion - b.cohesion).slice(0, 20).map((integration) => <article key={integration.joueurId}><span><b>{integration.nom}</b><small>{nomNation(integration.nation)} · adaptabilité {integration.adaptabilite}</small></span>{[
                  integration.adaptationPays, integration.adaptationClub, integration.langue, integration.cohesion,
                ].map((valeur, index) => <div key={index}><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></div>)}<em>{integration.ambitionRevelee ? integration.ambition.replace(/([A-Z])/g, ' $1').toLowerCase() : 'Ambition encore cachée'}<small>{integration.preferenceAvenir !== 'indecis' ? ` · préfère ${integration.preferenceAvenir}` : ''}</small></em></article>)}
              </section>}

              <section className="carte promesses-manager">
                <div className="comp-tete"><div><b><Icone nom="signature" taille={16} /> Promesses</b><small>Une promesse respectée construit la relation ; une parole rompue atteint aussi l’agent.</small></div><span className="comp-count">{avancee.promesses.filter((p) => p.etat === 'active').length}</span></div>
                {avancee.promesses.slice().reverse().slice(0, 12).map((p) => <article key={p.id} className={p.etat}><span><b>{p.nom}</b><small>{p.type} · échéance semaine {p.echeance}</small></span><progress value={p.progression} max={p.objectif} /><strong>{p.progression}/{p.objectif}</strong><em>{p.etat}</em></article>)}
                {!avancee.promesses.length && <p className="manager-vide-texte">Aucune parole formelle donnée.</p>}
              </section>

              <section className="carte infirmerie-manager">
                <div className="comp-tete"><div><b><Icone nom="soin" taille={16} /> Cellule médicale</b><small>Diagnostic progressif, guérison, condition, rythme et rechute sont suivis séparément.</small></div><span className="comp-count">{dossiersMedicaux.length}</span></div>
                {dossiersMedicaux.map((d) => {
                  const phase = d.phase ?? 'diagnostic';
                  const profil = avancee.profilsMedicaux[d.joueurId];
                  const diagnosticEnAttente = phase === 'suspicion';
                  const reprise = phase === 'reprise';
                  return <article key={d.id} className={`phase-${phase}`}><header><span><b>{d.nom}</b><small>{diagnosticEnAttente ? d.diagnosticInitial : d.type} · {d.zone} · {d.origine}{d.minute ? ` à la ${d.minute}e` : ''}</small></span><strong>{phase} · {d.disponibilite}%</strong></header>
                    <div className="medical-fitness"><span><small>Guérison</small><b>{d.guerison ?? 0}%</b></span><span><small>Condition</small><b>{d.condition ?? 0}%</b></span><span><small>Rythme</small><b>{d.rythme ?? 0}%</b></span><span><small>Rechute</small><b>{d.risqueRechute ?? d.risqueAggravation}%</b></span></div>
                    <p>{diagnosticEnAttente ? `Examens : résultat dans ${d.diagnosticDans ?? 0} semaine(s).` : `${d.semaines} semaine(s) de soins · douleur ${d.douleur}/100`}{d.protocoleCommotion && ' · protocole commotion obligatoire'}{profil?.historique.length ? ` · ${profil.historique.length} antécédent(s), ${profil.commotions} commotion(s)` : ''}</p>
                    {diagnosticEnAttente ? <em>Le staff protège le joueur jusqu’au diagnostic.</em> : d.decision === 'attente' ? <div>{reprise ? <><button onClick={() => deciderMedical(d.id, 'reserve')}>Réserves</button><button onClick={() => deciderMedical(d.id, 'reprise20')}>20 minutes</button><button onClick={() => deciderMedical(d.id, 'reprise40')}>40 minutes</button><button className="danger" onClick={() => deciderMedical(d.id, 'retourDirect')}>Retour direct</button></> : <><button onClick={() => deciderMedical(d.id, 'repos')}>Repos complet</button><button onClick={() => deciderMedical(d.id, 'disponible')}>Disponible si besoin</button>{!d.protocoleCommotion && <button className="danger" onClick={() => deciderMedical(d.id, 'forcer')}>Forcer le retour</button>}</>}</div> : <em>Plan actuel : {d.decision}</em>}
                  </article>;
                })}
                {!dossiersMedicaux.length && <p className="manager-vide-texte">Infirmerie vide.</p>}
              </section>

              {/* ⚠️ LA DISPONIBILITÉ EST UNE PAGE À PART, pas une ligne perdue
                  dans l'infirmerie. C'est le chiffre qu'on veut voir AVANT de
                  signer trois ans à un joueur de 32 ans : combien de matchs le
                  club a joués pendant qu'il était là, combien il en a été
                  réellement disponible, et ce que ses blessures lui ont coûté
                  en jours. Tout est compté match par match — jamais estimé. */}
              <section className="carte disponibilite-manager">
                <div className="comp-tete"><div><b><Icone nom="resultats" taille={16} /> Disponibilité · trois dernières saisons</b><small>Matchs possibles, matchs réellement disponibles, titularisations et jours perdus. C’est ce bilan que regarde un club avant de garantir un long contrat.</small></div></div>
                <div className="table-disponibilite-entete"><span>Joueur</span><span>Possibles</span><span>Disponible</span><span>Titulaire</span><span>Jours blessé</span><span>Taux</span></div>
                {effectifBrut.map((j) => ({ j, d: disponibiliteJoueur(avancee.profilsMedicaux[j.id], manager.saison), p: avancee.profilsMedicaux[j.id] }))
                  .filter(({ d }) => d.possibles > 0)
                  .sort((a, b) => a.d.part - b.d.part).slice(0, 20)
                  .map(({ j, d, p }) => <article key={j.id} className={d.part < 70 ? 'fragile' : d.part < 88 ? 'moyenne' : ''}>
                    <span><b>{j.nom}</b><small>{j.age} ans · {nomPoste(j.poste)}{p?.commotions ? ` · ${p.commotions} commotion(s)` : ''}</small></span>
                    <strong>{d.possibles}</strong><strong>{d.disponibles}</strong><strong>{d.titularisations}</strong>
                    <strong>{d.joursBlesse}</strong>
                    <em><i><b style={{ width: `${d.part}%` }} /></i>{d.part}%</em>
                    <small className="historique-blessures">{(p?.historique ?? []).slice(-4).reverse()
                      .map((h) => `${h.type} — ${h.jours ?? '?'} j`).join(' · ') || 'Aucune blessure enregistrée'}</small>
                  </article>)}
                {!effectifBrut.some((j) => disponibiliteJoueur(avancee.profilsMedicaux[j.id], manager.saison).possibles > 0)
                  && <p className="manager-vide-texte">Le premier match joué ouvrira les compteurs de disponibilité.</p>}
              </section>

              {!!approchesEnCours.length && <section className="carte approches-manager">
                <div className="comp-tete"><div><b><Icone nom="monde" taille={16} /> Clubs qui se positionnent</b><small>Ils viennent chercher un joueur que tu n’as pas mis en vente. La réponse se donne dans L’Ovale — et le joueur l’apprendra.</small></div><span className="comp-count">{approchesEnCours.length}</span></div>
                {approchesEnCours.map((a) => <article key={a.id}>
                  <span><b>{a.nom}</b><small>{a.club} · {a.division} · {a.saisonsRestantes} saison(s) de contrat</small></span>
                  <strong>{nombre(a.offre)} €</strong>
                  <button onClick={() => { setVue('ovale'); ouvrirMessages(); }}>Répondre</button>
                </article>)}
              </section>}

              {!!convocationsActives.length && <section className="carte convocations-manager"><div className="comp-tete"><b><Icone nom="drapeau" taille={16} /> Absents en sélection</b></div>{convocationsActives.map((c) => <p key={c.id}><b>{c.nom}</b> · {c.nation} · {c.competition}</p>)}</section>}
            </div>
          )}

          {vue === 'univers' && avancee && (
            <div className="manager-avance-grille univers-manager">
              <section className="carte avance-entete"><div><div className="eyebrow">Le monde continue sans toi</div><h2><Icone nom="journal" taille={20} /> Actualités issues de la sauvegarde</h2><p>Résultats, blessures, sélections, finances et changements d’entraîneur viennent des systèmes de jeu, jamais d’un tirage décoratif.</p></div><div className="avance-score"><b>{avancee.actualites.length}</b><span>faits mémorisés</span></div></section>
              {profonde && <section className="carte profil-tactique-manager"><div className="comp-tete"><div><b><Icone nom="entraineur" taille={16} /> Ton identité d’entraîneur</b><small>Elle se construit sur les consignes réellement utilisées en match et influence les clubs prêts à te recruter.</small></div><span className="comp-count">{profonde.profilManager.matchsObserves} matchs</span></div><div className="tags-manager">{profonde.tagsManager.map((tag) => <strong key={tag}>{tag}</strong>)}{!profonde.tagsManager.length && <small>Les premiers tags apparaîtront quand ton style deviendra lisible.</small>}</div><div className="axes-profil-manager">{[
                ['Jeu au large', profonde.profilManager.jeuAuLarge], ['Jeu au pied', profonde.profilManager.jeuAuPied], ['Possession', profonde.profilManager.possession], ['Rythme', profonde.profilManager.rythme], ['Défense agressive', profonde.profilManager.defenseAgressive], ['Conquête', profonde.profilManager.conquete],
              ].map(([label, valeur]) => <label key={String(label)}><span>{label}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{valeur}</b></label>)}</div></section>}

              {vieProfonde && <section className="carte reputation-club-manager"><div className="comp-tete"><div><b><Icone nom="journal" taille={16} /> Réputation et publics</b><small>Être immense localement ne signifie pas encore être connu à l’étranger.</small></div></div><div className="trois-reputations"><span><small>Locale</small><b>{vieProfonde.reputations.locale}</b></span><span><small>Nationale</small><b>{vieProfonde.reputations.nationale}</b></span><span><small>Internationale</small><b>{vieProfonde.reputations.internationale}</b></span></div><div className="profils-supporters">{Object.entries(vieProfonde.supporters.profils).map(([profil, part]) => <label key={profil}><span>{profil}</span><i><em style={{ width: `${part}%` }} /></i><b>{part}%</b></label>)}</div></section>}

              {vieProfonde && <section className="carte marketing-joueurs-manager"><div className="comp-tete"><div><b><Icone nom="etoile" taille={16} /> Niveau sportif ≠ valeur culturelle</b><small>Popularité et marketing rapportent maillots, sponsors, réseaux et affluence. Dernière saison : {nombre(vieProfonde.revenuMarketingDerniereSaison)} €.</small></div></div><div>{Object.values(vieProfonde.popularites).sort((a, b) => b.locale - a.locale).slice(0, 16).map((p) => { const joueur = effectifBrut.find((j) => j.id === p.joueurId); return <article key={p.joueurId}><span><b>{p.nom}</b><small>Général {joueur?.note ?? '—'}</small></span><label><small>Local</small><b>{p.locale}</b></label><label><small>National</small><b>{p.nationale}</b></label><label><small>International</small><b>{p.internationale}</b></label><strong>Marketing {p.marketing}</strong></article>; })}</div></section>}
              <section className="carte fil-actualites-manager"><div className="comp-tete"><b>Fil d’actualité</b></div>{avancee.actualites.slice().reverse().slice(0, 30).map((actu) => <article key={actu.id} className={`importance-${actu.importance}`}><span>{actu.categorie}</span><div><b>{actu.titre}</b><p>{actu.texte}</p><small>S{actu.saison} · semaine {actu.semaine}{actu.club && ` · ${actu.club}`}</small></div></article>)}{!avancee.actualites.length && <p className="manager-vide-texte">La saison vient de commencer. Les vrais événements apparaîtront ici.</p>}</section>

              {identiteClub && <section className="carte adn-club"><div className="comp-tete"><div><b><Icone nom="formation" taille={16} /> ADN de {manager.club}</b><small>Il faut plusieurs saisons cohérentes pour le transformer.</small></div></div><div className="traits-adn">{traitsDominants(identiteClub).map((axe) => <strong key={axe}>{axe}</strong>)}</div><div className="axes-adn">{Object.entries(identiteClub).map(([axe, valeur]) => <label key={axe}><span>{axe}</span><i><em style={{ width: `${valeur}%` }} /></i><b>{Math.round(valeur)}</b></label>)}</div></section>}

              <section className="carte rivalites-manager"><div className="comp-tete"><div><b><Icone nom="sifflet" taille={16} /> Rivalités dynamiques</b><small>Les matchs serrés, finales, luttes et transferts les nourrissent lentement.</small></div></div>{rivalitesClub.map((r) => { const autre = r.clubs.find((c) => c !== manager.club); return <article key={r.clubs.join('-')}><span><b>{manager.club} — {autre}</b><small>{r.causes.join(' · ') || 'proximité et histoire en construction'}</small></span><i><em style={{ width: `${r.intensite}%` }} /></i><strong>{Math.round(r.intensite)}/100</strong></article>; })}{!rivalitesClub.length && <p className="manager-vide-texte">Aucune rivalité n’a encore franchi le seuil public de 20/100.</p>}</section>

              <section className="carte monde-clubs-manager"><div className="comp-tete"><div><b><Icone nom="monde" taille={16} /> Clubs et entraîneurs IA</b><small>Richesse, infrastructures, stratégie et carrière du coach évoluent chaque été.</small></div><span className="comp-count">{Object.keys(avancee.clubsMonde).length}</span></div><div>{Object.values(avancee.clubsMonde).sort((a, b) => Math.abs(b.tendance) - Math.abs(a.tendance)).slice(0, 18).map((club) => { const coach = avancee.entraineursIA[club.entraineurId]; return <article key={club.club}><span><b>{club.club}</b><small>{club.strategie} · {club.professionnel ? 'pro' : 'amateur/semi-pro'}</small></span><strong className={club.tendance >= 0 ? 'cl-plus' : 'cl-moins'}>{club.tendance > 0 ? '+' : ''}{club.tendance}</strong><small><Icone nom="euro" taille={12} /> {club.richesse} · <Icone nom="stade" taille={12} /> {club.infrastructures}</small><em>{coach?.nom} · contrat {coach?.contrat ?? 0} an(s)</em></article>; })}</div></section>
            </div>
          )}

          {vue === 'histoire' && avancee && (
            <div className="manager-avance-grille histoire-manager">
              <section className="carte avance-entete"><div><div className="eyebrow">Aucune saison ne disparaît</div><h2><Icone nom="livre" taille={20} /> Mémoire de la sauvegarde</h2><p>Palmarès des compétitions, carrières saison par saison, anciens joueurs, Hall of Fame et reconversions restent consultables.</p></div><div className="avance-score"><b>{Object.values(avancee.histoire).reduce((n, s) => n + s.length, 0)}</b><span>saisons archivées</span></div></section>
              {profonde && <section className="carte chronologie-annuelle-manager"><div className="comp-tete"><div><b><Icone nom="chrono" taille={16} /> L’année en événements</b><small>Transferts, licenciements, sélections, records, titres, retraites et décisions majeures restent consultables saison par saison.</small></div><Selecteur options={[{ valeur: String(manager.saison), label: `Saison ${manager.saison}` }, ...saisonsMemoire.filter((s) => s !== manager.saison).map((s) => ({ valeur: String(s), label: `Saison ${s}` }))]} valeur={String(saisonChronologie)} onChange={(v) => setSaisonChronologie(Number(v))} /></div><div>{chronologieVisible.map((evenement) => <article key={evenement.id} className={`importance-${evenement.importance}`}><time>{evenement.mois}</time><span>{evenement.categorie}</span><div><b>{evenement.titre}</b><p>{evenement.texte}</p></div></article>)}{!chronologieVisible.length && <p className="manager-vide-texte">Aucun événement majeur enregistré pour cette saison. Les faits ordinaires restent dans le journal du club.</p>}</div></section>}

              {vieProfonde && <section className="carte records-club-manager"><div className="comp-tete"><div><b><Icone nom="trophee" taille={16} /> Records de {manager.club}</b><small>Ils sont recalculés après chaque match et une notification marque chaque nouveau sommet.</small></div><span className="comp-count">{Object.keys(vieProfonde.records.club).length}</span></div><div>{Object.values(vieProfonde.records.club).map((record) => <article key={record.id}><span><b>{record.libelle}</b><small>{record.joueurNom || record.adversaire || `Saison ${record.saison}`}</small></span><strong>{record.valeur.toLocaleString('fr-FR')} {record.unite}</strong></article>)}{!Object.keys(vieProfonde.records.club).length && <p className="manager-vide-texte">Le premier match joué ouvrira le livre des records.</p>}</div><h3>Records du championnat</h3><div>{Object.values(vieProfonde.records.championnat).map((record) => <article key={record.id}><span><b>{record.libelle}</b><small>Saison {record.saison}</small></span><strong>{record.valeur.toLocaleString('fr-FR')} {record.unite}</strong></article>)}</div></section>}

              {vieProfonde && <section className="carte xv-historique-manager"><div className="comp-tete"><div><b><Icone nom="maillot" taille={16} /> XV historique du club</b><small>Matchs, essais, points, capitanat, fidélité et numéro porté composent le score.</small></div></div><div>{POSTES.map((poste) => { const joueur = vieProfonde.records.xvHistorique[poste.id]; return <article key={poste.id}><span className="numero-xv">{poste.numero}</span><span><small>{nomPoste(poste.id)}</small><b>{joueur?.nom ?? 'Place à écrire'}</b></span><strong>{joueur ? `${joueur.scoreHistorique} pts` : '—'}</strong>{joueur && <small>{joueur.matchs} m. · {joueur.essais} e. · {joueur.capitanats} cap.</small>}</article>; })}</div></section>}

              {profonde && !!profonde.finsCarriere.length && <section className="carte fins-carriere-manager"><div className="comp-tete"><div><b><Icone nom="trophee" taille={16} /> Derniers chapitres</b><small>Retraites, retours au club formateur et rôles réduits donnent une fin aux personnages.</small></div></div>{profonde.finsCarriere.slice().reverse().slice(0, 18).map((fin) => <article key={`${fin.joueurId}-${fin.saison}`} className={fin.hommage ? 'hommage' : ''}><span><b>{fin.nom}</b><small>{fin.age} ans · saison {fin.saison} · {fin.choix}</small></span><p>{fin.texte}</p>{fin.hommage && <strong><Icone nom="stade" taille={14} /> Tifo · hommage · standing ovation</strong>}</article>)}</section>}
              <section className="carte palmares-competition"><div className="comp-tete"><b><Icone nom="trophee" taille={16} /> Palmarès par compétition</b><Selecteur options={optionsDivisions} valeur={competitionHistoire} onChange={setCompetitionHistoire} recherche /></div>{archiveVisible.map((s) => <article key={s.saison}><strong>S{s.saison}</strong><span><b>{s.champion}</b><small>{s.finaliste ? `Finaliste : ${s.finaliste}` : ''}</small></span><em>{s.montees.length ? `↑ ${s.montees.join(', ')}` : ''}{s.relegations.length ? ` · ↓ ${s.relegations.join(', ')}` : ''}</em></article>)}{!archiveVisible.length && <p className="manager-vide-texte">Cette compétition sera archivée à la prochaine fin de saison.</p>}</section>
              <section className="carte hall-club-manager"><div className="comp-tete"><div><b><Icone nom="institution" taille={16} /> Hall of Fame · {manager.club}</b><small>Score local : fidélité, matchs, titres, capitanat et performances.</small></div><span className="comp-count">{hallClub.length}</span></div>{hallClub.map((f) => <article key={f.id}><strong>{f.score}</strong><span><b>{f.nom}</b><small>{f.rang} · {f.saisonsAuClub} saison(s) · {f.matchsAuClub} matchs</small></span><em>{f.titresAuClub} titre(s)</em></article>)}{!hallClub.length && <p className="manager-vide-texte">Il faut du temps pour devenir une icône. Les carrières sont déjà comptées.</p>}</section>
              <section className="carte carrieres-joueurs-manager"><div className="comp-tete"><div><b><Icone nom="resultats" taille={16} /> Historiques de joueurs</b><small>Les totaux survivent aux transferts et à la retraite.</small></div><span className="comp-count">{avancee.carrieresJoueurs.length}</span></div>{avancee.carrieresJoueurs.slice().reverse().slice(0, 25).map((c) => { const total = totaux(c); return <details key={c.id}><summary><span><b>{c.nom}</b><small>{total.clubs.join(' → ')}</small></span><strong>{total.matchs} matchs · {total.essais} essais · {total.selections} sél.</strong></summary><div>{c.saisons.map((s) => <p key={`${s.saison}-${s.club}`}><b>{s.resume ? `${s.saisonsResumees} saisons résumées` : `S${s.saison}`}</b> · {s.club} · {s.matchs} matchs · {s.titularisations} titularisations · {s.minutes} min · {s.essais} essais · note {s.note.toFixed(1)}</p>)}</div></details>; })}</section>
              <section className="carte anciens-staff-manager"><div className="comp-tete"><div><b><Icone nom="entraineur" taille={16} /> Anciens joueurs reconvertis</b><small>Le personnage staff reste lié à son historique de joueur.</small></div><span className="comp-count">{avancee.staffAnciens.length}</span></div>{avancee.staffAnciens.map((s) => <article key={s.id}><b>{s.nom}</b><span>{s.role}</span><small>{s.club} · réputation {s.reputation} · joueur depuis S{s.joueurDepuis}</small></article>)}{!avancee.staffAnciens.length && <p className="manager-vide-texte">Les premières reconversions apparaîtront avec les retraites du groupe.</p>}</section>
            </div>
          )}

          {vue === 'equipe' && (
            <div className="manager-equipe">
              <section className="carte manager-composition-tete">
                <div>
                  <div className="eyebrow">{t('compo.feuilleEffectif', { feuille: composition.titulaires.length + composition.remplacants.length, effectif: effectifComplet.length })}</div>
                  <h2><Icone nom="equipe" taille={20} /> Ton XV, ton banc, tes rôles</h2>
                  <p>Chaque choix est transmis au moteur. Un joueur hors de son poste perd la cohérence collective ; le buteur et le capitaine influencent réellement les pénalités et la discipline.</p>
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
                  <div className="manager-note-compo"><b>{noteCompositionManager(effectif, composition).toFixed(1)}</b><span>note du XV</span></div>
                </div>
              </section>

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

              <section className="carte manager-roles-visuels">
                <div><b><Icone nom="profil" taille={16} /> Rôles du groupe</b><span>Le brassard et la cible apparaissent directement sur les cartes.</span></div>
                <label>
                  <span><Icone nom="brassard" taille={14} /> Capitaine</span>
                  <Selecteur
                    options={optionsCapitaines}
                    valeur={composition.capitaineId}
                    onChange={(id) => definirComposition({ ...composition, capitaineId: id })}
                    recherche
                  />
                </label>
                <label>
                  <span><Icone nom="cible" taille={14} /> Buteur</span>
                  <Selecteur
                    options={optionsButeurs}
                    valeur={composition.buteurId}
                    onChange={(id) => definirComposition({ ...composition, buteurId: id })}
                    recherche
                  />
                </label>
              </section>

              <section className="carte manager-plan-avant-match">
                <div className="comp-tete"><b><Icone nom="entraineur" taille={16} /> Plan de jeu initial</b><span>modifiable pendant le match</span></div>
                <div className="manager-tactiques-selects">
                  <label><span>Attaque</span><Selecteur options={optionsTactiques.attaque} valeur={manager.tactique.attaque} onChange={(v) => majTactique('attaque', v as TactiqueManager['attaque'])} /></label>
                  <label><span>Défense</span><Selecteur options={optionsTactiques.defense} valeur={manager.tactique.defense} onChange={(v) => majTactique('defense', v as TactiqueManager['defense'])} /></label>
                  <label><span>Rythme</span><Selecteur options={optionsTactiques.rythme} valeur={manager.tactique.rythme} onChange={(v) => majTactique('rythme', v as TactiqueManager['rythme'])} /></label>
                  <label><span>Pénalités</span><Selecteur options={optionsTactiques.penalites} valeur={manager.tactique.penalites} onChange={(v) => majTactique('penalites', v as TactiqueManager['penalites'])} /></label>
                  <label><span>Remplacements</span><Selecteur options={optionsTactiques.remplacements} valeur={manager.tactique.remplacements} onChange={(v) => majTactique('remplacements', v as TactiqueManager['remplacements'])} /></label>
                </div>
              </section>
            </div>
          )}

          {vue === 'match' && (
            <div className="manager-match-centre">
              {!afficheManager ? (
                <section className="carte manager-match-vide"><span><Icone nom="calendrier" taille={32} /></span><h2>Pas de match cette semaine</h2><p>Le calendrier laisse une fenêtre de récupération. Tu peux préparer la suite puis avancer.</p><button className="btn primaire" onClick={semaineManager}>▶ Semaine suivante</button></section>
              ) : (
                <section className="carte manager-affiche-match">
                  <div className="eyebrow">{libelleAfficheManager(afficheManager, manager.divisionNom)}</div>
                  {derbyMemo?.derby && (
                    <div className="manager-contexte-derby">
                      <span><Icone nom="flamme" taille={14} /> {derbyMemo.libelle} · {derbyMemo.distance} km</span>
                      <b>+{derbyMemo.motivation} de motivation</b>
                      <small>Pression {derbyMemo.pression}/100 · exposition médias +{derbyMemo.medias}%</small>
                    </div>
                  )}
                  <div className="manager-duel">
                    <span>{clubParNom(afficheManager.match.domicile) && <Blason club={clubParNom(afficheManager.match.domicile)!} taille={54} />}<b>{afficheManager.match.domicile}</b></span>
                    <strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : 'VS'}</strong>
                    <span>{clubParNom(afficheManager.match.exterieur) && <Blason club={clubParNom(afficheManager.match.exterieur)!} taille={54} />}<b>{afficheManager.match.exterieur}</b></span>
                  </div>
                  {resultatManager ? (
                    <div className="manager-match-joue"><b><Icone nom="check" taille={14} /> Résultat enregistré dans la compétition</b><p>{resultatManager.essaisPour} essai{resultatManager.essaisPour > 1 ? 's' : ''} marqué{resultatManager.essaisPour > 1 ? 's' : ''} · confiance du board mise à jour.</p><button className="btn primaire" onClick={semaineManager}>{manager.semaine >= SEMAINES_PAR_SAISON ? 'Clore la saison' : '▶ Semaine suivante'}</button></div>
                  ) : (
                    <div className="manager-lancer-match"><p>Le XV, le banc, le capitaine, le buteur et le plan de jeu seront figés au coup d’envoi. Les consignes collectives resteront modifiables en direct.</p><div><button className="btn fantome" onClick={() => setVue('equipe')}><Icone nom="equipe" taille={16} /> Vérifier la composition</button><button className="btn primaire grand" onClick={() => setMatchOuvert(afficheManager)}><Icone nom="sifflet" taille={18} /> Prendre place sur le banc</button></div></div>
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
                  <h2><Icone nom={vue === 'formation' ? 'formation' : vue === 'recruteurs' ? 'loupe' : 'halteres'} taille={20} /> {vue === 'formation' ? 'Centre de formation' : vue === 'recruteurs' ? 'Recruteurs' : 'Centre d’entraînement'}</h2>
                  <p>{vue === 'formation'
                    ? 'Fais grandir les joueurs du cru et suis chaque promotion sortie par le club.'
                    : vue === 'recruteurs'
                      ? 'Développe ton réseau : plus il progresse, plus les rapports sont nombreux et précis.'
                      : 'Choisis les joueurs qui travaillent individuellement sans jamais dépasser leur potentiel.'}</p>
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
                      <div className="inst-prix-fixes" aria-label="Prix fixes par niveau">{Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => <span key={i}>N{i + 1} · {nombre(coutAmelioration(i)!)} €</span>)}</div>
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
                      {cout !== null && !finance && <p className="inst-effet">Il manque {nombre(cout - manager.budgetStructure)} € dans l’enveloppe structures.</p>}
                    </section>
                  );
                })}
              </div>

              {vue === 'formation' && detectionJeunes && (
                <>
                  <section className="carte manager-centre-identite">
                    <div className="manager-centre-score">
                      <span>Note du centre</span>
                      <b>{detectionJeunes.noteGlobale}</b>
                      <small>{detectionJeunes.portee} · rayon {nombre(detectionJeunes.rayon)} km</small>
                    </div>
                    <div className="manager-centre-notes" aria-label="Les six notes du centre">
                      {AXES_CENTRE.map((axe) => (
                        <div key={axe}>
                          <span><Icone nom={ICONE_AXE[axe]} taille={14} /> {axe === 'installations' ? 'Installations' : axe === 'coaching' ? 'Coaching' : axe === 'recrutement' ? 'Recrutement' : axe === 'reseau' ? 'Réseau' : axe === 'medical' ? 'Médical' : 'Réputation'}</span>
                          <b>{detectionJeunes.notes[axe]}</b>
                          <i><em style={{ width: `${detectionJeunes.notes[axe]}%` }} /></i>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="carte manager-academie">
                    <div className="comp-tete">
                      <div><b><Icone nom="formation" taille={16} /> U18 et Espoirs</b><small>Chaque potentiel reste une estimation, même après la signature.</small></div>
                      <span className="comp-count">{academieClub.length}/{detectionJeunes.capacite}</span>
                    </div>
                    <div className="manager-formation-finances">
                      <span>Revenus de formation du club</span>
                      <b>{nombre(revenusFormationClub)} €</b>
                      <small>Les indemnités sont versées lorsqu’un autre club recrute un jeune formé ici.</small>
                    </div>
                    {!academieClub.length ? (
                      <div className="manager-vide-action">
                        <span><Icone nom="pousse" taille={16} /></span>
                        <div><b>Ton académie est prête</b><p>Ouvre les rapports, observe les profils et présente ton projet aux jeunes qui correspondent au club.</p></div>
                        <button className="btn primaire" onClick={() => setVue('recruteurs')}>Voir la promotion détectée</button>
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
                                    <p>{j.age} ans · {nomPoste(j.poste)} · {j.taille / 100} m · {j.poids} kg</p>
                                  </div>
                                </div>
                                <em className={`manager-categorie ${j.categorie}`}>{j.categorie === 'u18' ? 'U18' : j.categorie === 'pret' ? 'PRÊT' : 'ESPOIRS'}</em>
                              </header>
                              <div className="manager-jeune-kpis">
                                <span><small>Niveau</small><b>{j.note.toFixed(1)}</b></span>
                                <span><small>Potentiel estimé</small><b>{etoiles(estimation.etoilesBas, estimation.etoilesHaut)}</b></span>
                                <span><small>Temps de jeu</small><b>{j.tempsDeJeu}%</b></span>
                                <span><small>Moral</small><b>{j.moral}%</b></span>
                              </div>
                              <p className="manager-jeune-profil">
                                {niveauLisible(j.physique)} physiquement · {niveauLisible(j.technique)} techniquement · {niveauLisible(j.mental)} mentalement
                                {j.clubPret && <> · prêté à <b>{j.clubPret}</b></>}
                              </p>
                              {progression && (
                                <p className={`manager-progression-annuelle${progression.blesse ? ' blesse' : ''}`}>
                                  Saison {progression.saison} : {progression.noteAvant.toFixed(1)} → {progression.noteApres.toFixed(1)} · {progression.resume}
                                </p>
                              )}
                              <div className="manager-actions-academie">
                                <button disabled={!!motifObservation} title={motifObservation ?? 'Suivi interne gratuit'} onClick={() => observerJeune(j.id)}>Observer ({estimation.matchs}/10)</button>
                                <button disabled={!!motifEntretien} title={motifEntretien ?? 'Entretien interne gratuit'} onClick={() => observerJeune(j.id, true)}>{estimation.entretien ? 'Entretien réalisé' : 'Entretien famille'}</button>
                                <button disabled={j.age > 18 || j.categorie === 'u18'} onClick={() => gererAcademicien(j.id, 'u18')}>U18</button>
                                <button disabled={j.categorie === 'espoirs'} onClick={() => gererAcademicien(j.id, 'espoirs')}>Espoirs</button>
                                <button disabled={j.age < 18 || j.categorie === 'pret'} onClick={() => gererAcademicien(j.id, 'pret')}>Prêter</button>
                                <button className="primaire" disabled={j.age < 17} onClick={() => gererAcademicien(j.id, 'senior')}>Intégrer seniors</button>
                                <button className="danger" onClick={() => setJeuneALiberer(j.id)}>Libérer</button>
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
                  <div className="comp-tete"><div><b><Icone nom="chrono" taille={16} /> Charge de la semaine</b><small>Chaque activité fatigue différemment les postes et les zones du corps.</small></div><span className={`charge-risque risque-${risqueGroupe >= 65 ? 'haut' : risqueGroupe >= 40 ? 'moyen' : 'bas'}`}>Risque groupe {risqueGroupe}/100</span></div>
                  {chargeHebdo && <div className="reglages-charge">{([
                    ['physique', 'Physique'], ['contacts', 'Contacts'], ['sprint', 'Sprint'], ['melee', 'Mêlée'], ['recuperation', 'Récupération'],
                  ] as const).map(([axe, label]) => <article key={axe}><span><b>{label}</b><small>{axe === 'recuperation' ? 'réduit fatigue et risque' : axe === 'melee' ? 'avants · dos/épaules' : axe === 'sprint' ? 'trois-quarts · ischios/chevilles' : axe === 'contacts' ? 'commotions/épaules' : 'condition générale'}</small></span><div>{([0, 1, 2, 3] as const).map((niveau) => <button key={niveau} className={chargeHebdo[axe] === niveau ? 'actif' : ''} onClick={() => definirChargeEntrainement(axe, niveau)}>{['Aucun', 'Léger', 'Normal', 'Fort'][niveau]}</button>)}</div></article>)}</div>}
                  <p className="bilan-charge">Charge nette {chargeTotale.toFixed(1)} · une charge élevée améliore le rythme mais cumule fatigue et risque de récidive.</p>
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
                    <div><b><Icone nom="pousse" taille={16} /> Programmes de l’académie</b><small>Un objectif individuel et un mentor maximum par jeune.</small></div>
                    <span className="comp-count">{academieClub.length}</span>
                  </div>
                  {!academieClub.length ? (
                    <p className="manager-vide-texte">Recrute d’abord un jeune depuis l’onglet Recruteurs.</p>
                  ) : (
                    <div className="manager-plans-jeunes">
                      {academieClub.map((j) => (
                        <article key={j.id}>
                          <div>
                            <b>{j.nom}</b>
                            <span>{j.age} ans · {nomPoste(j.poste)} · {j.categorie === 'pret' ? `prêt à ${j.clubPret}` : j.categorie.toUpperCase()}</span>
                          </div>
                          <label>
                            <span>Objectif individuel</span>
                            <Selecteur
                              options={OBJECTIFS_JEUNES.map((o) => ({ valeur: o.id, label: o.nom, sous: o.effet }))}
                              valeur={j.objectif}
                              onChange={(v) => definirObjectifJeune(j.id, v as ObjectifJeuneManager)}
                            />
                          </label>
                          <label>
                            <span>Mentor senior</span>
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
                          <p><b>{nomObjectifJeune(j.objectif)}</b> · temps de jeu {j.tempsDeJeu}% · professionnalisme {j.professionnalisme}</p>
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
                      <div className="eyebrow">Promotion annuelle · {detectionJeunes.fiches.length} dossiers</div>
                      <h2><Icone nom="loupe" taille={20} /> Les jeunes existent déjà dans leurs clubs</h2>
                      <p>{nombre(detectionJeunes.candidatsVus)} joueurs dans le rayon du réseau. La cellule en remonte {detectionJeunes.fiches.length}, mais seuls les {detectionJeunes.prioritaires} premiers sont considérés prioritaires.</p>
                      {detectionJeunes.fiches.filter((f) => f.etoilesHaut >= 4.5).length >= 3 && (
                        <strong className="manager-generation-doree"><Icone nom="etoile" taille={14} /> Une génération exceptionnelle semble arriver — le scout peut encore se tromper.</strong>
                      )}
                    </div>
                    <div className={`manager-missions${detectionJeunes.deplacementsRestants === 0 ? ' epuise' : ''}`}>
                      <span className="manager-missions-icone" aria-hidden="true"><Icone nom="loupe" taille={16} /></span>
                      <b>{detectionJeunes.deplacementsRestants}/{detectionJeunes.deplacementsTotal}</b>
                      <span>déplacements restants</span>
                      <small>Entretien = 3 déplacements</small>
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
                      <b><Icone nom="loupe" taille={15} /> Chercher dans le vivier</b>
                      <small>{nombre(detectionJeunes.candidatsVus)} garçons à portée · rayon {nombre(detectionJeunes.rayon)} km</small>
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
                        placeholder="Nom ou club…"
                        aria-label="Chercher un jeune par nom ou par club"
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
                        {filtreJeuneActif ? 'Revenir à la promotion' : 'Voir tout le vivier'}
                      </button>
                    </div>
                    {filtreJeuneActif && vivier && (
                      <p className="manager-filtres-jeunes-bilan">
                        {vivier.total === 0
                          ? 'Aucun garçon ne correspond — élargis le filtre, ou fais progresser le réseau du centre pour agrandir le rayon.'
                          : `${nombre(vivier.total)} garçon${vivier.total > 1 ? 's' : ''} à portée${vivier.total > vivier.fiches.length ? ` · les ${vivier.fiches.length} plus proches sont affichés` : ''}`}
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
                                <span>{!vivier && index < detectionJeunes.prioritaires ? 'PRIORITAIRE' : 'DOSSIER À SUIVRE'}</span>
                                <h3>{j.nom}</h3>
                                <p>{j.age} ans · {nomPoste(j.poste)}</p>
                                <small>{j.club} · {nombre(j.distance)} km</small>
                              </div>
                            </div>
                            <strong className="manager-note-observee">{ficheJeune.noteObservee}<small>niveau<br />observé</small></strong>
                          </header>
                          <div className="manager-confiance-scout">
                            <span>Confiance du recruteur</span>
                            <i><em style={{ width: `${ficheJeune.confiance}%` }} /></i>
                            <b>{ficheJeune.confiance}%</b>
                          </div>
                          <div className="manager-potentiel-cache">
                            <span>Projection du potentiel</span>
                            <b>{etoiles(ficheJeune.etoilesBas, ficheJeune.etoilesHaut)}</b>
                            <small>Fourchette {ficheJeune.potentielBas}–{ficheJeune.potentielHaut} · estimation encore incertaine</small>
                          </div>
                          <div className="manager-jeune-attributs">
                            <span><b>Physique</b>{niveauLisible(j.physique)}</span>
                            <span><b>Technique</b>{niveauLisible(j.technique)}</span>
                            <span><b>Mental</b>{niveauLisible(j.mental)}</span>
                            <span><b>Profil</b>{j.style.replace('_', ' ')}</span>
                            <span><b>Gabarit</b>{j.taille / 100} m · {j.poids} kg</span>
                            <span><b>Pied</b>{j.piedFort}</span>
                          </div>
                          <p className="manager-observation-resume">
                            {ficheJeune.matchs} match{ficheJeune.matchs > 1 ? 's' : ''} observé{ficheJeune.matchs > 1 ? 's' : ''}
                            {ficheJeune.entretien ? ' · entretien réalisé' : ' · entretien non réalisé'}
                          </p>
                          {reponse && <p className={`manager-reponse-jeune ${reponse.etat}`}>{reponse.texte}</p>}
                          <div className="manager-actions-detection">
                            <button disabled={detectionJeunes.deplacementsRestants < 1 || ficheJeune.matchs >= 10 || dejaSigne} onClick={() => observerJeune(j.id)}><Icone nom="oeil" taille={15} /> Observer un match</button>
                            <button disabled={detectionJeunes.deplacementsRestants < 3 || ficheJeune.matchs < 3 || ficheJeune.entretien || dejaSigne} onClick={() => observerJeune(j.id, true)}>Entretien famille</button>
                            <button className="primaire" disabled={dejaSigne || detectionJeunes.occupes >= detectionJeunes.capacite} onClick={() => proposerProjetJeune(j.id)}>{dejaSigne ? 'Au centre' : 'Présenter le projet'}</button>
                          </div>
                          <small>{j.club === manager.club ? 'École du club : intégration au centre sans indemnité.' : 'Le jeune compare ton projet, la distance et les offres des autres centres.'}</small>
                          {motifObservationJeune(manager, j.id, false, detectionJeunes) && <small role="status">{motifObservationJeune(manager, j.id, false, detectionJeunes)}</small>}
                          {ficheJeune.matchs < 3 && <small>Entretien disponible après trois matchs observés.</small>}
                          {suivi && <small className="manager-rapport-date">Dossier suivi depuis la saison {suivi.saison}</small>}
                        </article>
                      );
                    })}
                  </section>

                  {!!manager.rapports.length && (
                    <details className="carte manager-rapports-pros">
                      <summary>Rapports du marché senior <span>{manager.rapports.length}</span></summary>
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
            <div className="manager-marche">
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
              {cibles.length > limiteMarche && <button className="btn secondaire" onClick={() => setLimiteMarche(n => n + 24)}>
                Afficher 24 joueurs de plus ({Math.min(limiteMarche, cibles.length)}/{cibles.length})
              </button>}
            </div>
          )}

          {vue === 'ovale' && (
            <div className="manager-ovale">
              <Suspense fallback={<div className="carte manager-vide">Ouverture de L’Ovale…</div>}>
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
      {raccrocher && <Confirmation titre={t('mgr.raccrocherTitre')} message={libre ? t('mgr.raccrocherLibre') : t('mgr.raccrocherClasse')} libelleOui={t('mgr.raccrocher')} onOui={() => { setRaccrocher(false); quitterBanc(); }} onNon={() => setRaccrocher(false)} />}
      {jeuneALiberer && (
        <Confirmation
          titre="Libérer ce jeune ?"
          message={`${academieClub.find((j) => j.id === jeuneALiberer)?.nom ?? 'Ce joueur'} quittera définitivement le centre de formation.`}
          libelleOui="Libérer"
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
      {demission && <Confirmation titre="Quitter le club ?" message={`Tu démissionneras de ${manager.club} immédiatement. Ta réputation et tout l’historique seront conservés, mais le calendrier s’arrêtera jusqu’à la signature d’un nouveau banc.`} libelleOui="Démissionner" onOui={() => { setDemission(false); demissionner(); }} onNon={() => setDemission(false)} />}
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
