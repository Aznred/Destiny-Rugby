// VÉRIFICATION — LE MARCHÉ DES TRANSFERTS
//
// Deux retours de jeu :
//   1. « si trop de générale, plus aucun club ne veut le joueur » — le plancher
//      de recrutement était ABSOLU (16 points sous la cote). Au-delà de 98 de
//      cote, le meilleur étage du jeu (note 82 dans `NOTE_PAR_NIVEAU`) passait
//      sous ce plancher et TOUTES les compétitions étaient écartées : zéro offre.
//   2. « si on est sans contrat on reste dans le club » — la saison suivante se
//      jouait quand même, salaire compris.
//
// Lancer : npx vite-node scripts/verifMarche.ts

import type { Joueur } from '../src/types';
import { genererOffres, cote, RENOM_MAX } from '../src/lib/offres';

function joueurDe(niveau: number, reputation: number, club = 'Stade Toulousain', division = 'top14'): Joueur {
  return {
    nom: 'Test Joueur', poste: 'demi_ouverture', nation: 'France', club, division,
    age: 26,
    attributs: {
      vitesse: niveau, force: niveau, endurance: niveau, plaquage: niveau,
      passe: niveau, jeuAuPied: niveau, vision: niveau, mental: niveau,
    },
    forme: 80, moral: 80, reputation, argent: 0, saison: 6,
    matchsJoues: 120, essais: 30, titres: [], noteSaison: 8.5,
    contrat: { club, division, saisons: 0, salaire: 200000 },
  };
}

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}

console.log('=== 1. LE MARCHÉ RESTE OUVERT À TOUS LES NIVEAUX ===');
for (const [niveau, rep] of [[35, 20], [55, 45], [70, 60], [85, 80], [95, 95], [99, 100]] as const) {
  const j = joueurDe(niveau, rep);
  // Cinq tirages : la génération est aléatoire, on veut savoir si le MARCHÉ
  // existe, pas si un tirage précis a mordu.
  let total = 0;
  let meilleur = 0;
  for (let i = 0; i < 5; i++) {
    const offres = genererOffres(j, { saison: 6, maximum: 4 });
    total += offres.length;
    for (const o of offres) meilleur = Math.max(meilleur, o.noteClub);
  }
  ligne(
    `générale ${niveau}, réputation ${rep} (cote ${cote(j).toFixed(0)})`,
    `${total} offres sur 5 tirages · meilleur club noté ${meilleur || '—'}`,
    total > 0,
  );
}

console.log('\n=== 2. UN JOUEUR DE FÉDÉRALE RESTE À SON ÉTAGE ===');
{
  const j = joueurDe(40, 25, 'US Tyrosse', 'nationale2');
  const offres = genererOffres(j, { saison: 4, maximum: 6 });
  const trop = offres.filter((o) => o.noteClub > cote(j) + 6);
  ligne('aucune offre très au-dessus de sa cote',
    `${offres.length} offres, ${trop.length} hors de portée`, trop.length === 0);
}

console.log('\n=== 3. UNE STAR NE SIGNE PAS EN RÉGIONALE ===');
{
  const j = joueurDe(95, 95);
  const offres = genererOffres(j, { saison: 8, maximum: 6 });
  const bas = offres.filter((o) => o.noteClub < 60);
  ligne('aucune offre d’un club noté sous 60',
    `${offres.length} offres, ${bas.length} sous 60`, bas.length === 0 && offres.length > 0);
}

