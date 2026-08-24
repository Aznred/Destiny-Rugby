// LE CLASSEMENT MONDIAL — et surtout : COMMENT L'EMPÊCHER D'ÊTRE FALSIFIÉ
//
// Demande explicite : « prépare le classement mondial, et protège à fond pour
// que ce soit incassable à falsifier son score ; dans la DB je veux retenir
// juste le score ».
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LA VÉRITÉ D'ABORD, PARCE QU'ELLE COMMANDE TOUTE LA CONCEPTION
// ═══════════════════════════════════════════════════════════════════════════
// Destiny Rugby tourne ENTIÈREMENT dans le navigateur. Tout ce qui s'exécute
// chez le joueur lui appartient : il peut ouvrir les outils de développement,
// éditer le localStorage, modifier le bundle, ou appeler l'API à la main avec
// `fetch`. AUCUN code livré au navigateur ne peut donc, à lui seul, garantir un
// score. Un secret embarqué dans le bundle n'est pas un secret : il se lit en
// vingt secondes. Quiconque prétend le contraire vend du vent.
//
// La seule protection RÉELLE est donc : **le serveur ne fait jamais confiance
// au score envoyé — il le RECALCULE.**
//
// D'où l'architecture :
//
//        navigateur                      serveur (Edge Function)            DB
//   ┌──────────────────┐          ┌────────────────────────────┐    ┌────────────┐
//   │ FicheCarriere    │  POST →  │ 1. verifierFiche(fiche)    │    │ pseudo     │
//   │ (les faits bruts │          │ 2. score = scoreDeLaFiche()│ →  │ score      │
//   │  de la carrière) │          │ 3. écrit score + faits     │    │ + la fiche │
//   └──────────────────┘          └────────────────────────────┘    └────────────┘
//
// La REQUÊTE porte les faits (saisons, note, matchs, essais, titres, clubs…),
// ce qui permet au serveur de RECALCULER le score. C'est ce recalcul, et lui
// seul, qui protège le classement.
//
// ⚠️ LA BASE NE GARDAIT QUE LE SCORE — CE N'EST PLUS LE CAS, et c'est un
// revirement assumé. La demande d'origine était « dans la DB je veux retenir
// juste le score », et `serveur/schema-vercel.sql` en notait déjà la
// conséquence : « on ne pourra pas, plus tard, afficher 12 saisons, 44 essais à
// côté d'un score ». C'est précisément ce qui est demandé aujourd'hui : « dans
// le classement mondial, qu'on puisse voir les stats des autres joueurs, leurs
// profils, armoires à trophées, clubs qu'ils ont faits ». On conserve donc
// désormais les faits AFFICHABLES de la fiche — les mêmes que ceux qui servent
// au recalcul, rien de plus : aucune donnée personnelle, aucun journal, aucune
// adresse. Le pseudo reste choisi par le joueur.
//
// ⚠️ CE FICHIER EST FAIT POUR TOURNER DES DEUX CÔTÉS. Aucune dépendance, aucun
// import du store, aucun accès au DOM : on le copie tel quel dans la fonction
// serveur (Supabase Edge / Vercel / Cloudflare Worker). C'est indispensable —
// si le barème existait en deux exemplaires, il finirait par y avoir deux
// vérités, et le serveur validerait des scores que le jeu ne produit pas.

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA FICHE — le strict nécessaire pour recalculer un score
// ═══════════════════════════════════════════════════════════════════════════
// On n'envoie QUE ça. Pas les attributs détaillés, pas le journal, pas les
// relations : moins il y a de champs, moins il y a de surface à falsifier et
// moins il y a de données personnelles qui circulent.

/**
 * Version du barème. Toute fiche d'une autre version est refusée.
 *
 * ⚠️ PASSÉE À 2 QUAND LA FICHE A GAGNÉ SES CLUBS. Le champ `clubs` entre dans
 * la chaîne canonique, donc dans le sceau : une fiche v1 n'a pas de quoi être
 * affichée sur l'écran Classement, et son sceau ne correspondrait plus. Comme
 * le jeu et l'API sont déployés ensemble, le basculement est atomique.
 */
/**
 * Ce qu’une carrière a été.
 *
 * ⚠️ DÉCLARÉ ICI, PAS IMPORTÉ DE types.ts, et c’est la règle du fichier : il
 * doit rester copiable tel quel dans une Edge Function. Un seul import de
 * VALEUR depuis le jeu, et le serveur traîne tout le domaine derrière lui.
 * types.ts réexporte donc ce type-là, il ne le définit pas.
 */
export type CategorieCarriere = 'joueur' | 'entraineur' | 'joueurEntraineur';

export const VERSION_BAREME = 2;

