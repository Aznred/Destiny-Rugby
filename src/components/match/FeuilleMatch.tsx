// LA FEUILLE DE MATCH — tout ce que le moteur a compté, à la sirène.
//
// ⚠️ Retour de jeu : « en match on a pas accès à tous les stats ». Le moteur
// tient VINGT-TROIS compteurs par joueur (`StatsMatch`, moteur/entites.ts) et la
// feuille n'en montrait que cinq — mètres, plaquages, essais, passes, minutes.
// Autant dire que le match d'un avant était invisible : ni mêlée, ni touche, ni
// pick and go, ni grattage.
//
// ⚠️ ET ON NE FAIT PAS UN TABLEAU DE VINGT-TROIS COLONNES. Sur un téléphone de
// 375 px, c'est illisible, et sur ordinateur ça ne se lit pas mieux. On range
// par FAMILLE — comme les classements de l'écran Résultats — et on bascule d'un
// clic. Chaque colonne dit à quoi elle correspond au survol.

import { useState } from 'react';
import { Icone } from '../Icone';
import type { NomIcone } from '../Icone';
import type { BilanMatch } from '../../lib/moteur/moteur';
import type { EtatMatch } from '../../lib/moteur/etat';
import type { StatsMatch } from '../../lib/moteur/entites';
import type { PostNote } from '../../lib/moteur/apresMatch';
import { motifTraduit } from '../../lib/moteur/commentaire';
import { POSTE_PAR_ID } from '../../data/rugby';
import { t } from '../../lib/i18n';

interface ColonneFeuille {
  cle: string;
  entete: string;
  titreCle: string;
  valeur: (s: StatsMatch) => number;
}

const VUES_FEUILLE: { id: string; nomCle: string; icone: NomIcone; colonnes: ColonneFeuille[] }[] = [
  {
    id: 'general', nomCle: 'ml.vue.general', icone: 'journal' as const,
    colonnes: [
      { cle: 'metres', entete: 'm', titreCle: 'ml.stat.metres', valeur: (s) => s.metres },
      { cle: 'plaquages', entete: 'plq', titreCle: 'ml.stat.plaquages', valeur: (s) => s.plaquages },
      { cle: 'essais', entete: 'ess', titreCle: 'ml.stat.essais', valeur: (s) => s.essais },
      { cle: 'passes', entete: 'pas', titreCle: 'ml.stat.passes', valeur: (s) => s.passes },
    ],
  },
  {
    id: 'attaque', nomCle: 'ml.vue.attaque', icone: 'eclair' as const,
    colonnes: [
      { cle: 'courses', entete: 'crs', titreCle: 'ml.stat.courses', valeur: (s) => s.courses },
      { cle: 'franchissements', entete: 'frn', titreCle: 'ml.stat.franchissements', valeur: (s) => s.franchissements },
      { cle: 'offloads', entete: 'off', titreCle: 'ml.stat.offloads', valeur: (s) => s.offloads },
      { cle: 'passesDecisives', entete: 'p.d', titreCle: 'ml.stat.passesDecisives', valeur: (s) => s.passesDecisives },
      { cle: 'passesRatees', entete: 'en-av', titreCle: 'ml.stat.passesRatees', valeur: (s) => s.passesRatees },
    ],
  },
  {
    id: 'defense', nomCle: 'ml.vue.defense', icone: 'bouclier' as const,
    colonnes: [
      { cle: 'plaquages', entete: 'plq', titreCle: 'ml.stat.plaquages', valeur: (s) => s.plaquages },
      { cle: 'plaquagesManques', entete: 'mqs', titreCle: 'ml.stat.plaquagesManques', valeur: (s) => s.plaquagesManques },
      { cle: 'grattages', entete: 'grt', titreCle: 'ml.stat.grattages', valeur: (s) => s.grattages },
      { cle: 'rucksNettoyes', entete: 'rck', titreCle: 'ml.stat.rucksNettoyes', valeur: (s) => s.rucksNettoyes },
    ],
  },
  {
    id: 'conquete', nomCle: 'ml.vue.conquete', icone: 'poignee' as const,
    colonnes: [
      { cle: 'melees', entete: 'mêl', titreCle: 'ml.stat.melees', valeur: (s) => s.melees },
      { cle: 'touchesGagnees', entete: 'tch', titreCle: 'ml.stat.touchesGagnees', valeur: (s) => s.touchesGagnees },
      { cle: 'pickAndGo', entete: 'p&g', titreCle: 'ml.stat.pickAndGo', valeur: (s) => s.pickAndGo },
    ],
  },
  {
    id: 'pied', nomCle: 'ml.vue.pied', icone: 'cible' as const,
    colonnes: [
      { cle: 'coupsDePied', entete: 'cdp', titreCle: 'ml.stat.coupsDePied', valeur: (s) => s.coupsDePied },
      { cle: 'metresAuPied', entete: 'm/p', titreCle: 'ml.stat.metresAuPied', valeur: (s) => s.metresAuPied },
      { cle: 'cinquanteVingtDeux', entete: '50/22', titreCle: 'ml.stat.cinquanteVingtDeux', valeur: (s) => s.cinquanteVingtDeux },
      { cle: 'buts', entete: 'buts', titreCle: 'ml.stat.buts', valeur: (s) => s.butsReussis },
      { cle: 'butsTentes', entete: 'tent', titreCle: 'ml.stat.butsTentes', valeur: (s) => s.butsTentes },
    ],
  },
  {
    id: 'discipline', nomCle: 'ml.vue.discipline', icone: 'carton' as const,
    colonnes: [
      { cle: 'cartonsJaunes', entete: 'CJ', titreCle: 'ml.stat.cartonsJaunes', valeur: (s) => s.cartonsJaunes },
      { cle: 'cartonsRouges', entete: 'CR', titreCle: 'ml.stat.cartonsRouges', valeur: (s) => s.cartonsRouges },
      { cle: 'plaquagesManques', entete: 'mqs', titreCle: 'ml.stat.plaquagesManques', valeur: (s) => s.plaquagesManques },
      { cle: 'distance', entete: 'km', titreCle: 'ml.stat.distance', valeur: (s) => s.distanceParcourue / 1000 },
    ],
  },
];

