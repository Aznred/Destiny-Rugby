// ═══════════════════════════════════════════════════════════════════════════
// LA MÉMOIRE DE LA SAUVEGARDE — 30 saisons qui ne s'effacent pas
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « conserver l'historique de toutes les saisons […] ne jamais
// supprimer ces données pendant une carrière longue », « chaque joueur doit
// conserver ses statistiques saison après saison », « lorsqu'un joueur prend sa
// retraite, son historique reste accessible », et le principe qui commande tout
// le lot :
//
//   « L'objectif principal est de rendre une sauvegarde de 20 ou 30 saisons
//     intéressante. Les personnages, clubs et événements doivent avoir une
//     mémoire. Une décision prise plusieurs années auparavant doit pouvoir avoir
//     des conséquences futures. »
//
// ⚠️ C'EST LE SOCLE DE TOUT LE RESTE, ET C'EST POUR ÇA QU'IL PASSE EN PREMIER.
// Un Hall of Fame sans historique n'a rien à classer ; une reconversion d'ancien
// joueur en entraîneur n'a rien à conserver ; une rivalité dynamique n'a rien à
// accumuler. Sans mémoire, tous les autres systèmes redeviennent des générateurs
// d'événements sans conséquence — exactement ce que la demande écarte.
//
// ⚠️ ET LE VRAI RISQUE TECHNIQUE EST LA TAILLE DE LA SAUVEGARDE, pas la logique.
// Le projet a déjà payé ça une fois : `statsReelles` ne conserve qu'UNE division
// et UNE saison parce que tout garder faisait exploser le quota du
// `localStorage` (~5 Mo pour la sauvegarde entière). Trente saisons × trente-
// trois compétitions × un XV de la saison, ce serait quinze mille noms. Chaque
// structure ci-dessous est donc dimensionnée, et `scripts/verifHistoire.ts`
// MESURE le poids d'une carrière de trente ans — c'est le contrôle central.

import type { PosteId } from '../types';

// ---------------------------------------------------------------------------
// L'ARCHIVE D'UNE SAISON DE COMPÉTITION
// ---------------------------------------------------------------------------

/** Une distinction individuelle d'une saison : le nom suffit à la relire. */
export interface LaureatSaison {
  nom: string;
  club: string;
  /** La valeur qui l'a fait gagner : essais, points, note… */
  valeur: number;
}

export interface SaisonArchivee {
  saison: number;
  champion: string;
  finaliste?: string;
  /** Le classement final, du premier au dernier. */
  classement: string[];
  montees: string[];
  relegations: string[];
  meilleurMarqueur?: LaureatSaison;
  meilleurRealisateur?: LaureatSaison;
  mvp?: LaureatSaison;
  meilleurJeune?: LaureatSaison;
  /**
   * ⚠️ LE XV DE LA SAISON N'EST GARDÉ QUE POUR LES COMPÉTITIONS QU'ON SUIT.
   * Quinze noms × trente-trois compétitions × trente saisons, c'est quinze mille
   * chaînes dans le `localStorage` — plusieurs centaines de kilo-octets pour une
   * information que personne ne consulte sur une division étrangère. Voir
   * `COMPETITIONS_DETAILLEES`.
   */
  xvDeLaSaison?: { nom: string; club: string; poste: PosteId }[];
}

/** L'histoire complète d'une compétition, saison après saison. */
export type ArchiveCompetition = SaisonArchivee[];

/** Toute la mémoire du monde : compétition → ses saisons. */
export type HistoireDuMonde = Record<string, ArchiveCompetition>;

/**
 * ⚠️ ON NE DÉTAILLE QUE CE QUI SE CONSULTE. Le classement complet et le XV de la
 * saison ne sont conservés que pour la compétition où le joueur évolue et pour
 * les trois divisions professionnelles françaises. Partout ailleurs on garde le
 * champion, les montées et les relégations — de quoi écrire « 2047 — Toulouse »
 * sur une page d'histoire, ce que la demande réclame, sans porter le reste.
 */
export const COMPETITIONS_DETAILLEES = ['top14', 'prod2', 'nationale'];

