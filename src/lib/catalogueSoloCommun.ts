import { appliquerLocalisations, type LocalisationClub, type RivaliteHistorique } from './localisationClub';
import { useEffect, useState } from 'react';
import { catalogueBaseCarriere, catalogueMondialCarriere } from './ligue/catalogueCarriere';
import type { SourceCarte } from './ligue/catalogueCarriere';
import type { EditionJoueur } from './ligue/atelierCatalogue';
import type { AjoutJoueur } from './ligue/importsJoueurs';
import { assemblerCatalogueSpecial, type CatalogueSpecial, type DefinitionCarteSpeciale, type EvenementSpecial } from './ligue/cartesSpeciales';
import { fournirCatalogueEffectifs } from './catalogueEffectifs';
import { enregistrerArticlesLabo, type ArticleEquipement } from '../data/boutique';
import { stockageSerre } from './persistanceNavigation';
import { jsonEtroit } from './sauvegardes';
import { carteSeniorAutorisee, fournirPoolFfr } from './ligue/eligibiliteJoueurs';
import { definirPortraitsDeCartes } from './avatars';

let revision = -1;
let revisionFfr = '';
let courant: readonly SourceCarte[] = catalogueBaseCarriere();
/**
 * Les cartes spéciales publiées (ICONS, Halloween…) et leurs événements, tels
 * que le serveur les sert. `null` tant qu'il n'a pas répondu, ou hors ligne :
 * la collection reste alors celle des joueurs ordinaires.
 */
let speciales: CatalogueSpecial | null = null;
let attente: Promise<readonly SourceCarte[]> | null = null;
let dernierChargement = 0;
const FRAICHEUR_CATALOGUE = 60_000;

export const catalogueSpecialSolo = (): CatalogueSpecial | null => speciales;

/**
 * Le même catalogue de base que la ligue, complété par ses éditions en ligne,
 * puis par les cartes spéciales publiées.
 *
 * ⚠️ LES CARTES SPÉCIALES VONT EN FIN DE LISTE. Une collection solo est
 * indexée par l'empreinte du joueur, mais les packs tirent par INDICE dans ce
 * tableau : ajoutées en tête, elles décaleraient tous les joueurs ordinaires.
 * Et elles n'entrent jamais dans les bandes de rareté (`rayonsDuPack`).
 */
interface ReponseCatalogue {
  revisionFfr?: string; ffr?: SourceCarte[];
  revision?: number; joueurs?: Record<string, EditionJoueur>; ajouts?: Record<string, AjoutJoueur>;
  clubs?: Record<string, LocalisationClub>; rivalitesHistoriques?: RivaliteHistorique[];
  speciales?: { definitions?: DefinitionCarteSpeciale[]; evenements?: EvenementSpecial[] }; boutique?: Partial<ArticleEquipement>[];
}

/** Une réponse COMPLÈTE du serveur devient le catalogue courant. Rend faux si elle ne porte que sa révision. */
function appliquerReponse(donnees: ReponseCatalogue): boolean {
  if (!Number.isInteger(donnees.revision) || !donnees.joueurs || typeof donnees.joueurs !== 'object') return false;
  revision = donnees.revision!;
  revisionFfr = donnees.revisionFfr ?? '';
  const sourcesFfr = (donnees.ffr ?? []).filter(c => carteSeniorAutorisee(c));
  fournirPoolFfr(() => ({pool:'men',joueurs:sourcesFfr}));
  appliquerLocalisations(donnees.clubs ?? {}, donnees.rivalitesHistoriques ?? []);
  const mondial = catalogueMondialCarriere({ revision, joueurs: donnees.joueurs, ajouts: donnees.ajouts, packs: {}, rotationPacks: false });
  fournirCatalogueEffectifs(mondial);
  const definitions = Array.isArray(donnees.speciales?.definitions) ? donnees.speciales!.definitions : [];
  const evenements = Array.isArray(donnees.speciales?.evenements) ? donnees.speciales!.evenements : [];
  const parId = new Map(mondial.map(s => [s.sourceId, s]));
  speciales = assemblerCatalogueSpecial(definitions, evenements, id => parId.get(id));
  courant = speciales.definitions.length ? [...mondial, ...speciales.definitions.map(d => speciales!.sources.get(d.id)!)] : mondial;
  // Un créateur qui a aussi sa place dans un effectif y porte le visage de sa carte publiée (identité réelle renseignée).
  const portraits = new Map<string, string>();
  for (const d of speciales.definitions) {
    if (d.cardType !== 'influencer' || !d.image) continue;
    for (const nom of [d.real_name, d.first_name && d.last_name ? `${d.first_name} ${d.last_name}` : undefined]) if (nom?.trim()) portraits.set(nom, d.image);
  }
  definirPortraitsDeCartes(portraits);
  // Les cosmétiques du Labo arrivent avec le catalogue : un seul aller-retour, relu au plus une fois par minute.
  if (Array.isArray(donnees.boutique)) { enregistrerArticlesLabo(donnees.boutique); if (typeof window !== 'undefined') window.dispatchEvent(new Event('destiny-boutique-labo')); }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('destiny-catalogue-solo-actualise'));
  return true;
}

