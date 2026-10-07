// LE LABO — STATISTIQUES D'UTILISATION (Correctif 25, points 13 à 23)
//
// Ce que les joueurs font vraiment du jeu : quels modes, combien de temps, qui revient. L'écran ne montre que des SOMMES
// (`lib/usage/agregats.ts`) — aucun appareil, aucun compte. Une période en haut, un onglet par question.
//
// Forme : des tuiles pour les chiffres seuls, des barres d'UNE seule teinte triées pour comparer des grandeurs (les modes,
// les postes, les joueurs incarnés), un tableau pour la rétention. Chaque barre porte sa valeur en clair : la couleur
// n'apprend rien que le texte ne dise déjà.
import { useEffect, useState } from 'react';
import type { LigneClassee, PeriodeUsage, StatistiquesUsage } from '../lib/usage/agregats';
import { POSTE_PAR_ID } from '../data/rugby';
import type { PosteId } from '../types';
import { annoterSeance, oublierLesSeances, profileurActif, reglerProfileur, seancesProfilees, type SeanceProfilee } from '../lib/profileur';
import './LaboStatistiques.css';
import type { BilanCarriereUsage } from '../lib/usage/carrieres';

const PERIODES: [PeriodeUsage, string][] = [['jour', 'Aujourd’hui'], ['7', '7 jours'], ['30', '30 jours'], ['tout', 'Depuis le début']];
const ONGLETS = [['global', 'Global'], ['collection', 'Collection solo'], ['joueur', 'Carrière joueur'], ['entraineur', 'Carrière entraîneur'],
  ['existant', 'Hors classement'], ['retention', 'Rétention'], ['fluidite', 'Fluidité 3D'], ['profileur', 'Profileur']] as const;
type Onglet = typeof ONGLETS[number][0];

const nombre = (n: number, decimales = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: decimales, minimumFractionDigits: 0 });
const pourcent = (p: number | null) => (p === null ? '—' : `${nombre(p * 100, 1)} %`);
/** Une durée lisible : « 2 h 05 », « 14 min », « 40 s ». */
function duree(secondes: number): string {
  const s = Math.round(secondes);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  const minutes = Math.round(s / 60);
  return `${nombre(Math.floor(minutes / 60))} h ${String(minutes % 60).padStart(2, '0')}`;
}

function Tuile({ libelle, valeur, note }: { libelle: string; valeur: string; note?: string }) {
  return <div className="ls-tuile"><span>{libelle}</span><strong>{valeur}</strong>{note && <small>{note}</small>}</div>;
}

/** Des grandeurs à comparer : une ligne par élément, triée, une barre d'une seule teinte, la valeur écrite au bout. */
function Barres({ titre, lignes, valeur, vide }: { titre: string; lignes: { nom: string; n: number; detail?: string }[]; valeur: (n: number) => string; vide: string }) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  return <section className="ls-bloc">
    <h4>{titre}</h4>
    {lignes.length === 0 ? <p className="ls-vide">{vide}</p> : <ol className="ls-barres">
      {lignes.map((l) => <li key={l.nom} title={`${l.nom} : ${valeur(l.n)}${l.detail ? ` · ${l.detail}` : ''}`}>
        <span className="ls-nom">{l.nom}</span>
        <span className="ls-piste"><i style={{ width: `${Math.max(1.5, (l.n / max) * 100)}%` }} /></span>
        <span className="ls-valeur">{valeur(l.n)}{l.detail && <small>{l.detail}</small>}</span>
      </li>)}
    </ol>}
  </section>;
}

const classees = (l: LigneClassee[]) => l.map((x) => ({ nom: POSTE_PAR_ID[x.nom as PosteId]?.nom ?? x.nom.replace(/_/g, ' '), n: x.n }));

