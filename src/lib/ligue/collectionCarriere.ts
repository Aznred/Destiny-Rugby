import { catalogueMondialCarriere, type SourceCarte } from './catalogueCarriere.js';
import { carteSpecialeVisibleCollection, catalogueSpecial } from './catalogueSpecial.js';
import type { CarteCarriere, EtatCarriereEnLigne, PageCollection } from './typesCarriere.js';

const normaliser = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr');
let dernierCatalogue: ReturnType<typeof catalogueMondialCarriere> | undefined;
let index: { source: SourceCarte; recherche: string }[] | undefined;
const indexer = (source: SourceCarte) => ({ source, recherche: normaliser(`${source.nom} ${source.clubReel} ${source.nation} ${source.championnat}`) });

/**
 * Une page à la demande, au lieu d'envoyer 67 000 joueurs à chaque sondage de ligue.
 *
 * ⚠️ LES CARTES SPÉCIALES N'Y SONT QUE SI LA LIGUE LES AUTORISE, et seulement
 * publiées (image comprise) : une ICON en attente de son image n'existe pour
 * personne. Un exemplaire déjà distribué reste toujours visible chez son club.
 * Dans la vue « Toutes », elles passent en tête, à part des joueurs ordinaires.
 *
 * `maintenant` décide des événements pas encore ouverts ; sans lui (bancs), on
 * ne les filtre pas.
 */
export function collectionCarriere(etat: EtatCarriereEnLigne, compteId: string, params: URLSearchParams, maintenant = Number.POSITIVE_INFINITY): PageCollection {
  const monClub = etat.clubs.find(c => c.compteId === compteId);
  if (!monClub) throw new Error('Membre requis');
  if (dernierCatalogue !== catalogueMondialCarriere()) { dernierCatalogue = catalogueMondialCarriere(); index = undefined; }
  index ??= catalogueMondialCarriere().map(indexer);
  const possedees = new Map<string, CarteCarriere[]>();
  for (const carte of etat.cartes) {
    const exemplaires = possedees.get(carte.sourceId) ?? [];
    exemplaires.push(carte);
    possedees.set(carte.sourceId, exemplaires);
  }
  // Les cartes spéciales de cette ligue : celles que le Labo a publiées, plus
  // celles déjà distribuées ici (même si leur définition a changé depuis).
  const cat = catalogueSpecial();
  const speciales = etat.cartesSpeciales ? cat.definitions
    .filter(def => possedees.has(def.id) || carteSpecialeVisibleCollection(def, cat, maintenant))
    .map(def => indexer(cat.sources.get(def.id)!)) : [];
  const comptes: Record<string, number> = {};
  for (const { source } of speciales) comptes[source.speciale!.type] = (comptes[source.speciale!.type] ?? 0) + 1;
  const origines = new Map<string, { club: string; nature: 'pack' | 'dotation'; date: string }>();
  // Les transactions sont append-only. La première attribution reste l'origine après un transfert.
  for (const transaction of etat.transactions) {
    if (transaction.nature !== 'pack' && transaction.nature !== 'dotation') continue;
    for (const carteId of transaction.cartes) if (!origines.has(carteId)) origines.set(carteId, { club: transaction.clubId, nature: transaction.nature, date: transaction.date });
  }
  const recherche = normaliser((params.get('q') ?? '').slice(0, 100));
  const rarete = params.get('rarete') ?? '', poste = params.get('poste') ?? '', statut = params.get('statut') ?? '';
  const club = params.get('club') ?? '';
  // '' : tout ; 'normal' : joueurs ordinaires ; 'speciales' : toutes les
  // familles spéciales ; sinon une famille ('icon', 'halloween'…).
  const type = params.get('type') ?? '';
  const parcours = type === 'normal' ? index : type === '' ? [...speciales, ...index]
    : speciales.filter(({ source }) => type === 'speciales' || source.speciale!.type === type);
  const correspond: { source: SourceCarte; carte?: CarteCarriere }[] = [];
  for (const { source, recherche: texte } of parcours) {
    if (recherche && !texte.includes(recherche)) continue;
    if (rarete && source.rarete !== rarete) continue;
    if (poste && source.famille !== poste) continue;
    const exemplaires = possedees.get(source.sourceId);
    if (statut === 'libre' && exemplaires?.length) continue;
    if (statut === 'distribue' && !exemplaires?.length) continue;
    if (!exemplaires?.length) {
      if (!club && statut !== 'moi' && statut !== 'pack') correspond.push({ source });
      continue;
    }
    for (const carte of exemplaires) {
      if (club && carte?.proprietaire !== club) continue;
      if (statut === 'moi' && carte?.proprietaire !== monClub.id) continue;
      if (statut === 'pack' && (!carte || origines.get(carte.id)?.nature !== 'pack')) continue;
      correspond.push({ source, carte });
    }
  }
  const tri = params.get('tri');
  const groupe = (e: { source: SourceCarte }) => (type === '' && e.source.speciale ? 0 : 1);
  correspond.sort((a, b) => groupe(a) - groupe(b)
    || (tri === 'nom' ? a.source.nom.localeCompare(b.source.nom, 'fr') : (b.carte ?? b.source).note - (a.carte ?? a.source).note || a.source.nom.localeCompare(b.source.nom, 'fr')));
  const pages = Math.max(1, Math.ceil(correspond.length / 24));
  const demande = Number(params.get('page') ?? 1);
  const page = Math.min(pages, Math.max(1, Number.isFinite(demande) ? Math.floor(demande) : 1));
  const joueurs = correspond.slice((page - 1) * 24, page * 24).map(({ source, carte: existante }) => {
    const carte: CarteCarriere = existante
      ? { ...existante, ...source, id: existante.id, proprietaire: existante.proprietaire, fatigue: existante.fatigue, matchs: existante.matchs, essais: existante.essais, clubs: existante.clubs }
      : { ...source, id: `catalogue:${source.sourceId}`, proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [] };
    const origine = existante && origines.get(existante.id);
    return { carte, obtenuPar: origine ? origine.club : null, obtention: origine ? origine.nature : existante ? 'inconnue' as const : null, obtenuLe: origine ? origine.date : null };
  });
  return { joueurs, total: correspond.length, page, pages, catalogueTotal: index.length + speciales.length, distribues: etat.cartes.length,
    packes: [...origines.values()].filter(o => o.nature === 'pack').length, speciales: comptes };
}
