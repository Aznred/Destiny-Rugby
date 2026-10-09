// LE CATALOGUE DES CARTES SPÉCIALES — la graine, fusionnée avec le Labo
//
// La partie LOURDE du système (voir `cartesSpeciales.ts` pour les règles) :
// elle lit la graine (`data/cartesSpeciales.ts`), la configuration du Labo
// (`CatalogueAdmin.speciales`) et le catalogue mondial pour résoudre le club
// d'un joueur actif. Serveur et écrans de ligue seulement.

import { HALLOWEEN_DEPART, ICONS_DEPART, OCTOBRE_ROSE_DEPART } from '../../data/cartesSpeciales.js';
import { POSTE_PAR_ID } from '../../data/rugby.js';
import type { PosteId } from '../../types.js';
import { catalogueAdmin, type CatalogueAdmin } from './atelierCatalogue.js';
import { catalogueMondialCarriere } from './catalogueCarriere.js';
import { sourceRetireeFfr } from './eligibiliteJoueurs.js';
import {
  assemblerCatalogueSpecial, carteSpecialePubliee, carteSpecialeVisibleCollection, chanceSpecialeParCarte, EVENEMENTS_DEPART, FAMILLES_SPECIALES,
  postesDepuisNumeros, slugSpecial, type CatalogueSpecial, type DefinitionCarteSpeciale, type EvenementSpecial,
} from './cartesSpeciales.js';
import type { CarteCarriere, PackCarriere } from './typesCarriere.js';

export * from './cartesSpeciales.js';

let graineCache: DefinitionCarteSpeciale[] | undefined;
/** Les 100 ICONS et les 23 Halloween de départ, en « image manquante » ; les 23 Octobre Rose, avec leur portrait. */
export function definitionsDepart(): readonly DefinitionCarteSpeciale[] {
  if (graineCache) return graineCache;
  const icon = FAMILLES_SPECIALES.icon, halloween = FAMILLES_SPECIALES.halloween, rose = FAMILLES_SPECIALES['octobre-rose'];
  const commun = { packWeight: 1, published: false, imageReady: false, canBePacked: true, canAppearInCollection: true,
    canAppearOnMarket: true, rarityAnimation: 'mythique' as const };
  graineCache = [
    ...ICONS_DEPART.map(([nom, numeros, nation, overall]): DefinitionCarteSpeciale => ({
      ...commun, id: `icon:${slugSpecial(nom)}`, cardType: 'icon', specialEventId: icon.evenementDefaut, nom,
      ...postesDepuisNumeros(numeros), overall, designId: icon.designId, nation, club: icon.clubDefaut,
      league: icon.ligueDefaut, specialLogo: icon.specialLogo, retraite: true, age: 30, lot: 'ICONS · Pool initial',
    })),
    ...HALLOWEEN_DEPART.map(([nom, numeros, nation, overall, role, base]): DefinitionCarteSpeciale => ({
      ...commun, id: `halloween-2026:${slugSpecial(nom)}`, cardType: 'halloween', specialEventId: halloween.evenementDefaut,
      basePlayerId: base, nom, ...postesDepuisNumeros(numeros), overall, collectif: halloween.collectifDefaut,
      designId: halloween.designId, nation,
      // Un joueur actif garde son club et son championnat (résolus depuis le
      // catalogue) : sa carte Halloween compte normalement pour ses coéquipiers.
      club: base ? '' : halloween.clubDefaut, league: base ? '' : halloween.ligueDefaut,
      specialLogo: halloween.specialLogo, retraite: !base, age: base ? 0 : 30,
      lot: role === 'titulaire' ? 'Équipe Halloween · XV de départ' : 'Équipe Halloween · Banc',
    })),
    ...OCTOBRE_ROSE_DEPART.map(([nom, numeros, nation, overall, role, club, league, age, identiteId]): DefinitionCarteSpeciale => ({
      ...commun, id: `octobre-rose-2026:${slugSpecial(nom)}`, cardType: 'octobre-rose', specialEventId: rose.evenementDefaut,
      gender: 'female', identiteId, nom, ...postesDepuisNumeros(numeros), overall, collectif: rose.collectifDefaut,
      // Le portrait officiel de la Coupe du monde 2025, livré avec le jeu (`scripts/copierPortraitsOctobreRose.ts`) :
      // la carte est « prête », il ne lui manque que la publication dans le Labo.
      image: `/photos/octobre-rose/${slugSpecial(nom)}.webp`, imageReady: true,
      designId: rose.designId, nation, club, league, specialLogo: rose.specialLogo, retraite: false, age,
      lot: role === 'titulaire' ? 'Équipe Octobre Rose · XV de départ' : 'Équipe Octobre Rose · Banc',
    })),
  ];
  return graineCache;
}


