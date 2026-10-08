// 🏉 LA BIBLIOTHÈQUE DE TOUCHES (Correctif 30, niveau d'IA 6)
//
// Demande : « énormément enrichir les touches » — courtes, milieu, fond ; faux sauts (un ou deux), sauteur qui change de
// bloc, lifteurs qui accompagnent ; mauls, faux mauls, mauls dont le ballon ressort, peeling ; et des lancements préparés
// pour les lignes arrière (9 → 10, 9 → 12 lancé, premier centre derrière un leurre, croisée, côté fermé, troisième ligne
// qui sort du fond).
//
// Avant ce correctif l'annonce se choisissait parmi onze options (`annoncerLaTouche`). Elles y sont toutes, et quinze de
// plus. ⚠️ Une combinaison n'est PAS une animation : c'est un plan que le moteur exécute avec ses mécanismes existants
// (zone du lancer, faux sauteur, sortie, lancement de jeu) — la conquête reste disputée, et une touche perdue annule tout.
//
// Module pur : il ne lit que la situation qu'on lui donne et ne tire rien. Le moteur fait UN tirage, au prorata des poids.

export type ZoneDeTouche = 'premierBloc' | 'milieu' | 'fond';

/** Ce que l'équipe fait du ballon une fois la touche gagnée. */
export type SuiteDeTouche =
  | 'descente'         // le sauteur redescend et joue
  | 'neuf-rapide'      // dévié du haut du saut pour le 9 : ballon rapide
  | 'neuf-dix'         // 9 → 10 : un temps sur les centres
  | 'neuf-douze'       // 9 → 12 lancé, l'ouvreur court en leurre
  | 'leurre-centre'    // le premier centre est servi derrière un coureur leurre
  | 'croisee'          // croisée ouvreur – centre
  | 'ferme'            // le 9 attaque le couloir, côté fermé
  | 'troisieme-ligne'  // un troisième ligne sort du fond de l'alignement, lancé
  | 'peel'             // un avant contourne l'alignement
  | 'maul'             // transfert au joueur derrière, maul immédiat
  | 'faux-maul'        // le pack se lie, la défense s'engage, le ballon ressort aussitôt
  | 'maul-sortie'      // le maul démarre, avance, puis le ballon ressort pour le 9
  | 'maul-peel'        // le maul démarre, puis le joueur du fond se détache et contourne
  | 'centre-direct';   // lancer long par-dessus l'alignement, directement au premier centre

export interface JeuDeTouche {
  id: string;
  /** Ce que le fil du match annonce (les lancers ordinaires ne s'annoncent pas). */
  libelle?: string;
  /** Où le ballon est VRAIMENT lancé. */
  zone: ZoneDeTouche;
  /** Les blocs qui montent pour de faux avant le lancer, dans l'ordre. */
  feintes: ZoneDeTouche[];
  /** Le sauteur vient d'ailleurs : il attend à hauteur de cette zone et n'entre à sa place qu'au dernier moment. */
  glissement?: ZoneDeTouche;
  suite: SuiteDeTouche;
  poids: number;
}

export interface SituationDeTouche {
  /** À moins de vingt-deux mètres de la ligne adverse. */
  pres: boolean;
  campAdverse: boolean;
  /** Dans ses propres 22. */
  chezSoi: boolean;
  /** On gère le score : rien de risqué. */
  gestion: boolean;
  /** Ce que l'équipe aime jouer (voir `goutDe`) : avants, mains, leurres. */
  gout: { avants: number; mains: number; leurres: number };
  /** Nombre de joueurs dans l'alignement. */
  alignes: number;
  /** Les trois zones ont-elles chacune leur sauteur ? (un alignement à quatre n'a pas de milieu distinct) */
  troisBlocs: boolean;
  /** Qualité du lanceur (passe, 0-100). */
  lanceur: number;
  /** Un premier centre est disponible pour recevoir un lancer long. */
  centreLibre: boolean;
  /** Un troisième ligne se tient au fond de l'alignement. */
  troisiemeLigneAuFond: boolean;
  /** Un avant peut contourner l'alignement. */
  peeler: boolean;
  /** Ouvreur et premier centre sont en place derrière. */
  ligneEnPlace: boolean;
}

/**
 * Toutes les combinaisons jouables dans cette situation, avec leur poids. Les mêmes règles qu'avant : près de la ligne
 * adverse on lance devant ou au milieu et on porte ; au milieu du terrain on cherche le fond et la ligne ; dans ses 22 on
 * assure. Les feintes et les mouvements demandent un alignement fourni et un bon lanceur — un lancer au fond après deux faux
 * sauts est le plus risqué de tous.
 */
