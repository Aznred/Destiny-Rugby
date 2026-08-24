import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { Jauge } from '../components/Jauge';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Confirmation } from '../components/Confirmation';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { clubParNom, competitionDuClub } from '../data/clubs';
import { forceEffectif } from '../lib/effectif';
import { championnatEnDirect } from '../lib/championnat';
import { semaine, libelleSemaine, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { TROPHEES } from '../data/trophees';
import {
  CONFIANCE_DEPART, CONFIANCE_LICENCIEMENT, clubsAccessibles, etageAccessible,
  noteMaximale, salaireManager,
} from '../lib/manager';

/** Ce que la confiance du board veut dire, en clair. */
function humeurDuBoard(confiance: number): { texte: string; ton: string } {
  if (confiance < CONFIANCE_LICENCIEMENT + 12) {
    return { texte: 'Sur la sellette : une saison de plus comme ça et c’est fini.', ton: 'rouge' };
  }
  if (confiance < CONFIANCE_DEPART) {
    return { texte: 'Le board doute. Il faut des résultats.', ton: 'orange' };
  }
  if (confiance < 78) return { texte: 'Le board te suit.', ton: 'vert' };
  return { texte: 'Le board te fait entièrement confiance.', ton: 'or' };
}

export function Manager() {
  const manager = useGame((s) => s.manager);
  const setEcran = useGame((s) => s.setEcran);
  const semaineManager = useGame((s) => s.semaineManager);
  const signerBanc = useGame((s) => s.signerBanc);
  const quitterBanc = useGame((s) => s.quitterBanc);
  const journal = useGame((s) => s.journal);

  const [raccrocher, setRaccrocher] = useState(false);
  const [clubVise, setClubVise] = useState('');

  const saison = manager?.saison ?? 1;
  const prestige = manager?.prestige ?? 0;
  const libre = manager?.libre ?? false;

  // ⚠️ CALCULÉ EN `useMemo`, ET AVANT LE RETOUR ANTICIPÉ. `clubsAccessibles`
  // balaie les 855 clubs du jeu (107 ms mesurées, `verifManager.ts`) : sans
  // mémoïsation on le refait à chaque frappe. Et un hook posé après un
  // `return null` n'est pas appelé au même rang à chaque rendu — React
  // l'interdit, `oxlint` le signale (`rules-of-hooks`).
  const bancsLibres = useMemo(
    () => clubsAccessibles(prestige, saison, { triche: libre, limite: 60 }),
    [prestige, saison, libre],
  );

  // Le classement de SA division, à la journée en cours. C'est le même
  // championnat que celui de la carrière de joueur : un entraîneur est jugé
  // sur le monde réel du jeu, pas sur une estimation.
  const classement = useMemo(() => {
    if (!manager?.club || !manager.division) return null;
    const sem = semaine(manager.semaine);
    return championnatEnDirect(manager.division, manager.saison, manager.club, sem.journee ?? 0);
  }, [manager?.club, manager?.division, manager?.saison, manager?.semaine]);

  if (!manager) return null;

  const sansBanc = !manager.club;
  const fiche = manager.club ? clubParNom(manager.club) : undefined;
  const comp = manager.club ? competitionDuClub(manager.club) : undefined;
  const force = manager.club ? forceEffectif(manager.club, manager.saison) : 0;
  const humeur = humeurDuBoard(manager.confiance);
  const maLigne = classement?.classement.find((l) => l.club === manager.club);
  const sem = semaine(manager.semaine);

  const optionsBancs: OptionSelecteur[] = bancsLibres.map((c) => ({
    valeur: c.club.nom,
    label: c.club.nom,
    sous: `${c.competition.nom} · force ${c.force.toFixed(1)} · objectif ${c.objectif}ᵉ`
      + ` · ${salaireManager(c.force).toLocaleString('fr-FR')} €`,
    vignette: <Blason club={c.club} taille={22} />,
  }));

  return (
    <motion.section
      className="carriere-manager"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="eyebrow">
        {libre ? '🔓 Mode libre, hors classement' : 'Carrière d’entraîneur'}
        {' · '}saison {manager.saison}
        {!sansBanc && ` · ${libelleSemaine(sem)}`}
      </div>
      <h1>🧑‍🏫 {manager.nom}</h1>

      {/* ═══ LE BANC ═══════════════════════════════════════════════════════ */}
      {sansBanc ? (
        <div className="carte" style={{ padding: '1.4rem' }}>
          <h2 style={{ marginTop: 0 }}>Sans club</h2>
          <p>
            Le temps ne passe pas tant que tu n’as pas de banc. Ton prestige de{' '}
            <strong>{manager.prestige.toFixed(0)}/100</strong> te donne accès aux
            effectifs notés jusqu’à <strong>{noteMaximale(manager.prestige).toFixed(0)}</strong>,
            soit le niveau <strong>{etageAccessible(manager.prestige)?.nom ?? 'amateur'}</strong>.
          </p>
          <div className="champ">
            <label htmlFor="banc">Les bancs à ta portée ({bancsLibres.length} proposés)</label>
            <Selecteur
              id="banc"
              options={optionsBancs}
              valeur={clubVise || optionsBancs[0]?.valeur || ''}
              onChange={setClubVise}
              recherche
            />
          </div>
          <div className="actions">
            <button
              className="btn primaire grand"
              disabled={!optionsBancs.length}
              onClick={() => signerBanc(clubVise || optionsBancs[0].valeur)}
            >
              ✍️ Signer
            </button>
          </div>
        </div>
      ) : (
        <div className="carte club-manager" style={{ padding: '1.4rem' }}>
          <div className="cm-tete">
            {fiche && <Blason club={fiche} taille={46} />}
            <div>
              <strong style={{ fontSize: '1.15rem' }}>{manager.club}</strong>
              <div className="cm-compet">
                {comp && <LogoCompet id={comp.id} emoji={comp.emoji} taille={20} />}
                {manager.divisionNom}
              </div>
            </div>
          </div>

          <div className="cm-chiffres">
            <div>
              <span>{maLigne ? `${maLigne.position}ᵉ` : '—'}</span>
              <em>au classement</em>
            </div>
            <div><span>{manager.objectif}ᵉ</span><em>demandé par le board</em></div>
            <div><span>{force.toFixed(1)}</span><em>force de l’effectif</em></div>
            <div>
              <span>{manager.contrat ? `${manager.contrat.saisons} an(s)` : '—'}</span>
              <em>de contrat</em>
            </div>
            <div>
              <span>{(manager.contrat?.salaire ?? 0).toLocaleString('fr-FR')} €</span>
              <em>par saison</em>
            </div>
            <div><span>{manager.argent.toLocaleString('fr-FR')} €</span><em>gagné en carrière</em></div>
          </div>

          <div className="grille-2" style={{ marginTop: '1rem' }}>
            <Jauge label="Prestige" valeur={manager.prestige} variante="or" />
            <Jauge label="Confiance du board" valeur={manager.confiance} variante={manager.confiance < CONFIANCE_DEPART ? 'cuir' : 'vert'} />
          </div>
          <p className={`humeur-board ${humeur.ton}`}>{humeur.texte}</p>

          <div className="actions">
            <button className="btn primaire grand" onClick={() => semaineManager()}>
              {manager.semaine >= SEMAINES_PAR_SAISON
                ? '🏁 Clore la saison'
                : `▶️ Semaine suivante (${manager.semaine}/${SEMAINES_PAR_SAISON})`}
            </button>
            <button className="btn fantome" onClick={() => setEcran('tableau')}>
              📊 Résultats
            </button>
            <button className="btn fantome" onClick={() => setEcran('effectif')}>
              👥 Mon effectif
            </button>
          </div>
        </div>
      )}

      {/* ═══ CE QUE LA CARRIÈRE A DÉJÀ PRODUIT ════════════════════════════
          ⚠️ L'HISTORIQUE EST LA CARRIÈRE, sur un banc. Un joueur a ses
          attributs et sa feuille de match ; un entraîneur n'a que la suite de
          ses fins de saison — c'est là que se lit une progression d'étage. */}
      {manager.historique.length > 0 && (
        <div className="carte bloc-competition">
          <div className="comp-tete">
            <b>📋 Le parcours</b>
            <span className="comp-count">{manager.historique.length} saison(s)</span>
          </div>
          <div className="classement-tableau tableau-live histo-manager">
            {[...manager.historique].reverse().map((h) => (
              <div key={`${h.saison}-${h.club}`} className="classement-ligne">
                <span className="cl-pos">S{h.saison}</span>
                <span className="cl-nom">{h.club}</span>
                <span>{h.divisionNom}</span>
                <span className={h.tenu ? 'cl-plus' : 'cl-moins'}>
                  {h.rang}ᵉ / {h.objectif}ᵉ
                </span>
                <span>
                  {h.titres.map((id) => TROPHEES[id]?.nom ?? id).join(', ')}
                  {h.montee && ' ⬆️ montée'}
                  {h.descente && ' ⬇️ descente'}
                  {h.licencie && ' 📉 remercié'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Le journal, comme en carrière de joueur : c'est le récit. */}
      {journal.length > 0 && (
        <div className="carte bloc-competition">
          <div className="comp-tete"><b>📜 Journal</b></div>
          <div className="journal">
            {[...journal].reverse().slice(0, 12).map((e) => (
              <div key={e.id} className="entree">
                <b>{e.titre}</b>
                <p>{e.texte}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: '1.2rem' }}>
        <button className="btn fantome" onClick={() => setRaccrocher(true)}>
          🚪 Raccrocher
        </button>
      </div>

      {raccrocher && (
        <Confirmation
          titre="Raccrocher pour de bon ?"
          message={libre
            ? 'La carrière part au Hall des Légendes. ⚠️ Lancée en mode libre, '
              + 'elle n’entrera dans aucun classement, c’était le marché.'
            : 'La carrière part au Hall des Légendes et au classement mondial, '
              + 'dans la catégorie des entraîneurs.'}
          libelleOui="Raccrocher"
          onOui={() => { setRaccrocher(false); quitterBanc(); }}
          onNon={() => setRaccrocher(false)}
        />
      )}
    </motion.section>
  );
}
