import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CommandeCarriere, VueCarriereEnLigne } from '../lib/ligue/typesCarriere';
import { TROPHEES } from '../data/trophees';
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
  const modele = TROPHEES[titre.tropheeId ?? ''] ?? Object.values(TROPHEES).find(t => !t.individuel)!;
  return <Ceremonie key={cle} noms={joueurs.map(j => j.nom)} club={club.nom}
    trophee={{ ...modele, id: `ligue-${cle}`, nom: titre.trophee, desc: `${titre.nom} · Saison ${titre.saison}` }}
    fermer={async () => {
      const suivante = await agir({ type: 'celebrationVue', competitionId: titre.competitionId, saison: titre.saison });
      if (suivante) setVus(v => [...v, cle]);
    }} />;
}

function Ceremonie({ noms, club, trophee, fermer }: {
  noms: string[]; club: string; trophee: typeof TROPHEES[string]; fermer: () => Promise<void>;
}) {
  const [etape, setEtape] = useState<'terrain' | 'coupe'>('terrain');
  const [occupe, setOccupe] = useState(false);
  const fermerCoupe = async () => { if (occupe) return; setOccupe(true); try { await fermer(); } finally { setOccupe(false); } };
  const suivant = () => setEtape('coupe');
  const { overlayRef, dialogRef } = useModalDialog(() => { if (etape === 'terrain') suivant(); else void fermerCoupe(); });
  useEffect(() => { const timer = window.setTimeout(suivant, 7000); return () => window.clearTimeout(timer); }, []);
  return createPortal(<div ref={overlayRef} className="celebration-ligue">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Champion : ${club}`} tabIndex={-1}>
      {etape === 'coupe' ? <TropheeGagne tropheeId={trophee.id} tropheePersonnalise={trophee} index={1} total={1} onFermer={() => void fermerCoupe()} /> : <>
        <p className="eyebrow">CHAMPIONS</p><h2>{club}</h2><p>{trophee.nom}</p>
        <svg viewBox="0 0 720 460" role="img" aria-label="Votre XV célèbre son titre sur le terrain">
          <rect x="10" y="10" width="700" height="440" rx="16" fill="#185e42" />
          {[50, 150, 230, 310, 410].map(y => <path key={y} d={`M25 ${y}H695`} stroke="#fff7" fill="none" />)}
          {noms.slice(0,15).map((nom, i) => {
            const x = 78 + (i % 5) * 140; const y = 110 + Math.floor(i / 5) * 125;
            return <g key={`${nom}-${i}`} transform={`translate(${x} ${y})`}>
              <g className="celebration-joueur" style={{ animationDelay: `${i * -.13}s` }}>
                <ellipse cy="37" rx="22" ry="6" fill="#0004" />
                <path d="M-8 12L-11 35M8 12L11 35" stroke="#eee" strokeWidth="9" />
                <path d={i === 7 ? "M-12 -14L-27 -65M12 -14L27 -65" : "M-12 -14L-27 -32M12 -14L27 -32"} stroke="#d99e72" strokeWidth="9" strokeLinecap="round" />
                <path d="M-16 -20H16L13 17H-13Z" fill="#f5d168" stroke="#433210" strokeWidth="2" />
                <circle cy="-32" r="12" fill="#d99e72" />
                <text y="7" textAnchor="middle" fill="#183d2e" fontSize="15" fontWeight="bold">{i+1}</text>
                {i === 7 && <g transform="translate(0 -61)"><path d="M-18 -8H18L12 12L0 19L-12 12ZM0 19V30M-12 31H12M-18 -4H-28Q-30 14-12 12M18 -4H28Q30 14 12 12" fill="#ffdc57" stroke="#ad7215" strokeWidth="4" /></g>}
              </g>
              <text y="63" textAnchor="middle" fill="white" fontSize="12">{nom.split(' ').slice(-1).join(' ')}</text>
            </g>;
          })}
        </svg>
        <button className="btn primaire" onClick={suivant}>Soulever la coupe</button>
      </>}
    </div>
  </div>, document.body);
}