const CHAMPS_REQUIS: (keyof DefinitionCarteSpeciale)[] = ['id', 'cardType', 'specialEventId', 'nom', 'poste', 'overall'];
const caches = new WeakMap<object, CatalogueSpecial>();


/**
 * La liste effective : la graine, corrigée par le Labo, plus ce qu'il a ajouté.
 * Calculée une fois par révision du catalogue (même objet, même résultat).
 */
export function catalogueSpecial(config: CatalogueAdmin = catalogueAdmin()): CatalogueSpecial {
  const connu = caches.get(config);
  if (connu) return connu;
  const reglages = config.speciales ?? {};
  const supprimees = new Set(reglages.supprimees ?? []);
  const evenements = new Map<string, EvenementSpecial>();
  for (const ev of EVENEMENTS_DEPART) evenements.set(ev.id, { ...ev, ...(reglages.evenements?.[ev.id] ?? {}), id: ev.id, cardType: ev.cardType });
  for (const [id, ev] of Object.entries(reglages.evenements ?? {})) {
    if (evenements.has(id) || !ev.cardType || !ev.nom) continue;
    evenements.set(id, { actif: false, repere: 'mythique', tauxPacksNormaux: 1, ...ev, id, cardType: ev.cardType, nom: ev.nom } as EvenementSpecial);
  }
  const bruts = new Map<string, Partial<DefinitionCarteSpeciale>>();
  for (const def of definitionsDepart()) bruts.set(def.id, { ...def, ...(reglages.cartes?.[def.id] ?? {}), id: def.id });
  for (const [id, def] of Object.entries(reglages.cartes ?? {})) if (!bruts.has(id)) bruts.set(id, { ...def, id });
  const mondial = new Map(catalogueMondialCarriere(config).map(s => [s.sourceId, s]));
  const definitions: DefinitionCarteSpeciale[] = [];
  for (const brut of bruts.values()) {
    if (supprimees.has(brut.id!) || CHAMPS_REQUIS.some(c => brut[c] === undefined || brut[c] === '')) continue;
    if (!POSTE_PAR_ID[brut.poste as PosteId]) continue;
    if (sourceRetireeFfr(brut.id!) || (brut.basePlayerId && sourceRetireeFfr(brut.basePlayerId)) || (Number(brut.age)>0 && Number(brut.age)<18)) continue;
    const famille = FAMILLES_SPECIALES[brut.cardType!];
    const base = brut.basePlayerId ? mondial.get(brut.basePlayerId) : undefined;
    // A variant must never resurrect an excluded real youth identity.
    if(brut.basePlayerId && !base) continue;
    const def: DefinitionCarteSpeciale = {
      packWeight: 1, published: false, canBePacked: true, canAppearInCollection: true, canAppearOnMarket: true,
      rarityAnimation: 'mythique', retraite: !brut.basePlayerId && !brut.identiteId,
      designId: famille?.designId ?? `special-${brut.cardType}`, specialLogo: famille?.specialLogo ?? 'etoile',
      ...brut,
      nation: brut.nation ?? '',
      club: brut.cardType === 'influencer' ? brut.club ?? '' : brut.club || base?.clubReel || famille?.clubDefaut || 'Légendes',
      league: brut.cardType === 'influencer' ? brut.league || [...mondial.values()].find(s => s.clubReel === brut.club)?.championnat || '' : brut.league || base?.championnat || famille?.ligueDefaut || 'Légendes',
      ...(brut.cardType === 'influencer' ? { retraite: false, rarityAnimation: brut.rarityAnimation ?? 'influenceur' } : {}),
      age: brut.age || base?.age || 30,
      imageReady: Boolean(brut.image),
    } as DefinitionCarteSpeciale;
    definitions.push(def);
  }
  const resultat = assemblerCatalogueSpecial(definitions, [...evenements.values()], id => mondial.get(id));
  caches.set(config, resultat);
  return resultat;
}

/**
 * Ce que le public peut savoir des cartes spéciales : les cartes publiées (ou
 * publiées un jour : leurs exemplaires existent), avec image, et les
 * événements. Servi avec le catalogue de la Collection solo.
 */
