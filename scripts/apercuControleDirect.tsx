// APERÇU DU CONTRÔLE DIRECT (Correctif 16) — un match de carrière avec un joueur inventé, sans sauvegarde.
//
// Ouvrir : /scripts/apercuControleDirect.html
//   ?role=banc | titulaire   (défaut : titulaire) — le joueur entre-t-il du banc, ou est-il sur le terrain au coup d'envoi ?
//   ?poste=ailier_droit      (défaut) — n'importe quel poste du jeu (pilier_gauche, demi_melee, demi_ouverture…)
//   ?langue=fr|en|es|it|de|pt|ja
//   ?tuto=0                  garde le tutoriel d'entrée comme « déjà vu » (défaut : il se rejoue à chaque ouverture)
//   ?presentation=1          garde l'avant-match (équipes, compositions) ; défaut : sauté pour aller vite
//   ?mode=cartes             l'ancien mode (cartes de décision)
//   ?vue=reglages            ouvre le panneau des réglages (section « Contrôle direct ») au lieu du match
//   ?roles=capitaine,buteur,engagement,lanceur,droppeur   (Correctif 17) les responsabilités que tient le joueur : capitaine, viceCapitaine,
//                            buteur, buteur2, engagement, droppeur, lanceur, lanceur2. Sans ce paramètre, il n'en a aucune.
//   ?tutosResp=1             marque les cartes d'explication des responsabilités comme déjà vues (défaut : elles s'affichent)
//   ?pilote=1                un panneau de navigateur CACHÉ ne rend aucune image : `requestAnimationFrame` ne tire plus et le
//                            match reste figé. Ce drapeau le remplace par un minuteur (60 Hz) pour pouvoir essayer le jeu
//                            depuis un onglet caché, comme `apercu-direct-3d.html?pilote=1`.
//
// ⚠️ AUCUNE SAUVEGARDE N'EST ÉCRITE : le store est branché sur un stockage nul, comme `apercuCarriereJoueur`.
// ⚠️ LES RÉGLAGES DU CONTRÔLE (`destiny-rugby:controle`) SONT DANS `localStorage` : l'aperçu les réécrit selon
// l'adresse ; ce sont des préférences d'appareil, pas la partie.
// En développement, `globalThis.__matchLive` donne le moteur et le pilote à la console (voir `MatchLive`).

import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '../src/index.css';
import '../src/App.css';
import 'flag-icons/css/flag-icons.min.css';
import { MatchLive } from '../src/components/MatchLive';
import { Reglages } from '../src/components/Reglages';
import { useGame } from '../src/store/useGame';
import { chargerTextes, definirLangue, LANGUES, type Langue } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import { estTitulaire } from '../src/lib/moteur/saison';
import { ecrirePreferencesControle } from '../src/lib/controleDirect/prefs';
import { retenirPreferencesTele } from '../src/lib/match3D';
import type { PosteId, ResponsabilitesJoueur } from '../src/types';
import type { RoleEquipe } from '../src/lib/moteur/responsabilites';
import { installerSituationCombinaison } from '../src/lib/moteur/moteur';
import { AXE, LARGEUR, LIGNE_A, LIGNE_B, sens } from '../src/lib/moteur/terrain';
import type { EtatMatch } from '../src/lib/moteur/etat';

chargerTextes(TEXTES);
useGame.persist.setOptions({
  name: 'apercu-controle-direct',
  storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});

const adresse = new URLSearchParams(location.search);
if (adresse.get('pilote') === '1') {
  window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}
const role = adresse.get('role') === 'banc' ? 'banc' : 'titulaire';
const poste = (adresse.get('poste') ?? 'ailier_droit') as PosteId;
const langue = (LANGUES.find((l) => l.id === adresse.get('langue'))?.id ?? 'fr') as Langue;

useGame.getState().creerJoueur({
  nom: 'Roméo Aldegheri', poste, nation: 'France', club: 'Meze Rugby Club', division: 'reg3', age: 21,
  traits: ['professionnel'],
});
useGame.getState().setLangue(langue);
definirLangue(langue);

// Les responsabilités (Correctif 17) : la liste de rôles de l'adresse devient la fiche du joueur.
const roles = (adresse.get('roles') ?? '').split(',').filter(Boolean) as RoleEquipe[];
const fiche: ResponsabilitesJoueur = {
  hierarchie: roles.includes('capitaine') ? 'capitaine' : roles.includes('viceCapitaine') ? 'vice' : 'aucune',
  buteur: roles.includes('buteur') ? 2 : roles.includes('buteur2') ? 1 : 0,
  engagement: roles.includes('engagement'), droppeur: roles.includes('droppeur'),
  lanceur: roles.includes('lanceur') ? 2 : roles.includes('lanceur2') ? 1 : 0,
};
useGame.setState((s) => ({ joueur: s.joueur ? { ...s.joueur, capitaine: roles.includes('capitaine'), responsabilites: fiche } : s.joueur }));

/**
 * Des situations toutes prêtes pour essayer à la main (la console les appelle : `__apercu.situation('penalite')`). Elles posent
 * l'état du match comme le banc `verifierResponsabilites.ts` : seule la manière d'y arriver diffère.
 */
