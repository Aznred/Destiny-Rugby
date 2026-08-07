// VÉRIFICATION — LE CLASSEMENT MONDIAL EST-IL FALSIFIABLE ?
//
// Demande explicite : « prépare le classement mondial et protège à fond pour que
// ce soit incassable à falsifier son score ; dans la DB je veux retenir juste le
// score ».
//
// ⚠️ CE SCRIPT JOUE LE TRICHEUR. Il ne vérifie pas que le code « marche » : il
// essaie de le casser, une attaque après l'autre, et exige que chacune soit
// refusée avec un motif lisible. Une protection qu'on n'attaque pas est une
// protection qu'on ne connaît pas.
//
// ⚠️ CE QU'IL NE PEUT PAS PROUVER. Aucun test ne rendra un jeu 100 % navigateur
// infalsifiable : le joueur possède la machine qui calcule. La seule garantie
// est que le SERVEUR recalcule — c'est `verifierFiche()` qui est testée ici, et
// c'est elle qui doit tourner côté serveur. Le reste (débit, doublons, clé
// d'écriture) ne se teste pas dans une fonction pure : voir
// `RECOMMANDATIONS_SERVEUR_LISTE`.
//
// Lancer : npx vite-node scripts/verifClassement.ts

import { jouerUneSaison } from './_saison';
import { TROPHEES } from '../src/data/trophees';
import { SUCCES, SUCCES_PAR_ID } from '../src/data/succes';
import {
  ficheDepuisJoueur, ficheDepuisLegende, scoreDeLaFiche, verifierFiche,
  sceller, sceauValide, canonique,
  SCORE_MAX, SAISONS_MAX, LIMITES, VERSION_BAREME, type FicheCarriere,
} from '../src/lib/classementMondial';
import { scoreCarriere } from '../src/store/useGame';
import { CLASSEMENT_EN_LIGNE } from '../src/lib/classementEnLigne';
import type { Joueur } from '../src/types';

let echecs = 0;
function ligne(libelle: string, valeur: string, ok: boolean): void {
  if (!ok) echecs++;
  console.log(`  ${ok ? '✅' : '❌'} ${libelle.padEnd(52)} ${valeur}`);
}

const IDS_TROPHEES = Object.keys(TROPHEES);

/**
 * `n` titres qui respectent la borne « un trophée au plus une fois par saison ».
 * ⚠️ Sans elle, un palmarès de test se contentait de répéter `brennus` — ce que
 * `verifierFiche` refuse désormais, à raison : on ne gagne pas deux Boucliers
 * la même année. On répartit donc sur tous les trophées du jeu, en tournant.
 */
function palmaresCredible(n: number, saisons: number): string[] {
  const titres: string[] = [];
  for (let k = 0; k < n; k++) {
    // Autant de tours que nécessaire, chaque id revenant au plus `saisons` fois.
    const tour = Math.floor(k / IDS_TROPHEES.length);
    if (tour >= saisons) break; // impossible d'aller plus loin sans tricher
    titres.push(IDS_TROPHEES[k % IDS_TROPHEES.length]);
  }
  return titres;
}

/** Une carrière honnête et solide : douze saisons, quelques titres. */
function fiche(modif: Partial<FicheCarriere> = {}): FicheCarriere {
  const base = {
    v: VERSION_BAREME,
    pseudo: 'Aznred',
    nom: 'Colin Gomez',
    poste: 'demi_melee',
    nation: 'France',
    ageDebut: 18,
    age: 29,
    saisons: 12,
    note: 78,
    reputation: 72,
    matchs: 210,
    essais: 44,
    selections: 21,
    titres: ['brennus', 'champions', 'sixNations'],
    ...modif,
  };
  return { ...base, score: modif.score ?? scoreDeLaFiche(base) };
}

