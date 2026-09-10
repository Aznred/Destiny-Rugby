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
  const possedees = new Map(etat.cartes.map(c => [c.sourceId, c]));
  const origines = new Map<string, { club: string; nature: 'pack' | 'dotation'; date: string }>();
  // Les transactions sont append-only. La première attribution reste l'origine après un transfert.
  for (const transaction of etat.transactions) {
    if (transaction.nature !== 'pack' && transaction.nature !== 'dotation') continue;
    for (const carteId of transaction.cartes) if (!origines.has(carteId)) origines.set(carteId, { club: transaction.clubId, nature: transaction.nature, date: transaction.date });
  }
  const recherche = normaliser((params.get('q') ?? '').slice(0, 100));
  const rarete = params.get('rarete') ?? '', poste = params.get('poste') ?? '', statut = params.get('statut') ?? '';
  const club = params.get('club') ?? '';
  const correspond = index.filter(({ source, recherche: texte }) => {
    const carte = possedees.get(source.sourceId);
    if (recherche && !texte.includes(recherche)) return false;
    if (rarete && (carte ?? source).rarete !== rarete) return false;
    if (poste && (carte ?? source).famille !== poste) return false;
    if (club && carte?.proprietaire !== club) return false;
    if (statut === 'libre' && carte) return false;
    if (statut === 'distribue' && !carte) return false;
    if (statut === 'moi' && carte?.proprietaire !== monClub.id) return false;
    if (statut === 'pack' && (!carte || origines.get(carte.id)?.nature !== 'pack')) return false;
    return true;
  });
  const tri = params.get('tri');
  correspond.sort((a, b) => tri === 'nom' ? a.source.nom.localeCompare(b.source.nom, 'fr') : (possedees.get(b.source.sourceId) ?? b.source).note - (possedees.get(a.source.sourceId) ?? a.source).note || a.source.nom.localeCompare(b.source.nom, 'fr'));
  const pages = Math.max(1, Math.ceil(correspond.length / 24));
  const demande = Number(params.get('page') ?? 1);
  const page = Math.min(pages, Math.max(1, Number.isFinite(demande) ? Math.floor(demande) : 1));
  const joueurs = correspond.slice((page - 1) * 24, page * 24).map(({ source }) => {
    const existante = possedees.get(source.sourceId);
    const carte: CarteCarriere = existante
      ? { ...existante, ...source, id: existante.id, proprietaire: existante.proprietaire, fatigue: existante.fatigue, matchs: existante.matchs, essais: existante.essais, clubs: existante.clubs }
      : { ...source, id: `catalogue:${source.sourceId}`, proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [] };
    const origine = existante && origines.get(existante.id);
    return { carte, obtenuPar: origine ? origine.club : null, obtention: origine ? origine.nature : existante ? 'inconnue' as const : null, obtenuLe: origine ? origine.date : null };
  });
  return { joueurs, total: correspond.length, page, pages, catalogueTotal: index.length, distribues: possedees.size, packes: [...origines.values()].filter(o => o.nature === 'pack').length };
}
