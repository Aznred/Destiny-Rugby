// LE CALQUE DU PROFILEUR — par-dessus un match en 3D, quand le Labo l'a allumé sur cet appareil (Correctif 25).
//
// Il lit `scene.mesures()` deux fois par seconde et compte les requêtes `/api/` du match. À la fin du match (le calque
// se démonte avec la scène) il range un résumé : c'est lui que le Labo aligne pour comparer deux séances.
import { useEffect, useRef, useState } from 'react';
import type { Scene3D } from '../../lib/match3D';
import { garderSeance, memoireJs, observerReseau, resumerSeance, type MesuresScene, type ReleveReseau } from '../../lib/profileur';
import { profilAppareil } from '../../lib/profilAppareil';
import './Profileur.css';

const nombre = (n: number) => n.toLocaleString('fr-FR');
const ms = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ms`;

export function Profileur({ scene }: { scene: Scene3D }) {
  const [m, setM] = useState<MesuresScene | null>(null);
  const [reseau, setReseau] = useState<ReleveReseau>({ requetes: 0, octets: 0, latenceTotal: 0, terminees: 0, erreurs: 0 });
  const derniere = useRef<MesuresScene | null>(null);
  const compte = useRef<ReleveReseau>({ requetes: 0, octets: 0, latenceTotal: 0, terminees: 0, erreurs: 0 });

  useEffect(() => {
    const debut = Date.now();
    compte.current = { requetes: 0, octets: 0, latenceTotal: 0, terminees: 0, erreurs: 0 };
    const arreterReseau = observerReseau(compte.current);
    scene.mesurerGpu?.(true);
    const lire = () => {
      const lu = scene.mesures?.();
      if (!lu) return;
      derniere.current = lu; setM(lu); setReseau({ ...compte.current });
    };
    lire();
    const minuteur = window.setInterval(lire, 500);
    // Les requêtes du match : leur nombre et ce qu'elles pèsent réellement sur le réseau (compressé).
    let observateur: PerformanceObserver | undefined;
    try {
      observateur = new PerformanceObserver((liste) => {
        for (const e of liste.getEntries() as PerformanceResourceTiming[]) {
          if (!e.name.includes('/api/')) continue;
          compte.current.requetes += 1; compte.current.octets += e.transferSize || e.encodedBodySize || 0;
        }
      });
      observateur.observe({ type: 'resource', buffered: false });
    } catch { /* navigateur sans cet observateur : le réseau reste à zéro */ }
    return () => {
      window.clearInterval(minuteur);
      observateur?.disconnect();
      arreterReseau();
      scene.mesurerGpu?.(false);
      // Une séance de moins de dix secondes ne dit rien : on ne la garde pas.
      if (derniere.current && derniere.current.images > 300 && Date.now() - debut > 10_000) {
        garderSeance(resumerSeance(derniere.current, debut, compte.current.requetes, compte.current.octets, profilAppareil(), compte.current));
      }
    };
  }, [scene]);

  if (!m) return null;
  const ips = m.ecart.moyenne > 0 ? Math.round(1000 / m.ecart.moyenne) : m.ips;
  const memoire = memoireJs();
  return <aside className="profileur" aria-label="Profileur">
    <strong>{ips}<small> img/s</small></strong>
    <dl>
      <div><dt>Entre deux images</dt><dd>{ms(m.ecart.moyenne)} <small>· 95 % sous {ms(m.ecart.p95)} · pire {ms(m.ecart.max)}</small></dd></div>
      <div><dt>Dessin d’une image</dt><dd>{ms(m.rendu.moyenne)} <small>· 95 % sous {ms(m.rendu.p95)}</small></dd></div>
      <div><dt>CPU de la scène</dt><dd>{m.cpu ? ms(m.cpu.moyenne) : '—'}</dd></div>
      <div><dt>GPU</dt><dd>{m.gpu ? ms(m.gpu.moyenne) : 'Non disponible sur ce navigateur'}</dd></div>
      <div><dt>Appels de dessin</dt><dd>{nombre(m.appels)}</dd></div>
      <div><dt>Triangles</dt><dd>{nombre(m.triangles)}</dd></div>
      {m.elagues !== undefined && <div><dt>Joueurs hors champ</dt><dd>{m.elagues} <small>· non dessinés</small></dd></div>}
      <div><dt>Géométries · textures</dt><dd>{nombre(m.geometries)} · {nombre(m.textures)}</dd></div>
      <div><dt>Toile</dt><dd>{m.largeur} × {m.hauteur} <small>· définition {m.definition.toFixed(2)}{m.leger ? ' · mode léger' : ''}</small></dd></div>
      {m.cadence !== undefined && <div><dt>Cadence visée</dt><dd>{m.cadence ? `${m.cadence} img/s` : 'celle de l’écran'}{(m.pas ?? 1) > 1 && <small> · une image sur {m.pas}</small>}{m.moyenneMatch ? <small> · {Math.round(m.moyenneMatch)} sur le match</small> : null}</dd></div>}
      {memoire !== undefined && <div><dt>Mémoire JavaScript</dt><dd>{nombre(memoire)} Mo</dd></div>}
      <div><dt>Requêtes du match</dt><dd>{nombre(reseau.requetes)} <small>· {nombre(Math.round(reseau.octets / 1024))} Ko</small></dd></div>
      <div><dt>Latence API moyenne</dt><dd>{reseau.terminees ? ms(reseau.latenceTotal / reseau.terminees) : '—'}</dd></div>
      <div><dt>Erreurs réseau</dt><dd>{nombre(reseau.erreurs)}</dd></div>
    </dl>
  </aside>;
}