/** Attaque : on attend un REFUS, avec un motif qui parle. */
function attaque(nom: string, f: FicheCarriere | unknown, motifAttendu: RegExp): void {
  const v = verifierFiche(f, IDS_TROPHEES);
  const dit = v.anomalies.join(' | ');
  ligne(nom, v.valide ? '⚠️ ACCEPTÉE' : dit.slice(0, 74), !v.valide && motifAttendu.test(dit));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('=== 1. UNE CARRIÈRE HONNÊTE PASSE ===');
{
  const f = fiche();
  const v = verifierFiche(f, IDS_TROPHEES);
  ligne('fiche légitime acceptée', v.anomalies.join(' | ') || `score ${v.score}`, v.valide);
  ligne('le score recalculé est celui de la fiche', `${v.score} = ${f.score}`, v.score === f.score);
  console.log(`     détail : ${f.saisons} saisons · note ${f.note} · ${f.matchs} matchs · ${f.essais} essais · ${f.titres.length} titres → ${v.score} pts`);

  // Une toute petite carrière doit passer aussi : on ne refuse pas les débutants.
  const debutant = fiche({
    ageDebut: 18, age: 18, saisons: 1, note: 38, reputation: 12,
    matchs: 9, essais: 1, selections: 0, titres: [],
  });
  const vd = verifierFiche(debutant, IDS_TROPHEES);
  ligne('une première saison passe aussi', vd.anomalies.join(' | ') || `score ${vd.score}`, vd.valide);
}

console.log('\n=== 2. LES ATTAQUES DIRECTES SONT REFUSÉES ===');
{
  attaque('score gonflé à la main', { ...fiche(), score: 999_999 }, /score annoncé/);
  attaque('score négatif', { ...fiche(), score: -1 }, /score annoncé/);
  attaque('score non entier', { ...fiche(), score: 12345.67 }, /score annoncé/);
  attaque('mauvaise version de barème', { ...fiche(), v: 99 }, /version de barème/);
  attaque('fiche vide', {}, /.+/);
  attaque('fiche nulle', null, /illisible|absente/);
  attaque('champ texte injecté à la place d’un nombre',
    { ...fiche(), matchs: '9999' as unknown as number }, /matchs n'est pas un entier/);
  attaque('nombre à virgule', { ...fiche(), essais: 44.5 }, /essais n'est pas un entier/);
  attaque('Infinity', { ...fiche(), note: Infinity }, /note n'est pas un entier/);
  attaque('NaN', { ...fiche(), reputation: NaN }, /reputation n'est pas un entier/);
}

console.log('\n=== 3. LES ATTAQUES « COHÉRENTES » SONT REFUSÉES AUSSI ===');
{
  // ⚠️ LE VRAI TEST. Un tricheur un peu malin ne met pas « score: 999999 » : il
  // recalcule le score à partir de chiffres gonflés. C'est la cohérence interne
  // qui doit l'arrêter — pas le plafond global.
  attaque('300 saisons (score recalculé proprement)',
    fiche({ saisons: 300, age: 44, ageDebut: 18 }), /saisons hors bornes/);
  attaque('carrière de 12 saisons commencée à 4 ans',
    fiche({ ageDebut: 4, age: 15, saisons: 12 }), /ageDebut hors bornes/);
  attaque('joueur de 90 ans', fiche({ age: 90, ageDebut: 18, saisons: 12 }), /age hors bornes/);
  attaque('âge et saisons qui ne collent pas',
    fiche({ ageDebut: 18, age: 40, saisons: 12 }), /âge incohérent/);
  // Au-delà du plafond absolu : arrêté avant même le calcul par saison.
  attaque('5 000 matchs (au-dessus du plafond absolu)',
    fiche({ matchs: 5000, essais: 44 }), /matchs hors bornes/);
  // ⚠️ LE CAS SUBTIL, et le plus important : 900 matchs tient sous le plafond
  // absolu (1 500) — c'est le nombre de SAISONS déclarées qui le rend impossible.
  attaque('900 matchs en 12 saisons (sous le plafond absolu)',
    fiche({ matchs: 900, essais: 44 }), /900 matchs en 12 saison/);
  attaque('2 000 essais en 210 matchs', fiche({ essais: 2000 }), /essais en 210 match/);
  attaque('note 99 dès la 1re saison',
    fiche({ saisons: 1, ageDebut: 18, age: 18, note: 99, matchs: 20, essais: 5, selections: 0, titres: [] }),
    /note 99 après 1 saison/);
  attaque('note au-dessus de 100', fiche({ note: 140 }), /note hors bornes/);
  attaque('réputation à 500', fiche({ reputation: 500 }), /reputation hors bornes/);
  attaque('300 sélections en 12 saisons', fiche({ selections: 300 }), /sélections en 12 saison/);
  // ⚠️ LE PLAFOND DE TITRES A ÉTÉ OUVERT (4 → 9 par saison) pour laisser passer
  // les distinctions individuelles. C'est donc la borne PAR TROPHÉE qui fait
  // désormais le travail — et elle est bien plus serrée : 80 Boucliers de
  // Brennus passaient sous l'ancien total (80 < 108) et sont maintenant refusés,
  // parce qu'un championnat ne se gagne qu'une fois par an.
  attaque('80 fois le même trophée en 12 saisons',
    fiche({ titres: new Array(80).fill('brennus') }), /plus d'une fois par saison/);
  attaque('13 Boucliers de Brennus en 12 saisons',
    fiche({ titres: new Array(13).fill('brennus') }), /brennus ×13/);
  // Et le total tient toujours, avec des trophées tous différents.
  attaque('200 titres tous différents en 12 saisons',
    fiche({ titres: palmaresCredible(200, 12) }), /titres en 12 saison/);
  // Douze saisons parfaites — neuf trophées distincts chacune — doivent PASSER.
  {
    const max = fiche({ titres: palmaresCredible(12 * LIMITES.titresParSaison, 12) });
    const v = verifierFiche(max, IDS_TROPHEES);
    ligne('12 saisons à 9 trophées distincts : accepté',
      v.anomalies.join(' | ') || `${v.score} pts`, v.valide);
  }
  attaque('des essais sans avoir joué',
    fiche({ matchs: 0, essais: 40, selections: 0, titres: [] }), /sans le moindre match/);
  attaque('des titres sans avoir joué',
    fiche({ matchs: 0, essais: 0, selections: 0 }), /sans le moindre match/);
}

console.log('\n=== 4. LES TROPHÉES INVENTÉS SONT REFUSÉS ===');
{
  attaque('trophée qui n’existe pas',
    fiche({ titres: ['brennus', 'coupe_du_quartier'] }), /trophée\(s\) inconnu/);
  attaque('titre vide', fiche({ titres: [''] }), /trophée\(s\) inconnu/);
  attaque('titre qui n’est pas une chaîne',
    fiche({ titres: [42 as unknown as string] }), /identifiant/);
  // Et tous les vrais trophées du jeu doivent passer.
  const tous = fiche({
    saisons: 30, ageDebut: 15, age: 44, note: 95, matchs: 900, essais: 200,
    selections: 90, titres: IDS_TROPHEES.slice(0, 40),
  });
  const v = verifierFiche(tous, IDS_TROPHEES);
  ligne('les 40 premiers trophées du jeu sont reconnus',
    v.anomalies.join(' | ') || `score ${v.score}`, v.valide);
}

console.log('\n=== 5. LE PLAFOND ABSOLU ===');
{
  console.log(`     SCORE_MAX = ${SCORE_MAX.toLocaleString('fr-FR')} · SAISONS_MAX = ${SAISONS_MAX}`);
  const parfaite = fiche({
    ageDebut: LIMITES.ageDebutMin, age: LIMITES.ageMax, saisons: SAISONS_MAX,
    note: LIMITES.noteMax, reputation: LIMITES.reputationMax,
    matchs: SAISONS_MAX * LIMITES.matchsParSaison,
    essais: SAISONS_MAX * LIMITES.matchsParSaison * LIMITES.essaisParMatch,
    selections: SAISONS_MAX * LIMITES.capesParSaison,
    // ⚠️ DES TROPHÉES DIFFÉRENTS, et c'est le sujet : la carrière maximale doit
    // rester CRÉDIBLE ligne à ligne. 270 fois le Bouclier de Brennus ne l'est
    // pas, et `verifierFiche` le refuse depuis qu'on borne chaque trophée à une
    // fois par saison.
    titres: palmaresCredible(SAISONS_MAX * LIMITES.titresParSaison, SAISONS_MAX),
  });
  const v = verifierFiche(parfaite, IDS_TROPHEES);
  ligne('la carrière théorique maximale est acceptée',
    v.anomalies.join(' | ') || `${v.score.toLocaleString('fr-FR')} pts`, v.valide);
  ligne('… et elle vaut exactement SCORE_MAX', `${v.score} = ${SCORE_MAX}`, v.score === SCORE_MAX);
  ligne('rien ne peut la dépasser en restant cohérent',
    'toute fiche valide ≤ SCORE_MAX', v.score <= SCORE_MAX);
}

console.log('\n=== 6. LE BARÈME EST UNIQUE (jeu = serveur) ===');
{
  // ⚠️ SI CE TEST TOMBE, LE CLASSEMENT EST MORT : le serveur refuserait des
  // scores que le jeu affiche. C'est LA raison pour laquelle `scoreCarriere()`
  // délègue à `scoreDeLaFiche()` au lieu de recopier la formule.
  const joueur: Joueur = {
    nom: 'Colin Gomez', poste: 'demi_melee', nation: 'France', club: 'Stade Toulousain',
    division: 'top14', age: 29,
    attributs: {
      vitesse: 80, force: 74, endurance: 78, plaquage: 76,
      passe: 82, jeuAuPied: 71, vision: 84, mental: 79,
    },
    forme: 80, moral: 75, reputation: 72, argent: 250_000, saison: 12,
    matchsJoues: 210, essais: 44, selections: 21,
    titres: ['Bouclier de Brennus (S8)', 'Champions Cup (S9)', 'Tournoi des 6 Nations (S10)'],
    palmares: [
      { trophee: 'brennus', nom: 'Bouclier de Brennus', saison: 8, club: 'Stade Toulousain' },
      { trophee: 'champions', nom: 'Champions Cup', saison: 9, club: 'Stade Toulousain' },
      { trophee: 'sixNations', nom: 'Tournoi des 6 Nations', saison: 10, club: 'France' },
    ],
  };
  const f = ficheDepuisJoueur(joueur, 'Aznred');
  ligne('scoreCarriere() == scoreDeLaFiche()',
    `${scoreCarriere(joueur)} vs ${f.score}`, scoreCarriere(joueur) === f.score);
  const v = verifierFiche(f, IDS_TROPHEES);
  ligne('la fiche produite par le jeu est valide',
    v.anomalies.join(' | ') || `score ${v.score}`, v.valide);
  ligne('l’âge de début est déduit, pas inventé',
    `${f.ageDebut} + ${f.saisons} − 1 = ${f.ageDebut + f.saisons - 1}`,
    f.ageDebut + f.saisons - 1 === f.age);
  ligne('les titres partent en IDENTIFIANTS, pas en libellés',
    f.titres.join(', '), f.titres.every((t) => IDS_TROPHEES.includes(t)));
}

console.log('\n=== 7. LE SCEAU DÉTECTE UNE SAUVEGARDE RETOUCHÉE ===');
{
  const sel = 'sel-de-test';
  const f = fiche();
  const s = sceller(f, sel);
  ligne('un sceau est stable', s, sceauValide(f, s, sel));
  ligne('modifier un chiffre invalide le sceau', 'essais 44 → 45',
    !sceauValide({ ...f, essais: 45 }, s, sel));
  ligne('un autre sel donne un autre sceau', 'sel différent', sceller(f, 'autre') !== s);
  // L'ordre des titres ne doit PAS changer le sceau : deux carrières identiques
  // qui listent leurs trophées dans un ordre différent, c'est la même carrière.
  const melange = { ...f, titres: [...f.titres].reverse() };
  ligne('l’ordre des titres n’altère pas le sceau',
    canonique(melange) === canonique(f) ? 'canonique identique' : 'DIFFÈRE',
    sceauValide(melange, s, sel));
}

console.log('\n=== 8. LES SUCCÈS ===');
{
  const ids = SUCCES.map((s) => s.id);
  const doublons = ids.filter((id, i) => ids.indexOf(id) !== i);
  ligne('nombre de succès', `${SUCCES.length}`, SUCCES.length >= 60);
  ligne('aucun identifiant en double', doublons.length ? doublons.join(', ') : 'aucun', doublons.length === 0);
  ligne('index cohérent', `${Object.keys(SUCCES_PAR_ID).length} entrées`,
    Object.keys(SUCCES_PAR_ID).length === SUCCES.length);

  const sansNom = SUCCES.filter((s) => !s.nom || !s.desc || !s.emoji);
  ligne('tous ont un nom, une description et un emoji',
    sansNom.length ? sansNom.map((s) => s.id).join(', ') : 'oui', sansNom.length === 0);
  const ovasFous = SUCCES.filter((s) => s.ovas < 1 || s.ovas > 40);
  ligne('récompenses dans l’économie du jeu (1-40 Ovas)',
    ovasFous.length ? ovasFous.map((s) => `${s.id}:${s.ovas}`).join(', ') : 'oui',
    ovasFous.length === 0);

  // ⚠️ Aucun succès ne doit exploser sur une sauvegarde incomplète : c'est le
  // cas d'une carrière d'avant l'ajout des statistiques détaillées.
  const nu = {
    joueur: {
      nom: 'X', poste: 'arriere', nation: 'France', club: 'X', age: 18,
      attributs: { vitesse: 30, force: 30, endurance: 30, plaquage: 30, passe: 30, jeuAuPied: 30, vision: 30, mental: 30 },
      forme: 50, moral: 50, reputation: 0, argent: 0, saison: 1,
      matchsJoues: 0, essais: 0, titres: [],
    } as Joueur,
    posts: [], abonnes: 0, pantheon: [],
  };
  let plante = 0;
  let atteints = 0;
  for (const s of SUCCES) {
    try { if (s.atteint(nu)) atteints++; } catch { plante++; console.log(`     ❌ ${s.id} plante`); }
  }
  ligne('aucun succès ne plante sur une carrière vierge', `${plante} plantage(s)`, plante === 0);
  ligne('une carrière vierge n’en débloque aucun', `${atteints} débloqué(s)`, atteints === 0);

  const secrets = SUCCES.filter((s) => s.secret).length;
  console.log(`     ${secrets} succès secrets · ${SUCCES.reduce((a, s) => a + s.ovas, 0)} Ovas au total`);
}

console.log('\n=== 9. LA TABLE SE REMPLIT VRAIMENT (retraite → envoi) ===');
{
  // ⚠️ CE TEST EXISTE À CAUSE D'UN BUG SIGNALÉ EN JEU : « le classement
  // fonctionne pas, la table se remplit pas ». Le serveur, la base et le barème
  // étaient bons — vérifiés un par un — mais RIEN N'ENVOYAIT JAMAIS. L'envoi
  // était entièrement manuel et caché dans un dépliant replié de l'écran
  // Classement, alors que ce même écran promet « mène une carrière à son terme
  // et elle y entrera ». Un test sur le barème seul ne pouvait pas l'attraper :
  // il faut vérifier que la RETRAITE déclenche l'envoi.
  //
  // `fetch` est remplacé le temps du test : zéro requête réseau, et on lit
  // exactement ce que le jeu aurait envoyé.
  const vraiFetch = globalThis.fetch;
  const envois: { url: string; corps: FicheCarriere }[] = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    envois.push({ url: String(url), corps: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify({ ok: true, score: 0 }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const { useGame } = await import('../src/store/useGame');
    const g = () => useGame.getState();
    g().reinitialiser();
    g().creerJoueur({
      nom: 'Retraité Test', poste: 'demi_melee', nation: 'France',
      club: 'Stade Nantais', division: 'nationale2', age: 18,
    });
    for (let s = 0; s < 3; s++) jouerUneSaison(g, (p) => useGame.setState(p));
    const avantRetraite = g().joueur!;
    g().prendreRetraite('entraîneur');
    // L'envoi est volontairement « au fil de l'eau » (on n'attend pas la
    // réponse) : on laisse la micro-tâche se dérouler.
    await new Promise((r) => setTimeout(r, 0));

    // ⚠️ CE QUI EST VÉRIFIÉ DANS TOUS LES CAS : la fiche qui partirait est
    // valide. C'est le vrai risque — une fiche refusée par le serveur, et la
    // carrière n'entre jamais au classement, quelle que soit la plomberie.
    const fichePartante = ficheDepuisJoueur(avantRetraite);
    ligne('la fiche produite à la retraite est acceptable',
      verifierFiche(fichePartante, IDS_TROPHEES).anomalies.join(' | ') || 'valide',
      verifierFiche(fichePartante, IDS_TROPHEES).valide);
    ligne('… et son score est celui du jeu',
      `${fichePartante.score} vs ${scoreCarriere(avantRetraite)}`,
      fichePartante.score === scoreCarriere(avantRetraite));

    // ⚠️ L'ENVOI RÉEL NE PEUT ÊTRE OBSERVÉ QUE SI UNE URL EST CONFIGURÉE.
    // `envoyerAuClassement` refuse volontairement de partir en développement
    // sans `VITE_CLASSEMENT_URL` (voir `lib/classementEnLigne.ts`) : la
    // plomberie se teste donc en la fournissant. On le DIT au lieu de sauter le
    // contrôle en silence — un test qui s'esquive se lit comme un test qui
    // passe.
    if (CLASSEMENT_EN_LIGNE) {
      // ⚠️ L'ENVOI EST AUTOMATIQUE ET RÉPÉTÉ (demande explicite : « il faut que
      // ça s'envoie automatiquement »). Une par fin de saison, plus une à la
      // retraite : sur trois saisons jouées, on attend QUATRE requêtes. Le
      // serveur ne garde que le meilleur score, renvoyer ne dégrade rien.
      ligne('chaque fin de saison envoie la carrière', `${envois.length} requête(s) pour 3 saisons + retraite`,
        envois.length === 4);
      const dernier = envois[envois.length - 1];
      ligne('… et la dernière est bien celle de la retraite', dernier?.url ?? '—',
        dernier?.corps?.score === fichePartante.score);
      // Les scores ne peuvent que monter : une carrière ne perd pas de matchs.
      const croissants = envois.every((e, i) => i === 0 || e.corps.score >= envois[i - 1].corps.score);
      ligne('les scores envoyés ne reculent jamais',
        envois.map((e) => e.corps.score).join(' → '), croissants);
    } else {
      console.log('  ⏭️  envoi réseau non observé : aucune URL de classement configurée.');
      console.log('     Pour le contrôler : '
        + 'VITE_CLASSEMENT_URL=https://exemple.test/api/classement npx vite-node scripts/verifClassement.ts');
    }

    // Le Hall garde les IDS des trophées : sans eux, une carrière terminée était
    // refusée par le serveur (« trophée(s) inconnu(s) : titre »).
    const legende = g().pantheon[g().pantheon.length - 1];
    ligne('le Hall mémorise les ids de trophées',
      `${legende?.tropheeIds?.length ?? 'ABSENT'} id(s) pour ${legende?.titres.length ?? 0} titre(s)`,
      Array.isArray(legende?.tropheeIds)
        && legende.tropheeIds.length === (avantRetraite.palmares ?? []).length);
    const f = ficheDepuisLegende(legende, 'Aznred');
    ligne('… et la fiche d’une légende est acceptée',
      verifierFiche(f, IDS_TROPHEES).anomalies.join(' | ') || `score ${f.score}`,
      verifierFiche(f, IDS_TROPHEES).valide);
  } finally {
    globalThis.fetch = vraiFetch;
  }
}

console.log(echecs === 0 ? '\n✅ Classement protégé, succès conformes.' : `\n❌ ${echecs} contrôle(s) en échec.`);
