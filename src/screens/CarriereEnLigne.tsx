import { CelebrationLigue } from '../components/CelebrationLigue';
import { AtelierKiri } from '../components/AtelierKiri';
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
import { estPuissanceDeDeux, nombreQualifiesPoules, repartirPoules } from '../lib/ligue/poulesCarriere';
import { EFFECTIF_MINIMUM, POSTES_XV_MANAGER } from '../lib/compositionManager';
import type { CompositionManager } from '../types';
import type { Coequipier } from '../lib/effectif';
import { formatTempsBlessure, formatTempsBlessureDetaille, type EtatDuJoueur } from '../lib/carteJoueur';
import type { AdministrationCarriere, CarteCarriere, CommandeCarriere, StatistiquesGlobalesCarriere, VueCarriereEnLigne } from '../lib/ligue/typesCarriere';
import type { OrdreFil, StrategieEnLigne } from '../lib/ligue/matchCarriere';
import type { CouleursDirect } from '../components/match/TerrainEnDirect';
import { NotificationsMatch } from '../components/NotificationsMatch';
import { DirectCinema } from '../components/match/DirectCinema';
import { maillotDeSecours, maillotDepuisBlason } from '../lib/moteur/apparenceMatch';
import {
  chargerSessionCarriere, chargerLigueCarriere, chargerDirectCarriere, identifierCarriere, identifierGoogleCarriere, configurationCarriere, deconnecterCarriere, supprimerLigueCarriere, INCHANGE,
  creerLigueCarriere, rejoindreLigueCarriere, commanderCarriere, signalerPresenceCarriere, chargerEmblemesCarriere, chargerStatistiquesGlobales, chargerAdministrationCarriere, ErreurCarriere,
} from '../lib/carriereEnLigneClient';
import type { IdentiteLigue } from '../lib/carriereEnLigneClient';
import type { CataloguesIdentite, GroupeEmblemes, SessionCarriere, TropheeLigue } from '../lib/carriereEnLigneClient';
import './CarriereEnLigne.css';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
export { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import { CollectionLigue } from '../components/CollectionLigue';
import { WikiLigue } from '../components/WikiLigue';
import OuverturePack from '../components/OuverturePack';
import { prechargerOuverturePack } from '../lib/prechargementPacks';
import { NOMS_PACK, apparencePack, nomPackCarriere, nomRaretePack } from '../lib/presentationPacks';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { BancDessaiSituations } from '../components/BancDessaiSituations';
import Pack3D from '../components/Pack3D';
import { LOT_VENTE_RAPIDE_MAX, valeurVenteRapide } from '../lib/ligue/venteRapideCarriere';
import { collectifCarriere, paliersCollectif, bonusCollectif, COLLECTIF_MAX } from '../lib/ligue/collectifCarriere';
import type { Affinite, AffiniteCarte } from '../lib/ligue/collectifCarriere';
import { ModaleMarche } from '../components/ModaleMarche';
import { packsBoutiqueDuJour } from '../lib/ligue/catalogueCarriere';
import { locale, nombre, t } from '../lib/i18n';
import { fusionnerDeltaDirect, fusionnerVueLigue } from '../lib/ligue/fusionDirect';

type Onglet = 'club' | 'calendrier' | 'composition' | 'effectif' | 'collection' | 'packs' | 'marche' | 'competitions' | 'histoire' | 'wiki' | 'laboratoire' | 'secret' | 'administration' | 'atelier';
type Agir = (commande: CommandeCarriere) => Promise<VueCarriereEnLigne | undefined>;
type VueRencontre = VueCarriereEnLigne['rencontres'][number];
type ReponseGoogle = { credential: string };
declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize(options: { client_id: string; callback: (reponse: ReponseGoogle) => void }): void;
      renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    } } };
  }
}
const onglets = (): { id: Onglet; label: string; icone: NomIcone }[] => [
  { id: 'club', label: t('online.nav.club'), icone: 'stade' }, { id: 'calendrier', label: t('online.nav.calendar'), icone: 'calendrier' },
  { id: 'composition', label: t('online.nav.lineup'), icone: 'maillot' },
  { id: 'effectif', label: t('online.nav.squad'), icone: 'equipe' }, { id: 'collection', label: t('online.nav.collection'), icone: 'journal' }, { id: 'packs', label: t('online.nav.packs'), icone: 'cadeau' },
  { id: 'marche', label: t('online.nav.market'), icone: 'poignee' }, { id: 'competitions', label: t('online.nav.competitions'), icone: 'trophee' },
  { id: 'histoire', label: t('online.nav.history'), icone: 'journal' },
  { id: 'wiki', label: 'Wiki', icone: 'livre' },
];
const RARETES = NOMS_PACK;
const montant = (n: number) => nombre(n);
const date = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
const dateHeure = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const nomClub = (vue: VueCarriereEnLigne, id: string) => vue.clubs.find(c => c.id === id)?.nom ?? 'Club';
const messageErreur = (e: unknown) => e instanceof Error ? e.message : 'Cette action n’a pas pu être enregistrée.';
const maintenantISO = () => new Date().toISOString();
const COMPOSITION_VIDE: CompositionManager = { titulaires: [], remplacants: [], capitaineId: '', buteurId: '' };

/**
 * ⚠️ LE COLLECTIF SE DIT EN MOTS, PAS SEULEMENT EN CHIFFRES. « 43 » ne veut
 * rien dire tant qu'on ne sait pas si c'est bien ou mal ; « groupe fragile »
 * se comprend sans mode d'emploi, et donne envie de le rendre solide.
 */
const libellePalierCollectif = (palier: ReturnType<typeof paliersCollectif>): string => t(`online.chemistry.${palier}`);
const nomAffinite = (aff: Affinite): string => t(`online.affinity.${aff === 'championnat' ? 'league' : aff}`);

function legendeAffinite(a: AffiniteCarte): string {
  const bonus = bonusCollectif(a.points);
  const entete = t('online.affinity.header', { points: String(a.points), max: String(COLLECTIF_MAX), sign: bonus >= 0 ? '+' : '', bonus: String(bonus) });
  const detail = t('online.affinity.detail', {
    club: String(a.club), clubAff: nomAffinite('club'),
    nation: String(a.nation), natAff: nomAffinite('nation'),
    league: String(a.championnat), leagueAff: nomAffinite('championnat'),
  });
  if (!a.meilleure) return `${entete}\n${t('online.affinity.none')}\n${detail}`;
  const tailles: Record<Affinite, number> = { club: a.club, nation: a.nation, championnat: a.championnat };
  const compte = t('online.affinity.startersCount', { count: String(tailles[a.meilleure]), affinity: nomAffinite(a.meilleure) });
  // ⚠️ ON NE PROPOSE PAS DE PROGRÈS À QUI EST DÉJÀ AU MAXIMUM. « Il manque 3
  // joueurs de son club » sous un 10/10 se lit comme un reproche absurde.
  const manque = a.points < COLLECTIF_MAX && a.club > 0 && a.club < 3
    ? `\n${t('online.affinity.missingForMax', { count: String(3 - a.club) })}` : '';
  return `${entete}\n${compte}${manque}\n${detail}`;
}

/**
 * ⚠️ LA MÊME CONVERSION QUE LE SERVEUR, RECOPIÉE EN CINQ LIGNES. L'importer de
 * `lib/ligue/catalogueCarriere` tirerait `effectifsReels` et `amateurs` — les
 * 78 000 joueurs du catalogue mondial — dans le paquet du navigateur, pour
 * afficher trente cartes que le serveur a déjà envoyées.
 */
const carteEnJoueur = (c: CarteCarriere): Coequipier => ({
  id: c.id, nom: c.nom, poste: c.poste, age: c.age, note: c.note,
  postesSecondaires: c.postesSecondaires ? [...c.postesSecondaires] : undefined,
  potentiel: c.potentiel, jeuAuPied: c.statistiques.JDP,
  nation: c.nation, regen: c.origine === 'formation', horsGeneration: true,
  clubReel: c.clubReel, championnat: c.championnat,
});

// Les options de consignes traduites dynamiquement.
const obtenirMentalites = (): [string, string][] => [
  ['tresDefensive', t('online.mentality.tresDefensive')],
  ['defensive', t('online.mentality.defensive')],
  ['equilibree', t('online.mentality.equilibree')],
  ['offensive', t('online.mentality.offensive')],
  ['tresOffensive', t('online.mentality.tresOffensive')],
];
const obtenirJeux = (): [string, string][] => [
  ['occupation', t('online.game.occupation')],
  ['possession', t('online.game.possession')],
  ['jeuAuPied', t('online.game.jeuAuPied')],
  ['large', t('online.game.large')],
  ['axe', t('online.game.axe')],
  ['rapide', t('online.game.rapide')],
  ['conservation', t('online.game.conservation')],
];
const obtenirRythmes = (): [string, string][] => [
  ['ralentir', t('online.rhythm.ralentir')],
  ['normal', t('online.rhythm.normal')],
  ['accelerer', t('online.rhythm.accelerer')],
];
const obtenirDefenses = (): [string, string][] => [
  ['conservatrice', t('online.defense.conservatrice')],
  ['normale', t('online.defense.normale')],
  ['agressive', t('online.defense.agressive')],
];
const obtenirRucks = (): [string, string][] => [
  ['faible', t('online.rucks.faible')],
  ['normal', t('online.rucks.normal')],
  ['forte', t('online.rucks.forte')],
];
const obtenirPenalites = (): [string, string][] => [
  ['points', t('online.penalties.points')],
  ['touche', t('online.penalties.touche')],
  ['rapide', t('online.penalties.rapide')],
  ['melee', t('online.penalties.melee')],
];
const obtenirTimings = (): [string, string][] => [
  ['precoces', t('online.timings.precoces')],
  ['standard', t('online.timings.standard')],
  ['tardifs', t('online.timings.tardifs')],
];
const obtenirRisques = (): [string, string][] => [
  ['prudent', t('online.risks.prudent')],
  ['mesure', t('online.risks.mesure')],
  ['audacieux', t('online.risks.audacieux')],
];
const obtenirFrequencesPied = (): [string, string][] => [
  ['rare', t('online.kicking.rare')],
  ['equilibree', t('online.kicking.equilibree')],
  ['frequente', t('online.kicking.frequente')],
];
const obtenirGestionAvance = (): [string, string][] => [
  ['defensive', t('online.lead.defensive')],
  ['equilibree', t('online.lead.equilibree')],
  ['offensive', t('online.lead.offensive')],
];
const STRATEGIE_VIDE: StrategieEnLigne = {
  mentalite: 'equilibree', jeu: 'possession', rythme: 'normal', defense: 'normale', rucks: 'normal',
  penaliteCourte: 'points', penaliteLongue: 'touche', bascule60: 'offensive', bascule70: 'tresOffensive',
  remplacements: 'standard',
  risqueOffensif: 'mesure', frequencePied: 'equilibree', gestionAvance: 'defensive',
};
const signalTexte = (cle: string): string => t(cle) || cle;

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
        <button className="btn primaire" onClick={onFermer}>{t('online.common.close')}</button>
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
  return <GrilleChoix titre={t('online.trophy.title')} sousTitre={t('online.trophy.subtitle')}
    compte={t('online.trophy.count', { n: trophees.length })} onFermer={onFermer}
    onEffacer={valeur ? () => onChoisir(undefined) : undefined} libelleEffacer={t('online.trophy.leagueDefault')}
    entete={<div className="cel-apercu-trophee" style={{ ['--teinte' as string]: trophee?.couleur ?? 'var(--or-500)' }}>
      <VignetteTrophee tropheeId={survole} trophees={trophees} taille={116} />
      <div>
        <b>{trophee?.nom ?? t('online.trophy.noneChosen')}</b>
        <p>{trophee?.desc ?? t('online.trophy.chooseHelp')}</p>
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

  return <div className="cel-ouverture" role="dialog" aria-label={t('online.portal.chooseBadge')} onClick={e => { if (e.target === e.currentTarget) onFermer(); }}>
    <div className="cel-ouverture-contenu cel-emblemes">
      <div className="eyebrow">{t('online.badge.clubBadge')}</div>
      <h2>{t('online.badge.takeRealColors')}</h2>
      <Champ label={t('online.badge.searchClub')}><input autoFocus value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Toulouse, Leinster, Crusaders…" /></Champ>
      {erreur && <p className="cel-note">{erreur}</p>}
      {!groupes && !erreur && <p className="cel-note">{t('online.badge.loadingBadges')}</p>}
      <div className="cel-emblemes-liste">
        {filtres.map(g => <section key={g.groupe}>
          <h3>{g.groupe} <small>{g.pays}</small></h3>
          <div className="cel-emblemes-grille">{g.emblemes.map(e =>
            <button key={e.logo} type="button" className={valeur === e.logo ? 'actif' : ''} title={e.nom} onClick={() => { onChoisir(e.logo); onFermer(); }}>
              <EcussonClub logo={e.logo} taille={42} /><span>{e.nom}</span>
            </button>)}</div>
        </section>)}
        {groupes && !filtres.length && <p className="cel-note">{t('online.collection.empty')}</p>}
      </div>
      <div className="cel-actions">
        <button className="btn primaire" onClick={onFermer}>{t('online.common.close')}</button>
        {valeur && <button className="btn fantome" onClick={() => { onChoisir(undefined); onFermer(); }}>{t('online.badge.revertToInitials')}</button>}
        <small>{t('online.badge.countInfo', { count: filtres.reduce((n, g) => n + g.emblemes.length, 0), leagues: filtres.length })}</small>
      </div>
    </div>
  </div>;
}

