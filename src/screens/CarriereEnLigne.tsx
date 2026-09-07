import { RoueCartes } from '../components/RoueCartes';
// ═══════════════════════════════════════════════════════════════════════════
// LA CARRIÈRE EN LIGNE — le troisième mode
// ═══════════════════════════════════════════════════════════════════════════
// Une ligue privée entre amis : chacun son club, trente Bronze au départ, des
// packs, un marché, des coupes maison et des matchs qu'on peut regarder en
// direct en changeant de plan.
//
// ⚠️ CET ÉCRAN NE DÉCIDE DE RIEN. Il n'y a pas une seule règle du jeu ici :
// aucun solde n'est calculé, aucune carte n'est attribuée, aucun score n'est
// produit. Tout passe par `commanderCarriere`, le serveur tranche, et l'écran
// affiche la vue qu'on lui rend. C'est l'invariant n°1 du mode — le client
// DEMANDE une action, il ne DÉCLARE jamais un état — et il se voit ici : le
// composant n'a pas de `useState` qui contienne un Ovas, une carte ou un score.
//
// ⚠️ ET IL N'IMPORTE PAS LE MOTEUR DE MATCH. `lib/ligue/matchCarriere.ts`
// tourne côté serveur ; en tirer les libellés ferait entrer les 3 500 lignes du
// moteur dans le paquet du navigateur pour afficher sept mots. Les listes
// d'options sont donc déclarées ici, avec leurs textes français — c'est
// d'ailleurs la règle du dossier `lib/ligue/` : aucun texte affichable.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Icone, type NomIcone } from '../components/Icone';
import { lienInvitation, invitationEnAttente, oublierInvitation } from '../lib/invitationLigue';
import { Selecteur } from '../components/Selecteur';
import { CompositionTerrainManager } from '../components/CompositionTerrainManager';
import { EcussonClub } from '../components/EcussonClub';
import { PieceOvas } from '../components/PieceOvas';
import { Confirmation } from '../components/Confirmation';
import { useGame } from '../store/useGame';
import { nomPoste, POSTE_PAR_ID } from '../data/rugby';
import { meilleureComposition } from '../lib/meilleureComposition';
import { EFFECTIF_MINIMUM, POSTES_XV_MANAGER } from '../lib/compositionManager';
import type { CompositionManager } from '../types';
import type { Coequipier } from '../lib/effectif';
import type { EtatDuJoueur } from '../lib/carteJoueur';
import type { CarteCarriere, CommandeCarriere, VueCarriereEnLigne } from '../lib/ligue/typesCarriere';
import type { StrategieEnLigne } from '../lib/ligue/matchCarriere';
import {
  chargerSessionCarriere, chargerLigueCarriere, identifierCarriere, deconnecterCarriere,
  creerLigueCarriere, rejoindreLigueCarriere, commanderCarriere, chargerEmblemesCarriere, ErreurCarriere,
} from '../lib/carriereEnLigneClient';
import type { IdentiteLigue } from '../lib/carriereEnLigneClient';
import type { CataloguesIdentite, GroupeEmblemes, SessionCarriere, TropheeLigue } from '../lib/carriereEnLigneClient';
import './CarriereEnLigne.css';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
export { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import { CollectionLigue } from '../components/CollectionLigue';
import OuverturePack from '../components/OuverturePack';
import { NOMS_PACK } from '../lib/presentationPacks';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { valeurVenteRapide } from '../lib/ligue/venteRapideCarriere';
import { ModaleMarche } from '../components/ModaleMarche';

type Onglet = 'club' | 'calendrier' | 'composition' | 'effectif' | 'collection' | 'packs' | 'marche' | 'competitions' | 'histoire';
type Agir = (commande: CommandeCarriere) => Promise<VueCarriereEnLigne | undefined>;
type VueRencontre = VueCarriereEnLigne['rencontres'][number];
const ONGLETS: { id: Onglet; label: string; icone: NomIcone }[] = [
  { id: 'club', label: 'Le club', icone: 'stade' }, { id: 'calendrier', label: 'Calendrier', icone: 'calendrier' },
  { id: 'composition', label: 'Composition', icone: 'maillot' },
  { id: 'effectif', label: 'Effectif', icone: 'equipe' }, { id: 'collection', label: 'Collection', icone: 'journal' }, { id: 'packs', label: 'Packs', icone: 'cadeau' },
  { id: 'marche', label: 'Marché', icone: 'poignee' }, { id: 'competitions', label: 'Compétitions', icone: 'trophee' },
  { id: 'histoire', label: 'Histoire', icone: 'journal' },
];
const RARETES = NOMS_PACK;
const nombres = new Intl.NumberFormat('fr-FR');
const montant = (n: number) => nombres.format(n);
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const dateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const nomClub = (vue: VueCarriereEnLigne, id: string) => vue.clubs.find(c => c.id === id)?.nom ?? 'Club';
const messageErreur = (e: unknown) => e instanceof Error ? e.message : 'Cette action n’a pas pu être enregistrée.';
const maintenantISO = () => new Date().toISOString();

/**
 * ⚠️ LA MÊME CONVERSION QUE LE SERVEUR, RECOPIÉE EN CINQ LIGNES. L'importer de
 * `lib/ligue/catalogueCarriere` tirerait `effectifsReels` et `amateurs` — les
 * 78 000 joueurs du catalogue mondial — dans le paquet du navigateur, pour
 * afficher trente cartes que le serveur a déjà envoyées.
 */
const carteEnJoueur = (c: CarteCarriere): Coequipier => ({
  id: c.id, nom: c.nom, poste: c.poste, age: c.age, note: c.note,
  potentiel: c.potentiel, nation: c.nation, regen: c.origine === 'formation', horsGeneration: true,
});

// Les libellés français des consignes. Le serveur ne connaît que les codes.
const MENTALITES: [string, string][] = [['tresDefensive', 'Très défensive'], ['defensive', 'Défensive'], ['equilibree', 'Équilibrée'], ['offensive', 'Offensive'], ['tresOffensive', 'Très offensive']];
const JEUX: [string, string][] = [['occupation', 'Occupation'], ['possession', 'Possession'], ['jeuAuPied', 'Jeu au pied'], ['large', 'Jeu au large'], ['axe', 'Jeu dans l’axe'], ['rapide', 'Jeu rapide'], ['conservation', 'Conservation']];
const RYTHMES: [string, string][] = [['ralentir', 'Ralentir'], ['normal', 'Normal'], ['accelerer', 'Accélérer']];
const DEFENSES: [string, string][] = [['conservatrice', 'Conservatrice'], ['normale', 'Normale'], ['agressive', 'Agressive']];
const RUCKS: [string, string][] = [['faible', 'Faible engagement'], ['normal', 'Normal'], ['forte', 'Forte contestation']];
const PENALITES: [string, string][] = [['points', 'Prendre les points'], ['touche', 'Chercher la touche'], ['rapide', 'Jouer rapidement'], ['melee', 'Demander la mêlée']];
const TIMINGS: [string, string][] = [['precoces', 'Précoces'], ['standard', 'Standard'], ['tardifs', 'Tardifs']];
const STRATEGIE_VIDE: StrategieEnLigne = {
  mentalite: 'equilibree', jeu: 'possession', rythme: 'normal', defense: 'normale', rucks: 'normal',
  penaliteCourte: 'points', penaliteLongue: 'touche', bascule60: 'offensive', bascule70: 'tresOffensive',
  remplacements: 'standard',
};
const SIGNAUX: Record<string, string> = {
  'ligue.match.signal.beaucoupPlusOffensif': 'L’adversaire semble jouer beaucoup plus offensivement.',
  'ligue.match.signal.plusOffensif': 'L’adversaire prend un peu plus de risques.',
  'ligue.match.signal.beaucoupPlusDefensif': 'L’adversaire se referme complètement.',
  'ligue.match.signal.plusDefensif': 'L’adversaire recule son point de départ.',
  'ligue.match.signal.acceleration': 'L’adversaire cherche visiblement à accélérer le jeu.',
  'ligue.match.signal.ralentissement': 'L’adversaire ralentit et gère le temps.',
  'ligue.match.signal.defenseAgressive': 'Leur défense monte beaucoup plus vite.',
  'ligue.match.signal.defenseBasse': 'Leur défense recule et attend.',
};

/**
 * Le blason du club RÉEL d'un joueur, par son nom.
 *
 * ⚠️ ON NE STOCKE PAS LE LOGO SUR LA CARTE. Ce serait quarante octets par carte
 * dans l'état d'une ligue — 60 Ko sur une ligue à vingt clubs — pour une valeur
 * qui se déduit du nom du club. La table nom → écusson arrive une seule fois
 * du serveur (`?emblemes=1`, mise en cache un jour), la même requête qui sert
 * déjà au sélecteur d'écusson.
 */
let tableLogos: Map<string, string> | undefined;
function useLogosDeClub(): Map<string, string> {
  const [table, setTable] = useState<Map<string, string>>(() => tableLogos ?? new Map());
  useEffect(() => {
    if (tableLogos) return;
    let actif = true;
    chargerEmblemesCarriere()
      .then(r => {
        tableLogos = new Map(r.groupes.flatMap(g => g.emblemes.map(e => [e.nom, e.logo] as const)));
        if (actif) setTable(tableLogos);
      })
      .catch(() => { /* Sans écussons, les cartes restent lisibles. */ });
    return () => { actif = false; };
  }, []);
  return table;
}

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return <label className="cel-champ"><span>{label}</span>{children}</label>;
}
function Choix({ label, valeur, options, onChange }: { label: string; valeur: string; options: [string, string][]; onChange: (v: string) => void }) {
  return <div className="cel-champ"><span>{label}</span><Selecteur valeur={valeur} onChange={onChange} options={options.map(([valeur, label]) => ({ valeur, label }))} /></div>;
}
function Vide({ icone = 'stade', titre, children }: { icone?: NomIcone; titre: string; children: ReactNode }) {
  return <div className="cel-vide"><Icone nom={icone} taille={34} /><h3>{titre}</h3><p>{children}</p></div>;
}

/**
 * ⚠️ UN JOUEUR ALIGNÉ NE SE VEND PAS, et l'écran doit le dire AVANT le clic.
 * Le serveur refuse le départ d'un titulaire ou d'un remplaçant
 * (`verifierHorsFeuille`) ; ici on retrouve le maillot qu'il porte, pour que le
 * bouton grisé ait une raison lisible plutôt qu'un message d'erreur après coup.
 */
function feuilleDeMatch(club?: VueCarriereEnLigne['clubs'][number]): Map<string, string> {
  const feuille = new Map<string, string>();
  club?.composition?.titulaires.forEach((id, i) => { if (id) feuille.set(id, `titulaire nº ${POSTE_PAR_ID[POSTES_XV_MANAGER[i]]?.numero ?? i + 1}`); });
  club?.composition?.remplacants.forEach((id, i) => { if (id) feuille.set(id, `remplaçant nº ${16 + i}`); });
  return feuille;
}
/**
 * L'écusson d'un club : son vrai blason s'il en a choisi un, sinon ses
 * initiales sur un bouclier — le même repli que `components/Blason.tsx` pour
 * les clubs du jeu qui n'ont pas de logo officiel.
 */
function Ecusson({ nom, logo, grand = false }: { nom: string; logo?: string; grand?: boolean }) {
  const taille = grand ? 72 : 42;
  // ⚠️ PASSER PAR `EcussonClub`, TOUJOURS. Cette fonction rendait un `<img>` nu :
  // l'écusson du club s'affichait donc avec son fond blanc dans l'en-tête et
  // dans le vestiaire, alors qu'il était détouré partout ailleurs. Un même
  // écusson ne peut pas avoir deux rendus selon l'endroit où on le regarde.
  if (logo) return <EcussonClub logo={logo} nom={nom} taille={taille} className={`cel-ecusson-logo${grand ? ' grand' : ''}`} />;
  return <span className={`cel-ecusson${grand ? ' grand' : ''}`} aria-hidden="true"><Icone nom="bouclier" taille={taille} /><b>{nom.split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()}</b></span>;
}

/**
 * ⚠️ 1 353 ÉCUSSONS, DONC UNE RECHERCHE ET UN CHARGEMENT PARESSEUX. La liste
 * arrive du serveur au premier clic (`?emblemes=1`, mise en cache un jour) :
 * la joindre à la vue de la ligue ajouterait 80 Ko à une réponse relue toutes
 * les deux secondes pendant un direct.
 */
/**
 * L'identité d'une compétition : son logo et son trophée.
 *
 * ⚠️ CE SONT LES VRAIS LOGOS ET LES VRAIS TROPHÉES DU JEU. « La Ligue du
 * dimanche » avec l'écusson du Top 14 et le Bouclier de Brennus au bout, c'est
 * ce qui la rend SIENNE — bien plus qu'un nom tapé dans un champ. Les 46
 * trophées d'équipe sont ceux de l'armoire du mode solo ; les 8 distinctions
 * individuelles n'y figurent pas : elles ne se soulèvent pas au bout d'un
 * championnat.
 */
function ChoixCompetition({ logo, tropheeId, onLogo, onTrophee }: {
  logo?: string; tropheeId?: string; onLogo: (v?: string) => void; onTrophee: (v?: string) => void;
}) {
  const [catalogues, setCatalogues] = useState<CataloguesIdentite | null>(null);
  const [ouvert, setOuvert] = useState<'logo' | 'trophee' | null>(null);
  useEffect(() => {
    let actif = true;
    chargerEmblemesCarriere().then(r => { if (actif) setCatalogues(r); }).catch(() => { /* le formulaire reste utilisable */ });
    return () => { actif = false; };
  }, []);
  const trophee = catalogues?.trophees.find(t => t.id === tropheeId);
  const competition = catalogues?.competitions.find(c => c.logo === logo);
  if (!catalogues) return <p className="cel-note">Chargement des logos et des trophées…</p>;
  return <>
    <div className="cel-champ">
      <span>Logo du championnat</span>
      <button type="button" className="cel-choix-embleme" onClick={() => setOuvert('logo')}>
        {logo ? <img className="cel-logo-ligue grand" src={logo} alt="" /> : <span className="cel-ecusson"><Icone nom="bouclier" taille={34} /></span>}
        <span>{competition?.nom ?? 'Choisir un logo de championnat'}</span>
        <Icone nom="fleche-droite" taille={16} />
      </button>
    </div>
    <div className="cel-champ">
      <span>Trophée soulevé</span>
      <button type="button" className="cel-choix-embleme" onClick={() => setOuvert('trophee')}>
        <VignetteTrophee tropheeId={tropheeId} trophees={catalogues.trophees} taille={44} />
        <span>{trophee?.nom ?? 'Choisir un trophée'}</span>
        <Icone nom="fleche-droite" taille={16} />
      </button>
    </div>

    {ouvert === 'logo' && <GrilleChoix titre="Le logo du championnat" sousTitre="La ligue des copains, avec l’écusson du Top 14 — ou celui du championnat de ton choix."
      compte={`${catalogues.competitions.length} logos`} onFermer={() => setOuvert(null)}
      onEffacer={logo ? () => onLogo(undefined) : undefined} libelleEffacer="Aucun logo">
      <div className="cel-emblemes-grille">{catalogues.competitions.map(c =>
        <button key={c.logo} type="button" className={logo === c.logo ? 'actif' : ''} title={c.nom}
          onClick={() => { onLogo(c.logo); setOuvert(null); }}>
          <img src={c.logo} alt="" loading="lazy" decoding="async" /><span>{c.nom}</span>
        </button>)}</div>
    </GrilleChoix>}

    {ouvert === 'trophee' && <ChoixTrophee trophees={catalogues.trophees} valeur={tropheeId}
      onChoisir={v => { onTrophee(v); setOuvert(null); }} onFermer={() => setOuvert(null)} />}
  </>;
}

