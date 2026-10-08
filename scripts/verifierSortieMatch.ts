// BANC DE LA SORTIE D'UN MATCH (Correctif 32)
//
// Signalé : « sur iPad et iPhone 15, au moment de revenir sur l'écran d'accueil de la carrière ça crashe, on est figé
// et on doit relancer le jeu ». Aucun iPhone ici : ce banc tient donc ce qui se PROUVE sans appareil —
//   1. le JSON étroit : la sauvegarde relue est la sauvegarde écrite, et plus un caractère ne dépasse U+00FF ;
//   2. un stockage plein (compté comme Safari : deux octets par caractère d'une chaîne « large ») ne lève plus rien,
//      rend d'abord le catalogue gardé d'une visite à l'autre, le dit à l'écran, et rattrape dès que la place revient ;
//   3. la finalisation aboutit TOUJOURS : stockage qui refuse, scène qui ne se rend jamais ;
//   4. la sortie navigue TOUJOURS : boucle qui ne rend pas la main, crochet en erreur ; elle n'attend un retour debout
//      que si le jeu a lui-même tourné l'écran (jamais sur un iPhone tenu en paysage) ;
//   5. le fil de la fin de match : écrit étape par étape, fermé à la navigation, relevé une seule fois s'il est resté ouvert.
//
//   npm run verify:sortie-match

import assert from 'node:assert/strict';

// ── Un navigateur minimal, dont le stockage compte comme celui de Safari ─────────────────────────────────────────
const valeurs = new Map<string, string>();
let quota = Infinity;
const large = (s: string) => /[Ā-￿]/.test(s);
const octets = (s: string) => s.length * (large(s) ? 2 : 1);
const occupe = () => [...valeurs].reduce((n, [cle, valeur]) => n + octets(cle) + octets(valeur), 0);
let refus = 0;
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (cle: string) => valeurs.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => {
    const apres = occupe() - (valeurs.has(cle) ? octets(cle) + octets(valeurs.get(cle)!) : 0) + octets(cle) + octets(valeur);
    if (apres > quota) { refus++; throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError', code: 22 }); }
    valeurs.set(cle, valeur);
  },
  removeItem: (cle: string) => { valeurs.delete(cle); },
  key: (i: number) => [...valeurs.keys()][i] ?? null,
  get length() { return valeurs.size; },
}, configurable: true });

const taille = { largeur: 844, hauteur: 390 };
let tactile = true;
const fenetre = Object.assign(new EventTarget(), {
  localStorage: globalThis.localStorage, setTimeout, clearTimeout,
  matchMedia: (requete: string) => ({ matches: requete.includes('coarse') ? tactile : false }),
  get innerWidth() { return taille.largeur; }, get innerHeight() { return taille.hauteur; },
});
Object.defineProperty(globalThis, 'window', { value: fenetre, configurable: true });
const corps = { children: [] as unknown[], style: { overflow: '' } };
const pageWeb = Object.assign(new EventTarget(), {
  hidden: true, fullscreenElement: null as unknown, body: corps,
  documentElement: { style: { setProperty() { /* variables CSS */ } }, dataset: {} as Record<string, string> },
  exitFullscreen: async () => { /* rien à quitter */ },
});
Object.defineProperty(globalThis, 'document', { value: pageWeb, configurable: true });
let verrouAccorde = false;
Object.defineProperty(globalThis, 'screen', { value: { orientation: Object.assign(new EventTarget(), {
  lock: async () => { if (!verrouAccorde) throw new Error('NotSupportedError'); },
  unlock: () => { /* rendu */ },
}) }, configurable: true });

const { jsonEtroit, CLE_STOCKAGE_SERRE, cleDe, emplacementActif, supprimerEmplacement } = await import('../src/lib/sauvegardes');
const { EVENEMENT_STOCKAGE, stockageCarriereOptimise, stockagePlein, stockageSerre } = await import('../src/lib/persistanceNavigation');
const { ATTENTE_SCENE_MAX, EVENEMENT_SORTIE, auPlus, dernierFil, finaliserMatch, jalon, oublierFinalisations, releverFilInterrompu, tracer } = await import('../src/lib/finMatch');
const { DELAI_BOUCLE, sortirDuMatch, sortieEnCours } = await import('../src/lib/sortieMatch');
const { paysageVerrouilleParLeJeu, verrouillerPaysage } = await import('../src/lib/pleinEcran');