function BilanCarrieres({ lignes }: { lignes: BilanCarriereUsage[] }) {
  const n = lignes.reduce((s, c) => s + c.nombre, 0);
  const moyenne = (cle: 'dureeJours' | 'secondes' | 'matchs') => n ? lignes.reduce((s, c) => s + c[cle] * c.nombre, 0) / n : 0;
  const abandons = lignes.reduce((s, c) => s + c.abandonnees, 0);
  return <>
    <div className="ls-tuiles">
      <Tuile libelle="Carrières encore actives" valeur={nombre(lignes.reduce((s, c) => s + c.actives, 0))} note="jouées dans les 30 derniers jours" />
      <Tuile libelle="Durée de vie moyenne observée" valeur={`${nombre(moyenne('dureeJours'), 1)} jours`} />
      <Tuile libelle="Temps mesuré par carrière" valeur={duree(moyenne('secondes'))} />
      <Tuile libelle="Matchs avant abandon" valeur={abandons ? nombre(lignes.reduce((s, c) => s + (c.matchsAvantAbandon ?? 0) * c.abandonnees, 0) / abandons, 1) : '—'} />
    </div>
    <p className="ls-note">Une carrière est considérée abandonnée lorsqu’elle est remplacée ou sans activité depuis 30 jours. La durée et le temps sont observés depuis le début de la collecte ; les anciennes sauvegardes sont adoptées sans compter une nouvelle création.</p>
  </>;
}

/**
 * LA FLUIDITÉ DES MATCHS EN 3D, SUR LES APPAREILS DES JOUEURS (point 49 : « pouvoir filtrer mobile, desktop, iOS, Android »).
 * Chaque match en 3D de plus de vingt secondes laisse UN compteur anonyme (`lib/profilAppareil.ts`) : la plateforme et la
 * tranche d'images par seconde tenue sur tout le match. C'est ce qui dit comment le jeu tourne là où on ne peut pas
 * l'essayer soi-même. Un tableau, pas un graphique : quatre lignes au plus, et ce sont les chiffres qu'on vient lire.
 */
const PLATEFORMES_FLUIDITE = [['ordinateur', 'Ordinateur'], ['android', 'Android'], ['ios', 'iPhone et iPad'], ['autre', 'Autre tactile']] as const;
const FILTRES_FLUIDITE = [['tous', 'Tous'], ['ordinateur', 'Ordinateur'], ['mobile', 'Mobile'], ['ios', 'iOS'], ['android', 'Android']] as const;
function PanneauFluidite({ compteurs }: { compteurs: LigneClassee[] }) {
  const [filtre, setFiltre] = useState<typeof FILTRES_FLUIDITE[number][0]>('tous');
  const lu = (cle: string) => compteurs.find((c) => c.nom === cle)?.n ?? 0;
  const lignes = PLATEFORMES_FLUIDITE.map(([id, libelle]) => {
    const fluide = lu(`${id}.fluide`), correcte = lu(`${id}.correcte`), trente = lu(`${id}.trente`), saccadee = lu(`${id}.saccadee`);
    return { id, libelle, fluide, correcte, trente, saccadee, matchs: fluide + correcte + trente + saccadee, cadence30: lu(`${id}.cadence30`), definition: lu(`${id}.definition`) };
  }).filter((l) => filtre === 'tous' || (filtre === 'mobile' ? l.id !== 'ordinateur' : l.id === filtre));
  const somme = (cle: 'matchs' | 'fluide' | 'saccadee' | 'cadence30' | 'definition') => lignes.reduce((s, l) => s + l[cle], 0);
  const matchs = somme('matchs');
  const part = (n: number, sur: number) => (sur > 0 ? pourcent(n / sur) : '—');
  return <>
    <div className="ls-periodes ls-filtres" role="group" aria-label="Plateforme">
      {FILTRES_FLUIDITE.map(([id, libelle]) => <button key={id} type="button" aria-pressed={filtre === id} className={filtre === id ? 'actif' : ''} onClick={() => setFiltre(id)}>{libelle}</button>)}
    </div>
    <div className="ls-tuiles">
      <Tuile libelle="Matchs en 3D mesurés" valeur={nombre(matchs)} note="plus de vingt secondes de jeu" />
      <Tuile libelle="Fluides" valeur={part(somme('fluide'), matchs)} note="55 images par seconde et plus" />
      <Tuile libelle="Saccadés" valeur={part(somme('saccadee'), matchs)} note="moins de 25 images par seconde" />
      <Tuile libelle="Finis à cadence réduite" valeur={part(somme('cadence30'), matchs)} note="30 images par seconde régulières" />
      <Tuile libelle="Définition abaissée" valeur={part(somme('definition'), matchs)} note="image moins fine pour tenir la cadence" />
    </div>
    <section className="ls-bloc">
      <h4>Par plateforme</h4>
      {matchs === 0 ? <p className="ls-vide">Aucun match en 3D mesuré sur cette période pour cette sélection.</p> : <div className="ls-defile"><table className="ls-tableau">
        <thead><tr><th scope="col">Plateforme</th><th scope="col">Matchs</th><th scope="col">55 img/s et plus</th><th scope="col">De 40 à 54</th><th scope="col">De 25 à 39</th><th scope="col">Moins de 25</th><th scope="col">Cadence réduite</th><th scope="col">Définition abaissée</th></tr></thead>
        <tbody>{lignes.filter((l) => l.matchs > 0).map((l) => <tr key={l.id}><th scope="row">{l.libelle}</th><td>{nombre(l.matchs)}</td>
          <td>{part(l.fluide, l.matchs)}</td><td>{part(l.correcte, l.matchs)}</td><td>{part(l.trente, l.matchs)}</td><td>{part(l.saccadee, l.matchs)}</td>
          <td>{part(l.cadence30, l.matchs)}</td><td>{part(l.definition, l.matchs)}</td></tr>)}</tbody>
      </table></div>}
      <p className="ls-note">Images par seconde tenues sur tout le match, pas un instantané. « De 25 à 39 » contient les appareils que la scène a stabilisés à trente images par seconde : c’est voulu — trente régulières valent mieux que soixante en dents de scie. « Autre tactile » : un écran tactile qui n’est ni un iPhone ni un Android.</p>
    </section>
  </>;
}

