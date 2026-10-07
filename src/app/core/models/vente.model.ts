import { LigneArticle } from './ligne-article.model';

export type StatutVente = 'EN_ATTENTE' | 'PAYEE' | 'ANNULEE' | 'REMBOURSEE';
export type ModePaiement = 'ESPECES' | 'CARTE' | 'MOBILE_MONEY';

export interface Vente {
  id: number;
  numero: string; // "V-2026-0001"
  date: string;
  employeId: number; // la caissière qui a vendu
  lignes: LigneArticle[];
  total: number;
  modePaiement: ModePaiement;
  statut: StatutVente;
}
