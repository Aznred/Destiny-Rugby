// Le flux jouable de l'académie : détecter, convaincre, former, prêter,
// intégrer. Les nombres cachés restent dans ce module et ne sont jamais rendus
// directement par l'écran manager.

import { COMPETITIONS, competitionDuClub } from '../data/clubs.js';
import { POSTES_PAR_FAMILLE } from '../data/rugby.js';
import type {
  AcademicienManager, ActionAcademieManager, Manager, ObjectifJeuneManager,
  ObservationJeuneManager,
  PosteId,
} from '../types.js';
import { graine } from './championnat.js';
import {
  centresQuiObservent, etageDeDetection, notesDeBase, notesDuCentre,
  noteGlobaleCentre, rayonDeDetection, risqueCorrige,
} from './centreFormation.js';
import type { NotesCentre } from './centreFormation.js';
import {
  deplacementsParSaison, ficheDe, rapportDeSaison,
} from './detection.js';
import type { FicheDetection } from './detection.js';
import { effectifDuClub, forceEffectif } from './effectif.js';
import { NIVEAU_INSTALLATION_MAX, installationsVierges } from './installations.js';
import { familleDe, progresser } from './jeunes.js';
import {
  choisirSonClub, indemniteDeFormation, offreDe, rayonAcceptable,
} from './signatureJeune.js';
import { jeunesAPortee, jeunesInternationaux } from './viviers.js';
import type { JeuneRepere } from './viviers.js';

export const OBJECTIFS_JEUNES: { id: ObjectifJeuneManager; nom: string; effet: string }[] = [
  { id: 'prise_masse', nom: 'Prise de masse', effet: 'physique et gabarit' },
  { id: 'vitesse', nom: 'Vitesse', effet: 'explosivité' },
  { id: 'passe', nom: 'Passe', effet: 'technique' },
  { id: 'jeu_au_pied', nom: 'Jeu au pied', effet: 'technique et calme' },
  { id: 'defense', nom: 'Défense', effet: 'mental et physique' },
  { id: 'melee', nom: 'Mêlée', effet: 'force et technique' },
  { id: 'touche', nom: 'Touche', effet: 'technique et lecture' },
  { id: 'endurance', nom: 'Endurance', effet: 'physique' },
  { id: 'polyvalence', nom: 'Polyvalence', effet: 'poste secondaire' },
];

export function nomObjectifJeune(id: ObjectifJeuneManager): string {
  return OBJECTIFS_JEUNES.find((o) => o.id === id)?.nom ?? id;
}

export function capaciteAcademie(niveauFormation: number): number {
  return 8 + Math.min(NIVEAU_INSTALLATION_MAX, Math.max(0, niveauFormation)) * 3;
}

export interface TableauDetectionManager {
  notes: NotesCentre;
  noteGlobale: number;
  rayon: number;
  portee: ReturnType<typeof etageDeDetection>;
  fiches: FicheDetection[];
  /** TOUT ce qui est à portée du rayon, pas seulement le rapport annuel. */
  vivier: JeuneRepere[];
  prioritaires: number;
  candidatsVus: number;
  deplacementsTotal: number;
  deplacementsUtilises: number;
  deplacementsRestants: number;
  capacite: number;
  occupes: number;
}