export function detaillee(competitionId: string, competitionDuJoueur?: string): boolean {
  return COMPETITIONS_DETAILLEES.includes(competitionId) || competitionId === competitionDuJoueur;
}

/**
 * ARCHIVE UNE SAISON.
 *
 * ⚠️ ELLE N'ÉCRASE JAMAIS. « Ne jamais supprimer ces données pendant une
 * carrière longue » : rejouer une saison déjà archivée est un bug d'appelant, on
 * ne le laisse pas passer en silence — la saison existante est conservée.
 */
export function archiver(
  histoire: HistoireDuMonde,
  competitionId: string,
  saison: SaisonArchivee,
  detaille: boolean,
): HistoireDuMonde {
  const deja = histoire[competitionId] ?? [];
  if (deja.some((s) => s.saison === saison.saison)) return histoire;
  const allege: SaisonArchivee = detaille ? saison : {
    ...saison,
    classement: saison.classement.slice(0, 3),
    xvDeLaSaison: undefined,
  };
  return { ...histoire, [competitionId]: [...deja, allege].sort((a, b) => b.saison - a.saison) };
}

/** Le palmarès d'une compétition : « 2047 — Toulouse », du plus récent au plus ancien. */
export function palmaresDe(histoire: HistoireDuMonde, competitionId: string): {
  saison: number; champion: string;
}[] {
  return (histoire[competitionId] ?? []).map((s) => ({ saison: s.saison, champion: s.champion }));
}

/** Combien de fois ce club a-t-il gagné cette compétition ? */
export function titresDe(histoire: HistoireDuMonde, competitionId: string, club: string): number {
  return (histoire[competitionId] ?? []).filter((s) => s.champion === club).length;
}

/** Tout ce qu'un club a gagné, toutes compétitions confondues. */
export function palmaresDuClub(histoire: HistoireDuMonde, club: string): {
  competitionId: string; saisons: number[];
}[] {
  const out: { competitionId: string; saisons: number[] }[] = [];
  for (const [id, archive] of Object.entries(histoire)) {
    const saisons = archive.filter((s) => s.champion === club).map((s) => s.saison);
    if (saisons.length) out.push({ competitionId: id, saisons: saisons.sort((a, b) => b - a) });
  }
  return out.sort((a, b) => b.saisons.length - a.saisons.length);
}

// ---------------------------------------------------------------------------
// LA CARRIÈRE D'UN JOUEUR
// ---------------------------------------------------------------------------
// « Chaque joueur doit conserver ses statistiques saison après saison : clubs,
// matchs, titularisations, minutes, essais, points, cartons, sélections, titres,
// récompenses. »

export interface SaisonDeJoueur {
  saison: number;
  /**
   * ⚠️ VRAI QUAND CETTE LIGNE RÉSUME PLUSIEURS SAISONS (voir `compacter`). Les
   * totaux et le palmarès restent exacts ; c'est le détail année par année des
   * saisons anciennes qui a été replié. La fiche doit le DIRE à l'écran — un
   * chiffre agrégé présenté comme une saison serait un mensonge.
   */
  resume?: boolean;
  /** Le nombre de saisons repliées dans cette ligne. */
  saisonsResumees?: number;
  club: string;
  /** L'étage où il a joué cette saison-là — c'est ce qui pondère le prestige. */
  niveau: number;
  matchs: number;
  titularisations: number;
  minutes: number;
  essais: number;
  points: number;
  cartons: number;
  selections: number;
  /** Les identifiants de trophées gagnés cette saison. */
  titres: string[];
  /** Les distinctions individuelles : « meilleurJoueur », « meilleurEspoir »… */
  recompenses: string[];
  capitaine: boolean;
  /** La note moyenne de la saison, sur 10. */
  note: number;
}

export interface CarriereJoueur {
  id: string;
  nom: string;
  nation: string;
  poste: PosteId;
  /** L'âge à la dernière saison connue. */
  age: number;
  saisons: SaisonDeJoueur[];
  /** Renseigné à la retraite ; la fiche reste consultable après. */
  retraiteEn?: number;
  /** Le club où il a raccroché. */
  clubDeFin?: string;
}

