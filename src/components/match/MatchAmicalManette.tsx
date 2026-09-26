import { useEffect, useRef, useState, useCallback } from 'react';
import { Icone } from '../Icone';
import { PelouseMemo } from './Pelouse';
import { Camera, type Cadrage } from '../../lib/moteur/camera';
import { LARGEUR, LONGUEUR, borner, type Vec } from '../../lib/moteur/terrain';
import {
  creerMatch, avancer, type EtatMatch,
} from '../../lib/moteur/moteur';
import type { Pion } from '../../lib/moteur/entites';
import {
  convertirEnCoequipiers,
  type EquipeAmical,
  type InputAmical,
  synchroniserSalonAmicalApi,
} from '../../lib/amicalCollection';
import { t } from '../../lib/i18n';
import './MatchAmicalManette.css';

interface Props {
  equipeA: EquipeAmical;
  equipeB: EquipeAmical;
  monCamp: 'A' | 'B';
  mode: 'local' | 'reseau';
  salonCode?: string;
  onQuitter: () => void;
}

export function MatchAmicalManette({ equipeA, equipeB, monCamp, mode, salonCode, onQuitter }: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(new Camera());
  const matchRef = useRef<EtatMatch | null>(null);

  // Entrées utilisateur locales
  const touchesRef = useRef<Record<string, boolean>>({});
  const joystickRef = useRef<{ actif: boolean; departX: number; departY: number; dx: number; dy: number }>({
    actif: false, departX: 0, departY: 0, dx: 0, dy: 0,
  });
  const inputRef = useRef<InputAmical>({ dx: 0, dy: 0, sprint: false, temps: 0 });
  const inputAdverseRef = useRef<InputAmical>({ dx: 0, dy: 0, sprint: false, temps: 0 });

  // Écran et rendu
  const [vueCamera, setVueCamera] = useState<{ viewBox: string; redresser: string } | null>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [tempsSimule, setTempsSimule] = useState(0);
  const [messageAction, setMessageAction] = useState<string>(() => t('amical.match.kickoff'));
  const [finDeMatch, setFinDeMatch] = useState(false);
  const [pionControleId, setPionControleId] = useState<string | null>(null);
  const [sprintActif, setSprintActif] = useState(false);
  const [enduranceJauge, setEnduranceJauge] = useState(100);

  // Initialisation du moteur de match
  useEffect(() => {
    const coeqA = convertirEnCoequipiers(equipeA.joueurs);
    const coeqB = convertirEnCoequipiers(equipeB.joueurs);

    const m = creerMatch(
      equipeA.nom,
      equipeB.nom,
      coeqA,
      coeqB,
      20,
      17,
      `amical#${salonCode ?? Date.now()}`,
      undefined,
      {
        niveau: 'pro',
        tempsReel: true,
        controle: true,
      },
    );

    matchRef.current = m;
    cameraRef.current.couper({ x: LONGUEUR / 2, y: LARGEUR / 2 }, 'suivi');
  }, [equipeA, equipeB]);

  // Synchronisation réseau avec le salon privé (si mode réseau)
  useEffect(() => {
    if (mode !== 'reseau' || !salonCode) return;
    let actif = true;
    const interval = setInterval(async () => {
      try {
        const role = monCamp === 'A' ? 'hote' : 'invite';
        const res = await synchroniserSalonAmicalApi(salonCode, role, inputRef.current);
        if (actif && res.inputAdverse) {
          inputAdverseRef.current = res.inputAdverse;
        }
      } catch {
        // En cas de micro-coupure réseau, on continue le tick local
      }
    }, 150);

    return () => {
      actif = false;
      clearInterval(interval);
    };
  }, [mode, salonCode, monCamp]);

  // Gestion des touches clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      touchesRef.current[e.code] = true;
      if (['Space', 'KeyQ', 'KeyE', 'KeyC', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }

      // Actions immédiates
      if (e.code === 'KeyQ') declencherAction('passeGauche');
      else if (e.code === 'KeyE') declencherAction('passeDroite');
      else if (e.code === 'Space') declencherAction('plaquage');
      else if (e.code === 'KeyC') declencherAction('pied');
      else if (e.code === 'Tab') declencherAction('changer');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      touchesRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const declencherAction = useCallback((action: InputAmical['action']) => {
    inputRef.current.action = action;
    inputRef.current.temps = Date.now();

    const m = matchRef.current;
    if (!m) return;

    const campJoueur = monCamp;
    const aLeBallon = m.porteur && m.porteur.cote === campJoueur;
    const porteur = m.porteur;

    if (aLeBallon && porteur) {
      if (action === 'passeGauche' || action === 'passeDroite' || action === 'passe') {
        // Trouve un coéquipier démarqué sur l'aile visée
        const coequipiers = m.pions.filter((p) => p.cote === campJoueur && p.id !== porteur.id && p.surLeTerrain);
        const receveur = coequipiers.find((p) => (action === 'passeGauche' ? p.pos.y < porteur.pos.y : p.pos.y > porteur.pos.y))
          ?? coequipiers[0];

        if (receveur) {
          m.porteur = null;
          m.vol = {
            de: { ...porteur.pos },
            vers: { ...receveur.pos },
            hauteur: 0.15,
            duree: 0.45,
            ecoule: 0,
            type: 'passe',
            auteur: porteur,
            receveur,
            intention: 'passe',
          };
          setMessageAction(`⚡ Passe de ${porteur.nom} vers ${receveur.nom}`);
        }
      } else if (action === 'pied') {
        const cibleX = campJoueur === 'A' ? Math.min(LONGUEUR - 5, porteur.pos.x + 35) : Math.max(5, porteur.pos.x - 35);
        m.porteur = null;
        m.vol = {
          de: { ...porteur.pos },
          vers: { x: cibleX, y: porteur.pos.y },
          hauteur: 0.75,
          duree: 1.2,
          ecoule: 0,
          type: 'pied',
          auteur: porteur,
          receveur: null,
          intention: 'occupation',
        };
        setMessageAction(`👟 Coup de pied d’occupation de ${porteur.nom}`);
      }
    } else if (m.porteur && m.porteur.cote !== campJoueur) {
      if (action === 'plaquage') {
        const defenseurs = m.pions.filter((p) => p.cote === campJoueur && p.surLeTerrain);
        const plusProche = defenseurs.sort((a, b) =>
          Math.hypot(a.pos.x - m.porteur!.pos.x, a.pos.y - m.porteur!.pos.y) -
          Math.hypot(b.pos.x - m.porteur!.pos.x, b.pos.y - m.porteur!.pos.y),
        )[0];

        if (plusProche) {
          const dist = Math.hypot(plusProche.pos.x - m.porteur.pos.x, plusProche.pos.y - m.porteur.pos.y);
          if (dist < 3.2) {
            // Impact de plaquage réussi !
            const nomPorteur = m.porteur.nom;
            m.porteur = null;
            m.phase = 'ruck';
            setMessageAction(`💥 GROS PLAQUAGE de ${plusProche.nom} sur ${nomPorteur} !`);
          } else {
            setMessageAction(`⚡ ${plusProche.nom} plonge mais manque le plaquage !`);
          }
        }
      }
    }
  }, [monCamp]);

  // Boucle de simulation 60 FPS avec contrôles en temps réel
  useEffect(() => {
    let animId: number;
    let dernierTemps = performance.now();

    const tick = (maintenant: number) => {
      const dtReel = Math.min((maintenant - dernierTemps) / 1000, 0.05);
      dernierTemps = maintenant;

      const m = matchRef.current;
      if (m && !m.fini) {
        // 1. Lire entrées clavier / joystick
        let dx = 0;
        let dy = 0;
        if (touchesRef.current['ArrowLeft'] || touchesRef.current['KeyA']) dx -= 1;
        if (touchesRef.current['ArrowRight'] || touchesRef.current['KeyD']) dx += 1;
        if (touchesRef.current['ArrowUp'] || touchesRef.current['KeyW'] || touchesRef.current['KeyZ']) dy -= 1;
        if (touchesRef.current['ArrowDown'] || touchesRef.current['KeyS']) dy += 1;

        if (joystickRef.current.actif) {
          dx = joystickRef.current.dx;
          dy = joystickRef.current.dy;
        }

        const longueur = Math.hypot(dx, dy);
        if (longueur > 1) {
          dx /= longueur;
          dy /= longueur;
        }

        const sprint = Boolean(touchesRef.current['ShiftLeft'] || touchesRef.current['ShiftRight'] || sprintActif);
        inputRef.current.dx = dx;
        inputRef.current.dy = dy;
        inputRef.current.sprint = sprint;

        // 2. Déterminer quel pion le joueur pilote
        const mesPions = m.pions.filter((p) => p.cote === monCamp && p.surLeTerrain);
        let pionPilote: Pion | undefined;

        if (m.porteur && m.porteur.cote === monCamp) {
          pionPilote = m.porteur;
        } else if (m.porteur) {
          pionPilote = mesPions.sort((a, b) =>
            Math.hypot(a.pos.x - m.porteur!.pos.x, a.pos.y - m.porteur!.pos.y) -
            Math.hypot(b.pos.x - m.porteur!.pos.x, b.pos.y - m.porteur!.pos.y),
          )[0];
        } else {
          pionPilote = mesPions[0];
        }

        if (pionPilote) {
          setPionControleId(pionPilote.id);
          setEnduranceJauge(Math.round(pionPilote.endurance));

          // Appliquer le déplacement joystick directement
          if (dx !== 0 || dy !== 0) {
            const facteurSprint = sprint && pionPilote.endurance > 15 ? 1.35 : 0.95;
            const vitesseMoyenne = (pionPilote.vitesseMax || 7.5) * facteurSprint;

            // Déplacement orienté selon le sens d'attaque
            const sensX = monCamp === 'A' ? 1 : -1;
            pionPilote.pos.x = borner(pionPilote.pos.x + dx * vitesseMoyenne * sensX * dtReel, 3, LONGUEUR - 3);
            pionPilote.pos.y = borner(pionPilote.pos.y + dy * vitesseMoyenne * dtReel, 3, LARGEUR - 3);

            if (sprint) {
              pionPilote.endurance = Math.max(5, pionPilote.endurance - 6 * dtReel);
            }
          }
        }

        // 3. Avancer la simulation
        avancer(m, dtReel * 1.5);

        setScoreA(m.scoreA);
        setScoreB(m.scoreB);
        setTempsSimule(Math.floor(m.sim));

        // Détection essai dans l'en-but
        if (m.porteur) {
          if (m.porteur.cote === 'A' && m.porteur.pos.x >= LONGUEUR - 10) {
            m.scoreA += 5;
            m.porteur = null;
            m.phase = 'coupEnvoi';
            m.ballon = { x: LONGUEUR / 2, y: LARGEUR / 2 };
            setMessageAction(`🏉 ESSAI pour ${equipeA.nom} !! (+5 pts)`);
          } else if (m.porteur.cote === 'B' && m.porteur.pos.x <= 10) {
            m.scoreB += 5;
            m.porteur = null;
            m.phase = 'coupEnvoi';
            m.ballon = { x: LONGUEUR / 2, y: LARGEUR / 2 };
            setMessageAction(`🏉 ESSAI pour ${equipeB.nom} !! (+5 pts)`);
          }
        }

        // 4. Mettre à jour la caméra sur le ballon ou joueur actif
        const cibleCamera: Vec = m.porteur ? m.porteur.pos : m.ballon;
        const rect = conteneurRef.current?.getBoundingClientRect();
        const ratio = rect ? rect.width / Math.max(1, rect.height) : 16 / 9;
        const vue = cameraRef.current.suivre(cibleCamera, 'suivi' as Cadrage, ratio, 0, dtReel);
        setVueCamera({ viewBox: vue.viewBox, redresser: vue.redresser });

        if (m.fini || m.minute >= 80) {
          setFinDeMatch(true);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [monCamp, sprintActif, equipeA.nom, equipeB.nom]);

  // Touch handlers pour joystick mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    joystickRef.current = {
      actif: true,
      departX: touch.clientX,
      departY: touch.clientY,
      dx: 0,
      dy: 0,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickRef.current.actif) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - joystickRef.current.departX;
    const deltaY = touch.clientY - joystickRef.current.departY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxRayon = 45;
    const facteur = Math.min(1, distance / maxRayon);
    const angle = Math.atan2(deltaY, deltaX);
    joystickRef.current.dx = Math.cos(angle) * facteur;
    joystickRef.current.dy = Math.sin(angle) * facteur;
  };

  const handleTouchEnd = () => {
    joystickRef.current = { actif: false, departX: 0, departY: 0, dx: 0, dy: 0 };
  };

  const m = matchRef.current;

  return (
    <div className="amical-manette-racine" ref={conteneurRef}>
      {/* Tableau d'affichage / Scoreboard */}
      <header className="amical-entete">
        <button type="button" className="btn fantome amical-btn-retour" onClick={onQuitter}>
          <Icone nom="fleche-droite" taille={16} /> {t('online.common.close')}
        </button>

        <div className="amical-scoreboard">
          <div className={`amical-equipe domicile ${monCamp === 'A' ? 'mon-camp' : ''}`}>
            <span className="amical-nom-equipe">{equipeA.nom}</span>
            <span className="amical-score">{scoreA}</span>
          </div>
          <div className="amical-centre-chrono">
            <span className="amical-badge-chrono">{Math.floor(tempsSimule / 60)}:{(tempsSimule % 60).toString().padStart(2, '0')}</span>
            <span className="amical-mode-label">{mode === 'reseau' ? t('amical.match.roomLabel', { code: salonCode ?? '' }) : t('amical.match.localMode')}</span>
          </div>
          <div className={`amical-equipe exterieur ${monCamp === 'B' ? 'mon-camp' : ''}`}>
            <span className="amical-score">{scoreB}</span>
            <span className="amical-nom-equipe">{equipeB.nom}</span>
          </div>
        </div>

        <div className="amical-endurance-badge">
          <Icone nom="eclair" taille={14} />
          <div className="amical-jauge-endurance">
            <div style={{ width: `${enduranceJauge}%`, backgroundColor: enduranceJauge > 40 ? '#10b981' : '#f59e0b' }} />
          </div>
        </div>
      </header>

      {/* Récit / Bandeau d'action contextuelle */}
      <div className="amical-bandeau-action" role="status">
        <span>{messageAction}</span>
      </div>

      {/* Rendu 2D immersif du terrain de rugby */}
      <div className="amical-terrain-viewport">
        {vueCamera && (
          <svg className="amical-terrain-svg" viewBox={vueCamera.viewBox} preserveAspectRatio="xMidYMid meet">
            <PelouseMemo />

            {/* Joueurs de l'équipe A */}
            {m?.pions.filter((p) => p.cote === 'A' && p.surLeTerrain).map((p) => {
              const estControle = p.id === pionControleId;
              const estPorteur = m.porteur?.id === p.id;
              return (
                <g key={p.id} transform={`translate(${p.pos.x}, ${p.pos.y})`}>
                  {estControle && (
                    <circle r={2.2} fill="none" stroke="#ffd700" strokeWidth={0.35} strokeDasharray="0.8,0.4" className="halo-controle" />
                  )}
                  <circle r={1.25} fill={equipeA.couleur || '#1e40af'} stroke={estControle ? '#ffd700' : '#ffffff'} strokeWidth={estControle ? 0.35 : 0.15} />
                  <text textAnchor="middle" dy={0.4} fontSize={0.8} fill="#ffffff" fontWeight="bold">
                    {p.numero}
                  </text>
                  {estPorteur && (
                    <circle cx={0.9} cy={-0.9} r={0.5} fill="#78350f" stroke="#ffffff" strokeWidth={0.1} />
                  )}
                </g>
              );
            })}

            {/* Joueurs de l'équipe B */}
            {m?.pions.filter((p) => p.cote === 'B' && p.surLeTerrain).map((p) => {
              const estControle = p.id === pionControleId;
              const estPorteur = m.porteur?.id === p.id;
              return (
                <g key={p.id} transform={`translate(${p.pos.x}, ${p.pos.y})`}>
                  {estControle && (
                    <circle r={2.2} fill="none" stroke="#ffd700" strokeWidth={0.35} strokeDasharray="0.8,0.4" className="halo-controle" />
                  )}
                  <circle r={1.25} fill={equipeB.couleur || '#dc2626'} stroke={estControle ? '#ffd700' : '#ffffff'} strokeWidth={estControle ? 0.35 : 0.15} />
                  <text textAnchor="middle" dy={0.4} fontSize={0.8} fill="#ffffff" fontWeight="bold">
                    {p.numero}
                  </text>
                  {estPorteur && (
                    <circle cx={0.9} cy={-0.9} r={0.5} fill="#78350f" stroke="#ffffff" strokeWidth={0.1} />
                  )}
                </g>
              );
            })}

            {/* Ballon libre ou en vol */}
            {m && !m.porteur && (
              <g transform={`translate(${m.ballon.x}, ${m.ballon.y})`}>
                <ellipse rx={0.7} ry={0.45} fill="#854d0e" stroke="#fef08a" strokeWidth={0.12} />
              </g>
            )}
          </svg>
        )}
      </div>

      {/* HUD des contrôles (Joystick virtuel tactile + Boutons d'action) */}
      <footer className="amical-hud">
        {/* Joystick flottant gauche */}
        <div
          className="amical-joystick-zone"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          aria-label={t('amical.match.joystick')}
        >
          <div className="amical-joystick-base">
            <div
              className="amical-joystick-manche"
              style={{
                transform: `translate(${joystickRef.current.dx * 35}px, ${joystickRef.current.dy * 35}px)`,
              }}
            />
          </div>
          <span className="amical-joystick-guide">{t('amical.match.dragToRun')}</span>
        </div>

        {/* Boutons d'action droite */}
        <div className="amical-actions-zone">
          <div className="amical-boutons-ligne">
            <button
              type="button"
              className="amical-btn-action secondaire"
              onClick={() => declencherAction('passeGauche')}
              title="Passe vers l'aile gauche (Touche Q)"
            >
              {t('amical.match.passLeft')}
            </button>
            <button
              type="button"
              className="amical-btn-action secondaire"
              onClick={() => declencherAction('passeDroite')}
              title="Passe vers l'aile droite (Touche E)"
            >
              {t('amical.match.passRight')}
            </button>
          </div>

          <div className="amical-boutons-ligne">
            <button
              type="button"
              className="amical-btn-action secondaire pied"
              onClick={() => declencherAction('pied')}
              title="Coup de pied d'occupation (Touche C)"
            >
              {t('amical.match.kick')}
            </button>
            <button
              type="button"
              className={`amical-btn-action principal ${sprintActif ? 'actif' : ''}`}
              onClick={() => {
                setSprintActif((s) => !s);
                declencherAction('plaquage');
              }}
              title="Sprint / Plaquage (Espace ou Shift)"
            >
              {t('amical.match.tackleSprint')}
            </button>
          </div>
        </div>
      </footer>

      {/* Modale de fin de match */}
      {finDeMatch && (
        <div className="amical-modale-fin" role="dialog" aria-modal="true">
          <div className="amical-modale-contenu carte">
            <h2>{t('amical.match.fullTime')}</h2>
            <div className="amical-score-final">
              <span>{equipeA.nom} <b>{scoreA}</b></span>
              <span>-</span>
              <span><b>{scoreB}</b> {equipeB.nom}</span>
            </div>
            <p className="amical-message-vainqueur">
              {scoreA > scoreB
                ? t('amical.match.victory', { name: equipeA.nom })
                : scoreB > scoreA
                  ? t('amical.match.victory', { name: equipeB.nom })
                  : t('amical.match.draw')}
            </p>
            <button type="button" className="btn primaire" onClick={onQuitter}>
              {t('amical.match.backToCollection')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
