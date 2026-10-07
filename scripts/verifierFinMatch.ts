// BANC DE LA FIN DE MATCH (Correctif 26)
//
// Signalé : « énorme crash / lag à la fin d'un match, surtout sur téléphone ». Trois causes s'empilaient dans
// l'image du coup de sifflet : la scène 3D détruite d'un bloc (l'écran de fin la remplace), chaque écriture du
// store resérialisant toute la sauvegarde, et la semaine suivante jouée dans l'image de la fermeture. Ce banc tient :
//   1. la finalisation : une étape par tâche, dans l'ordre, UNE seule fois par match, robuste à une étape en échec ;
//   2. la sauvegarde : N écritures du store pendant la finalisation = UNE sérialisation ;
//   3. la scène : rendue par tranches, avec repli, et la finalisation attend qu'elle le soit ;
//   4. dix matchs de suite : même coût au dixième qu'au premier, ni minuterie oubliée ni mémoire qui grimpe.
// La mémoire GRAPHIQUE ne se mesure pas ici (pas de WebGL sous Node) : voir la section « fin de match » du CLAUDE.md.
//
//   npm run verify:fin-match

import assert from 'node:assert/strict';
import fs from 'node:fs';

// Un navigateur minimal AVANT de charger le store : le stockage compte ses écritures.
const valeurs = new Map<string, string>();
const ecritures: Record<string, number> = {};
let octetsEcrits = 0;
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (cle: string) => valeurs.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => { ecritures[cle] = (ecritures[cle] ?? 0) + 1; octetsEcrits += valeur.length; valeurs.set(cle, valeur); },
  removeItem: (cle: string) => valeurs.delete(cle),
  key: (i: number) => [...valeurs.keys()][i] ?? null,
  get length() { return valeurs.size; },
}, configurable: true });
const fenetre = new EventTarget();
Object.defineProperty(globalThis, 'window', { value: Object.assign(fenetre, { localStorage: globalThis.localStorage, setTimeout, clearTimeout }), configurable: true });

const { useGame } = await import('../src/store/useGame');
const { apresLEcran, dureesFinMatch, ecrituresGroupees, finaliserMatch, matchFinalise, mesuresFinMatch, oublierFinalisations, tacheSuivante } = await import('../src/lib/finMatch');
const { suspendreEcritures } = await import('../src/lib/persistanceNavigation');
const { detruireScene, scenesEnDestruction, scenesRendues } = await import('../src/lib/match3D');
const { afficheDuClub } = await import('../src/lib/matchLive');
const { effectifDuClub } = await import('../src/lib/effectif');
const { bilan, creerMatch } = await import('../src/lib/moteur/moteur');
const { simulerPendant } = await import('../src/lib/moteur/sortie');
const { cleDe, emplacementActif } = await import('../src/lib/sauvegardes');

let controles = 0;
const ok = (condition: unknown, message: string) => { assert.ok(condition, message); controles++; };
const egal = <T>(a: T, b: T, message: string) => { assert.deepEqual(a, b, message); controles++; };
const pause = (ms: number) => new Promise<void>((fin) => setTimeout(fin, ms));
const CLE_SAUVEGARDE = cleDe(emplacementActif());
const sauvegardes = () => ecritures[CLE_SAUVEGARDE] ?? 0;

