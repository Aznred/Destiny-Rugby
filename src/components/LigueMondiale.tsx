import { useEffect, useState } from 'react';
import { capaciteDivision, poulesMaximum } from '../lib/ligue/pyramidePublique';
import { chargerClassementMondial, type ClassementMondialPublic } from '../lib/carriereEnLigneClient';
import './LigueMondiale.css';

export function LigueMondiale() {
  const [ouvert, setOuvert] = useState(false);
  const [page, setPage] = useState(1);
  const [classement, setClassement] = useState<ClassementMondialPublic | null>(null);
  const [erreur, setErreur] = useState('');
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    if (!ouvert) return;
    const controle = new AbortController();
    setCharge(true); setErreur('');
    void chargerClassementMondial(page, controle.signal).then(setClassement).catch(e => {
      if (!controle.signal.aborted) setErreur(e instanceof Error ? e.message : 'Le classement est momentanément indisponible.');
    }).finally(() => { if (!controle.signal.aborted) setCharge(false); });
    return () => controle.abort();
  }, [ouvert, page]);
  return <section className="cel-mondiale" aria-label="Ligue mondiale">
    <div className="cel-mondiale-entete"><div><span className="eyebrow">La course au titre mondial</span><h2>Une élite. Dix divisions.</h2></div><strong>16 <small>équipes en D1</small></strong></div>
    <p>Ton compte est inscrit automatiquement. Chaque poule réunit jusqu’à 16 équipes ; les saisons durent 30 jours. Les nouveaux groupes rejoignent le prochain départ mensuel.</p>
    <button type="button" className="btn" aria-expanded={ouvert} onClick={() => setOuvert(v => !v)}>{ouvert ? 'Fermer le classement mondial' : 'Voir le classement mondial et le règlement'}</button>
    {ouvert && <>
      <div className="cel-mondiale-regles"><div><h3>La D1, au sommet</h3><p>Une seule poule, un champion mondial. Les quatre derniers descendent et les deux premiers de chacune des deux poules de D2 prennent leur place, après une saison jouée.</p></div>
        <div><h3>Des montées au mérite</h3><p>Ailleurs, les deux premiers sont candidats à la montée et les quatre derniers à la descente. Les résultats sportifs priment ; l’Elo départage les équipes entre poules. Le reclassement respecte les places disponibles.</p></div>
        <div><h3>Accélérer vers le haut</h3><p>Un champion avec au moins 10 matchs, 85 % de victoires et +14 points de différence par match peut gagner deux divisions. Avec 90 % de victoires et 200 Elo au-dessus de sa poule, il peut en gagner trois. L’accès à la D1 passe toujours par la D2.</p></div>
        <div><h3>Ton niveau mondial</h3><p>L’Elo démarre à 1 500 et évolue à chaque résultat, selon la force de l’adversaire. Les matchs déjà enregistrés comptent. Ton niveau, ton effectif et tes Ovas suivent ton club à chaque saison.</p></div></div>
      <details><summary>Les dix divisions et leurs capacités</summary><table className="cel-mondiale-capacites"><thead><tr><th>Division</th><th>Poules</th><th>Équipes</th></tr></thead><tbody>{Array.from({ length: 10 }, (_, i) => i + 1).map(d => <tr key={d}><th>D{d}</th><td>{Number.isFinite(poulesMaximum(d)) ? poulesMaximum(d) : 'Illimité'}</td><td>{Number.isFinite(capaciteDivision(d)) ? capaciteDivision(d).toLocaleString('fr-FR') : 'Illimité'}</td></tr>)}</tbody></table></details>
      <div className="cel-mondiale-classement"><h3>Classement mondial Elo</h3>{classement?.moi && <p className="cel-mondiale-moi">Ton club : <b>n° {classement.moi.rangMondial.toLocaleString('fr-FR')}</b> · <b>{classement.moi.elo} Elo</b> · D{classement.moi.division} / P{classement.moi.poule}</p>}
        {erreur && <p role="alert">{erreur}</p>}{charge && <p role="status">Chargement du classement…</p>}
        {classement && <><ol start={(page - 1) * 50 + 1} aria-label="Équipes classées par Elo">{classement.equipes.map(e => <li key={e.clubId}><span className="cel-mondiale-rang">{e.rangMondial}</span><span><b>{e.nom}</b><small>D{e.division} · Poule {e.poule}</small></span><strong>{e.elo}<small>Elo</small></strong></li>)}</ol>{!classement.equipes.length && <p>Les premiers résultats des poules sont en cours de prise en compte.</p>}<nav aria-label="Pages du classement mondial"><button type="button" className="btn" disabled={charge || page === 1} onClick={() => setPage(p => p - 1)}>Précédente</button><span>Page {page} / {Math.max(1, Math.ceil(classement.total / 50))}</span><button type="button" className="btn" disabled={charge || page * 50 >= classement.total} onClick={() => setPage(p => p + 1)}>Suivante</button></nav></>}
      </div>
    </>}
  </section>;
}
