// ═══════════════════════════════════════════════════════════════════════════
// LE SOCLE DE LA LIGUE EN LIGNE — banc de mesure
// ═══════════════════════════════════════════════════════════════════════════
// Tout ce qui est vérifié ici tourne AUSSI dans les fonctions serverless : ce
// banc est donc la seule façon de mesurer le mode en ligne sans base de données
// ni navigateur.
//
//   npm run verify:ligue
//
// Ce qu'il regarde, dans l'ordre :
//   1. les réglages et leurs bornes
//   2. les identités (codes d'invitation, noms)
//   3. le vivier : taille, unicité, faisabilité de 4 à 20 clubs
//   4. la dotation : 30 joueurs, tous les postes, écart de force entre clubs
//   5. la valeur marchande et le garde-fou anti-cadeau
//   6. les packs, et À QUEL MOMENT le vivier se tarit
//   7. l'économie d'OVA sur une saison
//   8. le calendrier : toutes rondes, réceptions, fenêtres

import {
  BORNES, PRESELECTIONS, reglagesParDefaut, verifierReglages, reglagesAssainis,
  nombreDeJournees, semainesDeSaison,
} from '../src/lib/ligue/reglages';
import { codeInvitation, normaliserCode, verifierNom, etiquetteCompte, cleNom } from '../src/lib/ligue/identite';
import {
  vivierDeLaLigue, tailleVivier, cartesLibres, cartesDuClub, forceDeLEffectif,
  QUOTAS_POSTE, TAILLE_EFFECTIF, catalogueDisponible, PYRAMIDE, effectifsDeBande,
} from '../src/lib/ligue/vivier';
import { distribuerDotations, verifierDotation, PALIERS } from '../src/lib/ligue/dotation';
import { valeurCarte, fourchetteCarte, peserEchange, suiteDonneeALEchange, offreMinimale } from '../src/lib/ligue/valeur';
import { PACKS, packParId, ouvrirPack } from '../src/lib/ligue/packs';
import { OVA_DEPART, gainsDeRencontre, gainsDeSaisonEstimes, recompenseClassement } from '../src/lib/ligue/ova';
import { calendrierChampionnat, calendrierDate, verifierCalendrier } from '../src/lib/ligue/calendrier';
import { graine } from '../src/lib/ligue/aleatoire';
import { rareteDeLaNote } from '../src/lib/ligue/rarete';
import type { FamillePoste } from '../src/types';
import type { CarteJoueur } from '../src/lib/ligue/types';