export interface SpecialesPubliques { definitions: DefinitionCarteSpeciale[]; evenements: EvenementSpecial[] }
export function specialesPubliques(config: CatalogueAdmin = catalogueAdmin(), maintenant = Date.now(), possedees: ReadonlySet<string> = new Set()): SpecialesPubliques {
  const cat = catalogueSpecial(config);
  return {
    definitions: cat.definitions.filter(d => d.cardType === 'influencer'
      ? carteSpecialeVisibleCollection(d, cat, maintenant) || (possedees.has(d.id) && d.imageReady && Boolean(d.published || d.publieeLe))
      // Les cartes spéciales féminines (Octobre Rose) y sont aussi : elles se tirent dans tous les packs.
      : d.imageReady && !d.brouillon && (d.published || Boolean(d.publieeLe))),
    evenements: cat.evenements.map(ev => structuredClone(ev)),
  };
}


/** Une carte spéciale peut-elle être mise ou rester en vente ? Une carte ordinaire, toujours. */
export function carteSurMarcheAutorisee(carte: Pick<CarteCarriere, 'sourceId' | 'speciale'>, ligueAutorise: boolean, config: CatalogueAdmin = catalogueAdmin()): boolean {
  if (!carte.speciale) return true;
  if (!ligueAutorise) return false;
  const cat = catalogueSpecial(config);
  const def = cat.parId.get(carte.sourceId);
  // Une définition retirée du Labo n'enferme pas les exemplaires déjà distribués.
  if (!def) return carte.speciale.market_allowed !== false;
  return carteSpecialePubliee(def, cat) && def.canAppearOnMarket && def.market_allowed !== false;
}

/** L'autorisation est relue lors de la proposition et de son acceptation. */
export function carteEchangeAutorise(carte: Pick<CarteCarriere, 'sourceId' | 'speciale'>, ligueAutorise: boolean, config: CatalogueAdmin = catalogueAdmin()): boolean {
  if (!carte.speciale) return true;
  if (!ligueAutorise) return false;
  const def = catalogueSpecial(config).parId.get(carte.sourceId);
  return def ? def.trade_allowed !== false : carte.speciale.trade_allowed !== false;
}


/** Les packs d'événement tels qu'une ligue doit les recopier (`completerPacks`). */
export function packsEvenements(config: CatalogueAdmin = catalogueAdmin()): PackCarriere[] {
  const cat = catalogueSpecial(config);
  return cat.evenements.filter(ev => ev.pack).map(ev => ({
    ...structuredClone(ev.pack!),
    evenement: { id: ev.id, type: ev.cardType, actif: ev.actif, ...(ev.availableFrom ? { du: ev.availableFrom } : {}), ...(ev.availableUntil ? { au: ev.availableUntil } : {}),
      // ⚠️ TANT QU'AUCUNE CARTE N'EST PUBLIÉE, LE PACK N'EXISTE PAS EN BOUTIQUE :
      // il promettrait une carte que personne ne peut encore recevoir.
      cartes: cat.definitions.filter(d => d.specialEventId === ev.id && d.canBePacked && carteSpecialePubliee(d, cat)).length },
  }));
}


/**
 * Ce qu'une ligue montre des cartes spéciales : les événements allumés et, pour
 * chaque pack, la chance par carte. ⚠️ LES PROBABILITÉS S'AFFICHENT : un tirage
 * qu'on paie en Ovas ne cache pas ce qu'il peut donner. Les dates sont rendues
 * telles quelles ; l'écran les compare à son horloge.
 */
export interface ResumeSpeciauxLigue {
  evenements: { id: string; type: string; nom: string; du?: string; au?: string; cartes: number }[];
  chances: Record<string, Record<string, number>>;
}
export function resumeSpeciauxLigue(packs: readonly PackCarriere[], config: CatalogueAdmin = catalogueAdmin()): ResumeSpeciauxLigue {
  const cat = catalogueSpecial(config);
  const actifs = cat.evenements.filter(ev => ev.actif).map(ev => ({ ev,
    cartes: cat.definitions.filter(d => d.specialEventId === ev.id && d.canBePacked && carteSpecialePubliee(d, cat)).length }));
  const ouverts = actifs.filter(a => a.cartes > 0);
  return {
    evenements: actifs.map(({ ev, cartes }) => ({ id: ev.id, type: ev.cardType, nom: ev.nom, cartes,
      ...(ev.availableFrom ? { du: ev.availableFrom } : {}), ...(ev.availableUntil ? { au: ev.availableUntil } : {}) })),
    chances: Object.fromEntries(packs.map(p => [p.id, Object.fromEntries(ouverts
      .filter(({ ev }) => cat.definitions.some(d => d.specialEventId === ev.id && d.packWeight > 0 && (!d.allowedPackIds || d.allowedPackIds.includes(p.id)) && d.canBePacked && carteSpecialePubliee(d, cat)))
      .map(({ ev }) => [ev.id, Math.round(chanceSpecialeParCarte(p, ev) * 1000) / 1000] as const).filter(([, c]) => c > 0))])),
  };
}

