// SONDE DU JEU AU PIED — Correctif 40. Ce que le moteur fait VRAIMENT entre la demande d'un coup de pied et le départ du
// ballon : combien de temps, combien d'armés (un geste de frappe relancé = une animation rejouée), et de combien le botteur
// s'est déplacé. À lancer avant et après une retouche du jeu au pied.
//
//   npx vite-node scripts/sonderFrappes40.ts            (niveau des matchs de carrière)
//   IA_EMPREINTE=7 npx vite-node scripts/sonderFrappes40.ts
import { DT } from '../src/lib/moteur/moteur';
import type { DemandeDirecte } from '../src/lib/moteur/direct';
import { sonderUneFrappe, type ReleveFrappe } from './outilsFrappes40';

{
  const types: [string, DemandeDirecte][] = [
    ['rasant', { action: 'coupDePied', intentionPied: 'rasant' }],
    ['par-dessus', { action: 'coupDePied', intentionPied: 'parDessus' }],
    ['chandelle', { action: 'coupDePied', intentionPied: 'chandelle' }],
    ['dégagement', { action: 'coupDePied', intentionPied: 'degagement' }],
    ['visé long', { action: 'coupDePied', visee: { x: 1, y: 0, puissance: 0.9, vif: 0.4 } }],
    ['drop', { action: 'drop', auto: true }],
  ];
  console.log(`Niveau d'IA : ${process.env.IA_EMPREINTE ?? '(carrière)'} — pas du moteur ${DT} s\n`);
  console.log('type         allure   demande→armé   demande→contact   armés   remises   déplacement   à rebours');
  for (const [nom, demande] of types) {
    for (const v of [0, 4, 8]) {
      const lignes: ReleveFrappe[] = [];
      for (let k = 0; k < 6; k++) {
        const d = { ...demande };
        if (d.visee) d.visee = { ...d.visee, x: 1 };
        lignes.push(sonderUneFrappe(k, v, d));
      }
      const faits = lignes.filter((l) => l.demandeContact !== null);
      const moy = (f: (l: ReleveFrappe) => number) => faits.length ? faits.reduce((n, l) => n + f(l), 0) / faits.length : NaN;
      const max = (f: (l: ReleveFrappe) => number) => faits.length ? Math.max(...faits.map(f)) : NaN;
      console.log(`${nom.padEnd(12)} ${String(v).padStart(2)} m/s   ${moy((l) => l.demandeArme ?? NaN).toFixed(2).padStart(6)} s      ${moy((l) => l.demandeContact!).toFixed(2).padStart(6)} s (max ${max((l) => l.demandeContact!).toFixed(2)})   ${moy((l) => l.armes).toFixed(1).padStart(4)}    ${moy((l) => l.remises).toFixed(1).padStart(4)}      ${moy((l) => l.deplacement).toFixed(1).padStart(5)} m     ${moy((l) => l.recul).toFixed(1).padStart(4)} m   [${faits.length}/6]`);
    }
  }
}
