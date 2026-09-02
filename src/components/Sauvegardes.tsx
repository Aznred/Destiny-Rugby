// ═══════════════════════════════════════════════════════════════════════════
// LES PARTIES — six emplacements, joueur ou entraîneur
// ═══════════════════════════════════════════════════════════════════════════
// Demande : « faire en sorte de pouvoir avoir plusieurs sauvegardes de joueurs
// et entraîneur ».
//
// ⚠️ IL LIT LE DISQUE, PAS LE STORE. Les cinq autres emplacements ne sont pas
// chargés en mémoire — ce sont des chaînes JSON dans `localStorage`. Les faire
// passer par Zustand obligerait à tenir cinq parties en RAM pour afficher cinq
// lignes de résumé.
//
// ⚠️ ET LA LISTE SE RELIT À CHAQUE OUVERTURE. La partie en cours est écrite en
// permanence par `persist` : un résumé mémorisé au montage annoncerait la
// saison 3 alors qu'on en est à la 4.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { t } from '../lib/i18n';
import {
  NB_EMPLACEMENTS, listerEmplacements, nouvelleCarriere, ouvrirEmplacement,
  supprimerEmplacement,
} from '../lib/sauvegardes';
import type { Emplacement } from '../lib/sauvegardes';
import { Icone } from './Icone';
import { Confirmation } from './Confirmation';

interface Props {
  /** Fermer le panneau. Absent : le bloc vit dans la page (accueil). */
  onFermer?: () => void;
}

function Ligne({
  e, onOuvrir, onSupprimer,
}: { e: Emplacement; onOuvrir: () => void; onSupprimer: () => void }) {
  if (e.type === 'vide') {
    return (
      <button type="button" className="sv-ligne sv-libre" onClick={onOuvrir}>
        <span className="sv-num">{e.id}</span>
        <span className="sv-corps">
          <b>{t('sv.libre')}</b>
          <small>{t('sv.libreAide')}</small>
        </span>
        <Icone nom="ajouter" taille={20} />
      </button>
    );
  }
  return (
    <div className={`sv-ligne${e.actif ? ' sv-actif' : ''}`}>
      <span className="sv-num">{e.id}</span>
      <button type="button" className="sv-corps" onClick={onOuvrir} disabled={e.actif}>
        <b>
          <Icone nom={e.type === 'joueur' ? 'joueur' : 'entraineur'} taille={15} />
          {' '}{e.nom}
          {e.actif && <em className="sv-pastille">{t('sv.enCours')}</em>}
        </b>
        <small>
          {e.sous || t(`sv.type.${e.type}`)} · {t('sv.saison', { n: e.saison })}
          {e.valeur > 0 && ` · ${e.type === 'joueur' ? t('sv.generale') : t('sv.prestige')} ${e.valeur}`}
        </small>
      </button>
      {/* ⚠️ ON NE SUPPRIME PAS LA PARTIE OUVERTE. Le store continuerait d'écrire
          dessus à la milliseconde suivante : le bouton n'effacerait rien et
          passerait pour cassé. Il faut d'abord ouvrir une autre partie. */}
      <button
        type="button"
        className="sv-supprimer"
        onClick={onSupprimer}
        disabled={e.actif}
        title={e.actif ? t('sv.pasSupprimerActive') : t('sv.supprimer')}
        aria-label={t('sv.supprimer')}
      >
        <Icone nom="corbeille" taille={17} />
      </button>
    </div>
  );
}

export function Sauvegardes({ onFermer }: Props = {}) {
  const [liste, setListe] = useState<Emplacement[]>([]);
  const [aSupprimer, setASupprimer] = useState<Emplacement | null>(null);
  const [plein, setPlein] = useState(false);

  const relire = () => setListe(listerEmplacements());
  useEffect(relire, []);

  const nouvelle = () => {
    if (nouvelleCarriere() == null) setPlein(true);
  };

  return (
    <motion.section
      className="sv-panneau carte"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-label={t('sv.titre')}
    >
      <header className="sv-tete">
        <div>
          <div className="eyebrow">{t('sv.eyebrow')}</div>
          <h2><Icone nom="disquette" taille={20} /> {t('sv.titre')}</h2>
        </div>
        {onFermer && (
          <button type="button" className="sv-fermer" onClick={onFermer} aria-label={t('compo.fermer')}>
            <Icone nom="croix" taille={18} />
          </button>
        )}
      </header>
      <p className="sv-chapo">{t('sv.chapo', { n: NB_EMPLACEMENTS })}</p>

      <div className="sv-liste">
        {liste.map((e) => (
          <Ligne
            key={e.id}
            e={e}
            onOuvrir={() => ouvrirEmplacement(e.id)}
            onSupprimer={() => setASupprimer(e)}
          />
        ))}
      </div>

      <button type="button" className="btn fantome sv-nouvelle" onClick={nouvelle}>
        <Icone nom="ajouter" taille={17} /> {t('sv.nouvelle')}
      </button>

      {plein && (
        <Confirmation
          titre={t('sv.pleinTitre')}
          message={t('sv.pleinTexte', { n: NB_EMPLACEMENTS })}
          libelleOui={t('sv.compris')}
          onOui={() => setPlein(false)}
          onNon={() => setPlein(false)}
        />
      )}
      {aSupprimer && (
        <Confirmation
          titre={t('sv.supprimerTitre')}
          message={t('sv.supprimerTexte', { nom: aSupprimer.nom })}
          libelleOui={t('sv.supprimer')}
          onOui={() => {
            supprimerEmplacement(aSupprimer.id);
            setASupprimer(null);
            relire();
          }}
          onNon={() => setASupprimer(null)}
        />
      )}
    </motion.section>
  );
}
