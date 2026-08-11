// LES COUPES D'EUROPE SONT-ELLES AU VRAI FORMAT ? — et surtout : CHANGENT-ELLES ?
//
// ⚠️ CE SCRIPT EXISTE À CAUSE D'UN BUG QU'AUCUN TEST N'AURAIT ATTRAPÉ EN
// REGARDANT UNE SEULE SAISON : « gros bug sur la Champions Cup et la Challenge
// Cup, c'est toujours les mêmes équipes ». Chaque saison prise isolément était
// parfaitement cohérente — poules équilibrées, matchs plausibles, un vainqueur.
// C'est la COMPARAISON entre deux saisons qui montrait la panne : les 24 mêmes
// clubs, éternellement, parce que la liste venait d'un fichier de données figé
// et non d'une qualification. Le contrôle « la composition bouge d'une saison à
// l'autre » est donc le plus important d'ici.
//
//   npx vite-node scripts/verifCoupesEurope.ts

import {
  coupeEnDirect, engagesEuropeens, coupesDuClub, JOURNEES_POULE,
} from '../src/lib/coupe';

let echecs = 0;
function ligne(nom: string, valeur: string, ok: boolean): void {
  console.log(`  ${ok ? '✅' : '❌'} ${nom.padEnd(52)} ${valeur}`);
  if (!ok) echecs += 1;
}

const TOURS = 4; // huitièmes, quarts, demies, finale

console.log('\n=== 1. LES ENGAGÉS SE QUALIFIENT, ILS NE SONT PAS FIGÉS ===');
{
  const s1 = engagesEuropeens(1);
  const s2 = engagesEuropeens(2);
  const s6 = engagesEuropeens(6);

  ligne('Champions Cup : 24 clubs', `${s1.championsCup.length}`, s1.championsCup.length === 24);
  ligne('Challenge Cup : 18 clubs', `${s1.challengeCup.length}`, s1.challengeCup.length === 18);

  // ⚠️ LE CONTRÔLE CENTRAL. Deux saisons ne doivent pas aligner les mêmes 24.
  const noms = (l: { club: string }[]) => new Set(l.map((e) => e.club));
  const a = noms(s1.championsCup);
  const b = noms(s2.championsCup);
  const communs = [...a].filter((c) => b.has(c)).length;
  ligne('la Champions Cup change d’une saison à l’autre',
    `${24 - communs} changement(s) entre S1 et S2`, communs < 24);
  const f = noms(s6.championsCup);
  const communsLoin = [...a].filter((c) => f.has(c)).length;
  ligne('… et elle continue de bouger sur la durée',
    `${24 - communsLoin} changement(s) entre S1 et S6`, communsLoin < 24);

  // Un club ne peut pas jouer les deux coupes la même saison.
  const doubles = [...a].filter((c) => noms(s1.challengeCup).has(c));
  ligne('aucun club dans les deux coupes à la fois',
    doubles.length ? doubles.join(', ') : 'aucun', doubles.length === 0);

  // Trois chapeaux de six en Challenge Cup, trois de huit en Champions Cup.
  const parChapeau = (l: { chapeau: string }[]) => {
    const m = new Map<string, number>();
    for (const e of l) m.set(e.chapeau, (m.get(e.chapeau) ?? 0) + 1);
    return [...m.entries()].sort();
  };
  const cc = parChapeau(s1.championsCup);
  ligne('Champions Cup : 3 chapeaux de 8',
    cc.map(([k, v]) => `${k}=${v}`).join(' '),
    cc.length === 3 && cc.every(([, v]) => v === 8));
  const ch = parChapeau(s1.challengeCup);
  ligne('Challenge Cup : 3 chapeaux de 6',
    ch.map(([k, v]) => `${k}=${v}`).join(' '),
    ch.length === 3 && ch.every(([, v]) => v === 6));
}

