// LA FICHE DE MARCHÉ — la carte à gauche, ce qu'on peut en faire à droite.
//
// ⚠️ UN SEUL COMPOSANT POUR LES TROIS SITUATIONS, ET C'EST LA CARTE QUI TRANCHE.
// On n'a pas de « mode » à passer : si la carte porte une vente ouverte, on
// montre l'annonce (vendeur, prix, compte à rebours, acheter ou enchérir) ; si
// elle est à nous et libre, on montre le formulaire de mise en vente. Un
// indicateur de mode donné par l'appelant se serait désynchronisé au premier
// achat — la carte, elle, dit toujours la vérité.
//
// ⚠️ LE COMPTE À REBOURS BAT À LA SECONDE, ET SEULEMENT ICI. Une horloge d'une
// seconde posée sur l'écran du marché rendrait la roue, ses sept cartes et leur
// animation à chaque tic. Elle vit donc dans la modale, qui n'existe que quand
// elle est ouverte, et s'arrête d'elle-même à l'expiration.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Icone } from './Icone';
import { Selecteur } from './Selecteur';
import { useModalDialog } from '../lib/useModalDialog';
import { valeurVenteRapide, plafondVenteRapide } from '../lib/ligue/venteRapideCarriere';
import { NOMS_PACK } from '../lib/presentationPacks';
import type { CarteCarriere, CommandeCarriere, VenteCarriere } from '../lib/ligue/typesCarriere';
import './ModaleMarche.css';

const nombres = new Intl.NumberFormat('fr-FR');
const montant = (n: number) => nombres.format(n);
const dateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const deuxChiffres = (n: number) => String(n).padStart(2, '0');

/** Le pas d'enchère du serveur, recopié pour proposer le bon montant d'avance. */
const enchereMinimale = (vente: VenteCarriere) =>
  vente.enchere ? vente.enchere.montant + Math.max(25, Math.ceil(vente.enchere.montant * 0.05)) : vente.prix;

/**
 * Le temps restant, rafraîchi chaque seconde. Rend `null` une fois l'échéance
 * passée : l'appelant affiche alors la clôture, jamais un compteur négatif.
 */
function useCompteARebours(echeance: string): { jours: number; heures: number; minutes: number; secondes: number } | null {
  const [ms, setMs] = useState(() => Math.max(0, Date.parse(echeance) - Date.now()));
  useEffect(() => {
    const restant = () => Math.max(0, Date.parse(echeance) - Date.now());
    setMs(restant());
    if (restant() <= 0) return;
    // L'horloge s'arrête d'elle-même à l'échéance : rien à rafraîchir ensuite.
    const horloge = window.setInterval(() => {
      const reste = restant();
      setMs(reste);
      if (reste <= 0) window.clearInterval(horloge);
    }, 1000);
    return () => window.clearInterval(horloge);
  }, [echeance]);
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return { jours: Math.floor(total / 86400), heures: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, secondes: total % 60 };
}

function CompteARebours({ echeance }: { echeance: string }) {
  const reste = useCompteARebours(echeance);
  if (!reste) return <b className="mm-fini">Clôturée</b>;
  return <b className="mm-rebours" aria-label={`Temps restant : ${reste.jours ? `${reste.jours} jours ` : ''}${reste.heures} heures ${reste.minutes} minutes ${reste.secondes} secondes`}>
    {reste.jours > 0 && <span>{reste.jours} j</span>}
    <span>{deuxChiffres(reste.heures)}</span><i>:</i><span>{deuxChiffres(reste.minutes)}</span><i>:</i><span>{deuxChiffres(reste.secondes)}</span>
  </b>;
}

interface Props {
  carte: CarteCarriere;
  /** L'annonce en cours, si la carte est sur le marché. */
  vente?: VenteCarriere;
  monClubId: string;
  ovas: number;
  logoClub?: string;
  /** Le nom d'un club de la ligue — la modale ne connaît pas la vue entière. */
  nomDe: (clubId: string) => string;
  occupe: boolean;
  /** Le maillot qu'elle porte sur la feuille de match — « titulaire nº 10 ». */
  surLaFeuille?: string;
  /**
   * Ce qu'il resterait de joueurs disponibles si cette carte partait. En
   * dessous du plancher, le serveur refuse : autant l'écrire avant le clic.
   */
  effectifApresDepart?: { restants: number; minimum: number };
  onFermer: () => void;
  /** Rend la commande au marché, qui la passe au serveur et referme si besoin. */
  onAgir: (commande: CommandeCarriere) => void;
  /** Bascule vers l'onglet Échanges avec cette carte déjà posée sur la table. */
  onEchanger: () => void;
}

