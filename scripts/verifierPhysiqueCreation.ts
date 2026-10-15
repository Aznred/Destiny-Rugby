import assert from 'node:assert/strict';
import { POSTES } from '../src/data/rugby.js';
import { morphoConseillee, apparencePourPoste, type MorphoJoueur } from '../src/lib/apparenceJoueur.js';
import { ATTRIBUTS_CREATION, ATTRIBUTS_PHYSIQUES, appliquerPhysiqueAuxAttributs, attributsDeBase, attributsDeCreation, ecartsDuPhysique } from '../src/lib/attributsCreation.js';
import { useGame, noteGlobale } from '../src/store/useGame.js';
import { MONDE_FEMININ } from '../src/lib/mondeActif.js';
import { COMPETITIONS } from '../src/data/clubs.js';
import type { Attributs } from '../src/types.js';

let controles = 0;
const verifier = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const somme = (a: Attributs) => ATTRIBUTS_CREATION.reduce((total, cle) => total + a[cle], 0);
const poste = 'demi_ouverture' as const;
const club = MONDE_FEMININ ? COMPETITIONS[0].clubs[0].nom : 'Meze Rugby Club';
const morpho = morphoConseillee(poste);
const configuration = { poste, club, graine: 731 };
const calculer = (changement: Partial<MorphoJoueur>) => attributsDeCreation({ ...configuration, morpho: { ...morpho, ...changement } }).attributs;
const neutre = calculer({});
const leger = calculer({ poidsKg: 72 }), lourd = calculer({ poidsKg: 115 });
verifier(lourd.force > leger.force && lourd.plaquage > leger.plaquage, 'Le poids favorise le contact');
verifier(lourd.vitesse < leger.vitesse && lourd.endurance < leger.endurance, 'Le poids a des contreparties');
const petit = calculer({ tailleCm: 165 }), grand = calculer({ tailleCm: 208 });
verifier(grand.force > petit.force && grand.plaquage > petit.plaquage, 'La taille modifie les aptitudes physiques');
verifier(calculer({ muscle: 1 }).force > calculer({ muscle: -1 }).force, 'La musculature influe sur la force');
for (const cle of ['epaules', 'torse', 'bras', 'jambes'] as const) {
  verifier(JSON.stringify(calculer({ [cle]: -1 })) !== JSON.stringify(calculer({ [cle]: 1 })), `${cle} influe sur le profil`);
}

for (const p of POSTES) {
  const reference = morphoConseillee(p.id);
  assert.deepEqual(ecartsDuPhysique(p.id, reference), { force: 0, plaquage: 0, vitesse: 0, endurance: 0 });
  for (let graine = 0; graine < 80; graine++) {
    const origine = attributsDeCreation({ poste: p.id, club, graine, morpho: reference });
    for (const tailleCm of [165, 180, 195, 208]) for (const poidsKg of [68, 85, 110, 140]) for (const extremite of [-1, 1]) {
      const physique = { tailleCm, poidsKg, muscle: extremite, epaules: extremite, torse: extremite, bras: extremite, jambes: extremite };
      const resultat = attributsDeCreation({ poste: p.id, club, graine, morpho: physique });
      verifier(somme(resultat.attributs) === somme(origine.attributs), 'Le gabarit conserve le budget de départ');
      for (const cle of ATTRIBUTS_CREATION) {
        verifier(Number.isInteger(resultat.attributs[cle]) && resultat.attributs[cle] >= 0 && resultat.attributs[cle] <= 100, 'Attribut borné et entier');
        if (ATTRIBUTS_PHYSIQUES.includes(cle as typeof ATTRIBUTS_PHYSIQUES[number])) {
          verifier(Math.abs(resultat.attributs[cle] - origine.attributs[cle]) <= 6, 'Effet physique limité à six points');
        } else verifier(resultat.attributs[cle] === origine.attributs[cle], 'La technique et le mental sont conservés');
      }
    }
  }
}
// Les valeurs malformées passent par le même validateur que l'apparence sauvegardée.
const invalide = calculer({ tailleCm: NaN, poidsKg: Infinity, muscle: NaN, epaules: 200, jambes: -999 });
verifier(Object.values(invalide).every(Number.isFinite), 'Aucun NaN issu du physique');
verifier(somme(invalide) === somme(neutre), 'Un physique invalide ne crée pas de points');
const extreme: Attributs = { vitesse: 0, force: 100, endurance: 0, plaquage: 100, passe: 45, jeuAuPied: 35, vision: 30, mental: 50 };
const borne = appliquerPhysiqueAuxAttributs(extreme, ecartsDuPhysique(poste, { tailleCm: 208, poidsKg: 140, muscle: 1 }));
verifier(somme(borne) === somme(extreme) && Object.values(borne).every(v => v >= 0 && v <= 100), 'Les bornes conservent les points');
const hasard = Math.random;
try {
  Math.random = () => .5;
  const historique = attributsDeBase(poste);
  verifier(historique.vitesse === 31 && historique.jeuAuPied === 39, 'Tirage historique sans graine conservé');
} finally { Math.random = hasard; }

// Le vrai store enregistre les chiffres montrés dans le formulaire, puis verrouille le physique.
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const apparence = apparencePourPoste(poste, 4);
apparence.morpho = { ...morpho, poidsKg: 110, tailleCm: 195, muscle: .8 };
const copie = JSON.stringify(apparence);
const attendu = attributsDeCreation({ ...configuration, morpho: apparence.morpho });
useGame.getState().creerJoueur({ nom: 'Test Physique', poste, club, nation: 'France', division: 'reg3', age: 18,
  traits: [], apparence, graineAttributs: configuration.graine });
const joueur = useGame.getState().joueur!;
assert.deepEqual(joueur.attributs, attendu.attributs);
verifier(JSON.stringify(apparence) === copie, 'La création ne modifie pas le formulaire');
verifier(joueur.apparence?.morphoFigee, 'Le physique reste figé pendant la carrière');
verifier(noteGlobale(joueur) === noteGlobale({ attributs: neutre }), 'La note globale de départ est conservée');
const chiffres = { ...joueur.attributs };
useGame.getState().personnaliserJoueur({ couleurCheveux: '#15110f' });
assert.deepEqual(useGame.getState().joueur!.attributs, chiffres);
console.log(`${controles.toLocaleString('fr-FR')} contrôles : physique, équilibre, aperçu et création (${MONDE_FEMININ ? 'joueuse' : 'joueur'}).`);
