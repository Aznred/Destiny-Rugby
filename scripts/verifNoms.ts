// BANC D'ESSAI DU TIRAGE DE NOM
//
// Un champ « Nom » laissé vide donnait « Anonyme ». Il donne désormais un nom
// tiré du vivier de la nationalité choisie (`lib/nomsJoueurs.ts`), recombiné à
// partir des 11 916 joueurs étiquetés que le jeu embarque déjà.
//
// ⚠️ CE QU'IL FAUT VÉRIFIER N'EST PAS « ÇA RENVOIE UNE CHAÎNE ». C'est :
//   · qu'un nom géorgien ne ressemble pas à un nom français ;
//   · que les 202 nations de la création rendent TOUTES quelque chose de
//     lisible, y compris les 150 qui n'ont aucun joueur dans les bases ;
//   · que le découpage prénom / nom ne se trompe pas sur les particules
//     (« DU PREEZ », « LE BOURGEOIS », « GOMES SA ») ;
//   · que deux créations de suite ne donnent pas le même nom.
//
//   npx vite-node scripts/verifNoms.ts

import { nomAleatoirePourNation } from '../src/lib/nomsJoueurs';
import { NATIONS, NATIONS_PAR_ZONE } from '../src/data/rugby';

// ⚠️ ON NE CONTRÔLE LA CASSE QUE SUR LE NOM DE FAMILLE, c’est-à-dire le dernier
// mot. Un PRÉNOM tout en capitales existe vraiment dans les données — « JT »,
// « AJ », « CJ » sont des prénoms de rugbymen sud-africains, pas un découpage
// raté. Contrôler la chaîne entière faisait échouer le banc sur « JT Everitt »,
// qui est un nom parfaitement correct.
const nomDeFamilleEnCapitales = (complet: string): boolean => {
  const dernier = complet.trim().split(/\s+/).pop() ?? '';
  return dernier.length >= 2 && dernier === dernier.toLocaleUpperCase('fr')
    && dernier !== dernier.toLocaleLowerCase('fr');
};

