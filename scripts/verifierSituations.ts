import { LANGUES } from '../src/lib/i18n';
import { SITUATIONS } from '../src/data/situations';
import {
  SITUATIONS_ETENDUES,
  TEXTES_SITUATIONS_ETENDUES,
} from '../src/data/situationsEtendues';

function verifier(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

verifier(SITUATIONS_ETENDUES.length === 500, 'Le lot étendu ne contient pas exactement 500 situations.');
verifier(SITUATIONS.length === 651, 'Le catalogue complet ne contient pas exactement 651 situations.');
verifier(new Set(SITUATIONS.map((s) => s.id)).size === SITUATIONS.length, 'Des ids de situation sont en double.');

for (const situation of SITUATIONS_ETENDUES) {
  verifier(situation.choix.length === 3, `${situation.id} doit proposer exactement trois choix.`);
  const cles = [
    `sit.${situation.id}.titre`,
    `sit.${situation.id}.txt`,
    ...situation.choix.flatMap((_, i) => [`sit.${situation.id}.c${i}`, `sit.${situation.id}.r${i}`]),
  ];
  for (const cle of cles) {
    const traduction = TEXTES_SITUATIONS_ETENDUES[cle];
    verifier(traduction, `Traduction absente : ${cle}`);
    for (const { id: langue } of LANGUES) {
      verifier(traduction[langue]?.trim(), `Texte ${langue} absent : ${cle}`);
    }
  }
}

console.log(`OK — ${SITUATIONS_ETENDUES.length} nouvelles situations, ${Object.keys(TEXTES_SITUATIONS_ETENDUES).length} textes, 7 langues.`);
