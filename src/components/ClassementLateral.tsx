// LE CLASSEMENT, TOUJOURS SOUS LES YEUX
//
// Demande explicite : pas de bouton à cliquer pour voir où en est son club —
// le classement vit en permanence sur le côté de l'écran de carrière, et se met
// à jour journée après journée.
//
// ⚠️ IL SUIT LA COMPÉTITION DE LA SEMAINE. Il affichait TOUJOURS le championnat,
// même un week-end de Coupe d'Europe ou de Tournoi des 6 Nations : pendant huit
// semaines de la saison, le panneau montrait un classement qui ne bougeait pas
// pendant qu'on jouait ailleurs. Désormais :
//   · semaine de coupe   → la POULE européenne du club, s'il y est engagé ;
//   · fenêtre internationale → le classement de la compétition de SA sélection ;
//   · le reste du temps  → son championnat.
// Les divisions amateurs, elles, jouent leur championnat toute l'année
// (`estAmateur`) : pour elles, rien ne change.

import { useMemo } from 'react';
import { LogoCompet } from './LogoCompet';
import { useGame, bonusClubDuJoueur } from '../store/useGame';
import {
  championnatEnDirect, estAmateur, journeesALaSemaine, nombreJournees,
} from '../lib/championnat';
import { phaseFinale } from '../lib/phaseFinale';
import { coupeEnDirect, coupesDuClub } from '../lib/coupe';
import {
  fenetreInternationale, internationalEnDirect, journeesInternationalesA,
} from '../lib/international';
import { COMPETITIONS, clubParNom } from '../data/clubs';
import { Blason, LogoEquipe } from './Blason';
import { nomNation } from '../lib/nations';
import { semaine, CALENDRIER, libelleSemaine } from '../data/calendrier';
import { t } from '../lib/i18n';
import type { Joueur } from '../types';
import type { LigneTableau } from '../lib/championnat';
import { Icone } from './Icone';

// Nombre de semaines d'un type donné déjà passées avant celle-ci.
function passees(numero: number, type: string): number {
  return CALENDRIER.slice(0, Math.max(0, numero - 1)).filter((s) => s.type === type).length;
}

const TOUR_TERMINE: Record<string, number> = { barrage: 1, quart: 1, demie: 2, finale: 3, accession: 4 };

interface Vue {
  titre: string;
  logo?: string;      // id de compétition pour <LogoCompet>
  emoji?: string;
  sousTitre: string;  // « J7/26 », « Poule B », « 6 Nations »
  classement: LigneTableau[];
  /** true = des équipes nationales, pas des clubs (pas de blason de club). */
  nations: boolean;
  moi: string;        // la ligne à surligner
  pied: { domicile: string; scoreD: number; scoreE: number; exterieur: string } | null;
  phase: { libelle: string; domicile: string; scoreD: number; scoreE: number; exterieur: string }[];
}

