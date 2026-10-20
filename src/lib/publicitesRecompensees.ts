import type { PackCarriere } from './ligue/typesCarriere.js';

/**
 * LES QUATRE USAGES D'UNE PUBLICITÉ RÉCOMPENSÉE (Correctif 42), chacun avec SON plafond quotidien :
 *   SHOP_OVAS          — des Ovas dans la Boutique ;
 *   DAILY_PACK         — un pack tiré à la roulette dans une ligue (deux par jour, que le joueur passe par la carte
 *                        « Pack Pub » ou par la fenêtre « pas assez d'Ovas » : c'est le MÊME compteur) ;
 *   SHOP_PREMIUM_PACK  — un pack Premium de la Collection solo (cinq par jour) ;
 *   COSMETIC           — un pas de plus vers un cosmétique (`article` sur la session).
 */
export type ContextePub = 'SHOP_OVAS' | 'DAILY_PACK' | 'SHOP_PREMIUM_PACK' | 'COSMETIC';
export const CONTEXTES_PUB: readonly ContextePub[] = ['SHOP_OVAS', 'DAILY_PACK', 'SHOP_PREMIUM_PACK', 'COSMETIC'];
/** Ce qu'un cosmétique demande : combien de publicités, et combien peuvent compter par jour. */
export interface ReglageCosmetiquePub { actif: boolean; requis: number; limiteJour: number }
export interface ConfigPublicites {
  enabled: boolean;
  mode: 'TEST' | 'LIVE';
  apiKey: string;
  ovasEnabled: boolean;
  rewardedAdOvasAmount: number;
  ovasDailyLimit: number;
  packsEnabled: boolean;
  packsDailyLimit: number;
  /** En ligue, un pack qu'on ne peut pas payer propose la publicité (même compteur que le Pack Pub). */
  leagueFallbackEnabled: boolean;
  /** Les packs Premium de la Boutique : activation, plafond, et le poids de chaque pack (0 = hors de la roulette). */
  premiumEnabled: boolean;
  premiumDailyLimit: number;
  premiumPacks: Record<string, number>;
  /** Les cosmétiques qui se débloquent en regardant des publicités, par identifiant d'article. */
  cosmeticsEnabled: boolean;
  cosmetiques: Record<string, ReglageCosmetiquePub>;
}
// Identifiant public exigé par le SDK navigateur ; le secret S2S reste au serveur.
export const PUBLICITES_PAR_DEFAUT: ConfigPublicites = {
  enabled: true, mode: 'TEST', apiKey: '05e5427c-b82d-48da-be2e-dd43ed3658f9',
  ovasEnabled: true, rewardedAdOvasAmount: 4, ovasDailyLimit: 2,
  packsEnabled: true, packsDailyLimit: 2,
  leagueFallbackEnabled: true,
  premiumEnabled: true, premiumDailyLimit: 5, premiumPacks: {},
  // Une publicité pour une petite pièce, trois pour une pièce plus recherchée, cinq pour un maillot.
  cosmeticsEnabled: true, cosmetiques: {
    'casque-rose': { actif: true, requis: 1, limiteJour: 1 },
    'crampons-graffiti': { actif: true, requis: 3, limiteJour: 2 },
    'maillot-vannes': { actif: true, requis: 5, limiteJour: 2 },
    'maillot-italie': { actif: true, requis: 5, limiteJour: 2 },
  },
};
/** Les réglages enregistrés dans le Labo, complétés par ceux du jeu : un article réglé dans le Labo garde SES valeurs. */
export function completerConfigPublicites(enregistree: Partial<ConfigPublicites> | undefined): ConfigPublicites {
  return { ...PUBLICITES_PAR_DEFAUT, ...enregistree,
    premiumPacks: { ...(enregistree?.premiumPacks ?? {}) },
    cosmetiques: { ...PUBLICITES_PAR_DEFAUT.cosmetiques, ...(enregistree?.cosmetiques ?? {}) } };
}
/** Les packs trop modestes pour une récompense « Premium », quand le Labo n'a rien réglé. */
export const PACKS_HORS_PREMIUM: ReadonlySet<string> = new Set(['bronze', 'standard']);
/** Répartition initiale ; un poids enregistré dans le Labo remplace ce défaut. */
export const CHANCES_PACKS_PUB_PAR_DEFAUT: Readonly<Record<string, number>> = { bronze: 25, standard: 20, or: 10 };
export const PACK_MYTHIQUE_PUBLICITAIRE: PackCarriere = {id:'pub-mythique',nom:'Mythique',prix:10000,cartes:3,famille:'general',garantie:'star',
  probabilites:{bronze:0,argent:0,or:80,elite:19,star:1},promesse:'Trois cartes, dont une Mythique garantie.'};
