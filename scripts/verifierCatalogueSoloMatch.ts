import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogueMondialCarriere } from '../src/lib/ligue/catalogueCarriere';
import { fournirCatalogueEffectifs } from '../src/lib/catalogueEffectifs';
import { effectifDuClub, forceEffectif, setApportsDuCentre } from '../src/lib/effectif';
import { EFFECTIFS_REELS } from '../src/data/effectifsReels';
import { creerChoixCommentaireAudio, creerSuiviCommentaires, familleCommentaireAudio, type FamilleCommentaireAudio } from '../src/lib/commentateursMatch';
import enregistrements from '../src/data/commentairesAudio.json';
import { creerDureeNomPorteur } from '../public/rn26/nomPorteur.js';

const base = catalogueMondialCarriere();
for (const club of ['Stade Toulousain', 'Montpellier HR', base.find(j => j.origine === 'ffr')!.clubReel]) {
  const solo = effectifDuClub(club, 1);
  for (const fiche of base.filter(j => j.clubReel === club)) {
    const joueur = solo.find(j => j.nom === fiche.nom);
    assert.ok(joueur, `${club} : ${fiche.nom} présent en solo`);
    for (const champ of ['note', 'potentiel', 'age', 'photo', 'poste', 'nation'] as const) {
      assert.equal(joueur[champ], fiche[champ], `${fiche.nom} : ${champ} commun`);
    }
    assert.deepEqual(joueur.postesSecondaires, fiche.postesSecondaires);
  }
  assert.equal(new Set(solo.map(j => j.id)).size, solo.length, 'Identifiants uniques');
  for (const saison of [2, 5, 20]) assert.ok(effectifDuClub(club, saison).length >= 26, 'Vieillissement et renouvellement');
}
const club = 'Stade Toulousain';
const joueur = effectifDuClub(club, 1).find(j => j.nom.includes('DUPONT'))!;
const index = EFFECTIFS_REELS[club].findIndex(j => j.nom === joueur.nom);
assert.equal(joueur.id, `${club}-reel-${index}`, 'Identité sauvegardée conservée');
const fiche = base.find(j => j.nom === joueur.nom)!;
const forceAvant = forceEffectif(club, 1);
const edition = catalogueMondialCarriere({ revision: 1, packs: {}, rotationPacks: false,
  joueurs: { [fiche.sourceId]: { note: 40, potentiel: 70, photo: '/photos/silhouette.webp', poste: 'talonneur' } } });
fournirCatalogueEffectifs(edition);
const actualise = effectifDuClub(club, 1).find(j => j.id === joueur.id)!;
assert.equal(actualise.note, 40);
assert.equal(actualise.poste, 'talonneur');
assert.equal(actualise.photo, '/photos/silhouette.webp');
assert.notEqual(forceEffectif(club, 1), forceAvant, 'Les caches suivent la source actualisée');
setApportsDuCentre([], { [joueur.id]: [{ depuis: 1, gain: 2 }] });
// Le catalogue ne modifie pas les identifiants utilisés par la progression.
assert.ok(effectifDuClub(club, 1).some(j => j.id === joueur.id));
setApportsDuCentre([], {});
fournirCatalogueEffectifs(base);

const nom = creerDureeNomPorteur();
assert.equal(nom('a', 1000), true);
assert.equal(nom('a', 3499), true);
assert.equal(nom('a', 3500), false);
assert.equal(nom('a', 10000), false, 'Un nom ne se réaffiche pas à chaque image');
assert.equal(nom('b', 10001), true, 'Un nouveau porteur ouvre sa fenêtre');
assert.equal(nom(null, 10002), false);

const suivre = creerSuiviCommentaires();
const passe = { seconde: 10, minute: 0, texte: 'Ancien essai', type: 'essai' };
const futur = { seconde: 30, minute: 0, texte: 'Essai à venir', type: 'essai' };
assert.equal(suivre([passe, futur], 20, true, 0), undefined, 'Pas de lecture de l’historique');
assert.equal(suivre([passe, futur], 29.9, true, 1000), undefined, 'Ne pas annoncer un essai avant l’image');
assert.equal(suivre([passe, futur], 30, true, 2000), futur);
assert.equal(suivre([passe, futur], 31, true, 4000), undefined, 'Pas de répétition');
const pause = { ...futur, seconde: 35, texte: 'Pendant la pause' };
assert.equal(suivre([pause], 35, false, 8000), undefined);
assert.equal(suivre([pause], 35, true, 9000), undefined, 'Ne pas accumuler une file pendant la pause');
const vieux = { ...futur, seconde: 36, texte: 'Action dépassée' };
assert.equal(suivre([vieux], 100, true, 10000), undefined);
assert.equal(familleCommentaireAudio({ ...futur, type: 'but', points: 2 }), 'ConversionScored');
assert.equal(familleCommentaireAudio({ ...futur, type: 'carton', texte: 'Carton jaune' }), 'SentOffYellowCard');
assert.equal(familleCommentaireAudio({ ...futur, type: 'carton', texte: 'Carton rouge' }), undefined, 'Ne pas annoncer un jaune à la place d’un rouge');
const choisir = creerChoixCommentaireAudio();
for (const [famille, fichiers] of Object.entries(enregistrements)) {
  for (const fichier of fichiers) assert.equal(readFileSync(new URL(`../public${fichier}`, import.meta.url)).subarray(0, 4).toString(), 'OggS', `Audio valide : ${fichier}`);
  let precedent: string | undefined;
  for (let i = 0; i < 20; i++) {
    const clip = choisir(famille as FamilleCommentaireAudio);
    assert.ok(fichiers.includes(clip));
    assert.notEqual(clip, precedent, 'Éviter les répétitions immédiates');
    precedent = clip;
  }
}
console.log('Catalogue solo/en ligne, identité, éditions, saisons, noms 2,5 s, 270 enregistrements APK et synchronisation vocale : OK.');
