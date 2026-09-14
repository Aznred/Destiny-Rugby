import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YouTube from 'react-youtube';
import './App.css';
import { Analytics } from '@vercel/analytics/react'
import { useGame } from './store/useGame';
import { langueDepuisAdresseIP, t } from './lib/i18n';
import { pageVue } from './lib/mesure';
import { chantierVisible } from './lib/modeDev';
import { capterInvitation } from './lib/invitationLigue';
import { activerSynchronisationBoutiqueCompte } from './lib/synchronisationBoutiqueCompte';
import { Nav } from './components/Nav';
import { Garde } from './components/Garde';
import { Guide } from './components/Guide';
import { Reglages } from './components/Reglages';
import { Accueil } from './screens/Accueil';
import { Creation } from './screens/Creation';
import { Carriere } from './screens/Carriere';
import { Profil } from './screens/Profil';
import { Icone } from './components/Icone';

// ---------------------------------------------------------------------------
// ⚠️ CE QUI N'EST PAS SUR LE CHEMIN D'ARRIVÉE EST CHARGÉ À LA DEMANDE
// ---------------------------------------------------------------------------
// Le premier écran d'un visiteur, c'est l'Accueil — puis la Création, puis la
// Carrière. Les six autres écrans étaient pourtant importés en dur dans le
// chunk principal : L'Ovale (1 156 lignes et tout l'annuaire), l'écran
// Résultats (711 lignes, les coupes, les classements individuels), l'atlas des
// 655 clubs… Tout cela était téléchargé et analysé AVANT le premier pixel,
// alors qu'on n'y accède qu'après avoir créé un joueur. Chacun part désormais
// dans son propre fichier, chargé au moment où on clique dessus.
const Boutique = lazy(() => import('./screens/Boutique').then((m) => ({ default: m.Boutique })));
const Pantheon = lazy(() => import('./screens/Pantheon').then((m) => ({ default: m.Pantheon })));
const FinCarriere = lazy(() => import('./screens/FinCarriere').then((m) => ({ default: m.FinCarriere })));
const Classement = lazy(() => import('./screens/Classement').then((m) => ({ default: m.Classement })));
const Championnats = lazy(() => import('./screens/Championnats').then((m) => ({ default: m.Championnats })));
const Effectif = lazy(() => import('./screens/Effectif').then((m) => ({ default: m.Effectif })));
const Tableau = lazy(() => import('./screens/Tableau').then((m) => ({ default: m.Tableau })));
const Social = lazy(() => import('./screens/Social').then((m) => ({ default: m.Social })));
// ⚠️ LE MODE MANAGER EST CHARGÉ À LA DEMANDE, comme les autres écrans
// secondaires : la création balaie les 855 clubs du jeu, et personne ne doit
// payer ce code tant qu’il n’a pas choisi d’entraîner.
const CreationManager = lazy(() => import('./screens/CreationManager').then((m) => ({ default: m.CreationManager })));
const Manager = lazy(() => import('./screens/Manager').then((m) => ({ default: m.Manager })));
const CarriereEnLigne = lazy(() => import('./screens/CarriereEnLigne').then((m) => ({ default: m.CarriereEnLigne })));
const CollectionSolo = lazy(() => import('./screens/CollectionSolo').then((m) => ({ default: m.CollectionSolo })));
// La cérémonie 3D tire tout Three.js derrière elle : on ne la charge qu'au
// moment où un trophée est remporté (sinon elle alourdit le chunk principal).
const TropheeGagne = lazy(() =>
  import('./components/TropheeGagne').then((m) => ({ default: m.TropheeGagne })),
);

