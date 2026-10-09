// LABO → « DEMANDES D'IMAGE » — le compte interne accepte ou refuse ce que les joueurs demandent pour leur portrait.
//
// ⚠️ ACCEPTER APPLIQUE À TOUT LE JEU : un retrait enlève le portrait de la carte, de la composition et des bandeaux ;
// un ajout met le portrait proposé à la place de tous les autres. La liste publique est relue par les écrans à leur
// prochaine visite (cinq minutes de cache). Une décision se reprend : « Remettre en attente » la défait.
// ⚠️ Le serveur refuse ces routes à tout autre compte (identifiant `kiri`), même en connaissant leur nom.

import { useCallback, useEffect, useState } from 'react';
import { deciderDemandeImage, lireDemandesImage, lireImageDemande } from '../lib/imagesJoueurs';
import type { DemandeImage, StatutDemandeImage } from '../lib/demandesImage';
import { photoReelle } from '../lib/avatars';
import './ReglagesImage.css';

const LIBELLES: Record<StatutDemandeImage, string> = { attente: 'En attente', acceptee: 'Acceptées', refusee: 'Refusées' };
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function Portraits({ demande }: { demande: DemandeImage }) {
  const [propose, setPropose] = useState<string | null>();
  useEffect(() => {
    if (demande.type !== 'ajout') return;
    let actif = true;
    lireImageDemande(demande.id).then(r => { if (actif) setPropose(r.image); }).catch(() => { if (actif) setPropose(null); });
    return () => { actif = false; };
  }, [demande.id, demande.type]);
  const actuel = photoReelle(demande.joueur, demande.club || undefined);
  return (
    <div className="labo-demande-portraits">
      <figure>{actuel ? <img src={actuel} alt="" /> : <span className="vide" />}<figcaption>Actuel</figcaption></figure>
      {demande.type === 'ajout' && <figure>{propose ? <img src={propose} alt="" /> : <span className="vide" />}<figcaption>Proposé</figcaption></figure>}
    </div>
  );
}

export function LaboDemandesImage() {
  const [demandes, setDemandes] = useState<DemandeImage[] | null>(null);
  const [filtre, setFiltre] = useState<StatutDemandeImage>('attente');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState('');

  const charger = useCallback(() => {
    lireDemandesImage().then(v => { setDemandes(v.toutes ?? []); setErreur(''); }).catch(e => setErreur((e as Error).message || 'Lecture impossible.'));
  }, []);
  useEffect(charger, [charger]);

  const decider = async (id: string, decision: StatutDemandeImage) => {
    setOccupe(id); setErreur('');
    try { setDemandes((await deciderDemandeImage(id, decision)).toutes ?? []); }
    catch (e) { setErreur((e as Error).message || 'Décision non enregistrée.'); }
    finally { setOccupe(''); }
  };

  if (!demandes) return <p>{erreur || 'Chargement des demandes…'}</p>;
  const visibles = demandes.filter(d => d.statut === filtre);
  return (
    <section className="labo-demandes">
      <p className="ak-note">Chaque joueuse ou joueur peut demander le retrait de son portrait, ou proposer le sien (Réglages → Mon image). Rien ne s’applique avant ta décision.</p>
      <div className="labo-demandes-filtres">
        {(['attente', 'acceptee', 'refusee'] as const).map(s => (
          <button key={s} type="button" className={filtre === s ? 'actif' : ''} onClick={() => setFiltre(s)}>{LIBELLES[s]} · {demandes.filter(d => d.statut === s).length}</button>
        ))}
      </div>
      {erreur && <p role="alert" className="ak-erreur">{erreur}</p>}
      {!visibles.length && <p className="ak-note">Aucune demande ici.</p>}
      {visibles.map(d => (
        <article key={d.id} className="labo-demande">
          <Portraits demande={d} />
          <div className="labo-demande-texte">
            <b>{d.joueur}</b>
            <small>{d.type === 'retrait' ? 'Retirer son portrait' : 'Remplacer son portrait'}{d.club ? ` · ${d.club}` : ''}</small>
            <small>Demandé par {d.pseudo ?? 'compte supprimé'} le {date(d.creeLe)}{d.decideLe ? ` · décidé le ${date(d.decideLe)}` : ''}</small>
            {d.message && <p>{d.message}</p>}
          </div>
          <div className="labo-demande-actions">
            {d.statut !== 'acceptee' && <button type="button" className="btn primaire" disabled={occupe === d.id} onClick={() => { void decider(d.id, 'acceptee'); }}>Accepter</button>}
            {d.statut !== 'refusee' && <button type="button" className="btn" disabled={occupe === d.id} onClick={() => { void decider(d.id, 'refusee'); }}>Refuser</button>}
            {d.statut !== 'attente' && <button type="button" className="btn" disabled={occupe === d.id} onClick={() => { void decider(d.id, 'attente'); }}>Remettre en attente</button>}
          </div>
        </article>
      ))}
    </section>
  );
}
