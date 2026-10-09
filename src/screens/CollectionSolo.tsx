import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icone } from '../components/Icone';
import { CarteJoueurEnLigne } from '../components/CarteJoueurEnLigne';
import OuverturePack from '../components/OuverturePack';
import BoutiquePacks3D from '../components/BoutiquePacks3D';
import { useGame } from '../store/useGame';
import { carteDepuisSource, PACKS_CARRIERE, packsChampionnatsFeminins } from '../lib/ligue/catalogueCarriere';
import type { SourceCarte } from '../lib/ligue/catalogueCarriere';
import { catalogueSpecialSolo, synchroniserCatalogueSolo, useCatalogueSolo } from '../lib/catalogueSoloCommun';
import type { PackCarriere, RareteCarriere } from '../lib/ligue/typesCarriere';
import { cleCarteSolo, IDS_PACKS_SOLO_GRATUITS, ouvrirPackSolo, packsCollectionSolo, packsEvenementSolo, prixPackSoloArticle } from '../lib/collectionSolo';
import { SoldesMonnaies } from '../components/SoldesMonnaies';
import { demanderPaiement } from '../lib/achatUi';
import { montantEn, type Devise } from '../lib/monnaies';
import { nomPackCarriere } from '../lib/presentationPacks';
import { carteSpecialeVisibleCollection, preparerTirageSpecial, nomFamilleSpeciale } from '../lib/ligue/cartesSpeciales';
import { Citrouille, EmblemeIcon, EmblemeInfluenceur } from '../components/EmblemesSpeciaux';
import { nombre, t } from '../lib/i18n';
import { apparencePack, modelePackParNom, packAvecSkin, evolutionEliteFrancaise } from '../lib/presentationPacks';
import { chargerPacksPrivesSolo, ouvrirPackPriveSolo } from '../lib/carriereEnLigneClient';
import type { PackInterneBoutique } from '../lib/packsInternes';
import { appliquerCollectionSoloDistante, attendreBoutiqueSoloEnregistree } from '../lib/synchronisationBoutiqueCompte';
import './CollectionSolo.css';
import { fournirCatalogueUsage } from '../lib/usage/collection';

