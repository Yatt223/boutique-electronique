import { MouvementStock } from '../models/mouvement-stock.model';
import { statutStock, stockParProduit } from './stock.utils';

function mouvement(
  produitId: number,
  type: 'ENTREE' | 'SORTIE',
  quantite: number,
): MouvementStock {
  return {
    id: 1,
    produitId,
    type,
    quantite,
    motif: 'AJUSTEMENT',
    date: '2026-10-01T09:00:00',
    employeId: 1,
  };
}

describe('stockParProduit', () => {
  it('additionne les entrées et soustrait les sorties', () => {
    const stocks = stockParProduit([
      mouvement(1, 'ENTREE', 10),
      mouvement(1, 'SORTIE', 3),
      mouvement(2, 'ENTREE', 5),
    ]);

    expect(stocks.get(1)).toBe(7);
    expect(stocks.get(2)).toBe(5);
  });

  it('renvoie une carte vide sans mouvement', () => {
    expect(stockParProduit([]).size).toBe(0);
  });
});

describe('statutStock', () => {
  it('signale une rupture à zéro ou en dessous', () => {
    expect(statutStock(0, 3)).toBe('RUPTURE');
    expect(statutStock(-1, 3)).toBe('RUPTURE');
  });

  it("signale un stock bas jusqu'au seuil inclus", () => {
    expect(statutStock(3, 3)).toBe('BAS');
    expect(statutStock(1, 3)).toBe('BAS');
  });

  it('considère le stock suffisant au-dessus du seuil', () => {
    expect(statutStock(4, 3)).toBe('OK');
  });
});