/**
 * LE PROFILEUR (points 49 et 50). Un réglage de CET appareil : allumé, un cartouche de mesures s'affiche sur tout match en
 * 3D, et chaque match mesuré laisse un résumé ici — on en aligne deux pour juger une optimisation, chiffres à l'appui.
 */
function PanneauProfileur() {
  const [actif, setActif] = useState(profileurActif);
  const [seances, setSeances] = useState<SeanceProfilee[]>(seancesProfilees);
  const [filtre, setFiltre] = useState('tous');
  const visibles = seances.filter(s => filtre === 'tous' || (filtre === 'mobile' ? s.plateforme === 'ios' || s.plateforme === 'android' || s.plateforme === 'autre' : s.plateforme === filtre));
  const heure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return <div className="ls-corps">
    <section className="ls-bloc">
      <h4>Mesurer un match en 3D sur cet appareil</h4>
      <p className="ls-note">Allumé, un cartouche s’affiche en bas à gauche de chaque match en 3D (carrière et direct de ligue) : images par seconde, temps entre deux images, coût du dessin, appels de dessin, triangles, mémoire, requêtes du match. Il ne mesure que cet appareil et ne s’envoie nulle part.</p>
      <button type="button" className="ls-bascule" aria-pressed={actif} onClick={() => { reglerProfileur(!actif); setActif(!actif); }}><i />{actif ? 'Profileur allumé' : 'Profileur éteint'}</button>
    </section>
    <section className="ls-bloc">
      <h4>Séances mesurées</h4>
      <label>Appareil <select aria-label="Filtrer les mesures par appareil" value={filtre} onChange={e => setFiltre(e.target.value)}>
        <option value="tous">Tous</option><option value="mobile">Mobile</option><option value="ordinateur">Ordinateur</option><option value="ios">iOS</option><option value="android">Android</option>
      </select></label>
      {seances.length === 0 ? <p className="ls-vide">Aucune séance pour l’instant : allume le profileur, joue un match en 3D au moins dix secondes, puis reviens ici.</p> : <>
        <div className="ls-defile"><table className="ls-tableau ls-seances">
          <thead><tr><th scope="col">Séance</th><th scope="col">Img/s</th><th scope="col">Entre deux images</th><th scope="col">95 % sous</th><th scope="col">Pire</th><th scope="col">CPU</th><th scope="col">GPU</th><th scope="col">Dessin</th><th scope="col">Appels</th><th scope="col">Triangles</th><th scope="col">Textures</th><th scope="col">Toile</th><th scope="col">Mémoire</th><th scope="col">Réseau</th><th scope="col">Latence API</th><th scope="col">Erreurs</th></tr></thead>
          <tbody>{visibles.map((x) => <tr key={x.le}>
            <th scope="row">{heure(x.le)} · {duree(x.duree)} · {x.plateforme ?? 'appareil inconnu'}{x.leger ? ' · léger' : ''}
              <input aria-label="Note de la séance" placeholder="note (avant, après…)" defaultValue={x.note ?? ''} maxLength={60} onBlur={(e) => { annoterSeance(x.le, e.target.value); }} /></th>
            <td>{nombre(x.ipsMatch ?? x.ips)}</td><td>{nombre(x.ecartMoyen, 1)} ms</td><td>{nombre(x.ecartP95, 1)} ms</td><td>{nombre(x.ecartMax, 1)} ms</td><td>{x.cpu === undefined ? '—' : `${nombre(x.cpu, 1)} ms`}</td><td>{x.gpu === undefined ? '—' : `${nombre(x.gpu, 1)} ms`}</td><td>{nombre(x.renduMoyen, 1)} ms</td>
            <td>{nombre(x.appels)}</td><td>{nombre(x.triangles)}</td><td>{nombre(x.textures)}</td><td>{x.largeur} × {x.hauteur} · {x.definition}</td>
            <td>{x.memoire === undefined ? '—' : `${nombre(x.memoire)} Mo`}</td><td>{nombre(x.requetes)} req. · {nombre(x.reseau)} Ko</td>
            <td>{x.latence === undefined ? '—' : `${nombre(x.latence, 1)} ms`}</td><td>{x.erreurs === undefined ? '—' : nombre(x.erreurs)}</td>
          </tr>)}</tbody>
        </table></div>
        <button type="button" className="ls-effacer" onClick={() => { oublierLesSeances(); setSeances([]); }}>Effacer les séances</button>
      </>}
      {seances.length > 0 && visibles.length === 0 && <p className="ls-vide">Aucune séance pour ce type d’appareil.</p>}
      <p className="ls-note">« Entre deux images » est ce que le joueur ressent (16,7 ms = 60 images par seconde) ; « Dessin » est la part du rendu lui-même. Un « pire » très au-dessus de la moyenne trahit des à-coups, même quand la cadence moyenne est bonne.</p>
      <p className="ls-note">Le GPU est mesuré sans bloquer le dessin lorsqu’une extension de chronométrage est disponible ; « — » signifie non disponible. Les filtres concernent les séances enregistrées sur cet appareil.</p>
    </section>
  </div>;
}