// Le temps qu'un écran arrive : quelques dixièmes de seconde, jamais une page
// blanche. Le fond du stade reste en place, seul le contenu attend.
function EcranEnRoute() {
  return (
    <div className="ecran-en-route" role="status" aria-live="polite">
      <span className="ballon-attente" aria-hidden="true" />
      <span>{t('app.chargement')}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🎵 LE LECTEUR MUSICAL GLOBAL
// ---------------------------------------------------------------------------
function LecteurMusical() {
  const [player, setPlayer] = useState<any>(null);
  const [enLecture, setEnLecture] = useState(false);
  const [playlistId, setPlaylistId] = useState('PLm90DCMQmtlkBigTzyX97RPgTL90ZYELs');

  const onReady = (event: any) => {
    setPlayer(event.target);
  };

  const basculerLecture = () => {
    if (!player) return;
    if (enLecture) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '50px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
      
      {/* Lecteur YouTube CACHÉ (1x1 pixel) */}
      <div style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }}>
        <YouTube 
          opts={{ playerVars: { listType: 'playlist', list: playlistId, autoplay: 0 } }}
          onReady={onReady}
          onStateChange={(e) => setEnLecture(e.data === 1)} // 1 = en cours de lecture
        />
      </div>

      {/* INTERFACE PERSONNALISÉE */}
      <button onClick={basculerLecture} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}>
        {enLecture ? <Icone nom="pause" taille={20} /> : <Icone nom="play" taille={20} />}
      </button>
      
      <button onClick={() => player?.nextVideo()} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <Icone nom="fleche-droite" taille={20} />
      </button>
      
      {/* Champ pour que le joueur mette sa propre playlist */}
      <input 
        type="text" 
        placeholder="Lien playlist YouTube..." 
        style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', width: '160px' }}
        onBlur={(e) => {
          const match = e.target.value.match(/list=([a-zA-Z0-9_-]+)/);
          if (match) {
            setPlaylistId(match[1]);
            if (player) {
              player.loadPlaylist({ list: match[1], listType: 'playlist' });
            }
          }
        }}
      />
    </div>
  );
}

