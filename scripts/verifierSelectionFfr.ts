import assert from 'node:assert/strict';
import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS } from '../src/data/amateurs';
import { PHOTOS_FFR_PAR_ID, PHOTOS_FFR_SUPPLEMENTAIRES } from '../src/data/photosFfr';
import { PHOTOS_DETOUREES_PAR_CLUB, PHOTOS_DETOUREES_PAR_ID } from '../src/data/photosDetourees';
import { joueursFfrDuClub, normaliserNomFfr } from '../src/lib/joueursFfr';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';

let conserves = 0, postes = 0, photosSeules = 0, exclus = 0;
const catalogue = catalogueBaseCarriere();
const identites = new Set(catalogue.map(j => normaliserNomFfr(j.nom)));
const identitesFfr = new Set(catalogue.filter(j => j.origine === 'ffr').map(j => normaliserNomFfr(j.nom)));
const retenus = new Set(Object.values(CLUBS_AMATEURS).flat().flatMap(c => joueursFfrDuClub(c.nom).map(j => normaliserNomFfr(j.nom))));
const lignes = [];
for (const [division, clubs] of Object.entries(CLUBS_AMATEURS)) {
  let avant = 0, apres = 0;
  for (const club of clubs) {
    const liste = joueursFfrDuClub(club.nom);
    const indices = new Set(liste.map(j => j.indexSource));
    const source = (EFFECTIFS_AMATEURS[club.nom] ?? '').split('~').filter(Boolean);
    avant += source.length; apres += liste.length;
    for (const [index, entree] of source.entries()) {
      const [nom, , numeros, id] = entree.split('|');
      const portrait = PHOTOS_DETOUREES_PAR_CLUB[club.nom]?.[normaliserNomFfr(nom)]
        ?? PHOTOS_DETOUREES_PAR_ID[Number(id)] ?? PHOTOS_FFR_PAR_ID[Number(id)]
        ?? PHOTOS_FFR_SUPPLEMENTAIRES[club.structureId]?.[normaliserNomFfr(nom)];
      assert.equal(indices.has(index), Boolean(numeros || portrait), `${club.nom} : ${nom}`);
      if (!indices.has(index)) {
        exclus++;
        // Un professionnel ou une identité documentée dans un autre club peut rester.
        if (!retenus.has(normaliserNomFfr(nom))) assert.ok(!identitesFfr.has(normaliserNomFfr(nom)));
      }
    }
    for (const j of liste) {
      assert.ok(j.poste || j.photo);
      assert.ok(identites.has(normaliserNomFfr(j.nom)));
      conserves++; if (j.poste) postes++; else photosSeules++;
    }
  }
  lignes.push({ division, avant, apres });
}
assert.equal(postes, 44133);
assert.ok(exclus > 25000);
console.table(lignes);
console.log(`OK : ${conserves} profils conservés (${postes} avec poste, ${photosSeules} avec photo seule), ${exclus} licenciés sans poste ni photo exclus. Identités stables et catalogue vérifiés.`);
