// LES PACKS DE TEST, CÔTÉ SERVEUR (Correctif 33) — quelles cartes existent, et ce qu'un pack contient vraiment.
//
// ⚠️ LE NAVIGATEUR N'ENVOIE QUE DES IDENTIFIANTS. Le nom, la note, la rareté ou l'image d'une carte ne viennent jamais
// de la demande : chaque identifiant est résolu ici, dans le catalogue du serveur, à la création ET à l'ouverture. Un
// identifiant inconnu fait refuser le pack entier.
//
// L'univers des cartes : le catalogue mondial (joueurs de base, ajouts du Labo, profils validés), TOUTES les cartes
// spéciales du Labo — publiées ou non, c'est un outil de test —, et les joueuses validées quand le compte a l'accès
// à la bêta féminine. Une famille de cartes spéciales ajoutée demain entre ici sans retouche.

import { POSTE_PAR_ID } from '../src/data/rugby.js';
import type { CatalogueAdmin } from '../src/lib/ligue/atelierCatalogue.js';
import { catalogueMondialCarriere, type SourceCarte } from '../src/lib/ligue/catalogueCarriere.js';
import { catalogueSpecial, statutCarteSpeciale } from '../src/lib/ligue/catalogueSpecial.js';
import { RARETES_CARRIERE } from '../src/lib/ligue/catalogueCarriere.js';
import type { RareteCarriere } from '../src/lib/ligue/typesCarriere.js';
import { cleCarteSolo } from '../src/lib/collectionSolo.js';
import {
  ordreDeRevelation, type CarteCandidate, type PackInterne, type TypeCarteInterne,
} from '../src/lib/packsInternes.js';

interface Entree { source: SourceCarte; type: TypeCarteInterne; statut?: string; visible: boolean; cle: string }
export interface UniversCartes { parId: ReadonlyMap<string, Entree>; liste: readonly Entree[] }

const normaliser = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cleRecherche = (s: SourceCarte) => normaliser(`${s.nom} ${s.clubReel} ${s.nation} ${s.championnat}`);

// L'univers se garde tant que ses deux sources ne changent pas : le catalogue mondial (un tableau par révision du Labo
// et par état de la base de joueurs) et la liste des joueuses validées.
const univers = new WeakMap<readonly SourceCarte[], WeakMap<readonly SourceCarte[], UniversCartes>>();
const AUCUNE: readonly SourceCarte[] = Object.freeze([]);

/** Toutes les cartes qu'un pack de test peut contenir, pour cette révision du catalogue. */
export function universCartes(config: CatalogueAdmin, feminines: readonly SourceCarte[] = AUCUNE): UniversCartes {
  const mondial = catalogueMondialCarriere(config);
  let parCatalogue = univers.get(mondial);
  if (!parCatalogue) { parCatalogue = new WeakMap(); univers.set(mondial, parCatalogue); }
  const connu = parCatalogue.get(feminines);
  if (connu) return connu;
  const parId = new Map<string, Entree>();
  for (const source of mondial) {
    if (source.gender === 'female') continue;
    parId.set(source.sourceId, { source, type: 'normale', visible: true, cle: cleRecherche(source) });
  }
  const cat = catalogueSpecial(config);
  for (const def of cat.definitions) {
    const source = cat.sources.get(def.id);
    if (!source) continue;
    // Une carte spéciale n'apparaît en Collection solo qu'une fois publiée (ou publiée un jour) avec son image.
    const visible = def.imageReady && !def.brouillon && Boolean(def.published || def.publieeLe);
    parId.set(def.id, { source, type: def.cardType, statut: statutCarteSpeciale(def), visible, cle: cleRecherche(source) });
  }
  for (const source of feminines) {
    if (parId.has(source.sourceId)) continue;
    // Le catalogue solo ne transporte pas les joueuses : elles s'ouvrent, mais ne s'affichent pas dans la collection.
    parId.set(source.sourceId, { source, type: 'feminine', visible: false, cle: cleRecherche(source) });
  }
  const resultat: UniversCartes = { parId, liste: [...parId.values()] };
  parCatalogue.set(feminines, resultat);
  return resultat;
}

