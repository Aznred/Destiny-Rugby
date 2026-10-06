// LES FENÊTRES D'ACHAT : choix de la monnaie, solde insuffisant, confirmation, recharge de Crédits (Correctif 21)
//
// Montée UNE FOIS dans `App` ; pilotée par `lib/achatUi.ts` (`demanderPaiement`, `ouvrirRechargeCredits`).
// ⚠️ UN SOLDE INSUFFISANT N'ACHÈTE RIEN : il ouvre une fenêtre qui dit combien il manque et propose la suite. ⚠️ Le seul endroit qui
// ouvre un paiement réel est le bouton « Payer … » de la recharge, après une confirmation qui montre la somme en euros.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store/useGame';
import { useModalDialog } from '../lib/useModalDialog';
import { abonnerAchat, aller, annulerAchat, choisirDevise, confirmerAchat, fournirSoldes, lireEtatAchat, ouvrirRechargeCredits } from '../lib/achatUi';
import { devisesAcceptees, montantEn, OFFRES_CREDITS, type Devise, type OffreCredits } from '../lib/monnaies';
import { acheterCreditsStripe } from '../lib/carriereEnLigneClient';
import { BUNDLES } from '../data/boutique';
import { locale, nombre, t, texteTraduit } from '../lib/i18n';
import { PieceOvas } from './PieceOvas';
import { PieceCredits } from './PieceCredits';
import { CartePubRecompensee } from './Pub';
import './ModalesMonnaie.css';

const nom = (d: Devise) => (d === 'ovas' ? 'Ovas' : t('mo.credits'));
const Icone = ({ d, taille = 22 }: { d: Devise; taille?: number }) => (d === 'ovas' ? <PieceOvas taille={taille} /> : <PieceCredits taille={taille} variante={taille > 28 ? 'boutique' : 'ui'} />);

/** Un montant et sa monnaie : « 1 350 [icône] Ovas ». */
export function Montant({ n, d }: { n: number; d: Devise }) {
  return <span className="mo-montant"><b>{n.toLocaleString(locale())}</b><Icone d={d} taille={18} /></span>;
}

export function ModalesMonnaie() {
  const e = useSyncExternalStore(abonnerAchat, lireEtatAchat, lireEtatAchat);
  // Le store du jeu donne ses soldes au module d'achat (lus à l'instant de chaque décision).
  useEffect(() => { fournirSoldes(() => { const s = useGame.getState(); return { ovas: s.coins, credits: s.credits }; }); }, []);
  if (!e.etape) return null;
  return <Fenetre key={e.etape + (e.devise ?? '')} />;
}

