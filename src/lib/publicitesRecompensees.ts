import type { PackCarriere } from './ligue/typesCarriere.js';

export type ContextePub = 'SHOP_OVAS' | 'DAILY_PACK';
export interface ConfigPublicites {
  enabled: boolean;
  mode: 'TEST' | 'LIVE';
  apiKey: string;
  ovasEnabled: boolean;
  rewardedAdOvasAmount: number;
  ovasDailyLimit: number;
  packsEnabled: boolean;
  packsDailyLimit: number;
}
// Identifiant public exigé par le SDK navigateur ; le secret S2S reste au serveur.
export const PUBLICITES_PAR_DEFAUT: ConfigPublicites = {
  enabled: true, mode: 'TEST', apiKey: '05e5427c-b82d-48da-be2e-dd43ed3658f9',
  ovasEnabled: true, rewardedAdOvasAmount: 4, ovasDailyLimit: 2,
  packsEnabled: true, packsDailyLimit: 2,
};
/** Répartition initiale ; un poids enregistré dans le Labo remplace ce défaut. */
export const CHANCES_PACKS_PUB_PAR_DEFAUT: Readonly<Record<string, number>> = { bronze: 25, standard: 20, or: 10 };
export const PACK_MYTHIQUE_PUBLICITAIRE: PackCarriere = {id:'pub-mythique',nom:'Mythique',prix:10000,cartes:3,famille:'general',garantie:'star',
  probabilites:{bronze:0,argent:0,or:80,elite:19,star:1},promesse:'Trois cartes, dont une Mythique garantie.'};
export interface ChancePackPub { pack: PackCarriere; chance: number; poids: number }
export interface RecompensePub {
  rewardSessionId: string; contexte: ContextePub; ligue?: string;
  rewardStatus: 'REQUESTED' | 'VERIFIED' | 'RESERVED' | 'CLAIMED' | 'FAILED';
  pack?: PackCarriere; montant: number;
}
export interface VuePublicites {
  config: ConfigPublicites; disponible: boolean; raison?: string; jour: string;
  ovasRestantes: number; packsRestants: number; chances: ChancePackPub[];
  enAttente: RecompensePub[];
}
export interface StatsPublicites {
  requested: number; started: number; completed: number; failed: number; noFill: number;
  ovasRewarded: number; packsEarned: number; joueurs: number;
  distribution: Record<string, number>;
  distributionAttendue?: Record<string, number>;
}
export const STATS_PUB_VIDES = (): StatsPublicites => ({
  requested: 0, started: 0, completed: 0, failed: 0, noFill: 0,
  ovasRewarded: 0, packsEarned: 0, joueurs: 0, distribution: {}, distributionAttendue: {},
});
export function jourPublicites(maintenant: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maintenant);
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
  return ponderes.map(p => ({...p,chance:p.poids / total * 100}));
}
export function choisirPackPub(chances: ChancePackPub[], aleatoire: number): PackCarriere {
  if (!chances.length || !Number.isFinite(aleatoire) || aleatoire < 0 || aleatoire >= 1) throw new Error('Roulette indisponible.');
  let position = aleatoire * chances.reduce((n, p) => n + p.poids, 0);
  for (const c of chances) { position -= c.poids; if (position < 0) return c.pack; }
  return chances[chances.length - 1].pack;
}