console.log('\n=== 4. FIN DE CONTRAT : ON NE RESTE PAS AU CLUB ===');
{
  const { useGame } = await import('../src/store/useGame');
  useGame.getState().creerJoueur({
    nom: 'Léo Fabre', poste: 'ailier_gauche', nation: 'France',
    club: 'Stade Toulousain', division: 'top14', age: 24, traits: [],
  });
  // On force un contrat arrivé à son terme.
  const j0 = useGame.getState().joueur!;
  useGame.setState({
    joueur: { ...j0, contrat: { ...j0.contrat!, saisons: 0 } },
    offres: [],
    offresOuvertes: false,
  });
  const saisonAvant = useGame.getState().joueur!.saison;
  useGame.getState().saisonSuivante();
  const apres = useGame.getState();
  ligne('la saison ne démarre pas sans contrat',
    `saison ${saisonAvant} → ${apres.joueur?.saison ?? '—'}`,
    apres.joueur?.saison === saisonAvant);
  ligne('le panneau « Choix de carrière » s’ouvre',
    `${apres.offres.length} offre(s), ouvert : ${apres.offresOuvertes}`,
    apres.offresOuvertes && apres.offres.length > 0);

  // On signe, la saison doit repartir.
  useGame.getState().signerOffre(apres.offres[0].id);
  useGame.getState().saisonSuivante();
  const fin = useGame.getState();
  ligne('après signature, la saison repart',
    `saison ${fin.joueur?.saison}`, (fin.joueur?.saison ?? 0) > saisonAvant);
}

