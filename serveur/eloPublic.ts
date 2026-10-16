import type { EtatCarriereEnLigne } from '../src/lib/ligue/typesCarriere.js';
import { createHash } from 'node:crypto';
import { eloInitial, nomPoulePublique, positionPublique } from '../src/lib/ligue/pyramidePublique.js';

/** Relecture déterministe des vrais scores, indépendante des écrans et sans compter un résultat deux fois. */
export function actualiserEloPublic(etat: EtatCarriereEnLigne): EtatCarriereEnLigne {
  if (!etat.publique) return etat;
  const matchs = etat.rencontres.filter(r => r.resultat)
    .sort((a, b) => a.resultat!.joueLe.localeCompare(b.resultat!.joueLe) || a.ferme.localeCompare(b.ferme) || a.id.localeCompare(b.id));
  const empreinte = createHash('sha256').update(JSON.stringify([etat.clubs.map(c => [c.id, c.nom]), matchs.map(r => [r.id, r.domicile, r.exterieur, r.ferme, r.resultat])])).digest('hex');
  if (etat.publique.empreinteElo === empreinte && etat.publique.poule) return etat;
  const depart = { ...etat.publique.eloDepart };
  for (const club of etat.clubs) depart[club.id] ??= { ...(club.eloPublic ?? eloInitial()) };
  const elos = new Map(Object.entries(depart).map(([id, elo]) => [id, { ...elo }]));
  for (const r of matchs) {
    const d = elos.get(r.domicile), e = elos.get(r.exterieur);
    if (!d || !e || !Number.isFinite(r.resultat!.pointsD) || !Number.isFinite(r.resultat!.pointsE)) continue;
    const resultat = r.resultat!;
    const score = resultat.pointsD > resultat.pointsE ? 1 : resultat.pointsD < resultat.pointsE ? 0
      : resultat.vainqueurId ? +(resultat.vainqueurId === r.domicile) : .5;
    const variation = 32 * (score - 1 / (1 + 10 ** ((e.valeur - d.valeur) / 400)));
    d.valeur += variation; e.valeur -= variation;
    d.joues++; e.joues++;
    if (score === .5) { d.nuls++; e.nuls++; }
    else if (score === 1) { d.victoires++; e.defaites++; }
    else { e.victoires++; d.defaites++; }
  }
  const publique = { ...etat.publique, ...positionPublique(etat.publique), eloDepart: depart, empreinteElo: empreinte };
  return { ...etat, publique, nom: nomPoulePublique(publique), clubs: etat.clubs.map(c => ({ ...c, eloPublic: elos.get(c.id)! })) };
}