/** Le cadre commun des sélecteurs : voile, titre, contenu, pied. */
function GrilleChoix({ titre, sousTitre, compte, children, onFermer, onEffacer, libelleEffacer, entete }: {
  titre: string; sousTitre?: string; compte?: string; children: ReactNode; onFermer: () => void;
  onEffacer?: () => void; libelleEffacer?: string; entete?: ReactNode;
}) {
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [onFermer]);
  return <div className="cel-ouverture" role="dialog" aria-label={titre} onClick={e => { if (e.target === e.currentTarget) onFermer(); }}>
    <div className="cel-ouverture-contenu cel-emblemes">
      <div className="eyebrow">{titre}</div>
      {sousTitre && <h2>{sousTitre}</h2>}
      {entete}
      <div className="cel-emblemes-liste">{children}</div>
      <div className="cel-actions">
        <button className="btn primaire" onClick={onFermer}>Fermer</button>
        {onEffacer && <button className="btn fantome" onClick={() => { onEffacer(); onFermer(); }}>{libelleEffacer ?? 'Effacer'}</button>}
        {compte && <small>{compte}</small>}
      </div>
    </div>
  </div>;
}

/**
 * L'image d'un trophée — le VRAI modèle 3D du jeu, rendu en vignette.
 *
 * ⚠️ UN SEUL TROPHÉE CHARGÉ À LA FOIS, ET C'EST UNE CONTRAINTE DE POIDS. Les
 * cinquante modèles de l'armoire pèsent **66,6 Mo** (1,36 Mo en médiane) : une
 * grille qui en afficherait quarante-six ferait télécharger soixante mégaoctets
 * pour choisir une coupe. La grille montre donc des pastilles (le nom et la
 * teinte du trophée, aucun téléchargement), et seul le trophée SÉLECTIONNÉ est
 * rendu en image.
 *
 * `vignetteModele` (`lib/vignettes3d.ts`) fait le rendu hors écran, dans un
 * unique contexte WebGL partagé, et met le résultat en cache — c'est déjà la
 * réponse du projet au même problème dans la Boutique.
 */
function VignetteTrophee({ tropheeId, trophees, taille = 96 }: { tropheeId?: string; trophees: TropheeLigue[]; taille?: number }) {
  const [image, setImage] = useState<string | null>(null);
  const trophee = trophees.find(t => t.id === tropheeId);
  const modele = trophee?.modele;
  useEffect(() => {
    setImage(null);
    if (!modele) return;
    let actif = true;
    void import('../lib/vignettes3d')
      .then(m => m.vignetteModele(modele, trophee?.couleur))
      .then(src => { if (actif) setImage(src); })
      .catch(() => { /* sans vignette, la pastille suffit */ });
    return () => { actif = false; };
  }, [modele, trophee?.couleur]);
  if (image) return <img className="cel-vignette-trophee" src={image} alt="" width={taille} height={taille} style={{ width: taille, height: taille }} />;
  return <span className="cel-vignette-trophee vide" style={{ width: taille, height: taille, ['--teinte' as string]: trophee?.couleur ?? 'var(--or-500)' }}>
    <Icone nom="trophee" taille={Math.round(taille * 0.5)} />
  </span>;
}

function ChoixTrophee({ trophees, valeur, onChoisir, onFermer }: {
  trophees: TropheeLigue[]; valeur?: string; onChoisir: (v?: string) => void; onFermer: () => void;
}) {
  const [survole, setSurvole] = useState<string | undefined>(valeur);
  const trophee = trophees.find(t => t.id === survole);
  return <GrilleChoix titre="Le trophée de la compétition" sousTitre="Ce qu’on soulève au bout de la saison."
    compte={`${trophees.length} trophées`} onFermer={onFermer}
    onEffacer={valeur ? () => onChoisir(undefined) : undefined} libelleEffacer="Trophée de la ligue"
    entete={<div className="cel-apercu-trophee" style={{ ['--teinte' as string]: trophee?.couleur ?? 'var(--or-500)' }}>
      <VignetteTrophee tropheeId={survole} trophees={trophees} taille={116} />
      <div>
        <b>{trophee?.nom ?? 'Aucun trophée choisi'}</b>
        <p>{trophee?.desc ?? 'Choisis-en un dans la liste : son image apparaîtra ici.'}</p>
      </div>
    </div>}>
    <div className="cel-grille-trophees">{trophees.map(t =>
      <button key={t.id} type="button" className={valeur === t.id ? 'actif' : ''}
        style={{ ['--teinte' as string]: t.couleur }}
        onMouseEnter={() => setSurvole(t.id)} onFocus={() => setSurvole(t.id)}
        onClick={() => onChoisir(t.id)}>
        <Icone nom="trophee" taille={22} /><span>{t.nom}</span>
      </button>)}</div>
  </GrilleChoix>;
}

function ChoixEmbleme({ valeur, onChoisir, onFermer }: { valeur?: string; onChoisir: (logo: string | undefined) => void; onFermer: () => void }) {
  const [groupes, setGroupes] = useState<GroupeEmblemes[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  useEffect(() => {
    let actif = true;
    chargerEmblemesCarriere()
      .then(r => { if (actif) setGroupes(r.groupes); })
      .catch(e => { if (actif) setErreur(messageErreur(e)); });
    return () => { actif = false; };
  }, []);
  const filtres = useMemo(() => {
    if (!groupes) return [];
    const q = recherche.trim().toLocaleLowerCase('fr');
    // ⚠️ TOUS les championnats, tout le temps. Une liste tronquée à six
    // laissait 1 000 écussons invisibles à qui ne pensait pas à chercher.
    // Ce qui rend les 1 353 tenables, c'est `content-visibility: auto` sur
    // chaque section et le chargement paresseux des images : le navigateur ne
    // dessine que ce qui approche de l'écran.
    if (!q) return groupes;
    return groupes.map(g => ({ ...g, emblemes: g.emblemes.filter(e => e.nom.toLocaleLowerCase('fr').includes(q)) }))
      .filter(g => g.emblemes.length);
  }, [groupes, recherche]);

  return <div className="cel-ouverture" role="dialog" aria-label="Choisir un écusson" onClick={e => { if (e.target === e.currentTarget) onFermer(); }}>
    <div className="cel-ouverture-contenu cel-emblemes">
      <div className="eyebrow">L’écusson de ton club</div>
      <h2>Prends les couleurs d’un vrai club.</h2>
      <Champ label="Chercher un club"><input autoFocus value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Toulouse, Leinster, Crusaders…" /></Champ>
      {erreur && <p className="cel-note">{erreur}</p>}
      {!groupes && !erreur && <p className="cel-note">Chargement des écussons…</p>}
      <div className="cel-emblemes-liste">
        {filtres.map(g => <section key={g.groupe}>
          <h3>{g.groupe} <small>{g.pays}</small></h3>
          <div className="cel-emblemes-grille">{g.emblemes.map(e =>
            <button key={e.logo} type="button" className={valeur === e.logo ? 'actif' : ''} title={e.nom} onClick={() => { onChoisir(e.logo); onFermer(); }}>
              <EcussonClub logo={e.logo} taille={42} /><span>{e.nom}</span>
            </button>)}</div>
        </section>)}
        {groupes && !filtres.length && <p className="cel-note">Aucun club ne correspond à « {recherche} ».</p>}
      </div>
      <div className="cel-actions">
        <button className="btn primaire" onClick={onFermer}>Fermer</button>
        {valeur && <button className="btn fantome" onClick={() => { onChoisir(undefined); onFermer(); }}>Revenir aux initiales</button>}
        <small>{filtres.reduce((n, g) => n + g.emblemes.length, 0)} écussons dans {filtres.length} championnats.</small>
      </div>
    </div>
  </div>;
}

export function CarriereEnLigne() {
  const setEcran = useGame(s => s.setEcran);
  const [session, setSession] = useState<SessionCarriere | null>(null);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState('');
  const [notification, setNotification] = useState('');
  // ⚠️ UN REFUS DOIT SE VOIR, MÊME À MILLE PIXELS DE LÀ. La bannière vit en
  //    haut de l’écran, alors que les boutons qui échouent sont au milieu
  //    d’une longue page — le terrain de composition fait deux hauteurs
  //    d’écran à lui seul. Sans ce recentrage, « Enregistrer la feuille »
  //    refusée ne donnait RIEN à voir : le joueur cliquait, rien ne bougeait,
  //    et il en concluait que le jeu n’enregistrait pas.
  const refErreur = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (erreur) refErreur.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [erreur]);
  const [occupe, setOccupe] = useState(false);
  const [ligueId, setLigueId] = useState<string | null>(null);
  const [vue, setVue] = useState<VueCarriereEnLigne | null>(null);
  const [onglet, setOnglet] = useState<Onglet>('club');
  const [matchId, setMatchId] = useState<string | null>(null);
  const versionRequete = useRef(0);
  const derniereVue = useRef(vue);
  derniereVue.current = vue;

  const chargerSession = useCallback(async () => {
    setCharge(true); setErreur('');
    try { setSession(await chargerSessionCarriere()); }
    catch (e) { if (!(e instanceof ErreurCarriere && e.statut === 401)) setErreur(messageErreur(e)); else setSession(null); }
    finally { setCharge(false); }
  }, []);
  useEffect(() => { void chargerSession(); }, [chargerSession]);

  // ⚠️ LES RAPPELS SE DÉCIDENT SUR LA DIFFÉRENCE ENTRE DEUX VUES, jamais sur
  // l'état courant : sans ça, chaque sondage — il y en a un toutes les deux
  // secondes pendant un direct — reposterait la même notification. On compare
  // donc ce qui vient d'arriver à ce qu'on avait, et on ne prévient que de ce
  // qui a CHANGÉ.
  const rappels = useRappels(ligueId ?? '');
  const rappelsEnvoyes = useRef(new Set<string>());
  useEffect(() => {
    if (!vue) return;
    const verifier = () => { for (const r of vue.rencontres) {
      const restant = Date.parse(r.ferme) - Date.now();
      if (!r.resultat && !r.match && [r.domicile,r.exterieur].includes(vue.monClubId) && restant > 0 && restant <= 120000 && !rappelsEnvoyes.current.has(r.id)) {
        rappelsEnvoyes.current.add(r.id);
        rappels.prevenir('Coup d’envoi dans deux minutes', 'Ton équipe entre sur le terrain. Tu peux rejoindre le direct.');
      }
    }};
    verifier(); const timer = setInterval(verifier, 1000); return () => clearInterval(timer);
  }, [vue, rappels.prevenir]);
  const prevenirRef = useRef(rappels.prevenir);
  prevenirRef.current = rappels.prevenir;
  const comparerPourRappels = useCallback((avant: VueCarriereEnLigne | null, apres: VueCarriereEnLigne) => {
    if (!avant || avant.id !== apres.id) return;
    const mien = (r: VueRencontre) => r.domicile === apres.monClubId || r.exterieur === apres.monClubId;
    const nom = (id: string) => apres.clubs.find(c => c.id === id)?.nom ?? 'Club';
    for (const r of apres.rencontres.filter(mien)) {
      const vieux = avant.rencontres.find(x => x.id === r.id);
      const adversaire = nom(r.domicile === apres.monClubId ? r.exterieur : r.domicile);
      if (!vieux) continue;
      const etaitOuverte = vieux.ouvre <= avant.rencontres[0]?.ouvre;
      void etaitOuverte;
      if (!vieux.match && r.match && !r.match.termine) {
        prevenirRef.current('Le match a commencé', `${nom(r.domicile)} – ${nom(r.exterieur)}, journée ${r.journee}. Rejoins le direct pour piloter ton équipe.`);
      }
      if (r.match?.decision && r.match.decision.jusqua !== vieux.match?.decision?.jusqua) prevenirRef.current('Décision à prendre', 'Une pénalité : choisis les points, la touche ou le jeu rapide.');
      if (r.match && vieux.match && r.match.essais.domicile + r.match.essais.exterieur > vieux.match.essais.domicile + vieux.match.essais.exterieur) prevenirRef.current('Essai !', `${nom(r.domicile)} ${r.match.score.domicile} – ${r.match.score.exterieur} ${nom(r.exterieur)}`);
      if (!vieux.resultat && r.resultat) {
        const chezMoi = r.domicile === apres.monClubId;
        const pour = chezMoi ? r.resultat.pointsD : r.resultat.pointsE;
        const contre = chezMoi ? r.resultat.pointsE : r.resultat.pointsD;
        prevenirRef.current(pour > contre ? 'Victoire !' : pour === contre ? 'Match nul' : 'Défaite',
          `${pour} – ${contre} contre ${adversaire}, journée ${r.journee}.`);
      }
    }
    // Une nouvelle journée s'ouvre : c'est le rendez-vous à ne pas rater.
    const ouverte = apres.rencontres.find(r => mien(r) && !r.resultat && r.ouvre <= maintenantISO());
    const ouverteAvant = avant.rencontres.find(r => mien(r) && !r.resultat && r.ouvre <= maintenantISO());
    if (ouverte && ouverte.id !== ouverteAvant?.id) {
      prevenirRef.current(`Journée ${ouverte.journee} : à toi de jouer`,
        `${nom(ouverte.domicile)} – ${nom(ouverte.exterieur)}. La fenêtre est ouverte jusqu’au ${dateLongue(ouverte.ferme)}.`);
    }
  }, []);

  // Un seul appel à la fois. Une réponse ancienne ne peut pas annuler une action récente.
  useEffect(() => {
    if (!ligueId) return;
    let actif = true;
    let minuterie: ReturnType<typeof setTimeout>;
    const controleur = new AbortController();
    const actualiser = async () => {
      const version = versionRequete.current;
      try {
        const suivante = await chargerLigueCarriere(ligueId, controleur.signal);
        if (actif && version === versionRequete.current) {
          setVue(avant => {
            if (avant && avant.id === suivante.id && suivante.version < avant.version) return avant;
            comparerPourRappels(avant, suivante);
            return suivante;
          });
        }
      } catch (e) { if (actif) setErreur(messageErreur(e)); }
      if (actif) {
        const direct = derniereVue.current?.rencontres.some(r => r.match && !r.match.termine);
        minuterie = setTimeout(() => { void actualiser(); }, direct ? 2000 : 10000);
      }
    };
    void actualiser();
    return () => { actif = false; controleur.abort(); clearTimeout(minuterie); };
  }, [ligueId, comparerPourRappels]);


  const ouvrir = (suivante: VueCarriereEnLigne) => {
    versionRequete.current++; setVue(suivante); setLigueId(suivante.id); setOnglet('club'); setMatchId(null); setErreur('');
  };
  const agir: Agir = async commande => {
    if (!ligueId || occupe) return;
    setOccupe(true); setErreur(''); versionRequete.current++;
    try {
      const suivante = await commanderCarriere(ligueId, commande, crypto.randomUUID());
      setVue(suivante); return suivante;
    } catch (e) { setErreur(messageErreur(e)); }
    finally { versionRequete.current++; setOccupe(false); }
  };
  const ouvrirLigue = async (id: string) => {
    setOccupe(true); setErreur('');
    try { ouvrir(await chargerLigueCarriere(id)); }
    catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  };
  const retourLigues = () => { setLigueId(null); setVue(null); setMatchId(null); versionRequete.current++; void chargerSession(); };
  const quitterCompte = async () => {
    setOccupe(true);
    try { await deconnecterCarriere(); setSession(null); setVue(null); setLigueId(null); }
    catch (e) { setErreur(messageErreur(e)); }
    finally { setOccupe(false); }
  };
  const club = vue?.clubs.find(c => c.id === vue.monClubId);
  const rencontre = vue?.rencontres.find(r => r.id === matchId);

  return <section className="cel" aria-label="Carrière en ligne">
    <div className="cel-fil">
      <button className="btn fantome" onClick={() => vue ? retourLigues() : setEcran('accueil')}><Icone nom="fleche-droite" className="cel-retour" taille={15} />{vue ? 'Mes ligues' : 'Accueil'}</button>
      <span><i className={`cel-presence${erreur ? ' interrompue' : ''}`} /> Carrière en ligne</span>
      {session && <button className="cel-compte" onClick={() => { void quitterCompte(); }} disabled={occupe} title="Se déconnecter"><Icone nom="profil" taille={16} />{session.compte.pseudo}<Icone nom="porte" taille={15} /></button>}
    </div>
    {erreur && <div className="cel-erreur" role="alert" ref={refErreur}><Icone nom="alerte" taille={22} /><p>{erreur}</p><button className="btn fantome" disabled={occupe} onClick={() => { if (ligueId) void ouvrirLigue(ligueId); else void chargerSession(); }}>Réessayer</button></div>}
    {notification && <div className="cel-notification" role="status">{notification}<button aria-label="Fermer la notification" onClick={() => setNotification('')}><Icone nom="croix" taille={16} /></button></div>}
    {charge ? <Vide icone="chrono" titre="Ouverture du vestiaire">Nous retrouvons ton compte et tes ligues.</Vide>
      : !session ? <Connexion occupe={occupe} onConnexion={async (action, identifiant, motDePasse, pseudo) => {
        setOccupe(true); setErreur('');
        try { await identifierCarriere(action, identifiant, motDePasse, pseudo); await chargerSession(); }
        catch (e) { setErreur(messageErreur(e)); }
        finally { setOccupe(false); }
      }} />
      : !vue ? <Portail session={session} occupe={occupe} ouvrirLigue={ouvrirLigue} onCreer={async (nom, clubNom, rythme, max, identite) => {
        setOccupe(true); setErreur(''); try { ouvrir(await creerLigueCarriere(nom, clubNom, rythme, max, identite)); } catch (e) { setErreur(messageErreur(e)); } finally { setOccupe(false); }
      }} onRejoindre={async (code, clubNom, embleme) => { setOccupe(true); setErreur(''); try { ouvrir(await rejoindreLigueCarriere(code, clubNom, embleme)); oublierInvitation(); } catch (e) { setErreur(messageErreur(e)); } finally { setOccupe(false); } }} />
      : <>
        <header className="cel-entete"><Ecusson nom={club?.nom ?? vue.nom} logo={club?.embleme} grand /><div><div className="eyebrow cel-nom-ligue">{vue.logo && <img className="cel-logo-ligue" src={vue.logo} alt="" />}{vue.nom} <span> / Saison {vue.saison}</span></div><h1>{club?.nom}</h1><p>{vue.clubs.length} clubs · {vue.rythme} match{vue.rythme > 1 ? 's' : ''} par semaine · {vue.phase === 'salon' ? 'Inscriptions ouvertes' : vue.phase === 'saison' ? 'Saison en cours' : 'Intersaison'}</p></div><div className="cel-portefeuille"><PieceOvas taille={26} /><strong>{montant(club?.ovas ?? 0)}</strong><span>Ovas de cette ligue</span></div></header>
        <nav className="cel-onglets" aria-label="Club en ligne">{ONGLETS.map(o => <button key={o.id} className={onglet === o.id && !matchId ? 'actif' : ''} aria-current={onglet === o.id && !matchId ? 'page' : undefined} onClick={() => { setOnglet(o.id); setMatchId(null); }}><Icone nom={o.icone} taille={18} />{o.label}</button>)}</nav>
        {rencontre ? <Direct vue={vue} rencontre={rencontre} agir={agir} occupe={occupe} fermer={() => setMatchId(null)} /> : <>
          {onglet === 'club' && <Bureau vue={vue} proprietaire={session.compte.id === vue.createurId} agir={agir} occupe={occupe} suivre={setMatchId} notifier={setNotification} />}
          {onglet === 'calendrier' && <Calendrier vue={vue} agir={agir} occupe={occupe} suivre={setMatchId} />}
          {onglet === 'composition' && <Composition key={vue.id} vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'effectif' && <Effectif vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'collection' && <CollectionLigue vue={vue} />}
          {onglet === 'packs' && <Packs vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'marche' && <Marche vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'competitions' && <Competitions vue={vue} agir={agir} occupe={occupe} proprietaire={session.compte.id === vue.createurId} suivre={setMatchId} />}
          {onglet === 'histoire' && <Histoire vue={vue} />}
        </>}
      </>}
  </section>;
}