function Fenetre() {
  const e = useSyncExternalStore(abonnerAchat, lireEtatAchat, lireEtatAchat);
  const ovas = useGame((s) => s.coins);
  const credits = useGame((s) => s.credits);
  const { overlayRef, dialogRef } = useModalDialog(annulerAchat);
  const d = e.demande;
  const soldes = { ovas, credits };
  // Toutes les offres que Stripe sait facturer : les recharges et les bundles (même forme : identifiant, nom, crédits, prix).
  const [offre, setOffre] = useState<OffreCredits | null>(() => [...OFFRES_CREDITS, ...BUNDLES].find((o) => o.id === e.offreId) ?? null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  const payer = async (o: OffreCredits) => {
    if (occupe) return;
    setOccupe(true); setErreur('');
    try {
      const r = await acheterCreditsStripe(o.id, crypto.randomUUID());
      location.assign(r.url);
    } catch (x) { setErreur(x instanceof Error ? x.message : t('mo.paiementIndispo')); setOccupe(false); }
  };

  let contenu;
  if (e.etape === 'choix' && d) {
    contenu = (<>
      <h2>{t('mo.choisir')}</h2>
      <p className="mo-sous">{texteTraduit(d.titre)}</p>
      <div className="mo-choix">
        {devisesAcceptees(d.prix).map((dev) => {
          const m = montantEn(d.prix, dev)!;
          const manque = Math.max(0, m - soldes[dev]);
          return (
            <button key={dev} type="button" className="mo-offre" data-devise={dev} onClick={() => choisirDevise(dev)}>
              <Icone d={dev} taille={34} />
              <b>{nombre(m)} {nom(dev)}</b>
              <small>{manque ? t('mo.manque', { n: nombre(manque), monnaie: nom(dev) }) : t('mo.solde', { n: nombre(soldes[dev]), monnaie: nom(dev) })}</small>
            </button>
          );
        })}
      </div>
    </>);
  } else if (e.etape === 'insuffisant' && d && e.devise) {
    const m = montantEn(d.prix, e.devise)!;
    const manque = Math.max(0, m - soldes[e.devise]);
    const autre: Devise | null = e.devise === 'ovas' && devisesAcceptees(d.prix).includes('credits') ? 'credits' : null;
    contenu = e.devise === 'ovas' ? (<>
      <div className="mo-icone"><Icone d="ovas" taille={64} /></div>
      <h2>{t('mo.pasAssezOvas')}</h2>
      <p>{t('mo.manquePour', { n: nombre(manque), monnaie: 'Ovas', titre: texteTraduit(d.titre) })}</p>
      <div className="mo-actions">
        {autre && <button type="button" className="btn primaire" onClick={() => choisirDevise('credits')}><PieceCredits taille={18} /> {t('mo.utiliserCredits', { n: nombre(montantEn(d.prix, 'credits')!) })}</button>}
        <button type="button" className="btn fantome" onClick={() => aller('obtenirOvas')}><PieceOvas taille={18} /> {t('mo.obtenirOvas')}</button>
        <button type="button" className="btn fantome" onClick={annulerAchat}>{t('mo.fermer')}</button>
      </div>
    </>) : (<>
      <div className="mo-icone"><PieceCredits taille={64} variante="popup" /></div>
      <h2>{t('mo.creditsInsuffisants')}</h2>
      <dl className="mo-releve">
        <div><dt>{t('mo.soldeActuel')}</dt><dd><Montant n={credits} d="credits" /></dd></div>
        <div><dt>{t('mo.prix')}</dt><dd><Montant n={m} d="credits" /></dd></div>
        <div className="mo-manque"><dt>{t('mo.quantiteManquante')}</dt><dd><Montant n={manque} d="credits" /></dd></div>
      </dl>
      <div className="mo-actions">
        <button type="button" className="btn primaire" onClick={() => aller('recharge')}><PieceCredits taille={18} /> {t('mo.acheterCredits')}</button>
        <button type="button" className="btn fantome" onClick={annulerAchat}>{t('mo.fermer')}</button>
      </div>
    </>);
  } else if (e.etape === 'confirmation' && d && e.devise) {
    const m = montantEn(d.prix, e.devise)!;
    contenu = (<>
      <div className="mo-icone"><PieceCredits taille={72} variante="achat" /></div>
      <h2>{t('mo.confirmerTitre')}</h2>
      <p>{t('mo.confirmerTexte', { n: nombre(m), titre: texteTraduit(d.titre) })}</p>
      <p className="mo-sous">{t('mo.soldeApres', { avant: nombre(credits), apres: nombre(Math.max(0, credits - m)) })}</p>
      <div className="mo-actions">
        <button type="button" className="btn primaire" autoFocus onClick={confirmerAchat}>{t('mo.confirmer')}</button>
        <button type="button" className="btn fantome" onClick={annulerAchat}>{t('mo.annuler')}</button>
      </div>
    </>);
  } else if (e.etape === 'obtenirOvas') {
    contenu = (<>
      <div className="mo-icone"><PieceOvas taille={56} /></div>
      <h2>{t('mo.obtenirOvas')}</h2>
      <p className="mo-sous">{t('mo.ovasSeGagnent')}</p>
      <ul className="mo-liste">
        <li>{t('mo.ovasMatchs')}</li><li>{t('mo.ovasObjectifs')}</li><li>{t('mo.ovasSaisons')}</li><li>{t('mo.ovasEvenements')}</li>
      </ul>
      <div className="mo-pub"><CartePubRecompensee /></div>
      <div className="mo-actions"><button type="button" className="btn fantome" onClick={annulerAchat}>{t('mo.fermer')}</button></div>
    </>);
  } else if (e.etape === 'recharge') {
    contenu = offre ? (<>
      <div className="mo-icone"><PieceCredits taille={72} variante="achat" /></div>
      <h2>{t('mo.payerTitre')}</h2>
      <p>{t('mo.payerTexte', { credits: nombre(offre.credits), prix: offre.prix })}</p>
      <p className="mo-sous">{t('mo.payerAide')}</p>
      {erreur && <p role="alert" className="mo-erreur">{erreur}</p>}
      <div className="mo-actions">
        <button type="button" className="btn primaire" disabled={occupe} onClick={() => void payer(offre)}>{occupe ? t('mo.ouverture') : t('mo.payer', { prix: offre.prix })}</button>
        <button type="button" className="btn fantome" disabled={occupe} onClick={() => { setOffre(null); setErreur(''); }}>{t('mo.retour')}</button>
      </div>
    </>) : (<>
      <h2>{t('mo.rechargeTitre')}</h2>
      <p className="mo-sous">{t('mo.rechargeAide', { solde: nombre(credits) })}</p>
      <div className="mo-recharges">
        {OFFRES_CREDITS.map((o) => (
          <button key={o.id} type="button" className={`mo-recharge${o.populaire ? ' populaire' : ''}`} onClick={() => setOffre(o)}>
            <PieceCredits taille={34} variante="boutique" />
            <b>{nombre(o.credits)}</b>
            {o.bonus && <small>{o.bonus}</small>}
            <span>{o.prix}</span>
          </button>
        ))}
      </div>
      <div className="mo-actions"><button type="button" className="btn fantome" onClick={annulerAchat}>{t('mo.fermer')}</button></div>
    </>);
  }
  return createPortal(
    <div className="overlay mo-overlay" ref={overlayRef} onClick={annulerAchat}>
      <div className="carte modale mo-fenetre" role="dialog" aria-modal="true" ref={dialogRef} onClick={(ev) => ev.stopPropagation()}>
        {contenu}
      </div>
    </div>,
    document.body,
  );
}

/** Le bouton « Acheter des Crédits » : ouvre la recharge directement. */
export function BoutonAcheterCredits({ className = 'btn primaire petit' }: { className?: string }) {
  return <button type="button" className={className} onClick={() => ouvrirRechargeCredits()}><PieceCredits taille={16} /> {t('mo.acheterCredits')}</button>;
}
