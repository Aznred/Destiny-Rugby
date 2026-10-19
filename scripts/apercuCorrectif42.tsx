// APERÇU LOCAL — Correctif 42 : les trois usages ajoutés aux publicités récompensées.
// Aucun appel à AppLixir, aucun compte : un faux serveur en mémoire tient les plafonds et la progression, comme le vrai.
//   /scripts/apercuCorrectif42.html             les trois usages
//   /scripts/apercuCorrectif42.html?epuise=1    les deux récompenses de ligue déjà utilisées
//   /scripts/apercuCorrectif42.html?vue=labo    le Labo
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import OuverturePack from '../src/components/OuverturePack';
import { DeblocageCosmetiqueParPub, ManqueOvasLigue, OffrePublicitaire } from '../src/components/PublicitesRecompensees';
import { LaboPublicites } from '../src/components/LaboPublicites';
import type { SessionNavigateurPub } from '../src/lib/rewardedAdsService';
import {
  PUBLICITES_PAR_DEFAUT, STATS_PUB_VIDES, chancesPacksPremium, chancesPacksPub,
  type ContextePub, type ProgresCosmetiquePub, type RecompensePub,
} from '../src/lib/publicitesRecompensees';
import { PACKS_CARRIERE } from '../src/lib/ligue/catalogueCarriere';
import { EQUIPEMENT_PAR_ID } from '../src/data/boutique';
import { chargerTextes } from '../src/lib/i18n';
import { useGame } from '../src/store/useGame';
import { activerSynchronisationBoutiqueCompte } from '../src/lib/synchronisationBoutiqueCompte';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
import '../src/components/AtelierKiri.css';

if (!import.meta.env.DEV) throw new Error('Aperçu réservé au développement.');
chargerTextes(TEXTES);
const parametres = new URLSearchParams(location.search);
const packs = PACKS_CARRIERE.map((p) => ({ ...p, rewardedAdsEnabled: true }));
const config = { ...PUBLICITES_PAR_DEFAUT };
const sessions = new Map<string, RecompensePub>();
const utilisees: Record<string, number> = { DAILY_PACK: parametres.get('epuise') ? 2 : 1, SHOP_PREMIUM_PACK: 2, SHOP_OVAS: 0 };
const progres: Record<string, { fait: number; jour: number }> = { 'crampons-graffiti': { fait: 1, jour: 1 }, 'maillot-vannes': { fait: 3, jour: 0 } };
const cosmetiques = (): Record<string, ProgresCosmetiquePub> => Object.fromEntries(Object.entries(config.cosmetiques).map(([id, r]) => {
  const p = progres[id] ?? { fait: 0, jour: 0 };
  return [id, { progres: p.fait, requis: r.requis, debloque: p.fait >= r.requis, restantesAujourdhui: p.fait >= r.requis ? 0 : Math.max(0, r.limiteJour - p.jour) }];
}));
const vue = (ligue: boolean) => ({ config, disponible: true, jour: '2026-10-13',
  ovasRestantes: 2 - utilisees.SHOP_OVAS, packsRestants: Math.max(0, 2 - utilisees.DAILY_PACK), chances: ligue ? chancesPacksPub(packs, Date.now()) : [],
  premiumRestants: Math.max(0, 5 - utilisees.SHOP_PREMIUM_PACK), chancesPremium: chancesPacksPremium(packs, config, Date.now()), cosmetiques: cosmetiques(),
  enAttente: [...sessions.values()].filter((s) => s.rewardStatus === 'RESERVED' || s.rewardStatus === 'VERIFIED'), aVerifier: [] });

