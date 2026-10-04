import type { Manager } from '../types';
import { t, nombre } from '../lib/i18n';
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
      <div><div className="eyebrow">{t("ui.58a38c41299f", { v0: m.saison })}</div>
        <h2><Icone nom="euro" taille={24} />{t("ui.f40a457d4191")}</h2>
        <p>{t("ui.ab145ed373d3")}</p></div>
      <div className="tresorerie-reference"><span>{t("ui.39920b1da0da")}</span><strong>{euros(dotation.budget)}</strong><small>{m.club} · {m.divisionNom}</small></div>
    </section>
    <div className="tresorerie-enveloppes">
      <section className="carte tresorerie-enveloppe">
        <h3>{t("mgr.x.recrutement")}</h3><small>{t("ui.81d3d138273b")}</small><strong>{euros(m.budgetTransferts)}</strong>
        <p>{t("ui.38cdc4878d77")}</p>
        <dl><div><dt>{t("ui.cb1d83462427")}</dt><dd>{euros(dotation.transferts)}</dd></div>
          <div><dt>{t("ui.0189d7125064")}</dt><dd>{euros(reports.transferts)}</dd></div></dl>
        <button className="btn fantome" onClick={onMarche}>{t("ui.f5bf0eeb5c92")}<Icone nom="marche" taille={15} /></button>
      </section>
      <section className={`carte tresorerie-enveloppe${salaires.disponible < 0 ? ' tresorerie-alerte' : ''}`}>
        <h3>{t("ui.c3a5429174cd")}</h3><small>{salaires.disponible < 0 ? t("ui.10ccf14fd77d") : t("ui.4bd89f29faca")}</small>
        <strong>{euros(Math.abs(salaires.disponible))}</strong>
        <p>{salaires.disponible < 0 ? t("ui.ddcb8c2ba300") : t("ui.aca60a55d626")}</p>
        <dl><div><dt>{t("ui.1c203ebdfcfb")}</dt><dd>{euros(salaires.engagee)}</dd></div>
          <div><dt>{t("ui.9715bc339d34")}</dt><dd>{euros(salaires.plafond)}</dd></div>
          {salaires.cap !== null && <div><dt>{t("ui.c3f23f985e70")}</dt><dd>{euros(salaires.cap)}</dd></div>}
          <div><dt>{t("ui.8acdb43fda35")}</dt><dd>{euros(reports.salarial)}</dd></div></dl>
      </section>
      <section className="carte tresorerie-enveloppe">
        <h3>{t("ui.b912533f7f9a")}</h3><small>{t("ui.3b429b4dd69b")}</small><strong>{euros(m.budgetStructure)}</strong>
        <p>{t("ui.7882b6ff0772")}</p>
        <dl><div><dt>{t("ui.cb1d83462427")}</dt><dd>{euros(dotation.structure)}</dd></div>
          <div><dt>{t("ui.9dcf5950b2bf")}</dt><dd>{euros(reports.structure)}</dd></div></dl>
        <button className="btn fantome" onClick={onStructures}>{t("ui.08d706f62a30")}<Icone nom="formation" taille={15} /></button>
      </section>
    </div>
    <section className="carte tresorerie-regles">
      <h3>{t("ui.3292cee16e56")}</h3>
      <p>{t("ui.4958bbece59c")}</p>
      <p>{t("ui.7c0b8f52e096")}</p>
      <dl><div><dt>{t("ui.4c4521a3cb27")}</dt><dd>{euros(formation)}</dd></div></dl>
      <small>{t("ui.5d67711b77ca")}</small>
    </section>
    <section className="carte tresorerie-tarifs">
      <h3>{t("ui.92b6bca8cb06")}</h3><p>{t("ui.1dd11454123f")}</p>
      <ol>{Array.from({ length: NIVEAU_INSTALLATION_MAX }, (_, i) => <li key={i}><span>{t("ui.960adc59f347", { v0: i + 1 })}</span><b>{euros(coutAmelioration(i)!)}</b></li>)}</ol>
    </section>
    <details className="carte tresorerie-salaires">
      <summary>{t("ui.6f3334f5761c")}<b>{t("ui.d4c3dafe222c", { v0: euros(salaires.engagee) })}</b></summary>
      <p>{t("ui.723f9876b04b")}</p>
      <ul>{contrats.map((j) => <li key={j.joueurId}><span>{j.nom}<small>{j.negocie ? t("ui.8b1856728f53") : j.salaire === 0 ? t("ui.94102386da88") : t("ui.9d53971555ec")}</small></span><b>{t("ui.d4c3dafe222c", { v0: euros(j.salaire) })}</b></li>)}</ul>
    </details>
    <section className="carte tresorerie-personnelle"><Icone nom="entraineur" taille={21} /><div><h3>{t("ui.b6ff650e0ba1")}</h3><p>{t("ui.0ae1d0bbdfb1", { v0: euros(m.contrat?.salaire ?? 0), v1: euros(m.argent) })}</p><small>{t("ui.deeb16d81daf")}</small></div></section>
  </div>;
}
