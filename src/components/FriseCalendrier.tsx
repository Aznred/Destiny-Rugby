import { texteTraduit, t } from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CALENDRIER, anneeDuCalendrier, libelleDate, libelleDateCourte, SEMAINES_PAR_SAISON, semaine } from '../data/calendrier';
import type { TypeSemaine } from '../data/calendrier';
import { Icone } from './Icone';

export interface EtapeCalendrier {
  numero: number;
  type: TypeSemaine;
  repere: string;
  resume: string;
  titre: string;
  contenu: ReactNode;
  selections: string[];
}

const MOIS = ['Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'];
const ABREGES = ['Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.', 'Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin'];

/** Une sélection consulte une date ; seuls les boutons d'avance font passer le temps. */
export function FriseCalendrier({ saison, numero, selection, onSelection, etapes, actions }: {
  saison: number;
  numero: number;
  selection: number;
  onSelection: (numero: number) => void;
  etapes: EtapeCalendrier[];
  actions: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const moisNavigation = useRef<HTMLElement>(null);
  const [recentrage, setRecentrage] = useState(0);
  const choisir = (n: number) => {
    onSelection(n);
    // Revenir au point même si l'on a défilé sans changer la sélection.
    setRecentrage((r) => r + 1);
  };
  const mois = (semaine(Math.min(selection, SEMAINES_PAR_SAISON)).mois + 5) % 12;
  const moisActuel = (semaine(numero).mois + 5) % 12;
  const suivante = selection > SEMAINES_PAR_SAISON;
  const etape = etapes.find((e) => e.numero === selection);
  const date = semaine(Math.min(selection, SEMAINES_PAR_SAISON));
  const choisirMois = (index: number) => {
    const dates = CALENDRIER.filter((s) => (s.mois + 5) % 12 === index);
    choisir((dates.find((s) => s.numero >= numero) ?? dates[0]).numero);
  };

  useEffect(() => {
    const piste = rail.current;
    const recentrer = () => {
      const cible = piste?.querySelector<HTMLButtonElement>(`[data-numero="${selection}"]`);
      const navigation = moisNavigation.current;
      const moisChoisi = navigation?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      // Ne déplacer que la frise, pas la page ni la boîte de dialogue.
      if (piste && cible) piste.scrollTo({ left: cible.offsetLeft - (piste.clientWidth - cible.offsetWidth) / 2 });
      if (navigation && moisChoisi) navigation.scrollTo({ left: moisChoisi.offsetLeft - (navigation.clientWidth - moisChoisi.offsetWidth) / 2 });
    };
    recentrer();
    const redimensionnement = new ResizeObserver(recentrer);
    if (piste) redimensionnement.observe(piste);
    return () => redimensionnement.disconnect();
  }, [selection, saison, recentrage]);

  return <div className="frise-cal">
    <div className="frise-cal-navigation">
      <span className="frise-cal-exercice">{2025 + saison} <span>—</span> {2026 + saison}</span>
      <div className="frise-cal-parcourir">
        <button type="button" className="frise-cal-aujourdhui" onClick={() => choisir(numero)}>{t("ui.f2de9e072a83")}</button>
        <button type="button" className="frise-cal-fleche" aria-label={t("ui.ce294cc82b5e")} disabled={mois === 0} onClick={() => choisirMois(mois - 1)}>‹</button>
        <button type="button" className="frise-cal-fleche" aria-label={t("ui.2e82fa5d91f4")} disabled={mois === 11} onClick={() => choisirMois(mois + 1)}>›</button>
      </div>
    </div>
    <nav ref={moisNavigation} className="frise-cal-mois" aria-label={t("ui.a378cf731a44")}>
      {MOIS.map((nom, index) => <button type="button" key={nom}
        className={`${index === mois ? 'choisi' : ''} ${index < moisActuel ? 'passe' : ''}`}
        aria-label={`${nom} ${2025 + saison + (index >= 6 ? 1 : 0)}`}
        aria-pressed={index === mois} onClick={() => choisirMois(index)}>
        {ABREGES[index]}<span className={index === moisActuel ? 'repere-present' : ''} aria-hidden="true" />
      </button>)}
    </nav>
    <div className="frise-cal-legende" aria-label={t("ui.00738344a3d6")}>
      <span className="championnat">{t("pj.championnat")}</span><span className="coupe">{t("cr.zone.Europe")}</span>
      <span className="phaseFinale">{t("ui.b44faac985d9")}</span><span className="international">{t("tb.selections")}</span>
      <small>{t("ui.46da5021323a")}</small>
    </div>
    <div ref={rail} className="frise-cal-rail" role="group" aria-label={t("ui.c9d321f8fb82")}
      onKeyDown={(e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const prochaine = e.key === 'ArrowRight' ? Math.min(SEMAINES_PAR_SAISON + 1, selection + 1)
          : e.key === 'ArrowLeft' ? Math.max(1, selection - 1)
          : e.key === 'Home' ? 1 : e.key === 'End' ? SEMAINES_PAR_SAISON + 1 : null;
        if (prochaine == null) return;
        e.preventDefault();
        choisir(prochaine);
        rail.current?.querySelector<HTMLButtonElement>(`[data-numero="${prochaine}"]`)?.focus({ preventScroll: true });
      }}>
      {etapes.map((e) => <button type="button" key={e.numero} data-numero={e.numero}
        className={`frise-cal-etape ${e.type}${e.numero === selection ? ' choisie' : ''}${e.numero < numero ? ' passee' : ''}${e.numero === numero ? ' actuelle' : ''}`}
        aria-label={`${libelleDate(semaine(e.numero))} · ${texteTraduit(e.titre)}${e.selections.length ? ' · Sélections' : ''}`}
        aria-pressed={e.numero === selection} aria-current={e.numero === numero ? 'date' : undefined}
        tabIndex={e.numero === selection ? 0 : -1} onClick={() => choisir(e.numero)}>
        <span className="frise-cal-statut">{e.numero === numero ? t("ui.f2de9e072a83") : e.numero < numero ? t("ui.9d06aa301cb5") : t("ui.b5b639fee97d", { v0: e.numero })}</span>
        <b className="frise-cal-jour">{libelleDateCourte(semaine(e.numero))}</b>
        <span className="frise-cal-ligne" aria-hidden="true"><i /></span>
        <span className="frise-cal-evenement"><strong>{e.repere}</strong><span>{e.resume}</span>
          {e.selections.length > 0 && <small><Icone nom="monde" taille={12} />{t("tb.selections")}</small>}
        </span>
      </button>)}
      <button type="button" data-numero={SEMAINES_PAR_SAISON + 1}
        className={`frise-cal-etape phaseFinale${suivante ? ' choisie' : ''}`}
        tabIndex={suivante ? 0 : -1} aria-pressed={suivante} onClick={() => choisir(SEMAINES_PAR_SAISON + 1)}>
        <span className="frise-cal-statut">{t("ui.3fd2f0bea29e")}</span><b className="frise-cal-jour">{t("ui.6cfb17e52f09")}</b>
        <span className="frise-cal-ligne" aria-hidden="true"><i /></span>
        <span className="frise-cal-evenement"><strong>{t("ui.9266007e4870", { v0: saison + 1 })}</strong><span>{t("ui.316c119fb3ee")}</span></span>
      </button>
    </div>
    <div className="frise-cal-detail">
      <div className="frise-cal-programme" aria-live="polite" aria-atomic="true">
        <span className="frise-cal-surtitre">{suivante ? t("ui.0c9726b188d4") : selection === numero ? t("ui.f2de9e072a83") : selection < numero ? t("ui.81a8e2355653") : t("ui.1f664bbd564a")}</span>
        <h3>{suivante ? t("ui.9266007e4870", { v0: saison + 1 }) : libelleDate(date)} <small>{anneeDuCalendrier(saison + (suivante ? 1 : 0), suivante ? 7 : date.mois)}</small></h3>
        <b className="frise-cal-titre">{texteTraduit(etape?.titre ?? t("ui.dae93adb66d5"))}</b>
        <div className="frise-cal-rencontres">{etape?.contenu ?? <span>{t("ui.2594d77c0629")}</span>}</div>
        {!!etape?.selections.length && <div className="frise-cal-selections"><span><Icone nom="monde" taille={14} />{t("tb.selections")}</span>
          {etape.selections.map((nom) => <small key={nom}>{nom}</small>)}
        </div>}
      </div>
      <div className="frise-cal-actions">{actions}</div>
    </div>
  </div>;
}