const candidate = (e: Entree): CarteCandidate => ({
  sourceId: e.source.sourceId, nom: e.source.nom, poste: e.source.poste, note: e.source.note, rarete: e.source.rarete,
  club: e.source.clubReel, nation: e.source.nation, championnat: e.source.championnat, type: e.type,
  ...(e.source.photo ? { photo: e.source.photo } : {}), ...(e.statut ? { statut: e.statut } : {}), visibleEnCollection: e.visible,
});

export interface FiltreRecherche { q?: string; club?: string; poste?: string; rarete?: string; type?: string; limite?: number }

/**
 * La recherche du créateur de pack : nom, club, poste (maillot ou famille), rareté, type de carte. Les meilleures
 * notes d'abord. Sans aucun critère, rien n'est rendu : on ne déverse pas 78 000 cartes dans une réponse.
 */
export function rechercherCartes(u: UniversCartes, filtre: FiltreRecherche): { cartes: CarteCandidate[]; total: number } {
  const q = normaliser(filtre.q ?? ''), club = normaliser(filtre.club ?? '');
  const rarete = RARETES_CARRIERE.includes(filtre.rarete as RareteCarriere) ? filtre.rarete as RareteCarriere : '';
  const type = filtre.type ?? '', poste = filtre.poste ?? '';
  if (!q && !club && !rarete && !type && !poste) return { cartes: [], total: 0 };
  const limite = Math.max(1, Math.min(60, Math.floor(filtre.limite ?? 40)));
  const trouvees: Entree[] = [];
  for (const e of u.liste) {
    if (type && e.type !== type) continue;
    if (rarete && e.source.rarete !== rarete) continue;
    if (poste && e.source.poste !== poste && e.source.famille !== poste && POSTE_PAR_ID[e.source.poste]?.famille !== poste) continue;
    if (club && !normaliser(e.source.clubReel).includes(club)) continue;
    if (q && !e.cle.includes(q)) continue;
    trouvees.push(e);
  }
  trouvees.sort((a, b) => b.source.note - a.source.note || a.source.nom.localeCompare(b.source.nom, 'fr') || (a.source.sourceId < b.source.sourceId ? -1 : 1));
  return { cartes: trouvees.slice(0, limite).map(candidate), total: trouvees.length };
}

/** Les cartes d'un pack, résolues dans l'univers. Lève une erreur lisible si l'une d'elles n'existe pas (ou plus). */
export function resoudreCartes(u: UniversCartes, sourceIds: readonly string[]): Entree[] {
  return sourceIds.map((id) => {
    const entree = u.parId.get(id);
    if (!entree) throw new Error(`Carte introuvable dans le catalogue : ${id}.`);
    return entree;
  });
}

/** La rareté de la meilleure carte : c'est la couleur de la pochette en boutique. */
export function apparencePackInterne(u: UniversCartes, pack: Pick<PackInterne, 'cartes'>): RareteCarriere {
  let rang = 0;
  for (const id of pack.cartes) rang = Math.max(rang, RARETES_CARRIERE.indexOf(u.parId.get(id)?.source.rarete ?? 'bronze'));
  return RARETES_CARRIERE[rang] ?? 'bronze';
}

/**
 * Ce que l'ouverture d'un pack donne : les cartes dans l'ordre de révélation, et ce qui s'ajoute au coffre.
 * ⚠️ AUCUN TIRAGE : le contenu est la liste enregistrée, relue dans le catalogue courant.
 */
export function contenuPackInterne(u: UniversCartes, pack: PackInterne): { cartes: SourceCarte[]; quantites: Record<string, number>; ordre: string[] } {
  const ordre = ordreDeRevelation(pack);
  const cartes = resoudreCartes(u, ordre).map(e => e.source);
  const quantites: Record<string, number> = {};
  for (const carte of cartes) {
    const cle = cleCarteSolo(carte.sourceId);
    quantites[cle] = (quantites[cle] ?? 0) + 1;
  }
  return { cartes, quantites, ordre };
}

/** Le détail d'un pack pour le Labo : chaque carte avec son nom, sa note et son type ; une carte disparue reste listée. */
export function detailPackInterne(u: UniversCartes, pack: PackInterne): PackInterne & { detail: (CarteCandidate | { sourceId: string; manquante: true })[] } {
  return { ...pack, detail: ordreDeRevelation(pack).map((id) => { const e = u.parId.get(id); return e ? candidate(e) : { sourceId: id, manquante: true as const }; }) };
}