function poser(p: { pos: { x: number; y: number }; cible: { x: number; y: number }; vitesse: { x: number; y: number }; corps?: unknown; battu: number; sanction: number; surLeTerrain: boolean; role: string }, x: number, y: number): void {
  p.pos = { x, y }; p.cible = { x, y }; p.vitesse = { x: 0, y: 0 };
  p.corps = undefined; p.battu = 0; p.sanction = 0; p.surLeTerrain = true; p.role = 'ligne';
}
(globalThis as { __apercu?: unknown }).__apercu = {
  situation(nom: string, option?: { distance?: number; ecart?: number }) {
    const live = (globalThis as { __matchLive?: { e: EtatMatch } }).__matchLive;
    const e = live?.e;
    const h = e?.pions.find((p) => p.moi);
    if (!e || !h) return 'pas de match';
    const cote = h.cote;
    const s = sens(cote);
    // Une situation neuve : plus de tir, de vol, de regroupement ni de coup de pied en cours.
    e.tir = null; e.vol = null; e.ballonLibre = null; e.ruck = null; e.conquete = null; e.lancement = null; e.porteur = null;
    delete e.piedPrepare; delete e.dropEnCours; e.choixPenalite = undefined;
    if (e.responsabilites) { e.responsabilites.attente = null; e.responsabilites.touche = null; e.responsabilites.engagement = null; }
    if (nom === 'penalite') {
      e.phase = 'penalite'; e.possession = cote; e.porteur = null; e.vol = null;
      const lieu = { x: cote === 'A' ? LIGNE_B - (option?.distance ?? 30) : LIGNE_A + (option?.distance ?? 30), y: AXE + (option?.ecart ?? 4) };
      e.ballon = { ...lieu };
      e.penalite = { pour: cote, lieu, motif: 'ballon gardé', defense: { rideau: 8, retardataires: 0 } };
      e.minuteur = 0; e.placement = null;
      return 'pénalité posée';
    }
    if (nom === 'touche') { installerSituationCombinaison(e, 'touche', { x: 60, y: 0.5 }); return 'touche posée'; }
    if (nom === 'drop') {
      const amis = e.pions.filter((p) => p.cote === cote && p !== h && p.surLeTerrain);
      const adv = e.pions.filter((p) => p.cote !== cote && p.surLeTerrain);
      amis.forEach((p, i) => poser(p, 50 + s * (i % 5) * 2, 6 + i * 4));
      adv.forEach((p, i) => poser(p, cote === 'A' ? 22 + (i % 5) * 2 : 98 - (i % 5) * 2, 5 + i * 4));
      poser(h, cote === 'A' ? LIGNE_B - (option?.distance ?? 30) : LIGNE_A + (option?.distance ?? 30), AXE + 2);
      e.phase = 'jeuCourant'; e.vol = null; e.ruck = null; e.ballonLibre = null; e.lancement = null; e.cellule = null;
      e.conquete = null; e.placement = null; e.minuteur = 99; e.gardeRuck = 0;
      e.porteur = h; e.possession = cote; e.ballon = { ...h.pos };
      return 'drop prêt';
    }
    if (nom === 'engagement') {
      e.phase = 'coupEnvoi'; e.possession = cote; e.porteur = null; e.vol = null; e.ballon = { x: 60, y: AXE };
      e.minuteur = 0; e.placement = null;
      poser(h, 60 - s * 1.2, AXE);
      return 'engagement posé';
    }
    return 'situations : penalite, touche, drop, engagement';
  },
  LARGEUR,
};

// La clé du match fixe, entre autres, qui est titulaire : on cherche la première qui donne le rôle voulu.
const joueur = useGame.getState().joueur!;
let cle = 'apercu-0';
for (let i = 0; i < 600; i++) {
  if (estTitulaire(joueur, `apercu-${i}`) === (role === 'titulaire')) { cle = `apercu-${i}`; break; }
}

// Aperçu rapide : l'avant-match est sauté, sauf demande.
retenirPreferencesTele({ presentation: adresse.get('presentation') === '1', ralentis: true });
ecrirePreferencesControle({
  mode: adresse.get('mode') === 'cartes' ? 'cartes' : 'direct',
  ...(adresse.get('tuto') === '0' ? { tutorielVu: true } : { tutorielVu: false }),
  tutosResp: adresse.get('tutosResp') === '1' ? ['penalite', 'tir', 'engagement', 'touche', 'drop'] : [],
});

function Apercu() {
  const j = useGame((s) => s.joueur);
  const [ouvert, setOuvert] = useState(true);
  if (!j) return null;
  if (adresse.get('vue') === 'reglages') {
    return ouvert
      ? <Reglages onFermer={() => setOuvert(false)} />
      : <p style={{ padding: 24, color: '#fff' }}>Réglages fermés. <button className="btn vert" onClick={() => setOuvert(true)}>Rouvrir</button></p>;
  }
  return ouvert ? (
    <MatchLive
      match={{ domicile: 'Meze Rugby Club', exterieur: 'RC Montmeyrannais', scoreD: 22, scoreE: 17, essaisD: 3, essaisE: 2 }}
      saison={j.saison}
      cle={cle}
      titre="Régionale 3 · Aperçu · journée 7"
      joueur={j}
      onFermer={() => setOuvert(false)}
    />
  ) : (
    <p style={{ padding: 24, color: '#fff' }}>
      Match fermé. <button className="btn vert" onClick={() => setOuvert(true)}>Rouvrir</button>
    </p>
  );
}

createRoot(document.getElementById('root')!).render(<Apercu />);
