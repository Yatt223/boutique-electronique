import { LigneArticle } from './ligne-article.model';

export type StatutVente = 'EN_ATTENTE' | 'PAYEE' | 'ANNULEE' | 'REMBOURSEE';
export type ModePaiement = 'ESPECES' | 'CARTE' | 'MOBILE_MONEY';

export const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  ESPECES: 'Espèces',
  CARTE: 'Carte bancaire',
  MOBILE_MONEY: 'Mobile Money',
};

export const LIBELLES_STATUT: Record<StatutVente, string> = {
  EN_ATTENTE: 'En attente',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
  REMBOURSEE: 'Remboursée',
};

export const CLASSES_STATUT: Record<StatutVente, string> = {
  EN_ATTENTE: 'badge-orange',
  PAYEE: 'badge-vert',
  ANNULEE: 'badge-rouge',
  REMBOURSEE: 'badge-violet',
};

/** Pour chaque statut, les statuts vers lesquels on a le droit de passer. */
export const TRANSITIONS: Record<StatutVente, StatutVente[]> = {
  EN_ATTENTE: ['PAYEE', 'ANNULEE'],
  PAYEE: ['REMBOURSEE', 'ANNULEE'],
  ANNULEE: [],
  REMBOURSEE: [],
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
  sessionId?: number; // la session de caisse pendant laquelle la vente a été encaissée
}