// ── 1. La finalisation ─────────────────────────────────────────────────────────────────────────────────────────
{
  oublierFinalisations();
  const ordre: string[] = [];
  let taches = 0;
  const compteur = setInterval(() => { taches++; }, 0);
  const etapes = [
    () => { ordre.push(`a@${taches}`); },
    () => { ordre.push('b'); throw new Error('étape en échec (voulu par le banc)'); },
    () => { ordre.push(`c@${taches}`); },
  ];
  const journal = console.error;
  let erreursJournalisees = 0;
  console.error = () => { erreursJournalisees++; };
  const premiere = finaliserMatch('banc#1', etapes);
  const seconde = finaliserMatch('banc#1', etapes);
  ok(premiere === seconde, 'un second appel pour le même match rend la même promesse');
  egal(ordre.length, 0, "rien n'est exécuté dans l'instant de la sirène : l'écran de fin passe d'abord");
  ok(matchFinalise('banc#1'), 'le match est marqué dès la sirène');
  await premiere;
  console.error = journal;
  clearInterval(compteur);
  egal(ordre.map((x) => x[0]), ['a', 'b', 'c'], "les étapes passent dans l'ordre, une seule fois, malgré celle qui échoue");
  egal(erreursJournalisees, 1, "l'étape en échec est journalisée, pas avalée");
  const [ta, tc] = [Number(ordre[0].split('@')[1]), Number(ordre[2].split('@')[1])];
  ok(tc > ta, `chaque étape a sa tâche : le navigateur reprend la main entre deux (${ta} → ${tc})`);
  await finaliserMatch('banc#1', etapes);
  egal(ordre.length, 3, 'un troisième appel, après coup, ne rejoue toujours rien');
  const jalons = mesuresFinMatch().map((m) => m.jalon);
  egal(jalons, ['match_end_detected', 'stats_finalize_start', 'stats_finalize_end', 'db_save_start', 'db_save_end'], 'les jalons de mesure sont posés dans l’ordre');
  ok(Object.values(dureesFinMatch()).slice(0, 3).every((d) => Number.isFinite(d) && d >= 0), 'les durées se lisent (attente, finalisation, sauvegarde)');

  // `avant` : la scène qui se rend passe avant les écritures.
  let sceneRendue = false;
  let vuAvant = false;
  await finaliserMatch('banc#2', [() => { vuAvant = sceneRendue; }], { avant: async () => { await pause(30); sceneRendue = true; } });
  ok(vuAvant, 'la finalisation attend ce qu’on lui demande de laisser finir (la scène 3D)');
  // Un `avant` qui échoue ne retient pas le match.
  let passe = false;
  await finaliserMatch('banc#3', [() => { passe = true; }], { avant: () => Promise.reject(new Error('scène')) });
  ok(passe, "une scène qui ne se rend pas n'empêche pas d'enregistrer le match");
  await apresLEcran(); await tacheSuivante();
  controles += 0;
}

// ── 2. La sauvegarde ───────────────────────────────────────────────────────────────────────────────────────────
{
  const etat = () => useGame.getState();
  etat().creerManager({ nom: 'Contrôle fin de match', club: 'Stade Toulousain', nation: 'France', age: 40, libre: true });
  await pause(20);
  const poids = valeurs.get(CLE_SAUVEGARDE)?.length ?? 0;
  ok(poids > 10_000, `la sauvegarde de l'entraîneur existe (${Math.round(poids / 1024)} Ko à chaque écriture)`);

  // Sans regroupement : une écriture complète par changement.
  let avant = sauvegardes();
  for (let i = 0; i < 6; i++) useGame.setState((s) => ({ manager: { ...s.manager!, confiance: 40 + i } }));
  egal(sauvegardes() - avant, 6, 'sans regroupement, six changements = six sérialisations complètes');

  // Regroupées : une seule, et c'est la dernière photo.
  avant = sauvegardes();
  ecrituresGroupees(() => { for (let i = 0; i < 6; i++) useGame.setState((s) => ({ manager: { ...s.manager!, confiance: 60 + i } })); });
  egal(sauvegardes() - avant, 1, 'regroupés, les six mêmes changements = une seule sérialisation');
  egal(JSON.parse(valeurs.get(CLE_SAUVEGARDE)!).state.manager.confiance, 65, "et c'est bien le DERNIER état qui est écrit");

  // Suspensions imbriquées : l'écriture attend la dernière reprise ; reprendre deux fois ne compte qu'une fois.
  avant = sauvegardes();
  const [r1, r2] = [suspendreEcritures(), suspendreEcritures()];
  useGame.setState((s) => ({ manager: { ...s.manager!, confiance: 70 } }));
  r1(); r1();
  egal(sauvegardes() - avant, 0, "une suspension encore ouverte retient l'écriture, même si l'autre est rendue deux fois");
  r2();
  egal(sauvegardes() - avant, 1, 'la dernière reprise écrit');

  // La page qui part en arrière-plan écrit tout de suite ce qui attend.
  avant = sauvegardes();
  const r3 = suspendreEcritures();
  useGame.setState((s) => ({ manager: { ...s.manager!, confiance: 71 } }));
  fenetre.dispatchEvent(new Event('pagehide'));
  egal(sauvegardes() - avant, 1, "l'onglet qui se ferme pendant une finalisation ne perd rien");
  r3();
  egal(sauvegardes() - avant, 1, 'et la reprise ne réécrit pas ce qui est déjà écrit');

  // Toute une finalisation : plusieurs écritures du store, une seule sauvegarde.
  avant = sauvegardes();
  await finaliserMatch('banc#sauvegarde', [
    () => useGame.setState((s) => ({ manager: { ...s.manager!, confiance: 72 } })),
    () => useGame.setState((s) => ({ manager: { ...s.manager!, prestige: 55 } })),
    () => useGame.setState((s) => ({ manager: { ...s.manager!, confiance: 73 } })),
  ]);
  egal(sauvegardes() - avant, 1, 'une finalisation de match = une seule écriture de la sauvegarde');
  const lu = JSON.parse(valeurs.get(CLE_SAUVEGARDE)!).state.manager;
  egal([lu.confiance, lu.prestige], [73, 55], 'et rien de ce que les étapes ont écrit ne manque');
}

