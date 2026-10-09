// LA SECTION « MON IMAGE » DES RÉGLAGES — une joueuse ou un joueur décide de son portrait dans le jeu.
//
// Deux gestes : faire RETIRER son portrait (la carte garde la silhouette), ou PROPOSER le sien. ⚠️ Rien ne s'applique
// ici : la demande part au serveur et attend une décision dans le Labo, parce que n'importe qui peut prétendre être
// n'importe qui. La liste « Mes demandes » dit où chacune en est.
// ⚠️ Il faut un compte de la Carrière en ligne (le serveur doit savoir à qui répondre) ; sans lui la section donne
// l'adresse de contact, qui reste l'autre voie pour tout le monde.

import { useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';
import { Icone } from './Icone';
import { ErreurDemandeImage, envoyerDemandeImage, lireDemandesImage, preparerPortrait } from '../lib/imagesJoueurs';
import type { DemandeImage, TypeDemandeImage } from '../lib/demandesImage';
import './ReglagesImage.css';

type Etat = 'chargement' | 'pret' | 'deconnecte' | 'indisponible';

export function ReglagesImage() {
  const [etat, setEtat] = useState<Etat>('chargement');
  const [demandes, setDemandes] = useState<DemandeImage[]>([]);
  const [type, setType] = useState<TypeDemandeImage>('retrait');
  const [joueur, setJoueur] = useState('');
  const [club, setClub] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<string>();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoyee, setEnvoyee] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let actif = true;
    lireDemandesImage().then(v => { if (actif) { setDemandes(v.miennes); setEtat('pret'); } })
      .catch(e => { if (actif) setEtat(e instanceof ErreurDemandeImage && (e.statut === 401 || e.statut === 403) ? 'deconnecte' : 'indisponible'); });
    return () => { actif = false; };
  }, []);

  const choisir = async (f: File | undefined) => {
    if (!f) return;
    setErreur('');
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 12_000_000) throw new Error('img.erreur.image');
      setImage(await preparerPortrait(f));
    } catch (e) { setErreur(t((e as Error).message.startsWith('img.') ? (e as Error).message : 'img.erreur.image')); }
  };
  const envoyer = async () => {
    setErreur(''); setEnvoyee(false);
    if (joueur.trim().split(/\s+/).length < 2) { setErreur(t('img.erreur.nom')); return; }
    if (type === 'ajout' && !image) { setErreur(t('img.erreur.image')); return; }
    setOccupe(true);
    try {
      const vue = await envoyerDemandeImage({ type, joueur, club, message, ...(type === 'ajout' ? { image } : {}) });
      setDemandes(vue.miennes); setEnvoyee(true); setMessage(''); setImage(undefined);
    } catch (e) {
      const cle = e instanceof ErreurDemandeImage && e.message.startsWith('img.') ? e.message : 'img.erreur.envoi';
      if (e instanceof ErreurDemandeImage && e.statut === 401) setEtat('deconnecte'); else setErreur(t(cle));
    } finally { setOccupe(false); }
  };

  return (
    <div className="champ reglages-image">
      <label>{t('img.titre')}</label>
      <p className="aide"><Icone nom="joueur" taille={15} /> {t('img.aide')}</p>
      {etat === 'deconnecte' && <p className="reglages-image-note">{t('img.connexion')}</p>}
      {etat === 'indisponible' && <p className="reglages-image-note">{t('img.indisponible')}</p>}
      {etat === 'pret' && <>
        <div className="reglages-image-choix" role="radiogroup" aria-label={t('img.titre')}>
          {(['retrait', 'ajout'] as const).map(choix => (
            <button key={choix} type="button" role="radio" aria-checked={type === choix} className={type === choix ? 'actif' : ''} onClick={() => setType(choix)}>
              {t(choix === 'retrait' ? 'img.retrait' : 'img.ajout')}
            </button>
          ))}
        </div>
        <div className="reglages-image-champs">
          <label>{t('img.nom')}<input value={joueur} maxLength={80} autoComplete="name" onChange={e => setJoueur(e.target.value)} /></label>
          <label>{t('img.club')}<input value={club} maxLength={80} onChange={e => setClub(e.target.value)} /></label>
        </div>
        <label className="reglages-image-message">{t('img.message')}<textarea value={message} maxLength={500} rows={2} onChange={e => setMessage(e.target.value)} /></label>
        {type === 'ajout' && (
          <div className="reglages-image-photo">
            {image && <img src={image} alt="" />}
            <div>
              <input ref={fichier} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { void choisir(e.target.files?.[0]); e.target.value = ''; }} />
              <button type="button" className="btn" onClick={() => fichier.current?.click()}>{t(image ? 'img.changer' : 'img.choisir')}</button>
              <small>{t('img.droits')}</small>
            </div>
          </div>
        )}
        {erreur && <p role="alert" className="reglages-image-erreur">{erreur}</p>}
        {envoyee && <p role="status" className="reglages-image-succes">{t('img.envoyee')}</p>}
        <button type="button" className="btn primaire" disabled={occupe} onClick={() => { void envoyer(); }}>{t(occupe ? 'img.envoi' : 'img.envoyer')}</button>
        {demandes.length > 0 && (
          <div className="reglages-image-liste">
            <h4>{t('img.mesDemandes')}</h4>
            <ul>
              {demandes.map(d => (
                <li key={d.id}>
                  <span><b>{d.joueur}</b>{t(d.type === 'retrait' ? 'img.retrait' : 'img.ajout')}</span>
                  <em className={`reglages-image-statut ${d.statut}`}>{t(`img.statut.${d.statut}`)}</em>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>}
    </div>
  );
}