export function FeuilleMatch({
  e, stats, maNote,
}: {
  e: EtatMatch;
  stats: BilanMatch;
  maNote: { note: number; detail: PostNote[] } | null;
}) {
  // Quelle famille de statistiques la feuille affiche (voir VUES_FEUILLE).
  const [vueFeuille, setVueFeuille] = useState<string>('general');
  const colonnes = (VUES_FEUILLE.find((v) => v.id === vueFeuille) ?? VUES_FEUILLE[0]).colonnes;
  // La grille suit le nombre de colonnes : numéro, nom, les stats, les minutes.
  // ⚠️ `minmax(74px, 1fr)` SUR LE NOM, PAS `1fr`. Mesuré en jeu : avec cinq
  // colonnes de statistiques (vue « Pied »), les largeurs fixes consommaient
  // exactement la place disponible et la colonne du nom tombait à **0 px** —
  // une feuille de match sans noms. Le plancher la force à déborder, et le bloc
  // défile alors horizontalement DANS son conteneur (`.ml-bilan-groupe`) :
  // c'est la règle du projet pour les tableaux larges, la page ne part jamais
  // de côté.
  const grilleColonnes = `26px minmax(74px, 1fr) ${colonnes.map(() => '38px').join(' ')} 38px`;

  return (
    <div className="ml-fil ml-feuille">
      <div className="ml-resume">
        <span><Icone nom="ballon" taille={13} /> {stats.essaisA} - {stats.essaisB} {t('ml.essais')}</span>
        <span><Icone nom="poignee" taille={13} /> {e.compteurs.rucks} {t('ml.rucks')}</span>
        <span><Icone nom="equipe" taille={13} /> {e.compteurs.touches} {t('ml.touches')}</span>
        <span><Icone nom="halteres" taille={13} /> {e.compteurs.melees} {t('ml.melees')}</span>
        <span><Icone nom="eclair" taille={13} /> {e.compteurs.percees} {t('ml.percees')}</span>
      </div>

      {/* ⚠️ LA SANCTION EST ANNONCÉE ICI, PAS SEULEMENT DANS LE JOURNAL.
          Une suspension de quinze semaines découverte trois écrans plus loin,
          entre deux lignes de bilan, c'est une punition qui tombe du ciel. Elle
          s'affiche donc au moment exact où le joueur referme le match qui l'a
          provoquée. */}
      {(stats.discipline.citation || stats.discipline.blessure) && (
        <div className="ml-sanction">
          <b><Icone nom="institution" taille={15} /> {t('ml.sanction.titre')}</b>
          {stats.discipline.citation && (
            <p>{t('ml.sanction.suspension', {
              n: stats.discipline.citation.semaines,
              // Le moteur travaille en français : on traduit le motif avec la
              // même table que les pénalités.
              motif: motifTraduit(stats.discipline.citation.motif),
            })}</p>
          )}
          {stats.discipline.blessure && (
            <p><Icone nom="soin" taille={14} /> {stats.discipline.blessure.nom} : {t('ml.sanction.semaines', {
              n: stats.discipline.blessure.semaines,
            })}</p>
          )}
        </div>
      )}

      {/* ═══ MA NOTE, ET D'OÙ ELLE VIENT ═══════════════════════════════════
          ⚠️ Retour de jeu : « notre joueur est jugé que sur plaquage, mètres
          parcourus et essai, ce qui est dommage ». Le barème en regarde quinze
          depuis longtemps — mais rien ne le montrait, et le résumé ne citait
          que ces trois-là. Ici, chaque ligne du barème est affichée avec ce
          qu'elle a rapporté ou coûté ; c'est `detailNote` qui les produit, la
          fonction que `noterMatch` additionne, donc ce qu'on lit EST la note. */}
      {maNote && (
        <details className="ml-ma-note" open>
          <summary>
            <Icone nom="etoile" taille={14} /> {t('ml.maNote')} : <b>{maNote.note}/10</b>
            <span> · {t('ml.noteExplication')}</span>
          </summary>
          <div className="ml-note-detail">
            {maNote.detail.map((l) => (
              <div key={l.cle} className="ml-note-ligne">
                <span>{t(l.cle, l.variables)}</span>
                <b data-signe={l.points > 0 ? 'plus' : l.points < 0 ? 'moins' : undefined}>
                  {l.points > 0 ? '+' : ''}{Math.round(l.points * 10) / 10}
                </b>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="cats-stats ml-vues">
        {VUES_FEUILLE.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`chip-cat${vueFeuille === v.id ? ' actif' : ''}`}
            onClick={() => setVueFeuille(v.id)}
          >
            <Icone nom={v.icone} taille={14} /> {t(v.nomCle)}
          </button>
        ))}
      </div>
      {[e.clubA, e.clubB].map((club) => (
        <div key={club} className="ml-bilan-groupe">
          <div className="ml-bilan-tete"><Icone nom="journal" taille={14} /> {club}</div>
          <div className="ml-bilan-entete" style={{ gridTemplateColumns: grilleColonnes }}>
            <span /><span>{t('ml.joueur')}</span>
            {colonnes.map((c) => <span key={c.cle} title={t(c.titreCle)}>{c.entete}</span>)}
            <span>min</span>
          </div>
          {stats.parJoueur
            .filter((j) => j.club === club)
            .sort((a, b) => a.numero - b.numero)
            .map((j) => (
              <div
                key={`${j.club}-${j.numero}-${j.nom}`}
                className="ml-bilan-ligne"
                style={{ gridTemplateColumns: grilleColonnes }}
                data-moi={j.moi ? 'oui' : undefined}
                /* Les maillots 16 à 23 sont le banc : on les distingue. */
                data-banc={j.numero > 15 ? 'oui' : undefined}
              >
                <span className="ml-bilan-num" title={POSTE_PAR_ID[j.poste]?.nom}>{j.numero}</span>
                <span className="ml-bilan-nom">{j.nom}</span>
                {colonnes.map((c) => {
                  const v = c.valeur(j.stats);
                  return <span key={c.cle}>{v ? Math.round(v * 10) / 10 : '-'}</span>;
                })}
                <span>{j.minutes}′</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
