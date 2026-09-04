import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { effectifDuClub } from '../src/lib/effectif';

let echecs = 0;

function verifier(libelle: string, ok: boolean, detail: string): void {
  console.log(`  ${ok ? '✅' : '❌'} ${libelle} — ${detail}`);
  if (!ok) echecs += 1;
}

const effectif = effectifDuClub('Stade Toulousain', 1);
const attendus = ['Santiago CHOCOBARES', 'Juan Cruz MALLÍA'];
for (const nom of attendus) {
  verifier(
    `${nom} est dans la base commune`,
    effectif.some((joueur) => joueur.nom === nom),
    `${effectif.length} joueurs à Toulouse`,
  );
}

const indisponibles = new Set(effectif.filter((joueur) => attendus.includes(joueur.nom)).map((joueur) => joueur.id));
const composition = compositionManagerParDefaut(effectif, indisponibles);
const feuille = new Set([...composition.titulaires, ...composition.remplacants]);
verifier(
  'les internationaux indisponibles sortent seulement de la feuille',
  [...indisponibles].every((id) => !feuille.has(id) && effectif.some((joueur) => joueur.id === id)),
  `${effectif.length} au club · ${feuille.size} sur la feuille`,
);
verifier(
  "l'effectif toulousain complet dépasse bien les 23 convoqués",
  effectif.length > feuille.size,
  `${effectif.length} joueurs dont ${effectif.length - feuille.size} hors feuille`,
);

console.log(echecs ? `\n❌ ${echecs} contrôle(s) en échec.` : '\n✅ L’effectif entraîneur conserve tous les joueurs du club.');
process.exitCode = echecs ? 1 : 0;
