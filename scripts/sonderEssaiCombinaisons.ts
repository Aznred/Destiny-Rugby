// SONDE — ce que donne l'essai d'une combinaison sur le moteur d'un match de ligue (Correctif 41).
// Par phase et par niveau de défense : combien de temps avant le départ, comment l'essai finit, et aucune exception.
//   npx vite-node scripts/sonderEssaiCombinaisons.ts [essais par cas]
import { creerCombinaison } from '../src/lib/ligue/combinaisons';
import { chronologieCombinaison, creerEssaiCombinaison, jouerEssaiCombinaison, NIVEAUX_DEFENSE, SYSTEMES_DEFENSE } from '../src/lib/ligue/essaiCombinaisons';

const essais = Number(process.env.ESSAIS ?? 8);
let erreurs = 0;
for (const phase of ['ruck', 'melee', 'touche'] as const) {
  const c = creerCombinaison(`sonde-${phase}`, phase);
  const v = c.variantes[0];
  const chrono = chronologieCombinaison(c, v);
  console.log(`\n${phase} — conquête ${chrono.conquete} s, fin des gestes ${chrono.fin} s · ${chrono.lignes.map((l) => `${l.t}s ${l.action.type}${l.recu !== undefined ? `→${l.recu}s` : ''}${l.mesure ? '' : '?'}`).join(', ')}`);
  for (const niveau of NIVEAUX_DEFENSE) for (const systeme of SYSTEMES_DEFENSE) {
    const issues: Record<string, number> = {};
    let metres = 0, duree = 0, depart = 0, parties = 0;
    for (let n = 0; n < essais; n++) {
      try {
        const essai = creerEssaiCombinaison(c, v, {}, { niveau, systeme, essai: n });
        if (!essai) { issues.invalide = (issues.invalide ?? 0) + 1; continue; }
        const { bilan } = jouerEssaiCombinaison(essai);
        issues[bilan.issue] = (issues[bilan.issue] ?? 0) + 1;
        metres += bilan.metres; duree += bilan.duree;
        if (bilan.depart !== null) { depart += bilan.depart; parties++; }
        if (essai.e.pions.some((p) => !Number.isFinite(p.pos.x) || !Number.isFinite(p.pos.y)) || !Number.isFinite(essai.e.ballon.x)) { erreurs++; console.log('   ⚠️ position non finie', phase, niveau, systeme, n); }
      } catch (erreur) { erreurs++; console.log('   ⚠️ exception', phase, niveau, systeme, n, (erreur as Error).message.slice(0, 160)); }
    }
    console.log(`   ${niveau.padEnd(8)} ${systeme.padEnd(8)} départ ${(depart / Math.max(1, parties)).toFixed(1)} s (${parties}/${essais}) · durée ${(duree / essais).toFixed(1)} s · ${(metres / essais).toFixed(1)} m · ${Object.entries(issues).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  }
}
console.log(erreurs ? `\n${erreurs} erreur(s)` : '\nAucune exception, aucune position non finie.');
