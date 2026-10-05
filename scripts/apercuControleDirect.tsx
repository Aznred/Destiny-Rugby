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
import type { PosteId } from '../src/types';

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
