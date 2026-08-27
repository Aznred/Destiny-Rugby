import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { nomPoste } from '../data/rugby';
import {
  joueurCompatibleManager, POSTES_BANC_MANAGER, POSTES_XV_MANAGER,
} from '../lib/compositionManager';
import type { Coequipier } from '../lib/effectif';
import type { CompositionManager } from '../types';

type ZoneComposition = 'titulaires' | 'remplacants';

interface Props {
  effectif: Coequipier[];
  composition: CompositionManager;
  onPlacer: (zone: ZoneComposition, index: number, joueurId: string) => void;
}

/** Placement visuel d'un XV de rugby, du pack (bas) vers l'en-but adverse. */
const PLACEMENT_XV = [
  [26, 84], [50, 88], [74, 84],
  [39, 71], [61, 71],
  [23, 57], [77, 57], [50, 58],
  [40, 45], [56, 36],
  [12, 18], [36, 24], [64, 23], [88, 18], [50, 9],
] as const;

function nomCarte(nom: string): string {
  const morceaux = nom.trim().split(/\s+/);
  if (morceaux.length <= 2) return nom;
  return `${morceaux[0]} ${morceaux.at(-1)}`;
}

function CarteJoueur({
  joueur, numero, posteSlot, selectionne, capitaine, buteur, surSelection,
  surDrag, surDrop,
}: {
  joueur?: Coequipier;
  numero: number;
  posteSlot: (typeof POSTES_XV_MANAGER)[number];
  selectionne: boolean;
  capitaine: boolean;
  buteur: boolean;
  surSelection: () => void;
  surDrag: (e: DragEvent<HTMLButtonElement>) => void;
  surDrop: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  const naturel = !!joueur && joueur.poste === posteSlot;
  const compatible = !!joueur && joueurCompatibleManager(joueur, posteSlot);
  return (
    <button
      type="button"
      className={`manager-carte-joueur${selectionne ? ' selectionnee' : ''}${!naturel ? ' adaptee' : ''}`}
      draggable={!!joueur}
      onClick={surSelection}
      onDragStart={surDrag}
      onDragOver={(e) => e.preventDefault()}
      onDrop={surDrop}
      aria-pressed={selectionne}
      aria-label={joueur
        ? `${numero}, ${nomPoste(posteSlot)}, ${joueur.nom}, note ${joueur.note}${naturel ? '' : ', hors poste'}`
        : `${numero}, ${nomPoste(posteSlot)}, poste vide`}
      title={joueur ? `${joueur.nom} · ${nomPoste(joueur.poste)} · ${joueur.age} ans` : nomPoste(posteSlot)}
    >
      <span className="manager-carte-haut">
        <i>{numero}</i>
        <strong>{joueur?.note ?? '—'}</strong>
      </span>
      <b>{joueur ? nomCarte(joueur.nom) : 'Poste vide'}</b>
      <small>{nomPoste(posteSlot)}</small>
      {!compatible && joueur && <em>hors poste</em>}
      <span className="manager-carte-roles">
        {capitaine && <i title="Capitaine">C</i>}
        {buteur && <i title="Buteur">🎯</i>}
      </span>
    </button>
  );
}

export function CompositionTerrainManager({ effectif, composition, onPlacer }: Props) {
  const [selection, setSelection] = useState<string | null>(null);
  const parId = useMemo(() => new Map(effectif.map((j) => [j.id, j])), [effectif]);
  const surFeuille = useMemo(
    () => new Set([...composition.titulaires, ...composition.remplacants]),
    [composition.titulaires, composition.remplacants],
  );
  const reserves = useMemo(
    () => effectif.filter((j) => !surFeuille.has(j.id)).sort((a, b) => b.note - a.note),
    [effectif, surFeuille],
  );

  const choisirOuPlacer = (zone: ZoneComposition, index: number, joueurId?: string) => {
    if (selection && selection !== joueurId) {
      onPlacer(zone, index, selection);
      setSelection(null);
      return;
    }
    setSelection(selection === joueurId ? null : joueurId ?? null);
  };

  const demarrerDrag = (e: DragEvent<HTMLButtonElement>, joueurId?: string) => {
    if (!joueurId) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', joueurId);
    setSelection(joueurId);
  };

  const deposer = (e: DragEvent<HTMLButtonElement>, zone: ZoneComposition, index: number) => {
    e.preventDefault();
    const joueurId = e.dataTransfer.getData('text/plain') || selection;
    if (joueurId) onPlacer(zone, index, joueurId);
    setSelection(null);
  };

  const joueurSelectionne = selection ? parId.get(selection) : undefined;

  return (
    <section className="manager-feuille-visuelle" aria-label="Composition visuelle">
      <div className="manager-compo-aide" aria-live="polite">
        <span>↕️ Glisse une carte sur une autre</span>
        <span>📱 Sur mobile : touche un joueur, puis son nouveau poste</span>
        {joueurSelectionne && <b>{joueurSelectionne.nom} sélectionné</b>}
      </div>

      <div className="manager-terrain-cadre">
        <div className="manager-terrain-legende"><span>EN-BUT ADVERSE</span><b>Ton XV</b><span>TON EN-BUT</span></div>
        <div className="manager-terrain-xv">
          {POSTES_XV_MANAGER.map((posteSlot, index) => {
            const joueur = parId.get(composition.titulaires[index]);
            const [x, y] = PLACEMENT_XV[index];
            return (
              <div className="manager-position" key={`${posteSlot}-${index}`} style={{ left: `${x}%`, top: `${y}%` }}>
                <CarteJoueur
                  joueur={joueur}
                  numero={index + 1}
                  posteSlot={posteSlot}
                  selectionne={selection === joueur?.id}
                  capitaine={composition.capitaineId === joueur?.id}
                  buteur={composition.buteurId === joueur?.id}
                  surSelection={() => choisirOuPlacer('titulaires', index, joueur?.id)}
                  surDrag={(e) => demarrerDrag(e, joueur?.id)}
                  surDrop={(e) => deposer(e, 'titulaires', index)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="manager-banc-visuel">
        <div className="comp-tete"><b>🪑 Banc</b><span className="comp-count">8</span></div>
        <div className="manager-banc-cartes">
          {POSTES_BANC_MANAGER.map((posteSlot, index) => {
            const joueur = parId.get(composition.remplacants[index]);
            return (
              <CarteJoueur
                key={`${posteSlot}-${index}`}
                joueur={joueur}
                numero={index + 16}
                posteSlot={posteSlot}
                selectionne={selection === joueur?.id}
                capitaine={composition.capitaineId === joueur?.id}
                buteur={composition.buteurId === joueur?.id}
                surSelection={() => choisirOuPlacer('remplacants', index, joueur?.id)}
                surDrag={(e) => demarrerDrag(e, joueur?.id)}
                surDrop={(e) => deposer(e, 'remplacants', index)}
              />
            );
          })}
        </div>
      </div>

      <details className="manager-reserves" open={reserves.length <= 8}>
        <summary>Effectif disponible <span>{reserves.length}</span></summary>
        <p>Touche ou glisse une carte vers le terrain ou le banc.</p>
        <div>
          {reserves.map((joueur) => (
            <button
              type="button"
              key={joueur.id}
              className={`manager-reserve-carte${selection === joueur.id ? ' selectionnee' : ''}`}
              draggable
              onClick={() => setSelection(selection === joueur.id ? null : joueur.id)}
              onDragStart={(e) => demarrerDrag(e, joueur.id)}
              aria-pressed={selection === joueur.id}
            >
              <strong>{joueur.note}</strong>
              <span><b>{joueur.nom}</b><small>{nomPoste(joueur.poste)} · {joueur.age} ans</small></span>
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