export interface FicheCarriere {
  /** Version du barème avec lequel la fiche a été produite. */
  v: number;
  /** Pseudo choisi par le joueur (≠ nom du personnage). */
  pseudo: string;
  nom: string;
  poste: string;
  nation: string;
  /** Âge à la création du personnage. */
  ageDebut: number;
  /** Âge à la retraite (ou aujourd'hui, pour une carrière en cours). */
  age: number;
  saisons: number;
  /** Moyenne des 8 attributs, arrondie. */
  note: number;
  reputation: number;
  matchs: number;
  essais: number;
  selections: number;
  /** Ids de trophées (`data/trophees.ts`), un par titre remporté. */
  titres: string[];
  /**
   * Les clubs portés, dans l'ordre (`Joueur.clubs`).
   *
   * ⚠️ AJOUTÉ POUR L'ÉCRAN, PAS POUR LE SCORE. Demande explicite : « dans le
   * classement mondial, qu'on puisse voir les stats des autres joueurs, leurs
   * profils, armoires à trophées, clubs qu'ils ont faits ». Il n'entre donc PAS
   * dans `scoreDeLaFiche()` — le barème ne bouge pas, un classement ne se
   * réordonne pas parce qu'on affiche un écusson de plus.
   */
  clubs: string[];
  /**
   * L'IDENTITÉ DE LA LIGNE au classement mondial. Facultative.
   *
   * ⚠️ C'EST LA CORRECTION DU BUG « SI QUELQU'UN A LE MÊME PSEUDO QUE MOI, JE
   * N'APPARAIS PAS ». La table était clé par le pseudo : deux joueurs qui
   * choisissent le même nom partageaient UNE ligne, et l'écriture est gardée
   * par « le score ne recule pas ». Le second n'écrivait donc rien du tout,
   * silencieusement, et sa carrière n'entrait jamais au classement.
   *
   * ⚠️ ELLE N'IDENTIFIE PAS UNE PERSONNE, mais une INSTALLATION du jeu : elle
   * est tirée au hasard une fois et rangée dans la sauvegarde. Le jeu n'a aucun
   * compte utilisateur (voir `serveur/PAIEMENTS.md`), donc il n'y a rien de
   * plus stable à quoi se raccrocher. Conséquences assumées : deux appareils
   * font deux lignes, et une sauvegarde effacée repart sur une nouvelle ligne.
   *
   * ⚠️ ELLE NE PÈSE RIEN SUR LE SCORE et n'entre pas dans la chaîne canonique :
   * ce n'est pas un fait de carrière, c'est une adresse. Deux envois de la même
   * carrière depuis deux appareils doivent produire le même sceau.
   *
   * ⚠️ ET ELLE EST FACULTATIVE, exprès : un onglet resté ouvert sur l'ancien
   * bundle envoie une fiche sans elle. La refuser aurait coupé le classement à
   * ces joueurs jusqu'au rechargement, pour rien — le serveur retombe alors sur
   * l'ancienne identité (le pseudo).
   */
  cle?: string;
  /**
   * Ce qu’a été cette carrière — et donc dans quel tableau elle entre.
   *
   * ⚠️ FACULTATIVE, ET ELLE LE RESTERA. Toutes les fiches déjà en base en
   * sont dépourvues : elles se lisent `?? 'joueur'`. Exiger le champ aurait
   * vidé le classement existant du jour au lendemain.
   */
  categorie?: CategorieCarriere;
  /**
   * Le versant entraîneur, quand il existe.
   *
   * ⚠️ UN OBJET À PART, PAS DES CHAMPS À PLAT. Un entraîneur n’a ni essais ni
   * plaquages, et un joueur n’a ni montées ni prestige : les mélanger dans la
   * même liste de nombres obligerait à écrire « 0 » partout et à deviner, à
   * la lecture, lesquels comptent. Ici, sa présence EST l’information.
   */
  manager?: FicheManager;
  /** Le score annoncé par le client. Le serveur le RECALCULE et compare. */
  score: number;
}

