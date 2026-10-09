// TON JOUEUR EN TROIS DIMENSIONS — le même corps, les mêmes cheveux, le même casque que sur le terrain
//
// Monte `creerApercuJoueur` (public/rn26/scene.js) : le lecteur du match, mais avec UN joueur, sans stade.
// Chaque changement d'apparence, de morphologie ou d'équipement le reconstruit tout de suite ; on le
// tourne au doigt, ou d'un bouton : face, profil, dos.
//
// ⚠️ IL N'ÉCRIT RIEN. Il reçoit une apparence déjà résolue (`apparencePourApercu`) et la dessine.
// ⚠️ Si WebGL ou un fichier manque, `repli` s'affiche : une création de joueur ne doit jamais rester vide.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { appareilLeger, creerApercuJoueur, type ApercuJoueur3D, type OptionsApercuJoueur } from '../lib/match3D';
import { maillotDeSecours } from '../lib/moteur/apparenceMatch';
import { clubParNom } from '../data/clubs';
import { t } from '../lib/i18n';
import { maillotDepuisKit } from '../lib/personnalisationMatch';
import type { KitDef } from '../data/kitsBoutique';
import './ApercuJoueur3D.css';
import { MONDE_FEMININ } from '../lib/mondeActif';

export type CoteApercu = 'face' | 'profil' | 'dos';

export function ApercuJoueur3D({
  apparence, club, kit, avant = false, cadrage = 'corps', cote, controles = true, repli, className, onPret,
}: {
  /** Apparence résolue du match (peau, cheveux, coupeId, barbeId, morpho, equipement…). */
  apparence: unknown;
  club?: string;
  /** Un kit de la boutique à faire porter (aperçu avant achat) : il remplace les couleurs du club. */
  kit?: KitDef;
  avant?: boolean;
  cadrage?: 'corps' | 'visage';
  /** Orientation imposée de l'extérieur ; sans elle, le joueur se tourne au doigt et par les boutons. */
  cote?: CoteApercu;
  controles?: boolean;
  repli?: ReactNode;
  className?: string;
  onPret?: (apercu: ApercuJoueur3D | null) => void;
}) {
  const noeud = useRef<HTMLDivElement>(null);
  const apercu = useRef<ApercuJoueur3D | null>(null);
  const [etat, setEtat] = useState<'charge' | 'pret' | 'echec'>('charge');
  const [orientation, setOrientation] = useState<CoteApercu>('face');
  const dernier = useRef<OptionsApercuJoueur>({});

  const maillot = (() => {
    if (kit) return maillotDepuisKit(kit);
    const c = club ? clubParNom(club) : undefined;
    const secours = maillotDeSecours(c?.c1 ?? '#15317e', club ?? 'joueur');
    return { principal: c?.c1 ?? '#15317e', secondaire: c?.c2 ?? '#f4f4ef', short: secours.short, chaussettes: secours.chaussettes };
  })();
  const options: OptionsApercuJoueur = { apparence: apparence as Record<string, unknown>, maillot, avant, cadrage, leger: appareilLeger(), ...(MONDE_FEMININ ? { genre: 'femme' } : {}) };
  dernier.current = options;
  const signature = JSON.stringify([apparence, maillot, avant]);

  // Montage : une seule scène pour toute la vie du composant.
  useEffect(() => {
    const conteneur = noeud.current;
    if (!conteneur) return;
    let annule = false;
    creerApercuJoueur(conteneur, dernier.current)
      .then((creee) => {
        if (annule) { creee.detruire(); return; }
        apercu.current = creee;
        setEtat('pret');
        onPret?.(creee);
      })
      .catch(() => { if (!annule) setEtat('echec'); });
    return () => {
      annule = true;
      onPret?.(null);
      apercu.current?.detruire();
      apercu.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mise à jour immédiate à chaque changement de ce qu'on voit.
  useEffect(() => { void apercu.current?.mettreAJour(dernier.current); }, [signature]);
  useEffect(() => { apercu.current?.cadrer(cadrage); }, [cadrage, etat]);
  useEffect(() => { if (cote) { apercu.current?.orienter(cote); setOrientation(cote); } }, [cote, etat]);

  if (etat === 'echec') return <div className={`aj3d aj3d-repli ${className ?? ''}`}>{repli ?? <p>{t('ap.indisponible')}</p>}</div>;

  const tourner = (c: CoteApercu) => { apercu.current?.orienter(c); setOrientation(c); };
  return (
    <div className={`aj3d ${className ?? ''}`}>
      <div className="aj3d-toile" ref={noeud} aria-label={t('ap.apercu')} role="img" />
      {etat === 'charge' && <div className="aj3d-attente" role="status">{t('ap.chargement')}</div>}
      {controles && etat === 'pret' && !cote && (
        <div className="aj3d-cotes" role="group" aria-label={t('ap.tourner')}>
          {(['face', 'profil', 'dos'] as const).map((c) => (
            <button key={c} type="button" className={orientation === c ? 'actif' : undefined} aria-pressed={orientation === c} onClick={() => tourner(c)}>
              {t(`ap.cote.${c}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