function Connexion({ onConnexion, occupe }: { occupe: boolean; onConnexion: (action: 'connexion' | 'inscription', identifiant: string, motDePasse: string, pseudo: string) => Promise<void> }) {
  // ⚠️ QUELQU’UN QUI ARRIVE PAR UN LIEN N’A PRESQUE JAMAIS DE COMPTE. On lui
  //    ouvre donc « Créer mon compte », et on lui dit pourquoi il est là :
  //    sans ce mot, un formulaire de connexion nu après avoir cliqué sur une
  //    invitation ressemble à une erreur d’aiguillage.
  const invitation = invitationEnAttente();
  const [inscription, setInscription] = useState(Boolean(invitation));
  const [identifiant, setIdentifiant] = useState(''); const [pseudo, setPseudo] = useState(''); const [motDePasse, setMotDePasse] = useState('');
  const soumettre = (e: FormEvent) => { e.preventDefault(); void onConnexion(inscription ? 'inscription' : 'connexion', identifiant, motDePasse, pseudo); };
  return <div className="cel-entree"><div className="cel-promesse"><div className="eyebrow">Une ligue. Vos clubs. Votre histoire.</div><h1>Le rugby se vit<br /><span>entre amis.</span></h1><p>Trente joueurs Bronze, un maillot à défendre et des mois pour bâtir une équipe qui compte. Le prochain grand rendez-vous, c’est le vôtre.</p><div className="cel-billet"><b>SAISON 01</b><span>30 joueurs au départ</span><strong>35 <small>GEN</small></strong><p>Championnats privés · Marché entre amis · Matchs en direct</p></div></div><form className="cel-panneau cel-auth" onSubmit={soumettre}>{invitation && <p className="cel-invite"><Icone nom="cadeau" taille={18} />Tu es invité à rejoindre une ligue. Crée ton compte, et le vestiaire s’ouvre juste après.</p>}<div className="eyebrow">Ton vestiaire t’attend</div><h2>{inscription ? 'Créer mon compte' : 'Retrouver mes ligues'}</h2><p>Un compte pour retrouver tes clubs sur tous tes appareils.</p><Champ label="Identifiant"><input autoComplete="username" required minLength={3} maxLength={60} value={identifiant} onChange={e => setIdentifiant(e.target.value)} placeholder="ton-identifiant" /></Champ>{inscription && <Champ label="Nom du manager"><input required minLength={2} maxLength={32} value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Ton pseudo" /></Champ>}<Champ label="Mot de passe"><input type="password" autoComplete={inscription ? 'new-password' : 'current-password'} required minLength={inscription ? 10 : 1} maxLength={128} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} placeholder={inscription ? '10 caractères minimum' : 'Ton mot de passe'} /></Champ><button className="btn primaire" disabled={occupe}>{occupe ? 'Connexion en cours…' : inscription ? 'Créer mon compte' : 'Se connecter'}<Icone nom="fleche-droite" taille={17} /></button><button className="btn fantome" type="button" onClick={() => setInscription(!inscription)}>{inscription ? 'J’ai déjà un compte' : 'Créer un compte'}</button></form></div>;
}

function Portail({ session, occupe, ouvrirLigue, onCreer, onRejoindre }: { session: SessionCarriere; occupe: boolean; ouvrirLigue: (id: string) => Promise<void>; onCreer: (nom: string, club: string, rythme: number, max: number, identite?: IdentiteLigue) => Promise<void>; onRejoindre: (code: string, club: string, embleme?: string) => Promise<void> }) {
  // ⚠️ ARRIVER PAR UN LIEN, C’EST DÉJÀ AVOIR RÉPONDU À LA QUESTION. Sans ça,
  //    l’invité tombe sur « Créer une ligue » avec un formulaire vide, et le
  //    code qu’on vient de lui donner est à ressaisir alors qu’on l’a en main.
  const invitation = invitationEnAttente();
  const [mode, setMode] = useState<'creer' | 'rejoindre'>(invitation ? 'rejoindre' : 'creer'); const [nom, setNom] = useState(''); const [club, setClub] = useState(''); const [code, setCode] = useState(invitation ?? ''); const [rythme, setRythme] = useState('1'); const [max, setMax] = useState('8');
  const [embleme, setEmbleme] = useState<string | undefined>(); const [choixOuvert, setChoixOuvert] = useState(false);
  const [logo, setLogo] = useState<string | undefined>(); const [tropheeId, setTropheeId] = useState<string | undefined>(); const [playoffs, setPlayoffs] = useState(false);
  const [dotation, setDotation] = useState('1000');
  return <><header className="cel-titre"><div className="eyebrow">Bienvenue au club, {session.compte.pseudo}</div><h1>Vos rendez-vous rugby.</h1><p>Chaque ligue a ses clubs, ses cartes, ses Ovas et son histoire.</p></header><div className="cel-portail"><div><h2>Mes ligues <small>{session.ligues.length}</small></h2>{session.ligues.length ? <div className="cel-ligues">{session.ligues.map(l => <button className="cel-ligue" key={l.id} disabled={occupe} onClick={() => { void ouvrirLigue(l.id); }}><Ecusson nom={l.clubNom} logo={l.clubEmbleme} /><span><em className="cel-ligue-nom">{l.logo && <img className="cel-logo-ligue cel-logo-ligue-liste" src={l.logo} alt="" />}{l.nom}</em><b>{l.clubNom}</b><small>{l.etat === 'salon' ? 'En préparation' : l.etat === 'saison' ? 'Saison en cours' : 'Intersaison'} · {montant(l.ovas)} Ovas</small></span><Icone nom="fleche-droite" /></button>)}</div> : <Vide titre="Tout commence avec votre ligue">Invite tes amis ou rejoins leur vestiaire avec le code qu’ils t’ont partagé.</Vide>}</div><form className="cel-panneau" onSubmit={e => { e.preventDefault(); if (mode === 'creer') void onCreer(nom, club, Number(rythme), Number(max), { embleme, logo, tropheeId, playoffs, dotationOvas: Number(dotation) }); else void onRejoindre(code, club, embleme); }}><div className="cel-bascules"><button type="button" className={mode === 'creer' ? 'actif' : ''} onClick={() => setMode('creer')}>Créer une ligue</button><button type="button" className={mode === 'rejoindre' ? 'actif' : ''} onClick={() => setMode('rejoindre')}>Rejoindre des amis</button></div><h2>{mode === 'creer' ? 'Le coup d’envoi vous appartient.' : 'Une place vous attend.'}</h2>{mode === 'creer' ? <Champ label="Nom de la ligue"><input required minLength={3} maxLength={50} placeholder="La Ligue du dimanche" value={nom} onChange={e => setNom(e.target.value)} /></Champ> : <Champ label="Code d’invitation"><input required autoCapitalize="characters" maxLength={20} placeholder="Code reçu de ton ami" value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></Champ>}<Champ label="Nom de ton club"><input required minLength={3} maxLength={40} placeholder="Les XV du quartier" value={club} onChange={e => setClub(e.target.value)} /></Champ><div className="cel-champ"><span>Écusson</span><button type="button" className="cel-choix-embleme" onClick={() => setChoixOuvert(true)}><Ecusson nom={club || 'Club'} logo={embleme} /><span>{embleme ? 'Changer d’écusson' : 'Choisir un vrai écusson de club'}</span><Icone nom="fleche-droite" taille={16} /></button></div>{choixOuvert && <ChoixEmbleme valeur={embleme} onChoisir={setEmbleme} onFermer={() => setChoixOuvert(false)} />}{mode === 'creer' && <><div className="cel-deux"><Champ label="Matchs par semaine"><input type="number" min={1} max={7} required value={rythme} onChange={e => setRythme(e.target.value)} /></Champ><Champ label="Nombre de clubs"><input type="number" min={2} max={64} required value={max} onChange={e => setMax(e.target.value)} /></Champ></div><Champ label="Ovas au départ"><input type="number" min={0} max={100000} required value={dotation} onChange={e => setDotation(e.target.value)} /></Champ><ChoixCompetition logo={logo} tropheeId={tropheeId} onLogo={setLogo} onTrophee={setTropheeId} /><label className="cel-bascule"><input type="checkbox" checked={playoffs} onChange={e => setPlayoffs(e.target.checked)} /><span><b>Phase finale</b>Les qualifiés, dont le nombre dépend du nombre de clubs, se disputent le titre en demi-finales puis en finale. Le classement décide de l’argent, la finale décide du trophée.</span></label></>}<p className="cel-note">Chaque club reçoit 30 joueurs Bronze autour de 35 GEN. Les matchs se jouent aussi pendant vos absences.</p><button className="btn primaire" disabled={occupe}>{occupe ? 'Préparation…' : mode === 'creer' ? 'Créer ma ligue privée' : 'Rejoindre la ligue'}<Icone nom="fleche-droite" taille={18} /></button></form></div></>;
}

// ---------------------------------------------------------------------------
// INVITER SES AMIS
// ---------------------------------------------------------------------------
// ⚠️ TROIS BOUTONS PLUTÔT QU'UN, PARCE QU'ON N'INVITE PAS PARTOUT PAREIL. Le
// lien est ce qu'on colle dans une boucle de messages — l'ami clique et arrive
// directement sur l'inscription de la ligue. Le code reste là pour ce qui se
// dicte au téléphone ou se tape à côté de soi. Et sur un téléphone, `partager`
// ouvre la feuille du système : c'est le chemin le plus court vers WhatsApp.
//
// ⚠️ `navigator.clipboard` N'EXISTE PAS PARTOUT : il demande un contexte
// sécurisé, donc rien en http simple, et Safari le refuse hors geste direct.
// Chaque bouton a donc un repli qui AFFICHE la valeur — l'utilisateur la
// sélectionne à la main plutôt que de se demander pourquoi rien ne se passe.
function Invitation({ code, notifier }: { code: string; notifier: (message: string) => void }) {
  const lien = lienInvitation(code);
  const partageable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const copier = async (valeur: string, succes: string, repli: string) => {
    try { await navigator.clipboard.writeText(valeur); notifier(succes); }
    catch { notifier(repli); }
  };
  return <div className="cel-invitation">
    <span>Invite tes amis</span>
    <b>{code}</b>
    <em>{lien}</em>
    <div className="cel-invitation-actions">
      <button type="button" className="btn primaire" onClick={() => { void copier(lien, 'Lien d’invitation copié. Colle-le dans votre groupe.', lien); }}>
        <Icone nom="lien" taille={16} />Copier le lien
      </button>
      <button type="button" className="btn fantome" onClick={() => { void copier(code, 'Code d’invitation copié.', `Code d’invitation : ${code}`); }}>
        <Icone nom="dossier" taille={16} />Copier le code
      </button>
      {partageable && <button type="button" className="btn fantome" onClick={() => {
        // Un partage annulé n'est pas une erreur : l'utilisateur a fermé la feuille.
        void navigator.share({ title: 'Destiny Rugby', text: 'Rejoins ma ligue privée sur Destiny Rugby.', url: lien }).catch(() => {});
      }}>
        <Icone nom="partage" taille={16} />Partager
      </button>}
    </div>
  </div>;
}

function Bureau({ vue, proprietaire, agir, occupe, suivre, notifier }: { vue: VueCarriereEnLigne; proprietaire: boolean; agir: Agir; occupe: boolean; suivre: (id: string) => void; notifier: (message: string) => void }) {
  const [ficheClub, setFicheClub] = useState<string | null>(null);
  const monClub = vue.clubs.find(c => c.id === vue.monClubId);
  const mesCartes = vue.cartes.filter(c => c.proprietaire === vue.monClubId);
  const prochaine = vue.rencontres.find(r => !r.resultat && (r.domicile === vue.monClubId || r.exterieur === vue.monClubId));
  const moyenne = mesCartes.length ? Math.round(mesCartes.reduce((s, c) => s + c.note, 0) / mesCartes.length) : 0;
  return <><div className="cel-grille-bureau"><div className="cel-panneau cel-rendezvous"><div className="eyebrow">{vue.phase === 'salon' ? 'Avant le premier coup de sifflet' : 'Le prochain rendez-vous'}</div>{vue.phase === 'salon' ? <><h2>Rassemblez votre XV de clubs.</h2><p>Le vestiaire est ouvert. Partage le code, compose ton équipe et lance la saison quand tes amis sont là.</p><Invitation code={vue.code} notifier={notifier} /><div className="cel-actions">{proprietaire && <button className="btn primaire" disabled={occupe || vue.clubs.length < 2} onClick={() => { void agir({ type: 'demarrerSaison' }); }}>Lancer la saison</button>}<small>{vue.clubs.length} / {vue.maxClubs} clubs inscrits{vue.clubs.length < 2 ? ' · Au moins 2 pour démarrer' : ''}</small></div></> : prochaine ? <Rencontre vue={vue} rencontre={prochaine} agir={agir} occupe={occupe} suivre={suivre} grande /> : <><h2>La saison a livré son verdict.</h2><p>Retrouve les trophées dans l’histoire de la ligue.</p>{proprietaire && vue.phase === 'intersaison' && <button className="btn primaire" disabled={occupe} onClick={() => { void agir({ type: 'demarrerSaison' }); }}>Démarrer la saison suivante</button>}</>}</div><div className="cel-panneau cel-vestiaire"><h2>Ton vestiaire</h2><div className="cel-chiffres"><div><b>{moyenne}</b><span>GEN moyen</span></div><div><b>{mesCartes.length}</b><span>joueurs</span></div><div><b>{mesCartes.filter(c => c.blesseJusqua && c.blesseJusqua > maintenantISO()).length}</b><span>blessés</span></div></div><div className="cel-raretés">{Object.entries(RARETES).map(([id, label]) => <span key={id} className={`cel-rarete ${id}`}><i />{label}<b>{mesCartes.filter(c => c.rarete === id).length}</b></span>)}</div><div className="cel-identite-club"><Ecusson nom={monClub?.nom ?? ''} logo={monClub?.embleme} /><span><b>{monClub?.nom}</b><small>Écusson choisi à l’inscription — il ne change plus.</small></span></div><p className="cel-note">Fais grandir ton club grâce aux matchs, aux objectifs et au marché de la ligue.</p></div></div><div className="cel-grille-bureau"><div className="cel-panneau"><h2>Le championnat</h2><Classement vue={vue} onClub={setFicheClub} />{ficheClub && <FicheClubEnLigne vue={vue} clubId={ficheClub} onFermer={() => setFicheClub(null)} />}</div><div className="cel-panneau"><div className="cel-titre-ligne"><h2>Objectifs de la période</h2><Icone nom="cible" /></div>{vue.objectifs.length ? vue.objectifs.map(o => <div className="cel-objectif" key={o.id}><div><b>{o.libelle}</b><small>Jusqu’au {date(o.fin)} · {Math.min(o.progression, o.cible)} / {o.cible}</small></div><span>+{montant(o.recompense)} Ovas</span><progress max={o.cible} value={Math.min(o.progression, o.cible)} /><button className="btn fantome" disabled={occupe || o.reclame || o.progression < o.cible} onClick={() => { void agir({ type: 'reclamerObjectif', objectifId: o.id }); }}>{o.reclame ? 'Récompense reçue' : 'Récupérer'}</button></div>) : <p className="cel-note">Les premiers objectifs arrivent au lancement de la saison.</p>}</div></div></>;
}

/**
 * Les cinq derniers résultats d'un club, du plus ancien au plus récent.
 * ⚠️ Lu dans les RENCONTRES, pas dans une colonne du classement : le serveur
 * n'envoie qu'un cumul, et une forme reconstruite à partir d'un cumul serait
 * une invention.
 */
function formeDuClub(vue: VueCarriereEnLigne, clubId: string): ('V' | 'N' | 'D')[] {
  return vue.rencontres
    .filter(r => r.resultat && (r.domicile === clubId || r.exterieur === clubId))
    .slice(-5)
    .map(r => {
      const chezMoi = r.domicile === clubId;
      const pour = chezMoi ? r.resultat!.pointsD : r.resultat!.pointsE;
      const contre = chezMoi ? r.resultat!.pointsE : r.resultat!.pointsD;
      return pour > contre ? 'V' : pour === contre ? 'N' : 'D';
    });
}

/**
 * ⚠️ LE CLASSEMENT EST LA PAGE QU'ON REGARDE LE PLUS, ET C'ÉTAIT UN TABLEUR.
 * Huit colonnes de chiffres sans un seul repère visuel : on ne reconnaissait
 * pas les clubs de ses potes, on lisait les noms un par un. L'écusson, la forme
 * et l'accès à l'effectif adverse coûtent trois colonnes et changent tout —
 * une ligue, ce sont des gens, pas des lignes.
 */
function Classement({ vue, onClub }: { vue: VueCarriereEnLigne; onClub?: (clubId: string) => void }) {
  const logos = useLogosDeClub();
  if (!vue.classement.length) return <p className="cel-note">Le classement sera établi au début de la saison.</p>;
  const joue = vue.classement.some(l => l.joues > 0);
  return <div className="cel-table-scroll"><table className="cel-table cel-classement">
    <thead><tr>
      <th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th>
      <th title="Points marqués">P.</th><th title="Points encaissés">C.</th>
      <th>Diff.</th><th title="Points de bonus">Bon.</th>
      {joue && <th>Forme</th>}<th>Pts</th>
    </tr></thead>
    <tbody>{vue.classement.map((l, i) => {
      const club = vue.clubs.find(c => c.id === l.clubId);
      const forme = joue ? formeDuClub(vue, l.clubId) : [];
      return <tr key={l.clubId} className={l.clubId === vue.monClubId ? 'moi' : ''}>
        <td>{i + 1}</td>
        <th>
          <button className="cel-club-lien" onClick={() => onClub?.(l.clubId)} disabled={!onClub}>
            {club?.embleme ? <EcussonClub logo={club.embleme} taille={22} /> : <Ecusson nom={l.nom} />}
            <span>{l.nom}<small>{club?.pseudo}</small></span>
          </button>
        </th>
        <td>{l.joues}</td><td>{l.gagnes}</td><td>{l.nuls}</td><td>{l.perdus}</td>
        <td>{l.pour}</td><td>{l.contre}</td>
        <td>{l.difference > 0 ? '+' : ''}{l.difference}</td>
        <td>{l.bonus}</td>
        {joue && <td><span className="cel-forme">{forme.length
          ? forme.map((f, n) => <i key={n} className={f}>{f}</i>)
          : <em>—</em>}</span></td>}
        <td><b>{l.points}</b></td>
      </tr>;
    })}</tbody>
  </table>
    {onClub && <p className="cel-note">Clique sur un club pour voir son effectif, son écusson et son palmarès.</p>}
    {logos.size === 0 && null}
  </div>;
}

/**
 * La fiche d'un club de la ligue — le sien ou celui d'un pote.
 *
 * ⚠️ AUCUN APPEL SUPPLÉMENTAIRE : `vueCarriere` envoie déjà toutes les cartes
 * possédées de la ligue, parce que le marché en a besoin. Voir l'effectif d'un
 * adversaire ne demande donc rien au serveur — et surtout, ça ne montre que ce
 * que le serveur a DÉJÀ jugé public : ni sa composition, ni ses consignes.
 */
function FicheClubEnLigne({ vue, clubId, onFermer }: { vue: VueCarriereEnLigne; clubId: string; onFermer: () => void }) {
  const club = vue.clubs.find(c => c.id === clubId);
  const logos = useLogosDeClub();
  const cartes = useMemo(() => vue.cartes.filter(c => c.proprietaire === clubId).sort((a, b) => b.note - a.note), [vue.cartes, clubId]);
  const ligne = vue.classement.find(l => l.clubId === clubId);
  const rang = vue.classement.findIndex(l => l.clubId === clubId) + 1;
  const moyenne = cartes.length ? Math.round(cartes.reduce((s, c) => s + c.note, 0) / cartes.length) : 0;
  const xv = [...cartes].slice(0, 15);
  const moyenneXV = xv.length ? Math.round(xv.reduce((s, c) => s + c.note, 0) / xv.length) : 0;
  const titres = vue.histoire.filter(h => h.vainqueur === clubId);
  const rencontres = vue.rencontres.filter(r => r.resultat && (r.domicile === clubId || r.exterieur === clubId)).slice(-6).reverse();
  if (!club) return null;

  return <div className="cel-ouverture" role="dialog" aria-label={`Effectif de ${club.nom}`} onClick={e => { if (e.target === e.currentTarget) onFermer(); }}>
    <div className="cel-ouverture-contenu cel-fiche-club">
      <header className="cel-fiche-tete">
        {club.embleme ? <EcussonClub logo={club.embleme} taille={64} /> : <Ecusson nom={club.nom} grand />}
        <div>
          <div className="eyebrow">{club.pseudo}{rang > 0 ? ` · ${rang}ᵉ du championnat` : ''}</div>
          <h2>{club.nom}</h2>
          <p>{cartes.length} joueurs · {moyenne} GEN moyen · XV à {moyenneXV}{titres.length ? ` · ${titres.length} trophée${titres.length > 1 ? 's' : ''}` : ''}</p>
        </div>
        <button className="btn fantome" onClick={onFermer}><Icone nom="croix" taille={15} /> Fermer</button>
      </header>

      {ligne && ligne.joues > 0 && <div className="cel-chiffres cel-fiche-chiffres">
        <div><b>{ligne.points}</b><span>points</span></div>
        <div><b>{ligne.gagnes}</b><span>victoires</span></div>
        <div><b>{ligne.pour}</b><span>marqués</span></div>
        <div><b>{ligne.contre}</b><span>encaissés</span></div>
      </div>}

      {rencontres.length > 0 && <><h3 className="cel-sous-titre">Derniers résultats</h3>
        <div className="cel-fiche-resultats">{rencontres.map(r => {
          const chezMoi = r.domicile === clubId;
          const pour = chezMoi ? r.resultat!.pointsD : r.resultat!.pointsE;
          const contre = chezMoi ? r.resultat!.pointsE : r.resultat!.pointsD;
          return <span key={r.id} className={pour > contre ? 'V' : pour === contre ? 'N' : 'D'}>
            <small>{chezMoi ? 'reçoit' : 'à'} {nomClub(vue, chezMoi ? r.exterieur : r.domicile)}</small>
            <b>{pour} – {contre}</b>
          </span>;
        })}</div></>}

      {titres.length > 0 && <><h3 className="cel-sous-titre">Palmarès</h3>
        <div className="cel-fiche-titres">{titres.map((h, i) => <span key={i}><Icone nom="trophee" taille={16} />{h.trophee} <small>saison {h.saison}</small></span>)}</div></>}

      <h3 className="cel-sous-titre">L’effectif</h3>
      <div className="cel-grille-cartes">{cartes.map(c => <CarteJoueurEnLigne key={c.id} carte={c} logoClub={logos.get(c.clubReel)} />)}</div>
    </div>
  </div>;
}

function Rencontre({ vue, rencontre: r, occupe, suivre, grande = false }: { vue: VueCarriereEnLigne; rencontre: VueRencontre; agir: Agir; occupe: boolean; suivre: (id: string) => void; grande?: boolean }) {
  const moi = r.domicile === vue.monClubId || r.exterieur === vue.monClubId;
  const ouverte = Date.parse(r.ferme) - Date.now() <= 120_000;
  return <article className={`cel-rencontre${grande ? ' grande' : ''}`}><div className="cel-rencontre-date">Journée {r.journee} · {dateHeure(r.ferme)}{r.match && !r.match.termine && <b className="cel-direct-label"> EN DIRECT · {r.match.minute}′</b>}</div><div className="cel-affiche"><b>{nomClub(vue, r.domicile)}</b><strong>{r.resultat ? `${r.resultat.pointsD} – ${r.resultat.pointsE}` : r.match ? `${r.match.score.domicile} – ${r.match.score.exterieur}` : 'VS'}</strong><b>{nomClub(vue, r.exterieur)}</b></div>{r.match ? <button className="btn fantome" onClick={() => suivre(r.id)}>{r.match.termine ? 'Voir le match' : 'Rejoindre le direct'}<Icone nom="fleche-droite" taille={15} /></button> : !r.resultat && moi ? <button className="btn primaire" disabled={occupe || !ouverte} onClick={() => suivre(r.id)}>{ouverte ? 'Rejoindre le direct' : 'Accès 2 min avant'}</button> : null}</article>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE DIRECT — « je prends les points ou je vais en touche ? »
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ C'EST LA RAISON D'ÊTRE DU MODE. Regarder son match doit avoir un intérêt,
// donc le manager doit pouvoir en changer le cours : ses consignes atteignent
// vraiment le moteur, ses remplacements sont joués, et sur une pénalité c'est
// LUI qui tranche pendant que le chrono s'arrête. Ce que l'écran ne fait
// jamais, en revanche, c'est décider à la place du serveur : chaque geste part
// en commande et le match revient recalculé.

function Direct({ vue, rencontre: r, agir, occupe, fermer }: { vue: VueCarriereEnLigne; rencontre: VueRencontre; agir: Agir; occupe: boolean; fermer: () => void }) {
  const m = r.match;
  const [sortant, setSortant] = useState('');
  const [ongletDirect, setOngletDirect] = useState<'fil' | 'consignes' | 'banc' | 'stats'>('fil');
  const matchId = r.id;
  const enCours = Boolean(m && !m.termine && m.monCote);

  // ⚠️ LA PRÉSENCE EST DÉCLARÉE, PAS DEVINÉE. Le serveur ne propose une
  // décision qu'à un manager dont il a des nouvelles depuis moins de 45 s —
  // sinon un match lancé puis abandonné resterait figé sur une pénalité que
  // personne ne tranchera jamais.
  useEffect(() => {
    if (!enCours) return;
    const battement = setInterval(() => { void agir({ type: 'match', matchId, action: { type: 'presence' } }); }, 12_000);
    void agir({ type: 'match', matchId, action: { type: 'presence' } });
    return () => clearInterval(battement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, enCours]);

  if (!m) return <><button className="btn fantome" onClick={fermer}>Fermer</button><Vide icone="chrono" titre="Les équipes entrent sur le terrain">Coup d’envoi automatique le {dateHeure(r.ferme)}. Le direct apparaîtra ici.</Vide></>;
  const strategie = m.maStrategie ?? STRATEGIE_VIDE;
  const changer = <K extends keyof StrategieEnLigne>(cle: K, valeur: string) => {
    void agir({ type: 'match', matchId, action: { type: 'strategie', strategie: { ...strategie, [cle]: valeur } as StrategieEnLigne } });
  };
  const mien = m.monCote === 'domicile' ? 'domicile' : 'exterieur';
  const restants = 8 - m.remplacementsFaits;

  return <div className="cel-direct">
    {m.terrain && <svg className="cel-terrain-direct" viewBox="0 0 122 70" role="img" aria-label="Positions réelles des joueurs et du ballon"><rect width="122" height="70" fill="#246a45" />{[11,33,51,61,71,89,111].map(x => <line key={x} x1={x} x2={x} y1={0} y2={70} stroke="#ffffff99" strokeWidth={.3} />)}{m.terrain.pions.map(p => <g key={p.id} style={{transform: `translate(${p.x}px, ${p.y}px)`,transition:'transform 2s linear'}}><title>{p.nom}</title><circle r={1.5} fill={p.cote==='A'?'#56c8fa':'#fd766c'} stroke="white" strokeWidth={.2}/><text textAnchor="middle" dy=".6" fontSize="1.8" fill="#102032">{p.numero}</text></g>)}<ellipse cx={m.terrain.ballon.x} cy={m.terrain.ballon.y} rx={1} ry={.6} fill="white" stroke="#312d20" strokeWidth={.2}/></svg>}
    <div className="cel-tableau-bord">
      <button className="btn fantome cel-quitter" onClick={fermer}><Icone nom="croix" taille={15} /> Fermer</button>
      <div className="cel-score-direct">
        <div className={`cel-camp${m.monCote === 'domicile' ? ' moi' : ''}`}><Ecusson nom={nomClub(vue, r.domicile)} logo={vue.clubs.find(c => c.id === r.domicile)?.embleme} /><b>{nomClub(vue, r.domicile)}</b><small>{m.essais.domicile} essai{m.essais.domicile > 1 ? 's' : ''}</small></div>
        <div className="cel-chrono"><strong>{m.score.domicile} <em>–</em> {m.score.exterieur}</strong><span className={m.termine ? '' : 'bat'}>{m.termine ? 'TERMINÉ' : `${m.minute}′`}</span></div>
        <div className={`cel-camp${m.monCote === 'exterieur' ? ' moi' : ''}`}><Ecusson nom={nomClub(vue, r.exterieur)} logo={vue.clubs.find(c => c.id === r.exterieur)?.embleme} /><b>{nomClub(vue, r.exterieur)}</b><small>{m.essais.exterieur} essai{m.essais.exterieur > 1 ? 's' : ''}</small></div>
      </div>
      <div className="cel-jauge-possession" title="Possession"><i style={{ width: `${m.stats.domicile.possession}%` }} /><span>{m.stats.domicile.possession}% possession {m.stats.exterieur.possession}%</span></div>
      {m.signalAdverse && SIGNAUX[m.signalAdverse] && <p className="cel-signal"><Icone nom="oeil" taille={17} />{SIGNAUX[m.signalAdverse]}</p>}
    </div>

    {m.decision && <div className="cel-decision" role="alertdialog" aria-label="Décision de pénalité">
      <div className="eyebrow">{m.decision.horloge >= 1 ? `${Math.floor(m.decision.horloge)}ᵉ minute` : 'Pénalité'} · {m.score.domicile} – {m.score.exterieur}</div>
      <h2>Pénalité à {m.decision.distance} mètres.</h2>
      <p>{m.decision.buteur} au pied. Le moteur lui donne <b>{m.decision.probabilite} %</b> de réussite depuis cette position.</p>
      <div className="cel-decision-choix">
        <button className="btn primaire" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'points' } }); }}><Icone nom="cible" taille={19} />Prendre les 3 points</button>
        <button className="btn" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'touche' } }); }}><Icone nom="drapeau" taille={19} />Chercher la touche</button>
        <button className="btn" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'rapide' } }); }}><Icone nom="eclair" taille={19} />Jouer vite</button>
        <button className="btn" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'melee' } }); }}><Icone nom="pousse" taille={19} />Mêlée</button>
      </div>
      <small>Sans réponse, ton adjoint tranchera selon tes consignes enregistrées.</small>
    </div>}

    <nav className="cel-onglets secondaires">{([['fil', 'Le fil'], ['consignes', 'Consignes'], ['banc', 'Le banc'], ['stats', 'Statistiques']] as const).map(([id, label]) =>
      <button key={id} className={ongletDirect === id ? 'actif' : ''} onClick={() => setOngletDirect(id)}>{label}</button>)}</nav>

    {ongletDirect === 'fil' && <div className="cel-panneau cel-fil-match">{m.fil.length ? [...m.fil].reverse().map((l, i) => <p key={`${l.minute}-${i}`} className={`cel-ligne-fil ${l.type}${l.cote === mien ? ' moi' : ''}`}><b>{l.minute}′</b><span>{l.texte}</span>{l.points ? <em>+{l.points}</em> : null}</p>) : <p className="cel-note">Le coup d’envoi vient d’être donné.</p>}</div>}

    {ongletDirect === 'consignes' && (m.monCote ? <div className="cel-panneau cel-consignes">
      <p className="cel-note">Chaque changement atteint réellement le moteur : la mentalité et la contestation des rucks déplacent le potentiel de marque, le jeu et la défense changent les duels.</p>
      <div className="cel-grille-consignes">
        <Choix label="Mentalité" valeur={strategie.mentalite} options={MENTALITES} onChange={v => changer('mentalite', v)} />
        <Choix label="Jeu" valeur={strategie.jeu} options={JEUX} onChange={v => changer('jeu', v)} />
        <Choix label="Rythme" valeur={strategie.rythme} options={RYTHMES} onChange={v => changer('rythme', v)} />
        <Choix label="Défense" valeur={strategie.defense} options={DEFENSES} onChange={v => changer('defense', v)} />
        <Choix label="Rucks" valeur={strategie.rucks} options={RUCKS} onChange={v => changer('rucks', v)} />
      </div>
    </div> : <div className="cel-panneau"><p className="cel-note">Tu n’es pas sur le banc de cette rencontre : tu la regardes comme un spectateur.</p></div>)}

    {ongletDirect === 'banc' && (m.monCote ? <div className="cel-panneau cel-banc">
      <div className="cel-titre-ligne"><h2>Remplacements</h2><small>{restants} changement{restants > 1 ? 's' : ''} restant{restants > 1 ? 's' : ''}</small></div>
      <p className="cel-note">{sortant ? 'Choisis maintenant le joueur qui entre.' : 'Choisis d’abord le joueur qui sort.'}</p>
      <div className="cel-deux">
        <div><h3>Sur le terrain</h3><div className="cel-liste-pions">{m.surLeTerrain.map(p => <button key={p.carteId} className={sortant === p.carteId ? 'actif' : ''} onClick={() => setSortant(sortant === p.carteId ? '' : p.carteId)}><b>{p.numero}</b>{p.nom}<small>{nomPoste(p.poste)}</small></button>)}</div></div>
        <div><h3>Sur le banc</h3><div className="cel-liste-pions">{m.surLeBanc.length ? m.surLeBanc.map(p => <button key={p.carteId} disabled={!sortant || occupe || restants <= 0} onClick={async () => { await agir({ type: 'match', matchId, action: { type: 'remplacement', sortantId: sortant, entrantId: p.carteId } }); setSortant(''); }}><b>{p.numero}</b>{p.nom}<small>{nomPoste(p.poste)}</small></button>) : <p className="cel-note">Le banc est vide.</p>}</div></div>
      </div>
    </div> : <div className="cel-panneau"><p className="cel-note">Seul l’entraîneur de l’équipe peut faire entrer un remplaçant.</p></div>)}

    {ongletDirect === 'stats' && <div className="cel-panneau"><div className="cel-table-scroll"><table className="cel-table"><thead><tr><th>Statistique</th><th>{nomClub(vue, r.domicile)}</th><th>{nomClub(vue, r.exterieur)}</th></tr></thead><tbody>
      {([['Possession', `${m.stats.domicile.possession} %`, `${m.stats.exterieur.possession} %`], ['Essais', m.essais.domicile, m.essais.exterieur], ['Pénalités passées', m.penalites.domicile, m.penalites.exterieur], ['Tirs au but tentés', m.stats.domicile.penalitesTentees, m.stats.exterieur.penalitesTentees], ['Plaquages', m.stats.domicile.plaquages, m.stats.exterieur.plaquages], ['Mètres gagnés', m.stats.domicile.metres, m.stats.exterieur.metres], ['Ballons grattés', m.stats.domicile.turnovers, m.stats.exterieur.turnovers], ['Cartons', m.stats.domicile.cartons, m.stats.exterieur.cartons]] as const)
        .map(([label, a, b]) => <tr key={label}><th>{label}</th><td>{a}</td><td>{b}</td></tr>)}
    </tbody></table></div>
      {m.feuille && <><h3 className="cel-sous-titre">Feuille de match</h3><div className="cel-table-scroll"><table className="cel-table"><thead><tr><th>#</th><th>Joueur</th><th>Min.</th><th>Essais</th><th>Plaq.</th><th>Mètres</th></tr></thead><tbody>{m.feuille.map(l => <tr key={`${l.cote}-${l.numero}-${l.nom}`}><td>{l.numero}</td><th>{l.nom} <small>{l.cote === 'domicile' ? nomClub(vue, r.domicile) : nomClub(vue, r.exterieur)}</small></th><td>{l.minutes}</td><td>{l.essais}</td><td>{l.plaquages}</td><td>{l.metres}</td></tr>)}</tbody></table></div></>}
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA COMPOSITION — le même terrain que la Carrière Manager
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ON NE REFAIT PAS L'ÉCRAN DE COMPOSITION. `CompositionTerrainManager` sait
// déjà poser un XV sur un terrain vertical, gérer le glisser-déposer, montrer
// l'adéquation au poste, le brassard et la cible du buteur. La seule différence
// du mode en ligne, c'est d'où vient l'effectif — les cartes possédées dans
// CETTE ligue — et le fait que la feuille part au serveur au lieu du store.

export function Composition({ vue, agir, occupe }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean }) {
  const club = vue.clubs.find(c => c.id === vue.monClubId);
  const cartes = useMemo(() => vue.cartes.filter(c => c.proprietaire === vue.monClubId), [vue.cartes, vue.monClubId]);
  const effectifComplet = useMemo(() => cartes.map(carteEnJoueur), [cartes]);
  const indisponibles = useMemo(() => new Set(cartes.filter(c => c.blesseJusqua && c.blesseJusqua > maintenantISO()).map(c => c.id)), [cartes]);
  const effectif = useMemo(() => effectifComplet.filter(j => !indisponibles.has(j.id)), [effectifComplet, indisponibles]);
  const etats = useMemo(() => new Map<string, EtatDuJoueur>(cartes.map(c => [c.id, {
    fatigue: c.fatigue, condition: Math.max(0, 100 - c.fatigue),
    blesse: Boolean(c.blesseJusqua && c.blesseJusqua > maintenantISO()),
  }])), [cartes]);
  const [brouillon, setBrouillon] = useState<CompositionManager | null>(null);
  const composition = brouillon ?? club?.composition ?? { titulaires: [], remplacants: [], capitaineId: '', buteurId: '' };
  const strategie = club?.strategie ?? STRATEGIE_VIDE;
  const modifie = brouillon !== null;
  const optimale = useMemo(() => meilleureComposition(cartes), [cartes]);

  const changerJoueur = (zone: 'titulaires' | 'remplacants', index: number, joueurId: string) => {
    const suivante: CompositionManager = { ...composition, titulaires: [...composition.titulaires], remplacants: [...composition.remplacants] };
    const ancien = suivante[zone][index];
    for (const autreZone of ['titulaires', 'remplacants'] as const) {
      const autreIndex = suivante[autreZone].indexOf(joueurId);
      if (autreIndex >= 0) suivante[autreZone][autreIndex] = ancien;
    }
    suivante[zone][index] = joueurId;
    if (suivante.capitaineId === ancien && zone === 'titulaires') suivante.capitaineId = joueurId;
    if (suivante.buteurId === ancien) suivante.buteurId = joueurId;
    setBrouillon(suivante);
  };
  const majStrategie = (cle: keyof StrategieEnLigne, valeur: string) => {
    void agir({ type: 'strategie', strategie: { ...strategie, [cle]: valeur } as StrategieEnLigne });
  };
  const noteXV = composition.titulaires.length
    ? composition.titulaires.reduce((s, id) => s + (cartes.find(c => c.id === id)?.note ?? 0), 0) / composition.titulaires.length : 0;

  if (cartes.length < 23) return <Vide icone="equipe" titre="Ton effectif est trop court">Il faut au moins 23 joueurs disponibles pour composer une feuille de match.</Vide>;

  // ⚠️ UN SEUL BLOC, PAS UN FRAGMENT. Les trois morceaux de l’onglet (la barre
  // du haut, la feuille, les consignes) étaient trois enfants directs de `.cel` :
  // impossible alors de dire « la feuille prend ce qui reste de la fenêtre ».
  // Regroupés ici, ils forment la colonne qui tient dans l’écran.
  return <section className="cel-compo">
    <section className="cel-panneau cel-tete-compo">
      <div><div className="eyebrow">Feuille de {composition.titulaires.length + composition.remplacants.length} sur {cartes.length} joueurs</div><h2>Ton XV, ton banc, tes rôles</h2><p>Le capitaine tient la discipline, le buteur tire les pénalités. Un joueur hors de son poste perd la cohérence collective.</p></div>
      <div className="cel-note-compo"><b>{noteXV.toFixed(1)}</b><span>note du XV</span></div>
      <button className="btn" disabled={occupe || !optimale} title={optimale ? "Optimiser le XV et le banc selon les notes et les postes" : "Il manque des joueurs disponibles ou des spécialistes en première ligne"} onClick={() => { if (optimale) setBrouillon(optimale); }}>Assembler la meilleure équipe</button>
      <button className="btn primaire" disabled={occupe || !modifie} onClick={async () => { const v = await agir({ type: 'composition', composition }); if (v) setBrouillon(null); }}>{modifie ? 'Enregistrer la feuille' : 'Feuille enregistrée'}</button>
    </section>

    <CompositionTerrainManager
      rendreCarte={joueur => { const carte = cartes.find(c => c.id === joueur.id); return carte ? <CarteJoueurEnLigne carte={carte} compacte /> : null; }}
      effectif={effectif} effectifComplet={effectifComplet} composition={composition}
      onPlacer={changerJoueur} etats={etats} indisponibles={indisponibles}
      onCapitaine={id => setBrouillon({ ...composition, capitaineId: id })}
      onButeur={id => setBrouillon({ ...composition, buteurId: id })}
    />

    <details className="cel-panneau cel-consignes-repliables">
      <summary><span><h2>Consignes enregistrées</h2><small>Ouvrir pour ajuster la stratégie</small></span><Icone nom="sifflet" /></summary>
      <div className="cel-consignes-contenu">
        <p className="cel-note">⚠️ Ce sont elles qui entraînent ton équipe <b>quand tu n’es pas là</b> — et elles servent de point de départ quand tu l’es. Un match ne s’annule jamais faute de manager.</p>
        <div className="cel-grille-consignes">
          <Choix label="Mentalité" valeur={strategie.mentalite} options={MENTALITES} onChange={v => majStrategie('mentalite', v)} />
          <Choix label="Jeu" valeur={strategie.jeu} options={JEUX} onChange={v => majStrategie('jeu', v)} />
          <Choix label="Rythme" valeur={strategie.rythme} options={RYTHMES} onChange={v => majStrategie('rythme', v)} />
          <Choix label="Défense" valeur={strategie.defense} options={DEFENSES} onChange={v => majStrategie('defense', v)} />
          <Choix label="Rucks" valeur={strategie.rucks} options={RUCKS} onChange={v => majStrategie('rucks', v)} />
          <Choix label="Remplacements" valeur={strategie.remplacements} options={TIMINGS} onChange={v => majStrategie('remplacements', v)} />
          <Choix label="Pénalité à moins de 35 m" valeur={strategie.penaliteCourte} options={PENALITES} onChange={v => majStrategie('penaliteCourte', v)} />
          <Choix label="Pénalité au-delà de 35 m" valeur={strategie.penaliteLongue} options={PENALITES} onChange={v => majStrategie('penaliteLongue', v)} />
          <Choix label="Si mené après la 60ᵉ" valeur={strategie.bascule60} options={MENTALITES} onChange={v => majStrategie('bascule60', v)} />
          <Choix label="Si mené de 8+ après la 70ᵉ" valeur={strategie.bascule70} options={MENTALITES} onChange={v => majStrategie('bascule70', v)} />
        </div>
      </div>
    </details>
  </section>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA CARTE — GEN, poste, nom, club RÉEL, nationalité, statistiques
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ LE CLUB AFFICHÉ EST LE CLUB RÉEL DU JOUEUR, pas le club de la ligue qui le
// possède. Une carte raconte d'où vient le joueur — « Antoine Dupont, Stade
// Toulousain » — et c'est ce qui fait la différence entre une collection et un
// tableur. Le propriétaire dans la ligue s'affiche à part, quand il compte
// (sur le marché).

// ⚠️ SUR LA CARTE, LE NUMÉRO DIT DÉJÀ LE POSTE. « Deuxième ligne (4) » à côté
//    d’un « 4 » en gros, c’est la même information deux fois — et ces quatre
//    caractères de trop suffisaient à faire passer le libellé sur deux lignes,
//    ce qui décalait la photo, le nom et les statistiques d’une carte à
//    l’autre. On retire la parenthèse ici seulement : l’écran de composition,
//    lui, a la place et distingue vraiment le 4 du 5.
//    La parenthèse chiffrée est la même dans les sept langues : c’est un chiffre.

/**
 * ⚠️ LE PLANCHER D'EFFECTIF SE VÉRIFIE AVANT LE CLIC, PAS APRÈS. Le serveur
 * refuse un départ qui descendrait sous `EFFECTIF_MINIMUM` joueurs disponibles
 * — mais découvrir ça après avoir coché douze cartes, c'est douze clics pour
 * rien. On compte donc ici ce qui restera, avec la même définition que
 * `verifierDepart` : les cartes verrouillées (déjà en vente, déjà promises à
 * un échange) ne comptent pas dans l'effectif disponible.
 */
function Effectif({ vue, agir, occupe }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean }) {
  const logos = useLogosDeClub();
  const [tri, setTri] = useState('note');
  const [famille, setFamille] = useState('');
  const [demande, setDemande] = useState<CarteCarriere[] | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const feuille = feuilleDeMatch(vue.clubs.find(c => c.id === vue.monClubId));
  const toutes = vue.cartes.filter(c => c.proprietaire === vue.monClubId);
  const cartes = toutes
    .filter(c => !famille || c.famille === famille)
    .sort((a, b) => tri === 'note' ? b.note - a.note : tri === 'poste' ? (POSTE_PAR_ID[a.poste]?.numero ?? 0) - (POSTE_PAR_ID[b.poste]?.numero ?? 0) : tri === 'age' ? a.age - b.age : a.nom.localeCompare(b.nom, 'fr'));
  const familles = [...new Set(toutes.map(c => c.famille))];

  const cessible = (c: CarteCarriere) => !c.verrou && !feuille.has(c.id);
  const choisies = toutes.filter(c => selection.includes(c.id) && cessible(c));
  const total = choisies.reduce((somme, c) => somme + valeurVenteRapide(c), 0);
  const disponibles = toutes.filter(c => !c.verrou).length;
  const restants = disponibles - choisies.length;
  const basculer = (id: string) => setSelection(liste => liste.includes(id) ? liste.filter(x => x !== id) : [...liste, id]);
  const vendre = (lot: CarteCarriere[]) => {
    setDemande(null); setSelection([]);
    void agir(lot.length === 1 ? { type: 'venteRapide', carteId: lot[0].id } : { type: 'venteRapideGroupee', carteIds: lot.map(c => c.id) });
  };

  return <>
    <section className="cel-panneau cel-filtres">
      <div><div className="eyebrow">{cartes.length} joueurs sous contrat</div><h2>Ton effectif</h2></div>
      <Choix label="Trier par" valeur={tri} options={[['note', 'Note (GEN)'], ['poste', 'Numéro de maillot'], ['age', 'Âge'], ['nom', 'Nom']]} onChange={setTri} />
      <Choix label="Poste" valeur={famille} options={[['', 'Tous les postes'], ...familles.map(f => [f, nomPoste(POSTES_XV_MANAGER.find(p => POSTE_PAR_ID[p].famille === f) ?? 'arriere')] as [string, string])]} onChange={setFamille} />
      <button type="button" className="btn fantome petit" disabled={!cartes.some(cessible)}
        onClick={() => setSelection(liste => cartes.filter(cessible).every(c => liste.includes(c.id)) ? [] : [...new Set([...liste, ...cartes.filter(cessible).map(c => c.id)])])}>
        {cartes.filter(cessible).every(c => selection.includes(c.id)) && cartes.some(cessible) ? 'Tout décocher' : 'Tout cocher'}
      </button>
    </section>

    <div className="cel-grille-cartes">{cartes.map(c => {
      const maillot = feuille.get(c.id);
      const libre = cessible(c);
      const choisie = libre && selection.includes(c.id);
      return <div className={`cel-carte-quick${choisie ? ' choisie' : ''}`} key={c.id}>
        {libre && <button type="button" className="cel-coche" aria-pressed={choisie} aria-label={`Sélectionner ${c.nom}`} onClick={() => basculer(c.id)}><Icone nom="check" taille={13} /></button>}
        <CarteJoueurEnLigne carte={c} logoClub={logos.get(c.clubReel)} onClick={libre ? () => basculer(c.id) : undefined} />
        <button className="cel-vente-rapide" type="button" disabled={occupe || !libre}
          title={maillot ? `Sur la feuille de match (${maillot}) : sors-le du XV ou du banc pour le vendre.` : undefined}
          onClick={() => setDemande([c])}>
          {maillot ? `Sur la feuille · ${maillot}` : c.verrou ? 'Déjà sur le marché' : `Vente rapide · ${montant(valeurVenteRapide(c))} Ovas`}
        </button>
      </div>;
    })}</div>
    {!cartes.length && <Vide icone="equipe" titre="Aucun joueur à ce poste">Ouvre un pack ou passe par le marché pour renforcer ta ligne.</Vide>}

    {/* La barre ne s'affiche qu'une fois quelque chose de coché : tant qu'on
        regarde son effectif, rien ne doit recouvrir la dernière rangée. */}
    {choisies.length > 0 && <div className="cel-barre-selection" role="region" aria-label="Sélection à vendre">
      <div>
        <b>{choisies.length} joueur{choisies.length > 1 ? 's' : ''} sélectionné{choisies.length > 1 ? 's' : ''}</b>
        <small>{montant(total)} Ovas · il resterait {restants} joueurs disponibles</small>
      </div>
      <div className="cel-barre-actions">
        <button type="button" className="btn fantome" onClick={() => setSelection([])}>Annuler</button>
        <button type="button" className="btn primaire" disabled={occupe || restants < EFFECTIF_MINIMUM} onClick={() => setDemande(choisies)}>
          {restants < EFFECTIF_MINIMUM ? `Garde au moins ${EFFECTIF_MINIMUM} joueurs` : `Tout vendre · ${montant(total)} Ovas`}
        </button>
      </div>
    </div>}

    {demande && <Confirmation
      titre={demande.length === 1 ? 'Vendre cette carte ?' : `Vendre ces ${demande.length} cartes ?`}
      message={demande.length === 1
        ? `${demande[0].nom} sera retiré définitivement de ton effectif contre ${montant(valeurVenteRapide(demande[0]))} Ovas. Cette action est irréversible.`
        : `${demande.map(c => c.nom).join(', ')} quitteront définitivement ton effectif contre ${montant(demande.reduce((s, c) => s + valeurVenteRapide(c), 0))} Ovas au total. Cette action est irréversible.`}
      libelleOui={`Vendre pour ${montant(demande.reduce((s, c) => s + valeurVenteRapide(c), 0))} Ovas`}
      onNon={() => setDemande(null)}
      onOui={() => vendre(demande)}
    />}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES PACKS — le vivier mondial, et l'unicité par ligue
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * L'OUVERTURE D'UN PACK
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE N'EST PAS UNE LISTE QUI APPARAÎT, C'EST UN MOMENT. Trois cartes qui
 * s'affichent d'un coup, c'est un résultat ; une pochette qu'on déchire et des
 * cartes qu'on retourne une par une, c'est ce dont on parle le soir même. Toute
 * la valeur des packs tient dans ces huit secondes — et le tirage, lui, est
 * DÉJÀ FAIT côté serveur quand l'animation commence : rien de ce qui se passe
 * ici ne décide de quoi que ce soit.
 *
 * ⚠️ ET LA RARETÉ SE DEVINE AVANT LE NOM. La lueur qui monte derrière la
 * pochette prend la couleur de la MEILLEURE carte du lot : c'est ce qui fait
 * qu'on retient son souffle avant de savoir. Une révélation qui n'annonce rien
 * n'a pas de suspense.
 */
export function Packs({ vue, agir, occupe }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean }) {
  const club = vue.clubs.find(c => c.id === vue.monClubId);
  const [ouverture, setOuverture] = useState<{ cartes: CarteCarriere[]; pack: string; garantie?: VueCarriereEnLigne['packs'][number]['garantie'] } | null>(null);
  const achatEnCours = useRef(false);
  const ouvrir = async (packId: string, nomPack: string) => {
    if (achatEnCours.current || ouverture) return;
    achatEnCours.current = true;
    try {
      const avant = new Set(vue.transactions.map(t => t.id));
      const suivante = await agir({ type: 'ouvrirPack', packId });
      if (!suivante) return;
      const nouvelles = suivante.transactions.filter(t => !avant.has(t.id) && t.nature === 'pack' && t.clubId === vue.monClubId).flatMap(t => t.cartes);
      const cartes = suivante.cartes.filter(c => nouvelles.includes(c.id));
      if (cartes.length) setOuverture({ cartes, pack: nomPack, garantie: vue.packs.find(p => p.id === packId)?.garantie });
    } finally { achatEnCours.current = false; }
  };
  const ouvrirGratuit = async (attributionId: string, packId: string, nomPack: string) => {
    if (achatEnCours.current || ouverture) return;
    achatEnCours.current = true;
    try {
      const avant = new Set(vue.transactions.map(t => t.id));
      const suivante = await agir({ type: 'ouvrirPackGratuit', attributionId });
      if (!suivante) return;
      const nouvelles = suivante.transactions.filter(t => !avant.has(t.id) && t.nature === 'pack' && t.clubId === vue.monClubId).flatMap(t => t.cartes);
      const cartes = suivante.cartes.filter(c => nouvelles.includes(c.id));
      if (cartes.length) setOuverture({ cartes, pack: `${nomPack} · offert`, garantie: vue.packs.find(p => p.id === packId)?.garantie });
    } finally { achatEnCours.current = false; }
  };
  const solde = club?.ovas ?? 0;
  const packsGratuits = club?.packsGratuits ?? [];

  return <>
    <section className="cel-boutique-tete">
      <div>
        <div className="eyebrow">{montant(vue.vivierDisponible)} joueurs encore libres</div>
        <h2>La boutique</h2>
        <p>Du Top 14 à la Régionale 3, et tous les championnats étrangers.
          <b> Un joueur déjà pris dans la ligue ne sort plus d’un pack</b> — pour l’avoir, il faut aller voir celui qui l’a.</p>
      </div>
      <div className="cel-portefeuille"><PieceOvas taille={26} /><strong>{montant(solde)}</strong><span>disponibles</span></div>
    </section>

    <section className="cel-packs-quotidiens">
      <div className="cel-packs-quotidiens-tete"><div><div className="eyebrow">Coup de pouce quotidien</div><h3>{packsGratuits.length} pack{packsGratuits.length > 1 ? 's' : ''} gratuit{packsGratuits.length > 1 ? 's' : ''} à ouvrir</h3><p>Dix nouveaux packs arrivent chaque jour. Plus ton club descend au classement, plus ses chances de recevoir les packs rares augmentent.</p></div><strong>10 / jour</strong></div>
      {packsGratuits.length ? <div className="cel-packs-gratuits-liste">{packsGratuits.slice(0, 20).map(attribution => { const pack = vue.packs.find(p => p.id === attribution.packId); return pack ? <button key={attribution.id} disabled={occupe || ouverture !== null} onClick={() => { void ouvrirGratuit(attribution.id, pack.id, pack.nom); }}><span className={`cel-pack-gratuit-sceau ${pack.garantie ?? 'bronze'}`}><Icone nom="cadeau" taille={17} /></span><b>{pack.nom}</b><small>Offert</small></button> : null; })}</div> : <p className="cel-note">Les dix packs du jour ont été ouverts. Le prochain lot arrivera demain.</p>}
      {packsGratuits.length > 20 && <small className="cel-note">Ouvre quelques packs pour afficher les {packsGratuits.length - 20} suivants.</small>}
    </section>

    <BoutiquePacks3D packs={vue.packs} solde={solde} occupe={occupe || ouverture !== null} onOuvrir={ouvrir} />

    {ouverture && <OuverturePack cartes={ouverture.cartes} pack={ouverture.pack} garantie={ouverture.garantie} rendreCarte={carte => <CarteJoueurEnLigne carte={carte} />} onFermer={() => setOuverture(null)} />}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE MARCHÉ — vendre, acheter, enchérir, échanger
// ═══════════════════════════════════════════════════════════════════════════

function Marche({ vue, agir, occupe }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean }) {
  const club = vue.clubs.find(c => c.id === vue.monClubId);
  const logos = useLogosDeClub();
  const [sousOnglet, setSousOnglet] = useState<'encours' | 'vendre' | 'echanges'>('encours');
  const [carteId, setCarteId] = useState('');
  const [rechercheMarche, setRechercheMarche] = useState('');
  const [rareteMarche, setRareteMarche] = useState('');
  const normaliserRecherche = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const correspond = (c: CarteCarriere) => (!rareteMarche || c.rarete === rareteMarche) && normaliserRecherche(`${c.nom} ${c.clubReel} ${nomPoste(c.poste)}`).includes(normaliserRecherche(rechercheMarche));
  const [venteSelectionnee, setVenteSelectionnee] = useState('');
  // \u26a0\ufe0f LA MODALE NE RETIENT QU'UN IDENTIFIANT DE CARTE. Y garder l'objet
  // `vente` ou la carte fige un instantan\u00e9 : apr\u00e8s une ench\u00e8re, elle
  // continuerait d'afficher l'ancienne meilleure offre alors que le serveur a
  // d\u00e9j\u00e0 r\u00e9pondu. Tout est relu dans `vue` \u00e0 chaque rendu.
  const [apercu, setApercu] = useState('');
  const [cible, setCible] = useState('');
  const [donnees, setDonnees] = useState<string[]>([]);
  const [demandees, setDemandees] = useState<string[]>([]);
  const [ovasDonnes, setOvaDonnes] = useState('0');
  const [ovasDemandes, setOvaDemandes] = useState('0');

  const carte = (id: string) => vue.cartes.find(c => c.id === id);
  const mesCartes = vue.cartes.filter(c => c.proprietaire === vue.monClubId);
  const vendables = mesCartes.filter(c => !c.verrou);
  const ouvertes = vue.ventes.filter(v => v.etat === 'ouverte' && v.expireLe > maintenantISO() && Boolean(carte(v.carteId) && correspond(carte(v.carteId)!)));
  const siennes = vue.cartes.filter(c => c.proprietaire === cible);
  const basculer = (liste: string[], set: (l: string[]) => void, id: string) => set(liste.includes(id) ? liste.filter(x => x !== id) : [...liste, id]);

  // La carte ouverte dans la fiche, et l'annonce qui la porte s'il y en a une.
  const feuille = feuilleDeMatch(club);
  const carteApercue = apercu ? carte(apercu) : undefined;
  const venteApercue = vue.ventes.find(v => v.carteId === apercu && v.etat === 'ouverte' && v.expireLe > maintenantISO());
  /**
   * ⚠️ ON NE REFERME PAS APRÈS UNE ENCHÈRE. Acheter, publier, retirer ou vendre
   * rapidement changent l'état de la carte : la fiche n'a plus rien à montrer.
   * Enchérir, non — on veut voir sa propre offre s'inscrire, et rester là pour
   * la suivante.
   */
  const agirDepuisFiche = (commande: CommandeCarriere) => {
    void agir(commande).then(suivante => {
      if (!suivante || commande.type === 'encherir') return;
      setApercu(''); setCarteId(''); setVenteSelectionnee('');
    });
  };

  return <>
    <nav className="cel-onglets secondaires">{([['encours', `À vendre (${ouvertes.length})`], ['vendre', 'Mettre en vente'], ['echanges', `Échanges (${vue.echanges.filter(e => e.etat === 'propose').length})`]] as const).map(([id, label]) =>
      <button key={id} className={sousOnglet === id ? 'actif' : ''} onClick={() => setSousOnglet(id)}>{label}</button>)}</nav>

    <div className="cel-deux"><Champ label="Rechercher un joueur, un club ou un poste"><input type="search" value={rechercheMarche} onChange={e => setRechercheMarche(e.target.value)} placeholder="Nom du joueur…" /></Champ><Choix label="Rareté" valeur={rareteMarche} onChange={setRareteMarche} options={[["", "Toutes"], ["bronze", "Bronze"], ["argent", "Argent"], ["or", "Or"], ["elite", "Élite"], ["star", "Mythique"]]} /></div>
    {/* ⚠️ LA ROUE OUVRE LA FICHE, ELLE NE DÉROULE PLUS UN PANNEAU EN DESSOUS.
        L'annonce s'affichait sous la roue : il fallait cliquer une carte, puis
        descendre la page pour lire le prix et le vendeur, et la carte qu'on
        venait de choisir sortait de l'écran. Tout tient maintenant dans une
        fiche — la carte à gauche, l'annonce et ses boutons à droite. */}
    {sousOnglet === 'encours' && <RoueCartes titre="Les joueurs sur le marché" cartes={ouvertes.map(v=>carte(v.carteId)!).filter(Boolean)} selection={venteSelectionnee} onChoisir={id => { setVenteSelectionnee(id); setApercu(id); }} vide={rechercheMarche || rareteMarche ? 'Aucun joueur ne correspond à ces filtres.' : 'Aucun joueur en vente pour le moment.'} />}

    {sousOnglet === 'vendre' && <RoueCartes titre="Choisis ta carte à vendre ou échanger" cartes={vendables.filter(correspond).sort((a,b)=>b.note-a.note)} selection={carteId} onChoisir={id => { setCarteId(id); setApercu(id); }} vide={mesCartes.length ? 'Aucune carte disponible avec ces filtres. Les cartes verrouillées ne peuvent pas être vendues.' : 'Ton effectif ne contient encore aucune carte.'} />}

    {carteApercue && <ModaleMarche
      carte={carteApercue} vente={venteApercue} monClubId={vue.monClubId} ovas={club?.ovas ?? 0}
      logoClub={logos.get(carteApercue.clubReel)} nomDe={id => nomClub(vue, id)} occupe={occupe}
      surLaFeuille={feuille.get(carteApercue.id)}
      effectifApresDepart={{ restants: mesCartes.filter(c => !c.verrou).length - 1, minimum: EFFECTIF_MINIMUM }}
      onFermer={() => setApercu('')} onAgir={agirDepuisFiche}
      onEchanger={() => { setDonnees([carteApercue.id]); setApercu(''); setSousOnglet('echanges'); }}
    />}

    {sousOnglet === 'echanges' && <>
      {vue.echanges.filter(e => e.etat === 'propose').map(e => {
        const recu = e.vers === vue.monClubId;
        return <article key={e.id} className="cel-panneau cel-echange">
          <div className="eyebrow">{recu ? `Offre de ${nomClub(vue, e.de)}` : `Ton offre à ${nomClub(vue, e.vers)}`} · expire {dateHeure(e.expireLe)}</div>
          <div className="cel-echange-cotes">
            <div><h3>{nomClub(vue, e.de)} donne</h3><div className="cel-grille-cartes petites">{e.cartesDonnees.map(id => carte(id)).filter(Boolean).map(c => <CarteJoueurEnLigne key={c!.id} carte={c!} compacte />)}</div>{e.ovasDonnes > 0 && <b className="cel-ovas-echange">+ {montant(e.ovasDonnes)} Ovas</b>}</div>
            <Icone nom="repost" taille={26} />
            <div><h3>{nomClub(vue, e.vers)} donne</h3><div className="cel-grille-cartes petites">{e.cartesDemandees.map(id => carte(id)).filter(Boolean).map(c => <CarteJoueurEnLigne key={c!.id} carte={c!} compacte />)}</div>{e.ovasDemandes > 0 && <b className="cel-ovas-echange">+ {montant(e.ovasDemandes)} Ovas</b>}</div>
          </div>
          <div className="cel-actions">
            {recu ? <>
              <button className="btn primaire" disabled={occupe} onClick={() => { void agir({ type: 'repondreEchange', echangeId: e.id, accepter: true }); }}>Accepter</button>
              <button className="btn fantome" disabled={occupe} onClick={() => { void agir({ type: 'repondreEchange', echangeId: e.id, accepter: false }); }}>Refuser</button>
            </> : <button className="btn fantome" disabled={occupe} onClick={() => { void agir({ type: 'annulerEchange', echangeId: e.id }); }}>Annuler mon offre</button>}
          </div>
        </article>;
      })}
      <form className="cel-panneau" onSubmit={async ev => { ev.preventDefault(); const v = await agir({ type: 'proposerEchange', vers: cible, cartesDonnees: donnees, cartesDemandees: demandees, ovasDonnes: Number(ovasDonnes), ovasDemandes: Number(ovasDemandes) }); if (v) { setDonnees([]); setDemandees([]); } }}>
        <h2>Proposer un échange</h2>
        <p className="cel-note">« Je te donne mon 8 contre ton ailier + 15 000 Ovas. » Les deux doivent accepter ; le serveur valide ensuite la transaction d’un bloc.</p>
        <Choix label="Avec qui ?" valeur={cible} options={[['', 'Choisis un club'], ...vue.clubs.filter(c => c.id !== vue.monClubId).map(c => [c.id, c.nom] as [string, string])]} onChange={v => { setCible(v); setDemandees([]); }} />
        {cible && <div className="cel-deux">
          {/* Un titulaire ou un remplaçant ne part pas non plus par un échange :
              le bouton dit lequel il est plutôt que son poste. */}
          <div><h3>Je donne</h3><div className="cel-choix-cartes">{vendables.sort((a, b) => b.note - a.note).map(c => <button type="button" key={c.id} className={donnees.includes(c.id) ? 'actif' : ''} disabled={feuille.has(c.id)} title={feuille.has(c.id) ? `Sur la feuille de match (${feuille.get(c.id)}).` : undefined} onClick={() => basculer(donnees, setDonnees, c.id)}><b>{c.note}</b>{c.nom}<small>{feuille.get(c.id) ?? nomPoste(c.poste)}</small></button>)}</div><Champ label="+ Ovas de ma part"><input type="number" min={0} step={100} value={ovasDonnes} onChange={e => setOvaDonnes(e.target.value)} /></Champ></div>
          <div><h3>Je demande</h3><div className="cel-choix-cartes">{siennes.filter(c => !c.verrou).sort((a, b) => b.note - a.note).map(c => <button type="button" key={c.id} className={demandees.includes(c.id) ? 'actif' : ''} onClick={() => basculer(demandees, setDemandees, c.id)}><b>{c.note}</b>{c.nom}<small>{nomPoste(c.poste)}</small></button>)}</div><Champ label="+ Ovas de sa part"><input type="number" min={0} step={100} value={ovasDemandes} onChange={e => setOvaDemandes(e.target.value)} /></Champ></div>
        </div>}
        <button className="btn primaire" disabled={occupe || !cible || (!donnees.length && !demandees.length)}>Envoyer la proposition</button>
      </form>
    </>}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CALENDRIER, ET LES RAPPELS
// ═══════════════════════════════════════════════════════════════════════════

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const dateLongue = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
});
/** « dans 2 j », « dans 4 h », « il y a 20 min » — l'échelle qui compte ici. */
function delai(iso: string, maintenant = Date.now()): string {
  const ms = Date.parse(iso) - maintenant;
  const passe = ms < 0;
  const min = Math.round(Math.abs(ms) / 60_000);
  const texte = min < 60 ? `${min} min` : min < 60 * 24 ? `${Math.round(min / 60)} h` : `${Math.round(min / (60 * 24))} j`;
  return passe ? `il y a ${texte}` : `dans ${texte}`;
}

