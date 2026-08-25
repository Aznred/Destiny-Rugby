// LA CIBLE DE PUBLICATION — le même jeu, deux destinations.
//
// Destiny Rugby est publié à deux endroits, et ils n'ont PAS les mêmes règles :
//
// • **destiny-rugby.fr** — notre site. On y met ce qu'on veut : la publicité,
//   la mesure d'audience, les quatre pages de contenu, le français par défaut.
// • **CrazyGames** — un portail, dans une iframe. Ses exigences sont écrites et
//   vérifiées par une équipe de QA (docs.crazygames.com) :
//     - « Only Ads requested through the CrazyGames SDK are allowed »,
//       « No external ads » → AdSense, Monetag et consorts sont INTERDITS ;
//     - en Basic Launch la monétisation est désactivée, et
//       « There should not be rewarded ad buttons without effect » → il ne faut
//       pas seulement couper les annonces, il faut RETIRER les boutons ;
//     - « The game must have English localization », avec repli anglais ;
//     - « No Cross-Promotion » → pas de liens sortants vers nos pages ;
//     - « Custom in-game fullscreen buttons are prohibited » ;
//     - taille et nombre de fichiers plafonnés (voir `lib/media.ts`).
//
// ⚠️ CE N'EST PAS UN « MODE DÉGRADÉ », C'EST UNE AUTRE CIBLE. On ne teste jamais
// `import.meta.env.PROD` pour décider : les deux builds sont des builds de
// production. C'est `VITE_CIBLE` qui tranche, et rien d'autre.
//
//     npm run build                       → le site (défaut)
//     VITE_CIBLE=crazygames npm run build → le portail
//
// ⚠️ ET ON N'INVENTE PAS DE TROISIÈME VALEUR. Une cible inconnue retombe sur le
// site : c'est le comportement le moins surprenant, et il évite qu'une faute de
// frappe dans une variable d'environnement publie un jeu à moitié configuré.

export type Cible = 'site' | 'crazygames';

export const CIBLE: Cible =
  import.meta.env.VITE_CIBLE === 'crazygames' ? 'crazygames' : 'site';

/** Vrai quand le jeu tourne dans le portail : ses règles s'appliquent. */
export const SUR_PORTAIL = CIBLE === 'crazygames';

/**
 * ⚠️ AUCUNE PUBLICITÉ NI MESURE D'AUDIENCE EXTERNE SUR LE PORTAIL.
 *
 * C'est la règle la plus stricte du lot, et la plus facile à enfreindre sans le
 * vouloir : AdSense est déclenché par un `<script>` dans `index.html`, Google
 * Tag Manager aussi, et Vercel Analytics par un composant React. Trois chemins
 * différents, un seul interrupteur.
 */
export const PUBLICITE_AUTORISEE = !SUR_PORTAIL;
export const MESURE_EXTERNE_AUTORISEE = !SUR_PORTAIL;

/**
 * ⚠️ PAS DE LIEN SORTANT DEPUIS LE JEU. « The game should not include
 * cross-promotions for external or internal games/platforms. » Nos quatre pages
 * de contenu (`/guide/`, `/pyramide/`, `/moteur/`, `/journal/`) ont été écrites
 * pour débloquer AdSense sur notre propre domaine ; dans une iframe de portail,
 * elles n'ont aucun sens — et un clic y remplacerait le jeu par un article.
 */
export const LIENS_SORTANTS_AUTORISES = !SUR_PORTAIL;

/**
 * La langue de repli.
 *
 * ⚠️ ELLE CHANGE SELON LA CIBLE, ET C'EST UNE EXIGENCE ÉCRITE : « The game must
 * have English localization […] if not available/set fallback to English ».
 * Sur notre domaine, le repli reste le FRANÇAIS — c'est un site français, et la
 * détection par le pays de l'IP fait le reste. Sur le portail, le public est
 * mondial et l'anglais est la seule valeur acceptable par défaut.
 */
export const LANGUE_DE_REPLI = SUR_PORTAIL ? 'en' : 'fr';
