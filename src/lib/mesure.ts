/**
 * ════════════════════════════════════════════════════════════════════════════
 *  LA MESURE D'AUDIENCE — un écran du jeu vaut une page pour l'analyse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ DESTINY RUGBY N'A QU'UNE SEULE URL. `setEcran` change un champ du store,
 * l'adresse ne bouge jamais (c'est écrit dans CLAUDE.md, section « DES PAGES DE
 * CONTENU » : c'est la raison d'être des quatre pages statiques générées). Pour
 * Google Analytics, toute une session — accueil, création, carrière, match,
 * classement, boutique — est donc UNE page vue, et il devient impossible de
 * savoir où les joueurs décrochent.
 *
 * ⚠️ ET UN ROUTEUR NE RÉGLERAIT PAS ÇA POUR CE QU'IL COÛTE. Les écrans sont des
 * vues d'un état Zustand persisté, pas des documents indépendants : leur donner
 * de vraies adresses obligerait à gérer le bouton « retour » du navigateur en
 * pleine partie et à synchroniser l'URL avec l'état de la carrière, pour un
 * gain nul côté joueur. Un « virtual pageview » donne le même entonnoir à
 * l'analyse sans toucher à l'architecture du jeu.
 *
 * ⚠️ CE FICHIER NE CONNAÎT NI GOOGLE TAG MANAGER, NI GOOGLE ANALYTICS. Il pousse
 * un évènement dans `dataLayer`, et c'est tout : ce qui l'écoute se décide dans
 * l'interface de GTM, pas ici. C'est le même contrat que `index.html` — le
 * conteneur charge ce qu'on lui dit de charger, le jeu ne code en dur aucun
 * fournisseur de mesure.
 *
 * ⚠️ ET IL NE PEUT PAS CASSER LE JEU. `dataLayer` n'existe pas si GTM est
 * bloqué (bloqueur de publicité, réseau coupé, rendu hors navigateur dans un
 * script de vérification) : chaque fonction sort en silence. Aucun écran ne
 * doit dépendre de la présence d'un mouchard.
 */

// La forme minimale de ce que GTM installe sur `window`. On ne type pas
// l'objet complet : on n'en utilise qu'une méthode, et la déclarer en entier
// reviendrait à recopier une bibliothèque qu'on ne charge pas.
type Poussee = Record<string, unknown>;

function dataLayer(): Poussee[] | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { dataLayer?: unknown };
  return Array.isArray(w.dataLayer) ? (w.dataLayer as Poussee[]) : null;
}

/**
 * Le chemin virtuel d'un écran, sous la forme d'une URL.
 *
 * ⚠️ ON PRÉFIXE PAR `/jeu/`, et ce n'est pas décoratif : sans lui, l'écran
 * « guide » entrerait en collision avec la VRAIE page `/guide/` générée par
 * `scripts/genPages.cjs`, et les deux se cumuleraient dans le même rapport. Le
 * préfixe sépare ce qui est une page servie par le serveur de ce qui est une
 * vue de l'application.
 */
export function cheminDEcran(ecran: string): string {
  return `/jeu/${ecran}`;
}

// L'écran déjà annoncé. Sans cette mémoire, un rendu de React qui repasse par
// le même écran (changement de langue, réhydratation, StrictMode qui monte
// deux fois en développement) compterait deux pages vues.
let dernier: string | null = null;

/**
 * Annonce un changement d'écran.
 *
 * Appelée depuis `App.tsx`, sur un `useEffect` qui suit `ecran` : c'est le seul
 * endroit qui voit TOUS les changements d'écran. Les patcher un par un aurait
 * raté les six écritures directes de `ecran:` dans le store (création de
 * carrière, retraite, ouverture de L'Ovale sur les messages…) — exactement le
 * défaut déjà payé une fois par le guide de carrière, dont les étapes restaient
 * décochées parce que `ecransVus` n'était alimenté que par `setEcran`.
 */
export function pageVue(ecran: string): void {
  if (ecran === dernier) return;
  dernier = ecran;
  const dl = dataLayer();
  if (!dl) return;
  dl.push({
    event: 'virtual_pageview',
    page_path: cheminDEcran(ecran),
    page_title: `Destiny Rugby · ${ecran}`,
    // L'adresse réelle reste utile : c'est elle qui distingue une session
    // ouverte sur destiny-rugby.fr d'une préproduction ou d'un localhost.
    page_location: typeof location === 'undefined' ? '' : location.href,
  });
}

/**
 * Un évènement de jeu, pour l'entonnoir.
 *
 * ⚠️ ON N'ENVOIE QUE DES FAITS DE PARCOURS, JAMAIS DE DONNÉES DE JOUEUR. Le nom
 * du personnage, le club, le pseudo 𝕏 n'ont rien à faire chez un tiers : ils ne
 * répondent à aucune question qu'on se pose sur l'audience, et le jeu ne
 * demande aucun consentement pour les partager.
 */
export function evenementMesure(nom: string, details?: Poussee): void {
  const dl = dataLayer();
  if (!dl) return;
  dl.push({ event: nom, ...details });
}