// ── 3. La scène ────────────────────────────────────────────────────────────────────────────────────────────────
{
  const fabriquer = (mode: 'tranches' | 'bloc' | 'echec') => {
    const scene = { tranches: 0, blocs: 0 } as { tranches: number; blocs: number; detruire(): void; detruireParEtapes?(): Promise<void> };
    scene.detruire = () => { scene.blocs++; };
    if (mode !== 'bloc') scene.detruireParEtapes = async () => {
      for (let i = 0; i < 4; i++) { await pause(5); scene.tranches++; }
      if (mode === 'echec') throw new Error('tranche en échec');
    };
    return scene;
  };
  const a = fabriquer('tranches');
  const promesse = detruireScene(a as never);
  egal(detruireScene(a as never), promesse, 'deux demandes de destruction attendent la même libération');
  egal(scenesEnDestruction(), 1, 'une scène en cours de destruction est suivie');
  egal(a.tranches, 0, "rien n'est libéré dans l'instant du démontage");
  await scenesRendues();
  egal([a.tranches, a.blocs, scenesEnDestruction()], [4, 0, 0], 'la scène est rendue par tranches, puis oubliée');
  await promesse;
  const b = fabriquer('bloc');
  await detruireScene(b as never);
  egal(b.blocs, 1, "un lecteur d'avant le correctif est détruit d'un bloc, comme avant");
  const c = fabriquer('echec');
  await detruireScene(c as never);
  egal([c.blocs, scenesEnDestruction()], [1, 0], "une tranche en échec retombe sur la destruction d'un bloc : aucun contexte ne reste ouvert");
  await detruireScene(null);
  egal(scenesEnDestruction(), 0, 'pas de scène, rien à attendre');

  // La finalisation attend la scène : c'est l'ordre réel à la sirène.
  const d = fabriquer('tranches');
  void detruireScene(d as never);
  let tranchesVues = -1;
  await finaliserMatch('banc#scene', [() => { tranchesVues = d.tranches; }], { avant: scenesRendues });
  egal(tranchesVues, 4, 'le store ne travaille qu’une fois la scène entièrement rendue');
  const jalons = mesuresFinMatch().map((m) => m.jalon);
  ok(jalons.includes('scene_cleanup_start') && jalons.includes('scene_cleanup_end'), 'le nettoyage 3D est mesuré');

  // Le lecteur installé sait se rendre par tranches, et libère la même chose que d'un bloc.
  const source = fs.readFileSync('public/rn26/scene.js', 'utf8');
  const debut = source.indexOf('    detruireParEtapes(){');
  ok(debut > 0, 'le lecteur installé (public/rn26/scene.js) a sa destruction par tranches');
  const corps = source.slice(debut, source.indexOf('    detruire(){', debut));
  for (const geste of ['commencerLiberation()', 'liberation.tranche(16)', 'liberation?.tout()', 'finirLiberation()'])
    ok(corps.includes(geste), `la destruction par tranches fait aussi « ${geste} »`);
  ok(corps.includes('await souffler()'), 'et rend la main au navigateur entre les tranches');
  const preparation = source.slice(source.indexOf('  function commencerLiberation(){'), source.indexOf('  const api={', source.indexOf('  function commencerLiberation(){')));
  for (const geste of ['sons?.detruire()', 'tele.detruire()', 'renderer.dispose()', 'renderer.forceContextLoss?.()', 'toile.remove()', 'observateur.disconnect()', 'officials.length=0', 'scene.clear()', 'stade.restituer()'])
    ok(preparation.includes(geste), `la libération complète fait aussi « ${geste} »`);
  ok(/setTimeout\(fin,0\)/.test(preparation), "sans dépendre de requestAnimationFrame (un onglet caché n'en tire plus)");
}

