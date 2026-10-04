import { t } from '../lib/i18n';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../lib/useModalDialog';
import './CompositionTerrainFut.css';

export function CadreCompositionManager({ children }: { children: ReactNode }) {
  const [pleinEcran, setPleinEcran] = useState(true);
  if (pleinEcran) return <CompositionPleinEcran fermer={() => setPleinEcran(false)}>{children}</CompositionPleinEcran>;
  return <div className="cel-compo manager-compo-partagee">
    <header className="cel-tete-compo"><h2>{t("online.nav.lineup")}</h2><button className="btn fantome" onClick={() => setPleinEcran(true)}>{t("ml.pleinEcran")}</button></header>
    {children}
  </div>;
}

function CompositionPleinEcran({ children, fermer }: { children: ReactNode; fermer: () => void }) {
  const { overlayRef, dialogRef } = useModalDialog(fermer);
  return createPortal(<div ref={overlayRef} className="cel-fullscreen-compo">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t("ui.6b2b119ba9d9")} tabIndex={-1} className="cel-compo cel-compo-etendue manager-compo-partagee">
      <header className="cel-tete-compo"><h2>{t("online.nav.lineup")}</h2><span>{t("ui.42c598dbbbf9")}</span><button className="btn fantome" onClick={fermer}>{t("tuto.retour")}</button></header>
      {children}
    </div>
  </div>, document.body);
}
