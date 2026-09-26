import { useEffect, useMemo, useState } from 'react';
import { chargerCollectionCarriere, chargerEmblemesCarriere } from '../lib/carriereEnLigneClient';
import type { PageCollection, VueCarriereEnLigne } from '../lib/ligue/typesCarriere';
import { NOMS_PACK } from '../lib/presentationPacks';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { EcussonClub } from './EcussonClub';
import { locale, nombre, t } from '../lib/i18n';
import './CollectionLigue.css';

const obtenirPostesLigue = (): [string, string][] => [
  ['pilier', t('poste.groupe.pilier')],
  ['talonneur', t('poste.groupe.talonneur')],
  ['deuxieme_ligne', t('poste.groupe.deuxieme_ligne')],
  ['troisieme_ligne', t('poste.groupe.troisieme_ligne')],
  ['demi_melee', t('poste.groupe.demi_melee')],
  ['demi_ouverture', t('poste.groupe.demi_ouverture')],
  ['centre', t('poste.groupe.centre')],
  ['ailier', t('poste.groupe.ailier')],
  ['arriere', t('poste.groupe.arriere')],
];

export function CollectionLigue({ vue }: { vue: VueCarriereEnLigne }) {
  const [filtres, setFiltres] = useState({ q: '', rarete: '', poste: '', statut: '', club: '', tri: 'note', page: '1' });
  const [donnees, setDonnees] = useState<PageCollection | null>(null);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState('');
  const [revision, setRevision] = useState(0);
  const [logos, setLogos] = useState<Map<string, string>>(new Map());
  const etatCartes = useMemo(() => vue.cartes.map(c => `${c.id}:${c.proprietaire}:${c.note}:${c.rarete}`).join('|'), [vue.cartes]);
  useEffect(() => {
    let vivant = true;
    void chargerEmblemesCarriere().then(catalogue => { if (vivant) setLogos(new Map(catalogue.groupes.flatMap(g => g.emblemes.map(e => [e.nom, e.logo] as const)))); }).catch(() => {});
    return () => { vivant = false; };
  }, []);
  useEffect(() => {
    const controle = new AbortController();
    setCharge(true); setErreur('');
    const attente = setTimeout(() => {
      void chargerCollectionCarriere(vue.id, filtres, controle.signal).then(resultat => {
        if (!controle.signal.aborted) setDonnees(resultat);
      }).catch(e => {
        if (!controle.signal.aborted) { setDonnees(null); setErreur(e instanceof Error ? e.message : 'Collection indisponible.'); }
      }).finally(() => { if (!controle.signal.aborted) setCharge(false); });
    }, 250);
    return () => { clearTimeout(attente); controle.abort(); };
  }, [vue.id, vue.saison, etatCartes, filtres, revision]);
  function changer(cle: keyof typeof filtres, valeur: string) { setFiltres(f => ({ ...f, [cle]: valeur, ...(cle === 'page' ? {} : { page: '1' }) })); }
  const club = (id: string | null) => vue.clubs.find(c => c.id === id)?.nom ?? 'Club de la ligue';
  return <section className="cel-collection" aria-label={t('online.nav.collection')}>
    <header className="cel-panneau cel-collection-header"><div><div className="eyebrow">{t('online.collection.catalogue')}</div><h2>{t('online.nav.collection')}</h2><p>{t('online.collection.desc')}</p></div>
      {donnees && <div className="cel-collection-counts"><span><b>{nombre(donnees.catalogueTotal)}</b> {t('online.collection.players',{n:''}).trim()}</span><span><b>{nombre(donnees.packes)}</b> {t('online.collection.packStatus.packed').toLowerCase()}</span><span><b>{nombre(donnees.distribues)}</b> {t('online.collection.packStatus.distributed').toLowerCase()}</span></div>}
    </header>
    <div className="cel-panneau cel-collection-filters">
      <label className="cel-collection-search">{t('online.collection.search')}<input type="search" placeholder={t('solo.searchPlaceholder')} maxLength={100} value={filtres.q} onChange={e => changer('q', e.target.value)} /></label>
      <label>{t('online.collection.rarity')}<select value={filtres.rarete} onChange={e => changer('rarete', e.target.value)}><option value="">{t('online.collection.all')}</option>{Object.entries(NOMS_PACK).map(([r, nom]) => <option key={r} value={r}>{nom}</option>)}</select></label>
      <label>{t('online.collection.position')}<select value={filtres.poste} onChange={e => changer('poste', e.target.value)}><option value="">{t('online.collection.all')}</option>{obtenirPostesLigue().map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}</select></label>
      <label>{t('online.collection.status')}<select value={filtres.statut} onChange={e => changer('statut', e.target.value)}><option value="">{t('online.collection.all')}</option><option value="libre">{t('online.collection.packStatus.notDistributed')}</option><option value="pack">{t('online.collection.packStatus.packed')}</option><option value="distribue">{t('online.collection.packStatus.distributed')}</option><option value="moi">{t('online.collection.packStatus.inMySquad')}</option></select></label>
      <label>{t('online.collection.heldBy')}<select value={filtres.club} onChange={e => changer('club', e.target.value)}><option value="">{t('online.collection.allClubs')}</option>{vue.clubs.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></label>
      <label>{t('online.collection.sort')}<select value={filtres.tri} onChange={e => changer('tri', e.target.value)}><option value="note">GEN</option><option value="nom">A–Z</option></select></label>
    </div>
    {erreur && <div className="cel-erreur" role="alert"><p>{erreur}</p><button className="btn fantome" onClick={() => setRevision(n => n + 1)}>{t('online.retry')}</button></div>}
    <div className="cel-collection-toolbar" aria-live="polite"><span>{charge ? t('online.loading') : t('online.collection.players',{n:nombre(donnees?.total ?? 0)})}</span><button className="btn fantome" disabled={charge} onClick={() => setRevision(n => n + 1)}>{t('online.collection.refresh')}</button></div>
    <div aria-busy={charge} className="cel-collection-grid">
      {!charge && donnees?.joueurs.map(({ carte, obtenuPar, obtention, obtenuLe }) => {
        const clubDetenteur = carte.proprietaire ? vue.clubs.find(c => c.id === carte.proprietaire) : undefined;
        const decouverte = Boolean(clubDetenteur);
        return <article key={carte.sourceId} className={`cel-collection-entry${decouverte ? ' est-decouverte' : ' est-inconnue'}`}>
        <CarteJoueurEnLigne carte={carte} logoClub={logos.get(carte.clubReel)} etatCollection={decouverte ? 'decouverte' : 'inconnue'} />
        {clubDetenteur && <div className="cel-collection-club" title={t('online.collection.heldByClub', { name: clubDetenteur.nom })}>
          <EcussonClub logo={clubDetenteur.embleme ?? logos.get(clubDetenteur.nom)} nom={clubDetenteur.nom} taille={42} />
        </div>}
        <div className="cel-collection-owner">
          <strong>{carte.proprietaire ? t('online.collection.atClub', { club: club(carte.proprietaire) }) : t('online.collection.packStatus.notDistributed')}</strong>
          <span>{obtention === 'pack' ? t('online.collection.packedBy', { club: club(obtenuPar) }) : obtention === 'dotation' ? t('online.collection.grantedTo', { club: club(obtenuPar) }) : obtention === 'inconnue' ? t('online.collection.originUnknown') : t('online.collection.inLeaguePool')}</span>
          {obtenuLe && <small>{new Date(obtenuLe).toLocaleDateString(locale())}</small>}
        </div>
      </article>;
      })}
    </div>
    {!charge && donnees?.total === 0 && <p className="cel-panneau">{t('online.collection.emptyFiltered')}</p>}
    {donnees && <nav className="cel-collection-pagination" aria-label={t('online.nav.collection')}><button className="btn fantome" disabled={charge || donnees.page <= 1} onClick={() => changer('page', String(donnees.page - 1))}>{t('online.collection.previous')}</button><span>{t('online.collection.page',{page:donnees.page,pages:donnees.pages})}</span><button className="btn fantome" disabled={charge || donnees.page >= donnees.pages} onClick={() => changer('page', String(donnees.page + 1))}>{t('online.collection.next')}</button></nav>}
  </section>;
}
