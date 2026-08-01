import { POSTES, POSTE_PAR_ID, migrerPoste } from '../src/data/rugby';
import { effectifDuClub } from '../src/lib/effectif';
import { useGame } from '../src/store/useGame';
import { SEMAINES_PAR_SAISON } from '../src/data/calendrier';
const g = () => useGame.getState();

console.log('POSTES :', POSTES.map((p) => `${p.numero} ${p.nom}`).join(' | '));
console.log('migration ancienne sauvegarde :', ['pilier', 'centre', 'ailier', 'troisieme_ligne'].map((f) => `${f}→${POSTE_PAR_ID[migrerPoste(f)].nom}`).join(', '));

const eff = effectifDuClub('Stade Toulousain', 1);
const parNumero = new Map<number, number>();
for (const j of eff) parNumero.set(POSTE_PAR_ID[j.poste].numero, (parNumero.get(POSTE_PAR_ID[j.poste].numero) ?? 0) + 1);
console.log('Toulouse par numéro :', [...parNumero.entries()].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n}:${c}`).join(' '));

g().reinitialiser();
g().creerJoueur({ nom: 'Stat Test', poste: 'demi_ouverture', nation: 'France', club: 'RC Vannes', division: 'top14', age: 22 });
useGame.setState({ joueur: { ...g().joueur!, attributs: { vitesse: 76, force: 70, endurance: 76, plaquage: 72, passe: 80, jeuAuPied: 84, vision: 82, mental: 78 }, reputation: 62 } });
for (let i = 0; i < SEMAINES_PAR_SAISON; i++) g().semaineSuivante();
const j = g().joueur!;
console.log('\nAprès 1 saison complète (ouvreur) :');
console.log(`  ${j.matchsJoues} matchs · ${j.essais} essais · note ${j.noteSaison}/10 · ${j.selections} capes`);
console.log('  stats :', JSON.stringify(j.stats));
