/* oxlint-disable react/only-export-components -- aperçu local de développement */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EditeurCombinaisons } from '../src/components/EditeurCombinaisons';
import { DirectCinema } from '../src/components/match/DirectCinema';
import { creerCombinaison, type Combinaison } from '../src/lib/ligue/combinaisons';
import { actualiserCahierMatchEnLigne, avancerMatchEnLigne, creerMatchEnLigne, STRATEGIE_EN_LIGNE_DEFAUT, vueMatchEnLigne } from '../src/lib/ligue/matchCarriere';
import { effectifDuClub } from '../src/lib/effectif';
import { compositionManagerParDefaut } from '../src/lib/compositionManager';
import { chargerTextes, definirLangue } from '../src/lib/i18n';
import { creerMarcheCombinaisons, marcheCombinaisonsMemoire, RefusMarche } from '../serveur/marcheCombinaisons';
import { exempleCombinaison } from '../src/lib/ligue/exemplesCombinaisons';
import { creerFiche, lirePublication, STATS_VIDES, type FichePubliee, type StatsCombinaison } from '../src/lib/ligue/marcheCombinaisons';
import { ErreurMarche, type ApiMarche } from '../src/lib/marcheCombinaisonsClient';
import { TEXTES } from '../src/data/textes';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';

chargerTextes(TEXTES);
const parametres = new URLSearchParams(location.search);
if (parametres.get('langue')) definirLangue(parametres.get('langue') as 'fr');

