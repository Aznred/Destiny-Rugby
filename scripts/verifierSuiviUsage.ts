// Visites courtes, navigation, hydratation, carrières remplacées et changement de jour, sans navigateur ni serveur.
import assert from 'node:assert/strict';
import type { Joueur } from '../src/types';
import { validerEnvoi, type EnvoiUsage } from '../src/lib/usage/agregats';
import { observerReseau, type ReleveReseau } from '../src/lib/profileur';
import { noterMatchsLigueUsage } from '../src/lib/usage/matchsLigue';

let heure = Date.parse('2026-10-07T12:00:00Z');
const origineDate = Date.now;
Date.now = () => heure;
const sauvegardes = new Map<string, string>(), envois: EnvoiUsage[] = [];
const visibilite = new EventTarget() as EventTarget & { hidden: boolean };
visibilite.hidden = false;
const evenements = new EventTarget();
let minuteur: (() => void) | undefined;
const fenetre = {
  addEventListener: evenements.addEventListener.bind(evenements), removeEventListener: evenements.removeEventListener.bind(evenements),
  dispatchEvent: evenements.dispatchEvent.bind(evenements),
  setInterval: (f: () => void) => { minuteur = f; return 1; }, clearInterval: () => {},
  setTimeout, clearTimeout,
};
const originales = new Map<string, PropertyDescriptor | undefined>();
const remplacer = (nom: string, valeur: unknown) => { originales.set(nom, Object.getOwnPropertyDescriptor(globalThis, nom)); Object.defineProperty(globalThis, nom, { configurable: true, value: valeur }); };
remplacer('window', fenetre); remplacer('document', visibilite);
remplacer('localStorage', { getItem: (c: string) => sauvegardes.get(c) ?? null, setItem: (c: string, v: string) => sauvegardes.set(c, v), removeItem: (c: string) => sauvegardes.delete(c) });
remplacer('navigator', { userAgent: 'Test bureau', platform: 'Win32', hardwareConcurrency: 8, maxTouchPoints: 0, sendBeacon: () => false });
remplacer('fetch', async (_url: string, options: RequestInit) => { envois.push(JSON.parse(String(options.body)).releve as EnvoiUsage); return new Response('{}'); });
try {
  const { useGame } = await import('../src/store/useGame');
  // Le banc remplace la persistance asynchrone par une sauvegarde synchrone vide.
  useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, onRehydrateStorage: undefined, merge: (_p, courant) => courant });
  if (!useGame.persist.hasHydrated()) useGame.persist.rehydrate();
  assert.equal(useGame.persist.hasHydrated(), true);
  const joueur = { nom: 'Nom personnel secret', club: 'Stade Toulousain', poste: 'demi_melee', saison: 3, matchsJoues: 12 } as Joueur;
  useGame.setState({ ecran: 'carriere', joueur });
  const { demarrerLeSuivi } = await import('../src/lib/usage/suivi');
  demarrerLeSuivi();
  const fermer = () => { visibilite.hidden = true; visibilite.dispatchEvent(new Event('visibilitychange')); };
  const ouvrir = () => { visibilite.hidden = false; visibilite.dispatchEvent(new Event('visibilitychange')); };
  heure += 4_000; fermer();
  assert.equal(envois[0].secondes.joueur, 4, 'les visites inférieures à 15 secondes sont mesurées');
  assert.equal(envois[0].sessions, 1);
  assert.equal(envois[0].compteurs['carrieres.cree'], undefined, 'la sauvegarde hydratée ne compte pas comme une création');
  assert.ok(!JSON.stringify(envois).includes(joueur.nom));
  const identite = envois[0].carrieres![0].id;
  assert.equal(envois[0].carrieres![0].matchs, 12);
  heure += 50_000; minuteur!(); ouvrir(); heure += 2_000;
  useGame.setState({ ecran: 'collectionSolo' });
  heure += 3_000; fermer();
  assert.equal(envois[1].secondes.joueur, 2, 'la navigation attribue le temps à l’écran précédent');
  assert.equal(envois[1].secondes.collection, 3);
  assert.equal(envois[1].sessions, 0, 'un onglet masqué ne crée pas une nouvelle session');
  assert.equal(envois[1].carrieres![0].id, identite);
  ouvrir();
  useGame.setState({ ecran: 'carriere', joueur: { ...joueur, usageId: crypto.randomUUID(), usageDebut: '2026-10-07', saison: 1, matchsJoues: 0 } });
  heure += 3_000; fermer();
  assert.equal(envois[2].compteurs['carrieres.cree'], 1);
  assert.equal(envois[2].carrieres!.find(c => c.id === identite)!.fermee, true);
  assert.equal(envois[2].carrieres!.filter(c => !c.fermee).length, 1);
  ouvrir(); heure += 31 * 60_000; evenements.dispatchEvent(new Event('pointerdown')); minuteur!(); fermer();
  assert.equal(envois[3].sessions, 1, 'une interruption de 30 minutes ouvre une nouvelle session');
  heure = Date.parse('2026-10-07T23:59:55Z'); ouvrir(); heure += 3_000; minuteur!();
  heure += 5_000;
  useGame.setState({ joueur: { ...useGame.getState().joueur!, matchsJoues: 1 } });
  heure += 3_000; fermer();
  assert.ok(envois.some(e => e.jour === '2026-10-07') && envois.some(e => e.jour === '2026-10-08'));
  ouvrir();
  noterMatchsLigueUsage('ligue-privee', 'club-prive', 1, 10);
  noterMatchsLigueUsage('ligue-privee', 'club-prive', 1, 12);
  noterMatchsLigueUsage('ligue-privee', 'club-prive', 1, 12);
  heure += 3_000; fermer();
  assert.equal(envois.at(-1)!.compteurs['matchs.ligue'], 2, 'la ligue adopte son historique, puis compte uniquement les nouveaux matchs');
  assert.ok(!JSON.stringify(envois).includes('club-prive'));
  for (const e of envois) assert.ok(validerEnvoi(e, heure), `relevé valide : ${e.jour}`);
  remplacer('location', { href: 'http://localhost/' });
  const reseau: ReleveReseau = { requetes: 0, octets: 0, latenceTotal: 0, terminees: 0, erreurs: 0 };
  const requete = async (url: RequestInfo | URL) => {
    if (String(url).endsWith('annule')) throw new DOMException('Annulé', 'AbortError');
    return new Response('{}', { status: String(url).endsWith('erreur') ? 503 : 200 });
  };
  const controle = Object.assign(fenetre, { fetch: requete as typeof fetch });
  const debrancher = observerReseau(reseau);
  await controle.fetch('/api/ok'); await controle.fetch('/api/erreur');
  await assert.rejects(controle.fetch('/api/annule'), { name: 'AbortError' });
  await controle.fetch('/rn26/stade.glb');
  assert.equal(reseau.terminees, 3);
  assert.equal(reseau.erreurs, 1, 'une annulation volontaire ne compte pas comme erreur réseau');
  assert.ok(Number.isFinite(reseau.latenceTotal) && reseau.latenceTotal >= 0);
  debrancher(); assert.equal(controle.fetch, requete);
  console.log('Suivi : visites courtes, onglets masqués, sessions, navigation, anciennes carrières, ligue, remplacement et minuit vérifiés.');
  console.log('Profileur : latence API, réponses en erreur, annulations et restauration du navigateur vérifiées.');
} finally {
  Date.now = origineDate;
  for (const [nom, description] of originales) { if (description) Object.defineProperty(globalThis, nom, description); else Reflect.deleteProperty(globalThis, nom); }
}
