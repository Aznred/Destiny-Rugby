import assert from 'node:assert/strict';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';

// Un porteur repoussé pendant l'armé du coup de pied doit revenir sur ses
// appuis. Avant correction, la préparation attendait un déplacement interdit.
for (const cote of ['A', 'B'] as const) {
  const e = creerMatch('Stade Toulousain', 'RC Toulon', effectifDuClub('Stade Toulousain', 1),
    effectifDuClub('RC Toulon', 1), 27, 24, `charge-bloquee-${cote}`, undefined,
    { tempsReel: true, scoreSurTerrain: true });
  const p = e.pions.find(q => q.cote === cote && q.numero === 10)!;
  e.pions.forEach(q => { q.surLeTerrain = q === p; });
  p.pos = { x: 57, y: 35 }; p.vitesse = { x: 2, y: 0 }; p.cible = { x: 90, y: 35 };
  e.phase = 'jeuCourant'; e.possession = cote; e.porteur = p; e.vol = null; e.placement = null;
  e.ballon = { ...p.pos };
  e.piedPrepare = { auteurId: p.id, arrivee: { x: cote === 'A' ? 85 : 30, y: 35 },
    intention: 'chandelle', duree: 3, hauteur: 12, depuis: { x: 60, y: 35 } };
  let frappe = false;
  for (let i = 0; i < 100; i++) {
    const avant = { ...p.pos };
    avancer(e, .15);
    assert.ok(Math.hypot(p.pos.x - avant.x, p.pos.y - avant.y) < 2, 'Pas de téléportation pour débloquer le joueur.');
    if (e.vol?.type === 'pied') { frappe = true; break; }
  }
  assert.ok(frappe, `Le porteur ${cote} reprend ses appuis et frappe en moins de 15 secondes.`);
  assert.equal(e.piedPrepare, undefined);
}
console.log('OK — un porteur repoussé retrouve ses appuis et termine son coup de pied dans les deux sens.');
