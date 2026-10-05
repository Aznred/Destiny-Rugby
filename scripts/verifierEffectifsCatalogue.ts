import assert from 'node:assert/strict';
import { COMPETITIONS } from '../src/data/clubs';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { effectifDuClub } from '../src/lib/effectif';
import { cleBlasonCarte } from '../src/lib/useBlasonCarte';
import { fournirCatalogueEffectifs, joueursCatalogueDuClub } from '../src/lib/catalogueEffectifs';

const catalogue = catalogueBaseCarriere();
const sourceParClub = new Map<string, typeof catalogue[number][]>();
for (const j of catalogue) {
  const cle = cleBlasonCarte(j.clubReel);
  sourceParClub.set(cle, [...(sourceParClub.get(cle) ?? []), j]);
}
const clubs = new Set(COMPETITIONS.flatMap(c => c.clubs.map(cl => cl.nom)));
let controles = 0;
const divergences: { club: string; attendu: number; obtenu: number; inventes: string[]; absents: string[] }[] = [];
for (const club of clubs) {
  const source = sourceParClub.get(cleBlasonCarte(club));
  if (!source?.length) continue;
  const groupe = effectifDuClub(club, 1);
  const attendus = new Set(source.map(j => j.nom));
  const obtenus = new Set(groupe.map(j => j.nom));
  const inventes = groupe.filter(j => !attendus.has(j.nom)).map(j => j.nom);
  const absents = source.filter(j => !obtenus.has(j.nom)).map(j => j.nom);
  if (inventes.length || absents.length || groupe.length !== source.length) divergences.push({ club, attendu: source.length, obtenu: groupe.length, inventes, absents });
  const profils = new Map(source.map(j => [j.nom, j]));
  for (const j of groupe.filter(j => attendus.has(j.nom))) {
    const profil = profils.get(j.nom)!;
    assert.equal(j.note, profil.note, `${club} : note initiale de ${j.nom}`);
    assert.equal(j.age, profil.age, `${club} : âge initial de ${j.nom}`);
    assert.equal(j.photo, profil.photo, `${club} : portrait de ${j.nom}`);
    assert.equal(j.regen, false, `${club} : aucun regen initial`);
  }
  controles++;
}
console.log('UBB :', sourceParClub.get(cleBlasonCarte('Union Bordeaux Bègles'))?.length, 'joueurs dans la base,', effectifDuClub('Union Bordeaux Bègles', 1).length, 'affichés.');
assert.deepEqual(divergences, [], 'les effectifs initiaux de tous les clubs doivent reprendre exactement les noms de la base');
const ubb = effectifDuClub('Union Bordeaux Bègles', 1);
assert.equal(ubb.length, 46, 'régression UBB : tous les joueurs de la base');
assert.deepEqual(effectifDuClub('Union Bordeaux-Bègles', 1), ubb, 'orthographes UBB : mêmes joueurs et identifiants');
for (const [alias, nom] of [['LOU Rugby', 'Lyon OU'], ['Montpellier Hérault Rugby', 'Montpellier HR'], ['Oyonnax Rugby', 'US Oyonnax']]) {
  assert.deepEqual(effectifDuClub(alias, 1), effectifDuClub(nom, 1), `même effectif pour ${alias}`);
}
assert.ok(effectifDuClub('Union Bordeaux Bègles', 20).some(j => j.regen), 'les retraites produisent toujours des regens ultérieurement');
assert.ok(effectifDuClub('Union Bordeaux Bègles', 3).some(j => j.id.includes('-transfert-')), 'les transferts simulés continuent après le départ');
try {
  const sourceUbb = joueursCatalogueDuClub('Union Bordeaux Bègles');
  const cible = sourceUbb[0];
  const version = catalogue.map(j => j.sourceId === cible.sourceId ? { ...j, nom: 'Nom corrigé dans la base', note: 73 } : j);
  fournirCatalogueEffectifs(version);
  const rafraichi = effectifDuClub('Union Bordeaux Bègles', 1);
  assert.ok(rafraichi.some(j => j.nom === 'Nom corrigé dans la base' && j.note === 73), 'le cache reprend les données actualisées du serveur');
  assert.ok(!rafraichi.some(j => j.nom === cible.nom), 'l’ancienne identité ne reste pas affichée');
} finally { fournirCatalogueEffectifs(catalogue); }
console.log(`OK : ${controles} clubs conformes au catalogue, variantes de noms, mises à jour, retraites et transferts vérifiés.`);
