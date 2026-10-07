// APERÇU DES PROPOSITIONS DE CARTES (Correctif 26) — la bourse de la Collection devant un serveur simulé.
//
// Ouvrir : /scripts/apercuEchangesSolo.html   (?langue=fr|en|es|it|de|pt|ja)
//
// ⚠️ AUCUN COMPTE RÉEL, AUCUNE SAUVEGARDE : le stockage est en mémoire et `/api/carriere` est remplacé par un petit
// serveur local qui tient trois joueurs — moi (« Roméo »), Camille et Lenny. Au départ :
//   • Camille a fait une proposition sur une de mes offres  → « Propositions reçues » ;
//   • j'ai une proposition en attente chez Lenny            → « Mes propositions envoyées » ;
//   • Lenny et Camille ont chacun une offre ouverte         → la bourse.
// `window.__echanges` donne l'état du serveur simulé (offres, coffres, appels reçus) à la console.

import { createRoot } from 'react-dom/client';
import '../src/index.css';
import '../src/App.css';
import { EchangesCollectionSolo } from '../src/components/EchangesCollectionSolo';
import { useGame } from '../src/store/useGame';
import { chargerTextes, definirLangue, LANGUES, type Langue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { catalogueBaseCarriere } from '../src/lib/ligue/catalogueCarriere';
import { cleCarteSolo } from '../src/lib/collectionSolo';
import {
  cartesEngagees, doublonsLibres, modifierCollectionSolo, possedeDoublons,
  type LotCartesSolo, type OffreSolo, type SuiviEchangesSolo,
} from '../src/lib/echangesSolo';
import type { EtatCollectionSolo } from '../src/lib/collectionSolo';

chargerTextes(TEXTES);
const memoire = new Map<string, string>();
Object.defineProperty(window, 'localStorage', { configurable: true, value: {
  getItem: (cle: string) => memoire.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => memoire.set(cle, valeur),
  removeItem: (cle: string) => memoire.delete(cle),
  clear: () => memoire.clear(), key: (n: number) => [...memoire.keys()][n] ?? null,
  get length() { return memoire.size; },
} });
useGame.persist.setOptions({ name: 'apercu-echanges', storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
const langue = (LANGUES.find((l) => l.id === new URLSearchParams(location.search).get('langue'))?.id ?? 'fr') as Langue;
useGame.getState().setLangue(langue);
definirLangue(langue);

// ── Le serveur simulé ──────────────────────────────────────────────────────────────────────────────────────────
const MOI = '00000000-0000-4000-8000-000000000001', CAMILLE = '00000000-0000-4000-8000-000000000002', LENNY = '00000000-0000-4000-8000-000000000003';
const PSEUDOS: Record<string, string> = { [MOI]: 'Roméo', [CAMILLE]: 'Camille', [LENNY]: 'Lenny' };
const catalogue = catalogueBaseCarriere();
// Les mieux notés d'abord : de belles cartes à l'écran.
const vedettes = [...catalogue].sort((a, b) => b.note - a.note).slice(0, 14).map((c) => cleCarteSolo(c.sourceId));
const collection = (quantites: LotCartesSolo): EtatCollectionSolo => ({
  quantites, packsOuverts: {}, doublons: Object.values(quantites).reduce((n, q) => n + Math.max(0, q - 1), 0), revision: 1,
} as EtatCollectionSolo);
const coffres: Record<string, EtatCollectionSolo> = {
  [MOI]: collection({ [vedettes[0]]: 3, [vedettes[1]]: 2, [vedettes[2]]: 2, [vedettes[3]]: 2, [vedettes[4]]: 1 }),
  [CAMILLE]: collection({ [vedettes[5]]: 3, [vedettes[6]]: 2, [vedettes[7]]: 2 }),
  [LENNY]: collection({ [vedettes[8]]: 3, [vedettes[9]]: 2, [vedettes[10]]: 2 }),
};
let compteur = 10;
const uuid = () => `00000000-0000-4000-8000-${String(++compteur).padStart(12, '0')}`;
const ilYA = (heures: number) => new Date(Date.now() - heures * 3_600_000).toISOString();
const offres: OffreSolo[] = [];
const appels: { action: string; statut: number }[] = [];

function creer(compte: string, offertes: LotCartesSolo, souhaitees: LotCartesSolo, heures = 0): OffreSolo {
  coffres[compte] = modifierCollectionSolo(coffres[compte], offertes, -1);
  const offre: OffreSolo = { id: uuid(), compteId: compte, pseudo: PSEUDOS[compte], offertes, souhaitees, propositions: [], creeLe: ilYA(heures), statut: 'ouverte' };
  offres.unshift(offre);
  return offre;
}
const vue = (o: OffreSolo, compte: string): OffreSolo => structuredClone({ ...o,
  propositions: o.propositions.filter((p) => o.compteId === compte || p.compteId === compte) });
const suiviDe = (compte: string): SuiviEchangesSolo => {
  const ouvertes = offres.filter((o) => o.statut === 'ouverte');
  return {
    recues: ouvertes.filter((o) => o.compteId === compte && o.propositions.length).map((o) => vue(o, compte)),
    envoyees: ouvertes.filter((o) => o.compteId !== compte && o.propositions.some((p) => p.compteId === compte)).map((o) => vue(o, compte)),
  };
};
// L'état de départ.
const maPremiere = creer(MOI, { [vedettes[0]]: 1 }, {}, 30);
maPremiere.propositions.push({ id: uuid(), compteId: CAMILLE, pseudo: 'Camille', cartes: { [vedettes[5]]: 1 }, creeLe: ilYA(3) });
const chezLenny = creer(LENNY, { [vedettes[8]]: 1 }, {}, 20);
chezLenny.propositions.push({ id: uuid(), compteId: MOI, pseudo: 'Roméo', cartes: { [vedettes[1]]: 1 }, creeLe: ilYA(1) });
creer(CAMILLE, { [vedettes[6]]: 1 }, { [vedettes[2]]: 1 }, 8);
creer(LENNY, { [vedettes[9]]: 1 }, {}, 2);

class Refus extends Error {}
function agir(corps: Record<string, any>): { evenement: string; id: string } {
  const offre = offres.find((o) => o.id === corps.offre);
  const ouverte = () => { if (!offre || offre.statut !== 'ouverte') throw new Refus('Offre indisponible.'); return offre; };
  switch (corps.action) {
    case 'creerOffreSolo': {
      if (!doublonsLibres(coffres[MOI], corps.offertes, cartesEngagees(suiviDe(MOI), MOI))) throw new Refus('Une de ces cartes est déjà engagée dans une autre proposition en attente.');
      return { evenement: 'tradeCreated', id: creer(MOI, corps.offertes, corps.souhaitees).id };
    }
    case 'proposerOffreSolo': {
      const o = ouverte();
      if (o.compteId === MOI || o.propositions.some((p) => p.compteId === MOI)) throw new Refus('Proposition indisponible.');
      if (!doublonsLibres(coffres[MOI], corps.cartes, cartesEngagees(suiviDe(MOI), MOI))) throw new Refus('Une de ces cartes est déjà engagée dans une autre proposition en attente.');
      o.propositions.push({ id: uuid(), compteId: MOI, pseudo: 'Roméo', cartes: corps.cartes, creeLe: new Date().toISOString() });
      return { evenement: 'tradeProposed', id: o.id };
    }
    case 'accepterOffreSolo': {
      const o = ouverte();
      const choix = corps.proposition ? o.propositions.find((p) => p.id === corps.proposition) : null;
      if (corps.proposition && (!choix || o.compteId !== MOI)) throw new Refus('Proposition introuvable.');
      const acheteur = choix?.compteId ?? MOI;
      const cartes = choix?.cartes ?? o.souhaitees;
      if (!possedeDoublons(coffres[acheteur], cartes)) throw new Refus('Doublons insuffisants.');
      coffres[acheteur] = modifierCollectionSolo(modifierCollectionSolo(coffres[acheteur], cartes, -1), o.offertes, 1);
      coffres[o.compteId] = modifierCollectionSolo(coffres[o.compteId], cartes, 1);
      o.statut = 'acceptee';
      return { evenement: 'tradeAccepted', id: o.id };
    }
    case 'refuserOffreSolo': {
      const o = ouverte();
      o.propositions = o.propositions.filter((p) => p.id !== corps.proposition);
      return { evenement: 'tradeRefused', id: o.id };
    }
    case 'retirerPropositionSolo': {
      const o = ouverte();
      if (!o.propositions.some((p) => p.compteId === MOI)) throw new Refus('Proposition introuvable ou déjà traitée.');
      o.propositions = o.propositions.filter((p) => p.compteId !== MOI);
      return { evenement: 'tradeWithdrawn', id: o.id };
    }
    case 'annulerOffreSolo': {
      const o = ouverte();
      coffres[MOI] = modifierCollectionSolo(coffres[MOI], o.offertes, 1);
      o.statut = 'annulee';
      return { evenement: 'tradeCancelled', id: o.id };
    }
    default: throw new Refus('Action inconnue.');
  }
}
const boutique = () => ({ collectionSolo: structuredClone(coffres[MOI]) });
const vraiFetch = window.fetch.bind(window);
window.fetch = async (url, options) => {
  const adresse = String(url);
  if (!adresse.includes('/api/carriere')) return vraiFetch(url, options);
  // Un petit délai : le temps de voir le verrou des boutons.
  await new Promise((fin) => setTimeout(fin, 180));
  const repondre = (contenu: unknown, statut = 200) => new Response(JSON.stringify(contenu), { status: statut, headers: { 'Content-Type': 'application/json' } });
  if (adresse.includes('catalogueSolo')) return repondre({ revision: 0, joueurs: catalogue });
  if (adresse.includes('echangesSolo')) {
    const visibles = offres.filter((o) => o.statut === 'ouverte' || o.compteId === MOI);
    return repondre({ offres: visibles.slice(0, 30).map((o) => vue(o, MOI)), total: visibles.length, suivi: suiviDe(MOI) });
  }
  if (options?.method === 'POST') {
    const corps = JSON.parse(String(options.body));
    try {
      const fait = agir(corps);
      appels.push({ action: corps.action, statut: 200 });
      const touchee = offres.find((o) => o.id === fait.id);
      return repondre({ ok: true, boutique: boutique(), delta: { evenement: fait.evenement, offreId: fait.id, offre: touchee ? vue(touchee, MOI) : null, suivi: suiviDe(MOI) } });
    } catch (erreur) {
      appels.push({ action: corps.action, statut: 409 });
      if (erreur instanceof Refus) return repondre({ erreur: erreur.message }, 409);
      throw erreur;
    }
  }
  // La session du compte.
  return repondre({ compte: { id: MOI, pseudo: 'Roméo', identifiant: 'romeo' }, ligues: [] });
};
(window as unknown as { __echanges: unknown }).__echanges = { offres, coffres, appels, MOI };
useGame.setState({ collectionSolo: structuredClone(coffres[MOI]) });

createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: 1180, margin: '0 auto', padding: '12px clamp(8px, 2vw, 24px) 80px' }}>
    <EchangesCollectionSolo />
  </main>,
);
