// Sonde du Correctif 30 : ce que valent, dans de vrais matchs, les grandeurs que lisent les sélecteurs d'animations.
// Sert à régler leurs seuils sur ce que le moteur produit vraiment (`npx vite-node scripts/sonderAnimations30.ts 3`).
import { avancer } from '../src/lib/moteur/moteur';
import { creerMatchDEmpreinte } from './outilsEmpreinte';

const N = Number(process.argv[2] ?? 3);
const hauteurs: number[] = [], longueurs: number[] = [], pressions: number[] = [], mains: number[] = [], tensions: number[] = [];
let irregularites = 0, penalites = 0, dominants = 0;
for (let k = 0; k < N; k++) {
  const e = creerMatchDEmpreinte(k, { ia: 6 });
  let vol: unknown = null, sifflet: unknown = null, garde = 0, tMax = 0;
  while (!e.fini && garde++ < 400000) {
    avancer(e, 0.15);
    tMax = Math.max(tMax, e.tension ?? 0);
    if (e.vol && e.vol !== vol) {
      vol = e.vol;
      if (e.vol.type === 'passe' && e.vol.receveur) {
        hauteurs.push(e.vol.hauteur); longueurs.push(Math.hypot(e.vol.vers.x - e.vol.de.x, e.vol.vers.y - e.vol.de.y));
        mains.push(e.vol.receveur.passe);
        let p = 99;
        for (const q of e.pions) if (q.surLeTerrain && q.cote !== e.vol.receveur.cote && !q.corps) p = Math.min(p, Math.hypot(q.pos.x - e.vol.vers.x, q.pos.y - e.vol.vers.y));
        pressions.push(p);
      }
    }
    if (e.sifflet && e.sifflet !== sifflet) { sifflet = e.sifflet; if (/penalite|carton/.test(e.sifflet.cle)) { penalites++; tensions.push(e.tension ?? 0); } }
    if (e.ruck?.plaquage?.type === 'dominant' && e.ruck.debut === e.t) dominants++;
  }
  irregularites += e.compteurs.irregularites;
  console.log(`match ${k} : tension maximale ${tMax.toFixed(0)}, irrégularités ${e.compteurs.irregularites}`);
}
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2) : '—'; };
const resume = (nom: string, a: number[]) => console.log(`${nom.padEnd(34)} n=${a.length}  10 % ${q(a, 0.1)}  50 % ${q(a, 0.5)}  90 % ${q(a, 0.9)}  max ${q(a, 0.999)}`);
resume('hauteur d\'une passe (m)', hauteurs);
resume('longueur d\'une passe (m)', longueurs);
resume('défenseur le plus proche (m)', pressions);
resume('mains du receveur', mains);
resume('tension au coup de sifflet', tensions);
console.log(`pénalités ${(penalites / N).toFixed(1)} par match, irrégularités ${(irregularites / N).toFixed(2)} par match`);
