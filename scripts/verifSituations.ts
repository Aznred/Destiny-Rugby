// La base d'évènements : contextuelle, variée, et les conséquences dures.
import { SITUATIONS, situationPour, versScenario } from '../src/data/situations';
import { appliquerConsequence, lireDerapage, consequenceDuDerapage } from '../src/lib/consequences';
import type { Joueur } from '../src/types';

const base = {
  nom: 'Léo Fabre', poste: 'demi_ouverture', nation: 'France', club: 'Stade Toulousain',
  division: 'top14', saison: 3, semaine: 5, age: 24, argent: 80_000,
  forme: 75, moral: 60, reputation: 40, confianceCoach: 50, popularite: 50,
  potentiel: 82, capitaine: false,
  attributs: { vitesse: 68, force: 62, endurance: 70, plaquage: 60, passe: 72, jeuAuPied: 74, vision: 70, mental: 66 },
  contrat: { club: 'Stade Toulousain', division: 'top14', saisons: 2, salaire: 90_000 },
} as unknown as Joueur;

console.log('=== 1. LA BASE ===');
console.log(`  ${SITUATIONS.length} situations · ${SITUATIONS.reduce((n, s) => n + s.choix.length, 0)} choix au total`);
const parCat: Record<string, number> = {};
for (const s of SITUATIONS) parCat[s.categorie] = (parCat[s.categorie] ?? 0) + 1;
console.log('  par catégorie :', Object.entries(parCat).map(([k, v]) => `${k} ${v}`).join(' · '));
const dures = SITUATIONS.flatMap((s) => s.choix).filter((c) => c.issue.dur);
console.log(`  issues à conséquence dure : ${dures.length}`);
for (const d of dures) console.log(`     ${d.issue.dur!.type.padEnd(20)} ← « ${d.texte} »`);

console.log('\n=== 2. C’EST CONTEXTUEL ===');
const profils: [string, Partial<Joueur>][] = [
  ['espoir de 19 ans en Fédérale 2', { age: 19, division: 'fed2', argent: 500, reputation: 8, attributs: { ...base.attributs, vitesse: 40, force: 38, endurance: 42, plaquage: 38, passe: 44, jeuAuPied: 40, vision: 42, mental: 40 } }],
  ['cadre de 28 ans en Top 14', { age: 28, reputation: 62 }],
  ['vétéran de 34 ans', { age: 34, reputation: 70, forme: 55 }],
  ['joueur en fin de contrat', { contrat: { club: 'Stade Toulousain', division: 'top14', saisons: 0, salaire: 90_000 } as never }],
  ['joueur en délicatesse avec le staff', { confianceCoach: 25 }],
];
for (const [nom, p] of profils) {
  const j = { ...base, ...p } as Joueur;
  const eligibles = SITUATIONS.filter((s) => !s.quand || s.quand(j));
  const tires = new Set(Array.from({ length: 12 }, (_, i) => situationPour(j, [], () => (i + 0.5) / 12)?.id));
  console.log(`  ${nom.padEnd(34)} ${eligibles.length}/${SITUATIONS.length} éligibles · ex. ${[...tires].slice(0, 3).join(', ')}`);
}
{
  const jeune = { ...base, age: 19 } as Joueur;
  const vieux = { ...base, age: 35 } as Joueur;
  console.log(`  « bizutage » proposé à 19 ans : ${SITUATIONS.find((s) => s.id === 'bizutage')!.quand!(jeune) ? '✅' : '❌'}`);
  console.log(`  « bizutage » proposé à 35 ans : ${SITUATIONS.find((s) => s.id === 'bizutage')!.quand!(vieux) ? '❌ (ne devrait pas)' : '✅ écarté'}`);
  console.log(`  « le corps parle » à 35 ans : ${SITUATIONS.find((s) => s.id === 'fin-approche')!.quand!(vieux) ? '✅' : '❌'}`);
}
{
  // On ne repropose pas ce qu'on a déjà vécu.
  const vues: string[] = [];
  for (let i = 0; i < 20; i++) {
    const s = situationPour(base, vues);
    if (s) vues.push(s.id);
  }
  console.log(`  20 tirages successifs → ${new Set(vues).size} situations distinctes`);
}

console.log('\n=== 3. LES CONSÉQUENCES DURES ===');
for (const t of ['suspension', 'prison', 'accident', 'exclusionClub', 'relegationFinanciere', 'finDeCarriere', 'deces'] as const) {
  const e = appliquerConsequence(base, t, 'motif de test', 12);
  console.log(`  ${e.emoji} ${e.titre.padEnd(34)} finale=${e.finale ? 'OUI' : 'non'} · moral ${base.moral}→${e.joueur.moral} · contrat ${e.joueur.contrat ? 'gardé' : 'rompu'}`);
}

console.log('\n=== 4. LES DÉRAPAGES SUR L’OVALE ===');
const tweets: [string, string][] = [
  ['Match dur mais on lâche rien 🏉', 'rien'],
  ['L’arbitre est une catastrophe, franchement nul.', 'rien (clash autorisé)'],
  ['Ce mec est un sale race, qu’il retourne dans son pays', 'discrimination'],
  ['je vais te tuer toi et ta famille', 'menace'],
  ['soirée cocaïne avant le match, c’était chaud', 'drogue'],
];
for (const [t, attendu] of tweets) {
  const d = lireDerapage(t);
  const c = d ? consequenceDuDerapage(d) : null;
  console.log(`  « ${t.slice(0, 44).padEnd(44)} » → ${d ?? 'rien'} ${c ? `(${c.type}, ${c.semaines} sem.)` : ''} [attendu : ${attendu}]`);
}

console.log('\n=== 5. CONVERSION VERS L’ÉCRAN ===');
const sc = versScenario(SITUATIONS[0]);
console.log(`  ${sc.emoji} ${sc.titre} — ${sc.choix.length} choix, format Scenario ✅`);
