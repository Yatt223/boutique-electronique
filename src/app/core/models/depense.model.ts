import { ModePaiement } from './vente.model';

export type CategorieDepense =
  | 'LOYER'
  | 'SALAIRES'
  | 'ELECTRICITE'
  | 'TRANSPORT'
  | 'FOURNITURES'
  | 'AUTRE';

export const LIBELLES_CATEGORIE_DEPENSE: Record<CategorieDepense, string> = {
  LOYER: 'Loyer',
  SALAIRES: 'Salaires',
  ELECTRICITE: 'Électricité et eau',
  TRANSPORT: 'Transport',
  FOURNITURES: 'Fournitures',
  AUTRE: 'Autre',
};

export type StatutDepense = 'VALIDEE' | 'ANNULEE';

export interface Depense {
  id: number;
  date: string; // "2026-10-17"
  libelle: string;
  montant: number;
  categorie: CategorieDepense;
  modePaiement: ModePaiement;
  employeId: number; // qui a enregistré la dépense
  sessionId?: number; // la caisse qui a payé (espèces uniquement)
  justificatifUrl?: string; // photo du reçu ou de la facture
  notes?: string;
  statut: StatutDepense;
}