export interface ChancePackPub { pack: PackCarriere; chance: number; poids: number }
export interface RecompensePub {
  rewardSessionId: string; contexte: ContextePub; ligue?: string;
  rewardStatus: 'REQUESTED' | 'VERIFIED' | 'RESERVED' | 'CLAIMED' | 'FAILED';
  pack?: PackCarriere; montant: number;
  /** COSMETIC : l'article que cette publicité fait avancer. */
  article?: string;
}
/** Où en est un cosmétique « par publicité » pour ce compte. Le serveur seul fait avancer `progres`. */
export interface ProgresCosmetiquePub {
  progres: number; requis: number;
  /** Publicités qui peuvent encore compter aujourd'hui pour cet article. */
  restantesAujourdhui: number;
  debloque: boolean;
}
export interface VuePublicites {
  config: ConfigPublicites; disponible: boolean; raison?: string; jour: string;
  ovasRestantes: number; packsRestants: number; chances: ChancePackPub[];
  /** Les packs Premium : ce qu'il reste aujourd'hui, et la roulette telle que le serveur la tirera. */
  premiumRestants?: number;
  chancesPremium?: ChancePackPub[];
  cosmetiques?: Record<string, ProgresCosmetiquePub>;
  enAttente: RecompensePub[];
  aVerifier?: RecompensePub[];
}
export interface StatsPublicites {
  requested: number; started: number; completed: number; failed: number; noFill: number;
  ovasRewarded: number; packsEarned: number; joueurs: number;
  distribution: Record<string, number>;
  distributionAttendue?: Record<string, number>;
  /** Callbacks AppLixir refusés pour ce compte (reçu arrivé, mais mal signé, expiré, hors plafond…). */
  callbacksRefuses?: number;
  /**
   * Le détail par usage (Correctif 42), à plat : « LEAGUE.requested », « PREMIUM.completed », « COSMETIC.rewards »…
   * À plat exprès : la somme SQL est alors la même que celle de `distribution`, déjà éprouvée en production.
   */
  contextes?: Record<string, number>;
}
export type FamillePub = 'OVAS' | 'LEAGUE' | 'PREMIUM' | 'COSMETIC';
export const FAMILLES_PUB: readonly FamillePub[] = ['LEAGUE', 'PREMIUM', 'COSMETIC', 'OVAS'];
export function famillePub(contexte: ContextePub): FamillePub {
  return contexte === 'DAILY_PACK' ? 'LEAGUE' : contexte === 'SHOP_PREMIUM_PACK' ? 'PREMIUM' : contexte === 'COSMETIC' ? 'COSMETIC' : 'OVAS';
}
export type CompteurPub = 'requested' | 'started' | 'completed' | 'rewards' | 'ovas' | 'joueurs';
export function compterPub(stats: StatsPublicites, contexte: ContextePub, compteur: CompteurPub, n = 1): void {
  const cle = `${famillePub(contexte)}.${compteur}`;
  stats.contextes ??= {};
  stats.contextes[cle] = (stats.contextes[cle] ?? 0) + n;
}
export const STATS_PUB_VIDES = (): StatsPublicites => ({
  requested: 0, started: 0, completed: 0, failed: 0, noFill: 0,
  ovasRewarded: 0, packsEarned: 0, joueurs: 0, distribution: {}, distributionAttendue: {},
});
export function jourPublicites(maintenant: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maintenant);
}
/** Les pochettes saisonnières de ligue ne reprennent pas le volume de la Collection solo. */
export function packPublicitaireDeLigue(pack: PackCarriere): PackCarriere {
  const famille = pack.evenement?.type ?? (pack.id === 'evenement-halloween-2026' ? 'halloween'
    : pack.id === 'evenement-octobre-rose-2026' ? 'octobre-rose' : undefined);
  if (famille !== 'halloween' && famille !== 'octobre-rose') return pack;
  return { ...pack, cartes: 3, promesse: famille === 'halloween'
    ? 'Trois cartes, dont au moins une Halloween.' : 'Trois cartes, dont au moins une Octobre Rose.' };
}
export function chancesPacksPub(packs: PackCarriere[], maintenant: number): ChancePackPub[] {
  const eligibles = packs.filter(p => p.published !== false && p.rewardedAdsEnabled === true
    && (p.rewardedAdWeight === undefined || (Number.isFinite(p.rewardedAdWeight) && p.rewardedAdWeight > 0))
    && (!p.startsAt || Date.parse(p.startsAt) <= maintenant)
    && (!p.endsAt || maintenant < Date.parse(p.endsAt))
    && (!p.evenement || (p.evenement.actif && (p.evenement.cartes ?? 0) > 0
      && (!p.evenement.du || Date.parse(p.evenement.du) <= maintenant)
      && (!p.evenement.au || maintenant < Date.parse(p.evenement.au)))));
  const automatiques = eligibles.filter(p => p.rewardedAdWeight === undefined && CHANCES_PACKS_PUB_PAR_DEFAUT[p.id]);
  const partAutomatique = automatiques.reduce((n,p) => n + CHANCES_PACKS_PUB_PAR_DEFAUT[p.id],0);
  const poidsOrdinaire = (p: PackCarriere) => p.rewardedAdWeight ?? Math.max(1,Math.round(10000 / Math.max(p.prix,p.garantieSpeciale ? p.cartes * 1000 : 1)));
  const autres = eligibles.filter(p => !automatiques.includes(p)).reduce((n,p) => n + poidsOrdinaire(p),0);
  const ponderes = eligibles.map(pack => ({pack, poids: automatiques.includes(pack)
    ? (autres ? autres / (100 - partAutomatique) : 1) * CHANCES_PACKS_PUB_PAR_DEFAUT[pack.id] : poidsOrdinaire(pack)}));
  const total = ponderes.reduce((n,p) => n + p.poids,0);
  return ponderes.map(p => ({...p,pack:packPublicitaireDeLigue(p.pack),chance:p.poids / total * 100}));
}
/**
 * LA ROULETTE DES PACKS PREMIUM. Le Labo donne un poids à chaque pack (`premiumPacks`, 0 = exclu) ; sans réglage, tous
 * les packs publicitaires au-dessus de Bronze et Argent y entrent, d'autant plus rares qu'ils sont chers. Les fenêtres
 * de publication et d'événement sont celles de la roulette de ligue : un pack fermé n'est jamais tiré.
 */