export function CarriereEnLigne() {
  const setEcran = useGame(s => s.setEcran);
  useGame(s => s.langue); // Réaffiche immédiatement tout le mode après un changement de langue.
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
    if (erreur && !document.querySelector('.cel-compo-etendue')) refErreur.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [erreur]);
  const [occupe, setOccupe] = useState(false);
  const [ligueId, setLigueId] = useState<string | null>(() => new URLSearchParams(location.search).get('directLigue'));
  const [vue, setVue] = useState<VueCarriereEnLigne | null>(null);
  const [onglet, setOnglet] = useState<Onglet>('club');
  const [matchId, setMatchId] = useState<string | null>(() => new URLSearchParams(location.search).get('directMatch'));
  // ⚠️ LU PAR LA BOUCLE DE SONDAGE, qui n'est montée qu'une fois : sans cette
  // référence, elle ne saurait jamais qu'on vient d'ouvrir un direct.
  useEffect(() => {
    const ouvrir = () => { const q = new URLSearchParams(location.search); if(q.has('directLigue')) { setLigueId(q.get('directLigue')); setMatchId(q.get('directMatch')); } };
    window.addEventListener('destiny-ouvrir-match',ouvrir); return () => window.removeEventListener('destiny-ouvrir-match',ouvrir);
  },[]);
  const directOuvert = useRef<string | null>(null);
  directOuvert.current = matchId;
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

  /**
   * Un seul appel à la fois. Une réponse ancienne ne peut pas annuler une
   * action récente.
   *
   * ⚠️ ET CHAQUE SONDAGE COÛTE UNE LECTURE COMPLÈTE DE LA LIGUE. Le serveur
   * relit l'état entier — 300 à 400 Ko pour une ligue à huit clubs — à chaque
   * passage. À six sondages par minute, un seul onglet laissé ouvert consomme
   * une centaine de mégaoctets par heure côté base ; le quota de transfert Neon
   * (5 Go par mois) est parti en huit jours, dont 6,1 Go consommés.
   *
   * Trois freins, aucun visible en jeu :
   *
   *   • ONGLET CACHÉ, AUCUN SONDAGE. Un onglet en arrière-plan n'affiche rien à
   *     personne. Il repart d'un coup au retour, donc on ne voit jamais de
   *     retard — c'est même plus frais qu'avant, où l'on tombait sur la réponse
   *     d'un sondage vieux de dix secondes.
   *   • RIEN NE BOUGE, ON ESPACE. Après une minute sans le moindre changement
   *     de version, on passe à trente secondes. La première réponse différente
   *     ramène aussitôt à dix.
   *   • LE DIRECT RESTE CIBLÉ. Une seconde pendant le match effectivement
   *     regardé, dix secondes dès qu'une rencontre approche : la base ne porte
   *     le coût supplémentaire que lorsque la fluidité est visible.
   */
  useEffect(() => {
    if (!ligueId) return;
    let actif = true;
    let minuterie: ReturnType<typeof setTimeout>;
    let inchanges = 0;
    const controleur = new AbortController();

    const prochainPas = () => {
      const vue = derniereVue.current;
      // ⚠️ LA SECONDE EST RÉSERVÉE À CELUI QUI REGARDE. Un match dure
      // quatre-vingts minutes réelles : sonder toutes les deux secondes pour
      // TOUS les membres de la ligue, c'était deux mille quatre cents lectures
      // complètes de l'état par match et par onglet ouvert. Le match avance de
      // toute façon à chaque lecture, d'où qu'elle vienne — un direct laissé
      // sans spectateur ne se bloque donc pas, il coûte simplement cinq fois
      // moins cher.
      const suivi = directOuvert.current;
      if (suivi && vue?.rencontres.some(r => r.id === suivi && r.match && !r.match.termine)) return 1000;
      if (vue?.rencontres.some(r => r.match && !r.match.termine)) return 10_000;
      const bientot = Date.now() + 5 * 60_000;
      if (vue?.rencontres.some(r => !r.resultat && Date.parse(r.ouvre) <= bientot && Date.parse(r.ferme) >= Date.now())) return 10_000;
      return inchanges >= 6 ? 30_000 : 10_000;
    };
    const programmer = () => {
      clearTimeout(minuterie);
      if (!actif || document.hidden) return;
      minuterie = setTimeout(() => { void actualiser(); }, prochainPas());
    };

    const actualiser = async () => {
      const version = versionRequete.current;
      try {
        // On annonce la version qu'on tient : si elle est encore bonne, le
        // serveur répond « inchangé » sans avoir lu l'état de la ligue.
        const connue = derniereVue.current?.id === ligueId ? derniereVue.current.version : undefined;
        const suivi = directOuvert.current;
        const directActif = suivi && derniereVue.current?.rencontres.some(r => r.id === suivi && r.match && !r.match.termine);
        if (directActif) {
          const delta = await chargerDirectCarriere(ligueId, suivi, controleur.signal, connue);
          if (actif && version === versionRequete.current) {
            // La fusion refuse aussi une réponse de direct plus ancienne ayant
            // la même version : chrono, score et fil ne peuvent plus reculer.
            setVue(avant => avant ? fusionnerDeltaDirect(avant, delta) : avant);
          }
          programmer();
          return;
        }
        const suivante = await chargerLigueCarriere(ligueId, controleur.signal, connue);
        if (suivante === INCHANGE) { inchanges++; }
        else if (actif && version === versionRequete.current) {
          setVue(avant => {
            if (avant && avant.id === suivante.id && suivante.version < avant.version) return avant;
            // Une version identique, c'est un sondage pour rien : on les compte
            // pour savoir quand lever le pied.
            if (avant && avant.id === suivante.id && avant.version === suivante.version) inchanges++;
            else inchanges = 0;

            return fusionnerVueLigue(avant, suivante);
          });
        }
      } catch (e) { if (actif) setErreur(messageErreur(e)); }
      programmer();
    };

    // Au retour sur l'onglet, on ne PROGRAMME pas : on rafraîchit tout de suite,
    // sinon le joueur regarderait jusqu'à trente secondes un écran d'avant.
    const surVisibilite = () => {
      if (document.hidden) { clearTimeout(minuterie); return; }
      inchanges = 0;
      void actualiser();
    };
    document.addEventListener('visibilitychange', surVisibilite);

    void actualiser();
    return () => {
      actif = false; controleur.abort(); clearTimeout(minuterie);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  }, [ligueId]);


  const ouvrir = (suivante: VueCarriereEnLigne) => {
    versionRequete.current++; setVue(suivante); setLigueId(suivante.id); setOnglet(suivante.observateur ? 'calendrier' : 'club'); setMatchId(null); setErreur('');
  };
  const agir: Agir = async commande => {
    if (!ligueId || occupe || vue?.observateur) return;
    setOccupe(true); setErreur(''); versionRequete.current++;
    try {
      const suivante = await commanderCarriere(ligueId, commande, crypto.randomUUID());
      // Une commande peut revenir après un rafraîchissement temps réel plus
      // récent. La fusion monotone empêche score, horloge et fil de reculer.
      setVue((avant) => fusionnerVueLigue(avant, suivante)); return suivante;
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
  const navigation = onglets().filter(o => !vue?.observateur || ['calendrier', 'competitions', 'histoire', 'wiki'].includes(o.id));

  return <section className="cel" aria-label="Carrière en ligne">
    <div className="cel-fil">
      <button className="btn fantome" onClick={() => vue ? retourLigues() : setEcran('accueil')}><Icone nom="fleche-droite" className="cel-retour" taille={15} />{vue ? t('online.myLeagues') : t('online.home')}</button>
      <span><i className={`cel-presence${erreur ? ' interrompue' : ''}`} /> {t('online.title')}</span>
      {session && <button className="cel-compte" onClick={() => { void quitterCompte(); }} disabled={occupe} title="Se déconnecter"><Icone nom="profil" taille={16} />{session.compte.pseudo}<Icone nom="porte" taille={15} /></button>}
    </div>
    {erreur && <div className="cel-erreur" role="alert" ref={refErreur}><Icone nom="alerte" taille={22} /><p>{erreur}</p><button className="btn fantome" disabled={occupe} onClick={() => { if (ligueId) void ouvrirLigue(ligueId); else void chargerSession(); }}>{t('online.retry')}</button></div>}
    {notification && <div className="cel-notification" role="status">{notification}<button aria-label="Fermer la notification" onClick={() => setNotification('')}><Icone nom="croix" taille={16} /></button></div>}
    {charge ? <Vide icone="chrono" titre={t('online.loading')}>{t('online.loadingDetail')}</Vide>
      : !session ? <Connexion occupe={occupe} onGoogle={async credential => {
        setOccupe(true); setErreur('');
        try { await identifierGoogleCarriere(credential); await chargerSession(); }
        catch (e) { setErreur(messageErreur(e)); }
        finally { setOccupe(false); }
      }} onConnexion={async (action, identifiant, motDePasse, pseudo, confirmationMotDePasse) => {
        setOccupe(true); setErreur('');
        try { await identifierCarriere(action, identifiant, motDePasse, pseudo, confirmationMotDePasse); await chargerSession(); }
        catch (e) { setErreur(messageErreur(e)); }
        finally { setOccupe(false); }
      }} />
      : !vue ? <Portail session={session} occupe={occupe} ouvrirLigue={ouvrirLigue} onSupprimer={async id => {
        setOccupe(true); setErreur('');
        try { await supprimerLigueCarriere(id); await chargerSession(); setNotification(t('online.league.deleted')); }
        catch (e) { setErreur(messageErreur(e)); }
        finally { setOccupe(false); }
      }} onCreer={async (nom, clubNom, rythme, max, identite) => {
        setOccupe(true); setErreur(''); try { ouvrir(await creerLigueCarriere(nom, clubNom, rythme, max, identite)); } catch (e) { setErreur(messageErreur(e)); } finally { setOccupe(false); }
      }} onRejoindre={async (code, clubNom, embleme) => { setOccupe(true); setErreur(''); try { ouvrir(await rejoindreLigueCarriere(code, clubNom, embleme)); oublierInvitation(); } catch (e) { setErreur(messageErreur(e)); } finally { setOccupe(false); } }} />
      : <>
        {/* ⚠️ LE DIRECT PREND L'ÉCRAN. Sur un téléphone, l'en-tête du club
            et la barre d'onglets mangeaient 370 des 812 pixels : le terrain
            commençait sous le pli, et suivre son match demandait de faire
            défiler la page à chaque phase. Ni l'un ni l'autre ne servent
            pendant une rencontre — le direct a son propre bouton « Fermer »,
            qui ramène exactement là d'où l'on vient. */}
        {!rencontre && <header className="cel-entete"><Ecusson nom={club?.nom ?? vue.nom} logo={club?.embleme ?? vue.logo} grand /><div><div className="eyebrow cel-nom-ligue">{vue.logo && <img className="cel-logo-ligue" src={vue.logo} alt="" />}{vue.nom} <span> / {t('online.season', { n: vue.saison })}</span></div><h1>{vue.observateur ? t('online.spectator.mode') : club?.nom}</h1><p>{vue.rythme === 7 ? t('online.clubsDaily', { clubs: vue.clubs.length }) : t('online.clubsRate', { clubs: vue.clubs.length, matches: vue.rythme })} · {t(`online.phase.${vue.phase === 'salon' ? 'lobby' : vue.phase === 'saison' ? 'season' : 'break'}`)}</p></div>{vue.observateur ? <div className="cel-portefeuille"><Icone nom="oeil" taille={26} /><strong>{t('online.spectator.mode')}</strong><span>{t('online.spectator.readOnly')}</span></div> : <div className="cel-portefeuille"><PieceOvas taille={26} /><strong>{montant(club?.ovas ?? 0)}</strong><span>{t('online.balance')}</span></div>}</header>}
        {!rencontre && <nav className="cel-onglets" aria-label={t('online.title')}>{[...navigation, ...(!vue.observateur && session.compte.administrateur && vue.laboratoire ? [{ id: 'laboratoire' as const, label: 'Laboratoire', icone: 'eclair' as NomIcone }] : []), ...(session.compte.administrateur ? [{ id: 'atelier' as const, label: 'Atelier Kiri', icone: 'medaille' as NomIcone }, { id: 'secret' as const, label: 'Kiri stats', icone: 'medaille' as NomIcone }, { id: 'administration' as const, label: 'Comptes & ligues', icone: 'profil' as NomIcone }] : [])].map(o => <button key={o.id} className={onglet === o.id && !matchId ? 'actif' : ''} aria-current={onglet === o.id && !matchId ? 'page' : undefined} onClick={() => { setOnglet(o.id); setMatchId(null); }}><Icone nom={o.icone} taille={18} />{o.label}</button>)}</nav>}
        {rencontre ? <Direct vue={vue} rencontre={rencontre} agir={agir} occupe={occupe} fermer={() => setMatchId(null)} /> : <>
          <CelebrationLigue key={vue.id} vue={vue} agir={agir} />
          {onglet === 'club' && <Bureau vue={vue} proprietaire={session.compte.id === vue.createurId} agir={agir} occupe={occupe} suivre={setMatchId} notifier={setNotification} />}
          {onglet === 'calendrier' && <Calendrier vue={vue} agir={agir} occupe={occupe} suivre={setMatchId} proprietaire={session.compte.id === vue.createurId} notifier={setNotification} />}
          {onglet === 'composition' && <Composition key={vue.id} vue={vue} agir={agir} occupe={occupe} erreur={erreur} />}
          {onglet === 'effectif' && <Effectif vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'collection' && <CollectionLigue vue={vue} />}
          {onglet === 'packs' && <Packs vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'marche' && <Marche vue={vue} agir={agir} occupe={occupe} />}
          {onglet === 'competitions' && <Competitions vue={vue} agir={agir} occupe={occupe} proprietaire={session.compte.id === vue.createurId} suivre={setMatchId} />}
          {onglet === 'histoire' && <Histoire vue={vue} />}
          {onglet === 'wiki' && <WikiLigue />}
          {onglet === 'laboratoire' && session.compte.administrateur && vue.laboratoire && <LaboratoireLigue vue={vue} agir={agir} occupe={occupe} suivre={setMatchId} notifier={setNotification} />}
          {onglet === 'secret' && session.compte.administrateur && <StatistiquesSecretes />}
          {onglet === 'administration' && session.compte.administrateur && <AdministrationKiri observer={ouvrirLigue} occupe={occupe} />}
          {onglet === 'atelier' && session.compte.administrateur && <AtelierKiri />}
        </>}
      </>}
  </section>;
}

function Connexion({ onConnexion, onGoogle, occupe }: { occupe: boolean; onGoogle: (credential: string) => Promise<void>; onConnexion: (action: 'connexion' | 'inscription', identifiant: string, motDePasse: string, pseudo: string, confirmationMotDePasse: string) => Promise<void> }) {
  // ⚠️ QUELQU’UN QUI ARRIVE PAR UN LIEN N’A PRESQUE JAMAIS DE COMPTE. On lui
  //    ouvre donc « Créer mon compte », et on lui dit pourquoi il est là :
  //    sans ce mot, un formulaire de connexion nu après avoir cliqué sur une
  //    invitation ressemble à une erreur d’aiguillage.
  const invitation = invitationEnAttente();
  const [inscription, setInscription] = useState(Boolean(invitation));
  const [identifiant, setIdentifiant] = useState(''); const [pseudo, setPseudo] = useState(''); const [motDePasse, setMotDePasse] = useState(''); const [confirmation, setConfirmation] = useState('');
  const googleRef = useRef<HTMLDivElement | null>(null);
  const [googleDisponible, setGoogleDisponible] = useState(false);
  useEffect(() => {
    let actif = true;
    const installer = async () => {
      const { googleClientId } = await configurationCarriere();
      if (!actif || !googleClientId) return;
      setGoogleDisponible(true);
      let script = document.querySelector<HTMLScriptElement>('script[data-destiny-google]');
      if (!script) {
        script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.dataset.destinyGoogle = '1';
        document.head.appendChild(script);
      }
      if (!window.google) await new Promise<void>((resolve, reject) => { script!.addEventListener('load', () => resolve(), { once: true }); script!.addEventListener('error', () => reject(new Error('Google indisponible')), { once: true }); });
      if (!actif || !window.google || !googleRef.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: reponse => { if (reponse.credential) void onGoogle(reponse.credential); } });
      googleRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', shape: 'pill', text: inscription ? 'signup_with' : 'signin_with', width: 320, locale: 'fr' });
    };
    void installer().catch(() => {});
    return () => { actif = false; };
  }, [inscription, onGoogle]);
  const soumettre = (e: FormEvent) => { e.preventDefault(); if (inscription && motDePasse !== confirmation) return; void onConnexion(inscription ? 'inscription' : 'connexion', identifiant, motDePasse, pseudo, confirmation); };
  return <div className="cel-entree">
    <div className="cel-promesse"><div className="eyebrow">{t('online.auth.eyebrow')}</div><h1>{t('online.auth.title')}</h1><p>{t('online.auth.starterPackDesc')}</p><div className="cel-billet"><b>{t('online.season', { n: '01' })}</b><span>{t('online.portal.initialSquad')}</span><strong>35 <small>GEN</small></strong><p>{t('online.auth.features')}</p></div></div>
    <form className="cel-panneau cel-auth" onSubmit={soumettre}>
      {invitation && <p className="cel-invite"><Icone nom="cadeau" taille={18} />{t('online.auth.invited')}</p>}
      <div className="eyebrow">{t('online.auth.account')}</div><h2>{inscription ? t('online.auth.create') : t('online.auth.find')}</h2>
      <div className={`cel-google${occupe ? ' occupe' : ''}${googleDisponible ? '' : ' indisponible'}`} ref={googleRef} />
      {googleDisponible && <div className="cel-separateur"><span>{t('online.auth.orWithId')}</span></div>}
      <Champ label={t('online.auth.id')}><input autoComplete="username" required minLength={3} maxLength={60} value={identifiant} onChange={e => setIdentifiant(e.target.value)} placeholder="username" /></Champ>
      {inscription && <Champ label={t('online.auth.manager')}><input required minLength={2} maxLength={32} value={pseudo} onChange={e => setPseudo(e.target.value)} /></Champ>}
      <Champ label={t('online.auth.password')}><input type="password" autoComplete={inscription ? 'new-password' : 'current-password'} required minLength={inscription ? 10 : 1} maxLength={128} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} /></Champ>
      {inscription && <><Champ label={t('online.auth.password')}><input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></Champ>{confirmation && confirmation !== motDePasse && <p className="cel-erreur-champ">{t('online.auth.passwordMismatch')}</p>}</>}
      <button className="btn primaire" disabled={occupe || Boolean(inscription && motDePasse !== confirmation)}>{occupe ? t('online.auth.connecting') : inscription ? t('online.auth.create') : t('online.auth.signin')}<Icone nom="fleche-droite" taille={17} /></button>
      <button className="btn fantome" type="button" onClick={() => setInscription(!inscription)}>{inscription ? t('online.auth.existing') : t('online.auth.new')}</button>
    </form>
  </div>;
}

function Portail({ session, occupe, ouvrirLigue, onSupprimer, onCreer, onRejoindre }: { session: SessionCarriere; occupe: boolean; ouvrirLigue: (id: string) => Promise<void>; onSupprimer: (id: string) => Promise<void>; onCreer: (nom: string, club: string, rythme: number, max: number, identite?: IdentiteLigue) => Promise<void>; onRejoindre: (code: string, club: string, embleme?: string) => Promise<void> }) {
  // ⚠️ ARRIVER PAR UN LIEN, C’EST DÉJÀ AVOIR RÉPONDU À LA QUESTION. Sans ça,
  //    l’invité tombe sur « Créer une ligue » avec un formulaire vide, et le
  //    code qu’on vient de lui donner est à ressaisir alors qu’on l’a en main.
  const invitation = invitationEnAttente();
  const [mode, setMode] = useState<'creer' | 'rejoindre'>(invitation ? 'rejoindre' : 'creer'); const [nom, setNom] = useState(''); const [club, setClub] = useState(''); const [code, setCode] = useState(invitation ?? ''); const [rythme, setRythme] = useState('1'); const [max, setMax] = useState('8');
  const [embleme, setEmbleme] = useState<string | undefined>(); const [choixOuvert, setChoixOuvert] = useState(false);
  const [logo, setLogo] = useState<string | undefined>(); const [tropheeId, setTropheeId] = useState<string | undefined>(); const [playoffs, setPlayoffs] = useState(false);
  const [dotation, setDotation] = useState('1000');
  const [aSupprimer, setASupprimer] = useState<SessionCarriere['ligues'][number] | null>(null);
  return <><header className="cel-titre"><div className="eyebrow">{t('online.portal.welcome', { name: session.compte.pseudo })}</div><h1>{t('online.portal.title')}</h1><p>{t('online.portal.description')}</p></header><div className="cel-portail"><div><h2>{t('online.myLeagues')} <small>{session.ligues.length}</small></h2>{session.ligues.length ? <div className="cel-ligues">{session.ligues.map(l => <div className="cel-ligue-ligne" key={l.id}><button className={`cel-ligue${l.laboratoire ? ' cel-ligue-laboratoire' : ''}`} disabled={occupe} onClick={() => { void ouvrirLigue(l.id); }}><Ecusson nom={l.clubNom} logo={l.clubEmbleme} /><span><em className="cel-ligue-nom">{l.logo && <img className="cel-logo-ligue cel-logo-ligue-liste" src={l.logo} alt="" />}{l.nom}{l.laboratoire && <i>Développement</i>}</em><b>{l.clubNom}</b><small>{t(`online.phase.${l.etat === 'salon' ? 'lobby' : l.etat === 'saison' ? 'season' : 'break'}`)} · {montant(l.ovas)} Ovas</small></span><Icone nom="fleche-droite" /></button>{l.createur && !l.laboratoire && <button type="button" className="cel-supprimer-ligue" disabled={occupe} aria-label={t('online.league.deleteConfirmTitle', { name: l.nom })} title={t('online.league.deleteTitle')} onClick={() => setASupprimer(l)}><Icone nom="corbeille" taille={18} /></button>}</div>)}</div> : <Vide titre={t('online.portal.create')}>{t('online.portal.empty')}</Vide>}</div><form className="cel-panneau" onSubmit={e => { e.preventDefault(); if (mode === 'creer') void onCreer(nom, club, Number(rythme), Number(max), { embleme, logo, tropheeId, playoffs, dotationOvas: Number(dotation) }); else void onRejoindre(code, club, embleme); }}><div className="cel-bascules"><button type="button" className={mode === 'creer' ? 'actif' : ''} onClick={() => setMode('creer')}>{t('online.portal.create')}</button><button type="button" className={mode === 'rejoindre' ? 'actif' : ''} onClick={() => setMode('rejoindre')}>{t('online.portal.join')}</button></div><h2>{mode === 'creer' ? t('online.portal.create') : t('online.portal.join')}</h2>{mode === 'creer' ? <Champ label={t('online.portal.leagueName')}><input required minLength={3} maxLength={50} value={nom} onChange={e => setNom(e.target.value)} /></Champ> : <Champ label={t('online.portal.inviteCode')}><input required autoCapitalize="characters" maxLength={20} value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></Champ>}<Champ label={t('online.portal.clubName')}><input required minLength={3} maxLength={40} value={club} onChange={e => setClub(e.target.value)} /></Champ><div className="cel-champ"><span>{t('online.portal.badge')}</span><button type="button" className="cel-choix-embleme" onClick={() => setChoixOuvert(true)}><Ecusson nom={club || 'Club'} logo={embleme} /><span>{embleme ? t('online.portal.changeBadge') : t('online.portal.chooseBadge')}</span><Icone nom="fleche-droite" taille={16} /></button></div>{choixOuvert && <ChoixEmbleme valeur={embleme} onChoisir={setEmbleme} onFermer={() => setChoixOuvert(false)} />}{mode === 'creer' && <><div className="cel-deux"><Champ label={t('online.portal.matchesPerWeek')}><input type="number" min={1} max={7} required value={rythme} onChange={e => setRythme(e.target.value)} /></Champ><Champ label={t('online.portal.clubCount')}><input type="number" min={2} max={64} required value={max} onChange={e => setMax(e.target.value)} /></Champ></div><Champ label={t('online.portal.startingOvas')}><input type="number" min={0} max={100000} required value={dotation} onChange={e => setDotation(e.target.value)} /></Champ><ChoixCompetition logo={logo} tropheeId={tropheeId} onLogo={setLogo} onTrophee={setTropheeId} /><label className="cel-bascule"><input type="checkbox" checked={playoffs} onChange={e => setPlayoffs(e.target.checked)} /><span><b>{t('online.competition.knockout')}</b>{t('online.competition.knockoutHelp')}</span></label></>}<p className="cel-note">{t('online.portal.initialSquad')}</p><button className="btn primaire" disabled={occupe}>{occupe ? t('online.auth.connecting') : mode === 'creer' ? t('online.portal.createPrivate') : t('online.portal.joinLeague')}<Icone nom="fleche-droite" taille={18} /></button></form></div>{aSupprimer && <Confirmation titre={t('online.league.deleteConfirmTitle', { name: aSupprimer.nom })} message={t('online.league.deleteConfirmMessage')} libelleOui={t('online.league.deleteDefinitive')} onNon={() => setASupprimer(null)} onOui={() => { const id = aSupprimer.id; setASupprimer(null); void onSupprimer(id); }} />}</>;
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
    <span>{t('online.invite.title')}</span>
    <b>{code}</b>
    <em>{lien}</em>
    <div className="cel-invitation-actions">
      <button type="button" className="btn primaire" onClick={() => { void copier(lien, t('online.invite.linkCopied'), lien); }}>
        <Icone nom="lien" taille={16} />{t('online.invite.copyLink')}
      </button>
      <button type="button" className="btn fantome" onClick={() => { void copier(code, t('online.invite.codeCopied'), t('online.invite.codeFallback', { code })); }}>
        <Icone nom="dossier" taille={16} />{t('online.invite.copyCode')}
      </button>
      {partageable && <button type="button" className="btn fantome" onClick={() => {
        // Un partage annulé n'est pas une erreur : l'utilisateur a fermé la feuille.
        void navigator.share({ title: 'Destiny Rugby', text: t('online.invite.shareText'), url: lien }).catch(() => {});
      }}>
        <Icone nom="partage" taille={16} />{t('online.invite.share')}
      </button>}
    </div>
  </div>;
}