export default function App() {
  const ecran = useGame((s) => s.ecran);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const managerVisible = chantierVisible('manager');
  // Ce filtre reste le garde-fou commun aux futurs chantiers. Le mode manager
  // est public aujourd'hui, donc une sauvegarde entraîneur compte normalement
  // comme carrière active sur tous les écrans partagés.
  const managerActif = managerVisible ? manager : null;
  const setEcran = useGame((s) => s.setEcran);
  const tropheesEnAttente = useGame((s) => s.tropheesEnAttente);
  const fermerTrophee = useGame((s) => s.fermerTrophee);
  // ⚠️ CHANGER DE LANGUE REDESSINE TOUT. `t()` lit une variable de module (elle
  // est appelée depuis des fonctions pures sans hook) : React n'a donc aucun
  // moyen de savoir qu'un texte a changé. On s'abonne à la langue ici et on
  // s'en sert comme `key` sur l'arbre — un seul remontage, instantané, plutôt
  // qu'un contexte à traverser dans les cent fichiers de l'interface.
  const langue = useGame((s) => s.langue);
  const appliquerLangueAutomatique = useGame((s) => s.appliquerLangueAutomatique);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  // Nombre de trophées de la « salve » en cours, figé à l'ouverture de la file
  const [totalTrophees, setTotalTrophees] = useState(0);

  useEffect(() => {
    if (tropheesEnAttente.length > totalTrophees) {
      setTotalTrophees(tropheesEnAttente.length);
    } else if (tropheesEnAttente.length === 0 && totalTrophees !== 0) {
      setTotalTrophees(0);
    }
  }, [tropheesEnAttente.length, totalTrophees]);

  // Le pays associé à l'IP arrive sans bloquer l'accueil. Une préférence
  // choisie dans les réglages reste prioritaire (contrôle fait aussi dans le
  // store, au cas où la réponse et le clic arriveraient au même instant).
  useEffect(() => {
    let actif = true;
    void langueDepuisAdresseIP().then((detectee) => {
      if (actif && detectee) appliquerLangueAutomatique(detectee);
    });
    return () => { actif = false; };
  }, [appliquerLangueAutomatique]);

  // Le coffre reste local hors connexion, puis rejoint automatiquement le
  // compte reconnu par la Carriere en ligne.
  useEffect(() => activerSynchronisationBoutiqueCompte(), []);

  // ⚠️ PLUS RIEN À PRÉCHARGER. Il y avait ici un préchargement différé du
  // modèle WebLLM : 900 Mo téléchargés en arrière-plan au premier lancement,
  // une compilation WebGPU, et un repli silencieux quand l'appareil ne suivait
  // pas. Le Maître du Jeu passe désormais par Groq (`lib/groq.ts`) : il n'y a
  // ni téléchargement, ni GPU à interroger, ni état à préparer — le premier
  // appel part quand le joueur agit.

  // ⚠️ UN LIEN D’INVITATION OUVRE LE JEU SUR LA CARRIÈRE EN LIGNE.
  //    `/?ligue=DR-…` arrive sur l’accueil comme n’importe quelle adresse :
  //    sans ce branchement, l’invité tombe sur la page d’accueil du jeu et
  //    n’a aucune idée de ce qu’on l’a invité à faire. `capterInvitation`
  //    met le code de côté et nettoie l’adresse ; l’écran le retrouve ensuite,
  //    même après une inscription et un rechargement.
  //    Une seule fois, à l’ouverture : les dépendances vides sont voulues.
  useEffect(() => {
    const ouvrir = () => setEcran('carriereEnLigne');
    window.addEventListener('destiny-ouvrir-match',ouvrir);
    return () => window.removeEventListener('destiny-ouvrir-match',ouvrir);
  },[setEcran]);
  useEffect(() => { if (capterInvitation() || new URLSearchParams(location.search).has('directLigue')) setEcran('carriereEnLigne'); }, [setEcran]);
  // ⚠️ UN ÉCRAN VAUT UNE PAGE VUE. Le jeu n'a qu'une adresse : sans cette
  // ligne, toute une session ne compte qu'une page et l'on ne peut pas voir
  // où les joueurs décrochent. C'est le SEUL endroit qui voit tous les
  // changements d'écran — six écritures du store posent `ecran:` directement,
  // sans passer par `setEcran` (création, retraite, ouverture des messages…).
  useEffect(() => { pageVue(ecran); }, [ecran]);

  // Garde-fou : pas d'écran carrière/profil sans joueur, et aucune porte
  // indirecte vers une fonctionnalité qui serait remise en chantier.
  useEffect(() => {
    if (
      ((ecran === 'carriere' || ecran === 'profil') && !joueur)
      || (ecran === 'social' && !joueur && !managerActif)
      // ⚠️ `tableau` et `effectif` servent AUSSI au mode manager : les renvoyer
      //    à l’accueil dès que `joueur` est nul enfermait l’entraîneur dehors.
      || ((ecran === 'tableau' || ecran === 'effectif') && !joueur && !managerActif)
      || (ecran === 'creationManager' && !managerVisible)
      || (ecran === 'manager' && !managerActif)
    ) {
      setEcran('accueil');
    }
  }, [ecran, joueur, managerActif, managerVisible, setEcran]);

  return (
    <div key={langue} className="racine" data-ecran={ecran}>
      <a className="aller-contenu" href="#contenu-principal">
        {t('app.allerContenu')}
      </a>
      <Nav onReglages={() => setReglagesOuverts(true)} />
      {/* Le guide de carrière : une pastille discrète, sur tous les écrans de
          jeu. Il ne monte rien tant qu'il n'y a pas de carrière. */}
      <Guide />

      <main id="contenu-principal" tabIndex={-1}>
        {/* Un écran qui plante ne doit JAMAIS emporter la navigation avec lui. */}
        <Garde key={ecran} onRetour={() => setEcran('accueil')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={ecran}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {ecran === 'accueil' && <Accueil />}
            {ecran === 'creation' && <Creation />}
            {ecran === 'carriere' && <Carriere onReglages={() => setReglagesOuverts(true)} />}
            {ecran === 'profil' && <Profil />}
            <Suspense fallback={<EcranEnRoute />}>
              {ecran === 'boutique' && <Boutique />}
              {ecran === 'pantheon' && <Pantheon />}
              {ecran === 'finCarriere' && <FinCarriere />}
              {ecran === 'classement' && <Classement />}
              {ecran === 'championnats' && <Championnats />}
              {ecran === 'effectif' && Boolean(joueur || managerActif) && <Effectif />}
              {ecran === 'tableau' && Boolean(joueur || managerActif) && <Tableau />}
              {ecran === 'social' && Boolean(joueur || managerActif) && <Social />}
              {ecran === 'creationManager' && managerVisible && <CreationManager />}
              {ecran === 'manager' && Boolean(managerActif) && <Manager />}
              {ecran === 'carriereEnLigne' && <CarriereEnLigne />}
              {ecran === 'collectionSolo' && <CollectionSolo />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
        </Garde>
      </main>

      <AnimatePresence>
        {reglagesOuverts && <Reglages onFermer={() => setReglagesOuverts(false)} />}
      </AnimatePresence>

      <footer className="pied-application">
        <a href="/a-propos/">À propos</a>
        <a href="/confidentialite/">Confidentialité</a>
        <a href="/mentions-legales/">Mentions légales</a>
        <a href="/contact/">Contact</a>
      </footer>

      {/* Cérémonie : le trophée gagné s'affiche en 3D, un par un */}
      <AnimatePresence>
        {tropheesEnAttente.length > 0 && (
          <Suspense fallback={null}>
            <TropheeGagne
              key={`${tropheesEnAttente[0]}-${tropheesEnAttente.length}`}
              tropheeId={tropheesEnAttente[0]}
              index={totalTrophees - tropheesEnAttente.length + 1}
              total={totalTrophees}
              onFermer={fermerTrophee}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* TON NOUVEAU LECTEUR MUSICAL GLOBAL */}
      <LecteurMusical />

      <Analytics/>
    </div>
  );
}