/**
 * ⚠️ CE QUE CES RAPPELS SONT, ET CE QU'ILS NE SONT PAS. Ce sont des
 * notifications de NAVIGATEUR, déclenchées par l'onglet ouvert : elles
 * préviennent quand une fenêtre de journée s'ouvre, quand un match commence ou
 * quand le tien se termine, tant que Destiny Rugby tourne quelque part. Elles
 * ne réveillent pas un téléphone éteint — ça demanderait un service worker et
 * un serveur de push, qui n'existent pas encore. L'écran le dit, plutôt que de
 * laisser croire à une alerte qui n'arrivera jamais.
 */
type EtatRappels = 'indisponible' | 'refuse' | 'inactif' | 'actif';
function useRappels(ligueId: string) {
  const supporte = typeof Notification !== 'undefined';
  const cle = `destiny.rappels.${ligueId}`;
  const [etat, setEtat] = useState<EtatRappels>(() => {
    if (!supporte) return 'indisponible';
    if (Notification.permission === 'denied') return 'refuse';
    try { return localStorage.getItem(cle) === '1' && Notification.permission === 'granted' ? 'actif' : 'inactif'; }
    catch { return 'inactif'; }
  });
  const basculer = useCallback(async () => {
    if (!supporte) return;
    if (etat === 'actif') {
      try { localStorage.removeItem(cle); } catch { /* navigation privée */ }
      return setEtat('inactif');
    }
    const accord = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (accord !== 'granted') return setEtat(accord === 'denied' ? 'refuse' : 'inactif');
    try { localStorage.setItem(cle, '1'); } catch { /* navigation privée */ }
    setEtat('actif');
  }, [cle, etat, supporte]);
  const prevenir = useCallback((titre: string, corps: string) => {
    if (etat !== 'actif' || !supporte || Notification.permission !== 'granted') return;
    try { new Notification(titre, { body: corps, icon: '/favicon.svg', tag: `${ligueId}-${titre}` }); }
    catch { /* certains navigateurs refusent hors service worker */ }
  }, [etat, ligueId, supporte]);
  return { etat, basculer, prevenir };
}