function Bureau({ vue, proprietaire, agir, occupe, suivre, notifier }: { vue: VueCarriereEnLigne; proprietaire: boolean; agir: Agir; occupe: boolean; suivre: (id: string) => void; notifier: (message: string) => void }) {
  const [ficheClub, setFicheClub] = useState<string | null>(null);
  const monClub = vue.clubs.find(c => c.id === vue.monClubId);
  const mesCartes = vue.cartes.filter(c => c.proprietaire === vue.monClubId);
  const cartesBlesses = mesCartes.filter(c => c.blesseJusqua && c.blesseJusqua > maintenantISO());
  const prochaine = vue.rencontres.find(r => !r.resultat && (r.domicile === vue.monClubId || r.exterieur === vue.monClubId));
  const arriveeEnCoursDeSaison = !prochaine && !vue.classement.some(l => l.clubId === vue.monClubId);
  const moyenne = mesCartes.length ? Math.round(mesCartes.reduce((s, c) => s + c.note, 0) / mesCartes.length) : 0;
  // ⚠️ LE COLLECTIF SE VOIT DEPUIS LE VESTIAIRE, pas seulement depuis l'écran
  // de composition. C'est un chiffre de club au même titre que le GEN moyen :
  // le cacher derrière un onglet, c'est le réserver à ceux qui savent déjà
  // qu'il existe.
  const collectif = collectifCarriere(mesCartes, monClub?.composition ?? COMPOSITION_VIDE);
  return <><div className="cel-grille-bureau"><div className="cel-panneau cel-rendezvous"><div className="eyebrow">{vue.phase === 'salon' ? t('online.dashboard.beforeKickoff') : t('online.dashboard.next')}</div>{vue.phase === 'salon' ? <><h2>{t('online.dashboard.gather')}</h2><p>{t('online.dashboard.lobbyHelp')}</p><Invitation code={vue.code} notifier={notifier} /><div className="cel-actions">{proprietaire && <button className="btn primaire" disabled={occupe || vue.clubs.length < 2} onClick={() => { void agir({ type: 'demarrerSaison' }); }}>{t('online.dashboard.startSeason')}</button>}<small>{t('online.dashboard.registered', { count: vue.clubs.length, max: vue.maxClubs })}{vue.clubs.length < 2 ? ` · ${t('online.dashboard.minimum')}` : ''}</small></div></> : prochaine ? <Rencontre vue={vue} rencontre={prochaine} agir={agir} occupe={occupe} suivre={suivre} grande /> : arriveeEnCoursDeSaison ? <><h2>{t('online.dashboard.joinedBreak')}</h2><p>{t('online.dashboard.joinedBreakHelp')}</p></> : <><h2>{t('online.dashboard.seasonOver')}</h2><p>{t('online.dashboard.seasonOverHelp')}</p>{proprietaire && vue.phase === 'intersaison' && <button className="btn primaire" disabled={occupe} onClick={() => { void agir({ type: 'demarrerSaison' }); }}>{t('online.dashboard.startNextSeason')}</button>}</>}</div><div className="cel-panneau cel-vestiaire"><h2>{t('online.dashboard.clubhouse')}</h2><div className="cel-chiffres"><div><b>{moyenne}</b><span>{t('online.dashboard.average')}</span></div><div><b>{mesCartes.length}</b><span>{t('online.common.players')}</span></div><div><b>{cartesBlesses.length}</b><span>{t('online.common.injured')}</span></div><div className={`cel-chiffre-collectif cel-collectif-${paliersCollectif(collectif.total)}`} title={`${libellePalierCollectif(paliersCollectif(collectif.total))}`}><b>{collectif.total}</b><span>{t('online.dashboard.chemistry')}</span></div></div><div className="cel-raretés">{Object.entries(RARETES).map(([id, label]) => <span key={id} className={`cel-rarete ${id}`}><i />{label}<b>{mesCartes.filter(c => c.rarete === id).length}</b></span>)}</div><div className="cel-identite-club"><Ecusson nom={monClub?.nom ?? ''} logo={monClub?.embleme} /><span><b>{monClub?.nom}</b><small>{t('online.dashboard.badgeLocked')}</small></span></div><p className="cel-note">{t('online.dashboard.growClub')}</p></div></div>{cartesBlesses.length > 0 && <div className="cel-panneau cel-infirmerie"><div className="cel-titre-ligne"><h2><Icone nom="coeur" taille={18} /> {t('online.infirmary.title', { count: cartesBlesses.length })}</h2><span className="cel-badge-blessure-compte">{t('online.infirmary.unavailableCount', { count: cartesBlesses.length })}</span></div><div className="cel-grille-infirmerie">{cartesBlesses.map(c => <article key={c.id} className="cel-carte-infirmerie"><div className="cel-infirmerie-portrait"><span className="cel-infirmerie-icone"><Icone nom="coeur" taille={16} /></span><div><b>{c.nom}</b><small>{nomPoste(c.poste)} · {c.note} GEN · {c.clubReel}</small></div></div><div className="cel-infirmerie-delai"><strong>{t('online.infirmary.timeRemaining', { time: formatTempsBlessureDetaille(c.blesseJusqua!) })}</strong><small>{t('online.infirmary.estimatedReturn', { date: dateHeure(c.blesseJusqua!) })}</small></div></article>)}</div></div>}{proprietaire && <ReglageRythme vue={vue} agir={agir} occupe={occupe} notifier={notifier} />}<div className="cel-grille-bureau"><div className="cel-panneau"><h2>{t('online.dashboard.league')}</h2><Classement vue={vue} onClub={setFicheClub} />{ficheClub && <FicheClubEnLigne vue={vue} clubId={ficheClub} onFermer={() => setFicheClub(null)} />}</div><div className="cel-panneau"><div className="cel-titre-ligne"><h2>{t('online.dashboard.objectives')}</h2><Icone nom="cible" /></div>{vue.objectifs.length ? vue.objectifs.map(o => <div className="cel-objectif" key={o.id}><div><b>{o.libelle}</b><small>{date(o.fin)} · {Math.min(o.progression, o.cible)} / {o.cible}</small></div><span>+{montant(o.recompense)} Ovas</span><progress max={o.cible} value={Math.min(o.progression, o.cible)} /><small>Prime versée automatiquement après le match</small></div>) : <p className="cel-note">{t('online.dashboard.objectivesSoon')}</p>}</div></div></>;
}

function ReglageRythme({ vue, agir, occupe, notifier }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; notifier: (message: string) => void }) {
  const [rythme, setRythme] = useState(vue.rythme);
  useEffect(() => setRythme(vue.rythme), [vue.rythme]);
  const enregistrer = async () => {
    const suivante = await agir({ type: 'modifierRythme', rythme });
    if (suivante) notifier(t('online.pace.saved'));
  };
  return <section className="cel-panneau cel-reglage-rythme">
    <div><div className="eyebrow">{t('online.pace.commissioner')}</div><h2>{t('online.pace.title')}</h2><p>{t('online.pace.help')}</p></div>
    <div className="cel-choix-rythme" role="group" aria-label={t('online.pace.title')}>
      {[1, 2, 3, 4, 5, 6, 7].map(valeur => <button type="button" key={valeur} className={rythme === valeur ? 'actif' : ''} aria-pressed={rythme === valeur} onClick={() => setRythme(valeur)}>{valeur === 7 ? t('online.pace.daily') : t('online.pace.weekly', { count: valeur })}</button>)}
    </div>
    <div className="cel-actions"><button type="button" className="btn primaire" disabled={occupe || rythme === vue.rythme} onClick={() => { void enregistrer(); }}>{t('online.pace.save')}</button><small>{t('online.pace.recovery')}</small></div>
  </section>;
}

function LaboratoireLigue({ vue, agir, occupe, suivre, notifier }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; suivre: (id: string) => void; notifier: (message: string) => void }) {
  const [confirmerReset, setConfirmerReset] = useState(false);
  const executer = async (commande: CommandeCarriere, message: string) => {
    const suivante = await agir(commande);
    if (suivante) notifier(message);
  };
  const rencontres = [...(vue.rencontres ?? [])].sort((a, b) => {
    const etatA = a.match && !a.resultat ? 0 : a.resultat ? 2 : 1;
    const etatB = b.match && !b.resultat ? 0 : b.resultat ? 2 : 1;
    return etatA - etatB || (etatA === 2 ? Date.parse(b.ferme) - Date.parse(a.ferme) : Date.parse(a.ferme) - Date.parse(b.ferme));
  }).slice(0, 18);
  return <div className="cel-laboratoire">
    <section className="cel-panneau cel-laboratoire-entete">
      <div><div className="eyebrow">Espace privé de développement</div><h2>Console de la ligue</h2><p>Tout ce qui est fait ici reste dans ce laboratoire. Lance un match, déplace son horloge ou restaure une saison neuve sans toucher aux vraies ligues.</p></div>
      <div className="cel-laboratoire-outils">
        <button className="btn fantome" disabled={occupe} onClick={() => { void executer({ type: 'laboratoireSoigner' }, 'Tous les effectifs sont frais et disponibles.'); }}><Icone nom="coeur" taille={17} />Soigner tous les joueurs</button>
        <button className="btn fantome" disabled={occupe} onClick={() => { void executer({ type: 'laboratoireCrediter' }, '100 000 Ovas de test ajoutés.'); }}><Icone nom="ajouter" taille={17} />Ajouter 100 000 Ovas</button>
        <button className="btn danger" disabled={occupe} onClick={() => setConfirmerReset(true)}><Icone nom="corbeille" taille={17} />Remettre à zéro</button>
      </div>
    </section>
    <ReglageRythme vue={vue} agir={agir} occupe={occupe} notifier={notifier} />
    <BancDessaiSituations />
    <section className="cel-panneau">
      <div className="cel-titre-ligne"><div><div className="eyebrow">Pilotage en direct</div><h2>Matchs de la saison</h2></div><small>{(vue.rencontres ?? []).filter(r => r.resultat).length} joué(s)</small></div>
      <div className="cel-laboratoire-matchs">{rencontres.map(r => {
        const enDirect = Boolean(r.match && !r.resultat && !r.match.termine);
        const minute = r.match?.horloge ?? 0;
        return <article className={`cel-laboratoire-match${enDirect ? ' actif' : ''}`} key={r.id}>
          <div className="cel-laboratoire-affiche"><small>{vue.competitions.find(c => c.id === r.competitionId)?.nom} · J{r.journee}</small><b>{nomClub(vue, r.domicile)} <span>{r.resultat ? `${r.resultat.pointsD} – ${r.resultat.pointsE}` : r.match ? `${r.match.score.domicile} – ${r.match.score.exterieur}` : 'contre'}</span> {nomClub(vue, r.exterieur)}</b>{enDirect && <em>En direct · {Math.floor(minute)}′</em>}</div>
          <div className="cel-laboratoire-commandes">
            {!r.resultat && !r.match && <button className="btn primaire" disabled={occupe} onClick={() => { void executer({ type: 'laboratoireLancer', matchId: r.id }, 'Le match est lancé.'); }}>Lancer maintenant</button>}
            {enDirect && <>
              <button className="btn fantome" disabled={occupe} onClick={() => suivre(r.id)}><Icone nom="oeil" taille={16} />Ouvrir le direct</button>
              {[10, 40, 60, 79].map(cible => <button className="btn fantome cel-minute-test" key={cible} disabled={occupe || minute >= cible} onClick={() => { void executer({ type: 'laboratoireMinute', matchId: r.id, minute: cible }, `Match avancé à la ${cible}e minute.`); }}>{cible}′</button>)}
              <button className="btn primaire" disabled={occupe} onClick={() => { void executer({ type: 'laboratoireTerminer', matchId: r.id }, 'Match terminé et résultat enregistré.'); }}>Terminer</button>
            </>}
            {r.resultat && r.match && <button className="btn fantome" disabled={occupe} onClick={() => suivre(r.id)}><Icone nom="oeil" taille={16} />Revoir</button>}
          </div>
        </article>;
      })}</div>
    </section>
    {confirmerReset && <Confirmation titre="Remettre le laboratoire à zéro ?" message="La saison, les résultats, les cartes et les réglages actuels seront remplacés par un laboratoire neuf. Cette action ne touche aucune autre ligue." libelleOui="Créer un laboratoire neuf" onNon={() => setConfirmerReset(false)} onOui={() => { setConfirmerReset(false); void executer({ type: 'laboratoireReinitialiser' }, 'Le laboratoire est de nouveau prêt.'); }} />}
  </div>;
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
  if (!vue.classement.length) return <p className="cel-note">{t('online.table.pending')}</p>;
  const joue = vue.classement.some(l => l.joues > 0);
  const nombrePlayoffs = vue.playoffs && vue.classement.length >= 4
    ? Math.min(vue.classement.length, Math.max(4, 2 ** Math.floor(Math.log2(vue.classement.length / 2))))
    : 0;

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
      const qualifiePlayoff = i < nombrePlayoffs;
      return <tr key={l.clubId} className={`${l.clubId === vue.monClubId ? 'moi ' : ''}${qualifiePlayoff ? 'qualifie-playoff' : ''}`}>
        <td><b>{i + 1}</b>{qualifiePlayoff && <i className="cel-statut-qualif playoff" title="Qualifié pour les play-offs">PO</i>}</td>
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
    {nombrePlayoffs > 0 && <p className="cel-note"><b>PO</b> Qualifié pour les play-offs (les {nombrePlayoffs} premiers se disputent le titre en phase finale).</p>}
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
        <button className="btn fantome" onClick={onFermer}><Icone nom="croix" taille={15} /> {t('online.common.close')}</button>
      </header>

      {ligne && ligne.joues > 0 && <div className="cel-chiffres cel-fiche-chiffres">
        <div><b>{ligne.points}</b><span>points</span></div>
        <div><b>{ligne.gagnes}</b><span>victoires</span></div>
        <div><b>{ligne.pour}</b><span>marqués</span></div>
        <div><b>{ligne.contre}</b><span>encaissés</span></div>
      </div>}

      {rencontres.length > 0 && <><h3 className="cel-sous-titre">{t('online.club.results')}</h3>
        <div className="cel-fiche-resultats">{rencontres.map(r => {
          const chezMoi = r.domicile === clubId;
          const pour = chezMoi ? r.resultat!.pointsD : r.resultat!.pointsE;
          const contre = chezMoi ? r.resultat!.pointsE : r.resultat!.pointsD;
          return <span key={r.id} className={pour > contre ? 'V' : pour === contre ? 'N' : 'D'}>
            <small>{chezMoi ? 'reçoit' : 'à'} {nomClub(vue, chezMoi ? r.exterieur : r.domicile)}</small>
            <b>{pour} – {contre}</b>
          </span>;
        })}</div></>}

      {titres.length > 0 && <><h3 className="cel-sous-titre">{t('online.club.honours')}</h3>
        <div className="cel-fiche-titres">{titres.map((h, i) => <span key={i}><Icone nom="trophee" taille={16} />{h.trophee} <small>saison {h.saison}</small></span>)}</div></>}

      <h3 className="cel-sous-titre">{t('online.club.squad')}</h3>
      <div className="cel-grille-cartes">{cartes.map(c => <CarteJoueurEnLigne key={c.id} carte={c} logoClub={logos.get(c.clubReel)} />)}</div>
    </div>
  </div>;
}

function nomTour(index: number, total: number, taillePremier = 2 ** Math.max(0, total - 1)): string {
  if (index === 0 && taillePremier !== 2 ** Math.max(0, total - 1)) return t('online.cup.preliminary');
  const restant = total - index;
  if (restant === 1) return t('online.cup.final');
  if (restant === 2) return t('online.cup.semiFinals');
  if (restant === 3) return t('online.cup.quarterFinals');
  if (restant === 4) return t('online.cup.roundOf16');
  return index === 0 ? t('online.cup.preliminary') : t('online.cup.round', { n: index + 1 });
}

