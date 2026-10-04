/* oxlint-disable react/only-export-components -- page de démonstration autonome, pas un module applicatif */
// APERÇU LOCAL DU DIRECT D'UNE LIGUE, TEL QUE LE SERVEUR LE SERT.
//
// Un vrai match tourne ici à la vitesse réelle, comme sur le serveur, et
// l'écran ne reçoit de lui, toutes les deux secondes, que ce que
// `/api/carriere` renvoie : le FILM du match (les pas du moteur depuis le
// dernier connu), passé par JSON comme sur le fil. C'est le banc d'essai du
// direct, sans base ni compte.
//
// Ouvrir : /scripts/apercu-direct-3d.html
//   ?vitesse=4     presse le match (le film suit) ;
//   ?latence=900   réponses lentes, jusqu'à ce nombre de millisecondes ;
//   ?regles=1      le moteur de ligue d'origine (joueurs installés d'un coup) ;
//   ?releve=1      l'ancien chemin : un relevé du terrain, interpolé par l'écran ;
//   ?pilote=1      les images ne sont plus cadencées par le navigateur mais par
//                  `__pomper(n)` — pour mesurer dans un onglet caché, où
//                  `requestAnimationFrame` ne tourne pas.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DirectCinema } from '../src/components/match/DirectCinema';
import { extraireTerrain, RESSERREMENT_REGLES_2, type VueMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { cadrerFilm, extraireFilm, filmer, reperesFilm, type FilmDirect } from '../src/lib/ligue/filmDirect';
import { avancer, creerMatch } from '../src/lib/moteur/moteur';
import { effectifDuClub } from '../src/lib/effectif';
import { clubParNom } from '../src/data/clubs';
import { tenueDepuisCouleurs } from '../src/lib/match3D';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';

const DOMICILE = 'Stade Toulousain', EXTERIEUR = 'RC Toulon';
const reglages = new URLSearchParams(location.search);
const vitesse = Number(reglages.get('vitesse')) || 1;
const latence = Number(reglages.get('latence')) || 0;
const regles2 = reglages.get('regles') !== '1';
const ancienChemin = reglages.get('releve') === '1';
const INTERVALLE_RELEVE = 2000;
if (reglages.get('pilote') === '1') {
  const file: FrameRequestCallback[] = [];
  let horloge = performance.now();
  window.requestAnimationFrame = (rappel) => { file.push(rappel); return file.length; };
  (window as unknown as { __pomper: (images?: number, pasMs?: number) => void }).__pomper = (images = 1, pasMs = 1000 / 30) => {
    for (let i = 0; i < images; i++) { horloge += pasMs; for (const rappel of file.splice(0)) rappel(horloge); }
  };
}

function vue(e: ReturnType<typeof creerMatch>): VueMatchEnLigne {
  // Le film remplace le relevé, comme sur le serveur ; avant le premier pas, la caméra n'a rien.
  const film = ancienChemin ? undefined : extraireFilm(e, reperesFilm.get('apercu-3d'));
  // La caméra ne filme que ce qui est regardé : la demande ci-dessus l'allume, on la cadre pour la suite.
  if (!ancienChemin) cadrerFilm(e, 0);
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
    terrain: film ? undefined : extraireTerrain(e, Date.now()),
    film: film ? JSON.parse(JSON.stringify(film)) as FilmDirect : undefined, moments: [],
  };
}

function Apercu() {
  const moteur = useRef<ReturnType<typeof creerMatch> | null>(null);
  moteur.current ??= creerMatch(DOMICILE, EXTERIEUR, effectifDuClub(DOMICILE, 1), effectifDuClub(EXTERIEUR, 1), 24, 20,
    'apercu-direct-3d', undefined, {
      tempsReel: true, niveau: 'pro', scoreSurTerrain: true,
      cadenceDetaillee: regles2, placementJoue: regles2, resserrement: regles2 ? RESSERREMENT_REGLES_2 : undefined,
    });
  const e = moteur.current;
  filmer(e);
  cadrerFilm(e, 0);
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
    const releve = window.setInterval(() => {
      const reponse = vue(e);
      if (latence) window.setTimeout(() => setM(reponse), 80 + Math.random() * latence);
      else setM(reponse);
    }, INTERVALLE_RELEVE);
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
        Aperçu du direct en ligne · {ancienChemin ? 'un relevé' : 'un envoi du film'} toutes les {INTERVALLE_RELEVE / 1000} s
        · règles {regles2 ? 2 : 1} · vitesse ×{vitesse}{latence ? ` · latence jusqu'à ${latence} ms` : ''}
      </p>
      <DirectCinema match={m} domicile={DOMICILE} exterieur={EXTERIEUR} couleurs={couleurs}
        emblemes={{ domicile: a?.logo, exterieur: b?.logo }} />
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Apercu />);
