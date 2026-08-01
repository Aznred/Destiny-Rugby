import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

// Modale de confirmation maison — window.confirm() est bloqué par certains
// navigateurs, on ne l'utilise JAMAIS.
interface Props {
  titre: string;
  message: string;
  libelleOui?: string;
  libelleNon?: string;
  onOui: () => void;
  onNon: () => void;
}

export function Confirmation({
  titre,
  message,
  libelleOui = 'Confirmer',
  libelleNon = 'Annuler',
  onOui,
  onNon,
}: Props) {
  // Portal vers <body> : sans ça, le backdrop-filter des cartes parentes
  // crée un bloc conteneur et la modale reste piégée dans le panneau.
  return createPortal(
    <div className="overlay" onClick={onNon}>
      <motion.div
        className="carte modale"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <h2>{titre}</h2>
        <p className="aide" style={{ marginTop: '0.6rem' }}>{message}</p>
        <div className="rangee-fin">
          <button className="btn fantome" onClick={onNon}>{libelleNon}</button>
          <button className="btn primaire" onClick={onOui}>{libelleOui}</button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
