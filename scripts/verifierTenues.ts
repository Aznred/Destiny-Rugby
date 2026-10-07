// BANC DES TENUES DE MATCH (Correctif 24, points 4 et 5) — `npm run verify:tenues`
//
// Ce qu'il tient fermé :
//   · deux équipes ne jouent jamais dans des maillots qu'on confond, quel que soit le couple de clubs ;
//   · le club qui reçoit garde sa tenue, et un kit acheté (figé) n'est jamais repeint ;
//   · la tenue alternative du visiteur garde SA couleur sur les parements ;
//   · le texte du tableau des scores est lisible sur la couleur de chaque équipe ;
//   · un écusson se lit à sa SURFACE (fond exclu, noir et blanc admis), pas à son pixel le plus vif ;
//   · deux équipes n'ont jamais le même sigle au tableau.
import { COMPETITIONS, couleursSaisies } from '../src/data/clubs';
import { maillotDeSecours } from '../src/lib/moteur/apparenceMatch';
import { couleursEquipeTV, siglesTV } from '../src/lib/habillageTV';
import {
  analyserEcusson, couleursDuTableau, departagerLesTenues, ecartCouleur, ECART_MINIMAL, enHex, lireCouleur, texteLisibleSur,
} from '../src/lib/tenuesMatch';

const TOUS_LES_CLUBS = [...new Map(COMPETITIONS.flatMap((c) => c.clubs).map((c) => [c.nom, c])).values()];
let controles = 0, echecs = 0;
function verifier(condition: boolean, libelle: string): void {
  controles++;
  if (!condition) { echecs++; console.log(`  ❌ ${libelle}`); }
}

