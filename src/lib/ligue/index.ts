// LE SOCLE DE LA LIGUE EN LIGNE — point d'entrée unique
//
// ⚠️ TOUT CE QUI EST ICI TOURNE DES DEUX CÔTÉS : dans le navigateur ET dans les
// fonctions serverless de `api/`. La règle, sans exception :
//
//   • aucun import du store, aucun accès au DOM, aucune horloge implicite
//     (`Date.now()` se passe en paramètre — un banc de mesure doit pouvoir
//     rejouer une saison entière sans attendre neuf mois) ;
//   • aucun texte affichable : des identifiants et des clés i18n. La ligue se
//     joue en sept langues, et une règle du jeu qui contient une phrase
//     française est une règle qu'on ne peut pas traduire ;
//   • aucune dépendance de valeur en dehors de `src/data/` — un `import type`
//     est effacé à la compilation, il ne compte pas.
//
// Le seul module qui lit des données réelles est `vivier.ts`
// (`src/data/effectifsReels.ts`), et il ne les lit qu'à la CRÉATION d'une
// ligue. Ensuite, la base est la vérité.

export * from './types';
export * from './aleatoire';
export * from './rarete';
export * from './identite';
export * from './reglages';
export * from './vivier';
export * from './dotation';
export * from './valeur';
export * from './packs';
export * from './ova';
export * from './calendrier';
