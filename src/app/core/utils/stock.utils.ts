import { MouvementStock } from '../models/mouvement-stock.model';
import { Produit } from '../models/produit.model';

export type StatutStock = 'OK' | 'BAS' | 'RUPTURE';

export interface LigneStock {
  produit: Produit;
  stock: number;
  statut: StatutStock;
  valeur: number; // stock × prix d'achat
}

export const LIBELLES_STATUT_STOCK: Record<StatutStock, string> = {
  OK: 'En stock',
  BAS: 'Stock bas',
  RUPTURE: 'Rupture',
};

export const CLASSES_STATUT_STOCK: Record<StatutStock, string> = {
  OK: 'badge-vert',
  BAS: 'badge-orange',
  RUPTURE: 'badge-rouge',
};

/** Stock de chaque produit : somme des entrées moins somme des sorties. */
export function stockParProduit(
  mouvements: MouvementStock[],
): Map<number, number> {
  const stocks = new Map<number, number>();
  for (const m of mouvements) {
    const variation = m.type === 'ENTREE' ? m.quantite : -m.quantite;
    stocks.set(m.produitId, (stocks.get(m.produitId) ?? 0) + variation);
  }
  return stocks;
}

export function statutStock(stock: number, seuilAlerte: number): StatutStock {
  if (stock <= 0) {
    return 'RUPTURE';
  }
  return stock <= seuilAlerte ? 'BAS' : 'OK';
}
