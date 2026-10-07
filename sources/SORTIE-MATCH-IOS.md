# Retour du match 3D vers la carrière sur iOS

Signalement : iPhone 15 et iPad qui plantent à la fin d'un match, au retour à
l'écran de management. Corrections locales du 7 octobre 2026.

## Constats dans le code

Le pipeline de fin de match attendait déjà la destruction de la scène avant
la sauvegarde et le retour à la carrière. La destruction ne rendait toutefois
pas les squelettes, les géométries locales des ombres/drapeaux/repères, ni les
images CPU des textures de maillots. Elle laissait aussi les arbitres et leurs
bandes de ralentis attachés à l'objet de scène. Le contexte graphique restait
ouvert pendant les premières tranches du nettoyage. Le test de disponibilité
WebGL ouvrait un autre contexte à chaque match sans le rendre explicitement.
Les objets partagés de géométrie, matériau et texture peuvent aussi garder
les écouteurs des renderers qui les ont utilisés : `renderer.dispose()` ne
retire pas leurs propres écouteurs de ressources.

Ces défauts peuvent augmenter la mémoire à la transition. Ils ne prouvent pas
à eux seuls la cause exacte du crash rapporté : aucun journal Safari de
l'appareil ni appareil iOS réel n'est accessible ici.

## Corrections

- Contexte graphique rendu et toile retirée dès le début de la destruction,
  avant le changement d'orientation et le montage de la carrière.
- Plan de restitution dédupliqué pour matériaux, textures, géométries locales
  et squelettes ; fermeture des ImageBitmap et réduction des toiles locales à
  1 × 1. Les ressources en cache restent protégées. Les clones de textures
  détachent leur Source pour ne pas vider l'image du modèle partagé.
- Joueurs, arbitres, scène, état de match et bandes de ralentis détachés ;
  références de diagnostic retirées au démontage en développement.
- Comptage des scènes qui utilisent chaque stade : son éviction ne détruit
  pas les images d'une autre scène active.
- Géométries, matériaux et textures sont désormais des objets propres à
  chaque match. Leurs écouteurs sont retirés lors de leur destruction ; le
  cache ne retient pas d'ancien renderer. Les gros tableaux de sommets et
  images restent partagés, sans duplication de ces tampons CPU ; les joueurs
  d'un même match réutilisent les mêmes copies lorsque c'est possible.
- La version Three.js livrée dans `public/rn26/vendor` utilise aussi une
  texture interne globale `DFG_LUT` de 16 × 16 pixels. Elle gardait un
  écouteur par renderer fermé. Sa mémoire GPU est maintenant rendue dans
  `WebGLRenderer.dispose()` ; ses données CPU restent réutilisables par les
  autres scènes. Cette retouche doit être conservée ou revue lors d'une mise
  à jour du vendor. Le banc navigateur exige zéro texture après fermeture.
- Destruction unique et attendue même si deux composants la demandent ;
  destruction de secours aussi en cas d'erreur synchrone. Une création 3D en
  échec rend ses ressources avant le repli en 2D.
- Un seul contexte de test WebGL pour toute la page, aussitôt perdu et réduit.
- iPhone et iPad conservent le budget léger, indépendamment de la taille
  d'écran. Anticrénelage désactivé ; surface maximale de rendu de 921 600
  pixels, définition au plus 1. Un seul redimensionnement du tampon par
  changement de dimensions ou de définition. Atlas d'équipe créés directement
  à 512 px en mode léger, comme les textures de maillots déjà utilisées.
- Les bandes de ralentis gardent un ordre d'os stable lorsque la pose d'un
  joueur distant utilise moins d'os.

Les règles du match, scores, statistiques, joueurs et tribunes restent les
mêmes. La baisse de définition sur les grandes tablettes est volontaire pour
réduire le budget graphique.

## Vérification

- `node scripts/verifierMemoire3D.mjs` : 58 contrôles, dix groupes de trente
  joueurs ; restitution unique des ressources locales et préservation des
  ressources partagées, isolation de deux renderers sans duplication des
  données lourdes, matériaux en tableaux, images clonées et erreurs.
- `vite-node scripts/verifierSortieIos.ts` : 19 contrôles ; iPad présenté comme
  Mac tactile, iPhone, ordinateur, contexte de diagnostic unique, destruction
  concurrente et erreur synchrone.
- `verify:fin-match` : 109 contrôles, dix rencontres complètes simulées ;
  résultat et sauvegarde écrits une fois, aucune minuterie résiduelle. Ce
  banc Node ne mesure pas la mémoire graphique.
- `/scripts/apercuSortie3D.html?ios=1` : scènes WebGL réellement créées et
  dessinées, dix cycles, trente joueurs et trois arbitres. Après chaque
  sortie : contexte perdu, aucune toile, scène vide, squelettes rendus,
  maillots réduits, bandes de ralentis détachées, aucun stade gardé.
  Le banc exige aussi zéro géométrie et zéro texture dans les compteurs du
  renderer détruit, et des appels de dessin avant la fermeture.
  Sur le grand format de test, le tampon passe de 1 200 × 420 à
  1 073 × 858 lorsque le cadre devient 1 200 × 960 : le plafond est respecté.
- Dernière version vérifiée aussi en rendu complet sur ordinateur (dix
  fermetures, zéro géométrie et zéro texture ; un stade CPU gardé pour la
  prochaine rencontre) et en format téléphone 390 × 844 avec profil iOS
  simulé (dix fermetures, mêmes compteurs à zéro, aucun stade gardé).
- Compilation de production et contrôles de code réussis. Les avertissements
  de taille de bundles et de variables inutilisées déjà présents restent.

Le profil iOS de cette page est simulé dans un navigateur Chromium ; il ne
reproduit ni WebKit ni les limites mémoire du système iOS. Le test dessine
45 images par cycle par tâches successives, il ne mesure pas les FPS et ne
joue pas dix matchs entiers dans Safari. Aucun gain de RAM totale ou absence
définitive de crash sur iPhone n'est affirmé.

## Essai sur les appareils concernés

Après publication de cette version, jouer plusieurs matchs dans la carrière
concernée sur l'iPhone 15 et l'iPad, puis revenir au management en paysage et
en portrait. Essayer également une sortie après passage en arrière-plan.
Si le crash reste présent, relever la version iOS, Safari ou application
installée, le mode de carrière et si la page se recharge ou reste figée.
La validation matérielle et le déploiement restent à faire.

Sources techniques : [restitution des objets Three.js](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)
(squelettes et images des textures), [redimensionnement WebGL et mémoire dans WebKit](https://bugs.webkit.org/show_bug.cgi?id=219780).
Le second lien décrit un ancien défaut de WebKit et ne prouve pas sa présence
dans la version iOS du signalement.