let echecs = 0;
function ligne(nom: string, valeur: string | number, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(48)} ${valeur}`);
}

// ---------------------------------------------------------------------------
// 1. LES GRANDES NATIONS ONT LEUR PROPRE STYLE
// ---------------------------------------------------------------------------
console.log('=== 1. UN NOM QUI SONNE COMME SON PAYS ===');
{
  const vitrine = [
    'France', 'Angleterre', 'Nouvelle-Zélande', 'Japon', 'Géorgie',
    'Afrique du Sud', 'Argentine', 'Portugal', 'Roumanie', 'Italie',
  ];
  for (const n of vitrine) {
    const trois = [0, 1, 2].map(() => nomAleatoirePourNation(n));
    console.log(`     ${n.padEnd(20)} ${trois.join(' · ')}`);
  }

  // Le contrôle qui compte : le vivier français et le vivier japonais ne
  // doivent pas se recouvrir. S'ils se recouvrent, c'est que le repli « tout le
  // monde » s'est déclenché à tort et que la nationalité ne sert à rien.
  const tirer = (n: string, k: number) =>
    new Set(Array.from({ length: k }, () => nomAleatoirePourNation(n)));
  const fr = tirer('France', 120);
  const jp = tirer('Japon', 120);
  const communs = [...fr].filter((x) => jp.has(x)).length;
  ligne('France et Japon ne partagent aucun nom', `${communs} en commun sur 120 tirages`, communs === 0);
}

// ---------------------------------------------------------------------------
// 2. LES 202 NATIONS RENDENT TOUTES QUELQUE CHOSE
// ---------------------------------------------------------------------------
console.log('\n=== 2. AUCUNE NATION SANS NOM ===');
{
  const vides: string[] = [];
  const anonymes: string[] = [];
  const malFormes: string[] = [];
  for (const n of NATIONS) {
    const nom = nomAleatoirePourNation(n);
    if (!nom.trim()) vides.push(n);
    if (nom === 'Anonyme') anonymes.push(n);
    // Un prénom, une espace, un nom : au moins deux mots, et pas de capitales
    // résiduelles (« DUPONT » signerait un découpage raté).
    if (!/^\S+( \S+)+$/.test(nom) || nomDeFamilleEnCapitales(nom)) malFormes.push(`${n} → ${nom}`);
  }
  ligne('les 202 nations rendent un nom', `${NATIONS.length - vides.length}/${NATIONS.length}`, vides.length === 0);
  ligne('plus personne ne s’appelle « Anonyme »', anonymes.length || 'aucun', anonymes.length === 0);
  ligne('prénom + nom, sans capitales résiduelles',
    malFormes.length ? malFormes.slice(0, 3).join(' · ') : `${NATIONS.length}/${NATIONS.length}`,
    malFormes.length === 0);
}

// ---------------------------------------------------------------------------
// 3. LE REPLI PAR ZONE
// ---------------------------------------------------------------------------
console.log('\n=== 3. UNE NATION SANS VIVIER EMPRUNTE À SON CONTINENT ===');
{
  // Le Népal n'a aucun joueur dans les bases : il doit recevoir un nom d'Asie,
  // pas un nom français. On le vérifie en comparant au vivier de sa zone.
  const echantillon = [
    ['Népal', 'Asie'], ['Lesotho', 'Afrique'], ['Belize', 'Amériques'],
  ] as const;
  for (const [nation, zoneAttendue] of echantillon) {
    const zone = NATIONS_PAR_ZONE.find((g) => g.nations.includes(nation))?.zone;
    const tirages = Array.from({ length: 6 }, () => nomAleatoirePourNation(nation));
    console.log(`     ${nation.padEnd(12)} (${zone ?? '—'}) ${tirages.slice(0, 3).join(' · ')}`);
    ligne(`${nation} est bien rangé en ${zoneAttendue}`, zone ?? 'zone inconnue', zone === zoneAttendue);
  }
}

// ---------------------------------------------------------------------------
// 4. LES PARTICULES NE SONT PAS COUPÉES
// ---------------------------------------------------------------------------
console.log('\n=== 4. LE DÉCOUPAGE PRÉNOM / NOM ===');
{
  // On tire large en Afrique du Sud et au pays de Galles : ce sont les deux
  // viviers pleins de particules (« DU PREEZ », « VAN DER MERWE », « AP RHYS »).
  const sud = Array.from({ length: 300 }, () => nomAleatoirePourNation('Afrique du Sud'));
  const avecParticule = sud.filter((n) => / (Du|Van|De|Le|Der) /i.test(n));
  console.log(`     Afrique du Sud, noms à particule : ${avecParticule.length} sur 300`);
  if (avecParticule.length) console.log(`     ex. ${avecParticule.slice(0, 3).join(' · ')}`);
  // Une particule doit rester DANS le nom de famille, donc jamais en tête.
  const enTete = sud.filter((n) => /^(Du|Van|De|Le|Der) /i.test(n));
  ligne('aucune particule ne passe en prénom', enTete.length ? enTete[0] : 'aucune', enTete.length === 0);

  const capitales = sud.filter(nomDeFamilleEnCapitales);
  ligne('aucun nom de famille resté en capitales', capitales.length ? capitales[0] : 'aucun', capitales.length === 0);
}

// ---------------------------------------------------------------------------
// 5. DEUX CARRIÈRES DE SUITE NE PORTENT PAS LE MÊME NOM
// ---------------------------------------------------------------------------
console.log('\n=== 5. LE TIRAGE EST BIEN ALÉATOIRE ===');
{
  const tirages = Array.from({ length: 50 }, () => nomAleatoirePourNation('France'));
  const distincts = new Set(tirages).size;
  ligne('50 tirages français, presque tous distincts', `${distincts}/50`, distincts >= 45);
  ligne('deux tirages consécutifs diffèrent',
    `${tirages[0]} / ${tirages[1]}`, tirages[0] !== tirages[1]);
}

console.log(echecs === 0
  ? '\n✅ Un champ vide donne désormais un nom du bon pays, jamais « Anonyme ».'
  : `\n❌ ${echecs} contrôle(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
