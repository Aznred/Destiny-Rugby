// SONDE — le cahier vivant (Correctif 41) : à quelle fréquence chaque condition est vraie selon la défense, ce que
// donnent les exemples de la bibliothèque, et ce que la touche enrichie produit (double faux saut, changement de bloc, maul).
//   npx vite-node scripts/sonderCahierVivant.ts            (ESSAIS=20 pour plus de tirages)
import { CONDITIONS_COMBINAISON, creerCombinaison, type Combinaison, type ConditionCombinaison, type VarianteCombinaison } from '../src/lib/ligue/combinaisons';
import { creerEssaiCombinaison, jouerEssaiCombinaison, SYSTEMES_DEFENSE } from '../src/lib/ligue/essaiCombinaisons';
import { EXEMPLES_COMBINAISONS, exempleCombinaison } from '../src/lib/ligue/exemplesCombinaisons';

const essais = Number(process.env.ESSAIS ?? 12);

console.log('── Conditions : part des essais où l\'option est jouée (ruck, 9 → 10 → 12, lue quand le 10 doit donner)');
for (const condition of CONDITIONS_COMBINAISON) {
  const c: Combinaison = creerCombinaison('sonde', 'ruck');
  const v: VarianteCombinaison = { ...c.variantes[0], options: [{ etape: 1, condition, reponse: condition === 'joueurLibre' ? { type: 'passe', destinataire: 13 } : { type: 'garder' } }] };
  const ligne: string[] = [];
  for (const systeme of SYSTEMES_DEFENSE) for (const niveau of ['faible', 'forte'] as const) {
    let jouees = 0, parties = 0;
    for (let n = 0; n < essais; n++) {
      const essai = creerEssaiCombinaison(c, v, {}, { niveau, systeme, essai: n });
      if (!essai) continue;
      const { bilan } = jouerEssaiCombinaison(essai);
      if (bilan.depart !== null) parties++;
      if (bilan.option === (condition as ConditionCombinaison)) jouees++;
    }
    ligne.push(`${systeme}/${niveau} ${jouees}/${parties}`);
  }
  console.log(`${condition.padEnd(20)} ${ligne.join(' · ')}`);
}

console.log('\n── Bibliothèque : chaque exemple, joué contre une défense normale');
let erreurs = 0;
for (const { id } of EXEMPLES_COMBINAISONS) {
  const c = exempleCombinaison(id, `ex-${id}`, id);
  if (!c) { console.log(`${id.padEnd(16)} INVALIDE`); erreurs++; continue; }
  const issues: Record<string, number> = {}; let metres = 0, mauls = 0, feintes = 0, glissements = 0, raccords = 0;
  for (let n = 0; n < essais; n++) {
    try {
      const essai = creerEssaiCombinaison(c, c.variantes[0], {}, { niveau: 'normale', systeme: 'glissee', essai: n });
      if (!essai) { issues.invalide = (issues.invalide ?? 0) + 1; continue; }
      let maul = false, raccord = false;
      if (essai.e.conquete?.feintes?.length === 2) feintes++;
      if (essai.e.conquete?.glissement) glissements++;
      let garde = 400;
      while (garde-- > 0 && essai.avancer()) {
        if (essai.e.phase === 'maul') maul = true;
        if (maul && essai.e.combinaisonEnCours && essai.e.combinaisonEnCours.index > 0) raccord = true;
      }
      const bilan = essai.bilan();
      issues[bilan.issue] = (issues[bilan.issue] ?? 0) + 1; metres += bilan.metres; mauls += Number(maul); raccords += Number(raccord);
    } catch (e) { erreurs++; console.log(`${id} EXCEPTION ${(e as Error).message}`); }
  }
  console.log(`${id.padEnd(16)} ${String(c.variantes[0].actions.length).padStart(2)} gestes · ${(metres / essais).toFixed(1).padStart(5)} m · ${Object.entries(issues).map(([k, n]) => `${k} ${n}`).join(', ')}`
    + (feintes ? ` · double feinte ${feintes}` : '') + (glissements ? ` · glissement ${glissements}` : '') + (mauls ? ` · maul ${mauls}, reprise ${raccords}` : ''));
}
console.log(erreurs ? `\n${erreurs} problème(s).` : '\nAucune exception, tous les exemples sont valides.');
