import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { Jauge } from '../components/Jauge';
import { POSTE_PAR_ID, ATTRIBUTS_LABELS } from '../data/rugby';
import { Drapeau, nomNation } from '../components/Drapeau';
import { Confirmation } from '../components/Confirmation';
import type { Joueur } from '../types';

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
        <div className="grand-avatar">{poste.categorie === 'Avant' ? '🛡️' : '⚡'}</div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {poste.nom} · {poste.numero} · <Drapeau nation={joueur.nation} taille={0.8} /> {nomNation(joueur.nation)}
          </div>
          <h1>{joueur.nom}</h1>
          <div className="ressources" style={{ marginTop: '0.5rem' }}>
            <span className="pastille">Note globale <b>{moyenne(joueur)}</b></span>
            <span className="pastille">Saison <b>{joueur.saison}</b></span>
            <span className="pastille">{joueur.age} ans</span>
            <span className="pastille">💰 <b>{joueur.argent.toLocaleString('fr-FR')} €</b></span>
          </div>
        </div>
        <button className="btn primaire" onClick={() => setEcran('carriere')}>
          Continuer →
        </button>
      </div>

      <div className="grille-2" style={{ alignItems: 'start' }}>
        <div className="carte" style={{ padding: '1.6rem' }}>
          <div className="eyebrow" style={{ marginBottom: '1rem' }}>Attributs</div>
          <div className="attrs-radar">
            <div>
              {attrs.slice(0, moitie).map((k) => (
                <Jauge key={k} label={ATTRIBUTS_LABELS[k]} valeur={joueur.attributs[k]} />
              ))}
            </div>
            <div>
              {attrs.slice(moitie).map((k) => (
                <Jauge key={k} label={ATTRIBUTS_LABELS[k]} valeur={joueur.attributs[k]} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Jauge label="Forme" valeur={joueur.forme} variante="vert" />
            <Jauge label="Moral" valeur={joueur.moral} variante="or" />
            <Jauge label="Réputation" valeur={joueur.reputation} variante="cuir" />
          </div>
        </div>

        <div className="carte" style={{ padding: '1.6rem' }}>
          <div className="eyebrow" style={{ marginBottom: '1rem' }}>Palmarès & statistiques</div>
          <div className="ressources">
            <span className="pastille">🏉 <b>{joueur.matchsJoues}</b> matchs</span>
            <span className="pastille">🎯 <b>{joueur.essais}</b> essais</span>
            {(joueur.selections ?? 0) > 0 && (
              <span className="pastille" title="Sélections en équipe nationale">
                🏳️ <b>{joueur.selections}</b> capes
              </span>
            )}
          </div>

          {/* Statistiques détaillées de carrière (mode journée par journée) */}
          {joueur.stats && joueur.stats.plaquages + joueur.stats.points > 0 && (
            <div className="stats-detaillees">
              <Stat label="Points" valeur={joueur.stats.points} />
              <Stat
                label="Réussite au pied"
                valeur={joueur.stats.butsTentes
                  ? `${Math.round((joueur.stats.butsReussis / joueur.stats.butsTentes) * 100)} %`
                  : '—'}
                aide={joueur.stats.butsTentes ? `${joueur.stats.butsReussis}/${joueur.stats.butsTentes}` : undefined}
              />
              <Stat
                label="Plaquages"
                valeur={joueur.stats.plaquages}
                aide={`${joueur.stats.plaquagesManques} manqué${joueur.stats.plaquagesManques > 1 ? 's' : ''}`}
              />
              <Stat label="Grattages" valeur={joueur.stats.grattages} />
              <Stat label="Passes décisives" valeur={joueur.stats.passesDecisives} />
              <Stat
                label="Cartons"
                valeur={`${joueur.stats.cartonsJaunes} 🟨 · ${joueur.stats.cartonsRouges} 🟥`}
              />
            </div>
          )}
          <div className="bloc-titres" style={{ marginTop: '1rem' }}>
            {joueur.titres.length ? (
              joueur.titres.map((t, i) => <span key={i} className="medaille">🏆 {t}</span>)
            ) : (
              <span style={{ color: 'var(--brume)', fontSize: '0.9rem' }}>
                Aucun titre pour l'instant. Ta légende reste à écrire.
              </span>
            )}
          </div>

          <div className="eyebrow" style={{ margin: '1.6rem 0 0.8rem' }}>Faits marquants</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '260px', overflowY: 'auto' }}>
            {evenements.length ? (
              evenements.slice().reverse().map((e) => (
                <div key={e.id} style={{ fontSize: '0.88rem', paddingBottom: '0.6rem', borderBottom: '1px solid var(--bordure)' }}>
                  <b style={{ color: 'var(--or-400)' }}>S{e.saison} · {e.titre}</b>
                  <div style={{ color: 'var(--craie-dim)', marginTop: '0.2rem' }}>{e.texte}</div>
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--brume)', fontSize: '0.9rem' }}>
                Joue quelques actions pour remplir ton journal de carrière.
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
        <button className="btn fantome" onClick={() => setConfirmerReset(true)}>
          Recommencer une nouvelle carrière
        </button>
      </div>

      <AnimatePresence>
        {confirmerReset && (
          <Confirmation
            titre="Recommencer une carrière ?"
            message="Cette carrière sera abandonnée et ta progression effacée (elle n'ira PAS au Hall des Légendes — pour ça, prends ta retraite depuis l'écran Carrière). Continuer ?"
            libelleOui="Tout recommencer"
            libelleNon="Garder ma carrière"
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