export function chancesPacksPremium(packs: PackCarriere[], config: Pick<ConfigPublicites, 'premiumPacks'>, maintenant: number): ChancePackPub[] {
  const regles = config.premiumPacks ?? {};
  const explicite = Object.keys(regles).length > 0;
  const ouverts = new Set(chancesPacksPub(packs.map((p) => ({ ...p, rewardedAdsEnabled: true, rewardedAdWeight: 1 })), maintenant).map((c) => c.pack.id));
  const ponderes = packs.filter((p) => ouverts.has(p.id)).map((pack) => ({ pack,
    poids: explicite ? Math.max(0, regles[pack.id] ?? 0)
      : PACKS_HORS_PREMIUM.has(pack.id) ? 0 : Math.max(1, Math.round(10000 / Math.max(1, pack.prix))) })).filter((p) => p.poids > 0);
  const total = ponderes.reduce((n, p) => n + p.poids, 0);
  return ponderes.map((p) => ({ ...p, chance: p.poids / total * 100 }));
}
export function choisirPackPub(chances: ChancePackPub[], aleatoire: number): PackCarriere {
  if (!chances.length || !Number.isFinite(aleatoire) || aleatoire < 0 || aleatoire >= 1) throw new Error('Roulette indisponible.');
  let position = aleatoire * chances.reduce((n, p) => n + p.poids, 0);
  for (const c of chances) { position -= c.poids; if (position < 0) return c.pack; }
  return chances[chances.length - 1].pack;
}

/** Ce que la vue du serveur dit d'un usage : ce qu'il reste aujourd'hui, sur combien, et s'il est ouvert. L'écran n'en déduit rien d'autre. */
export function etatDeLOffre(vue: VuePublicites | null, contexte: ContextePub, article?: string): {
  restantes: number; limite: number; active: boolean; chances: ChancePackPub[]; progres?: ProgresCosmetiquePub;
} {
  if (!vue) return { restantes: 0, limite: 0, active: false, chances: [] };
  const c = vue.config;
  if (contexte === 'SHOP_OVAS') return { restantes: vue.ovasRestantes, limite: c.ovasDailyLimit, active: vue.disponible && c.ovasEnabled, chances: [] };
  if (contexte === 'DAILY_PACK') return { restantes: vue.packsRestants, limite: c.packsDailyLimit, active: vue.disponible && c.packsEnabled && vue.chances.length > 0, chances: vue.chances };
  if (contexte === 'SHOP_PREMIUM_PACK') {
    const chances = vue.chancesPremium ?? [];
    return { restantes: vue.premiumRestants ?? 0, limite: c.premiumDailyLimit ?? 0, active: vue.disponible && c.premiumEnabled === true && chances.length > 0, chances };
  }
  const progres = article ? vue.cosmetiques?.[article] : undefined, reglage = article ? c.cosmetiques?.[article] : undefined;
  return { restantes: progres?.restantesAujourdhui ?? 0, limite: reglage?.limiteJour ?? 0, chances: [], progres,
    active: vue.disponible && c.cosmeticsEnabled === true && reglage?.actif === true && !progres?.debloque };
}