/** Le rapport annuel : 8 à 20 noms, dont 2 à 5 profils prioritaires. */
export function tableauDetectionManager(manager: Manager): TableauDetectionManager {
  const murs = manager.installations[manager.club] ?? installationsVierges();
  const notes = notesDuCentre(manager.club, manager.installations);
  const rayon = rayonDeDetection(notes.reseau);
  const portee = etageDeDetection(notes.reseau);
  const estDisponible = (j: JeuneRepere) => !manager.academie.some((a) => a.id === j.id)
    && !manager.jeunesFormes.some((a) => a.id.endsWith(`-academie-${j.id}`));
  const candidatsNationaux = jeunesAPortee(manager.club, manager.saison, rayon, 14).filter(estDisponible);
  const candidatsEtrangers = portee === 'international'
    ? jeunesInternationaux(manager.club, manager.saison).filter(estDisponible)
    : [];
  const candidats = [
    ...candidatsNationaux,
    ...candidatsEtrangers,
  ]
    .filter((j) => !manager.academie.some((a) => a.id === j.id));
  const combien = 8 + Math.min(NIVEAU_INSTALLATION_MAX, murs.recrutement) * 3;
  // Un joueur déjà observé ne disparaît jamais du tableau parce qu'une
  // nouvelle estimation a rebattu le classement des autres dossiers.
  const suivis = candidats.filter((j) => !!manager.observationsJeunes[j.id]);
  const fichesSuivies = suivis.map((j) => ficheDe(
    j, notes, manager.observationsJeunes[j.id], manager.club,
  ));
  // Le rapport ne doit pas être rempli uniquement de pépites trop éloignées.
  // L'école du club fournit aussi de vrais dossiers, intégrables sans transfert.
  const locaux = rapportDeSaison(
    candidatsNationaux.filter((j) => j.club === manager.club && !manager.observationsJeunes[j.id]),
    notes, manager.observationsJeunes, manager.club,
    Math.min(2, Math.max(0, combien - fichesSuivies.length)),
  );
  const dejaRetenus = new Set([...fichesSuivies, ...locaux].map((f) => f.jeune.id));
  const placesLibres = Math.max(0, combien - dejaRetenus.size);
  const placesInternationales = portee === 'international'
    ? Math.min(3, placesLibres, 1 + murs.recrutement)
    : 0;
  const nouveauxInternationaux = rapportDeSaison(
    candidatsEtrangers.filter((j) => !dejaRetenus.has(j.id)),
    notes,
    manager.observationsJeunes,
    manager.club,
    placesInternationales,
  );
  const nouveauxNationaux = rapportDeSaison(
    candidatsNationaux.filter((j) => !dejaRetenus.has(j.id)
      && j.distance <= rayonAcceptable(j.age, notes)),
    notes,
    manager.observationsJeunes,
    manager.club,
    Math.max(0, placesLibres - nouveauxInternationaux.length),
  );
  const fiches = [...fichesSuivies, ...locaux, ...nouveauxInternationaux, ...nouveauxNationaux];
  const total = deplacementsParSaison(notes.reseau, notes.recrutement);
  const utilises = manager.missionsJeunes.saison === manager.saison
    ? manager.missionsJeunes.utilises : 0;
  const capacite = capaciteAcademie(murs.formation);
  return {
    notes,
    noteGlobale: noteGlobaleCentre(notes),
    rayon,
    portee,
    fiches,
    vivier: candidats,
    prioritaires: Math.min(5, 2 + murs.recrutement),
    candidatsVus: candidats.length,
    deplacementsTotal: total,
    deplacementsUtilises: utilises,
    deplacementsRestants: Math.max(0, total - utilises),
    capacite,
    occupes: manager.academie.filter((j) => j.clubCentre === manager.club).length,
  };
}

/** Ce qu'on peut demander au vivier, en plus de ce que la cellule remonte. */
export interface FiltresVivier {
  /** Poste exact (`''` = tous). */
  poste?: PosteId | '';
  /** Âge exact (`0` = tous). */
  age?: number;
  /** Nom ou club, insensible aux accents. */
  recherche?: string;
  /** Ne garder que les dossiers déjà observés. */
  suivisSeulement?: boolean;
}

const sansAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * LE VIVIER COMPLET, FILTRÉ.
 *
 * ⚠️ CE N'EST PAS UN CONTOURNEMENT DU NIVEAU DU CENTRE, C'EST SA RÉCOMPENSE.
 * Demande : « pouvoir filtrer plus, avoir accès à tous les jeunes dans un rayon
 * en fonction du niveau du centre, et filtrer par poste et âge ». Le rapport
 * annuel (`fiches`) reste ce que la CELLULE remonte d'elle-même — 8 à 20 noms
 * qu'elle a jugés dignes d'un dossier. Le vivier, lui, est tout ce qui est à
 * PORTÉE : c'est `rayonDeDetection(notes.reseau)` qui en fixe l'étendue, donc
 * un club de Régionale voit ses 50 km et le Stade Toulousain voit la France.
 * Améliorer le centre élargit le rayon ET resserre les fourchettes — on ne
 * gagne pas l'accès, on gagne la portée et la précision.
 *
 * ⚠️ ON PLAFONNE CE QU'ON REND. Un rayon national ramène plusieurs centaines de
 * garçons ; construire une fiche pour chacun à chaque frappe dans le champ de
 * recherche ferait ramer l'écran pour rien. `max` borne la liste rendue, et
 * `total` dit combien répondent vraiment au filtre — c'est ce nombre qui doit
 * s'afficher, pas la longueur du tableau.
 */
