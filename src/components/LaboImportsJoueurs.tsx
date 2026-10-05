import { useMemo, useState } from 'react';
import type { AnalyseImport, LigneImport, VerdictImport } from '../lib/ligue/importsJoueurs';
import { nomComplet } from '../lib/ligue/importsJoueurs';

// LE LABO · IMPORTS JOUEURS (compte Kiri)
//
// ⚠️ RIEN DE DOUTEUX N'ENTRE SANS DÉCISION. L'analyse classe chaque ligne
// (nouvelle, déjà présente, douteuse) avec la règle qui a tranché : nom +
// date de naissance, nom + club, fiche source unique — sinon c'est au Labo de
// dire « c'est lui », « c'est un autre » ou « on laisse ».

interface Analyse { revision: number; compteurs: Record<VerdictImport | 'decides', number>; analyses: AnalyseImport[] }
type Decision = { ligne: LigneImport; decision: 'ajouter' | 'fusionner' | 'ignorer'; sourceId?: string };

async function requete<T>(chemin: string, corps?: unknown): Promise<T> {
  const r = await fetch(`/api/carriere?atelier=1${chemin}`, { method: corps ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: corps ? { 'Content-Type': 'application/json' } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { erreur?: string }).erreur ?? 'Opération impossible.');
  return d as T;
}

const VERDICTS: Record<VerdictImport, string> = { douteux: 'Douteux', nouveau: 'Nouveaux', present: 'Déjà présents' };
const DECISIONS = { ajouter: 'Ajouté comme nouveau joueur', fusionner: 'Rattaché au joueur existant', ignorer: 'Ignoré' };

/** `prenom;nom;poste;club;ligue;image;dateNaissance;nation;note;age`, en-tête facultatif. */
function lireCsv(texte: string): LigneImport[] {
  return texte.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^pr[ée]nom\s*;/i.test(l)).map(l => {
    const [prenom, nom, poste, club, ligue, image, dateNaissance, nation, note, age] = l.split(';').map(x => x.trim());
    return { ...(prenom ? { prenom } : {}), nom, club, ligue, ...(poste ? { poste } : {}), ...(image ? { image } : {}), ...(dateNaissance ? { dateNaissance } : {}),
      ...(nation ? { nation } : {}), ...(note ? { note: Number(note) } : {}), ...(age ? { age: Number(age) } : {}) } as LigneImport;
  });
}

