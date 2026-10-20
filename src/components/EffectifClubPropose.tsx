import { useState } from 'react';
import { t, texteTraduit } from '../lib/i18n';
import { POSTES, POSTE_PAR_ID } from '../data/rugby';
import { carteNormaleVide, compositionClubPropose, joueurDuClubPropose, MAX_JOUEURS_CLUB_PROPOSE, titulariserJoueurClubPropose, validerCarteNormale } from '../lib/cartesNormales';
import type { PropositionClub, SaisieCarteNormale } from '../lib/cartesNormales';
import { rareteCarriere, statistiquesCarte } from '../lib/ligue/catalogueCarriere';
import { FormulaireCarteNormale } from './FormulaireCarteNormale';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { Icone } from './Icone';

const LIGNES_XV = [[15], [11, 12, 13, 14], [9, 10], [6, 8, 7], [4, 5], [1, 2, 3]];

export function EffectifClubPropose({ club, changer, occupe = false, onEdition }: {
  club: PropositionClub; changer?: (joueurs: SaisieCarteNormale[]) => void;
  occupe?: boolean; onEdition?: (ouverte: boolean) => void;
}) {
  const [edition, setEdition] = useState<{ index: number | null; joueur: SaisieCarteNormale } | null>(null);
  const [preparation, setPreparation] = useState(false);
  const [erreur, setErreur] = useState('');
  const { titulaires, remplacants } = compositionClubPropose(club.joueurs);
  const fermer = () => { setEdition(null); setErreur(''); onEdition?.(false); };
  const ouvrir = (index: number | null, poste = POSTES[0].id) => {
    if (!changer || occupe || preparation || (index === null && club.joueurs.length >= MAX_JOUEURS_CLUB_PROPOSE)) return;
    setEdition({ index, joueur: index === null ? { ...carteNormaleVide(), poste } : { ...club.joueurs[index] } });
    setErreur(''); onEdition?.(true);
  };
  const valider = () => {
    if (!edition || !changer) return;
    try {
      const joueur = validerCarteNormale(joueurDuClubPropose(edition.joueur, club));
      const suivants = [...club.joueurs];
      if (edition.index === null) suivants.push(joueur); else suivants[edition.index] = joueur;
      changer(suivants); fermer();
    } catch (e) { setErreur((e as Error).message); }
  };
  return <section className="cn-effectif-club" aria-label={t('contributionCarte.effectif')}>
    <header className="cn-effectif-entete">
      <div><h3>{t('contributionCarte.effectif')}</h3><p role="status">{t('contributionCarte.effectifCompteur', {n: club.joueurs.length, max: MAX_JOUEURS_CLUB_PROPOSE, xv: titulaires.length, banc: remplacants.length})}</p></div>
      {changer && <button type="button" className="btn secondaire" disabled={occupe || !!edition || club.joueurs.length >= MAX_JOUEURS_CLUB_PROPOSE} onClick={() => ouvrir(null)}><Icone nom="ajouter" taille={16} /> {t('contributionCarte.ajouterJoueur')} </button>}
    </header>
    <p>{t('contributionCarte.effectifAide')}</p>
    <div className="cn-terrain-proposition" aria-label={t('contributionCarte.xvPropose')}>
      {LIGNES_XV.map((ligne, i) => <div className={`cn-ligne-xv${ligne.length === 4 ? ' cn-ligne-xv-quatre' : ''}`} key={i}>
        {ligne.map(numero => {
          const poste = POSTES.find(p => p.numero === numero)!;
          const index = titulaires.find(index => club.joueurs[index].poste === poste.id);
          const joueur = index === undefined ? undefined : club.joueurs[index];
          return <button type="button" key={numero} className={joueur ? 'renseigne' : ''}
            disabled={!changer || occupe || preparation || !!edition || (!joueur && club.joueurs.length >= MAX_JOUEURS_CLUB_PROPOSE)}
            aria-label={t(joueur ? 'contributionCarte.modifierPoste' : 'contributionCarte.ajouterPoste', {numero, poste: texteTraduit(poste.nom), nom: joueur?.nom})}
            onClick={() => ouvrir(index ?? null, poste.id)}>
            <b>{numero}</b><span>{joueur?.nom || t('contributionCarte.libre')}</span><small>{texteTraduit(poste.nom)}</small>
          </button>;
        })}
      </div>)}
    </div>
    {edition && <div className="cn-nouveau-joueur-formulaire">
      <h4>{edition.index === null ? t('contributionCarte.ajouterJoueur') : t('contributionCarte.modifier', {nom: club.joueurs[edition.index].nom})}</h4>
      <p>{club.nom || t('contributionCarte.clubPropose')} · {texteTraduit(club.division)} — {t('contributionCarte.portraitBlason')}</p>
      <FormulaireCarteNormale carte={joueurDuClubPropose(edition.joueur, club)} clubFixe={club}
        changer={joueur => setEdition({ ...edition, joueur })} occupe={occupe} onPreparation={setPreparation} />
      {erreur && <p role="alert">{texteTraduit(erreur)}</p>}
      <div className="cn-actions"><button type="button" className="btn primaire" disabled={occupe || preparation} onClick={valider}>{t(edition.index === null ? 'contributionCarte.ajouterEffectif' : 'contributionCarte.enregistrerJoueur')}</button>
        <button type="button" className="btn fantome" disabled={preparation} onClick={fermer}> {t('contributionCarte.annuler')} </button></div>
    </div>}
    {club.joueurs.length > 0 && <div className="cn-joueurs-grille">
      {club.joueurs.map((source, index) => {
        const joueur = joueurDuClubPropose(source, club);
        const famille = POSTE_PAR_ID[joueur.poste].famille;
        const id = `club-propose-${index}`;
        return <article className="cn-joueur-carte-mini" key={index}>
          <header><b>{joueur.nom}</b><small>{remplacants.includes(index) ? t('contributionCarte.remplacant') : t('contributionCarte.xvNumero', {n: POSTE_PAR_ID[joueur.poste].numero})}</small></header>
          <div className="cn-mini-apercu-carte"><CarteJoueurEnLigne logoClub={club.logo} carte={{ ...joueur, id, sourceId: id, famille,
            origine: 'professionnel', rarete: rareteCarriere(joueur.note), statistiques: statistiquesCarte(joueur.note, famille, id),
            proprietaire: null, fatigue: 0, matchs: 0, essais: 0, clubs: [] }} /></div>
          {changer && <div className="cn-actions">
            {remplacants.includes(index) && <button type="button" className="btn secondaire petit" disabled={occupe || !!edition} onClick={() => changer(titulariserJoueurClubPropose(club.joueurs, index))}>{t('contributionCarte.titulariser', {nom: joueur.nom})}</button>}
            <button type="button" className="btn fantome petit" disabled={occupe || !!edition} onClick={() => ouvrir(index)}>{t('contributionCarte.modifier', {nom: joueur.nom})}</button>
            <button type="button" className="btn fantome petit" disabled={occupe || !!edition} onClick={() => changer(club.joueurs.filter((_, i) => i !== index))} aria-label={t('contributionCarte.retirerJoueur', {nom: joueur.nom})}><Icone nom="croix" taille={14} /></button></div>}
        </article>;
      })}
    </div>}
    {club.joueurs.length === 0 && <p className="cn-effectif-vide">{t('contributionCarte.effectifVide')}</p>}
  </section>;
}
