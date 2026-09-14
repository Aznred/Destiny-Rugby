import assert from 'node:assert/strict';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { effectifDuClub } from '../src/lib/effectif';
import { dotationBronzeCarriere, coequipierDepuisCarte } from '../src/lib/ligue/catalogueCarriere';
import {
  avancerMatchEnLigne, creerMatchEnLigne, DELAI_PRESENCE, STRATEGIE_EN_LIGNE_DEFAUT,
} from '../src/lib/ligue/matchCarriere';
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import { sens } from '../src/lib/moteur/terrain';

// 1. Ouvrir le direct à la 40e ne doit pas rendre interactives les pénalités
// des 39 premières minutes. Chaque graine utilise une clé neuve afin de tester
// exactement le chemin d'une instance serveur froide.
const debut = Date.parse('2026-09-14T14:00:00.000Z');
const cartesA = dotationBronzeCarriere('reprise-direct', 'club-a', 'reprise-a');
const cartesB = dotationBronzeCarriere('reprise-direct', 'club-b', 'reprise-b');
const equipe = (id: string, cartes: typeof cartesA) => {
  const effectif = cartes.map(coequipierDepuisCarte);
  return {
    clubId: id, nom: id, effectif,
    composition: compositionManagerParDefaut(effectif),
    strategie: STRATEGIE_EN_LIGNE_DEFAUT,
  };
};

for (let i = 0; i < 8; i++) {
  const maintenant = debut + 40 * 60_000;
  const match = creerMatchEnLigne({
    id: `reprise-presence-${i}`, domicile: equipe('club-a', cartesA),
    exterieur: equipe('club-b', cartesB), debut, graine: 91_003 + i,
  });
  match.presence.domicile = maintenant;
  const direct = avancerMatchEnLigne(match, maintenant);
  const bornePresence = 40 - DELAI_PRESENCE / 60_000;
  assert.ok(direct.horloge >= bornePresence - 0.02,
    `La présence a fait revenir le match à ${direct.horloge.toFixed(2)}′.`);
}

// 2. Une fois l'animation d'aplatissement commencée, sa sortie ne peut être
// qu'un essai. Le garde-fou de rythme ne doit plus changer d'avis pendant les
// 1,35 seconde où le joueur pose le ballon.
let aplatissements = 0;
let retours22 = 0;
let passesControlees = 0;
let replisControles = 0;
for (let i = 0; i < 10; i++) {
  const e = creerMatch(
    'Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1),
    effectifDuClub('RC Toulon', 1), 27, 24, `regles-direct#${i}`,
  );
  let garde = 0;
  while (!e.fini && garde++ < 60_000) {
    const phaseAvant = e.phase;
    const scoreAvant = e.scoreA + e.scoreB;
    const volAvant = e.vol?.type === 'passe' ? e.vol : null;
    avancer(e, DT);

    if (phaseAvant === 'aplatissage' && e.phase !== 'aplatissage') {
      aplatissements++;
      if (e.phase === 'renvoi22' && e.scoreA + e.scoreB === scoreAvant) retours22++;
    }
    if (volAvant && !e.vol && e.porteur === volAvant.receveur) {
      passesControlees++;
      assert.ok(Math.hypot(e.porteur.pos.x - volAvant.vers.x, e.porteur.pos.y - volAvant.vers.y) < 0.01,
        'Le receveur doit prendre la passe à son point d’arrivée réel.');
    }
    if (e.vol?.type === 'pied') {
      const botteur = e.vol.auteur;
      for (const p of e.pions.filter(p => p.surLeTerrain && p.horsJeu && p.cote === botteur.cote)) {
        // Le placement n'est recalculé qu'une image sur trois : on ne contrôle
        // que la cible de repli une fois qu'elle a effectivement été posée.
        if (Math.abs(p.effort - 0.92) > 1e-6) continue;
        replisControles++;
        assert.ok((p.cible.x - botteur.pos.x) * sens(p.cote) < 0,
          'Un joueur hors-jeu doit viser une position derrière son botteur.');
      }
    }
  }
}

assert.ok(aplatissements > 5, 'Le banc doit observer plusieurs aplatissements.');
assert.equal(retours22, 0, 'Un aplatissement validé ne doit jamais redevenir un renvoi aux 22.');
assert.ok(passesControlees > 100, 'Le raccord des passes doit être contrôlé sur un échantillon significatif.');
assert.ok(replisControles > 20, 'Le repli après jeu au pied doit être réellement observé.');

console.log(`OK — présence sans retour arrière, ${aplatissements} aplatissements cohérents, `
  + `${passesControlees} passes raccordées et ${replisControles} replis hors-jeu contrôlés.`);
