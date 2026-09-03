import type { Manager } from '../types';
import { nombre } from '../lib/i18n';
import { budgetsDuClub, salairesEffectif, situationSalariale } from '../lib/recrutementManager';
import { reportsBudgets } from '../lib/tresorerieManager';
import { coutAmelioration, NIVEAU_INSTALLATION_MAX } from '../lib/installations';
import { Icone } from './Icone';
import './TresorerieManager.css';

const euros = (n: number) => `${nombre(n)} €`;

export function TresorerieManager({ manager: m, onMarche, onStructures }: {
  manager: Manager; onMarche: () => void; onStructures: () => void;
}) {
  const dotation = budgetsDuClub(m.club, m.saison);
  const salaires = situationSalariale(m);
  const reports = reportsBudgets(m);
  const contrats = salairesEffectif(m.club, m.saison, m.recrues, m.avancee?.contratsJoueurs).sort((a, b) => b.salaire - a.salaire);
  const formation = Object.entries(m.revenusFormation).filter(([cle]) => cle.startsWith(`${m.club}|`))
    .reduce((total, [, montant]) => total + montant, 0);
  return <div className="tresorerie-manager">
    <section className="carte tresorerie-tete">
      <div><div className="eyebrow">Comptes du club · saison {m.saison}</div>
        <h2><Icone nom="euro" taille={24} /> Trésorerie</h2>
        <p>Les moyens disponibles pour recruter, payer l’effectif et développer les structures.</p></div>
      <div className="tresorerie-reference"><span>Budget annuel de référence</span><strong>{euros(dotation.budget)}</strong><small>{m.club} · {m.divisionNom}</small></div>
    </section>
    <div className="tresorerie-enveloppes">
      <section className="carte tresorerie-enveloppe">
        <h3>Recrutement</h3><small>Solde disponible</small><strong>{euros(m.budgetTransferts)}</strong>
        <p>Indemnités de transfert, primes à la signature et recrutement des jeunes.</p>
        <dl><div><dt>Dotation annuelle de référence</dt><dd>{euros(dotation.transferts)}</dd></div>
          <div><dt>Report si clôture à ce solde · 28 %</dt><dd>{euros(reports.transferts)}</dd></div></dl>
        <button className="btn fantome" onClick={onMarche}>Ouvrir le marché <Icone nom="marche" taille={15} /></button>
      </section>
      <section className={`carte tresorerie-enveloppe${salaires.disponible < 0 ? ' tresorerie-alerte' : ''}`}>
        <h3>Salaires des joueurs</h3><small>{salaires.disponible < 0 ? 'Dépassement du plafond annuel' : 'Marge annuelle disponible'}</small>
        <strong>{euros(Math.abs(salaires.disponible))}</strong>
        <p>{salaires.disponible < 0 ? 'La masse salariale dépasse le plafond : aucune nouvelle charge ne peut être signée.' : 'Une signature utilise cette marge. Le plafond annuel reste le même.'}</p>
        <dl><div><dt>Masse engagée / an</dt><dd>{euros(salaires.engagee)}</dd></div>
          <div><dt>Plafond autorisé / an</dt><dd>{euros(salaires.plafond)}</dd></div>
          {salaires.cap !== null && <div><dt>Salary cap de la division</dt><dd>{euros(salaires.cap)}</dd></div>}
          <div><dt>Report de marge · 20 %</dt><dd>{euros(reports.salarial)}</dd></div></dl>
      </section>
      <section className="carte tresorerie-enveloppe">
        <h3>Structures</h3><small>Épargne disponible</small><strong>{euros(m.budgetStructure)}</strong>
        <p>Une enveloppe commune à la formation, l’entraînement et au réseau de recruteurs.</p>
        <dl><div><dt>Dotation annuelle de référence</dt><dd>{euros(dotation.structure)}</dd></div>
          <div><dt>Report intégral · 100 %</dt><dd>{euros(reports.structure)}</dd></div></dl>
        <button className="btn fantome" onClick={onStructures}>Développer les structures <Icone nom="formation" taille={15} /></button>
      </section>
    </div>
    <section className="carte tresorerie-regles">
      <h3>D’une saison à l’autre</h3>
      <p>À la clôture, les dotations de la nouvelle division s’ajoutent aux reports ci-dessus. Le report salarial porte seulement sur la marge inutilisée et reste limité par le salary cap.</p>
      <p>Les indemnités de formation vont au recrutement. Les revenus marketing versent 35 % au recrutement et 15 % aux structures. Ces recettes sont calculées et créditées à la clôture.</p>
      <dl><div><dt>Revenus de formation déjà crédités au club · toutes saisons</dt><dd>{euros(formation)}</dd></div></dl>
      <small>Le budget annuel de référence couvre aussi le fonctionnement du club. Il ne constitue pas un solde supplémentaire à dépenser.</small>
    </section>
    <section className="carte tresorerie-tarifs">
      <h3>Prix fixes des structures</h3><p>Le même prix pour les trois structures, quelle que soit la division. Chaque palier s’achète séparément.</p>
      <ol>{Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => <li key={i}><span>Niveau {i + 1}</span><b>{euros(coutAmelioration(i)!)}</b></li>)}</ol>
    </section>
    <details className="carte tresorerie-salaires">
      <summary>Détail de la masse salariale <b>{euros(salaires.engagee)} / an</b></summary>
      <p>Les recrues suivent leur salaire signé jusqu’à la fin du contrat. Pour les autres joueurs, le jeu applique son barème de salaire. Un départ libère sa charge.</p>
      <ul>{contrats.map((j) => <li key={j.joueurId}><span>{j.nom}<small>{j.negocie ? 'Contrat signé' : j.salaire === 0 ? 'Amateur · sans salaire fixe' : 'Barème du club'}</small></span><b>{euros(j.salaire)} / an</b></li>)}</ul>
    </details>
    <section className="carte tresorerie-personnelle"><Icone nom="entraineur" taille={21} /><div><h3>Ta rémunération d’entraîneur</h3><p>{euros(m.contrat?.salaire ?? 0)} / an · Patrimoine personnel : {euros(m.argent)}.</p><small>Versée en fin de saison, elle reste distincte des enveloppes du club.</small></div></section>
  </div>;
}