let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const egal = <T>(a: T, b: T, message: string) => { assert.deepEqual(a, b, message); controles++; };
const pause = (ms: number) => new Promise<void>((fin) => setTimeout(fin, ms));
const chrono = async (travail: () => Promise<unknown>) => { const debut = performance.now(); await travail(); return performance.now() - debut; };
const silence = async <T>(travail: () => Promise<T>): Promise<T> => {
  const [erreur, alerte] = [console.error, console.warn];
  console.error = () => { /* erreurs voulues par le banc */ }; console.warn = console.error;
  try { return await travail(); } finally { console.error = erreur; console.warn = alerte; }
};

// ── 1. Le JSON étroit ────────────────────────────────────────────────────────────────────────────────────────────
{
  const cas: unknown[] = [
    'L’Ovale', 'cœur', 'Ōtāhuhu', '日本ラグビー', 'ballon 🏉', 'demi-paire \ud83c seule', 'antislash \\ puis ’', 'a b c',
    'déjà étroit : é à ü ÿ', '', { 'clé’large': ['’', { œ: 1 }], n: 3, vide: null, ok: true },
  ];
  for (const valeur of cas) {
    const texte = JSON.stringify(valeur), etroit = jsonEtroit(texte);
    egal(JSON.parse(etroit), valeur, `le JSON étroit se relit à l'identique : ${texte.slice(0, 40)}`);
    ok(!large(etroit), `plus aucun caractère au-delà de U+00FF : ${texte.slice(0, 40)}`);
  }
  const sansLarge = JSON.stringify({ nom: 'Dupont', club: 'Stade Français', note: 88 });
  ok(jsonEtroit(sansLarge) === sansLarge, 'un texte déjà étroit est rendu tel quel, sans copie');
  // Une sauvegarde plausible : des données en clair, et une apostrophe typographique de loin en loin dans le journal
  // (mesuré sur deux vraies carrières d'entraîneur : 600 à 700 caractères larges sur 600 000 à 900 000).
  const partie = { state: { manager: {
    effectif: Array.from({ length: 6000 }, (_, i) => ({ id: `j${i}`, nom: `Joueur ${i}`, club: 'Stade Toulousain', note: 60 + i % 30, minutes: i % 81 })),
    journal: Array.from({ length: 600 }, (_, i) => `Semaine ${i} : l’entraîneur attend le groupe à neuf heures.`),
  } }, version: 30 };
  const brut = JSON.stringify(partie), etroit = jsonEtroit(brut);
  egal(JSON.parse(etroit), partie, 'une sauvegarde entière se relit à l’identique');
  ok(etroit.length < brut.length * 1.01, `le texte ne s'allonge presque pas (${etroit.length - brut.length} caractères sur ${brut.length})`);
  ok(octets(etroit) < octets(brut) * 0.51, `comptée comme dans Safari, elle pèse ${Math.round(octets(etroit) / 1024)} Ko au lieu de ${Math.round(octets(brut) / 1024)} Ko`);
}

