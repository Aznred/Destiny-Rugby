// AJOUTS MANUELS AUX EFFECTIFS RÉELS — les joueurs que la source ne connaît pas (Correctif 33).
//
// La base (`sources/data/base_rugby_finale.json`) ne liste que les joueurs qui ont une fiche chez la source. Un espoir
// monté en équipe première, ou un joueur demandé expressément, n'y figure pas : il s'ajoute ICI, avec les valeurs
// données — rien n'est calculé à sa place, rien n'est inventé.
//
// ⚠️ TROIS RÈGLES, tenues par `appliquerAjouts` :
//   1. JAMAIS DE DOUBLON. Un joueur déjà présent dans le MÊME club est corrigé (âge, note, potentiel), pas ajouté une
//      seconde fois ; présent dans un AUTRE club, l'ajout est refusé avec un avertissement — à trancher à la main.
//   2. À LA FIN DE LA LISTE DU CLUB. L'identifiant d'un joueur réel est sa place dans l'effectif (`<club>-reel-<i>`) :
//      inséré à son rang de note, il décalerait tous ceux qui suivent, et les sauvegardes d'entraîneur (compositions,
//      contrats, dossiers médicaux) désigneraient soudain quelqu'un d'autre.
//   3. LE POSTE EST CELUI QU'ON DONNE. `poste` est la famille de l'effectif ; `posteExact` (facultatif) fixe le maillot
//      quand la famille en couvre deux — un centre est 12 ou 13, pas « centre ».
//
// Appliquer aux fichiers actuels : node scripts/appliquerAjoutsJoueurs.cjs
// `genMonde.cjs` lit aussi cette table : une régénération complète garde les ajouts.

/** @type {{ nom: string; club: string; poste: string; posteExact?: string; age: number; note: number; potentiel: number; nation: string; source: string }[]} */
const AJOUTS_JOUEURS = [
  {
    // Demande du 8 octobre 2026 : « Montauban, 19 ans, GEN 61 ». Poste : arrière, d'après sa feuille de match Espoirs.
    // Potentiel : la règle du jeu pour un senior de moins de 23 ans (note + 4).
    nom: 'Gianluca DALLA RIVA', club: 'US Montauban', poste: 'arriere', age: 19, note: 61, potentiel: 65, nation: 'France',
    source: 'Demande du 08/10/2026 ; poste lu sur sa feuille de match (Reichel Espoirs, US Montauban).',
  },
  {
    // Demande du 8 octobre 2026 : « Nogodi, 28 ans, CA Brive, GEN 72, potentiel 75, centre 13 ».
    nom: 'Noé GODIGNON', club: 'CA Brive', poste: 'centre', posteExact: 'deuxieme_centre', age: 28, note: 72, potentiel: 75, nation: 'France',
    source: 'Demande du 08/10/2026 (Nogodi).',
  },
];

const FAMILLES = ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne', 'demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere'];
const POSTES_EXACTS = {
  pilier: ['pilier_gauche', 'pilier_droit'], talonneur: ['talonneur'], deuxieme_ligne: ['deuxieme_ligne_g', 'deuxieme_ligne_d'],
  troisieme_ligne: ['troisieme_aile_g', 'troisieme_aile_d', 'numero_8'], demi_melee: ['demi_melee'], demi_ouverture: ['demi_ouverture'],
  centre: ['premier_centre', 'deuxieme_centre'], ailier: ['ailier_gauche', 'ailier_droit'], arriere: ['arriere'],
};
const cleNom = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Refuse une ligne incohérente AVANT de toucher quoi que ce soit. */
function verifierAjout(a) {
  const erreurs = [];
  if (!a.nom || !/\S+\s+\S+/.test(a.nom)) erreurs.push('nom complet attendu (prénom NOM)');
  if (!FAMILLES.includes(a.poste)) erreurs.push(`poste inconnu « ${a.poste} »`);
  if (a.posteExact && !(POSTES_EXACTS[a.poste] ?? []).includes(a.posteExact)) erreurs.push(`posteExact « ${a.posteExact} » hors de la famille « ${a.poste} »`);
  if (!Number.isInteger(a.age) || a.age < 18 || a.age > 42) erreurs.push('âge entre 18 et 42');
  if (!Number.isInteger(a.note) || a.note < 20 || a.note > 99) erreurs.push('note entre 20 et 99');
  if (!Number.isInteger(a.potentiel) || a.potentiel < a.note || a.potentiel > 99) erreurs.push('potentiel entre la note et 99');
  if (!a.nation) erreurs.push('nation requise');
  return erreurs;
}

/**
 * Applique les ajouts à des effectifs en mémoire (`{ club: [{ nom, poste, age, note, potentiel, nation }] }`).
 * Rend ce qui a été fait, ligne par ligne ; ne lève jamais : une ligne refusée est rendue avec sa raison.
 */
function appliquerAjouts(effectifs, ajouts = AJOUTS_JOUEURS) {
  const ou = new Map();
  for (const [club, liste] of Object.entries(effectifs)) for (const j of liste) if (!ou.has(cleNom(j.nom))) ou.set(cleNom(j.nom), club);
  const bilan = [];
  for (const a of ajouts) {
    const erreurs = verifierAjout(a);
    if (erreurs.length) { bilan.push({ nom: a.nom, action: 'refuse', raison: erreurs.join(' ; ') }); continue; }
    const liste = effectifs[a.club];
    if (!liste) { bilan.push({ nom: a.nom, action: 'refuse', raison: `club inconnu « ${a.club} »` }); continue; }
    const cle = cleNom(a.nom);
    const fiche = { nom: a.nom, poste: a.poste, age: a.age, note: a.note, potentiel: a.potentiel, nation: a.nation };
    const existant = liste.find((j) => cleNom(j.nom) === cle);
    if (existant) {
      const identique = ['poste', 'age', 'note', 'potentiel', 'nation'].every((c) => existant[c] === fiche[c]);
      Object.assign(existant, fiche, { nom: existant.nom });
      bilan.push({ nom: a.nom, action: identique ? 'deja' : 'corrige', club: a.club });
      continue;
    }
    if (ou.has(cle)) { bilan.push({ nom: a.nom, action: 'refuse', raison: `déjà présent à ${ou.get(cle)} : à trancher à la main` }); continue; }
    liste.push(fiche);
    ou.set(cle, a.club);
    bilan.push({ nom: a.nom, action: 'ajoute', club: a.club, rang: liste.length - 1 });
  }
  return bilan;
}

/** Les maillots fixés à la main : `{ 'Noé GODIGNON': 'deuxieme_centre' }`. */
const postesExacts = (ajouts = AJOUTS_JOUEURS) => Object.fromEntries(ajouts.filter((a) => a.posteExact && !verifierAjout(a).length).map((a) => [a.nom, a.posteExact]));

module.exports = { AJOUTS_JOUEURS, FAMILLES, appliquerAjouts, postesExacts, verifierAjout, cleNom };