// ── Un marché local : le VRAI service du serveur, posé sur un tableau en mémoire. Aucune requête, aucune base.
// « moi » est l'entraîneur de l'aperçu ; les autres fiches sont celles d'entraîneurs inventés, avec des matchs joués.
const MOI = 'moi';
const stats = (plus: Partial<StatsCombinaison>): StatsCombinaison => ({ ...STATS_VIDES, ...plus });
const fiche = (id: string, exemple: string, nom: string, pseudo: string, description: string, s: StatsCombinaison, notes: number[], ajouts: number, jours: number): FichePubliee => {
  const lu = lirePublication({ plan: exempleCombinaison(exemple, 'x', nom), nom, description });
  if (!('saisie' in lu)) throw new Error(`exemple ${exemple}`);
  const f = creerFiche(`00000000-0000-4000-8000-0000000000${id}`, `compte-${pseudo}`, pseudo, lu.saisie, Date.parse('2026-09-30T12:00:00Z') - jours * 86_400_000);
  return { ...f, stats: s, versions: f.versions.map(v => ({ ...v, stats: s })), notes: Object.fromEntries(notes.map((n, i) => [`c${i}`, n])), telecharges: Array.from({ length: ajouts }, (_, i) => `a${i}`) };
};
const lignesMarche = parametres.get('marche') === 'vide' ? [] : [
  fiche('01', 'ruck-cellule', 'Cellule, 13 dans le dos', 'Lauzerte XV', 'Le 4 fixe au cœur, le ballon passe derrière lui pour le 10, le 12 emmène son vis-à-vis.', stats({ utilisations: 142, matchs: 19, metres: 1010, battus: 61, franchissements: 31, essais: 9, conserves: 78, pertes: 14, penalitesPour: 6, penalitesContre: 4 }), [5, 5, 4, 5, 4, 4, 5], 38, 21),
  fiche('02', 'touche-maul', 'Maul des cinq mètres', 'Les Sangliers', 'Touche au premier bloc, on porte, puis 9 → 10 quand la défense se resserre.', stats({ utilisations: 88, matchs: 14, metres: 420, battus: 12, franchissements: 9, essais: 11, conserves: 52, pertes: 9, penalitesPour: 5, penalitesContre: 2 }), [4, 5, 4, 4], 24, 12),
  fiche('03', 'melee-croisee', 'Croisée 10-12 sur mêlée', 'RC Vaour', 'La croisée fixe le premier défenseur, le 13 part en leurre extérieur.', stats({ utilisations: 61, matchs: 9, metres: 250, battus: 18, franchissements: 8, essais: 2, conserves: 34, pertes: 13, penalitesContre: 4 }), [3, 4, 3], 11, 30),
  fiche('04', 'ruck-lecture', 'Le 10 lit le rideau', 'Académie Sud', 'Si la défense monte, petit rasant ; si le 12 est pris, on saute vers le 13.', stats({ utilisations: 17, matchs: 2, metres: 110, battus: 4, franchissements: 3, essais: 1, conserves: 9, pertes: 3, penalitesPour: 1 }), [5], 6, 3),
  fiche('05', 'ligne-pick', 'Pick and go près de la ligne', 'Lauzerte XV', 'Le 8 ramasse, le 6 à son épaule. Simple, dur à arrêter.', stats({ utilisations: 204, matchs: 26, metres: 510, battus: 22, franchissements: 12, essais: 31, conserves: 128, pertes: 21, penalitesPour: 8, penalitesContre: 4 }), [4, 4, 5, 3, 4, 4, 4, 5, 4], 57, 44),
  fiche('06', 'melee-pied', 'Occupation du 10', 'US Graulhet B', 'Sortie de mêlée dans nos 40 : le 10 trouve le fond du terrain.', stats({ utilisations: 0, matchs: 0 }), [], 1, 1),
].map(f => ({ fiche: f, revision: 0 }));
const service = creerMarcheCombinaisons(marcheCombinaisonsMemoire(lignesMarche));
const moderateur = parametres.get('moderateur') === '1';
const exiger = <T,>(d: T | null): T => { if (!d) throw Object.assign(new Error('refus'), { statut: 409 }); return d; };
const apiLocale: ApiMarche = {
  liste: () => service.liste(MOI, moderateur),
  detail: async id => exiger(await service.detail(id, MOI, moderateur)),
  // Le serveur répond 409 avec la raison du refus : l'aperçu rend la même erreur que le client HTTP.
  publier: saisie => service.publier(MOI, 'Toi', saisie, Date.now()).catch((e: unknown) => { throw e instanceof RefusMarche ? new ErreurMarche(409, '', e.raison) : e; }),
  ajouter: async id => exiger(await service.ajouter(id, MOI)),
  noter: async (id, note) => exiger(await service.noter(id, MOI, note)),
  signaler: async (id, motif) => exiger(await service.signaler(id, MOI, motif)),
  retirer: async id => exiger(await service.moderer(id, 'retirer', MOI, moderateur)),
  retablir: async id => exiger(await service.moderer(id, 'retablir', MOI, moderateur)),
};
const debut = Date.parse('2026-09-30T12:00:00Z');
const equipe = (clubId: string, nom: string) => {
  const effectif = effectifDuClub(nom, 1);
  return { clubId, nom, effectif, composition: compositionManagerParDefaut(effectif), strategie: STRATEGIE_EN_LIGNE_DEFAUT };
};
function Apercu() {
  const [plans, setPlans] = useState<Combinaison[]>((['ruck', 'melee', 'touche'] as const).map(phase => {
    const c = creerCombinaison(`match-${phase}`, phase);
    c.nom = phase === 'ruck' ? 'Mon lancement sur ruck' : phase === 'melee' ? 'Ma sortie de mêlée' : 'Ma sortie de touche';
    return c;
  }));
  const [mode, setMode] = useState<'automatique' | 'configure'>('automatique');
  const [minute, setMinute] = useState(2);
  const [etat, setEtat] = useState(() => avancerMatchEnLigne(creerMatchEnLigne({
    id: 'apercu-cahier-en-match', domicile: equipe('club-a', 'Stade Toulousain'), exterieur: equipe('club-b', 'RC Toulon'), debut, graine: 43219,
  }), debut + 2 * 60_000));
  const vue = vueMatchEnLigne(etat, 'club-a', Date.now());
  const executions = vue.fil.filter(l => l.cote === 'domicile' && l.texte.startsWith('Combinaison :'));
  return <main className="cel" style={{ maxWidth: 1440, margin: '24px auto', padding: 12 }}>
    <p>Aperçu local · le match a démarré avant la sauvegarde du cahier. Aucun résultat de ligue n’est modifié.</p>
    <EditeurCombinaisons combinaisons={plans} mode={mode} marche={apiLocale} moderateur={moderateur}
      statsCombinaisons={{ 'match-ruck': { ...STATS_VIDES, utilisations: 23, matchs: 4, metres: 131, franchissements: 5, essais: 2, conserves: 12, pertes: 3, penalitesPour: 1 } }} enregistrer={async (p, m) => {
      setPlans(p); setMode(m);
      setEtat(actuel => actualiserCahierMatchEnLigne(actuel, 'club-a', { combinaisons: p, modeCombinaisons: m }, debut + minute * 60_000));
      return true;
    }} />
    <section className="cel-panneau" style={{ marginTop: 24 }}>
      <h2>Match local · moteur de la ligue</h2>
      <button className="btn" disabled={etat.termine} onClick={() => {
        const suivante = Math.min(80, minute + 5); setMinute(suivante);
        setEtat(actuel => avancerMatchEnLigne(actuel, debut + suivante * 60_000));
      }}>Avancer de 5 minutes</button>
      <p role="status">{executions.length} combinaison{executions.length > 1 ? 's' : ''} exécutée{executions.length > 1 ? 's' : ''} par ton équipe.</p>
      <DirectCinema match={vue} domicile="Stade Toulousain" exterieur="RC Toulon" couleurs={{ domicile: '#b9473d', exterieur: '#3889cb' }} />
      <details open><summary>Combinaisons jouées par le moteur</summary>{executions.slice(-10).map(l => <p key={l.id}>{l.minute}′ · {l.texte}</p>)}</details>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Apercu />);
