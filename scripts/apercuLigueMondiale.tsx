import { createRoot, type Root } from 'react-dom/client';
import { LigueMondiale } from '../src/components/LigueMondiale';
import '../src/index.css';
import '../src/App.css';
import '../src/screens/CarriereEnLigne.css';
const origine = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.href);
  if (url.searchParams.get('classementMondial') !== '1') return origine(input, init);
  const page = Number(url.searchParams.get('page')) || 1;
  const equipe = (i: number) => ({ clubId: 'club-' + i, nom: i === 42 ? 'Mon XV de Destiny' : 'Club de démonstration ' + i,
    division: i <= 16 ? 1 : i <= 48 ? 2 : 3, poule: i <= 16 ? 1 : i % 2 + 1, elo: 2200 - i * 4, rangMondial: i, joues: 30, gagnes: 25, nuls: 0, perdus: 5 });
  return new Response(JSON.stringify({ cycle: 4, page, total: 64, equipes: Array.from({ length: page === 1 ? 50 : 14 }, (_, i) => equipe((page - 1) * 50 + i + 1)), moi: equipe(42) }), { headers: { 'Content-Type': 'application/json' } });
};
const element = document.getElementById('root')! as HTMLElement & { racine?: Root };
(element.racine ??= createRoot(element)).render(<main className="cel" style={{ maxWidth: 1120, margin: 'auto', padding: 16 }}><header><span className="eyebrow">Destiny Rugby</span><h1>Ta ligue mondiale</h1></header><LigueMondiale /></main>);