// ── 2. Un stockage plein ne lève plus rien ───────────────────────────────────────────────────────────────────────
const CLE = cleDe(emplacementActif());
const stockage = stockageCarriereOptimise<Record<string, unknown>>();
const annonces: boolean[] = [];
fenetre.addEventListener(EVENEMENT_STOCKAGE, (e) => annonces.push((e as CustomEvent<{ plein: boolean }>).detail.plein));
const partieDe = (n: number, marque = '’') => ({ state: { journal: `${marque}${'x'.repeat(n)}`, ecransVus: [] as string[] }, version: 30 });
{
  // a. Ce qui ne tenait pas sur deux octets par caractère tient en JSON étroit.
  valeurs.clear(); quota = 1400;
  stockage.setItem('destin-ovalie', partieDe(1000));
  ok(valeurs.has(CLE) && !large(valeurs.get(CLE)!), 'la partie est écrite en JSON étroit');
  ok(octets(JSON.stringify(partieDe(1000))) > quota, 'sur deux octets par caractère, la même partie aurait dépassé le plafond');
  ok(!stockagePlein() && refus === 0, 'aucun refus : elle tient');

  // b. La place manque : le catalogue gardé d'une visite à l'autre est rendu, puis la partie s'écrit.
  valeurs.clear(); quota = 2100;
  localStorage.setItem('destiny-rugby:catalogue-solo', 'c'.repeat(900));
  stockage.setItem('destin-ovalie', partieDe(1000));
  ok(occupe() <= quota && refus === 0, 'le stockage est presque plein, mais tout y est entré normalement');
  let levee: unknown = null;
  try { stockage.setItem('destin-ovalie', partieDe(1100)); } catch (erreur) { levee = erreur; }
  ok(levee === null, 'une écriture refusée ne remonte plus dans le store');
  ok(refus === 1 && !valeurs.has('destiny-rugby:catalogue-solo'), 'le catalogue en cache est rendu au premier refus');
  egal(JSON.parse(valeurs.get(CLE)!).state.journal.length, 1101, 'et la partie est écrite au second essai');
  ok(!stockagePlein() && annonces.length === 0, "l'écran n'a rien à dire : la sauvegarde est passée");
  ok(valeurs.get(CLE_STOCKAGE_SERRE) === '1' && stockageSerre(), 'l’appareil est noté « à l’étroit » : le cache ne s’y rangera plus');

  // c. Plus rien à rendre : le jeu continue, l'écran le dit, et la suivante réessaie.
  localStorage.setItem('destin-ovalie:s3', 'v'.repeat(800));
  const tropGrosse = partieDe(1300);
  levee = null;
  try { stockage.setItem('destin-ovalie', tropGrosse); } catch (erreur) { levee = erreur; }
  ok(levee === null, 'toujours aucune erreur quand il ne reste rien à rendre');
  ok(stockagePlein(), 'le stockage est déclaré plein');
  egal(annonces, [true], "l'écran est prévenu une fois");
  egal(JSON.parse(valeurs.get(CLE)!).state.journal.length, 1101, "l'ancienne sauvegarde reste intacte, jamais tronquée");
  stockage.setItem('destin-ovalie', tropGrosse);
  egal(annonces, [true], 'un second refus ne répète pas l’annonce');
  // Le joueur supprime une ancienne partie : la MÊME photo, redemandée, s'écrit enfin.
  supprimerEmplacement(3);
  ok(!valeurs.has('destin-ovalie:s3') && !valeurs.has(CLE_STOCKAGE_SERRE), 'supprimer une partie rend la place et lève la marque');
  stockage.setItem('destin-ovalie', tropGrosse);
  egal(JSON.parse(valeurs.get(CLE)!).state.journal.length, 1301, 'la partie refusée est écrite dès que la place revient, sans changement d’état');
  ok(!stockagePlein(), 'le stockage n’est plus déclaré plein');
  egal(annonces, [true, false], "et l'écran retire son bandeau");
  egal(stockage.getItem('destin-ovalie'), tropGrosse, 'la partie relue est la partie écrite');
}

