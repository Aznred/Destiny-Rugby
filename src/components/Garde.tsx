// GARDE-FOU D'ÉCRAN
//
// Une seule donnée abîmée dans une vieille sauvegarde (un poste qui n'existe
// plus, une nation vide) suffisait à faire planter le rendu React : l'écran
// devenait BLANC et le joueur restait bloqué, navigation comprise.
//
// Ce garde-fou attrape l'erreur, garde la navigation vivante et propose de
// revenir à l'accueil. Il affiche aussi le message d'erreur : si ça arrive
// encore, on sait quoi corriger.

import { Component, type ReactNode } from 'react';
import { t } from '../lib/i18n';

// ⚠️ App monte ce garde avec key={ecran} : changer d'écran le remonte à neuf,
// il n'y a donc rien à réinitialiser à la main.
interface Props {
  children: ReactNode;
  onRetour: () => void;
}

interface State {
  erreur: string | null;
}

export class Garde extends Component<Props, State> {
  state: State = { erreur: null };

  static getDerivedStateFromError(e: unknown): State {
    return { erreur: e instanceof Error ? e.message : String(e) };
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <section className="section" style={{ padding: '3rem 0' }}>
        <div className="carte" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem' }}>🚧</div>
          <h2 style={{ margin: '0.6rem 0' }}>{t('garde.titre')}</h2>
          <p style={{ color: 'var(--craie-dim)', maxWidth: '52ch', margin: '0 auto 1rem' }}>
            {t('garde.texte')}
          </p>
          <code style={{ display: 'block', color: 'var(--brume)', fontSize: '0.8rem', marginBottom: '1.2rem' }}>
            {this.state.erreur}
          </code>
          <button
            className="btn primaire"
            onClick={() => {
              this.setState({ erreur: null });
              this.props.onRetour();
            }}
          >
            {t('garde.retour')}
          </button>
        </div>
      </section>
    );
  }
}
