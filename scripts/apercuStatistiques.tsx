// Aperçu local du Labo « Statistiques » (Correctif 25) : une population inventée, la VRAIE agrégation, le vrai écran.
// Aucune base n'est lue : `fetch` est remplacé pour l'adresse des statistiques seulement.
//   /scripts/apercuStatistiques.html            population d'exemple
//   /scripts/apercuStatistiques.html?vide=1     base sans relevé
//   /scripts/apercuStatistiques.html?absent=1   tables pas encore posées
import { createRoot } from 'react-dom/client';
import { LaboStatistiques } from '../src/components/LaboStatistiques';
import {
  assemblerStatistiques, decaler, fusionnerEnvoi, jourUTC, matiereDepuisLignes,
  type CompteurUsage, type LigneUsage, type ModeUsage, type PeriodeUsage,
} from '../src/lib/usage/agregats';
import '../src/index.css';
import '../src/App.css';
import '../src/components/AtelierKiri.css';
import { bilanCarrieres, fusionnerCarrieres, type CarriereUsage } from '../src/lib/usage/carrieres';

const adresse = new URLSearchParams(location.search);
const AUJ = jourUTC(Date.now());
const lignes: LigneUsage[] = [], compteurs: CompteurUsage[] = [];
const carrieres: CarriereUsage[] = [];
let graine = 20261007;
const alea = () => { graine = (graine * 1664525 + 1013904223) >>> 0; return graine / 4294967296; };
const choisir = <T,>(liste: T[]) => liste[Math.floor(alea() * liste.length)];
const MODES: ModeUsage[] = ['ligue', 'ligue', 'ligue', 'joueur', 'joueur', 'joueur', 'existant', 'entraineur', 'entraineur', 'collection'];
const POSTES = ['demi_melee', 'demi_ouverture', 'ailier_gauche', 'troisieme_aile_g', 'pilier_droit', 'arriere', 'premier_centre', 'talonneur'];
const CLUBS = ['Stade Toulousain', 'Stade Rochelais', 'Union Bordeaux-Bègles', 'Meze Rugby Club', 'RC Toulon', 'ASM Clermont', 'Aviron Bayonnais'];
const VEDETTES = ['Antoine DUPONT', 'Antoine DUPONT', 'Antoine DUPONT', 'Romain NTAMACK', 'Louis BIELLE-BIARREY', 'Damian PENAUD', 'Thomas RAMOS', 'Grégory ALLDRITT'];