function matchsParTour(nombreParticipants: number): number[] {
  const tours: number[] = [];
  let restants = Math.max(0, nombreParticipants);
  while (restants > 1) {
    const matchs = Math.floor(restants / 2);
    tours.push(matchs);
    restants -= matchs;
  }
  return tours;
}

function nomEtapeCompetition(
  competition: VueCarriereEnLigne['competitions'][number] | undefined,
  journee: number,
): { titreCourt: string; titreComplet: string; estPlayoff: boolean; estElimination: boolean } {
  if (!competition) {
    return { titreCourt: `J${journee}`, titreComplet: t('online.cup.matchday', { n: journee }), estPlayoff: false, estElimination: false };
  }

  if (competition.format === 'elimination') {
    const totalTours = matchsParTour(competition.participants.length).length;
    const index = Math.max(0, journee - 1);
    const nom = nomTour(index, totalTours);
    return { titreCourt: nom, titreComplet: nom, estPlayoff: false, estElimination: true };
  }

  if (competition.format === 'poules') {
    const debutTableau = (competition.journeesRegulieres ?? 0) + 1;
    if (journee < debutTableau) {
      return {
        titreCourt: `Poule · J${journee}`,
        titreComplet: t('online.cup.groupsMatchday', { n: journee }),
        estPlayoff: false,
        estElimination: false,
      };
    }
    const totalTours = matchsParTour(competition.qualifies ?? 2).length;
    const index = Math.max(0, journee - debutTableau);
    const nom = nomTour(index, totalTours);
    return {
      titreCourt: nom,
      titreComplet: t('online.cup.knockoutStage', { name: nom }),
      estPlayoff: false,
      estElimination: true,
    };
  }

  // Championnat
  if (competition.playoffs && competition.journeesRegulieres && journee > competition.journeesRegulieres) {
    const debutPlayoffs = competition.journeesRegulieres + 1;
    const nombre = Math.min(competition.participants.length, Math.max(4, 2 ** Math.floor(Math.log2(competition.participants.length / 2))));
    const totalTours = matchsParTour(nombre).length;
    const index = Math.max(0, journee - debutPlayoffs);
    const nom = nomTour(index, totalTours);
    return {
      titreCourt: `Play-offs · ${nom}`,
      titreComplet: t('online.cup.playoffsTitle', { name: nom }),
      estPlayoff: true,
      estElimination: true,
    };
  }

  return {
    titreCourt: t('online.cup.matchday', { n: journee }),
    titreComplet: t('online.cup.matchday', { n: journee }),
    estPlayoff: false,
    estElimination: false,
  };
}