export function vivierFiltre(
  manager: Manager,
  filtres: FiltresVivier = {},
  max = 60,
  tableau = tableauDetectionManager(manager),
): { fiches: FicheDetection[]; total: number; ages: number[] } {
  const q = sansAccent((filtres.recherche ?? '').trim());
  const retenus = tableau.vivier.filter((j) => {
    if (filtres.poste && j.poste !== filtres.poste) return false;
    if (filtres.age && j.age !== filtres.age) return false;
    if (filtres.suivisSeulement && !manager.observationsJeunes[j.id]) return false;
    if (q && !sansAccent(`${j.nom} ${j.club}`).includes(q)) return false;
    return true;
  });

  // Les dossiers suivis d'abord — on ne perd pas de vue un garçon qu'on observe
  // depuis trois matchs parce qu'un autre est plus proche. Ensuite la distance :
  // c'est le critère qu'un centre de formation regarde en premier.
  retenus.sort((a, b) => {
    const sa = manager.observationsJeunes[a.id] ? 1 : 0;
    const sb = manager.observationsJeunes[b.id] ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return a.distance - b.distance;
  });

  const ages = [...new Set(tableau.vivier.map((j) => j.age))].sort((a, b) => a - b);
  return {
    fiches: retenus.slice(0, max).map((j) => ficheDe(
      j, tableau.notes, manager.observationsJeunes[j.id], manager.club,
    )),
    total: retenus.length,
    ages,
  };
}


export function ficheJeuneManager(manager: Manager, jeuneId: string): FicheDetection | undefined {
  const tableau = tableauDetectionManager(manager);
  const dansLeRapport = tableau.fiches.find((f) => f.jeune.id === jeuneId);
  if (dansLeRapport) return dansLeRapport;
  const academicien = manager.academie.find((j) => j.id === jeuneId && j.clubCentre === manager.club);
  if (!academicien) return undefined;
  const repere: JeuneRepere = {
    ...academicien,
    distance: 0,
    niveauClub: competitionDuClub(manager.club)?.niveau ?? 8,
  };
  return ficheDe(repere, tableau.notes, manager.observationsJeunes[jeuneId], manager.club);
}

/** Motif commun au bouton et au store : aucune action silencieusement refusée. */
export function motifObservationJeune(
  manager: Manager, jeuneId: string, entretien = false,
  tableau = tableauDetectionManager(manager),
): string | null {
  const interne = manager.academie.find((j) => j.id === jeuneId && j.clubCentre === manager.club);
  const fiche = interne ? ficheAcademicienManager(manager, interne, tableau.notes)
    : tableau.fiches.find((f) => f.jeune.id === jeuneId);
  if (!fiche) return 'Ce dossier n’est plus disponible.';
  const auCentre = manager.academie.some((j) => j.id === jeuneId && j.clubCentre === manager.club);
  if (entretien && fiche.entretien) return 'Entretien déjà réalisé.';
  if (entretien && fiche.matchs < 3) return 'Observe trois matchs avant de rencontrer la famille.';
  if (!entretien && fiche.matchs >= 10) return 'Observation complète : dix matchs suivis.';
  if (!auCentre && tableau.deplacementsRestants < (entretien ? 3 : 1)) {
    return 'Déplacements épuisés pour cette saison. Le suivi des jeunes du club reste gratuit.';
  }
  return null;
}

/** Estimation interne d'un joueur déjà au centre, sans recalculer tout le vivier. */
export function ficheAcademicienManager(
  manager: Manager,
  academicien: AcademicienManager,
  notes = notesDuCentre(manager.club, manager.installations),
): FicheDetection {
  const repere: JeuneRepere = {
    ...academicien,
    distance: 0,
    niveauClub: competitionDuClub(manager.club)?.niveau ?? 8,
  };
  return ficheDe(
    repere,
    notes,
    manager.observationsJeunes[academicien.id],
    manager.club,
  );
}

function tousLesClubsFrancais(): string[] {
  return COMPETITIONS
    .filter((c) => c.pays === 'France' && c.niveau >= 1)
    .flatMap((c) => c.clubs.map((club) => club.nom));
}

const CLUBS_FRANCAIS = tousLesClubsFrancais();

export interface VerdictSignatureJeune {
  academicien?: AcademicienManager;
  indemnite: number;
  etat: 'accepte' | 'refuse';
  texte: string;
}