const contraste = (a: string, b: string): number => {
  const l = (c: string) => {
    const [r, g, bl] = lireCouleur(c)!.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const x = l(a), y = l(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// ── 1. La distance perçue ───────────────────────────────────────────────────
console.log('1. Distance perçue entre deux couleurs');
verifier(ecartCouleur('#000000', '#ffffff') > 95, 'noir et blanc sont aux deux bouts');
verifier(ecartCouleur('#c8102e', '#c8102e') === 0, 'une couleur est à zéro d\'elle-même');
verifier(ecartCouleur('#0b1f44', '#101418') < ECART_MINIMAL, 'un bleu marine et un noir se confondent');
verifier(ecartCouleur('#c8102e', '#8a1020') < ECART_MINIMAL, 'un rouge et un bordeaux se confondent');
verifier(ecartCouleur('#c8102e', '#f4c400') > ECART_MINIMAL, 'un rouge et un jaune ne se confondent pas');
verifier(ecartCouleur('#c8102e', '#0b3d91') > ECART_MINIMAL, 'un rouge et un bleu ne se confondent pas');
verifier(enHex('rgb(200, 16, 46)') === '#c8102e' && enHex('#abc') === '#aabbcc' && enHex('hsl(0, 100%, 50%)') === '#ff0000', 'les trois écritures d\'une couleur se lisent');
verifier(enHex('pas une couleur', '#123456') === '#123456', 'une couleur illisible rend le repli');

// ── 2. Tous les couples de clubs aux couleurs saisies ───────────────────────
console.log('2. Départage : tous les couples de clubs');
const clubs = TOUS_LES_CLUBS.filter((c) => couleursSaisies(c.nom));
const tenue = (c: { nom: string; c1: string; c2: string }) => ({ ...maillotDeSecours(enHex(c.c1), c.nom), secondaire: enHex(c.c2, '#ffffff') });
let couples = 0, alternatives = 0, plusProche = Infinity, coupleProche = '';
const perdus: string[] = [];
for (const a of clubs) for (const b of clubs) {
  if (a === b) continue;
  couples++;
  const A = tenue(a), B = tenue(b);
  const r = departagerLesTenues(A, B);
  const ecart = ecartCouleur(r.domicile.principal, r.exterieur.principal);
  if (ecart < plusProche) { plusProche = ecart; coupleProche = `${a.nom} – ${b.nom}`; }
  if (ecart < ECART_MINIMAL) perdus.push(`${a.nom} (${r.domicile.principal}) – ${b.nom} (${r.exterieur.principal}) : ${ecart.toFixed(1)}`);
  if (r.domicile !== A) perdus.push(`${a.nom} a changé de tenue à domicile`);
  if (r.alternative) {
    alternatives++;
    // Sa couleur d'origine reste sur lui : parements et bas.
    if (r.exterieur.secondaire !== enHex(b.c1) || r.exterieur.chaussettes !== enHex(b.c1)) perdus.push(`${b.nom} ne garde pas sa couleur en tenue alternative`);
  } else if (r.exterieur !== B) perdus.push(`${b.nom} a été repeint sans raison`);
  // Un kit acheté par le visiteur : c'est l'autre équipe qui change.
  const f = departagerLesTenues(A, B, 'exterieur');
  if (f.exterieur !== B) perdus.push(`le kit figé de ${b.nom} a été repeint`);
  if (ecartCouleur(f.domicile.principal, f.exterieur.principal) < ECART_MINIMAL) perdus.push(`kit figé : ${a.nom} – ${b.nom} se confondent encore`);
  // Rejoué sur son propre résultat, le départage ne change plus rien.
  const encore = departagerLesTenues(r.domicile, r.exterieur);
  if (encore.alternative) perdus.push(`${a.nom} – ${b.nom} : le départage n'est pas stable`);
}
verifier(clubs.length > 150, `au moins 150 clubs aux couleurs saisies (${clubs.length})`);
verifier(perdus.length === 0, `aucun couple en défaut sur ${couples} (${perdus.slice(0, 6).join(' | ')})`);
console.log(`   ${clubs.length} clubs, ${couples} couples, ${alternatives} tenues alternatives (${(100 * alternatives / couples).toFixed(1)} %), couple le plus proche après départage : ${coupleProche} (${plusProche.toFixed(1)})`);

// ── 3. Le tableau des scores ────────────────────────────────────────────────
console.log('3. Tableau des scores');
let illisibles = 0, pire = Infinity;
for (const c of TOUS_LES_CLUBS) {
  const t = couleursEquipeTV(c.c1, c.c2);
  const k = contraste(t.couleur, t.texte!);
  pire = Math.min(pire, k);
  if (k < 4.5) illisibles++;
}
verifier(illisibles === 0, `le texte est lisible (4,5:1) sur la couleur de chaque club — ${illisibles} illisibles, pire contraste ${pire.toFixed(2)}`);
verifier(couleursEquipeTV('#c8102e', '#ffffff').couleur === '#c8102e', 'le visiteur garde SA couleur au tableau (plus de blanc d\'office)');
verifier(couleursEquipeTV('#f1efe6', '#c8102e').texte === '#101613', 'texte sombre sur une tenue claire');
verifier(couleursEquipeTV('#0b1f44', '#ffffff').texte === '#ffffff', 'texte clair sur une tenue sombre');
verifier(couleursDuTableau({ principal: '#c8102e', secondaire: '#c9112f' }).lisere !== '#c9112f', 'un liseré invisible est remplacé');
verifier(texteLisibleSur('#ffd400') === '#101613', 'texte sombre sur le jaune');
{
  // Toulouse reçoit Toulon : deux rouge et noir. Le tableau affiche ce que le visiteur PORTE.
  const r = departagerLesTenues(tenue({ nom: 'Stade Toulousain', c1: '#c8102e', c2: '#000000' }), tenue({ nom: 'RC Toulon', c1: '#c1121f', c2: '#000000' }));
  verifier(r.alternative && ecartCouleur(r.exterieur.principal, '#c8102e') >= ECART_MINIMAL, 'Toulouse – Toulon : Toulon passe en tenue alternative');
  verifier(couleursEquipeTV(r.exterieur.principal, r.exterieur.secondaire).couleur === r.exterieur.principal, 'et le tableau montre cette tenue');
}

// ── 4. Les sigles ───────────────────────────────────────────────────────────
console.log('4. Sigles');
verifier(siglesTV('Stade Toulousain', 'RC Toulon')[0] !== siglesTV('Stade Toulousain', 'RC Toulon')[1], 'Toulouse et Toulon n\'ont pas le même sigle');
let jumeaux = 0, exemples: string[] = [];
const elite = TOUS_LES_CLUBS.slice(0, 220);
for (const a of elite) for (const b of elite) {
  if (a === b) continue;
  const [x, y] = siglesTV(a.nom, b.nom);
  if (x === y) { jumeaux++; if (exemples.length < 5) exemples.push(`${a.nom} / ${b.nom} → ${x}`); }
  if (x.length < 2 || x.length > 4 || y.length < 2 || y.length > 4) { jumeaux++; if (exemples.length < 5) exemples.push(`${a.nom} / ${b.nom} → « ${x} » « ${y} »`); }
}
verifier(jumeaux === 0, `aucun couple de sigles identiques sur ${elite.length} clubs (${jumeaux} : ${exemples.join(' | ')})`);

// ── 5. La lecture d'un écusson ──────────────────────────────────────────────
console.log('5. Lecture d\'un écusson');
type Zone = { x0: number; y0: number; x1: number; y1: number; c: [number, number, number, number] };
function image(cote: number, fond: [number, number, number, number], zones: Zone[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(cote * cote * 4);
  for (let y = 0; y < cote; y++) for (let x = 0; x < cote; x++) {
    let c = fond;
    for (const z of zones) if (x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1) c = z.c;
    px.set(c, (y * cote + x) * 4);
  }
  return px;
}
const T: [number, number, number, number] = [0, 0, 0, 0];
{
  // Écu rouge sur fond blanc OPAQUE, bande blanche au milieu : le fond n'est pas la couleur du club.
  const e = analyserEcusson(image(48, [255, 255, 255, 255], [
    { x0: 10, y0: 8, x1: 38, y1: 40, c: [200, 16, 46, 255] }, { x0: 10, y0: 20, x1: 38, y1: 26, c: [250, 250, 250, 255] },
  ]), 48)!;
  verifier(ecartCouleur(e.principal, '#c8102e') < 6, `fond blanc opaque : le club est rouge (${e.principal})`);
}
{
  // Écusson noir et blanc sur fond transparent, avec une petite étoile jaune : le club est noir, pas jaune.
  const e = analyserEcusson(image(48, T, [
    { x0: 8, y0: 6, x1: 40, y1: 42, c: [18, 18, 20, 255] }, { x0: 8, y0: 24, x1: 40, y1: 34, c: [245, 245, 245, 255] },
    { x0: 22, y0: 10, x1: 26, y1: 14, c: [255, 210, 0, 255] },
  ]), 48)!;
  verifier(ecartCouleur(e.principal, '#121214') < 8, `noir et blanc : le club est noir (${e.principal})`);
  verifier(ecartCouleur(e.secondaire, '#f5f5f5') < 8, `et sa seconde couleur est le blanc (${e.secondaire})`);
}
{
  // Moitié bleu, moitié jaune, liseré rouge vif d'un pixel : le liseré ne gagne pas.
  const e = analyserEcusson(image(48, T, [
    { x0: 6, y0: 6, x1: 42, y1: 42, c: [230, 20, 20, 255] },
    { x0: 7, y0: 7, x1: 26, y1: 41, c: [20, 60, 150, 255] }, { x0: 26, y0: 7, x1: 41, y1: 41, c: [245, 200, 20, 255] },
  ]), 48)!;
  verifier(ecartCouleur(e.principal, '#143c96') < 8, `bleu majoritaire : le club est bleu (${e.principal})`);
  verifier(ecartCouleur(e.secondaire, '#f5c814') < 8, `et sa seconde couleur est le jaune (${e.secondaire})`);
}
{
  // Un dégradé de vert (réparti sur plusieurs cases) pèse comme UNE couleur, et rend sa moyenne.
  const zones: Zone[] = [];
  for (let i = 0; i < 30; i++) zones.push({ x0: 9 + i, y0: 8, x1: 10 + i, y1: 40, c: [10 + i, 110 + i * 2, 50 + i, 255] });
  zones.push({ x0: 9, y0: 30, x1: 39, y1: 40, c: [240, 240, 240, 255] });
  const e = analyserEcusson(image(48, T, zones), 48)!;
  const [r, g, b] = lireCouleur(e.principal)!;
  verifier(g > r + 60 && g > b + 40, `dégradé de vert : le club est vert (${e.principal})`);
}
verifier(analyserEcusson(image(8, T, []), 8) === null, 'une image vide ne rend rien');
{
  // Une seule couleur : la seconde est inventée, lisible dessus.
  const e = analyserEcusson(image(48, T, [{ x0: 8, y0: 8, x1: 40, y1: 40, c: [10, 30, 90, 255] }]), 48)!;
  verifier(ecartCouleur(e.principal, e.secondaire) > 50, `écusson d'une seule couleur : la seconde tranche (${e.secondaire})`);
}

console.log(`\n${echecs === 0 ? '✅' : '❌'} ${controles - echecs}/${controles} contrôles`);
if (echecs) process.exit(1);
