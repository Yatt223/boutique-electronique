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

export const LIBELLES_MOTIFS: Record<MotifMouvement, string> = {
  ACHAT_FOURNISSEUR: 'Achat fournisseur',
  VENTE: 'Vente',
  RETOUR_CLIENT: 'Retour client',
  CASSE: 'Casse ou perte',
  AJUSTEMENT: "Ajustement d'inventaire",
};

/** Motifs proposés dans le formulaire. « VENTE » est exclu : il est créé automatiquement par la caisse. */
export const MOTIFS_PAR_TYPE: Record<TypeMouvement, MotifMouvement[]> = {
  ENTREE: ['ACHAT_FOURNISSEUR', 'RETOUR_CLIENT', 'AJUSTEMENT'],
  SORTIE: ['CASSE', 'AJUSTEMENT'],
};