function Rencontre({ vue, rencontre: r, occupe, suivre, grande = false }: { vue: VueCarriereEnLigne; rencontre: VueRencontre; agir: Agir; occupe: boolean; suivre: (id: string) => void; grande?: boolean }) {
  const moi = r.domicile === vue.monClubId || r.exterieur === vue.monClubId;
  const ouverte = Date.parse(r.ferme) - Date.now() <= 120_000;
  const domicile = vue.clubs.find(c => c.id === r.domicile);
  const exterieur = vue.clubs.find(c => c.id === r.exterieur);
  const comp = vue.competitions.find(c => c.id === r.competitionId);
  const etape = nomEtapeCompetition(comp, r.journee);

  const scorePrincipal = r.resultat
    ? `${r.resultat.pointsD} – ${r.resultat.pointsE}`
    : r.match
      ? `${r.match.score.domicile} – ${r.match.score.exterieur}`
      : 'VS';

  return <article className={`cel-rencontre${grande ? ' grande' : ''}${etape.estPlayoff ? ' playoff' : ''}`}>
    <div className="cel-rencontre-date">
      <span className={`cel-badge-etape${etape.estPlayoff ? ' playoff' : etape.estElimination ? ' elimination' : ''}`}>
        {etape.titreCourt.toUpperCase()}
      </span>
      <span className="cel-date-point">·</span>
      <span>{dateHeure(r.ferme)}</span>
      {r.match && !r.match.termine && <b className="cel-direct-label"> EN DIRECT · {r.match.minute}′</b>}
    </div>
    <div className="cel-affiche">
      <span className="cel-equipe-affiche"><b>{nomClub(vue, r.domicile)}</b><span className="cel-blason-affiche"><Ecusson nom={nomClub(vue, r.domicile)} logo={domicile?.embleme} /></span></span>
      <div className="cel-score-principal">
        <strong>{scorePrincipal}</strong>
        {r.resultat?.tab && r.resultat.tirsAuBut && (
          <small className="cel-mention-score tab">({r.resultat.tirsAuBut.tirsD} - {r.resultat.tirsAuBut.tirsE} tab)</small>
        )}
        {r.resultat?.ap && !r.resultat.tab && (
          <small className="cel-mention-score ap">après prol.</small>
        )}
      </div>
      <span className="cel-equipe-affiche"><b>{nomClub(vue, r.exterieur)}</b><span className="cel-blason-affiche"><Ecusson nom={nomClub(vue, r.exterieur)} logo={exterieur?.embleme} /></span></span>
    </div>
    {r.match ? <button className="btn fantome" onClick={() => suivre(r.id)}>{r.match.termine ? t('online.match.watch') : t('online.match.join')}<Icone nom="fleche-droite" taille={15} /></button> : !r.resultat && moi ? <button className="btn primaire" disabled={occupe || !ouverte} onClick={() => suivre(r.id)}>{ouverte ? t('online.match.join') : '−2 min'}</button> : null}
  </article>;
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
//
// ⚠️ ET LA RENCONTRE DURE VRAIMENT QUATRE-VINGTS MINUTES. Une minute de jeu
// vaut une minute de vie : on ouvre l'onglet, on regarde une phase, on part
// faire autre chose, on revient à la 63ᵉ. C'est ce qui donne son prix à une
// décision — elle se prend une fois, à l'instant où elle se pose.

/** Le chronomètre du stade, en minutes et secondes de jeu. */
const chrono = (minutes: number) => {
  const total = Math.max(0, Math.min(80 * 60, Math.round(minutes * 60)));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Ce que le fil dit d'un ordre venu de mon banc.
 *
 * ⚠️ ON DISTINGUE CE QUE J'AI FAIT DE CE QUE MON ADJOINT A FAIT À MA PLACE. Une
 * décision laissée sans réponse est tranchée par l'IA d'après les consignes
 * enregistrées ; elle entre au journal comme les miennes, parce que la rejoue en
 * a besoin. Écrire « Tu prends les trois points » à un manager parti chercher un
 * café lui apprendrait qu'il a fait un choix qu'il n'a pas fait.
 */
const libelleOrdreFil = (ordre: OrdreFil, auto: boolean): string => {
  const cle = `online.order.${ordre}.${auto ? 'auto' : 'user'}`;
  return t(cle);
};

/**
 * Huit teintes de maillot — et AUCUNE dans le vert.
 *
 * ⚠️ LA PELOUSE OCCUPE DÉJÀ UNE TEINTE, ET C'EST LA PLUS GRANDE SURFACE DE
 * L'ÉCRAN. Une roue de couleurs tirée librement finit un jour sur un maillot
 * vert : mesuré en jeu, l'équipe visiteuse s'est retrouvée à quinze pastilles
 * vertes sur un terrain vert, invisibles. Le vert (95° à 165°) est donc absent
 * de la liste, comme il l'est des maillots dans un vrai stade à pelouse.
 */
const COULEURS_MAILLOT = ['#d94155', '#df733c', '#d6a832', '#2f8fc1', '#365fbe', '#7955bd', '#b64eaa', '#d34b82'];

/**
 * Les deux couleurs de maillot du direct.
 *
 * ⚠️ ELLES SONT SÉPARÉES DE FORCE. Une ligue entre amis n'a pas de couleurs de
 * club — chacun choisit un écusson, pas un maillot. Deux teintes voisines et
 * les trente pastilles deviennent un seul nuage : on ne sait plus qui attaque.
 * Deux clubs qui tomberaient sur des teintes proches sont donc écartés d'un
 * demi-tour de la liste.
 */
function couleursDirect(idDomicile: string, idExterieur: string): CouleursDirect {
  const rang = (id: string) => {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    return (h >>> 0) % COULEURS_MAILLOT.length;
  };
  const a = rang(idDomicile);
  let b = rang(idExterieur);
  const ecart = Math.abs(a - b);
  if (Math.min(ecart, COULEURS_MAILLOT.length - ecart) < 2) b = (a + 4) % COULEURS_MAILLOT.length;
  const domicile = COULEURS_MAILLOT[a], exterieur = COULEURS_MAILLOT[b];
  return { domicile, exterieur, maillots: {
    domicile: maillotDeSecours(domicile, idDomicile),
    exterieur: maillotDeSecours(exterieur, idExterieur),
  } };
}

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
    const signaler = () => { void signalerPresenceCarriere(vue.id, matchId); };
    const battement = setInterval(signaler, 12_000);
    signaler();
    return () => clearInterval(battement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, enCours]);

  // ⚠️ LE CHRONO NE PEUT PAS ATTENDRE LE SERVEUR. Il ne répond que toutes les
  // deux secondes : un chrono qui avance par bonds de deux secondes montre
  // l'attente au lieu de la cacher. On l'ancre sur le dernier relevé, on le
  // fait courir en local, et le relevé suivant recale. Le compte à rebours de
  // la décision tourne sur le même battement.
  const [, battement] = useState(0);
  useEffect(() => { const t = setInterval(() => battement(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const horlogeServeur = m?.horloge ?? 0;
  const ancre = useRef({ horloge: horlogeServeur, recu: Date.now() });
  useEffect(() => { ancre.current = { horloge: horlogeServeur, recu: Date.now() }; }, [horlogeServeur]);
  const couleursSecours = useMemo(() => couleursDirect(r.domicile, r.exterieur), [r.domicile, r.exterieur]);
  const emblemeDomicile = vue.clubs.find(c => c.id === r.domicile)?.embleme;
  const emblemeExterieur = vue.clubs.find(c => c.id === r.exterieur)?.embleme;
  const [couleurs, setCouleurs] = useState(couleursSecours);
  useEffect(() => {
    let actif = true;
    setCouleurs(couleursSecours);
    const baseD = couleursSecours.maillots!.domicile, baseE = couleursSecours.maillots!.exterieur;
    void Promise.all([
      maillotDepuisBlason(emblemeDomicile, baseD, r.domicile),
      maillotDepuisBlason(emblemeExterieur, baseE, r.exterieur),
    ]).then(([domicile, exterieur]) => {
      if (actif) setCouleurs({ domicile: domicile.principal, exterieur: exterieur.principal, maillots: { domicile, exterieur } });
    });
    return () => { actif = false; };
  }, [couleursSecours, emblemeDomicile, emblemeExterieur, r.domicile, r.exterieur]);

  if (!m) return <><button className="btn fantome" onClick={fermer}>{t('online.common.close')}</button><Vide icone="chrono" titre={t('online.match.teamsEntering')}>{t('online.match.kickoffAt', { date: dateHeure(r.ferme) })}</Vide></>;
  const strategie = m.maStrategie ?? STRATEGIE_VIDE;
  const changer = <K extends keyof StrategieEnLigne>(cle: K, valeur: string) => {
    void agir({ type: 'match', matchId, action: { type: 'strategie', strategie: { ...strategie, [cle]: valeur } as StrategieEnLigne } });
  };
  const mien = m.monCote === 'domicile' ? 'domicile' : 'exterieur';
  const restants = 8 - m.remplacementsFaits;
  // Une décision en attente gèle le chrono du serveur : l'écran le gèle aussi,
  // sinon il continuerait de courir pendant qu'on réfléchit.
  const gele = m.gele ?? Boolean(m.decision);
  const minuteVive = m.termine ? 80
    : Math.min(80, ancre.current.horloge + (gele ? 0 : (Date.now() - ancre.current.recu) / 60_000));
  const resteDecision = m.decision
    ? Math.max(0, Math.min(20, Math.ceil((m.decision.jusqua - Date.now()) / 1000)))
    : 0;

  return <div className="cel-direct cel-direct-cinema">
    <div className="cel-tableau-bord">
      <button className="btn fantome cel-quitter" onClick={fermer}><Icone nom="croix" taille={15} /> {t('online.common.close')}</button>
      <div className="cel-score-direct">
        <div className={`cel-camp${m.monCote === 'domicile' ? ' moi' : ''}`}><Ecusson nom={nomClub(vue, r.domicile)} logo={vue.clubs.find(c => c.id === r.domicile)?.embleme} /><b>{nomClub(vue, r.domicile)}</b><small>{m.essais.domicile} {t('ml.essais')}</small></div>
        <div className="cel-chrono"><strong>{m.score.domicile} <em>–</em> {m.score.exterieur}</strong><span className={m.termine ? '' : gele ? 'gele' : 'bat'}>{m.termine ? t('online.match.finished') : chrono(minuteVive)}</span></div>
        <div className={`cel-camp${m.monCote === 'exterieur' ? ' moi' : ''}`}><Ecusson nom={nomClub(vue, r.exterieur)} logo={vue.clubs.find(c => c.id === r.exterieur)?.embleme} /><b>{nomClub(vue, r.exterieur)}</b><small>{m.essais.exterieur} {t('ml.essais')}</small></div>
      </div>
      <div className="cel-jauge-possession" title={t('online.stats.possession')}><i style={{ width: `${m.stats.domicile.possession}%` }} /><span>{m.stats.domicile.possession}% {t('online.stats.possession').toLowerCase()} {m.stats.exterieur.possession}%</span></div>
      {m.signalAdverse && <p className="cel-signal"><Icone nom="oeil" taille={17} />{signalTexte(m.signalAdverse)}</p>}
    </div>

    <DirectCinema match={m} domicile={nomClub(vue,r.domicile)} exterieur={nomClub(vue,r.exterieur)} couleurs={couleurs}
      emblemes={{ domicile: emblemeDomicile, exterieur: emblemeExterieur }} />
    {!vue.observateur && <details><summary>{t('online.match.alerts')}</summary><NotificationsMatch ligue={vue.id} /></details>}

    {/* ⚠️ ON N'EST RÉVEILLÉ QUE DANS LES 50 MÈTRES ADVERSES (`METRES_DECISION`).
        Le serveur ne propose plus une décision sur chacune des vingt-quatre
        pénalités d'un match — à soixante-dix mètres des poteaux, « je prends
        les points ? » n'est pas une question — mais sur les six ou sept qui se
        jouent dans la zone où le choix compte vraiment. */}
    {m.decision && <div className="cel-decision" role="alertdialog" aria-label={t('online.match.penaltyDecision')}>
      <div className="eyebrow">{m.decision.horloge >= 1 ? `${Math.floor(m.decision.horloge)}ᵉ minute` : 'Pénalité'} · {m.score.domicile} – {m.score.exterieur} · {t('online.decision.clockStopped')}</div>
      <h2>{t('online.decision.penaltyAtMeters', { dist: m.decision.distance })}</h2>
      <p>{t('online.decision.kickerStats', { name: m.decision.buteur, pct: m.decision.probabilite })}{m.decision.aPortee ? '' : t('online.decision.beyondRange')}</p>
      <div className="cel-decision-choix">
        <button className="btn primaire" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'points' } }); }}><Icone nom="cible" taille={19} />{t('online.penalties.points')}</button>
        <button className="btn" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'touche' } }); }}><Icone nom="drapeau" taille={19} />{t('online.penalties.touche')}</button>
        <button className="btn" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'rapide' } }); }}><Icone nom="eclair" taille={19} />{t('online.penalties.rapide')}</button>
        <button className="btn" disabled={occupe} onClick={() => { void agir({ type: 'match', matchId, action: { type: 'decision', choix: 'melee' } }); }}><Icone nom="pousse" taille={19} />{t('online.penalties.melee')}</button>
      </div>
      <div className="cel-sablier" aria-hidden><i style={{ width: `${(resteDecision / 20) * 100}%` }} /></div>
      <small>{t('online.decision.secondsLeft', { sec: resteDecision })}</small>
    </div>}

    <nav className="cel-onglets secondaires">{([['fil', t('online.match.log')], ['consignes', t('online.lineup.instructions')], ['banc', t('online.match.bench')], ['stats', t('online.match.stats')]] as const).map(([id, label]) =>
      <button key={id} className={ongletDirect === id ? 'actif' : ''} onClick={() => setOngletDirect(id)}>{label}</button>)}</nav>

    {ongletDirect === 'fil' && <div className="cel-panneau cel-fil-match">{m.fil.length ? [...m.fil].reverse().map((l, i) => <p key={`${l.minute}-${i}`} className={`cel-ligne-fil ${l.type}${l.cote === mien ? ' moi' : ''}`}><b>{l.minute}′</b><span>{l.ordre ? libelleOrdreFil(l.ordre, Boolean(l.auto)) : l.texte}</span>{l.points ? <em>+{l.points}</em> : null}</p>) : <p className="cel-note">{t('online.match.started')}</p>}</div>}

    {ongletDirect === 'consignes' && (m.monCote ? <div className="cel-panneau cel-consignes">
      <p className="cel-note">{t('online.tactics.engineImpactNote')}</p>
      <div className="cel-grille-consignes">
        <Choix label={t('online.tactics.mentality')} valeur={strategie.mentalite} options={obtenirMentalites()} onChange={v => changer('mentalite', v)} />
        <Choix label={t('online.tactics.game')} valeur={strategie.jeu} options={obtenirJeux()} onChange={v => changer('jeu', v)} />
        <Choix label={t('online.tactics.rhythm')} valeur={strategie.rythme} options={obtenirRythmes()} onChange={v => changer('rythme', v)} />
        <Choix label={t('online.tactics.defense')} valeur={strategie.defense} options={obtenirDefenses()} onChange={v => changer('defense', v)} />
        <Choix label={t('online.tactics.rucks')} valeur={strategie.rucks} options={obtenirRucks()} onChange={v => changer('rucks', v)} />
        <Choix label={t('online.tactics.risk')} valeur={strategie.risqueOffensif} options={obtenirRisques()} onChange={v => changer('risqueOffensif', v)} />
        <Choix label={t('online.tactics.kicking')} valeur={strategie.frequencePied} options={obtenirFrequencesPied()} onChange={v => changer('frequencePied', v)} />
        <Choix label={t('online.tactics.lead65')} valeur={strategie.gestionAvance} options={obtenirGestionAvance()} onChange={v => changer('gestionAvance', v)} />
      </div>
    </div> : <div className="cel-panneau"><p className="cel-note">{t('online.tactics.spectatorNote')}</p></div>)}

    {ongletDirect === 'banc' && (m.monCote ? <div className="cel-panneau cel-banc">
      <div className="cel-titre-ligne"><h2>{t('online.match.substitutions')}</h2><small>{restants}</small></div>
      <p className="cel-note">{sortant ? t('online.match.subIn') : t('online.match.subOut')}</p>
      <div className="cel-deux">
        <div><h3>{t('online.match.pitch')}</h3><div className="cel-liste-pions">{m.surLeTerrain.map(p => <button key={p.carteId} className={sortant === p.carteId ? 'actif' : ''} onClick={() => setSortant(sortant === p.carteId ? '' : p.carteId)}><b>{p.numero}</b>{p.nom}<small>{nomPoste(p.poste)}</small></button>)}</div></div>
        <div><h3>{t('online.match.bench')}</h3><div className="cel-liste-pions">{m.surLeBanc.length ? m.surLeBanc.map(p => <button key={p.carteId} disabled={!sortant || occupe || restants <= 0} onClick={async () => { await agir({ type: 'match', matchId, action: { type: 'remplacement', sortantId: sortant, entrantId: p.carteId } }); setSortant(''); }}><b>{p.numero}</b>{p.nom}<small>{nomPoste(p.poste)}</small></button>) : <p className="cel-note">—</p>}</div></div>
      </div>
    </div> : <div className="cel-panneau"><p className="cel-note">{t('online.match.onlyCoachCanSub')}</p></div>)}

    {ongletDirect === 'stats' && <div className="cel-panneau"><div className="cel-table-scroll"><table className="cel-table"><thead><tr><th>{t('online.stats.statistic')}</th><th>{nomClub(vue, r.domicile)}</th><th>{nomClub(vue, r.exterieur)}</th></tr></thead><tbody>
      {([
        [t('online.stats.possession'), `${m.stats.domicile.possession} %`, `${m.stats.exterieur.possession} %`],
        [t('online.stats.tries'), m.essais.domicile, m.essais.exterieur],
        [t('online.stats.penaltiesScored'), m.penalites.domicile, m.penalites.exterieur],
        [t('online.stats.kicksAttempted'), m.stats.domicile.penalitesTentees, m.stats.exterieur.penalitesTentees],
        [t('online.stats.tackles'), m.stats.domicile.plaquages, m.stats.exterieur.plaquages],
        [t('online.stats.metersGained'), m.stats.domicile.metres, m.stats.exterieur.metres],
        [t('online.stats.turnoversWon'), m.stats.domicile.turnovers, m.stats.exterieur.turnovers],
        [t('online.stats.cards'), m.stats.domicile.cartons, m.stats.exterieur.cartons],
      ] as const)
        .map(([label, a, b]) => <tr key={label}><th>{label}</th><td>{a}</td><td>{b}</td></tr>)}
    </tbody></table></div>
      {m.feuille && <><h3 className="cel-sous-titre">{t('online.stats.matchSheet')}</h3><div className="cel-table-scroll"><table className="cel-table"><thead><tr><th>#</th><th>{t('online.stats.player')}</th><th>{t('online.stats.minutes')}</th><th>{t('online.stats.tries')}</th><th>{t('online.stats.tackles')}</th><th>{t('online.stats.metersGained')}</th></tr></thead><tbody>{m.feuille.map(l => <tr key={`${l.cote}-${l.numero}-${l.nom}`}><td>{l.numero}</td><th>{l.nom} <small>{l.cote === 'domicile' ? nomClub(vue, r.domicile) : nomClub(vue, r.exterieur)}</small></th><td>{l.minutes}</td><td>{l.essais}</td><td>{l.plaquages}</td><td>{l.metres}</td></tr>)}</tbody></table></div></>}
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

export function Composition({ vue, agir, occupe, erreur = '' }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; erreur?: string }) {
  const [vueEtendue, setVueEtendue] = useState(true);
  const [consignesOuvertes, setConsignesOuvertes] = useState(false);
  const [nomEquipe, setNomEquipe] = useState('');
  const [filtreChampionnat, setFiltreChampionnat] = useState('');
  const [filtreClub, setFiltreClub] = useState('');
  const [filtrePays, setFiltrePays] = useState('');
  const [filtrePoste, setFiltrePoste] = useState('');
  const club = vue.clubs.find(c => c.id === vue.monClubId);
  const cartes = useMemo(() => vue.cartes.filter(c => c.proprietaire === vue.monClubId), [vue.cartes, vue.monClubId]);
  const effectifComplet = useMemo(() => cartes.map(carteEnJoueur), [cartes]);
  const indisponibles = useMemo(() => new Set(cartes.filter(c => c.blesseJusqua && c.blesseJusqua > maintenantISO()).map(c => c.id)), [cartes]);
  const effectif = useMemo(() => effectifComplet.filter(j => !indisponibles.has(j.id)), [effectifComplet, indisponibles]);
  const etats = useMemo(() => new Map<string, EtatDuJoueur>(cartes.map(c => [c.id, {
    fatigue: c.fatigue, condition: Math.max(0, 100 - c.fatigue),
    blesse: Boolean(c.blesseJusqua && c.blesseJusqua > maintenantISO()),
    tempsBlessure: c.blesseJusqua && c.blesseJusqua > maintenantISO() ? formatTempsBlessure(c.blesseJusqua) : undefined,
  }])), [cartes]);
  const [brouillon, setBrouillon] = useState<CompositionManager | null>(null);
  // ⚠️ LA FEUILLE VIDE EST UNE CONSTANTE, PAS UN LITTÉRAL. Recréée à chaque
  // rendu, elle changeait d'identité en permanence : le calcul du collectif
  // (`useMemo`) se refaisait pour rien à chaque frappe.
  const composition = useMemo(
    () => brouillon ?? club?.composition ?? COMPOSITION_VIDE,
    [brouillon, club?.composition],
  );
  const strategie = club?.strategie ?? STRATEGIE_VIDE;
  const modifie = brouillon !== null;
  const optimale = useMemo(() => meilleureComposition(cartes, Date.now()), [cartes]);
  const optionsFiltre = (cle: 'championnat' | 'clubReel' | 'pays') => [...new Set(cartes.map(c => c[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const reservesVisibles = useMemo(() => new Set(cartes.filter(c =>
    (!filtreChampionnat || c.championnat === filtreChampionnat) && (!filtreClub || c.clubReel === filtreClub)
    && (!filtrePays || c.pays === filtrePays) && (!filtrePoste || c.poste === filtrePoste),
  ).map(c => c.id)), [cartes, filtreChampionnat, filtreClub, filtrePays, filtrePoste]);
  const sauvegardees = club?.compositionsSauvegardees ?? [];

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
  // ⚠️ LE MÊME MODULE QUE LE SERVEUR. `lancerRencontre` appelle exactement
  // cette fonction pour préparer le match : ce que l'écran annonce est ce qui
  // entrera sur le terrain, et il n'y a qu'une formule à faire évoluer.
  const collectif = useMemo(() => collectifCarriere(cartes, composition), [cartes, composition]);

  if (cartes.length < 23) return <Vide icone="equipe" titre={t('online.squad.tooShortTitle')}>{t('online.squad.tooShortHelp')}</Vide>;

  // ⚠️ UN SEUL BLOC, PAS UN FRAGMENT. Les trois morceaux de l’onglet (la barre
  // du haut, la feuille, les consignes) étaient trois enfants directs de `.cel` :
  // impossible alors de dire « la feuille prend ce qui reste de la fenêtre ».
  // Regroupés ici, ils forment la colonne qui tient dans l’écran.
  return <section className={`cel-compo${vueEtendue ? ' cel-compo-etendue' : ''}`}>
    <section className="cel-panneau cel-tete-compo">
      <button className="btn" aria-pressed={vueEtendue} onClick={() => setVueEtendue(!vueEtendue)}>{vueEtendue ? t('online.lineup.viewCompact') : t('online.lineup.viewFull')}</button>
      <button className="btn" aria-expanded={consignesOuvertes} onClick={() => setConsignesOuvertes(!consignesOuvertes)}>{t('online.lineup.instructionsBtn')}</button>
      {/* ⚠️ LES DEUX CHIFFRES D’ABORD, LA PHRASE ENSUITE. Sur téléphone,
          l’en-tête se lit de haut en bas : la note du XV et le collectif
          se retrouvaient sous trois lignes d’explication, donc hors écran.
          Ce sont pourtant les deux seules valeurs qu’on vient voir. */}
      <div className="cel-chiffres-compo">
        <div className="cel-note-compo"><b>{noteXV.toFixed(1)}</b><span>{t('online.lineup.xvRating')}</span></div>
        {/* ⚠️ UNE BARRE, ET RIEN AUTOUR. Trois versions ont été nécessaires : un
            pavé encadré avec le palier écrit et trois lignes de règle, puis la
            même chose sans le texte, puis ceci. Demandé en jeu, dans l’ordre —
            « retire le texte en dessous, fait juste une barre », puis « rends-la
            plus petite, juste une barre à côté de la note, pas aussi gros, pas
            avec un rectangle autour ». Le chiffre reste, en petit ; le palier et
            la règle vivent dans le `title`. */}
        <div className={`cel-collectif cel-collectif-${paliersCollectif(collectif.total)}`}
          title={`Collectif ${collectif.total}/100 — ${libellePalierCollectif(paliersCollectif(collectif.total))}.`}>
          <span>{t('online.lineup.chemistry')}</span>
          <div className="cel-collectif-jauge"><i style={{ width: `${collectif.total}%` }} /></div>
          <b>{collectif.total}</b>
        </div>
      </div>
      <div><div className="eyebrow">{composition.titulaires.length + composition.remplacants.length} / {cartes.length}</div><h2>{t('online.lineup.title')}</h2><p>{t('online.lineup.captainKickerHelp')}</p></div>
      <button className="btn" disabled={occupe || !optimale} onClick={() => { if (optimale) setBrouillon(optimale); }}>{t('online.lineup.best')}</button>
      <button className="btn primaire" disabled={occupe || !modifie} onClick={async () => { const v = await agir({ type: 'composition', composition }); if (v) setBrouillon(null); }}>{modifie ? t('compoSolo.saveBtn') : t('compoSolo.savedBtn')}</button>
    </section>
    {vueEtendue && erreur && <div className="cel-erreur cel-erreur-compo" role="alert"><Icone nom="alerte" taille={20} /><p>{erreur}</p></div>}
    <div className="cel-outils-compo">
      <button
        type="button"
        className="btn primaire cel-btn-assembler"
        disabled={occupe || !optimale}
        onClick={() => { if (optimale) setBrouillon(optimale); }}
        title={t('compoSolo.buildBestHelp')}
      >
        <Icone nom="eclair" taille={16} />
        <span>{t('compoSolo.buildBest')}</span>
      </button>

      <details className="cel-details-outils">
        <summary className="btn cel-btn-outil">
          <Icone nom="disquette" taille={15} />
          <span>{t('compoSolo.savedTeams', { n: sauvegardees.length })}</span>
          <Icone nom="chevron" taille={13} className="cel-outil-chevron" />
        </summary>
        <div className="cel-outils-contenu">
          <p className="cel-note">{t('online.lineup.loadTeamHelp')}</p>
          <div className="cel-actions"><input aria-label={t('compoSolo.teamPlaceholder')} maxLength={40} placeholder={t('compoSolo.teamPlaceholder')} value={nomEquipe} onChange={e => setNomEquipe(e.target.value)} />
            <button type="button" className="btn" disabled={occupe || nomEquipe.trim().length < 2 || sauvegardees.length >= 15} onClick={async () => { const v = await agir({ type: 'sauvegarderComposition', nom: nomEquipe.trim(), composition }); if (v) setNomEquipe(''); }}>{t('compoSolo.saveTeamBtn')}</button></div>
          {sauvegardees.map(equipe => <div className="cel-equipe-sauvegardee" key={equipe.id}><span>{equipe.nom}</span>
            <button type="button" className="btn" disabled={occupe} onClick={() => setBrouillon(structuredClone(equipe.composition))}>{t('compoSolo.loadTeamBtn')}</button>
            <button type="button" className="btn fantome" disabled={occupe} onClick={() => { void agir({ type: 'supprimerComposition', id: equipe.id }); }} aria-label={`Supprimer ${equipe.nom}`}>{t('compoSolo.deleteTeamBtn')}</button></div>)}
        </div>
      </details>

      <details className="cel-details-outils">
        <summary className="btn cel-btn-outil">
          <Icone nom="loupe" taille={15} />
          <span>{t('compoSolo.filterReserves')}</span>
          <Icone nom="chevron" taille={13} className="cel-outil-chevron" />
        </summary>
        <div className="cel-outils-contenu cel-filtres-reserves">
          <Choix label={t('compoSolo.competition')} valeur={filtreChampionnat} options={[["", t('compoSolo.allFeminine')], ...optionsFiltre('championnat').map(v => [v, v] as [string, string])]} onChange={v => { setFiltreChampionnat(v); setFiltreClub(''); }} />
          <Choix label={t('compoSolo.club')} valeur={filtreClub} options={[["", t('compoSolo.allMasculine')], ...optionsFiltre('clubReel').filter(v => !filtreChampionnat || cartes.some(c => c.clubReel === v && c.championnat === filtreChampionnat)).map(v => [v, v] as [string, string])]} onChange={setFiltreClub} />
          <Choix label={t('compoSolo.nation')} valeur={filtrePays} options={[["", t('compoSolo.allMasculine')], ...optionsFiltre('pays').map(v => [v, v] as [string, string])]} onChange={setFiltrePays} />
          <Choix label={t('compoSolo.position')} valeur={filtrePoste} options={[["", t('compoSolo.allMasculine')], ...[...new Set(cartes.map(c => c.poste))].sort((a, b) => (POSTE_PAR_ID[a]?.numero ?? 0) - (POSTE_PAR_ID[b]?.numero ?? 0)).map(v => [v, nomPoste(v)] as [string, string])]} onChange={setFiltrePoste} />
        </div>
      </details>
    </div>

    <CompositionTerrainManager
      rendreCarte={joueur => {
        const carte = cartes.find(c => c.id === joueur.id);
        if (!carte) return null;
        return <CarteJoueurEnLigne carte={carte} compacte />;
      }}
      /**
       * ⚠️ LE COLLECTIF PASSE SOUS LA FORME, IL NE SE POSE PLUS SUR LE PORTRAIT.
       * C'était une pastille chiffrée collée en haut à droite de la carte : elle
       * recouvrait le visage et se lisait comme un badge de rareté de plus.
       * Demandé en jeu — « pour les joueurs mets une barre en dessous de la forme
       * plutôt » : elle rejoint la ligne du numéro, de l'adéquation et de la
       * condition, là où on lit déjà l'état du joueur.
       *
       * ⚠️ RIEN SOUS UN REMPLAÇANT. Le banc n'entre pas dans le collectif : il
       * n'a pas d'entrée dans `parCarte`, et lui dessiner une barre vide
       * annoncerait un zéro — donc une pénalité — qu'il ne subit pas.
       */
      rendreSousCarte={joueur => {
        const affinite = collectif.parCarte[joueur.id];
        if (!affinite) return null;
        return <span className={`cel-barre-collectif ${paliersCollectif(affinite.points * (100 / COLLECTIF_MAX))}`} title={legendeAffinite(affinite)}>
          <i style={{ width: `${affinite.points * (100 / COLLECTIF_MAX)}%` }} />
        </span>;
      }}
      effectif={effectif} effectifComplet={effectifComplet} reservesVisibles={reservesVisibles} composition={composition}
      onPlacer={changerJoueur} etats={etats} indisponibles={indisponibles}
      onCapitaine={id => setBrouillon({ ...composition, capitaineId: id })}
      onButeur={id => setBrouillon({ ...composition, buteurId: id })}
    />

    <details className="cel-panneau cel-consignes-repliables" open={consignesOuvertes} onToggle={e => setConsignesOuvertes(e.currentTarget.open)}>
      <summary><span><h2>{t('online.lineup.instructions')}</h2><small>{t('online.common.save')}</small></span><Icone nom="sifflet" /></summary>
      <div className="cel-consignes-contenu">
        <p className="cel-note">⚠️ {t('online.tactics.drawerHelp')}</p>
        <div className="cel-grille-consignes">
          <Choix label={t('online.tactics.mentality')} valeur={strategie.mentalite} options={obtenirMentalites()} onChange={v => majStrategie('mentalite', v)} />
          <Choix label={t('online.tactics.game')} valeur={strategie.jeu} options={obtenirJeux()} onChange={v => majStrategie('jeu', v)} />
          <Choix label={t('online.tactics.rhythm')} valeur={strategie.rythme} options={obtenirRythmes()} onChange={v => majStrategie('rythme', v)} />
          <Choix label={t('online.tactics.defense')} valeur={strategie.defense} options={obtenirDefenses()} onChange={v => majStrategie('defense', v)} />
          <Choix label={t('online.tactics.rucks')} valeur={strategie.rucks} options={obtenirRucks()} onChange={v => majStrategie('rucks', v)} />
          <Choix label={t('online.tactics.risk')} valeur={strategie.risqueOffensif} options={obtenirRisques()} onChange={v => majStrategie('risqueOffensif', v)} />
          <Choix label={t('online.tactics.kicking')} valeur={strategie.frequencePied} options={obtenirFrequencesPied()} onChange={v => majStrategie('frequencePied', v)} />
          <Choix label={t('online.tactics.subs')} valeur={strategie.remplacements} options={obtenirTimings()} onChange={v => majStrategie('remplacements', v)} />
          <Choix label={t('online.tactics.penShort')} valeur={strategie.penaliteCourte} options={obtenirPenalites()} onChange={v => majStrategie('penaliteCourte', v)} />
          <Choix label={t('online.tactics.penLong')} valeur={strategie.penaliteLongue} options={obtenirPenalites()} onChange={v => majStrategie('penaliteLongue', v)} />
          <Choix label={t('online.tactics.behind60')} valeur={strategie.bascule60} options={obtenirMentalites()} onChange={v => majStrategie('bascule60', v)} />
          <Choix label={t('online.tactics.behind70')} valeur={strategie.bascule70} options={obtenirMentalites()} onChange={v => majStrategie('bascule70', v)} />
          <Choix label={t('online.tactics.lead65')} valeur={strategie.gestionAvance} options={obtenirGestionAvance()} onChange={v => majStrategie('gestionAvance', v)} />
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
  /**
   * ⚠️ LE FAVORI SORT DU LOT, PAS DE LA VENTE. On peut toujours vendre un
   * joueur marque - le cocher a la main, cliquer sa vente rapide. Ce qu'il
   * ne subit plus, c'est « Tout cocher » : le geste qui prend cinquante
   * cartes d'un coup et ou personne ne relit la liste avant de valider.
   */
  const groupable = (c: CarteCarriere) => cessible(c) && !c.favori;
  const favoris = cartes.filter(c => c.favori && cessible(c)).length;
  const choisies = toutes.filter(c => selection.includes(c.id) && cessible(c));
  const total = choisies.reduce((somme, c) => somme + valeurVenteRapide(c), 0);
  const disponibles = toutes.filter(c => !c.verrou).length;
  const restants = disponibles - choisies.length;
  /**
   * ⚠️ COMBIEN DE CARTES ON PEUT COCHER, ET C’EST LE PLUS PETIT DES DEUX.
   * Le serveur refuse les lots de plus de `LOT_VENTE_RAPIDE_MAX` cartes ET les
   * départs qui passent sous le plancher d’effectif. Laisser cocher au-delà,
   * c’était promettre une vente qui repartait en « Liste invalide » — signalé
   * en jeu avec 59 joueurs sous contrat, où « Tout cocher » en envoyait 59.
   */
  const maximumVendable = Math.max(0, Math.min(LOT_VENTE_RAPIDE_MAX, disponibles - EFFECTIF_MINIMUM));
  const basculer = (id: string) => setSelection(liste => liste.includes(id)
    ? liste.filter(x => x !== id)
    : liste.length >= maximumVendable ? liste : [...liste, id]);
  const vendre = (lot: CarteCarriere[]) => {
    setDemande(null); setSelection([]);
    void agir(lot.length === 1 ? { type: 'venteRapide', carteId: lot[0].id } : { type: 'venteRapideGroupee', carteIds: lot.map(c => c.id) });
  };

  return <>
    <section className="cel-panneau cel-filtres">
      <div><div className="eyebrow">{cartes.length} {t('online.common.players')}</div><h2>{t('online.squad.title')}</h2></div>
      <Choix label={t('online.squad.sort')} valeur={tri} options={[['note', 'GEN'], ['poste', t('online.squad.position')], ['age', t('compo.ans')], ['nom', t('solo.search')]]} onChange={setTri} />
      <Choix label={t('online.squad.position')} valeur={famille} options={[['', t('online.squad.allPositions')], ...familles.map(f => [f, nomPoste(POSTES_XV_MANAGER.find(p => POSTE_PAR_ID[p].famille === f) ?? 'arriere')] as [string, string])]} onChange={setFamille} />
      <button type="button" className="btn fantome petit" disabled={!cartes.some(groupable)}
        title={favoris ? `${favoris} favori${favoris > 1 ? 's' : ''} rest${favoris > 1 ? 'ent' : 'e'} hors du lot.` : undefined}
        onClick={() => setSelection(liste => cartes.filter(groupable).every(c => liste.includes(c.id)) ? [] : [...new Set([...liste, ...cartes.filter(groupable).map(c => c.id)])].slice(0, maximumVendable))}>
        {cartes.filter(groupable).every(c => selection.includes(c.id)) && cartes.some(groupable) ? t('online.squad.uncheckAll') : t('online.squad.checkAll')}
      </button>
      {favoris > 0 && <small className="cel-note-favoris"><Icone nom="etoile" taille={13} /> {favoris} favori{favoris > 1 ? 's' : ''} écarté{favoris > 1 ? 's' : ''} de « Tout cocher »</small>}
      {cartes.some(c => c.blesseJusqua && c.blesseJusqua > maintenantISO()) && (
        <small className="cel-note-blesses">
          <Icone nom="coeur" taille={13} /> {t('online.infirmary.unavailableCount', { count: cartes.filter(c => c.blesseJusqua && c.blesseJusqua > maintenantISO()).length })}
        </small>
      )}
    </section>

    <div className="cel-grille-cartes">{cartes.map(c => {
      const maillot = feuille.get(c.id);
      const estBlesse = Boolean(c.blesseJusqua && c.blesseJusqua > maintenantISO());
      const libre = cessible(c);
      const choisie = libre && selection.includes(c.id);
      return <div className={`cel-carte-quick${choisie ? ' choisie' : ''}${c.favori ? ' favorite' : ''}${estBlesse ? ' cel-carte-blessee' : ''}`} key={c.id}>
        {libre && <button type="button" className="cel-coche" aria-pressed={choisie} aria-label={choisie ? t('online.squad.deselectPlayer', { name: c.nom }) : t('online.squad.selectPlayer', { name: c.nom })} onClick={() => basculer(c.id)}><Icone nom="check" taille={13} /></button>}
        {estBlesse && (
          <span className="cel-badge-blessure-flottant" title={t('online.infirmary.injuredUntilTooltip', { date: dateHeure(c.blesseJusqua!), time: formatTempsBlessureDetaille(c.blesseJusqua!) })}>
            <Icone nom="coeur" taille={12} /> {t('compo.badge.blesse')} · {formatTempsBlessure(c.blesseJusqua!)}
          </span>
        )}
        {/* ⚠️ L'ÉTOILE RESTE CLIQUABLE SUR UN JOUEUR ALIGNÉ. On marque son
            capitaine PENDANT qu'il est titulaire, pas après l'avoir sorti :
            c'est exactement le moment où l'on sait qu'il compte. */}
        <button type="button" className="cel-favori" aria-pressed={Boolean(c.favori)} disabled={occupe}
          aria-label={c.favori ? t('online.market.removeFavorite', { name: c.nom }) : t('online.market.addFavorite', { name: c.nom })}
          title={c.favori ? t('online.market.favoriteHelp') : t('online.market.markFavoriteHelp')}
          onClick={() => { void agir({ type: 'favori', carteId: c.id, valeur: !c.favori }); }}>
          <Icone nom="etoile" taille={14} />
        </button>
        <CarteJoueurEnLigne carte={c} logoClub={logos.get(c.clubReel)} onClick={libre ? () => basculer(c.id) : undefined} />
        <button className="cel-vente-rapide" type="button" disabled={occupe || !libre}
          title={maillot ? t('online.market.onMatchSheetHelp', { sheet: maillot }) : estBlesse ? t('online.infirmary.injuredUntilTooltip', { date: dateHeure(c.blesseJusqua!), time: formatTempsBlessureDetaille(c.blesseJusqua!) }) : undefined}
          onClick={() => setDemande([c])}>
          {maillot ? `${t('online.market.onMatchSheet', { rarity: maillot })}` : c.verrou ? t('online.market.activeBidOngoing') : estBlesse ? `${t('compo.badge.blesse')} · ${formatTempsBlessure(c.blesseJusqua!)}` : `${t('online.market.quickSell')} · ${montant(valeurVenteRapide(c))} Ovas`}
        </button>
      </div>;
    })}</div>
    {!cartes.length && <Vide icone="equipe" titre={t('online.squad.emptyPositionTitle')}>{t('online.squad.emptyPositionHelp')}</Vide>}

    {/* La barre ne s'affiche qu'une fois quelque chose de coché : tant qu'on
        regarde son effectif, rien ne doit recouvrir la dernière rangée. */}
    {choisies.length > 0 && <div className="cel-barre-selection" role="region" aria-label="Sélection à vendre">
      <div>
        <b>{t('online.squad.selectedCount', { count: choisies.length })}</b>
        <small>{t('online.squad.selectedHelp', { val: montant(total), rem: restants })}
          {choisies.length >= maximumVendable && (maximumVendable === LOT_VENTE_RAPIDE_MAX
            ? ` · maximum ${LOT_VENTE_RAPIDE_MAX} par lot`
            : ` · c’est tout ce que le plancher de ${EFFECTIF_MINIMUM} joueurs autorise`)}</small>
      </div>
      <div className="cel-barre-actions">
        <button type="button" className="btn fantome" onClick={() => setSelection([])}>{t('online.common.cancel')}</button>
        <button type="button" className="btn primaire" disabled={occupe || restants < EFFECTIF_MINIMUM} onClick={() => setDemande(choisies)}>
          {restants < EFFECTIF_MINIMUM ? t('online.market.keepMinPlayers', { min: EFFECTIF_MINIMUM }) : t('online.squad.sellAllBtn', { val: montant(total) })}
        </button>
      </div>
    </div>}

    {demande && <Confirmation
      titre={demande.length === 1 ? t('online.squad.sellSelectedPrompt') : t('online.squad.sellSelectedPromptPlural', { count: demande.length })}
      message={demande.length === 1
        ? t('online.squad.sellConfirmMsgSingle', { name: demande[0].nom, val: montant(valeurVenteRapide(demande[0])) })
        : t('online.squad.sellConfirmMsgPlural', { names: demande.map(c => c.nom).join(', '), val: montant(demande.reduce((s, c) => s + valeurVenteRapide(c), 0)) })}
      libelleOui={t('online.squad.sellConfirmBtn', { val: montant(demande.reduce((s, c) => s + valeurVenteRapide(c), 0)) })}
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
  const packsDuJour = packsBoutiqueDuJour(vue.packs, Date.now(), vue.rotationPacks === true);
  const [ouverture, setOuverture] = useState<{ cartes: CarteCarriere[] | null; pack: string; garantie?: VueCarriereEnLigne['packs'][number]['garantie'] } | null>(null);
  /**
   * ⚠️ LE MODULE 3D ARRIVE PENDANT QU'ON REGARDE LE PRÉSENTOIR. Il pesait
   * son import dynamique EN PLUS de l'aller-retour serveur, l'un après
   * l'autre, au moment précis où l'écran devait bouger.
   */
  useEffect(() => { prechargerOuverturePack(); }, []);
  const achatEnCours = useRef(false);
  /**
   * ⚠️ LA POCHETTE S'AFFICHE AU CLIC, PAS À LA RÉPONSE. On ouvrait la modale
   * seulement une fois le serveur revenu : entre les deux, le bouton était
   * grisé et il ne se passait RIEN — signé en jeu comme « de la latence en
   * attendant que le pack s'affiche ». La commande part maintenant en même
   * temps que la pochette apparaît, à la couleur que le pack garantit ; les
   * cartes se glissent dedans quand elles arrivent, et le manager a déjà
   * commencé son geste.
   *
   * ⚠️ UN REFUS REFERME LA POCHETTE. Ovas insuffisants, pack déjà ouvert,
   * réseau coupé : `agir` ne rend rien et affiche le message. Laisser la
   * modale ouverte donnerait une pochette qu'aucun geste n'ouvrirait jamais.
   */
  const lancerOuverture = async (commande: CommandeCarriere, nomPack: string, packId: string, suffixe = '') => {
    if (achatEnCours.current || ouverture) return;
    achatEnCours.current = true;
    const pack = vue.packs.find(p => p.id === packId);
    if (pack) prechargerOuverturePack(apparencePack(pack));
    setOuverture({ cartes: null, pack: `${nomPack}${suffixe}`, garantie: pack?.garantie });
    try {
      const avant = new Set(vue.transactions.map(t => t.id));
      const suivante = await agir(commande);
      if (!suivante) { setOuverture(null); return; }
      const nouvelles = suivante.transactions.filter(t => !avant.has(t.id) && t.nature === 'pack' && t.clubId === vue.monClubId).flatMap(t => t.cartes);
      const cartes = suivante.cartes.filter(c => nouvelles.includes(c.id));
      setOuverture(courant => courant ? (cartes.length ? { ...courant, cartes } : null) : courant);
    } catch { setOuverture(null); }
    finally { achatEnCours.current = false; }
  };
  const ouvrir = (packId: string, nomPack: string) => lancerOuverture({ type: 'ouvrirPack', packId }, nomPack, packId);
  const ouvrirGratuit = (attributionId: string, packId: string, nomPack: string) =>
    lancerOuverture({ type: 'ouvrirPackGratuit', attributionId }, nomPack, packId, ' · offert');
  const solde = club?.ovas ?? 0;
  const packsGratuits = club?.packsGratuits ?? [];

  return <>
    <section className="cel-boutique-tete">
      <div>
        <div className="eyebrow">{t('online.shop.poolAvailable', { count: montant(vue.vivierDisponible) })}</div>
        <h2>{t('online.shop.title')}</h2>
        <p>{t('online.shop.desc')}
          <b>{t('online.shop.uniqueNote')}</b>{t('online.shop.uniqueNoteEnd')}</p>
      </div>
      <div className="cel-portefeuille"><PieceOvas taille={26} /><strong>{montant(solde)}</strong><span>{t('online.shop.available')}</span></div>
    </section>

    <section className="cel-packs-quotidiens">
      <div className="cel-packs-quotidiens-tete"><div><div className="eyebrow">{t('online.shop.dailyBoost')}</div><h3>{t('online.shop.freePacksCount', { count: packsGratuits.length })}</h3><p>{vue.phase === 'salon' ? t('online.shop.dailyLobbyHelp') : t('online.shop.dailySeasonHelp')}</p></div><strong>{t('online.shop.dailyRate')}</strong></div>
      {packsGratuits.length ? <div className="cel-packs-gratuits-liste">{packsGratuits.slice(0, 20).map(attribution => { const pack = vue.packs.find(p => p.id === attribution.packId); return pack ? <button key={attribution.id} disabled={occupe || ouverture !== null} onPointerEnter={() => prechargerOuverturePack(apparencePack(pack))} onFocus={() => prechargerOuverturePack(apparencePack(pack))} onClick={() => { void ouvrirGratuit(attribution.id, pack.id, nomPackCarriere(pack)); }}><span className={`cel-pack-gratuit-sceau ${pack.garantie ?? 'bronze'}`}><Icone nom="cadeau" taille={17} /></span><b>{nomPackCarriere(pack)}</b><small>{t('online.shop.freePackLabel')}</small></button> : null; })}</div> : <p className="cel-note">{vue.phase === 'salon' ? t('online.shop.emptyLobby') : t('online.shop.emptySeason')}</p>}
      {packsGratuits.length > 20 && <small className="cel-note">{t('online.shop.morePacksNote', { count: packsGratuits.length - 20 })}</small>}
    </section>

    <div className="cel-note">{t('online.shop.basePacksNote')}</div>
    <BoutiquePacks3D packs={packsDuJour} solde={solde} occupe={occupe || ouverture !== null} onOuvrir={ouvrir} />

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
    <nav className="cel-onglets secondaires">{([['encours', t('online.market.tab.forSale', { count: ouvertes.length })], ['vendre', t('online.market.tab.sell')], ['echanges', t('online.market.tab.trades', { count: vue.echanges.filter(e => e.etat === 'propose').length })]] as const).map(([id, label]) =>
      <button key={id} className={sousOnglet === id ? 'actif' : ''} onClick={() => setSousOnglet(id)}>{label}</button>)}</nav>

    <div className="cel-deux"><Champ label={t('online.market.search')}><input type="search" value={rechercheMarche} onChange={e => setRechercheMarche(e.target.value)} /></Champ><Choix label={t('online.collection.rarity')} valeur={rareteMarche} onChange={setRareteMarche} options={[["", t('online.collection.all')], ["bronze", t('online.rarity.bronze')], ["argent", t('online.rarity.argent')], ["or", t('online.rarity.or')], ["elite", t('online.rarity.elite')], ["star", t('online.rarity.star')]]} /></div>
    {/* ⚠️ LA ROUE OUVRE LA FICHE, ELLE NE DÉROULE PLUS UN PANNEAU EN DESSOUS.
        L'annonce s'affichait sous la roue : il fallait cliquer une carte, puis
        descendre la page pour lire le prix et le vendeur, et la carte qu'on
        venait de choisir sortait de l'écran. Tout tient maintenant dans une
        fiche — la carte à gauche, l'annonce et ses boutons à droite. */}
    {sousOnglet === 'encours' && <RoueCartes titre={t('online.market.players')} cartes={ouvertes.map(v=>carte(v.carteId)!).filter(Boolean)} selection={venteSelectionnee} onChoisir={id => { setVenteSelectionnee(id); setApercu(id); }} vide={rechercheMarche || rareteMarche ? t('online.market.emptyFilter') : t('online.market.emptyList')} />}

    {sousOnglet === 'vendre' && <RoueCartes titre={t('online.market.chooseCardToSellOrTrade')} cartes={vendables.filter(correspond).sort((a,b)=>b.note-a.note)} selection={carteId} onChoisir={id => { setCarteId(id); setApercu(id); }} vide={mesCartes.length ? t('online.market.emptyFilterLocked') : t('online.market.emptySquad')} />}

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
          <div className="eyebrow">{recu ? t('online.trade.offerFrom', { club: nomClub(vue, e.de) }) : t('online.trade.offerTo', { club: nomClub(vue, e.vers) })} · {t('online.market.closesAt', { time: dateHeure(e.expireLe) })}</div>
          <div className="cel-echange-cotes">
            <div><h3>{t('online.trade.gives', { club: nomClub(vue, e.de) })}</h3><div className="cel-grille-cartes petites">{e.cartesDonnees.map(id => carte(id)).filter(Boolean).map(c => <CarteJoueurEnLigne key={c!.id} carte={c!} compacte />)}</div>{e.ovasDonnes > 0 && <b className="cel-ovas-echange">+ {montant(e.ovasDonnes)} Ovas</b>}</div>
            <Icone nom="repost" taille={26} />
            <div><h3>{t('online.trade.gives', { club: nomClub(vue, e.vers) })}</h3><div className="cel-grille-cartes petites">{e.cartesDemandees.map(id => carte(id)).filter(Boolean).map(c => <CarteJoueurEnLigne key={c!.id} carte={c!} compacte />)}</div>{e.ovasDemandes > 0 && <b className="cel-ovas-echange">+ {montant(e.ovasDemandes)} Ovas</b>}</div>
          </div>
          {e.blocage && <p className="cel-note cel-alerte-echange" role="status">{e.blocage}</p>}
          <div className="cel-actions">
            {recu ? <>
              <button className="btn primaire" disabled={occupe || Boolean(e.blocage)} onClick={() => { void agir({ type: 'repondreEchange', echangeId: e.id, accepter: true }); }}>{t('online.common.accept')}</button>
              <button className="btn fantome" disabled={occupe} onClick={() => { void agir({ type: 'repondreEchange', echangeId: e.id, accepter: false }); }}>{t('online.common.refuse')}</button>
            </> : <button className="btn fantome" disabled={occupe} onClick={() => { void agir({ type: 'annulerEchange', echangeId: e.id }); }}>{t('online.trade.cancelOffer')}</button>}
          </div>
        </article>;
      })}
      <form className="cel-panneau" onSubmit={async ev => { ev.preventDefault(); const v = await agir({ type: 'proposerEchange', vers: cible, cartesDonnees: donnees, cartesDemandees: demandees, ovasDonnes: Number(ovasDonnes), ovasDemandes: Number(ovasDemandes) }); if (v) { setDonnees([]); setDemandees([]); } }}>
        <h2>{t('online.market.trade')}</h2>
        <p className="cel-note">{t('online.trade.help')}</p>
        <Choix label={t('online.trade.withWhom')} valeur={cible} options={[['', t('online.trade.chooseClub')], ...vue.clubs.filter(c => c.id !== vue.monClubId).map(c => [c.id, c.nom] as [string, string])]} onChange={v => { setCible(v); setDemandees([]); }} />
        {cible && <div>
          <p className="cel-note">{t('online.trade.rulesHelp')}</p>

          <RoueCartes titre={t('online.trade.iGive')} cartes={vendables.filter(correspond).sort((a, b) => b.note - a.note)} selections={donnees} onChoisir={id => basculer(donnees, setDonnees, id)} vide={t('online.trade.emptyFiltered')} />
          <p className="cel-note" aria-live="polite">{t('online.trade.playersSelected', { count: donnees.length })}</p>
          <div className="cel-actions">{donnees.map(id => <button type="button" className="btn fantome" key={id} onClick={() => basculer(donnees, setDonnees, id)} aria-label={t('online.trade.removePlayer', { name: carte(id)?.nom ?? '' })}>{carte(id)?.nom} ×</button>)}</div>
          <Champ label={t('online.trade.ovasFromMe')}><input type="number" min={0} step={100} value={ovasDonnes} onChange={e => setOvaDonnes(e.target.value)} /></Champ>

          <RoueCartes titre={t('online.trade.iRequest', { club: nomClub(vue, cible) })} cartes={siennes.filter(c => !c.verrou).filter(correspond).sort((a, b) => b.note - a.note)} selections={demandees} onChoisir={id => basculer(demandees, setDemandees, id)} vide={t('online.trade.emptyFiltered')} />
          <p className="cel-note" aria-live="polite">{t('online.trade.playersSelected', { count: demandees.length })}</p>
          <div className="cel-actions">{demandees.map(id => <button type="button" className="btn fantome" key={id} onClick={() => basculer(demandees, setDemandees, id)} aria-label={t('online.trade.removePlayer', { name: carte(id)?.nom ?? '' })}>{carte(id)?.nom} ×</button>)}</div>
          <Champ label={t('online.trade.ovasFromThem')}><input type="number" min={0} step={100} value={ovasDemandes} onChange={e => setOvaDemandes(e.target.value)} /></Champ>
        </div>}
        <button className="btn primaire" disabled={occupe || !cible || (!donnees.length && !demandees.length)}>{t('online.market.send')}</button>
      </form>
    </>}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CALENDRIER, ET LES RAPPELS
// ═══════════════════════════════════════════════════════════════════════════

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const dateLongue = (iso: string) => new Date(iso).toLocaleString(locale(), {
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

function Calendrier({ vue, agir, occupe, suivre, proprietaire, notifier }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; suivre: (id: string) => void; proprietaire: boolean; notifier: (message: string) => void }) {

  const maintenant = maintenantISO();
  const miennes = vue.observateur
    ? vue.rencontres
    : vue.rencontres.filter(r => r.domicile === vue.monClubId || r.exterieur === vue.monClubId);
  const aVenir = miennes.filter(r => !r.resultat).sort((a, b) => Date.parse(a.ferme) - Date.parse(b.ferme));
  const jouees = miennes.filter(r => r.resultat).slice(-8).reverse();
  const prochaine = aVenir[0];
  const parRendezVous = new Map<string, VueRencontre[]>();
  for (const r of vue.rencontres.filter(r => !r.resultat).sort((a, b) => Date.parse(a.ferme) - Date.parse(b.ferme))) {
    // Deux compétitions ont chacune une « journée 1 » : les regrouper sous
    // le seul numéro de journée cachait la coupe au milieu du championnat.
    const cle = `${r.competitionId}:${r.journee}`;
    if (!parRendezVous.has(cle)) parRendezVous.set(cle, []);
    parRendezVous.get(cle)!.push(r);
  }
  const rendezVous = [...parRendezVous.values()];

  if (!vue.rencontres.length) return <Vide icone="calendrier" titre={t('online.calendar.empty')}>{t('online.loading')}</Vide>;

  return <>
    {proprietaire && <ReglageRythme vue={vue} agir={agir} occupe={occupe} notifier={notifier} />}
    {prochaine && <section className="cel-panneau cel-prochain">
      <div className="cel-prochain-corps">
        <div className="eyebrow">{t('online.calendar.next', { day: prochaine.journee })}</div>
        <h2 className="cel-nom-ligue">
          <Ecusson nom={nomClub(vue, prochaine.domicile)} logo={vue.clubs.find(c => c.id === prochaine.domicile)?.embleme} />
          {nomClub(vue, prochaine.domicile)} <em>{t('online.match.hosts')}</em> {nomClub(vue, prochaine.exterieur)}
          <Ecusson nom={nomClub(vue, prochaine.exterieur)} logo={vue.clubs.find(c => c.id === prochaine.exterieur)?.embleme} />
        </h2>
        {/* ⚠️ LA PHRASE TIENT DANS UN SEUL ÉLÉMENT. Le `p` est un flex : chaque
            morceau de texte y devenait une boîte à part, et sur un téléphone
            « À jouer avant le », la date et le délai se rangeaient en trois
            colonnes au lieu de se lire comme une ligne. */}
        <p className="cel-fenetre">
          <Icone nom="chrono" taille={16} />
          <span>Coup d’envoi : {dateLongue(prochaine.ferme)}</span>
        </p>
        <small className="cel-note">{t('online.calendar.autoKickoffNote')}</small>
      </div>
      <Rencontre vue={vue} rencontre={prochaine} agir={agir} occupe={occupe} suivre={suivre} grande />
    </section>}

    {!vue.observateur && <NotificationsMatch ligue={vue.id} />}

    {aVenir.length > 1 && <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>{t('online.calendar.mine')}</h2><small>{aVenir.length} {t('online.common.matches')}</small></div>
      <div className="cel-agenda">{aVenir.slice(0, 8).map(r => {
        const chezMoi = r.domicile === vue.monClubId;
        const adversaire = chezMoi ? r.exterieur : r.domicile;
        const ouverte = r.ouvre <= maintenant && r.ferme >= maintenant;
        const competition = vue.competitions.find(c => c.id === r.competitionId);
        // Le rendez-vous réel est la clôture : c'est l'instant du coup d'envoi
        // automatique. `ouvre` est seulement le début de la fenêtre de jeu et
        // peut être identique pour plusieurs journées déjà programmées.
        const rendezVous = r.ferme;
        return <button key={r.id} className={`cel-agenda-ligne${ouverte ? ' ouverte' : ''}`} onClick={() => suivre(r.id)} disabled={!r.match}>
          <span className="cel-agenda-jour">
            <b>{new Date(rendezVous).getDate()}</b>
            <small>{new Date(rendezVous).toLocaleDateString('fr-FR', { month: 'short' })}</small>
          </span>
          <Ecusson nom={nomClub(vue, adversaire)} logo={vue.clubs.find(c => c.id === adversaire)?.embleme} />
          <span className="cel-agenda-corps">
            <b>{chezMoi ? 'Reçoit' : 'Se déplace à'} {nomClub(vue, adversaire)}</b>
            <small>{competition?.nom} · {nomEtapeCompetition(competition, r.journee).titreCourt} · {JOURS[new Date(rendezVous).getDay()]} · {delai(rendezVous)}</small>
          </span>
          {ouverte && <em className="cel-agenda-ouverte">{t('online.calendar.open')}</em>}
        </button>;
      })}</div>
    </section>}

    <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>{t('online.calendar.all')}</h2><small>{rendezVous.reduce((total, liste) => total + liste.length, 0)} {t('online.common.matches')}</small></div>
      {rendezVous.map(liste => {
        const premiere = liste[0];
        const competition = vue.competitions.find(c => c.id === premiere.competitionId);
        const etape = nomEtapeCompetition(competition, premiere.journee);
        return <div key={`${premiere.competitionId}:${premiere.journee}`} className="cel-journee">
          <div className="cel-journee-tete">
            <b>{competition?.nom} · {etape.titreCourt}</b>
            <small>{dateLongue(liste[0].ouvre)} → {dateLongue(liste[0].ferme)}</small>
          </div>
          <div className="cel-grille-rencontres">{liste.map(r =>
            <Rencontre key={r.id} vue={vue} rencontre={r} agir={agir} occupe={occupe} suivre={suivre} />)}</div>
        </div>;
      })}
    </section>

    {jouees.length > 0 && <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>{t('online.calendar.recent')}</h2><Icone nom="resultats" /></div>
      <div className="cel-grille-rencontres">{jouees.map(r =>
        <Rencontre key={r.id} vue={vue} rencontre={r} agir={agir} occupe={occupe} suivre={suivre} />)}</div>
    </section>}
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES COMPÉTITIONS — le championnat, et les coupes inventées par le créateur
// ═══════════════════════════════════════════════════════════════════════════

function TableauCoupe({ vue, competition, rencontres, suivre }: {
  vue: VueCarriereEnLigne;
  competition: VueCarriereEnLigne['competitions'][number];
  rencontres: VueRencontre[];
  suivre: (id: string) => void;
}) {
  const nombreTableau = competition.format === 'poules'
    ? competition.qualifies ?? nombreQualifiesPoules(competition.participants.length)
    : competition.format === 'championnat'
      ? Math.min(competition.participants.length, Math.max(4, 2 ** Math.floor(Math.log2(competition.participants.length / 2))))
      : competition.participants.length;
  const debutTableau = (competition.format === 'poules' || competition.format === 'championnat')
    ? (competition.journeesRegulieres ?? 0) + 1
    : 1;
  const tailles = matchsParTour(nombreTableau);
  const intervalle = 7 * 86_400_000 / vue.rythme;
  return <section className="cel-panneau cel-panneau-tableau">
    <div className="cel-titre-ligne">
      <div>
        <div className="eyebrow">{competition.format === 'championnat' ? 'Championnat · Phase finale' : 'Coupe · Élimination directe'}</div>
        <h2>{competition.format === 'championnat' ? 'Play-offs' : t('online.competition.knockout')}</h2>
      </div>
      <small>{nombreTableau} clubs · {tailles.reduce((s, n) => s + n, 0)} {t('online.common.matches')}</small>
    </div>
    <div className="cel-tableau-coupe">{tailles.map((taille, index) => {
      const journee = debutTableau + index;
      const matchs = rencontres.filter(r => r.journee === journee);
      const datePrevue = new Date(Date.parse(competition.debut) + journee * intervalle).toISOString();
      return <div className="cel-tour-coupe" key={journee}>
        <div className="cel-entete-tour">
          <b>{nomTour(index, tailles.length, tailles[0])}</b>
          <small>{date(matchs[0]?.ferme ?? datePrevue)}</small>
        </div>
        {Array.from({ length: taille }, (_, numero) => {
          const rencontre = matchs[numero];
          if (!rencontre) return <article className="cel-match-tableau attente" key={numero}>
            <div className="cel-ligne-equipe">
              <span className="cel-equipe-nom-wrap"><i /> <span className="cel-equipe-nom">À déterminer</span></span>
              <span className="cel-score-vide">—</span>
            </div>
            <div className="cel-separateur-equipes" />
            <div className="cel-ligne-equipe">
              <span className="cel-equipe-nom-wrap"><i /> <span className="cel-equipe-nom">À déterminer</span></span>
              <span className="cel-score-vide">—</span>
            </div>
          </article>;

          const clubD = vue.clubs.find(c => c.id === rencontre.domicile);
          const clubE = vue.clubs.find(c => c.id === rencontre.exterieur);
          const nomD = nomClub(vue, rencontre.domicile);
          const nomE = nomClub(vue, rencontre.exterieur);
          const termine = Boolean(rencontre.resultat);
          const vainqueur = rencontre.vainqueurId ?? rencontre.resultat?.vainqueurId ?? (
            rencontre.resultat
              ? (rencontre.resultat.pointsD > rencontre.resultat.pointsE ? rencontre.domicile
                 : rencontre.resultat.pointsE > rencontre.resultat.pointsD ? rencontre.exterieur : undefined)
              : undefined
          );
          const enDirect = Boolean(rencontre.match && !rencontre.match.termine);

          return <button
            type="button"
            className={`cel-match-tableau${termine ? ' termine' : ''}${enDirect ? ' direct' : ''}`}
            key={rencontre.id}
            onClick={() => suivre(rencontre.id)}
            disabled={!rencontre.match && !rencontre.resultat}
          >
            <div className={`cel-ligne-equipe${termine && vainqueur === rencontre.domicile ? ' vainqueur' : termine && vainqueur && vainqueur !== rencontre.domicile ? ' perdant' : ''}`}>
              <span className="cel-equipe-nom-wrap">
                <Ecusson nom={nomD} logo={clubD?.embleme} />
                <b className="cel-equipe-nom">{nomD}</b>
              </span>
              <div className="cel-score-wrap">
                {rencontre.resultat?.tab && rencontre.resultat.tirsAuBut && (
                  <small className="cel-tirs-tab">({rencontre.resultat.tirsAuBut.tirsD})</small>
                )}
                {rencontre.resultat ? (
                  <strong className="cel-score-valeur">{rencontre.resultat.pointsD}</strong>
                ) : rencontre.match ? (
                  <strong className="cel-score-valeur">{rencontre.match.score.domicile}</strong>
                ) : (
                  <span className="cel-score-vide">—</span>
                )}
              </div>
            </div>

            <div className="cel-separateur-equipes">
              {rencontre.resultat?.tab ? (
                <span className="cel-tag-fin tab">T.A.B.</span>
              ) : rencontre.resultat?.ap ? (
                <span className="cel-tag-fin ap">A.P.</span>
              ) : enDirect ? (
                <span className="cel-tag-fin live">DIRECT {rencontre.match?.minute}′</span>
              ) : null}
            </div>

            <div className={`cel-ligne-equipe${termine && vainqueur === rencontre.exterieur ? ' vainqueur' : termine && vainqueur && vainqueur !== rencontre.exterieur ? ' perdant' : ''}`}>
              <span className="cel-equipe-nom-wrap">
                <Ecusson nom={nomE} logo={clubE?.embleme} />
                <b className="cel-equipe-nom">{nomE}</b>
              </span>
              <div className="cel-score-wrap">
                {rencontre.resultat?.tab && rencontre.resultat.tirsAuBut && (
                  <small className="cel-tirs-tab">({rencontre.resultat.tirsAuBut.tirsE})</small>
                )}
                {rencontre.resultat ? (
                  <strong className="cel-score-valeur">{rencontre.resultat.pointsE}</strong>
                ) : rencontre.match ? (
                  <strong className="cel-score-valeur">{rencontre.match.score.exterieur}</strong>
                ) : (
                  <span className="cel-score-vide">—</span>
                )}
              </div>
            </div>
          </button>;
        })}
      </div>;
    })}</div>
  </section>;
}

function ClassementsPoules({ vue, competition, onClub }: {
  vue: VueCarriereEnLigne;
  competition: VueCarriereEnLigne['competitions'][number];
  onClub: (clubId: string) => void;
}) {
  const groupes = competition.classementsPoules ?? [];
  const qualifies = new Set(competition.phaseFinaleSeed ?? []);
  const repeches = new Set(competition.repeches ?? []);
  const placesDirectes = Math.floor((competition.qualifies ?? 2) / Math.max(1, groupes.length));
  return <section className="cel-panneau cel-poules">
    <div className="cel-titre-ligne"><div><div className="eyebrow">1</div><h2>{t('online.competition.groups')}</h2></div><small>{groupes.length} · {competition.qualifies}</small></div>
    <div className="cel-grille-poules">{groupes.map((lignes, groupe) => <article className="cel-poule" key={groupe}>
      <h3>{t('online.competition.group', { name: String.fromCharCode(65 + groupe) })}</h3>
      <div className="cel-table-scroll"><table className="cel-table"><thead><tr><th>#</th><th>Club</th><th>J</th><th>Diff.</th><th>Pts</th></tr></thead>
        <tbody>{lignes.map((ligne, rang) => {
          const qualifie = qualifies.has(ligne.clubId) || (!competition.phaseFinaleSeed && rang < placesDirectes);
          const enCourse = !competition.phaseFinaleSeed && rang === placesDirectes && (competition.qualifies ?? 0) % groupes.length !== 0;
          return <tr key={ligne.clubId} className={`${ligne.clubId === vue.monClubId ? 'moi ' : ''}${qualifie ? 'qualifie' : ''}`}>
            <td><b>{rang + 1}</b>{qualifie && <i className="cel-statut-qualif">Q</i>}{repeches.has(ligne.clubId) && <i className="cel-statut-qualif repeche">R</i>}{enCourse && <i className="cel-statut-qualif attente" title="En course pour le repêchage">R?</i>}</td>
            <th><button className="cel-club-lien cel-club-poule" onClick={() => onClub(ligne.clubId)}><span>{ligne.nom}</span><Ecusson nom={ligne.nom} logo={vue.clubs.find(c => c.id === ligne.clubId)?.embleme} /></button></th>
            <td>{ligne.joues}</td><td>{ligne.difference > 0 ? '+' : ''}{ligne.difference}</td><td><b>{ligne.points}</b></td>
          </tr>;
        })}</tbody></table></div>
    </article>)}</div>
    <p className="cel-note"><b>Q</b> qualifié directement · <b>R</b> repêché. Les meilleurs clubs de même rang sont départagés aux points par match, puis à la différence de points par match.</p>
  </section>;
}

function Competitions({ vue, agir, occupe, proprietaire, suivre }: { vue: VueCarriereEnLigne; agir: Agir; occupe: boolean; proprietaire: boolean; suivre: (id: string) => void }) {
  const [nouvelle, setNouvelle] = useState(false);
  const [ficheClub, setFicheClub] = useState<string | null>(null);
  const [nom, setNom] = useState('Christmas Cup');
  const [trophee, setTrophee] = useState('Coupe de Noël');
  const [format, setFormat] = useState('poules');
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
  const formatEffectif = format === 'elimination' && !estPuissanceDeDeux(participants.length) ? 'poules' : format;
  const rangs = new Map(vue.classement.map((ligne, index) => [ligne.clubId, index]));
  const participantsOrdonnes = [...participants].sort((a, b) => (rangs.get(a) ?? 999) - (rangs.get(b) ?? 999));
  const apercuPoules = formatEffectif === 'poules' && participants.length >= 3 ? repartirPoules(participantsOrdonnes) : [];
  const qualifiesApercu = apercuPoules.length ? nombreQualifiesPoules(participants.length) : 0;

  return <>
    <section className="cel-panneau cel-filtres">
      <div><div className="eyebrow">{vue.competitions.length} compétition{vue.competitions.length > 1 ? 's' : ''} dans cette ligue</div><h2 className="cel-nom-ligue">{competition?.logo && <img className="cel-logo-ligue" src={competition.logo} alt="" />}{competition?.nom ?? 'Le calendrier'}</h2><p className="cel-note">{competition ? `${competition.trophee}${competition.playoffs ? ' · phase finale adaptée au nombre de clubs' : ''} · ${montant(competition.recompenseVainqueur)} Ovas au vainqueur` : ''}</p></div>
      {vue.competitions.length > 1 && <Choix label="Compétition" valeur={competition?.id ?? ''} options={vue.competitions.map(c => [c.id, c.nom])} onChange={setOuverte} />}
      {proprietaire && vue.phase === 'saison' && <button className="btn fantome" onClick={() => setNouvelle(!nouvelle)}><Icone nom="trophee" taille={17} />{nouvelle ? t('online.common.close') : t('online.competition.create')}</button>}
    </section>

    {nouvelle && <form className="cel-panneau" onSubmit={async e => {
      e.preventDefault();
      const v = await agir({ type: 'creerCoupe', nom, trophee, participants, format: format as 'elimination' | 'championnat' | 'poules', debut: new Date(`${debut}T12:00:00.000Z`).toISOString(), recompenseParticipation: Number(participation), recompenseVainqueur: Number(vainqueur), recompenseFinaliste: Number(finaliste), logo: logoCoupe, tropheeId: tropheeCoupe, playoffs: playoffsCoupe });
      if (v) setNouvelle(false);
    }}>
      <h2>{t('online.competition.customTitle')}</h2>
      <p className="cel-note">{t('online.competition.maxTwoCups')}</p>
      <div className="cel-grille-consignes">
        <Champ label={t('online.competition.name')}><input required minLength={2} maxLength={40} value={nom} onChange={e => setNom(e.target.value)} /></Champ>
        <Champ label={t('online.competition.trophyName')}><input required minLength={2} maxLength={40} value={trophee} onChange={e => setTrophee(e.target.value)} /></Champ>
        <Choix label={t('online.competition.format')} valeur={format} options={[['poules', t('online.competition.format.poules')], ['elimination', t('online.competition.format.elimination')], ['championnat', t('online.competition.format.championnat')]]} onChange={setFormat} />
        <Champ label={t('online.competition.start')}><input type="date" required value={debut} onChange={e => setDebut(e.target.value)} /></Champ>
        <Champ label={t('online.competition.winnerOvas')}><input type="number" min={0} step={1} value={vainqueur} onChange={e => setVainqueur(e.target.value)} /></Champ>
        <Champ label={t('online.competition.runnerUpOvas')}><input type="number" min={0} step={1} value={finaliste} onChange={e => setFinaliste(e.target.value)} /></Champ>
        <Champ label={t('online.competition.participantOvas')}><input type="number" min={0} step={1} value={participation} onChange={e => setParticipation(e.target.value)} /></Champ>
      </div>
      <ChoixCompetition logo={logoCoupe} tropheeId={tropheeCoupe} onLogo={setLogoCoupe} onTrophee={setTropheeCoupe} />
      {format === 'championnat' && <label className="cel-bascule"><input type="checkbox" checked={playoffsCoupe} onChange={e => setPlayoffsCoupe(e.target.checked)} /><span><b>{t('online.competition.playoffsTitle')}</b>{t('online.competition.playoffsDesc')}</span></label>}
      <h3 className="cel-sous-titre">{t('online.competition.participants')}</h3>
      <div className="cel-choix-cartes">{vue.clubs.map(c => <button type="button" key={c.id} className={participants.includes(c.id) ? 'actif' : ''} onClick={() => setParticipants(participants.includes(c.id) ? participants.filter(x => x !== c.id) : [...participants, c.id])}>{c.nom}</button>)}</div>
      {apercuPoules.length > 0 && <><div className="cel-apercu-format"><Icone nom="trophee" taille={20} /><div><b>{apercuPoules.length} poules de {apercuPoules.map(p => p.length).join(' · ')} clubs</b><span>Les {qualifiesApercu} meilleurs vont en {qualifiesApercu === 8 ? 'quarts de finale' : qualifiesApercu === 4 ? 'demi-finales' : 'finale'}. Les places restantes repêchent les meilleurs au même rang.</span></div></div>
        <div className="cel-composition-poules">{apercuPoules.map((poule, index) => <article key={index}><h4>Poule {String.fromCharCode(65 + index)}</h4>{poule.map(id => { const club = vue.clubs.find(c => c.id === id); return <span key={id}><b>{club?.nom}</b><Ecusson nom={club?.nom ?? 'Club'} logo={club?.embleme} /></span>; })}</article>)}</div></>}
      {format === 'elimination' && formatEffectif === 'poules' && <p className="cel-note">Avec {participants.length} clubs, la coupe passera automatiquement par des poules afin que personne ne soit exempt au hasard.</p>}
      <button className="btn primaire" disabled={occupe || participants.length < (formatEffectif === 'poules' ? 3 : 2)}>{t('online.competition.createNamed', { name: nom })}</button>
    </form>}

    {competition?.format === 'championnat' && <section className="cel-panneau"><h2>{t('online.table.rank')}</h2><Classement vue={vue} onClub={setFicheClub} /></section>}
    {competition?.format === 'poules' && <ClassementsPoules vue={vue} competition={competition} onClub={setFicheClub} />}
    {((competition?.format === 'elimination' || competition?.format === 'poules') || (competition?.format === 'championnat' && competition.playoffs)) && <TableauCoupe vue={vue} competition={competition} rencontres={rencontres} suivre={suivre} />}
    {ficheClub && <FicheClubEnLigne vue={vue} clubId={ficheClub} onFermer={() => setFicheClub(null)} />}

    {journees.map(j => {
      const etape = nomEtapeCompetition(competition, j);
      const affiches = rencontres.filter(r => r.journee === j);
      return <section key={j} className={`cel-panneau${etape.estPlayoff ? ' cel-panneau-playoff' : ''}`}>
        <div className="cel-titre-ligne">
          <div>
            {etape.estPlayoff && <div className="eyebrow cel-eyebrow-playoff">{t('online.competition.playoffsTrophy')}</div>}
            {etape.estElimination && !etape.estPlayoff && <div className="eyebrow cel-eyebrow-elimination">{t('online.competition.straightKnockout')}</div>}
            <h2>{etape.estPlayoff && <Icone nom="trophee" taille={21} />} {etape.titreComplet}</h2>
          </div>
          <small>{t('online.calendar.fromTo', { from: date(affiches[0]?.ouvre), to: date(affiches[0]?.ferme) })}</small>
        </div>
        <div className="cel-grille-rencontres">{affiches.map(r => <Rencontre key={r.id} vue={vue} rencontre={r} agir={agir} occupe={occupe} suivre={suivre} />)}</div>
      </section>;
    })}

    {!vue.competitions.length && <Vide icone="trophee" titre={t('online.competition.notStarted')}>{t('online.competition.notStartedHelp')}</Vide>}
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

const nomNature = (nature: string): string => {
  const cle = `online.nature.${nature}`;
  const traduit = t(cle);
  return traduit === cle ? (NATURES[nature]?.label ?? nature) : traduit;
};

function PochetteRecord({ rarete }: { rarete: CarteCarriere['rarete'] }) {
  return <div className={`cel-pochette-record ${rarete}`} aria-label={t('online.history.packAriaLabel', { name: nomRaretePack(rarete) })}>
    <Pack3D rarete={rarete} ouvert={false} calme transition="record" />
  </div>;
}

function StatistiquesSecretes() {
  const [stats, setStats] = useState<StatistiquesGlobalesCarriere | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    const controleur = new AbortController();
    void chargerStatistiquesGlobales(controleur.signal).then(setStats).catch(e => {
      if (!controleur.signal.aborted) setErreur(messageErreur(e));
    });
    return () => controleur.abort();
  }, []);
  if (erreur) return <Vide icone="alerte" titre="Statistiques indisponibles">{erreur}</Vide>;
  if (!stats) return <Vide icone="chrono" titre="Calcul des records">La base prépare les agrégats sans télécharger les ligues.</Vide>;
  return <section className="cel-panneau cel-stats-secret">
    <div className="cel-titre-ligne"><div><div className="eyebrow">Réservé au compte kiri</div><h2>Les chiffres de tout le jeu</h2></div><Icone nom="medaille" taille={28} /></div>
    <div className="cel-stats-compteurs">
      <article><strong>{montant(stats.ligues)}</strong><span>ligues créées</span></article>
      <article><strong>{montant(stats.comptes)}</strong><span>comptes</span></article>
      <article><strong>{montant(stats.clubs)}</strong><span>clubs engagés</span></article>
      <article><strong>{montant(stats.packsOuverts)}</strong><span>packs ouverts</span></article>
      <article><strong>{montant(stats.matchsJoues)}</strong><span>matchs joués</span></article>
      <article><strong>{montant(stats.ovasDepensesPacks)}</strong><span>Ovas dépensés en packs</span></article>
      <article><strong>{montant(stats.volumeMarche)}</strong><span>Ovas passés sur le marché</span></article>
    </div>
    <div className="cel-records">
      <article><Icone nom="cadeau" taille={24} /><div><small>Plus grand ouvreur</small><b>{stats.meilleurOuvreur?.pseudo ?? 'Pas encore de pack'}</b><span>{stats.meilleurOuvreur ? `${montant(stats.meilleurOuvreur.packs)} packs · ${stats.meilleurOuvreur.ligue}` : '—'}</span></div></article>
      <article>{stats.meilleurPack && <PochetteRecord rarete={stats.meilleurPack.apparence} />}<div><small>Meilleur pack</small><b>{stats.meilleurPack?.joueur ?? 'Pas encore de record'}</b><span>{stats.meilleurPack ? `${stats.meilleurPack.note} GEN · ${stats.meilleurPack.pseudo} · ${stats.meilleurPack.ligue}` : '—'}</span></div></article>
      <article><Icone nom="poignee" taille={24} /><div><small>Plus gros achat</small><b>{stats.plusGrosAchat?.joueur || 'Pas encore de vente'}</b><span>{stats.plusGrosAchat ? `${montant(stats.plusGrosAchat.montant)} Ovas · ${stats.plusGrosAchat.pseudo} · ${stats.plusGrosAchat.ligue}` : '—'}</span></div></article>
    </div>
  </section>;
}

function AdministrationKiri({ observer, occupe }: { observer: (id: string) => Promise<void>; occupe: boolean }) {
  const [vue, setVue] = useState<AdministrationCarriere | null>(null);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [section, setSection] = useState<'comptes' | 'ligues'>('comptes');
  const normalisee = recherche.trim().toLocaleLowerCase('fr');
  useEffect(() => {
    const controleur = new AbortController();
    void chargerAdministrationCarriere(controleur.signal).then(setVue).catch(e => {
      if (!controleur.signal.aborted) setErreur(messageErreur(e));
    });
    return () => controleur.abort();
  }, []);
  if (erreur) return <Vide icone="alerte" titre="Répertoire indisponible">{erreur}</Vide>;
  if (!vue) return <Vide icone="chrono" titre="Chargement du répertoire">La base prépare les comptes et les ligues.</Vide>;
  const comptes = vue.comptes.filter(c => `${c.pseudo} ${c.id}`.toLocaleLowerCase('fr').includes(normalisee));
  const ligues = vue.ligues.filter(l => `${l.nom} ${l.code} ${l.createur} ${l.id}`.toLocaleLowerCase('fr').includes(normalisee));
  return <section className="cel-panneau cel-admin-kiri">
    <div className="cel-titre-ligne"><div><div className="eyebrow">Réservé au compte kiri</div><h2>Comptes et ligues créés</h2></div><Icone nom="profil" taille={28} /></div>
    <p className="cel-note">Ce panneau ne transmet ni identifiant de connexion, ni mot de passe, ni jeton de session.</p>
    <div className="cel-admin-outils">
      <nav className="cel-onglets secondaires" aria-label="Contenu du répertoire">
        <button className={section === 'comptes' ? 'actif' : ''} onClick={() => setSection('comptes')}>Comptes ({montant(vue.comptes.length)})</button>
        <button className={section === 'ligues' ? 'actif' : ''} onClick={() => setSection('ligues')}>Ligues ({montant(vue.ligues.length)})</button>
      </nav>
      <label className="cel-champ"><span>Rechercher</span><input type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder={section === 'comptes' ? 'Pseudo ou identifiant technique…' : 'Nom, code, créateur…'} /></label>
    </div>
    {section === 'comptes' ? <div className="cel-table-scroll"><table className="cel-table cel-admin-table"><thead><tr><th>Compte</th><th>Créé</th><th>Dernière connexion</th><th>Ligues</th><th>ID technique</th></tr></thead><tbody>
      {comptes.map(c => <tr key={c.id}><th>{c.pseudo}</th><td>{c.creeLe ? dateHeure(c.creeLe) : '—'}</td><td>{c.vuLe ? dateHeure(c.vuLe) : '—'}</td><td><b>{c.ligues}</b></td><td><code title={c.id}>{c.id.slice(0, 8)}…</code></td></tr>)}
    </tbody></table>{!comptes.length && <p className="cel-note">Aucun compte ne correspond à cette recherche.</p>}{vue.comptesTronques && <p className="cel-note">Seuls les {vue.limite} comptes les plus récents sont affichés.</p>}</div>
      : <div className="cel-table-scroll"><table className="cel-table cel-admin-table"><thead><tr><th>Ligue</th><th>Code</th><th>Créateur</th><th>État</th><th>Saison</th><th>Clubs</th><th>Créée</th><th>Accès</th></tr></thead><tbody>
        {ligues.map(l => <tr key={l.id}><th>{l.nom}<small title={l.id}>{l.id.slice(0, 8)}…</small></th><td><code>{l.code}</code></td><td>{l.createur}</td><td>{l.phase || '—'}</td><td>{l.saison}</td><td><b>{l.clubs}</b></td><td>{l.creeLe ? dateHeure(l.creeLe) : '—'}</td><td><button type="button" className="btn fantome petit" disabled={occupe} onClick={() => { void observer(l.id); }}><Icone nom="oeil" taille={15} /> Observer</button></td></tr>)}
      </tbody></table>{!ligues.length && <p className="cel-note">Aucune ligue ne correspond à cette recherche.</p>}{vue.liguesTronquees && <p className="cel-note">Seules les {vue.limite} ligues les plus récentes sont affichées.</p>}</div>}
  </section>;
}

function Histoire({ vue }: { vue: VueCarriereEnLigne }) {
  return <>
    <section className="cel-panneau">
      <div className="cel-titre-ligne"><div><div className="eyebrow">{t('online.title')}</div><h2>{t('online.history.records')}</h2></div><Icone nom="medaille" /></div>
      <div className="cel-records">
        <article><Icone nom="cadeau" taille={24} /><div><small>{t('online.history.biggestOpener')}</small><b>{vue.statistiques.meilleurOuvreur?.pseudo ?? t('online.history.noPacksYet')}</b><span>{vue.statistiques.meilleurOuvreur ? t('online.history.openedPacksCount', { count: montant(vue.statistiques.meilleurOuvreur.packs) }) : t('online.history.recordAwaits')}</span></div></article>
        <article>{vue.statistiques.meilleurPack && <PochetteRecord rarete={vue.statistiques.meilleurPack.apparence} />}<div><small>{t('online.history.bestPack')}</small><b>{vue.statistiques.meilleurPack?.joueur ?? t('online.history.noRecordYet')}</b><span>{vue.statistiques.meilleurPack ? `${vue.statistiques.meilleurPack.note} GEN · ${vue.statistiques.meilleurPack.pseudo} · ${vue.statistiques.meilleurPack.pack}` : '—'}</span></div></article>
        <article><Icone nom="poignee" taille={24} /><div><small>{t('online.history.biggestBuy')}</small><b>{vue.statistiques.plusGrosAchat?.joueur ?? t('online.history.noSalesYet')}</b><span>{vue.statistiques.plusGrosAchat ? `${montant(vue.statistiques.plusGrosAchat.montant)} Ovas · ${vue.statistiques.plusGrosAchat.pseudo}` : '—'}</span></div></article>
      </div>
      <div className="cel-packs-clubs">{vue.statistiques.parClub.map(c => <span key={c.clubId}><b>{c.pseudo}</b><em>{montant(c.packs)} {t('online.history.clubPackCount', { count: c.packs })}</em></span>)}</div>
    </section>
    <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>{t('online.history.honours')}</h2><Icone nom="medaille" /></div>
      {vue.histoire.length ? <div className="cel-palmares">{[...vue.histoire].reverse().map((h, i) => <article key={`${h.competitionId}-${i}`} className={h.vainqueur === vue.monClubId ? 'moi' : ''}>
        {h.logo ? <img className="cel-logo-ligue grand" src={h.logo} alt="" /> : <Icone nom="trophee" taille={30} />}
        <div><b>{h.trophee}</b><small>{h.nom} · {t('online.history.seasonNum', { n: h.saison })}</small></div>
        <span>{nomClub(vue, h.vainqueur)}</span>
      </article>)}</div> : <p className="cel-note">{t('online.history.empty')}</p>}
    </section>
    <section className="cel-panneau">
      <div className="cel-titre-ligne"><h2>{t('online.history.journal')}</h2><Icone nom="journal" /></div>
      <div className="cel-journal">{[...vue.transactions].reverse().slice(0, 60).map(t => <p key={t.id} className={t.ovas >= 0 ? 'credit' : 'debit'}>
        <Icone nom={NATURES[t.nature]?.icone ?? 'journal'} taille={16} />
        <span><b>{nomNature(t.nature)}</b>{t.libelle}</span>
        <em>{t.ovas > 0 ? '+' : ''}{montant(t.ovas)}</em>
        <small>{dateHeure(t.date)}</small>
      </p>)}</div>
      {!vue.transactions.length && <p className="cel-note">{t('online.history.nothingYet')}</p>}
    </section>
  </>;
}
