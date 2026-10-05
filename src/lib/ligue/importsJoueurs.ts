// IMPORTS JOUEURS — faire entrer des joueurs sans créer de doublons
//
// ⚠️ LE NOM SEUL NE SUFFIT PAS, ET C'EST TOUT LE SUJET. Le catalogue fusionne
// deux joueurs de même nom : les homonymes documentés dans la MLR, la RFU
// Championship et le NPC sont maintenant distingués dans le catalogue de base
// grâce aux fiches source. Pour les nouveaux imports, le nom reste insuffisant.
// L'inverse est aussi faux : un joueur prêté ou transféré change de
// club sans changer d'identité.
//
// La règle tient donc en trois étages, du plus sûr au plus fragile :
//   1. prénom + nom + date de naissance, quand on l'a ;
//   2. sinon prénom + nom + club ;
//   3. sinon, si la source ne connaît qu'UNE fiche pour ce nom, c'est le même
//      joueur ailleurs ; sinon c'est DOUTEUX, et c'est le Labo qui tranche.
// Rien de douteux n'entre en base sans une décision manuelle.
//
// Module pur (pas de DOM, pas d'horloge implicite) : le serveur l'exécute.

import { POSTES } from '../../data/rugby.js';
import type { FamillePoste, PosteId } from '../../types.js';
import type { CatalogueAdmin } from './atelierCatalogue.js';
import { catalogueMondialCarriere, type SourceCarte } from './catalogueCarriere.js';

export interface LigneImport {
  prenom?: string;
  nom: string;
  /** « Pilier », « 3ème ligne », « 11 », ou un identifiant de poste du jeu. */
  poste?: string;
  club: string;
  ligue: string;
  /** URL HTTPS ou chemin /photos/. */
  image?: string;
  /** AAAA-MM-JJ. */
  dateNaissance?: string;
  nation?: string;
  note?: number;
  age?: number;
  /** Nombre de fiches DIFFÉRENTES portant ce nom dans la source (1 = identité sûre). */
  fichesSource?: number;
}

/** Un joueur créé par le Labo. Il rejoint le catalogue mondial de toutes les ligues. */
export interface AjoutJoueur {
  sourceId: string; nom: string; poste: PosteId; postesSecondaires?: PosteId[];
  note: number; potentiel: number; age: number; nation: string;
  clubReel: string; championnat: string; pays: string; photo?: string;
  dateNaissance?: string; ajouteLe: string;
}

export interface DecisionImport {
  decision: 'ajouter' | 'fusionner' | 'ignorer';
  /** Le joueur créé ou celui auquel la ligne a été rattachée. */
  sourceId?: string;
  date: string;
}

export type VerdictImport = 'nouveau' | 'present' | 'douteux';
export interface CandidatImport { sourceId: string; nom: string; club: string; championnat: string; note: number; age: number; photo: boolean }
export interface AnalyseImport {
  cle: string;
  ligne: LigneImport;
  verdict: VerdictImport;
  regle: 'naissance' | 'club' | 'fiche' | 'nom' | 'aucune';
  raison: string;
  candidats: CandidatImport[];
  decision?: DecisionImport;
}

const normaliser = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slug = (texte: string) => normaliser(texte).replace(/ /g, '-');
export const nomComplet = (l: Pick<LigneImport, 'prenom' | 'nom'>) => (l.prenom ? `${l.prenom.trim()} ${l.nom.trim()}` : l.nom.trim());
export const cleImport = (l: LigneImport) => [slug(nomComplet(l)), slug(l.club), l.dateNaissance ?? ''].join('|');