const PAR_PAGE = 40;
const EchangesCollectionSolo = lazy(() => import('../components/EchangesCollectionSolo').then(module => ({ default: module.EchangesCollectionSolo })));
const RARETES: RareteCarriere[] = ['bronze', 'argent', 'or', 'elite', 'star'];
const normaliser = (texte: string) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function CollectionSolo() {
  const setEcran = useGame(s => s.setEcran);
  const coins = useGame(s => s.coins);
  const credits = useGame(s => s.credits);
  const etat = useGame(s => s.collectionSolo);
  const acheterPack = useGame(s => s.acheterPackCollectionSolo);
  const joueur = useGame(s => s.joueur);
  const manager = useGame(s => s.manager);
  const catalogue = useCatalogueSolo();
  useEffect(() => { fournirCatalogueUsage(catalogue, cleCarteSolo); }, [catalogue]);
  // Relu à chaque nouveau catalogue : `useCatalogueSolo` change d'identité quand
  // le serveur a servi de nouvelles cartes spéciales.
  const speciales = useMemo(() => (catalogue.length ? catalogueSpecialSolo() : null), [catalogue]);
  // L'horloge de la boutique : le pack d'un événement qui se termine disparaît
  // dans la minute, même si l'écran est resté ouvert.
  const [instant, setInstant] = useState(() => Date.now());
  useEffect(() => { const minute = window.setInterval(() => setInstant(Date.now()), 60_000); return () => window.clearInterval(minute); }, []);
  // ⚠️ LE PACK HALLOWEEN EST ICI, DANS LES PACKS SPÉCIAUX, PAS DANS LES LIGUES.
  // Il apparaît en tête pendant sa fenêtre et disparaît seul à la fin du mois.
  const packsEvenement = useMemo(() => packsEvenementSolo(speciales, instant), [speciales, instant]);
  const packsRoue = useMemo<PackCarriere[]>(() => [...packsEvenement, ...packsCollectionSolo([...PACKS_CARRIERE, ...packsChampionnatsFeminins(catalogue)])], [packsEvenement, catalogue]);
  const idsPacksGratuits = useMemo(() => new Set<string>(IDS_PACKS_SOLO_GRATUITS), []);
  const packsGratuits = useMemo(() => packsRoue.filter((pack) => idsPacksGratuits.has(pack.id)), [packsRoue, idsPacksGratuits]);
  const packsPayants = useMemo(() => packsRoue.filter((pack) => !idsPacksGratuits.has(pack.id)), [packsRoue, idsPacksGratuits]);
  /** Une carte spéciale non obtenue ne se montre que publiée, et son événement ouvert. */
  const visibleSiInconnue = useCallback((carte: SourceCarte) => {
    if (!carte.speciale) return true;
    const def = speciales?.parId.get(carte.sourceId);
    return Boolean(def && speciales && carteSpecialeVisibleCollection(def, speciales, instant));
  }, [speciales, instant]);
  /** Ce que chaque pack payant peut donner en cartes spéciales, par carte. */
  const chancesSpeciales = (packId: string) => {
    const pack = packsRoue.find(p => p.id === packId);
    if (!pack || !speciales) return [];
    return (preparerTirageSpecial(pack, true, instant, new Set(), speciales)?.lots ?? [])
      .map(lot => ({ nom: nomFamilleSpeciale(speciales.evenementParId.get(lot.evenement)!.cardType), chance: lot.chance }))
      .filter(c => c.chance > 0);
  };
  const [typeCartes, setTypeCartes] = useState<'' | 'normal' | 'icon' | 'halloween' | 'influencer'>('');
  const comptesSpeciaux = useMemo(() => {
    const comptes: Record<string, number> = {};
    for (const carte of catalogue) if (carte.speciale && (etat.quantites[cleCarteSolo(carte.sourceId)] || visibleSiInconnue(carte))) comptes[carte.speciale.type] = (comptes[carte.speciale.type] ?? 0) + 1;
    return comptes;
  }, [catalogue, etat.quantites, visibleSiInconnue]);
  const [categoriePacks, setCategoriePacks] = useState<'gratuits' | 'payants'>('gratuits');
  const [recherche, setRecherche] = useState('');
  const [rarete, setRarete] = useState<RareteCarriere | 'toutes'>('toutes');
  const [statut, setStatut] = useState<'toutes' | 'trouvees' | 'manquantes'>('trouvees');
  const [page, setPage] = useState(0);
  const [ouverture, setOuverture] = useState<{ pack: PackCarriere; indices: number[]; catalogue: readonly SourceCarte[]; ordreImpose?: boolean } | null>(null);
  const [bilan, setBilan] = useState('');
  const nomCompte = joueur?.pseudo ?? joueur?.nom ?? manager?.nom ?? 'Compte joueur';
  const [echangesOuverts, setEchangesOuverts] = useState(false);
  const [packsPrives, setPacksPrives] = useState<PackCarriere[]>([]);
  // Packs de test (Correctif 33) : le serveur ne les envoie qu'au compte qui en a la permission.
  const [packsDeTest, setPacksDeTest] = useState<PackInterneBoutique[]>([]);
  const [occupe, setOccupe] = useState(false);
  const verrouOuverture = useRef(false);
  /** La monnaie que le joueur vient de choisir dans la fenêtre d'achat (Correctif 21) ; les packs gratuits n'en demandent aucune. */
  const choixDevise = useRef<Devise>('ovas');
  const controleurOuverture = useRef<AbortController | null>(null);
  useEffect(() => {
    let vivant = true;
    let controleur: AbortController | undefined;
    const charger = () => {
      controleurOuverture.current?.abort();
      controleur?.abort();
      controleur = new AbortController();
      const courant = controleur;
      setPacksPrives([]); setPacksDeTest([]);
      void chargerPacksPrivesSolo(courant.signal).then(resultat => {
        if (vivant && !courant.signal.aborted) { setPacksPrives(resultat.packs); setPacksDeTest(resultat.packsDeTest ?? []); }
      }).catch(() => { /* Aucun pack privé sans session vérifiée. */ });
    };
    const deconnecter = () => { controleur?.abort(); controleurOuverture.current?.abort(); setPacksPrives([]); setPacksDeTest([]); };
    charger();
    window.addEventListener('destiny-compte-connecte', charger);
    window.addEventListener('destiny-compte-deconnecte', deconnecter);
    return () => {
      vivant = false; controleur?.abort(); controleurOuverture.current?.abort();
      window.removeEventListener('destiny-compte-connecte', charger);
      window.removeEventListener('destiny-compte-deconnecte', deconnecter);
    };
  }, []);

  const cartesFiltrees = useMemo(() => {
    const terme = normaliser(recherche.trim());
    return catalogue.map((carte, indice) => {
      const quantite = etat.quantites[cleCarteSolo(carte.sourceId)] ?? 0;
      return { carte, indice, trouvee: quantite > 0, quantite };
    })
      .filter(({ carte, trouvee }) => (trouvee || visibleSiInconnue(carte))
        && (!typeCartes || (typeCartes === 'normal' ? !carte.speciale : carte.speciale?.type === typeCartes))
        && (rarete === 'toutes' || carte.rarete === rarete)
        && (statut === 'toutes' || (statut === 'trouvees' ? trouvee : !trouvee))
        && (!terme || normaliser(`${carte.nom} ${carte.clubReel} ${carte.nation} ${carte.championnat}`).includes(terme)))
      .sort((a, b) => b.carte.note - a.carte.note || a.carte.nom.localeCompare(b.carte.nom, 'fr'));
  }, [catalogue, etat.quantites, rarete, recherche, statut, typeCartes, visibleSiInconnue]);
  const pages = Math.max(1, Math.ceil(cartesFiltrees.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = cartesFiltrees.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);
  const total = catalogue.filter(carte => !carte.speciale || visibleSiInconnue(carte) || etat.quantites[cleCarteSolo(carte.sourceId)]).length;
  const trouvees = catalogue.reduce((somme, carte) => somme + (etat.quantites[cleCarteSolo(carte.sourceId)] ? 1 : 0), 0);
  const exemplaires = Object.values(etat.quantites).reduce((somme, quantite) => somme + quantite, 0);
  const progression = total ? Math.round(trouvees / total * 1000) / 10 : 0;

  const ouvrirDepuisRoue = async (id: string) => {
    if (verrouOuverture.current || ouverture) return;
    verrouOuverture.current = true; setOccupe(true);
    try {
      // Un pack de test s'ouvre par le même chemin qu'un pack privé : le serveur vérifie la permission et rend les cartes.
      const deTest = packsDeTest.find(pack => pack.id === id);
      const prive = deTest ?? packsPrives.find(pack => pack.id === id);
      if (prive) {
        const controleur = new AbortController();
        controleurOuverture.current = controleur;
        await attendreBoutiqueSoloEnregistree();
        if (controleur.signal.aborted) return;
        const resultat = await ouvrirPackPriveSolo(id, controleur.signal);
        if (controleur.signal.aborted) return;
        appliquerCollectionSoloDistante(resultat.boutique.collectionSolo);
        setBilan(deTest ? `Pack de test : ${resultat.cartes.length} carte(s) ajoutée(s) à ta collection.` : 'Dix cartes ICONS ajoutées à ta collection.');
        if (deTest) setPacksDeTest(packs => packs.map(pack => pack.id === id ? { ...pack, ouvertures: pack.ouvertures + 1 } : pack));
        setOuverture({ pack: prive, indices: resultat.cartes.map((_, indice) => indice), catalogue: resultat.cartes, ordreImpose: resultat.ordreImpose === true });
        return;
      }
      const pack = packsRoue.find(candidat => candidat.id === id);
      if (!pack) return;
      const catalogueActuel = await synchroniserCatalogueSolo();
      const gratuitPack = idsPacksGratuits.has(pack.id);
      const prixArt = prixPackSoloArticle(pack);
      const devise: Devise = gratuitPack ? 'ovas' : choixDevise.current;
      const prix = montantEn(prixArt, devise) ?? pack.prix;
      const resultat = acheterPack(prix, precedent => ouvrirPackSolo(pack, catalogueActuel, precedent, undefined,
        { speciales: catalogueSpecialSolo(), maintenant: Date.now() }), devise);
      if (!resultat) {
        const solde = devise === 'ovas' ? coins : credits;
        setBilan(solde < prix ? t(devise === 'ovas' ? 'solo.missingOvas' : 'solo.missingCredits', { n: nombre(prix - solde) }) : t('solo.noPlayerInPack'));
        return;
      }
      const doublons = resultat.indices.length - resultat.nouvelles;
      const texteNouvelles = resultat.nouvelles > 1 ? t('solo.summaryNewPlural', { n: resultat.nouvelles }) : t('solo.summaryNew', { n: resultat.nouvelles });
      const texteDoublons = doublons > 1 ? t('solo.summaryDupPlural', { n: doublons }) : t('solo.summaryDup', { n: doublons });
      setBilan(`${texteNouvelles}, ${texteDoublons}.`);
      setOuverture({ pack, indices: resultat.indices, catalogue: catalogueActuel });
    } catch (erreur) {
      if (!(erreur instanceof Error && erreur.name === 'AbortError')) {
        setBilan(erreur instanceof Error ? erreur.message : 'Impossible d’ouvrir ce pack.');
      }
    } finally { controleurOuverture.current = null; verrouOuverture.current = false; setOccupe(false); }
  };

  return <section className="solo-collection">
    <header className="solo-entete">
      <button type="button" className="btn fantome" onClick={() => setEcran('accueil')}><Icone nom="fleche-droite" className="solo-retour" taille={16} /> {t('online.home')}</button>
      <div><div className="eyebrow">{t('solo.account', { name: nomCompte })}</div><h1>{t('solo.title')}</h1><p>{t('solo.description')}</p></div>
      <div className="solo-entete-droite">
        <SoldesMonnaies />
      </div>
    </header>

    <section className="solo-progression carte">
      <div><span>{t('solo.found')}</span><strong>{nombre(trouvees)} <small>/ {nombre(total)}</small></strong></div>
      <div className="solo-jauge"><i style={{ width: `${progression}%` }} /><span>{progression} %</span></div>
      <div className="solo-stats"><span><b>{nombre(Object.values(etat.packsOuverts).reduce((s, n) => s + n, 0))}</b> {t('solo.packsOpened')}</span><span><b>{nombre(etat.doublons)}</b> {t('solo.duplicates')}</span><span><b>{nombre(exemplaires)}</b> {t('solo.totalCards')}</span></div>
    </section>

    {bilan && <p className="solo-bilan" role="status"><Icone nom="ok" taille={17} /> {bilan}</p>}

    <button type="button" className="btn fantome solo-bouton-echanges" onClick={() => setEchangesOuverts(ouvert => !ouvert)}>
      {echangesOuverts ? t("ui.ad2d61675932") : t("ui.5c8f1fe771de")}
    </button>
    {echangesOuverts && <Suspense fallback={<p>{t("ui.f433895f5136")}</p>}><EchangesCollectionSolo /></Suspense>}

    {packsDeTest.length > 0 && <section className="solo-rayon solo-packs-test" aria-labelledby="solo-packs-test-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">Outil interne</div><h2 id="solo-packs-test-titre">Packs de test</h2></div><span>Contenu imposé, composé dans le Labo. Ces packs n’existent que pour ce compte.</span></div>
      <ul className="solo-liste-packs-test">{packsDeTest.map(pack => <li key={pack.id}>
        <button type="button" className={`solo-pack-test palier-${apparencePack(pack)}`} disabled={occupe || Boolean(ouverture)} onClick={() => { void ouvrirDepuisRoue(pack.id); }}>
          <span className="solo-pack-test-pochette" aria-hidden="true"><Icone nom="cadeau" taille={22} /></span>
          <span className="solo-pack-test-nom"><b>{pack.nom}</b><small>{pack.cartes} carte(s) · {pack.ouvertures ? `ouvert ${pack.ouvertures} fois` : 'jamais ouvert'}</small></span>
          <span className="solo-pack-test-action">Ouvrir</span>
        </button>
      </li>)}</ul>
    </section>}

    {packsPrives.length > 0 && <section className="solo-rayon" aria-labelledby="solo-packs-prives-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.privateAccount')}</div><h2 id="solo-packs-prives-titre">{t('solo.iconGuaranteed')}</h2></div><span>{t('solo.freeIconPack')}</span></div>
      <BoutiquePacks3D packs={packsPrives} solde={coins} occupe={occupe || Boolean(ouverture)} gratuit
        onOuvrir={ouvrirDepuisRoue} chancesSpeciales={() => [{ nom: 'ICON', chance: 100 }]} />
    </section>}

    <section className="solo-rayon" aria-labelledby="solo-packs-titre">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.allPacks')}</div><h2 id="solo-packs-titre">{t('solo.choosePack')}</h2></div><span>{categoriePacks === 'gratuits' ? t('solo.freePacksHelp') : t('solo.paidPacksHelp')}</span></div>
      <div className="solo-categories-packs" role="tablist" aria-label={t('solo.packCategories')}>
        <button
          type="button"
          role="tab"
          aria-selected={categoriePacks === 'gratuits'}
          onClick={() => setCategoriePacks('gratuits')}
        >
          <span><Icone nom="cadeau" taille={20} /></span>
          <b>{t('solo.freePacks')}</b>
          <small>{t('solo.freePacksDetail')}</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={categoriePacks === 'payants'}
          onClick={() => setCategoriePacks('payants')}
        >
          <span><Icone nom="ova" taille={20} /></span>
          <b>{t('solo.paidPacks')}</b>
          <small>{t('solo.paidPacksDetail', { n: packsPayants.length })}</small>
        </button>
      </div>
      <BoutiquePacks3D
        key={categoriePacks}
        packs={categoriePacks === 'gratuits' ? packsGratuits : packsPayants}
        solde={coins}
        occupe={occupe || ouverture !== null}
        onOuvrir={ouvrirDepuisRoue}
        gratuit={categoriePacks === 'gratuits'}
        chancesSpeciales={chancesSpeciales}
        avantAchat={categoriePacks === 'gratuits' ? undefined : async (pack) => {
          // Le joueur CHOISIT sa monnaie quand le pack accepte les deux ; un solde insuffisant ouvre une vraie fenêtre, jamais un message muet.
          const d = await demanderPaiement({ titre: nomPackCarriere(pack), prix: prixPackSoloArticle(pack) });
          if (!d) return false;
          choixDevise.current = d;
          return true;
        }}
        etiquettePrix={categoriePacks === 'gratuits' ? undefined : (pack) => {
          const p = prixPackSoloArticle(pack);
          // Les Crédits ne s'obtiennent plus : leur prix ne s'affiche que pour qui en a encore.
          const o = montantEn(p, 'ovas'), c = credits > 0 || montantEn(p, 'ovas') === null ? montantEn(p, 'credits') : null;
          return [o !== null ? nombre(o) + ' Ovas' : '', c !== null ? nombre(c) + ' ' + t('mo.credits') : ''].filter(Boolean).join(' · ');
        }}
        paiementAlternatif={categoriePacks === 'gratuits' ? <button type="button" className="btn fantome petit solo-pub-desactivee" disabled title={t('solo.adTitle')}><Icone nom="video" taille={15} /> {t('solo.adDisabled')}</button> : undefined}
      />
    </section>

    <section className="solo-catalogue">
      <div className="solo-titre-ligne"><div><div className="eyebrow">{t('solo.playersSubtitle')}</div><h2>{t('solo.playersTitle')}</h2></div><span>{t('solo.badgeNotice')}</span></div>
      {Object.keys(comptesSpeciaux).length > 0 && <div className="solo-types" role="group" aria-label={t('special.filter.label')}>
        {([['', t('online.collection.all'), null], ['normal', t('special.filter.players'), null],
          ['icon', t('special.icons'), <EmblemeIcon key="i" taille={20} />], ['halloween', t('special.halloween'), <Citrouille key="h" taille={20} />], ['influencer', t('special.influencers'), <EmblemeInfluenceur key="c" taille={20} />]] as const).map(([valeur, libelle, embleme]) =>
          (valeur === 'icon' || valeur === 'halloween' || valeur === 'influencer') && !comptesSpeciaux[valeur] ? null
            : <button key={valeur} type="button" className={`solo-type type-${valeur || 'tout'}${typeCartes === valeur ? ' actif' : ''}`} aria-pressed={typeCartes === valeur} onClick={() => { setTypeCartes(valeur); setPage(0); }}>
              {embleme}<span>{libelle}</span>{(valeur === 'icon' || valeur === 'halloween' || valeur === 'influencer') && <b>{nombre(comptesSpeciaux[valeur] ?? 0)}</b>}
            </button>)}
      </div>}
      <div className="solo-filtres">
        <label><span>{t('solo.search')}</span><input value={recherche} onChange={e => { setRecherche(e.target.value); setPage(0); }} placeholder={t('solo.searchPlaceholder')} /></label>
        <label><span>{t('solo.rarity')}</span><select value={rarete} onChange={e => { setRarete(e.target.value as RareteCarriere | 'toutes'); setPage(0); }}><option value="toutes">{t('solo.rarity.all')}</option>{RARETES.map(r => <option value={r} key={r}>{t(`online.rarity.${r}`)}</option>)}</select></label>
        <label><span>{t('solo.status')}</span><select value={statut} onChange={e => { setStatut(e.target.value as typeof statut); setPage(0); }}><option value="trouvees">{t('solo.status.owned')}</option><option value="toutes">{t('solo.status.all')}</option><option value="manquantes">{t('solo.status.missing')}</option></select></label>
      </div>
      <p className="solo-resultats">{nombre(cartesFiltrees.length)} {t('online.common.players')}</p>
      <div className="solo-cartes">
        {visibles.map(({ carte, trouvee, quantite }) => <div className="solo-carte-conteneur" key={carte.sourceId}>{quantite > 1 && <span className="solo-quantite" aria-label={t('solo.copiesCount', { count: quantite })}>×{quantite}</span>}<CarteJoueurEnLigne carte={carteDepuisSource(carte, 'solo', 'collection', 1)} compacte etatCollection={trouvee ? 'decouverte' : 'inconnue'} /></div>)}
      </div>
      {!visibles.length && <div className="solo-vide"><Icone nom="cadeau" taille={28} /><b>{statut === 'trouvees' ? t('solo.emptyOwned') : t('solo.emptyFiltered')}</b></div>}
      {pages > 1 && <nav className="solo-pagination" aria-label={t("ui.4730b31bdedb")}><button type="button" className="btn fantome" disabled={pageSure === 0} onClick={() => setPage(Math.max(0, pageSure - 1))}>{t('solo.pagination.prev')}</button><span>{t('solo.pagination.page', { page: pageSure + 1, pages })}</span><button type="button" className="btn fantome" disabled={pageSure >= pages - 1} onClick={() => setPage(Math.min(pages - 1, pageSure + 1))}>{t('solo.pagination.next')}</button></nav>}
    </section>

    {ouverture && <OuverturePack
      cartes={ouverture.indices.map((indice, position) => ({ ...carteDepuisSource(ouverture.catalogue[indice], 'solo', 'collection', 1), id: `solo-pack-${position}-${ouverture.catalogue[indice].sourceId}` }))}
      // Le titre de la fenêtre écrit déjà « Pack … » : un pack de test nommé « Pack Test » ne le dit pas deux fois.
      pack={ouverture.ordreImpose ? ouverture.pack.nom.replace(/^pack\s+/i, '') || ouverture.pack.nom : ouverture.pack.nom}
      modele={packAvecSkin(ouverture.pack) ? modelePackParNom(ouverture.pack) : undefined}
      evolutionElite={evolutionEliteFrancaise(ouverture.pack)}
      garantie={ouverture.pack.garantie}
      // Un pack de test part du bronze : la pochette monte palier par palier jusqu'à sa meilleure carte, comme un vrai tirage.
      apparenceInitiale={ouverture.ordreImpose ? 'bronze' : apparencePack(ouverture.pack)}
      ordreImpose={ouverture.ordreImpose}
      onFermer={() => setOuverture(null)}
      rendreCarte={carte => <CarteJoueurEnLigne carte={carte} compacte proprietaire="Ma collection" />}
    />}

  </section>;
}
