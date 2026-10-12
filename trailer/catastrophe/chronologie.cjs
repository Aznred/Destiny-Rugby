// LA CHRONOLOGIE — le montage se cale sur la voix RÉELLE, pas sur le storyboard.
//
//   node trailer/catastrophe/chronologie.cjs fr     # voix/alignement-fr.json → chronologie-fr.json + sous-titres .srt
//
// Chaque scène commence un souffle avant sa réplique et dure ce que dure la réplique ; la scène 3 garde un silence
// (le cœur qui bat) avant la chute. La même animation sert aux deux langues : seuls les instants changent.
// Ce qui est propre à une pub — ses plans, ce qu'elle montre du vrai jeu — est dans le `plan` de son textes.cjs.
const fs = require('node:fs');
const { PROJET, TEXTES, ici } = require('./projet.cjs');

const IPS = 30;
const arrondi = t => Math.round(t * IPS) / IPS;                 // les coupes tombent sur une image
const PLAN = TEXTES.plan;

function chronologie(langue) {
  const A = JSON.parse(fs.readFileSync(ici('voix', `alignement-${langue}.json`), 'utf8'));
  const T = TEXTES[langue];
  const S = A.scenes;
  const d = S.map(s => s.fin - s.debut);
  // Où la prise est découpée : au milieu du silence entre deux répliques.
  const coupes = [0, ...S.slice(1).map((s, i) => (S[i].fin + s.debut) / 2), A.duree + 0.25];

  const place = [], scenes = [];
  place[0] = 0.30;
  const c12 = arrondi(place[0] + d[0] + 0.18);
  place[1] = c12 + 0.12;
  const c23 = arrondi(place[1] + d[1] + 0.30);
  place[2] = c23 + 0.25;
  const c34 = arrondi(place[2] + d[2] + (PLAN.silence ?? 1.75));  // le silence, le cœur, la montée
  place[3] = c34 + (PLAN.retardChute ?? 0.55);                    // la voix reprend une fois la chute à l'image
  const c45 = arrondi(place[3] + d[3] + (PLAN.apresChute ?? 0.30));
  // Scène 5 : ce que la pub montre du vrai jeu, puis le carton — qui tombe sur « Gratuit » / « Play ».
  // Le nom du jeu est dit pendant les aperçus ; la voix est donc placée pour que son troisième mot arrive avec le carton.
  const titre = arrondi(c45 + PLAN.scene5.reduce((n, [, duree]) => n + duree, 0));
  place[4] = Math.max(c45 + 0.9, titre + 0.10 - (S[4].mots[2].debut - S[4].debut));
  const fin = arrondi(Math.max(place[4] + d[4] + 0.95, titre + 2.6));
  const bornes = [0, c12, c23, c34, c45, fin];
  for (let i = 0; i < 5; i++) scenes.push({ scene: i + 1, debut: bornes[i], fin: bornes[i + 1] });

  const voix = S.map((s, i) => ({ scene: i + 1, source: [Math.max(0, coupes[i]), coupes[i + 1]], a: place[i] - (s.debut - Math.max(0, coupes[i])), debut: place[i], fin: place[i] + d[i] }));
  const forts = T.repliques.map(r => new Set(r.fort.map(m => m.toLowerCase())));
  const nu = m => m.toLowerCase().replace(/[  ]?[?!.,;:…]+$/g, '').replace(/^[«"']+/, '');
  const mots = [];
  S.forEach((s, i) => s.mots.forEach(m => {
    const debut = place[i] + m.debut - s.debut, fin = place[i] + m.fin - s.debut, fort = forts[i].has(nu(m.mot));
    // Un mot composé trop long pour une ligne (« eight-hundred-kilometer-wide ») se coupe au trait d'union du milieu.
    const traits = [...m.mot].map((c, k) => c === '-' ? k : -1).filter(k => k > 0);
    if (m.mot.length > 16 && traits.length && !/\.fr/.test(m.mot)) {
      const coupe = traits.reduce((a, b) => Math.abs(b - m.mot.length / 2) < Math.abs(a - m.mot.length / 2) ? b : a) + 1;
      const milieu = debut + (fin - debut) * coupe / m.mot.length;
      mots.push({ mot: m.mot.slice(0, coupe), scene: i + 1, debut: +debut.toFixed(3), fin: +milieu.toFixed(3), fort, lie: true });
      mots.push({ mot: m.mot.slice(coupe), scene: i + 1, debut: +milieu.toFixed(3), fin: +fin.toFixed(3), fort });
    } else mots.push({ mot: m.mot, scene: i + 1, debut: +debut.toFixed(3), fin: +fin.toFixed(3), fort });
  }));

  // Les fenêtres du vrai jeu : celles de la scène 5, le carton, et — si la chute est elle-même du jeu — la scène 4 entière.
  const motsS5 = mots.filter(m => m.scene === 5);
  const jeu = {};
  let a = c45, cumul = 0;
  PLAN.scene5.forEach(([nom, duree], k) => { cumul += duree; const b = k === PLAN.scene5.length - 1 ? titre : arrondi(c45 + cumul); jeu[nom] = [a, b]; a = b; });
  if (PLAN.chute) jeu[PLAN.chute] = [c34, c45];
  jeu.titre = [titre, fin];
  jeu.accroche = motsS5[2].debut;
  jeu.adresse = (motsS5.find(m => /\.fr/.test(m.mot)) || motsS5.at(-1)).debut;

  // Les sous-titres : des groupes de un à trois mots, coupés sur la ponctuation et les silences.
  const groupes = [];
  let courant = [];
  const clore = () => { if (courant.length) { groupes.push(courant); courant = []; } };
  mots.forEach((m, i) => {
    const suivant = mots[i + 1];
    courant.push(m);
    const lettres = courant.reduce((n, x) => n + x.mot.length, 0);
    const ponctue = /[?!.,;:…]$/.test(m.mot);
    const silence = suivant ? suivant.debut - m.fin > 0.22 : true;
    const prochainLong = suivant ? lettres + suivant.mot.length > 17 : true;
    if (!suivant || suivant.scene !== m.scene || ponctue || silence || courant.length >= 3 || prochainLong) clore();
  });
  const sousTitres = groupes.map((g, i) => {
    const suivant = groupes[i + 1];
    const fin = Math.min(g.at(-1).fin + 0.42, suivant ? suivant[0].debut - 0.02 : g.at(-1).fin + 0.6);
    return { debut: +Math.max(0, g[0].debut - 0.06).toFixed(3), fin: +Math.max(fin, g.at(-1).fin).toFixed(3), scene: g[0].scene, mots: g };
  });

  // Les plans : comment chaque scène se partage (parts de sa durée). Le lecteur et la bande-son lisent ce découpage.
  const plans = [];
  for (const [scene, parts] of Object.entries(PLAN.decoupe)) {
    const s = scenes[scene - 1];
    let debut = s.debut;
    parts.forEach(([poids, nom], i) => {
      const b = i === parts.length - 1 ? s.fin : arrondi(debut + (s.fin - s.debut) * poids);
      plans.push({ nom, scene: Number(scene), debut, fin: b });
      debut = b;
    });
  }
  return { langue, ips: IPS, duree: fin, scenes, plans, voix, mots, sousTitres, jeu, accroche: T.accroche, voixSource: { id: A.voix, modele: A.modele, duree: A.duree } };
}

function horodatage(t) {
  const ms = Math.round(t * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

/** Le fichier .srt : une ligne par réplique découpée en segments lisibles (deux à six mots). */
function srt(C) {
  const lignes = [];
  let bloc = [];
  const sortir = () => { if (bloc.length) { lignes.push(bloc); bloc = []; } };
  C.mots.forEach((m, i) => {
    const suivant = C.mots[i + 1];
    bloc.push(m);
    const lettres = bloc.reduce((n, x) => n + x.mot.length + 1, 0);
    if (!suivant || suivant.scene !== m.scene || (/[?!.…]$/.test(m.mot) && lettres > 8) || (/[,;:]$/.test(m.mot) && lettres > 18) || lettres > 34) sortir();
  });
  return lignes.map((b, i) => {
    const suivant = lignes[i + 1];
    const fin = Math.min(b.at(-1).fin + 0.5, suivant ? suivant[0].debut - 0.04 : b.at(-1).fin + 0.8);
    return `${i + 1}\n${horodatage(Math.max(0, b[0].debut - 0.05))} --> ${horodatage(fin)}\n${b.map(m => m.mot).join(' ').replace(/ /g, ' ')}\n`;
  }).join('\n');
}

if (require.main === module) {
  const langue = process.argv[2] === 'en' ? 'en' : 'fr';
  const C = chronologie(langue);
  fs.writeFileSync(ici(`chronologie-${langue}.json`), JSON.stringify(C, null, 1));
  fs.mkdirSync(ici('livrables'), { recursive: true });
  fs.writeFileSync(ici('livrables', `${TEXTES.fichier}_${langue.toUpperCase()}.srt`), srt(C));
  console.log(`${langue} : ${C.duree.toFixed(2)} s — scènes ${C.scenes.map(s => s.debut.toFixed(2)).join(' | ')} | ${C.duree.toFixed(2)} — titre à ${C.jeu.titre[0].toFixed(2)} — ${C.sousTitres.length} sous-titres`);
}
module.exports = { chronologie, srt, IPS, PROJET };