/** Le cumul d'une carrière, pour la fiche et pour le Hall of Fame. */
export interface TotauxCarriere {
  matchs: number;
  titularisations: number;
  minutes: number;
  essais: number;
  points: number;
  cartons: number;
  selections: number;
  titres: number;
  recompenses: number;
  saisonsCapitaine: number;
  clubs: string[];
  /** Le plus haut étage jamais atteint (1 = Top 14). */
  meilleurNiveau: number;
}

export function totaux(c: CarriereJoueur): TotauxCarriere {
  const t: TotauxCarriere = {
    matchs: 0, titularisations: 0, minutes: 0, essais: 0, points: 0, cartons: 0,
    selections: 0, titres: 0, recompenses: 0, saisonsCapitaine: 0, clubs: [],
    meilleurNiveau: 11,
  };
  for (const s of c.saisons) {
    t.matchs += s.matchs; t.titularisations += s.titularisations; t.minutes += s.minutes;
    t.essais += s.essais; t.points += s.points; t.cartons += s.cartons;
    t.selections += s.selections; t.titres += s.titres.length;
    t.recompenses += s.recompenses.length;
    if (s.capitaine) t.saisonsCapitaine++;
    if (!t.clubs.includes(s.club)) t.clubs.push(s.club);
    if (s.niveau < t.meilleurNiveau) t.meilleurNiveau = s.niveau;
  }
  return t;
}

/**
 * AJOUTE UNE SAISON À UNE CARRIÈRE.
 *
 * ⚠️ ON CUMULE SI LA SAISON EXISTE DÉJÀ, on ne la remplace pas. Un joueur peut
 * jouer pour son club ET pour sa sélection dans la même saison, et les deux
 * arrivent par des chemins différents. Écraser ferait disparaître l'un des deux
 * sans que rien ne le signale.
 */
export function ajouterSaison(c: CarriereJoueur, s: SaisonDeJoueur): CarriereJoueur {
  const i = c.saisons.findIndex((x) => x.saison === s.saison && x.club === s.club);
  if (i < 0) {
    return { ...c, age: Math.max(c.age, 0), saisons: [...c.saisons, s].sort((a, b) => a.saison - b.saison) };
  }
  const a = c.saisons[i];
  const fusion: SaisonDeJoueur = {
    ...a,
    matchs: a.matchs + s.matchs,
    titularisations: a.titularisations + s.titularisations,
    minutes: a.minutes + s.minutes,
    essais: a.essais + s.essais,
    points: a.points + s.points,
    cartons: a.cartons + s.cartons,
    selections: a.selections + s.selections,
    titres: [...new Set([...a.titres, ...s.titres])],
    recompenses: [...new Set([...a.recompenses, ...s.recompenses])],
    capitaine: a.capitaine || s.capitaine,
    note: Math.round(((a.note + s.note) / 2) * 10) / 10,
  };
  const saisons = [...c.saisons];
  saisons[i] = fusion;
  return { ...c, saisons };
}

// ---------------------------------------------------------------------------
// LE HALL OF FAME
// ---------------------------------------------------------------------------
// « Créer un Hall of Fame par club. Déterminer un score de légende selon :
// matchs, ancienneté, performances, titres, capitanat, fidélité, records,
// importance historique. »

export type RangLegende = 'joueurMarquant' | 'icone' | 'legende';

export interface FicheHallOfFame {
  id: string;
  nom: string;
  poste: PosteId;
  score: number;
  rang: RangLegende;
  /** Les saisons passées DANS CE CLUB. */
  saisonsAuClub: number;
  matchsAuClub: number;
  essaisAuClub: number;
  titresAuClub: number;
  premiereSaison: number;
  derniereSaison: number;
  forme: boolean;
}

/**
 * LE SCORE DE LÉGENDE, DANS UN CLUB DONNÉ.
 *
 * ⚠️ IL SE CALCULE SUR CE QU'IL A FAIT ICI, PAS SUR SA CARRIÈRE. Un
 * international qui passe une saison au club n'est pas une légende du club, et
 * c'est tout l'intérêt d'un Hall of Fame PAR CLUB : il raconte une maison, pas
 * un classement mondial. La fidélité pèse donc autant que le talent.
 *
 * ⚠️ ET LES TITRES SONT PONDÉRÉS PAR L'ÉTAGE. Un Brennus ne vaut pas un titre de
 * Régionale 2 — mais un titre de Régionale 2 vaut quelque chose pour le club qui
 * l'a gagné, sinon aucun club amateur n'aurait jamais de légende, et la promesse
 * « partir de Régionale 3 et construire » perdrait sa moitié humaine.
 */
