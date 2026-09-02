import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { texteFinCarriere } from '../data/finCarriereLocalisee';
import { chantierVisible } from '../lib/modeDev';
import { prestigeDepuisJoueur, PRESTIGE_DEBUT } from '../lib/manager';
import { t } from '../lib/i18n';
import { Icone } from '../components/Icone';
import type { NomIcone } from '../components/Icone';
import type { MotifFinCarriere } from '../types';

const ICONES: Record<MotifFinCarriere, NomIcone> = {
  retraiteChoisie: 'trophee',
  ageLimite: 'institution',
  blessure: 'soin',
  radiation: 'stop',
  deces: 'etoile',
  sansClub: 'croix',
  autre: 'ballon',
};

/**
 * ⚠️ ON NE PROPOSE PAS UN BANC À QUELQU'UN QUI VIENT DE MOURIR. Les deux motifs
 * qui ferment la porte le font pour des raisons de récit, pas de mécanique :
 * un décès et une radiation à vie ne se prolongent pas par une carrière
 * d'entraîneur. Les autres — retraite choisie, limite d'âge, blessure de
 * carrière, plus de club — sont exactement les chemins par lesquels on devient
 * entraîneur dans la vraie vie.
 */
const SANS_RELAIS: MotifFinCarriere[] = ['deces', 'radiation'];

export function FinCarriere() {
  const fin = useGame((s) => s.finCarriere);
  const pantheon = useGame((s) => s.pantheon);
  const continuer = useGame((s) => s.continuerFinCarriere);
  const legende = fin ? pantheon.find((l) => l.id === fin.legendeId) : undefined;

  // Une sauvegarde très ancienne ou incomplète ne doit jamais laisser un
  // écran vide : dans ce seul cas, on rejoint simplement le Hall.
  useEffect(() => {
    if (!fin || !legende) continuer();
  }, [fin, legende, continuer]);

  if (!fin || !legende) return null;
  const texte = texteFinCarriere(fin, legende);
  const relaisPossible = chantierVisible('manager') && !SANS_RELAIS.includes(fin.motif);
  const prestige = prestigeDepuisJoueur(legende);

  return (
    <motion.section
      className="fin-carriere"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      aria-labelledby="fin-carriere-titre"
    >
      <div className="fin-carriere-carte carte">
        <div className="fin-carriere-icone" aria-hidden="true"><Icone nom={ICONES[fin.motif]} taille={40} /></div>
        <div className="eyebrow">{texte.eyebrow}</div>
        <h1 id="fin-carriere-titre">{texte.titre}</h1>
        <p className="fin-carriere-raison">{texte.raison}</p>

        {fin.detail && (
          <div className="fin-carriere-detail">
            <b>{texte.detailLabel}</b>
            <p>{fin.detail}</p>
          </div>
        )}

        <div className="fin-carriere-nom">{legende.nom}</div>
        <div className="fin-carriere-stats" aria-label={legende.nom}>
          {texte.stats.map((stat) => (
            <div key={stat.label}>
              <span aria-hidden="true">{stat.emoji}</span>
              <b>{stat.valeur.toLocaleString()}</b>
              <small>{stat.label}</small>
            </div>
          ))}
        </div>

        <p className="fin-carriere-sauvee"><Icone nom="check" taille={15} /> {texte.sauvegardee}</p>

        {/* ═══ LE RELAIS VERS LE BANC ══════════════════════════════════════════
            Demande : « faire le relais en fin de carrière joueur, le parcours
            entraîneur ».

            ⚠️ IL EXISTAIT, ET IL ÉTAIT PRESQUE INATTEIGNABLE. Le seul chemin
            passait par la liste « Après ta carrière » du panneau de jeu, qui ne
            s'affiche QUE pendant la dernière saison et QUE si l'on prend sa
            retraite volontairement. Une carrière arrêtée par une blessure, par
            la limite d'âge ou faute de club n'y avait jamais droit — et ce sont
            justement les fins de carrière subies qui donnent envie d'entraîner.
            La proposition est donc ici, sur l'épilogue, où toutes les carrières
            passent.

            ⚠️ ET LE PRESTIGE DE DÉPART EST ANNONCÉ AVANT DE CLIQUER. C'est la
            seule chose qui change vraiment entre un inconnu et une légende
            (`prestigeDepuisJoueur`, plafonné à 48) : la cacher ferait de ce
            bouton un saut dans le vide. */}
        {relaisPossible && (
          <div className="fin-relais">
            <div className="fin-relais-texte">
              <b><Icone nom="entraineur" taille={17} /> {t('fin.relaisTitre')}</b>
              <span>
                {t('fin.relaisTexte', {
                  prestige, debut: PRESTIGE_DEBUT, nom: legende.nom,
                })}
              </span>
            </div>
            <button
              type="button"
              className="btn primaire"
              onClick={() => continuer('manager')}
            >
              {t('fin.relaisBouton')} <Icone nom="fleche-droite" taille={17} />
            </button>
          </div>
        )}

        <button
          type="button"
          className={`btn ${relaisPossible ? 'fantome' : 'primaire'} fin-carriere-continuer`}
          onClick={() => continuer('pantheon')}
        >
          {texte.bouton} →
        </button>
      </div>
    </motion.section>
  );
}
