import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Icone } from './Icone';
import { Confirmation } from './Confirmation';
import { nombre, t } from '../lib/i18n';
import { nomPoste } from '../data/rugby';
import { useGame } from '../store/useGame';
import { useModalDialog } from '../lib/useModalDialog';
import type { Coequipier } from '../lib/effectif';
import {
  planContrats, politiqueContrats, type DecisionContrat, type PolitiqueContrats, type ResultatContrat,
} from '../lib/contratsAutomatiques';
import './GestionContrats.css';

/**
 * L'ASSISTANT SPORTIF (Correctif 41) : « Gérer automatiquement » et « Tout régler maintenant ».
 *
 * ⚠️ LE PLAN AFFICHÉ EST CELUI QUI SERA EXÉCUTÉ. `planContrats` est une fonction pure : la fenêtre la relit à chaque
 * réglage de la politique, et le store l'appelle à son tour au moment de négocier.
 */
interface Props {
  /** Le groupe sous contrat (le même que celui de l'écran des contrats). */
  effectif: Coequipier[];
}

function Choix<T extends string | number>({ valeur, options, onChange, libelle }: {
  valeur: T; options: readonly { valeur: T; libelle: string }[]; onChange: (v: T) => void; libelle: string;
}) {
  return (
    <span className="gc-choix" role="group" aria-label={libelle}>
      {options.map((o) => (
        <button key={String(o.valeur)} type="button" className={o.valeur === valeur ? 'actif' : ''} aria-pressed={o.valeur === valeur} onClick={() => onChange(o.valeur)}>
          {o.libelle}
        </button>
      ))}
    </span>
  );
}

