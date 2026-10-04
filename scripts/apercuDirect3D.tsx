/* oxlint-disable react/only-export-components -- page de démonstration autonome, pas un module applicatif */
// APERÇU LOCAL DU DIRECT D'UNE LIGUE, TEL QUE LE SERVEUR LE SERT.
//
// Un vrai match tourne ici à la vitesse réelle, comme sur le serveur, et
// l'écran ne reçoit de lui qu'un relevé du terrain toutes les deux secondes —
// exactement ce que `/api/carriere` renvoie. Tout ce qu'on voit entre deux
// relevés est donc reconstruit côté client : c'est le banc d'essai de la scène
// 3D du direct, sans base ni compte.
//
// Ouvrir : /scripts/apercu-direct-3d.html (ajouter ?vitesse=4 pour presser le match).
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DirectCinema } from '../src/components/match/DirectCinema';
import { extraireTerrain, type VueMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { clubParNom } from '../src/data/clubs';
import { tenueDepuisCouleurs } from '../src/lib/match3D';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';

const DOMICILE = 'Stade Toulousain', EXTERIEUR = 'RC Toulon';
const vitesse = Number(new URLSearchParams(location.search).get('vitesse')) || 1;
const INTERVALLE_RELEVE = 2000;

function vue(e: ReturnType<typeof creerMatch>): VueMatchEnLigne {
  const stats = (cote: 'A' | 'B') => {
    const pions = e.pions.filter((p) => p.cote === cote);
    const somme = (cle: 'metres' | 'plaquages') => Math.round(pions.reduce((n, p) => n + (p.stats[cle] ?? 0), 0));
    const temps = e.compteurs.tempsA + e.compteurs.tempsB;
    return {
      possession: temps ? Math.round((cote === 'A' ? e.compteurs.tempsA : e.compteurs.tempsB) / temps * 100) : 50,
      metres: somme('metres'), plaquages: somme('plaquages'), essais: cote === 'A' ? e.essaisA : e.essaisB,
      penalitesTentees: 0, penalitesReussies: 0, turnovers: 0, cartons: 0,
    };
  };
  return {
    id: 'apercu-3d', minute: e.minute, horloge: e.t / 60, termine: e.fini,
    score: { domicile: e.scoreA, exterieur: e.scoreB }, essais: { domicile: e.essaisA, exterieur: e.essaisB },
    penalites: { domicile: 0, exterieur: 0 }, remplacementsFaits: 0, surLeBanc: [], surLeTerrain: [],
    fil: e.commentaires.slice(-30).map((c) => ({ minute: c.minute, seconde: c.seconde, texte: c.texte, type: c.type, cote: c.camp === 'A' ? 'domicile' : 'exterieur' })) as VueMatchEnLigne['fil'],
    stats: { domicile: stats('A'), exterieur: stats('B') },
    terrain: extraireTerrain(e, Date.now()), moments: [],
  };
}

function Apercu() {
  const moteur = useRef<ReturnType<typeof creerMatch> | null>(null);
  moteur.current ??= creerMatch(DOMICILE, EXTERIEUR, effectifDuClub(DOMICILE, 1), effectifDuClub(EXTERIEUR, 1), 24, 20,
    'apercu-direct-3d', undefined, { tempsReel: true, niveau: 'pro', scoreSurTerrain: true });
  const e = moteur.current;
  const [m, setM] = useState(() => vue(e));
  useEffect(() => {
    let dernier = performance.now();
    // Le « serveur » : le moteur avance en continu, sans rien montrer.
    const horloge = window.setInterval(() => {
      const maintenant = performance.now();
      avancer(e, Math.min(1, (maintenant - dernier) / 1000) * vitesse);
      dernier = maintenant;
    }, 100);
    // Le « réseau » : un relevé toutes les deux secondes, rien d'autre.
    const releve = window.setInterval(() => setM(vue(e)), INTERVALLE_RELEVE);
    return () => { window.clearInterval(horloge); window.clearInterval(releve); };
  }, [e]);
  const a = clubParNom(DOMICILE), b = clubParNom(EXTERIEUR);
  const couleurs = {
    domicile: a?.c1 ?? '#b0182a', exterieur: b?.c1 ?? '#16181c',
    maillots: {
      domicile: tenueDepuisCouleurs(a?.c1 ?? '#b0182a', a?.c2, DOMICILE),
      exterieur: tenueDepuisCouleurs(b?.c1 ?? '#16181c', b?.c2, EXTERIEUR),
    },
  };
  return (
    <main className="cel" style={{ maxWidth: 1020, margin: '18px auto', padding: 12 }}>
      <p style={{ color: '#cfd8c8', fontSize: 13 }}>
        Aperçu du direct en ligne · un relevé toutes les {INTERVALLE_RELEVE / 1000} s · vitesse ×{vitesse}
      </p>
      <DirectCinema match={m} domicile={DOMICILE} exterieur={EXTERIEUR} couleurs={couleurs}
        emblemes={{ domicile: a?.logo, exterieur: b?.logo }} />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Apercu />);
