// Contrôle éditorial et mécanique de la bibliothèque de situations.
import { SITUATIONS, situationPour, versScenario } from '../src/data/situations';
import { TEXTES_SITUATIONS } from '../src/data/textesSituations';
import { appliquerConsequence, consequenceDuDerapage, lireDerapage } from '../src/lib/consequences';
import type { Joueur } from '../src/types';

const base = {
  nom: 'Léo Fabre', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain',
  division: 'top14', saison: 3, semaine: 5, age: 24, argent: 80_000,
  forme: 75, moral: 60, reputation: 40, confianceCoach: 50, popularite: 50,
  potentiel: 82, capitaine: false,
  attributs: { vitesse: 68, force: 62, endurance: 70, plaquage: 60, passe: 72, jeuAuPied: 74, vision: 70, mental: 66 },
  contrat: { club: 'Stade Toulousain', division: 'top14', saisons: 2, salaire: 90_000 },
} as unknown as Joueur;

let echecs = 0;
function verifier(ok: boolean, message: string): void {
  console.log(`  ${ok ? '✅' : '❌'} ${message}`);
  if (!ok) echecs++;
}

console.log('=== 1. BIBLIOTHÈQUE ===');
const ids = new Set<string>();
const categories = new Map<string, number>();
// Le catalogue s'enrichit régulièrement : on protège son socle sans rendre
// chaque ajout légitime incompatible avec ce contrôle.
verifier(SITUATIONS.length >= 151, `${SITUATIONS.length} situations (au moins 151 attendues)`);
for (const situation of SITUATIONS) {
  verifier(!!situation.id && !ids.has(situation.id), `identifiant unique : ${situation.id}`);
  ids.add(situation.id);
  categories.set(situation.categorie, (categories.get(situation.categorie) ?? 0) + 1);
  verifier(!!situation.titre.trim() && !!situation.situation.trim(), `texte complet : ${situation.id}`);
  verifier(situation.choix.length >= 2 && situation.choix.length <= 4, `2 à 4 choix : ${situation.id}`);
  for (const [index, choix] of situation.choix.entries()) {
    const impact = Object.values(choix.issue.deltas).some((v) => v !== 0)
      || choix.issue.ovas !== 0 || !!choix.issue.coach || !!choix.issue.fans
      || !!choix.issue.marche || !!choix.issue.dur;
    verifier(!!choix.texte.trim() && !!choix.issue.recit.trim() && impact,
      `choix ${index + 1} jouable : ${situation.id}`);
  }
}
for (const categorie of ['vestiaire', 'argent', 'medias', 'perso', 'corps', 'nuit', 'club', 'carriere']) {
  verifier((categories.get(categorie) ?? 0) >= 10, `${categorie} : ${categories.get(categorie) ?? 0} situations`);
}

console.log('\n=== 2. CONTEXTE ET NON-RÉPÉTITION ===');
const profils: [string, Partial<Joueur>][] = [
  ['espoir', { age: 19, division: 'fed2', reputation: 8 }],
  ['cadre', { age: 28, reputation: 62 }],
  ['vétéran', { age: 35, reputation: 70, forme: 55 }],
  ['fin de contrat', { contrat: { club: base.club, division: 'top14', saisons: 0, salaire: 90_000 } }],
];
for (const [nom, partiel] of profils) {
  const joueur = { ...base, ...partiel } as Joueur;
  const eligibles = SITUATIONS.filter((s) => !s.quand || s.quand(joueur));
  verifier(eligibles.length >= 80, `${nom} : ${eligibles.length} situations éligibles`);
}
const vues: string[] = [];
for (let i = 0; i < 30; i++) {
  const situation = situationPour(base, vues);
  if (situation) vues.push(situation.id);
}
verifier(new Set(vues).size === 30, '30 tirages successifs sans répétition');

console.log('\n=== 3. TRADUCTIONS HISTORIQUES ET REPLI ===');
const langues = ['fr', 'en', 'es', 'it', 'de', 'pt', 'ja'] as const;
const historiques = SITUATIONS.slice(0, 51);
const manquantes = historiques.flatMap((s) => {
  const suffixes = ['titre', 'txt', ...s.choix.flatMap((_, i) => [`c${i}`, `r${i}`])];
  return suffixes.filter((suffixe) => {
    const entree = TEXTES_SITUATIONS[`sit.${s.id}.${suffixe}`];
    return !entree || langues.some((langue) => !entree[langue]?.trim());
  });
});
verifier(manquantes.length === 0, 'les 51 scènes historiques restent traduites dans les 7 langues');
verifier(versScenario(SITUATIONS[51]).titre === SITUATIONS[51].titre,
  'les nouvelles scènes disposent du repli français sans clé visible');

console.log('\n=== 4. CONSÉQUENCES ET CONVERSION ===');
for (const type of ['suspension', 'prison', 'accident', 'exclusionClub', 'relegationFinanciere', 'finDeCarriere', 'deces'] as const) {
  const effet = appliquerConsequence(base, type, 'motif de test', 12);
  verifier(!!effet.titre && !!effet.joueur, `conséquence ${type} appliquée`);
}
for (const texte of ['Match dur mais on lâche rien 🏉', 'je vais te tuer toi et ta famille', 'soirée cocaïne avant le match']) {
  const derapage = lireDerapage(texte);
  if (derapage) verifier(!!consequenceDuDerapage(derapage), `dérapage ${derapage} relié à une conséquence`);
}
const scenario = versScenario(SITUATIONS[0]);
verifier(scenario.choix.length === SITUATIONS[0].choix.length, 'conversion vers l’écran sans perte de choix');

console.log(`\n${echecs ? `❌ ${echecs} échec(s)` : '✅ TOUT PASSE'}`);
process.exitCode = echecs ? 1 : 0;
