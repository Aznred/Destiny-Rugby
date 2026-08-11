// LA PUBLICITÉ — et surtout : LÀ OÙ ELLE N'A PAS LE DROIT D'ÊTRE
//
// Demande explicite : « mets la possibilité d'avoir des pubs sur le site ou
// qu'on puisse visionner une pub pour avoir un bonus ou un cosmétique ; fais
// que les pubs ne soient pas chiantes et ne nuisent pas au jeu ».
//
// ⚠️ CE FICHIER EST D'ABORD UNE LISTE D'INTERDITS. Une régie publicitaire fera
// tout ce qu'on la laisse faire : interstitiel plein écran, vidéo qui démarre
// avec le son, bannière collante qui suit le défilement, pop-up au bout de
// trente secondes. Les règles ci-dessous ne sont pas des préférences, ce sont
// les conditions pour que la pub reste supportable :
//
//   1. AUCUNE PUB PENDANT LE JEU. Ni sur l'écran de Carrière, ni pendant un
//      match, ni sur 𝕏 L'Ovale (une pub sur un faux réseau social, on ne sait
//      plus ce qui est du jeu et ce qui est une régie). Seuls les écrans où
//      l'on FLÂNE en portent : Boutique, Hall, Classement, Clubs.
//   2. JAMAIS D'INTERSTITIEL, jamais de pop-up, jamais de vidéo lancée toute
//      seule. Une pub ne s'ouvre que si le joueur a cliqué dessus.
//   3. JAMAIS DE POSITION FIXE. Le bloc vit DANS le flux de la page : il ne
//      recouvre rien, ne suit pas le défilement, et on peut l'ignorer.
//   4. UNE SEULE PAR ÉCRAN, en bas, après le contenu.
//   5. LA PUB RÉCOMPENSÉE EST TOUJOURS FACULTATIVE. Rien dans le jeu ne se
//      débloque UNIQUEMENT par la pub — elle avance, elle ne conditionne pas.
//   6. ELLE NE TOUCHE PAS À LA DIFFICULTÉ. Elle rapporte des Ovas, et les Ovas
//      n'achètent que du cosmétique. Aucun attribut, aucune forme, aucun moral
//      ne s'achète — sinon `scripts/verifDifficulte.ts` ne veut plus rien dire.
//   7. RIEN NE SE CHARGE SANS CONSENTEMENT. Tant que le joueur n'a pas dit oui,
//      aucun script de régie n'est injecté et aucun emplacement n'est rendu.
//
// ⚠️ CÔTÉ RÉGIE, RIEN N'EST CÂBLÉ ICI, ET C'EST VOLONTAIRE. Ouvrir un compte
// AdSense (ou Ad Manager pour la vidéo récompensée) demande un site en ligne,
// une validation et un identifiant. Le jour où il existe, il suffit de le poser
// dans `VITE_PUB_CLIENT` : `chargerRegie()` injecte le script, `<Pub>` affiche
// le vrai bloc, et la pub récompensée passe par le SDK. Sans identifiant, le
// jeu tourne exactement comme aujourd'hui — bannières masquées, et la pub
// récompensée jouée « à la maison » (un encart du jeu, avec son compte à
// rebours) pour que la mécanique soit jouable et testable dès maintenant.

import { t } from './i18n';

/**
 * L'IDENTIFIANT ADSENSE DU SITE.
 *
 * ⚠️ IL EST EN DUR, ET C'EST ASSUMÉ — exactement comme la clé Groq : un
 * identifiant `ca-pub-…` est de toute façon PUBLIC (Google l'exige dans le
 * `<script>` de chaque page qui affiche ses annonces, et il figure dans le
 * fichier `ads.txt` de tout site monétisé). Le mettre ici plutôt que dans un
 * `.env` évite qu'un déploiement oublie la variable et parte sans monétisation,
 * sans rien exposer de plus. La variable d'environnement reste prioritaire pour
 * pointer un autre compte (préproduction, test).
 *
 * Fourni par l'utilisateur avec le script officiel de sa console AdSense.
 */