export function jeuxDeTouche(s: SituationDeTouche): JeuDeTouche[] {
  const { gout: g } = s;
  const zoneAvants = s.pres ? 3 : s.campAdverse ? 0.9 : 0.25;
  const calme = s.chezSoi ? 0.3 : 1;
  const ruse = g.leurres * calme * (s.gestion ? 0.3 : 1);
  const lanceurSur = s.lanceur >= 70 ? 1.3 : s.lanceur >= 58 ? 1 : 0.55;
  const ligne = s.ligneEnPlace ? 1 : 0;
  const cinq = s.alignes >= 5 ? 1 : 0;
  const jeux: JeuDeTouche[] = [
    // ── Devant : court, sûr, lent ───────────────────────────────────────────
    { id: 'devant-maul', zone: 'premierBloc', feintes: [], suite: 'maul', poids: zoneAvants * g.avants * (s.gestion ? 1.5 : 1) },
    { id: 'devant-sur', zone: 'premierBloc', feintes: [], suite: 'descente', poids: s.chezSoi ? 1.5 : 0.4 },
    { id: 'devant-neuf', zone: 'premierBloc', feintes: [], suite: 'neuf-rapide', poids: 0.45 * g.mains * calme },
    { id: 'devant-ferme', libelle: 'lancer devant, le 9 attaque le couloir', zone: 'premierBloc', feintes: [], suite: 'ferme',
      poids: 0.3 * ruse * (s.pres || s.campAdverse ? 1.3 : 0.7) },
    // ── Milieu ──────────────────────────────────────────────────────────────
    { id: 'milieu-classique', zone: 'milieu', feintes: [], suite: 'descente', poids: s.chezSoi ? 2 : 0.7 },
    { id: 'milieu-transfert', zone: 'milieu', feintes: [], suite: 'neuf-dix', poids: 0.8 * g.mains * calme * ligne },
    { id: 'milieu-neuf', zone: 'milieu', feintes: [], suite: 'neuf-rapide', poids: (s.chezSoi ? 0.4 : 0.8) * g.mains },
    { id: 'milieu-maul', zone: 'milieu', feintes: [], suite: 'maul', poids: (s.pres ? 1.6 : s.campAdverse ? 0.7 : 0.2) * g.avants },
    { id: 'milieu-faux-maul', libelle: 'maul simulé, sortie rapide', zone: 'milieu', feintes: [], suite: 'faux-maul',
      poids: (s.pres || s.campAdverse ? 0.9 : 0.3) * g.leurres },
    { id: 'milieu-maul-sortie', libelle: 'maul, puis le ballon ressort', zone: 'milieu', feintes: [], suite: 'maul-sortie',
      poids: (s.pres ? 0.5 : s.campAdverse ? 0.6 : 0.15) * Math.sqrt(g.avants * g.mains) },
    { id: 'milieu-croisee', libelle: 'lancer au milieu, croisée derrière', zone: 'milieu', feintes: [], suite: 'croisee',
      poids: 0.45 * ruse * ligne * (s.chezSoi ? 0 : 1) },
    { id: 'milieu-douze', libelle: 'lancer au milieu, le premier centre lancé', zone: 'milieu', feintes: [], suite: 'neuf-douze',
      poids: 0.5 * g.mains * calme * ligne },
    // ── Fond : long, risqué, rapide ─────────────────────────────────────────
    { id: 'fond-long', zone: 'fond', feintes: [], suite: 'neuf-rapide', poids: (s.chezSoi ? 0.25 : s.pres ? 0.9 : 1.3) * g.mains * lanceurSur },
    { id: 'fond-troisieme-ligne', libelle: 'un troisième ligne sort du fond de la touche', zone: 'fond', feintes: [], suite: 'troisieme-ligne',
      poids: s.troisiemeLigneAuFond ? 0.5 * Math.sqrt(g.avants) * calme * lanceurSur * cinq : 0 },
    { id: 'fond-peel', libelle: 'peel en fond d’alignement', zone: 'fond', feintes: [], suite: 'peel',
      poids: s.peeler ? 0.5 * g.avants * cinq : 0 },
    { id: 'fond-leurre-centre', libelle: 'lancer au fond, le centre servi derrière un leurre', zone: 'fond', feintes: [], suite: 'leurre-centre',
      poids: 0.4 * ruse * ligne * lanceurSur },
    { id: 'fond-maul-peel', libelle: 'maul au fond, puis on contourne', zone: 'fond', feintes: [], suite: 'maul-peel',
      poids: (s.pres ? 0.45 : s.campAdverse ? 0.3 : 0.08) * g.avants * cinq * lanceurSur },
    // ── Faux sauts ──────────────────────────────────────────────────────────
    { id: 'faux-devant-fond', libelle: 'faux saut devant, lancer au fond', zone: 'fond', feintes: ['premierBloc'], suite: 'neuf-rapide',
      poids: 0.7 * ruse * lanceurSur },
    { id: 'faux-devant-milieu', libelle: 'faux saut devant, lancer au deuxième bloc', zone: 'milieu', feintes: ['premierBloc'], suite: 'neuf-dix',
      poids: s.troisBlocs ? 0.6 * ruse * ligne : 0 },
    { id: 'faux-fond-milieu', libelle: 'faux saut au fond, lancer au milieu', zone: 'milieu', feintes: ['fond'], suite: 'descente',
      poids: s.troisBlocs ? 0.7 * ruse : 0 },
    { id: 'double-faux-milieu', libelle: 'double faux saut, lancer au milieu', zone: 'milieu', feintes: ['premierBloc', 'fond'], suite: 'neuf-rapide',
      poids: s.troisBlocs && s.alignes >= 6 ? 0.4 * ruse * lanceurSur : 0 },
    { id: 'double-faux-fond', libelle: 'double faux saut, lancer au fond pour le centre', zone: 'fond', feintes: ['premierBloc', 'milieu'], suite: 'neuf-douze',
      poids: s.troisBlocs && s.alignes >= 6 ? 0.3 * ruse * ligne * lanceurSur * (s.lanceur >= 66 ? 1 : 0.4) : 0 },
    // ── Le sauteur change de place ──────────────────────────────────────────
    { id: 'glisse-fond-milieu', libelle: 'le sauteur vient du fond pour sauter au milieu', zone: 'milieu', feintes: [], glissement: 'fond', suite: 'maul',
      poids: s.troisBlocs ? (s.pres ? 0.7 : 0.25) * Math.sqrt(g.avants * g.leurres) * cinq : 0 },
    { id: 'glisse-avant-milieu', libelle: 'le sauteur recule d’un bloc au dernier moment', zone: 'milieu', feintes: [], glissement: 'premierBloc', suite: 'neuf-rapide',
      poids: s.troisBlocs ? 0.4 * ruse * cinq : 0 },
    { id: 'changement-cible', libelle: 'changement de cible au dernier moment', zone: 'premierBloc', feintes: ['milieu'], suite: 'descente',
      poids: s.troisBlocs ? 0.45 * ruse * (s.chezSoi ? 1.6 : 1) : 0 },
    // ── Par-dessus l'alignement ─────────────────────────────────────────────
    { id: 'long-centre', libelle: 'lancer long par-dessus l’alignement', zone: 'fond', feintes: ['milieu'], suite: 'centre-direct',
      poids: s.centreLibre && !s.chezSoi && s.lanceur >= 58 ? 0.3 * g.leurres * (s.lanceur >= 70 ? 1.4 : 1) : 0 },
  ];
  return jeux.filter((j) => j.poids > 0.002);
}

/** Toutes les combinaisons de la bibliothèque, pour les bancs : une situation qui les rend toutes jouables. */
export function toutesLesTouches(): JeuDeTouche[] {
  return jeuxDeTouche({
    pres: true, campAdverse: true, chezSoi: false, gestion: false, gout: { avants: 1, mains: 1, leurres: 1 }, alignes: 7,
    troisBlocs: true, lanceur: 75, centreLibre: true, troisiemeLigneAuFond: true, peeler: true, ligneEnPlace: true,
  });
}

/** La sortie du moteur d'origine qui porte cette suite (`ConqueteAnimee.sortie`) ; les lancements de ligne passent par le 9. */
export function sortieDeLaSuite(suite: SuiteDeTouche): 'deviation' | 'peel' | 'maul' | 'mauleSimule' | undefined {
  switch (suite) {
    case 'maul': case 'maul-sortie': case 'maul-peel': return 'maul';
    case 'faux-maul': return 'mauleSimule';
    case 'peel': case 'troisieme-ligne': return 'peel';
    case 'descente': case 'centre-direct': return undefined;
    default: return 'deviation';
  }
}
