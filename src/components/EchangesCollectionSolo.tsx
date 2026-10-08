import { locale, t } from '../lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import { useCatalogueSolo } from '../lib/catalogueSoloCommun';
import { cleCarteSolo } from '../lib/collectionSolo';
import type { LotCartesSolo, OffreSolo, PageOffresSolo, SuiviEchangesSolo } from '../lib/echangesSolo';
import { appliquerDeltaEchange, cartesEngagees, doublonsLibres } from '../lib/echangesSolo';
import {
  accepterOffreSolo, annulerOffreSolo, chargerSessionCarriere, creerOffreSolo, listerEchangesSolo, proposerOffreSolo,
  refuserOffreSolo, retirerPropositionSolo, type ReponseEchangeSolo,
} from '../lib/carriereEnLigneClient';
import { appliquerCollectionSoloDistante } from '../lib/synchronisationBoutiqueCompte';
import { carteDepuisSource, type SourceCarte } from '../lib/ligue/catalogueCarriere';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Icone } from './Icone';
import { RoueCartes } from './RoueCartes';
import './EchangesCollectionSolo.css';

// LA BOURSE DE LA COLLECTION — offres publiques et propositions entre joueurs.
//
// ⚠️ UNE PROPOSITION SE VOIT DES DEUX CÔTÉS (Correctif 26). Celui qui la reçoit la trouve dans « Propositions
// reçues », en tête de l'écran, quelle que soit la page de la bourse où dort son offre ; celui qui l'envoie la
// retrouve dans « Mes propositions envoyées » et peut la retirer. Avant, l'envoi ne laissait aucune trace : on
// renvoyait, le serveur refusait le doublon, et la fonction semblait cassée.
//
// ⚠️ RIEN NE CHANGE DE MAIN AVANT L'ACCEPTATION. Une proposition ne déplace aucune carte : elle reste dans la
// collection de son propriétaire, seulement marquée « promise » pour ne pas l'être deux fois. À l'acceptation, le
// serveur revérifie la possession et fait les deux mouvements dans la même transaction.
//
// ⚠️ L'ÉCRAN NE RECHARGE RIEN APRÈS UNE ACTION : la réponse porte un delta (`tradeCreated`, `tradeAccepted`…) —
// l'offre touchée, le suivi et la collection — et seules ces trois choses sont mises à jour.

const ajout = (lot: LotCartesSolo, cle: string): LotCartesSolo => ({ ...lot, [cle]: (lot[cle] ?? 0) + 1 });
const retrait = (lot: LotCartesSolo, cle: string): LotCartesSolo => {
  const suivant = { ...lot }; delete suivant[cle]; return suivant;
};
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

function LotVisuel({ lot, parCle, vide, onRetirer }: { lot: LotCartesSolo; parCle: Map<string, SourceCarte>; vide: string; onRetirer?: (cle: string) => void }) {
  const entrees = Object.entries(lot);
  return <div className="solo-echanges-cartes">{entrees.length ? entrees.map(([cle, quantite]) => {
    const carte = parCle.get(cle);
    return <div className="solo-echanges-carte" key={cle}>
      {carte ? <CarteJoueurEnLigne carte={carteDepuisSource(carte, 'solo', 'collection', 1)} compacte /> : <span className="solo-echanges-carte-inconnue">{t("ui.ac1085a53f74")}</span>}
      {quantite > 1 && <b className="solo-echanges-quantite">×{quantite}</b>}
      {onRetirer && <button type="button" onClick={() => onRetirer(cle)} aria-label={t("ui.7ada308c9f88", { v0: carte?.nom ?? t("ui.d2c12420b981") })}>{t("ui.68f23e451990")}</button>}
    </div>;
  }) : <span className="solo-echanges-vide">{vide}</span>}</div>;
}

/** Les deux côtés d'un échange, toujours dans le même ordre : ce qui part, ce qui arrive. */
function DeuxCotes({ gauche, droite, titreGauche, titreDroite, parCle, videDroite }: {
  gauche: LotCartesSolo; droite: LotCartesSolo; titreGauche: string; titreDroite: string;
  parCle: Map<string, SourceCarte>; videDroite?: string;
}) {
  return <div className="solo-echanges-cotes">
    <div className="solo-echanges-cote"><h4>{titreGauche}</h4><LotVisuel lot={gauche} parCle={parCle} vide={t('ech.vide.offre')} /></div>
    <Icone nom="repost" taille={26} />
    <div className="solo-echanges-cote"><h4>{titreDroite}</h4><LotVisuel lot={droite} parCle={parCle} vide={videDroite ?? t('ech.vide.offre')} /></div>
  </div>;
}