// ── 3. La finalisation aboutit toujours ──────────────────────────────────────────────────────────────────────────
{
  // a. Le stockage refuse la sauvegarde de fin de match.
  oublierFinalisations(); valeurs.clear(); quota = 300; annonces.length = 0;
  const faites: string[] = [];
  let rejetee = false;
  await silence(() => finaliserMatch('banc#plein', [
    () => { faites.push('resultat'); stockage.setItem('destin-ovalie', partieDe(900)); },
    () => { faites.push('statistiques'); stockage.setItem('destin-ovalie', partieDe(901)); },
  ], { immediat: true }).catch(() => { rejetee = true; }));
  ok(!rejetee, 'un stockage plein ne fait plus échouer la finalisation (« Terminer » se déverrouille)');
  egal(faites, ['resultat', 'statistiques'], 'toutes les étapes sont passées');
  ok(stockagePlein() && annonces.at(-1) === true, 'et le refus est annoncé');
  quota = Infinity;
  stockage.setItem('destin-ovalie', partieDe(10));
  ok(!stockagePlein() && annonces.at(-1) === false, 'la place revenue, la sauvegarde reprend');

  // b. La scène ne se rend jamais.
  oublierFinalisations();
  let passee = false;
  const duree = await chrono(() => finaliserMatch('banc#scene', [() => { passee = true; }], { immediat: true, avant: () => new Promise<void>(() => { /* jamais */ }) }));
  ok(passee, 'une scène qui ne se rend pas ne retient pas le résultat du match');
  ok(duree >= ATTENTE_SCENE_MAX - 50 && duree < ATTENTE_SCENE_MAX + 900, `la finalisation l'attend ${ATTENTE_SCENE_MAX} ms au plus (${Math.round(duree)} ms)`);

  // c. La scène lève une erreur tout de suite.
  oublierFinalisations();
  passee = false;
  const vite = await chrono(() => finaliserMatch('banc#erreur', [() => { passee = true; }], { immediat: true, avant: () => { throw new Error('scène perdue (voulu par le banc)'); } }));
  ok(passee && vite < 400, 'une scène en erreur ne retient rien non plus');

  egal(await auPlus(Promise.resolve(7), 50), 7, '`auPlus` rend la valeur quand elle arrive à temps');
  egal(await auPlus(new Promise(() => { /* jamais */ }), 30), undefined, '`auPlus` rend la main au bout du délai');
  egal(await auPlus(Promise.reject(new Error('non')), 30), undefined, '`auPlus` ne rejette jamais');
}

// ── 4. La sortie navigue toujours ────────────────────────────────────────────────────────────────────────────────
const attendreLeRepos = async () => { while (sortieEnCours()) await pause(60); };
{
  // a. Un iPhone tenu en paysage : rien n'est verrouillé, on n'attend aucun retour debout.
  taille.largeur = 844; taille.hauteur = 390; tactile = true; verrouAccorde = false;
  ok(!(await verrouillerPaysage()) && !paysageVerrouilleParLeJeu(), 'un navigateur qui refuse le verrou (iOS) n’est pas noté comme verrouillé');
  const etapes: string[] = [];
  let naviguee = 0;
  const duree = await chrono(() => sortirDuMatch({
    couperEntrees: () => etapes.push('couper'), arreterBoucle: () => { etapes.push('boucle'); },
    naviguer: () => { naviguee++; }, surEtape: (e) => etapes.push(e),
  }));
  egal(naviguee, 1, 'la sortie navigue une fois');
  egal(etapes, ['entrees-coupees', 'couper', 'boucle-arretee', 'boucle', 'plein-ecran-quitte', 'orientation-stable', 'viewport-recalcule', 'ecouteurs-recrees', 'entrees-reactivees', 'navigation', 'fini'], 'toutes les étapes, dans l’ordre');
  ok(duree < 700, `en paysage sans verrou, la sortie ne patiente plus (${Math.round(duree)} ms ; 1,8 s d'attente auparavant)`);
  await attendreLeRepos();

  // b. Android en plein écran : le jeu a tourné l'écran, on attend qu'il revienne debout.
  verrouAccorde = true;
  ok(await verrouillerPaysage() && paysageVerrouilleParLeJeu(), 'un verrou accordé est retenu');
  setTimeout(() => { taille.largeur = 390; taille.hauteur = 844; }, 500);
  let tailleALaNavigation = '';
  const pivot = await chrono(() => sortirDuMatch({
    couperEntrees: () => { /* rien */ }, arreterBoucle: () => { /* rien */ },
    naviguer: () => { tailleALaNavigation = `${taille.largeur}×${taille.hauteur}`; },
  }));
  egal(tailleALaNavigation, '390×844', 'après un vrai verrou, on ne navigue qu’une fois l’écran revenu debout');
  ok(pivot > 480 && pivot < 2400, `l'attente suit le pivot réel (${Math.round(pivot)} ms)`);
  ok(!paysageVerrouilleParLeJeu(), 'le verrou est oublié après la sortie');
  await attendreLeRepos();
  taille.largeur = 844; taille.hauteur = 390; verrouAccorde = false;

  // c. La boucle ne rend jamais la main : on navigue quand même.
  naviguee = 0;
  const second: boolean[] = [];
  const bloquee = await chrono(async () => {
    const sortie = sortirDuMatch({ couperEntrees: () => { /* rien */ }, arreterBoucle: () => new Promise<void>(() => { /* jamais */ }), naviguer: () => { naviguee++; } });
    second.push(await sortirDuMatch({ couperEntrees: () => { /* rien */ }, arreterBoucle: () => { /* rien */ }, naviguer: () => { naviguee += 10; } }));
    ok(await sortie, 'la sortie aboutit');
  });
  egal(second, [false], 'un second appui pendant la séquence ne fait rien');
  egal(naviguee, 1, 'une boucle qui ne rend pas la main n’empêche pas de naviguer');
  ok(bloquee >= DELAI_BOUCLE - 50 && bloquee < DELAI_BOUCLE + 1200, `elle obtient ${DELAI_BOUCLE} ms au plus (${Math.round(bloquee)} ms)`);
  await attendreLeRepos();

  // d. Tous les crochets lèvent une erreur.
  naviguee = 0;
  const rendue = await silence(() => sortirDuMatch({
    couperEntrees: () => { throw new Error('a'); }, arreterBoucle: () => { throw new Error('b'); },
    recalculer: () => { throw new Error('c'); }, retirerEcouteursMatch: () => { throw new Error('d'); },
    reactiverEntrees: () => { throw new Error('e'); }, surEtape: () => { throw new Error('f'); },
    naviguer: () => { naviguee++; throw new Error('g'); },
  }));
  ok(rendue === true && naviguee === 1, 'des crochets en erreur n’arrêtent pas la sortie');
  await attendreLeRepos();
}