/** Les mots qui ne disent rien d'un club : « Rugby », « RFC », « Club »… */
const GENERIQUES = new Set(['rugby', 'rfc', 'rc', 'rfu', 'club', 'fc', 'the', 'de', 'du', 'la', 'le', 'us', 'as', 'cs', 'stade', 'university', 'rugby club', 'xv']);
const motsClub = (club: string) => normaliser(club).split(' ').filter(m => m && !GENERIQUES.has(m));
/** « Seattle » et « Seattle Seawolves », « Hartpury RFC » et « Hartpury University » : même club. */
export function memeClub(a: string, b: string): boolean {
  const na = normaliser(a), nb = normaliser(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const ma = motsClub(a), mb = motsClub(b);
  return Boolean(ma[0] && ma[0] === mb[0]);
}

const FAMILLES_TEXTE: [RegExp, PosteId][] = [
  [/^pilier/, 'pilier_gauche'], [/^talon/, 'talonneur'], [/^(2|deux)/, 'deuxieme_ligne_g'],
  [/^(numero 8|n 8|8$|3 ?eme ligne centre)/, 'numero_8'], [/^(3|trois|flanker)/, 'troisieme_aile_g'],
  [/^(demi de )?melee|^(scrum|demi melee)/, 'demi_melee'], [/^(demi d )?ouverture|^fly/, 'demi_ouverture'],
  [/^centre/, 'premier_centre'], [/^ailier|^wing/, 'ailier_gauche'], [/^arriere|^full/, 'arriere'],
];
const PAR_FAMILLE: Record<FamillePoste, PosteId> = {
  pilier: 'pilier_gauche', talonneur: 'talonneur', deuxieme_ligne: 'deuxieme_ligne_g', troisieme_ligne: 'troisieme_aile_g',
  demi_melee: 'demi_melee', demi_ouverture: 'demi_ouverture', centre: 'premier_centre', ailier: 'ailier_gauche', arriere: 'arriere',
};
/** Un poste lisible par un humain → le maillot du jeu. `undefined` si on ne sait pas. */
export function posteImport(texte: string | undefined): PosteId | undefined {
  if (!texte) return undefined;
  const brut = texte.trim();
  if (POSTES.some(p => p.id === brut)) return brut as PosteId;
  if (brut in PAR_FAMILLE) return PAR_FAMILLE[brut as FamillePoste];
  const numero = Number(brut.split('/')[0]);
  if (Number.isInteger(numero)) return POSTES.find(p => p.numero === numero)?.id;
  const n = normaliser(brut);
  return FAMILLES_TEXTE.find(([motif]) => motif.test(n))?.[1];
}

const indexParConfig = new WeakMap<object, Map<string, SourceCarte[]>>();
function indexDesNoms(config: CatalogueAdmin): Map<string, SourceCarte[]> {
  const connu = indexParConfig.get(config);
  if (connu) return connu;
  const index = new Map<string, SourceCarte[]>();
  for (const source of catalogueMondialCarriere(config)) {
    const cle = normaliser(source.nom);
    const liste = index.get(cle) ?? [];
    liste.push(source);
    index.set(cle, liste);
  }
  indexParConfig.set(config, index);
  return index;
}

/** Classe chaque ligne : nouvelle, déjà présente, ou douteuse (à trancher à la main). */
export function analyserImport(lignes: readonly LigneImport[], config: CatalogueAdmin): AnalyseImport[] {
  const index = indexDesNoms(config);
  const naissances = new Map(Object.values(config.ajouts ?? {}).filter(a => a.dateNaissance).map(a => [a.sourceId, a.dateNaissance!]));
  return lignes.map((ligne) => {
    const cle = cleImport(ligne);
    const sources = index.get(normaliser(nomComplet(ligne))) ?? [];
    const candidats: CandidatImport[] = sources.map(s => ({ sourceId: s.sourceId, nom: s.nom, club: s.clubReel, championnat: s.championnat, note: s.note, age: s.age, photo: Boolean(s.photo) }));
    const base = { cle, ligne, candidats, decision: config.importsDecisions?.[cle] };
    if (!sources.length) return { ...base, verdict: 'nouveau' as const, regle: 'aucune' as const, raison: 'Aucun joueur de ce nom dans la base.' };
    if (ligne.dateNaissance) {
      const dates = sources.map(s => naissances.get(s.sourceId)).filter(Boolean);
      if (dates.includes(ligne.dateNaissance)) return { ...base, verdict: 'present' as const, regle: 'naissance' as const, raison: 'Même prénom, même nom, même date de naissance.' };
      if (dates.length === sources.length) return { ...base, verdict: 'nouveau' as const, regle: 'naissance' as const, raison: 'Homonyme : même nom, date de naissance différente.' };
    }
    if (sources.some(s => memeClub(s.clubReel, ligne.club))) return { ...base, verdict: 'present' as const, regle: 'club' as const, raison: 'Même prénom, même nom, même club.' };
    const ageEloigne = ligne.age !== undefined && sources.every(s => Math.abs(s.age - ligne.age!) > 2);
    if (ligne.fichesSource === 1 && !ageEloigne) return { ...base, verdict: 'present' as const, regle: 'fiche' as const, raison: 'Une seule fiche source pour ce nom : même joueur, autre club (prêt ou transfert).' };
    const raison = (ligne.fichesSource ?? 0) > 1
      ? `Homonyme probable : la source compte ${ligne.fichesSource} joueurs de ce nom.`
      : ageEloigne ? 'Même nom, autre club et autre âge : homonyme ou erreur ?' : 'Même nom, autre club : transfert ou homonyme ?';
    return { ...base, verdict: 'douteux' as const, regle: 'nom' as const, raison };
  });
}

/** L'identifiant d'un joueur importé : jamais celui d'un homonyme déjà en base. */
export const sourceIdImport = (l: LigneImport) => `import:${slug(nomComplet(l))}:${slug(l.club)}`;