// ── 4. Dix matchs de suite ─────────────────────────────────────────────────────────────────────────────────────
{
  const etat = () => useGame.getState();
  const manager = () => etat().manager!;
  const minuteries = () => (process as unknown as { getActiveResourcesInfo(): string[] }).getActiveResourcesInfo().filter((r) => r === 'Timeout').length;
  const gc = (globalThis as { gc?: () => void }).gc;
  const releves: { simulation: number; finalisation: number; ecritures: number; tas: number; minuteries: number; semaine: number }[] = [];
  for (let n = 1; n <= 10; n++) {
    // Jusqu'au prochain match du calendrier.
    for (let garde = 0; garde < 60; garde++) {
      const a = afficheDuClub(manager());
      if (a && !manager().resultats[a.cle]) break;
      ecrituresGroupees(() => etat().semaineManager());
    }
    const affiche = afficheDuClub(manager())!;
    ok(affiche && !manager().resultats[affiche.cle], `match ${n} : une affiche à jouer`);
    const { domicile, exterieur } = affiche.match;
    const e = creerMatch(domicile, exterieur, effectifDuClub(domicile, manager().saison), effectifDuClub(exterieur, manager().saison), 75, 75, `fin-match-${n}`);
    let t = performance.now();
    let lots = 0;
    while (!e.fini && lots++ < 20000) simulerPendant(e, 50, () => performance.now());
    const simulation = performance.now() - t;
    ok(e.fini, `match ${n} : joué jusqu'à la sirène`);
    // À la sirène : la feuille se LIT (statistiques cumulées pendant le match), elle ne se recalcule pas.
    t = performance.now();
    const feuille = bilan(e);
    ok(performance.now() - t < 5 && feuille.parJoueur.length >= 30, `match ${n} : la feuille de match est une lecture (${feuille.parJoueur.length} joueurs)`);
    const chezMoi = domicile === manager().club;
    const final = { scoreA: e.scoreA, scoreB: e.scoreB, essaisA: e.essaisA, essaisB: e.essaisB };
    const enregistrer = () => etat().enregistrerResultatManager({
      cle: affiche.cle, club: manager().club, saison: manager().saison, semaine: manager().semaine, journee: affiche.journee,
      domicile: chezMoi, adversaire: chezMoi ? exterieur : domicile,
      scorePour: chezMoi ? final.scoreA : final.scoreB, scoreContre: chezMoi ? final.scoreB : final.scoreA,
      essaisPour: chezMoi ? final.essaisA : final.essaisB, essaisContre: chezMoi ? final.essaisB : final.essaisA, blessures: [],
    });
    const avant = sauvegardes();
    t = performance.now();
    const id = `${affiche.cle}#${manager().saison}#${n}`;
    // Double déclenchement de la sirène (effet rejoué, double appui) : finalisé une seule fois.
    await Promise.all([finaliserMatch(id, [enregistrer]), finaliserMatch(id, [enregistrer])]);
    const finalisation = performance.now() - t;
    ok(manager().resultats[affiche.cle], `match ${n} : le résultat est inscrit`);
    egal(Object.keys(manager().resultats).filter((cle) => cle === affiche.cle).length, 1, `match ${n} : inscrit une seule fois`);
    const ecrites = sauvegardes() - avant;
    ok(ecrites <= 1, `match ${n} : une seule écriture de la sauvegarde pour toute la finalisation (${ecrites})`);
    await pause(5);
    gc?.();
    releves.push({ simulation, finalisation, ecritures: ecrites, tas: process.memoryUsage().heapUsed / 1048576, minuteries: minuteries(), semaine: manager().semaine });
  }
  console.log('  match  simulation  finalisation  écritures  tas (Mo)  minuteries');
  for (const [i, r] of releves.entries())
    console.log(`  ${String(i + 1).padStart(5)}  ${r.simulation.toFixed(0).padStart(8)} ms  ${r.finalisation.toFixed(0).padStart(9)} ms  ${String(r.ecritures).padStart(9)}  ${r.tas.toFixed(0).padStart(8)}  ${String(r.minuteries).padStart(10)}`);
  const moyenne = (liste: number[]) => liste.reduce((a, b) => a + b, 0) / liste.length;
  const debut = releves.slice(0, 3), fin = releves.slice(-3);
  ok(moyenne(fin.map((r) => r.finalisation)) < moyenne(debut.map((r) => r.finalisation)) * 2 + 60,
    'la finalisation ne ralentit pas au fil des matchs (trois derniers contre trois premiers)');
  ok(moyenne(fin.map((r) => r.simulation)) < moyenne(debut.map((r) => r.simulation)) * 1.8 + 200,
    'le dixième match se joue aussi vite que le premier');
  ok(releves.at(-1)!.minuteries <= releves[1].minuteries, `aucune minuterie ne survit à un match (${releves[1].minuteries} après le 2ᵉ, ${releves.at(-1)!.minuteries} après le 10ᵉ)`);
  if (gc) ok(releves.at(-1)!.tas < releves[2].tas * 1.5 + 40, `la mémoire ne grimpe pas de match en match (${releves[2].tas.toFixed(0)} Mo → ${releves.at(-1)!.tas.toFixed(0)} Mo)`);
  else console.log('  (mémoire relevée sans ramasse-miettes forcé : lancer avec NODE_OPTIONS=--expose-gc pour le contrôle strict)');
}

console.log(`Fin de match : ${controles} contrôles, OK (${Math.round(octetsEcrits / 1048576)} Mo écrits dans le stockage pendant le banc)`);
process.exit(0);
