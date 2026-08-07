// Vérification hors navigateur des nouvelles mécaniques (données amateurs,
// mercato, progression, offres). Lancer : npx vite-node scripts/verif.ts
import { jouerUneSaison } from './_saison';
import { COMPETITIONS, clubParNom } from '../src/data/clubs';
import { effectifDuClub, forceEffectif } from '../src/lib/effectif';
import { mercatoReel } from '../src/lib/mercato';
import { evoluer } from '../src/lib/progression';
import { genererOffres } from '../src/lib/offres';
import type { Joueur } from '../src/types';

const ligne = (t: string) => console.log(t);

ligne('=== DIVISIONS ===');
for (const c of COMPETITIONS.filter((x) => x.zone === 'France')) {
  const avecLogo = c.clubs.filter((k) => k.logo).length;
  ligne(`${c.nom.padEnd(14)} ${String(c.clubs.length).padStart(3)} clubs · ${avecLogo} logos`);
}

ligne('\n=== EFFECTIF AMATEUR (Régionale 1) ===');
const r1 = COMPETITIONS.find((c) => c.id === 'reg1')!;
const clubR1 = r1.clubs.find((c) => effectifDuClub(c.nom, 1).length > 12) ?? r1.clubs[0];
const eff = effectifDuClub(clubR1.nom, 1);
ligne(`${clubR1.nom} — ${eff.length} joueurs, force ${forceEffectif(clubR1.nom, 1).toFixed(1)}`);
ligne(eff.slice(0, 6).map((j) => `  ${j.nom} (${j.poste}, ${j.age} ans, ${j.note})`).join('\n'));

ligne('\n=== MERCATO RÉEL ===');
for (const nom of ['Stade Toulousain', 'RC Vannes', 'US Montauban']) {
  const m = mercatoReel(nom);
  ligne(`${nom} : ${m.arrivees.length} arrivées, ${m.departs.length} départs, ${m.prolongations.length} prolongations`);
  if (m.arrivees[0]) ligne(`  ex. arrivée : ${m.arrivees[0].nom} (${m.arrivees[0].poste}, ${m.arrivees[0].nation}, ${m.arrivees[0].age} ans)`);
}

ligne('\n=== EFFECTIF QUI BOUGE (Stade Toulousain) ===');
for (const saison of [1, 2, 3, 4]) {
  const e = effectifDuClub('Stade Toulousain', saison);
  ligne(`  saison ${saison} : ${e.length} joueurs, force ${forceEffectif('Stade Toulousain', saison).toFixed(1)}`);
}
const s1 = new Set(effectifDuClub('Stade Toulousain', 1).map((j) => j.nom));
const s3 = new Set(effectifDuClub('Stade Toulousain', 3).map((j) => j.nom));
ligne(`  arrivés entre S1 et S3 : ${[...s3].filter((n) => !s1.has(n)).slice(0, 5).join(', ')}`);
ligne(`  partis  entre S1 et S3 : ${[...s1].filter((n) => !s3.has(n)).slice(0, 5).join(', ')}`);

ligne('\n=== PROGRESSION SUR 8 SAISONS ===');
let j: Joueur = {
  nom: 'Test', poste: 'ailier_droit', nation: 'France', club: 'Stade Nantais', division: 'nationale2',
  age: 19, attributs: { vitesse: 55, force: 45, endurance: 50, plaquage: 48, passe: 47, jeuAuPied: 40, vision: 46, mental: 50 },
  forme: 75, moral: 78, reputation: 20, argent: 0, saison: 1, matchsJoues: 0, essais: 0, titres: [],
  potentiel: 82,
};
for (let s = 1; s <= 8; s++) {
  const gen = Math.round(Object.values(j.attributs).reduce((a, b) => a + b, 0) / 8);
  const ev = evoluer(j, { matchs: 18, essais: 6, forceGroupe: gen - 2, rang: 5 });
  for (const [k, v] of Object.entries(ev.deltas)) {
    j.attributs[k as keyof typeof j.attributs] = Math.max(0, Math.min(100, j.attributs[k as keyof typeof j.attributs] + (v ?? 0)));
  }
  j = { ...j, age: j.age + 1, reputation: Math.min(100, j.reputation + 5), noteSaison: ev.noteSaison, potentiel: Math.min(99, (j.potentiel ?? 80) + ev.gainPotentiel) };
  const apres = Math.round(Object.values(j.attributs).reduce((a, b) => a + b, 0) / 8);
  ligne(`  S${s} (${j.age - 1} ans) note ${ev.noteSaison}/10 → générale ${gen} → ${apres} (potentiel ${j.potentiel})`);
}

