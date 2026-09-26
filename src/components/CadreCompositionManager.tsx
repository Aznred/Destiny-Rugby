import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../lib/useModalDialog';
import './CompositionTerrainFut.css';

export function CadreCompositionManager({ children }: { children: ReactNode }) {
  const [pleinEcran, setPleinEcran] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  if (pleinEcran) return <CompositionPleinEcran fermer={() => setPleinEcran(false)}>{children}</CompositionPleinEcran>;
  return <div className="cel-compo manager-compo-partagee">
    <header className="cel-tete-compo"><h2>Composition</h2><button className="btn fantome" onClick={() => setPleinEcran(true)}>Plein écran</button></header>
    {children}
  </div>;
}

function CompositionPleinEcran({ children, fermer }: { children: ReactNode; fermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  return createPortal(<div ref={overlayRef} className="cel-fullscreen-compo">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Composition de l’équipe" tabIndex={-1} className="cel-compo cel-compo-etendue">
      <header className="cel-tete-compo"><h2>Composition</h2><span>Choisis un joueur, puis sa place.</span><button className="btn fantome" onClick={fermer}>Retour</button></header>
      {children}
    </div>
  </div>, document.body);
}
