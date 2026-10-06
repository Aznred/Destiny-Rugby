// LA PERSONNALISATION (Correctif 21) — ce qu'on POSSÈDE, et seulement cela
//
// ⚠️ ELLE NE MÉLANGE PAS AVEC LA BOUTIQUE. La boutique montre ce qui s'achète ; ici, on n'équipe que ce qui est dans l'inventaire du
// compte (`equipements`, `inventaire`). Ce qui manque n'apparaît que dans l'onglet « À débloquer » : cadenas, prix, et un bouton
// « Voir dans la boutique » — jamais un bouton « Équiper ».
//
//   Joueur    — apparence (teint, coupe, barbe), casque et crampons possédés (jamais taille/poids/carrure : figés à la création) ;
//   Maillots  — le kit de toute l'équipe, à domicile et à l'extérieur, sur un joueur 3D qu'on tourne ;
//   Divers    — ballon, sac et bouclier possédés ;
//   À débloquer — le reste, avec ses prix.

import { useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { useBoutiqueLabo } from '../lib/boutiqueLabo';
import { useModalDialog } from '../lib/useModalDialog';
import { abonnerPerso, changerOngletPerso, fermerPersonnalisation, lireEtatPerso, viserDansLaBoutique, type OngletPerso } from '../lib/personnalisationUi';
import { EQUIPEMENTS, SKINS, estEnVente, prixArticle, prixSkin, rubriqueDe } from '../data/boutique';
import { devisesAcceptees, montantEn } from '../lib/monnaies';
import { apparenceDepuisMatch, apparencePourApercu, apparenceValide } from '../lib/apparenceJoueur';
import { ApercuJoueur3D } from './ApercuJoueur3D';
import { EditeurApparence } from './EditeurApparence';
import { IconeMonnaie, MiniatureArticle, PastilleRarete } from './CartesCosmetiques';
import { Icone } from './Icone';
import { nombre, t, texteTraduit } from '../lib/i18n';
import { POSTE_PAR_ID } from '../data/rugby';
import './Personnalisation.css';

export function Personnalisation() {
  const e = useSyncExternalStore(abonnerPerso, lireEtatPerso, lireEtatPerso);
  return e.ouvert ? <Fenetre onglet={e.onglet} /> : null;
}

function Fenetre({ onglet }: { onglet: OngletPerso }) {
  useBoutiqueLabo();
  const { overlayRef, dialogRef } = useModalDialog(fermerPersonnalisation);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const onglets: OngletPerso[] = joueur ? ['joueur', 'maillots', 'divers', 'debloquer'] : ['maillots', 'divers', 'debloquer'];
  const actif: OngletPerso = onglets.includes(onglet) ? onglet : onglets[0];
  return createPortal(
    <div className="overlay perso-overlay" ref={overlayRef} onClick={fermerPersonnalisation}>
      <motion.div className="carte modale perso-fenetre" role="dialog" aria-modal="true" aria-label={t('perso.titre')} ref={dialogRef}
        onClick={(ev) => ev.stopPropagation()} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="perso-tete">
          <div><div className="eyebrow">{joueur?.nom ?? manager?.nom ?? ''}</div><h2>{t('perso.titre')}</h2></div>
          <button type="button" className="btn fantome petit" onClick={fermerPersonnalisation} aria-label={t('perso.fermer')}><Icone nom="croix" taille={17} /></button>
        </div>
        <div className="perso-onglets" role="tablist">
          {onglets.map((o) => (
            <button key={o} type="button" role="tab" aria-selected={actif === o} className={actif === o ? 'actif' : undefined} onClick={() => changerOngletPerso(o)}>{t(`perso.onglet.${o}`)}</button>
          ))}
        </div>
        <div className="perso-corps">
          {actif === 'joueur' && <OngletJoueur />}
          {actif === 'maillots' && <OngletMaillots />}
          {actif === 'divers' && <OngletDivers />}
          {actif === 'debloquer' && <OngletDebloquer />}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── Joueur : apparence + casque et crampons POSSÉDÉS ─────────────────────────────────────────────
function OngletJoueur() {
  const joueur = useGame((s) => s.joueur)!;
  const equipementActif = useGame((s) => s.equipementActif);
  const equipements = useGame((s) => s.equipements);
  const basculer = useGame((s) => s.basculerEquipement);
  const personnaliserJoueur = useGame((s) => s.personnaliserJoueur);
  // Un joueur né avant l'étape « Apparence » s'ouvre sur ce qu'on voit déjà de lui.
  const courante = useMemo(() => (joueur.apparence ? apparenceValide(joueur.apparence, joueur.poste) : apparenceDepuisMatch(joueur.nom, joueur.poste)), [joueur]);
  return (
    <>
      <p className="champ-aide">{t('perso.chapo')}</p>
      <EditeurApparence
        apparence={courante} poste={joueur.poste} nom={joueur.nom} club={joueur.club} morphoFigee
        onChange={(a) => personnaliserJoueur({ peau: a.peau, coupe: a.coupe, couleurCheveux: a.couleurCheveux, barbe: a.barbe, couleurBarbe: a.couleurBarbe })}
        equipementActif={equipementActif} equipements={equipements} onEquiper={basculer}
      />
    </>
  );
}

/** L'apparence d'aperçu du joueur (ou d'un joueur quelconque pour un entraîneur). */
function useApparenceApercu() {
  const joueur = useGame((s) => s.joueur);
  const equipementActif = useGame((s) => s.equipementActif);
  return useMemo(() => joueur
    ? apparencePourApercu(joueur.nom, joueur.poste, joueur.apparence, equipementActif)
    : apparencePourApercu('Joueur', 'demi_ouverture', undefined, equipementActif), [joueur, equipementActif]);
}

// ── Maillots : le kit de toute l'équipe ───────────────────────────────────────────────────────────
function OngletMaillots() {
  const equipements = useGame((s) => s.equipements);
  const actif = useGame((s) => s.equipementActif);
  const basculer = useGame((s) => s.basculerEquipement);
  const joueur = useGame((s) => s.joueur);
  const manager = useGame((s) => s.manager);
  const apparence = useApparenceApercu();
  const possedes = useMemo(() => EQUIPEMENTS.filter((a) => a.categorie === 'maillot' && equipements.includes(a.id)), [equipements]);
  const [vu, setVu] = useState<string | null>(null);
  const kitVu = (vu ? possedes.find((a) => a.id === vu) : undefined) ?? possedes.find((a) => a.id === actif.maillot);
  const avant = (POSTE_PAR_ID[joueur?.poste ?? 'demi_ouverture']?.numero ?? 15) <= 8;
  return (
    <div className="perso-deux">
      <div className="perso-apercu"><ApercuJoueur3D apparence={apparence} club={joueur?.club ?? manager?.club} kit={kitVu?.kit} avant={avant} /></div>
      <div>
        <p className="champ-aide">{t('perso.maillotsAide')}</p>
        <div className="perso-liste">
          <div className={`perso-ligne${!actif.maillot ? ' porte' : ''}`}>
            <div className="perso-ligne-nom"><b>{t('perso.kitClub')}</b><small>{t('perso.kitClubAide')}</small></div>
            <button type="button" className="btn fantome petit" disabled={!actif.maillot} onClick={() => { if (actif.maillot) basculer(actif.maillot); }}>{!actif.maillot ? t('perso.porte') : t('perso.retirerKit')}</button>
          </div>
          {possedes.map((a) => (
            <div key={a.id} className={`perso-ligne${vu === a.id ? ' vu' : ''}${actif.maillot === a.id || actif.maillotExt === a.id ? ' porte' : ''}`}
              onMouseEnter={() => setVu(a.id)} onFocus={() => setVu(a.id)} onClick={() => setVu(a.id)}>
              <MiniatureArticle a={a} />
              <div className="perso-ligne-nom"><b>{texteTraduit(a.nom)}</b><PastilleRarete rarete={a.rarete} /></div>
              <div className="perso-ligne-actions">
                <button type="button" className={`btn petit ${actif.maillot === a.id ? 'primaire' : 'fantome'}`} aria-pressed={actif.maillot === a.id} onClick={() => basculer(a.id, 'maillot')}>{t('perso.domicile')}</button>
                <button type="button" className={`btn petit ${actif.maillotExt === a.id ? 'primaire' : 'fantome'}`} aria-pressed={actif.maillotExt === a.id} onClick={() => basculer(a.id, 'maillotExt')}>{t('perso.exterieur')}</button>
              </div>
            </div>
          ))}
          {possedes.length === 0 && <VideBoutique rubrique="maillots" />}
        </div>
        <p className="champ-aide">{t('perso.maillotsAuto')}</p>
      </div>
    </div>
  );
}

// ── Divers : ballon, sac, bouclier ────────────────────────────────────────────────────────────────
function OngletDivers() {
  const inventaire = useGame((s) => s.inventaire);
  const skinActif = useGame((s) => s.skinActif);
  const choisirSkin = useGame((s) => s.choisirSkin);
  const equipements = useGame((s) => s.equipements);
  const actif = useGame((s) => s.equipementActif);
  const basculer = useGame((s) => s.basculerEquipement);
  const objets = EQUIPEMENTS.filter((a) => (a.categorie === 'sac' || a.categorie === 'bouclier') && equipements.includes(a.id));
  return (
    <div className="perso-liste perso-large">
      <h3>{t('perso.ballons')}</h3>
      <div className="perso-grille">
        {SKINS.filter((s) => inventaire.includes(s.id)).map((s) => (
          <button key={s.id} type="button" className={`perso-carte${skinActif === s.id ? ' porte' : ''}`} aria-pressed={skinActif === s.id} onClick={() => choisirSkin(s.id)}>
            <span className="pastille-couleur" style={{ background: `linear-gradient(135deg, ${s.corps}, ${s.bande})` }} /><b>{texteTraduit(s.nom)}</b>{skinActif === s.id && <small>{t('perso.porte')}</small>}
          </button>
        ))}
      </div>
      <h3>{t('perso.decor')}</h3>
      {objets.length === 0 ? <VideBoutique rubrique="joueur" /> : (
        <div className="perso-grille">
          {objets.map((a) => (
            <button key={a.id} type="button" className={`perso-carte${actif[a.categorie] === a.id ? ' porte' : ''}`} aria-pressed={actif[a.categorie] === a.id} onClick={() => basculer(a.id)}>
              <MiniatureArticle a={a} /><b>{texteTraduit(a.nom)}</b>{actif[a.categorie] === a.id && <small>{t('perso.porte')}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VideBoutique({ rubrique }: { rubrique: string }) {
  const setEcran = useGame((s) => s.setEcran);
  return (
    <div className="perso-vide">
      <p>{t('perso.rienPossede')}</p>
      <button type="button" className="btn fantome petit" onClick={() => { viserDansLaBoutique(rubrique, ''); fermerPersonnalisation(); setEcran('boutique'); }}>{t('perso.voirBoutique')}</button>
    </div>
  );
}

// ── À débloquer : ce qui n'est pas (encore) à soi ────────────────────────────────────────────────
function OngletDebloquer() {
  const equipements = useGame((s) => s.equipements);
  const inventaire = useGame((s) => s.inventaire);
  const setEcran = useGame((s) => s.setEcran);
  const manquants = useMemo(() => EQUIPEMENTS.filter((a) => !equipements.includes(a.id) && (estEnVente(a) || a.recompense || a.parPub)), [equipements]);
  const ballons = SKINS.filter((s) => !inventaire.includes(s.id));
  const aller = (rubrique: string, id: string) => { viserDansLaBoutique(rubrique, id); fermerPersonnalisation(); setEcran('boutique'); };
  return (
    <div className="perso-liste perso-large">
      <p className="champ-aide">{t('perso.debloquerAide')}</p>
      <div className="perso-grille">
        {manquants.map((a) => {
          const prix = prixArticle(a);
          return (
            <div key={a.id} className="perso-carte verrouille">
              <span className="perso-cadenas" aria-hidden><Icone nom="verrou" taille={16} /></span>
              <MiniatureArticle a={a} /><b>{texteTraduit(a.nom)}</b><PastilleRarete rarete={a.rarete} />
              <small className="perso-prix">
                {a.recompense ? texteTraduit(a.recompense) : a.parPub ? t('pub.gratuitPub') : devisesAcceptees(prix).map((d) => <span key={d} className="mo-montant"><IconeMonnaie d={d} taille={14} /> {nombre(montantEn(prix, d)!)}</span>)}
              </small>
              <button type="button" className="btn fantome petit" onClick={() => aller(rubriqueDe(a), a.id)}>{t('perso.voirBoutique')}</button>
            </div>
          );
        })}
        {ballons.map((s) => {
          const prix = prixSkin(s);
          return (
            <div key={s.id} className="perso-carte verrouille">
              <span className="perso-cadenas" aria-hidden><Icone nom="verrou" taille={16} /></span>
              <span className="pastille-couleur" style={{ background: `linear-gradient(135deg, ${s.corps}, ${s.bande})` }} /><b>{texteTraduit(s.nom)}</b>
              <small className="perso-prix">{devisesAcceptees(prix).map((d) => <span key={d} className="mo-montant"><IconeMonnaie d={d} taille={14} /> {nombre(montantEn(prix, d)!)}</span>)}</small>
              <button type="button" className="btn fantome petit" onClick={() => aller('ballons', s.id)}>{t('perso.voirBoutique')}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