/** Le jeune compare réellement notre projet à ceux des centres qui le suivent. */
export function proposerProjetJeune(manager: Manager, jeuneId: string): VerdictSignatureJeune {
  const tableau = tableauDetectionManager(manager);
  const fiche = tableau.fiches.find((f) => f.jeune.id === jeuneId);
  if (!fiche) return { indemnite: 0, etat: 'refuse', texte: 'Ce dossier n’est plus dans le rapport actif.' };
  if (manager.academie.some((j) => j.id === jeuneId)) {
    return { indemnite: 0, etat: 'refuse', texte: 'Ce jeune appartient déjà au centre.' };
  }
  if (tableau.occupes >= tableau.capacite) {
    return { indemnite: 0, etat: 'refuse', texte: 'Le centre est complet : libère une place avant de faire une offre.' };
  }

  const jeune = fiche.jeune;
  const niveauAcheteur = competitionDuClub(manager.club)?.niveau ?? 8;
  const interne = jeune.club === manager.club;
  const indemnite = interne ? 0 : indemniteDeFormation(jeune, niveauAcheteur);
  if (manager.budgetTransferts < indemnite) {
    return {
      indemnite,
      etat: 'refuse',
      texte: `Le club ne peut pas payer l’indemnité de formation de ${indemnite.toLocaleString('fr-FR')} €.` ,
    };
  }

  const notreOffre = offreDe(
    manager.club,
    jeune.distance,
    forceEffectif(manager.club, manager.saison),
    manager.installations,
    manager.prestige,
  );
  const rivaux = centresQuiObservent(jeune.club, CLUBS_FRANCAIS)
    .filter((r) => r.club !== manager.club)
    .slice(0, 3)
    .map((r) => offreDe(r.club, r.distance, forceEffectif(r.club, manager.saison)));
  const decision = choisirSonClub(
    jeune,
    [notreOffre, ...rivaux],
    notesDeBase(jeune.club),
    manager.saison,
  );
  if (!interne && jeune.distance > rayonAcceptable(jeune.age, tableau.notes)) {
    return { indemnite, etat: 'refuse', texte: 'La distance est trop importante pour sa famille à cet âge. Privilégie les dossiers proches du club.' };
  }
  if (!interne && decision.choix !== manager.club) {
    const destination = decision.choix;
    return {
      indemnite,
      etat: 'refuse',
      texte: destination
        ? `Le jeune choisit ${destination}, dont le projet lui promet davantage de temps de jeu ou de proximité.`
        : `Le jeune préfère rester à ${jeune.club} pour l’instant. Continue à l’observer et améliore ton projet.`,
    };
  }

  const categorie = jeune.age <= 17 ? 'u18' : 'espoirs';
  return {
    indemnite,
    etat: 'accepte',
    texte: interne ? `${jeune.nom} intègre le centre depuis l’école de rugby du club, sans indemnité.`
      : `${jeune.nom} choisit ${manager.club}. L’indemnité de formation est de ${indemnite.toLocaleString('fr-FR')} €.` ,
    academicien: {
      ...jeune,
      clubOrigine: jeune.club,
      club: manager.club,
      clubCentre: manager.club,
      recruteSaison: manager.saison,
      derniereSaison: manager.saison,
      categorie,
      objectif: 'polyvalence',
      moral: 72,
      tempsDeJeu: categorie === 'u18' ? 68 : 52,
      anneesFormees: 0,
    },
  };
}

function clubDePret(manager: Manager, jeune: AcademicienManager): string | undefined {
  const niveau = competitionDuClub(manager.club)?.niveau ?? 8;
  const candidats = COMPETITIONS
    .filter((c) => c.pays === 'France' && c.niveau >= Math.min(10, niveau + 1)
      && c.niveau <= Math.min(10, niveau + 3))
    .flatMap((c) => c.clubs.map((club) => club.nom))
    .filter((club) => club !== manager.club)
    .map((club) => ({ club, ecart: Math.abs(forceEffectif(club, manager.saison) - jeune.note) }))
    .sort((a, b) => a.ecart - b.ecart)
    .slice(0, 12);
  if (!candidats.length) return undefined;
  const rng = graine(`pret#${manager.club}#${jeune.id}#${manager.saison}`);
  return candidats[Math.floor(rng() * candidats.length)]?.club;
}

