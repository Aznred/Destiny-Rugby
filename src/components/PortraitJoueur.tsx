// LE PORTRAIT DE TON JOUEUR — le visage dans le Profil, le corps entier au clic
//
// ⚠️ Demande explicite : « dans le profil, mets juste qu'on voie le visage avec
// casque ou non, et qu'on puisse cliquer dessus et ça nous amène dans un
// endroit où c'est le joueur en entier tout seul en 3D ».
//
// Deux cadrages, un seul modèle : la caméra vise la TÊTE dans la vignette, et
// le corps entier dans la modale. C'est le même rugbyman que sur l'accueil
// (`useTenue`) — deux sources donneraient deux joueurs différents, et c'est
// exactement ce qu'il ne faut pas quand on essaie de dire « c'est toi ».
//
// ⚠️ RIEN NE TOURNE, NI ICI NI SUR L'ACCUEIL (« il faut qu'aucun asset ne
// tourne dans le menu ou le profil »). Dans la modale, en revanche, on peut
// FAIRE tourner le joueur à la souris : ce n'est plus une animation subie,
// c'est le joueur qui regarde son avatar.

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ApercuJoueur3D } from './ApercuJoueur3D';
import { EditeurApparence } from './EditeurApparence';
import { useTenue } from '../lib/tenue';
import { useGame } from '../store/useGame';
import { POSTE_PAR_ID } from '../data/rugby';
import { apparenceDepuisMatch, apparencePourApercu, apparenceValide } from '../lib/apparenceJoueur';
import { modeAllege } from '../lib/modeles';
import { useModalDialog } from '../lib/useModalDialog';
import { t } from '../lib/i18n';
import { Icone } from './Icone';
import type { NomIcone } from './Icone';

/** L'apparence que le match lit pour ce joueur, résolue ici pour ne pas attendre le registre du match. */
function useApparenceResolue() {
  const joueur = useGame((st) => st.joueur);
  const equipementActif = useGame((st) => st.equipementActif);
  return useMemo(
    () => (joueur ? apparencePourApercu(joueur.nom, joueur.poste, joueur.apparence, equipementActif) : null),
    [joueur, equipementActif],
  );
}

// ⚠️ LE REPLI EST UN NOM D'ICÔNE, PLUS UN EMOJI. C'est ce qui s'affiche quand
// le joueur n'a pas de portrait : un ballon 🏉 de la police système au milieu
// d'un avatar rond ne ressemble à rien de ce que le jeu dessine ailleurs.
export function PortraitJoueur({ repli = 'ballon' }: { repli?: NomIcone }) {
  const tenue = useTenue();
  const allege = useMemo(modeAllege, []);
  const [ouvert, setOuvert] = useState(false);
  const apparence = useApparenceResolue();
  const poste = useGame((st) => st.joueur?.poste);

  if (allege || !tenue.nom || !apparence) {
    return <div className="grand-avatar"><Icone nom={repli} taille={40} /></div>;
  }

  return (
    <>
      <button
        type="button"
        className="portrait-joueur"
        title={t('prof.voirJoueur')}
        aria-label={t('prof.voirJoueur')}
        onClick={() => setOuvert(true)}
      >
        {/* ⚠️ LA VIGNETTE NE MONTRE QUE LE VISAGE — casque, coupe, barbe et teint tels qu'ils seront sur le terrain.
            C'est le MÊME lecteur que le match (`ApercuJoueur3D`) : deux modèles donneraient deux joueurs différents. */}
        <ApercuJoueur3D
          apparence={apparence} club={tenue.club} avant={(POSTE_PAR_ID[poste ?? 'arriere']?.numero ?? 15) <= 8}
          cadrage="visage" cote="face" controles={false} className="portrait-joueur-3d"
          repli={<Icone nom={repli} taille={40} />}
        />
        <span className="portrait-loupe" aria-hidden="true"><Icone nom="plein-ecran" taille={15} /></span>
      </button>

      {ouvert && <VueEntiere onFermer={() => setOuvert(false)} />}
    </>
  );
}

/** Le joueur en entier, seul : on le tourne, et on le personnalise (cheveux, barbe, couleurs, casque, crampons). */
function VueEntiere({ onFermer }: { onFermer: () => void }) {
  const tenue = useTenue();
  const joueur = useGame((st) => st.joueur);
  const equipementActif = useGame((st) => st.equipementActif);
  const equipements = useGame((st) => st.equipements);
  const basculerEquipement = useGame((st) => st.basculerEquipement);
  const personnaliserJoueur = useGame((st) => st.personnaliserJoueur);
  const apparence = useApparenceResolue();
  const [perso, setPerso] = useState(false);
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  // Un joueur né avant l'étape « Apparence » s'ouvre sur ce qu'on voit déjà de lui.
  const courante = useMemo(
    () => (joueur ? (joueur.apparence ? apparenceValide(joueur.apparence, joueur.poste) : apparenceDepuisMatch(joueur.nom, joueur.poste)) : null),
    [joueur],
  );

  return createPortal(
    // ⚠️ `createPortal(document.body)` obligatoire : le `backdrop-filter` des
    // `.carte` crée un bloc conteneur qui piège les `position: fixed`.
    <div className="overlay" ref={overlayRef} onClick={onFermer}>
      <motion.div
        className={`carte modale modale-joueur${perso ? ' modale-joueur-large' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={tenue.nom}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        style={perso ? { maxWidth: 'min(1000px, 96vw)', width: '96vw' } : undefined}
      >
        <div className="modale-joueur-tete">
          <div>
            <div className="eyebrow">{perso ? t('perso.titre') : t('prof.tonJoueur')}</div>
            <h2>{tenue.nom}</h2>
          </div>
          <button type="button" className="btn fantome petit" onClick={onFermer}><Icone nom="croix" taille={17} /></button>
        </div>

        {perso && joueur && courante ? (
          <>
            <p className="champ-aide" style={{ marginBottom: '0.8rem' }}>{t('perso.chapo')}</p>
            <EditeurApparence
              apparence={courante} poste={joueur.poste} nom={joueur.nom} club={joueur.club} morphoFigee
              onChange={(a) => personnaliserJoueur({ peau: a.peau, coupe: a.coupe, couleurCheveux: a.couleurCheveux, barbe: a.barbe, couleurBarbe: a.couleurBarbe })}
              equipementActif={equipementActif} equipements={equipements} onEquiper={basculerEquipement}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn primaire" onClick={() => setPerso(false)}>{t('perso.fermer')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="modale-joueur-scene">
              {apparence && joueur && (
                <ApercuJoueur3D
                  apparence={apparence} club={joueur.club} avant={(POSTE_PAR_ID[joueur.poste]?.numero ?? 15) <= 8}
                  repli={<Icone nom="ballon" taille={40} />}
                />
              )}
            </div>
            <p className="aide">{t('prof.tournerAide')}</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.6rem' }}>
              <button type="button" className="btn fantome" onClick={() => setPerso(true)} data-tuto="perso-bouton">{t('perso.bouton')}</button>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