export function scoreDeLegende(c: CarriereJoueur, club: string): FicheHallOfFame | null {
  const auClub = c.saisons.filter((s) => s.club === club);
  if (!auClub.length) return null;

  const matchs = auClub.reduce((n, s) => n + s.matchs, 0);
  const essais = auClub.reduce((n, s) => n + s.essais, 0);
  const titres = auClub.reduce((n, s) => n + s.titres.length, 0);
  const recompenses = auClub.reduce((n, s) => n + s.recompenses.length, 0);
  const capitanats = auClub.filter((s) => s.capitaine).length;
  const noteMoyenne = auClub.reduce((n, s) => n + s.note, 0) / auClub.length;
  const meilleurNiveau = Math.min(...auClub.map((s) => s.niveau));
  // Un titre en Top 14 vaut 1, un titre en Régionale 3 vaut 0,35.
  const poidsEtage = Math.max(0.35, 1.05 - meilleurNiveau * 0.07);

  // ⚠️ LA FIDÉLITÉ EST LA PART QU'IL A PASSÉE ICI, pas son nombre de saisons :
  // c'est ce qui distingue le joueur d'un club de celui qui a fait six clubs.
  const fidelite = auClub.length / Math.max(1, c.saisons.length);

  const score = Math.round(
    matchs * 0.55
    + auClub.length * 9
    + essais * 1.6
    + titres * 46 * poidsEtage
    + recompenses * 22 * poidsEtage
    + capitanats * 14
    + Math.max(0, noteMoyenne - 5.5) * 26
    + fidelite * 55,
  );

  return {
    id: c.id,
    nom: c.nom,
    poste: c.poste,
    score,
    rang: score >= 480 ? 'legende' : score >= 260 ? 'icone' : 'joueurMarquant',
    saisonsAuClub: auClub.length,
    matchsAuClub: matchs,
    essaisAuClub: essais,
    titresAuClub: titres,
    premiereSaison: Math.min(...auClub.map((s) => s.saison)),
    derniereSaison: Math.max(...auClub.map((s) => s.saison)),
    forme: !!c.retraiteEn,
  };
}

/** Le seuil sous lequel on n'entre pas au Hall of Fame d'un club. */
export const SEUIL_HALL_OF_FAME = 120;

