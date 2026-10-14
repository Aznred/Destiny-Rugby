// ÉTALONNAGE — ce que valent, sur le moteur, les grandeurs que lisent les conditions d'une combinaison (Correctif 41).
// On regarde l'instant où le 10 doit donner (0,3 s après sa réception), selon le système et le niveau de la défense.
//   npx vite-node scripts/etalonnerConditions.ts     (ESSAIS=30)
import { creerCombinaison } from '../src/lib/ligue/combinaisons';
import { creerEssaiCombinaison, SYSTEMES_DEFENSE } from '../src/lib/ligue/essaiCombinaisons';
import { defenseurPresent } from '../src/lib/moteur/ia/lecture';
import { lireLeSurnombre, regarderDevant, ligneDePasseCoupee } from '../src/lib/moteur/ia/vision';
import { distance } from '../src/lib/moteur/terrain';

const essais = Number(process.env.ESSAIS ?? 24);
const q = (v: number[], p: number) => { const t = [...v].sort((a, b) => a - b); return t.length ? t[Math.min(t.length - 1, Math.floor(p * t.length))] : NaN; };
const f = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '—').padStart(5);
const resume = (v: number[]) => `${f(q(v, .1))} ${f(q(v, .5))} ${f(q(v, .9))}`;

console.log('système/niveau      n | distance (10·50·90) | fermeture | déf→12 | déf devant 13 | ailier dx | ligne dx | couv. | intervalle larg. | côté ext % | surnombre ext % | passe coupée %');
for (const systeme of SYSTEMES_DEFENSE) for (const niveau of ['faible', 'normale', 'forte'] as const) {
  const m = { dist: [] as number[], ferm: [] as number[], d12: [] as number[], d13: [] as number[], ailier: [] as number[], ligne: [] as number[], couv: [] as number[], larg: [] as number[] };
  let n = 0, ext = 0, inter = 0, sur = 0, coupe = 0;
  for (let i = 0; i < essais; i++) {
    const c = creerCombinaison('etalon', 'ruck');
    const essai = creerEssaiCombinaison(c, c.variantes[0], {}, { niveau, systeme, essai: i });
    if (!essai) continue;
    let vu = false, garde = 300;
    while (garde-- > 0 && !vu && essai.avancer()) {
      const e = essai.e, cc = e.combinaisonEnCours, p = e.porteur;
      if (!cc || cc.index !== 1 || !p || p.numero !== 10 || e.phase !== 'jeuCourant' || e.sim - cc.depuis < .3) continue;
      vu = true; n++;
      const s = 1, cote = p.pos.y - cc.origine.y >= 0 ? 1 : -1;
      const rideau = e.pions.filter((d) => d.cote === 'B' && d.surLeTerrain && defenseurPresent(e, d));
      const vue = regarderDevant(e, p);
      m.dist.push(vue.distance);
      m.ferm.push(Math.max(0, ...rideau.filter((d) => distance(d.pos, p.pos) < 10 && (d.pos.x - p.pos.x) * s > 0).map((d) => -d.vitesse.x * s)));
      const r12 = e.pions.find((x) => x.cote === 'A' && x.numero === 12)!, r13 = e.pions.find((x) => x.cote === 'A' && x.numero === 13)!;
      m.d12.push(Math.min(...rideau.map((d) => distance({ x: d.pos.x + d.vitesse.x * .3, y: d.pos.y + d.vitesse.y * .3 }, r12.pos))));
      m.d13.push(Math.min(99, ...rideau.filter((d) => (d.pos.x - r13.pos.x) * s > -1 && Math.abs(d.pos.y - r13.pos.y) < 5).map((d) => distance(d.pos, r13.pos))));
      const large = rideau.filter((d) => (d.pos.y - p.pos.y) * cote > 8).sort((a, b) => (b.pos.y - a.pos.y) * cote)[0];
      const ligne = rideau.filter((d) => (d.pos.x - p.pos.x) * s > 0 && (d.pos.x - p.pos.x) * s < 12 && d !== large);
      if (large) {
        m.ailier.push((large.pos.x - p.pos.x) * s);
        m.couv.push(rideau.filter((d) => d !== large && (d.pos.x - large.pos.x) * s > 6 && Math.abs(d.pos.y - large.pos.y) < 16).length);
      }
      if (ligne.length) m.ligne.push(ligne.reduce((a, d) => a + (d.pos.x - p.pos.x) * s, 0) / ligne.length);
      if (vue.intervalle) { m.larg.push(vue.intervalle.largeur); inter++; if ((vue.intervalle.y - p.pos.y) * cote > .5) ext++; }
      const sn = lireLeSurnombre(e, p);
      if (sn && sn.cote === cote) sur++;
      if (ligneDePasseCoupee(e, p, r12)) coupe++;
    }
  }
  console.log(`${`${systeme}/${niveau}`.padEnd(17)} ${String(n).padStart(3)} | ${resume(m.dist)} | ${resume(m.ferm)} | ${resume(m.d12)} | ${resume(m.d13)} | ${resume(m.ailier)} | ${resume(m.ligne)} | ${resume(m.couv)} | ${resume(m.larg)} (${inter}) | ${inter ? Math.round(ext / inter * 100) : 0} | ${n ? Math.round(sur / n * 100) : 0} | ${n ? Math.round(coupe / n * 100) : 0}`);
}