export function LaboImportsJoueurs() {
  const [source, setSource] = useState<{ lot: string } | { lignes: LigneImport[] } | null>(null);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [onglet, setOnglet] = useState<VerdictImport>('douteux');
  const [texte, setTexte] = useState('');
  const [occupe, setOccupe] = useState(false), [erreur, setErreur] = useState(''), [message, setMessage] = useState('');
  const [masquerDecides, setMasquerDecides] = useState(true);

  const analyser = async (cible: NonNullable<typeof source>) => {
    setOccupe(true); setErreur('');
    try {
      const resultat = 'lot' in cible
        ? await requete<Analyse>(`&section=imports&lot=${encodeURIComponent(cible.lot)}`)
        : await requete<Analyse>('', { action: 'atelier', operation: 'analyserImport', lignes: cible.lignes });
      setSource(cible); setAnalyse(resultat);
      setOnglet(resultat.compteurs.douteux ? 'douteux' : resultat.compteurs.nouveau ? 'nouveau' : 'present');
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };
  const decider = async (decisions: Decision[], succes: string) => {
    if (!analyse || !source || !decisions.length) return;
    setOccupe(true); setErreur(''); setMessage('');
    try {
      await requete('', { action: 'atelier', operation: 'deciderImport', revision: analyse.revision, decisions });
      setMessage(succes);
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
    await analyser(source);
  };

  const visibles = useMemo(() => (analyse?.analyses ?? []).filter(a => a.verdict === onglet && (!masquerDecides || !a.decision)), [analyse, onglet, masquerDecides]);
  const nouveauxEnAttente = (analyse?.analyses ?? []).filter(a => a.verdict === 'nouveau' && !a.decision);

  return <section className="labo-imports">
    <div className="li-sources">
      <div className="li-source">
        <h3>MLR · Championship · NPC</h3>
        <p className="ak-note">Les effectifs de la Major League Rugby, de la RFU Championship (et sa coupe) et du Bunnings NPC sont intégrés au catalogue de tous les modes. Ce contrôle vérifie leur présence, y compris les homonymes distingués grâce à leurs fiches source.</p>
        <button type="button" className="btn primaire" disabled={occupe} onClick={() => { void analyser({ lot: 'mlr-championship-npc' }); }}>Analyser le lot</button>
      </div>
      <div className="li-source">
        <h3>Coller une liste</h3>
        <p className="ak-note">Une ligne par joueur : <code>prénom;nom;poste;club;ligue;image;date de naissance;nation;GEN;âge</code> — seuls nom, club et ligue sont obligatoires. Date au format AAAA-MM-JJ, image en URL HTTPS ou /photos/.</p>
        <textarea rows={4} value={texte} onChange={e => setTexte(e.target.value)} spellCheck={false} placeholder="Joe;Taufete'e;Talonneur;Seattle;MLR;;1992-03-11;États-Unis;66" />
        <button type="button" className="btn fantome" disabled={occupe || !texte.trim()} onClick={() => { void analyser({ lignes: lireCsv(texte) }); }}>Analyser la liste</button>
      </div>
    </div>
    {erreur && <p role="alert" className="ak-erreur">{erreur}</p>}
    {message && <p role="status" className="ak-succes">{message}</p>}
    {analyse && <>
      <div className="li-compteurs" role="group" aria-label="Résultat de l’analyse">
        {(['douteux', 'nouveau', 'present'] as const).map(v => <button key={v} type="button" className={`li-compteur verdict-${v}${onglet === v ? ' actif' : ''}`} aria-pressed={onglet === v} onClick={() => setOnglet(v)}>
          <b>{analyse.compteurs[v]}</b><span>{VERDICTS[v]}</span></button>)}
        <span className="li-decides">{analyse.compteurs.decides} ligne(s) déjà tranchée(s)</span>
      </div>
      <div className="li-outils">
        <label className="ls-bascule"><input type="checkbox" checked={masquerDecides} onChange={e => setMasquerDecides(e.target.checked)} /><span>Masquer les lignes tranchées</span></label>
        {onglet === 'nouveau' && <button type="button" className="btn primaire" disabled={occupe || !nouveauxEnAttente.length} onClick={() => { void decider(nouveauxEnAttente.map(a => ({ ligne: a.ligne, decision: 'ajouter' })), `${nouveauxEnAttente.length} joueur(s) ajouté(s) au catalogue.`); }}>Ajouter tous les nouveaux ({nouveauxEnAttente.length})</button>}
      </div>
      <ul className="li-liste">
        {visibles.slice(0, 200).map(a => <li key={a.cle} className={`verdict-${a.verdict}`}>
          <div className="li-ligne">
            <b>{nomComplet(a.ligne)}</b>
            <small>{[a.ligne.poste, a.ligne.club, a.ligne.ligue, a.ligne.age ? `${a.ligne.age} ans` : null, a.ligne.dateNaissance, a.ligne.note ? `GEN ${a.ligne.note}` : null].filter(Boolean).join(' · ')}</small>
            <em>{a.raison}</em>
            {a.decision && <span className="li-decision">{DECISIONS[a.decision.decision]}</span>}
          </div>
          {a.candidats.length > 0 && <ul className="li-candidats">{a.candidats.map(c => <li key={c.sourceId}>
            <span><b>{c.nom}</b> · {c.club} · {c.championnat} · {c.age} ans · GEN {c.note}{c.photo ? ' · portrait' : ''}</span>
            {a.verdict !== 'present' && <button type="button" className="btn fantome" disabled={occupe} onClick={() => { void decider([{ ligne: a.ligne, decision: 'fusionner', sourceId: c.sourceId }], `${nomComplet(a.ligne)} rattaché à ${c.nom} (${c.club}).`); }}>C’est lui</button>}
          </li>)}</ul>}
          {a.verdict !== 'present' && <div className="li-actions">
            <button type="button" className="btn primaire" disabled={occupe} onClick={() => { void decider([{ ligne: a.ligne, decision: 'ajouter' }], `${nomComplet(a.ligne)} ajouté comme nouveau joueur.`); }}>{a.verdict === 'douteux' ? 'C’est un autre joueur : l’ajouter' : 'Ajouter'}</button>
            <button type="button" className="btn fantome" disabled={occupe} onClick={() => { void decider([{ ligne: a.ligne, decision: 'ignorer' }], `${nomComplet(a.ligne)} ignoré.`); }}>Ignorer</button>
          </div>}
        </li>)}
        {!visibles.length && <li className="li-vide">Rien à relire ici.</li>}
        {visibles.length > 200 && <li className="li-vide">{visibles.length - 200} ligne(s) de plus : traite d’abord celles-ci.</li>}
      </ul>
    </>}
  </section>;
}
