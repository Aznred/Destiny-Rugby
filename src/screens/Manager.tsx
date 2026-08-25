import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t, nombre } from '../lib/i18n';
import { Jauge } from '../components/Jauge';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Confirmation } from '../components/Confirmation';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { COMPETITIONS, clubParNom, competitionDuClub } from '../data/clubs';
import { forceEffectif } from '../lib/effectif';
import { championnatEnDirect } from '../lib/championnat';
import { semaine, libelleSemaine, SEMAINES_PAR_SAISON } from '../data/calendrier';
import { TROPHEES } from '../data/trophees';
import { nomPoste, POSTES } from '../data/rugby';
import { Drapeau } from '../components/Drapeau';
import { ciblesDuMarche } from '../lib/recrutementManager';
import {
  CONFIANCE_DEPART, CONFIANCE_LICENCIEMENT, clubsAccessibles, etageAccessible,
  noteMaximale, salaireManager,
} from '../lib/manager';

type VueManager = 'bureau' | 'marche' | 'negociations';

function humeurDuBoard(confiance: number): { texte: string; ton: string } {
  if (confiance < CONFIANCE_LICENCIEMENT + 12) return { texte: t('mgr.board.sellette'), ton: 'rouge' };
  if (confiance < CONFIANCE_DEPART) return { texte: t('mgr.board.doute'), ton: 'orange' };
  if (confiance < 78) return { texte: t('mgr.board.suit'), ton: 'vert' };
  return { texte: t('mgr.board.confiance'), ton: 'or' };
}

