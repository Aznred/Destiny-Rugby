import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { AcademicienManager, Manager } from '../types';
import { useGame } from '../store/useGame';
import { POSTES, POSTE_PAR_ID, nomPoste } from '../data/rugby';
import { REGIONS } from '../data/geographie';
import { COMPETITIONS } from '../data/clubs';
import { nombre, texteTraduit } from '../lib/i18n';
import { ficheDe } from '../lib/detection';
import type { FicheDetection } from '../lib/detection';
import { ficheAcademicienManager, motifObservationJeune, tableauDetectionManager } from '../lib/formationManager';
import {
  historiqueJeuneMonde, jeuneMondeParId, mondeJeunesDisponible,
} from '../lib/mondeJeunes';
import { Icone } from './Icone';
import { Selecteur } from './Selecteur';
import { Confirmation } from './Confirmation';
import './JeunesCarriere.css';

const PAR_PAGE = 30;
const sansAccents = (texte: string) => texte.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const categorieLisible = (categorie: string) => categorie === 'u18' ? 'U18' : categorie === 'espoirs' ? 'Espoirs' : categorie === 'pret' ? 'En prêt' : 'Senior';
const nomRegion = (id: string) => REGIONS.find((r) => r.id === id)?.nom ?? id;
const nomNiveau = (niveau: number) => COMPETITIONS.find((c) => c.niveau === niveau && c.pays === 'France')?.nom ?? `Niveau ${niveau}`;
const libelleAge = (age: number, estime = false) => `${age} ans${estime ? ' · âge estimé' : ''}`;
const motifMouvement = (motif: string) => ({ recrutement: 'Recrutement', pret: 'Départ en prêt', retour_pret: 'Retour de prêt', liberation: 'Fin du projet au centre', senior: 'Intégration en équipe première', espoirs: 'Passage dans le groupe Espoirs', retraite: 'Fin de carrière' }[motif] ?? motif);
const dansTranche = (note: number, tranche: string) => !tranche || (note >= Number(tranche.split(':')[0]) && note <= Number(tranche.split(':')[1]));
const tranches = [
  { valeur: '', label: 'Tous les niveaux' },
  { valeur: '0:40', label: '40 et moins' },
  { valeur: '41:55', label: '41 à 55' },
  { valeur: '56:70', label: '56 à 70' },
  { valeur: '71:99', label: '71 et plus' },
];

function HistoriqueJeune({ manager, joueurId }: { manager: Manager; joueurId: string }) {
  const histoire = useMemo(() => manager.mondeJeunes ? historiqueJeuneMonde(manager.mondeJeunes, joueurId) : undefined, [manager.mondeJeunes, joueurId]);
  if (!histoire) return null;
  return <div className="jc-historique">
    <h4><Icone nom="journal" taille={15} /> Parcours dans cette carrière</h4>
    <ol>
      {histoire.saisons.map((s) => <li key={s.saison}>
        <span>{s.annee} · S{s.saison}<br />{libelleAge(s.age, s.ageEstime)}</span>
        <div><b>{s.club} · {categorieLisible(s.categorie)}</b>
          <p>{s.matchs} matchs · {nombre(s.minutes)} minutes · forme {s.forme}%{s.blessure ? ` · ${s.blessure.resume} (${s.blessure.semaines} sem.)` : ''}</p>
        </div>
        <small>GEN {s.noteAvant.toFixed(1)} → {s.noteApres.toFixed(1)}</small>
      </li>)}
      {histoire.mouvements.map((m, i) => <li key={`mouvement-${m.saison}-${i}`}>
        <span>Saison {m.saison}</span>
        <div><b>{m.de} → {m.vers}</b><p>{motifMouvement(m.motif)}{m.indemnite > 0 ? ` · ${nombre(m.indemnite)} €` : ''}{m.finContrat ? ` · contrat jusqu’à la saison ${m.finContrat}` : ''}</p></div>
      </li>)}
    </ol>
    {histoire.debutsPro && <p className="jc-evolution">Premiers pas professionnels en {histoire.debutsPro.annee}, à {histoire.debutsPro.age} ans, avec {histoire.debutsPro.club}.</p>}
    {!histoire.saisons.length && !histoire.mouvements.length && <p className="jc-evolution">Son parcours commence avec cette carrière. Le premier bilan sera conservé en fin de saison.</p>}
  </div>;
}