export function ClassementLateral({ joueur }: { joueur: Joueur }) {
  const setEcran = useGame((s) => s.setEcran);
  const division = joueur.division;

  const vue = useMemo<Vue | null>(() => {
    if (!division) return null;
    const numero = joueur.semaine ?? 1;
    const sem = semaine(numero);
    const bonus = bonusClubDuJoueur(joueur);
    const saison = joueur.saison;
    // En bas de la pyramide, on joue le championnat TOUS les week-ends : le
    // panneau ne bascule jamais sur une coupe d'Europe qu'on ne dispute pas.
    const amateur = estAmateur(division);

    // ---- FENÊTRE INTERNATIONALE : le classement de MA sélection ----
    if (!amateur && sem.type === 'international') {
      const nation = nomNation(joueur.nation);
      const fenetre = fenetreInternationale(numero, joueur.saison, nation);
      if (fenetre && fenetre.competition.equipes.includes(nation)) {
        const id = fenetre.competition.id;
        const etat = internationalEnDirect(
          id, joueur.saison, journeesInternationalesA(id, numero, joueur.saison),
          { nation, bonus },
        );
        if (etat) {
          const derniere = etat.journees[etat.journees.length - 1] ?? [];
          const notre = derniere.find((m) => m.domicile === nation || m.exterieur === nation);
          return {
            titre: etat.nom,
            logo: etat.id,
            emoji: etat.emoji,
            sousTitre: `J${Math.min(etat.journeesJouees, etat.totalJournees)}/${etat.totalJournees}`,
            classement: etat.classement,
            nations: true,
            moi: nation,
            pied: notre ?? null,
            phase: [],
          };
        }
      }
    }

    // ---- SEMAINE DE COUPE D'EUROPE : la poule de MON club ----
    if (!amateur && sem.type === 'coupe') {
      const mienne = coupesDuClub(joueur.club, joueur.saison)[0];
      if (mienne) {
        const etat = coupeEnDirect(mienne, joueur.saison, joueur.club, passees(numero, 'coupe'));
        const poule = etat?.poules.find((p) => p.clubs.includes(joueur.club));
        if (etat && poule) {
          const derniere = poule.journees[poule.journees.length - 1] ?? [];
          const notre = derniere.find((m) => m.domicile === joueur.club || m.exterieur === joueur.club);
          return {
            titre: etat.nom,
            logo: etat.id,
            emoji: etat.emoji,
            sousTitre: `${poule.nom} · J${etat.journeesJouees}/${etat.totalJournees}`,
            classement: poule.classement,
            nations: false,
            moi: joueur.club,
            pied: notre ?? null,
            phase: etat.bracket
              .filter((m) => TOUR_TERMINE[m.tour] <= Math.max(0, passees(numero, 'coupe') - etat.totalJournees))
              .map((m) => ({
              libelle: m.libelle, domicile: m.domicile, scoreD: m.scoreD,
              scoreE: m.scoreE, exterieur: m.exterieur,
              })),
          };
        }
      }
    }

    // ---- LE RESTE DU TEMPS : son championnat ----
    const total = nombreJournees(division, joueur.club);
    const jouees = journeesALaSemaine(division, numero, total);
    const champ = championnatEnDirect(division, saison, joueur.club, jouees, bonus);
    const phase = jouees >= total ? phaseFinale(division, saison, joueur.club, bonus) : null;
    const derniere = champ.journees[champ.journees.length - 1] ?? [];
    const notre = derniere.find((m) => m.domicile === joueur.club || m.exterieur === joueur.club);
    const competition = COMPETITIONS.find((c) => c.id === division);
    return {
      titre: competition?.nom ?? 'Championnat',
      logo: competition?.id,
      emoji: competition?.emoji,
      sousTitre: `J${Math.min(jouees, total)}/${total}`,
      classement: champ.classement,
      nations: false,
      moi: joueur.club,
      pied: notre ?? null,
      phase: (phase?.matchs ?? [])
        .filter((m) => TOUR_TERMINE[m.tour] <= passees(numero, 'phaseFinale'))
        .map((m) => ({
        libelle: m.libelle, domicile: m.domicile, scoreD: m.scoreD,
        scoreE: m.scoreE, exterieur: m.exterieur,
        })),
    };
  }, [division, joueur]);

  if (!division || !vue) return null;
  const sem = semaine(joueur.semaine ?? 1);

  return (
    <aside
      id="carriere-classement"
      className="carte classement-lateral"
      onClick={() => setEcran('tableau')}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setEcran('tableau');
        }
      }}
      title={t('cl.voirTout')}
      role="button"
      tabIndex={0}
      aria-label={t('cl.voirTout')}
    >
      <div className="cl-lat-tete">
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <LogoCompet id={vue.logo} taille={18} /> {t('cl.titre')}
          </div>
          <b>{vue.titre}</b>
        </div>
        <span className="cl-lat-journee">{vue.sousTitre}</span>
      </div>

      <div className="cl-lat-grille">
        {vue.classement.map((l) => {
          const club = vue.nations ? undefined : clubParNom(l.club);
          const moi = l.club === vue.moi;
          return (
            <div key={l.club} className="cl-lat-ligne" data-moi={moi ? 'oui' : undefined}>
              <span className="cl-lat-pos" data-tete={l.position <= 6 ? 'oui' : undefined}>
                {l.position}
              </span>
              {/* ⚠️ Les sélections n'ont pas de fiche club : leur écusson vient
                  de `LOGO_PAR_EQUIPE` via <LogoEquipe>. */}
              {vue.nations
                ? <LogoEquipe nom={l.club} taille={16} />
                : club ? <Blason club={club} taille={16} /> : <span />}
              <span className="cl-lat-nom">{l.club}</span>
              <span className="cl-lat-j">{l.joues}</span>
              <span className="cl-lat-pts">{l.points}</span>
            </div>
          );
        })}
      </div>

      {vue.phase.length ? (
        <div className="cl-lat-pied">
          <div className="eyebrow" style={{ marginBottom: '0.3rem' }}><Icone nom="flamme" taille={14} /> {t('cl.phaseFinale')}</div>
          {vue.phase.map((m) => (
            <div
              key={m.libelle}
              className="cl-lat-affiche"
              data-moi={m.domicile === vue.moi || m.exterieur === vue.moi ? 'oui' : undefined}
            >
              <span>{m.domicile}</span>
              <b>{m.scoreD}-{m.scoreE}</b>
              <span>{m.exterieur}</span>
            </div>
          ))}
        </div>
      ) : vue.pied ? (
        <div className="cl-lat-pied">
          <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>{t('cl.dernierMatch')}</div>
          <div className="cl-lat-affiche" data-moi="oui">
            <span>{vue.pied.domicile}</span>
            <b>{vue.pied.scoreD}-{vue.pied.scoreE}</b>
            <span>{vue.pied.exterieur}</span>
          </div>
          <div className="cl-lat-note">{libelleSemaine(sem, joueur.saison)}</div>
        </div>
      ) : (
        <div className="cl-lat-pied">
          <div className="cl-lat-note">{libelleSemaine(sem, joueur.saison)}</div>
        </div>
      )}
    </aside>
  );
}
