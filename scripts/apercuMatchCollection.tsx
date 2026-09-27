import React from 'react';
import { createRoot } from 'react-dom/client';
import { POSTES } from '../src/data/rugby';
import type { EquipeAmical, JoueurCollectionAmical } from '../src/lib/amicalCollection';
import { MatchAmicalManette } from '../src/components/match/MatchAmicalManette';

function equipe(nom: string, couleur: string, prefixe: string): EquipeAmical {
  const joueurs: JoueurCollectionAmical[] = POSTES.map((poste, index) => ({
    id: `${prefixe}-${index}`, sourceId: `${prefixe}-${index}`, nom: `${nom} ${index + 1}`,
    numero: index + 1, poste: poste.id, note: 75, vitesse: 72, force: 76,
    passe: 73, plaquage: 72, endurance: 78, jeuAuPied: 67,
  }));
  return { nom, couleur, joueurs, noteMoyenne: 75 };
}

createRoot(document.getElementById('root')!).render(
  <MatchAmicalManette
    equipeA={equipe('Bleus', '#2359c4', 'bleu')}
    equipeB={equipe('Rouges', '#c32836', 'rouge')}
    monCamp="A" mode="ordinateur" onQuitter={() => window.location.reload()}
  />,
);
