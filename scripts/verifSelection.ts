// VÉRIFICATION — LA SÉLECTION NATIONALE EST ATTEIGNABLE, MÊME AVEC UNE PETITE NATION
//
// Retour de jeu, mot pour mot : « au niveau des sélections c'est dur à atteindre
// des sélections pour des nations faibles alors qu'on est très bon ».
//
// ⚠️ LA CAUSE N'ÉTAIT PAS LE PALIER, C'ÉTAIT LE CALENDRIER. `convocation()`
// ouvrait grand la porte aux petites nations (palier par défaut : 55, et presque
// aucune concurrence dans les effectifs professionnels)… mais `fenetreDe()`
// retenait la PREMIÈRE compétition de la fenêtre, toujours la même : le Tournoi
// des 6 Nations en février, la tournée d'automne en novembre. Un Belge, un
// Portugais ou un Roumain n'y figure pas — il n'était donc JAMAIS aligné, quel
// que soit son niveau, alors que le Rugby Europe Championship se jouait sur la
// même fenêtre. `fenetreInternationale(semaine, saison, nation)` retient
// désormais en priorité la compétition où LA nation du joueur est engagée.
//
// Ce script contrôle quatre choses :
//   1. chaque nation testée a bien une compétition sur les fenêtres du calendrier ;
//   2. un très bon joueur d'une petite nation est convoqué ;
//   3. il joue VRAIMENT (une affiche existe pour sa sélection) ;
//   4. les grandes nations n'ont pas été bradées au passage.
//
// Lancer : npx vite-node scripts/verifSelection.ts

import type { Joueur } from '../src/types';
import { CALENDRIER } from '../src/data/calendrier';
import {
  fenetreInternationale, matchInternationalDuJoueur, competitionsDeLaSaison, forceNation,
} from '../src/lib/international';
import { convocation, niveauExige, niveauInternational } from '../src/lib/selection';
import { nomNation } from '../src/components/Drapeau';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(46)} ${valeur}`);
}

const SEMAINES_INTER = CALENDRIER
  .map((s, i) => ({ s, numero: i + 1 }))
  .filter(({ s }) => s.type === 'international')
  .map(({ numero }) => numero);

// Un joueur volontairement TRÈS BON : c'est le cas du retour de jeu.
function joueur(nation: string, niveau: number, age = 26): Joueur {
  return {
    nom: 'Test International', poste: 'demi_ouverture', nation, club: 'Stade Toulousain',
    division: 'top14', age,
    attributs: {
      vitesse: niveau, force: niveau, endurance: niveau, plaquage: niveau,
      passe: niveau, jeuAuPied: niveau, vision: niveau, mental: niveau,
    },
    forme: 85, moral: 80, reputation: Math.min(95, niveau + 5), argent: 0, saison: 1,
    semaine: 1, matchsJoues: 60, essais: 12, titres: [],
  };
}

// Les nations « faibles » du retour de jeu : hors 6 Nations, hors Rugby
// Championship, hors tournée d'automne. Ce sont exactement celles qui ne
// pouvaient jamais être appelées.
const PETITES = ['Portugal', 'Roumanie', 'Espagne', 'Belgique', 'Pays-Bas', 'Allemagne', 'Suisse'];
const GRANDES = ['France', 'Italie', 'Nouvelle-Zélande', 'Argentine'];

console.log(`=== LE CALENDRIER : ${SEMAINES_INTER.length} fenêtres internationales ===`);
console.log(`    semaines ${SEMAINES_INTER.join(', ')}`);
console.log(`    ${competitionsDeLaSaison(1).length} compétitions de sélections déclarées`);

console.log('\n=== 1. CHAQUE NATION A UNE COMPÉTITION SUR SA FENÊTRE ===');
for (const nation of [...PETITES, ...GRANDES]) {
  const trouvees = SEMAINES_INTER
    .map((n) => fenetreInternationale(n, 1, nation))
    .filter((f) => f && f.competition.equipes.includes(nation));
  ligne(nation,
    trouvees.length
      ? `${trouvees.length}/${SEMAINES_INTER.length} fenêtres · ${[...new Set(trouvees.map((f) => f!.competition.nom))].join(', ')}`
      : 'AUCUNE compétition — jamais convoqué',
    trouvees.length > 0);
}

console.log('\n=== 2. UN TRÈS BON JOUEUR D’UNE PETITE NATION EST CONVOQUÉ ===');
for (const nation of PETITES) {
  const j = joueur(nation, 78);
  // `alea = 0.5` : le tirage médian, pour une mesure reproductible.
  const conv = convocation(j, 0.5);
  ligne(nation,
    `niveau ${Math.round(conv.niveau)} vs exigé ${Math.round(conv.exige)} (palier ${niveauExige(nation)}, force nation ${forceNation(nation)})`,
    conv.selectionne);
}

console.log('\n=== 3. IL JOUE VRAIMENT : UNE AFFICHE EXISTE POUR SA SÉLECTION ===');
for (const nation of PETITES) {
  const j = joueur(nation, 78);
  const affiches = SEMAINES_INTER
    .map((n) => matchInternationalDuJoueur({ ...j, semaine: n }))
    .filter(Boolean);
  const exemple = affiches[0];
  ligne(nation,
    affiches.length
      ? `${affiches.length} affiche(s) · ex. ${exemple!.match.domicile} ${exemple!.match.scoreD}-${exemple!.match.scoreE} ${exemple!.match.exterieur} (${exemple!.competition.nom})`
      : 'aucune affiche',
    affiches.length > 0);
}

console.log('\n=== 4. LES GRANDES NATIONS RESTENT EXIGEANTES ===');
for (const nation of GRANDES) {
  // Un joueur MOYEN de son championnat ne doit toujours pas être appelé.
  const moyen = convocation(joueur(nation, 62), 0.5);
  const star = convocation(joueur(nation, 90), 0.5);
  ligne(`${nation} — un joueur moyen reste dehors`,
    `niveau ${Math.round(moyen.niveau)} vs ${Math.round(moyen.exige)}`, !moyen.selectionne);
  ligne(`${nation} — une star est prise`,
    `niveau ${Math.round(star.niveau)} vs ${Math.round(star.exige)}`, star.selectionne);
}

console.log('\n=== 5. LA HIÉRARCHIE TIENT : plus la nation est forte, plus c’est dur ===');
{
  const paliers = [...PETITES, ...GRANDES]
    .map((n) => ({ n, exige: convocation(joueur(n, 78), 0.5).exige, force: forceNation(n) }))
    .sort((a, b) => b.force - a.force);
  console.log(paliers.map((p) => `     ${p.n.padEnd(18)} force ${p.force} → exige ${Math.round(p.exige)}`).join('\n'));
  const decroissant = paliers.every((p, i) => i === 0 || paliers[i - 1].exige >= p.exige - 6);
  ligne('le palier suit la force de la nation', decroissant ? 'oui' : 'inversions', decroissant);
}

// Un contrôle de non-régression : le niveau international reste sur l'échelle
// des notes de joueur (0-100), sinon toutes les comparaisons ci-dessus mentent.
{
  const n = niveauInternational(joueur('France', 80));
  ligne('le niveau international est sur l’échelle des notes', `${Math.round(n)} pour 80 de générale`, n >= 75 && n <= 90);
  ligne('nomNation reste stable', nomNation('France'), nomNation('France') === 'France');
}

console.log(echecs === 0 ? '\n✅ Sélections atteignables.' : `\n❌ ${echecs} contrôle(s) en échec.`);