// ── 5. Le fil de la fin de match ─────────────────────────────────────────────────────────────────────────────────
{
  oublierFinalisations(); valeurs.clear();
  const issues: string[] = [];
  fenetre.addEventListener(EVENEMENT_SORTIE, (e) => { const d = (e as CustomEvent<{ issue: string; etape?: string }>).detail; issues.push(d.etape ? `${d.issue}:${d.etape}` : d.issue); });
  tracer('hors-match');
  ok(dernierFil() === null, 'sans match en train de finir, rien n’est écrit');

  // a. Une fin de match menée au bout.
  await finaliserMatch('banc#fil', [() => { /* résultat */ }], { immediat: true });
  ok(dernierFil()?.fini === false && dernierFil()?.match === 'banc#fil', 'le fil est écrit dès la sirène, ouvert');
  await sortirDuMatch({ couperEntrees: () => { /* rien */ }, arreterBoucle: () => { /* rien */ }, naviguer: () => { jalon('navigation_start', 'banc#fil'); } });
  tracer('semaine-suivante');
  jalon('navigation_end', 'banc#fil');
  const fil = dernierFil()!;
  ok(fil.fini, 'la navigation ferme le fil');
  const noms = fil.etapes.map(([nom]) => nom);
  for (const attendue of ['match_end_detected', 'stats_finalize_start', 'db_save_end', 'sortie-boucle-arretee', 'sortie-navigation', 'navigation_start', 'semaine-suivante', 'navigation_end']) {
    ok(noms.includes(attendue), `le fil porte l'étape « ${attendue} »`);
  }
  ok(fil.etapes.every(([, t], i) => i === 0 || t >= fil.etapes[i - 1][1]), 'les instants ne reculent pas');
  egal(issues, ['ok'], 'une sortie menée au bout est annoncée');
  ok(releverFilInterrompu() === null, 'un fil fermé n’est pas relevé au lancement suivant');
  await attendreLeRepos();

  // b. Une fin de match restée en chemin, puis le jeu relancé.
  oublierFinalisations(); issues.length = 0;
  await finaliserMatch('banc#gel', [() => { /* résultat */ }], { immediat: true });
  tracer('sortie-orientation-stable');
  oublierFinalisations();   // l'application est fermée à la main : plus rien en mémoire
  const releve = releverFilInterrompu();
  ok(releve?.match === 'banc#gel' && !releve.fini, 'au lancement suivant, le fil resté ouvert est relevé');
  egal(issues, ['coupee:sortie-orientation-stable'], 'avec la dernière étape atteinte');
  ok(releverFilInterrompu() === null && issues.length === 1, 'et une seule fois');
}

console.log(`OK — ${controles} contrôles : JSON étroit, stockage plein, finalisation et sortie bornées, fil de la fin de match.`);
process.exit(0);