let ko = 0;
const dire = (ok: boolean, quoi: string, detail = '') => {
  if (!ok) ko++;
  console.log(`  ${ok ? '✅' : '❌'} ${quoi.padEnd(58)} ${detail}`);
};
const titre = (n: string) => console.log(`\n  ${n}\n  ${'─'.repeat(76)}`);
const ova = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} OVA`;
const clubsDe = (n: number) => Array.from({ length: n }, (_, i) => `club${i + 1}`);

// ═══ 1. RÉGLAGES ═══════════════════════════════════════════════════════════
titre('1. Réglages : bornes, préréglages, journées');
{
  const bons = reglagesParDefaut('ultimate', 10);
  dire(verifierReglages(bons).length === 0, 'les réglages par défaut passent la validation');
  dire(verifierReglages({ ...bons, clubs: 3 }).includes('reglages.clubs'), '3 clubs est refusé');
  dire(verifierReglages({ ...bons, clubs: 21 }).includes('reglages.clubs'), '21 clubs est refusé');
  dire(verifierReglages({ ...bons, clubs: 9 }).length === 0, '9 clubs est accepté (exemption)');
  dire(
    verifierReglages({ ...bons, rythme: 2, jours: [0] }).includes('reglages.jours.nombre'),
    'rythme 2 avec un seul jour est refusé',
  );
  dire(
    verifierReglages({ ...bons, rythme: 2, jours: [0, 0] }).includes('reglages.jours.doublon'),
    'deux journées le même jour est refusé',
  );
  dire(
    verifierReglages({ ...bons, dureteEconomie: 0 }).includes('reglages.dureteEconomie'),
    'une dureté nulle est refusée (gains infinis)',
  );
  dire(
    verifierReglages({ ...bons, packs: false, marche: false, echanges: false })
      .includes('reglages.economieMorte'),
    'une ligue sans packs ni marché ni échanges est refusée',
  );
  const sale = { ...bons, intrus: 42, clubs: 10.7, dureteEconomie: 9 } as never;
  const propre = reglagesAssainis(sale);
  dire(!('intrus' in propre), 'un champ inconnu ne survit pas à l’assainissement');
  dire(propre.clubs === 11 && propre.dureteEconomie === BORNES.dureteEconomie.max,
    'les valeurs sont arrondies et bornées', `clubs ${propre.clubs}, dureté ${propre.dureteEconomie}`);

  dire(PRESELECTIONS.manager.packs === false, 'le type « manager » coupe les packs');
  dire(PRESELECTIONS.hardcore.severiteBlessures > 1.5, 'le type « hardcore » durcit les blessures',
    String(PRESELECTIONS.hardcore.severiteBlessures));
  dire(Object.values(PRESELECTIONS).every((p) => p.plafondSalarial === false),
    'aucun préréglage n’active le plafond salarial (rien ne le lit encore)');

  console.log('\n     clubs   aller   aller-retour   semaines (1/sem)   semaines (2/sem)');
  for (const n of [4, 6, 9, 10, 14, 20]) {
    const a = nombreDeJournees({ clubs: n, format: 'aller' });
    const ar = nombreDeJournees({ clubs: n, format: 'allerRetour' });
    const s1 = semainesDeSaison({ clubs: n, format: 'allerRetour', rythme: 1 });
    const s2 = semainesDeSaison({ clubs: n, format: 'allerRetour', rythme: 2 });
    console.log(`     ${String(n).padStart(5)}   ${String(a).padStart(5)}   ${String(ar).padStart(12)}   ${String(s1).padStart(16)}   ${String(s2).padStart(16)}`);
  }
  dire(nombreDeJournees({ clubs: 10, format: 'allerRetour' }) === 18,
    '10 clubs en aller-retour font bien 18 journées');
  dire(nombreDeJournees({ clubs: 9, format: 'aller' }) === 9,
    '9 clubs en aller simple font 9 journées (une exemption chacun)');
}

// ═══ 2. IDENTITÉS ══════════════════════════════════════════════════════════
titre('2. Identités : codes d’invitation, noms, étiquettes');
{
  const code = codeInvitation('Toulouse Rugby League', 'g-001');
  dire(/^[A-Z]{3}-[A-Z0-9]{5}$/.test(code), 'le code a la forme attendue', code);
  dire(code === codeInvitation('Toulouse Rugby League', 'g-001'), 'le code est déterministe');
  dire(code.startsWith('TLS-'), 'le préfixe vient du nom de la ligue', code);
  dire(normaliserCode(` ${code.toLowerCase()} `) === code, 'un code recopié en minuscules est reconnu');
  dire(normaliserCode(code.replace('-', '')) === code, 'un code sans tiret est reconnu');
  dire(normaliserCode('TLS-8F4K') === null, 'un code trop court est refusé');
  dire(normaliserCode('TLS-8F4KO') === null, 'un caractère hors alphabet est refusé, pas deviné');

  // 3 000 codes : combien de collisions ?
  const vus = new Set<string>();
  let collisions = 0;
  for (let i = 0; i < 3000; i++) {
    const c = codeInvitation('Ligue', `graine-${i}`);
    if (vus.has(c)) collisions++;
    vus.add(c);
  }
  dire(collisions === 0, '3 000 ligues, aucune collision de code', `${vus.size} codes distincts`);

  dire(verifierNom('Colin RFC', 'club') === null, '« Colin RFC » est un nom de club valide');
  dire(verifierNom('a', 'club') === 'court', 'un nom d’une lettre est refusé');
  dire(verifierNom('Club\u200BX', 'club') === 'caracteres', 'un caractère invisible est refusé');
  dire(verifierNom('Stade Rochelais 🏉', 'club') === 'caracteres', 'un emoji est refusé dans un nom');
  dire(cleNom('Colin  RFC') === cleNom('colin rfc'), 'deux noms indistinguables ont la même clé');
  const tag = etiquetteCompte('Colin', 'cpt_9f2a');
  dire(/^Colin#\d{4}$/.test(tag), 'l’étiquette a la forme Pseudo#0000', tag);
}

// ═══ 3. LE VIVIER ══════════════════════════════════════════════════════════
titre('3. Le vivier : taille, unicité, faisabilité');
{
  const catalogue = catalogueDisponible();
  dire(catalogue.length > 3000, 'le catalogue des pros exploitables est fourni', `${catalogue.length} joueurs`);
  dire(new Set(catalogue.map((j) => j.nom)).size === catalogue.length,
    'le catalogue est dédoublonné par nom');
  dire(catalogue.every((j) => j.note >= 55), 'aucun joueur sous la note 55');

  console.log('\n     clubs   cartes   dont 88+   83-87   80-82   75-79   70-74   65-69   55-64   libres après dotation');
  for (const n of [4, 6, 8, 10, 14, 20]) {
    const vivier = vivierDeLaLigue(`banc-${n}`, n);
    const bandes = PYRAMIDE.map((b) => vivier.filter((c) => c.note >= b.min && c.note <= b.max).length);
    const dot = distribuerDotations(vivier, clubsDe(n), `banc-${n}`, 'ultimate');
    const libres = cartesLibres(dot.vivier).length;
    console.log(`     ${String(n).padStart(5)}   ${String(vivier.length).padStart(6)}   ${bandes.map((b) => String(b).padStart(6)).join('  ')}   ${String(libres).padStart(6)}`);

    dire(vivier.length === tailleVivier(n), `  ${n} clubs : la taille annoncée est tenue`,
      `${vivier.length} / ${tailleVivier(n)}`);
    dire(new Set(vivier.map((c) => c.nom)).size === vivier.length,
      `  ${n} clubs : aucun joueur en double dans le vivier`);
    dire(new Set(vivier.map((c) => c.id)).size === vivier.length,
      `  ${n} clubs : aucun identifiant de carte en double`);
    dire(libres >= 5, `  ${n} clubs : il reste des cartes libres après la dotation`, `${libres}`);
  }

  const a = vivierDeLaLigue('meme-graine', 10);
  const b = vivierDeLaLigue('meme-graine', 10);
  dire(a.every((c, i) => c.id === b[i].id && c.nom === b[i].nom), 'deux tirages de même graine sont identiques');
  const c = vivierDeLaLigue('autre-graine', 10);
  const communs = a.filter((x) => c.some((y) => y.nom === x.nom)).length;
  dire(communs < a.length, 'deux graines différentes donnent des mondes différents',
    `${communs}/${a.length} joueurs communs`);

  // La faisabilité par bande : la source contient-elle assez de monde ?
  console.log('\n     Faisabilité de la pyramide à 20 clubs (le maximum) :');
  const quotas = effectifsDeBande(20);
  for (let i = 0; i < PYRAMIDE.length; i++) {
    const bande = PYRAMIDE[i];
    const dispo = catalogue.filter((j) => j.note >= bande.min && j.note <= bande.max).length;
    dire(dispo >= quotas[i], `  bande ${bande.min}-${bande.max} : ${quotas[i]} demandées`,
      `${dispo} disponibles`);
  }
}

// ═══ 4. LA DOTATION ════════════════════════════════════════════════════════
titre('4. La dotation : 30 joueurs, tous les postes, des formes différentes');
{
  const n = 10;
  const clubs = clubsDe(n);
  const vivier = vivierDeLaLigue('dotation-10', n);
  const dot = distribuerDotations(vivier, clubs, 'dotation-10', 'ultimate');
  const defauts = verifierDotation(dot, clubs);
  dire(defauts.length === 0, 'aucun défaut de dotation à 10 clubs',
    defauts.slice(0, 3).map((d) => `${d.club}:${d.motif}:${d.detail}`).join(' · '));
  dire(PALIERS.reduce((t, p) => t + p.combien, 0) === TAILLE_EFFECTIF,
    'les paliers totalisent bien la taille d’un effectif', String(TAILLE_EFFECTIF));

  console.log('\n     club        profil                 force   1re ligne   charnière   3/4     meilleur');
  const forces: number[] = [];
  for (const club of clubs) {
    const cartes = cartesDuClub(dot.vivier, club);
    const force = forceDeLEffectif(cartes);
    forces.push(force);
    const moy = (familles: FamillePoste[]) => {
      const notes = cartes.filter((c) => familles.includes(c.poste)).map((c) => c.note);
      return notes.length ? Math.round(notes.reduce((x, y) => x + y, 0) / notes.length) : 0;
    };
    const meilleur = cartes.reduce((m, c) => (c.note > m.note ? c : m), cartes[0]);
    console.log(
      `     ${club.padEnd(11)} ${dot.profils[club].padEnd(22)} ${String(force).padStart(5)}`
      + `   ${String(moy(['pilier', 'talonneur'])).padStart(9)}`
      + `   ${String(moy(['demi_melee', 'demi_ouverture'])).padStart(9)}`
      + `   ${String(moy(['centre', 'ailier', 'arriere'])).padStart(5)}`
      + `   ${meilleur.nom} ${meilleur.note}`,
    );
  }
  const ecartForce = Math.round((Math.max(...forces) - Math.min(...forces)) * 10) / 10;
  dire(ecartForce <= 1.5, 'l’écart de force entre le premier et le dernier reste faible',
    `${ecartForce} point(s)`);

  // Les formes doivent VRAIMENT différer : au moins un club avec un pack
  // nettement plus fort que ses trois-quarts, et au moins un l'inverse.
  const ecarts = clubs.map((club) => {
    const cartes = cartesDuClub(dot.vivier, club);
    const moy = (familles: FamillePoste[]) => {
      const notes = cartes.filter((c) => familles.includes(c.poste)).map((c) => c.note);
      return notes.length ? notes.reduce((x, y) => x + y, 0) / notes.length : 0;
    };
    return moy(['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'])
      - moy(['demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere']);
  });
  dire(Math.max(...ecarts) >= 2, 'au moins un club a un pack nettement plus fort',
    `+${Math.max(...ecarts).toFixed(1)}`);
  dire(Math.min(...ecarts) <= -2, 'au moins un club a des trois-quarts nettement plus forts',
    `${Math.min(...ecarts).toFixed(1)}`);

  // Une ligue « équilibrée » doit resserrer tout ça.
  const eq = distribuerDotations(vivierDeLaLigue('eq-10', n), clubs, 'eq-10', 'equilibre');
  const ecartsEq = clubs.map((club) => {
    const cartes = cartesDuClub(eq.vivier, club);
    const moy = (familles: FamillePoste[]) => {
      const notes = cartes.filter((c) => familles.includes(c.poste)).map((c) => c.note);
      return notes.length ? notes.reduce((x, y) => x + y, 0) / notes.length : 0;
    };
    return Math.abs(moy(['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'])
      - moy(['demi_melee', 'demi_ouverture', 'centre', 'ailier', 'arriere']));
  });
  dire(Math.max(...ecartsEq) < Math.max(...ecarts.map(Math.abs)),
    'la ligue « équilibrée » resserre les formes',
    `max ${Math.max(...ecartsEq).toFixed(1)} contre ${Math.max(...ecarts.map(Math.abs)).toFixed(1)}`);

  // ⚠️ TOUTES LES TAILLES, TOUTES LES GRAINES. Le défaut « un club sans
  // arrière » n'apparaissait qu'à huit clubs, sur une graine sur quelques-unes :
  // un contrôle par taille l'aurait laissé passer une fois sur deux. On balaie
  // donc 17 tailles × 25 graines × 5 types = 2 125 ligues.
  {
    let ligues = 0;
    let fautives = 0;
    let pireDefaut = '';
    const types = ['ultimate', 'manager', 'draft', 'equilibre', 'hardcore'] as const;
    for (let taille = 4; taille <= 20; taille++) {
      const cl = clubsDe(taille);
      for (let g = 0; g < 25; g++) {
        const type = types[g % types.length];
        const cle = `stress-${taille}-${g}`;
        const d = distribuerDotations(vivierDeLaLigue(cle, taille), cl, cle, type);
        const def = verifierDotation(d, cl);
        ligues++;
        if (def.length) {
          fautives++;
          if (!pireDefaut) pireDefaut = `${taille} clubs, ${cle} : ${def[0].motif} ${def[0].detail}`;
        }
      }
    }
    dire(fautives === 0, `${ligues} ligues tirées de 4 à 20 clubs : aucune dotation bancale`,
      fautives ? `${fautives} fautives — ${pireDefaut}` : 'toutes jouables');
  }

  const quotaTotal = Object.values(QUOTAS_POSTE).reduce((x, y) => x + y, 0);
  dire(quotaTotal === TAILLE_EFFECTIF, 'les quotas de poste totalisent l’effectif', String(quotaTotal));
}

// ═══ 5. LA VALEUR ET L’ANTI-CADEAU ═════════════════════════════════════════
titre('5. Valeur marchande et garde-fou anti-cadeau');
{
  const carte = (note: number, age = 27, potentiel = note): CarteJoueur => ({
    id: `t${note}`, nom: 'Test', poste: 'centre', nation: 'FRA',
    age, note, potentiel, rarete: rareteDeLaNote(note), proprietaire: null,
  });

  console.log('\n     note   valeur (27 ans)   fourchette              19 ans/pot+20   33 ans');
  for (const note of [55, 62, 68, 74, 78, 82, 85, 88, 91]) {
    const v = valeurCarte(carte(note));
    const f = fourchetteCarte(carte(note));
    const jeune = valeurCarte(carte(note, 19, Math.min(99, note + 20)));
    const vieux = valeurCarte(carte(note, 33));
    console.log(
      `     ${String(note).padStart(4)}   ${ova(v).padStart(15)}   ${(ova(f.bas) + ' – ' + ova(f.haut)).padStart(22)}`
      + `   ${ova(jeune).padStart(13)}   ${ova(vieux).padStart(13)}`,
    );
  }
  const f82 = fourchetteCarte(carte(82));
  dire(f82.bas >= 33_000 && f82.bas <= 37_000 && f82.haut >= 47_000 && f82.haut <= 53_000,
    'un OVR 82 tient l’ancrage demandé (35–50k)', `${ova(f82.bas)} – ${ova(f82.haut)}`);
  dire(valeurCarte(carte(88)) > 3 * valeurCarte(carte(74)),
    'un 88 vaut plus que trois joueurs à 74 (on ne l’achète pas au tas)',
    `${ova(valeurCarte(carte(88)))} contre ${ova(3 * valeurCarte(carte(74)))}`);
  dire(valeurCarte(carte(68, 19, 88)) > valeurCarte(carte(68, 28, 68)),
    'un espoir vaut plus qu’un joueur fini de même note',
    `${ova(valeurCarte(carte(68, 19, 88)))} contre ${ova(valeurCarte(carte(68, 28, 68)))}`);
  dire(valeurCarte(carte(68, 19, 88)) < valeurCarte(carte(78)),
    'mais moins qu’un vrai 78 : le pari reste un pari');

  // LE CAS QUI TUE UNE LIGUE
  const cadeau = peserEchange([carte(90)], 0, [], 1);
  dire(cadeau.verdict === 'aberrant', 'un OVR 90 contre 1 OVA est jugé aberrant',
    `écart ${(cadeau.ecart * 100).toFixed(0)} %`);
  dire(suiteDonneeALEchange(cadeau, 'competitif') === 'refuse', '  … refusé en ligue compétitive');
  dire(suiteDonneeALEchange(cadeau, 'fairplay') === 'validationCommissaire', '  … arbitré en ligue fair-play');
  dire(suiteDonneeALEchange(cadeau, 'libre') === 'autorise', '  … autorisé en ligue libre (mais journalisé)');

  const normal = peserEchange([carte(81)], 0, [carte(82)], 0);
  dire(normal.verdict === 'equilibre', 'un 81 contre un 82 passe sans un mot',
    `écart ${(normal.ecart * 100).toFixed(0)} %`);
  const troisContreUn = peserEchange([carte(76), carte(72)], 12_000, [carte(81)], 0);
  dire(suiteDonneeALEchange(troisContreUn, 'competitif') === 'autorise',
    'deux joueurs + 12 000 OVA contre un 81 restent autorisés',
    `écart ${(troisContreUn.ecart * 100).toFixed(0)} %`);
  const vide = peserEchange([], 0, [], 0);
  dire(Number.isFinite(vide.ecart), 'une offre vide ne produit pas un écart NaN', String(vide.ecart));

  dire(offreMinimale(null, 5_000) === 5_000, 'la première enchère part de la mise à prix');
  dire(offreMinimale(38_500, 5_000) > 38_500 + 500, 'le pas d’enchère interdit le +1 OVA',
    `minimum ${ova(offreMinimale(38_500, 5_000))}`);
}

// ═══ 6. LES PACKS ══════════════════════════════════════════════════════════
titre('6. Les packs : garanties tenues, et quand le vivier se tarit');
{
  dire(PACKS.length === 5, 'les cinq packs de la demande existent',
    PACKS.map((p) => p.id).join(' · '));
  dire(PACKS.every((p) => p.places.length === 5), 'chaque pack contient cinq cartes');

  const n = 10;
  const clubs = clubsDe(n);
  const vivier = vivierDeLaLigue('packs-10', n);
  const dot = distribuerDotations(vivier, clubs, 'packs-10', 'ultimate');
  let libres = cartesLibres(dot.vivier);
  const debut = libres.length;

  // 1 000 ouvertures de pack standard sur un vivier RECOPIÉ (on ne consomme
  // pas) : la garantie « rare » tient-elle tant qu'il y a du stock ?
  {
    const rng = graine('packs|garanties');
    let tenues = 0;
    for (let i = 0; i < 1000; i++) {
      const r = ouvrirPack(packParId('standard')!, libres, rng);
      if (r.cartes.some((c) => c.carte.note >= 75)) tenues++;
    }
    dire(tenues === 1000, 'le pack standard tient sa garantie « rare » sur 1 000 ouvertures',
      `${tenues}/1000`);
    const rngP = graine('packs|premium');
    let sous72 = 0;
    for (let i = 0; i < 500; i++) {
      const r = ouvrirPack(packParId('premium')!, libres, rngP);
      if (r.cartes.some((c) => c.carte.note < 72)) sous72++;
    }
    dire(sous72 === 0, 'le pack premium ne sort aucun joueur sous 72 tant qu’il y a du stock',
      `${sous72}/500 fautifs`);
    const rngE = graine('packs|espoir');
    let horsAge = 0;
    for (let i = 0; i < 500; i++) {
      const r = ouvrirPack(packParId('espoir')!, libres, rngE);
      if (r.cartes.some((c) => c.carte.age > 22)) horsAge++;
    }
    dire(horsAge === 0, 'le pack espoir ne sort que des U23', `${horsAge}/500 fautifs`);
    const rngA = graine('packs|avants');
    const avants: FamillePoste[] = ['pilier', 'talonneur', 'deuxieme_ligne', 'troisieme_ligne'];
    let horsPoste = 0;
    for (let i = 0; i < 500; i++) {
      const r = ouvrirPack(packParId('avants')!, libres, rngA);
      if (r.cartes.some((c) => !avants.includes(c.carte.poste))) horsPoste++;
    }
    dire(horsPoste === 0, 'le pack avants ne sort que des postes 1 à 8', `${horsPoste}/500 fautifs`);
  }

  // L'ÉPUISEMENT : dix clubs achètent des packs standard jusqu'à la corde.
  console.log('\n     Épuisement du vivier — dix clubs ouvrent des packs standard :\n');
  console.log('     packs   cartes libres   dont 75+   garanties dégradées   OVA dépensés');
  const rng = graine('packs|epuisement');
  const restant = dot.vivier.map((c) => ({ ...c }));
  let ouverts = 0;
  let degrades = 0;
  let premierDegrade = 0;
  for (let tour = 1; tour <= 60; tour++) {
    libres = cartesLibres(restant);
    if (libres.length < 5) break;
    const r = ouvrirPack(packParId('standard')!, libres, rng);
    ouverts++;
    if (r.degradations > 0) {
      degrades++;
      if (!premierDegrade) premierDegrade = ouverts;
    }
    for (const { carte } of r.cartes) {
      const cible = restant.find((c) => c.id === carte.id);
      if (cible) cible.proprietaire = 'acheteur';
    }
    if (tour % 10 === 0 || tour === 1) {
      const libresApres = cartesLibres(restant);
      console.log(
        `     ${String(ouverts).padStart(5)}   ${String(libresApres.length).padStart(13)}`
        + `   ${String(libresApres.filter((c) => c.note >= 75).length).padStart(8)}`
        + `   ${String(degrades).padStart(19)}   ${ova(ouverts * 5000).padStart(12)}`,
      );
    }
  }
  dire(premierDegrade > 0, 'la garantie « rare » finit par se tarir — c’est voulu',
    premierDegrade ? `à partir du pack n°${premierDegrade}` : 'jamais (vivier trop riche)');
  dire(premierDegrade === 0 || premierDegrade >= 8,
    'mais pas avant une petite dizaine de packs (5 000 OVA pièce)',
    premierDegrade ? `n°${premierDegrade}, soit ${ova(premierDegrade * 5000)}` : '—');
  console.log(`\n     Cartes libres au coup d’envoi : ${debut} · après ${ouverts} packs : ${cartesLibres(restant).length}`);
}

// ═══ 7. L’ÉCONOMIE ═════════════════════════════════════════════════════════
titre('7. L’économie d’OVA sur une saison');
{
  const reglages = { dureteEconomie: 1 };
  const victoireBonus = gainsDeRencontre({ pointsPour: 34, pointsContre: 12, essaisPour: 5 }, reglages);
  const defaite = gainsDeRencontre({ pointsPour: 10, pointsContre: 31, essaisPour: 1 }, reglages);
  const defaiteCourte = gainsDeRencontre({ pointsPour: 22, pointsContre: 25, essaisPour: 3 }, reglages);
  console.log(`\n     victoire avec bonus offensif : ${ova(victoireBonus)}`);
  console.log(`     défaite large                : ${ova(defaite)}`);
  console.log(`     défaite courte (bonus déf.)  : ${ova(defaiteCourte)}`);
  dire(victoireBonus === 1900, 'une victoire à 5 essais rapporte 1 900 OVA', ova(victoireBonus));
  dire(defaite === 1000, 'une défaite rapporte quand même les 1 000 OVA du match joué');
  dire(defaiteCourte > defaite, 'une défaite courte rapporte plus qu’une déroute');
  dire(gainsDeRencontre({ pointsPour: 34, pointsContre: 12, essaisPour: 5 }, { dureteEconomie: 2 }) < victoireBonus,
    'la dureté « hardcore » divise les gains');

  console.log('\n     rang   1er     2e      3e      4e      dernier (10 clubs)');
  const rangs = [1, 2, 3, 4, 10].map((r) => ova(recompenseClassement(r, 10)));
  console.log(`            ${rangs.map((r) => r.padStart(7)).join(' ')}`);
  dire(recompenseClassement(1, 10) === 30_000 && recompenseClassement(2, 10) === 20_000
    && recompenseClassement(3, 10) === 15_000, 'le podium respecte le barème demandé');
  dire(recompenseClassement(10, 10) > 0, 'le dernier touche quelque chose (sinon il décroche)');
  dire(recompenseClassement(11, 10) === 0, 'un rang hors classement ne rapporte rien');

  const saison = gainsDeSaisonEstimes(18, 10, reglages);
  const dur = gainsDeSaisonEstimes(18, 10, { dureteEconomie: 1.6 });
  console.log(`\n     Une saison de 18 journées à 10 clubs : ~${ova(saison)} (hardcore : ~${ova(dur)})`);
  console.log(`     Dotation de départ : ${ova(OVA_DEPART)}`);
  console.log(`     À comparer : un OVR 82 vaut ${ova(valeurCarte({ note: 82, age: 27, potentiel: 82 } as CarteJoueur))}`);
  console.log(`                  un OVR 88 vaut ${ova(valeurCarte({ note: 88, age: 27, potentiel: 88 } as CarteJoueur))}`);
  dire(saison > 30_000 && saison < 55_000, 'une saison rapporte entre 30 000 et 55 000 OVA', ova(saison));
  dire(saison < valeurCarte({ note: 88, age: 27, potentiel: 88 } as CarteJoueur),
    'une saison entière ne suffit pas à s’offrir un joueur à 88');
  dire(OVA_DEPART >= 4 * 5000 && OVA_DEPART < valeurCarte({ note: 80, age: 27, potentiel: 80 } as CarteJoueur),
    'la dotation de départ vaut quatre packs, jamais un joueur à 80');
}

// ═══ 8. LE CALENDRIER ══════════════════════════════════════════════════════
titre('8. Le calendrier : toutes rondes, réceptions, fenêtres');
{
  for (const n of [4, 6, 8, 9, 10, 13, 20]) {
    const clubs = clubsDe(n);
    for (const format of ['aller', 'allerRetour'] as const) {
      const cal = calendrierChampionnat(clubs, format);
      const defauts = verifierCalendrier(cal, clubs, format);
      const matchs = cal.reduce((t, j) => t + j.length, 0);
      const attendu = (n * (n - 1) / 2) * (format === 'allerRetour' ? 2 : 1);
      dire(defauts.length === 0 && matchs === attendu,
        `  ${String(n).padStart(2)} clubs, ${format === 'aller' ? 'aller       ' : 'aller-retour'} : ${cal.length} journées`,
        defauts.length ? `${defauts[0].motif} — ${defauts[0].detail}` : `${matchs} matchs`);
    }
  }

  // L'écart de réceptions, taille par taille — c'est CE tableau qui a montré
  // les huit réceptions d'écart du carrousel nu.
  console.log('\n     Écart de réceptions (max − min), de 4 à 20 clubs :\n');
  let ligneA = '     aller        ';
  let ligneAR = '     aller-retour ';
  let pire = 0;
  for (let n = 4; n <= 20; n++) {
    for (const format of ['aller', 'allerRetour'] as const) {
      const cl = clubsDe(n);
      const cal = calendrierChampionnat(cl, format);
      const recus = new Map<string, number>(cl.map((c) => [c, 0]));
      for (const j of cal) for (const r of j) recus.set(r.domicile, (recus.get(r.domicile) ?? 0) + 1);
      const v = [...recus.values()];
      const e = Math.max(...v) - Math.min(...v);
      pire = Math.max(pire, e);
      if (format === 'aller') ligneA += String(e).padStart(3);
      else ligneAR += String(e).padStart(3);
    }
  }
  console.log(`     clubs        ${Array.from({ length: 17 }, (_, i) => String(i + 4).padStart(3)).join('')}`);
  console.log(ligneA);
  console.log(ligneAR);
  dire(pire <= 1, 'aucune taille ne dépasse une réception d’écart', `pire cas : ${pire}`);

  const clubs = clubsDe(10);
  const journees = calendrierDate(clubs, 'allerRetour', '2026-09-06', [0]);
  console.log('\n     Dix clubs, aller-retour, une journée le dimanche, départ le 06/09/2026 :\n');
  for (const j of [journees[0], journees[1], journees[8], journees[17]]) {
    console.log(`     J${String(j.numero).padStart(2)}   ouvre ${j.ouvre.slice(0, 16)}   ferme ${j.ferme.slice(0, 16)}   ${j.rencontres.length} matchs`);
  }
  dire(journees.length === 18, '18 journées datées');
  dire(journees.every((j) => Date.parse(j.ouvre) < Date.parse(j.ferme)), 'chaque fenêtre s’ouvre avant de se fermer');
  dire(journees.every((j, i) => i === 0 || Date.parse(j.ouvre) === Date.parse(journees[i - 1].ferme) + 1000),
    'les fenêtres sont contiguës et ne se chevauchent jamais');
  dire(journees.every((j) => new Date(j.ferme).getUTCDay() === 0), 'toutes les journées ferment un dimanche');
  const fin = journees[journees.length - 1].ferme.slice(0, 10);
  console.log(`     Fin de saison : ${fin}`);

  const deux = calendrierDate(clubs, 'allerRetour', '2026-09-01', [3, 0]);
  dire(deux.every((j) => [0, 3].includes(new Date(j.ferme).getUTCDay())),
    'à deux matchs par semaine, les journées ferment mercredi ou dimanche');
  const duree = (Date.parse(deux[deux.length - 1].ferme) - Date.parse(deux[0].ouvre)) / (7 * 24 * 3600 * 1000);
  dire(duree < 11, 'et la saison tient en moins de onze semaines', `${duree.toFixed(1)} semaines`);

  // Les réceptions, club par club, à dix.
  const receptions = new Map<string, number>();
  for (const j of journees) for (const r of j.rencontres) {
    receptions.set(r.domicile, (receptions.get(r.domicile) ?? 0) + 1);
  }
  const valeurs = [...receptions.values()];
  dire(Math.max(...valeurs) - Math.min(...valeurs) === 0,
    'en aller-retour à 10 clubs, tout le monde reçoit le même nombre de fois',
    `${Math.min(...valeurs)} à ${Math.max(...valeurs)}`);
}

console.log(`\n  ${ko === 0 ? '✅ Le socle de la ligue tient.' : `❌ ${ko} contrôle(s) en échec.`}\n`);