export function LaboStatistiques() {
  const [periode, setPeriode] = useState<PeriodeUsage>('7');
  const [onglet, setOnglet] = useState<Onglet>('global');
  const [stats, setStats] = useState<StatistiquesUsage | null>(null);
  const [etat, setEtat] = useState<'charge' | 'pret' | 'indisponible' | 'erreur'>('charge');

  useEffect(() => {
    const controle = new AbortController();
    setEtat('charge');
    fetch(`/api/carriere?statistiques=usage&periode=${periode}`, { credentials: 'same-origin', cache: 'no-store', signal: controle.signal })
      .then(async (r) => {
        const d = await r.json() as StatistiquesUsage | { indisponible: true } | { erreur: string };
        if (!r.ok || 'erreur' in d) { setEtat('erreur'); return; }
        if ('indisponible' in d) { setEtat('indisponible'); return; }
        setStats(d); setEtat('pret');
      })
      .catch(() => { if (!controle.signal.aborted) setEtat('erreur'); });
    return () => controle.abort();
  }, [periode]);

  const s = stats;
  return <section className="ls">
    <header className="ls-entete">
      <div>
        <h3>Statistiques d’utilisation</h3>
        <p>Relevés anonymes des appareils : du temps par mode et des compteurs, jamais un compte ni un pseudo.</p>
      </div>
      <div className="ls-periodes" role="group" aria-label="Période">
        {PERIODES.map(([id, libelle]) => <button key={id} type="button" aria-pressed={periode === id} className={periode === id ? 'actif' : ''} onClick={() => setPeriode(id)}>{libelle}</button>)}
      </div>
    </header>
    <nav className="ls-onglets" aria-label="Statistiques">
      {ONGLETS.map(([id, libelle]) => <button key={id} type="button" className={onglet === id ? 'actif' : ''} onClick={() => setOnglet(id)}>{libelle}</button>)}
    </nav>

    {onglet === 'profileur' && <PanneauProfileur />}
    {onglet !== 'profileur' && etat === 'indisponible' && <p className="ls-message" role="status">Les tables des statistiques ne sont pas encore posées sur cette base : <code>npm run base:appliquer</code>. Les nouvelles mesures seront enregistrées après cette installation.</p>}
    {onglet !== 'profileur' && etat === 'erreur' && <p className="ls-message" role="alert">Les statistiques n’ont pas pu être lues. Réessaie dans un instant.</p>}
    {onglet !== 'profileur' && etat === 'charge' && !s && <p className="ls-message" role="status">Lecture des relevés…</p>}

    {s && onglet !== 'profileur' && etat !== 'indisponible' && <div className={`ls-corps${etat === 'charge' ? ' ls-attente' : ''}`}>
      {onglet === 'global' && <>
        <div className="ls-tuiles">
          <Tuile libelle="Actifs aujourd’hui" valeur={nombre(s.global.actifsJour)} />
          <Tuile libelle="Actifs sur 7 jours" valeur={nombre(s.global.actifs7)} />
          <Tuile libelle="Actifs sur 30 jours" valeur={nombre(s.global.actifs30)} />
          <Tuile libelle="Sessions" valeur={nombre(s.global.sessions)} note="sur la période" />
          <Tuile libelle="Durée moyenne d’une session" valeur={duree(s.global.dureeSession)} />
          <Tuile libelle="Temps moyen par appareil" valeur={duree(s.global.tempsParUtilisateur)} note="sur la période" />
          <Tuile libelle="Matchs joués" valeur={nombre(s.global.matchs)} />
          <Tuile libelle="Temps de jeu total" valeur={duree(s.global.tempsTotal)} />
        </div>
        <Barres titre="Répartition du temps par mode" vide="Aucun temps de jeu relevé sur cette période."
          lignes={s.global.modes.filter((m) => m.secondes > 0).map((m) => ({ nom: m.libelle, n: m.part, detail: `${duree(m.secondes)} · ${nombre(m.utilisateurs)} appareil${m.utilisateurs > 1 ? 's' : ''}` }))}
          valeur={(p) => pourcent(p)} />
      </>}

      {onglet === 'collection' && <>
        <div className="ls-tuiles">
          <Tuile libelle="Collections commencées" valeur={nombre(s.collection.commencees)} note="sur la période" />
          <Tuile libelle="Appareils actifs dans le mode" valeur={nombre(s.collection.actifs)} />
          <Tuile libelle="Packs ouverts" valeur={nombre(s.collection.packs)} />
          <Tuile libelle="Packs par joueur actif" valeur={nombre(s.collection.packsParJoueur, 1)} />
          <Tuile libelle="Taille moyenne d’une collection" valeur={nombre(s.collection.tailleMoyenne)} note="joueurs différents, aujourd’hui" />
          <Tuile libelle="Cartes obtenues en moyenne" valeur={nombre(s.collection.exemplairesMoyens)} note="doublons compris" />
          <Tuile libelle="Temps moyen dans le mode" valeur={duree(s.collection.tempsParJoueur)} note="par joueur actif" />
          <Tuile libelle="Jours actifs par joueur" valeur={nombre(s.collection.joursActifsParJoueur, 1)} note="fréquence de retour" />
        </div>
        <div className="ls-tuiles">
          <Tuile libelle="GEN moyen du meilleur XV" valeur={s.details?.genEquipe == null ? '—' : nombre(s.details.genEquipe, 1)} note="collections ayant un XV complet" />
          <Tuile libelle="Durée moyenne d’une session" valeur={duree(s.details?.sessions.collection?.moyenne ?? 0)} />
          <Tuile libelle="Sessions par joueur" valeur={nombre(s.details?.sessions.collection?.parJoueur ?? 0, 1)} />
        </div>
        <div className="ls-deux">
          <Barres titre="Cartes les plus obtenues" lignes={s.details?.obtenues ?? []} valeur={n => `${nombre(n)} cartes`} vide="Aucune acquisition relevée sur cette période." />
          <Barres titre="Joueurs les plus présents dans les meilleurs XV" lignes={s.details?.joueursXV ?? []} valeur={n => `${nombre(n)} XV`} vide="Aucun XV complet relevé." />
        </div>
        <Barres titre="Cartes les plus rares réellement possédées" lignes={(s.details?.rares ?? []).map(c => ({ nom: `${c.nom} · ${c.rarete === 'star' ? 'Star' : 'Élite'} ${c.note}`, n: c.n }))}
          valeur={n => `${nombre(n)} exemplaire${n > 1 ? 's' : ''}`} vide="Aucune carte Élite ou Star relevée dans les collections." />
        <p className="ls-note">La Collection solo ne comporte pas de matchs : son XV est calculé à partir des cartes possédées, en respectant les familles de postes. Les XV et cartes rares correspondent au dernier inventaire relevé, avec au plus 60 cartes rares par collection ; les acquisitions sont filtrées sur la période.</p>
      </>}

      {onglet === 'joueur' && <>
        <div className="ls-tuiles">
          <Tuile libelle="Carrières créées" valeur={nombre(s.joueur.creees + s.joueur.existantes)} note={`${nombre(s.joueur.creees)} joueurs créés · ${nombre(s.joueur.existantes)} existants`} />
          <Tuile libelle="Appareils actifs dans le mode" valeur={nombre(s.joueur.actifs)} />
          <Tuile libelle="Matchs joués" valeur={nombre(s.joueur.matchs)} />
          <Tuile libelle="Saisons terminées" valeur={nombre(s.joueur.saisons)} />
          <Tuile libelle="Temps moyen par carrière" valeur={duree(s.joueur.tempsParCarriere)} />
          <Tuile libelle="Matchs par carrière" valeur={nombre(s.joueur.matchsParCarriere, 1)} />
        </div>
        <section className="ls-bloc">
          <h4>Joueur créé ou joueur existant</h4>
          <div className="ls-defile"><table className="ls-tableau">
            <thead><tr><th scope="col">Départ</th><th scope="col">Carrières</th><th scope="col">Appareils actifs</th><th scope="col">Temps par carrière</th><th scope="col">Matchs par carrière</th><th scope="col">Saisons par carrière</th><th scope="col">Retour à 7 jours</th></tr></thead>
            <tbody>{s.comparaison.map((c) => <tr key={c.type}><th scope="row">{c.libelle}</th><td>{nombre(c.creations)}</td><td>{nombre(c.utilisateurs)}</td><td>{duree(c.tempsParCarriere)}</td><td>{nombre(c.matchsParCarriere, 1)}</td><td>{nombre(c.saisonsParCarriere, 1)}</td><td>{pourcent(c.j7)}</td></tr>)}</tbody>
          </table></div>
        </section>
        <div className="ls-deux">
          <Barres titre="Postes les plus choisis" lignes={classees(s.joueur.postes)} valeur={(n) => nombre(n)} vide="Aucune carrière créée sur cette période." />
          <Barres titre="Clubs les plus choisis" lignes={classees(s.joueur.clubs)} valeur={(n) => nombre(n)} vide="Aucune carrière créée sur cette période." />
        </div>
        <BilanCarrieres lignes={s.details?.carrieres?.bilans.filter(c => c.type !== 'entraineur') ?? []} />
      </>}

      {onglet === 'entraineur' && <><div className="ls-tuiles">
        <Tuile libelle="Carrières d’entraîneur créées" valeur={nombre(s.entraineur.creees)} note="sur la période" />
        <Tuile libelle="Appareils actifs dans le mode" valeur={nombre(s.entraineur.actifs)} />
        <Tuile libelle="Saisons terminées" valeur={nombre(s.entraineur.saisons)} />
        <Tuile libelle="Temps total dans le mode" valeur={duree(s.entraineur.temps)} />
        <Tuile libelle="Temps moyen par appareil" valeur={duree(s.entraineur.tempsParUtilisateur)} />
      </div><BilanCarrieres lignes={s.details?.carrieres?.bilans.filter(c => c.type === 'entraineur') ?? []} /></>}

      {onglet === 'existant' && <>
        <div className="ls-tuiles">
          <Tuile libelle="Carrières hors classement" valeur={nombre(s.horsClassement.total)} note="sur la période" />
          <Tuile libelle="Matchs joués" valeur={nombre(s.horsClassement.matchs)} />
          <Tuile libelle="Matchs par carrière" valeur={nombre(s.horsClassement.matchsMoyens, 1)} />
          <Tuile libelle="Saisons par carrière" valeur={nombre(s.horsClassement.saisonsMoyennes, 1)} />
          <Tuile libelle="Temps de jeu total" valeur={duree(s.horsClassement.temps)} />
          <Tuile libelle="Durée moyenne d’une session" valeur={duree(s.details?.sessions.existant?.moyenne ?? 0)} />
        </div>
        <Barres titre="Joueurs les plus incarnés" vide="Aucune carrière avec un joueur existant sur cette période."
          lignes={s.horsClassement.top.map((l) => ({ nom: l.nom, n: l.n, detail: `${nombre(l.matchs ?? 0)} match${(l.matchs ?? 0) > 1 ? 's' : ''} · ${duree(l.secondes ?? 0)}` }))}
          valeur={(n) => `${nombre(n)} carrière${n > 1 ? 's' : ''}`} />
        <Barres titre="Clubs les plus joués hors classement" lignes={s.details?.carrieres?.clubsExistants ?? []} valeur={n => `${nombre(n)} carrières`} vide="Aucun club relevé sur cette période." />
        <BilanCarrieres lignes={s.details?.carrieres?.bilans.filter(c => c.type === 'existant') ?? []} />
      </>}

      {onglet === 'fluidite' && <PanneauFluidite compteurs={s.details?.fluidite ?? []} />}

      {onglet === 'retention' && <section className="ls-bloc">
        <h4>Qui revient, selon le mode joué en premier</h4>
        {s.retention.length === 0 ? <p className="ls-vide">Aucun appareil n’est arrivé sur cette période.</p> : <div className="ls-defile"><table className="ls-tableau">
          <thead><tr><th scope="col">Premier mode joué</th><th scope="col">Appareils arrivés</th><th scope="col">Revenus le lendemain</th><th scope="col">Revenus à 7 jours</th><th scope="col">Revenus à 30 jours</th></tr></thead>
          <tbody>{s.retention.map((r) => <tr key={r.mode}><th scope="row">{r.libelle}</th><td>{nombre(r.cohorte)}</td><td>{pourcent(r.j1)}</td><td>{pourcent(r.j7)}</td><td>{pourcent(r.j30)}</td></tr>)}</tbody>
        </table></div>}
        <p className="ls-note">Un taux ne compte que les appareils qui ont eu le temps de revenir : arrivé hier, un joueur ne dit encore rien du septième jour (« — » tant que personne n’est assez ancien). « À 7 jours » : revenu entre le 7ᵉ et le 13ᵉ jour ; « à 30 jours » : entre le 30ᵉ et le 36ᵉ.</p>
      </section>}
    </div>}
  </section>;
}