export function ModaleMarche({ carte, vente, monClubId, ovas, logoClub, nomDe, occupe, surLaFeuille, effectifApresDepart, onFermer, onAgir, onEchanger }: Props) {
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  return createPortal(
    // ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
    // panneaux crée un bloc conteneur qui piège les `position: fixed`.
    <div className="overlay" ref={overlayRef} onClick={onFermer}>
      <motion.div
        className="carte modale mm" role="dialog" aria-modal="true" aria-label={`${carte.nom}, ${carte.note} GEN`}
        ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }}
      >
        <button type="button" className="btn fantome petit mm-fermer" onClick={onFermer} aria-label="Fermer"><Icone nom="croix" taille={17} /></button>
        <div className="mm-corps">
          <div className="mm-carte"><CarteJoueurEnLigne carte={carte} logoClub={logoClub} proprietaire={carte.proprietaire ? nomDe(carte.proprietaire) : undefined} /></div>
          <div className="mm-details">
            {vente
              ? <Annonce carte={carte} vente={vente} monClubId={monClubId} ovas={ovas} nomDe={nomDe} occupe={occupe} onAgir={onAgir} />
              : <MiseEnVente carte={carte} occupe={occupe} surLaFeuille={surLaFeuille} effectif={effectifApresDepart} onAgir={onAgir} onEchanger={onEchanger} />}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── L'ANNONCE : ce que vaut la carte, qui la vend, et combien de temps ──────

function Annonce({ carte, vente, monClubId, ovas, nomDe, occupe, onAgir }: {
  carte: CarteCarriere; vente: VenteCarriere; monClubId: string; ovas: number;
  nomDe: (clubId: string) => string; occupe: boolean; onAgir: (commande: CommandeCarriere) => void;
}) {
  const mienne = vente.vendeurId === monClubId;
  const minimum = enchereMinimale(vente);
  const [offre, setOffre] = useState(String(minimum));
  const enchere = vente.type === 'enchere';
  const aPayer = enchere ? Number(offre || 0) : vente.prix;
  const tropCher = ovas < aPayer;
  // ⚠️ La borne suit la meilleure enchère : quand quelqu'un surenchérit pendant
  // qu'on hésite, le champ doit remonter tout seul, sinon on envoie une offre
  // que le serveur refusera.
  useEffect(() => { setOffre((actuelle) => (Number(actuelle) < minimum ? String(minimum) : actuelle)); }, [minimum]);

  return <>
    <div className="mm-entete">
      <div className="eyebrow">{enchere ? 'Aux enchères' : 'Vente directe'} · {NOMS_PACK[carte.rarete]}</div>
      <h2>{carte.nom}</h2>
    </div>
    <dl className="mm-lignes">
      <div><dt>Vendeur</dt><dd>{nomDe(vente.vendeurId)}{mienne && <i> · toi</i>}</dd></div>
      <div><dt>{enchere ? 'Meilleure offre' : 'Prix'}</dt><dd className="mm-prix">{montant(vente.enchere?.montant ?? vente.prix)} <small>Ovas</small></dd></div>
      {enchere && <div><dt>Dernier enchérisseur</dt><dd>{vente.enchere ? nomDe(vente.enchere.clubId) : <i>aucune offre pour l’instant</i>}</dd></div>}
      <div><dt>Temps restant</dt><dd><CompteARebours echeance={vente.expireLe} /><small className="mm-echeance">clôture {dateHeure(vente.expireLe)}</small></dd></div>
      <div><dt>Ton solde</dt><dd>{montant(ovas)} <small>Ovas</small></dd></div>
    </dl>

    {mienne
      ? (!enchere || !vente.enchere
        ? <button type="button" className="btn fantome" disabled={occupe} onClick={() => onAgir({ type: 'annulerVente', venteId: vente.id })}>Retirer de la vente</button>
        : <p className="mm-note">Une enchère est en cours : la vente ira à son terme.</p>)
      : enchere
        ? <form className="mm-actions" onSubmit={(e) => { e.preventDefault(); onAgir({ type: 'encherir', venteId: vente.id, montant: Number(offre) }); }}>
          <label className="cel-champ"><span>Ton offre (minimum {montant(minimum)})</span>
            <input type="number" min={minimum} step={25} value={offre} onChange={(e) => setOffre(e.target.value)} required />
          </label>
          <button className="btn primaire" disabled={occupe || tropCher || Number(offre) < minimum}>Enchérir</button>
          {tropCher && <p className="mm-note alerte">Il te manque {montant(aPayer - ovas)} Ovas.</p>}
        </form>
        : <div className="mm-actions">
          <button type="button" className="btn primaire" disabled={occupe || tropCher} onClick={() => onAgir({ type: 'acheter', venteId: vente.id })}>Acheter pour {montant(vente.prix)} Ovas</button>
          {tropCher && <p className="mm-note alerte">Il te manque {montant(vente.prix - ovas)} Ovas.</p>}
        </div>}
  </>;
}

// ── LA MISE EN VENTE : prix, type, durée — ou la vente rapide ──────────────

const DUREES: [string, string][] = [['2', '2 heures'], ['6', '6 heures'], ['24', '24 heures'], ['72', '3 jours'], ['168', '7 jours']];
const TYPES: [string, string][] = [['directe', 'Vente directe'], ['enchere', 'Aux enchères'], ['echange', 'Échange contre une carte']];

