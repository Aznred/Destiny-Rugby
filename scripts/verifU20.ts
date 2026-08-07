// VÉRIFICATION — LES SÉLECTIONS U20, LES ÉCUSSONS ET LES DRAPEAUX
//
// Trois retours de jeu traités ici :
//   1. « rajoute les compétitions U20, convocation des joueurs U20 donc les
//      meilleurs joueurs U20 de chaque pays » ;
//   2. les écussons prioritaires de `sources/logos/selections/` ;
//   3. « manque les drapeaux sur les nouvelles ligues à côté des pays ».
//
// Lancer : npx vite-node scripts/verifU20.ts

import fs from 'node:fs';
import path from 'node:path';
import type { Joueur } from '../src/types';
import {
  COMPETITIONS_INTERNATIONALES, COMPETITIONS_U20, competitionsDeLaSaison,
  effectifNational, forceNation, equipeU20, internationalEnDirect,
} from '../src/lib/international';
import { convocationU20, convocation } from '../src/lib/selection';
import { LOGO_PAR_EQUIPE } from '../src/data/mondeReel';
import { COMPETITIONS } from '../src/data/clubs';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(50)} ${valeur}`);
}

function espoir(nation: string, niveau: number, age = 19): Joueur {
  return {
    nom: 'Espoir Test', poste: 'demi_ouverture', nation, club: 'Stade Toulousain',
    division: 'top14', age,
    attributs: {
      vitesse: niveau, force: niveau, endurance: niveau, plaquage: niveau,
      passe: niveau, jeuAuPied: niveau, vision: niveau, mental: niveau,
    },
    forme: 85, moral: 80, reputation: niveau - 15, argent: 0, saison: 1,
    matchsJoues: 10, essais: 2, titres: [],
  };
}

console.log('=== 1. LES COMPÉTITIONS U20 EXISTENT ET SE JOUENT ===');
const u20 = COMPETITIONS_INTERNATIONALES.filter((c) => COMPETITIONS_U20.has(c.id));
ligne('compétitions U20 déclarées', u20.map((c) => c.nom).join(' · '), u20.length >= 2);
ligne('elles sont dans la saison',
  `${competitionsDeLaSaison(1).filter((c) => COMPETITIONS_U20.has(c.id)).length} sur ${u20.length}`,
  competitionsDeLaSaison(1).filter((c) => COMPETITIONS_U20.has(c.id)).length === u20.length);

for (const c of u20) {
  const etat = internationalEnDirect(c.id, 1, 99);
  const scores = etat?.journees.flat() ?? [];
  const nul = scores.filter((m) => m.scoreD === m.scoreE).length;
  ligne(`${c.nom} — journées jouées`,
    `${etat?.journeesJouees ?? 0} journées, ${scores.length} matchs, ${nul} nul(s)`,
    (etat?.journeesJouees ?? 0) === c.journees && scores.length > 0);
  const tete = etat?.classement[0];
  console.log(`     classement : ${etat?.classement.map((l) => l.club.replace(' U20', '')).join(' > ')}`);
  ligne(`${c.nom} — hiérarchie crédible`,
    `en tête : ${tete?.club}`,
    !!tete && forceNation(tete.club) >= 45);
}

console.log('\n=== 2. LA FORCE DES U20 SUIT CELLE DES SÉNIORS ===');
for (const nation of ['France', 'Italie', 'Nouvelle-Zélande', 'Pays de Galles']) {
  const a = forceNation(nation);
  const j = forceNation(equipeU20(nation));
  ligne(`${nation}`, `séniors ${a} → U20 ${j}`, j < a && j >= 35);
}

console.log('\n=== 3. LA CONVOCATION U20 : LES MEILLEURS DE LEUR ÂGE ===');
{
  const fort = espoir('France', 76);
  const moyen = espoir('France', 62);
  const vieux = espoir('France', 80, 22);
  const petitPays = espoir('Belgique', 58);
  ligne('un très bon espoir français est pris',
    `niveau ${Math.round(convocationU20(fort, 0.5).niveau)} vs ${Math.round(convocationU20(fort, 0.5).exige)} exigé`,
    convocationU20(fort, 0.1).selectionne);
  ligne('un espoir moyen français est écarté',
    `niveau ${Math.round(convocationU20(moyen, 0.5).niveau)} vs ${Math.round(convocationU20(moyen, 0.5).exige)} exigé`,
    !convocationU20(moyen, 0.9).selectionne);
  ligne('à 22 ans, la porte est fermée', `âge ${vieux.age}`, !convocationU20(vieux, 0.1).selectionne);
  ligne('la barre est plus basse dans un petit pays',
    `Belgique ${Math.round(convocationU20(petitPays, 0.5).exige)} vs France ${Math.round(convocationU20(fort, 0.5).exige)}`,
    convocationU20(petitPays, 0.5).exige < convocationU20(fort, 0.5).exige);
  ligne('le même espoir n’est PAS pris chez les A',
    `exigé ${Math.round(convocation(fort, 0.5).exige)}`,
    !convocation(fort, 0.9).selectionne);
}

console.log('\n=== 4. L’EFFECTIF U20 EST BIEN COMPOSÉ DE JOUEURS DE 20 ANS OU MOINS ===');
for (const nation of ['France U20', 'Angleterre U20', 'Irlande U20', 'Italie U20', 'Galles U20', 'Uruguay U20']) {
  const groupe = effectifNational(nation, 1);
  const trop = groupe.filter((c) => c.age > 20);
  const moyenne = groupe.length
    ? Math.round(groupe.reduce((a, b) => a + b.note, 0) / groupe.length) : 0;
  ligne(nation, `${groupe.length} joueurs, moyenne ${moyenne}, ${trop.length} hors d’âge`,
    groupe.length >= 15 && trop.length === 0);
}

console.log('\n=== 5. LES ÉCUSSONS DES SÉLECTIONS SONT EN PLACE ===');
{
  const racine = path.join(process.cwd(), 'public');
  const equipesU20 = [...new Set(u20.flatMap((c) => c.equipes))];
  const manquants = equipesU20.filter((e) => {
    const src = LOGO_PAR_EQUIPE[e];
    return !src || !fs.existsSync(path.join(racine, src.replace(/^\//, '')));
  });
  ligne('écusson pour chaque équipe U20',
    `${equipesU20.length - manquants.length}/${equipesU20.length}${manquants.length ? ' — manquants : ' + manquants.join(', ') : ''}`,
    manquants.length === 0);

  // Les écussons prioritaires : on vérifie que
  // ce sont bien de vraies images et pas les vignettes de 200 octets d'avant.
  const aVerifier = ['france', 'angleterre', 'irlande', 'ecosse', 'italie', 'afrique_du_sud', 'japon', 'usa'];
  const petits = aVerifier.filter((n) => {
    const f = path.join(racine, 'logos', `${n}.png`);
    return !fs.existsSync(f) || fs.statSync(f).size < 2000;
  });
  ligne('les logos de sélections sont de vraies images',
    `${aVerifier.length - petits.length}/${aVerifier.length} au-dessus de 2 Ko${petits.length ? ' — trop petits : ' + petits.join(', ') : ''}`,
    petits.length === 0);
}

console.log('\n=== 6. LES DRAPEAUX DES NOUVELLES LIGUES ===');
{
  const monde = COMPETITIONS.filter((c) => c.zone === 'Monde');
  const sans = monde.filter((c) => c.drapeaux.length === 0);
  ligne('championnats du monde avec drapeau',
    `${monde.length - sans.length}/${monde.length}${sans.length ? ' — sans : ' + sans.map((c) => c.pays).join(', ') : ''}`,
    sans.length === 0);
  for (const c of monde.slice(0, 6)) {
    console.log(`     ${c.nom.padEnd(34)} ${c.pays.padEnd(22)} ${c.drapeaux.join(', ')}`);
  }
}

console.log(echecs === 0 ? '\n✅ Tout est conforme.' : `\n❌ ${echecs} contrôle(s) en échec.`);