const CLIENT_PAR_DEFAUT = 'ca-pub-6166322317354663';

/** Identifiant de la régie (AdSense : `ca-pub-…`). Vide = aucune bannière. */
export const CLIENT_PUB: string =
  (import.meta.env?.VITE_PUB_CLIENT as string | undefined)?.trim() || CLIENT_PAR_DEFAUT;
/**
 * Emplacement AdSense pour la bannière de bas de page.
 *
 * ⚠️ PAS DE VALEUR PAR DÉFAUT, ET C'EST VOULU. Un « slot » se crée bloc par bloc
 * dans la console AdSense : personne ne peut le deviner, et un `data-ad-slot`
 * inventé fait rendre un cadre vide. Tant qu'il est absent, `<Pub>` ne rend
 * RIEN — la bannière n'existe pas. La pub RÉCOMPENSÉE de la boutique, elle, n'a
 * pas besoin de slot : elle ne dépend que de `CLIENT_PUB`.
 */
export const SLOT_PUB: string = (import.meta.env?.VITE_PUB_SLOT as string | undefined)?.trim() ?? '';

/** Les écrans qui ont le droit d'afficher une bannière. La liste est courte. */
export const ECRANS_AVEC_PUB = ['boutique', 'pantheon', 'classement', 'championnats'] as const;

// ---------------------------------------------------------------------------
// LA PUB RÉCOMPENSÉE
// ---------------------------------------------------------------------------

/**
 * ⚠️ RÉGLAGE VOLONTAIREMENT MODESTE. L'économie d'Ovas est dure par choix
 * (départ à 0, une action rapporte 1, une saison 3) : une pub à 50 Ovas
 * viderait la boutique en une soirée et rendrait le reste du jeu inutile.
 *
 * ⚠️ RABAISSÉ AVEC LE RESTE DE L'ÉCONOMIE (8 × 3/jour → 4 × 2/jour). Une belle
 * carrière rapporte désormais ~500 Ovas ; à 24 Ovas par jour, la pub versait
 * une carrière entière en trois semaines de robinet, sans jouer une minute.
 * À 8 Ovas par jour, il faut une semaine et demie pour une paire de crampons —
 * c'est un coup de pouce, pas un raccourci.
 */
export const OVAS_PAR_PUB = 4;
export const PUBS_PAR_JOUR = 2;

/**
 * LE LIEN DIRECT MONETAG — c'est LUI qui s'ouvre quand on clique « Regarder ».
 *
 * ⚠️ CE N'EST PAS UN SDK DE VIDÉO RÉCOMPENSÉE, ET IL FAUT LE SAVOIR. Un « direct
 * link » Monetag est une simple URL qui ouvre une page d'annonces dans un
 * nouvel onglet. Il n'y a **aucun rappel** du réseau pour confirmer que le
 * joueur a réellement regardé quoi que ce soit : la récompense est versée au
 * bout du compte à rebours du jeu, qu'il ait lu l'annonce ou refermé l'onglet
 * aussitôt. C'est une limite du format, pas un oubli — un vrai « rewarded »
 * demande AdMob / Ad Manager et son SDK, qui prendrait alors la place de tout
 * ce mécanisme.
 *
 * ⚠️ ET IL S'OUVRE SUR UN CLIC, JAMAIS AUTREMENT. `window.open()` appelé hors
 * d'un geste de l'utilisateur est bloqué par tous les navigateurs — et une
 * pop-up qui s'ouvre toute seule est exactement ce que la règle 2 ci-dessus
 * interdit. Si le bloqueur la refuse quand même, la modale propose le lien à
 * cliquer à la main plutôt que de laisser le joueur devant un compte à rebours
 * sans rien.
 *
 * Fourni par l'utilisateur depuis son tableau de bord Monetag.
 */