function MiseEnVente({ carte, occupe, surLaFeuille, effectif, onAgir, onEchanger }: {
  carte: CarteCarriere; occupe: boolean; surLaFeuille?: string;
  effectif?: { restants: number; minimum: number };
  onAgir: (commande: CommandeCarriere) => void; onEchanger: () => void;
}) {
  const [mode, setMode] = useState('directe');
  const [prix, setPrix] = useState('5000');
  const [duree, setDuree] = useState('24');
  const [confirmeRapide, setConfirmeRapide] = useState(false);
  const rapide = valeurVenteRapide(carte);
  const echange = mode === 'echange';
  // Un départ de plus passerait sous le plancher : le serveur refuserait, et
  // un bouton qui ne peut qu'échouer vaut mieux grisé, avec sa raison.
  const plancher = Boolean(effectif && effectif.restants < effectif.minimum);

  // ⚠️ ALIGNÉ, DONC INTRANSFÉRABLE — et on le dit ici plutôt que de laisser le
  // serveur refuser après coup. Le formulaire ne s'affiche même pas : proposer
  // un prix et une durée pour une vente impossible n'a aucun sens.
  if (surLaFeuille) return <>
    <div className="mm-entete">
      <div className="eyebrow">Sur la feuille de match · {NOMS_PACK[carte.rarete]}</div>
      <h2>{carte.nom}</h2>
    </div>
    <dl className="mm-lignes">
      <div><dt>Statut</dt><dd>{surLaFeuille}</dd></div>
      <div><dt>Valeur en vente rapide</dt><dd className="mm-prix">{montant(rapide)} <small>Ovas</small></dd></div>
    </dl>
    <p className="mm-note">Un joueur aligné ne quitte pas le club : il tiendrait son poste dimanche. Sors-le du XV ou du banc dans l’onglet <b>Composition</b>, et il redevient vendable, échangeable et revendable au club.</p>
  </>;

  return <>
    <div className="mm-entete">
      <div className="eyebrow">Mettre sur le marché · {NOMS_PACK[carte.rarete]}</div>
      <h2>{carte.nom}</h2>
    </div>

    <form className="mm-formulaire" onSubmit={(e) => {
      e.preventDefault();
      if (echange) return onEchanger();
      onAgir({ type: 'vendre', carteId: carte.id, prix: Number(prix), mode: mode as 'directe' | 'enchere', dureeHeures: Number(duree) });
    }}>
      <div className="cel-champ"><span>Type de vente</span><Selecteur valeur={mode} onChange={setMode} options={TYPES.map(([valeur, label]) => ({ valeur, label }))} /></div>
      {!echange && <>
        <label className="cel-champ"><span>{mode === 'enchere' ? 'Mise à prix (Ovas)' : 'Prix (Ovas)'}</span>
          <input type="number" min={1} step={100} value={prix} onChange={(e) => setPrix(e.target.value)} required />
        </label>
        <div className="cel-champ"><span>Durée</span><Selecteur valeur={duree} onChange={setDuree} options={DUREES.map(([valeur, label]) => ({ valeur, label }))} /></div>
      </>}
      <p className="mm-note">{echange
        ? 'Tu choisis ensuite le club et ce que tu demandes en face. Les deux doivent accepter.'
        : 'Ton effectif doit conserver au moins 26 joueurs et les postes nécessaires.'}</p>
      <button className="btn primaire" disabled={occupe || (plancher && !echange)}>{echange ? 'Préparer l’échange' : 'Publier l’annonce'}</button>
      {plancher && !echange && <p className="mm-note alerte">Ton effectif tomberait à {effectif!.restants} joueurs disponibles ; il en faut {effectif!.minimum}.</p>}
    </form>

    {/* ⚠️ LA VENTE RAPIDE EST IRRÉVERSIBLE, ELLE SE CONFIRME DONC EN DEUX TEMPS.
        Pas de seconde modale par-dessus celle-ci : l'avertissement prend la
        place du bouton, là où le regard est déjà posé. */}
    <div className="mm-rapide">
      <div>
        <div className="eyebrow">Vente rapide</div>
        <p className="mm-note">Le club rachète la carte immédiatement. Plafond {NOMS_PACK[carte.rarete]} : {montant(plafondVenteRapide(carte.rarete))} Ovas.</p>
      </div>
      {confirmeRapide
        ? <div className="mm-actions">
          <p className="mm-note alerte">{carte.nom} quitte définitivement ton effectif contre {montant(rapide)} Ovas.</p>
          <div className="mm-boutons">
            <button type="button" className="btn fantome" onClick={() => setConfirmeRapide(false)}>Annuler</button>
            <button type="button" className="btn primaire" disabled={occupe} onClick={() => onAgir({ type: 'venteRapide', carteId: carte.id })}>Vendre pour {montant(rapide)} Ovas</button>
          </div>
        </div>
        : <button type="button" className="btn fantome" disabled={occupe || plancher} onClick={() => setConfirmeRapide(true)}>{plancher ? `Garde au moins ${effectif!.minimum} joueurs` : `Vendre tout de suite · ${montant(rapide)} Ovas`}</button>}
    </div>
  </>;
}