export function Manager() {
  const manager = useGame((s) => s.manager);
  const setEcran = useGame((s) => s.setEcran);
  const semaineManager = useGame((s) => s.semaineManager);
  const repondreDecision = useGame((s) => s.repondreDecisionManager);
  const contacter = useGame((s) => s.contacterJoueurManager);
  const ouvrirMessages = useGame((s) => s.ouvrirMessagesOvale);
  const ouvrirDiscussion = useGame((s) => s.ouvrirDiscussionOvale);
  const signerBanc = useGame((s) => s.signerBanc);
  const quitterBanc = useGame((s) => s.quitterBanc);
  const journal = useGame((s) => s.journal);

  const [vue, setVue] = useState<VueManager>('bureau');
  const [raccrocher, setRaccrocher] = useState(false);
  const [clubVise, setClubVise] = useState('');
  const [divisionMarche, setDivisionMarche] = useState(manager?.division ?? 'top14');
  const [clubMarche, setClubMarche] = useState('');
  const [recherche, setRecherche] = useState('');
  const [poste, setPoste] = useState('');

  const saison = manager?.saison ?? 1;
  const prestige = manager?.prestige ?? 0;
  const libre = manager?.libre ?? false;
  const bancsLibres = useMemo(
    () => clubsAccessibles(prestige, saison, { triche: libre, limite: 60 }),
    [prestige, saison, libre],
  );
  const classement = useMemo(() => {
    if (!manager?.club || !manager.division) return null;
    const sem = semaine(manager.semaine);
    return championnatEnDirect(manager.division, manager.saison, manager.club, sem.journee ?? 0);
  }, [manager?.club, manager?.division, manager?.saison, manager?.semaine]);
  const cibles = useMemo(() => {
    if (!manager?.club) return [];
    return ciblesDuMarche(divisionMarche, manager.saison, manager.club, clubMarche)
      .filter((c) => !poste || c.poste === poste)
      .filter((c) => !recherche.trim()
        || `${c.nom} ${c.club} ${c.nation}`.toLowerCase().includes(recherche.trim().toLowerCase()));
  }, [manager?.club, manager?.saison, divisionMarche, clubMarche, poste, recherche]);

  if (!manager) return null;

  const sansBanc = !manager.club;
  const fiche = manager.club ? clubParNom(manager.club) : undefined;
  const comp = manager.club ? competitionDuClub(manager.club) : undefined;
  const force = manager.club ? forceEffectif(manager.club, manager.saison) : 0;
  const humeur = humeurDuBoard(manager.confiance);
  const maLigne = classement?.classement.find((l) => l.club === manager.club);
  const sem = semaine(manager.semaine);
  const actives = manager.negociations.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');

  const optionsBancs: OptionSelecteur[] = bancsLibres.map((c) => ({
    valeur: c.club.nom,
    label: c.club.nom,
    sous: t('mgr.banc.sous', {
      competition: c.competition.nom, force: c.force.toFixed(1), objectif: c.objectif,
      salaire: nombre(salaireManager(c.force)),
    }),
    vignette: <Blason club={c.club} taille={22} />,
  }));
  const optionsDivisions: OptionSelecteur[] = COMPETITIONS.map((c) => ({
    valeur: c.id, label: c.nom, sous: `${c.pays} · ${c.clubs.length} ${t('mgr.clubs')}`,
    vignette: <LogoCompet id={c.id} emoji={c.emoji} taille={22} />,
  }));
  const competitionMarche = COMPETITIONS.find((c) => c.id === divisionMarche);
  const optionsClubs: OptionSelecteur[] = [
    { valeur: '', label: t('mgr.marche.tousClubs'), sous: t('mgr.marche.selectionMondiale') },
    ...(competitionMarche?.clubs ?? []).map((c) => ({
      valeur: c.nom, label: c.nom, vignette: <Blason club={c} taille={20} />,
    })),
  ];
  const optionsPostes: OptionSelecteur[] = [
    { valeur: '', label: t('mgr.marche.tousPostes') },
    ...POSTES.map((p) => ({ valeur: p.id, label: nomPoste(p.id), sous: `n° ${p.numero}` })),
  ];

  return (
    <motion.section className="carriere-manager" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <header className="manager-entete">
        <div>
          <div className="eyebrow">
            {libre ? t('mgr.modeLibre') : t('mgr.carriere')}
            {' · '}{t('gen.saison').toLowerCase()} {manager.saison}
            {!sansBanc && ` · ${libelleSemaine(sem, manager.saison)}`}
          </div>
          <h1>🧑‍🏫 {manager.nom}</h1>
        </div>
        {!sansBanc && fiche && (
          <div className="manager-identite-club">
            <Blason club={fiche} taille={42} />
            <span><b>{manager.club}</b><small>{manager.divisionNom}</small></span>
          </div>
        )}
      </header>

      {sansBanc ? (
        <div className="carte manager-sans-banc">
          <h2>{t('mgr.sansClub')}</h2>
          <p>{t('mgr.sansClubTexte', {
            prestige: manager.prestige.toFixed(0), note: noteMaximale(manager.prestige).toFixed(0),
            niveau: etageAccessible(manager.prestige)?.nom ?? t('mgr.amateur'),
          })}</p>
          <div className="champ">
            <label htmlFor="banc">{t('mgr.bancsPortee', { n: bancsLibres.length })}</label>
            <Selecteur id="banc" options={optionsBancs} valeur={clubVise || optionsBancs[0]?.valeur || ''} onChange={setClubVise} recherche />
          </div>
          <button className="btn primaire grand" disabled={!optionsBancs.length} onClick={() => signerBanc(clubVise || optionsBancs[0].valeur)}>
            ✍️ {t('mgr.signer')}
          </button>
        </div>
      ) : (
        <>
          <nav className="manager-onglets" aria-label={t('mgr.navigation')}>
            <button className={vue === 'bureau' ? 'actif' : ''} onClick={() => setVue('bureau')}>🏟️ {t('mgr.bureau')}</button>
            <button className={vue === 'marche' ? 'actif' : ''} onClick={() => setVue('marche')}>🌍 {t('mgr.marche')}</button>
            <button className={vue === 'negociations' ? 'actif' : ''} onClick={() => setVue('negociations')}>
              💬 {t('mgr.negociations')} {actives.length > 0 && <i>{actives.length}</i>}
            </button>
          </nav>

          {vue === 'bureau' && (
            <div className="manager-bureau">
              <aside className="carte manager-club-panel">
                <div className="cm-tete">
                  {fiche && <Blason club={fiche} taille={48} />}
                  <div><strong>{manager.club}</strong><div className="cm-compet">{comp && <LogoCompet id={comp.id} emoji={comp.emoji} taille={20} />}{manager.divisionNom}</div></div>
                </div>
                <div className="cm-chiffres compacts">
                  <div><span>{maLigne ? `${maLigne.position}ᵉ` : '—'}</span><em>{t('mgr.classement')}</em></div>
                  <div><span>{manager.objectif}ᵉ</span><em>{t('mgr.objectif')}</em></div>
                  <div><span>{force.toFixed(1)}</span><em>{t('mgr.force')}</em></div>
                  <div><span>{manager.contrat?.saisons ?? '—'}</span><em>{t('mgr.contrat')}</em></div>
                </div>
                <Jauge label={t('mgr.prestige')} valeur={manager.prestige} variante="or" />
                <Jauge label={t('mgr.confiance')} valeur={manager.confiance} variante={manager.confiance < CONFIANCE_DEPART ? 'cuir' : 'vert'} />
                <p className={`humeur-board ${humeur.ton}`}>{humeur.texte}</p>
                <div className="manager-budgets">
                  <span><small>{t('mgr.budgetTransferts')}</small><b>{nombre(manager.budgetTransferts)} €</b></span>
                  <span><small>{t('mgr.budgetSalarial')}</small><b>{nombre(manager.budgetSalarial)} €</b></span>
                </div>
                <div className="actions verticales">
                  <button className="btn fantome" onClick={() => setEcran('tableau')}>📊 {t('mgr.resultatsMonde')}</button>
                  <button className="btn fantome" onClick={() => setEcran('effectif')}>👥 {t('mgr.monEffectif')}</button>
                  <button className="btn fantome" onClick={() => setVue('marche')}>🔎 {t('mgr.recruter')}</button>
                </div>
              </aside>

              <main className="manager-recit">
                {manager.decision ? (
                  <article className="carte manager-decision">
                    <div className="manager-decision-emoji">{manager.decision.emoji}</div>
                    <div className="eyebrow">{t('mgr.decisionSemaine')}</div>
                    <h2>{manager.decision.titre}</h2>
                    <p>{manager.decision.texte}</p>
                    <div className="manager-choix">
                      {manager.decision.choix.map((choix) => (
                        <button key={choix.id} onClick={() => repondreDecision(manager.decision!.id, choix.id)}>
                          <b>{choix.label}</b><span>{choix.consequence}</span>
                        </button>
                      ))}
                    </div>
                  </article>
                ) : (
                  <article className="carte manager-semaine-prete">
                    <span>✓</span><h2>{t('mgr.semainePreparee')}</h2><p>{t('mgr.semainePrepareeTexte')}</p>
                    <button className="btn primaire grand" onClick={semaineManager}>
                      {manager.semaine >= SEMAINES_PAR_SAISON ? `🏁 ${t('mgr.cloreSaison')}` : `▶ ${t('mgr.semaineSuivante')} (${manager.semaine}/${SEMAINES_PAR_SAISON})`}
                    </button>
                  </article>
                )}
                <div className="carte manager-journal">
                  <div className="comp-tete"><b>📜 {t('mgr.journal')}</b></div>
                  <div className="journal">{[...journal].reverse().slice(0, 8).map((e) => <div key={e.id} className="entree"><b>{e.titre}</b><p>{e.texte}</p></div>)}</div>
                </div>
              </main>

              <aside className="carte manager-classement">
                <div className="comp-tete"><b>📊 {manager.divisionNom}</b><button onClick={() => setEcran('tableau')}>{t('mgr.voirTout')}</button></div>
                <div className="manager-top-classement">
                  {classement?.classement.slice(0, 8).map((l) => (
                    <div key={l.club} className={l.club === manager.club ? 'moi' : ''}>
                      <span>{l.position}</span><b>{l.club}</b><strong>{l.points} pts</strong>
                    </div>
                  ))}
                </div>
                <p className="manager-prochain">{t('mgr.calendrierComplet')}</p>
              </aside>
            </div>
          )}

          {vue === 'marche' && (
            <div className="manager-marche">
              <div className="carte manager-marche-tete">
                <div><div className="eyebrow">{t('mgr.baseMondiale')}</div><h2>🌍 {t('mgr.marcheTitre')}</h2><p>{t('mgr.marcheIntro')}</p></div>
                <div className="manager-budgets resume"><span>{t('mgr.transferts')} <b>{nombre(manager.budgetTransferts)} €</b></span><span>{t('mgr.salaires')} <b>{nombre(manager.budgetSalarial)} €</b></span></div>
              </div>
              <div className="manager-filtres carte">
                <Selecteur options={optionsDivisions} valeur={divisionMarche} onChange={(v) => { setDivisionMarche(v); setClubMarche(''); }} recherche />
                <Selecteur options={optionsClubs} valeur={clubMarche} onChange={setClubMarche} recherche />
                <Selecteur options={optionsPostes} valeur={poste} onChange={setPoste} />
                <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={t('mgr.marche.rechercher')} aria-label={t('mgr.marche.rechercher')} />
              </div>
              <p className="manager-resultats-marche">{t('mgr.marche.resultats', { n: cibles.length })}</p>
              <div className="manager-cibles">
                {cibles.map((cible) => {
                  const existante = manager.negociations.find((n) => n.joueur.id === cible.id && n.etat !== 'rompue');
                  const clubCible = clubParNom(cible.club);
                  return (
                    <article key={cible.id} className="carte manager-cible">
                      <div className="manager-cible-note">{cible.note}<small>{t('mgr.note')}</small></div>
                      <div className="manager-cible-corps">
                        <div className="manager-cible-identite"><Drapeau nation={cible.nation} taille={0.95} /><span><b>{cible.nom}</b><small>{nomPoste(cible.poste)} · {cible.age} {t('gen.ans')}</small></span></div>
                        <p>{clubCible && <Blason club={clubCible} taille={18} />} {cible.club}</p>
                        <div className="manager-cible-chiffres"><span>{t('mgr.potentiel')} <b>{cible.potentiel}</b></span><span>{t('mgr.indemnite')} <b>{nombre(cible.indemnite)} €</b></span><span>{t('mgr.salaire')} <b>{nombre(cible.salaireDemande)} €</b></span></div>
                      </div>
                      <button className="btn primaire" disabled={existante?.etat === 'signee'} onClick={() => existante ? ouvrirDiscussion(existante.pseudo) : contacter(cible)}>
                        {existante?.etat === 'signee' ? `✓ ${t('mgr.signe')}` : existante ? `𝕏 ${t('mgr.reprendreDiscussion')}` : `𝕏 ${t('mgr.contacter')}`}
                      </button>
                    </article>
                  );
                })}
                {!cibles.length && <div className="carte manager-vide">{t('mgr.marche.aucun')}</div>}
              </div>
            </div>
          )}

          {vue === 'negociations' && (
            <div className="manager-negociations">
              <div className="carte manager-marche-tete"><div><div className="eyebrow">𝕏 L’Ovale</div><h2>💬 {t('mgr.negociationsTitre')}</h2><p>{t('mgr.negociationsIntro')}</p></div><button className="btn primaire" onClick={ouvrirMessages}>𝕏 {t('mgr.ouvrirMessages')}</button></div>
              <div className="manager-dossiers">
                {[...manager.negociations].reverse().map((n) => (
                  <article key={n.id} className="carte manager-dossier" data-etat={n.etat}>
                    <div><b>{n.joueur.nom}</b><span>{n.joueur.club} · {nomPoste(n.joueur.poste)}</span></div>
                    <strong>{t(`mgr.etat.${n.etat}`)}</strong>
                    <button className="btn fantome" onClick={() => ouvrirDiscussion(n.pseudo)}>𝕏 {t('mgr.ouvrir')}</button>
                  </article>
                ))}
                {!manager.negociations.length && <div className="carte manager-vide"><b>{t('mgr.aucuneDiscussion')}</b><p>{t('mgr.aucuneDiscussionTexte')}</p><button className="btn primaire" onClick={() => setVue('marche')}>🔎 {t('mgr.explorerMarche')}</button></div>}
              </div>
            </div>
          )}
        </>
      )}

      {manager.historique.length > 0 && vue === 'bureau' && (
        <div className="carte bloc-competition manager-historique">
          <div className="comp-tete"><b>📋 {t('mgr.parcours')}</b><span className="comp-count">{manager.historique.length}</span></div>
          <div className="classement-tableau tableau-live histo-manager">{[...manager.historique].reverse().map((h) => <div key={`${h.saison}-${h.club}`} className="classement-ligne"><span className="cl-pos">S{h.saison}</span><span className="cl-nom">{h.club}</span><span>{h.divisionNom}</span><span className={h.tenu ? 'cl-plus' : 'cl-moins'}>{h.rang}ᵉ / {h.objectif}ᵉ</span><span>{h.titres.map((id) => TROPHEES[id]?.nom ?? id).join(', ')}{h.montee && ' ⬆️'}{h.descente && ' ⬇️'}{h.licencie && ' 📉'}</span></div>)}</div>
        </div>
      )}

      <button className="btn fantome manager-raccrocher" onClick={() => setRaccrocher(true)}>🚪 {t('mgr.raccrocher')}</button>
      {raccrocher && <Confirmation titre={t('mgr.raccrocherTitre')} message={libre ? t('mgr.raccrocherLibre') : t('mgr.raccrocherClasse')} libelleOui={t('mgr.raccrocher')} onOui={() => { setRaccrocher(false); quitterBanc(); }} onNon={() => setRaccrocher(false)} />}
    </motion.section>
  );
}
