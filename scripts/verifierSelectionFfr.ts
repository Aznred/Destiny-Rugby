import assert from 'node:assert/strict';
import { CLUBS_AMATEURS, EFFECTIFS_AMATEURS } from '../src/data/amateurs';
import { joueursFfrDuClub, normaliserNomFfr } from '../src/lib/joueursFfr';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';

let conserves = 0, postes = 0, photosSeules = 0, sansRenseignement = 0;
const catalogue = catalogueBaseCarriere();
const identites = new Set(catalogue.map(j => normaliserNomFfr(j.nom)));
const lignes = [];
for (const [division, clubs] of Object.entries(CLUBS_AMATEURS)) {
  let avant = 0, apres = 0;
  for (const club of clubs) {
    const liste = joueursFfrDuClub(club.nom);
    const parIndex = new Map(liste.map(j => [j.indexSource, j]));
    assert.equal(parIndex.size, liste.length, `${club.nom} : indices source uniques`);
    const source = (EFFECTIFS_AMATEURS[club.nom] ?? '').split('~').filter(Boolean);
    avant += source.length; apres += liste.length;
    for (const [index, entree] of source.entries()) {
      const [nom, , , id] = entree.split('|');
      const joueur = parIndex.get(index);
      assert.ok(joueur, `${club.nom} : licencié absent ${nom}`);
      assert.equal(joueur.nom, nom, `${club.nom} : identité source modifiée`);
      assert.equal(joueur.ffrId, id ? Number(id) : undefined);
    }
    for (const j of liste) {
      assert.ok(identites.has(normaliserNomFfr(j.nom)));
      conserves++; if (j.poste) postes++; else if (j.photo) photosSeules++; else sansRenseignement++;
    }
  }
  lignes.push({ division, avant, apres });
}
assert.equal(postes, 44133);
assert.ok(sansRenseignement > 25_000, 'Les licenciés sans poste ni photo doivent rester disponibles.');
assert.ok(catalogue.length >= 78_000, `Catalogue mondial incomplet : ${catalogue.length} joueurs`);
assert.equal(new Set(catalogue.map(j => j.sourceId)).size, catalogue.length, 'Les identifiants de cartes restent uniques.');
console.table(lignes);
console.log(`OK : ${conserves} profils FFR conservés (${postes} avec poste, ${photosSeules} avec photo seule, ${sansRenseignement} sans renseignement). ${catalogue.length} joueurs dans le catalogue mondial. Identités stables vérifiées.`);
