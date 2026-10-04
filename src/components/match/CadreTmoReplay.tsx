import { t } from '../../lib/i18n';
import { Icone } from '../Icone';

export interface CadreTmoReplayProps {
  action: string;
  decision: string;
  explication?: string;
  cadreCamera?: string;
  horloge?: string;
}

/**
 * Cadre Télé Replay pour l'arbitrage vidéo (TMO).
 *
 * Évite d'obstruer le terrain avec un modal opaque au centre :
 * - Encadre l'action comme un moniteur de ralenti TV officiel (réticules de cadrage, scanlines, badge REC)
 * - Place l'en-tête technique tout en haut et le bandeau de décision (Chyron / Lower-third) tout en bas
 * - Laisse le centre 100 % dégagé pour voir les rugbymen, le ballon et l'aplatissage au ralenti.
 */
export function CadreTmoReplay({
  action,
  decision,
  explication,
  cadreCamera,
  horloge,
}: CadreTmoReplayProps) {
  const decLower = decision.toLowerCase();
  const statutClasse: 'accorde' | 'refuse' | 'sanction' | 'scanning' = decLower.includes('accordé')
    ? 'accorde'
    : decLower.includes('refusé') || decLower.includes('touche') || decLower.includes('en-avant')
    ? 'refuse'
    : decLower.includes('carton') || decLower.includes('rouge') || decLower.includes('jaune') || decLower.includes('sanction')
    ? 'sanction'
    : 'scanning';

  return (
    <div className="tmo-tv-cadre" role="alert">
      {/* 4 coins de visée caméra TV broadcast */}
      <span className="tmo-tv-coin tmo-tv-coin-tl" aria-hidden="true" />
      <span className="tmo-tv-coin tmo-tv-coin-tr" aria-hidden="true" />
      <span className="tmo-tv-coin tmo-tv-coin-bl" aria-hidden="true" />
      <span className="tmo-tv-coin tmo-tv-coin-br" aria-hidden="true" />

      {/* Trame scanlines cathodique */}
      <div className="tmo-tv-scanlines" aria-hidden="true" />

      {/* En-tête TV broadcast (haut d'écran) */}
      <div className="tmo-tv-header">
        <div className="tmo-tv-header-gauche">
          <span className="tmo-tv-rec">
            <span className="tmo-tv-rec-dot" />{t("ui.6fcb69fbe9be")}</span>
          <span className="tmo-tv-badge">
            <Icone nom="video" taille={13} />{t("ui.e7827480d059")}</span>
          <span className="tmo-tv-cam">
            {cadreCamera || t("ui.1b4c1ae628cb")}
          </span>
        </div>
        <div className="tmo-tv-header-droite">
          <span className="tmo-tv-ralenti">{t("ui.707798d16b92")}</span>
          {horloge && <span className="tmo-tv-timecode">{t("ui.d4c68774331b", { v0: horloge })}</span>}
        </div>
      </div>

      {/* LE CENTRE EST TOTALEMENT LIBRE ET TRANSPARENT POUR VOIR L'ACTION DU MATCH */}

      {/* Bandeau inférieur TV officiel (Chyron / Lower-Third) */}
      <div className="tmo-tv-lower-third">
        <div className="tmo-tv-barre-motif">
          <span className="tmo-tv-motif-tag">{t("sifflet.tmo")}</span>
          <span className="tmo-tv-motif-texte">
            <b>{t("ui.86542d88d109")}</b> {action}
          </span>
        </div>
        <div className="tmo-tv-barre-decision">
          <span className={`tmo-tv-decision-pill ${statutClasse}`}>
            {statutClasse === 'accorde' && <Icone nom="ok" taille={14} />}
            {statutClasse === 'refuse' && <Icone nom="croix" taille={14} />}
            {statutClasse === 'sanction' && <Icone nom="alerte" taille={14} />}
            {statutClasse === 'scanning' && <span className="tmo-tv-pulse-dot" />}
            <span className="tmo-tv-decision-texte">
              {decision.toUpperCase().startsWith('DÉCISION') ? decision : t("ui.1274f6d9e237", { v0: decision })}
            </span>
          </span>
        </div>
        {explication && (
          <div className="tmo-tv-explication">
            « {explication} »
          </div>
        )}
      </div>
    </div>
  );
}

export default CadreTmoReplay;