export function appliquerActionAcademie(
  manager: Manager,
  jeuneId: string,
  action: ActionAcademieManager,
): { academie: AcademicienManager[]; senior?: AcademicienManager; texte: string } {
  const jeune = manager.academie.find((j) => j.id === jeuneId && j.clubCentre === manager.club);
  if (!jeune) return { academie: manager.academie, texte: 'Jeune introuvable dans ce centre.' };
  if (action === 'senior') {
    if (jeune.age < 17) return { academie: manager.academie, texte: 'Il est encore trop jeune pour le groupe senior.' };
    return {
      academie: manager.academie.filter((j) => j.id !== jeuneId),
      senior: jeune,
      texte: `${jeune.nom} rejoint définitivement le groupe senior.`,
    };
  }
  if (action === 'liberer') {
    return {
      academie: manager.academie.filter((j) => j.id !== jeuneId),
      texte: `${jeune.nom} est libéré du centre.`,
    };
  }
  if (action === 'u18' && jeune.age > 18) {
    return { academie: manager.academie, texte: 'Il a dépassé l’âge de la catégorie U18.' };
  }
  if (action === 'pret') {
    if (jeune.age < 18) return { academie: manager.academie, texte: 'Un prêt n’est possible qu’à partir de 18 ans.' };
    const destination = clubDePret(manager, jeune);
    if (!destination) return { academie: manager.academie, texte: 'Aucun projet de prêt cohérent n’est disponible.' };
    return {
      academie: manager.academie.map((j) => j.id === jeuneId
        ? { ...j, categorie: 'pret', clubPret: destination, tempsDeJeu: 82 } : j),
      texte: `${jeune.nom} est prêté à ${destination}, avec un vrai objectif de temps de jeu.`,
    };
  }
  return {
    academie: manager.academie.map((j) => j.id === jeuneId
      ? {
          ...j,
          categorie: action,
          clubPret: undefined,
          tempsDeJeu: action === 'u18' ? 68 : 54,
        } : j),
    texte: `${jeune.nom} rejoint le groupe ${action === 'u18' ? 'U18' : 'Espoirs'}.`,
  };
}

function bonusObjectif(j: AcademicienManager): Partial<AcademicienManager> {
  switch (j.objectif) {
    case 'prise_masse': return { physique: Math.min(99, j.physique + 3), poids: j.poids + 2 };
    case 'vitesse':
    case 'endurance': return { physique: Math.min(99, j.physique + 3) };
    case 'defense': return { physique: Math.min(99, j.physique + 1), mental: Math.min(99, j.mental + 2) };
    case 'jeu_au_pied': return { technique: Math.min(99, j.technique + 2), mental: Math.min(99, j.mental + 1) };
    case 'melee': return { physique: Math.min(99, j.physique + 2), technique: Math.min(99, j.technique + 1) };
    case 'touche': return { technique: Math.min(99, j.technique + 2), mental: Math.min(99, j.mental + 1) };
    case 'passe': return { technique: Math.min(99, j.technique + 3) };
    case 'polyvalence': {
      if (j.polyvalence.length) return { technique: Math.min(99, j.technique + 1) };
      const famille = familleDe(j.poste);
      const choix = POSTES_PAR_FAMILLE[famille].find((p) => p !== j.poste);
      return choix ? { polyvalence: [choix], technique: Math.min(99, j.technique + 1) } : {};
    }
  }
}

export interface BilanAcademieManager {
  academie: AcademicienManager[];
  observations: Record<string, ObservationJeuneManager>;
  indemnites: number;
  revenus: { club: string; jeune: string; indemnite: number }[];
  liberes: string[];
  progressions: string[];
}

