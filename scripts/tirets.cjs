/**
 * Outil de passe : trouver — et réécrire — les tirets cadratins dans les
 * TEXTES AFFICHÉS, sans jamais toucher aux commentaires du code.
 *
 * ⚠️ UN `sed` GLOBAL AURAIT ÉTÉ FAUX. Sur 1 707 tirets cadratins du dossier
 * `src/`, la grande majorité vit dans les commentaires — qui font la
 * documentation de ce projet et que personne ne lit en jeu. Il faut donc un
 * petit lexeur : on suit l'état (code · commentaire · chaîne · gabarit) et on
 * ne réécrit que ce qui est à l'intérieur d'une chaîne.
 *
 *   node scripts/_tirets.cjs            # inventaire, rien n'est écrit
 *   node scripts/_tirets.cjs --ecrire   # applique
 */

const fs = require('fs');
const path = require('path');

const ECRIRE = process.argv.includes('--ecrire');
const RACINE = 'src';

/** Les caractères jugés « bizarres » : cadratin, demi-cadratin, signe moins. */
const TIRETS = /[—–−‑]/;

function fichiers(dir, sortie = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fichiers(p, sortie);
    else if (/\.tsx?$/.test(e.name)) sortie.push(p);
  }
  return sortie;
}

/**
 * Découpe un fichier TypeScript en segments, en marquant ceux qui sont du
 * TEXTE (chaîne ou gabarit) et ceux qui n'en sont pas.
 *
 * ⚠️ LES GABARITS PEUVENT S'IMBRIQUER (`${ `${x}` }`) : d'où la pile.
 */
function segmenter(src) {
  const segs = [];
  let debut = 0;
  let i = 0;
  const pousser = (fin, texte) => {
    if (fin > debut) segs.push({ code: src.slice(debut, fin), texte });
    debut = fin;
  };
  // Pile des gabarits ouverts, pour savoir si `}` referme une interpolation.
  const gabarits = [];
  let profondeurAccolade = 0;

  while (i < src.length) {
    const c = src[i];
    const suivant = src[i + 1];

    // Commentaires
    if (c === '/' && suivant === '/') {
      pousser(i, false);
      while (i < src.length && src[i] !== '\n') i++;
      pousser(i, false);
      continue;
    }
    if (c === '/' && suivant === '*') {
      pousser(i, false);
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      pousser(i, false);
      continue;
    }

    // Chaînes simples et doubles
    if (c === "'" || c === '"') {
      pousser(i + 1, false);
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
      pousser(i, true);
      i++;
      pousser(i, false);
      continue;
    }

    // Gabarits
    if (c === '`') {
      pousser(i + 1, false);
      gabarits.push(profondeurAccolade);
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') break;
        if (src[i] === '$' && src[i + 1] === '{') break;
        i++;
      }
      pousser(i, true);
      if (src[i] === '`') { i++; gabarits.pop(); pousser(i, false); continue; }
      // On entre dans une interpolation : on repasse en mode code.
      i += 2;
      profondeurAccolade++;
      pousser(i, false);
      continue;
    }

    if (c === '{' && gabarits.length) { profondeurAccolade++; i++; continue; }
    if (c === '}' && gabarits.length && profondeurAccolade === gabarits[gabarits.length - 1] + 1) {
      // Fin d'interpolation : on retourne dans le gabarit.
      profondeurAccolade--;
      pousser(i + 1, false);
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '`') break;
        if (src[i] === '$' && src[i + 1] === '{') break;
        i++;
      }
      pousser(i, true);
      if (src[i] === '`') { i++; gabarits.pop(); pousser(i, false); continue; }
      i += 2;
      profondeurAccolade++;
      pousser(i, false);
      continue;
    }
    if (c === '}' && gabarits.length) { profondeurAccolade--; i++; continue; }

    i++;
  }
  pousser(src.length, false);
  return segs;
}

/**
 * La règle de réécriture, et c'est elle qui décide si le résultat se lit bien.
 *
 * ⚠️ ON NE REMPLACE PAS TOUT PAR LE MÊME CARACTÈRE. Un tiret cadratin français
 * joue trois rôles différents, et les confondre donne des phrases bancales :
 *
 *   1. il relie deux propositions      → une VIRGULE
 *      « le brassard te tend les bras — mais tu passes ton temps… »
 *   2. il annonce une valeur           → DEUX-POINTS
 *      « À débloquer en boutique — 140 Ovas »
 *   3. il ouvre une ligne ou une puce  → on le SUPPRIME
 *      « — choisis-en 2 »
 */
/**
 * La langue d’une chaîne, lue sur le CODE qui la précède.
 *
 * ⚠️ INDISPENSABLE, ET DÉCOUVERT À LA RELECTURE DU DIFF. Le dictionnaire range
 * les sept langues côte à côte (`{ fr: '…', de: '…', ja: '…' }`), et deux
 * d’entre elles ne se ponctuent pas comme le français :
 *
 *   · en ALLEMAND tous les noms communs portent une majuscule. La règle
 *     « majuscule à droite → deux-points » y tirait donc au hasard :
 *     « lass die KI über deine Karriere urteilen — Spiel für Spiel » devenait
 *     « … urteilen : Spiel für Spiel » au lieu d’une virgule.
 *   · en JAPONAIS le tiret long s'écrit DOUBLE et SANS espaces (« 裁く——試合 »).
 *     Aucune règle à espaces ne l’attrapait, et le repli en faisait « -- ».
 *     La ponctuation qui convient est la virgule idéographique, « 、 ».
 */
