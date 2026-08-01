import { NATIONS, NATIONS_PAR_ZONE } from '../src/data/rugby';
import { TRAITS, effetsTraits } from '../src/data/traits';
import { convocation } from '../src/lib/selection';
import { scoreLeadership, SEUIL_CAPITANAT } from '../src/lib/vestiaire';
import { useGame, noteGlobale } from '../src/store/useGame';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
import type { Joueur } from '../src/types';
const g = () => useGame.getState();

console.log('NATIONS :', NATIONS.length, '·', NATIONS_PAR_ZONE.map((z) => `${z.zone} ${z.nations.length}`).join(' | '));
console.log('TRAITS :', TRAITS.length, '—', TRAITS.map((t) => t.emoji + t.nom).join(' '));
console.log('cumul Professionnel+Guerrier :', JSON.stringify(effetsTraits(['professionnel', 'guerrier'])));

g().reinitialiser();
g().creerJoueur({ nom: 'Neo', poste: 'demi_ouverture', nation: 'France', club: 'Champagnole', division: 'reg1', age: 18, traits: ['travailleur', 'guerrier'] });
console.log('générale de départ :', noteGlobale(g().joueur!), '· traits', g().joueur!.traits);

const base: Joueur = { ...g().joueur!, attributs: { vitesse: 82, force: 78, endurance: 80, plaquage: 80, passe: 84, jeuAuPied: 86, vision: 85, mental: 84 }, reputation: 70 };
for (const [n, nation] of [['France', 'France'], ['Italie', 'Italie'], ['Belgique', 'Belgique']] as [string, string][]) {
  const c = convocation({ ...base, nation }, 0.5, 1);
  console.log(`  sélection ${n.padEnd(9)} niveau ${c.niveau.toFixed(1)} vs exigé ${c.exige.toFixed(1)} → ${c.selectionne ? 'CONVOQUÉ' : 'pas retenu'}`);
}
console.log('leadership (cadre 30 ans, mental 84, rép 70, groupe 70) :', scoreLeadership({ ...base, age: 30 }, 70).toFixed(0), '/ seuil', SEUIL_CAPITANAT);

g().reinitialiser();
g().creerJoueur({ nom: 'Cap', poste: 'numero_8', nation: 'France', club: 'RC Vannes', division: 'top14', age: 27, traits: ['leader', 'professionnel'] });
useGame.setState({ joueur: { ...g().joueur!, attributs: { vitesse: 80, force: 86, endurance: 84, plaquage: 86, passe: 74, jeuAuPied: 60, vision: 80, mental: 86 }, reputation: 72 } });
for (let s = 0; s < 3; s++) {
  for (let i = 0; i < SEMAINES_PAR_SAISON; i++) g().semaineSuivante();
  useGame.setState({ tropheesEnAttente: [], offres: [], offresOuvertes: false });
}
const j = g().joueur!;
console.log(`3 saisons : capitaine=${j.capitaine} · ${j.relations?.length ?? 0} relations · ${j.selections ?? 0} capes · ${j.matchsJoues} matchs`);
console.log('  relations :', (j.relations ?? []).map((r) => `${r.type === 'ami' ? '🤝' : '⚡'} ${r.nom}`).join(', ') || 'aucune');
