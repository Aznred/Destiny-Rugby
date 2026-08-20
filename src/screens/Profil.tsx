import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { Jauge } from '../components/Jauge';
import { POSTE_PAR_ID, labelAttribut, nomPoste } from '../data/rugby';
import { Drapeau } from '../components/Drapeau';
import { nomNationTraduit } from '../lib/nations';
import { Confirmation } from '../components/Confirmation';
import type { Joueur } from '../types';
import { nombre, t, tn } from '../lib/i18n';
import { titreTraduit } from '../lib/tropheesI18n';

// La 3D tire Three.js derrière elle : on ne la charge qu'à l'ouverture du profil.
const Portrait = lazy(() =>
  import('../components/PortraitJoueur').then((m) => ({ default: m.PortraitJoueur })),
);

function moyenne(j: Joueur): number {
  const vals = Object.values(j.attributs);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function Profil() {
  const joueur = useGame((s) => s.joueur);
  const journal = useGame((s) => s.journal);
  const setEcran = useGame((s) => s.setEcran);
  const reinitialiser = useGame((s) => s.reinitialiser);
  const [confirmerReset, setConfirmerReset] = useState(false);

  if (!joueur) return null;
  const poste = POSTE_PAR_ID[joueur.poste];
  const attrs = Object.keys(joueur.attributs) as (keyof Joueur['attributs'])[];
  const moitie = Math.ceil(attrs.length / 2);

  const evenements = journal.filter((e) => e.role === 'mj' && e.titre);

  return (
    <motion.section
      className="profil"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="carte profil-tete">
        {/* ⚠️ TON joueur, en 3D, avec la tenue que tu lui as achetée — plus un
            emoji générique. Il retombe sur l'emoji sur machine modeste. */}
        <Suspense fallback={<div className="grand-avatar">{poste.categorie === 'Avant' ? '🛡️' : '⚡'}</div>}>
          <Portrait repli={poste.categorie === 'Avant' ? '🛡️' : '⚡'} />
        </Suspense>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {nomPoste(joueur.poste)} · {poste.numero} · <Drapeau nation={joueur.nation} taille={0.8} /> {nomNationTraduit(joueur.nation)}
          </div>
          <h1>{joueur.nom}</h1>
          <div className="ressources" style={{ marginTop: '0.5rem' }}>
            <span className="pastille">{t('prof.noteGlobale')} <b>{moyenne(joueur)}</b></span>
            <span className="pastille">{t('gen.saison')} <b>{joueur.saison}</b></span>
            <span className="pastille">{joueur.age} {t('gen.ans')}</span>
            <span className="pastille">💰 <b>{nombre(joueur.argent)} €</b></span>
          </div>
        </div>
        <button className="btn primaire" onClick={() => setEcran('carriere')}>
          {t('prof.continuer')}
        </button>
      </div>

      <div className="grille-2" style={{ alignItems: 'start' }}>
        <div className="carte" style={{ padding: '1.6rem' }}>
          <div className="eyebrow" style={{ marginBottom: '1rem' }}>{t('pj.attributs')}</div>
          <div className="attrs-radar">
            <div>
              {attrs.slice(0, moitie).map((k) => (
                <Jauge key={k} label={labelAttribut(k)} valeur={joueur.attributs[k]} />
              ))}
            </div>
            <div>
              {attrs.slice(moitie).map((k) => (
                <Jauge key={k} label={labelAttribut(k)} valeur={joueur.attributs[k]} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Jauge label={t('pj.forme')} valeur={joueur.forme} variante="vert" />
            <Jauge label={t('pj.moral')} valeur={joueur.moral} variante="or" />
            <Jauge label={t('pj.reputation')} valeur={joueur.reputation} variante="cuir" />
          </div>
        </div>

        <div className="carte" style={{ padding: '1.6rem' }}>
          <div className="eyebrow" style={{ marginBottom: '1rem' }}>{t('prof.palmares')}</div>
          <div className="ressources">
            <span className="pastille">🏉 <b>{joueur.matchsJoues}</b> {t('prof.matchs')}</span>
            <span className="pastille">🎯 <b>{joueur.essais}</b> {t('ml.essais')}</span>
            {(joueur.selections ?? 0) > 0 && (
              <span className="pastille" title={t('prof.capesAide')}>
                🏳️ <b>{joueur.selections}</b> {t('prof.capes')}
              </span>
            )}
          </div>

          {/* Statistiques détaillées de carrière (mode journée par journée) */}
          {joueur.stats && joueur.stats.plaquages + joueur.stats.points > 0 && (
            <div className="stats-detaillees">
              <Stat label={t('prof.points')} valeur={joueur.stats.points} />
              <Stat
                label={t('prof.reussitePied')}
                valeur={joueur.stats.butsTentes
                  ? `${Math.round((joueur.stats.butsReussis / joueur.stats.butsTentes) * 100)} %`
                  : '-'}
                aide={joueur.stats.butsTentes ? `${joueur.stats.butsReussis}/${joueur.stats.butsTentes}` : undefined}
              />
              <Stat
                label={t('prof.plaquages')}
                valeur={joueur.stats.plaquages}
                aide={tn('prof.manques', joueur.stats.plaquagesManques)}
              />
              <Stat label={t('prof.grattages')} valeur={joueur.stats.grattages} />
              <Stat label={t('prof.passesDecisives')} valeur={joueur.stats.passesDecisives} />
              <Stat
                label={t('prof.cartons')}
                valeur={`${joueur.stats.cartonsJaunes} 🟨 · ${joueur.stats.cartonsRouges} 🟥`}
              />
            </div>
          )}
          <div className="bloc-titres" style={{ marginTop: '1rem' }}>
            {joueur.titres.length ? (
              joueur.titres.map((titre, i) => <span key={i} className="medaille">🏆 {titreTraduit(titre)}</span>)
            ) : (
              <span style={{ color: 'var(--brume)', fontSize: '0.9rem' }}>
                {t('prof.aucunTitre')}
              </span>
            )}
          </div>

          <div className="eyebrow" style={{ margin: '1.6rem 0 0.8rem' }}>{t('prof.faits')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '260px', overflowY: 'auto' }}>
            {evenements.length ? (
              evenements.slice().reverse().map((e) => (
                <div key={e.id} style={{ fontSize: '0.88rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--bordure)' }}>
                  <b style={{ color: 'var(--or-400)' }}>{t('gen.saison')} {e.saison} · {e.titre}</b>
                  <div style={{ color: 'var(--craie-dim)', marginTop: '0.2rem' }}>{e.texte}</div>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--brume)', fontSize: '0.9rem' }}>
                {t('prof.journalVide')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button className="btn fantome" onClick={() => setConfirmerReset(true)}>
          {t('prof.recommencer')}
        </button>
      </div>

      <AnimatePresence>
        {confirmerReset && (
          <Confirmation
            titre={t('prof.confirmTitre')}
            message={t('prof.confirmMessage')}
            libelleOui={t('prof.confirmOui')}
            libelleNon={t('prof.confirmNon')}
            onOui={() => {
              setConfirmerReset(false);
              reinitialiser();
              setEcran('creation');
            }}
            onNon={() => setConfirmerReset(false)}
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// Une statistique de carrière : valeur en gros, précision en dessous.
function Stat({ label, valeur, aide }: { label: string; valeur: number | string; aide?: string }) {
  return (
    <div className="stat-case">
      <span className="stat-label">{label}</span>
      <b>{valeur}</b>
      {aide && <em>{aide}</em>}
    </div>
  );
}
