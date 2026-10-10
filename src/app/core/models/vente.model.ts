import { LigneArticle } from './ligne-article.model';

export type StatutVente = 'EN_ATTENTE' | 'PAYEE' | 'ANNULEE' | 'REMBOURSEE';
export type ModePaiement = 'ESPECES' | 'CARTE' | 'MOBILE_MONEY';

export const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  ESPECES: 'Espèces',
  CARTE: 'Carte bancaire',
  MOBILE_MONEY: 'Mobile Money',
};

export interface Vente {
  id: number;
  numero: string; // "V-2026-0001"
  date: string;
  employeId: number; // la caissière qui a vendu
  lignes: LigneArticle[];
  total: number;
  modePaiement: ModePaiement;
  montantRecu?: number; // espèces uniquement
  statut: StatutVente;
}
