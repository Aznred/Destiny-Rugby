// Panneau « Choix de carrière » — les propositions de contrat reçues.
// ⚠️ createPortal(document.body) obligatoire : le backdrop-filter des .carte
// crée un bloc conteneur qui piègerait la modale en position: fixed.
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../store/useGame';
import { clubParNom } from '../data/clubs';
import { Blason } from './Blason';
import { LogoCompet } from './LogoCompet';
import { AGENTS, agentDe } from '../data/agents';
import { raconterNegociation } from '../lib/ia';
import { CLE_ENV } from '../lib/groq';
import type { OffreContrat } from '../types';

export function Offres() {
  const offres = useGame((s) => s.offres);
  const ouvert = useGame((s) => s.offresOuvertes);
  const joueur = useGame((s) => s.joueur);
  const fermer = useGame((s) => s.fermerOffres);
  const signer = useGame((s) => s.signerOffre);
  const negocier = useGame((s) => s.negocierOffre);
  const choisirAgent = useGame((s) => s.choisirAgent);
  const groqKey = useGame((s) => s.groqKey);
  const modele = useGame((s) => s.modele);

  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouvert, fermer]);

  if (!joueur) return null;

  // La négociation est tranchée par le code (store) ; l'IA, si elle est là,
  // met la scène en images derrière. Sans clé, le texte pré-écrit suffit.
  const negocierAvecRecit = async (id: string) => {
    const res = negocier(id);
    const cle = groqKey || CLE_ENV;
    if (!res || !cle) return;
    try {
      const recit = await raconterNegociation(
        { cle, modele, joueur }, res.club, res.agent, res.issue, res.salaire,
      );
      useGame.getState().ajouterEntree({ role: 'mj', titre: '💼 Dans le bureau', texte: recit });
    } catch {
      /* pas grave : le résultat est déjà au journal */
    }
  };

  const contrat = joueur.contrat;
  const finDeContrat = (contrat?.saisons ?? 0) <= 0;

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div
          className="overlay-offres"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={fermer}
        >
          <motion.div
            className="modale-offres carte"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="offres-tete">
              <div>
                <div className="eyebrow">Marché des transferts</div>
                <h2>✈️ Choix de carrière</h2>
              </div>
              <button className="offres-fermer" onClick={fermer} title="Fermer">✕</button>
            </div>

            <div className="offres-contrat">
              {contrat ? (
                <>
                  <span className="pastille">
                    📄 {contrat.club} · <b>{contrat.salaire.toLocaleString('fr-FR')} €</b>/saison
                  </span>
                  <span className="pastille" data-alerte={finDeContrat ? 'oui' : undefined}>
                    {finDeContrat
                      ? '⏳ Contrat terminé — tu es libre'
                      : `⏳ ${contrat.saisons} saison${contrat.saisons > 1 ? 's' : ''} restante${contrat.saisons > 1 ? 's' : ''}`}
                  </span>
                </>
              ) : (
                <span className="pastille">📄 Sans contrat</span>
              )}
            </div>

            {/* LOT 6 — ton agent : il prend sa part, mais il ouvre les portes. */}
            <div className="agents-choix">
              <div className="eyebrow">🤝 Ton agent</div>
              <div className="agents-liste">
                {AGENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`agent-carte${joueur.agent === a.id ? ' actif' : ''}`}
                    onClick={() => choisirAgent(a.id)}
                    title={a.desc}
                  >
                    <span className="agent-emoji">{a.emoji}</span>
                    <span className="agent-nom">{a.nom}</span>
                    <span className="agent-chiffres">
                      {Math.round(a.commission * 100)} % · {a.offres > 1 ? '+' : ''}
                      {Math.round((a.offres - 1) * 100)} % d’offres
                    </span>
                  </button>
                ))}
              </div>
              <p className="agent-desc">{agentDe(joueur.agent).desc}</p>
            </div>

            {offres.length === 0 ? (
              <p className="offres-vide">
                Aucune proposition sur la table pour l'instant. Enchaîne les bonnes
                saisons — ou demande ton transfert pour secouer le marché.
              </p>
            ) : (
              <div className="offres-liste">
                {offres.map((o) => (
                  <CarteOffre
                    key={o.id}
                    offre={o}
                    actuel={o.club === joueur.club}
                    onSigner={() => signer(o.id)}
                    onNegocier={() => negocierAvecRecit(o.id)}
                  />
                ))}
              </div>
            )}

            <div className="offres-pied">
              <button className="btn fantome" onClick={fermer}>
                {finDeContrat ? 'Réfléchir encore' : 'Rester à ' + joueur.club}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function CarteOffre({
  offre, actuel, onSigner, onNegocier,
}: {
  offre: OffreContrat;
  actuel: boolean;
  onSigner: () => void;
  onNegocier: () => void;
}) {
  const club = clubParNom(offre.club);
  return (
    <div className="offre-carte" data-etranger={offre.etranger ? 'oui' : undefined}>
      <div className="offre-entete">
        {club && <Blason club={club} taille={44} />}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="offre-club">{offre.club}</div>
          <div className="offre-division">
            <LogoCompet id={offre.division} emoji="🏉" taille={16} /> {offre.divisionNom}
            {offre.etranger && <span className="offre-tag">🌍 {offre.pays}</span>}
            {actuel && <span className="offre-tag offre-tag-fidele">Ton club</span>}
          </div>
        </div>
        <span className="club-note" title="Note générale du club">{offre.noteClub}</span>
      </div>

      <p className="offre-argument">{offre.argumentaire}</p>

      <div className="offre-chiffres">
        <div>
          <span>Salaire</span>
          <b>{offre.salaire.toLocaleString('fr-FR')} €</b>
        </div>
        <div>
          <span>À la signature</span>
          <b>{offre.prime.toLocaleString('fr-FR')} €</b>
        </div>
        <div>
          <span>Durée</span>
          <b>{offre.saisons} saison{offre.saisons > 1 ? 's' : ''}</b>
        </div>
      </div>

      <div className="offre-actions">
        <button
          className="btn fantome offre-negocier"
          onClick={onNegocier}
          disabled={offre.negociee}
          title={
            offre.negociee
              ? 'Tu as déjà négocié cette offre'
              : 'Tenter d’obtenir mieux — le club peut aussi tout retirer'
          }
        >
          {offre.negociee ? '💼 Déjà négocié' : '💼 Négocier'}
        </button>
        <button className="btn primaire offre-signer" onClick={onSigner}>
          {actuel ? 'Prolonger ✍️' : 'Signer ✍️'}
        </button>
      </div>
    </div>
  );
}
