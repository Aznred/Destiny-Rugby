import assert from 'node:assert/strict';
import { effectifDuClub } from '../src/lib/effectif';
import { avancer, creerMatch, DT } from '../src/lib/moteur/moteur';
import { distance } from '../src/lib/moteur/terrain';

let receptionsAile = 0;
let passesSuivies = 0;
let receveurEloigne = 0;
let receptionTeleportee = 0;
let cibleInitialeEloignee = 0;
let pireEcart = 0;
let appelsSurEngagement = 0;
let chassesSurEngagement = 0;
let engagementsCaptes = 0;
let engagementsRebondis = 0;
let lignesEcartees = 0;
const combinaisons = new Set<string>();
let sentinellesDisponibles = 0;
let appelsDeCouverture = 0;

for (let i = 0; i < 3; i++) {
  const e = creerMatch(
    'Stade Toulousain', 'Stade Rochelais',
    effectifDuClub('Stade Toulousain', 1), effectifDuClub('Stade Rochelais', 1),
    27, 26, `jeu-de-mouvement-${i}`, undefined,
    { tempsReel: true, scoreSurTerrain: false },
  );
  let ancienPorteur = '';
  let ancienLancement = e.lancement;
  let engagementEnCours: { id: string; depart: { x: number; y: number }; chute: { x: number; y: number } } | null = null;
  for (let garde = 0; !e.fini && garde < 80_000; garde++) {
    const volAvant = e.vol;
    const pointAvant = volAvant?.receveur ? { ...volAvant.receveur.pos } : null;
    avancer(e, DT);
    if (e.phase === 'jeuCourant' && e.porteur?.numero === 9
      && distance(e.porteur.pos, e.origine) < 15 && garde % 3 === 0) {
      const defense = e.pions.filter((p) => p.surLeTerrain && p.cote !== e.porteur?.cote);
      const sentinelle = defense.find((p) => p.role === 'chasseur'
        && distance(p.cible, e.porteur!.pos) < 10 && p.battu <= 0);
      if (sentinelle) sentinellesDisponibles++;
    }
    if (e.phase === 'jeuCourant' && e.porteur && garde % 3 === 0) {
      const defense = e.pions.filter((p) => p.surLeTerrain && p.cote !== e.porteur?.cote);
      const depasses = defense.filter((p) => (p.pos.x - e.porteur!.pos.x) * (e.porteur!.cote === 'A' ? 1 : -1) < -0.5);
      if (depasses.length >= 5 && defense.some((p) => p.role === 'chasseur' && p.numero === 15)) appelsDeCouverture++;
    }
    if (volAvant?.intention === 'renvoi' && volAvant.type === 'pied' && !e.vol) {
      if (e.porteur && e.porteur.cote !== volAvant.auteur.cote) engagementsCaptes++;
      else if (e.phase === 'ballonLibre') engagementsRebondis++;
    }

    if (e.lancement && e.lancement !== ancienLancement) {
      if (e.lancement.type === 'large' || e.lancement.type === 'saute') combinaisons.add(e.lancement.libelle);
      ancienLancement = e.lancement;
    }
    if (e.phase === 'jeuCourant' && e.porteur && e.porteur.id !== ancienPorteur) {
      ancienPorteur = e.porteur.id;
      if (e.porteur.numero === 11 || e.porteur.numero === 14) receptionsAile++;
    }
    if (e.phase === 'jeuCourant' && e.porteur && garde % 12 === 0) {
      const ailiers = e.pions.filter((p) => p.surLeTerrain && p.cote === e.possession && (p.numero === 11 || p.numero === 14));
      if (ailiers.length === 2 && Math.abs(ailiers[0].cible.y - ailiers[1].cible.y) > 44) lignesEcartees++;
    }
    if (e.vol?.type === 'passe' && e.vol.ecoule > 0 && e.vol.receveur) {
      passesSuivies++;
      if (distance(e.vol.receveur.cible, e.vol.vers) > 0.01) receveurEloigne++;
    }
    if (e.vol?.type === 'passe' && e.vol.ecoule === 0 && e.vol.receveur
      && distance(e.vol.receveur.pos, e.vol.vers) > 2.2) cibleInitialeEloignee++;
    if (volAvant?.type === 'passe' && !e.vol && e.porteur === volAvant.receveur && pointAvant) {
      const ecart = distance(pointAvant, volAvant.vers);
      pireEcart = Math.max(pireEcart, ecart);
      if (ecart > 2.2) receptionTeleportee++;
    }
    if (e.phase === 'ballonEnLAir' && e.vol?.intention === 'renvoi' && e.vol.ecoule > 0) {
      const receveurs = e.pions.filter((p) => p.surLeTerrain && p.cote !== e.vol?.auteur.cote);
      const premier = receveurs.find((p) => distance(p.cible, e.vol!.vers) < 0.01);
      if (premier && !engagementEnCours) {
        appelsSurEngagement++;
        engagementEnCours = { id: premier.id, depart: { ...premier.pos }, chute: { ...e.vol.vers } };
      }
    } else if (engagementEnCours) {
      const joueur = e.pions.find((p) => p.id === engagementEnCours?.id);
      if (joueur && distance(joueur.pos, engagementEnCours.depart) > 0.3
        && distance(joueur.pos, engagementEnCours.chute) < distance(engagementEnCours.depart, engagementEnCours.chute) - 0.2) {
        chassesSurEngagement++;
      }
      engagementEnCours = null;
    }
  }
  assert.ok(e.fini, 'Chaque match de contrôle doit se terminer.');
}

assert.ok(passesSuivies > 30 && receveurEloigne === 0,
  `Le receveur doit rester aligné sur le point de passe : ${receveurEloigne}/${passesSuivies}.`);
assert.equal(cibleInitialeEloignee, 0, 'Aucune passe ne doit viser un receveur trop éloigné du point de chute.');
assert.equal(receptionTeleportee, 0, 'Une réception ne doit pas téléporter le joueur sous le ballon.');
assert.ok(appelsSurEngagement > 0 && chassesSurEngagement > 0,
  'Les receveurs doivent courir vers le point de chute dès le coup d’envoi.');
assert.ok(lignesEcartees > 20, 'Les ailiers doivent occuper deux couloirs distincts.');
assert.ok(combinaisons.size >= 3, 'Les lancements au large doivent varier.');
assert.ok(receptionsAile >= 12, 'Le ballon doit parvenir régulièrement jusqu’aux ailiers.');
assert.ok(sentinellesDisponibles > 20, 'La défense doit avoir un joueur libre pour surveiller le demi après le ruck.');
assert.ok(appelsDeCouverture > 20, 'L’arrière doit participer à la couverture des percées.');
console.log(`OK — ${receptionsAile} prises de balle à l’aile, ${combinaisons.size} combinaisons, `
  + `${passesSuivies} passes suivies, ${receptionTeleportee} réceptions à plus de 2,2 m, `
  + `${cibleInitialeEloignee} cibles initiales éloignées, pire écart ${pireEcart.toFixed(1)} m, `
  + `${engagementsCaptes} engagements captés, ${engagementsRebondis} rebondis, `
  + `${sentinellesDisponibles} surveillances du demi et ${appelsDeCouverture} couvertures.`);