export function hallOfFameDe(carrieres: CarriereJoueur[], club: string): FicheHallOfFame[] {
  return carrieres
    .map((c) => scoreDeLegende(c, club))
    .filter((f): f is FicheHallOfFame => !!f && f.score >= SEUIL_HALL_OF_FAME)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// CE QUE ÇA PÈSE DANS LA SAUVEGARDE
// ---------------------------------------------------------------------------

/**
 * ⚠️ LE CONTRÔLE QUI COMPTE VRAIMENT. Le projet a déjà dû amputer `statsReelles`
 * (une seule division, une seule saison) parce que le `localStorage` plafonne
 * autour de 5 Mo pour toute la sauvegarde. Une mémoire de trente saisons qui
 * ferait sauter ce quota rendrait le jeu injouable à la vingtième — et le bug
 * n'apparaîtrait qu'après des heures de partie.
 *
 * ⚠️ ON NE GARDE PAS TOUS LES JOUEURS DU MONDE. Six mille joueurs × trente
 * saisons, ce serait cent quatre-vingt mille lignes. On garde ceux qui ont une
 * RAISON d'être mémorisés : ceux qui sont passés par les clubs du joueur, et
 * ceux qui ont gagné quelque chose. Les autres restent déterministes et se
 * recalculent, comme les effectifs.
 */
export function poidsEnOctets(h: HistoireDuMonde, carrieres: CarriereJoueur[]): number {
  return new TextEncoder().encode(JSON.stringify({ h, carrieres })).length;
}

/**
 * LA COMPACTION — la soupape qui garde la sauvegarde ouvrable à la trentième.
 *
 * ⚠️ MESURÉ AVANT D'ÊTRE ÉCRITE : neuf cents carrières de neuf saisons pèsent
 * **1 Mo à elles seules**, et l'historique des compétitions 726 Ko. À 1,7 Mo sur
 * les ~5 Mo du `localStorage`, la mémoire mangeait le tiers de la sauvegarde —
 * et le problème n'apparaîtrait qu'après des heures de partie, comme la première
 * fois avec `statsReelles`.
 *
 * ⚠️ ON REPLIE, ON NE SUPPRIME PAS. Les saisons antérieures au seuil sont
 * fusionnées EN UNE LIGNE PAR CLUB : les totaux (matchs, essais, minutes,
 * sélections) restent exacts au point près, les titres et les récompenses sont
 * tous conservés, et le Hall of Fame continue de compter juste. Ce qu'on perd,
 * c'est de savoir combien de matchs il a joués en telle année quinze ans plus
 * tôt — et la ligne est marquée `resume` pour que l'écran ne prétende pas le
 * contraire.
 *
 * ⚠️ ET LES SAISONS RÉCENTES RESTENT INTACTES : c'est celles-là qu'on consulte.
 */
export const SAISONS_DETAILLEES = 12;

export function compacter(c: CarriereJoueur, saisonCourante: number, garder = SAISONS_DETAILLEES): CarriereJoueur {
  const limite = saisonCourante - garder;
  const recentes = c.saisons.filter((s) => s.saison > limite);
  const anciennes = c.saisons.filter((s) => s.saison <= limite);
  if (anciennes.length <= 1) return c;

  const parClub = new Map<string, SaisonDeJoueur>();
  for (const s of anciennes) {
    const a = parClub.get(s.club);
    if (!a) {
      parClub.set(s.club, { ...s, resume: true, saisonsResumees: 1 });
      continue;
    }
    parClub.set(s.club, {
      ...a,
      // La ligne porte la PREMIÈRE saison passée dans ce club : c'est ce qui
      // permet au Hall of Fame de dater une période.
      saison: Math.min(a.saison, s.saison),
      niveau: Math.min(a.niveau, s.niveau),
      matchs: a.matchs + s.matchs,
      titularisations: a.titularisations + s.titularisations,
      minutes: a.minutes + s.minutes,
      essais: a.essais + s.essais,
      points: a.points + s.points,
      cartons: a.cartons + s.cartons,
      selections: a.selections + s.selections,
      titres: [...a.titres, ...s.titres],
      recompenses: [...a.recompenses, ...s.recompenses],
      capitaine: a.capitaine || s.capitaine,
      note: Math.round(((a.note * (a.saisonsResumees ?? 1) + s.note) / ((a.saisonsResumees ?? 1) + 1)) * 10) / 10,
      resume: true,
      saisonsResumees: (a.saisonsResumees ?? 1) + 1,
    });
  }
  return {
    ...c,
    saisons: [...parClub.values(), ...recentes].sort((a, b) => a.saison - b.saison),
  };
}

/**
 * ⚠️ ÉLAGAGE : ON NE SUPPRIME JAMAIS UNE SAISON, ON RETIRE DES JOUEURS SANS
 * HISTOIRE. « Ne jamais supprimer ces données pendant une carrière longue » vise
 * l'historique des compétitions, et il est intact. Ce qu'on peut relâcher, ce
 * sont les carrières de joueurs qui n'ont jamais rien fait de mémorable et qui
 * ne sont liés à aucun des clubs du joueur : ils redeviennent déterministes.
 */
export function elaguer(
  carrieres: CarriereJoueur[],
  clubsDuJoueur: string[],
  seuilMatchs = 20,
): CarriereJoueur[] {
  return carrieres.filter((c) => {
    const t = totaux(c);
    if (t.titres > 0 || t.recompenses > 0 || t.selections > 0) return true;
    if (c.saisons.some((s) => clubsDuJoueur.includes(s.club))) return true;
    return t.matchs >= seuilMatchs;
  });
}