console.log('\n=== 2. LE FORMAT DES POULES ===');
for (const [id, poulesAttendues] of [['championsCup', 4], ['challengeCup', 3]] as const) {
  const etat = coupeEnDirect(id, 3, '', JOURNEES_POULE);
  if (!etat) { ligne(id, 'aucun état', false); continue; }
  console.log(`  — ${etat.nom}`);
  ligne('poules', `${etat.poules.length} de ${etat.poules.map((p) => p.clubs.length).join('/')}`,
    etat.poules.length === poulesAttendues && etat.poules.every((p) => p.clubs.length === 6));
  ligne('journées de poule', `${etat.totalJournees}`, etat.totalJournees === JOURNEES_POULE);

  // ⚠️ QUATRE MATCHS PAR CLUB, PAS CINQ. C'est la signature du format : dans
  // une poule de 6, on ne rencontre pas son compatriote.
  const matchsParClub = new Map<string, number>();
  const adversaires = new Map<string, Set<string>>();
  for (const poule of etat.poules) {
    for (const journee of poule.journees) {
      for (const m of journee) {
        for (const [a, b] of [[m.domicile, m.exterieur], [m.exterieur, m.domicile]]) {
          matchsParClub.set(a, (matchsParClub.get(a) ?? 0) + 1);
          if (!adversaires.has(a)) adversaires.set(a, new Set());
          adversaires.get(a)!.add(b);
        }
      }
    }
  }
  const compte = [...matchsParClub.values()];
  ligne('chaque club joue exactement 4 matchs',
    `${Math.min(...compte)} à ${Math.max(...compte)}`,
    compte.every((n) => n === 4));
  const doublons = [...adversaires.entries()].filter(([c, s]) => s.size !== matchsParClub.get(c));
  ligne('… contre 4 adversaires DIFFÉRENTS',
    doublons.length ? doublons.map(([c]) => c).join(', ') : 'aucun doublon',
    doublons.length === 0);

  // Et jamais deux clubs du même chapeau.
  const chapeauDe = new Map(engagesEuropeens(3)[id].map((e) => [e.club, e.chapeau]));
  const fratricides: string[] = [];
  for (const poule of etat.poules) {
    for (const journee of poule.journees) {
      for (const m of journee) {
        if (chapeauDe.get(m.domicile) === chapeauDe.get(m.exterieur)) {
          fratricides.push(`${m.domicile}–${m.exterieur}`);
        }
      }
    }
  }
  ligne('jamais deux clubs du même championnat en poule',
    fratricides.length ? fratricides.join(', ') : 'aucun',
    fratricides.length === 0);

  // 2 à domicile, 2 à l'extérieur.
  const domicile = new Map<string, number>();
  for (const poule of etat.poules) {
    for (const journee of poule.journees) for (const m of journee) {
      domicile.set(m.domicile, (domicile.get(m.domicile) ?? 0) + 1);
    }
  }
  const recus = [...domicile.values()];
  ligne('2 matchs à domicile, 2 à l’extérieur',
    `${Math.min(...recus)} à ${Math.max(...recus)} réception(s)`,
    recus.every((n) => n === 2));
}

console.log('\n=== 3. LA QUALIFICATION ET LE REVERSEMENT ===');
{
  const grande = coupeEnDirect('championsCup', 3, '', JOURNEES_POULE + TOURS);
  const petite = coupeEnDirect('challengeCup', 3, '', JOURNEES_POULE + TOURS);
  if (!grande || !petite) {
    ligne('les deux coupes se jouent', 'état manquant', false);
  } else {
    // 8 + 4 + 2 + 1 = 15 matchs pour un tableau de 16.
    ligne('Champions Cup : tableau complet de 16',
      `${grande.bracket.length} matchs · ${grande.vainqueur}`,
      grande.bracket.length === 15 && !!grande.vainqueur);
    ligne('Challenge Cup : tableau complet de 16',
      `${petite.bracket.length} matchs · ${petite.vainqueur}`,
      petite.bracket.length === 15 && !!petite.vainqueur);

    // ⚠️ LES 4 REVERSÉS SONT LE CŒUR DU FORMAT : 12 qualifiés + 4 repêchés.
    ligne('4 clubs reversés de la Champions Cup',
      petite.reverses.length ? petite.reverses.join(', ') : 'aucun',
      petite.reverses.length === 4);

    // Un reversé était bien 5ᵉ de sa poule de Champions Cup.
    const cinquiemes = grande.poules.map((p) => p.classement[4]?.club).filter(Boolean);
    const coherent = petite.reverses.every((c) => cinquiemes.includes(c));
    ligne('… et ce sont bien les 5ᵉ de poule',
      cinquiemes.join(', '), coherent);

    // Un 6ᵉ de poule ne joue plus rien.
    const sixiemes = grande.poules.map((p) => p.classement[5]?.club).filter(Boolean) as string[];
    const repeches = sixiemes.filter((c) => petite.reverses.includes(c));
    ligne('les 6ᵉ sont éliminés de toute compétition',
      repeches.length ? repeches.join(', ') : `${sixiemes.length} éliminé(s)`,
      repeches.length === 0);
  }
}

console.log('\n=== 4. LE CALENDRIER TIENT ===');
{
  // 4 journées de poule + 4 tours = 8 dates, ce que réserve `data/calendrier.ts`.
  ligne('poules + tableau final tiennent en 8 dates',
    `${JOURNEES_POULE} + ${TOURS}`, JOURNEES_POULE + TOURS === 8);

  // Rien ne se débloque avant l'heure.
  const mi = coupeEnDirect('championsCup', 3, '', 2);
  ligne('à 2 journées, aucun match à élimination directe',
    `${mi?.bracket.length ?? -1} match(s)`, mi?.bracket.length === 0);
  const apresPoules = coupeEnDirect('championsCup', 3, '', JOURNEES_POULE + 1);
  ligne('à la 1ʳᵉ date de phase finale : les huitièmes',
    `${apresPoules?.bracket.length ?? -1} match(s)`, apresPoules?.bracket.length === 8);
}

console.log('\n=== 5. UN CLUB SAIT CE QU’IL JOUE ===');
{
  const engages = engagesEuropeens(3);
  const unClub = engages.championsCup[0].club;
  ligne('un engagé trouve sa coupe',
    `${unClub} → ${coupesDuClub(unClub, 3).join(', ')}`,
    coupesDuClub(unClub, 3).includes('championsCup'));
  ligne('un club de Fédérale n’a pas de coupe d’Europe',
    `${coupesDuClub('Aurore de Vitré', 3).length} coupe(s)`,
    coupesDuClub('Aurore de Vitré', 3).length === 0);
}

console.log(echecs ? `\n❌ ${echecs} contrôle(s) en échec.\n` : '\n✅ Coupes d’Europe conformes au format 2023-24.\n');
if (echecs) process.exit(1);
