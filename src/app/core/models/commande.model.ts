import { LigneArticle } from './ligne-article.model';

export type StatutCommande =
  | 'NOUVELLE'
  | 'CONFIRMEE'
  | 'PRETE'
  | 'LIVREE'
  | 'ANNULEE';

export interface Commande {
  id: number;
  numero: string; // "C-2026-0001"
  clientNom: string;
  clientTelephone: string;
  date: string;
  lignes: LigneArticle[];
  total: number;
  acompte: number; // somme déjà versée
  statut: StatutCommande;
}