export function JeunesCarriere({ manager, mode }: { manager: Manager; mode: 'recrutement' | 'formation' }) {
  const charger = useGame((s) => s.chargerJeunesCarriereManager);
  const suivre = useGame((s) => s.suivreJeuneManager);
  const observer = useGame((s) => s.observerJeuneManager);
  const proposer = useGame((s) => s.proposerProjetJeuneManager);
  const gerer = useGame((s) => s.gererAcademicienManager);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [tentative, setTentative] = useState(0);
  const [recherche, setRecherche] = useState('');
  const rechercheDifferee = useDeferredValue(recherche);
  const [age, setAge] = useState('');
  const [poste, setPoste] = useState('');
  const [region, setRegion] = useState('');
  const [club, setClub] = useState('');
  const [niveau, setNiveau] = useState('');
  const [gen, setGen] = useState('');
  const [pot, setPot] = useState('');
  const [suivis, setSuivis] = useState(false);
  const [page, setPage] = useState(0);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [historiquesOuverts, setHistoriquesOuverts] = useState<Record<string, boolean>>({});
  const [aLiberer, setALiberer] = useState<AcademicienManager | null>(null);
  const [projetPropose, setProjetPropose] = useState<{ id: string; nom: string } | null>(null);
  const monde = manager.mondeJeunes;
  const disponible = !!monde && mondeJeunesDisponible(monde);

  useEffect(() => {
    let actif = true;
    if (disponible) return;
    setChargement(true);
    setErreur('');
    charger().catch((cause: unknown) => {
      if (actif) setErreur(cause instanceof Error ? cause.message : 'Le vivier n’a pas pu être chargé.');
    }).finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, [charger, disponible, tentative]);

  const tableau = useMemo(() => disponible ? tableauDetectionManager(manager) : null, [manager, disponible]);
  const academie = manager.academie.filter((j) => j.clubCentre === manager.club);
  const options = useMemo(() => {
    const vivier = tableau?.vivier ?? [];
    return {
      ages: [...new Set(vivier.map((j) => j.age))].sort((a, b) => a - b),
      regions: [...new Set(vivier.map((j) => j.region))].sort((a, b) => nomRegion(a).localeCompare(nomRegion(b), 'fr')),
      clubs: [...new Set(vivier.filter((j) => !region || j.region === region).map((j) => j.club))].sort((a, b) => a.localeCompare(b, 'fr')),
      niveaux: [...new Set(vivier.map((j) => j.niveauClub))].sort((a, b) => a - b),
    };
  }, [tableau, region]);
  const resultat = useMemo(() => {
    if (!tableau) return { fiches: [] as FicheDetection[], total: 0, pages: 1, page: 0 };
    const q = sansAccents(rechercheDifferee.trim());
    // Les critères sportifs portent exclusivement sur l'avis du recruteur.
    // Hors de ces filtres, seules les trente fiches de la page sont calculées.
    const cache = new Map<string, FicheDetection>();
    const fiche = (j: typeof tableau.vivier[number]) => {
      let f = cache.get(j.id);
      if (!f) { f = ficheDe(j, tableau.notes, manager.observationsJeunes[j.id], manager.club); cache.set(j.id, f); }
      return f;
    };
    const candidats = tableau.vivier.filter((j) => {
      if (age && j.age !== Number(age)) return false;
      if (poste && j.poste !== poste && !j.polyvalence.includes(poste as typeof j.poste)) return false;
      if (region && j.region !== region) return false;
      if (club && j.club !== club) return false;
      if (niveau && j.niveauClub !== Number(niveau)) return false;
      if (suivis && !manager.jeunesSuivis?.[j.id] && !manager.observationsJeunes[j.id]) return false;
      if (q && !sansAccents(`${j.nom} ${j.club}`).includes(q)) return false;
      if (gen || pot) {
        const f = fiche(j);
        if (!dansTranche(f.noteObservee, gen) || !dansTranche((f.potentielBas + f.potentielHaut) / 2, pot)) return false;
      }
      return true;
    });
    candidats.sort((a, b) => {
      const suiviA = !!manager.jeunesSuivis?.[a.id] || !!manager.observationsJeunes[a.id];
      const suiviB = !!manager.jeunesSuivis?.[b.id] || !!manager.observationsJeunes[b.id];
      return Number(suiviB) - Number(suiviA) || a.distance - b.distance || a.nom.localeCompare(b.nom, 'fr');
    });
    const pages = Math.max(1, Math.ceil(candidats.length / PAR_PAGE));
    const actuelle = Math.min(page, pages - 1);
    return { fiches: candidats.slice(actuelle * PAR_PAGE, (actuelle + 1) * PAR_PAGE).map(fiche), total: candidats.length, pages, page: actuelle };
  }, [tableau, manager.observationsJeunes, manager.jeunesSuivis, manager.club, rechercheDifferee, age, poste, region, club, niveau, gen, pot, suivis, page]);
  const changerFiltre = (changer: (valeur: string) => void) => (valeur: string) => { changer(valeur); setPage(0); setOuvert(null); };
  const reinitialiser = () => { setAge(''); setPoste(''); setRegion(''); setClub(''); setNiveau(''); setGen(''); setPot(''); setRecherche(''); setSuivis(false); setPage(0); };
  const filtresActifs = !!(age || poste || region || club || niveau || gen || pot || recherche || suivis);

  if (!disponible || !tableau) return <section className="jeunes-carriere"><div className="carte jc-chargement" role="status" aria-live="polite">
    <Icone nom={chargement ? 'chrono' : 'formation'} taille={24} />
    <div><b>{chargement ? 'Chargement du vivier de votre carrière…' : 'Le vivier réel est indisponible'}</b>
      <p>{erreur || 'Les jeunes associés aux clubs seront chargés avec leur parcours. Votre carrière conserve ensuite sa propre histoire.'}</p></div>
    {!chargement && <button className="btn primaire" onClick={() => setTentative((n) => n + 1)}>Charger le vivier</button>}
  </div></section>;

  return <section className="jeunes-carriere" aria-label={mode === 'formation' ? 'Jeunes du centre de formation' : 'Jeunes à suivre'}>
    <header className="carte jc-entete">
      <div><div className="eyebrow">{mode === 'formation' ? manager.club : `Réseau ${tableau.portee} · ${nombre(tableau.rayon)} km`}</div>
        <h2><Icone nom={mode === 'formation' ? 'formation' : 'loupe'} taille={22} />{mode === 'formation' ? 'Les jeunes du centre' : 'Jeunes à suivre'}</h2>
        <p>{mode === 'formation' ? 'Accompagnez les joueurs de votre club, choisissez leur groupe et retrouvez leur parcours au fil des saisons.' : 'Suivez un joueur, envoyez un recruteur le voir jouer, puis proposez-lui un projet. Les autres clubs poursuivent aussi leurs recherches.'}</p>
      </div>
      <div className="jc-missions"><b>{mode === 'formation' ? `${academie.length}/${tableau.capacite}` : `${tableau.deplacementsRestants}/${tableau.deplacementsTotal}`}</b>
        <span>{mode === 'formation' ? 'places au centre' : 'missions restantes'}</span><small>Saison {manager.saison}</small></div>
    </header>

    {mode === 'formation' ? <>
      <p className="jc-academie-finances">Indemnités de formation perçues <b>{nombre(Object.entries(manager.revenusFormation).filter(([cle]) => cle.startsWith(`${manager.club}|`)).reduce((s, [, v]) => s + v, 0))} €</b><small>sur l’ensemble de cette carrière</small></p>
      {!academie.length ? <div className="carte jc-vide"><Icone nom="pousse" taille={25} /><div><b>Aucun jeune identifié dans ce centre</b><p>La base disponible ne comporte pas encore de jeune utilisable pour ce club. La cellule de recrutement permet de chercher un projet à proximité.</p></div></div> : <div className="jc-academie">
        {academie.map((j) => {
          const estimation = ficheAcademicienManager(manager, j, tableau.notes);
          const joueurMonde = monde ? jeuneMondeParId(monde, j.id) : undefined;
          const observation = motifObservationJeune(manager, j.id, false, tableau);
          const entretien = motifObservationJeune(manager, j.id, true, tableau);
          return <article className="carte jc-academicien" key={j.id}>
            <header><div className="jc-identite"><span className="jc-poste-numero" aria-hidden="true">{POSTE_PAR_ID[j.poste]?.numero ?? '–'}</span><div>
              <h3>{j.nom}</h3><p>{libelleAge(j.age, joueurMonde?.ageEstime)} · {nomPoste(j.poste)}</p>
              {!!j.polyvalence.length && <small>Secondaires : {j.polyvalence.map(nomPoste).join(', ')}</small>}
              {joueurMonde?.fictif && <small>Nouvelle génération simulée</small>}
              <small>Formé à {j.clubOrigine}</small></div></div><span className="jc-categorie">{categorieLisible(j.categorie)}</span></header>
            <div className="jc-kpis"><div><small>GEN actuel</small><b>{j.note.toFixed(1)}</b></div><div className="potentiel"><small>POT estimé</small><b>{estimation.potentielBas}–{estimation.potentielHaut}</b></div><div><small>Forme</small><b>{joueurMonde ? `${joueurMonde.forme}%` : '–'}</b></div><div><small>Matchs (bilan)</small><b>{joueurMonde?.matchs ?? '–'}</b></div></div>
            <p className="jc-evolution">{j.derniereProgression ? <><b>{j.derniereProgression.noteApres - j.derniereProgression.noteAvant >= 0 ? '+' : ''}{(j.derniereProgression.noteApres - j.derniereProgression.noteAvant).toFixed(1)} GEN</b> · {texteTraduit(j.derniereProgression.resume)}</> : <>Moral {j.moral}% · temps de jeu {j.tempsDeJeu}% · {j.anneesFormees} saison{j.anneesFormees > 1 ? 's' : ''} de formation</>}{j.clubPret && <> · en prêt à {j.clubPret}</>}</p>
            <div className="jc-actions">
              <button className="btn fantome" disabled={j.age > 18 || j.categorie === 'u18'} onClick={() => gerer(j.id, 'u18')}>Jeunes U18</button>
              <button className="btn fantome" disabled={j.categorie === 'espoirs'} onClick={() => gerer(j.id, 'espoirs')}>Espoirs</button>
              <button className={`btn ${j.entrainementSenior ? 'primaire' : 'fantome'}`} aria-pressed={!!j.entrainementSenior} disabled={j.age < 17 || j.categorie === 'pret'} onClick={() => gerer(j.id, 'entrainement_senior')}>{j.entrainementSenior ? 'Entraînement senior actif' : 'Entraînement senior'}</button>
              <button className="btn fantome" disabled={j.age < 18 || j.categorie === 'pret'} onClick={() => gerer(j.id, 'pret')}>Prêt</button>
              <button className="btn primaire" disabled={j.age < 17} onClick={() => gerer(j.id, 'senior')}>Première équipe</button>
              <button className="btn fantome danger" onClick={() => setALiberer(j)}>Libérer</button>
            </div>
            <details onToggle={(e) => { const valeur = e.currentTarget.open; setHistoriquesOuverts((anciens) => ({ ...anciens, [j.id]: valeur })); }}><summary>Parcours et suivi <Icone nom="chevron" taille={15} /></summary>{historiquesOuverts[j.id] && <HistoriqueJeune manager={manager} joueurId={j.id} />}
              <div className="jc-actions"><button className="btn fantome" disabled={!!observation} title={observation ?? undefined} onClick={() => observer(j.id)}>Observer ({estimation.matchs}/10)</button><button className="btn fantome" disabled={!!entretien} title={entretien ?? undefined} onClick={() => observer(j.id, true)}>{estimation.entretien ? 'Entretien effectué' : 'Entretien'}</button></div>
            </details>
          </article>;
        })}
      </div>}
    </> : <>
      <div className="carte jc-filtres">
        <div className="jc-recherche"><label><Icone nom="loupe" taille={17} /><input aria-label="Rechercher un jeune ou un club" placeholder="Un joueur, un club…" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(0); }} /></label>
          <button className={`jc-filtre-suivi${suivis ? ' actif' : ''}`} aria-pressed={suivis} onClick={() => { setSuivis(!suivis); setPage(0); }}><Icone nom="oeil" taille={16} />Mes joueurs suivis</button></div>
        <div className="jc-champs">
          <label><span>Âge</span><Selecteur valeur={age} onChange={changerFiltre(setAge)} options={[{ valeur: '', label: 'Tous les âges' }, ...options.ages.map((a) => ({ valeur: String(a), label: `${a} ans` }))]} /></label>
          <label><span>Poste, principal ou secondaire</span><Selecteur valeur={poste} onChange={changerFiltre(setPoste)} options={[{ valeur: '', label: 'Tous les postes' }, ...POSTES.map((p) => ({ valeur: p.id, label: nomPoste(p.id) }))]} /></label>
          <label><span>Région</span><Selecteur valeur={region} onChange={(v) => { setRegion(v); setClub(''); setPage(0); }} options={[{ valeur: '', label: 'Toutes les régions' }, ...options.regions.map((r) => ({ valeur: r, label: nomRegion(r) }))]} /></label>
          <label><span>Club actuel</span><Selecteur valeur={club} onChange={changerFiltre(setClub)} options={[{ valeur: '', label: 'Tous les clubs' }, ...options.clubs.map((c) => ({ valeur: c, label: c }))]} recherche /></label>
          <label><span>Niveau du club</span><Selecteur valeur={niveau} onChange={changerFiltre(setNiveau)} options={[{ valeur: '', label: 'Tous les niveaux' }, ...options.niveaux.map((n) => ({ valeur: String(n), label: nomNiveau(n) }))]} /></label>
          <label><span>GEN estimé</span><Selecteur valeur={gen} onChange={changerFiltre(setGen)} options={tranches} /></label>
          <label><span>POT estimé, milieu de fourchette</span><Selecteur valeur={pot} onChange={changerFiltre(setPot)} options={tranches} /></label>
        </div>
        <div className="jc-filtres-bas"><p>Les estimations se précisent avec les observations. Dossiers suivis puis proximité.</p>{filtresActifs && <button className="jc-reinitialiser" onClick={reinitialiser}>Effacer les filtres</button>}</div>
      </div>
      <div className="jc-liste" aria-busy={recherche !== rechercheDifferee}>
        <div className="jc-legende" aria-hidden="true"><span>Joueur</span><span>Club actuel</span><span>GEN estimé</span><span>POT estimé</span><span>Connaissance</span><span>Suivi du dossier</span></div>
        {!resultat.total && <div className="jc-vide"><Icone nom="loupe" taille={25} /><div><b>Aucun jeune ne correspond</b><p>{tableau.vivier.length ? 'Élargissez vos filtres pour retrouver les dossiers à portée du réseau.' : 'Aucun jeune identifié dans la base disponible n’est actuellement à portée de votre club.'}</p></div></div>}
        {resultat.fiches.map((f) => {
          const j = f.jeune;
          const joueurMonde = monde ? jeuneMondeParId(monde, j.id) : undefined;
          const suivi = !!manager.jeunesSuivis?.[j.id];
          const observation = motifObservationJeune(manager, j.id, false, tableau);
          const entretien = motifObservationJeune(manager, j.id, true, tableau);
          const reponse = manager.reponsesJeunes[j.id];
          const dejaSigne = manager.academie.some((a) => a.id === j.id);
          const detailOuvert = ouvert === j.id;
          return <article className={`jc-dossier${detailOuvert ? ' ouvert' : ''}`} key={j.id}>
            <div className="jc-ligne">
              <div className="jc-identite"><span className="jc-poste-numero" aria-hidden="true">{POSTE_PAR_ID[j.poste]?.numero ?? '–'}</span><div><h3>{j.nom}</h3><p>{libelleAge(j.age, joueurMonde?.ageEstime)} · {nomPoste(j.poste)}</p>{!!j.polyvalence.length && <small>{j.polyvalence.map(nomPoste).join(' · ')}</small>}{joueurMonde?.fictif && <small>Nouvelle génération simulée</small>}</div></div>
              <div className="jc-club"><b>{j.club}</b><p>{nomNiveau(j.niveauClub)}</p><small>{nomRegion(j.region)} · {nombre(Math.round(j.distance))} km</small></div>
              <div className="jc-valeur"><small>GEN estimé</small><b>{f.noteObservee}</b><span>niveau actuel</span></div>
              <div className="jc-valeur potentiel"><small>POT estimé</small><b>{f.potentielBas}–{f.potentielHaut}</b><span>avis du recruteur</span></div>
              <div className="jc-confiance"><b>{f.confiance}% connus</b><i aria-hidden="true"><em style={{ width: `${f.confiance}%` }} /></i><span>{f.matchs} observation{f.matchs > 1 ? 's' : ''}</span></div>
              <div className="jc-commandes"><button className={suivi ? 'actif' : ''} aria-pressed={suivi} onClick={() => suivre(j.id, !suivi)}><Icone nom="oeil" taille={14} />{suivi ? 'Suivi' : 'Suivre'}</button><button disabled={!!observation || dejaSigne} title={observation ?? undefined} onClick={() => observer(j.id)}>Superviser</button><button className="jc-ouvrir" aria-expanded={detailOuvert} aria-controls={`jc-detail-${j.id}`} onClick={() => setOuvert(detailOuvert ? null : j.id)}>Le dossier <Icone nom="chevron" taille={13} /></button></div>
            </div>
            {detailOuvert && <div className="jc-detail" id={`jc-detail-${j.id}`}>
              <p>{joueurMonde ? `${categorieLisible(joueurMonde.categorie)} · ${joueurMonde.matchs} matchs au dernier bilan · forme ${joueurMonde.forme}%` : ''}{f.entretien ? ' · entretien effectué' : ' · entretien à prévoir'}. L’estimation du potentiel ne garantit pas sa progression.</p>
              <HistoriqueJeune manager={manager} joueurId={j.id} />
              {reponse && <p className="jc-reponse">{texteTraduit(reponse.texte)}</p>}
              <div className="jc-actions"><button className="btn fantome" disabled={!!entretien || dejaSigne} title={entretien ?? undefined} onClick={() => observer(j.id, true)}><Icone nom="poignee" taille={15} />{f.entretien ? 'Entretien effectué' : 'Proposer un entretien'}</button><button className="btn primaire" disabled={dejaSigne || tableau.occupes >= tableau.capacite} onClick={() => { setProjetPropose({ id: j.id, nom: j.nom }); proposer(j.id); }}><Icone nom="signature" taille={15} />{dejaSigne ? 'A rejoint le centre' : 'Proposer le centre de formation'}</button></div>
              {observation && <small className="jc-motif">{texteTraduit(observation)}</small>}
              {tableau.occupes >= tableau.capacite && <small className="jc-motif">Le centre a atteint sa capacité. Faites évoluer son effectif ou ses installations.</small>}
            </div>}
          </article>;
        })}
        <nav className="jc-pagination" aria-label="Pages des jeunes à suivre"><span role="status">{nombre(resultat.total)} dossier{resultat.total > 1 ? 's' : ''}{resultat.total ? ` · ${resultat.page * PAR_PAGE + 1}–${Math.min((resultat.page + 1) * PAR_PAGE, resultat.total)} affichés` : ''}</span><div><button aria-label="Page précédente" disabled={resultat.page === 0} onClick={() => { setPage(resultat.page - 1); setOuvert(null); }}><Icone nom="fleche-droite" taille={15} /></button><small>{resultat.page + 1} / {resultat.pages}</small><button aria-label="Page suivante" disabled={resultat.page + 1 >= resultat.pages} onClick={() => { setPage(resultat.page + 1); setOuvert(null); }}><Icone nom="fleche-droite" taille={15} /></button></div></nav>
      </div>
      {projetPropose && manager.reponsesJeunes[projetPropose.id] && <p className="jc-reponse" role="status"><b>{projetPropose.nom}</b> · {texteTraduit(manager.reponsesJeunes[projetPropose.id].texte)}</p>}
    </>}
    {aLiberer && <Confirmation titre="Libérer ce jeune ?" message={`${aLiberer.nom} quittera le centre. Son parcours continuera dans le monde de votre carrière.`} libelleOui="Libérer" onNon={() => setALiberer(null)} onOui={() => { gerer(aLiberer.id, 'liberer'); setALiberer(null); }} />}
  </section>;
}
