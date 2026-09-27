import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CommandeCarriere, VueCarriereEnLigne } from '../lib/ligue/typesCarriere';
import { TROPHEES } from '../data/trophees';
import type { PosteId } from '../types';
import { clubParNom } from '../data/clubs';
import { vignetteModele } from '../lib/vignettes3d';
import { SpriteCelebration } from './match/SpriteRugbyman';
import { TropheeGagne } from './TropheeGagne';
import { useModalDialog } from '../lib/useModalDialog';
import './CelebrationLigue.css';

export function CelebrationLigue({ vue, agir }: {
  vue: VueCarriereEnLigne;
  agir: (commande: CommandeCarriere) => Promise<VueCarriereEnLigne | void>;
}) {
  const club = vue.clubs.find(c => c.id === vue.monClubId);
  const [vus, setVus] = useState<string[]>([]);
  const titre = vue.histoire.find(h => h.vainqueur === vue.monClubId &&
    !club?.tropheesVus?.includes(`${h.competitionId}:${h.saison}`) && !vus.includes(`${h.competitionId}:${h.saison}`));
  if (!titre || vue.observateur || !club) return null;
  const cle = `${titre.competitionId}:${titre.saison}`;
  const joueurs = (club.composition?.titulaires ?? []).map(id => vue.cartes.find(c => c.id === id)).filter(c => !!c);
  const competition = vue.competitions?.find(c => c.id === titre.competitionId);
  const modele = TROPHEES[titre.tropheeId ?? competition?.tropheeId ?? ''] ?? Object.values(TROPHEES).find(t => !t.individuel)!;
  return <Ceremonie key={cle} joueurs={joueurs.map(j => ({ nom: j.nom, poste: j.poste }))} club={club.nom} competition={titre.nom} saison={titre.saison} couleur={clubParNom(club.nom)?.c1 ?? '#d3a448'}
    trophee={{ ...modele, id: `ligue-${cle}`, nom: titre.trophee, desc: `${titre.nom} · Saison ${titre.saison}` }}
    fermer={async () => {
      const suivante = await agir({ type: 'celebrationVue', competitionId: titre.competitionId, saison: titre.saison });
      if (suivante) setVus(v => [...v, cle]);
    }} />;
}

function Ceremonie({ joueurs, club, competition, saison, couleur, trophee, fermer }: {
  joueurs: { nom: string; poste: PosteId }[]; club: string; competition: string; saison: number; couleur: string;
  trophee: typeof TROPHEES[string]; fermer: () => Promise<void>;
}) {
  const [etape, setEtape] = useState<'terrain' | 'coupe'>('terrain');
  const [imageCoupe, setImageCoupe] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const fermerCoupe = async () => { if (occupe) return; setOccupe(true); try { await fermer(); } finally { setOccupe(false); } };
  const suivant = () => setEtape('coupe');
  const { overlayRef, dialogRef } = useModalDialog(() => { if (etape === 'terrain') suivant(); else void fermerCoupe(); });
  useEffect(() => {
    let actif = true;
    void vignetteModele(trophee.modele, trophee.couleur).then(image => { if (actif) setImageCoupe(image); });
    return () => { actif = false; };
  }, [trophee.modele, trophee.couleur]);
  return createPortal(<div ref={overlayRef} className="celebration-ligue">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Champion : ${club}`} tabIndex={-1}>
      {etape === 'coupe' ? <TropheeGagne tropheeId={trophee.id} tropheePersonnalise={trophee} index={1} total={1} onFermer={() => void fermerCoupe()} /> : <>
        <p className="eyebrow">LA VICTOIRE EST À VOUS</p><h2>{club}</h2>
        <div className="celebration-terrain" role="img" aria-label={`Les joueurs de ${club} célèbrent ensemble la victoire en ${competition} avec la coupe`}>
          <div className="celebration-tribunes" />
          <div className="celebration-joueurs celebration-joueurs-arriere">
            {joueurs.slice(0, 7).map((joueur, i) => <SpriteCelebration key={`${joueur.nom}-${i}`} nom={joueur.nom} poste={joueur.poste} numero={i + 1} couleur={couleur} />)}
          </div>
          <div className="celebration-joueurs celebration-joueurs-avant">
            {joueurs.slice(8, 15).map((joueur, i) => <SpriteCelebration key={`${joueur.nom}-${i + 8}`} nom={joueur.nom} poste={joueur.poste} numero={i + 9} couleur={couleur} />)}
          </div>
          <div className="celebration-capitaine">
            {joueurs[7] && <SpriteCelebration nom={joueurs[7].nom} poste={joueurs[7].poste} numero={8} couleur={couleur} capitaine />}
            {imageCoupe && <img className="celebration-coupe" src={imageCoupe} alt="" />}
          </div>
          <div className="celebration-panneau"><small>{competition}</small><strong>CHAMPIONS · SAISON {saison}</strong></div>
          <div className="celebration-confettis" aria-hidden="true" />
        </div>
        <button className="btn primaire" onClick={suivant}>Voir la coupe en 3D</button>
      </>}
    </div>
  </div>, document.body);
}
