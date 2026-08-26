import { lazy, Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/useGame';
import { t, nombre } from '../lib/i18n';
import { Blason } from '../components/Blason';
import { LogoCompet } from '../components/LogoCompet';
import { Confirmation } from '../components/Confirmation';
import { Selecteur } from '../components/Selecteur';
import type { OptionSelecteur } from '../components/Selecteur';
import { COMPETITIONS, clubParNom, competitionDuClub } from '../data/clubs';
import { effectifDuClub, forceEffectif } from '../lib/effectif';
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
import { matchDuClubSemaine } from '../lib/matchLive';
import {
  CLUBS_OBSERVES, coutAmelioration, EMOJI_INSTALLATION, GAIN_ENTRAINEMENT,
  installationsVierges, NIVEAU_INSTALLATION_MAX, PLACES_ENTRAINEMENT,
  PROMOTION_PAR_NIVEAU, INCERTITUDE_RECRUTEURS, budgetStructure,
} from '../lib/installations';
import {
  joueurCompatibleManager, noteCompositionManager, POSTES_BANC_MANAGER,
  POSTES_XV_MANAGER, reconcilerCompositionManager,
} from '../lib/compositionManager';
import type { CompositionManager, TactiqueManager, TypeInstallation } from '../types';

const MatchLive = lazy(() => import('../components/MatchLive').then((m) => ({ default: m.MatchLive })));

type VueManager = 'bureau' | 'equipe' | 'match' | 'marche'
  | 'formation' | 'recruteurs' | 'entrainement';

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
  const contacterClub = useGame((s) => s.contacterClubManager);
  const ouvrirMessages = useGame((s) => s.ouvrirMessagesOvale);
  const ouvrirDiscussion = useGame((s) => s.ouvrirDiscussionOvale);
  const signerBanc = useGame((s) => s.signerBanc);
  const quitterBanc = useGame((s) => s.quitterBanc);
  const definirComposition = useGame((s) => s.definirCompositionManager);
  const definirTactique = useGame((s) => s.definirTactiqueManager);
  const ameliorerInstallation = useGame((s) => s.ameliorerInstallation);
  const basculerEntrainement = useGame((s) => s.basculerEntrainement);
  const enregistrerResultat = useGame((s) => s.enregistrerResultatManager);
  const journal = useGame((s) => s.journal);

  const [vue, setVue] = useState<VueManager>('bureau');
  // ⚠️ LES MURS SONT CEUX DU CLUB, pas ceux de l'entraîneur : on lit le club
  // courant, et un manager qui change de banc découvre ce que l'autre a bâti.
  const murs = manager?.installations?.[manager.club] ?? installationsVierges();
  const enveloppe = manager?.club
    ? budgetStructure(forceEffectif(manager.club, manager.saison), competitionDuClub(manager.club)?.niveau ?? 8)
    : 0;
  const placesEntrainement = PLACES_ENTRAINEMENT[Math.min(murs.entrainement, NIVEAU_INSTALLATION_MAX)];
  const rapportsFrais = manager?.rapports?.filter((r) => r.saison >= (manager.saison ?? 0)).length ?? 0;
  const [raccrocher, setRaccrocher] = useState(false);
  const [clubVise, setClubVise] = useState('');
  const [divisionMarche, setDivisionMarche] = useState(manager?.division ?? 'top14');
  const [clubMarche, setClubMarche] = useState('');
  const [recherche, setRecherche] = useState('');
  const [poste, setPoste] = useState('');
  const [matchOuvert, setMatchOuvert] = useState(false);

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
  const effectif = useMemo(
    () => manager?.club ? effectifDuClub(manager.club, manager.saison) : [],
    [manager],
  );
  const compositionMemo = useMemo(
    () => reconcilerCompositionManager(effectif, manager?.composition),
    [effectif, manager?.composition],
  );
  const afficheMemo = useMemo(
    () => manager ? matchDuClubSemaine(manager) : null,
    [manager],
  );

  if (!manager) return null;

  const sansBanc = !manager.club;
  const fiche = manager.club ? clubParNom(manager.club) : undefined;
  const comp = manager.club ? competitionDuClub(manager.club) : undefined;
  const force = manager.club ? forceEffectif(manager.club, manager.saison) : 0;
  const humeur = humeurDuBoard(manager.confiance);
  const maLigne = classement?.classement.find((l) => l.club === manager.club);
  const sem = semaine(manager.semaine);
  const actives = manager.negociations.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');
  const dossiersClubs = manager.negociationsClubs.filter((n) => n.etat === 'ouverte' || n.etat === 'accord');
  const demandesOuvertes = manager.demandes.filter((d) => d.etat === 'ouverte');
  const alertesOvale = actives.length + dossiersClubs.length + demandesOuvertes.length
    + manager.ventes.reduce((total, vente) => total + vente.offres.length, 0);
  const composition = compositionMemo;
  const afficheManager = afficheMemo;
  const resultatManager = afficheManager ? manager.resultats[afficheManager.cle] : undefined;

  const changerJoueur = (zone: 'titulaires' | 'remplacants', index: number, joueurId: string) => {
    const suivante: CompositionManager = {
      ...composition,
      titulaires: [...composition.titulaires],
      remplacants: [...composition.remplacants],
    };
    const ancien = suivante[zone][index];
    for (const autreZone of ['titulaires', 'remplacants'] as const) {
      const autreIndex = suivante[autreZone].indexOf(joueurId);
      if (autreIndex >= 0) suivante[autreZone][autreIndex] = ancien;
    }
    suivante[zone][index] = joueurId;
    if (suivante.capitaineId === ancien && zone === 'titulaires') suivante.capitaineId = joueurId;
    if (suivante.buteurId === ancien) suivante.buteurId = joueurId;
    definirComposition(suivante);
  };

  const majTactique = <K extends keyof TactiqueManager>(cle: K, valeur: TactiqueManager[K]) => {
    definirTactique({ ...manager.tactique, [cle]: valeur });
  };

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
            <button className={vue === 'bureau' ? 'actif' : ''} onClick={() => setVue('bureau')}>🏟️ Club</button>
            <button className={vue === 'equipe' ? 'actif' : ''} onClick={() => setVue('equipe')}>👥 Composition</button>
            <button className={vue === 'match' ? 'actif' : ''} onClick={() => setVue('match')}>
              🎮 Match {afficheManager && !resultatManager && <i>1</i>}
            </button>
            <button className={vue === 'marche' ? 'actif' : ''} onClick={() => setVue('marche')}>🌍 {t('mgr.marche')}</button>
            <button onClick={ouvrirMessages}>
              𝕏 L’Ovale {alertesOvale > 0 && <i>{alertesOvale}</i>}
            </button>
            <button className={vue === 'formation' ? 'actif' : ''} onClick={() => setVue('formation')}>🎓 Formation</button>
            <button className={vue === 'recruteurs' ? 'actif' : ''} onClick={() => setVue('recruteurs')}>
              🔎 Recruteurs {rapportsFrais > 0 && <i>{rapportsFrais}</i>}
            </button>
            <button className={vue === 'entrainement' ? 'actif' : ''} onClick={() => setVue('entrainement')}>🏋️ Entraînement</button>
          </nav>

          {vue === 'bureau' && (
            <div className="manager-bureau">
              <section className="carte manager-club-resume">
                <div className="manager-club-resume-identite">
                  {fiche && <Blason club={fiche} taille={62} />}
                  <div>
                    <div className="eyebrow">Tableau de bord · saison {manager.saison}</div>
                    <h2>{manager.club}</h2>
                    <p>{comp && <LogoCompet id={comp.id} emoji={comp.emoji} taille={19} />} {manager.divisionNom} · {humeur.texte}</p>
                  </div>
                </div>
                <div className="manager-resume-actions">
                  <button className="btn fantome" onClick={() => setEcran('effectif')}>👥 Effectif</button>
                  <button className="btn fantome" onClick={ouvrirMessages}>𝕏 L’Ovale</button>
                  <button className="btn primaire" onClick={() => {
                    if (afficheManager && !resultatManager) setVue('match'); else semaineManager();
                  }}>
                    {afficheManager && !resultatManager ? '🎮 Coacher le match' : '▶ Semaine suivante'}
                  </button>
                </div>
              </section>

              <section className="manager-kpis" aria-label="Informations importantes du club">
                <article className="carte"><small>Classement</small><b>{maLigne ? `${maLigne.position}e` : '—'}</b><span>{maLigne?.points ?? 0} points</span></article>
                <article className="carte"><small>Objectif du board</small><b>{manager.objectif}e</b><span>{maLigne && maLigne.position <= manager.objectif ? 'Objectif tenu' : 'À rattraper'}</span></article>
                <article className="carte"><small>Force du groupe</small><b>{force.toFixed(1)}</b><span>{effectif.length} joueurs</span></article>
                <article className="carte"><small>Confiance</small><b>{Math.round(manager.confiance)}%</b><span>{humeur.texte}</span></article>
                <article className="carte"><small>Budget transferts</small><b>{nombre(manager.budgetTransferts)} €</b><span>{nombre(manager.budgetSalarial)} € salarial</span></article>
                <article className="carte"><small>Structures</small><b>{nombre(manager.budgetStructure)} €</b><span>Formation {murs.formation}/4 · Recrutement {murs.recrutement}/4 · Entraînement {murs.entrainement}/4</span></article>
              </section>

              <section className="carte manager-classement-complet">
                <div className="comp-tete"><b>📊 {manager.divisionNom}</b><button onClick={() => setEcran('tableau')}>{t('mgr.resultatsMonde')}</button></div>
                <div className="manager-table-classement" role="region" aria-label={`Classement ${manager.divisionNom}`} tabIndex={0}>
                  <table>
                    <thead><tr><th>#</th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>+/-</th><th>Pts</th></tr></thead>
                    <tbody>
                      {classement?.classement.map((l) => {
                        const club = clubParNom(l.club);
                        return (
                          <tr key={l.club} className={l.club === manager.club ? 'moi' : ''}>
                            <td>{l.position}</td>
                            <th scope="row"><span>{club && <Blason club={club} taille={27} />}<b>{l.club}</b></span></th>
                            <td>{l.joues}</td><td>{l.gagnes}</td><td>{l.nuls}</td><td>{l.perdus}</td>
                            <td className={l.difference >= 0 ? 'positif' : 'negatif'}>{l.difference > 0 ? '+' : ''}{l.difference}</td>
                            <td><strong>{l.points}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="manager-bureau-bas">
                <article className="carte manager-prochain-match">
                  <div className="comp-tete"><b>🏉 Prochaine échéance</b></div>
                  {afficheManager ? (
                    <div className="manager-mini-duel">
                      <span>{afficheManager.match.domicile}</span><strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : 'VS'}</strong><span>{afficheManager.match.exterieur}</span>
                    </div>
                  ) : <p>Aucun match cette semaine : récupération et préparation.</p>}
                </article>
                <article className="carte manager-journal">
                  <div className="comp-tete"><b>📜 {t('mgr.journal')}</b></div>
                  <div className="journal">{[...journal].reverse().slice(0, 5).map((e) => <div key={e.id} className="entree"><b>{e.titre}</b><p>{e.texte}</p></div>)}</div>
                </article>
              </section>
            </div>
          )}

          {vue === 'equipe' && (
            <div className="manager-equipe">
              <section className="carte manager-composition-tete">
                <div>
                  <div className="eyebrow">Feuille de match · 23 joueurs</div>
                  <h2>👥 Ton XV, ton banc, tes rôles</h2>
                  <p>Chaque choix est transmis au moteur. Un joueur hors de son poste perd la cohérence collective ; le buteur et le capitaine influencent réellement les pénalités et la discipline.</p>
                </div>
                <div className="manager-note-compo"><b>{noteCompositionManager(effectif, composition).toFixed(1)}</b><span>note du XV</span></div>
              </section>

              <div className="manager-composition-grille">
                <section className="carte manager-xv">
                  <div className="comp-tete"><b>🏉 XV de départ</b><span className="comp-count">15</span></div>
                  <div className="manager-liste-compo">
                    {POSTES_XV_MANAGER.map((posteSlot, index) => {
                      const joueur = effectif.find((j) => j.id === composition.titulaires[index]);
                      return (
                        <label key={`${posteSlot}-${index}`} className="manager-slot">
                          <span className="manager-numero">{index + 1}</span>
                          <span><b>{nomPoste(posteSlot)}</b><small>{joueur && joueur.poste !== posteSlot ? `Adapté depuis ${nomPoste(joueur.poste)}` : 'Poste naturel'}</small></span>
                          <select value={joueur?.id ?? ''} onChange={(e) => changerJoueur('titulaires', index, e.target.value)}>
                            {effectif
                              .filter((j) => joueurCompatibleManager(j, posteSlot))
                              .sort((a, b) => (b.poste === posteSlot ? 100 : 0) + b.note - ((a.poste === posteSlot ? 100 : 0) + a.note))
                              .map((j) => <option key={j.id} value={j.id}>{j.nom} · {j.note} · {nomPoste(j.poste)}</option>)}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="carte manager-banc-compo">
                  <div className="comp-tete"><b>🪑 Banc</b><span className="comp-count">8</span></div>
                  <div className="manager-liste-compo">
                    {POSTES_BANC_MANAGER.map((posteSlot, index) => {
                      const joueur = effectif.find((j) => j.id === composition.remplacants[index]);
                      return (
                        <label key={`${posteSlot}-${index}`} className="manager-slot">
                          <span className="manager-numero">{index + 16}</span>
                          <span><b>{nomPoste(posteSlot)}</b><small>{joueur ? `${joueur.note} · ${joueur.age} ans` : '—'}</small></span>
                          <select value={joueur?.id ?? ''} onChange={(e) => changerJoueur('remplacants', index, e.target.value)}>
                            {effectif
                              .filter((j) => joueurCompatibleManager(j, posteSlot))
                              .sort((a, b) => b.note - a.note)
                              .map((j) => <option key={j.id} value={j.id}>{j.nom} · {j.note} · {nomPoste(j.poste)}</option>)}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                  <div className="manager-roles">
                    <label><span>©️ Capitaine</span><select value={composition.capitaineId} onChange={(e) => definirComposition({ ...composition, capitaineId: e.target.value })}>{composition.titulaires.map((id) => { const j = effectif.find((x) => x.id === id); return j && <option key={id} value={id}>{j.nom}</option>; })}</select></label>
                    <label><span>🎯 Buteur</span><select value={composition.buteurId} onChange={(e) => definirComposition({ ...composition, buteurId: e.target.value })}>{[...composition.titulaires, ...composition.remplacants].map((id) => { const j = effectif.find((x) => x.id === id); return j && <option key={id} value={id}>{j.nom} · {nomPoste(j.poste)}</option>; })}</select></label>
                  </div>
                </section>
              </div>

              <section className="carte manager-plan-avant-match">
                <div className="comp-tete"><b>🧠 Plan de jeu initial</b><span>modifiable pendant le match</span></div>
                <div className="manager-tactiques-selects">
                  <label><span>Attaque</span><select value={manager.tactique.attaque} onChange={(e) => majTactique('attaque', e.target.value as TactiqueManager['attaque'])}><option value="equilibre">Équilibré</option><option value="avants">Jeu d’avants</option><option value="large">Jouer au large</option><option value="occupation">Occupation au pied</option></select></label>
                  <label><span>Défense</span><select value={manager.tactique.defense} onChange={(e) => majTactique('defense', e.target.value as TactiqueManager['defense'])}><option value="blitz">Blitz</option><option value="glissee">Glissée</option><option value="repli">Repli</option></select></label>
                  <label><span>Rythme</span><select value={manager.tactique.rythme} onChange={(e) => majTactique('rythme', e.target.value as TactiqueManager['rythme'])}><option value="gestion">Gérer</option><option value="normal">Normal</option><option value="intense">Intense</option></select></label>
                  <label><span>Pénalités</span><select value={manager.tactique.penalites} onChange={(e) => majTactique('penalites', e.target.value as TactiqueManager['penalites'])}><option value="mixte">Selon le terrain</option><option value="points">Prendre les points</option><option value="touche">Chercher la touche</option></select></label>
                  <label><span>Remplacements</span><select value={manager.tactique.remplacements} onChange={(e) => majTactique('remplacements', e.target.value as TactiqueManager['remplacements'])}><option value="precoces">Précoces</option><option value="standard">Standards</option><option value="tardifs">Tardifs</option></select></label>
                </div>
              </section>
            </div>
          )}

          {vue === 'match' && (
            <div className="manager-match-centre">
              {!afficheManager ? (
                <section className="carte manager-match-vide"><span>📆</span><h2>Pas de match cette semaine</h2><p>Le calendrier laisse une fenêtre de récupération. Tu peux préparer la suite puis avancer.</p><button className="btn primaire" onClick={semaineManager}>▶ Semaine suivante</button></section>
              ) : (
                <section className="carte manager-affiche-match">
                  <div className="eyebrow">Journée {afficheManager.journee} · {manager.divisionNom}</div>
                  <div className="manager-duel">
                    <span>{clubParNom(afficheManager.match.domicile) && <Blason club={clubParNom(afficheManager.match.domicile)!} taille={54} />}<b>{afficheManager.match.domicile}</b></span>
                    <strong>{resultatManager ? `${afficheManager.match.scoreD} – ${afficheManager.match.scoreE}` : 'VS'}</strong>
                    <span>{clubParNom(afficheManager.match.exterieur) && <Blason club={clubParNom(afficheManager.match.exterieur)!} taille={54} />}<b>{afficheManager.match.exterieur}</b></span>
                  </div>
                  {resultatManager ? (
                    <div className="manager-match-joue"><b>✓ Résultat enregistré au championnat</b><p>{resultatManager.essaisPour} essai{resultatManager.essaisPour > 1 ? 's' : ''} marqué{resultatManager.essaisPour > 1 ? 's' : ''} · confiance du board mise à jour.</p><button className="btn primaire" onClick={semaineManager}>{manager.semaine >= SEMAINES_PAR_SAISON ? '🏁 Clore la saison' : '▶ Semaine suivante'}</button></div>
                  ) : (
                    <div className="manager-lancer-match"><p>Le XV, le banc, le capitaine, le buteur et le plan de jeu seront figés au coup d’envoi. Les consignes collectives resteront modifiables en direct.</p><div><button className="btn fantome" onClick={() => setVue('equipe')}>👥 Vérifier la composition</button><button className="btn primaire grand" onClick={() => setMatchOuvert(true)}>🎮 Prendre place sur le banc</button></div></div>
                  )}
                </section>
              )}
            </div>
          )}

          {(vue === 'formation' || vue === 'recruteurs' || vue === 'entrainement') && (
            <div className="manager-club">
              <section className="carte manager-inst-tete">
                <div>
                  <div className="eyebrow">{t('mgr.inst.eyebrow')}</div>
                  <h2>{vue === 'formation' ? '🎓 Centre de formation' : vue === 'recruteurs' ? '🔎 Recruteurs' : '🏋️ Centre d’entraînement'}</h2>
                  <p>{vue === 'formation'
                    ? 'Fais grandir les joueurs du cru et suis chaque promotion sortie par le club.'
                    : vue === 'recruteurs'
                      ? 'Développe ton réseau : plus il progresse, plus les rapports sont nombreux et précis.'
                      : 'Choisis les joueurs qui travaillent individuellement sans jamais dépasser leur potentiel.'}</p>
                </div>
                <div className="manager-note-compo manager-enveloppe">
                  <b>{nombre(manager.budgetStructure)} €</b>
                  <span>{t('mgr.inst.budget')}</span>
                </div>
              </section>

              <div className="manager-inst-grille">
                {([vue === 'formation' ? 'formation' : vue === 'recruteurs' ? 'recrutement' : 'entrainement'] as TypeInstallation[]).map((type) => {
                  const niveau = murs[type];
                  const cout = coutAmelioration(niveau, enveloppe);
                  const finance = cout !== null && manager.budgetStructure >= cout;
                  const n = Math.min(niveau, NIVEAU_INSTALLATION_MAX);
                  const effet = type === 'formation'
                    ? t('mgr.inst.effet.formation', { n: String(PROMOTION_PAR_NIVEAU[n]) })
                    : type === 'entrainement'
                      ? t('mgr.inst.effet.entrainement', {
                        places: String(PLACES_ENTRAINEMENT[n]),
                        gain: GAIN_ENTRAINEMENT[n].toString().replace('.', ','),
                      })
                      : t('mgr.inst.effet.recrutement', {
                        clubs: String(CLUBS_OBSERVES[n]),
                        precision: INCERTITUDE_RECRUTEURS[n] === 0
                          ? t('mgr.inst.exact') : `± ${INCERTITUDE_RECRUTEURS[n]}`,
                      });
                  return (
                    <section className="carte manager-inst" key={type}>
                      <div className="inst-tete">
                        <span className="inst-emoji" aria-hidden="true">{EMOJI_INSTALLATION[type]}</span>
                        <div>
                          <b>{t(`mgr.inst.${type}.nom`)}</b>
                          <p>{t(`mgr.inst.${type}.desc`)}</p>
                        </div>
                      </div>
                      <div className="inst-marches">
                        {Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => (
                          <i key={i} className={i < niveau ? 'pleine' : ''} />
                        ))}
                        <span>{t('mgr.inst.niveau', { n: String(niveau) })}</span>
                      </div>
                      <p className="inst-effet">{niveau > 0 ? effet : t('mgr.inst.rien')}</p>
                      {cout === null ? (
                        <p className="inst-max">{t('mgr.inst.max')}</p>
                      ) : (
                        <button
                          className="btn primaire"
                          disabled={!finance}
                          onClick={() => ameliorerInstallation(type)}
                        >
                          {t('mgr.inst.ameliorer', { cout: nombre(cout) })}
                        </button>
                      )}
                    </section>
                  );
                })}
              </div>

              {vue === 'formation' && (
                <section className="carte manager-rapports manager-promotion-centre">
                  <div className="comp-tete"><b>🎓 Promotions du club</b><span className="comp-count">{manager.jeunesFormes.filter((j) => j.club === manager.club).length}</span></div>
                  {manager.jeunesFormes.some((j) => j.club === manager.club) ? (
                    <div className="manager-liste-programme">
                      {[...manager.jeunesFormes].filter((j) => j.club === manager.club).reverse().map((j) => (
                        <div className="prog-ligne" key={j.id}>
                          <span className="prog-nom"><Drapeau nation={j.nation} taille={14} /> {j.nom}</span>
                          <span className="prog-poste">{nomPoste(j.poste)}</span>
                          <span className="prog-age">{j.age}</span>
                          <span className="prog-note">{j.note}</span>
                          <span className="prog-marge positive">↗ {j.potentiel}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="manager-vide-texte">La première promotion arrivera à l’intersaison une fois le centre construit.</p>}
                </section>
              )}

              {vue === 'entrainement' && <section className="carte manager-programme">
                <div className="comp-tete">
                  <b>🏋️ {t('mgr.inst.programme')}</b>
                  <span className="comp-count">{manager.entrainements.length}/{placesEntrainement}</span>
                </div>
                {murs.entrainement <= 0 ? (
                  <p className="manager-vide-texte">{t('mgr.inst.programmeFerme')}</p>
                ) : (
                  <>
                    <p className="manager-vide-texte">{t('mgr.inst.programmeAide')}</p>
                    <div className="manager-liste-programme">
                      {[...effectif]
                        .sort((a, b) => (b.potentiel - b.note) - (a.potentiel - a.note))
                        .slice(0, 24)
                        .map((j) => {
                          const dedans = manager.entrainements.includes(j.nom);
                          const marge = j.potentiel - j.note;
                          const complet = !dedans && manager.entrainements.length >= placesEntrainement;
                          return (
                            <button
                              key={j.id}
                              className={`prog-ligne${dedans ? ' actif' : ''}`}
                              disabled={complet || marge <= 0}
                              aria-pressed={dedans}
                              onClick={() => basculerEntrainement(j.nom)}
                            >
                              <span className="prog-nom">{j.duCentre && '🎓 '}{j.nom}</span>
                              <span className="prog-poste">{nomPoste(j.poste)}</span>
                              <span className="prog-age">{j.age}</span>
                              <span className="prog-note">{j.note}</span>
                              <span className={`prog-marge${marge > 0 ? ' positive' : ''}`}>
                                {marge > 0 ? `↗ ${j.potentiel}` : '—'}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}
              </section>}

              {vue === 'recruteurs' && <section className="carte manager-rapports">
                <div className="comp-tete">
                  <b>🔎 {t('mgr.inst.rapports')}</b>
                  <span className="comp-count">{manager.rapports.length}</span>
                </div>
                {murs.recrutement <= 0 ? (
                  <p className="manager-vide-texte">{t('mgr.inst.rapportsFerme')}</p>
                ) : !manager.rapports.length ? (
                  <p className="manager-vide-texte">{t('mgr.inst.rapportsAttente')}</p>
                ) : (
                  <div className="manager-table-rapports">
                    <div className="rap-ligne entete">
                      <span>{t('mgr.inst.col.joueur')}</span>
                      <span>{t('mgr.inst.col.club')}</span>
                      <span>{t('mgr.inst.col.age')}</span>
                      <span>{t('mgr.inst.col.note')}</span>
                      <span>{t('mgr.inst.col.potentiel')}</span>
                    </div>
                    {manager.rapports.map((r) => (
                      <div className="rap-ligne" key={r.id}>
                        <span className="rap-nom">
                          <Drapeau nation={r.nation} taille={14} /> {r.nom}
                          <em>{nomPoste(r.poste)}</em>
                        </span>
                        <span className="rap-club">{r.club}<em>{r.division}</em></span>
                        <span>{r.age}</span>
                        <span>{r.note}</span>
                        <span className="rap-pot">
                          ↗ {r.potentiel}
                          {r.incertitude > 0 && <em>± {r.incertitude}</em>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>}
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
                  const clubDossier = [...manager.negociationsClubs].reverse()
                    .find((n) => n.cible.id === cible.id && n.saison === manager.saison);
                  const clubCible = clubParNom(cible.club);
                  const libelleContact = existante?.etat === 'signee'
                    ? `✓ ${t('mgr.signe')}`
                    : existante
                      ? `𝕏 ${t('mgr.reprendreDiscussion')}`
                      : cible.indemnite <= 0 || clubDossier?.etat === 'accord'
                        ? `𝕏 Parler à ${cible.nom.split(' ')[0]}`
                        : clubDossier?.etat === 'ouverte'
                          ? `𝕏 Reprendre avec ${cible.club}`
                          : clubDossier?.etat === 'rompue'
                            ? '⛔ Club vendeur fermé'
                            : `𝕏 Négocier avec ${cible.club}`;
                  return (
                    <article key={cible.id} className="carte manager-cible">
                      <div className="manager-cible-note">{cible.note}<small>{t('mgr.note')}</small></div>
                      <div className="manager-cible-corps">
                        <div className="manager-cible-identite"><Drapeau nation={cible.nation} taille={0.95} /><span><b>{cible.nom}</b><small>{nomPoste(cible.poste)} · {cible.age} {t('gen.ans')}</small></span></div>
                        <p>{clubCible && <Blason club={clubCible} taille={18} />} {cible.club}</p>
                        <div className="manager-cible-chiffres"><span>{t('mgr.potentiel')} <b>{cible.potentiel}</b></span><span>{t('mgr.indemnite')} <b>{nombre(cible.indemnite)} €</b></span><span>{t('mgr.salaire')} <b>{nombre(cible.salaireDemande)} €</b></span></div>
                      </div>
                      <button
                        className="btn primaire"
                        disabled={existante?.etat === 'signee' || clubDossier?.etat === 'rompue'}
                        onClick={() => {
                          if (existante) ouvrirDiscussion(existante.pseudo);
                          else if (clubDossier?.etat === 'ouverte') ouvrirDiscussion(clubDossier.pseudo);
                          else contacterClub(cible);
                        }}
                      >
                        {libelleContact}
                      </button>
                    </article>
                  );
                })}
                {!cibles.length && <div className="carte manager-vide">{t('mgr.marche.aucun')}</div>}
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
      {matchOuvert && afficheManager && (
        <Suspense fallback={null}>
          <MatchLive
            match={afficheManager.match}
            saison={manager.saison}
            cle={afficheManager.cle}
            titre={`${manager.divisionNom} · journée ${afficheManager.journee}`}
            manager={{
              club: manager.club,
              composition,
              tactique: manager.tactique,
              onTactique: definirTactique,
            }}
            onTermine={({ scoreA, scoreB, essaisA, essaisB }) => {
              const domicile = afficheManager.match.domicile === manager.club;
              enregistrerResultat({
                cle: afficheManager.cle, club: manager.club,
                saison: manager.saison, semaine: manager.semaine,
                journee: afficheManager.journee, domicile,
                adversaire: domicile ? afficheManager.match.exterieur : afficheManager.match.domicile,
                scorePour: domicile ? scoreA : scoreB,
                scoreContre: domicile ? scoreB : scoreA,
                essaisPour: domicile ? essaisA : essaisB,
                essaisContre: domicile ? essaisB : essaisA,
              });
            }}
            onFermer={() => setMatchOuvert(false)}
          />
        </Suspense>
      )}
    </motion.section>
  );
}
