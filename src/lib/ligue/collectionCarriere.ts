import { catalogueMondialCarriere } from './catalogueCarriere.js';
import type { CarteCarriere, EtatCarriereEnLigne, PageCollection } from './typesCarriere.js';

const normaliser = (texte: string) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
let dernierCatalogue: ReturnType<typeof catalogueMondialCarriere> | undefined;
let index: { source: ReturnType<typeof catalogueMondialCarriere>[number]; recherche: string }[] | undefined;

/** Une page à la demande, au lieu d'envoyer 67 000 joueurs à chaque sondage de ligue. */
export function collectionCarriere(etat: EtatCarriereEnLigne, compteId: string, params: URLSearchParams): PageCollection {
  const monClub = etat.clubs.find(c => c.compteId === compteId);
  if (!monClub) throw new Error('Membre requis');
  if (dernierCatalogue !== catalogueMondialCarriere()) { dernierCatalogue = catalogueMondialCarriere(); index = undefined; }
  index ??= catalogueMondialCarriere().map(source => ({ source, recherche: normaliser(`${source.nom} ${source.clubReel} ${source.nation} ${source.championnat}`) }));
  const possedees = new Map<string, CarteCarriere[]>();
  for (const carte of etat.cartes) {
    const exemplaires = possedees.get(carte.sourceId) ?? [];
    exemplaires.push(carte);
    possedees.set(carte.sourceId, exemplaires);
  }
  const origines = new Map<string, { club: string; nature: 'pack' | 'dotation'; date: string }>();
  // Les transactions sont append-only. La première attribution reste l'origine après un transfert.
  for (const transaction of etat.transactions) {
    if (transaction.nature !== 'pack' && transaction.nature !== 'dotation') continue;
    for (const carteId of transaction.cartes) if (!origines.has(carteId)) origines.set(carteId, { club: transaction.clubId, nature: transaction.nature, date: transaction.date });
  }
  const recherche = normaliser((params.get('q') ?? '').slice(0, 100));
  const rarete = params.get('rarete') ?? '', poste = params.get('poste') ?? '', statut = params.get('statut') ?? '';
  const club = params.get('club') ?? '';
  const correspond: { source: (typeof index)[number]['source']; carte?: CarteCarriere }[] = [];
  for (const { source, recherche: texte } of index) {
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
  correspond.sort((a, b) => tri === 'nom' ? a.source.nom.localeCompare(b.source.nom, 'fr') : (b.carte ?? b.source).note - (a.carte ?? a.source).note || a.source.nom.localeCompare(b.source.nom, 'fr'));
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
  return { joueurs, total: correspond.length, page, pages, catalogueTotal: index.length, distribues: etat.cartes.length, packes: [...origines.values()].filter(o => o.nature === 'pack').length };
}