function langueDe(codeAvant) {
  // ⚠️ Le segmenteur pousse le guillemet OUVRANT dans le segment de code qui
  //    précède : sans l'accepter ici, la détection ne matchait jamais et les
  //    sept langues passaient toutes pour du français.
  const m = /\b(fr|en|es|it|de|pt|ja)\s*:\s*['"`]?$/.exec(codeAvant ?? "");
  return m ? m[1] : "fr";
}

function reecrire(texte, langue = "fr") {
  let s = texte;

  // 0. ⚠️ UN SEGMENT QUI N’EST QU’UN TIRET EST UN SÉPARATEUR, PAS UNE
  //    PONCTUATION. Deux cas, et les deux se cassaient avec les règles
  //    suivantes : le séparateur de score (`${a} – ${b}` devenait « 34, 11 »)
  //    et le tiret de tête d’un gabarit (` — ${potentiel}`, effacé, laissait
  //    « 62Potentiel 88 »). Un gabarit est découpé à chaque `${` : ces
  //    morceaux-là n’ont ni début ni fin de phrase, seulement un rôle.
  if (/^[^\S\n]*[—–−‑][^\S\n]*$/.test(s)) return s.replace(/[—–−‑]/g, "-");

  // Japonais : virgule idéographique, espaces compris s’il y en a.
  if (langue === "ja") return s.replace(/[^\S\n]*[—–]+[^\S\n]*/g, "、");
  // Et partout ailleurs, un tiret collé à du CJK suit la même règle.
  s = s.replace(
    /(?<=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])[^\S\n]*[—–]+[^\S\n]*/gu, "、");

  // 3. En début de LIGNE (jamais en début de segment : voir ci-dessus), le
  //    tiret décoratif disparaît.
  s = s.replace(/(\\n|\n)[^\S\n]*[—–][^\S\n]+/g, "$1");
  // 2. Devant une VALEUR : deux-points. ⚠️ La majuscule ne compte que hors
  //    allemand, où elle ne veut rien dire (« Spiel », « Karriere »…).
  const valeur = langue === "de"
    ? /[^\S\n][—–][^\S\n](?=[0-9{$]|\p{Extended_Pictographic})/gu
    : /[^\S\n][—–][^\S\n](?=[0-9{$«]|\p{Lu}|\p{Extended_Pictographic})/gu;
  s = s.replace(valeur, " : ");
  // 2 bis. Un tiret EN FIN DE SEGMENT annonce l’interpolation qui suit : c’est
  //    presque toujours une valeur (« Séance réussie — +5 de plaquage »,
  //    « Secteur de travail — Plaquage »). Deux-points, donc, et pas virgule.
  s = s.replace(/,?[^\S\n][—–][^\S\n]*$/, " : ");
  // 1. Partout ailleurs : virgule, en absorbant celle qui précède déjà.
  s = s.replace(/,?[^\S\n][—–][^\S\n]/g, ", ");
  // Les restes : tiret isolé « pas de valeur », composés collés, signes moins.
  s = s.replace(/[—–‑−]/g, "-");
  return s;
}
let totalAvant = 0;
let totalApres = 0;
let touches = 0;
const exemples = [];

for (const f of fichiers(RACINE)) {
  const src = fs.readFileSync(f, 'utf8');
  if (!TIRETS.test(src)) continue;
  const segs = segmenter(src);
  let sortie = '';
  let modifie = false;
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k];
    if (!seg.texte) { sortie += seg.code; continue; }
    totalAvant += (seg.code.match(/[—–−‑]/g) ?? []).length;
    // La langue se lit sur le code qui précède : `de: '…'`, `ja: '…'`.
    const neuf = reecrire(seg.code, langueDe((segs[k - 1] ?? {}).code));
    if (neuf !== seg.code) {
      modifie = true;
      if (exemples.length < 12) exemples.push([f, seg.code.trim().slice(0, 88), neuf.trim().slice(0, 88)]);
    }
    totalApres += (neuf.match(/[—–−‑]/g) ?? []).length;
    sortie += neuf;
  }
  // Garde-fou : le lexeur ne doit RIEN changer d'autre que des tirets.
  // ⚠️ LE GARDE-FOU COMPARE LES FICHIERS DÉBARRASSÉS de tout ce que la
  // réécriture a le droit de changer : les tirets eux-mêmes, les virgules et
  // deux-points ajoutés, et les espaces qui les entouraient. Si le reste bouge
  // d'un seul caractère, c'est que le lexeur s'est trompé de segment.
  const noyau = (x) => x.replace(/[—–−‑\-,:、]/g, '').replace(/\s+/g, '');
  if (noyau(sortie) !== noyau(src) || sortie.length > src.length + 600) {
    console.error(`⚠️  ${f} : réécriture suspecte, fichier ignoré`);
    continue;
  }
  if (modifie) {
    touches++;
    if (ECRIRE) fs.writeFileSync(f, sortie);
  }
}

console.log(`${touches} fichier(s) ${ECRIRE ? 'réécrits' : 'à réécrire'}`);
console.log(`tirets dans les TEXTES : ${totalAvant} → ${totalApres}`);
console.log('\nExemples :');
for (const [f, avant, apres] of exemples) {
  console.log(`  ${path.basename(f)}`);
  console.log(`    − ${avant}`);
  console.log(`    + ${apres}`);
}