window.initializeAndOpenPlayer = (options) => {
  const conteneur = document.getElementById(options.injectionElementId)!;
  const texte = document.createElement('p'); texte.textContent = 'SIMULATION LOCALE · aucune annonce réelle'; conteneur.appendChild(texte);
  const bouton = document.createElement('button'); bouton.className = 'btn primaire'; bouton.textContent = 'Terminer la publicité simulée';
  bouton.onclick = () => {
    // Le « reçu signé » du faux serveur : c'est lui qui tire le pack ou valide le pas, jamais l'écran.
    const s = sessions.get(options.userId)!;
    const contexte = s.contexte as ContextePub;
    if (contexte === 'DAILY_PACK' || contexte === 'SHOP_PREMIUM_PACK') {
      const roulette = contexte === 'DAILY_PACK' ? chancesPacksPub(packs, Date.now()) : chancesPacksPremium(packs, config, Date.now());
      s.pack = roulette[Math.floor(Math.random() * roulette.length)].pack; s.rewardStatus = 'RESERVED'; utilisees[contexte]++;
    } else { s.rewardStatus = 'VERIFIED'; if (contexte === 'SHOP_OVAS') utilisees.SHOP_OVAS++; }
    options.adStatusCallbackFn({ type: 'complete' }); options.adStatusCallbackFn({ type: 'allAdsCompleted' }); options.adStatusCallbackFn({ type: 'thankYouModalClosed' });
  };
  conteneur.appendChild(bouton); options.adStatusCallbackFn({ type: 'start' });
};
const fetchReel = window.fetch.bind(window);
window.fetch = async (adresse, options) => {
  const url = String(adresse), body = options?.body ? JSON.parse(String(options.body)) : null;
  if (!new URL(url, location.href).pathname.startsWith('/api/')) return fetchReel(adresse, options);
  let donnees: unknown, statut = 200;
  if (url.includes('atelier')) donnees = { revision: 0, config, modeEffectif: 'TEST', callbackConfigure: true, packs, chances: chancesPacksPub(packs, Date.now()),
    statistiques: { ...STATS_PUB_VIDES(), requested: 61, started: 55, completed: 48, joueurs: 17, packsEarned: 30,
      contextes: { 'LEAGUE.requested': 22, 'LEAGUE.started': 20, 'LEAGUE.completed': 18, 'LEAGUE.rewards': 18, 'LEAGUE.ovas': 9400, 'LEAGUE.joueurs': 9,
        'PREMIUM.requested': 15, 'PREMIUM.started': 14, 'PREMIUM.completed': 12, 'PREMIUM.rewards': 12, 'PREMIUM.ovas': 21000, 'PREMIUM.joueurs': 5,
        'COSMETIC.requested': 14, 'COSMETIC.started': 12, 'COSMETIC.completed': 11, 'COSMETIC.rewards': 3, 'COSMETIC.joueurs': 6,
        'OVAS.requested': 10, 'OVAS.started': 9, 'OVAS.completed': 7, 'OVAS.rewards': 7, 'OVAS.ovas': 28, 'OVAS.joueurs': 4 } }, refus: { total: 0, derniers: [] } };
  else if (!body) donnees = vue(url.includes('ligue='));
  else if (body.operation === 'commencer') {
    const session: SessionNavigateurPub = { rewardSessionId: crypto.randomUUID(), contexte: body.contexte, ligue: body.ligue, rewardStatus: 'REQUESTED',
      montant: body.contexte === 'SHOP_OVAS' ? config.rewardedAdOvasAmount : 0, apiKey: config.apiKey, mode: 'TEST', ...(body.article ? { article: body.article } : {}) };
    sessions.set(session.rewardSessionId, session); donnees = session;
  } else if (body.operation === 'reclamer') {
    const s = sessions.get(body.rewardSessionId)!;
    if (s.rewardStatus === 'VERIFIED' && s.contexte === 'COSMETIC' && s.article) {
      const p = progres[s.article] ??= { fait: 0, jour: 0 }; p.fait++; p.jour++; s.rewardStatus = 'CLAIMED';
      donnees = { statut: 'CLAIMED', recompense: s, cosmetique: { id: s.article, ...cosmetiques()[s.article] } };
    } else if (s.rewardStatus === 'VERIFIED') { s.rewardStatus = 'CLAIMED'; donnees = { statut: 'CLAIMED', recompense: s }; }
    else donnees = { statut: s.rewardStatus === 'RESERVED' ? 'RESERVED' : 'PENDING', recompense: s };
  } else if (body.operation === 'ouvrirPremium') {
    const s = sessions.get(body.rewardSessionId)!; const ouvert = s.rewardStatus === 'RESERVED'; s.rewardStatus = 'CLAIMED';
    donnees = ouvert ? { statut: 'OPENED', pack: s.pack } : { statut: 'ALREADY_CLAIMED' };
  } else if (url.includes('boutique') || body.action === 'boutique') { donnees = { boutique: null }; }
  else donnees = { ok: true };
  if (donnees === undefined) { statut = 404; donnees = { erreur: 'inconnu' }; }
  return new Response(JSON.stringify(donnees), { status: statut, headers: { 'Content-Type': 'application/json' } });
};

