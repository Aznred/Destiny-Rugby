import { Icone, type NomIcone } from './Icone';
import { t } from '../lib/i18n';
import './WikiLigue.css';

interface Rubrique {
  icone: NomIcone;
  titreCle: string;
  texteCle: string;
  pointsCles: string[];
}

const RUBRIQUES: Rubrique[] = [
  {
    icone: 'equipe',
    titreCle: 'online.wiki.sec1.title',
    texteCle: 'online.wiki.sec1.text',
    pointsCles: ['online.wiki.sec1.p1', 'online.wiki.sec1.p2', 'online.wiki.sec1.p3'],
  },
  {
    icone: 'maillot',
    titreCle: 'online.wiki.sec2.title',
    texteCle: 'online.wiki.sec2.text',
    pointsCles: ['online.wiki.sec2.p1', 'online.wiki.sec2.p2', 'online.wiki.sec2.p3'],
  },
  {
    icone: 'cadeau',
    titreCle: 'online.wiki.sec3.title',
    texteCle: 'online.wiki.sec3.text',
    pointsCles: ['online.wiki.sec3.p1', 'online.wiki.sec3.p2', 'online.wiki.sec3.p3'],
  },
  {
    icone: 'poignee',
    titreCle: 'online.wiki.sec4.title',
    texteCle: 'online.wiki.sec4.text',
    pointsCles: ['online.wiki.sec4.p1', 'online.wiki.sec4.p2', 'online.wiki.sec4.p3'],
  },
  {
    icone: 'reglages',
    titreCle: 'online.wiki.sec5.title',
    texteCle: 'online.wiki.sec5.text',
    pointsCles: ['online.wiki.sec5.p1', 'online.wiki.sec5.p2', 'online.wiki.sec5.p3'],
  },
  {
    icone: 'trophee',
    titreCle: 'online.wiki.sec6.title',
    texteCle: 'online.wiki.sec6.text',
    pointsCles: ['online.wiki.sec6.p1', 'online.wiki.sec6.p2', 'online.wiki.sec6.p3'],
  },
];

export function WikiLigue() {
  return <section className="wiki-ligue">
    <header className="cel-panneau wiki-ligue-hero">
      <div>
        <div className="eyebrow">{t('online.wiki.officialGuide')}</div>
        <h2>{t('online.wiki.title')}</h2>
        <p>{t('online.wiki.desc')}</p>
      </div>
      <a className="btn primaire" href="/wiki/ligue-en-ligne/" target="_blank" rel="noreferrer">
        <Icone nom="livre" taille={18} /> {t('online.wiki.readFullGuide')}
      </a>
    </header>
    <div className="wiki-ligue-grille">
      {RUBRIQUES.map(rubrique => <article className="cel-panneau wiki-ligue-carte" key={rubrique.titreCle}>
        <span className="wiki-ligue-icone"><Icone nom={rubrique.icone} taille={23} /></span>
        <h3>{t(rubrique.titreCle)}</h3>
        <p>{t(rubrique.texteCle)}</p>
        <ul>{rubrique.pointsCles.map(cle => <li key={cle}>{t(cle)}</li>)}</ul>
      </article>)}
    </div>
    <aside className="cel-panneau wiki-ligue-note">
      <Icone nom="alerte" taille={21} />
      <div>
        <b>{t('online.wiki.note.title')}</b>
        <p>{t('online.wiki.note.text')}</p>
      </div>
    </aside>
  </section>;
}