// ═══════════════════════════════════════════════════════════════════════════
// LES DEUX REPROCHES DE JEU : « trop facile d'avoir des gros clubs et des gros
// salaires » et « c'est toujours les mêmes clubs qui proposent »
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== 5. CE NE SONT PLUS LES MÊMES CLUBS ===');
{
  // ⚠️ LE TEST QUI COMPTE. On déroule douze intersaisons pour le MÊME joueur et
  // on regarde combien de clubs différents se manifestent. Avant, le tirage ne
  // pondérait que la proximité de niveau : la note d'un club ne bougeant
  // presque pas, les mêmes cinq ou six noms revenaient toutes les saisons.
  const j = joueurDe(72, 65);
  const vus = new Map<string, number>();
  let total = 0;
  for (let s = 1; s <= 12; s++) {
    for (const o of genererOffres({ ...j, saison: s }, { saison: s, maximum: 4 })) {
      vus.set(o.club, (vus.get(o.club) ?? 0) + 1);
      total++;
    }
  }
  const distincts = vus.size;
  const revenants = [...vus.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(`     ${total} offres sur 12 saisons · ${distincts} clubs différents`);
  console.log(`     les plus assidus : ${revenants.map(([c, n]) => `${c} ×${n}`).join(' · ')}`);
  // ⚠️ ON N'EXIGE PAS 100 % DE CLUBS DIFFÉRENTS, et ce serait une erreur de le
  // faire : un club qui t'a suivi l'an dernier peut revenir à la charge, c'est
  // exactement ce que fait un vrai marché. Ce qu'on refuse, c'est la liste figée
  // d'avant — cinq ou six noms qui revenaient à CHAQUE intersaison. Un club
  // distinct pour deux offres, avec un maximum de quatre relances en douze
  // saisons, c'est un marché vivant.
  ligne('la variété des clubs sur douze saisons',
    `${distincts} clubs distincts pour ${total} offres`, distincts >= total * 0.4);
  ligne('aucun club ne monopolise le marché',
    `le plus assidu : ${revenants[0]?.[1] ?? 0} offres sur ${total}`,
    (revenants[0]?.[1] ?? 0) <= Math.max(3, total * 0.25));

  // Et deux postes différents doivent recevoir des offres de clubs différents :
  // c'est la signature du « besoin au poste ».
  const ouvreur = new Set(genererOffres({ ...j, poste: 'demi_ouverture' }, { saison: 7, maximum: 5 }).map((o) => o.club));
  const pilier = new Set(genererOffres({ ...j, poste: 'pilier_gauche' }, { saison: 7, maximum: 5 }).map((o) => o.club));
  const communs = [...ouvreur].filter((c) => pilier.has(c)).length;
  ligne('le poste change la liste des courtisans',
    `ouvreur ${ouvreur.size} clubs · pilier ${pilier.size} clubs · ${communs} en commun`,
    ouvreur.size > 0 && pilier.size > 0 && communs < Math.max(ouvreur.size, pilier.size));
}

console.log('\n=== 6. ON NE SAUTE PLUS DEUX ÉTAGES ===');
{
  // Un très bon joueur de Fédérale 1 (niveau 4) ne doit pas recevoir d'offre du
  // Top 14 (niveau 0) : il passe par la Nationale et la Pro D2.
  const fede = joueurDe(72, 70, 'Stade Nantais', 'fed1');
  const offres = genererOffres({ ...fede, age: 27 }, { saison: 6, maximum: 6 });
  const trop = offres.filter((o) => ['top14', 'prod2'].includes(o.division));
  console.log(`     ${offres.length} offre(s) : ${[...new Set(offres.map((o) => o.divisionNom))].join(', ') || 'aucune'}`);
  ligne('un Fédérale 1 de 27 ans ne signe pas en Top 14',
    trop.length ? trop.map((o) => `${o.club} (${o.divisionNom})` ).join(', ') : 'aucune offre de l’élite',
    trop.length === 0);

  // Mais un espoir de 20 ans, lui, peut être repéré plus haut : ça arrive.
  const espoir = genererOffres({ ...fede, age: 20 }, { saison: 6, maximum: 6 });
  const niveaux = [...new Set(espoir.map((o) => o.divisionNom))];
  ligne('un espoir de 20 ans peut monter plus haut',
    `${espoir.length} offre(s) — ${niveaux.join(', ') || 'aucune'}`, espoir.length > 0);
}

console.log('\n=== 7. LES GROS SALAIRES SE MÉRITENT ===');
{
  // Même cote, même club : c'est l'ÂGE qui doit faire la différence.
  const base = joueurDe(84, 78);
  const parAge = [19, 22, 27, 33, 36].map((age) => {
    const o = genererOffres({ ...base, age }, { saison: 6, maximum: 6 });
    const meilleur = o.reduce((a, b) => (b.salaire > (a?.salaire ?? 0) ? b : a), o[0]);
    return { age, salaire: meilleur?.salaire ?? 0, club: meilleur?.club ?? '—' };
  });
  for (const p of parAge) {
    console.log(`     ${p.age} ans : ${p.salaire.toLocaleString('fr-FR')} € (${p.club})`);
  }
  const jeune = parAge.find((p) => p.age === 19)!;
  const pic = parAge.find((p) => p.age === 27)!;
  const vieux = parAge.find((p) => p.age === 36)!;
  ligne('un espoir de 19 ans ne touche pas le salaire d’un cadre',
    `${jeune.salaire.toLocaleString('fr-FR')} € contre ${pic.salaire.toLocaleString('fr-FR')} € à 27 ans`,
    jeune.salaire > 0 && pic.salaire > 0 && jeune.salaire < pic.salaire);
  ligne('un vétéran de 36 ans voit son contrat se resserrer',
    `${vieux.salaire.toLocaleString('fr-FR')} € contre ${pic.salaire.toLocaleString('fr-FR')} €`,
    vieux.salaire === 0 || vieux.salaire < pic.salaire);

  // ⚠️ ET LA NOTORIÉTÉ NE REMPLACE PLUS LE NIVEAU. Un joueur moyen très connu
  // affichait une cote qui lui ouvrait un étage au-dessus du sien. Ce qu'on
  // vérifie, c'est le PLAFOND : quelle que soit la réputation, la cote ne monte
  // jamais à plus de `RENOM_MAX` au-dessus de la générale.
  const debordent: string[] = [];
  for (const gen of [45, 60, 75, 90]) {
    for (const rep of [10, 50, 90, 100]) {
      // `noteSaison` neutre (6) : on isole l'effet de la seule réputation.
      const c = cote({ ...joueurDe(gen, rep), noteSaison: 6 });
      if (c > gen + RENOM_MAX + 1e-9) debordent.push(`gén ${gen} / rép ${rep} → ${c.toFixed(1)}`);
    }
  }
  console.log(`     générale 60 : cote ${cote({ ...joueurDe(60, 40), noteSaison: 6 }).toFixed(1)} (réputation 40)`
    + ` → ${cote({ ...joueurDe(60, 95), noteSaison: 6 }).toFixed(1)} (réputation 95, plafonnée à ${60 + RENOM_MAX})`);
  ligne('la réputation aide sans jamais faire le niveau',
    debordent.length ? debordent.join(' · ') : `16 combinaisons, plafond +${RENOM_MAX} respecté`,
    debordent.length === 0);
}

console.log(echecs === 0 ? '\n✅ Le marché fonctionne à tous les étages.' : `\n❌ ${echecs} contrôle(s) en échec.`);
