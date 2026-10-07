export type TypeMouvement = 'ENTREE' | 'SORTIE';
export type MotifMouvement =
  | 'ACHAT_FOURNISSEUR'
  | 'VENTE'
  | 'RETOUR_CLIENT'
  | 'CASSE'
  | 'AJUSTEMENT';

export interface MouvementStock {
  id: number;
  produitId: number;
  type: TypeMouvement;
  quantite: number;
  motif: MotifMouvement;
  date: string; // "2026-10-01T09:00:00"
  employeId: number;
  venteId?: number; // renseigné si le motif est VENTE
  commentaire?: string;
}