if (!adresse.has('vide')) {
  for (let n = 0; n < 420; n++) {
    const appareil = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const arrive = Math.floor(alea() ** 1.6 * 55);
    const premier = decaler(AUJ, -arrive);
    const mode = choisir(MODES);
    const assidu = 0.12 + alea() * (mode === 'ligue' ? 0.7 : mode === 'collection' ? 0.35 : 0.5);
    for (let k = 0; k <= arrive; k++) {
      if (k > 0 && alea() > assidu * (k < 3 ? 1.4 : 1)) continue;
      const jour = decaler(premier, k);
      const duree = Math.round((300 + alea() * 3000) / 15) * 15;
      const c: Record<string, number> = {};
      c[`sessions.${mode}`] = 1;
      const secondes: Partial<Record<ModeUsage, number>> = { [mode]: Math.min(3000, duree), autre: 60 };
      if (k === 0 && mode === 'joueur') { c['carrieres.cree'] = 1; c[`poste.${choisir(POSTES)}`] = 1; c[`club.${choisir(CLUBS)}`] = 1; }
      if (k === 0 && mode === 'existant') { const v = choisir(VEDETTES); c['carrieres.existant'] = 1; c[`incarne.${v}`] = 1; c[`poste.${choisir(POSTES)}`] = 1; c[`club.${choisir(CLUBS)}`] = 1; }
      if (k === 0 && mode === 'entraineur') c['carrieres.entraineur'] = 1;
      if (mode === 'joueur') c['matchs.cree'] = 1 + Math.floor(alea() * 3);
      if (mode === 'existant') { const v = VEDETTES[n % VEDETTES.length]; c['matchs.existant'] = 1 + Math.floor(alea() * 3); c[`incarne.${v}.matchs`] = c['matchs.existant']; c[`incarne.${v}.secondes`] = Math.min(3000, duree); }
      if (mode === 'collection') { c['packs.solo'] = 1 + Math.floor(alea() * 6); c[`obtenue.${VEDETTES[n % VEDETTES.length]}`] = c['packs.solo']; if (k === 0) c['collection.debut'] = 1; }
      if (mode === 'existant') c[`utilisee.${VEDETTES[n % VEDETTES.length]}`] = c['matchs.existant'];
      if ((mode === 'joueur' || mode === 'existant') && alea() < 0.06) c[`saisons.${mode === 'joueur' ? 'cree' : 'existant'}`] = 1;
      if (mode === 'entraineur' && alea() < 0.05) c['saisons.entraineur'] = 1;
      // Un match en 3D mesuré, certains jours : la plateforme est celle de l'appareil, la tranche suit sa puissance
      // (sans tirage : la population d'exemple ne bouge pas pour les autres onglets).
      if (mode !== 'collection' && (n + k) % 3 === 0) {
        const plateforme = n % 20 < 11 ? 'android' : n % 20 < 16 ? 'ios' : n % 20 < 19 ? 'ordinateur' : 'autre';
        const force = (n * 7 + k) % 10;
        const tranche = plateforme === 'ordinateur' ? (force < 1 ? 'correcte' : 'fluide') : force < 1 ? 'saccadee' : force < 4 ? 'trente' : force < 6 ? 'correcte' : 'fluide';
        c[`fluidite.${plateforme}.${tranche}`] = 1;
        if (tranche === 'trente' || tranche === 'saccadee') { c[`fluidite.${plateforme}.cadence30`] = 1; c[`fluidite.${plateforme}.definition`] = 1; }
        else if (tranche === 'correcte') c[`fluidite.${plateforme}.definition`] = 1;
      }
      fusionnerEnvoi(lignes, compteurs, { appareil, jour, premier, modePremier: mode, secondes, sessions: 1 + (alea() < 0.3 ? 1 : 0), compteurs: c,
        ...(mode === 'collection' ? { jauges: { taille: 30 + k * 9 + Math.floor(alea() * 20), exemplaires: 45 + k * 14, packs: 5 + k * 3, genEquipe: 55 + n % 35,
          xv: Array.from({ length: 15 }, (_, i) => i < 3 ? VEDETTES[(n + i) % VEDETTES.length] : `Joueur de démonstration ${n}-${i}`),
          rares: [{ nom: VEDETTES[n % VEDETTES.length], rarete: 'star', note: 88 + n % 7, n: 1 }] } } : {}) });
      if (mode === 'joueur' || mode === 'existant' || mode === 'entraineur') fusionnerCarrieres(carrieres, [{
        id: appareil, type: mode === 'joueur' ? 'cree' : mode, debut: premier, dernier: jour, club: CLUBS[n % CLUBS.length], poste: POSTES[n % POSTES.length],
        matchs: (k + 1) * 2, saisons: Math.floor(k / 7), secondes: (k + 1) * duree, fermee: n % 7 === 0,
      }]);
    }
  }
}

const fetchDOrigine = window.fetch.bind(window);
window.fetch = async (entree: RequestInfo | URL, options?: RequestInit) => {
  const url = String(entree);
  if (!url.includes('statistiques=usage')) return fetchDOrigine(entree, options);
  const demandee = new URL(url, location.origin).searchParams.get('periode');
  const periode: PeriodeUsage = demandee === 'jour' || demandee === '7' || demandee === '30' ? demandee : 'tout';
  const corps = adresse.has('absent') ? { indisponible: true } : assemblerStatistiques({ ...matiereDepuisLignes(lignes, compteurs, periode, AUJ), carrieres: bilanCarrieres(carrieres, periode, AUJ) }, periode);
  await new Promise((r) => setTimeout(r, 180));
  return new Response(JSON.stringify(corps), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

createRoot(document.getElementById('root')!).render(<main style={{ maxWidth: 1180, margin: '28px auto', padding: 16 }}>
  <section className="atelier-kiri"><LaboStatistiques /></section>
</main>);