function Calendrier({ vue, agir, occupe, suivre }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; suivre: (id: string) => void }) {
  const rappels = useRappels(vue.id);
  const maintenant = maintenantISO();
  const miennes = vue.rencontres.filter(r => r.domicile === vue.monClubId || r.exterieur === vue.monClubId);
  const aVenir = miennes.filter(r => !r.resultat);
  const jouees = miennes.filter(r => r.resultat).slice(-8).reverse();
  const prochaine = aVenir[0];
  const parJournee = new Map<number, VueRencontre[]>();
  for (const r of vue.rencontres.filter(r => !r.resultat)) {
    if (!parJournee.has(r.journee)) parJournee.set(r.journee, []);
    parJournee.get(r.journee)!.push(r);
  }
  const journees = [...parJournee.keys()].sort((a, b) => a - b).slice(0, 6);

  if (!vue.rencontres.length) return <Vide icone="calendrier" titre="Le calendrier arrive au coup d’envoi">Quand le créateur lancera la saison, toutes les journées apparaîtront ici, avec leurs dates.</Vide>;

  return <>
    {prochaine && <section className="cel-panneau cel-prochain">
      <div className="cel-prochain-corps">
        <div className="eyebrow">Ton prochain match · journée {prochaine.journee}</div>
        <h2 className="cel-nom-ligue">
          <Ecusson nom={nomClub(vue, prochaine.domicile)} logo={vue.clubs.find(c => c.id === prochaine.domicile)?.embleme} />
          {nomClub(vue, prochaine.domicile)} <em>reçoit</em> {nomClub(vue, prochaine.exterieur)}
          <Ecusson nom={nomClub(vue, prochaine.exterieur)} logo={vue.clubs.find(c => c.id === prochaine.exterieur)?.embleme} />
        </h2>
        <p className="cel-fenetre">
          <Icone nom="chrono" taille={16} />
          {prochaine.ouvre > maintenant
            ? <>Fenêtre ouverte le <b>{dateLongue(prochaine.ouvre)}</b> — {delai(prochaine.ouvre)}</>
            : <>À jouer avant le <b>{dateLongue(prochaine.ferme)}</b> — {delai(prochaine.ferme)}</>}
        </p>
        <small className="cel-note">Coup d’envoi automatique à la date de clôture indiquée. Le direct est accessible deux minutes avant, avec vos compositions enregistrées.</small>
      </div>
      <Rencontre vue={vue} rencontre={prochaine} agir={agir} occupe={occupe} suivre={suivre} grande />
    </section>}

    <section className="cel-panneau">
      <div className="cel-titre-ligne">
        <h2>Me prévenir</h2>
        <button className={`cel-interrupteur${rappels.etat === 'actif' ? ' actif' : ''}`} disabled={rappels.etat === 'indisponible' || rappels.etat === 'refuse'}
          onClick={() => { void rappels.basculer(); }} aria-pressed={rappels.etat === 'actif'}>
          <i /><span>{rappels.etat === 'actif' ? 'Activé' : 'Désactivé'}</span>
        </button>
      </div>
      <p className="cel-note">
        {rappels.etat === 'indisponible' ? 'Ce navigateur ne sait pas afficher de notification.'
          : rappels.etat === 'refuse' ? 'Les notifications sont bloquées pour ce site. Réautorise-les dans les réglages de ton navigateur.'
            : <>Une notification quand une journée s’ouvre, quand ton match commence et quand il se termine.
              <b> Il faut que Destiny Rugby soit ouvert quelque part</b> — ce ne sont pas encore des alertes qui réveillent un téléphone fermé.</>}
      </p>
    </section>

    {aVenir.length > 1 && <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>Tes rendez-vous</h2><small>{aVenir.length} matchs à venir</small></div>
      <div className="cel-agenda">{aVenir.slice(0, 8).map(r => {
        const chezMoi = r.domicile === vue.monClubId;
        const adversaire = chezMoi ? r.exterieur : r.domicile;
        const ouverte = r.ouvre <= maintenant && r.ferme >= maintenant;
        return <button key={r.id} className={`cel-agenda-ligne${ouverte ? ' ouverte' : ''}`} onClick={() => suivre(r.id)} disabled={!r.match}>
          <span className="cel-agenda-jour">
            <b>{new Date(r.ouvre).getDate()}</b>
            <small>{new Date(r.ouvre).toLocaleDateString('fr-FR', { month: 'short' })}</small>
          </span>
          <Ecusson nom={nomClub(vue, adversaire)} logo={vue.clubs.find(c => c.id === adversaire)?.embleme} />
          <span className="cel-agenda-corps">
            <b>{chezMoi ? 'Reçoit' : 'Se déplace à'} {nomClub(vue, adversaire)}</b>
            <small>Journée {r.journee} · {JOURS[new Date(r.ouvre).getDay()]} au {JOURS[new Date(r.ferme).getDay()]} · {delai(r.ouvre)}</small>
          </span>
          {ouverte && <em className="cel-agenda-ouverte">Fenêtre ouverte</em>}
        </button>;
      })}</div>
    </section>}

    <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>Toute la ligue</h2><small>{journees.length} prochaines journées</small></div>
      {journees.map(j => {
        const liste = parJournee.get(j)!;
        return <div key={j} className="cel-journee">
          <div className="cel-journee-tete">
            <b>Journée {j}</b>
            <small>{dateLongue(liste[0].ouvre)} → {dateLongue(liste[0].ferme)}</small>
          </div>
          <div className="cel-grille-rencontres">{liste.map(r =>
            <Rencontre key={r.id} vue={vue} rencontre={r} agir={agir} occupe={occupe} suivre={suivre} />)}</div>
        </div>;
      })}
    </section>

    {jouees.length > 0 && <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>Tes derniers matchs</h2><Icone nom="resultats" /></div>
      <div className="cel-grille-rencontres">{jouees.map(r =>
        <Rencontre key={r.id} vue={vue} rencontre={r} agir={agir} occupe={occupe} suivre={suivre} />)}</div>
    </section>}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES COMPÉTITIONS — le championnat, et les coupes inventées par le créateur
// ═══════════════════════════════════════════════════════════════════════════

function Competitions({ vue, agir, occupe, proprietaire, suivre }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; proprietaire: boolean; suivre: (id: string) => void }) {
  const [nouvelle, setNouvelle] = useState(false);
  const [ficheClub, setFicheClub] = useState<string | null>(null);
  const [nom, setNom] = useState('Christmas Cup');
  const [trophee, setTrophee] = useState('Coupe de Noël');
  const [format, setFormat] = useState('elimination');
  const [participants, setParticipants] = useState<string[]>(vue.clubs.map(c => c.id));
  const [debut, setDebut] = useState(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [logoCoupe, setLogoCoupe] = useState<string | undefined>(); const [tropheeCoupe, setTropheeCoupe] = useState<string | undefined>(); const [playoffsCoupe, setPlayoffsCoupe] = useState(false);
  const [vainqueur, setVainqueur] = useState('10000');
  const [finaliste, setFinaliste] = useState('5000');
  const [participation, setParticipation] = useState('1000');
  const [ouverte, setOuverte] = useState<string>(vue.competitions[0]?.id ?? '');
  const competition = vue.competitions.find(c => c.id === ouverte) ?? vue.competitions[0];
  const rencontres = vue.rencontres.filter(r => r.competitionId === competition?.id);
  const journees = [...new Set(rencontres.map(r => r.journee))].sort((a, b) => a - b);

  return <>
    <section className="cel-panneau cel-filtres">
      <div><div className="eyebrow">{vue.competitions.length} compétition{vue.competitions.length > 1 ? 's' : ''} dans cette ligue</div><h2 className="cel-nom-ligue">{competition?.logo && <img className="cel-logo-ligue" src={competition.logo} alt="" />}{competition?.nom ?? 'Le calendrier'}</h2><p className="cel-note">{competition ? `${competition.trophee}${competition.playoffs ? ' · phase finale adaptée au nombre de clubs' : ''}` : ''}</p></div>
      {vue.competitions.length > 1 && <Choix label="Compétition" valeur={competition?.id ?? ''} options={vue.competitions.map(c => [c.id, c.nom])} onChange={setOuverte} />}
      {proprietaire && vue.phase === 'saison' && <button className="btn fantome" onClick={() => setNouvelle(!nouvelle)}><Icone nom="trophee" taille={17} />{nouvelle ? 'Fermer' : 'Créer une coupe'}</button>}
    </section>

    {nouvelle && <form className="cel-panneau" onSubmit={async e => {
      e.preventDefault();
      const v = await agir({ type: 'creerCoupe', nom, trophee, participants, format: format as 'elimination' | 'championnat', debut: new Date(`${debut}T12:00:00.000Z`).toISOString(), recompenseParticipation: Number(participation), recompenseVainqueur: Number(vainqueur), recompenseFinaliste: Number(finaliste), logo: logoCoupe, tropheeId: tropheeCoupe, playoffs: playoffsCoupe });
      if (v) setNouvelle(false);
    }}>
      <h2>Ta coupe, tes traditions</h2>
      <p className="cel-note">Deux coupes par saison au maximum : au-delà, la dotation en Ovas déséquilibrerait l’économie de la ligue.</p>
      <div className="cel-grille-consignes">
        <Champ label="Nom de la coupe"><input required minLength={2} maxLength={40} value={nom} onChange={e => setNom(e.target.value)} /></Champ>
        <Champ label="Nom du trophée"><input required minLength={2} maxLength={40} value={trophee} onChange={e => setTrophee(e.target.value)} /></Champ>
        <Choix label="Format" valeur={format} options={[['elimination', 'Élimination directe'], ['championnat', 'Championnat aller-retour']]} onChange={setFormat} />
        <Champ label="Début"><input type="date" required value={debut} onChange={e => setDebut(e.target.value)} /></Champ>
        <Champ label="Vainqueur (Ovas)"><input type="number" min={0} max={10000} step={500} value={vainqueur} onChange={e => setVainqueur(e.target.value)} /></Champ>
        <Champ label="Finaliste (Ovas)"><input type="number" min={0} max={5000} step={500} value={finaliste} onChange={e => setFinaliste(e.target.value)} /></Champ>
        <Champ label="Chaque participant (Ovas)"><input type="number" min={0} max={1000} step={100} value={participation} onChange={e => setParticipation(e.target.value)} /></Champ>
      </div>
      <ChoixCompetition logo={logoCoupe} tropheeId={tropheeCoupe} onLogo={setLogoCoupe} onTrophee={setTropheeCoupe} />
      {format === 'championnat' && <label className="cel-bascule"><input type="checkbox" checked={playoffsCoupe} onChange={e => setPlayoffsCoupe(e.target.checked)} /><span><b>Phase finale</b>Les qualifiés, dont le nombre dépend du nombre de clubs, se disputent le trophée après les journées de poule.</span></label>}
      <h3 className="cel-sous-titre">Participants</h3>
      <div className="cel-choix-cartes">{vue.clubs.map(c => <button type="button" key={c.id} className={participants.includes(c.id) ? 'actif' : ''} onClick={() => setParticipants(participants.includes(c.id) ? participants.filter(x => x !== c.id) : [...participants, c.id])}>{c.nom}</button>)}</div>
      <button className="btn primaire" disabled={occupe || participants.length < 2}>Créer la {nom}</button>
    </form>}

    {competition?.format === 'championnat' && <section className="cel-panneau"><h2>Classement</h2><Classement vue={vue} onClub={setFicheClub} /></section>}
    {ficheClub && <FicheClubEnLigne vue={vue} clubId={ficheClub} onFermer={() => setFicheClub(null)} />}

    {journees.map(j => <section key={j} className="cel-panneau">
      <div className="cel-titre-ligne"><h2>Journée {j}</h2><small>{date(rencontres.find(r => r.journee === j)!.ouvre)} au {date(rencontres.find(r => r.journee === j)!.ferme)}</small></div>
      <div className="cel-grille-rencontres">{rencontres.filter(r => r.journee === j).map(r => <Rencontre key={r.id} vue={vue} rencontre={r} agir={agir} occupe={occupe} suivre={suivre} />)}</div>
    </section>)}

    {!vue.competitions.length && <Vide icone="trophee" titre="La saison n’a pas encore commencé">Le créateur de la ligue lancera le championnat quand tout le monde sera là.</Vide>}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// L'HISTOIRE — le palmarès, et le journal de tout ce qui a bougé
// ═══════════════════════════════════════════════════════════════════════════

const NATURES: Record<string, { label: string; icone: NomIcone }> = {
  dotation: { label: 'Dotation', icone: 'cadeau' }, pack: { label: 'Pack', icone: 'cadeau' },
  vente: { label: 'Marché', icone: 'poignee' }, enchere: { label: 'Enchère', icone: 'poignee' },
  echange: { label: 'Échange', icone: 'repost' }, match: { label: 'Match', icone: 'ballon' },
  objectif: { label: 'Objectif', icone: 'cible' }, competition: { label: 'Compétition', icone: 'trophee' },
};

function Histoire({ vue }: { vue: VueCarriereEnLigne }) {
  return <>
    <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>Palmarès de la ligue</h2><Icone nom="medaille" /></div>
      {vue.histoire.length ? <div className="cel-palmares">{[...vue.histoire].reverse().map((h, i) => <article key={`${h.competitionId}-${i}`} className={h.vainqueur === vue.monClubId ? 'moi' : ''}>
        {h.logo ? <img className="cel-logo-ligue grand" src={h.logo} alt="" /> : <Icone nom="trophee" taille={30} />}
        <div><b>{h.trophee}</b><small>{h.nom} · saison {h.saison}</small></div>
        <span>{nomClub(vue, h.vainqueur)}</span>
      </article>)}</div> : <p className="cel-note">Aucun trophée n’a encore été soulevé. Le premier restera dans les mémoires.</p>}
    </section>
    <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>Le journal de ton club</h2><Icone nom="journal" /></div>
      <div className="cel-journal">{[...vue.transactions].reverse().slice(0, 60).map(t => <p key={t.id} className={t.ovas >= 0 ? 'credit' : 'debit'}>
        <Icone nom={NATURES[t.nature]?.icone ?? 'journal'} taille={16} />
        <span><b>{NATURES[t.nature]?.label ?? t.nature}</b>{t.libelle}</span>
        <em>{t.ovas > 0 ? '+' : ''}{montant(t.ovas)}</em>
        <small>{dateHeure(t.date)}</small>
      </p>)}</div>
      {!vue.transactions.length && <p className="cel-note">Rien ne s’est encore passé.</p>}
    </section>
  </>;
}