/** Fait vivre une saison entière de formation, prêts et tentatives de débauchage. */
export function evoluerAcademieManager(manager: Manager): BilanAcademieManager {
  const notes = notesDuCentre(manager.club, manager.installations);
  const groupe = effectifDuClub(manager.club, manager.saison);
  const observations = { ...manager.observationsJeunes };
  const academie: AcademicienManager[] = [];
  const revenus: BilanAcademieManager['revenus'] = [];
  const liberes: string[] = [];
  const progressions: string[] = [];
  let indemnites = 0;

  for (const ancien of manager.academie) {
    if (ancien.clubCentre !== manager.club) {
      academie.push(ancien);
      continue;
    }
    const rng = graine(`formation#${ancien.id}#${manager.saison}`);
    const mentor = ancien.mentorId ? groupe.find((j) => j.id === ancien.mentorId && j.age >= 28) : undefined;
    const tempsDeJeu = ancien.categorie === 'pret'
      ? 72 + Math.round(rng() * 24)
      : ancien.categorie === 'u18'
        ? 56 + Math.round(rng() * 32)
        : 38 + Math.round(rng() * 38);
    const moral = Math.max(20, Math.min(96,
      48 + tempsDeJeu * 0.38 + (mentor ? 8 : 0) + (rng() * 14 - 7),
    ));
    const blesse = rng() < risqueCorrige(ancien.risqueBlessure, notes.medical) / 520;
    const gain = progresser(ancien, {
      coaching: notes.coaching,
      infrastructures: notes.installations,
      tempsDeJeu,
      moral,
      blesse,
    }, rng);
    const potentielReel = Math.max(ancien.note, Math.min(99, ancien.potentielReel + gain.potentiel));
    const note = Math.round(Math.min(potentielReel, ancien.note + gain.note) * 10) / 10;
    const age = ancien.age + 1;
    const categorie = ancien.categorie === 'u18' && age > 18 ? 'espoirs' : ancien.categorie;
    const mentorBonus = mentor ? 1 + Math.floor(rng() * 2) : 0;
    const ficheAvant = ficheDe({
      ...ancien,
      distance: 0,
      niveauClub: competitionDuClub(manager.club)?.niveau ?? 8,
    }, notes, observations[ancien.id], manager.club);
    const travailIndividuel = bonusObjectif(ancien);
    const suivant: AcademicienManager = {
      ...ancien,
      ...travailIndividuel,
      age,
      note,
      potentielReel,
      categorie,
      moral: Math.round(moral),
      tempsDeJeu,
      professionnalisme: Math.min(99, ancien.professionnalisme + mentorBonus),
      mental: Math.min(99, (travailIndividuel.mental ?? ancien.mental) + (mentor ? 1 : 0)),
      anneesFormees: ancien.anneesFormees + 1,
      derniereSaison: manager.saison + 1,
      ...(categorie === 'pret' ? {} : { clubPret: undefined }),
      derniereProgression: {
        saison: manager.saison,
        noteAvant: ancien.note,
        noteApres: note,
        potentielEstimeAvant: [ficheAvant.potentielBas, ficheAvant.potentielHaut],
        blesse,
        resume: blesse
          ? 'Saison freinée par une blessure.'
          : `${tempsDeJeu}% de temps de jeu · ${mentor ? 'mentor actif' : nomObjectifJeune(ancien.objectif)}.`,
      },
    };
    observations[ancien.id] = {
      jeuneId: ancien.id,
      matchs: Math.min(10, (observations[ancien.id]?.matchs ?? 0) + 3),
      entretien: observations[ancien.id]?.entretien ?? true,
      saison: manager.saison + 1,
    };

    if (age > 23) {
      liberes.push(`${suivant.nom} (limite d’âge Espoirs)`);
      continue;
    }

    // Les meilleurs profils peuvent être débauchés. Un grand centre les garde
    // plus facilement, et le club formateur reçoit toujours son indemnité.
    const niveauActuel = competitionDuClub(manager.club)?.niveau ?? 8;
    const chanceDepart = Math.max(0, (suivant.potentielReel - 69) / 240)
      * Math.max(0.22, 1 - notes.reputation / 125);
    if (age >= 18 && niveauActuel > 1 && rng() < chanceDepart) {
      const rivaux = centresQuiObservent(manager.club, CLUBS_FRANCAIS)
        .filter((r) => (competitionDuClub(r.club)?.niveau ?? 10) < niveauActuel)
        .slice(0, 8);
      const rival = rivaux[Math.floor(rng() * rivaux.length)];
      if (rival) {
        const offre = offreDe(rival.club, rival.distance, forceEffectif(rival.club, manager.saison));
        const decision = choisirSonClub(suivant, [offre], notes, manager.saison + 1);
        if (decision.choix === rival.club) {
          const indemnite = indemniteDeFormation(
            suivant,
            competitionDuClub(rival.club)?.niveau ?? 3,
            suivant.anneesFormees,
          );
          indemnites += indemnite;
          revenus.push({ club: rival.club, jeune: suivant.nom, indemnite });
          continue;
        }
      }
    }

    progressions.push(`${suivant.nom} ${ancien.note.toFixed(1)} → ${suivant.note.toFixed(1)}`);
    academie.push(suivant);
  }

  return { academie, observations, indemnites, revenus, liberes, progressions };
}