// Rien n'est écrit dans le navigateur ; la synchronisation du coffre parle au faux serveur ci-dessus.
useGame.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
activerSynchronisationBoutiqueCompte();

function Apercu() {
  const [manque, setManque] = useState(false);
  const [packOuvert, setPackOuvert] = useState('');
  const finPack = useRef<() => void>(() => {});
  const [journal, setJournal] = useState<string[]>([]);
  const noter = (ligne: string) => setJournal((j) => [...j, ligne]);
  const ouvrir = async (ligne: string, nom: string) => {
    if (parametres.has('pack')) await new Promise<void>(resolve => {
      finPack.current = () => { setPackOuvert(''); resolve(); }; setPackOuvert(nom);
    });
    noter(ligne);
  };
  if (parametres.get('vue') === 'labo') return <main style={{ maxWidth: 1200, margin: 'auto', padding: '1rem' }}><LaboPublicites /></main>;
  return <main style={{ maxWidth: 1100, margin: 'auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
    <h1>Correctif 42 · aperçu simulé</h1>
    <section className="carte" style={{ padding: '1rem' }}>
      <h2>Ligue en ligne</h2>
      <p className="aide">Un pack à 300 Ovas, un solde de 120 : la fenêtre propose la publicité, sur le compteur du Pack Pub.</p>
      <button className="btn primaire" data-essai="manque" onClick={() => setManque(true)}>Ouvrir le pack Or (300 Ovas)</button>
      <OffrePublicitaire contexte="DAILY_PACK" ligue="ligue-apercu" onPack={async (id, pack) => ouvrir(`Ligue : ${pack.nom} ouvert (${id.slice(0, 8)})`, pack.nom)} />
      {manque && <ManqueOvasLigue ligue="ligue-apercu" pack="Or" manque={180} onFermer={() => setManque(false)} onObtenir={() => noter('Vers l’onglet du club')}
        onPack={async (id, pack) => ouvrir(`Ligue (fenêtre) : ${pack.nom} ouvert (${id.slice(0, 8)})`, pack.nom)} />}
    </section>
    <section className="carte" style={{ padding: '1rem' }}>
      <h2>Boutique</h2>
      <OffrePublicitaire contexte="SHOP_PREMIUM_PACK" onPack={async (id, pack) => noter(`Premium : ${pack.nom} gagné (${id.slice(0, 8)})`)} />
      <div className="grille-boutique">
        {['casque-rose', 'crampons-graffiti', 'maillot-vannes', 'maillot-italie'].map((id) => (
          <div key={id} className="carte article article-boutique" data-article={id}>
            <div className="article-nom">{EQUIPEMENT_PAR_ID[id].nom}</div>
            <div className="article-detail">{EQUIPEMENT_PAR_ID[id].detail}</div>
            <DeblocageCosmetiqueParPub article={id} onCosmetique={(etat) => noter(`${id} : ${etat.progres} / ${etat.requis}${etat.debloque ? ' — débloqué' : ''}`)} />
          </div>
        ))}
      </div>
    </section>
    <ol data-essai="journal">{journal.map((ligne, i) => <li key={i}>{ligne}</li>)}</ol>
    {packOuvert && <PackDeVerification nom={packOuvert} fermer={() => finPack.current()} />}
  </main>;
}
function PackDeVerification({ nom, fermer }: { nom: string; fermer: () => void }) {
  return <OuverturePack pack={nom} cartes={[]} garantie="bronze" onFermer={fermer} rendreCarte={() => null} />;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
