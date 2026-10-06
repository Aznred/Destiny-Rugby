// LA SECTION « TUTORIELS » DES RÉGLAGES (Correctif 18) — rejouer chaque guide, ou les couper tous.
//
// ⚠️ « REJOUER » EMMÈNE SUR LE VRAI ÉCRAN : le guide d'un mode se déclenche quand l'écran du mode apparaît, donc on y va (l'accueil pour
//    l'introduction, la ligue, la carrière en cours — ou sa création s'il n'y en a pas). Rejouer RÉACTIVE les tutoriels si on les avait
//    coupés : qui demande à revoir un guide veut le voir.
// ⚠️ « DÉSACTIVER » NE RENDS RIEN VU ET N'EFFACE RIEN (voir `lib/tutoriel/memoire.ts`) : réactiver ne fait pas rejouer ce qu'on avait fini.
// ⚠️ LES CARTES D'EXPLICATION DU MATCH (contrôle direct, responsabilités, premier match) obéissent aussi à ce bouton.

import { useState } from 'react';
import { t } from '../../lib/i18n';
import { useGame } from '../../store/useGame';
import { Icone, type NomIcone } from '../Icone';
import { demarrer, rejouerLaFamille } from '../../lib/tutoriel/guide';
import { desactiverLesTutoriels, usePreferencesTutoriel } from '../../lib/tutoriel/memoire';
import { demanderLeModeDeCreation } from '../../lib/tutoriel/intentions';
import { rejouerLeTutorielDirect } from '../../lib/controleDirect/prefs';
import './ReglagesTutoriel.css';

type Guide = 'general' | 'league' | 'player' | 'coach' | 'match';

const GUIDES: { id: Guide; icone: NomIcone; cle: string }[] = [
  { id: 'general', icone: 'livre', cle: 'tg.reg.general' },
  { id: 'league', icone: 'equipe', cle: 'tg.reg.ligue' },
  { id: 'player', icone: 'joueur', cle: 'tg.reg.joueur' },
  { id: 'coach', icone: 'entraineur', cle: 'tg.reg.entraineur' },
  { id: 'match', icone: 'ballon', cle: 'tg.reg.match' },
];

export function ReglagesTutoriel({ onFermer }: { onFermer: () => void }) {
  const prefs = usePreferencesTutoriel();
  const [relance, setRelance] = useState<Guide | null>(null);

  const rejouer = (guide: Guide): void => {
    const jeu = useGame.getState();
    desactiverLesTutoriels(false);
    switch (guide) {
      case 'general':
        onFermer();
        jeu.setEcran('accueil');
        demarrer('general.intro', true);
        break;
      case 'league':
        rejouerLaFamille('league');
        onFermer();
        jeu.setEcran('carriereEnLigne');
        break;
      case 'player':
        rejouerLaFamille('player');
        rejouerLeTutorielDirect();
        jeu.setTutoMatchVu(false);
        onFermer();
        if (jeu.joueur) jeu.setEcran('carriere');
        else { demanderLeModeDeCreation('joueur'); jeu.setEcran('creation'); }
        break;
      case 'coach':
        rejouerLaFamille('coach');
        onFermer();
        jeu.setEcran(jeu.manager ? 'manager' : 'creationManager');
        break;
      case 'match':
        // Les cartes du match reviennent à la prochaine rencontre : on ne ferme rien, on le dit.
        jeu.setTutoMatchVu(false);
        rejouerLeTutorielDirect();
        setRelance('match');
        break;
    }
  };

  return (
    <div className="champ reglages-tutoriels" data-tuto="reglages-tutoriels">
      <label>{t('tg.reg.titre')}</label>
      <p className="aide">{t('tg.reg.aide')}</p>
      <label className="reglages-tuto-bascule">
        <input type="checkbox" checked={prefs.desactive} onChange={(e) => desactiverLesTutoriels(e.target.checked)} />
        <span><b>{t('tg.reg.desactiver')}</b><small>{t('tg.reg.desactiverAide')}</small></span>
      </label>
      <div className="reglages-tuto-boutons">
        {GUIDES.map((g) => (
          <button key={g.id} type="button" className="btn fantome" data-guide={g.id} onClick={() => rejouer(g.id)}>
            <Icone nom={g.icone} taille={16} /> {t(g.cle)}
          </button>
        ))}
      </div>
      {relance === 'match' && <p className="aide reglages-tuto-relance" role="status">{t('tg.reg.matchRelance')}</p>}
    </div>
  );
}
