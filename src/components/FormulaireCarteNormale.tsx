import { useMemo, useState } from 'react';
import { POSTES, POSTE_PAR_ID } from '../data/rugby';
import { Selecteur } from './Selecteur';
import { Blason } from './Blason';
import type { OptionSelecteur } from './Selecteur';
import { CarteJoueurEnLigne } from './CarteJoueurEnLigne';
import { rareteCarriere, statistiquesCarte } from '../lib/ligue/catalogueCarriere';
import { preparerPortrait } from '../lib/imagesJoueurs';
import type { PropositionClub, SaisieCarteNormale } from '../lib/cartesNormales';
import { championnatCarteNormale, championnatsCarteNormale, clubsCarteNormale, choisirChampionnatCarte, choisirClubCarte, changerGenreCarte } from '../lib/clubsCarteNormale';
import './CartesNormales.css';

export function FormulaireCarteNormale({ carte, changer, occupe = false, onPreparation, clubFixe }: {
  carte: SaisieCarteNormale; changer: (carte: SaisieCarteNormale) => void; occupe?: boolean; onPreparation?: (occupe: boolean) => void;
  clubFixe?: Pick<PropositionClub, 'nom' | 'division' | 'pays' | 'logo'>;
}) {
  const [erreur, setErreur] = useState('');
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const champ = <K extends keyof SaisieCarteNormale,>(cle: K, valeur: SaisieCarteNormale[K]) => changer({ ...carte, [cle]: valeur });
  const famille = POSTE_PAR_ID[carte.poste].famille;
  const competition = championnatCarteNormale(carte);
  const championnatId = competition?.id ?? (carte.championnat ? 'actuel' : '');
  const clubs = clubsCarteNormale(carte.gender);
  const clubActuel = clubs.find(c => c.club.nom === carte.clubReel && c.competition.nom === carte.championnat);
  const clubId = clubActuel?.id ?? (carte.clubReel ? 'actuel' : '');
  const optionsChampionnats = useMemo<OptionSelecteur[]>(() => [
    { valeur: '', label: 'Choisir un championnat' },
    ...(!competition && carte.championnat ? [{ valeur: 'actuel', label: carte.championnat, sous: carte.pays }] : []),
    ...championnatsCarteNormale(carte.gender).map(c => ({ valeur: c.id, label: c.nom, sous: c.pays })),
  ], [carte.gender, carte.championnat, carte.pays, competition]);
  const optionsClubs = useMemo<OptionSelecteur[]>(() => [
    { valeur: '', label: 'Choisir un club' },
    ...(!clubActuel && carte.clubReel ? [{ valeur: 'actuel', label: carte.clubReel, sous: carte.championnat }] : []),
    ...clubs.filter(c => !competition || c.competition.id === competition.id).map(c => ({
      valeur: c.id, label: c.club.nom, sous: `${c.competition.nom} · ${c.competition.pays}`,
      vignette: <Blason club={c.club} taille={26} />,
    })),
  ], [clubs, competition, clubActuel, carte.clubReel, carte.championnat]);
  return <div className="cn-formulaire">
    <fieldset disabled={occupe || photoEnCours}>
      <legend>Informations de la carte</legend>
      <label>Prénom et nom<input required maxLength={80} value={carte.nom} onChange={e => champ('nom',e.target.value)} /></label>
      <div className="cn-champs">
        <label>Joueur ou joueuse<Selecteur valeur={carte.gender} options={[{valeur:'male',label:'Joueur'},{valeur:'female',label:'Joueuse'}]} onChange={v => changer(changerGenreCarte(carte,v as SaisieCarteNormale['gender']))} /></label>
        <label>Poste<Selecteur valeur={carte.poste} options={POSTES.map(p => ({valeur:p.id,label:p.nom}))} onChange={v => champ('poste',v as SaisieCarteNormale['poste'])} /></label>
        {(['note','potentiel','age'] as const).map(cle => <label key={cle}>{cle === 'note' ? 'Général' : cle === 'potentiel' ? 'Potentiel' : 'Âge'}<input required type="number" min={cle === 'age' ? 18 : 20} max={cle === 'age' ? 50 : 99} value={carte[cle]} onChange={e => changer({ ...carte,[cle]:Number(e.target.value),...(cle === 'note' && Number(e.target.value) > carte.potentiel ? {potentiel:Number(e.target.value)} : {}) })} /></label>)}
        <label>Nation<input required maxLength={80} value={carte.nation} onChange={e => champ('nation',e.target.value)} /></label>
        {!clubFixe && <><label>Championnat<Selecteur valeur={championnatId} options={optionsChampionnats} recherche onChange={id => changer(choisirChampionnatCarte(carte,id))} /></label>
        <label>Club<Selecteur valeur={clubId} options={optionsClubs} recherche onChange={id => changer(choisirClubCarte(carte,id))} /><small>{competition ? 'Clubs du championnat choisi.' : 'Choisis un club : son championnat sera rempli automatiquement.'}</small></label>
        <label>Pays du championnat<input required maxLength={80} readOnly={!!competition} value={carte.pays} onChange={e => champ('pays',e.target.value)} /></label></>}
      </div>
      <label>Adresse de la photo<input type="url" placeholder="https://… (facultatif)" value={carte.photo?.startsWith('https:') ? carte.photo : ''} onChange={e => champ('photo',e.target.value || undefined)} /></label>
      <label>Importer une photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
        const fichier = e.target.files?.[0]; e.target.value = ''; if (!fichier) return;
        setPhotoEnCours(true); onPreparation?.(true); setErreur('');
        void (async () => {
          for (const taille of [320,240,160]) { const photo = await preparerPortrait(fichier,taille); if (photo.length <= 90_000) { changer({...carte,photo}); return; } }
          throw new Error('Choisis une photo moins volumineuse.');
        })().catch(e => setErreur((e as Error).message)).finally(() => { setPhotoEnCours(false); onPreparation?.(false); });
      }} /></label>
      {carte.photo && <button type="button" className="btn fantome" onClick={() => champ('photo',undefined)}>Retirer la photo proposée</button>}
      {photoEnCours && <p role="status">Préparation de la photo…</p>}{erreur && <p role="alert">{erreur}</p>}
    </fieldset>
    {carte.nom.trim() && <aside className="cn-apercu"><CarteJoueurEnLigne logoClub={clubFixe?.logo} carte={{ ...carte, id:'apercu-normale',sourceId:'apercu-normale',famille,
      origine:'professionnel',rarete:rareteCarriere(carte.note),statistiques:statistiquesCarte(carte.note,famille,'apercu-normale'),
      proprietaire:null,fatigue:0,matchs:0,essais:0,clubs:[] }} /><small>Aperçu de la carte normale</small></aside>}
  </div>;
}
