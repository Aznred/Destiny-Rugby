/* oxlint-disable react/only-export-components -- aperçu local autonome */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DirectCinema } from '../src/components/match/DirectCinema';
import { MatchLive } from '../src/components/MatchLive';
import { creerMatch, avancer } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { extraireTerrain, type VueMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { chargerTextes } from '../src/lib/i18n';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';
import './apercuHabillageTV.css';

chargerTextes(TEXTES);
const A = 'Stade Toulousain', B = 'Montpellier HR';
const stats = { possession: 50, essais: 1, penalitesTentees: 0, penalitesReussies: 0, plaquages: 22, metres: 120, turnovers: 1, cartons: 0 };
function Apercu() {
  const moteur = useRef<ReturnType<typeof creerMatch> | null>(null);
  if (!moteur.current) {
    moteur.current = creerMatch(A, B, effectifDuClub(A, 1), effectifDuClub(B, 1), 17, 12, 'habillage-tv', undefined,
      { tempsReel: true, niveau: 'pro', cadenceDetaillee: true, placementJoue: true });
    moteur.current.t = 342; moteur.current.minute = 5;
    moteur.current.scoreA = 0; moteur.current.scoreB = 0;
  }
  const e = moteur.current;
  const [revision, redessiner] = useState(0);
  const [pause, setPause] = useState(true);
  const [logo, setLogo] = useState('top14');
  const [intro, setIntro] = useState(false);
  const [format, setFormat] = useState('pc');
  useEffect(() => {
    if (pause || intro) return;
    const timer = setInterval(() => { avancer(e, .2); redessiner(n => n + 1); }, 200);
    return () => clearInterval(timer);
  }, [e, pause, intro]);
  const carton = (type: 'jaune' | 'rouge') => {
    const p = e.pions.find(p => p.cote === 'B' && p.surLeTerrain && !p.sanction)!;
    p.sanction = type === 'jaune' ? 600 : 99999;
    p.surLeTerrain = false;
    if (type === 'rouge') p.stats.cartonsRouges++;
    else p.stats.cartonsJaunes++;
    redessiner(n => n + 1);
  };
  const m: VueMatchEnLigne = {
    id: `habillage-${logo}`, minute: e.minute, horloge: e.t / 60, termine: false,
    score: { domicile: e.scoreA, exterieur: e.scoreB }, essais: { domicile: 2, exterieur: 1 }, penalites: { domicile: 1, exterieur: 1 },
    fil: [], moments: [], remplacementsFaits: 0, surLeTerrain: [], surLeBanc: [],
    stats: { domicile: stats, exterieur: stats }, terrain: extraireTerrain(e, Date.now()),
  };
  return <main className={`apercu-tv cel format-${format}`} data-revision={revision}>
    <header><div><small>DESTINY RUGBY</small><h1>Habillage TV</h1><p>Aperçu local · Match de démonstration</p></div>
      <a href="/">Retour au jeu</a></header>
    <nav aria-label="Scénarios de vérification">
      <button onClick={() => setIntro(true)}>Entrée des équipes</button>
      <button onClick={() => carton('jaune')}>Carton jaune</button>
      <button onClick={() => carton('rouge')}>Carton rouge</button>
      <button onClick={() => { for (const p of e.pions) if (p.sanction > 0 && p.sanction <= 600) p.sanction = 3; redessiner(n => n + 1); }}>Retour dans 3 secondes</button>
      <button onClick={() => { e.periode = 2; e.t = 2400; e.minute = 40; e.phase = 'coupEnvoi'; redessiner(n => n + 1); }}>Deuxième mi-temps</button>
      <button onClick={() => setPause(p => !p)}>{pause ? 'Reprendre' : 'Pause'}</button>
      <label>Ligue <select value={logo} onChange={ev => setLogo(ev.target.value)}><option value="top14">Top 14</option><option value="urc">United Rugby Championship</option><option value="">Ligue des Copains</option></select></label>
      <label>Format <select value={format} onChange={ev => setFormat(ev.target.value)}><option value="pc">Ordinateur</option><option value="mobile">Téléphone paysage</option><option value="tablette">Tablette paysage</option></select></label>
    </nav>
    <DirectCinema key={logo} match={m} domicile={A} exterieur={B} pause={pause}
      couleurs={{ domicile: '#d5001c', exterieur: '#f3f5f6' }} emblemes={{ domicile: '/logos/toulouse.png', exterieur: '/logos/montpellier.png' }}
      identite={{ nom: logo === 'top14' ? 'Top 14' : logo === 'urc' ? 'United Rugby Championship' : 'Ligue des Copains', logo, journee: 5 }} />
    {intro && <MatchLive match={{ domicile: A, exterieur: B, scoreD: 17, scoreE: 12, essaisD: 2, essaisE: 1 }} saison={1}
      cle="apercu-entree-tv" titre="Journée 5 — Ligue des Copains" habillage={{ nom: 'Ligue des Copains', logo, journee: 5 }} onFermer={() => setIntro(false)} />}
  </main>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Apercu />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