/**
 * ⚠️ LE CATALOGUE SE GARDE D'UNE VISITE À L'AUTRE (Correctif 25, point 47). Il était versionné — le serveur ne répond que
 * sa révision quand l'écran tient la bonne — mais la révision tenue repartait de −1 à chaque chargement de page : la
 * première requête de chaque visite retéléchargeait les éditions, les ajouts, les cartes spéciales et la boutique.
 * La dernière réponse complète est donc rangée ici avec sa révision ; à la visite suivante on l'applique d'abord, puis on
 * demande au serveur « rien de neuf depuis la révision N ? » — vingt octets si rien n'a changé.
 * Au-delà d'un mégaoctet et demi on ne range rien (le stockage du navigateur en offre cinq, partagés avec la sauvegarde).
 */
const CLE_CATALOGUE = 'destiny-rugby:catalogue-solo';
const TAILLE_MAXIMALE = 1_500_000;
let memoireLue = false;
function relireLaMemoire(): void {
  if (memoireLue) return;
  memoireLue = true;
  if (revision !== -1 || typeof localStorage === 'undefined') return;
  try {
    const brut = localStorage.getItem(CLE_CATALOGUE);
    if (brut) appliquerReponse(JSON.parse(brut) as ReponseCatalogue);
  } catch { /* stockage refusé ou contenu abîmé : on redemandera tout */ }
}
function ranger(donnees: ReponseCatalogue): void {
  // ⚠️ LA SAUVEGARDE PASSE AVANT CE CACHE : sur un appareil où la place a déjà manqué, il ne se range plus.
  if (typeof localStorage === 'undefined' || stockageSerre()) return;
  try {
    const brut = jsonEtroit(JSON.stringify(donnees));
    if (brut.length <= TAILLE_MAXIMALE) localStorage.setItem(CLE_CATALOGUE, brut); else localStorage.removeItem(CLE_CATALOGUE);
  } catch { /* quota atteint : le catalogue se retéléchargera, rien de plus */ }
}

export function synchroniserCatalogueSolo(): Promise<readonly SourceCarte[]> {
  if (attente) return attente;
  if (Date.now() - dernierChargement < FRAICHEUR_CATALOGUE) return Promise.resolve(courant);
  relireLaMemoire();
  attente = fetch(`/api/carriere?catalogueSolo=1&revision=${revision}&revisionFfr=${encodeURIComponent(revisionFfr)}`, { cache: 'no-store' })
    .then(async reponse => {
      if (!reponse.ok) throw new Error('Catalogue indisponible');
      const donnees = await reponse.json() as ReponseCatalogue;
      dernierChargement = Date.now();
      if (appliquerReponse(donnees)) ranger(donnees);
      return courant;
    })
    .catch(() => courant)
    .finally(() => { attente = null; });
  return attente;
}

export function useCatalogueSolo(): readonly SourceCarte[] {
  const [catalogue, setCatalogue] = useState(courant);
  useEffect(() => {
    let actif = true;
    const afficher = () => { if (actif) setCatalogue(courant); };
    const actualiser = () => { if (!document.hidden) void synchroniserCatalogueSolo().then(afficher); };
    const surVisibilite = () => { if (!document.hidden) actualiser(); };
    const surCompte = () => { revision = -1; dernierChargement = 0; actualiser(); };
    actualiser();
    window.addEventListener('destiny-catalogue-solo-actualise', afficher);
    window.addEventListener('focus', actualiser);
    window.addEventListener('destiny-compte-connecte', surCompte);
    window.addEventListener('destiny-compte-deconnecte', surCompte);
    document.addEventListener('visibilitychange', surVisibilite);
    const intervalle = window.setInterval(actualiser, FRAICHEUR_CATALOGUE);
    return () => {
      actif = false;
      window.clearInterval(intervalle);
      window.removeEventListener('destiny-catalogue-solo-actualise', afficher);
      window.removeEventListener('focus', actualiser);
      window.removeEventListener('destiny-compte-connecte', surCompte);
      window.removeEventListener('destiny-compte-deconnecte', surCompte);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, []);
  return catalogue;
}