export const LIEN_PUB_RECOMPENSEE = 'https://omg10.com/4/11553440';

/**
 * Ouvre l'annonce dans un nouvel onglet. Renvoie `false` si le navigateur l'a
 * bloquée — l'appelant affiche alors le lien en clair.
 *
 * ⚠️ `noopener,noreferrer` n'est pas décoratif : sans `noopener`, la page
 * ouverte garde une référence `window.opener` vers le jeu et peut le faire
 * naviguer ailleurs (tabnabbing). On parle ici d'une page de régie tierce.
 */
export function ouvrirAnnonce(): boolean {
  if (typeof window === 'undefined') return false;
  const onglet = window.open(LIEN_PUB_RECOMPENSEE, '_blank', 'noopener,noreferrer');
  return Boolean(onglet);
}
/** Entre deux pubs : on ne veut pas d'un joueur qui enchaîne dix vidéos. */
export const ATTENTE_ENTRE_PUBS_MS = 15 * 60_000;
/** Durée de l'encart « maison », quand aucune régie n'est configurée. */
export const DUREE_PUB_MAISON_S = 15;

export interface EtatPubs {
  /** Jour civil du dernier décompte (`AAAA-MM-JJ`), pour remettre à zéro. */
  jour: string;
  /** Pubs déjà regardées aujourd'hui. */
  vues: number;
  /** Horodatage de la dernière pub terminée. */
  derniere: number;
}

export const ETAT_PUBS_VIDE: EtatPubs = { jour: '', vues: 0, derniere: 0 };

export function jourCourant(maintenant = Date.now()): string {
  return new Date(maintenant).toISOString().slice(0, 10);
}

/** Remet le compteur à zéro quand on a changé de jour. */
export function etatDuJour(etat: EtatPubs, maintenant = Date.now()): EtatPubs {
  const jour = jourCourant(maintenant);
  return etat.jour === jour ? etat : { jour, vues: 0, derniere: 0 };
}

export interface DisponibilitePub {
  possible: boolean;
  /** Ce qu'il reste aujourd'hui. */
  restantes: number;
  /** Millisecondes avant la prochaine, si on vient d'en regarder une. */
  attente: number;
}

export function pubDisponible(etat: EtatPubs, maintenant = Date.now()): DisponibilitePub {
  const jour = etatDuJour(etat, maintenant);
  const restantes = Math.max(0, PUBS_PAR_JOUR - jour.vues);
  const attente = Math.max(0, jour.derniere + ATTENTE_ENTRE_PUBS_MS - maintenant);
  return { possible: restantes > 0 && attente === 0, restantes, attente };
}

/** « 12 min », « 40 s » — le temps qu'il reste avant la prochaine pub. */
export function attenteLisible(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  return minutes > 1 ? t('pub.attenteMinutes', { n: String(minutes) }) : t('pub.attenteBientot');
}

// ---------------------------------------------------------------------------
// LA RÉGIE — injectée UNE fois, et seulement avec le consentement
// ---------------------------------------------------------------------------

let regieChargee: Promise<boolean> | null = null;

/**
 * Injecte le script de la régie. Résout `false` si aucun identifiant n'est
 * configuré ou si le script ne se charge pas (bloqueur de pub, réseau) — et
 * dans ce cas le jeu n'affiche simplement aucune bannière. Un bloqueur de pub
 * ne doit JAMAIS casser un écran.
 */
export function chargerRegie(consenti: boolean): Promise<boolean> {
  if (!consenti || !CLIENT_PUB || typeof document === 'undefined') return Promise.resolve(false);
  if (regieChargee) return regieChargee;
  regieChargee = new Promise<boolean>((resoudre) => {
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT_PUB)}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resoudre(true);
    script.onerror = () => resoudre(false);
    document.head.appendChild(script);
  });
  return regieChargee;
}