export function EchangesCollectionSolo() {
  const collection = useGame(s => s.collectionSolo);
  const [compte, setCompte] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [offres, setOffres] = useState<PageOffresSolo>({ offres: [], total: 0 });
  const [don, setDon] = useState<LotCartesSolo>({});
  const [souhait, setSouhait] = useState<LotCartesSolo>({});
  const [libre, setLibre] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [rechercheDoublon, setRechercheDoublon] = useState('');
  const [proposition, setProposition] = useState<{ offre: string; cartes: LotCartesSolo } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [fait, setFait] = useState('');
  const catalogue = useCatalogueSolo();
  const parCle = useMemo(() => new Map(catalogue.map(c => [cleCarteSolo(c.sourceId), c])), [catalogue]);

  // Un serveur d'avant le Correctif 26 ne renvoie pas le suivi : on le déduit de la page affichée.
  const suivi: SuiviEchangesSolo = useMemo(() => offres.suivi ?? {
    recues: offres.offres.filter(o => o.statut === 'ouverte' && o.compteId === compte && o.propositions.length > 0),
    envoyees: offres.offres.filter(o => o.statut === 'ouverte' && o.compteId !== compte && o.propositions.some(p => p.compteId === compte)),
  }, [offres, compte]);
  const engagees = useMemo(() => cartesEngagees(suivi, compte ?? ''), [suivi, compte]);
  const dejaProposees = useMemo(() => new Set(suivi.envoyees.map(o => o.id)), [suivi]);
  const nombreRecues = suivi.recues.reduce((n, o) => n + o.propositions.length, 0);

  // Les doublons PROPOSABLES : possédés en double, une fois retirés ceux déjà promis ailleurs.
  const doublons = useMemo(() => catalogue
    .filter(c => c.speciale?.trade_allowed !== false)
    .filter(c => { const cle = cleCarteSolo(c.sourceId); return (collection.quantites[cle] ?? 0) - (engagees[cle] ?? 0) > 1; })
    .sort((a, b) => b.note - a.note || a.nom.localeCompare(b.nom, 'fr')), [catalogue, collection.quantites, engagees]);
  const cartesDoublons = useMemo(() => doublons.filter(c => normaliser(`${c.nom} ${c.clubReel} ${c.poste}`).includes(normaliser(rechercheDoublon.trim())))
    .map(c => carteDepuisSource(c, 'solo', 'collection', 1)), [doublons, rechercheDoublon]);
  const idRoue = (cle: string) => {
    const source = parCle.get(cle);
    return source ? `solo:${source.sourceId}` : '';
  };
  const cleRoue = (id: string) => cleCarteSolo(id.slice('solo:'.length));
  const trouvailles = useMemo(() => {
    const terme = normaliser(recherche.trim());
    if (terme.length < 2) return [];
    return catalogue.filter(c => c.speciale?.trade_allowed !== false && normaliser(`${c.nom} ${c.clubReel}`).includes(terme)).slice(0, 12);
  }, [catalogue, recherche]);

  /** Une lecture de la bourse : la page, le suivi, et la collection si le serveur en connaît une plus récente. */
  const recevoir = useCallback((resultat: PageOffresSolo) => {
    if (resultat.collectionSolo) appliquerCollectionSoloDistante(resultat.collectionSolo);
    setOffres(resultat);
  }, []);
  const charger = async (numero = page) => {
    recevoir(await listerEchangesSolo(numero * 30, useGame.getState().collectionSolo.revision ?? 0));
  };
  useEffect(() => {
    let actif = true;
    void chargerSessionCarriere().then(session => {
      if (!actif) return;
      setCompte(session.compte.id);
      return listerEchangesSolo(0, useGame.getState().collectionSolo.revision ?? 0).then(resultat => { if (actif) recevoir(resultat); });
    }).catch(e => { if (actif) setErreur(e instanceof Error ? e.message : t('ech.erreur')); });
    return () => { actif = false; };
  }, [recevoir]);

  /**
   * Une action : la réponse dit ce qui a changé, et rien d'autre n'est relu.
   * ⚠️ Un verrou par action (`occupe`) : un double appui n'envoie pas deux fois la même proposition.
   */
  const agir = async (action: () => Promise<ReponseEchangeSolo>) => {
    if (occupe) return false;
    setOccupe(true); setErreur(''); setFait('');
    try {
      const resultat = await action();
      if (resultat.boutique) appliquerCollectionSoloDistante(resultat.boutique.collectionSolo);
      const delta = resultat.delta;
      if (delta && compte) {
        setOffres(avant => appliquerDeltaEchange(avant, delta, compte));
        setFait(t(`ech.fait.${delta.evenement}`));
      } else await charger();
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t('ech.erreur'));
      // L'offre a pu changer entre-temps (acceptée par un autre, retirée) : on relit pour montrer l'état réel.
      await charger().catch(() => {});
      return false;
    } finally { setOccupe(false); }
  };
  const creation = () => {
    if (!Object.keys(don).length) return;
    void agir(() => creerOffreSolo(don, libre ? {} : souhait)).then(ok => { if (ok) { setDon({}); setSouhait({}); setRecherche(''); } });
  };
  const choisirDoublon = (cle: string, pourProposition = false) => {
    if (!cle) return;
    if (pourProposition) {
      if (!proposition) return;
      const cartes = ajout(proposition.cartes, cle);
      if (doublonsLibres(collection, cartes, engagees)) setProposition({ ...proposition, cartes });
    } else {
      const suivant = ajout(don, cle);
      if (doublonsLibres(collection, suivant, engagees)) setDon(suivant);
    }
  };
  const envoyer = (offre: OffreSolo) => {
    if (!proposition || !Object.keys(proposition.cartes).length) return;
    const cartes = proposition.cartes;
    void agir(() => proposerOffreSolo(offre.id, cartes)).then(ok => { if (ok) setProposition(null); });
  };

  return <section className="solo-echanges carte" aria-labelledby="titre-echanges-solo">
    <div className="solo-echanges-titre"><div><div className="eyebrow">{t("ui.14b42cb14817")}</div><h2 id="titre-echanges-solo">{t("ui.264bacb307b4")}</h2><p>{t("ui.42fbabb1a078")}</p></div>
      <button type="button" className="btn fantome" disabled={!compte || occupe} onClick={() => void charger().catch(e => setErreur(e.message))}>{t("online.collection.refresh")}</button></div>
    {!compte ? <p className="solo-echanges-info">{erreur || t("ui.3607f5830801")}</p> : <>
      {erreur && <p className="solo-echanges-erreur" role="alert">{erreur}</p>}
      {fait && !erreur && <p className="solo-echanges-fait" role="status"><Icone nom="check" taille={15} /> {fait}</p>}

      {/* ═══ PROPOSITIONS REÇUES — ce que les autres m'offrent contre mes offres ═══ */}
      <div className="solo-echanges-suivi" data-vide={nombreRecues === 0 || undefined}>
        <h3>{t('ech.recues.titre')}<small>{nombreRecues}</small></h3>
        {nombreRecues === 0 && <p className="solo-echanges-info">{t('ech.recues.vide')}</p>}
        {suivi.recues.flatMap(offre => offre.propositions.map(p => <article key={p.id} className="solo-echanges-recue">
          <div className="solo-echanges-entete"><b>{p.pseudo}</b><small>{dateCourte(p.creeLe)}</small></div>
          <DeuxCotes parCle={parCle} gauche={p.cartes} droite={offre.offertes}
            titreGauche={t('ech.recues.de', { pseudo: p.pseudo })} titreDroite={t('ech.recues.contre')} />
          <div className="solo-echanges-actions">
            <button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir(() => refuserOffreSolo(offre.id, p.id))}>{t("pub.refuser")}</button>
            <button type="button" className="btn primaire" disabled={occupe} onClick={() => void agir(() => accepterOffreSolo(offre.id, p.id))}>{t("pub.accepter")}</button>
          </div>
        </article>))}
      </div>

      {/* ═══ MES PROPOSITIONS ENVOYÉES — en attente, retirables ═══ */}
      {suivi.envoyees.length > 0 && <div className="solo-echanges-suivi">
        <h3>{t('ech.envoyees.titre')}<small>{suivi.envoyees.length}</small></h3>
        {suivi.envoyees.map(offre => {
          const mienne = offre.propositions.find(p => p.compteId === compte);
          if (!mienne) return null;
          return <article key={offre.id} className="solo-echanges-recue">
            <div className="solo-echanges-entete"><b>{offre.pseudo}</b><small>{dateCourte(mienne.creeLe)} · {t('ech.attente')}</small></div>
            <DeuxCotes parCle={parCle} gauche={mienne.cartes} droite={offre.offertes}
              titreGauche={t('ech.envoyees.a', { pseudo: offre.pseudo })} titreDroite={t('ech.envoyees.contre')} />
            <div className="solo-echanges-actions">
              <button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir(() => retirerPropositionSolo(offre.id))}>{t('ech.retirer')}</button>
            </div>
          </article>;
        })}
      </div>}

      {/* ═══ PUBLIER UNE OFFRE ═══ */}
      <div className="solo-echanges-creation">
        <h3>{t("ui.7fc8c4f005c2")}</h3>
        <label className="solo-echanges-recherche-roue">{t("ui.7de4f7ea35aa")}<input type="search" value={rechercheDoublon} onChange={e => setRechercheDoublon(e.target.value)} placeholder={t("ui.30c2aeaf26f2")} /></label>
        <RoueCartes titre={t("ui.6ad6bfbb0c20", { v0: doublons.length })} cartes={cartesDoublons} selections={Object.keys(don).map(idRoue)} onChoisir={id => choisirDoublon(cleRoue(id))} vide={t('ech.vide.recherche')} />
        <div className="solo-echanges-cote"><h4>{t("online.trade.iGive")}</h4><LotVisuel lot={don} parCle={parCle} vide={t('ech.vide.don')} onRetirer={cle => setDon(retrait(don, cle))} /></div>
        <label className="solo-echanges-libre"><input type="checkbox" checked={libre} onChange={e => setLibre(e.target.checked)} />{t("ui.6683d62196ed")}</label>
        {!libre && <><label>{t("ui.04bbcb148cf9")}<input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder={t("ui.0b77002e04f5")} /></label>
          {trouvailles.length > 0 && <div className="solo-echanges-resultats">{trouvailles.map(c => <button type="button" key={c.sourceId} onClick={() => setSouhait(ajout(souhait, cleCarteSolo(c.sourceId)))}><CarteJoueurEnLigne carte={carteDepuisSource(c, 'solo', 'collection', 1)} compacte /><span>{c.nom}</span></button>)}</div>}
          <div className="solo-echanges-cote"><h4>{t("ui.1f0b9b65fe16")}</h4><LotVisuel lot={souhait} parCle={parCle} vide={t('ech.vide.souhait')} onRetirer={cle => setSouhait(retrait(souhait, cle))} /></div></>}
        <button type="button" className="btn primaire" disabled={occupe || !Object.keys(don).length || (!libre && !Object.keys(souhait).length)} onClick={creation}>{t("ui.985130f7219f")}</button>
      </div>

      {/* ═══ LA BOURSE ═══ */}
      <div className="solo-echanges-liste"><h3>{t("ui.fbf6ca4e85a6")}<small>{offres.total}</small></h3>
        {offres.offres.map((offre: OffreSolo) => {
          const mienne = offre.compteId === compte;
          const enCours = proposition?.offre === offre.id ? proposition : null;
          return <article key={offre.id} className="solo-echanges-offre">
            <div><b>{offre.pseudo}</b><small>{new Date(offre.creeLe).toLocaleDateString(locale())} · {offre.statut === 'ouverte' ? t("ui.242574c318b2") : offre.statut === 'acceptee' ? t("ui.7e514241347d") : t("ui.2f7ea8495f47")}</small></div>
            <DeuxCotes parCle={parCle} gauche={offre.offertes} droite={offre.souhaitees} videDroite={t('ech.vide.libre')}
              titreGauche={t("ui.88d74dbb72b4", { v0: offre.pseudo })} titreDroite={t("ui.95dda31e9592", { v0: offre.pseudo })} />
            {offre.statut === 'ouverte' && (mienne
              ? <div className="solo-echanges-actions">
                  {offre.propositions.length > 0 && <span className="solo-echanges-pastille">{t('ech.recues.titre')} · {offre.propositions.length}</span>}
                  <button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir(() => annulerOffreSolo(offre.id))}>{t("ui.6c146c2973d9")}</button>
                </div>
              : dejaProposees.has(offre.id)
                ? <div className="solo-echanges-actions">
                    <span className="solo-echanges-pastille">{t('ech.dejaProposee', { pseudo: offre.pseudo })}</span>
                    <button type="button" className="btn fantome" disabled={occupe} onClick={() => void agir(() => retirerPropositionSolo(offre.id))}>{t('ech.retirer')}</button>
                  </div>
                : !enCours && <div className="solo-echanges-actions">
                    {Object.keys(offre.souhaitees).length > 0 && <button type="button" className="btn primaire" disabled={occupe || !doublonsLibres(collection, offre.souhaitees, engagees)} onClick={() => void agir(() => accepterOffreSolo(offre.id))}>{t("ui.d199a3794371")}</button>}
                    <button type="button" className="btn fantome" disabled={occupe} onClick={() => { setErreur(''); setFait(''); setProposition({ offre: offre.id, cartes: {} }); }}>{t("ui.1c564237fed7")}</button>
                  </div>)}
            {/* Le destinataire est l'auteur de l'offre ; on voit ce qu'on propose ET ce qu'on recevra avant de confirmer. */}
            {enCours && <div className="solo-echanges-creation solo-echanges-composer">
              <h3>{t('ech.composer.titre', { pseudo: offre.pseudo })}</h3>
              <label className="solo-echanges-recherche-roue">{t("ui.7de4f7ea35aa")}<input type="search" value={rechercheDoublon} onChange={e => setRechercheDoublon(e.target.value)} placeholder={t("ui.30c2aeaf26f2")} /></label>
              <RoueCartes titre={t("ui.6ad6bfbb0c20", { v0: doublons.length })} cartes={cartesDoublons} selections={Object.keys(enCours.cartes).map(idRoue)} onChoisir={id => choisirDoublon(cleRoue(id), true)} vide={t('ech.vide.recherche')} />
              <div className="solo-echanges-cotes">
                <div className="solo-echanges-cote"><h4>{t('ech.composer.jePropose')}</h4><LotVisuel lot={enCours.cartes} parCle={parCle} vide={t('ech.composer.vide')} onRetirer={cle => setProposition({ ...enCours, cartes: retrait(enCours.cartes, cle) })} /></div>
                <Icone nom="repost" taille={26} />
                <div className="solo-echanges-cote"><h4>{t('ech.composer.jeRecois', { pseudo: offre.pseudo })}</h4><LotVisuel lot={offre.offertes} parCle={parCle} vide={t('ech.vide.offre')} /></div>
              </div>
              <p className="solo-echanges-info">{t('ech.composer.aide', { pseudo: offre.pseudo })}</p>
              <div className="solo-echanges-actions">
                <button type="button" className="btn fantome" disabled={occupe} onClick={() => setProposition(null)}>{t('ech.composer.annuler')}</button>
                <button type="button" className="btn primaire" disabled={occupe || !Object.keys(enCours.cartes).length} onClick={() => envoyer(offre)}>{t('ech.composer.confirmer')}</button>
              </div>
            </div>}
          </article>;
        })}
        {!offres.offres.length && <p className="solo-echanges-info">{t("ui.c959d9bc4fbf")}</p>}
        <div className="solo-echanges-pages"><button type="button" disabled={page === 0 || occupe} onClick={() => { const n = page - 1; setPage(n); void charger(n); }}>{t("solo.pagination.prev")}</button><span>{page + 1} / {Math.max(1, Math.ceil(offres.total / 30))}</span><button type="button" disabled={(page + 1) * 30 >= offres.total || occupe} onClick={() => { const n = page + 1; setPage(n); void charger(n); }}>{t("solo.pagination.next")}</button></div>
      </div>
    </>}
  </section>;
}