function Fenetre({ effectif, onFermer, bilanInitial }: Props & { onFermer: () => void; bilanInitial?: ResultatContrat[] }) {
  const manager = useGame((s) => s.manager);
  const definirPolitique = useGame((s) => s.definirPolitiqueContratsManager);
  const regler = useGame((s) => s.reglerContratsManager);
  const [bilan, setBilan] = useState<ResultatContrat[] | null>(bilanInitial ?? null);
  // Sur un téléphone, les sept réglages repoussent le plan hors de l'écran : la politique s'ouvre à la demande.
  const [large] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 761px)').matches);
  const { overlayRef, dialogRef } = useModalDialog(onFermer);
  const politique = manager ? politiqueContrats(manager) : null;
  const plan = useMemo(() => (manager?.club && politique && !bilan ? planContrats(manager, effectif, politique) : null), [manager, effectif, politique, bilan]);
  if (!manager || !politique) return null;
  const regle = (p: Partial<PolitiqueContrats>) => definirPolitique(p);
  const ouiNon = [{ valeur: 'oui', libelle: t('ctr.pol.rempl.oui') }, { valeur: 'non', libelle: t('ctr.pol.rempl.non') }] as const;

  const ligneDuPlan = (d: DecisionContrat) => (
    <li key={d.joueurId} className={`gc-ligne gc-${d.action}`}>
      <span className="gc-qui"><b>{d.nom}</b><small>{nomPoste(d.poste)} · {d.age} · {d.note}</small></span>
      <span className={`gc-statut gc-statut-${d.statut}`}>{t(`ctr.statut.${d.statut}`)}</span>
      <span className="gc-decision"><b>{t(`ctr.action.${d.action}`)}</b><small>{t(`ctr.raison.${d.raison}`)}</small></span>
      <span className="gc-chiffre">{d.salaireActuel > 0 ? `${nombre(d.salaireActuel)} €` : t('mgr.amateur')}<small>{t('ctr.mois', { n: Math.max(0, d.mois) })}</small></span>
    </li>
  );

  const ligneDuBilan = (r: ResultatContrat) => {
    const texte = r.issue === 'signe'
      ? (r.salaire ? t('ctr.issue.signe', { duree: r.duree ?? 1, salaire: nombre(r.salaire) }) : t('ctr.issue.signeAmateur', { duree: r.duree ?? 1 }))
      : r.issue === 'echec' ? t(`ctr.issue.echec.${r.motif === 'budget' || r.motif === 'statut' || r.motif === 'duree' ? r.motif : 'tropCher'}`)
        : r.issue === 'refus' ? t('ctr.issue.refus')
          : r.issue === 'depart' ? t('ctr.issue.depart')
            : r.motif === 'delai' ? t('ctr.issue.delai') : t('ctr.issue.attente');
    return (
      <li key={r.joueurId} className={`gc-ligne gc-issue-${r.issue}`}>
        <span className="gc-marque"><Icone nom={r.issue === 'signe' ? 'signature' : r.issue === 'depart' ? 'porte' : r.issue === 'attente' ? 'chrono' : 'croix'} taille={14} /></span>
        <span className="gc-qui"><b>{r.nom}</b><small>{r.note}</small></span>
        <span className="gc-decision">
          <b>{texte}</b>
          {r.issue === 'signe' && !!r.salaireDemande && r.salaire !== undefined && r.salaire < r.salaireDemande
            && <small>{t('ctr.issue.demandait', { montant: nombre(r.salaireDemande) })}</small>}
        </span>
      </li>
    );
  };

  return createPortal(
    <div ref={overlayRef} className="overlay" onClick={onFermer}>
      <motion.div
        ref={dialogRef} className="carte modale gc-fenetre" role="dialog" aria-modal="true" aria-labelledby="gc-titre" tabIndex={-1}
        onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .2 }}
      >
        <header className="gc-tete">
          <h2 id="gc-titre"><Icone nom="mallette" taille={20} /> {bilan ? t('ctr.bilan') : t('ctr.gerer')}</h2>
          <button type="button" className="gc-fermer" onClick={onFermer} aria-label={t('ctr.fermer')}><Icone nom="croix" taille={16} /></button>
        </header>

        {bilan ? (
          <>
            <div className="gc-corps">
            <p className="gc-compte">
              <span>{t('ctr.bilan.signes', { n: bilan.filter((r) => r.issue === 'signe').length })}</span>
              <span>{t('ctr.bilan.echecs', { n: bilan.filter((r) => r.issue === 'echec' || r.issue === 'refus').length })}</span>
              <span>{t('ctr.resume.departs', { n: bilan.filter((r) => r.issue === 'depart').length })}</span>
            </p>
            <ul className="gc-liste">{bilan.map(ligneDuBilan)}</ul>
            </div>
            <div className="rangee-fin"><button type="button" className="btn primaire" onClick={onFermer}>{t('ctr.fermer')}</button></div>
          </>
        ) : plan && (
          <>
            <div className="gc-corps">
            <p className="gc-resume">{t('ctr.resume', { n: plan.decisions.length - plan.enAttente })}</p>
            <p className="gc-compte">
              <span>{t('ctr.resume.negocier', { n: plan.aProlonger })}</span>
              <span>{t('ctr.resume.departs', { n: plan.departs })}</span>
              <span>{t('ctr.resume.attente', { n: plan.enAttente })}</span>
            </p>
            <p className="gc-budget">
              <span><Icone nom="euro" taille={13} />{t('ctr.surcout', { montant: nombre(plan.surcoutEstime) })}</span>
              <span className={plan.margeSalariale < plan.surcoutEstime ? 'juste' : ''}>{t('ctr.marge', { montant: nombre(Math.round(plan.margeSalariale)) })}</span>
            </p>

            <details className="gc-politique" open={large}>
              <summary>{t('ctr.politique')}<Icone nom="chevron" taille={14} /></summary>
              <label><span>{t('ctr.pol.cadres')}</span><Choix libelle={t('ctr.pol.cadres')} valeur={politique.cadres ? 'oui' : 'non'} options={ouiNon} onChange={(v) => regle({ cadres: v === 'oui' })} /></label>
              <label><span>{t('ctr.pol.jeunes')}</span><Choix libelle={t('ctr.pol.jeunes')} valeur={politique.jeunes ? 'oui' : 'non'} options={ouiNon} onChange={(v) => regle({ jeunes: v === 'oui' })} /></label>
              <label><span>{t('ctr.pol.remplacants')}</span><Choix
                libelle={t('ctr.pol.remplacants')} valeur={politique.remplacants}
                options={(['oui', 'raisonnable', 'non'] as const).map((valeur) => ({ valeur, libelle: t(`ctr.pol.rempl.${valeur}`) }))}
                onChange={(remplacants) => regle({ remplacants })} /></label>
              <label><span>{t('ctr.pol.veterans')}</span><Choix
                libelle={t('ctr.pol.veterans')} valeur={politique.dureeVeterans}
                options={([1, 2] as const).map((valeur) => ({ valeur, libelle: t(`ctr.pol.vet.${valeur}`) }))}
                onChange={(dureeVeterans) => regle({ dureeVeterans })} /></label>
              <label><span>{t('ctr.pol.plafond')}</span><Choix
                libelle={t('ctr.pol.plafond')} valeur={politique.plafond}
                options={(['budget', 'prudent', 'serre'] as const).map((valeur) => ({ valeur, libelle: t(`ctr.pol.plaf.${valeur}`) }))}
                onChange={(plafond) => regle({ plafond })} /></label>
              <label><span>{t('ctr.pol.liberer')}</span><Choix libelle={t('ctr.pol.liberer')} valeur={politique.libererInutilises ? 'oui' : 'non'} options={ouiNon} onChange={(v) => regle({ libererInutilises: v === 'oui' })} /></label>
              <label><span>{t('ctr.pol.cloture')}</span><Choix libelle={t('ctr.pol.cloture')} valeur={politique.cloture ? 'oui' : 'non'} options={ouiNon} onChange={(v) => regle({ cloture: v === 'oui' })} /></label>
            </details>

            {plan.decisions.length ? <ul className="gc-liste">{plan.decisions.map(ligneDuPlan)}</ul> : <p className="gc-vide">{t('ctr.rien')}</p>}
            </div>
            <div className="rangee-fin">
              <button type="button" className="btn fantome" onClick={onFermer}>{t('ctr.annuler')}</button>
              <button type="button" className="btn primaire" disabled={!(plan.aProlonger + plan.departs)} onClick={() => setBilan(regler())}>
                <Icone nom="signature" taille={15} /> {t('ctr.lancer')}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}

export function GestionContrats({ effectif }: Props) {
  const manager = useGame((s) => s.manager);
  const regler = useGame((s) => s.reglerContratsManager);
  const [ouverte, setOuverte] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [bilan, setBilan] = useState<ResultatContrat[] | null>(null);
  const plan = useMemo(() => (manager?.club ? planContrats(manager, effectif) : null), [manager, effectif]);
  if (!manager?.club || !plan) return null;
  const aTraiter = plan.decisions.length;
  return (
    <section className="carte assistant-contrats" data-tuto="mgr-assistant-contrats">
      <div className="gc-entete">
        <b><Icone nom="mallette" taille={16} />{t('ctr.titre')}</b>
        <small>{aTraiter ? t('ctr.aTraiter', { n: aTraiter }) : t('ctr.rien')}</small>
        <p>{t('ctr.aide')}</p>
      </div>
      <div className="gc-boutons">
        <button type="button" className="btn primaire" onClick={() => setOuverte(true)}><Icone nom="reglages" taille={15} /> {t('ctr.gerer')}</button>
        <button type="button" className="btn fantome" disabled={!aTraiter} onClick={() => setConfirmer(true)}><Icone nom="eclair" taille={15} /> {t('ctr.toutRegler')}</button>
      </div>
      {ouverte && <Fenetre effectif={effectif} onFermer={() => setOuverte(false)} />}
      {confirmer && (
        <Confirmation
          titre={t('ctr.confirmerTout.titre')} message={t('ctr.confirmerTout.message')} libelleOui={t('ctr.toutRegler')}
          onNon={() => setConfirmer(false)}
          onOui={() => { setConfirmer(false); setBilan(regler({ toutRegler: true })); }}
        />
      )}
      {bilan && <Fenetre effectif={effectif} bilanInitial={bilan} onFermer={() => setBilan(null)} />}
    </section>
  );
}
