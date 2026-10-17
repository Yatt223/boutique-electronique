import { LigneArticle } from './ligne-article.model';
import { ModePaiement } from './vente.model';

export type StatutCommande = 'NOUVELLE' | 'CONFIRMEE' | 'PRETE' | 'LIVREE' | 'ANNULEE';

export const LIBELLES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  NOUVELLE: 'Nouvelle',
  CONFIRMEE: 'Confirmée',
  PRETE: 'Prête',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée',
};

export const CLASSES_STATUT_COMMANDE: Record<StatutCommande, string> = {
  NOUVELLE: 'badge-bleu',
  CONFIRMEE: 'badge-violet',
  PRETE: 'badge-orange',
  LIVREE: 'badge-vert',
  ANNULEE: 'badge-rouge',
};

/** Pour chaque statut, les statuts vers lesquels on a le droit de passer. */
export const TRANSITIONS_COMMANDE: Record<StatutCommande, StatutCommande[]> = {
  NOUVELLE: ['CONFIRMEE', 'ANNULEE'],
  CONFIRMEE: ['PRETE', 'ANNULEE'],
  PRETE: ['LIVREE', 'ANNULEE'],
  LIVREE: [],
  ANNULEE: [],
};

/** Les étapes affichées dans la barre de progression. */
export const ETAPES_COMMANDE: StatutCommande[] = ['NOUVELLE', 'CONFIRMEE', 'PRETE', 'LIVREE'];

/** L'action « simple » proposée à chaque statut (la livraison est à part : elle encaisse). */
export const ACTION_SUIVANTE: Partial<Record<StatutCommande, { suivant: StatutCommande; libelle: string }>> = {
  NOUVELLE: { suivant: 'CONFIRMEE', libelle: 'Confirmer la commande' },
  CONFIRMEE: { suivant: 'PRETE', libelle: 'Marquer comme prête' },
};

export interface Commande {
  id: number;
  numero: string;              // "C-2026-0001"
  clientNom: string;
  clientTelephone: string;
  date: string;
  employeId: number;           // qui a pris la commande
  lignes: LigneArticle[];
  total: number;
  acompte: number;             // somme déjà versée
  modeAcompte: ModePaiement;
  sessionId?: number;          // la session de caisse qui a encaissé l'acompte
  statut: StatutCommande;
  notes?: string;
  venteId?: number;            // la vente créée à la livraison
}