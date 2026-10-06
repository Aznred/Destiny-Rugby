// Garde-fou d'un banc qui veut voir ce que le jeu enverrait au classement mondial.
//
// En développement, `classementEnLigne.ts` n'appelle rien tant qu'aucune URL n'est configurée (`VITE_CLASSEMENT_URL`) :
// un banc qui compte les envois en compterait toujours zéro, et « rien n'est parti » ne prouverait rien.
//
// ⚠️ `import.meta.env` EST FIGÉ AU LANCEMENT de vite-node : l'URL ne peut pas se poser depuis le banc. On la lit donc dans
// `.env.banc-classement` (`vite-node -m banc-classement`), ce qui marche aussi sous Windows — contrairement à
// `VAR=… commande`. Ce fichier-ci, importé EN PREMIER, refuse de continuer si le banc a été lancé sans.
if (!import.meta.env.VITE_CLASSEMENT_URL) {
  throw new Error('Lance ce banc par `npm run verify:carriere-existante` : il lui faut `vite-node -m banc-classement` (voir scripts/_envClassement.ts).');
}