ligne('\n=== SAISON RATÉE (banc, 33 ans) ===');
const vieux: Joueur = { ...j, age: 33, noteSaison: 4 };
const evMauvais = evoluer(vieux, { matchs: 3, essais: 0, forceGroupe: 80, rang: 12 });
ligne(`  note ${evMauvais.noteSaison}/10, points ${evMauvais.points.toFixed(2)} → ${JSON.stringify(evMauvais.deltas)}`);

ligne('\n=== OFFRES ===');
for (const [titre, joueurTest] of [
  ['Espoir de Régionale (gén ~45)', { ...j, club: 'Champagnole', division: 'reg1', reputation: 15, attributs: { vitesse: 45, force: 45, endurance: 45, plaquage: 45, passe: 45, jeuAuPied: 45, vision: 45, mental: 45 } }],
  ['Cadre de Pro D2 (gén ~72)', { ...j, club: 'CA Brive', division: 'prod2', reputation: 60, attributs: { vitesse: 72, force: 72, endurance: 72, plaquage: 72, passe: 72, jeuAuPied: 72, vision: 72, mental: 72 } }],
  ['Star du Top 14 (gén ~88)', { ...j, club: 'Stade Toulousain', division: 'top14', reputation: 90, attributs: { vitesse: 88, force: 88, endurance: 88, plaquage: 88, passe: 88, jeuAuPied: 88, vision: 88, mental: 88 } }],
] as [string, Joueur][]) {
  const offres = genererOffres(joueurTest, { saison: 3, maximum: 4 });
  ligne(`  ${titre} → ${offres.length} offres`);
  for (const o of offres) {
    ligne(`     ${o.club} (${o.divisionNom}${o.etranger ? ' 🌍 ' + o.pays : ''}) note ${o.noteClub} · ${o.salaire.toLocaleString('fr-FR')} €/saison · ${o.saisons} ans`);
  }
}

ligne('\n=== CARRIÈRE COMPLÈTE (store, 8 saisons) ===');
const { useGame } = await import('../src/store/useGame');
const g = () => useGame.getState();
g().creerJoueur({ nom: 'Tino Test', poste: 'ailier_droit', nation: 'France', club: 'Champagnole', division: 'reg1', age: 18 });
for (let s = 1; s <= 8; s++) {
  const avant = g().joueur!;
  // ⚠️ On accepte ce qui se présente, pour tester la montée en gamme. Le marché
  // se négocie maintenant sur L'Ovale (`lib/negociation.ts`) : `jouerUneSaison`
  // fait le trajet complet — saison, accord, intersaison.
  const offres = g().approches.filter((a) => a.etat === 'ouverte');
  jouerUneSaison(g, (p) => useGame.setState(p));
  const apres = g().joueur!;
  const j2 = g().joueur!;
  const gen = Math.round(Object.values(j2.attributs).reduce((a, b) => a + b, 0) / 8);
  ligne(
    `  S${avant.saison} → ${j2.club} (${j2.division}) · gén ${gen} · note ${apres.noteSaison}/10 · ` +
    `${j2.matchsJoues} matchs, ${j2.essais} essais · contrat ${j2.contrat?.saisons} sais. à ${j2.contrat?.salaire.toLocaleString('fr-FR')} € · ` +
    `${offres.length} offre(s) · titres : ${j2.titres.length}`,
  );
}
ligne('  titres : ' + (g().joueur!.titres.join(', ') || 'aucun'));
ligne('  journal (derniers titres) : ' + g().journal.slice(-6).map((e) => e.titre ?? '—').join(' | '));

ligne('\n=== LOGO DU CLUB (nav / avatar) ===');
for (const n of ['Stade Toulousain', 'RC Nîmois', 'Champagnole']) {
  ligne(`  ${n} → ${clubParNom(n)?.logo ?? 'blason généré'}`);
}

ligne('\n=== CARRIÈRE À L\'ÉTRANGER (Premiership) ===');
g().reinitialiser();
g().creerJoueur({ nom: 'Star Test', poste: 'deuxieme_centre', nation: 'Angleterre', club: 'Leicester Tigers', division: 'premiership', age: 26 });
useGame.setState({
  joueur: {
    ...g().joueur!,
    attributs: { vitesse: 88, force: 86, endurance: 87, plaquage: 88, passe: 86, jeuAuPied: 80, vision: 88, mental: 88 },
    reputation: 85,
  },
});
for (let s = 1; s <= 4; s++) {
  g().saisonSuivante();
  const j3 = g().joueur!;
  const bilan = g().journal.filter((e) => e.titre?.startsWith('Bilan')).at(-1);
  ligne(`  S${s} · ${bilan?.texte?.slice(0, 90)}…`);
  ligne(`     titres : ${j3.titres.join(', ') || '—'}`);
}