export interface FicheManager {
  saisons: number;
  /** Ids de trophées gagnés SUR LE BANC. */
  titres: string[];
  montees: number;
  /** 0 à 100, la jauge de `lib/manager.ts`. */
  prestige: number;
  clubs: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE BARÈME — une seule fonction, partagée
// ═══════════════════════════════════════════════════════════════════════════

/**
 * LE score. C'est la seule définition qui existe dans tout le projet :
 * `scoreCarriere()` (store) et le serveur passent tous les deux par ici.
 */
export function scoreJoueur(f: Pick<
  FicheCarriere, 'note' | 'reputation' | 'saisons' | 'titres' | 'essais' | 'matchs'
>): number {
  return Math.round(
    f.note * 12
    + f.reputation * 3
    + f.saisons * 20
    + f.titres.length * 120
    + f.essais * 6
    + f.matchs * 2,
  );
}

/**
 * Le versant entraîneur.
 *
 * ⚠️ IL NE PEUT PAS RÉUTILISER LE BARÈME DU JOUEUR, et c’est la raison d’être
 * des catégories. Celui-ci compte des essais et des matchs : appliqué à un
 * entraîneur, il rendrait zéro quel que soit son palmarès. Ici, ce sont les
 * TITRES, les MONTÉES et le prestige atteint qui font la carrière — c’est-à-
 * dire ce qu’un entraîneur laisse derrière lui.
 *
 * ⚠️ ET LES DEUX ÉCHELLES ONT ÉTÉ CALÉES L’UNE SUR L’AUTRE : une très belle
 * carrière de joueur et une très belle carrière d’entraîneur tombent dans le
 * même ordre de grandeur (~4 000), sinon le classement TOTAL n’aurait été
 * qu’un classement de l’une des deux.
 */
export function scoreManager(m: FicheManager | undefined): number {
  if (!m) return 0;
  return Math.round(
    m.saisons * 30
    + m.titres.length * 150
    + m.montees * 90
    + m.prestige * 12
    + m.clubs.length * 15,
  );
}

/**
 * LE score — les deux versants additionnés.
 *
 * ⚠️ UNE CARRIÈRE DE JOUEUR SEULE GARDE EXACTEMENT SON SCORE D’AVANT :
 * `manager` est absent, `scoreManager` rend 0, et l'addition ne change rien.
 * C’était la condition pour ne pas rebattre le classement existant.
 */
export function scoreDeLaFiche(f: Pick<
  FicheCarriere, 'note' | 'reputation' | 'saisons' | 'titres' | 'essais' | 'matchs'
> & { manager?: FicheManager }): number {
  return scoreJoueur(f) + scoreManager(f.manager);
}

/**
 * La catégorie d’une fiche, déduite de ce qu’elle contient.
 *
 * ⚠️ ON NE FAIT PAS CONFIANCE AU CHAMP `categorie` POUR CLASSER. Il est écrit
 * par le client : annoncer « entraîneur » sur une fiche de joueur mettrait
 * une carrière dans le mauvais tableau. La vérité, c’est la présence du
 * versant manager et celle de matchs joués — deux faits que `verifierFiche`
 * borne déjà.
 */
export function categorieDeLaFiche(f: Pick<FicheCarriere, 'matchs'> & {
  manager?: FicheManager;
}): CategorieCarriere {
  const entraine = !!f.manager && f.manager.saisons > 0;
  const joue = f.matchs > 0;
  if (entraine && joue) return 'joueurEntraineur';
  if (entraine) return 'entraineur';
  return 'joueur';
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES LIMITES DU JEU — c'est ELLES qui font le vrai travail
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ Le plafond global de score ne sert presque à rien tout seul : il autorise
// encore « 30 saisons, 1 350 matchs, 5 400 essais ». Ce qui coince un tricheur,
// c'est la COHÉRENCE INTERNE — chaque chiffre est borné par les autres. Pour
// annoncer 5 000 essais, il faut annoncer 1 250 matchs, donc 28 saisons, donc
// avoir commencé à 15 ans et raccroché à 42, et avoir une note plausible pour
// ce nombre de saisons. Le tricheur ne peut plus « mettre un gros nombre » : il
// doit fabriquer une carrière entière qui tient debout — et à ce moment-là,
// autant jouer.

export const LIMITES = {
  /**
   * ⚠️ LA FENÊTRE D'ÂGE DU CRIBLE DOIT COUVRIR CELLE DE L'ÉCRAN DE CRÉATION.
   *
   * Elle ne la couvrait pas, et c'était LE bug du classement : `Creation`
   * autorise de démarrer **jusqu'à 30 ans**, le crible en refusait plus de 24.
   * Toute carrière commencée à 25 ans ou plus était donc rejetée — pas une
   * fois, mais À VIE, puisque `ageDebut` est déduit de l'âge et du nombre de
   * saisons (`ficheDepuisJoueur`) et ne change jamais. Retour de jeu : « la
   * plupart de mes carrières légitimes ne sont pas retenues ». Mesuré sur les
   * quinze âges de départ que l'écran propose : **21 refus sur 21 portaient ce
   * seul motif**, et aucune autre borne n'était même approchée.
   *
   * ⚠️ `Creation` LIT `ageDebutMax` D'ICI. C'est le seul moyen que les deux ne
   * puissent plus diverger. Le minimum, lui, reste volontairement UN AN PLUS
   * BAS que celui de l'écran (16) : le crible doit toujours être au moins aussi
   * permissif que le jeu, jamais l'inverse — une borne qui refuse une carrière
   * légitime est pire qu'une borne large. Et `verifClassement.ts` rejoue
   * désormais tous les âges de départ pour que ça ne reparte pas en silence.
   */
  ageDebutMin: 15,
  ageDebutMax: 30,
  /** `AGE_RETRAITE_FORCEE` : la carrière s'arrête d'office à 44 ans. */
  ageMax: 44,
  /** Le calendrier fait 44 semaines ; on tolère phases finales et sélections. */
  matchsParSaison: 50,
  /** Un quadruplé est déjà exceptionnel ; 5 est une borne large. */
  essaisParMatch: 5,
  /**
   * ⚠️ RELEVÉ DE 4 À 9 AVEC LES HONNEURS INDIVIDUELS. Le compte se fait à la
   * main, et il est SERRÉ — c'est ce qui rend la borne utile :
   *   collectifs (4) · championnat national · coupe d'Europe · Tournoi (ou
   *     Rugby Europe Championship) · Coupe du monde (une saison sur quatre) ;
   *   individuels (5) · meilleur joueur du championnat · de la Champions Cup ·
   *     du Tournoi · homme du match de la finale du monde · meilleur joueur du
   *     monde.
   * Personne n'a jamais fait les neuf dans la même saison, mais rien dans le
   * moteur ne l'interdit — et une borne qui refuse une carrière légitime est
   * pire qu'une borne large.
   */
  titresParSaison: 9,
  /**
   * ⚠️ UN ENTRAÎNEUR NE RACCROCHE PAS À 44 ANS. `ageMax` borne la carrière de
   * JOUEUR (`AGE_RETRAITE_FORCEE`) ; appliquée telle quelle à un banc, elle
   * refuserait toute reconversion — un joueur qui arrête à 36 ans et entraîne
   * quinze saisons finit à 51. Soixante-dix ans, c’est la limite de ce qu’on
   * a vu dans le métier, et elle borne aussi le nombre de saisons annonçables.
   */
  ageManagerMax: 70,
  /**
   * ⚠️ ET `ageDebut` NE VEUT PAS DIRE LA MÊME CHOSE SUR UN BANC. Pour un
   * joueur — et pour un ancien joueur devenu entraîneur — c'est l'âge de ses
   * débuts SUR LE TERRAIN, donc 15 à 30. Pour quelqu'un qui n'a jamais joué,
   * c'est l'âge de son premier banc, et personne ne prend un banc à 18 ans :
   * `ficheDepuisManager` déduit ce champ de l'âge et du nombre de saisons, il
   * vaut donc 30, 35, 40.
   *
   * Le banc d'essai a trouvé l'impasse tout de suite, et c'est EXACTEMENT le
   * bug déjà payé une fois côté joueur (« ageDebut hors bornes », 21 refus sur
   * 21) : sans ces deux bornes-là, **aucune carrière d'entraîneur pur n'entrait
   * au classement**, jamais, et rien à l'écran ne l'aurait dit.
   */
  ageDebutManagerMin: 20,
  ageDebutManagerMax: 60,
  /** Championnat + coupe d’Europe + coupe nationale : trois, c’est déjà rare. */
  titresManagerParSaison: 3,
  /** On ne monte pas deux fois dans la même saison. */
  monteesParSaison: 1,
  prestigeMax: 100,
  /** Un international ne dépasse pas une douzaine de capes par an. */
  capesParSaison: 12,
  /**
   * ⚠️ 100, PAS 99, ET C'EST UN BUG CORRIGÉ. Le serveur refusait de vraies
   * carrières — journal de production : « note hors bornes (100, attendu
   * 0..99) ». La note est la MOYENNE des 8 attributs (`noteGlobale`), et les
   * attributs sont bornés à **100** par `borne()` dans le store : huit
   * attributs à 100 donnent donc une moyenne de 100, légitimement. La borne
   * était copiée du plafond de `entrainer()` (`Math.min(99, …)`), qui ne
   * concerne que l'entraînement — la progression de saison, elle, monte bien
   * jusqu'à 100. Une borne qui refuse une carrière légitime est pire que pas
   * de borne du tout.
   */
  noteMax: 100,
  reputationMax: 100,
  /**
   * Note atteignable après N saisons. On démarre entre 30 et 40 (`attributsDeBase`)
   * et on progresse au mieux d'environ 5 points par saison — la mesure
   * (`verifDifficulte.ts`) donne une médiane à 63 et un maximum à 85 sur
   * 12 saisons. La borne est volontairement GÉNÉREUSE (40 + 6 × saisons) : elle
   * doit refuser l'absurde, pas la carrière exceptionnelle.
   */
  noteApres: (saisons: number) => Math.min(100, 40 + saisons * 6),
  pseudoMax: 24,
  /**
   * Longueur d'un nom de club affiché. Le plus long du jeu (« 4 Cantons
   * Bastides Haut Agenais Périgord ») fait 38 caractères : 48 laisse de la
   * marge sans ouvrir la porte à un roman injecté dans le tableau mondial.
   */
  clubMax: 48,
  /**
   * Longueur de l'identifiant de ligne (`FicheCarriere.cle`). Un UUID en fait
   * 36 : 40 laisse la marge d'un préfixe sans ouvrir la colonne à un roman.
   */
  cleMax: 40,
} as const;

export const SAISONS_MAX = LIMITES.ageMax - LIMITES.ageDebutMin + 1;

/**
 * ⚠️ ET LE PLAFOND N’EST PAS LE MÊME SUR UN BANC. Une carrière qui commence à
 * 15 ans et se termine à 70 fait 56 saisons — un joueur n’en fera jamais que
 * 30. Utiliser `SAISONS_MAX` pour tout le monde refuserait toute reconversion
 * un peu longue, en silence.
 */
export const SAISONS_MAX_MANAGER = LIMITES.ageManagerMax - LIMITES.ageDebutMin + 1;

/** Le plafond de saisons applicable à une catégorie donnée. */
export function saisonsMax(categorie: CategorieCarriere): number {
  return categorie === 'joueur' ? SAISONS_MAX : SAISONS_MAX_MANAGER;
}

/** L’âge maximal applicable à une catégorie donnée. */
export function ageMaxDe(categorie: CategorieCarriere): number {
  return categorie === 'joueur' ? LIMITES.ageMax : LIMITES.ageManagerMax;
}

/**
 * Les bornes de `ageDebut` applicables à une catégorie donnée.
 *
 * ⚠️ SEUL L'ENTRAÎNEUR PUR SORT DE LA FENÊTRE DU JOUEUR. Un « joueur +
 * entraîneur » a commencé sa vie sur le terrain : ses bornes sont celles d'un
 * joueur, et les élargir pour lui rouvrirait la porte qu'elles ferment.
 */
export function ageDebutBornes(categorie: CategorieCarriere): [number, number] {
  return categorie === 'entraineur'
    ? [LIMITES.ageDebutManagerMin, LIMITES.ageDebutManagerMax]
    : [LIMITES.ageDebutMin, LIMITES.ageDebutMax];
}

/**
 * Le score le plus élevé qu'une carrière PUISSE atteindre en respectant les
 * règles.
 *
 * ⚠️ IL A CHANGÉ AVEC LE MODE MANAGER, DONC LE `check` SQL AUSSI. La colonne
 * `score` porte une contrainte en dur (`serveur/schema-vercel.sql` et
 * `serveur/schema.sql`) : la laisser derrière ferait refuser par la base des
 * scores que le jeu produit — c’est déjà arrivé deux fois.
 *
 * ⚠️ ET C’EST BIEN UNE CARRIÈRE « joueur + entraîneur » qui le fixe : elle
 * cumule les deux versants. Un joueur seul ne peut pas l’atteindre, et c’est
 * normal — le plafond borne le pire cas, pas le cas courant.
 */
export const SCORE_MAX = scoreDeLaFiche({
  note: LIMITES.noteMax,
  reputation: LIMITES.reputationMax,
  saisons: SAISONS_MAX_MANAGER,
  titres: new Array(SAISONS_MAX * LIMITES.titresParSaison).fill('brennus'),
  essais: SAISONS_MAX * LIMITES.matchsParSaison * LIMITES.essaisParMatch,
  matchs: SAISONS_MAX * LIMITES.matchsParSaison,
  manager: {
    saisons: SAISONS_MAX_MANAGER,
    titres: new Array(SAISONS_MAX_MANAGER * LIMITES.titresManagerParSaison).fill('brennus'),
    montees: SAISONS_MAX_MANAGER * LIMITES.monteesParSaison,
    prestige: LIMITES.prestigeMax,
    clubs: new Array(SAISONS_MAX_MANAGER + 1).fill('club'),
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA VÉRIFICATION — ce que le serveur exécute avant d'écrire une ligne
// ═══════════════════════════════════════════════════════════════════════════

export interface Verdict {
  valide: boolean;
  /** Le score RECALCULÉ. C'est lui qu'on écrit en base, jamais `fiche.score`. */
  score: number;
  /** Ce qui cloche, en clair. Vide si la fiche est valide. */
  anomalies: string[];
}

/**
 * Passe une fiche au crible. Pure, sans effet de bord, sans réseau : elle donne
 * exactement le même verdict dans le navigateur et sur le serveur.
 *
 * @param trophees ids de trophées connus (`Object.keys(TROPHEES)`). Passé en
 *   paramètre plutôt qu'importé pour que ce fichier reste copiable tel quel
 *   côté serveur, sans traîner tout `data/trophees.ts` derrière lui.
 */
export function verifierFiche(f: unknown, trophees?: Iterable<string>): Verdict {
  const anomalies: string[] = [];
  const rejet = (m: string) => anomalies.push(m);

  if (!f || typeof f !== 'object') {
    return { valide: false, score: 0, anomalies: ['fiche absente ou illisible'] };
  }
  const c = f as Partial<FicheCarriere>;

  // --- Types et bornes élémentaires ----------------------------------------
  const entier = (v: unknown, nom: string, min: number, max: number): number => {
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
      rejet(`${nom} n'est pas un entier`);
      return NaN;
    }
    if (v < min || v > max) rejet(`${nom} hors bornes (${v}, attendu ${min}..${max})`);
    return v;
  };

  if (c.v !== VERSION_BAREME) rejet(`version de barème inconnue (${String(c.v)})`);

  const pseudo = typeof c.pseudo === 'string' ? c.pseudo.trim() : '';
  if (!pseudo) rejet('pseudo vide');
  else if (pseudo.length > LIMITES.pseudoMax) rejet('pseudo trop long');
  // ⚠️ LA CLÉ EST FACULTATIVE MAIS BORNÉE. Elle sert d'identifiant de ligne en
  // base : elle est donc écrite telle quelle, et tout ce qui est écrit tel quel
  // se borne AVANT. Alphabet volontairement étroit — un UUID et son préfixe
  // n'ont besoin de rien d'autre.
  if (c.cle !== undefined) {
    if (typeof c.cle !== 'string') rejet('clé de ligne : ce n’est pas un texte');
    else if (!c.cle.trim()) rejet('clé de ligne vide');
    else if (c.cle.length > LIMITES.cleMax) rejet('clé de ligne trop longue');
    else if (!/^[A-Za-z0-9:_-]+$/.test(c.cle)) rejet('clé de ligne mal formée');
  }
  if (typeof c.nom !== 'string' || !c.nom.trim()) rejet('nom vide');
  if (typeof c.poste !== 'string' || !c.poste) rejet('poste absent');
  if (typeof c.nation !== 'string' || !c.nation) rejet('nation absente');

  // ⚠️ LA CATÉGORIE SE DÉDUIT, ELLE NE SE CROIT PAS. Le champ `categorie` est
  // écrit par le client : s’y fier pour choisir les bornes laisserait annoncer
  // « entraîneur » sur une fiche de joueur pour gagner vingt-six saisons de
  // marge. C’est la PRÉSENCE d’un versant manager qui tranche, et elle est
  // bornée juste en dessous.
  const versant = c.manager;
  if (versant !== undefined && (typeof versant !== 'object' || versant === null)) {
    rejet('versant entraîneur illisible');
  }
  const m = (typeof versant === 'object' && versant !== null ? versant : undefined) as
    Partial<FicheManager> | undefined;
  const categorie: CategorieCarriere = m ? (Number(c.matchs) > 0
    ? 'joueurEntraineur' : 'entraineur') : 'joueur';
  if (c.categorie !== undefined && c.categorie !== categorie) {
    rejet(`catégorie annoncée « ${String(c.categorie)} », déduite « ${categorie} »`);
  }

  const saisons = entier(c.saisons, 'saisons', 1, saisonsMax(categorie));
  const [debutMin, debutMax] = ageDebutBornes(categorie);
  const ageDebut = entier(c.ageDebut, 'ageDebut', debutMin, debutMax);
  const age = entier(c.age, 'age', debutMin, ageMaxDe(categorie));
  const note = entier(c.note, 'note', 0, LIMITES.noteMax);
  const reputation = entier(c.reputation, 'reputation', 0, LIMITES.reputationMax);
  const matchs = entier(c.matchs, 'matchs', 0, SAISONS_MAX * LIMITES.matchsParSaison);
  const essais = entier(c.essais, 'essais', 0, SAISONS_MAX * LIMITES.matchsParSaison * LIMITES.essaisParMatch);
  const selections = entier(c.selections, 'selections', 0, SAISONS_MAX * LIMITES.capesParSaison);

  if (!Array.isArray(c.titres)) rejet('titres n\'est pas une liste');
  const titres = Array.isArray(c.titres) ? c.titres : [];
  if (titres.some((t) => typeof t !== 'string')) rejet('un titre n\'est pas un identifiant');

  // ⚠️ LES CLUBS SONT AFFICHÉS TELS QUELS SUR L'ÉCRAN DE TOUS LES JOUEURS. Ils
  // ne pèsent rien sur le score, donc il n'y a rien à « tricher » — mais tout à
  // injecter. On borne le nombre, la longueur et le type avant d'écrire quoi
  // que ce soit en base.
  if (!Array.isArray(c.clubs)) rejet('clubs n\'est pas une liste');
  const clubs = Array.isArray(c.clubs) ? c.clubs : [];
  if (clubs.some((v) => typeof v !== 'string' || !v.trim())) rejet('un club est vide ou n\'est pas un texte');
  if (clubs.some((v) => typeof v === 'string' && v.length > LIMITES.clubMax)) rejet('un nom de club est trop long');

  // --- LE VERSANT ENTRAÎNEUR -----------------------------------------------
  let saisonsM = 0;
  let titresM: string[] = [];
  let monteesM = 0;
  let prestigeM = 0;
  let clubsM: string[] = [];
  if (m) {
    saisonsM = entier(m.saisons, 'saisons entraîneur', 1, SAISONS_MAX_MANAGER);
    monteesM = entier(m.montees, 'montées', 0, SAISONS_MAX_MANAGER);
    prestigeM = entier(m.prestige, 'prestige', 0, LIMITES.prestigeMax);
    if (!Array.isArray(m.titres)) rejet('titres entraîneur : ce n’est pas une liste');
    titresM = Array.isArray(m.titres) ? m.titres : [];
    if (titresM.some((t) => typeof t !== 'string')) rejet('un titre entraîneur n’est pas un identifiant');
    if (!Array.isArray(m.clubs)) rejet('clubs entraîneur : ce n’est pas une liste');
    clubsM = Array.isArray(m.clubs) ? m.clubs : [];
    if (clubsM.some((v) => typeof v !== 'string' || !v.trim())) rejet('un club entraîné est vide');
    if (clubsM.some((v) => typeof v === 'string' && v.length > LIMITES.clubMax)) rejet('un nom de club entraîné est trop long');
  }

  // Une anomalie de type rend la suite ininterprétable : on s'arrête là.
  if (anomalies.length) return { valide: false, score: 0, anomalies };

  // --- LA COHÉRENCE INTERNE, le vrai verrou --------------------------------
  // ⚠️ Chaque chiffre est borné par les AUTRES. C'est ce qui transforme
  // « mettre un gros nombre » en « fabriquer une carrière entière crédible ».

  // Une saison de jeu = un an de vie. Le calendrier ne connaît pas d'exception.
  if (age !== ageDebut + saisons - 1) {
    rejet(`âge incohérent : ${ageDebut} + ${saisons} saisons - 1 = ${ageDebut + saisons - 1}, annoncé ${age}`);
  }
  if (matchs > saisons * LIMITES.matchsParSaison) {
    rejet(`${matchs} matchs en ${saisons} saison(s) : maximum ${saisons * LIMITES.matchsParSaison}`);
  }
  if (essais > matchs * LIMITES.essaisParMatch) {
    rejet(`${essais} essais en ${matchs} match(s) : maximum ${matchs * LIMITES.essaisParMatch}`);
  }
  if (titres.length > saisons * LIMITES.titresParSaison) {
    rejet(`${titres.length} titres en ${saisons} saison(s) : maximum ${saisons * LIMITES.titresParSaison}`);
  }
  // ⚠️ ET SURTOUT : ON NE GAGNE PAS DEUX FOIS LE MÊME TROPHÉE LA MÊME SAISON.
  // Cette borne-là est bien plus serrée que le total, et c'est elle qui reprend
  // le travail que le plafond de titres faisait avant qu'on l'ouvre aux
  // distinctions individuelles (4 → 9). Elle refuse « 40 Boucliers de Brennus
  // en 12 saisons » — que le total, lui, laissait passer (40 < 108) — sans rien
  // interdire à une carrière réelle : un championnat se gagne une fois par an.
  const parTrophee = new Map<string, number>();
  for (const t of titres) parTrophee.set(t, (parTrophee.get(t) ?? 0) + 1);
  const repetes = [...parTrophee].filter(([, n]) => n > saisons);
  if (repetes.length) {
    rejet(`trophée(s) gagné(s) plus d'une fois par saison : `
      + repetes.map(([id, n]) => `${id} ×${n} en ${saisons} saison(s)`).join(', '));
  }
  if (selections > saisons * LIMITES.capesParSaison) {
    rejet(`${selections} sélections en ${saisons} saison(s) : maximum ${saisons * LIMITES.capesParSaison}`);
  }
  // On ne change pas de club plus d'une fois par saison : le transfert ne
  // s'applique qu'à l'intersaison (`appliquerPreAccord`). Le premier club, lui,
  // est celui de la création — d'où le `+ 1`.
  if (clubs.length > saisons + 1) {
    rejet(`${clubs.length} clubs en ${saisons} saison(s) : maximum ${saisons + 1}`);
  }
  if (clubs.length === 0) rejet('aucun club : une carrière se joue quelque part');
  if (note > LIMITES.noteApres(saisons)) {
    rejet(`note ${note} après ${saisons} saison(s) : maximum ${LIMITES.noteApres(saisons)}`);
  }
  // On ne marque pas d'essai sans jouer, et on n'est pas international sans match.
  if (matchs === 0 && (essais > 0 || selections > 0)) {
    rejet('des essais ou des sélections sans le moindre match');
  }
  // Un titre se gagne avec une équipe : il faut avoir joué.
  if (matchs === 0 && titres.length > 0) rejet('des titres sans le moindre match');

  // --- La cohérence du versant entraîneur -----------------------------------
  if (m) {
    // ⚠️ LE TOTAL BORNE LES DEUX VERSANTS. Une carrière de trente saisons dont
    // vingt sur le banc en a joué dix, pas trente : sans ce test, on annonçait
    // « 30 saisons de joueur ET 30 saisons d’entraîneur » dans la même vie.
    if (saisonsM > saisons) {
      rejet(`${saisonsM} saisons d’entraîneur pour ${saisons} saison(s) de carrière`);
    }
    if (titresM.length > saisonsM * LIMITES.titresManagerParSaison) {
      rejet(`${titresM.length} titres d’entraîneur en ${saisonsM} saison(s) :`
        + ` maximum ${saisonsM * LIMITES.titresManagerParSaison}`);
    }
    const parTropheeM = new Map<string, number>();
    for (const t of titresM) parTropheeM.set(t, (parTropheeM.get(t) ?? 0) + 1);
    const repetesM = [...parTropheeM].filter(([, n]) => n > saisonsM);
    if (repetesM.length) {
      rejet(`trophée(s) d’entraîneur gagné(s) plus d’une fois par saison : `
        + repetesM.map(([id, n]) => `${id} ×${n}`).join(', '));
    }
    if (monteesM > saisonsM * LIMITES.monteesParSaison) {
      rejet(`${monteesM} montées en ${saisonsM} saison(s)`);
    }
    // On ne change pas de banc plus d’une fois par saison.
    if (clubsM.length > saisonsM + 1) {
      rejet(`${clubsM.length} clubs entraînés en ${saisonsM} saison(s)`);
    }
    if (clubsM.length === 0) rejet('aucun club entraîné : un entraîneur entraîne quelque part');
  }

  // --- Les titres doivent EXISTER ------------------------------------------
  // Sans ça, on annonce quarante titres inventés et le compteur × 120 s'envole.
  if (trophees) {
    const connus = new Set(trophees);
    const inconnus = [...new Set([...titres, ...titresM].filter((t) => !connus.has(t)))];
    if (inconnus.length) rejet(`trophée(s) inconnu(s) : ${inconnus.join(', ')}`);
  }

  // --- Enfin : le score annoncé doit être CELUI QU'ON RECALCULE -------------
  const score = scoreDeLaFiche({
    note, reputation, saisons, titres, essais, matchs,
    manager: m ? {
      saisons: saisonsM, titres: titresM, montees: monteesM,
      prestige: prestigeM, clubs: clubsM,
    } : undefined,
  });
  if (typeof c.score !== 'number' || Math.round(c.score) !== score) {
    rejet(`score annoncé ${String(c.score)}, score recalculé ${score}`);
  }
  if (score > SCORE_MAX) rejet(`score au-dessus du plafond absolu (${score} > ${SCORE_MAX})`);

  return { valide: anomalies.length === 0, score, anomalies };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LE SCEAU — détecter une sauvegarde retouchée à la main
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ CE N'EST PAS DE LA SÉCURITÉ, C'EST DE LA DÉTECTION. La clé vit dans le
// bundle : quelqu'un de motivé la lira et recalculera le sceau. Ce n'est pas le
// but. Le but, c'est d'attraper le geste le plus courant de très loin — ouvrir
// l'onglet Application, changer `essais: 12` en `essais: 9999`, recharger — et
// de refuser d'envoyer une sauvegarde qui ne correspond plus à ce que le jeu a
// produit. La vraie barrière reste `verifierFiche()`, côté serveur.

/** FNV-1a 32 bits, doublé sur deux graines pour 64 bits d'empreinte. */
export function empreinte(chaine: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < chaine.length; i++) {
    const co = chaine.charCodeAt(i);
    a = Math.imul(a ^ co, 0x01000193) >>> 0;
    b = Math.imul(b ^ (co + i), 0x85ebca6b) >>> 0;
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** La chaîne canonique d'une fiche : ordre FIXE, sinon le sceau n'est pas stable. */
export function canonique(f: FicheCarriere): string {
  return [
    f.v, f.pseudo, f.nom, f.poste, f.nation, f.ageDebut, f.age, f.saisons,
    f.note, f.reputation, f.matchs, f.essais, f.selections,
    // ⚠️ Les titres sont TRIÉS : deux carrières identiques dont les titres
    // arrivent dans un ordre différent doivent produire le même sceau.
    [...f.titres].sort().join(','),
    // Les clubs, EUX, gardent leur ordre : c'est un parcours, pas un ensemble.
    // `?? []` : le sceau ne doit jamais LEVER sur une fiche malformée — c'est
    // `verifierFiche` qui refuse, proprement et avec un motif.
    (f.clubs ?? []).join(','),
    // ⚠️ LE VERSANT ENTRAÎNEUR N’ALLONGE LA CHAÎNE QUE S’IL EXISTE. Ajouter
    // deux champs vides pour tout le monde aurait changé le sceau de TOUTES
    // les sauvegardes de joueur déjà scellées, et le jeu les aurait lues
    // comme retouchées à la main. Une fiche de joueur produit exactement la
    // même chaîne qu’avant.
    ...(f.manager ? [
      f.manager.saisons,
      [...f.manager.titres].sort().join(','),
      f.manager.montees,
      f.manager.prestige,
      f.manager.clubs.join(','),
    ] : []),
    f.score,
  ].join('|');
}

export function sceller(f: FicheCarriere, sel: string): string {
  return empreinte(`${sel}::${canonique(f)}`);
}

export function sceauValide(f: FicheCarriere, sceau: string, sel: string): boolean {
  return sceller(f, sel) === sceau;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. CE QUE LE SERVEUR DOIT FAIRE — la check-list, en un endroit
// ═══════════════════════════════════════════════════════════════════════════
// `verifierFiche` couvre la falsification du CONTENU. Restent trois abus qu'une
// fonction pure ne peut pas voir, et qui se traitent côté serveur :
//
//   1. LE VOLUME. Une carrière crédible demande des heures de jeu. Un envoi par
//      appareil et par heure, dix par jour, suffit à rendre le forçage inutile.
//      (clé = hash de l'IP + un identifiant d'appareil, PAS l'IP en clair.)
//   2. LA RÉPÉTITION. Même pseudo + même score + même minute = doublon : on
//      garde le premier. Un `unique(pseudo)` en base et un `on conflict do
//      update where excluded.score > carrieres.score` suffisent.
//   3. LA VITESSE. Deux carrières de 20 saisons en cinq minutes, c'est un
//      script. Journaliser l'écart entre deux envois d'un même appareil.
//
// ⚠️ ET LA CLÉ D'ÉCRITURE NE DOIT JAMAIS ÊTRE DANS LE BUNDLE. Le navigateur
// parle à une Edge Function ; c'est ELLE qui détient la clé de service et écrit
// en base. Une clé `anon` avec droit d'insertion sur la table du classement,
// c'est un classement mort en une semaine.
export const RECOMMANDATIONS_SERVEUR_LISTE = [
  'Recalculer le score avec scoreDeLaFiche() : ne jamais écrire fiche.score.',
  'Refuser toute fiche dont verifierFiche() renvoie des anomalies.',
  'Limiter : 1 envoi/heure et 10/jour par appareil, 30/heure par IP.',
  'Contrainte unique sur le pseudo, et ne garder que le meilleur score.',
  'Écrire depuis une Edge Function avec la clé de service, jamais depuis le navigateur.',
  'Journaliser les refus : c\'est là qu\'on voit arriver les scripts.',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// 7. FABRIQUER LA FICHE (côté jeu uniquement)
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ SECTION CLIENT. Les imports ci-dessous sont des imports de TYPES : ils
// disparaissent à la compilation, le fichier reste donc exécutable tel quel
// côté serveur. Si tu le copies dans une Edge Function, tu peux supprimer cette
// section — le serveur reçoit une fiche déjà faite, il n'a qu'à la vérifier.

import type { Joueur, LegendeSauvegardee, Manager } from '../types';

function moyenne(valeurs: number[]): number {
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / (valeurs.length || 1));
}

/** La fiche d'une carrière EN COURS. */
export function ficheDepuisJoueur(j: Joueur, pseudo?: string, cle?: string): FicheCarriere {
  const saisons = Math.max(1, j.saison);
  const base = {
    v: VERSION_BAREME,
    // ⚠️ LE NOM DU PERSONNAGE, PAS SON IDENTIFIANT 𝕏. La chaîne passait par
    // `j.pseudo` avant `j.nom` — or `j.pseudo` est le handle de L'Ovale
    // (`colin_gomez_12`, et `anonyme_59` quand le champ nom était laissé vide).
    // Le classement mondial affichait donc tout le monde sous un identifiant
    // technique, et personne ne s'y reconnaissait. Retour de jeu : « si on ne
    // met pas de nom à la création, on n'apparaît pas dans le classement ».
    // Seul un pseudo CHOISI exprès (`pseudoClassement`) passe devant le nom.
    pseudo: (pseudo || j.nom || j.pseudo || 'Sans nom').slice(0, LIMITES.pseudoMax),
    nom: j.nom,
    poste: j.poste,
    nation: j.nation,
    // ⚠️ DÉDUIT, PAS STOCKÉ : une saison de jeu = un an de vie, partout dans le
    // moteur. C'est cette égalité que `verifierFiche` re-teste — elle borne le
    // nombre de saisons annonçables à ce qu'une vie de rugbyman permet.
    ageDebut: j.age - saisons + 1,
    age: j.age,
    saisons,
    note: moyenne(Object.values(j.attributs)),
    reputation: Math.round(j.reputation),
    matchs: j.matchsJoues,
    essais: j.essais,
    selections: j.selections ?? 0,
    // On envoie les IDS de trophées, pas les libellés : c'est vérifiable.
    titres: (j.palmares ?? []).map((t) => t.trophee),
    clubs: j.clubs?.length ? j.clubs : [j.club],
    // ⚠️ Omise plutôt que vide quand elle est inconnue : `verifierFiche` refuse
    // une clé présente et creuse, et l'écran Classement construit une fiche sans
    // clé pour afficher un verdict.
    ...(cle ? { cle } : {}),
  };
  return { ...base, score: scoreDeLaFiche(base) };
}

/**
 * La fiche d'une carrière TERMINÉE (une légende du Hall).
 *
 * @param idsConnus table `nom du trophée → id` (`data/trophees.ts`), pour
 *   retrouver les ids des sauvegardes d'avant `LegendeSauvegardee.tropheeIds`.
 *   Passée en paramètre — et pas importée — pour que ce fichier reste copiable
 *   tel quel côté serveur.
 */
export function ficheDepuisLegende(
  l: LegendeSauvegardee, pseudo?: string, idsConnus?: Map<string, string>,
): FicheCarriere {
  const saisons = Math.max(1, l.saisons);
  // ⚠️ ON ENVOIE DE VRAIS IDS, SINON LE SERVEUR REFUSE TOUT. L'ancienne version
  // envoyait `titres.map(() => 'titre')` : un identifiant qui n'existe dans
  // aucun `TROPHEES`, donc un refus systématique (« trophée(s) inconnu(s) :
  // titre ») pour TOUTE carrière du Hall. On lit d'abord les ids mémorisés à la
  // retraite, sinon on les retrouve dans les libellés (« Bouclier de Brennus
  // (S4) » → `brennus`), et on ne garde que ce qui a été reconnu : un titre
  // qu'on ne sait pas nommer vaut mieux perdu que rejeté avec toute la fiche.
  const depuisLibelles = (): string[] => {
    if (!idsConnus) return [];
    const sortie: string[] = [];
    for (const libelle of l.titres ?? []) {
      const m = /^(.*?)\s*\(S\d+\)$/.exec(libelle);
      const id = idsConnus.get((m ? m[1] : libelle).trim());
      if (id) sortie.push(id);
    }
    return sortie;
  };
  const titres = l.tropheeIds?.length ? l.tropheeIds : depuisLibelles();
  const base = {
    v: VERSION_BAREME,
    pseudo: (pseudo ?? l.nom).slice(0, LIMITES.pseudoMax),
    nom: l.nom,
    poste: l.poste,
    nation: l.nation,
    ageDebut: l.age - saisons + 1,
    age: l.age,
    saisons,
    note: Math.round(l.note),
    reputation: Math.round(l.reputation),
    matchs: l.matchsJoues,
    essais: l.essais,
    selections: 0,
    titres,
    // ⚠️ Une légende d'avant ce champ n'a pas de liste de clubs : on retombe sur
    // ceux où elle a gagné un titre. Mieux vaut une liste partielle qu'une fiche
    // refusée pour « aucun club ».
    clubs: l.clubs?.length ? l.clubs : ['-'],
  };
  return { ...base, score: scoreDeLaFiche(base) };
}

/**
 * La fiche d’une carrière d’ENTRAÎNEUR — en cours ou terminée.
 *
 * ⚠️ ELLE PORTE LES DEUX VERSANTS, et c’est ce qui rend les catégories
 * possibles. Un entraîneur qui a d’abord été joueur garde son passé de joueur
 * dans les champs du haut (`matchs`, `essais`, `note`…) : `categorieDeLaFiche`
 * y lit « joueur + entraîneur », et son score additionne les deux barèmes.
 * Un entraîneur qui n’a jamais joué laisse ces champs à zéro, et tombe dans la
 * catégorie « entraîneur ».
 *
 * ⚠️ ET UNE CARRIÈRE EN MODE LIBRE NE PRODUIT PAS DE FICHE DU TOUT. Ce n’est
 * pas à cette fonction de le savoir — c’est au store de ne pas l’appeler
 * (`publierAuClassement`). Une fonction pure qui rendrait `null` selon un
 * drapeau se contournerait en retirant le drapeau ; le vrai verrou est de ne
 * jamais envoyer.
 */
export function ficheDepuisManager(
  m: Manager, pseudo?: string, cle?: string,
): FicheCarriere {
  const passe = m.passeJoueur;
  const saisonsManager = Math.max(1, m.saison);
  // Une saison de jeu = un an de vie : le total est la somme des deux vies.
  const saisons = (passe?.saisons ?? 0) + saisonsManager;
  const base = {
    v: VERSION_BAREME,
    pseudo: (pseudo ?? m.pseudo ?? m.nom).slice(0, LIMITES.pseudoMax),
    nom: m.nom,
    // ⚠️ `poste` NE PEUT PAS ÊTRE VIDE — `verifierFiche` le refuse, et il a
    // raison : c’est un champ affiché tel quel sur la fiche de tout le monde.
    // Un entraîneur n’a pas de poste, il a une fonction.
    poste: 'entraineur',
    nation: m.nation,
    ageDebut: m.age - saisons + 1,
    age: m.age,
    saisons,
    note: passe?.note ?? 0,
    reputation: passe?.reputation ?? 0,
    matchs: passe?.matchs ?? 0,
    essais: passe?.essais ?? 0,
    selections: passe?.selections ?? 0,
    titres: passe?.titres ?? [],
    // Les clubs affichés sont ceux de toute la vie : joués puis entraînés.
    clubs: [...(passe?.clubs ?? []), ...m.clubs].filter((v, i, l) => v && l.indexOf(v) === i),
    manager: {
      saisons: saisonsManager,
      titres: m.palmares.map((t) => t.trophee),
      montees: m.historique.filter((h) => h.montee).length,
      prestige: Math.round(m.prestige),
      clubs: m.clubs,
    },
    ...(cle ? { cle } : {}),
  };
  return {
    ...base,
    categorie: categorieDeLaFiche(base),
    score: scoreDeLaFiche(base),
  };
}
